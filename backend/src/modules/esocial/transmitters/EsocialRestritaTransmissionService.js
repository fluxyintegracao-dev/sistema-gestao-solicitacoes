'use strict';

const { EsocialLote, EsocialRetorno, EsocialTransmissionLog } = require('../../../models');
const { assertRestritaTransmissionAllowed } = require('../environments/EsocialEnvironmentService');
const { validateXml } = require('../validators/EsocialXmlValidationService');
const { signXml } = require('../signers/EsocialXmlSignerService');
const { enviarLoteRestrita, consultarLoteRestrita } = require('../soap/EsocialSoapClient');
const { parseRetornoEsocial } = require('../parsers/EsocialRetornoParserService');

async function logTransmission({ lote, evento = null, acao, status, erro = null, protocolo = null, recibo = null, duracao_ms = null, payload = null, user = null }) {
  try {
    return await EsocialTransmissionLog.create({
      evento_id: evento?.id || null,
      lote_id: lote?.id || null,
      empresa_id: lote?.empresa_id || evento?.empresa_id || null,
      ambiente: lote?.ambiente || evento?.ambiente || 'restrita',
      acao,
      status,
      protocolo,
      recibo,
      erro,
      duracao_ms,
      payload_redacted_json: payload ? JSON.stringify(payload) : null,
      criado_por: user?.id || null,
      atualizado_por: user?.id || null
    });
  } catch (error) {
    console.warn('[esocial-transmission-log] falha ao persistir log:', error.message);
    return null;
  }
}

async function enviarLoteParaRestrita(lote_id, user = null) {
  const startedAt = Date.now();
  const lote = await EsocialLote.findByPk(lote_id, { include: [{ association: 'eventos' }] });
  if (!lote) throw new Error('Lote eSocial nao encontrado.');
  assertRestritaTransmissionAllowed();

  const validation = await validateXml({
    xml: lote.xml_lote,
    tipo_evento: 'LOTE',
    lote_id: lote.id,
    empresa_id: lote.empresa_id,
    user
  });
  if (!validation.valid) {
    await lote.update({ status: 'ERRO_TECNICO', atualizado_por: user?.id || null });
    await logTransmission({ lote, acao: 'VALIDAR_LOTE', status: 'INVALIDO', erro: validation.errors.join('; '), user });
    return { sent: false, status: 'INVALIDO', validation };
  }

  const signer = await signXml({ xml: lote.xml_lote, empresa_id: lote.empresa_id }, user);
  if (!signer.signed) {
    await lote.update({ status: 'VALIDADO', atualizado_por: user?.id || null });
    await logTransmission({ lote, acao: 'ASSINAR_LOTE', status: signer.status, erro: (signer.errors || []).join('; '), user });
    return { sent: false, status: signer.status, errors: signer.errors };
  }

  await lote.update({
    xml_lote_assinado: signer.xml_assinado,
    status: 'PRONTO_ENVIO_RESTRITA',
    atualizado_por: user?.id || null
  });

  const result = await enviarLoteRestrita(lote, user);
  const parsed = parseRetornoEsocial(result.response || result);
  await lote.update({
    status: result.sent ? 'ENVIADO_RESTRITA' : result.status,
    protocolo: parsed.protocolo || lote.protocolo,
    enviado_em: result.sent ? new Date() : lote.enviado_em,
    atualizado_por: user?.id || null
  });
  await logTransmission({
    lote,
    acao: 'ENVIAR_RESTRITA',
    status: result.status,
    protocolo: parsed.protocolo,
    recibo: parsed.recibo,
    erro: result.errors ? result.errors.join('; ') : null,
    duracao_ms: Date.now() - startedAt,
    user
  });
  return { ...result, retorno: parsed };
}

async function consultarRetornoRestrita(lote_id, user = null) {
  const lote = await EsocialLote.findByPk(lote_id);
  if (!lote) throw new Error('Lote eSocial nao encontrado.');
  assertRestritaTransmissionAllowed();
  const result = await consultarLoteRestrita(lote, user);
  const parsed = parseRetornoEsocial(result.response || result);
  if (parsed.protocolo || parsed.recibo || parsed.codigo || parsed.descricao) {
    await EsocialRetorno.create({
      lote_id: lote.id,
      status: parsed.recibo ? 'PROCESSADO_RESTRITA' : 'RECEBIDO',
      codigo: parsed.codigo,
      descricao: parsed.descricao,
      payload_xml: parsed.raw,
      payload_json: JSON.stringify(parsed),
      recebido_em: new Date()
    });
  }
  return { ...result, retorno: parsed };
}

module.exports = {
  consultarRetornoRestrita,
  enviarLoteParaRestrita,
  logTransmission
};
