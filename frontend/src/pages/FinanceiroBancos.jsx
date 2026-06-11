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

function MiniTable({ columns, rows, renderRow }) {
  if (!rows?.length) return <EmptyState />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-slate-200 text-[11px] uppercase tracking-[0.14em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(renderRow)}
        </tbody>
      </table>
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
                    {convenio.empresa?.razao_social || convenio.empresa_nome} - {convenio.convenio_codigo}
                  </option>
                ))}
              </select>
              <input type="date" className="app-input" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              <button type="button" className="app-button" onClick={gerarRemessa} disabled={!selectedConvenioId || !selectedTitulos.length || loading}>
                <HiOutlinePaperAirplane />
                Gerar
              </button>
            </div>

            <div className="mt-4 max-h-[330px] overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Sel.</th>
                    <th className="px-3 py-2">Titulo</th>
                    <th className="px-3 py-2">Fornecedor</th>
                    <th className="px-3 py-2">Venc.</th>
                    <th className="px-3 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!titulos.length ? (
                    <tr><td colSpan="5" className="px-3 py-6 text-center text-slate-500">Nenhum titulo elegivel encontrado.</td></tr>
                  ) : titulos.map((titulo) => (
                    <tr key={titulo.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selectedTitulos.includes(titulo.id)} onChange={() => toggleTitulo(titulo.id)} />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{titulo.codigo}</td>
                      <td className="px-3 py-2 text-slate-600">{titulo.parceiro?.nome || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{titulo.data_vencimento || '-'}</td>
                      <td className="px-3 py-2 text-slate-700">{formatCurrency(titulo.valor_saldo || titulo.valor_original)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-950">Remessas geradas</h3>
          <MiniTable
            columns={['Arquivo', 'Empresa', 'Status', 'Valor', 'Download']}
            rows={remessas}
            renderRow={(remessa) => (
              <tr key={remessa.id}>
                <td className="px-3 py-3 font-medium text-slate-900">{remessa.nome_arquivo}</td>
                <td className="px-3 py-3 text-slate-600">{remessa.empresa?.razao_social || remessa.empresa?.nome || '-'}</td>
                <td className="px-3 py-3"><span className={statusClass(remessa.status)}>{remessa.status}</span></td>
                <td className="px-3 py-3 text-slate-700">{formatCurrency(remessa.valor_total)}</td>
                <td className="px-3 py-3">
                  <button type="button" className="app-button app-button-secondary h-9 px-3" onClick={() => baixarRemessa(remessa.id)}>
                    <HiOutlineCloudArrowDown />
                    Baixar
                  </button>
                </td>
              </tr>
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
          <MiniTable
            columns={['Conta', 'Empresa', 'Status', 'Saldo estimado']}
            rows={snapshots.accounts?.data?.items || []}
            renderRow={(account) => (
              <tr key={account.id}>
                <td className="px-3 py-3 font-medium text-slate-900">{account.nome || account.banco || `Conta #${account.id}`}</td>
                <td className="px-3 py-3 text-slate-600">{account.empresa?.nome || account.empresa?.razao_social || '-'}</td>
                <td className="px-3 py-3"><span className={statusClass(account.ativo ? 'ATIVO' : 'INATIVO')}>{account.ativo ? 'ATIVO' : 'INATIVO'}</span></td>
                <td className="px-3 py-3 text-slate-700">{formatCurrency(account.saldo_operacional_estimado)}</td>
              </tr>
            )}
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
          <MiniTable
            columns={['Lote', 'Status', 'Valor', 'Atualizado']}
            rows={snapshots.bb_payments?.data?.recent_batches || []}
            renderRow={(batch) => (
              <tr key={batch.id}>
                <td className="px-3 py-3 font-medium text-slate-900">{batch.codigo || `#${batch.id}`}</td>
                <td className="px-3 py-3"><span className={statusClass(batch.status)}>{batch.status || '-'}</span></td>
                <td className="px-3 py-3 text-slate-700">{formatCurrency(batch.valor_total)}</td>
                <td className="px-3 py-3 text-slate-500">{formatDateTime(batch.updatedAt)}</td>
              </tr>
            )}
          />
        </Section>

        <Section title="Boletos Caixa" description="Remessas, retornos e ocorrencias de cobranca separados do CNAB240 de pagamentos.">
          <MiniTable
            columns={['Origem', 'Codigo', 'Status', 'Data']}
            rows={[
              ...(snapshots.caixa_boletos?.data?.remessas?.recent || []).map((item) => ({ ...item, origem: 'Remessa' })),
              ...(snapshots.caixa_boletos?.data?.retornos?.recent || []).map((item) => ({ ...item, origem: 'Retorno' }))
            ].slice(0, 8)}
            renderRow={(item) => (
              <tr key={`${item.origem}-${item.id}`}>
                <td className="px-3 py-3 text-slate-600">{item.origem}</td>
                <td className="px-3 py-3 font-medium text-slate-900">{item.codigo || item.nome_arquivo || `#${item.id}`}</td>
                <td className="px-3 py-3"><span className={statusClass(item.status)}>{item.status || '-'}</span></td>
                <td className="px-3 py-3 text-slate-500">{formatDateTime(item.createdAt)}</td>
              </tr>
            )}
          />
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Conciliacao bancaria" description="Importacoes OFX e movimentos pendentes para evitar baixa duplicada ou saldo distorcido.">
          <MiniTable
            columns={['Movimento', 'Status', 'Valor', 'Data']}
            rows={snapshots.reconciliation?.data?.recent || []}
            renderRow={(item) => (
              <tr key={item.id}>
                <td className="px-3 py-3 font-medium text-slate-900">{item.descricao_banco || item.documento || `Movimento #${item.id}`}</td>
                <td className="px-3 py-3"><span className={statusClass(item.status)}>{item.status || '-'}</span></td>
                <td className="px-3 py-3 text-slate-700">{formatCurrency(item.valor)}</td>
                <td className="px-3 py-3 text-slate-500">{item.data_movimento || '-'}</td>
              </tr>
            )}
          />
        </Section>

        <Section title="Financiamentos bancarios" description="Contratos bancarios que geram titulos e movimentam contas de credito.">
          <MiniTable
            columns={['Contrato', 'Status', 'Parcelas', 'Total']}
            rows={snapshots.financing?.data?.recent || []}
            renderRow={(item) => (
              <tr key={item.id}>
                <td className="px-3 py-3 font-medium text-slate-900">{item.codigo || item.numero_contrato || `#${item.id}`}</td>
                <td className="px-3 py-3"><span className={statusClass(item.status)}>{item.status || '-'}</span></td>
                <td className="px-3 py-3 text-slate-600">{item.quantidade_parcelas || '-'}</td>
                <td className="px-3 py-3 text-slate-700">{formatCurrency(item.valor_total)}</td>
              </tr>
            )}
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
