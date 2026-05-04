import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros } from '../services/parceiros';
import { criarTituloFinanceiro, getCategoriasFinanceiras } from '../services/financeiro';
import { listarApropriacoes } from '../services/apropriacoes';
import { useAuth } from '../contexts/AuthContext';
import { hasEnabledModule } from '../utils/acessoProduto';
import { formatCurrencyInput, normalizeCurrencyTyping } from '../utils/formatters';

const FORMAS_COBRANCA = ['BOLETO', 'PIX', 'OUTROS'];
const STATUS_COBRANCA = ['PENDENTE_EMISSAO', 'EMITIDO', 'PAGO_BANCO', 'CONCILIADO', 'CANCELADO'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function resolveTipo(value) {
  return String(value || '').trim().toUpperCase() === 'RECEBER' ? 'RECEBER' : 'PAGAR';
}

function buildDefaultForm(tipo = 'PAGAR') {
  return {
    tipo: resolveTipo(tipo),
    obra_id: '',
    parceiro_id: '',
    categoria_financeira_id: '',
    descricao: '',
    numero_documento: '',
    forma_cobranca: '',
    status_cobranca: 'PENDENTE_EMISSAO',
    banco_cobranca: '',
    nosso_numero: '',
    linha_digitavel: '',
    codigo_barras: '',
    identificador_externo: '',
    boleto_emitido_em: '',
    valor: '',
    data_emissao: today(),
    data_vencimento: today(),
    observacoes: '',
    apropriacao_id: ''
  };
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function categoriaCompativel(categoria, tipoTitulo) {
  const tipoCategoria = String(categoria?.tipo || '').trim().toUpperCase();
  return tipoCategoria === tipoTitulo;
}

function prioridadeCategoria(categoria, tipoTitulo) {
  const tipoCategoria = String(categoria?.tipo || '').trim().toUpperCase();
  if (tipoCategoria === tipoTitulo) return 0;
  return 2;
}

function labelTipoTitulo(tipoTitulo) {
  return tipoTitulo === 'RECEBER' ? 'receber' : 'pagar';
}

export default function FinanceiroTituloNovo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const moduloApropriacoesHabilitado = hasEnabledModule(user, 'OBRAS');
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTipo = resolveTipo(searchParams.get('tipo'));
  const [form, setForm] = useState(() => buildDefaultForm(initialTipo));
  const [obras, setObras] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [apropriacoes, setApropriacoes] = useState([]);
  const [loadingApropriacoes, setLoadingApropriacoes] = useState(false);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingParceiros, setLoadingParceiros] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [parceiroBusca, setParceiroBusca] = useState('');

  useEffect(() => {
    let active = true;

    async function carregarBase() {
      try {
        setLoadingBase(true);
        setError('');
        const [obrasData, categoriasData] = await Promise.all([
          getMinhasObras({ modo: 'FINANCEIRO' }),
          getCategoriasFinanceiras()
        ]);

        if (!active) return;

        const obrasLista = Array.isArray(obrasData) ? obrasData : [];
        const categoriasLista = Array.isArray(categoriasData) ? categoriasData : [];
        setObras(obrasLista);
        setCategorias(categoriasLista);
        setForm((current) => ({
          ...current,
          obra_id: current.obra_id || String(obrasLista[0]?.id || '')
        }));
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar dados do financeiro');
      } finally {
        if (active) setLoadingBase(false);
      }
    }

    carregarBase();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function carregarParceiros() {
      try {
        setLoadingParceiros(true);
        const params = {
          ativo: 1,
          limit: 200,
          q: parceiroBusca.trim()
        };

        if (form.tipo === 'RECEBER') {
          params.cliente = 1;
        }

        const data = await buscarParceiros(params);
        if (!active) return;
        const listaBase = Array.isArray(data) ? data : [];
        const lista = form.tipo === 'RECEBER'
          ? listaBase.filter((item) => item.cliente !== false)
          : listaBase.filter((item) => item.fornecedor !== false || item.corretor === true);
        setParceiros(lista);
        setForm((current) => {
          if (!current.parceiro_id) return current;
          const exists = lista.some((item) => String(item.id) === String(current.parceiro_id));
          return exists ? current : { ...current, parceiro_id: '' };
        });
      } catch (err) {
        if (!active) return;
        setParceiros([]);
        setError(err?.message || 'Erro ao carregar parceiros');
      } finally {
        if (active) setLoadingParceiros(false);
      }
    }

    carregarParceiros();

    return () => {
      active = false;
    };
  }, [form.tipo, parceiroBusca]);

  useEffect(() => {
    if (!moduloApropriacoesHabilitado || !form.obra_id) {
      setApropriacoes([]);
      setForm((current) => ({ ...current, apropriacao_id: '' }));
      setLoadingApropriacoes(false);
      return;
    }

    let active = true;

    async function carregarApropriacoes() {
      try {
        setLoadingApropriacoes(true);
        const data = await listarApropriacoes({ obra_id: form.obra_id });
        if (!active) return;
        setApropriacoes(Array.isArray(data) ? data : []);
        setForm((current) => {
          if (!current.apropriacao_id) return current;
          const lista = Array.isArray(data) ? data : [];
          const exists = lista.some((item) => String(item.id) === String(current.apropriacao_id));
          return exists ? current : { ...current, apropriacao_id: '' };
        });
      } catch {
        if (!active) return;
        setApropriacoes([]);
      } finally {
        if (active) setLoadingApropriacoes(false);
      }
    }

    carregarApropriacoes();

    return () => {
      active = false;
    };
  }, [form.obra_id, moduloApropriacoesHabilitado]);

  const categoriasFiltradas = useMemo(() => {
    return [...categorias]
      .filter((categoria) => categoriaCompativel(categoria, form.tipo))
      .sort((a, b) => {
        const prioridade = prioridadeCategoria(a, form.tipo) - prioridadeCategoria(b, form.tipo);
        if (prioridade !== 0) return prioridade;
        return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' });
      });
  }, [categorias, form.tipo]);

  const categoriaResumo = useMemo(() => {
    const especificas = categoriasFiltradas.filter((categoria) => String(categoria.tipo || '').trim().toUpperCase() === form.tipo).length;

    if (!categoriasFiltradas.length) {
      return `Nenhuma categoria compativel com titulos de ${labelTipoTitulo(form.tipo)}.`;
    }

    return `${especificas} categoria(s) de contas a ${labelTipoTitulo(form.tipo)} disponivel(is).`;
  }, [categoriasFiltradas, form.tipo]);

  const parceiroResumo = useMemo(() => {
    if (!parceiroBusca.trim()) {
      return `${parceiros.length} ${form.tipo === 'RECEBER' ? 'cliente(s)' : 'credor(es)'} carregado(s)`;
    }
    return `${parceiros.length} ${form.tipo === 'RECEBER' ? 'cliente(s)' : 'credor(es)'} encontrado(s) para "${parceiroBusca.trim()}"`;
  }, [form.tipo, parceiros, parceiroBusca]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'tipo') {
      setSearchParams({ tipo: value });
      setForm((current) => ({
        ...current,
        tipo: value,
        parceiro_id: '',
        categoria_financeira_id: '',
        forma_cobranca: value === 'RECEBER' ? current.forma_cobranca : '',
        status_cobranca: value === 'RECEBER' ? current.status_cobranca : 'PENDENTE_EMISSAO',
        banco_cobranca: value === 'RECEBER' ? current.banco_cobranca : '',
        nosso_numero: value === 'RECEBER' ? current.nosso_numero : '',
        linha_digitavel: value === 'RECEBER' ? current.linha_digitavel : '',
        codigo_barras: value === 'RECEBER' ? current.codigo_barras : '',
        identificador_externo: value === 'RECEBER' ? current.identificador_externo : '',
        boleto_emitido_em: value === 'RECEBER' ? current.boleto_emitido_em : ''
      }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');

      const payload = {
        ...form,
        obra_id: Number(form.obra_id),
        parceiro_id: Number(form.parceiro_id),
        categoria_financeira_id: form.categoria_financeira_id ? Number(form.categoria_financeira_id) : undefined,
        apropriacao_id: form.apropriacao_id ? Number(form.apropriacao_id) : undefined
      };

      const titulo = await criarTituloFinanceiro(payload);
      alert('Conta criada com sucesso.');
      navigate(`/financeiro/titulos/${titulo.id}`);
    } catch (err) {
      setError(err?.message || 'Erro ao criar conta manual');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page solicitacoes-page max-w-5xl mx-auto">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">
              {form.tipo === 'RECEBER' ? 'Nova conta a receber' : 'Nova conta a pagar'}
            </h1>
            <p className="page-subtitle">
              Cadastre contas manuais que nao nasceram de uma solicitacao ou contrato de venda.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/titulos" className="btn btn-outline">Voltar para titulos</Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="app-alert app-alert--error">
          {error}
        </div>
      )}

      {loadingBase ? (
        <div className="app-empty-card">Carregando estrutura do financeiro...</div>
      ) : (
        <div className="card sol-surface-card">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="sol-filtros-head">
              <div>
                <p className="sol-filtros-title">Dados da conta</p>
                <p className="sol-filtros-subtitle">
                  Esta conta entra no previsto enquanto estiver em aberto ou parcial, mesmo sem solicitacao vinculada.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
              <label className="sol-filter-field xl:col-span-2">
                <span className="sol-filter-label">Tipo</span>
                <select
                  className="input w-full"
                  value={form.tipo}
                  onChange={(event) => {
                    const tipo = resolveTipo(event.target.value);
                    setSearchParams({ tipo });
                    setForm((current) => ({
                      ...current,
                      tipo,
                      parceiro_id: '',
                      categoria_financeira_id: '',
                      forma_cobranca: tipo === 'RECEBER' ? current.forma_cobranca : '',
                      status_cobranca: tipo === 'RECEBER' ? current.status_cobranca : 'PENDENTE_EMISSAO',
                      banco_cobranca: tipo === 'RECEBER' ? current.banco_cobranca : '',
                      nosso_numero: tipo === 'RECEBER' ? current.nosso_numero : '',
                      linha_digitavel: tipo === 'RECEBER' ? current.linha_digitavel : '',
                      codigo_barras: tipo === 'RECEBER' ? current.codigo_barras : '',
                      identificador_externo: tipo === 'RECEBER' ? current.identificador_externo : '',
                      boleto_emitido_em: tipo === 'RECEBER' ? current.boleto_emitido_em : ''
                    }));
                  }}
                >
                  <option value="PAGAR">Conta a pagar</option>
                  <option value="RECEBER">Conta a receber</option>
                </select>
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Obra</span>
                <select
                  className="input w-full"
                  value={form.obra_id}
                  onChange={(event) => updateField('obra_id', event.target.value)}
                  required
                >
                  <option value="">Selecione a obra</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Categoria financeira</span>
                <select
                  className="input w-full"
                  value={form.categoria_financeira_id}
                  onChange={(event) => updateField('categoria_financeira_id', event.target.value)}
                >
                  <option value="">Sem categoria</option>
                  {categoriasFiltradas.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
                <span className="app-note mt-2">
                  {categoriaResumo}
                </span>
              </label>

              <label className="sol-filter-field md:col-span-2 xl:col-span-4">
                <span className="sol-filter-label">{form.tipo === 'RECEBER' ? 'Buscar cliente' : 'Buscar credor'}</span>
                <input
                  className="input w-full"
                  placeholder={form.tipo === 'RECEBER' ? 'Nome, CPF/CNPJ do cliente' : 'Nome, CPF/CNPJ do credor ou corretor'}
                  value={parceiroBusca}
                  onChange={(event) => setParceiroBusca(event.target.value)}
                />
                <span className="app-note mt-2">{loadingParceiros ? 'Carregando parceiros...' : parceiroResumo}</span>
              </label>

              <label className="sol-filter-field md:col-span-2 xl:col-span-5">
                <span className="sol-filter-label">{form.tipo === 'RECEBER' ? 'Cliente' : 'Credor'}</span>
                <select
                  className="input w-full"
                  value={form.parceiro_id}
                  onChange={(event) => updateField('parceiro_id', event.target.value)}
                  required
                  disabled={loadingParceiros}
                >
                  <option value="">{form.tipo === 'RECEBER' ? 'Selecione o cliente' : 'Selecione o credor'}</option>
                  {parceiros.map((parceiro) => (
                    <option key={parceiro.id} value={parceiro.id}>
                      {parceiro.nome} {parceiro.cpf_cnpj ? `- ${parceiro.cpf_cnpj}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sol-filter-field md:col-span-2 xl:col-span-4">
                <span className="sol-filter-label">Descricao</span>
                <input
                  className="input w-full"
                  placeholder="Ex.: Aluguel administrativo, recebimento de cliente, ajuste de caixa"
                  value={form.descricao}
                  onChange={(event) => updateField('descricao', event.target.value)}
                  required
                />
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Numero do documento</span>
                <input
                  className="input w-full"
                  placeholder="NF, boleto, recibo ou referencia interna"
                  value={form.numero_documento}
                  onChange={(event) => updateField('numero_documento', event.target.value)}
                />
              </label>

              <label className="sol-filter-field xl:col-span-2">
                <span className="sol-filter-label">Valor</span>
                <input
                  className="input w-full"
                  placeholder="R$ 0,00"
                  value={form.valor}
                  onChange={(event) => updateField('valor', normalizeCurrencyTyping(event.target.value))}
                  onBlur={(event) => updateField('valor', formatCurrencyInput(event.target.value))}
                  required
                />
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Data de emissao</span>
                <input
                  type="date"
                  className="input w-full"
                  value={form.data_emissao}
                  onChange={(event) => updateField('data_emissao', event.target.value)}
                />
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Data de vencimento</span>
                <input
                  type="date"
                  className="input w-full"
                  value={form.data_vencimento}
                  onChange={(event) => updateField('data_vencimento', event.target.value)}
                  required
                />
              </label>

              {form.tipo === 'RECEBER' && (
                <>
                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Forma de cobranca</span>
                    <select
                      className="input w-full"
                      value={form.forma_cobranca}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        forma_cobranca: event.target.value,
                        status_cobranca: event.target.value ? (current.status_cobranca || 'PENDENTE_EMISSAO') : 'PENDENTE_EMISSAO'
                      }))}
                    >
                      <option value="">Nao controlar</option>
                      {FORMAS_COBRANCA.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Status da cobranca</span>
                    <select
                      className="input w-full"
                      value={form.status_cobranca}
                      onChange={(event) => updateField('status_cobranca', event.target.value)}
                      disabled={!form.forma_cobranca}
                    >
                      {STATUS_COBRANCA.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Banco da cobranca</span>
                    <input
                      className="input w-full"
                      placeholder="Ex.: Caixa, Banco do Brasil, Sicredi"
                      value={form.banco_cobranca}
                      onChange={(event) => updateField('banco_cobranca', event.target.value)}
                    />
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Emitido em</span>
                    <input
                      type="date"
                      className="input w-full"
                      value={form.boleto_emitido_em}
                      onChange={(event) => updateField('boleto_emitido_em', event.target.value)}
                    />
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Nosso numero</span>
                    <input
                      className="input w-full"
                      value={form.nosso_numero}
                      onChange={(event) => updateField('nosso_numero', event.target.value)}
                    />
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Identificador externo</span>
                    <input
                      className="input w-full"
                      placeholder="ID da cobranca no banco"
                      value={form.identificador_externo}
                      onChange={(event) => updateField('identificador_externo', event.target.value)}
                    />
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Linha digitavel</span>
                    <input
                      className="input w-full"
                      value={form.linha_digitavel}
                      onChange={(event) => updateField('linha_digitavel', event.target.value)}
                    />
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Codigo de barras</span>
                    <input
                      className="input w-full"
                      value={form.codigo_barras}
                      onChange={(event) => updateField('codigo_barras', event.target.value)}
                    />
                  </label>
                </>
              )}

              {moduloApropriacoesHabilitado && (
              <label className="sol-filter-field xl:col-span-4">
                <span className="sol-filter-label">Item de apropriacão</span>
                <select
                  className="input w-full"
                  value={form.apropriacao_id}
                  onChange={(event) => updateField('apropriacao_id', event.target.value)}
                  disabled={!form.obra_id || loadingApropriacoes}
                >
                  <option value="">Sem apropriacão</option>
                  {apropriacoes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.codigo ? `${item.codigo} — ${item.descricao}` : item.descricao}
                    </option>
                  ))}
                </select>
                <span className="app-note mt-2">
                  {!form.obra_id
                    ? 'Selecione uma obra para ver os itens.'
                    : loadingApropriacoes
                      ? 'Carregando...'
                      : apropriacoes.length === 0
                        ? 'Nenhum item cadastrado para esta obra.'
                        : `${apropriacoes.length} item(s) disponivel(is).`}
                </span>
              </label>
              )}

              <label className="sol-filter-field md:col-span-2 xl:col-span-12">
                <span className="sol-filter-label">Observacoes</span>
                <textarea
                  className="input min-h-[120px] w-full"
                  placeholder="Informacoes adicionais para a operacao financeira"
                  value={form.observacoes}
                  onChange={(event) => updateField('observacoes', event.target.value)}
                />
              </label>
            </div>

            <div className="app-page-actions justify-end">
              <Link to="/financeiro/titulos" className="btn btn-outline">Cancelar</Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : (form.tipo === 'RECEBER' ? 'Criar conta a receber' : 'Criar conta a pagar')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
