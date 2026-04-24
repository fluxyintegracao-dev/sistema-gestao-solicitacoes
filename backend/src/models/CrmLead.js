module.exports = (sequelize, DataTypes) => {
  const CrmLead = sequelize.define('CrmLead', {
    external_source_id: { type: DataTypes.STRING(120), allowNull: true },
    source_type: {
      type: DataTypes.ENUM('META_ADS', 'GOOGLE_ADS', 'MANUAL', 'SITE', 'INDICACAO', 'OUTRO'),
      allowNull: false,
      defaultValue: 'MANUAL'
    },
    source_name: { type: DataTypes.STRING(120), allowNull: true },
    source_detail: { type: DataTypes.TEXT, allowNull: true },
    campaign_name: { type: DataTypes.STRING(120), allowNull: true },
    adset_name: { type: DataTypes.STRING(120), allowNull: true },
    ad_name: { type: DataTypes.STRING(120), allowNull: true },
    form_name: { type: DataTypes.STRING(120), allowNull: true },
    landing_page_url: { type: DataTypes.TEXT, allowNull: true },
    utm_source: { type: DataTypes.STRING(120), allowNull: true },
    utm_medium: { type: DataTypes.STRING(120), allowNull: true },
    utm_campaign: { type: DataTypes.STRING(120), allowNull: true },
    utm_content: { type: DataTypes.STRING(120), allowNull: true },
    utm_term: { type: DataTypes.STRING(120), allowNull: true },
    nome: { type: DataTypes.STRING(160), allowNull: false },
    telefone: { type: DataTypes.STRING(30), allowNull: true },
    email: { type: DataTypes.STRING(120), allowNull: true },
    documento: { type: DataTypes.STRING(30), allowNull: true },
    cidade: { type: DataTypes.STRING(120), allowNull: true },
    estado: { type: DataTypes.STRING(2), allowNull: true },
    empreendimento_interesse: { type: DataTypes.STRING(160), allowNull: true },
    produto_interesse: { type: DataTypes.STRING(160), allowNull: true },
    faixa_valor: { type: DataTypes.STRING(80), allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    tags: { type: DataTypes.JSON, allowNull: true },
    score: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    temperatura: {
      type: DataTypes.ENUM('FRIO', 'MORNO', 'QUENTE'),
      allowNull: false,
      defaultValue: 'FRIO'
    },
    lifecycle_status: {
      type: DataTypes.ENUM('NOVO', 'CONTATO', 'QUALIFICADO', 'OPORTUNIDADE', 'CONVERTIDO', 'PERDIDO', 'ARQUIVADO'),
      allowNull: false,
      defaultValue: 'NOVO'
    },
    pipeline_id: { type: DataTypes.INTEGER, allowNull: true },
    pipeline_stage_id: { type: DataTypes.INTEGER, allowNull: true },
    assigned_user_id: { type: DataTypes.INTEGER, allowNull: true },
    owner_type: {
      type: DataTypes.ENUM('INDIVIDUAL', 'SHARED', 'POOL'),
      allowNull: false,
      defaultValue: 'INDIVIDUAL'
    },
    primeiro_contato_at: { type: DataTypes.DATE, allowNull: true },
    ultima_interacao_at: { type: DataTypes.DATE, allowNull: true },
    proximo_followup_at: { type: DataTypes.DATE, allowNull: true },
    convertido_at: { type: DataTypes.DATE, allowNull: true },
    archived_at: { type: DataTypes.DATE, allowNull: true },
    motivo_perda_id: { type: DataTypes.INTEGER, allowNull: true },
    motivo_perda_obs: { type: DataTypes.TEXT, allowNull: true },
    criado_por: { type: DataTypes.INTEGER, allowNull: true },
    atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
  }, { tableName: 'crm_leads' });

  return CrmLead;
};
