import { useEffect, useState } from 'react';
import {
  listarFornecedoresCompra,
  criarFornecedorCompra,
  atualizarFornecedorCompra,
  desativarFornecedorCompra
} from '../../../services/compras';
import { useAuth } from '../../../contexts/AuthContext';
import { isBusinessAdmin } from '../../../utils/acessoProduto';
import { maskCep, maskCpfCnpj, maskPhone, onlyDigits } from '../../../utils/formatters';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO'
];

const CATEGORIAS_SUGERIDAS = [
  'Concreto e Argamassa',
  'Eletrico',
  'Hidraulico',
  'Ferragens e Metalurgia',
  'Madeira e Esquadrias',
  'Revestimentos',
  'Tintas e Acabamentos',
  'Equipamentos e Maquinas',
  'EPI e Seguranca',
  'Manutencao Geral',
  'Combustiveis',
  'Servicos Terceirizados',
  'Impermeabilizacao',
  'Estrutura Metalica',
  'Cobertura e Telhado',
  'Ceramica e Porcelanato',
  'Sanitarios e Metais',
  'Iluminacao',
  'Automacao e CFTV',
  'Limpeza e Conservacao'
];

function formatarWhatsApp(numero) {
  if (!numero) return '-';
  const digits = String(numero).replace(/\D/g, '');
  return digits || numero;
}

function whatsappLink(numero, mensagem) {
  const digits = String(numero || '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/55${digits}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`;
}

function ModalFornecedor({ fornecedor, onSalvar, onFechar, salvando }) {
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    email: '',
    whatsapp: '',
    contato: '',
    observacoes: '',
    cidade: '',
    estado: '',
    cep: '',
    categoria_insumos: []
  });
  const [novaCategoria, setNovaCategoria] = useState('');

  useEffect(() => {
    if (fornecedor) {
      setForm({
        nome: fornecedor.nome || '',
        cnpj: maskCpfCnpj(fornecedor.cnpj),
        email: fornecedor.email || '',
        whatsapp: maskPhone(fornecedor.whatsapp),
        contato: fornecedor.contato || '',
        observacoes: fornecedor.observacoes || '',
        cidade: fornecedor.cidade || '',
        estado: fornecedor.estado || '',
        cep: maskCep(fornecedor.cep),
        categoria_insumos: Array.isArray(fornecedor.categoria_insumos) ? [...fornecedor.categoria_insumos] : []
      });
    } else {
      setForm({
        nome: '', cnpj: '', email: '', whatsapp: '', contato: '',
        observacoes: '', cidade: '', estado: '', cep: '', categoria_insumos: []
      });
    }
  }, [fornecedor]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function adicionarCategoria(cat) {
    const c = String(cat || '').trim();
    if (!c) return;
    setForm((f) => ({
      ...f,
      categoria_insumos: f.categoria_insumos.includes(c) ? f.categoria_insumos : [...f.categoria_insumos, c]
    }));
  }

  function removerCategoria(cat) {
    setForm((f) => ({
      ...f,
      categoria_insumos: f.categoria_insumos.filter((c) => c !== cat)
    }));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarCategoria(novaCategoria);
      setNovaCategoria('');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--c-surface)] shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-border)]">
          <h2 className="font-semibold text-[var(--c-text)]">
            {fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h2>
          <button type="button" onClick={onFechar} className="text-[var(--c-muted)] hover:text-[var(--c-text)]">✕</button>
        </div>

        <div className="px-6 py-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="app-filter-label">Nome *</label>
              <input className="input" value={form.nome} onChange={(e) => update('nome', e.target.value)} placeholder="Razao social ou nome fantasia" />
            </div>
            <div>
              <label className="app-filter-label">CNPJ / CPF</label>
              <input className="input" value={form.cnpj} onChange={(e) => update('cnpj', maskCpfCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="app-filter-label">WhatsApp</label>
              <input className="input" value={form.whatsapp} onChange={(e) => update('whatsapp', maskPhone(e.target.value))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="app-filter-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="contato@empresa.com" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="app-filter-label">Cidade</label>
              <input className="input" value={form.cidade} onChange={(e) => update('cidade', e.target.value)} placeholder="Sao Paulo" />
            </div>
            <div>
              <label className="app-filter-label">Estado</label>
              <select className="input" value={form.estado} onChange={(e) => update('estado', e.target.value)}>
                <option value="">UF</option>
                {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="app-filter-label">CEP</label>
              <input className="input" value={form.cep} onChange={(e) => update('cep', maskCep(e.target.value))} placeholder="00000-000" />
            </div>
          </div>

          <div>
            <label className="app-filter-label">Nome do Contato</label>
            <input className="input" value={form.contato} onChange={(e) => update('contato', e.target.value)} placeholder="Responsavel comercial" />
          </div>

          <div>
            <label className="app-filter-label">Categorias de Insumos Atendidos</label>
            <p className="text-xs text-[var(--c-muted)] mb-2">
              Defina quais categorias este fornecedor atende. Usado para filtrar fornecedores ao enviar cotacoes.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {form.categoria_insumos.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {cat}
                  <button type="button" onClick={() => removerCategoria(cat)} className="text-blue-400 hover:text-blue-700">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <input
                className="input flex-1"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma categoria e pressione Enter"
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { adicionarCategoria(novaCategoria); setNovaCategoria(''); }}
              >
                Adicionar
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {CATEGORIAS_SUGERIDAS.filter((c) => !form.categoria_insumos.includes(c)).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => adicionarCategoria(cat)}
                  className="rounded-full border border-[var(--c-border)] px-2 py-0.5 text-xs text-[var(--c-muted)] hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                >
                  + {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="app-filter-label">Observacoes</label>
            <textarea className="input" rows={3} value={form.observacoes} onChange={(e) => update('observacoes', e.target.value)} placeholder="Condicoes comerciais, prazo padrao, etc." />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--c-border)]">
          <button type="button" className="btn btn-outline" onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={() => onSalvar(form)} disabled={salvando || !form.nome.trim()}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GestaoFornecedores() {
  const { user } = useAuth();
  const canManage = isBusinessAdmin(user) || ['COMPRAS'].some((t) =>
    [String(user?.area || '').toUpperCase(), String(user?.setor?.codigo || '').toUpperCase()].includes(t)
  );

  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState(null);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [incluirInativos, setIncluirInativos] = useState(false);

  async function carregar() {
    try {
      setLoading(true);
      const params = {};
      if (busca.trim()) params.q = busca.trim();
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroCategoria.trim()) params.categoria = filtroCategoria.trim();
      if (incluirInativos) params.incluir_inativos = 1;
      const data = await listarFornecedoresCompra(params);
      setFornecedores(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(error.message || 'Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function handleSalvar(form) {
    try {
      setSalvando(true);
      const payload = {
        ...form,
        cnpj: onlyDigits(form.cnpj),
        whatsapp: onlyDigits(form.whatsapp),
        cep: onlyDigits(form.cep)
      };
      if (fornecedorEditando) {
        await atualizarFornecedorCompra(fornecedorEditando.id, payload);
      } else {
        await criarFornecedorCompra(payload);
      }
      setModalAberto(false);
      setFornecedorEditando(null);
      await carregar();
    } catch (error) {
      alert(error.message || 'Erro ao salvar fornecedor');
    } finally {
      setSalvando(false);
    }
  }

  async function handleDesativar(id) {
    if (!confirm('Desativar este fornecedor?')) return;
    try {
      await desativarFornecedorCompra(id);
      await carregar();
    } catch (error) {
      alert(error.message || 'Erro ao desativar fornecedor');
    }
  }

  return (
    <div className="page solicitacoes-page w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="card sol-surface-card app-toolbar-card min-w-0 max-w-full">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Fornecedores</h1>
            <p className="page-subtitle">Cadastro de fornecedores para cotacoes de compra.</p>
          </div>
          {canManage && (
            <div className="app-page-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => { setFornecedorEditando(null); setModalAberto(true); }}
              >
                + Novo Fornecedor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="card sol-surface-card solicitacoes-filtros app-filters-card mt-4 min-w-0 max-w-full">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-12 xl:items-center">
          <input
            className="input min-w-0 sm:col-span-2 xl:col-span-4"
            placeholder="Buscar por nome, CNPJ ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && carregar()}
          />
          <select className="input min-w-0 xl:col-span-2" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos os estados</option>
            {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          <input
            className="input min-w-0 xl:col-span-3"
            placeholder="Filtrar por categoria..."
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          />
          <label className="flex min-w-0 items-center gap-2 whitespace-nowrap text-sm text-[var(--c-muted)] xl:col-span-2">
            <input type="checkbox" checked={incluirInativos} onChange={(e) => setIncluirInativos(e.target.checked)} />
            Incluir inativos
          </label>
          <button type="button" className="btn btn-outline justify-center xl:col-span-1" onClick={carregar} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="card sol-surface-card mt-4 min-w-0 max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-[var(--c-muted)]">{fornecedores.length} fornecedor(es)</span>
        </div>

        {loading ? (
          <div className="app-empty-card">Carregando...</div>
        ) : fornecedores.length === 0 ? (
          <div className="app-empty-card">Nenhum fornecedor encontrado. Ajuste os filtros ou cadastre um novo.</div>
        ) : (
          <div className="app-table-shell min-w-0 max-w-full overflow-hidden">
            <div className="compras-responsive-table min-w-0 max-w-full pb-2">
              <table className="table min-w-[1120px]">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CNPJ</th>
                  <th>WhatsApp</th>
                  <th>Email</th>
                  <th>Cidade / UF</th>
                  <th>Categorias</th>
                  <th>Status</th>
                  {canManage && <th>Acoes</th>}
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((f) => (
                  <tr key={f.id} className={!f.ativo ? 'opacity-50' : ''}>
                    <td className="max-w-[260px] font-medium">
                      {f.nome}
                      {f.contato && <div className="text-xs text-[var(--c-muted)]">{f.contato}</div>}
                    </td>
                    <td>{f.cnpj || '-'}</td>
                    <td>
                      {f.whatsapp ? (
                        <a
                          href={whatsappLink(f.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline font-medium"
                        >
                          {f.whatsapp}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="max-w-[240px] break-words">{f.email || '-'}</td>
                    <td>
                      {[f.cidade, f.estado].filter(Boolean).join(' / ') || '-'}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(f.categoria_insumos) && f.categoria_insumos.length > 0
                          ? f.categoria_insumos.map((cat) => (
                            <span key={cat} className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                              {cat}
                            </span>
                          ))
                          : <span className="text-xs text-[var(--c-muted)]">-</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span className={`app-status-pill ${f.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {f.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <div className="flex gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => { setFornecedorEditando(f); setModalAberto(true); }}
                          >
                            Editar
                          </button>
                          {f.ativo && (
                            <button
                              type="button"
                              className="btn btn-outline text-red-500 hover:border-red-400"
                              onClick={() => handleDesativar(f.id)}
                            >
                              Desativar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalAberto && (
        <ModalFornecedor
          fornecedor={fornecedorEditando}
          onSalvar={handleSalvar}
          onFechar={() => { setModalAberto(false); setFornecedorEditando(null); }}
          salvando={salvando}
        />
      )}
    </div>
  );
}
