'use strict';

const { env } = require('../../../config/env');
const {
  buildGatewayError,
  buildGatewayResponse,
  buildPlannedEndpointResponse
} = require('../services/coreGatewayService');
const { auditCoreGateway } = require('../audit/coreGatewayAuditService');
const commercialService = require('../services/coreGatewayCommercialService');
const { listarEventosCoreGateway } = require('../events/coreGatewayEvents');

function health(req, res) {
  return res.json(buildGatewayResponse({
    module: 'coreGateway',
    enabled: env.coreGatewayEnabled,
    status: env.coreGatewayEnabled ? 'ENABLED' : 'DISABLED'
  }, req));
}

function eventos(req, res) {
  return res.json(buildGatewayResponse({
    items: listarEventosCoreGateway(),
    total: listarEventosCoreGateway().length,
    status: 'CATALOG_ONLY'
  }, req));
}

function planned(endpoint) {
  return async (req, res) => {
    await auditCoreGateway(req, {
      tipoEvento: 'CORE_GATEWAY_ENDPOINT_PLANNED',
      status: 'INFO',
      descricao: 'Endpoint planejado acessado.',
      metadata: {
        endpoint
      }
    });

    return res.status(501).json(buildPlannedEndpointResponse(endpoint, req));
  };
}

function handleControllerError(res, req, error, fallbackMessage = 'Erro interno no Core Gateway.') {
  const statusCode = Number(error?.statusCode || error?.status || 500);
  const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
  const message = safeStatus >= 500 ? fallbackMessage : error.message;

  return res.status(safeStatus).json(buildGatewayError(
    safeStatus >= 500 ? 'CORE_GATEWAY_INTERNAL_ERROR' : 'CORE_GATEWAY_VALIDATION_ERROR',
    message,
    req
  ));
}

async function listarEmpreendimentos(req, res) {
  try {
    const data = await commercialService.listarEmpreendimentosPublicos(req.query || {});
    await auditCoreGateway(req, {
      tipoEvento: 'CORE_GATEWAY_COMERCIAL_EMPREENDIMENTOS',
      status: 'ALLOWED',
      descricao: 'Consulta publica de empreendimentos enviada ao Experience.',
      metadata: { total: data.length }
    });
    return res.json(buildGatewayResponse({ items: data, total: data.length }, req));
  } catch (error) {
    await auditCoreGateway(req, {
      tipoEvento: 'CORE_GATEWAY_COMERCIAL_EMPREENDIMENTOS_ERROR',
      status: 'ERROR',
      descricao: error.message
    });
    return handleControllerError(res, req, error, 'Erro ao listar empreendimentos publicos.');
  }
}

async function listarUnidades(req, res) {
  try {
    const data = await commercialService.listarUnidadesPublicas(req.query || {});
    await auditCoreGateway(req, {
      tipoEvento: 'CORE_GATEWAY_COMERCIAL_UNIDADES',
      status: 'ALLOWED',
      descricao: 'Consulta publica de unidades enviada ao Experience.',
      metadata: { total: data.length }
    });
    return res.json(buildGatewayResponse({ items: data, total: data.length }, req));
  } catch (error) {
    await auditCoreGateway(req, {
      tipoEvento: 'CORE_GATEWAY_COMERCIAL_UNIDADES_ERROR',
      status: 'ERROR',
      descricao: error.message
    });
    return handleControllerError(res, req, error, 'Erro ao listar unidades publicas.');
  }
}

async function listarMapaUnidades(req, res) {
  try {
    const data = await commercialService.listarMapaUnidadesPublico(req.query || {});
    await auditCoreGateway(req, {
      tipoEvento: 'CORE_GATEWAY_COMERCIAL_MAPA_UNIDADES',
      status: 'ALLOWED',
      descricao: 'Mapa publico de unidades enviado ao Experience.',
      metadata: { total: data.length }
    });
    return res.json(buildGatewayResponse({ grupos: data, total: data.length }, req));
  } catch (error) {
    await auditCoreGateway(req, {
      tipoEvento: 'CORE_GATEWAY_COMERCIAL_MAPA_UNIDADES_ERROR',
      status: 'ERROR',
      descricao: error.message
    });
    return handleControllerError(res, req, error, 'Erro ao listar mapa publico de unidades.');
  }
}

async function simularComercial(req, res) {
  try {
    const data = await commercialService.simularComercialNaoOficial(req.body || {});
    await auditCoreGateway(req, {
      tipoEvento: 'CORE_GATEWAY_COMERCIAL_SIMULACAO',
      status: 'ALLOWED',
      descricao: 'Simulacao comercial nao oficial gerada para o Experience.',
      metadata: {
        unidade_id: data.unidade?.core_id || null,
        prazo_meses: data.prazo_meses
      }
    });
    return res.json(buildGatewayResponse(data, req));
  } catch (error) {
    await auditCoreGateway(req, {
      tipoEvento: 'CORE_GATEWAY_COMERCIAL_SIMULACAO_ERROR',
      status: 'ERROR',
      descricao: error.message
    });
    return handleControllerError(res, req, error, 'Erro ao gerar simulacao comercial.');
  }
}

module.exports = {
  health,
  eventos,
  planned,
  listarEmpreendimentos,
  listarUnidades,
  listarMapaUnidades,
  simularComercial
};
