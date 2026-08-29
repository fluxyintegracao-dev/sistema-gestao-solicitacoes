import { useEffect, useState } from 'react';
import { atualizarApropriacoesContrato } from '../../services/contratos';
import { listarApropriacoes } from '../../services/apropriacoes';
import OverlayModal from '../../components/ui/OverlayModal';
import { nomeApropriacao, percentualApropriacao } from '../../utils/apropriacao';
import RateioApropriacoesContrato, { numeroDoCampo } from '../../components/contratos/RateioApropriacoesContrato';

/**
 * O rateio de apropriacoes DO CONTRATO, dentro da solicitacao que e dona dele (PI-16).
 *
 * Ate aqui esta tela oferecia "Apropriacoes da solicitacao", que le `solicitacao_apropriacoes` — e
 * essa tabela fica vazia num contrato do fluxo novo, porque o formulario de Abertura de Contrato
 * grava o rateio em `contrato_apropriacoes`. O card aparecia vazio e, pior, salvar nele gravaria uma
 * segunda lista que NADA consome: o rateio dos titulos sai do contrato (`montarRateios`).
 *
 * As duas tabelas continuam existindo e nao sao duplicata — a da solicitacao e a subdivisao por
 * solicitacao dentro da lista do contrato, e serve a medicao do fluxo antigo. O que muda e so quem
 * esta tela edita quando a solicitacao E o contrato.
 *
 * Reusa `RateioApropriacoesContrato`, o mesmo componente da Nova Solicitacao: as colunas % e R$ que
 * se recalculam, a soma que precisa fechar em 100% e a busca com autocomplete ja estao ali. Uma
 * segunda implementacao da mesma tabela divergiria da primeira na primeira correcao.
 */

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2
});

const comVirgula = (n, casas) => Number(n || 0).toFixed(casas).replace('.', ',');

export default function ApropriacoesDoContrato({ contrato, podeEditar, onMudou }) {
  const [aberto, setAberto] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [disponiveis, setDisponiveis] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const lista = Array.isArray(contrato?.apropriacoes) ? contrato.apropriacoes : [];
  const valorTotal = Number(contrato?.valor_total || 0) + Number(contrato?.valor_aditivos || 0);

  useEffect(() => {
    if (!aberto || !contrato?.obra_id) return undefined;
    let cancelado = false;
    listarApropriacoes({ obra_id: contrato.obra_id })
      .then((d) => { if (!cancelado) setDisponiveis(Array.isArray(d) ? d : (d?.data || [])); })
      .catch(() => { if (!cancelado) setDisponiveis([]); });
    return () => { cancelado = true; };
  }, [aberto, contrato?.obra_id]);

  function abrir() {
    setLinhas(lista.length > 0
      ? lista.map((a) => ({
        apropriacao_id: String(a.apropriacao_id),
        percentual: comVirgula(a.percentual, 4),
        valor: comVirgula((valorTotal * Number(a.percentual || 0)) / 100, 2)
      }))
      : [{ apropriacao_id: '', percentual: '', valor: '' }]);
    setMotivo('');
    setErro('');
    setAberto(true);
  }

  async function salvar() {
    setErro('');
    if (!String(motivo).trim()) {
      setErro('Informe o motivo da alteracao.');
      return;
    }
    const payload = linhas
      .filter((l) => l.apropriacao_id)
      .map((l) => ({ apropriacao_id: Number(l.apropriacao_id), percentual: numeroDoCampo(l.percentual) }));

    if (payload.length === 0) {
      setErro('Informe ao menos uma apropriacao.');
      return;
    }
    // A mesma tolerancia do backend. Barrar aqui evita a viagem so para receber o 400.
    const soma = payload.reduce((acc, l) => acc + (l.percentual || 0), 0);
    if (Math.abs(soma - 100) > 0.0001) {
      setErro(`A soma dos percentuais precisa fechar 100%. Hoje soma ${comVirgula(soma, 4)}%.`);
      return;
    }

    setSalvando(true);
    try {
      await atualizarApropriacoesContrato(contrato.id, { apropriacoes: payload, motivo: motivo.trim() });
      setAberto(false);
      onMudou?.();
    } catch (e) {
      setErro(e.message || 'Nao foi possivel salvar as apropriacoes.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card space-y-3" data-testid="apropriacoes-do-contrato">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)]">Apropriacoes do contrato</h2>
          <p className="text-sm text-[var(--c-muted)]">
            Rateio aplicado a todas as parcelas. E daqui que sai a divisao de cada titulo na aprovacao.
          </p>
        </div>
        {podeEditar && (
          <button type="button" className="btn btn-outline btn-sm" onClick={abrir} data-testid="editar-apropriacoes-contrato">
            Editar apropriacoes
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-[var(--c-muted)]">Nenhuma apropriacao cadastrada para este contrato.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--c-border)] text-left text-xs uppercase tracking-[0.06em] text-[var(--c-muted)]">
                <th className="px-2 py-2">Apropriacao</th>
                <th className="px-2 py-2" style={{ width: 120 }}>Rateio %</th>
                <th className="px-2 py-2" style={{ width: 160 }}>Rateio R$</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.apropriacao_id} className="border-b border-[var(--c-border)] last:border-0">
                  <td className="px-2 py-2">{nomeApropriacao(a)}</td>
                  <td className="px-2 py-2">{percentualApropriacao(a.percentual)}%</td>
                  <td className="px-2 py-2">{moeda((valorTotal * Number(a.percentual || 0)) / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OverlayModal aberto={aberto} rotulo="Editar apropriacoes do contrato">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
          <h3 className="text-base font-semibold text-[var(--c-text)]">Apropriacoes do contrato {contrato?.codigo}</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setAberto(false)} disabled={salvando}>
            Fechar
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-3">
          {erro && <div className="app-alert app-alert--error">{erro}</div>}

          <RateioApropriacoesContrato
            linhas={linhas}
            apropriacoes={disponiveis}
            valorTotal={String(valorTotal)}
            onChange={setLinhas}
            desabilitado={salvando}
          />

          <label className="grid gap-1 text-sm">
            Motivo da alteracao *
            <textarea
              className="input"
              rows={2}
              name="motivo_apropriacoes_contrato"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={salvando}
            />
            <span className="text-xs text-[var(--c-muted)]">
              Fica no historico da solicitacao, com o rateio antes e depois.
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--c-border)] px-4 py-3">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setAberto(false)} disabled={salvando}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={salvar} disabled={salvando}
            data-testid="salvar-apropriacoes-contrato">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </OverlayModal>
    </div>
  );
}
