import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCog6Tooth,
  HiOutlineDocumentText,
  HiOutlineShieldCheck
} from 'react-icons/hi2';
import { TabelaPadrao } from '../../../components/padrao';
import {
  buildGovernancaExportUrl,
  gerarGovernancaSnapshot,
  getGovernancaDashboard
} from '../services/governancaApi';
import { useAuth } from '../../../contexts/AuthContext';
import {
  canManageSystemGovernance,
  canViewSystemAudit,
  canViewSystemProductEvolution,
  canViewSystemTechMonitor
} from '../../../utils/acessoProduto';
import { authHeaders } from '../../../services/api';

const TABS = [
  { key: 'executiva', label: 'Visao Executiva' },
  { key: 'adocao', label: 'Adocao' },
  { key: 'eficiencia', label: 'Eficiencia' },
  { key: 'auditoria', label: 'Auditoria' },
  { key: 'saude', label: 'Saude Tecnica' },
  { key: 'produto', label: 'Produto' }
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function Metric({ label, value, detail, icon: Icon = HiOutlineChartBar }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatNumber(value)}</p>
          {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
        </div>
        <span className="rounded-xl bg-slate-100 p-2 text-slate-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ value }) {
  const ok = ['ok', 'configurado', 'habilitado', 'controlado'].includes(String(value || '').toLowerCase());
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
      ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
    }`}>
      {value || 'pendente'}
    </span>
  );
}

function Section({ title, subtitle, children, actions }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default function GovernancaSistema() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('executiva');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = canManageSystemGovernance(user);
  const canAudit = canViewSystemAudit(user);
  const canTech = canViewSystemTechMonitor(user);
  const canProduct = canViewSystemProductEvolution(user);

  const visibleTabs = useMemo(() => TABS.filter((tab) => {
    if (tab.key === 'auditoria') return canAudit;
    if (tab.key === 'saude') return canTech;
    if (tab.key === 'produto') return canProduct;
    return true;
  }), [canAudit, canProduct, canTech]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await getGovernancaDashboard({ limit: 15 });
      setData(result);
    } catch (err) {
      setError(err.message || 'Nao foi possivel carregar governanca.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key || 'executiva');
    }
  }, [activeTab, visibleTabs]);

  async function handleSnapshot() {
    setSaving(true);
    setError('');
    try {
      await gerarGovernancaSnapshot();
      await load();
    } catch (err) {
      setError(err.message || 'Nao foi possivel gerar snapshot.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(format) {
    const response = await fetch(buildGovernancaExportUrl({
      type: activeTab === 'auditoria' ? 'auditoria' : activeTab === 'produto' ? 'snapshots' : 'dashboard',
      format
    }), {
      headers: authHeaders()
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `governanca-${activeTab}.${format === 'xlsx' ? 'xls' : format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const executive = data?.executiva || {};
  const efficiency = data?.eficiencia || {};
  const adoption = data?.adocao || {};
  const audit = data?.auditoria || {};
  const health = data?.saude_tecnica || {};
  const product = data?.evolucao_produto || {};

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-6 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Administracao</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">Governanca do Sistema</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Visao institucional de adocao, eficiencia, auditoria, saude tecnica e evolucao do produto.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={load}>
                <HiOutlineArrowPath className="h-4 w-4" /> Atualizar
              </button>
              {canManage ? (
                <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60" onClick={handleSnapshot}>
                  <HiOutlineClock className="h-4 w-4" /> {saving ? 'Gerando...' : 'Gerar snapshot'}
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {['csv', 'xlsx', 'pdf'].map((format) => (
              <button key={format} onClick={() => handleExport(format)} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold uppercase text-slate-700 hover:bg-slate-50">
                <HiOutlineArrowDownTray className="h-4 w-4" /> {format}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Carregando indicadores...</div>
        ) : null}

        {!loading && activeTab === 'executiva' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Usuarios ativos" value={executive.usuarios_ativos} detail={`${formatNumber(executive.usuarios_totais)} usuarios cadastrados`} icon={HiOutlineShieldCheck} />
            <Metric label="Processos abertos" value={executive.processos_abertos} detail="Solicitacoes em andamento" icon={HiOutlineDocumentText} />
            <Metric label="Processos concluidos" value={executive.processos_concluidos} detail="Historico institucional" icon={HiOutlineCheckCircle} />
            <Metric label="Documentos" value={executive.documentos} detail={`${formatNumber(executive.modulos_ativos)} modulos ativos`} icon={HiOutlineChartBar} />
            <Metric label="Empresas do grupo" value={executive.empresas_ativas} />
            <Metric label="Obras / centros" value={executive.obras_ativas} />
          </div>
        ) : null}

        {!loading && activeTab === 'adocao' ? (
          <Section title="Adocao do sistema" subtitle="Indicadores institucionais sem ranking individual.">
            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="Taxa de adocao" value={adoption.taxa_adocao_usuarios} detail="% de usuarios ativos em 30 dias" />
              <Metric label="Usuarios ativos 30d" value={adoption.usuarios_ativos_30d} />
              <Metric label="Acessos governanca 30d" value={adoption.acessos_governanca_30d} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(adoption.modulos_em_uso || []).map((item) => (
                <span key={item.modulo} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.modulo}</span>
              ))}
            </div>
          </Section>
        ) : null}

        {!loading && activeTab === 'eficiencia' ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Indice de conclusao" value={efficiency.indice_conclusao} detail="% dos processos medidos" />
            <Metric label="Titulos abertos" value={efficiency.titulos_abertos} />
            <Metric label="Titulos baixados" value={efficiency.titulos_baixados} />
            <Metric label="Pedidos de compra" value={efficiency.pedidos_compra} />
          </div>
        ) : null}

        {!loading && activeTab === 'auditoria' ? (
          <Section title="Auditoria e governanca" subtitle="Acessos ao modulo e eventos de seguranca agregados.">
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <Metric label="Eventos de seguranca" value={audit.eventos_seguranca} />
              <Metric label="Acessos governanca" value={audit.acessos_governanca} />
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <TabelaPadrao
                colunas={[
                  {
                    id: 'data',
                    titulo: 'Data',
                    tipo: 'data',
                    render: (log) => (log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR') : '-')
                  },
                  {
                    id: 'acao',
                    titulo: 'Acao',
                    // R17: a acao registrada nomeia o log de governanca.
                    tipo: 'identidade',
                    noCard: 'titulo',
                    render: (log) => log.acao
                  },
                  {
                    id: 'usuario',
                    titulo: 'Usuario',
                    tipo: 'codigo',
                    render: (log) => `#${log.usuario_id || '-'}`
                  },
                  {
                    id: 'ip',
                    titulo: 'IP',
                    tipo: 'codigo',
                    render: (log) => log.ip || '-'
                  }
                ]}
                itens={audit.logs || []}
                getId={(log) => log.id}
                storageKey="tabela:governanca-sistema:auditoria"
                rotuloRolagem="Logs de governanca"
                vazio="Nenhum log de governanca registrado ainda."
              />
            </div>
          </Section>
        ) : null}

        {!loading && activeTab === 'saude' ? (
          <Section title="Saude tecnica" subtitle={`Latencia medida: ${health.latency_ms || 0}ms. Uptime: ${formatNumber(health.uptime_seconds)}s.`}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 p-4"><p className="mb-2 text-xs font-semibold uppercase text-slate-500">API</p><StatusBadge value={health.api} /></div>
              <div className="rounded-2xl border border-slate-200 p-4"><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Database</p><StatusBadge value={health.database} /></div>
              <div className="rounded-2xl border border-slate-200 p-4"><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Storage</p><StatusBadge value={health.storage} /></div>
              <div className="rounded-2xl border border-slate-200 p-4"><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Config</p><HiOutlineCog6Tooth className="h-5 w-5 text-slate-600" /></div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries(health.integrations || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">{key.replace(/_/g, ' ')}</span>
                  <StatusBadge value={value} />
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {!loading && activeTab === 'produto' ? (
          <Section title="Evolucao do produto" subtitle="Leitura executiva do roadmap e dos snapshots consolidados.">
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <Metric label="Modulos consolidados" value={product.modulos_consolidados} />
              <Metric label="Snapshots historicos" value={(product.snapshots || []).length} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Modulos ativos</p>
                <div className="flex flex-wrap gap-2">
                  {(product.modulos || []).map((module) => <span key={module} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{module}</span>)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Proximas frentes</p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {(product.proximas_frentes || []).map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </div>
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
