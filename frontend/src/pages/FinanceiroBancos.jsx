import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineCloudArrowDown,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlinePaperAirplane,
  HiOutlineShieldCheck
} from 'react-icons/hi2';
import {
  baixarCaixaPagamentoRemessa,
  gerarCaixaPagamentoRemessa,
  getBankingDashboard,
  getCaixaPagamentoConvenios,
  getCaixaPagamentoRemessas,
  getCaixaPagamentoTitulosElegiveis,
  getContasBancarias,
  salvarCaixaPagamentoConvenio
} from '../services/financeiro';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import { TabelaPadrao } from '../components/padrao';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function statusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (['OK', 'ATIVO', 'CONCLUIDO', 'BAIXADO', 'PROCESSADO', 'SUCESSO'].includes(normalized)) {
    return 'app-status-pill bg-emerald-100 text-emerald-700';
  }
  if (['WARNING', 'ACTION', 'PENDENTE', 'ENVIADO_AO_BANCO', 'AGUARDANDO_CONFIRMACAO_BAIXA'].includes(normalized)) {
    return 'app-status-pill bg-amber-100 text-amber-700';
  }
  if (['CRITICAL', 'ERRO', 'FALHA_INTEGRACAO', 'REJEITADO', 'CANCELADO'].includes(normalized)) {
    return 'app-status-pill bg-rose-100 text-rose-700';
  }
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function MetricCard({ title, value, detail, icon: Icon }) {
  return (
    <div className="app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
        </div>
        {Icon ? <Icon className="h-6 w-6 text-blue-600" /> : null}
      </div>
    </div>
  );
}

function Section({ title, description, children, action }) {
  return (
    <section className="app-card p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children = 'Sem registros para exibir.' }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      {children}
    </div>
  );
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function hojeIso() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
}

const convenioInicial = {
  empresa_id: '',
  conta_bancaria_id: '',
  agencia: '',
  agencia_dv: '',
  conta: '',
  conta_dv: '',
  convenio_codigo: '',
  convenio_nome: '',
  compromisso_codigo: '',
  compromisso_nome: '',
  empresa_nome: '',
  empresa_cpf_cnpj: '',
  layout_arquivo_versao: '080',
  layout_lote_versao: '045',
  ambiente: 'HOMOLOGACAO',
  homologado: false,
  ativo: true
};

function CaixaPagamentosPanel() {
  const [empresas, setEmpresas] = useState([]);
  const [contas, setContas] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [remessas, setRemessas] = useState([]);
  const [titulos, setTitulos] = useState([]);
  const [selectedConvenioId, setSelectedConvenioId] = useState('');
  const [selectedTitulos, setSelectedTitulos] = useState([]);
  const [dataPagamento, setDataPagamento] = useState(hojeIso());
  const [form, setForm] = useState(convenioInicial);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadBase() {
    setError('');
    try {
      const [empresasData, contasData, conveniosData, remessasData] = await Promise.all([
        getEmpresasGrupo({ ativo: true }),
        getContasBancarias(),
        getCaixaPagamentoConvenios(),
        getCaixaPagamentoRemessas()
      ]);
      setEmpresas(normalizeList(empresasData));
      setContas(normalizeList(contasData));
      const conveniosList = normalizeList(conveniosData);
      setConvenios(conveniosList);
      setRemessas(normalizeList(remessasData));
      if (!selectedConvenioId && conveniosList[0]?.id) {
        setSelectedConvenioId(String(conveniosList[0].id));
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados Caixa Pagamentos');
    }
  }

  async function loadTitulos(convenioId = selectedConvenioId) {
    if (!convenioId) {
      setTitulos([]);
      setSelectedTitulos([]);
      return;
    }
    setError('');
    try {
      const data = await getCaixaPagamentoTitulosElegiveis(convenioId);
      setTitulos(normalizeList(data));
      setSelectedTitulos([]);
    } catch (err) {
      setTitulos([]);
      setSelectedTitulos([]);
      setError(err.message || 'Erro ao buscar titulos elegiveis');
    }
  }

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTitulos(selectedConvenioId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvenioId]);

  function onEmpresaChange(value) {
    const empresa = empresas.find((item) => String(item.id) === String(value));
    setForm((current) => ({
      ...current,
      empresa_id: value,
      empresa_nome: empresa?.razao_social || empresa?.nome || current.empresa_nome,
      empresa_cpf_cnpj: empresa?.cnpj || current.empresa_cpf_cnpj
    }));
  }

  function onContaChange(value) {
    const conta = contas.find((item) => String(item.id) === String(value));
    setForm((current) => ({
      ...current,
      conta_bancaria_id: value,
      agencia: conta?.agencia || current.agencia,
      conta: conta?.conta || current.conta
    }));
  }

  async function submitConvenio(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await salvarCaixaPagamentoConvenio(form);
      setForm(convenioInicial);
      setMessage('Convenio Caixa de pagamentos salvo.');
      await loadBase();
    } catch (err) {
      setError(err.message || 'Erro ao salvar convenio');
    } finally {
      setLoading(false);
    }
  }

  function toggleTitulo(id) {
    setSelectedTitulos((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  async function gerarRemessa() {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const remessa = await gerarCaixaPagamentoRemessa({
        convenio_id: selectedConvenioId,
        titulo_ids: selectedTitulos,
        data_pagamento: dataPagamento
      });
      setMessage(`Remessa ${remessa.nome_arquivo} gerada com sucesso.`);
      setSelectedTitulos([]);
      await Promise.all([loadBase(), loadTitulos(selectedConvenioId)]);
    } catch (err) {
      setError(err.message || 'Erro ao gerar remessa Caixa');
    } finally {
      setLoading(false);
    }
  }

  async function baixarRemessa(id) {
    try {
      const { blob, filename } = await baixarCaixaPagamentoRemessa(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Erro ao baixar remessa Caixa');
    }
  }

  const valorSelecionado = titulos
    .filter((titulo) => selectedTitulos.includes(titulo.id))
    .reduce((total, titulo) => total + Number(titulo.valor_saldo || titulo.valor_original || 0), 0);

  return (
    <Section
      title="Caixa Pagamentos CNAB240"
      description="Gere remessas reais de pagamento de boletos por codigo de barras/linha digitavel, separadas das remessas de cobranca."
      action={(
        <button type="button" className="app-button app-button-secondary" onClick={loadBase} disabled={loading}>
          <HiOutlineArrowPath className={loading ? 'animate-spin' : ''} />
          Atualizar Caixa
        </button>
      )}
    >
      <div className="space-y-4">
        {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={submitConvenio} className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-950">Cadastrar convenio</h3>
            <p className="mt-1 text-xs text-slate-500">Cada empresa do grupo pode ter seu proprio convenio Caixa.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Empresa
                <select className="app-input mt-1" value={form.empresa_id} onChange={(e) => onEmpresaChange(e.target.value)} required>
                  <option value="">Selecione</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>{empresa.razao_social || empresa.nome}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Conta de debito
                <select className="app-input mt-1" value={form.conta_bancaria_id} onChange={(e) => onContaChange(e.target.value)} required>
                  <option value="">Selecione</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>{conta.nome || conta.banco} - {conta.agencia}/{conta.conta}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Codigo do convenio
                <input className="app-input mt-1" value={form.convenio_codigo} onChange={(e) => setForm({ ...form, convenio_codigo: e.target.value })} required />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Nome do convenio
                <input className="app-input mt-1" value={form.convenio_nome} onChange={(e) => setForm({ ...form, convenio_nome: e.target.value })} placeholder="Ex.: CONSTRUTORA SUL CAPIXABA..." />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Codigo do compromisso
                <input className="app-input mt-1" value={form.compromisso_codigo} onChange={(e) => setForm({ ...form, compromisso_codigo: e.target.value })} placeholder="Ex.: 0001" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Nome do compromisso
                <input className="app-input mt-1" value={form.compromisso_nome} onChange={(e) => setForm({ ...form, compromisso_nome: e.target.value })} placeholder="Ex.: PAG FORN 0557 003..." />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Ambiente
                <select className="app-input mt-1" value={form.ambiente} onChange={(e) => setForm({ ...form, ambiente: e.target.value })}>
                  <option value="HOMOLOGACAO">Homologacao</option>
                  <option value="PRODUCAO">Producao</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Agencia
                <input className="app-input mt-1" value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} required />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Digito agencia
                <input className="app-input mt-1" value={form.agencia_dv} onChange={(e) => setForm({ ...form, agencia_dv: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Conta
                <input className="app-input mt-1" value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} required />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Digito conta
                <input className="app-input mt-1" value={form.conta_dv} onChange={(e) => setForm({ ...form, conta_dv: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                Nome da empresa no convenio
                <input className="app-input mt-1" value={form.empresa_nome} onChange={(e) => setForm({ ...form, empresa_nome: e.target.value })} required />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                CNPJ/CPF da empresa
                <input className="app-input mt-1" value={form.empresa_cpf_cnpj} onChange={(e) => setForm({ ...form, empresa_cpf_cnpj: e.target.value })} required />
              </label>
              <label className="flex items-center gap-2 pt-6 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={form.homologado} onChange={(e) => setForm({ ...form, homologado: e.target.checked })} />
                Convenio homologado
              </label>
            </div>
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Para a Caixa, o codigo do compromisso e usado como identificador operacional do CNAB quando informado.
              Se ele ficar vazio, o sistema usa o codigo do convenio.
            </div>
            <button type="submit" className="app-button mt-4 w-full" disabled={loading}>
              Salvar convenio
            </button>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Gerar remessa de pagamento</h3>
                <p className="mt-1 text-xs text-slate-500">Selecione um convenio e titulos com linha digitavel ou codigo de barras.</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <strong className="block text-sm text-slate-900">{formatCurrency(valorSelecionado)}</strong>
                {selectedTitulos.length} titulo(s) selecionado(s)
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <select className="app-input" value={selectedConvenioId} onChange={(e) => setSelectedConvenioId(e.target.value)}>
                <option value="">Selecione um convenio</option>
                {convenios.map((convenio) => (
                  <option key={convenio.id} value={convenio.id}>
                    {convenio.empresa?.razao_social || convenio.empresa_nome} - {convenio.compromisso_codigo || convenio.convenio_codigo}
                  </option>
                ))}
              </select>
              <input type="date" className="app-input" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              <button type="button" className="app-button" onClick={gerarRemessa} disabled={!selectedConvenioId || !selectedTitulos.length || loading}>
                <HiOutlinePaperAirplane />
                Gerar
              </button>
            </div>

            <div className="mt-4">
              <TabelaPadrao
                colunas={[
                  {
                    id: 'selecao',
                    titulo: 'Sel.',
                    // Seleção em lote: coluna de marcação com render próprio.
                    tipo: 'status',
                    render: (titulo) => (
                      <input
                        type="checkbox"
                        checked={selectedTitulos.includes(titulo.id)}
                        onChange={() => toggleTitulo(titulo.id)}
                        aria-label={`Selecionar titulo ${titulo.codigo}`}
                      />
                    )
                  },
                  { id: 'codigo', titulo: 'Titulo', tipo: 'codigo', render: (titulo) => titulo.codigo },
                  {
                    id: 'fornecedor',
                    titulo: 'Fornecedor',
                    // R17: o fornecedor NOMEIA o titulo elegivel.
                    tipo: 'identidade',
                    noCard: 'titulo',
                    render: (titulo) => titulo.parceiro?.nome || '-'
                  },
                  { id: 'vencimento', titulo: 'Venc.', tipo: 'data', render: (titulo) => titulo.data_vencimento || '-' },
                  { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (titulo) => formatCurrency(titulo.valor_saldo || titulo.valor_original) }
                ]}
                itens={titulos}
                storageKey="tabela:financeiro-bancos:titulos-elegiveis"
                rotuloRolagem="Titulos elegiveis para remessa"
                vazio="Nenhum titulo elegivel encontrado."
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-950">Remessas geradas</h3>
          <TabelaPadrao
            colunas={[
              {
                id: 'arquivo',
                titulo: 'Arquivo',
                // R17: o nome do arquivo NOMEIA a remessa gerada.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (remessa) => remessa.nome_arquivo
              },
              { id: 'empresa', titulo: 'Empresa', tipo: 'texto', render: (remessa) => remessa.empresa?.razao_social || remessa.empresa?.nome || '-' },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (remessa) => <span className={statusClass(remessa.status)}>{remessa.status}</span> },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (remessa) => formatCurrency(remessa.valor_total) }
            ]}
            itens={remessas}
            storageKey="tabela:financeiro-bancos:remessas"
            vazio="Sem registros para exibir."
            rotuloRolagem="Remessas geradas"
            larguraAcoes={140}
            acoesLinha={(remessa) => (
              <button type="button" className="app-button app-button-secondary" onClick={() => baixarRemessa(remessa.id)}>
                <HiOutlineCloudArrowDown />
                Baixar
              </button>
            )}
          />
        </div>
      </div>
    </Section>
  );
}

export default function FinanceiroBancos() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const data = await getBankingDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar painel bancario enterprise');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const snapshots = dashboard?.snapshots || {};
  const summary = dashboard?.summary || {};
  const alerts = dashboard?.alerts || [];
  const cnab = dashboard?.cnab240_payments || {};

  const statusLabel = useMemo(() => {
    if (loading) return 'Carregando';
    if (error) return 'Falha';
    return dashboard?.status || 'OK';
  }, [dashboard?.status, error, loading]);

  return (
    <div className="space-y-5">
      <header className="app-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">Financeiro</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Bancos Enterprise</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Visao consolidada de contas bancarias, pagamentos BB, boletos Caixa, remessas, retornos,
              conciliacao bancaria e financiamentos. O painel e de observabilidade e governanca, sem alterar
              a logica operacional existente.
            </p>
          </div>
          <button type="button" className="app-button app-button-secondary" onClick={loadDashboard} disabled={loading}>
            <HiOutlineArrowPath className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Saude bancaria" value={statusLabel} detail={formatDateTime(dashboard?.generated_at)} icon={HiOutlineShieldCheck} />
        <MetricCard title="Contas ativas" value={summary?.accounts?.active || 0} detail={`${summary?.accounts?.total || 0} cadastrada(s)`} icon={HiOutlineBanknotes} />
        <MetricCard title="Concil. pendente" value={summary?.reconciliation?.pending || 0} detail={formatCurrency(summary?.reconciliation?.pending_value)} icon={HiOutlineDocumentText} />
        <MetricCard title="Alertas" value={alerts.length} detail="Pontos para acompanhamento" icon={HiOutlineExclamationTriangle} />
      </div>

      <CaixaPagamentosPanel />

      <Section title="Alertas operacionais" description="Pontos que podem gerar distorcao de saldo, baixa ou retorno bancario.">
        {!alerts.length ? (
          <EmptyState>Nenhum alerta operacional encontrado.</EmptyState>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((alert) => (
              <div key={`${alert.type}-${alert.severity}`} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-slate-950">{alert.title}</strong>
                  <span className={statusClass(alert.severity)}>{alert.severity}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                {alert.source ? <p className="mt-2 text-xs font-medium text-blue-700">{alert.source}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Section title="Contas bancarias" description="Contas vinculadas a empresas do grupo e saldo operacional estimado pelos movimentos registrados.">
          <TabelaPadrao
            colunas={[
              {
                id: 'conta',
                titulo: 'Conta',
                // R17: a conta/banco NOMEIA o registro.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (account) => account.nome || account.banco || `Conta #${account.id}`
              },
              { id: 'empresa', titulo: 'Empresa', tipo: 'texto', render: (account) => account.empresa?.nome || account.empresa?.razao_social || '-' },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (account) => <span className={statusClass(account.ativo ? 'ATIVO' : 'INATIVO')}>{account.ativo ? 'ATIVO' : 'INATIVO'}</span> },
              { id: 'saldo', titulo: 'Saldo estimado', tipo: 'valor', render: (account) => formatCurrency(account.saldo_operacional_estimado) }
            ]}
            itens={snapshots.accounts?.data?.items || []}
            storageKey="tabela:financeiro-bancos:contas"
            vazio="Sem registros para exibir."
            rotuloRolagem="Contas bancarias"
          />
        </Section>

        <Section title="CNAB240 Pagamentos" description="Contrato tecnico preparado a partir do manual de pagamentos e debito automatico.">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
              <strong className="block text-sm">Segmento J habilitado</strong>
              <span className="text-xs">{cnab.status || 'BOLETO_SEGMENTO_J_READY'}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Segmentos planejados</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(cnab.supported_segments || []).map((segment) => (
                  <span key={segment.code} className="app-status-pill bg-slate-100 text-slate-700">
                    {segment.code} - {segment.name}
                  </span>
                ))}
              </div>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs">
              {(cnab.guardrails || []).slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Pagamentos BB" description="Lotes e transacoes do motor de pagamento em massa.">
          <TabelaPadrao
            colunas={[
              {
                id: 'lote',
                titulo: 'Lote',
                // R17: o codigo do lote NOMEIA o pagamento em massa.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (batch) => batch.codigo || `#${batch.id}`
              },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (batch) => <span className={statusClass(batch.status)}>{batch.status || '-'}</span> },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (batch) => formatCurrency(batch.valor_total) },
              { id: 'atualizado', titulo: 'Atualizado', tipo: 'data', render: (batch) => formatDateTime(batch.updatedAt) }
            ]}
            itens={snapshots.bb_payments?.data?.recent_batches || []}
            storageKey="tabela:financeiro-bancos:pagamentos-bb"
            vazio="Sem registros para exibir."
            rotuloRolagem="Lotes de pagamento BB"
          />
        </Section>

        <Section title="Boletos Caixa" description="Remessas, retornos e ocorrencias de cobranca separados do CNAB240 de pagamentos.">
          <TabelaPadrao
            colunas={[
              { id: 'origem', titulo: 'Origem', tipo: 'badge', render: (item) => item.origem },
              {
                id: 'codigo',
                titulo: 'Codigo',
                // R17: o codigo/arquivo NOMEIA a remessa ou o retorno.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.codigo || item.nome_arquivo || `#${item.id}`
              },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (item) => <span className={statusClass(item.status)}>{item.status || '-'}</span> },
              { id: 'data', titulo: 'Data', tipo: 'data', render: (item) => formatDateTime(item.createdAt) }
            ]}
            itens={[
              ...(snapshots.caixa_boletos?.data?.remessas?.recent || []).map((item) => ({ ...item, origem: 'Remessa' })),
              ...(snapshots.caixa_boletos?.data?.retornos?.recent || []).map((item) => ({ ...item, origem: 'Retorno' }))
            ].slice(0, 8)}
            getId={(item) => `${item.origem}-${item.id}`}
            storageKey="tabela:financeiro-bancos:boletos-caixa"
            vazio="Sem registros para exibir."
            rotuloRolagem="Remessas e retornos de boletos Caixa"
          />
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Conciliacao bancaria" description="Importacoes OFX e movimentos pendentes para evitar baixa duplicada ou saldo distorcido.">
          <TabelaPadrao
            colunas={[
              {
                id: 'movimento',
                titulo: 'Movimento',
                // R17: a descricao do banco NOMEIA o movimento conciliado.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.descricao_banco || item.documento || `Movimento #${item.id}`
              },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (item) => <span className={statusClass(item.status)}>{item.status || '-'}</span> },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => formatCurrency(item.valor) },
              { id: 'data', titulo: 'Data', tipo: 'data', render: (item) => item.data_movimento || '-' }
            ]}
            itens={snapshots.reconciliation?.data?.recent || []}
            storageKey="tabela:financeiro-bancos:conciliacao"
            vazio="Sem registros para exibir."
            rotuloRolagem="Movimentos de conciliacao"
          />
        </Section>

        <Section title="Financiamentos bancarios" description="Contratos bancarios que geram titulos e movimentam contas de credito.">
          <TabelaPadrao
            colunas={[
              {
                id: 'contrato',
                titulo: 'Contrato',
                // R17: o contrato NOMEIA o financiamento.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.codigo || item.numero_contrato || `#${item.id}`
              },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (item) => <span className={statusClass(item.status)}>{item.status || '-'}</span> },
              { id: 'parcelas', titulo: 'Parcelas', tipo: 'numero', render: (item) => item.quantidade_parcelas || '-' },
              { id: 'total', titulo: 'Total', tipo: 'valor', render: (item) => formatCurrency(item.valor_total) }
            ]}
            itens={snapshots.financing?.data?.recent || []}
            storageKey="tabela:financeiro-bancos:financiamentos"
            vazio="Sem registros para exibir."
            rotuloRolagem="Financiamentos bancarios"
          />
        </Section>
      </div>

      <Section title="Timeline bancaria" description="Linha de eventos consolidada entre pagamentos, boletos e conciliacao.">
        {!dashboard?.timeline?.length ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {dashboard.timeline.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-950">{event.label}</p>
                  <p className="text-xs text-slate-500">{event.source} - {event.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={statusClass(event.status)}>{event.status || '-'}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(event.occurred_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
