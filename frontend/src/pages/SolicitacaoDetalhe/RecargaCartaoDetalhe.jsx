import { useEffect, useState } from 'react';
import PrestacaoRecargaCartao from '../../components/recarga-cartao/PrestacaoRecargaCartao';
import { obterRecargaDaSolicitacao } from '../../services/recargasCartao';

function moeda(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function RecargaCartaoDetalhe({ solicitacaoId, podeInteragir = true }) {
  const [contexto, setContexto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      setContexto(await obterRecargaDaSolicitacao(solicitacaoId));
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { void carregar(); }, [solicitacaoId]);

  if (carregando) return <div className="card text-sm text-[var(--c-muted)]">Carregando dados da recarga...</div>;
  if (erro) return <div className="app-alert app-alert--error">{erro}</div>;

  const recarga = contexto?.ultima_recarga;
  if (!recarga) return null;
  const titulo = recarga.titulo || {};

  return (
    <section className="card space-y-4" aria-labelledby="recarga-cartao-detalhe-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--c-border)] pb-3">
        <div>
          <h2 id="recarga-cartao-detalhe-heading" className="text-base font-semibold text-[var(--c-text)]">Recarga de cartão</h2>
          <p className="text-sm text-[var(--c-muted)]">
            {recarga.cartao?.nome || 'Cartão'} · final {recarga.cartao?.ultimos_quatro || '----'}
          </p>
        </div>
        <span className="app-status-pill bg-[var(--c-surface-alt)] text-[var(--c-text)]">{recarga.status_ciclo || '-'}</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm md:grid-cols-4">
        <div><dt className="text-xs uppercase text-[var(--c-muted)]">Solicitado</dt><dd className="font-semibold tabular-nums">{moeda(recarga.valor_solicitado)}</dd></div>
        <div><dt className="text-xs uppercase text-[var(--c-muted)]">Efetivamente pago</dt><dd className="font-semibold tabular-nums">{moeda(recarga.valor_efetivo)}</dd></div>
        <div><dt className="text-xs uppercase text-[var(--c-muted)]">Não recarregado</dt><dd className="font-semibold tabular-nums">{moeda(recarga.valor_nao_recarregado)}</dd></div>
        <div><dt className="text-xs uppercase text-[var(--c-muted)]">Título financeiro</dt><dd className="font-semibold">#{titulo.id || '-'} · {titulo.status || '-'}</dd></div>
      </dl>

      {contexto?.media_recarga ? (
        <p className="border-y border-[var(--c-border)] py-2 text-sm text-[var(--c-muted)]">
          Média das últimas {contexto.media_recarga.quantidade} recargas validadas: <strong className="text-[var(--c-text)]">{moeda(contexto.media_recarga.valor)}</strong>
        </p>
      ) : null}

      <PrestacaoRecargaCartao
        solicitacaoId={solicitacaoId}
        contexto={contexto}
        podeInteragir={podeInteragir}
        onAtualizado={carregar}
      />
    </section>
  );
}
