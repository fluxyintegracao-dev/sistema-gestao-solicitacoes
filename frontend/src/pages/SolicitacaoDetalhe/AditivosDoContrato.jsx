import { useCallback, useEffect, useState } from 'react';
import {
  listarAditivosContrato,
  decidirAditivoContrato,
  cancelarAditivoContrato
} from '../../services/contratos';

/**
 * Os termos aditivos do contrato, com os tres botoes do fluxo (item 26, 23/08).
 *
 * O que faltava nao era um `<button>`: era o LUGAR dele. A rota de decisao existia desde 21/08, e a
 * de listagem nao existia — o aditivo era pedido e sumia da tela. Quem aprovava tinha de ir ao
 * banco.
 *
 * APROVAR e REJEITAR sao a decisao de merito, e usam a permissao de aprovacao do contrato.
 * CANCELAR e outra coisa: e o pedido sendo RETIRADO — foi pedido errado, ou deixou de ser
 * necessario — e por isso usa a permissao de cancelamento. Sao decisoes de pessoas diferentes, e e
 * por isso que sao dois botoes e nao um.
 *
 * Os botoes so aparecem nos PENDENTES: decidido nao volta atras por aqui (o backend responde 409).
 */

const moeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const brData = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '');

const CORES = {
  PENDENTE: 'var(--c-warning, #b45309)',
  APROVADO: 'var(--c-success, #15803d)',
  REJEITADO: 'var(--c-danger, #b91c1c)',
  CANCELADO: 'var(--c-muted)'
};

const ROTULO_TIPO = {
  VALOR: 'Valor',
  VALOR_E_VIGENCIA: 'Valor e vigencia',
  PRAZO: 'Prazo'
};

export default function AditivosDoContrato({ contrato, onMudou }) {
  const [aditivos, setAditivos] = useState([]);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(null);

  const contratoId = contrato?.id || null;
  const pode = contrato?.permissoes || {};
  const podeDecidir = pode.aprovar === true;
  const podeCancelar = pode.cancelar === true;

  const carregar = useCallback(async () => {
    if (!contratoId) return;
    try {
      setAditivos(await listarAditivosContrato(contratoId));
    } catch (e) {
      setErro(e.message || 'Nao foi possivel carregar os aditivos.');
    }
  }, [contratoId]);

  useEffect(() => { void carregar(); }, [carregar]);

  // Card inteiro oculto quando nao ha aditivo: um card vazio em toda solicitacao de contrato seria
  // ruido — a maioria dos contratos nunca tem aditivo.
  if (!contratoId || aditivos.length === 0) return null;

  async function agir(aditivo, acao) {
    setErro('');

    // O motivo e OBRIGATORIO na rejeicao (o backend recusa sem ele) e opcional no cancelamento.
    let motivo = '';
    if (acao !== 'aprovar') {
      // eslint-disable-next-line no-alert
      motivo = window.prompt(acao === 'rejeitar'
        ? 'Motivo da rejeicao (obrigatorio):'
        : 'Motivo do cancelamento (opcional):') || '';
      if (acao === 'rejeitar' && !motivo.trim()) {
        setErro('Informe o motivo da rejeicao.');
        return;
      }
    }

    setOcupado(aditivo.id);
    try {
      if (acao === 'cancelar') await cancelarAditivoContrato(aditivo.id, motivo);
      else await decidirAditivoContrato(aditivo.id, { aprovar: acao === 'aprovar', motivo });
      await carregar();
      onMudou?.();
    } catch (e) {
      setErro(e.message || 'Nao foi possivel concluir a acao.');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="card space-y-3" data-testid="aditivos-do-contrato">
      <h2 className="text-base font-semibold text-[var(--c-text)]">Termos aditivos</h2>

      {erro && <div className="app-alert app-alert--error">{erro}</div>}

      <div className="space-y-2">
        {aditivos.map((a) => (
          <div key={a.id} className="rounded-lg border border-[var(--c-border)] px-3 py-2 space-y-1"
            data-testid={`aditivo-${a.id}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-[var(--c-text)]">
                {ROTULO_TIPO[a.tipo] || a.tipo || 'Aditivo'}
                {Number(a.valor) > 0 ? ` · ${moeda(a.valor)}` : ''}
                {a.nova_vigencia_fim ? ` · nova vigencia ate ${brData(a.nova_vigencia_fim)}` : ''}
              </span>
              <span className="text-xs font-semibold" style={{ color: CORES[a.status] || 'var(--c-muted)' }}
                data-testid={`aditivo-status-${a.id}`}>
                {a.status}
              </span>
            </div>

            {a.justificativa && (
              <p className="text-sm text-[var(--c-muted)]">{a.justificativa}</p>
            )}
            {a.motivo_rejeicao && (
              <p className="text-xs text-[var(--c-muted)]">Motivo: {a.motivo_rejeicao}</p>
            )}

            {a.status === 'PENDENTE' && (podeDecidir || podeCancelar) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {podeDecidir && (
                  <button type="button" className="btn btn-primary btn-sm"
                    data-testid={`aprovar-aditivo-${a.id}`}
                    disabled={ocupado === a.id} onClick={() => agir(a, 'aprovar')}>
                    {ocupado === a.id ? 'Aguarde...' : 'Aprovar'}
                  </button>
                )}
                {podeDecidir && (
                  <button type="button" className="btn btn-outline btn-sm"
                    data-testid={`rejeitar-aditivo-${a.id}`}
                    disabled={ocupado === a.id} onClick={() => agir(a, 'rejeitar')}>
                    Rejeitar
                  </button>
                )}
                {podeCancelar && (
                  <button type="button" className="btn btn-outline btn-sm"
                    data-testid={`cancelar-aditivo-${a.id}`}
                    disabled={ocupado === a.id} onClick={() => agir(a, 'cancelar')}>
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
