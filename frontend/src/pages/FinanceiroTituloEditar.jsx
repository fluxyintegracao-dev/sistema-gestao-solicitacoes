import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros } from '../services/parceiros';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import {
  atualizarTituloFinanceiro,
  getCategoriasFinanceiras,
  getTituloFinanceiroById
} from '../services/financeiro';
import { listarApropriacoes } from '../services/apropriacoes';
import { formatCurrencyInput, normalizeCurrencyTyping } from '../utils/formatters';

const FORMAS_COBRANCA = ['BOLETO', 'PIX', 'OUTROS'];
const STATUS_COBRANCA = ['PENDENTE_EMISSAO', 'EMITIDO', 'PAGO_BANCO', 'CONCILIADO', 'CANCELADO'];
const TIPOS_INTERCOMPANY = [
  ['APORTE', 'Aporte'],
  ['EMPRESTIMO', 'Emprestimo'],
  ['REEMBOLSO', 'Reembolso'],
  ['RATEIO', 'Rateio'],
  ['COBERTURA_CAIXA', 'Cobertura de caixa'],
  ['FOLHA', 'Folha'],
  ['ADMINISTRATIVO', 'Administrativo'],
  ['IMPOSTO', 'Imposto'],
  ['TRANSFERENCIA_OPERACIONAL', 'Transferencia operacional']
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toCurrencyNumber(value) {
  if (value == null || value === '') return 0;
  const raw = String(value).trim().replace(/[R$\s]/gi, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getEmpresaObraId(obra) {
  return obra?.empresa_grupo_id ? String(obra.empresa_grupo_id) : '';
}

function getTituloBloqueado(titulo) {
  const status = String(titulo?.status || '').toUpperCase();
  const valorBaixado = Number(titulo?.valor_baixado || 0);
  const movimentosAtivos = Array.isArray(titulo?.movimentos)
    ? titulo.movimentos.filter((item) => String(item.status || '').toUpperCase() === 'ATIVO')
    : [];
  const pagamentosAtivos = Array.isArray(titulo?.paymentIntents)
    ? titulo.paymentIntents.filter((item) => !['CANCELADO', 'REJEITADO', 'REJEITADO_BANCO'].includes(String(item.status || '').toUpperCase()))
    : [];

  if (status !== 'ABERTO') return 'Somente titulos em aberto podem ser editados.';
  if (valorBaixado > 0 || movimentosAtivos.length > 0) return 'Este titulo ja possui baixa. Estorne a baixa antes de corrigir o lancamento.';
  if (pagamentosAtivos.length > 0) return 'Este titulo possui pagamento em massa vinculado. Cancele ou rejeite o pagamento antes de editar.';
  return '';
}

function categoriaCompativel(categoria, tipoTitulo) {
  const tipoCategoria = String(categoria?.tipo || '').trim().toUpperCase();
  return tipoCategoria === tipoTitulo || tipoCategoria === 'AMBOS';
}

function buildFormFromTitulo(titulo) {
  return {
    tipo: String(titulo?.tipo || 'PAGAR').toUpperCase() === 'RECEBER' ? 'RECEBER' : 'PAGAR',
    empresa_id: String(titulo?.empresa_id || ''),
    obra_id: String(titulo?.obra_id || ''),
    apropriacao_id: String(titulo?.apropriacao_id || ''),
    parceiro_id: String(titulo?.parceiro_id || ''),
    categoria_financeira_id: String(titulo?.categoria_financeira_id || ''),
    descricao: titulo?.descricao || '',
    numero_documento: titulo?.numero_documento || '',
    valor: formatCurrencyInput(titulo?.valor_original),
    data_emissao: titulo?.data_emissao || today(),
    data_vencimento: titulo?.data_vencimento || today(),
    competencia_data: titulo?.competencia_data || today(),
    considera_dre: titulo?.considera_dre !== false,
    observacoes: titulo?.observacoes || '',
    forma_cobranca: titulo?.forma_cobranca || '',
    status_cobranca: titulo?.status_cobranca && titulo.status_cobranca !== 'NAO_APLICAVEL'
      ? titulo.status_cobranca
      : 'PENDENTE_EMISSAO',
    banco_cobranca: titulo?.banco_cobranca || '',
    nosso_numero: titulo?.nosso_numero || '',
    linha_digitavel: titulo?.linha_digitavel || '',
    codigo_barras: titulo?.codigo_barras || '',
    identificador_externo: titulo?.identificador_externo || '',
    boleto_emitido_em: titulo?.boleto_emitido_em || '',
    intercompany: Boolean(titulo?.intercompany),
    empresa_contraparte_id: String(titulo?.empresa_contraparte_id || ''),
    intercompany_group_id: titulo?.intercompany_group_id || '',
    empresa_origem_id: String(titulo?.empresa_origem_id || ''),
    empresa_destino_id: String(titulo?.empresa_destino_id || ''),
    tipo_intercompany: titulo?.tipo_intercompany || '',
    motivo_intercompany: titulo?.motivo_intercompany || '',
    elimina_consolidado: titulo?.elimina_consolidado !== false,
    transferencia_interna: titulo?.transferencia_interna !== false
  };
}

export default function FinanceiroTituloEditar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState(null);
  const [form, setForm] = useState(null);
  const [obras, setObras] = useState([]);
  const [empresasGrupo, setEmpresasGrupo] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [apropriacoes, setApropriacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [parceiroBusca, setParceiroBusca] = useState('');

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);
        setError('');
        const [tituloData, obrasData, categoriasData, empresasData] = await Promise.all([
          getTituloFinanceiroById(id),
          getMinhasObras({ modo: 'FINANCEIRO', escopo: 'TODOS' }),
          getCategoriasFinanceiras(),
          getEmpresasGrupo({ ativo: 1 })
        ]);

        if (!active) return;

        const formBase = buildFormFromTitulo(tituloData);
        setTitulo(tituloData);
        setForm(formBase);
        setObras(Array.isArray(obrasData) ? obrasData : []);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        setEmpresasGrupo(Array.isArray(empresasData) ? empresasData : []);
        setParceiroBusca(tituloData?.parceiro?.nome || '');
      } catch (err) {
        if (active) setError(err?.message || 'Erro ao carregar titulo financeiro');
      } finally {
        if (active) setLoading(false);
      }
    }

    carregar();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!form?.obra_id) {
      setApropriacoes([]);
      return undefined;
    }

    let active = true;
    listarApropriacoes({ obra_id: form.obra_id })
      .then((data) => {
        if (!active) return;
        setApropriacoes(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setApropriacoes([]);
      });

    return () => {
      active = false;
    };
  }, [form?.obra_id]);

  useEffect(() => {
    if (!form) return undefined;

    let active = true;
    const params = {
      ativo: 1,
      limit: 200,
      q: parceiroBusca.trim()
    };
    if (form.tipo === 'RECEBER') {
      params.cliente = 1;
    }

    buscarParceiros(params)
      .then((data) => {
        if (!active) return;
        const lista = Array.isArray(data) ? data : [];
        const filtrada = form.tipo === 'RECEBER'
          ? lista.filter((item) => item.cliente !== false)
          : lista.filter((item) => item.fornecedor !== false || item.corretor === true);
        const parceiroAtual = titulo?.parceiro && !filtrada.some((item) => String(item.id) === String(titulo.parceiro.id))
          ? [titulo.parceiro]
          : [];
        setParceiros([...parceiroAtual, ...filtrada]);
      })
      .catch(() => {
        if (active) setParceiros(titulo?.parceiro ? [titulo.parceiro] : []);
      });

    return () => {
      active = false;
    };
  }, [form?.tipo, parceiroBusca, titulo]);

  const categoriasFiltradas = useMemo(
    () => categorias.filter((categoria) => categoriaCompativel(categoria, form?.tipo)),
    [categorias, form?.tipo]
  );
  const obraSelecionada = useMemo(
    () => obras.find((obra) => String(obra.id) === String(form?.obra_id)) || null,
    [obras, form?.obra_id]
  );
  const empresaDaObraId = getEmpresaObraId(obraSelecionada);
  const empresaTravadaPelaObra = Boolean(empresaDaObraId);
  const categoriaSelecionada = useMemo(
    () => categorias.find((categoria) => String(categoria.id) === String(form?.categoria_financeira_id)) || null,
    [categorias, form?.categoria_financeira_id]
  );
  const bloqueio = useMemo(() => getTituloBloqueado(titulo), [titulo]);

  useEffect(() => {
    if (!form || !empresaDaObraId || String(form.empresa_id || '') === String(empresaDaObraId)) {
      return;
    }

    setForm((current) => ({
      ...current,
      empresa_id: empresaDaObraId
    }));
  }, [empresaDaObraId, form]);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'obra_id') {
        const obra = obras.find((item) => String(item.id) === String(value));
        next.empresa_id = getEmpresaObraId(obra);
        next.apropriacao_id = '';
      }
      if (field === 'tipo') {
        next.parceiro_id = '';
        next.categoria_financeira_id = '';
        next.forma_cobranca = value === 'RECEBER' ? next.forma_cobranca : '';
      }
      if (field === 'intercompany' && !value) {
        next.empresa_contraparte_id = '';
        next.intercompany_group_id = '';
        next.empresa_origem_id = '';
        next.empresa_destino_id = '';
        next.tipo_intercompany = '';
        next.motivo_intercompany = '';
      }
      return next;
    });
  }

  function validar() {
    if (!form.empresa_id) return 'Informe a empresa real do titulo.';
    if (!form.obra_id) return 'Selecione a obra/centro de custo.';
    if (!form.parceiro_id) return 'Selecione o parceiro.';
    if (!form.descricao.trim()) return 'Informe a descricao.';
    if (toCurrencyNumber(form.valor) <= 0) return 'Informe o valor do titulo.';
    if (!form.data_vencimento) return 'Informe o vencimento.';
    if (form.considera_dre) {
      if (!categoriaSelecionada) return 'Selecione uma categoria financeira para DRE.';
      if (categoriaSelecionada.considera_dre === false || !String(categoriaSelecionada.dre_grupo || '').trim()) {
        return 'A categoria selecionada precisa estar classificada para DRE.';
      }
      if (!form.competencia_data) return 'Informe a competencia DRE.';
    }
    if (form.intercompany) {
      if (!form.empresa_origem_id) return 'Informe a empresa origem.';
      if (!form.empresa_destino_id) return 'Informe a empresa destino.';
      if (String(form.empresa_origem_id) === String(form.empresa_destino_id)) return 'Origem e destino nao podem ser iguais.';
      if (!form.empresa_contraparte_id) return 'Informe a empresa contraparte.';
      if (!form.tipo_intercompany) return 'Informe o tipo.';
    }
    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const erroValidacao = validar();
    if (erroValidacao) {
      setError(erroValidacao);
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = {
        ...form,
        valor: toCurrencyNumber(form.valor),
        apropriacao_id: form.apropriacao_id || null,
        categoria_financeira_id: form.categoria_financeira_id || null,
        numero_documento: form.numero_documento || null,
        observacoes: form.observacoes || null,
        data_emissao: form.data_emissao || null,
        competencia_data: form.considera_dre ? form.competencia_data : null,
        forma_cobranca: form.tipo === 'RECEBER' ? form.forma_cobranca || null : null,
        status_cobranca: form.tipo === 'RECEBER' && form.forma_cobranca ? form.status_cobranca : null,
        banco_cobranca: form.banco_cobranca || null,
        nosso_numero: form.nosso_numero || null,
        linha_digitavel: form.linha_digitavel || null,
        codigo_barras: form.codigo_barras || null,
        identificador_externo: form.identificador_externo || null,
        boleto_emitido_em: form.boleto_emitido_em || null,
        empresa_contraparte_id: form.intercompany ? form.empresa_contraparte_id || null : null,
        intercompany_group_id: form.intercompany ? form.intercompany_group_id || null : null,
        empresa_origem_id: form.intercompany ? form.empresa_origem_id || null : null,
        empresa_destino_id: form.intercompany ? form.empresa_destino_id || null : null,
        tipo_intercompany: form.intercompany ? form.tipo_intercompany || null : null,
        motivo_intercompany: form.intercompany ? form.motivo_intercompany || null : null
      };
      const atualizado = await atualizarTituloFinanceiro(id, payload);
      navigate(`/financeiro/titulos/${atualizado.id}`);
    } catch (err) {
      setError(err?.message || 'Erro ao salvar edicao do titulo');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--c-muted)]">Carregando titulo financeiro...</p>;
  }

  if (!titulo || !form) {
    return <p className="text-sm text-[var(--c-muted)]">Titulo financeiro nao encontrado.</p>;
  }

  return (
    <div className="page solicitacoes-page">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link className="btn btn-outline mb-3" to={`/financeiro/titulos/${id}`}>
            Voltar ao titulo
          </Link>
          <h1 className="page-title">Editar titulo {titulo.codigo || `#${titulo.id}`}</h1>
          <p className="text-sm text-[var(--c-muted)]">
            Ajuste permitido apenas enquanto o titulo estiver aberto e sem baixa.
          </p>
        </div>
      </div>

      {bloqueio && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {bloqueio}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="form-field">
            <span>Tipo</span>
            <select value={form.tipo} onChange={(event) => updateField('tipo', event.target.value)} disabled={Boolean(bloqueio)}>
              <option value="PAGAR">Conta a pagar</option>
              <option value="RECEBER">Conta a receber</option>
            </select>
          </label>

          <label className="form-field xl:col-span-2">
            <span>Obra/Centro de custo</span>
            <select value={form.obra_id} onChange={(event) => updateField('obra_id', event.target.value)} disabled={Boolean(bloqueio)}>
              <option value="">Selecione</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>{obra.nome}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Empresa real</span>
            <select
              value={form.empresa_id}
              onChange={(event) => updateField('empresa_id', event.target.value)}
              disabled={Boolean(bloqueio) || empresaTravadaPelaObra}
            >
              <option value="">Selecione</option>
              {empresasGrupo.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>{empresa.nome || empresa.razao_social}</option>
              ))}
            </select>
            <small className="text-xs text-[var(--c-muted)]">
              {empresaTravadaPelaObra
                ? 'Preenchida pela empresa vinculada a obra/centro de custo.'
                : 'Informe a empresa real para regularizar titulos antigos sem empresa vinculada.'}
            </small>
          </label>

          <label className="form-field xl:col-span-2">
            <span>Buscar parceiro</span>
            <input value={parceiroBusca} onChange={(event) => setParceiroBusca(event.target.value)} placeholder="Nome ou documento" disabled={Boolean(bloqueio)} />
          </label>

          <label className="form-field xl:col-span-2">
            <span>{form.tipo === 'RECEBER' ? 'Cliente' : 'Credor/Fornecedor'}</span>
            <select value={form.parceiro_id} onChange={(event) => updateField('parceiro_id', event.target.value)} disabled={Boolean(bloqueio)}>
              <option value="">Selecione</option>
              {parceiros.map((parceiro) => (
                <option key={parceiro.id} value={parceiro.id}>{parceiro.nome}</option>
              ))}
            </select>
          </label>

          <label className="form-field xl:col-span-2">
            <span>Categoria financeira</span>
            <select value={form.categoria_financeira_id} onChange={(event) => updateField('categoria_financeira_id', event.target.value)} disabled={Boolean(bloqueio)}>
              <option value="">Selecione</option>
              {categoriasFiltradas.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}{categoria.dre_grupo ? ` - ${categoria.dre_grupo}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Apropriacao</span>
            <select value={form.apropriacao_id} onChange={(event) => updateField('apropriacao_id', event.target.value)} disabled={Boolean(bloqueio)}>
              <option value="">Sem apropriacao</option>
              {apropriacoes.map((apropriacao) => (
                <option key={apropriacao.id} value={apropriacao.id}>{apropriacao.codigo ? `${apropriacao.codigo} - ` : ''}{apropriacao.nome}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Valor</span>
            <input value={form.valor} onChange={(event) => updateField('valor', normalizeCurrencyTyping(event.target.value))} disabled={Boolean(bloqueio)} />
          </label>

          <label className="form-field xl:col-span-2">
            <span>Descricao</span>
            <input value={form.descricao} onChange={(event) => updateField('descricao', event.target.value)} disabled={Boolean(bloqueio)} />
          </label>

          <label className="form-field">
            <span>Numero do documento</span>
            <input value={form.numero_documento} onChange={(event) => updateField('numero_documento', event.target.value)} disabled={Boolean(bloqueio)} />
          </label>

          <label className="form-field">
            <span>Emissao</span>
            <input type="date" value={form.data_emissao} onChange={(event) => updateField('data_emissao', event.target.value)} disabled={Boolean(bloqueio)} />
          </label>

          <label className="form-field">
            <span>Vencimento</span>
            <input type="date" value={form.data_vencimento} onChange={(event) => updateField('data_vencimento', event.target.value)} disabled={Boolean(bloqueio)} />
          </label>

          <label className="form-field">
            <span>Competencia DRE</span>
            <input type="date" value={form.competencia_data} onChange={(event) => updateField('competencia_data', event.target.value)} disabled={Boolean(bloqueio) || !form.considera_dre} />
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text)]">
            <input type="checkbox" checked={form.considera_dre} onChange={(event) => updateField('considera_dre', event.target.checked)} disabled={Boolean(bloqueio)} />
            Considerar na DRE
          </label>
        </div>

        {form.tipo === 'RECEBER' && (
          <div className="rounded-xl border border-[var(--c-border)] p-4">
            <h2 className="mb-3 text-base font-semibold text-[var(--c-text)]">Dados de cobranca</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="form-field">
                <span>Forma</span>
                <select value={form.forma_cobranca} onChange={(event) => updateField('forma_cobranca', event.target.value)} disabled={Boolean(bloqueio)}>
                  <option value="">Sem cobranca</option>
                  {FORMAS_COBRANCA.map((forma) => <option key={forma} value={forma}>{forma}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Status</span>
                <select value={form.status_cobranca} onChange={(event) => updateField('status_cobranca', event.target.value)} disabled={Boolean(bloqueio) || !form.forma_cobranca}>
                  {STATUS_COBRANCA.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Banco</span>
                <input value={form.banco_cobranca} onChange={(event) => updateField('banco_cobranca', event.target.value)} disabled={Boolean(bloqueio)} />
              </label>
              <label className="form-field">
                <span>Nosso numero</span>
                <input value={form.nosso_numero} onChange={(event) => updateField('nosso_numero', event.target.value)} disabled={Boolean(bloqueio)} />
              </label>
              <label className="form-field xl:col-span-2">
                <span>Linha digitavel</span>
                <input value={form.linha_digitavel} onChange={(event) => updateField('linha_digitavel', event.target.value)} disabled={Boolean(bloqueio)} />
              </label>
              <label className="form-field xl:col-span-2">
                <span>Codigo de barras</span>
                <input value={form.codigo_barras} onChange={(event) => updateField('codigo_barras', event.target.value)} disabled={Boolean(bloqueio)} />
              </label>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[var(--c-border)] p-4">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]">
            <input type="checkbox" checked={form.intercompany} onChange={(event) => updateField('intercompany', event.target.checked)} disabled={Boolean(bloqueio)} />
            Movimento Entre Empresas
          </label>
          {form.intercompany && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="form-field">
                <span>Origem</span>
                <select value={form.empresa_origem_id} onChange={(event) => updateField('empresa_origem_id', event.target.value)} disabled={Boolean(bloqueio)}>
                  <option value="">Selecione</option>
                  {empresasGrupo.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome || empresa.razao_social}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Destino</span>
                <select value={form.empresa_destino_id} onChange={(event) => updateField('empresa_destino_id', event.target.value)} disabled={Boolean(bloqueio)}>
                  <option value="">Selecione</option>
                  {empresasGrupo.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome || empresa.razao_social}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Contraparte</span>
                <select value={form.empresa_contraparte_id} onChange={(event) => updateField('empresa_contraparte_id', event.target.value)} disabled={Boolean(bloqueio)}>
                  <option value="">Selecione</option>
                  {empresasGrupo.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome || empresa.razao_social}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Tipo</span>
                <select value={form.tipo_intercompany} onChange={(event) => updateField('tipo_intercompany', event.target.value)} disabled={Boolean(bloqueio)}>
                  <option value="">Selecione</option>
                  {TIPOS_INTERCOMPANY.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="form-field xl:col-span-4">
                <span>Motivo</span>
                <input value={form.motivo_intercompany} onChange={(event) => updateField('motivo_intercompany', event.target.value)} disabled={Boolean(bloqueio)} />
              </label>
            </div>
          )}
        </div>

        <label className="form-field">
          <span>Observacoes</span>
          <textarea value={form.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} disabled={Boolean(bloqueio)} rows={4} />
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          <Link className="btn btn-outline" to={`/financeiro/titulos/${id}`}>
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primary" disabled={Boolean(bloqueio) || saving}>
            {saving ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </div>
      </form>
    </div>
  );
}
