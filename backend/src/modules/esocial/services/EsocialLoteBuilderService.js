'use strict';

const { EsocialLote, EsocialEvento } = require('../../../models');
const { getAmbiente } = require('../environments/EsocialEnvironmentService');
const { sha256 } = require('../utils/xmlUtils');

function buildLoteXml(eventos = []) {
  const body = eventos.map((evento) => evento.xml_assinado || evento.xml_original || '').filter(Boolean).join('\n');
  return [
    '<eSocialLote xmlns="http://www.esocial.gov.br/schema/lote/eventos/v1_1_1">',
    '  <eventos>',
    body,
    '  </eventos>',
    '</eSocialLote>'
  ].join('\n');
}

function buildIdempotencyKey({ empresa_id, eventos = [], ambiente = getAmbiente() }) {
  const eventKeys = eventos.map((evento) => `${evento.tipo_evento}:${evento.idempotency_key || evento.id}`).join('|');
  return sha256(`${ambiente}:${empresa_id}:${eventKeys}:${process.env.ESOCIAL_LAYOUT_VERSION || 'S-1.3'}`);
}

async function createOrUpdateLote({ eventos = [], empresa_id = null, user = null } = {}) {
  const validEvents = eventos.filter(Boolean);
  if (!validEvents.length) throw new Error('Nenhum evento eSocial informado para lote.');
  const finalEmpresaId = empresa_id || validEvents[0].empresa_id;
  const ambiente = getAmbiente();
  const xml_lote = buildLoteXml(validEvents);
  const idempotency_key = buildIdempotencyKey({ empresa_id: finalEmpresaId, eventos: validEvents, ambiente });

  const [lote] = await EsocialLote.findOrCreate({
    where: { idempotency_key },
    defaults: {
      empresa_id: finalEmpresaId,
      ambiente,
      status: 'VALIDADO',
      idempotency_key,
      lote_identificador: `FLUXY-${Date.now()}`,
      xml_lote,
      xml_hash: sha256(xml_lote),
      payload_json: JSON.stringify({ evento_ids: validEvents.map((evento) => evento.id) }),
      criado_por: user?.id || null,
      atualizado_por: user?.id || null
    }
  });

  await lote.update({
    xml_lote,
    xml_hash: sha256(xml_lote),
    status: lote.status === 'RASCUNHO' ? 'VALIDADO' : lote.status,
    atualizado_por: user?.id || null
  });

  await EsocialEvento.update(
    { lote_id: lote.id, atualizado_por: user?.id || null },
    { where: { id: validEvents.map((evento) => evento.id) } }
  );

  return lote;
}

module.exports = {
  buildLoteXml,
  createOrUpdateLote
};
