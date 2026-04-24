import { useMemo, useState } from 'react';
import { adicionarPagamentoSolicitacao } from '../../services/solicitacoes';

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

export default function Pagamentos({ solicitacao, podeInformarPagamento = false, onSucesso }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [valor, setValor] = useState('');
  const [dataPagamento, setDataPagamento] = useState(dataHoje());
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  const pagamentos = useMemo(() => (
    (Array.isArray(solicitacao?.pagamentos) ? solicitacao.pagamentos : [])
      .slice()
      .sort((a, b) => {
        const dataA = new Date(a?.data_pagamento || a?.createdAt || 0).getTime();
        const dataB = new Date(b?.data_pagamento || b?.createdAt || 0).getTime();
        return dataB - dataA;
      })
  ), [solicitacao?.pagamentos]);

  const valorTotal = Number(solicitacao?.valor_total ?? solicitacao?.valor ?? 0);
  const valorPago = Number(solicitacao?.valor_pago_acumulado || 0);
  const saldoPagamento = Number(
    solicitacao?.saldo_pagamento ??
    (Number.isFinite(valorTotal) ? Math.max(valorTotal - valorPago, 0) : 0)
  );

  const exibirCard =
    podeInformarPagamento ||
    pagamentos.length > 0 ||
    (Number.isFinite(valorPago) && valorPago > 0);

  if (!exibirCard) return null;

  async function salvarPagamento() {
    const valorNumerico = Number(valor);
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      alert('Informe um valor de pagamento valido.');
      return;
    }
    if (!dataPagamento) {
      alert('Informe a data do pagamento.');
      return;
    }
    if (!window.confirm('Confirmar o registro deste pagamento?')) {
      return;
    }

    try {
      setLoading(true);
      await adicionarPagamentoSolicitacao(solicitacao.id, {
        valor: valorNumerico,
        data_pagamento: dataPagamento,
        observacao
      });
      setValor('');
      setObservacao('');
      setDataPagamento(dataHoje());
      setMostrarFormulario(false);
      await onSucesso?.();
      alert('Pagamento registrado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao informar pagamento');
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
        </div>

        {podeInformarPagamento && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setMostrarFormulario(prev => !prev)}>
            {mostrarFormulario ? 'Cancelar' : 'Informar pagamento'}
          </button>
        )}
      </div>

      {mostrarFormulario && podeInformarPagamento && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="form-field">
            <span className="form-label">Valor pago</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={valor}
              onChange={event => setValor(event.target.value)}
              placeholder="Informe o valor pago"
            />
          </label>

          <label className="form-field">
            <span className="form-label">Data do pagamento</span>
            <input
              type="date"
              className="input"
              value={dataPagamento}
              onChange={event => setDataPagamento(event.target.value)}
            />
          </label>

          <label className="form-field md:col-span-2">
            <span className="form-label">Observacao</span>
            <textarea
              className="input min-h-[88px]"
              value={observacao}
              onChange={event => setObservacao(event.target.value)}
              placeholder="Observacao opcional"
            />
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button type="button" className="btn btn-primary btn-sm" onClick={salvarPagamento} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar pagamento'}
            </button>
          </div>
        </div>
      )}

      {pagamentos.length === 0 ? (
        <p className="text-sm text-[var(--c-muted)]">Nenhum pagamento informado.</p>
      ) : (
        <div className="space-y-2">
          {pagamentos.map(pagamento => (
            <div key={pagamento.id} className="rounded-xl border border-[var(--c-border)] px-3 py-3">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <strong>{formatarMoeda(pagamento.valor)}</strong>
                <span className="text-sm text-[var(--c-muted)]">{formatarData(pagamento.data_pagamento)}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--c-muted)]">
                Registrado por {pagamento.criadoPor?.nome || 'Usuario'}
              </p>
              {pagamento.observacao && (
                <p className="mt-2 text-sm text-[var(--c-text)]">{pagamento.observacao}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
