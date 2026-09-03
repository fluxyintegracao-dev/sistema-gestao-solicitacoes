'use strict';

const { paraCentavos } = require('./contratoParcelasService');

const SETOR_GERENCIA_PROCESSOS = 'GEO';
const SETOR_JURIDICO = 'JURIDICO';
const STATUS_SOLICITACAO_PEDIDO_ADITIVO = 'PED. ADITIVO';
const STATUS_SOLICITACAO_JURIDICO = 'PENDENTE';

/**
 * Decide a fila do pedido pelo compromisso total que existira depois da aprovacao.
 *
 * Funcao pura para a fronteira monetaria ser testada sem banco: exatamente no limite permanece na
 * GEO; somente um total superior segue diretamente ao Juridico.
 */
function calcularRoteamentoSolicitacaoAditivo({
  valorOriginal,
  valorAditivosAprovados = 0,
  valorSolicitado = 0,
  limiteCent
}) {
  const valorTotalAposPedidoCent = paraCentavos(valorOriginal)
    + paraCentavos(valorAditivosAprovados)
    + paraCentavos(valorSolicitado);
  const encaminharDiretoAoJuridico = valorTotalAposPedidoCent > Number(limiteCent || 0);

  return {
    valorTotalAposPedidoCent,
    encaminharDiretoAoJuridico,
    setorDestino: encaminharDiretoAoJuridico ? SETOR_JURIDICO : SETOR_GERENCIA_PROCESSOS,
    statusDestino: encaminharDiretoAoJuridico
      ? STATUS_SOLICITACAO_JURIDICO
      : STATUS_SOLICITACAO_PEDIDO_ADITIVO
  };
}

module.exports = {
  calcularRoteamentoSolicitacaoAditivo,
  SETOR_GERENCIA_PROCESSOS,
  SETOR_JURIDICO,
  STATUS_SOLICITACAO_PEDIDO_ADITIVO,
  STATUS_SOLICITACAO_JURIDICO
};
