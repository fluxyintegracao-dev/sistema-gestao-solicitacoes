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
  ambientes: {
    modelName: 'SstAmbienteTrabalho',
    tableName: 'sst_ambientes_trabalho',
    area: 'riscos',
    label: 'Ambiente de trabalho',
    listOrder: [['updatedAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'setor_id', 'nome', 'tipo_ambiente',
      'descricao', 'local_amb', 'esocial_tp_insc', 'esocial_nr_insc', 'ativo'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'setor_id', 'nome', 'tipo_ambiente',
      'descricao', 'local_amb', 'esocial_tp_insc', 'esocial_nr_insc', 'ativo'
    ],
    requiredFields: ['empresa_id', 'nome']
  },
  exposicoes: {
    modelName: 'SstExposicao',
    tableName: 'sst_exposicoes',
    area: 'riscos',
    label: 'Exposicao ocupacional',
    listOrder: [['data_inicio', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'ambiente_id', 'risco_id',
      'agente_nocivo_id', 'data_inicio', 'data_fim', 'atividade_desempenhada',
      'codigo_agente_nocivo', 'descricao_agente_nocivo', 'intensidade',
      'unidade_medida', 'tecnica_medicao', 'limite_tolerancia', 'utiliza_epc',
      'epc_eficaz', 'utiliza_epi', 'epi_eficaz', 'epi_ca',
      'responsavel_tecnico_nome', 'responsavel_tecnico_cpf',
      'responsavel_tecnico_registro', 'responsavel_tecnico_orgao',
      'responsavel_tecnico_uf', 'status', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'ambiente_id', 'risco_id',
      'agente_nocivo_id', 'data_inicio', 'data_fim', 'atividade_desempenhada',
      'codigo_agente_nocivo', 'descricao_agente_nocivo', 'intensidade',
      'unidade_medida', 'tecnica_medicao', 'limite_tolerancia', 'utiliza_epc',
      'epc_eficaz', 'utiliza_epi', 'epi_eficaz', 'epi_ca',
      'responsavel_tecnico_nome', 'responsavel_tecnico_cpf',
      'responsavel_tecnico_registro', 'responsavel_tecnico_orgao',
      'responsavel_tecnico_uf', 'status', 'observacoes'
    ],
    requiredFields: ['empresa_id', 'colaborador_id', 'data_inicio']
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
      'restricoes', 'data_exame', 'validade', 'medico', 'crm', 'uf_crm', 'documento_url',
      'status', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_exame', 'apto',
      'restricoes', 'data_exame', 'validade', 'medico', 'crm', 'uf_crm', 'documento_url',
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
      'empresa_id', 'obra_id', 'colaborador_id', 'aso_id', 'tipo_exame', 'nome_exame',
      'data_exame', 'validade', 'resultado', 'status', 'documento_url',
      'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'aso_id', 'tipo_exame', 'nome_exame',
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
      'obrigatorio', 'funcao_alvo', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'epi_nome', 'ca', 'quantidade',
      'entrega_em', 'validade', 'assinatura_url', 'comprovante_url', 'status',
      'obrigatorio', 'funcao_alvo', 'observacoes'
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
      'obrigatorio', 'funcao_alvo', 'status', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'codigo', 'nome', 'data_inicio',
      'data_fim', 'validade', 'instrutor', 'carga_horaria', 'certificado_url',
      'obrigatorio', 'funcao_alvo', 'status', 'observacoes'
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
      'data_ocorrencia', 'descricao', 'agente_causador', 'situacao_geradora',
      'parte_corpo', 'cid', 'afastamento', 'dias_afastamento', 'cat_emitida',
      'cat_url', 'fotos_url', 'acoes_corretivas', 'responsavel_id', 'status',
      'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo', 'gravidade', 'local',
      'data_ocorrencia', 'descricao', 'agente_causador', 'situacao_geradora',
      'parte_corpo', 'cid', 'afastamento', 'dias_afastamento', 'cat_emitida',
      'cat_url', 'fotos_url', 'acoes_corretivas', 'responsavel_id', 'status',
      'observacoes'
    ],
    requiredFields: ['empresa_id', 'tipo', 'gravidade', 'data_ocorrencia', 'descricao']
  },
  regras: {
    modelName: 'SstRegraConformidade',
    tableName: 'sst_regras_conformidade',
    area: 'analytics',
    label: 'Regra de conformidade SST',
    listOrder: [['updatedAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'codigo', 'nome', 'tipo_regra', 'funcao_alvo',
      'treinamento_codigo', 'epi_nome', 'severidade', 'ativo',
      'parametros_json', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'codigo', 'nome', 'tipo_regra', 'funcao_alvo',
      'treinamento_codigo', 'epi_nome', 'severidade', 'ativo',
      'parametros_json', 'observacoes'
    ],
    requiredFields: ['empresa_id', 'codigo', 'nome', 'tipo_regra']
  },
  politicas_bloqueio: {
    modelName: 'SstPoliticaBloqueio',
    tableName: 'sst_politicas_bloqueio',
    area: 'configuracoes',
    label: 'Politica de bloqueio SST',
    listOrder: [['updatedAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'setor_id', 'codigo', 'nome', 'tipo_regra',
      'tipo_bloqueio', 'tipo_risco', 'funcao_alvo', 'criticidade', 'ativo',
      'parametros_json', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'setor_id', 'codigo', 'nome', 'tipo_regra',
      'tipo_bloqueio', 'tipo_risco', 'funcao_alvo', 'criticidade', 'ativo',
      'parametros_json', 'observacoes'
    ],
    requiredFields: ['empresa_id', 'codigo', 'nome', 'tipo_regra']
  },
  bloqueios: {
    modelName: 'SstBloqueioOperacional',
    tableName: 'sst_bloqueios_operacionais',
    area: 'analytics',
    label: 'Bloqueio operacional SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'politica_id', 'tipo_bloqueio',
      'criticidade', 'motivo', 'origem_tipo', 'origem_id', 'status', 'payload_json'
    ],
    updateFields: [
      'tipo_bloqueio', 'criticidade', 'motivo', 'status', 'resolvido_em',
      'resolvido_por', 'payload_json'
    ],
    requiredFields: ['motivo']
  },
  notificacoes: {
    modelName: 'SstNotificacao',
    tableName: 'sst_notificacoes',
    area: 'analytics',
    label: 'Notificacao SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'usuario_id', 'tipo_notificacao',
      'prioridade', 'criticidade', 'titulo', 'mensagem', 'status', 'agrupador',
      'origem_tipo', 'origem_id', 'payload_json'
    ],
    updateFields: ['status', 'lida_em', 'payload_json'],
    requiredFields: ['tipo_notificacao', 'titulo', 'mensagem']
  },
  pendencias: {
    modelName: 'SstPendenciaOperacional',
    tableName: 'sst_pendencias_operacionais',
    area: 'analytics',
    label: 'Pendencia operacional SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_pendencia', 'criticidade',
      'status', 'titulo', 'descricao', 'origem_tipo', 'origem_id',
      'responsavel_id', 'prazo_limite', 'payload_json'
    ],
    updateFields: [
      'criticidade', 'status', 'titulo', 'descricao', 'responsavel_id',
      'prazo_limite', 'resolvida_em', 'resolvida_por', 'payload_json'
    ],
    requiredFields: ['tipo_pendencia', 'titulo']
  },
  scores: {
    modelName: 'SstComplianceScore',
    tableName: 'sst_compliance_scores',
    area: 'analytics',
    label: 'Score de conformidade SST',
    listOrder: [['calculado_em', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'setor_id', 'escopo_tipo',
      'escopo_id', 'score', 'nivel', 'calculado_em', 'componentes_json',
      'pendencias_total', 'pendencias_criticas'
    ],
    updateFields: [
      'score', 'nivel', 'calculado_em', 'componentes_json',
      'pendencias_total', 'pendencias_criticas'
    ],
    requiredFields: ['escopo_tipo', 'score']
  },
  criticidades: {
    modelName: 'SstCriticidade',
    tableName: 'sst_criticidades',
    area: 'configuracoes',
    label: 'Criticidade SST',
    listOrder: [['updatedAt', 'DESC']],
    createFields: [
      'empresa_id', 'codigo', 'nome', 'nivel', 'tipo_alvo', 'peso',
      'ativo', 'parametros_json', 'observacoes'
    ],
    updateFields: [
      'empresa_id', 'codigo', 'nome', 'nivel', 'tipo_alvo', 'peso',
      'ativo', 'parametros_json', 'observacoes'
    ],
    requiredFields: ['codigo', 'nome', 'nivel']
  },
  workflows: {
    modelName: 'SstWorkflow',
    tableName: 'sst_workflows',
    area: 'configuracoes',
    label: 'Workflow SST',
    listOrder: [['updatedAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'codigo', 'nome', 'descricao', 'gatilho_evento',
      'escopo', 'prioridade', 'ativo', 'regras_json'
    ],
    updateFields: [
      'empresa_id', 'obra_id', 'codigo', 'nome', 'descricao', 'gatilho_evento',
      'escopo', 'prioridade', 'ativo', 'regras_json'
    ],
    requiredFields: ['codigo', 'nome', 'gatilho_evento']
  },
  workflow_acoes: {
    modelName: 'SstWorkflowAcao',
    tableName: 'sst_workflow_acoes',
    area: 'configuracoes',
    label: 'Acao de workflow SST',
    listOrder: [['workflow_id', 'ASC'], ['ordem', 'ASC']],
    createFields: [
      'workflow_id', 'codigo', 'nome', 'tipo_acao', 'ordem', 'ativo',
      'parametros_json'
    ],
    updateFields: [
      'codigo', 'nome', 'tipo_acao', 'ordem', 'ativo', 'parametros_json'
    ],
    requiredFields: ['workflow_id', 'codigo', 'nome', 'tipo_acao']
  },
  workflow_execucoes: {
    modelName: 'SstWorkflowExecucao',
    tableName: 'sst_workflow_execucoes',
    area: 'analytics',
    label: 'Execucao de workflow SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [],
    updateFields: ['status', 'resultado', 'finalizado_em', 'erro'],
    requiredFields: []
  },
  workflow_eventos: {
    modelName: 'SstWorkflowEvento',
    tableName: 'sst_workflow_eventos',
    area: 'analytics',
    label: 'Evento de workflow SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [],
    updateFields: ['status', 'mensagem', 'payload_json'],
    requiredFields: []
  },
  recomendacoes: {
    modelName: 'SstRecomendacaoOperacional',
    tableName: 'sst_recomendacoes_operacionais',
    area: 'analytics',
    label: 'Recomendacao operacional SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [
      'empresa_id', 'obra_id', 'colaborador_id', 'tipo_recomendacao',
      'criticidade', 'titulo', 'descricao', 'acao_sugerida', 'status',
      'origem_tipo', 'origem_id', 'payload_json'
    ],
    updateFields: [
      'criticidade', 'titulo', 'descricao', 'acao_sugerida', 'status',
      'payload_json'
    ],
    requiredFields: ['tipo_recomendacao', 'titulo', 'descricao']
  },
  documentos_ia: {
    modelName: 'SstDocumentoAnaliseIa',
    tableName: 'sst_documentos_analises_ia',
    area: 'documentos',
    label: 'Analise IA documental SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [
      'documento_id', 'empresa_id', 'obra_id', 'colaborador_id', 'tipo_documento',
      'provider', 'status', 'confianca', 'dados_extraidos_json',
      'inconsistencias_json', 'observacoes', 'processado_em'
    ],
    updateFields: [
      'provider', 'status', 'confianca', 'dados_extraidos_json',
      'inconsistencias_json', 'observacoes', 'processado_em'
    ],
    requiredFields: ['tipo_documento']
  },
  workflow_logs: {
    modelName: 'SstWorkflowLog',
    tableName: 'sst_workflow_logs',
    area: 'analytics',
    label: 'Log de workflow SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [],
    updateFields: [],
    requiredFields: []
  },
  automation_logs: {
    modelName: 'SstAutomationLog',
    tableName: 'sst_automation_logs',
    area: 'analytics',
    label: 'Log de automacao SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [],
    updateFields: [],
    requiredFields: []
  },
  blocking_logs: {
    modelName: 'SstBlockingLog',
    tableName: 'sst_blocking_logs',
    area: 'analytics',
    label: 'Log de bloqueio SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [],
    updateFields: [],
    requiredFields: []
  },
  integration_logs: {
    modelName: 'SstIntegrationLog',
    tableName: 'sst_integration_logs',
    area: 'analytics',
    label: 'Log de integracao SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [],
    updateFields: [],
    requiredFields: []
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
  },
  historicos: {
    modelName: 'SstHistorico',
    tableName: 'sst_historicos',
    area: 'analytics',
    label: 'Historico SST',
    listOrder: [['createdAt', 'DESC']],
    createFields: [],
    updateFields: [],
    requiredFields: []
  }
};

const SST_EVENT_TYPES = {
  ASO_VENCENDO: 'SST_ASO_VENCENDO',
  ASO_CADASTRADO: 'SST_ASO_CADASTRADO',
  ASO_VENCIDO: 'SST_ASO_VENCIDO',
  EXAME_VENCENDO: 'SST_EXAME_VENCENDO',
  EXAME_VENCIDO: 'SST_EXAME_VENCIDO',
  COLABORADOR_INAPTO: 'SST_COLABORADOR_INAPTO',
  EPI_ENTREGUE: 'SST_EPI_ENTREGUE',
  EPI_VENCENDO: 'SST_EPI_VENCENDO',
  EPI_VENCIDO: 'SST_EPI_VENCIDO',
  TREINAMENTO_VENCENDO: 'SST_TREINAMENTO_VENCENDO',
  TREINAMENTO_VENCIDO: 'SST_TREINAMENTO_VENCIDO',
  ACIDENTE_REGISTRADO: 'SST_ACIDENTE_REGISTRADO',
  ACIDENTE_GRAVE: 'SST_ACIDENTE_GRAVE',
  RISCO_CRITICO_IDENTIFICADO: 'SST_RISCO_CRITICO_IDENTIFICADO',
  EVENTO_ESOCIAL_REJEITADO: 'SST_EVENTO_ESOCIAL_REJEITADO',
  DOCUMENTO_VENCENDO: 'SST_DOCUMENTO_VENCENDO',
  DOCUMENTO_EXPIRADO: 'SST_DOCUMENTO_EXPIRADO',
  COLABORADOR_SEM_NR: 'SST_COLABORADOR_SEM_NR',
  COLABORADOR_SEM_EPI: 'SST_COLABORADOR_SEM_EPI',
  FUNCAO_ALTERADA: 'SST_FUNCAO_ALTERADA',
  REVISAO_CONFORMIDADE_OBRIGATORIA: 'SST_REVISAO_CONFORMIDADE_OBRIGATORIA',
  PENDENCIA_OPERACIONAL_GERADA: 'SST_PENDENCIA_OPERACIONAL_GERADA',
  BLOQUEIO_OPERACIONAL_GERADO: 'SST_BLOQUEIO_OPERACIONAL_GERADO',
  NOTIFICACAO_GERADA: 'SST_NOTIFICACAO_GERADA',
  WORKFLOW_EXECUTADO: 'SST_WORKFLOW_EXECUTADO',
  WORKFLOW_ACAO_EXECUTADA: 'SST_WORKFLOW_ACAO_EXECUTADA',
  AUTOMACAO_EXECUTADA: 'SST_AUTOMACAO_EXECUTADA',
  ADMISSAO_DETECTADA: 'SST_ADMISSAO_DETECTADA',
  DESLIGAMENTO_DETECTADO: 'SST_DESLIGAMENTO_DETECTADO',
  OBRA_ALTERADA: 'SST_OBRA_ALTERADA',
  RECOMENDACAO_GERADA: 'SST_RECOMENDACAO_GERADA',
  DOCUMENTO_ANALISADO_IA: 'SST_DOCUMENTO_ANALISADO_IA'
};

const SST_VALIDITY_ALERT_DAYS = 30;
const SST_CONFIG_KEY = 'SST_CONFIG';

const SST_FEATURE_FLAGS = {
  AUTO_REVISAO_FUNCAO: 'SST_AUTO_REVISAO_FUNCAO',
  BLOQUEIO_OPERACIONAL: 'SST_BLOQUEIO_OPERACIONAL',
  NOTIFICACOES_AUTOMATICAS: 'SST_NOTIFICACOES_AUTOMATICAS',
  IA_DOCUMENTAL: 'SST_IA_DOCUMENTAL',
  INTEGRACAO_RHDP: 'SST_INTEGRACAO_RHDP',
  INTEGRACAO_OBRAS: 'SST_INTEGRACAO_OBRAS',
  WORKFLOW_ENGINE: 'SST_WORKFLOW_ENGINE'
};

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
  epis_padrao: ['Capacete', 'Botina', 'Colete refletivo', 'Oculos de protecao', 'Protetor auricular', 'Luva'],
  treinamentos_padrao: ['NR10', 'NR18', 'NR33', 'NR35', 'INTEGRACAO_OBRA', 'BRIGADA', 'PRIMEIROS_SOCORROS'],
  regras_conformidade_padrao: ['REGRA_ASO_VALIDO', 'REGRA_NR35_OBRIGATORIA', 'REGRA_EPI_OBRIGATORIO', 'REGRA_EXPOSICAO_COMPATIVEL'],
  tipos_bloqueio: ['ALERTA', 'RESTRICAO', 'BLOQUEIO_CRITICO'],
  status_bloqueio: ['ABERTO', 'RESOLVIDO', 'IGNORADO'],
  criticidades_operacionais: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA', 'EMERGENCIAL'],
  status_pendencia_operacional: ['ABERTA', 'EM_TRATAMENTO', 'RESOLVIDA', 'IGNORADA'],
  status_recomendacao_operacional: ['ABERTA', 'EM_ANALISE', 'APLICADA', 'IGNORADA'],
  workflow_acoes_padrao: ['REVISAR_CONFORMIDADE', 'GERAR_PENDENCIAS', 'GERAR_NOTIFICACOES', 'AVALIAR_BLOQUEIOS', 'RECALCULAR_SCORE', 'GERAR_RECOMENDACOES'],
  workflow_status: ['PENDENTE', 'EM_EXECUCAO', 'CONCLUIDO', 'ERRO'],
  ia_documental_providers: ['OPENAI', 'CLAUDE', 'AWS_TEXTRACT', 'AZURE_OCR'],
  ia_documental_provider_ativo: 'NAO_CONFIGURADO',
  SST_AUTO_REVISAO_FUNCAO: false,
  SST_BLOQUEIO_OPERACIONAL: false,
  SST_NOTIFICACOES_AUTOMATICAS: false,
  SST_IA_DOCUMENTAL: false,
  SST_INTEGRACAO_RHDP: false,
  SST_INTEGRACAO_OBRAS: false,
  SST_WORKFLOW_ENGINE: false,
  status_programa: ['ATIVO', 'VENCIDO', 'SUBSTITUIDO'],
  eventos_esocial: ['S-2210', 'S-2220', 'S-2240'],
  status_esocial: ['PREPARADO', 'PENDENTE_DOCUMENTACAO', 'REJEITADO', 'PROCESSADO'],
  esocial_ambiente: 'NAO_CONFIGURADO',
  esocial_transmissao_habilitada: false,
  esocial_documentacao_oficial_validada: false,
  esocial_observacoes_tecnicas: 'Transmissao bloqueada ate anexar leiautes/XSDs oficiais dos eventos S-2210, S-2220 e S-2240.'
};

module.exports = {
  DEFAULT_SST_CONFIG,
  SST_FEATURE_FLAGS,
  SST_CONFIG_KEY,
  SST_EVENT_TYPES,
  SST_RESOURCE_CONFIG,
  SST_VALIDITY_ALERT_DAYS
};
