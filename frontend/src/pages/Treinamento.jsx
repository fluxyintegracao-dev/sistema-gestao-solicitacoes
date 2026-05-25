import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineArchiveBox,
  HiOutlineBookOpen,
  HiOutlineCheckCircle,
  HiOutlineCloudArrowUp,
  HiOutlineDocumentText,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePlayCircle,
  HiOutlinePlusCircle,
  HiOutlineSparkles
} from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';
import {
  createTreinamentoConteudo,
  deleteTreinamentoConteudo,
  getTreinamentoArquivoUrl,
  getTreinamentoConteudos,
  getTreinamentoResumo,
  marcarTreinamentoLeitura,
  publishTreinamentoConteudo,
  updateTreinamentoConteudo,
  uploadTreinamentoArquivo
} from '../services/treinamento';
import {
  canManageTreinamento,
  canPublishTreinamento
} from '../utils/acessoProduto';

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'FAQ', label: 'Perguntas e respostas' },
  { value: 'VIDEO', label: 'Videos' },
  { value: 'GUIA', label: 'Guias' }
];

const MODULOS_BASE = [
  'GERAL',
  'SOLICITACOES',
  'COMPRAS',
  'FINANCEIRO',
  'FISCAL',
  'RH_DP',
  'SST',
  'CONTRATOS',
  'CRM',
  'COMERCIAL',
  'PROVISIONAMENTO'
];

const EMPTY_FORM = {
  id: null,
  tipo: 'FAQ',
  status: 'RASCUNHO',
  modulo: 'GERAL',
  publico_alvo: 'Todos',
  titulo: '',
  pergunta: '',
  resposta: '',
  descricao: '',
  conteudo: '',
  tags: '',
  ordem: 0,
  duracao_minutos: '',
  thumbnail_url: ''
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.join(', ');
  return String(tags || '');
}

function toForm(item) {
  return {
    id: item?.id || null,
    tipo: item?.tipo || 'FAQ',
    status: item?.status || 'RASCUNHO',
    modulo: item?.modulo || 'GERAL',
    publico_alvo: item?.publico_alvo || 'Todos',
    titulo: item?.titulo || '',
    pergunta: item?.pergunta || '',
    resposta: item?.resposta || '',
    descricao: item?.descricao || '',
    conteudo: item?.conteudo || '',
    tags: normalizeTags(item?.tags),
    ordem: item?.ordem || 0,
    duracao_minutos: item?.duracao_minutos ?? '',
    thumbnail_url: item?.thumbnail_url || ''
  };
}

function toPayload(form) {
  return {
    tipo: form.tipo,
    status: form.status,
    modulo: form.modulo,
    publico_alvo: form.publico_alvo,
    titulo: form.titulo,
    pergunta: form.pergunta,
    resposta: form.resposta,
    descricao: form.descricao,
    conteudo: form.conteudo,
    tags: form.tags,
    ordem: form.ordem,
    duracao_minutos: form.duracao_minutos,
    thumbnail_url: form.thumbnail_url
  };
}

function tipoIcon(tipo) {
  if (tipo === 'VIDEO') return HiOutlinePlayCircle;
  if (tipo === 'FAQ') return HiOutlineSparkles;
  return HiOutlineDocumentText;
}

export default function Treinamento() {
  const { user } = useAuth();
  const podeGerenciar = canManageTreinamento(user);
  const podePublicar = canPublishTreinamento(user);
  const fileInputRef = useRef(null);

  const [resumo, setResumo] = useState(null);
  const [conteudos, setConteudos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [filtros, setFiltros] = useState({
    tipo: '',
    modulo: '',
    busca: '',
    status: podeGerenciar ? '' : 'PUBLICADO'
  });
  const [form, setForm] = useState(EMPTY_FORM);

  const modulos = useMemo(() => {
    const fromResumo = Object.keys(resumo?.modulos || {});
    return [...new Set([...MODULOS_BASE, ...fromResumo])].filter(Boolean).sort();
  }, [resumo]);

  const selected = useMemo(
    () => conteudos.find((item) => Number(item.id) === Number(form.id)) || null,
    [conteudos, form.id]
  );

  async function carregar() {
    setErro('');
    setLoading(true);
    try {
      const [resumoData, listaData] = await Promise.all([
        getTreinamentoResumo(),
        getTreinamentoConteudos({
          ...filtros,
          status: filtros.status || undefined,
          limit: 300
        })
      ]);
      setResumo(resumoData || null);
      setConteudos(Array.isArray(listaData?.items) ? listaData.items : []);
    } catch (error) {
      console.error(error);
      setErro(error.message || 'Erro ao carregar treinamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.tipo, filtros.modulo, filtros.status]);

  async function handleBuscar(event) {
    event.preventDefault();
    await carregar();
  }

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function novoConteudo(tipo = 'FAQ') {
    setForm({ ...EMPTY_FORM, tipo });
    setPendingFile(null);
    setSucesso('');
    setErro('');
  }

  function editarConteudo(item) {
    setForm(toForm(item));
    setPendingFile(null);
    setSucesso('');
    setErro('');
    marcarTreinamentoLeitura(item.id, false).catch(() => {});
  }

  async function enviarArquivo(conteudoId, file, tipo = form.tipo) {
    const tipoArquivo = tipo === 'VIDEO' ? 'VIDEO' : 'DOCUMENTO';
    return uploadTreinamentoArquivo(conteudoId, file, tipoArquivo);
  }

  async function salvarConteudo(event) {
    event.preventDefault();
    setSaving(true);
    setErro('');
    setSucesso('');
    try {
      const payload = toPayload(form);
      const saved = form.id
        ? await updateTreinamentoConteudo(form.id, payload)
        : await createTreinamentoConteudo(payload);
      let next = saved;
      if (pendingFile) {
        setUploading(true);
        next = await enviarArquivo(saved.id, pendingFile, saved.tipo);
        setPendingFile(null);
      }
      setForm(toForm(next));
      setSucesso(pendingFile ? 'Conteudo salvo e arquivo enviado para o S3.' : 'Conteudo salvo com sucesso.');
      await carregar();
    } catch (error) {
      console.error(error);
      setErro(error.message || 'Erro ao salvar conteudo.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function publicarConteudo(id) {
    setSaving(true);
    setErro('');
    setSucesso('');
    try {
      const saved = await publishTreinamentoConteudo(id);
      setForm(toForm(saved));
      setSucesso('Conteudo publicado.');
      await carregar();
    } catch (error) {
      console.error(error);
      setErro(error.message || 'Erro ao publicar conteudo.');
    } finally {
      setSaving(false);
    }
  }

  async function arquivarConteudo(id) {
    if (!window.confirm('Arquivar este conteudo de treinamento?')) return;
    setSaving(true);
    setErro('');
    try {
      await deleteTreinamentoConteudo(id);
      setForm(EMPTY_FORM);
      setSucesso('Conteudo arquivado.');
      await carregar();
    } catch (error) {
      console.error(error);
      setErro(error.message || 'Erro ao arquivar conteudo.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadArquivo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPendingFile(file);
    if (!form.id) {
      setSucesso('Arquivo selecionado. Ao salvar o conteudo, ele sera enviado para o S3.');
      setErro('');
      return;
    }
    setUploading(true);
    setErro('');
    setSucesso('');
    try {
      const saved = await enviarArquivo(form.id, file);
      setForm(toForm(saved));
      setPendingFile(null);
      setSucesso('Arquivo enviado para o S3.');
      await carregar();
    } catch (error) {
      console.error(error);
      setErro(error.message || 'Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  }

  const uploadAccept = form.tipo === 'VIDEO'
    ? '.mp4,.webm,video/mp4,video/webm'
    : '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';

  async function abrirArquivo(item, tipoArquivo) {
    try {
      await marcarTreinamentoLeitura(item.id, false);
      const data = await getTreinamentoArquivoUrl(item.id, tipoArquivo);
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(error);
      setErro(error.message || 'Arquivo nao encontrado.');
    }
  }

  async function concluirConteudo(item) {
    try {
      await marcarTreinamentoLeitura(item.id, true);
      setSucesso('Registro de leitura concluido.');
    } catch (error) {
      console.error(error);
      setErro(error.message || 'Erro ao registrar conclusao.');
    }
  }

  return (
    <main className="treinamento-page space-y-6">
      <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--c-muted)]">
              Institucional
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--c-text)]">
              Central de Treinamento
            </h1>
            <p className="mt-2 text-sm text-[var(--c-muted)]">
              Base operacional para perguntas frequentes, videos e guias de uso do FLUXY.
              Os arquivos ficam privados no S3 e sao abertos por URL assinada.
            </p>
          </div>
          {podeGerenciar && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline" onClick={() => novoConteudo('FAQ')}>
                <HiOutlinePlusCircle className="h-4 w-4" />
                FAQ
              </button>
              <button type="button" className="btn btn-outline" onClick={() => novoConteudo('VIDEO')}>
                <HiOutlinePlayCircle className="h-4 w-4" />
                Video
              </button>
              <button type="button" className="btn btn-primary" onClick={() => novoConteudo('GUIA')}>
                <HiOutlineBookOpen className="h-4 w-4" />
                Guia
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Conteudos', resumo?.total || 0],
          ['Publicados', resumo?.publicados || 0],
          ['Videos', resumo?.videos || 0],
          ['Perguntas', resumo?.faqs || 0],
          ['Guias', resumo?.guias || 0]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">{label}</p>
            <p className="mt-3 text-2xl font-bold text-[var(--c-text)]">{value}</p>
          </div>
        ))}
      </section>

      {(erro || sucesso) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            erro
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {erro || sucesso}
        </div>
      )}

      <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-[160px_180px_1fr_auto]" onSubmit={handleBuscar}>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--c-muted)]">Tipo</span>
            <select
              className="input"
              value={filtros.tipo}
              onChange={(event) => setFiltros((current) => ({ ...current, tipo: event.target.value }))}
            >
              {TIPOS.map((tipo) => (
                <option key={tipo.value || 'todos'} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--c-muted)]">Modulo</span>
            <select
              className="input"
              value={filtros.modulo}
              onChange={(event) => setFiltros((current) => ({ ...current, modulo: event.target.value }))}
            >
              <option value="">Todos</option>
              {modulos.map((modulo) => (
                <option key={modulo} value={modulo}>{modulo}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--c-muted)]">Busca</span>
            <input
              className="input"
              value={filtros.busca}
              onChange={(event) => setFiltros((current) => ({ ...current, busca: event.target.value }))}
              placeholder="Pergunta, titulo, modulo ou tag"
            />
          </label>
          <div className="flex items-end gap-2">
            {podeGerenciar && (
              <select
                className="input min-w-[150px]"
                value={filtros.status}
                onChange={(event) => setFiltros((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="">Ativos</option>
                <option value="PUBLICADO">Publicados</option>
                <option value="RASCUNHO">Rascunhos</option>
              </select>
            )}
            <button type="submit" className="btn btn-primary">
              <HiOutlineMagnifyingGlass className="h-4 w-4" />
              Buscar
            </button>
          </div>
        </form>
      </section>

      <div className={`grid gap-5 ${podeGerenciar ? 'xl:grid-cols-[minmax(0,1fr)_520px]' : ''}`}>
        <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--c-text)]">Conteudos disponiveis</h2>
              <p className="text-xs text-[var(--c-muted)]">
                {loading ? 'Carregando...' : `${conteudos.length} item(ns) listado(s)`}
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {!loading && conteudos.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--c-border)] p-6 text-sm text-[var(--c-muted)]">
                Nenhum conteudo encontrado para os filtros atuais.
              </div>
            )}

            {conteudos.map((item) => {
              const Icon = tipoIcon(item.tipo);
              const hasVideo = Boolean(item.video_s3_key || item.video_url);
              const hasDocument = Boolean(item.documento_s3_key || item.documento_url);
              return (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 transition ${
                    Number(form.id) === Number(item.id)
                      ? 'border-blue-300 bg-[var(--c-surface-muted)] ring-2 ring-blue-200/60'
                      : 'border-[var(--c-border)] bg-[var(--c-surface-muted)]'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <button
                      type="button"
                      className="flex flex-1 gap-3 text-left"
                      onClick={() => editarConteudo(item)}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] text-blue-600">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
                          {item.tipo} - {item.modulo || 'GERAL'} - {item.status}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-[var(--c-text)]">
                          {item.titulo}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs text-[var(--c-muted)]">
                          {item.pergunta || item.descricao || item.resposta || item.conteudo || 'Sem descricao'}
                        </span>
                      </span>
                    </button>
                    <div className="flex flex-wrap gap-2">
                      {hasVideo && (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => abrirArquivo(item, 'VIDEO')}>
                          <HiOutlinePlayCircle className="h-4 w-4" />
                          Video
                        </button>
                      )}
                      {hasDocument && (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => abrirArquivo(item, 'DOCUMENTO')}>
                          <HiOutlineDocumentText className="h-4 w-4" />
                          Arquivo
                        </button>
                      )}
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => concluirConteudo(item)}>
                        <HiOutlineCheckCircle className="h-4 w-4" />
                        Concluir
                      </button>
                    </div>
                  </div>
                  {Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[var(--c-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--c-muted)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 text-[11px] text-[var(--c-muted)]">
                    Publicado em {formatDate(item.publicado_em)} por {item?.publicadoPor?.nome || '-'}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {podeGerenciar && (
          <aside className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--c-text)]">
                  {form.id ? 'Editar conteudo' : 'Novo conteudo'}
                </h2>
                <p className="text-xs text-[var(--c-muted)]">
                  Publique somente materiais revisados para treinamento institucional.
                </p>
              </div>
              {form.id && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => novoConteudo(form.tipo)}>
                  Limpar
                </button>
              )}
            </div>

            <form className="space-y-3" onSubmit={salvarConteudo}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-[var(--c-muted)]">Tipo</span>
                  <select className="input" value={form.tipo} onChange={(event) => handleChange('tipo', event.target.value)}>
                    <option value="FAQ">FAQ</option>
                    <option value="VIDEO">Video</option>
                    <option value="GUIA">Guia</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-[var(--c-muted)]">Status</span>
                  <select className="input" value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="PUBLICADO">Publicado</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-[var(--c-muted)]">Modulo</span>
                  <input className="input" value={form.modulo} onChange={(event) => handleChange('modulo', event.target.value.toUpperCase())} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-[var(--c-muted)]">Publico alvo</span>
                  <input className="input" value={form.publico_alvo} onChange={(event) => handleChange('publico_alvo', event.target.value)} />
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--c-muted)]">Titulo</span>
                <input className="input" value={form.titulo} onChange={(event) => handleChange('titulo', event.target.value)} required />
              </label>

              {form.tipo === 'FAQ' && (
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-[var(--c-muted)]">Pergunta</span>
                  <textarea className="input min-h-[72px]" value={form.pergunta} onChange={(event) => handleChange('pergunta', event.target.value)} />
                </label>
              )}

              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--c-muted)]">
                  {form.tipo === 'FAQ' ? 'Resposta' : 'Descricao'}
                </span>
                <textarea
                  className="input min-h-[112px]"
                  value={form.tipo === 'FAQ' ? form.resposta : form.descricao}
                  onChange={(event) => handleChange(form.tipo === 'FAQ' ? 'resposta' : 'descricao', event.target.value)}
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--c-muted)]">Conteudo complementar</span>
                <textarea className="input min-h-[96px]" value={form.conteudo} onChange={(event) => handleChange('conteudo', event.target.value)} />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-[var(--c-muted)]">Tags</span>
                  <input className="input" value={form.tags} onChange={(event) => handleChange('tags', event.target.value)} placeholder="financeiro, titulos" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-[var(--c-muted)]">Ordem</span>
                  <input className="input" type="number" value={form.ordem} onChange={(event) => handleChange('ordem', event.target.value)} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-[var(--c-muted)]">Duracao min.</span>
                  <input className="input" type="number" min="0" value={form.duracao_minutos} onChange={(event) => handleChange('duracao_minutos', event.target.value)} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-[var(--c-muted)]">Thumbnail URL</span>
                  <input className="input" value={form.thumbnail_url} onChange={(event) => handleChange('thumbnail_url', event.target.value)} />
                </label>
              </div>

              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-muted)] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--c-text)]">
                      {form.tipo === 'VIDEO' ? 'Arquivo de video' : 'Arquivo do material'}
                    </p>
                    <p className="text-xs text-[var(--c-muted)]">
                      {form.tipo === 'VIDEO'
                        ? 'Selecione um MP4 ou WebM. Se ainda nao salvou, o envio acontece apos salvar.'
                        : 'Selecione PDF, planilha, apresentacao, imagem ou documento.'}
                    </p>
                    {pendingFile && (
                      <p className="mt-1 text-xs font-semibold text-blue-600">
                        Selecionado: {pendingFile.name}
                      </p>
                    )}
                  </div>
                  <label className="btn btn-outline cursor-pointer">
                    <HiOutlineCloudArrowUp className="h-4 w-4" />
                    {uploading ? 'Enviando...' : 'Selecionar arquivo'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={uploadAccept}
                      onChange={uploadArquivo}
                      disabled={uploading || saving}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <HiOutlinePencilSquare className="h-4 w-4" />
                  {saving ? 'Salvando...' : pendingFile ? 'Salvar e enviar arquivo' : 'Salvar'}
                </button>
                {form.id && (
                  <>
                    {podePublicar && selected?.status !== 'PUBLICADO' && (
                      <button type="button" className="btn btn-outline" onClick={() => publicarConteudo(form.id)}>
                        Publicar
                      </button>
                    )}
                    <button type="button" className="btn btn-danger" onClick={() => arquivarConteudo(form.id)}>
                      <HiOutlineArchiveBox className="h-4 w-4" />
                      Arquivar
                    </button>
                  </>
                )}
              </div>

              {form.id && (
                <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-muted)] p-3 text-xs text-[var(--c-muted)]">
                  Arquivos ja salvos ficam privados no S3 e sao abertos por URL assinada.
                </div>
              )}
            </form>
          </aside>
        )}
      </div>
    </main>
  );
}
