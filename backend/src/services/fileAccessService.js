const {
  Anexo,
  ArquivoModelo,
  Comprovante,
  Contrato,
  ContratoAnexo,
  ConversaInterna,
  ConversaInternaAnexo,
  ConversaInternaParticipante,
  Solicitacao,
  SolicitacaoCompra,
  SolicitacaoCompraItem,
  SolicitacaoCompraItemManual
} = require('../models');
const { Op } = require('sequelize');
const {
  buildUserScopeTokens,
  canAccessComprovantes,
  getUserObraScopeIds,
  hasObraAccess,
  isBusinessAdmin
} = require('./authorizationService');
const { canViewArquivoModeloPage } = require('./arquivoModeloAccessService');
const { userHasSetorCapability } = require('./setorCapabilityService');
const { registrarEventoSeguranca } = require('./securityLogService');

async function hasLegacyContractGlobalAccess(tokens, user) {
  return (
    isBusinessAdmin(user) ||
    tokens.includes('SUPERADMIN') ||
    (tokens.includes('ADMIN') && await userHasSetorCapability(user, 'eh_setor_geo'))
  );
}

async function hasLegacyCompraGlobalAccess(tokens, user) {
  return (
    tokens.includes('SUPERADMIN') ||
    tokens.includes('ADMIN') ||
    await userHasSetorCapability(user, 'eh_setor_compras') ||
    await userHasSetorCapability(user, 'eh_setor_geo')
  );
}

async function logFileDenied(req, resourceType, resourceId, descricao, metadata = null) {
  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FILE_ACCESS_DENIED',
    recursoTipo: resourceType,
    recursoId: resourceId != null ? String(resourceId) : null,
    status: 'DENIED',
    descricao,
    metadata
  });
}

async function canAccessContractResource(user, obraId) {
  const obrasPermitidas = await getUserObraScopeIds(user);
  if (obrasPermitidas === null) {
    return true;
  }

  if (obrasPermitidas.length > 0) {
    return obrasPermitidas.includes(Number(obraId));
  }

  const tokens = await buildUserScopeTokens(user);
  return hasLegacyContractGlobalAccess(tokens, user);
}

async function canAccessCompraResource(user, obraId) {
  const obrasPermitidas = await getUserObraScopeIds(user);
  if (obrasPermitidas === null) {
    return true;
  }

  if (obrasPermitidas.length > 0) {
    return obrasPermitidas.includes(Number(obraId));
  }

  const tokens = await buildUserScopeTokens(user);
  return hasLegacyCompraGlobalAccess(tokens, user);
}

async function canAccessConversa(req, conversaId) {
  const conversa = await ConversaInterna.findByPk(conversaId, {
    attributes: ['id', 'criado_por_id', 'destinatario_id']
  });

  if (!conversa) {
    return {
      allowed: false,
      status: 404,
      error: 'Conversa nao encontrada'
    };
  }

  const usuarioId = Number(req.user?.id);
  if (
    Number(conversa.criado_por_id) === usuarioId ||
    Number(conversa.destinatario_id) === usuarioId
  ) {
    return { allowed: true };
  }

  const participacao = await ConversaInternaParticipante.findOne({
    where: {
      conversa_id: conversa.id,
      usuario_id: usuarioId
    },
    attributes: ['id']
  });

  if (participacao) {
    return { allowed: true };
  }

  await logFileDenied(
    req,
    'CONVERSA',
    conversa.id,
    'Usuario tentou acessar anexo de conversa sem participacao',
    { conversa_id: conversa.id }
  );

  return {
    allowed: false,
    status: 403,
    error: 'Acesso negado ao anexo da conversa'
  };
}

async function canAccessSolicitacaoFile(req, solicitacaoId) {
  const solicitacao = await Solicitacao.findByPk(solicitacaoId, {
    attributes: ['id', 'obra_id']
  });

  if (!solicitacao) {
    return {
      allowed: false,
      status: 404,
      error: 'Solicitacao nao encontrada'
    };
  }

  const allowed = await hasObraAccess(req.user, solicitacao.obra_id);
  if (allowed) {
    return { allowed: true };
  }

  await logFileDenied(
    req,
    'SOLICITACAO',
    solicitacao.id,
    'Usuario sem acesso a obra do anexo da solicitacao',
    { obra_id: solicitacao.obra_id }
  );

  return {
    allowed: false,
    status: 403,
    error: 'Acesso negado para a obra da solicitacao'
  };
}

async function canAccessContratoFile(req, contratoId) {
  const contrato = await Contrato.findByPk(contratoId, {
    attributes: ['id', 'obra_id']
  });

  if (!contrato) {
    return {
      allowed: false,
      status: 404,
      error: 'Contrato nao encontrado'
    };
  }

  const hasAdminFinanceLikeAccess =
    isBusinessAdmin(req.user) ||
    (String(req.user?.perfil || '').trim().toUpperCase() === 'ADMIN' &&
      await userHasSetorCapability(req.user, 'eh_setor_geo'));

  const hasScopeAccess = await canAccessContractResource(req.user, contrato.obra_id);
  if (hasAdminFinanceLikeAccess && hasScopeAccess) {
    return { allowed: true };
  }

  await logFileDenied(
    req,
    'CONTRATO',
    contrato.id,
    'Usuario sem permissao para acessar anexo de contrato',
    { obra_id: contrato.obra_id }
  );

  return {
    allowed: false,
    status: 403,
    error: 'Acesso negado ao anexo do contrato'
  };
}

async function canAccessComprovanteFile(req, comprovante) {
  const hasModuleAccess = await canAccessComprovantes(req.user);
  if (!hasModuleAccess) {
    await logFileDenied(
      req,
      'COMPROVANTE',
      comprovante.id,
      'Usuario sem permissao para acessar comprovante',
      { obra_id: comprovante.obra_id || null, solicitacao_id: comprovante.solicitacao_id || null }
    );
    return {
      allowed: false,
      status: 403,
      error: 'Acesso negado ao comprovante'
    };
  }

  return { allowed: true };
}

async function canAccessCompraFile(req, solicitacaoCompraId) {
  const solicitacaoCompra = await SolicitacaoCompra.findByPk(solicitacaoCompraId, {
    attributes: ['id', 'obra_id']
  });

  if (!solicitacaoCompra) {
    return {
      allowed: false,
      status: 404,
      error: 'Solicitacao de compra nao encontrada'
    };
  }

  const allowed = await canAccessCompraResource(req.user, solicitacaoCompra.obra_id);
  if (allowed) {
    return { allowed: true };
  }

  await logFileDenied(
    req,
    'SOLICITACAO_COMPRA',
    solicitacaoCompra.id,
    'Usuario sem acesso ao arquivo da solicitacao de compra',
    { obra_id: solicitacaoCompra.obra_id }
  );

  return {
    allowed: false,
    status: 403,
    error: 'Acesso negado ao arquivo da solicitacao de compra'
  };
}

function addCandidate(candidates, value) {
  const normalized = String(value || '').trim();
  if (normalized) candidates.add(normalized);
}

function buildFileTargetCandidates(alvo) {
  const candidates = new Set();
  const target = String(alvo || '').trim();
  addCandidate(candidates, target);

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;

  try {
    const parsed = new URL(target);
    if (bucket && parsed.hostname.startsWith(`${bucket}.s3`)) {
      const rawKey = parsed.pathname.replace(/^\//, '');
      addCandidate(candidates, rawKey);

      try {
        addCandidate(candidates, decodeURIComponent(rawKey));
      } catch {
        const sanitizedKey = rawKey.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
        addCandidate(candidates, decodeURIComponent(sanitizedKey));
      }

      if (region) {
        addCandidate(candidates, `https://${bucket}.s3.${region}.amazonaws.com/${rawKey}`);
      }
    }
  } catch {
    if (bucket && region && target && !target.startsWith('http')) {
      addCandidate(candidates, `https://${bucket}.s3.${region}.amazonaws.com/${target}`);
    }
  }

  return Array.from(candidates);
}

function getRegisteredFilePath(target) {
  if (!target?.record) return null;

  return (
    target.record.caminho_arquivo ||
    target.record.arquivo_url ||
    target.record.caminho ||
    null
  );
}

async function resolveRegisteredFileResource(alvo) {
  const fileCandidates = buildFileTargetCandidates(alvo);
  const whereIn = { [Op.in]: fileCandidates };

  const buscas = await Promise.all([
    Anexo.findOne({
      where: { caminho_arquivo: whereIn, deleted_at: null },
      attributes: ['id', 'solicitacao_id', 'caminho_arquivo']
    }),
    ContratoAnexo.findOne({
      where: { caminho_arquivo: whereIn },
      attributes: ['id', 'contrato_id', 'caminho_arquivo']
    }),
    Comprovante.findOne({
      where: { caminho_arquivo: whereIn, deleted_at: null },
      attributes: ['id', 'solicitacao_id', 'obra_id', 'caminho_arquivo']
    }),
    ArquivoModelo.findOne({
      where: { arquivo_url: whereIn },
      attributes: ['id', 'pagina_codigo', 'arquivo_url', 'ativo']
    }),
    ConversaInternaAnexo.findOne({
      where: { caminho: whereIn },
      attributes: ['id', 'conversa_id', 'caminho']
    }),
    SolicitacaoCompraItem.findOne({
      where: { arquivo_url: whereIn },
      attributes: ['id', 'solicitacao_compra_id', 'arquivo_url']
    }),
    SolicitacaoCompraItemManual.findOne({
      where: { arquivo_url: whereIn },
      attributes: ['id', 'solicitacao_compra_id', 'arquivo_url']
    })
  ]);

  if (buscas[0]) return { kind: 'SOLICITACAO_ANEXO', record: buscas[0] };
  if (buscas[1]) return { kind: 'CONTRATO_ANEXO', record: buscas[1] };
  if (buscas[2]) return { kind: 'COMPROVANTE', record: buscas[2] };
  if (buscas[3]) return { kind: 'ARQUIVO_MODELO', record: buscas[3] };
  if (buscas[4]) return { kind: 'CONVERSA_ANEXO', record: buscas[4] };
  if (buscas[5]) return { kind: 'COMPRA_ITEM_ARQUIVO', record: buscas[5] };
  if (buscas[6]) return { kind: 'COMPRA_ITEM_MANUAL_ARQUIVO', record: buscas[6] };

  return null;
}

async function assertRegisteredFileAccess(req, target) {
  if (!target?.kind || !target?.record) {
    return {
      allowed: false,
      status: 404,
      error: 'Arquivo nao encontrado'
    };
  }

  if (target.kind === 'SOLICITACAO_ANEXO') {
    return canAccessSolicitacaoFile(req, target.record.solicitacao_id);
  }

  if (target.kind === 'CONTRATO_ANEXO') {
    return canAccessContratoFile(req, target.record.contrato_id);
  }

  if (target.kind === 'COMPROVANTE') {
    return canAccessComprovanteFile(req, target.record);
  }

  if (target.kind === 'ARQUIVO_MODELO') {
    if (target.record.ativo === false) {
      return {
        allowed: false,
        status: 404,
        error: 'Arquivo nao encontrado'
      };
    }

    const allowed = await canViewArquivoModeloPage(req.user, target.record.pagina_codigo);
    if (allowed) {
      return { allowed: true };
    }

    await logFileDenied(
      req,
      'ARQUIVO_MODELO',
      target.record.id,
      'Usuario sem permissao para acessar arquivo modelo da pagina',
      { pagina_codigo: target.record.pagina_codigo }
    );

    return {
      allowed: false,
      status: 403,
      error: 'Acesso negado ao arquivo modelo'
    };
  }

  if (target.kind === 'CONVERSA_ANEXO') {
    return canAccessConversa(req, target.record.conversa_id);
  }

  if (target.kind === 'COMPRA_ITEM_ARQUIVO' || target.kind === 'COMPRA_ITEM_MANUAL_ARQUIVO') {
    return canAccessCompraFile(req, target.record.solicitacao_compra_id);
  }

  return {
    allowed: false,
    status: 403,
    error: 'Acesso negado ao arquivo'
  };
}

module.exports = {
  assertRegisteredFileAccess,
  getRegisteredFilePath,
  resolveRegisteredFileResource
};
