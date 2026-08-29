import { useEffect, useState } from 'react';
import { getContratoParcelas } from '../../services/contratos';

/**
 * As PREVISOES do contrato dentro do card do Financeiro (PI-16).
 *
 * O cliente pediu que, ao abrir o contrato, as previsoes de parcela ja aparecessem aqui — e que o
 * botao Aprovar as transformasse em titulos. Antes da aprovacao nao existe titulo nenhum
 * (PI-1/PI-5: o compromisso financeiro so nasce quando alguem aprova), entao esta tabela e a
 * unica leitura possivel do que esta por vir.
 *
 * Depois da aprovacao a mesma tabela continua valendo: cada titulo permanece em PREVISAO ate a
 * medicao correspondente ser aprovada, quando passa a ABERTO. E daqui que sai o botao que abre os
 * anexos e comentarios daquela medicao.
 *
 * Le a MESMA rota que a barra de acoes (`/contratos/:id/parcelas`): dois pedacos da tela lendo
 * fontes diferentes acabariam mostrando saldos diferentes para o mesmo contrato.
 */

const moeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const data = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '-');
const ROTULOS_SITUACAO = {
  PREVISAO: 'Previsão',
  ABERTO: 'Aberto',
  LIBERADA: 'Liberada',
  PARCIAL: 'Parcial',
  QUITADO: 'Quitado',
  CANCELADO: 'Cancelado',
  ESTORNADO: 'Estornado'
};

const rotuloSituacao = (valor) => ROTULOS_SITUACAO[String(valor || '').toUpperCase()] || valor || '-';

export default function PrevisoesContrato({
  contratoId,
  solicitacaoId,
  atualizarEm,
  onAbrirMedicao,
  onDados,
  somenteLeitura = false
}) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!contratoId) { setDados(null); return undefined; }
    let cancelado = false;
    setErro('');
    getContratoParcelas(contratoId)
      .then((r) => {
        if (cancelado) return;
        setDados(r);
        // O modal da medicao precisa das MESMAS parcelas que esta tabela mostra. Entregar as daqui,
        // em vez de o modal buscar por conta propria, evita as duas partes da tela discordarem
        // sobre o valor de uma parcela logo depois de uma edicao.
        onDados?.(r);
      })
      .catch((e) => { if (!cancelado) { setDados(null); setErro(e.message || 'Erro ao carregar as parcelas do contrato.'); } });
    return () => { cancelado = true; };
  }, [contratoId, atualizarEm]);

  // Erro primeiro: o `return null` abaixo tambem engolia a falha de carregamento, e o card do
  // Financeiro ficava sem as previsoes e sem dizer por que. Um 403 de escopo de obra e a causa
  // mais comum — precisa estar escrito na tela.
  if (erro) {
    return (
      <div className="app-alert app-alert--warning" data-testid="previsoes-contrato-erro">{erro}</div>
    );
  }

  const contrato = dados?.contrato;
  // Só na solicitacao DONA do contrato. Uma solicitacao de medicao ou de aditivo do fluxo antigo
  // tambem aponta para um contrato, e mostraria aqui parcelas que nao sao dela.
  if (!contrato?.fluxo_novo || String(contrato.solicitacao_id) !== String(solicitacaoId)) return null;

  const parcelas = dados?.parcelas || [];
  const totais = dados?.totais || {};
  const temTitulos = parcelas.some((p) => p.titulo_financeiro_id);
  const aindaPrevisao = parcelas.length > 0
    && parcelas.every((p) => String(p.situacao || p.status).toUpperCase() === 'PREVISAO');

  return (
    <div className="space-y-2 rounded-xl border border-[var(--c-border)] p-3" data-testid="previsoes-contrato">
      {erro && <div className="app-alert app-alert--error">{erro}</div>}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--c-text)]">
          {aindaPrevisao ? 'Previsao de parcelas do contrato' : 'Parcelas do contrato'}
        </h3>
        <span className="text-xs text-[var(--c-muted)]">
          {contrato.codigo} · {parcelas.length} parcela(s) · {moeda(totais.valor_contrato)}
        </span>
      </div>

      {aindaPrevisao && (
        <p className="text-xs text-[var(--c-muted)]">
          {temTitulos
            ? 'Os titulos permanecem em previsao e passam a Aberto somente quando a medicao correspondente for aprovada.'
            : 'Nenhum titulo existe antes da aprovacao do contrato.'}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--c-border)] text-left text-xs uppercase tracking-[0.06em] text-[var(--c-muted)]">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Vencimento</th>
              <th className="px-2 py-2">Valor</th>
              <th className="px-2 py-2">Situacao</th>
              <th className="px-2 py-2">Medicao</th>
            </tr>
          </thead>
          <tbody>
            {parcelas.map((p) => (
              <tr key={p.id} className="border-b border-[var(--c-border)] last:border-0">
                <td className="px-2 py-2 align-top">{p.numero}</td>
                <td className="px-2 py-2 align-top">{data(p.vencimento)}</td>
                <td className="px-2 py-2 align-top">
                  {moeda(p.valor)}
                  {/* Previsto x atual: a medicao reduz a parcela e joga a diferenca na ultima.
                      Mostrar os dois evita a pergunta "por que mudou?" (PI-5). */}
                  {p.valor_previsto !== null && Number(p.valor_previsto) !== Number(p.valor) && (
                    <span className="block text-xs text-[var(--c-muted)]">previsto {moeda(p.valor_previsto)}</span>
                  )}
                </td>
                <td className="px-2 py-2 align-top" data-testid={`situacao-parcela-${p.numero}`}>
                  {rotuloSituacao(p.situacao || p.status)}
                </td>
                <td className="px-2 py-2 align-top">
                  {p.medicao ? (
                    somenteLeitura ? (
                      <span className="text-sm text-[var(--c-text)]">Medicao {p.medicao.numero}</span>
                    ) : (
                      // O botao por titulo que o cliente pediu: abre os anexos e comentarios
                      // DAQUELA medicao. Com uma solicitacao por contrato, sem isto os documentos
                      // de todas as medicoes viram uma pilha unica sem dono.
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        data-testid={`abrir-medicao-${p.medicao.numero}`}
                        onClick={() => onAbrirMedicao?.(p.medicao)}
                      >
                        Medicao {p.medicao.numero}
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-[var(--c-muted)]">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ITEM 17 (23/08): o bloco de apropriacoes do contrato saiu daqui.

          Ele foi posto aqui em 20/08 para resolver um problema real — o card "Apropriacoes da
          solicitacao" aparecia vazio num contrato cujo rateio vive em `contrato_apropriacoes`. Esse
          problema foi resolvido de outro jeito, com o card "Apropriacoes do contrato", e este bloco
          virou a TERCEIRA copia da mesma informacao na mesma tela. O cliente pediu para ficar so a
          do card, que e a unica que tambem edita. */}

      {/* ITEM 21 (23/08): a cor do texto do SALDO muda em tres niveis — Saudavel, Normal, Critico.
          O cliente delimitou: "o alerta e so a cor do texto do saldo do contrato. Nao e tela nova
          para exibir alerta."

          O nivel e a cor vem RESOLVIDOS do backend (`saldo.alerta`). A tela nao refaz a conta: duas
          versoes da mesma regra divergem no dia em que uma das duas muda. `title` guarda o nome do
          nivel, para quem nao distingue as cores. */}
      <div className="flex flex-wrap gap-4 text-xs text-[var(--c-muted)]">
        <span>
          Saldo do contrato:{' '}
          <strong
            data-testid="saldo-do-contrato"
            data-nivel={dados?.saldo?.alerta?.nivel || ''}
            title={dados?.saldo?.alerta ? `Saldo ${dados.saldo.alerta.rotulo.toLowerCase()}` : undefined}
            style={dados?.saldo?.alerta?.cor ? { color: dados.saldo.alerta.cor } : undefined}
          >
            {moeda(dados?.saldo?.saldo)}
          </strong>
        </span>
        <span>Ja comprometido: <strong>{moeda(dados?.saldo?.comprometido)}</strong></span>
      </div>
    </div>
  );
}
