'use strict';

/**
 * Prova pura do roteamento do pedido de aditivo pelo limite juridico.
 *
 * Nao abre conexao nem grava no banco. O limite entra como dado para provar a fronteira exata e
 * evitar que uma alteracao futura volte a comparar somente o valor isolado do aditivo.
 */

const {
  calcularRoteamentoSolicitacaoAditivo
} = require('../src/services/contratoAditivoRoteamento');

function garantir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

function conferir(cenario, entrada, esperado) {
  const resultado = calcularRoteamentoSolicitacaoAditivo(entrada);

  garantir(
    resultado.valorTotalAposPedidoCent === esperado.valorTotalAposPedidoCent,
    `${cenario}: total esperado ${esperado.valorTotalAposPedidoCent}; recebido ${resultado.valorTotalAposPedidoCent}.`
  );
  garantir(
    resultado.setorDestino === esperado.setorDestino,
    `${cenario}: setor esperado ${esperado.setorDestino}; recebido ${resultado.setorDestino}.`
  );
  garantir(
    resultado.statusDestino === esperado.statusDestino,
    `${cenario}: status esperado ${esperado.statusDestino}; recebido ${resultado.statusDestino}.`
  );
  garantir(
    resultado.encaminharDiretoAoJuridico === esperado.encaminharDiretoAoJuridico,
    `${cenario}: decisao de encaminhamento divergente.`
  );

  console.log(`OK: ${cenario}`);
}

const limiteCent = 5_000_000;

conferir(
  'total exatamente no limite permanece na GEO',
  { valorOriginal: 45000, valorAditivosAprovados: 0, valorSolicitado: 5000, limiteCent },
  {
    valorTotalAposPedidoCent: limiteCent,
    setorDestino: 'GEO',
    statusDestino: 'PED. ADITIVO',
    encaminharDiretoAoJuridico: false
  }
);

conferir(
  'um centavo acima do limite segue direto ao Juridico',
  { valorOriginal: 45000, valorAditivosAprovados: 0, valorSolicitado: 5000.01, limiteCent },
  {
    valorTotalAposPedidoCent: limiteCent + 1,
    setorDestino: 'JURIDICO',
    statusDestino: 'PENDENTE',
    encaminharDiretoAoJuridico: true
  }
);

conferir(
  'aditivos anteriores entram no compromisso total',
  { valorOriginal: 40000, valorAditivosAprovados: 8000, valorSolicitado: 2000.01, limiteCent },
  {
    valorTotalAposPedidoCent: limiteCent + 1,
    setorDestino: 'JURIDICO',
    statusDestino: 'PENDENTE',
    encaminharDiretoAoJuridico: true
  }
);

conferir(
  'aditivo de prazo de contrato ja acima do limite segue ao Juridico',
  { valorOriginal: 50000.01, valorAditivosAprovados: 0, valorSolicitado: 0, limiteCent },
  {
    valorTotalAposPedidoCent: limiteCent + 1,
    setorDestino: 'JURIDICO',
    statusDestino: 'PENDENTE',
    encaminharDiretoAoJuridico: true
  }
);

console.log('Roteamento de aditivo pelo limite juridico validado sem escrita no banco.');
