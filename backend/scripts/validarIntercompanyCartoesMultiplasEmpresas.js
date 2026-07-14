const assert = require('assert');
const {
  buildIntercompanyCartaoPayload
} = require('../src/services/tituloIntercompanyCartaoHelper');

function executar() {
  const mesmaEmpresa = buildIntercompanyCartaoPayload({
    empresaTituloId: 1,
    empresaCartaoId: 1,
    tipoTitulo: 'PAGAR',
    cartaoNome: 'Cartao A'
  });
  assert.strictEqual(mesmaEmpresa.intercompany, false);
  assert.strictEqual(mesmaEmpresa.empresa_origem_id, null);
  assert.strictEqual(mesmaEmpresa.empresa_destino_id, null);

  const cartaoB = buildIntercompanyCartaoPayload({
    empresaTituloId: 1,
    empresaCartaoId: 2,
    tipoTitulo: 'PAGAR',
    cartaoNome: 'Cartao B'
  });
  assert.strictEqual(cartaoB.intercompany, true);
  assert.strictEqual(cartaoB.empresa_origem_id, 2);
  assert.strictEqual(cartaoB.empresa_destino_id, 1);
  assert.strictEqual(cartaoB.empresa_contraparte_id, 2);
  assert.strictEqual(cartaoB.elimina_consolidado, false);
  assert.strictEqual(cartaoB.transferencia_interna, false);

  const cartaoC = buildIntercompanyCartaoPayload({
    empresaTituloId: 1,
    empresaCartaoId: 3,
    tipoTitulo: 'PAGAR',
    cartaoNome: 'Cartao C'
  });
  assert.strictEqual(cartaoC.empresa_origem_id, 3);
  assert.strictEqual(cartaoC.empresa_destino_id, 1);
  assert.notStrictEqual(cartaoC.intercompany_group_id, cartaoB.intercompany_group_id);

  const grupoParcelas = 'IC-CARTAO-PARCELAS-TESTE';
  const cartaoParcelado = buildIntercompanyCartaoPayload({
    empresaTituloId: 1,
    empresaCartaoId: 2,
    tipoTitulo: 'PAGAR',
    cartaoNome: 'Cartao B',
    intercompanyGroupId: grupoParcelas
  });
  assert.strictEqual(cartaoParcelado.intercompany_group_id, grupoParcelas);

  const recebimento = buildIntercompanyCartaoPayload({
    empresaTituloId: 1,
    empresaCartaoId: 2,
    tipoTitulo: 'RECEBER',
    cartaoNome: 'Cartao B'
  });
  assert.strictEqual(recebimento.empresa_origem_id, 1);
  assert.strictEqual(recebimento.empresa_destino_id, 2);
  assert.strictEqual(recebimento.empresa_contraparte_id, 2);

  console.log('Intercompany por cartao validado: mesma empresa, multiplas empresas, parcelas e recebimento.');
}

executar();
