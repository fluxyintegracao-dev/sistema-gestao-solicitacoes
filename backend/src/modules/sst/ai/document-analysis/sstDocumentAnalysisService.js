'use strict';

const { SstDocumento, SstDocumentoAnaliseIa } = require('../../../../models');
const { ValidationError } = require('../../../../middlewares/validation');
const { SST_EVENT_TYPES } = require('../../constants/sstConstants');
const { getSstConfig } = require('../../services/sstConfigService');
const { registrarEventoSst } = require('../../services/sstEventService');

const SUPPORTED_DOCUMENT_TYPES = {
  ASO: ['nome', 'cpf', 'data_exame', 'validade', 'aptidao', 'crm', 'medico'],
  CERTIFICADO: ['treinamento', 'validade', 'carga_horaria', 'instrutor'],
  TREINAMENTO: ['treinamento', 'validade', 'carga_horaria', 'instrutor'],
  EPI: ['epi', 'data_entrega', 'validade', 'ca']
};

async function analisarDocumentoSstComIa({ documento_id, provider = null, usuario_id = null } = {}) {
  if (!documento_id) throw new ValidationError('Documento SST e obrigatorio para analise IA.');
  const documento = await SstDocumento.findByPk(documento_id);
  if (!documento) throw new ValidationError('Documento SST nao encontrado para analise IA.', 404);

  const config = await getSstConfig();
  const providerAtivo = provider || config.ia_documental_provider_ativo || 'NAO_CONFIGURADO';
  const tipo = String(documento.tipo_documento || 'OUTRO').toUpperCase();
  const contrato = SUPPORTED_DOCUMENT_TYPES[tipo] || [];
  const providerConfigurado = providerAtivo && providerAtivo !== 'NAO_CONFIGURADO';

  const [analise] = await SstDocumentoAnaliseIa.findOrCreate({
    where: {
      documento_id,
      provider: providerAtivo
    },
    defaults: {
      documento_id,
      empresa_id: documento.empresa_id || null,
      obra_id: documento.obra_id || null,
      colaborador_id: documento.colaborador_id || null,
      tipo_documento: tipo,
      provider: providerAtivo,
      status: providerConfigurado ? 'AGUARDANDO_PROCESSAMENTO' : 'PENDENTE_PROVIDER',
      confianca: null,
      dados_extraidos_json: JSON.stringify({ contrato_campos: contrato }),
      inconsistencias_json: JSON.stringify(providerConfigurado ? [] : ['Provider IA documental ainda nao configurado.']),
      observacoes: providerConfigurado
        ? 'Contrato de analise criado. Execucao real depende do provider habilitado.'
        : 'Analise real nao executada porque nenhum provider IA/OCR esta configurado.',
      processado_em: providerConfigurado ? null : new Date(),
      criado_por: usuario_id,
      atualizado_por: usuario_id
    }
  });

  await analise.update({
    empresa_id: documento.empresa_id || null,
    obra_id: documento.obra_id || null,
    colaborador_id: documento.colaborador_id || null,
    tipo_documento: tipo,
    status: providerConfigurado ? 'AGUARDANDO_PROCESSAMENTO' : 'PENDENTE_PROVIDER',
    dados_extraidos_json: JSON.stringify({ contrato_campos: contrato }),
    inconsistencias_json: JSON.stringify(providerConfigurado ? [] : ['Provider IA documental ainda nao configurado.']),
    observacoes: providerConfigurado
      ? 'Contrato de analise criado. Execucao real depende do provider habilitado.'
      : 'Analise real nao executada porque nenhum provider IA/OCR esta configurado.',
    processado_em: providerConfigurado ? null : new Date(),
    atualizado_por: usuario_id
  });

  await registrarEventoSst({
    empresa_id: documento.empresa_id || null,
    obra_id: documento.obra_id || null,
    colaborador_id: documento.colaborador_id || null,
    tipo_evento: SST_EVENT_TYPES.DOCUMENTO_ANALISADO_IA,
    severidade: providerConfigurado ? 'INFO' : 'ALERTA',
    origem_tipo: 'sst_documentos_analises_ia',
    origem_id: analise.id,
    mensagem: providerConfigurado
      ? 'Documento SST enviado para fila de analise IA.'
      : 'Documento SST registrado para analise IA, mas provider ainda nao configurado.',
    payload: { documento_id, provider: providerAtivo, contrato_campos: contrato },
    usuario_id
  });

  return analise;
}

function getDocumentAnalysisReadiness() {
  return {
    status: 'ARQUITETURA_PROVIDER_READY',
    transmissao_esocial: false,
    providers_planejados: ['OPENAI', 'CLAUDE', 'AWS_TEXTRACT', 'AZURE_OCR'],
    contratos: SUPPORTED_DOCUMENT_TYPES
  };
}

module.exports = {
  analisarDocumentoSstComIa,
  getDocumentAnalysisReadiness
};
