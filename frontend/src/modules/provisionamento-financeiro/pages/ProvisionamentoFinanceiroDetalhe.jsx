import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  adicionarComentarioProvisaoFinanceira,
  atualizarProvisaoFinanceira,
  getProvisionamentoFinanceiroContexto,
  getProvisaoFinanceira,
  listarCategoriasMacroProvisionamento,
  obterLinkAnexoProvisaoFinanceira,
  uploadAnexosProvisaoFinanceira
} from '../../../services/provisoesFinanceiras';
import {
  formatarMoedaBRL,
  inicializarEntradaMoeda,
  normalizarEntradaMoeda
} from '../utils/moeda';

function formatarData(valor) {
  if (!valor) return '-';
  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleString('pt-BR');
}

function formatarPrioridade(valor) {
  const normalized = String(valor || '').toLowerCase();
  const labels = {
    baixa: 'Baixa',
    media: 'Media',
    alta: 'Alta',
    critica: 'Critica'
  };
  return labels[normalized] || '-';
}

function formatarObra(obra) {
  if (!obra) return '-';
  return `${obra.codigo ? `${obra.codigo} - ` : ''}${obra.nome}`;
}

export default function ProvisionamentoFinanceiroDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contexto, setContexto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [provisao, setProvisao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [comentando, setComentando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [comentario, setComentario] = useState('');
  const [form, setForm] = useState(null);
  const [valorPrevistoTexto, setValorPrevistoTexto] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      const [contextoData, categoriasData, provisaoData] = await Promise.all([
        getProvisionamentoFinanceiroContexto(),
        listarCategoriasMacroProvisionamento(),
        getProvisaoFinanceira(id)
      ]);

      setContexto(contextoData);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      setProvisao(provisaoData);
      setForm({
        item_macro: provisaoData?.categoriaMacro?.nome || '',
        data_prevista_desembolso: String(provisaoData?.data_prevista_desembolso || ''),
        descricao: provisaoData?.descricao || '',
        valor_previsto: String(provisaoData?.valor_previsto || ''),
        fornecedor_texto: provisaoData?.fornecedor_texto || '',
        prioridade: provisaoData?.prioridade || ''
      });
      setValorPrevistoTexto(inicializarEntradaMoeda(provisaoData?.valor_previsto).textoFormatado);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar detalhe da provisao.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [id]);

  const podeEditar = useMemo(() => {
    if (!contexto?.permissoes?.pode_editar || !provisao) return false;
    return !['cancelado', 'realizado'].includes(String(provisao.status || '').toLowerCase());
  }, [contexto, provisao]);

  function atualizarValorPrevisto(raw) {
    const { textoFormatado, valorNumerico } = normalizarEntradaMoeda(raw);
    setValorPrevistoTexto(textoFormatado);
    setForm((atual) => ({
      ...atual,
      valor_previsto: valorNumerico
    }));
  }

  async function salvarEdicao(event) {
    event.preventDefault();
    if (!form || saving) return;

    if (!form.item_macro.trim() || !form.data_prevista_desembolso || !form.descricao.trim() || !form.valor_previsto) {
      alert('Preencha item macro, data prevista, descricao e valor previsto.');
      return;
    }

    try {
      setSaving(true);
      await atualizarProvisaoFinanceira(id, {
        item_macro: form.item_macro,
        data_prevista_desembolso: form.data_prevista_desembolso,
        descricao: form.descricao,
        valor_previsto: form.valor_previsto,
        fornecedor_texto: form.fornecedor_texto,
        prioridade: form.prioridade
      });
      setEditando(false);
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar alteracoes.');
    } finally {
      setSaving(false);
    }
  }

  async function enviarComentario(event) {
    event.preventDefault();
    if (comentando) return;
    if (!comentario.trim()) {
      alert('Informe um comentario.');
      return;
    }

    try {
      setComentando(true);
      await adicionarComentarioProvisaoFinanceira(id, { comentario });
      setComentario('');
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao registrar comentario.');
    } finally {
      setComentando(false);
    }
  }

  async function enviarAnexos(files) {
    if (!files?.length || uploading) return;

    try {
      setUploading(true);
      await uploadAnexosProvisaoFinanceira(id, files);
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao enviar anexos.');
    } finally {
      setUploading(false);
    }
  }

  async function abrirAnexo(anexo) {
    try {
      const data = await obterLinkAnexoProvisaoFinanceira(anexo?.id);
      if (!data?.url) {
        alert('Arquivo indisponivel.');
        return;
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao abrir anexo.');
    }
  }

  if (loading || !provisao || !form) {
    return <div className="page"><p>Carregando provisao...</p></div>;
  }

  return (
    <div className="page space-y-6">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{provisao.codigo}</h1>
          <p className="page-subtitle">Detalhe completo da provisao com anexos, comentarios e trilha historica.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/provisoes-financeiras')}>
            Voltar
          </button>
          {podeEditar && (
            <button type="button" className="btn btn-primary" onClick={() => setEditando((valor) => !valor)}>
              {editando ? 'Fechar edicao' : 'Editar registro'}
            </button>
          )}
        </div>
      </div>

      <div className="card mx-auto w-full max-w-5xl">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
          <Info label="Codigo" value={provisao.codigo} />
          <Info label="Obra" value={formatarObra(provisao.obra)} />
          <Info label="Item macro" value={provisao.categoriaMacro?.nome || '-'} />
          <Info label="Data prevista" value={formatarData(provisao.data_prevista_desembolso)} />
          <Info label="Valor previsto" value={formatarMoedaBRL(provisao.valor_previsto)} />
          <Info label="Credor" value={provisao.fornecedor_texto || '-'} />
          <Info label="Prioridade" value={formatarPrioridade(provisao.prioridade)} />
          <Info label="Criado por" value={provisao.usuarioCriacao?.nome || '-'} />
          <Info label="Atualizado por" value={provisao.usuarioAtualizacao?.nome || '-'} />
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          <span className="font-medium">Descricao</span>
          <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 whitespace-pre-wrap">{provisao.descricao || '-'}</div>
        </div>
      </div>

      {editando && podeEditar && (
        <form className="card mx-auto w-full max-w-5xl space-y-4" onSubmit={salvarEdicao}>
          <div className="card-header">
            <h2 className="font-semibold">Editar provisao</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-2">
              Item macro
              <input
                type="text"
                className="input"
                list="provisao-item-macro-opcoes-edicao"
                value={form.item_macro}
                onChange={(event) => setForm((atual) => ({ ...atual, item_macro: event.target.value }))}
              />
              <datalist id="provisao-item-macro-opcoes-edicao">
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.nome} />
                ))}
              </datalist>
            </label>
            <label className="grid gap-1 text-sm xl:col-span-2">
              Data prevista
              <input type="date" className="input" value={form.data_prevista_desembolso} onChange={(event) => setForm((atual) => ({ ...atual, data_prevista_desembolso: event.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm xl:col-span-2">
              Valor previsto
              <input
                type="text"
                inputMode="numeric"
                className="input"
                value={valorPrevistoTexto}
                onChange={(event) => atualizarValorPrevisto(event.target.value)}
                placeholder={formatarMoedaBRL(0)}
              />
            </label>
            <label className="grid gap-1 text-sm xl:col-span-2">
              Prioridade
              <select className="input" value={form.prioridade} onChange={(event) => setForm((atual) => ({ ...atual, prioridade: event.target.value }))}>
                <option value="">Nao definida</option>
                <option value="baixa">Baixa</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Critica</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-4">
              Credor
              <input className="input" value={form.fornecedor_texto} onChange={(event) => setForm((atual) => ({ ...atual, fornecedor_texto: event.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm xl:col-span-6">
              Descricao
              <textarea className="input min-h-[110px]" value={form.descricao} onChange={(event) => setForm((atual) => ({ ...atual, descricao: event.target.value }))} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-outline" onClick={() => setEditando(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alteracoes'}</button>
          </div>
        </form>
      )}

      <div className="mx-auto grid w-full max-w-5xl gap-6 xl:grid-cols-2">
        <div className="card space-y-4">
          <div className="card-header">
            <h2 className="font-semibold">Comentarios</h2>
          </div>
          <form className="grid gap-3" onSubmit={enviarComentario}>
            <textarea className="input min-h-[110px]" value={comentario} onChange={(event) => setComentario(event.target.value)} placeholder="Registrar observacao complementar" />
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={comentando || !podeEditar}>{comentando ? 'Salvando...' : 'Adicionar comentario'}</button>
            </div>
          </form>
        </div>

        <div className="card space-y-4">
          <div className="card-header flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Anexos</h2>
            {podeEditar && (
              <label className={`btn btn-outline cursor-pointer ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    void enviarAnexos(Array.from(event.target.files || []));
                    event.target.value = '';
                  }}
                />
                {uploading ? 'Enviando...' : 'Adicionar anexos'}
              </label>
            )}
          </div>
          {Array.isArray(provisao.anexos) && provisao.anexos.length > 0 ? (
            <div className="grid gap-2">
              {provisao.anexos.map((anexo) => (
                <div key={anexo.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--c-border)] px-3 py-3 text-sm">
                  <div>
                    <div className="font-medium">{anexo.nome_original}</div>
                    <div className="text-[var(--c-muted)]">{anexo.uploadUser?.nome || '-'} · {formatarData(anexo.createdAt)}</div>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={() => abrirAnexo(anexo)}>Abrir</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--c-muted)]">Nenhum anexo registrado.</div>
          )}
        </div>
      </div>

      <div className="card mx-auto w-full max-w-5xl space-y-4">
        <div className="card-header">
          <h2 className="font-semibold">Historico</h2>
        </div>
        {Array.isArray(provisao.historicos) && provisao.historicos.length > 0 ? (
          <div className="space-y-3">
            {provisao.historicos.map((historico) => (
              <div key={historico.id} className="rounded-lg border border-[var(--c-border)] px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{historico.acao}</strong>
                  <span className="text-[var(--c-muted)]">{formatarData(historico.createdAt)}</span>
                </div>
                {historico.descricao && <div className="mt-2">{historico.descricao}</div>}
                {historico.comentario && <div className="mt-2 whitespace-pre-wrap">{historico.comentario}</div>}
                <div className="mt-2 text-[var(--c-muted)]">{historico.usuario?.nome || 'Sistema'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[var(--c-muted)]">Nenhum historico registrado.</div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs uppercase tracking-wide text-[var(--c-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
