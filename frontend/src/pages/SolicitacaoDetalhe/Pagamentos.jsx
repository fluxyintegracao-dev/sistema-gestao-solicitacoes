import { useEffect, useMemo, useState } from 'react';
import {
  baixarTituloFinanceiro,
  getContasBancarias,
  getTitulosFinanceirosPorSolicitacao
} from '../../services/financeiro';
import { TabelaPadrao } from '../../components/padrao';

function formatarMoeda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '-';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(valor) {
  if (!valor) return '-';
  const data = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleDateString('pt-BR');
}

function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function numeroSeguro(valor) {
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tituloBaixavel(titulo) {
  const status = String(titulo?.status || '').toUpperCase();
  return ['ABERTO', 'PARCIAL'].includes(status) && numeroSeguro(titulo?.valor_saldo) > 0;
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function limparDescricaoTituloCompra(value) {
  const texto = String(value || '').trim();
  if (!texto) return texto;
  if (!normalizeSearchText(texto).includes('solicitacao de compra')) return texto;
  return texto
    .replace(/\s+(Itens|Items):[\s\S]*$/i, '')
    .replace(/\s+-\s*$/g, '')
    .trim() || 'Solicitacao de compra';
}

export default function Pagamentos({ solicitacao, podeInformarPagamento = false, onSucesso }) {
  const [modalPagamentosAberto, setModalPagamentosAberto] = useState(false);
  const [modalBaixaAberto, setModalBaixaAberto] = useState(false);
  const [titulos, setTitulos] = useState([]);
  const [contas, setContas] = useState([]);
  const [selecionados, setSelecionados] = useState({});
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [formaRecebimento, setFormaRecebimento] = useState('PIX');
  const [dataPagamento, setDataPagamento] = useState(dataHoje());
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTitulos, setLoadingTitulos] = useState(false);

  async function carregarTitulos() {
    if (!solicitacao?.id) return;
    try {
      setLoadingTitulos(true);
      const data = await getTitulosFinanceirosPorSolicitacao(solicitacao.id);
      setTitulos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setTitulos([]);
    } finally {
      setLoadingTitulos(false);
    }
  }

  useEffect(() => {
    carregarTitulos();
  }, [solicitacao?.id]);

  const pagamentos = useMemo(() => (
    (Array.isArray(solicitacao?.pagamentos) ? solicitacao.pagamentos : [])
      .slice()
      .sort((a, b) => {
        const dataA = new Date(a?.data_pagamento || a?.createdAt || 0).getTime();
        const dataB = new Date(b?.data_pagamento || b?.createdAt || 0).getTime();
        return dataB - dataA;
      })
  ), [solicitacao?.pagamentos]);

  const resumoTitulos = useMemo(() => {
    const base = Array.isArray(titulos) ? titulos : [];
    return {
      valor: base.reduce((acc, titulo) => acc + numeroSeguro(titulo.valor_original), 0),
      pago: base.reduce((acc, titulo) => acc + numeroSeguro(titulo.valor_baixado), 0),
      saldo: base.reduce((acc, titulo) => acc + numeroSeguro(titulo.valor_saldo), 0)
    };
  }, [titulos]);

  const temResumoTitulos = resumoTitulos.valor > 0 || resumoTitulos.pago > 0 || resumoTitulos.saldo > 0;
  const valorTotal = temResumoTitulos ? resumoTitulos.valor : Number(solicitacao?.valor_total ?? solicitacao?.valor ?? 0);
  const valorPago = temResumoTitulos ? resumoTitulos.pago : Number(solicitacao?.valor_pago_acumulado || 0);
  const saldoPagamento = temResumoTitulos
    ? resumoTitulos.saldo
    : Number(
        solicitacao?.saldo_pagamento ??
        (Number.isFinite(valorTotal) ? Math.max(valorTotal - valorPago, 0) : 0)
      );

  const exibirCard =
    podeInformarPagamento ||
    pagamentos.length > 0 ||
    titulos.length > 0 ||
    (Number.isFinite(valorPago) && valorPago > 0);
  const pagamentosResumo = pagamentos.slice(0, 2);
  const temPagamentosOcultos = pagamentos.length > pagamentosResumo.length;
  const titulosBaixaveis = titulos.filter(tituloBaixavel);
  const tipoTituloBaixa = String(titulosBaixaveis[0]?.tipo || '').toUpperCase();
  const formaBaixaLabel = tipoTituloBaixa === 'RECEBER' ? 'Forma de recebimento' : 'Forma de pagamento';

  if (!exibirCard) return null;

  async function abrirModalBaixa() {
    try {
      setLoading(true);
      const [titulosData, contasData] = await Promise.all([
        getTitulosFinanceirosPorSolicitacao(solicitacao.id),
        getContasBancarias()
      ]);
      const titulosNormalizados = Array.isArray(titulosData) ? titulosData : [];
      const contasNormalizadas = Array.isArray(contasData) ? contasData : [];
      setTitulos(titulosNormalizados);
      setContas(contasNormalizadas);
      setContaBancariaId((atual) => atual || String(contasNormalizadas[0]?.id || ''));
      setSelecionados({});
      setModalBaixaAberto(true);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar titulos da solicitacao.');
    } finally {
      setLoading(false);
    }
  }

  function toggleTitulo(titulo) {
    setSelecionados((current) => {
      const id = String(titulo.id);
      if (current[id]?.selecionado) {
        return { ...current, [id]: { ...current[id], selecionado: false } };
      }
      return {
        ...current,
        [id]: {
          selecionado: true,
          valor: current[id]?.valor || String(numeroSeguro(titulo.valor_saldo).toFixed(2))
        }
      };
    });
  }

  function alterarValorTitulo(tituloId, valor) {
    setSelecionados((current) => ({
      ...current,
      [String(tituloId)]: {
        ...current[String(tituloId)],
        selecionado: true,
        valor
      }
    }));
  }

  async function salvarBaixasTitulos() {
    const conta = contas.find((item) => String(item.id) === String(contaBancariaId));
    if (!conta) {
      alert('Selecione a conta bancaria usada no pagamento.');
      return;
    }
    if (!formaRecebimento) {
      alert(`Selecione a ${formaBaixaLabel.toLowerCase()} usada na baixa.`);
      return;
    }
    if (!dataPagamento) {
      alert('Informe a data do pagamento.');
      return;
    }

    const baixas = titulosBaixaveis
      .map((titulo) => ({
        titulo,
        valor: Number(selecionados[String(titulo.id)]?.valor || 0),
        selecionado: Boolean(selecionados[String(titulo.id)]?.selecionado)
      }))
      .filter((item) => item.selecionado);

    if (!baixas.length) {
      alert('Selecione ao menos um titulo para baixar.');
      return;
    }
    const baixaInvalida = baixas.find((item) => (
      !Number.isFinite(item.valor) ||
      item.valor <= 0 ||
      item.valor > numeroSeguro(item.titulo.valor_saldo)
    ));
    if (baixaInvalida) {
      alert(`Informe um valor valido para o titulo #${baixaInvalida.titulo.id}.`);
      return;
    }

    if (!window.confirm(`Confirmar baixa de ${baixas.length} titulo(s) desta solicitacao?`)) {
      return;
    }

    try {
      setLoading(true);
      for (const item of baixas) {
        await baixarTituloFinanceiro(item.titulo.id, {
          valor: item.valor,
          data_movimento: dataPagamento,
          conta_bancaria_id: conta.id,
          empresa_id: conta.empresa_id || conta.empresa?.id,
          forma_recebimento: formaRecebimento,
          observacoes: observacao || `Pagamento parcial informado pela solicitacao #${solicitacao.id}`
        });
      }
      setSelecionados({});
      setObservacao('');
      setDataPagamento(dataHoje());
      setModalBaixaAberto(false);
      await carregarTitulos();
      await onSucesso?.();
      alert('Baixa financeira registrada com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao registrar baixa financeira');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sol-detail-card space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="sol-detail-card-title">Pagamentos</h2>
          <p className="text-sm text-[var(--c-muted)]">
            Valor total: {formatarMoeda(valorTotal)} | Pago: {formatarMoeda(valorPago)} | Saldo: {formatarMoeda(saldoPagamento)}
          </p>
          {loadingTitulos && <p className="mt-1 text-xs text-[var(--c-muted)]">Atualizando titulos financeiros...</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {temPagamentosOcultos && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setModalPagamentosAberto(true)}>
              Ver pagamentos
            </button>
          )}
          {podeInformarPagamento && (
            <button type="button" className="btn btn-primary btn-sm" onClick={abrirModalBaixa} disabled={loading}>
              {loading ? 'Carregando...' : 'Informar pagamento parcial'}
            </button>
          )}
        </div>
      </div>

      {titulos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)]">Titulos vinculados</p>
          {titulos.slice(0, 4).map((titulo) => (
            <div key={titulo.id} className="rounded-xl border border-[var(--c-border)] px-3 py-3 text-sm">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <strong>#{titulo.id} {limparDescricaoTituloCompra(titulo.descricao) || 'Titulo financeiro'}</strong>
                <span className="rounded-full bg-[var(--c-bg)] px-2 py-1 text-xs font-semibold text-[var(--c-muted)]">
                  {titulo.status}
                </span>
              </div>
              <p className="mt-1 text-[var(--c-muted)]">
                Original: {formatarMoeda(titulo.valor_original)} | Baixado: {formatarMoeda(titulo.valor_baixado)} | Saldo: {formatarMoeda(titulo.valor_saldo)}
              </p>
            </div>
          ))}
        </div>
      )}

      {pagamentos.length === 0 ? (
        <p className="text-sm text-[var(--c-muted)]">Nenhum pagamento avulso informado. Use a baixa de titulos para registrar pagamentos parciais.</p>
      ) : (
        <div className="space-y-2">
          {pagamentosResumo.map(pagamento => (
            <div key={pagamento.id} className="rounded-xl border border-[var(--c-border)] px-3 py-3">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <strong>{formatarMoeda(pagamento.valor)}</strong>
                <span className="text-sm text-[var(--c-muted)]">{formatarData(pagamento.data_pagamento)}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--c-muted)]">
                Registrado por {pagamento.criadoPor?.nome || 'Usuario'}
              </p>
              {pagamento.observacao && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--c-text)]">{pagamento.observacao}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {modalBaixaAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--c-text)]">Baixa parcial por titulo</h3>
                <p className="text-sm text-[var(--c-muted)]">
                  Selecione um ou mais titulos da solicitacao e informe quanto foi pago em cada um.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--c-muted)] hover:bg-[var(--c-bg)] hover:text-[var(--c-text)]"
                onClick={() => setModalBaixaAberto(false)}
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="form-field md:col-span-2">
                  <span className="form-label">Conta bancaria da baixa</span>
                  <select className="input" value={contaBancariaId} onChange={(event) => setContaBancariaId(event.target.value)}>
                    <option value="">Selecione</option>
                    {contas.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome || conta.banco || `Conta #${conta.id}`}
                        {conta.empresa?.nome ? ` - ${conta.empresa.nome}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span className="form-label">Data do pagamento</span>
                  <input type="date" className="input" value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} />
                </label>
                <label className="form-field">
                  <span className="form-label">{formaBaixaLabel}</span>
                  <select className="input" value={formaRecebimento} onChange={(event) => setFormaRecebimento(event.target.value)}>
                    <option value="PIX">PIX</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="DINHEIRO">Dinheiro</option>
                  </select>
                </label>
                <label className="form-field md:col-span-2">
                  <span className="form-label">Observacao</span>
                  <input className="input" value={observacao} onChange={(event) => setObservacao(event.target.value)} placeholder="Observacao opcional" />
                </label>
              </div>

              <div className="mt-5 space-y-2">
                {titulosBaixaveis.length === 0 ? (
                  <div className="app-empty-card">Nenhum titulo aberto ou parcial vinculado a esta solicitacao.</div>
                ) : titulosBaixaveis.map((titulo) => {
                  const estado = selecionados[String(titulo.id)] || {};
                  return (
                    <div key={titulo.id} className="grid gap-3 rounded-xl border border-[var(--c-border)] p-3 md:grid-cols-[auto_1fr_180px] md:items-center">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={Boolean(estado.selecionado)}
                          onChange={() => toggleTitulo(titulo)}
                        />
                        #{titulo.id}
                      </label>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--c-text)]">{limparDescricaoTituloCompra(titulo.descricao) || 'Titulo financeiro'}</p>
                        <p className="text-xs text-[var(--c-muted)]">
                          Vencimento: {formatarData(titulo.data_vencimento)} | Saldo: {formatarMoeda(titulo.valor_saldo)}
                        </p>
                      </div>
                      <label className="form-field">
                        <span className="form-label">Valor pago</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={numeroSeguro(titulo.valor_saldo)}
                          className="input"
                          value={estado.valor || ''}
                          onChange={(event) => alterarValorTitulo(titulo.id, event.target.value)}
                          placeholder="0,00"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--c-border)] px-5 py-4">
              <button type="button" className="btn btn-outline" onClick={() => setModalBaixaAberto(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={salvarBaixasTitulos} disabled={loading || !formaRecebimento}>
                {loading ? 'Salvando...' : 'Registrar baixa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPagamentosAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--c-text)]">Pagamentos registrados</h3>
                <p className="text-sm text-[var(--c-muted)]">
                  Listados por data, valor e usuario responsavel pelo registro.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--c-muted)] hover:bg-[var(--c-bg)] hover:text-[var(--c-text)]"
                onClick={() => setModalPagamentosAberto(false)}
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              <TabelaPadrao
                colunas={[
                  {
                    id: 'data',
                    titulo: 'Data',
                    tipo: 'data',
                    noCard: 'titulo',
                    render: (pagamento) => formatarData(pagamento.data_pagamento)
                  },
                  {
                    id: 'valor',
                    titulo: 'Valor',
                    tipo: 'valor',
                    render: (pagamento) => <span className="font-semibold">{formatarMoeda(pagamento.valor)}</span>
                  },
                  {
                    id: 'registrado_por',
                    titulo: 'Registrado por',
                    tipo: 'texto',
                    render: (pagamento) => pagamento.criadoPor?.nome || 'Usuario'
                  },
                  {
                    id: 'observacao',
                    titulo: 'Observacao',
                    tipo: 'texto',
                    render: (pagamento) => (
                      <span className="whitespace-pre-wrap">{pagamento.observacao || '-'}</span>
                    )
                  }
                ]}
                itens={pagamentos}
                vazio="Nenhum pagamento registrado."
                storageKey="tabela:solicitacao-detalhe-pagamentos"
                rotuloRolagem="Pagamentos registrados"
                // R17: o pagamento e uma serie temporal (data + valor lancados
                // no caixa) — nenhuma coluna NOMEIA o registro: "Registrado
                // por" nomeia o usuario, nao o pagamento.
                semIdentidade
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
