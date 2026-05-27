'use strict';

const {
  SstDocumento,
  SstDocumentoAnaliseIa,
  SstIaDocumentLog
} = require('../../../../models');
const { ValidationError } = require('../../../../middlewares/validation');
const { SST_EVENT_TYPES } = require('../../constants/sstConstants');
const { registrarEventoSst } = require('../../services/sstEventService');
const { getConfiguredProvider } = require('../providers/providerFactory');
const { reconcileDocumentAnalysis } = require('./SstDocumentReconciliationService');

const SUPPORTED_DOCUMENT_TYPES = {
  ASO: ['nome', 'cpf', 'data_exame', 'tipo_exame', 'aptidao', 'restricoes', 'medico', 'crm', 'uf_crm', 'validade', 'observacoes'],
  CERTIFICADO_TREINAMENTO: ['nome', 'cpf', 'treinamento', 'nr_relacionada', 'carga_horaria', 'data_realizacao', 'validade', 'instrutor', 'entidade_emissora'],
  CERTIFICADO: ['nome', 'cpf', 'treinamento', 'nr_relacionada', 'carga_horaria', 'data_realizacao', 'validade', 'instrutor', 'entidade_emissora'],
  TREINAMENTO: ['nome', 'cpf', 'treinamento', 'nr_relacionada', 'carga_horaria', 'data_realizacao', 'validade', 'instrutor', 'entidade_emissora'],
  FICHA_EPI: ['nome', 'cpf', 'epi', 'ca', 'data_entrega', 'quantidade', 'validade', 'assinatura_detectada', 'observacoes'],
  EPI: ['nome', 'cpf', 'epi', 'ca', 'data_entrega', 'quantidade', 'validade', 'assinatura_detectada', 'observacoes'],
  CAT: ['nome', 'cpf', 'data_acidente', 'tipo_acidente', 'local', 'cid', 'parte_corpo', 'agente_causador'],
  LAUDO: ['nome', 'cpf', 'tipo_laudo', 'data_emissao', 'validade', 'responsavel_tecnico', 'registro_profissional'],
  OUTRO: []
};

function normalizeDocumentType(value) {
  const raw = String(value || 'OUTRO').trim().toUpperCase();
  if (raw.includes('CERTIFICADO')) return 'CERTIFICADO_TREINAMENTO';
  if (raw.includes('TREINAMENTO')) return 'CERTIFICADO_TREINAMENTO';
  if (raw.includes('FICHA') && raw.includes('EPI')) return 'FICHA_EPI';
  if (raw === 'EPI') return 'FICHA_EPI';
  if (SUPPORTED_DOCUMENT_TYPES[raw]) return raw;
  return 'OUTRO';
}

function safeJson(value, fallback = null) {
  try {
    return JSON.stringify(value ?? fallback);
  } catch (_) {
    return JSON.stringify(fallback);
  }
}

function sanitizeProvider(provider) {
  return String(provider || process.env.SST_IA_DOCUMENTAL_PROVIDER || 'openai').trim().toLowerCase();
}

function buildDocumentText(documento, explicitText = null) {
  const parts = [
    explicitText,
    documento?.observacoes,
    documento?.titulo,
    documento?.nome_original ? `Arquivo: ${documento.nome_original}` : null,
    documento?.mimetype ? `Mimetype: ${documento.mimetype}` : null
  ].filter(Boolean);
  return parts.join('\n').trim();
}

async function logIa({ documento, analise, provider, status, etapa, duracao_ms = null, erro = null, payload = null, resposta = null, usuario_id = null }) {
  return SstIaDocumentLog.create({
    documento_id: documento?.id || null,
    analise_id: analise?.id || null,
    empresa_id: documento?.empresa_id || null,
    obra_id: documento?.obra_id || null,
    colaborador_id: documento?.colaborador_id || null,
    provider: provider || 'NAO_CONFIGURADO',
    status,
    etapa,
    duracao_ms,
    erro,
    payload_redacted_json: payload ? safeJson(payload, {}) : null,
    resposta_json: resposta ? safeJson(resposta, {}) : null,
    criado_por: usuario_id,
    atualizado_por: usuario_id
  });
}

async function analisarDocumentoSstComIa({
  documento_id,
  texto_extraido = null,
  usuario_id = null
} = {}) {
  if (!documento_id) throw new ValidationError('Documento SST e obrigatorio para analise IA.');
  const documento = await SstDocumento.findByPk(documento_id);
  if (!documento) throw new ValidationError('Documento SST nao encontrado para analise IA.', 404);

  const startedAt = Date.now();
  const tipo = normalizeDocumentType(documento.tipo_documento);
  const contrato = SUPPORTED_DOCUMENT_TYPES[tipo] || [];
  const providerName = sanitizeProvider();
  const providerInstance = getConfiguredProvider(providerName);
  const texto = buildDocumentText(documento, texto_extraido);

  const [analise] = await SstDocumentoAnaliseIa.findOrCreate({
    where: { documento_id, provider: providerName },
    defaults: {
      documento_id,
      empresa_id: documento.empresa_id || null,
      obra_id: documento.obra_id || null,
      colaborador_id: documento.colaborador_id || null,
      tipo_documento: tipo,
      provider: providerName,
      status: 'EM_ANALISE',
      texto_extraido: texto || null,
      dados_extraidos_json: safeJson({ contrato_campos: contrato }, {}),
      inconsistencias_json: safeJson([], []),
      divergencias_json: safeJson([], []),
      sugestoes_json: safeJson([], []),
      observacoes: 'Analise IA documental iniciada.',
      criado_por: usuario_id,
      atualizado_por: usuario_id
    }
  });

  await analise.update({
    empresa_id: documento.empresa_id || null,
    obra_id: documento.obra_id || null,
    colaborador_id: documento.colaborador_id || null,
    tipo_documento: tipo,
    provider: providerName,
    status: 'EM_ANALISE',
    texto_extraido: texto || null,
    atualizado_por: usuario_id
  });

  await logIa({
    documento,
    analise,
    provider: providerName,
    status: 'INICIADO',
    etapa: 'PIPELINE_DOCUMENT_ANALYSIS',
    payload: {
      tipo_documento: tipo,
      contrato_campos: contrato,
      possui_texto: Boolean(texto)
    },
    usuario_id
  });

  let providerResult;
  try {
    providerResult = await providerInstance.analyzeDocument({
      documentType: tipo,
      text: texto,
      metadata: {
        documento_id: documento.id,
        empresa_id: documento.empresa_id,
        obra_id: documento.obra_id,
        colaborador_id: documento.colaborador_id,
        mimetype: documento.mimetype
      },
      schema: contrato
    });
  } catch (error) {
    providerResult = {
      executed: true,
      provider: providerName,
      status: 'ERRO_PROVIDER',
      confidence: null,
      extracted: {},
      raw: null,
      errors: [error.message || 'Erro ao executar provider IA documental.']
    };
  }

  const extracted = providerResult.extracted || {};
  const reconciliation = await reconcileDocumentAnalysis({
    documento,
    analise,
    extracted,
    usuario_id
  });

  const inconsistencias = [
    ...(providerResult.errors || []),
    ...reconciliation.divergencias.map((item) => `${item.campo}: documento diverge do cadastro interno`)
  ];

  await analise.update({
    status: providerResult.status || (providerResult.executed ? 'PROCESSADO' : 'BLOQUEADO'),
    confianca: providerResult.confidence ?? null,
    dados_extraidos_json: safeJson(extracted, {}),
    inconsistencias_json: safeJson(inconsistencias, []),
    divergencias_json: safeJson(reconciliation.divergencias, []),
    sugestoes_json: safeJson(reconciliation.sugestoes, []),
    observacoes: providerResult.executed
      ? 'Analise IA documental executada. Aplicacao de sugestoes depende de aprovacao humana.'
      : 'Analise IA documental nao executada por bloqueio controlado de configuracao ou insumo.',
    processado_em: new Date(),
    atualizado_por: usuario_id
  });

  await logIa({
    documento,
    analise,
    provider: providerName,
    status: providerResult.status || 'PROCESSADO',
    etapa: 'PIPELINE_FINALIZADO',
    duracao_ms: Date.now() - startedAt,
    erro: inconsistencias.length ? inconsistencias.join('; ') : null,
    payload: { tipo_documento: tipo, possui_texto: Boolean(texto) },
    resposta: {
      executed: providerResult.executed,
      extracted,
      divergencias: reconciliation.divergencias,
      sugestoes: reconciliation.sugestoes
    },
    usuario_id
  });

  await registrarEventoSst({
    empresa_id: documento.empresa_id || null,
    obra_id: documento.obra_id || null,
    colaborador_id: documento.colaborador_id || null,
    tipo_evento: SST_EVENT_TYPES.DOCUMENTO_ANALISADO_IA,
    severidade: reconciliation.divergencias.length ? 'ALERTA' : 'INFO',
    origem_tipo: 'sst_documentos_analises_ia',
    origem_id: analise.id,
    mensagem: providerResult.executed
      ? 'Documento SST analisado por IA documental.'
      : 'Analise IA documental bloqueada por configuracao ou falta de insumo.',
    payload: {
      documento_id,
      provider: providerName,
      status: providerResult.status,
      divergencias: reconciliation.divergencias.length
    },
    usuario_id
  });

  return SstDocumentoAnaliseIa.findByPk(analise.id);
}

async function aprovarSugestaoAnaliseDocumento(analise_id, user = null) {
  const analise = await SstDocumentoAnaliseIa.findByPk(analise_id);
  if (!analise) throw new ValidationError('Analise IA documental nao encontrada.', 404);
  await analise.update({
    status: 'APROVADO_HUMANO',
    aprovado_em: new Date(),
    aprovado_por: user?.id || null,
    atualizado_por: user?.id || null
  });
  await logIa({
    documento: { id: analise.documento_id, empresa_id: analise.empresa_id, obra_id: analise.obra_id, colaborador_id: analise.colaborador_id },
    analise,
    provider: analise.provider,
    status: 'APROVADO_HUMANO',
    etapa: 'APROVACAO_HUMANA',
    usuario_id: user?.id || null
  });
  return SstDocumentoAnaliseIa.findByPk(analise.id);
}

async function rejeitarSugestaoAnaliseDocumento(analise_id, user = null) {
  const analise = await SstDocumentoAnaliseIa.findByPk(analise_id);
  if (!analise) throw new ValidationError('Analise IA documental nao encontrada.', 404);
  await analise.update({
    status: 'REJEITADO_HUMANO',
    rejeitado_em: new Date(),
    rejeitado_por: user?.id || null,
    atualizado_por: user?.id || null
  });
  await logIa({
    documento: { id: analise.documento_id, empresa_id: analise.empresa_id, obra_id: analise.obra_id, colaborador_id: analise.colaborador_id },
    analise,
    provider: analise.provider,
    status: 'REJEITADO_HUMANO',
    etapa: 'REJEICAO_HUMANA',
    usuario_id: user?.id || null
  });
  return SstDocumentoAnaliseIa.findByPk(analise.id);
}

function getDocumentAnalysisReadiness() {
  return {
    status: 'PROVIDER_REAL_CONTROLADO',
    transmissao_esocial: false,
    provider_ativo: process.env.SST_IA_DOCUMENTAL_PROVIDER || 'openai',
    enabled: String(process.env.SST_IA_DOCUMENTAL_ENABLED || 'false').toLowerCase() === 'true',
    providers_planejados: ['openai', 'anthropic', 'claude', 'gemini', 'google', 'http', 'generic', 'aws_textract', 'azure_ocr'],
    contratos: SUPPORTED_DOCUMENT_TYPES,
    observacao: 'A IA real exige flag ativa, chave configurada e texto extraido. Dados criticos dependem de aprovacao humana.'
  };
}

module.exports = {
  analisarDocumentoSstComIa,
  aprovarSugestaoAnaliseDocumento,
  rejeitarSugestaoAnaliseDocumento,
  getDocumentAnalysisReadiness
};
