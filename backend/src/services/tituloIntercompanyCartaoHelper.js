const crypto = require('crypto');
const {
  TIPO_INTERCOMPANY_TRANSFERENCIA_OPERACIONAL
} = require('../constants/intercompany');

function buildIntercompanyFieldsVazios() {
  return {
    intercompany: false,
    empresa_contraparte_id: null,
    intercompany_group_id: null,
    empresa_origem_id: null,
    empresa_destino_id: null,
    tipo_intercompany: null,
    motivo_intercompany: null,
    elimina_consolidado: false,
    transferencia_interna: false
  };
}

function buildIntercompanyCartaoPayload({
  empresaTituloId,
  empresaCartaoId,
  tipoTitulo,
  cartaoNome,
  intercompanyGroupId
} = {}) {
  const tituloEmpresaId = Number(empresaTituloId);
  const cartaoEmpresaId = Number(empresaCartaoId);

  if (!Number.isInteger(tituloEmpresaId) || tituloEmpresaId <= 0) {
    throw new Error('Empresa do titulo invalida para resolver o pagamento por cartao.');
  }
  if (!Number.isInteger(cartaoEmpresaId) || cartaoEmpresaId <= 0) {
    throw new Error('Empresa da conta vinculada ao cartao invalida.');
  }

  if (tituloEmpresaId === cartaoEmpresaId) {
    return buildIntercompanyFieldsVazios();
  }

  const isPagar = String(tipoTitulo || '').trim().toUpperCase() === 'PAGAR';
  const identificacaoCartao = String(cartaoNome || '').trim();

  return {
    intercompany: true,
    empresa_contraparte_id: cartaoEmpresaId,
    intercompany_group_id: intercompanyGroupId || `IC-CARTAO-${crypto.randomUUID()}`,
    empresa_origem_id: isPagar ? cartaoEmpresaId : tituloEmpresaId,
    empresa_destino_id: isPagar ? tituloEmpresaId : cartaoEmpresaId,
    tipo_intercompany: TIPO_INTERCOMPANY_TRANSFERENCIA_OPERACIONAL,
    motivo_intercompany: identificacaoCartao
      ? `Pagamento com o cartao ${identificacaoCartao}, vinculado a outra empresa do grupo.`
      : 'Pagamento com cartao vinculado a outra empresa do grupo.',
    elimina_consolidado: false,
    transferencia_interna: false
  };
}

module.exports = {
  buildIntercompanyCartaoPayload,
  buildIntercompanyFieldsVazios
};
