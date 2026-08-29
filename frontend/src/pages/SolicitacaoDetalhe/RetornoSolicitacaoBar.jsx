import { useState } from 'react';
import {
  HiOutlineArrowUturnLeft,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle
} from 'react-icons/hi2';
import {
  cancelarRetornoSolicitacao,
  decidirRetornoSolicitacao,
  solicitarRetornoSolicitacao
} from '../../services/solicitacoes';

export default function RetornoSolicitacaoBar({ solicitacao, onMudou }) {
  const contexto = solicitacao?.contexto_interacao;
  const [formAberto, setFormAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [rejeitandoId, setRejeitandoId] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processando, setProcessando] = useState('');

  if (!contexto) return null;

  const pedidos = Array.isArray(contexto.pedidos_retorno_para_decisao)
    ? contexto.pedidos_retorno_para_decisao
    : [];
  const pedidoPendente = contexto.pedido_retorno_pendente;
  const exibir = !contexto.pode_interagir || pedidos.length > 0;
  if (!exibir) return null;

  async function atualizar(callback, chave) {
    try {
      setProcessando(chave);
      await callback();
      setFormAberto(false);
      setMotivo('');
      setRejeitandoId(null);
      setMotivoRejeicao('');
      await onMudou?.();
    } catch (error) {
      alert(error?.message || 'Nao foi possivel concluir a operacao.');
    } finally {
      setProcessando('');
    }
  }

  function enviarPedido() {
    if (!motivo.trim()) return;
    return atualizar(
      () => solicitarRetornoSolicitacao(solicitacao.id, motivo.trim()),
      'solicitar'
    );
  }

  function cancelarPedido() {
    if (!pedidoPendente?.id) return;
    return atualizar(
      () => cancelarRetornoSolicitacao(pedidoPendente.id),
      `cancelar-${pedidoPendente.id}`
    );
  }

  function decidir(pedido, aprovar) {
    if (!aprovar && !motivoRejeicao.trim()) return;
    return atualizar(
      () => decidirRetornoSolicitacao(pedido.id, {
        aprovar,
        motivo_decisao: aprovar ? '' : motivoRejeicao.trim()
      }),
      `${aprovar ? 'aprovar' : 'rejeitar'}-${pedido.id}`
    );
  }

  if (!contexto.pode_interagir) {
    return (
      <section
        className="border-l-4 border-amber-500 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/25 dark:text-amber-100"
        aria-label="Interacoes bloqueadas pelo setor atual"
        data-testid="barra-retorno-solicitacao"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <HiOutlineArrowUturnLeft className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Somente acompanhamento · setor atual: {contexto.setor_atual}</p>
              <p className="mt-0.5 text-xs leading-5 text-amber-800 dark:text-amber-200">
                Comentarios, anexos, medicoes e aditivos ficam liberados quando a solicitacao voltar para {contexto.setor_usuario || 'seu setor'}.
              </p>
            </div>
          </div>

          {pedidoPendente ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold dark:bg-transparent">
                <HiOutlineClock className="h-4 w-4" /> Retorno solicitado
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={Boolean(processando)}
                onClick={cancelarPedido}
              >
                {processando === `cancelar-${pedidoPendente.id}` ? 'Cancelando...' : 'Cancelar pedido'}
              </button>
            </div>
          ) : contexto.pode_solicitar_retorno ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setFormAberto((atual) => !atual)}
            >
              Solicitar retorno
            </button>
          ) : null}
        </div>

        {pedidoPendente && (
          <p className="mt-2 border-t border-amber-200 pt-2 text-xs">
            <span className="font-semibold">Motivo enviado:</span> {pedidoPendente.motivo}
          </p>
        )}

        {formAberto && !pedidoPendente && (
          <div className="mt-3 grid gap-2 border-t border-amber-200 pt-3 md:grid-cols-[1fr_auto]">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-semibold">Por que precisa do retorno? *</span>
              <textarea
                className="input min-h-20 w-full resize-y bg-white dark:bg-gray-950"
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                placeholder="Ex.: preciso registrar a medicao deste periodo e anexar os documentos."
                maxLength={2000}
                autoFocus
              />
            </label>
            <div className="flex items-end justify-end gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFormAberto(false)} disabled={Boolean(processando)}>
                Fechar
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={enviarPedido} disabled={Boolean(processando) || !motivo.trim()}>
                {processando === 'solicitar' ? 'Enviando...' : 'Enviar pedido'}
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      className="border-l-4 border-blue-600 bg-blue-50/80 px-4 py-3 text-sm text-blue-950 dark:bg-blue-950/25 dark:text-blue-100"
      aria-label="Pedidos de retorno aguardando decisao"
      data-testid="pedidos-retorno-decisao"
    >
      <div className="flex items-center gap-2">
        <HiOutlineClock className="h-5 w-5" aria-hidden="true" />
        <p className="font-semibold">
          {pedidos.length} pedido(s) de retorno aguardando decisao neste setor
        </p>
      </div>

      <div className="mt-3 divide-y divide-blue-200 border-y border-blue-200">
        {pedidos.map((pedido) => {
          const rejeitando = rejeitandoId === pedido.id;
          return (
            <div key={pedido.id} className="py-3 first:pt-2 last:pb-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {pedido.solicitante?.nome || `Usuario #${pedido.solicitado_por}`} · retorno para {pedido.setor_solicitante}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-blue-800 dark:text-blue-200">{pedido.motivo}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={Boolean(processando)}
                    onClick={() => decidir(pedido, true)}
                  >
                    <HiOutlineCheckCircle className="h-4 w-4" />
                    {processando === `aprovar-${pedido.id}` ? 'Aprovando...' : 'Aprovar retorno'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={Boolean(processando)}
                    onClick={() => {
                      setRejeitandoId(rejeitando ? null : pedido.id);
                      setMotivoRejeicao('');
                    }}
                  >
                    <HiOutlineXCircle className="h-4 w-4" /> Rejeitar
                  </button>
                </div>
              </div>

              {rejeitando && (
                <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                  <label>
                    <span className="mb-1 block text-xs font-semibold">Motivo da rejeicao *</span>
                    <textarea
                      className="input min-h-16 w-full resize-y bg-white dark:bg-gray-950"
                      value={motivoRejeicao}
                      onChange={(event) => setMotivoRejeicao(event.target.value)}
                      placeholder="Explique o que precisa ser concluido antes da devolucao."
                      maxLength={2000}
                      autoFocus
                    />
                  </label>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={Boolean(processando) || !motivoRejeicao.trim()}
                      onClick={() => decidir(pedido, false)}
                    >
                      {processando === `rejeitar-${pedido.id}` ? 'Rejeitando...' : 'Confirmar rejeicao'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
