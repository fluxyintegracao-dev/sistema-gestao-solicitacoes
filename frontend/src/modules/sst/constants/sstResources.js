export const SST_RESOURCES = {
  riscos: {
    title: 'Riscos ocupacionais',
    subtitle: 'Riscos por empresa, obra, setor e funcao.',
    area: 'riscos',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'nome', label: 'Risco', required: true },
      { key: 'categoria', label: 'Categoria' },
      { key: 'severidade', label: 'Severidade', options: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] },
      { key: 'probabilidade', label: 'Probabilidade', options: ['BAIXA', 'MEDIA', 'ALTA'] },
      { key: 'descricao', label: 'Descricao', type: 'textarea' },
      { key: 'ativo', label: 'Ativo', type: 'checkbox' }
    ],
    columns: ['nome', 'categoria', 'severidade', 'probabilidade', 'obra.nome']
  },
  agentes: {
    title: 'Agentes nocivos',
    subtitle: 'Agentes, tecnica de avaliacao e limite de tolerancia.',
    area: 'agentes',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'tipo_agente', label: 'Tipo de agente', required: true },
      { key: 'nome', label: 'Agente', required: true },
      { key: 'intensidade', label: 'Intensidade' },
      { key: 'unidade', label: 'Unidade' },
      { key: 'tecnica_avaliacao', label: 'Tecnica de avaliacao' },
      { key: 'limite_tolerancia', label: 'Limite de tolerancia' },
      { key: 'ativo', label: 'Ativo', type: 'checkbox' }
    ],
    columns: ['nome', 'tipo_agente', 'intensidade', 'limite_tolerancia']
  },
  aso: {
    title: 'ASO',
    subtitle: 'Aptidao, restricoes, validade e medico responsavel.',
    area: 'aso',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'colaborador_id', label: 'Colaborador', type: 'selectRef', ref: 'colaboradores', required: true },
      { key: 'tipo_exame', label: 'Tipo de exame', options: ['ADMISSIONAL', 'PERIODICO', 'RETORNO', 'MUDANCA_FUNCAO', 'DEMISSIONAL'], required: true },
      { key: 'apto', label: 'Apto', type: 'checkbox' },
      { key: 'data_exame', label: 'Data do exame', type: 'date', required: true },
      { key: 'validade', label: 'Validade', type: 'date' },
      { key: 'medico', label: 'Medico' },
      { key: 'crm', label: 'CRM' },
      { key: 'restricoes', label: 'Restricoes', type: 'textarea' }
    ],
    columns: ['colaborador.nome', 'tipo_exame', 'apto', 'data_exame', 'validade']
  },
  exames: {
    title: 'Exames ocupacionais',
    subtitle: 'Controle de exames por colaborador e validade.',
    area: 'exames',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'colaborador_id', label: 'Colaborador', type: 'selectRef', ref: 'colaboradores', required: true },
      { key: 'tipo_exame', label: 'Tipo', options: ['ADMISSIONAL', 'PERIODICO', 'RETORNO', 'MUDANCA_FUNCAO', 'DEMISSIONAL'], required: true },
      { key: 'nome_exame', label: 'Exame', required: true },
      { key: 'data_exame', label: 'Data', type: 'date' },
      { key: 'validade', label: 'Validade', type: 'date' },
      { key: 'resultado', label: 'Resultado' },
      { key: 'status', label: 'Status', options: ['PENDENTE', 'VALIDO', 'VENCIDO', 'DISPENSADO'] }
    ],
    columns: ['colaborador.nome', 'tipo_exame', 'nome_exame', 'validade', 'status']
  },
  epi: {
    title: 'Entregas de EPI',
    subtitle: 'Registro de entrega, CA, validade e comprovantes.',
    area: 'epi',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'colaborador_id', label: 'Colaborador', type: 'selectRef', ref: 'colaboradores', required: true },
      { key: 'epi_nome', label: 'EPI', required: true },
      { key: 'ca', label: 'CA' },
      { key: 'quantidade', label: 'Quantidade', type: 'number' },
      { key: 'entrega_em', label: 'Entrega', type: 'date', required: true },
      { key: 'validade', label: 'Validade', type: 'date' },
      { key: 'status', label: 'Status', options: ['ENTREGUE', 'SUBSTITUIDO', 'DEVOLVIDO'] }
    ],
    columns: ['colaborador.nome', 'epi_nome', 'ca', 'entrega_em', 'validade']
  },
  treinamentos: {
    title: 'Treinamentos SST',
    subtitle: 'NRs, certificados, instrutor, carga horaria e validade.',
    area: 'treinamentos',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'colaborador_id', label: 'Colaborador', type: 'selectRef', ref: 'colaboradores', required: true },
      { key: 'codigo', label: 'Codigo/NR' },
      { key: 'nome', label: 'Treinamento', required: true },
      { key: 'data_inicio', label: 'Inicio', type: 'date' },
      { key: 'data_fim', label: 'Fim', type: 'date' },
      { key: 'validade', label: 'Validade', type: 'date' },
      { key: 'instrutor', label: 'Instrutor' },
      { key: 'carga_horaria', label: 'Carga horaria', type: 'number' }
    ],
    columns: ['colaborador.nome', 'codigo', 'nome', 'validade', 'instrutor']
  },
  acidentes: {
    title: 'Acidentes e incidentes',
    subtitle: 'Registro operacional de ocorrencias, afastamento e CAT.',
    area: 'acidentes',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'colaborador_id', label: 'Colaborador', type: 'selectRef', ref: 'colaboradores' },
      { key: 'tipo', label: 'Tipo', options: ['ACIDENTE', 'INCIDENTE', 'QUASE_ACIDENTE'], required: true },
      { key: 'gravidade', label: 'Gravidade', options: ['LEVE', 'MODERADA', 'GRAVE', 'FATAL'], required: true },
      { key: 'local', label: 'Local' },
      { key: 'data_ocorrencia', label: 'Data', type: 'date', required: true },
      { key: 'afastamento', label: 'Afastamento', type: 'checkbox' },
      { key: 'cat_emitida', label: 'CAT emitida', type: 'checkbox' },
      { key: 'descricao', label: 'Descricao', type: 'textarea', required: true }
    ],
    columns: ['data_ocorrencia', 'tipo', 'gravidade', 'colaborador.nome', 'cat_emitida']
  },
  documentos: {
    title: 'Documentos SST',
    subtitle: 'Central documental com validade e links privados.',
    area: 'documentos',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'colaborador_id', label: 'Colaborador', type: 'selectRef', ref: 'colaboradores' },
      { key: 'tipo_documento', label: 'Tipo', options: ['ASO', 'CAT', 'PGR', 'PCMSO', 'CERTIFICADO', 'LAUDO', 'TREINAMENTO', 'OUTRO'], required: true },
      { key: 'titulo', label: 'Titulo', required: true },
      { key: 'validade', label: 'Validade', type: 'date' },
      { key: 'status', label: 'Status', options: ['ENVIADO', 'CONFERIDO', 'REJEITADO', 'VENCIDO'] },
      { key: 'observacoes', label: 'Observacoes', type: 'textarea' }
    ],
    columns: ['tipo_documento', 'titulo', 'validade', 'status']
  },
  pgr: {
    title: 'PGR',
    subtitle: 'Programa de Gerenciamento de Riscos.',
    area: 'pgr',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'responsavel', label: 'Responsavel', required: true },
      { key: 'vigencia_inicio', label: 'Inicio', type: 'date' },
      { key: 'vigencia_fim', label: 'Fim', type: 'date' },
      { key: 'status', label: 'Status', options: ['ATIVO', 'VENCIDO', 'SUBSTITUIDO'] }
    ],
    columns: ['responsavel', 'vigencia_inicio', 'vigencia_fim', 'status']
  },
  pcmso: {
    title: 'PCMSO',
    subtitle: 'Programa de Controle Medico de Saude Ocupacional.',
    area: 'pcmso',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'medico_responsavel', label: 'Medico responsavel', required: true },
      { key: 'crm', label: 'CRM' },
      { key: 'vigencia_inicio', label: 'Inicio', type: 'date' },
      { key: 'vigencia_fim', label: 'Fim', type: 'date' },
      { key: 'status', label: 'Status', options: ['ATIVO', 'VENCIDO', 'SUBSTITUIDO'] }
    ],
    columns: ['medico_responsavel', 'crm', 'vigencia_inicio', 'vigencia_fim', 'status']
  },
  esocial: {
    title: 'Eventos eSocial SST',
    subtitle: 'Preparacao futura dos eventos S-2210, S-2220 e S-2240.',
    area: 'esocial',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas', required: true },
      { key: 'colaborador_id', label: 'Colaborador', type: 'selectRef', ref: 'colaboradores' },
      { key: 'tipo_evento', label: 'Evento', options: ['S-2210', 'S-2220', 'S-2240'], required: true },
      { key: 'status', label: 'Status', options: ['PREPARADO', 'PENDENTE_DOCUMENTACAO', 'REJEITADO', 'PROCESSADO'] },
      { key: 'protocolo', label: 'Protocolo' },
      { key: 'recibo', label: 'Recibo' },
      { key: 'observacoes', label: 'Observacoes', type: 'textarea' }
    ],
    columns: ['tipo_evento', 'status', 'colaborador.nome', 'protocolo', 'recibo']
  },
  eventos: {
    title: 'Eventos operacionais SST',
    subtitle: 'Eventos gerados pelo backend para alertas, rastreabilidade, dashboards e automacoes futuras.',
    area: 'analytics',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'selectRef', ref: 'empresas' },
      { key: 'obra_id', label: 'Obra/Centro', type: 'selectRef', ref: 'obras' },
      { key: 'colaborador_id', label: 'Colaborador', type: 'selectRef', ref: 'colaboradores' },
      { key: 'tipo_evento', label: 'Tipo de evento', required: true },
      { key: 'severidade', label: 'Severidade', options: ['INFO', 'ALERTA', 'CRITICA'] },
      { key: 'status', label: 'Status', options: ['ABERTO', 'TRATADO', 'IGNORADO'] },
      { key: 'mensagem', label: 'Mensagem', type: 'textarea', required: true }
    ],
    columns: ['createdAt', 'tipo_evento', 'severidade', 'status', 'empresa.nome', 'obra.nome', 'colaborador.nome', 'mensagem']
  }
};

export const SST_NAV = [
  ['riscos', 'Riscos'],
  ['agentes', 'Agentes'],
  ['pgr', 'PGR'],
  ['pcmso', 'PCMSO'],
  ['aso', 'ASO'],
  ['exames', 'Exames'],
  ['epi', 'EPI'],
  ['treinamentos', 'Treinamentos'],
  ['acidentes', 'Acidentes'],
  ['documentos', 'Documentos'],
  ['esocial', 'eSocial'],
  ['eventos', 'Eventos']
];
