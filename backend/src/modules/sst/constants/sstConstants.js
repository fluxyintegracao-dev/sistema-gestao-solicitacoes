'use strict';

const SST_RESOURCE_CONFIG = {
  riscos: {
    modelName: 'SstRisco',
    tableName: 'sst_riscos',
    area: 'riscos',
    label: 'Risco SST',
    listOrder: [['updatedAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'setor_id', 'funcao_id', 'nome', 'categoria',
      'severidade', 'probabilidade', 'descricao', 'ativo'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'setor_id', 'funcao_id', 'nome', 'categoria',
      'severidade', 'probabilidade', 'descricao', 'ativo'
    ],
    requiredFields: ['empresa_id', 'nome']
  },
  agentes: {
    modelName: 'SstAgenteNocivo',
    tableName: 'sst_agentes_nocivos',
    area: 'agentes',
    label: 'Agente nocivo',
    listOrder: [['updatedAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'risco_id', 'tipo_agente', 'nome', 'intensidade',
      'unidade', 'tecnica_avaliacao', 'limite_tolerancia', 'ativo'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'risco_id', 'tipo_agente', 'nome', 'intensidade',
      'unidade', 'tecnica_avaliacao', 'limite_tolerancia', 'ativo'
    ],
    requiredFields: ['empresa_id', 'tipo_agente', 'nome']
  },
  pgr: {
    modelName: 'SstPgr',
    tableName: 'sst_pgr',
    area: 'pgr',
    label: 'PGR',
    listOrder: [['vigencia_fim', 'ASC']],
    createFields: [
      'empresa_id', 'obra_id', 'responsavel', 'vigencia_inicio', 'vigencia_fim',
      'status', 'documento_url', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'responsavel', 'vigencia_inicio', 'vigencia_fim',
      'status', 'documento_url', 'observacoes'
    ],
    requiredFields: ['empresa_id', 'responsavel']
  },
  pcmso: {
    modelName: 'SstPcmso',
    tableName: 'sst_pcmso',
    area: 'pcmso',
    label: 'PCMSO',
    listOrder: [['vigencia_fim', 'ASC']],
    createFields: [
      'empresa_id', 'obra_id', 'medico_responsavel', 'crm', 'vigencia_inicio',
      'vigencia_fim', 'status', 'documento_url', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'medico_responsavel', 'crm', 'vigencia_inicio',
      'vigencia_fim', 'status', 'documento_url', 'observacoes'
    ],
    requiredFields: ['empresa_id', 'medico_responsavel']
  },
  aso: {
    modelName: 'SstAso',
    tableName: 'sst_aso',
    area: 'aso',
    label: 'ASO',
    listOrder: [['validade', 'ASC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_exame', 'apto',
      'restricoes', 'data_exame', 'validade', 'medico', 'crm', 'documento_url',
      'status', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_exame', 'apto',
      'restricoes', 'data_exame', 'validade', 'medico', 'crm', 'documento_url',
      'status', 'observacoes'
    ],
    requiredFields: ['empresa_id', 'colaborador_id', 'tipo_exame', 'data_exame']
  },
  exames: {
    modelName: 'SstExame',
    tableName: 'sst_exames',
    area: 'exames',
    label: 'Exame ocupacional',
    listOrder: [['validade', 'ASC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_exame', 'nome_exame',
      'data_exame', 'validade', 'resultado', 'status', 'documento_url',
      'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_exame', 'nome_exame',
      'data_exame', 'validade', 'resultado', 'status', 'documento_url',
      'observacoes'
    ],
    requiredFields: ['empresa_id', 'colaborador_id', 'tipo_exame', 'nome_exame']
  },
  epi: {
    modelName: 'SstEpiEntrega',
    tableName: 'sst_epi_entregas',
    area: 'epi',
    label: 'Entrega de EPI',
    listOrder: [['validade', 'ASC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'epi_nome', 'ca', 'quantidade',
      'entrega_em', 'validade', 'assinatura_url', 'comprovante_url', 'status',
      'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'epi_nome', 'ca', 'quantidade',
      'entrega_em', 'validade', 'assinatura_url', 'comprovante_url', 'status',
      'observacoes'
    ],
    requiredFields: ['empresa_id', 'colaborador_id', 'epi_nome', 'entrega_em']
  },
  treinamentos: {
    modelName: 'SstTreinamento',
    tableName: 'sst_treinamentos',
    area: 'treinamentos',
    label: 'Treinamento SST',
    listOrder: [['validade', 'ASC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'codigo', 'nome', 'data_inicio',
      'data_fim', 'validade', 'instrutor', 'carga_horaria', 'certificado_url',
      'status', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'codigo', 'nome', 'data_inicio',
      'data_fim', 'validade', 'instrutor', 'carga_horaria', 'certificado_url',
      'status', 'observacoes'
    ],
    requiredFields: ['empresa_id', 'colaborador_id', 'nome']
  },
  acidentes: {
    modelName: 'SstAcidente',
    tableName: 'sst_acidentes',
    area: 'acidentes',
    label: 'Acidente ou incidente',
    listOrder: [['data_ocorrencia', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo', 'gravidade', 'local',
      'data_ocorrencia', 'descricao', 'afastamento', 'dias_afastamento',
      'cat_emitida', 'cat_url', 'status', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo', 'gravidade', 'local',
      'data_ocorrencia', 'descricao', 'afastamento', 'dias_afastamento',
      'cat_emitida', 'cat_url', 'status', 'observacoes'
    ],
    requiredFields: ['empresa_id', 'tipo', 'gravidade', 'data_ocorrencia', 'descricao']
  },
  documentos: {
    modelName: 'SstDocumento',
    tableName: 'sst_documentos',
    area: 'documentos',
    label: 'Documento SST',
    listOrder: [['validade', 'ASC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_documento', 'titulo',
      'arquivo_url', 'nome_original', 'mimetype', 'tamanho_bytes', 'validade',
      'status', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_documento', 'titulo',
      'arquivo_url', 'nome_original', 'mimetype', 'tamanho_bytes', 'validade',
      'status', 'observacoes'
    ],
    requiredFields: ['empresa_id', 'tipo_documento', 'titulo']
  },
  esocial: {
    modelName: 'SstEventoEsocial',
    tableName: 'sst_eventos_esocial',
    area: 'esocial',
    label: 'Evento eSocial SST',
    listOrder: [['updatedAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_evento', 'status',
      'xml_original', 'xml_assinado', 'protocolo', 'recibo', 'retorno',
      'enviado_em', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_evento', 'status',
      'xml_original', 'xml_assinado', 'protocolo', 'recibo', 'retorno',
      'enviado_em', 'observacoes'
    ],
    requiredFields: ['empresa_id', 'tipo_evento']
  },
  eventos: {
    modelName: 'SstEventoOperacional',
    tableName: 'sst_eventos_operacionais',
    area: 'analytics',
    label: 'Evento operacional SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_evento', 'severidade',
      'origem_tipo', 'origem_id', 'status', 'mensagem', 'payload'
    ],
    updateFields: ['status', 'mensagem', 'payload'],
    requiredFields: ['tipo_evento', 'mensagem']
  }
};

const SST_EVENT_TYPES = {
  ASO_VENCENDO: 'SST_ASO_VENCENDO',
  EXAME_VENCENDO: 'SST_EXAME_VENCENDO',
  COLABORADOR_INAPTO: 'SST_COLABORADOR_INAPTO',
  EPI_VENCENDO: 'SST_EPI_VENCENDO',
  TREINAMENTO_VENCENDO: 'SST_TREINAMENTO_VENCENDO',
  ACIDENTE_REGISTRADO: 'SST_ACIDENTE_REGISTRADO',
  RISCO_CRITICO_IDENTIFICADO: 'SST_RISCO_CRITICO_IDENTIFICADO',
  EVENTO_ESOCIAL_REJEITADO: 'SST_EVENTO_ESOCIAL_REJEITADO',
  DOCUMENTO_VENCENDO: 'SST_DOCUMENTO_VENCENDO',
  DOCUMENTO_EXPIRADO: 'SST_DOCUMENTO_EXPIRADO',
  COLABORADOR_SEM_NR: 'SST_COLABORADOR_SEM_NR'
};

const SST_VALIDITY_ALERT_DAYS = 30;
const SST_CONFIG_KEY = 'SST_CONFIG';

const DEFAULT_SST_CONFIG = {
  dias_alerta_validade: SST_VALIDITY_ALERT_DAYS,
  tipos_risco: ['FISICO', 'QUIMICO', 'BIOLOGICO', 'ERGONOMICO', 'ACIDENTE'],
  severidades: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'],
  probabilidades: ['BAIXA', 'MEDIA', 'ALTA'],
  tipos_exame: ['ADMISSIONAL', 'PERIODICO', 'RETORNO', 'MUDANCA_FUNCAO', 'DEMISSIONAL'],
  status_exame: ['PENDENTE', 'VALIDO', 'VENCIDO', 'DISPENSADO'],
  tipos_documento: ['ASO', 'CAT', 'PGR', 'PCMSO', 'CERTIFICADO', 'LAUDO', 'TREINAMENTO', 'OUTRO'],
  status_documento: ['ENVIADO', 'CONFERIDO', 'REJEITADO', 'VENCIDO'],
  tipos_acidente: ['ACIDENTE', 'INCIDENTE', 'QUASE_ACIDENTE'],
  gravidades_acidente: ['LEVE', 'MODERADA', 'GRAVE', 'FATAL'],
  status_epi: ['ENTREGUE', 'SUBSTITUIDO', 'DEVOLVIDO'],
  status_programa: ['ATIVO', 'VENCIDO', 'SUBSTITUIDO'],
  eventos_esocial: ['S-2210', 'S-2220', 'S-2240'],
  status_esocial: ['PREPARADO', 'PENDENTE_DOCUMENTACAO', 'REJEITADO', 'PROCESSADO']
};

module.exports = {
  DEFAULT_SST_CONFIG,
  SST_CONFIG_KEY,
  SST_EVENT_TYPES,
  SST_RESOURCE_CONFIG,
  SST_VALIDITY_ALERT_DAYS
};
