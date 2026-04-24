const Sequelize = require('sequelize');
const sequelize = require('../database');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

/* =====================
   MODELS
===================== */
db.User = require('./User')(sequelize, Sequelize);
db.Obra = require('./Obra')(sequelize, Sequelize);
db.UsuarioObra = require('./UsuarioObra')(sequelize, Sequelize);
db.UsuarioSetor = require('./UsuarioSetor')(sequelize, Sequelize);
db.Setor = require('./Setor')(sequelize, Sequelize);
db.Parceiro = require('./Parceiro')(sequelize, Sequelize);
db.ParceiroCategoria = require('./ParceiroCategoria')(sequelize, Sequelize);
db.ParceiroCategoriaItem = require('./ParceiroCategoriaItem')(sequelize, Sequelize);
db.Solicitacao = require('./Solicitacao')(sequelize, Sequelize);
db.SolicitacaoPagamento = require('./SolicitacaoPagamento')(sequelize, Sequelize);
db.PrioridadeLote = require('./PrioridadeLote')(sequelize, Sequelize);
db.PrioridadeLoteItem = require('./PrioridadeLoteItem')(sequelize, Sequelize);
db.StatusArea = require('./StatusArea')(sequelize, Sequelize);
db.Historico = require('./Historico')(sequelize, Sequelize);
db.Anexo = require('./Anexo')(sequelize, Sequelize);
db.MensagemSetor = require('./MensagemSetor')(sequelize, Sequelize);
db.TipoSolicitacao = require('./TipoSolicitacao')(sequelize, Sequelize);
db.EtapaSetor = require('./EtapaSetor')(sequelize, Sequelize);
db.Cargo = require('./Cargo')(sequelize, Sequelize);
db.Comprovante = require('./Comprovante')(sequelize, Sequelize);
db.Contrato = require('./Contrato')(sequelize, Sequelize);
db.ContratoAnexo = require('./ContratoAnexo')(sequelize, Sequelize);
db.Empreendimento = require('./Empreendimento')(sequelize, Sequelize);
db.UnidadeComercial = require('./UnidadeComercial')(sequelize, Sequelize);
db.TabelaPrecoComercial = require('./TabelaPrecoComercial')(sequelize, Sequelize);
db.TabelaPrecoComercialItem = require('./TabelaPrecoComercialItem')(sequelize, Sequelize);
db.ContratoComercial = require('./ContratoComercial')(sequelize, Sequelize);
db.ContratoComercialParcela = require('./ContratoComercialParcela')(sequelize, Sequelize);
db.ContratoComercialEvento = require('./ContratoComercialEvento')(sequelize, Sequelize);
db.ProvisaoCategoriaMacro = require('./ProvisaoCategoriaMacro')(sequelize, Sequelize);
db.ProvisaoFinanceira = require('./ProvisaoFinanceira')(sequelize, Sequelize);
db.ProvisaoFinanceiraHistorico = require('./ProvisaoFinanceiraHistorico')(sequelize, Sequelize);
db.ProvisaoFinanceiraAnexo = require('./ProvisaoFinanceiraAnexo')(sequelize, Sequelize);
db.ProvisaoFinanceiraSequencia = require('./ProvisaoFinanceiraSequencia')(sequelize, Sequelize);
db.RhEmpresaGrupo = require('./RhEmpresaGrupo')(sequelize, Sequelize);
db.RhColaborador = require('./RhColaborador')(sequelize, Sequelize);
db.RhColaboradorPagamento = require('./RhColaboradorPagamento')(sequelize, Sequelize);
db.RhDocumentoTipo = require('./RhDocumentoTipo')(sequelize, Sequelize);
db.RhDocumento = require('./RhDocumento')(sequelize, Sequelize);
db.RhImportacao = require('./RhImportacao')(sequelize, Sequelize);
db.RhImportacaoLinha = require('./RhImportacaoLinha')(sequelize, Sequelize);
db.RhApuracao = require('./RhApuracao')(sequelize, Sequelize);
db.RhApuracaoEvento = require('./RhApuracaoEvento')(sequelize, Sequelize);
db.RhFechamento = require('./RhFechamento')(sequelize, Sequelize);
db.RhFechamentoTitulo = require('./RhFechamentoTitulo')(sequelize, Sequelize);
db.IntegracaoSiengeConfig = require('./IntegracaoSiengeConfig')(sequelize, Sequelize);
db.IntegracaoSiengeFila = require('./IntegracaoSiengeFila')(sequelize, Sequelize);
db.IntegracaoSiengeLog = require('./IntegracaoSiengeLog')(sequelize, Sequelize);
db.IntegracaoSiengeMapeamento = require('./IntegracaoSiengeMapeamento')(sequelize, Sequelize);
db.TipoMacroContrato = require('./TipoMacroContrato')(sequelize, Sequelize);
db.TipoSubContrato = require('./TipoSubContrato')(sequelize, Sequelize);
db.SolicitacaoVisibilidadeUsuario =
  require('./SolicitacaoVisibilidadeUsuario')(sequelize, Sequelize);
db.SetorPermissao = require('./SetorPermissao')(sequelize, Sequelize);
db.Notificacao = require('./Notificacao')(sequelize, Sequelize);
db.NotificacaoDestinatario = require('./NotificacaoDestinatario')(sequelize, Sequelize);
db.ConfiguracaoSistema = require('./ConfiguracaoSistema')(sequelize, Sequelize);
db.LogExclusao = require('./LogExclusao')(sequelize, Sequelize);
db.ConversaInterna = require('./ConversaInterna')(sequelize, Sequelize);
db.ConversaInternaMensagem = require('./ConversaInternaMensagem')(sequelize, Sequelize);
db.ConversaInternaAnexo = require('./ConversaInternaAnexo')(sequelize, Sequelize);
db.ConversaInternaParticipante = require('./ConversaInternaParticipante')(sequelize, Sequelize);
db.ConversaInternaArquivoUsuario = require('./ConversaInternaArquivoUsuario')(sequelize, Sequelize);
db.ArquivoModelo = require('./ArquivoModelo')(sequelize, Sequelize);
db.SecurityEventLog = require('./SecurityEventLog')(sequelize, Sequelize);
db.ContaBancaria = require('./ContaBancaria')(sequelize, Sequelize);
db.CategoriaFinanceira = require('./CategoriaFinanceira')(sequelize, Sequelize);
db.TituloFinanceiro = require('./TituloFinanceiro')(sequelize, Sequelize);
db.MovimentoFinanceiro = require('./MovimentoFinanceiro')(sequelize, Sequelize);
db.ConciliacaoBancaria = require('./ConciliacaoBancaria')(sequelize, Sequelize);
db.ConciliacaoBancariaImportacao = require('./ConciliacaoBancariaImportacao')(sequelize, Sequelize);
db.Unidade = require('./Unidade')(sequelize, Sequelize);
db.Categoria = require('./Categoria')(sequelize, Sequelize);
db.Insumo = require('./Insumo')(sequelize, Sequelize);
db.Apropriacao = require('./Apropriacao')(sequelize, Sequelize);
db.SolicitacaoCompra = require('./SolicitacaoCompra')(sequelize, Sequelize);
db.SolicitacaoCompraItem = require('./SolicitacaoCompraItem')(sequelize, Sequelize);
db.SolicitacaoCompraItemApropriacao = require('./SolicitacaoCompraItemApropriacao')(sequelize, Sequelize);
db.SolicitacaoCompraItemManual = require('./SolicitacaoCompraItemManual')(sequelize, Sequelize);
db.SolicitacaoCompraItemManualApropriacao = require('./SolicitacaoCompraItemManualApropriacao')(sequelize, Sequelize);
db.FornecedorCompra = require('./FornecedorCompra')(sequelize, Sequelize);
db.SolicitacaoCompraFornecedor = require('./SolicitacaoCompraFornecedor')(sequelize, Sequelize);
db.SolicitacaoCompraRespostaItem = require('./SolicitacaoCompraRespostaItem')(sequelize, Sequelize);
db.SolicitacaoCompraLog = require('./SolicitacaoCompraLog')(sequelize, Sequelize);
db.PedidoCompra = require('./PedidoCompra')(sequelize, Sequelize);
db.PedidoCompraItem = require('./PedidoCompraItem')(sequelize, Sequelize);
db.PedidoCompraItemLog = require('./PedidoCompraItemLog')(sequelize, Sequelize);

/* =====================
   CRM
===================== */
db.CrmConfig = require('./CrmConfig')(sequelize, Sequelize);
db.CrmPipeline = require('./CrmPipeline')(sequelize, Sequelize);
db.CrmPipelineStage = require('./CrmPipelineStage')(sequelize, Sequelize);
db.CrmLossReason = require('./CrmLossReason')(sequelize, Sequelize);
db.CrmLead = require('./CrmLead')(sequelize, Sequelize);
db.CrmAuditLog = require('./CrmAuditLog')(sequelize, Sequelize);
db.CrmInteraction = require('./CrmInteraction')(sequelize, Sequelize);
db.CrmTask = require('./CrmTask')(sequelize, Sequelize);
db.CrmRolloutPhase = require('./CrmRolloutPhase')(sequelize, Sequelize);
db.CrmChannel = require('./CrmChannel')(sequelize, Sequelize);
db.CrmPhoneAsset = require('./CrmPhoneAsset')(sequelize, Sequelize);
db.CrmIntegrationMetaEvent = require('./CrmIntegrationMetaEvent')(sequelize, Sequelize);
db.CrmIntegrationGoogleEvent = require('./CrmIntegrationGoogleEvent')(sequelize, Sequelize);
db.CrmConversation = require('./CrmConversation')(sequelize, Sequelize);
db.CrmMessage = require('./CrmMessage')(sequelize, Sequelize);
db.CrmMessageTemplate = require('./CrmMessageTemplate')(sequelize, Sequelize);
db.CrmConversationParticipant = require('./CrmConversationParticipant')(sequelize, Sequelize);
db.CrmAutomationRule = require('./CrmAutomationRule')(sequelize, Sequelize);
db.CrmAutomationExecution = require('./CrmAutomationExecution')(sequelize, Sequelize);



/* =====================
   RELACIONAMENTOS
===================== */

/* ===== Solicitação x Comprovantes ===== */
db.Solicitacao.hasMany(db.Comprovante, {
  foreignKey: 'solicitacao_id',
  as: 'comprovantes'
});

db.Comprovante.belongsTo(db.Solicitacao, {
  foreignKey: 'solicitacao_id',
  as: 'solicitacao'
});

db.Comprovante.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});
/* ===== Usuário x Obra (Vínculos) ===== */
db.User.hasMany(db.UsuarioObra, {
  foreignKey: 'user_id',
  as: 'vinculos'
});

db.UsuarioObra.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'usuario'
});

db.Obra.hasMany(db.UsuarioObra, {
  foreignKey: 'obra_id',
  as: 'usuarios'
});

db.UsuarioObra.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.User.hasMany(db.UsuarioSetor, {
  foreignKey: 'user_id',
  as: 'setoresVinculos'
});

db.UsuarioSetor.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'usuario'
});

db.Setor.hasMany(db.UsuarioSetor, {
  foreignKey: 'setor_id',
  as: 'usuariosVinculos'
});

db.UsuarioSetor.belongsTo(db.Setor, {
  foreignKey: 'setor_id',
  as: 'setor'
});

/* ===== Obra x Solicitação ===== */
db.Obra.hasMany(db.Solicitacao, {
  foreignKey: 'obra_id',
  as: 'solicitacoes'
});

db.Solicitacao.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.Apropriacao.hasMany(db.Solicitacao, {
  foreignKey: 'apropriacao_id',
  as: 'solicitacoes'
});

db.Solicitacao.belongsTo(db.Apropriacao, {
  foreignKey: 'apropriacao_id',
  as: 'apropriacao'
});

db.Parceiro.hasMany(db.Solicitacao, {
  foreignKey: 'parceiro_id',
  as: 'solicitacoes'
});

db.Solicitacao.belongsTo(db.Parceiro, {
  foreignKey: 'parceiro_id',
  as: 'parceiro'
});

db.Parceiro.belongsToMany(db.ParceiroCategoria, {
  through: db.ParceiroCategoriaItem,
  foreignKey: 'parceiro_id',
  otherKey: 'parceiro_categoria_id',
  uniqueKey: 'ux_parceiro_categoria_itens',
  as: 'categorias'
});

db.ParceiroCategoria.belongsToMany(db.Parceiro, {
  through: db.ParceiroCategoriaItem,
  foreignKey: 'parceiro_categoria_id',
  otherKey: 'parceiro_id',
  uniqueKey: 'ux_parceiro_categoria_itens',
  as: 'parceiros'
});

db.ParceiroCategoriaItem.belongsTo(db.Parceiro, {
  foreignKey: 'parceiro_id',
  as: 'parceiro'
});

db.ParceiroCategoriaItem.belongsTo(db.ParceiroCategoria, {
  foreignKey: 'parceiro_categoria_id',
  as: 'categoria'
});

/* ===== Usuário x Solicitação ===== */
db.User.hasMany(db.Solicitacao, {
  foreignKey: 'criado_por',
  as: 'solicitacoes'
});

db.Solicitacao.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criador'
});

db.Solicitacao.hasMany(db.SolicitacaoPagamento, {
  foreignKey: 'solicitacao_id',
  as: 'pagamentos'
});

db.SolicitacaoPagamento.belongsTo(db.Solicitacao, {
  foreignKey: 'solicitacao_id',
  as: 'solicitacao'
});

db.User.hasMany(db.SolicitacaoPagamento, {
  foreignKey: 'created_by',
  as: 'pagamentosSolicitacoesCriados'
});

db.SolicitacaoPagamento.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'criadoPor'
});

db.PrioridadeLote.hasMany(db.PrioridadeLoteItem, {
  foreignKey: 'lote_id',
  as: 'itens',
  onDelete: 'RESTRICT'
});

db.PrioridadeLoteItem.belongsTo(db.PrioridadeLote, {
  foreignKey: 'lote_id',
  as: 'lote'
});

db.Solicitacao.hasMany(db.PrioridadeLoteItem, {
  foreignKey: 'solicitacao_id',
  as: 'itensPrioridadeDiretoria'
});

db.PrioridadeLoteItem.belongsTo(db.Solicitacao, {
  foreignKey: 'solicitacao_id',
  as: 'solicitacao'
});

db.User.hasMany(db.PrioridadeLote, {
  foreignKey: 'solicitado_por',
  as: 'prioridadeLotesSolicitados'
});

db.PrioridadeLote.belongsTo(db.User, {
  foreignKey: 'solicitado_por',
  as: 'solicitadoPor'
});

db.User.hasMany(db.PrioridadeLote, {
  foreignKey: 'finalizado_por',
  as: 'prioridadeLotesFinalizados'
});

db.PrioridadeLote.belongsTo(db.User, {
  foreignKey: 'finalizado_por',
  as: 'finalizadoPor'
});

db.User.hasMany(db.PrioridadeLoteItem, {
  foreignKey: 'autorizado_por',
  as: 'prioridadeItensAutorizados'
});

db.PrioridadeLoteItem.belongsTo(db.User, {
  foreignKey: 'autorizado_por',
  as: 'autorizadoPor'
});

/* ===== Solicitação x Status / Histórico / Anexos / Mensagens ===== */
db.Solicitacao.hasMany(db.StatusArea, {
  foreignKey: 'solicitacao_id',
  as: 'statusAreas'
});

db.StatusArea.belongsTo(db.Solicitacao, {
  foreignKey: 'solicitacao_id',
  as: 'solicitacao'
});

db.Solicitacao.hasMany(db.Historico, {
  foreignKey: 'solicitacao_id',
  as: 'historicos'
});

db.Historico.belongsTo(db.Solicitacao, {
  foreignKey: 'solicitacao_id',
  as: 'solicitacao'
});

db.Solicitacao.hasMany(db.Anexo, {
  foreignKey: 'solicitacao_id',
  as: 'anexos'
});

db.Anexo.belongsTo(db.Solicitacao, {
  foreignKey: 'solicitacao_id',
  as: 'solicitacao'
});

db.Solicitacao.hasMany(db.MensagemSetor, {
  foreignKey: 'solicitacao_id',
  as: 'mensagens'
});

db.MensagemSetor.belongsTo(db.Solicitacao, {
  foreignKey: 'solicitacao_id',
  as: 'solicitacao'
});

/* ===== Usuário x Cargo ===== */
db.Cargo.hasMany(db.User, {
  foreignKey: 'cargo_id',
  as: 'usuarios'
});

db.User.belongsTo(db.Cargo, {
  foreignKey: 'cargo_id',
  as: 'cargoInfo'
});

/**
 * Tipo Solicitação
 */
db.TipoSolicitacao.hasMany(db.Solicitacao, {
  foreignKey: 'tipo_solicitacao_id',
  as: 'solicitacoes'
});

db.Solicitacao.belongsTo(db.TipoSolicitacao, {
  foreignKey: 'tipo_solicitacao_id',
  as: 'tipo'
});

db.TipoSolicitacao.hasMany(db.Solicitacao, {
  foreignKey: 'tipo_macro_id',
  as: 'solicitacoesMacro'
});

db.Solicitacao.belongsTo(db.TipoSolicitacao, {
  foreignKey: 'tipo_macro_id',
  as: 'tipoMacroSolicitacao'
});

db.TipoSubContrato.hasMany(db.Solicitacao, {
  foreignKey: 'tipo_sub_id',
  as: 'solicitacoes'
});

db.Solicitacao.belongsTo(db.TipoSubContrato, {
  foreignKey: 'tipo_sub_id',
  as: 'tipoSubSolicitacao'
});

// =====================
// CONTRATOS
// =====================
db.Obra.hasMany(db.Contrato, {
  foreignKey: 'obra_id',
  as: 'contratos'
});

db.Contrato.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.TipoSolicitacao.hasMany(db.TipoSubContrato, {
  foreignKey: 'tipo_macro_id',
  as: 'subtipos'
});

db.TipoSubContrato.belongsTo(db.TipoSolicitacao, {
  foreignKey: 'tipo_macro_id',
  as: 'macro'
});

db.TipoSolicitacao.hasMany(db.Contrato, {
  foreignKey: 'tipo_macro_id',
  as: 'contratos'
});

db.Contrato.belongsTo(db.TipoSolicitacao, {
  foreignKey: 'tipo_macro_id',
  as: 'tipoMacro'
});

db.TipoSubContrato.hasMany(db.Contrato, {
  foreignKey: 'tipo_sub_id',
  as: 'contratos'
});

db.Contrato.belongsTo(db.TipoSubContrato, {
  foreignKey: 'tipo_sub_id',
  as: 'tipoSub'
});

db.Contrato.hasMany(db.Solicitacao, {
  foreignKey: 'contrato_id',
  as: 'solicitacoes'
});

db.Solicitacao.belongsTo(db.Contrato, {
  foreignKey: 'contrato_id',
  as: 'contrato'
});

db.Contrato.hasMany(db.ContratoAnexo, {
  foreignKey: 'contrato_id',
  as: 'anexos'
});

db.ContratoAnexo.belongsTo(db.Contrato, {
  foreignKey: 'contrato_id',
  as: 'contrato'
});

db.Obra.hasMany(db.Empreendimento, {
  foreignKey: 'obra_id',
  as: 'empreendimentos'
});

db.Empreendimento.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.Empreendimento.hasMany(db.UnidadeComercial, {
  foreignKey: 'empreendimento_id',
  as: 'unidadesComerciais'
});

db.UnidadeComercial.belongsTo(db.Empreendimento, {
  foreignKey: 'empreendimento_id',
  as: 'empreendimento'
});

db.Parceiro.hasMany(db.UnidadeComercial, {
  foreignKey: 'parceiro_reserva_id',
  as: 'unidadesReservadas'
});

db.UnidadeComercial.belongsTo(db.Parceiro, {
  foreignKey: 'parceiro_reserva_id',
  as: 'parceiroReserva'
});

db.Empreendimento.hasMany(db.TabelaPrecoComercial, {
  foreignKey: 'empreendimento_id',
  as: 'tabelasPreco'
});

db.TabelaPrecoComercial.belongsTo(db.Empreendimento, {
  foreignKey: 'empreendimento_id',
  as: 'empreendimento'
});

db.User.hasMany(db.TabelaPrecoComercial, {
  foreignKey: 'criado_por',
  as: 'tabelasPrecoCriadas'
});

db.TabelaPrecoComercial.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.TabelaPrecoComercial, {
  foreignKey: 'atualizado_por',
  as: 'tabelasPrecoAtualizadas'
});

db.TabelaPrecoComercial.belongsTo(db.User, {
  foreignKey: 'atualizado_por',
  as: 'atualizadoPor'
});

db.TabelaPrecoComercial.hasMany(db.TabelaPrecoComercialItem, {
  foreignKey: 'tabela_preco_comercial_id',
  as: 'itens',
  onDelete: 'CASCADE'
});

db.TabelaPrecoComercialItem.belongsTo(db.TabelaPrecoComercial, {
  foreignKey: 'tabela_preco_comercial_id',
  as: 'tabelaPreco'
});

db.UnidadeComercial.hasMany(db.TabelaPrecoComercialItem, {
  foreignKey: 'unidade_comercial_id',
  as: 'itensTabelaPreco'
});

db.TabelaPrecoComercialItem.belongsTo(db.UnidadeComercial, {
  foreignKey: 'unidade_comercial_id',
  as: 'unidadeComercial'
});

db.Empreendimento.hasMany(db.ContratoComercial, {
  foreignKey: 'empreendimento_id',
  as: 'contratosComerciais'
});

db.ContratoComercial.belongsTo(db.Empreendimento, {
  foreignKey: 'empreendimento_id',
  as: 'empreendimento'
});

db.UnidadeComercial.hasMany(db.ContratoComercial, {
  foreignKey: 'unidade_comercial_id',
  as: 'contratosComerciais'
});

db.ContratoComercial.belongsTo(db.UnidadeComercial, {
  foreignKey: 'unidade_comercial_id',
  as: 'unidadeComercial'
});

db.Parceiro.hasMany(db.ContratoComercial, {
  foreignKey: 'parceiro_id',
  as: 'contratosComerciais'
});

db.ContratoComercial.belongsTo(db.Parceiro, {
  foreignKey: 'parceiro_id',
  as: 'cliente'
});

db.Parceiro.hasMany(db.ContratoComercial, {
  foreignKey: 'corretor_parceiro_id',
  as: 'contratosComerciaisCorretor'
});

db.ContratoComercial.belongsTo(db.Parceiro, {
  foreignKey: 'corretor_parceiro_id',
  as: 'corretorParceiro'
});

db.Obra.hasMany(db.ContratoComercial, {
  foreignKey: 'obra_id',
  as: 'contratosComerciais'
});

db.ContratoComercial.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.CategoriaFinanceira.hasMany(db.ContratoComercial, {
  foreignKey: 'categoria_financeira_id',
  as: 'contratosComerciais'
});

db.ContratoComercial.belongsTo(db.CategoriaFinanceira, {
  foreignKey: 'categoria_financeira_id',
  as: 'categoriaFinanceira'
});

db.CategoriaFinanceira.hasMany(db.ContratoComercial, {
  foreignKey: 'categoria_financeira_comissao_id',
  as: 'contratosComerciaisComissao'
});

db.ContratoComercial.belongsTo(db.CategoriaFinanceira, {
  foreignKey: 'categoria_financeira_comissao_id',
  as: 'categoriaFinanceiraComissao'
});

db.User.hasMany(db.ContratoComercial, {
  foreignKey: 'criado_por',
  as: 'contratosComerciaisCriados'
});

db.ContratoComercial.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.ContratoComercial, {
  foreignKey: 'atualizado_por',
  as: 'contratosComerciaisAtualizados'
});

db.ContratoComercial.belongsTo(db.User, {
  foreignKey: 'atualizado_por',
  as: 'atualizadoPor'
});

db.ContratoComercial.hasMany(db.ContratoComercialParcela, {
  foreignKey: 'contrato_comercial_id',
  as: 'parcelas',
  onDelete: 'CASCADE'
});

db.ContratoComercialParcela.belongsTo(db.ContratoComercial, {
  foreignKey: 'contrato_comercial_id',
  as: 'contrato'
});

db.TituloFinanceiro.hasMany(db.ContratoComercialParcela, {
  foreignKey: 'titulo_financeiro_id',
  as: 'parcelasComerciais'
});

db.ContratoComercialParcela.belongsTo(db.TituloFinanceiro, {
  foreignKey: 'titulo_financeiro_id',
  as: 'tituloFinanceiro'
});

db.ContratoComercial.hasMany(db.ContratoComercialEvento, {
  foreignKey: 'contrato_comercial_id',
  as: 'eventos',
  onDelete: 'CASCADE'
});

db.ContratoComercialEvento.belongsTo(db.ContratoComercial, {
  foreignKey: 'contrato_comercial_id',
  as: 'contrato'
});

db.User.hasMany(db.ContratoComercialEvento, {
  foreignKey: 'criado_por',
  as: 'eventosContratosComerciais'
});

db.ContratoComercialEvento.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.ProvisaoCategoriaMacro.hasMany(db.ProvisaoFinanceira, {
  foreignKey: 'categoria_macro_id',
  as: 'provisoes'
});

db.ProvisaoFinanceira.belongsTo(db.ProvisaoCategoriaMacro, {
  foreignKey: 'categoria_macro_id',
  as: 'categoriaMacro'
});

db.Obra.hasMany(db.ProvisaoFinanceira, {
  foreignKey: 'obra_id',
  as: 'provisoesFinanceiras'
});

db.ProvisaoFinanceira.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.Parceiro.hasMany(db.ProvisaoFinanceira, {
  foreignKey: 'fornecedor_id',
  as: 'provisoesFinanceirasFornecedor'
});

db.ProvisaoFinanceira.belongsTo(db.Parceiro, {
  foreignKey: 'fornecedor_id',
  as: 'fornecedor'
});

db.User.hasMany(db.ProvisaoFinanceira, {
  foreignKey: 'usuario_criacao_id',
  as: 'provisoesFinanceirasCriadas'
});

db.ProvisaoFinanceira.belongsTo(db.User, {
  foreignKey: 'usuario_criacao_id',
  as: 'usuarioCriacao'
});

db.User.hasMany(db.ProvisaoFinanceira, {
  foreignKey: 'usuario_atualizacao_id',
  as: 'provisoesFinanceirasAtualizadas'
});

db.ProvisaoFinanceira.belongsTo(db.User, {
  foreignKey: 'usuario_atualizacao_id',
  as: 'usuarioAtualizacao'
});

db.User.hasMany(db.ProvisaoFinanceira, {
  foreignKey: 'aprovado_por_id',
  as: 'provisoesFinanceirasAprovadas'
});

db.ProvisaoFinanceira.belongsTo(db.User, {
  foreignKey: 'aprovado_por_id',
  as: 'aprovadoPor'
});

db.User.hasMany(db.ProvisaoFinanceira, {
  foreignKey: 'cancelado_por_id',
  as: 'provisoesFinanceirasCanceladas'
});

db.ProvisaoFinanceira.belongsTo(db.User, {
  foreignKey: 'cancelado_por_id',
  as: 'canceladoPor'
});

db.ProvisaoFinanceira.hasMany(db.ProvisaoFinanceiraHistorico, {
  foreignKey: 'provisao_financeira_id',
  as: 'historicos',
  onDelete: 'CASCADE'
});

db.ProvisaoFinanceiraHistorico.belongsTo(db.ProvisaoFinanceira, {
  foreignKey: 'provisao_financeira_id',
  as: 'provisao'
});

db.User.hasMany(db.ProvisaoFinanceiraHistorico, {
  foreignKey: 'usuario_id',
  as: 'historicosProvisionamento'
});

db.ProvisaoFinanceiraHistorico.belongsTo(db.User, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

db.ProvisaoFinanceira.hasMany(db.ProvisaoFinanceiraAnexo, {
  foreignKey: 'provisao_financeira_id',
  as: 'anexos',
  onDelete: 'CASCADE'
});

db.ProvisaoFinanceiraAnexo.belongsTo(db.ProvisaoFinanceira, {
  foreignKey: 'provisao_financeira_id',
  as: 'provisao'
});

db.User.hasMany(db.ProvisaoFinanceiraAnexo, {
  foreignKey: 'uploaded_by',
  as: 'anexosProvisionamentoEnviados'
});

db.ProvisaoFinanceiraAnexo.belongsTo(db.User, {
  foreignKey: 'uploaded_by',
  as: 'uploadUser'
});

db.Obra.hasOne(db.ProvisaoFinanceiraSequencia, {
  foreignKey: 'obra_id',
  as: 'sequenciaProvisionamento'
});

db.ProvisaoFinanceiraSequencia.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.TituloFinanceiro.hasMany(db.ContratoComercial, {
  foreignKey: 'titulo_financeiro_comissao_id',
  as: 'contratosComissao'
});

db.ContratoComercial.belongsTo(db.TituloFinanceiro, {
  foreignKey: 'titulo_financeiro_comissao_id',
  as: 'tituloFinanceiroComissao'
});

db.RhEmpresaGrupo.hasMany(db.RhColaborador, {
  foreignKey: 'empresa_grupo_id',
  as: 'colaboradores'
});

db.RhColaborador.belongsTo(db.RhEmpresaGrupo, {
  foreignKey: 'empresa_grupo_id',
  as: 'empresaGrupo'
});

db.Obra.hasMany(db.RhColaborador, {
  foreignKey: 'obra_id',
  as: 'rhColaboradores'
});

db.RhColaborador.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.Setor.hasMany(db.RhColaborador, {
  foreignKey: 'setor_id',
  as: 'rhColaboradores'
});

db.RhColaborador.belongsTo(db.Setor, {
  foreignKey: 'setor_id',
  as: 'setor'
});

db.RhColaborador.hasOne(db.RhColaboradorPagamento, {
  foreignKey: 'colaborador_id',
  as: 'pagamento',
  onDelete: 'CASCADE'
});

db.RhColaboradorPagamento.belongsTo(db.RhColaborador, {
  foreignKey: 'colaborador_id',
  as: 'colaborador'
});

db.RhDocumentoTipo.hasMany(db.RhDocumento, {
  foreignKey: 'documento_tipo_id',
  as: 'documentos'
});

db.RhDocumento.belongsTo(db.RhDocumentoTipo, {
  foreignKey: 'documento_tipo_id',
  as: 'tipoDocumento'
});

db.RhColaborador.hasMany(db.RhDocumento, {
  foreignKey: 'colaborador_id',
  as: 'documentos'
});

db.RhDocumento.belongsTo(db.RhColaborador, {
  foreignKey: 'colaborador_id',
  as: 'colaborador'
});

db.RhDocumento.hasMany(db.RhDocumento, {
  foreignKey: 'documento_anterior_id',
  as: 'substituicoes'
});

db.RhDocumento.belongsTo(db.RhDocumento, {
  foreignKey: 'documento_anterior_id',
  as: 'documentoAnterior'
});

db.User.hasMany(db.RhDocumento, {
  foreignKey: 'criado_por',
  as: 'rhDocumentosCriados'
});

db.RhDocumento.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.RhDocumento, {
  foreignKey: 'atualizado_por',
  as: 'rhDocumentosAtualizados'
});

db.RhDocumento.belongsTo(db.User, {
  foreignKey: 'atualizado_por',
  as: 'atualizadoPor'
});

db.RhEmpresaGrupo.hasMany(db.RhImportacao, {
  foreignKey: 'empresa_grupo_id',
  as: 'importacoesRh'
});

db.RhImportacao.belongsTo(db.RhEmpresaGrupo, {
  foreignKey: 'empresa_grupo_id',
  as: 'empresaGrupo'
});

db.Obra.hasMany(db.RhImportacao, {
  foreignKey: 'obra_id',
  as: 'importacoesRh'
});

db.RhImportacao.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.User.hasMany(db.RhImportacao, {
  foreignKey: 'criado_por',
  as: 'importacoesRhCriadas'
});

db.RhImportacao.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.RhImportacao, {
  foreignKey: 'confirmado_por',
  as: 'importacoesRhConfirmadas'
});

db.RhImportacao.belongsTo(db.User, {
  foreignKey: 'confirmado_por',
  as: 'confirmadoPor'
});

db.RhImportacao.hasMany(db.RhImportacaoLinha, {
  foreignKey: 'importacao_id',
  as: 'linhas',
  onDelete: 'CASCADE'
});

db.RhImportacaoLinha.belongsTo(db.RhImportacao, {
  foreignKey: 'importacao_id',
  as: 'importacao'
});

db.RhColaborador.hasMany(db.RhImportacaoLinha, {
  foreignKey: 'colaborador_id',
  as: 'linhasImportacaoRh'
});

db.RhImportacaoLinha.belongsTo(db.RhColaborador, {
  foreignKey: 'colaborador_id',
  as: 'colaborador'
});

db.RhEmpresaGrupo.hasMany(db.RhApuracao, {
  foreignKey: 'empresa_grupo_id',
  as: 'apuracoesRh'
});

db.RhApuracao.belongsTo(db.RhEmpresaGrupo, {
  foreignKey: 'empresa_grupo_id',
  as: 'empresaGrupo'
});

db.Obra.hasMany(db.RhApuracao, {
  foreignKey: 'obra_id',
  as: 'apuracoesRh'
});

db.RhApuracao.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.User.hasMany(db.RhApuracao, {
  foreignKey: 'criado_por',
  as: 'apuracoesRhCriadas'
});

db.RhApuracao.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.RhApuracao, {
  foreignKey: 'atualizado_por',
  as: 'apuracoesRhAtualizadas'
});

db.RhApuracao.belongsTo(db.User, {
  foreignKey: 'atualizado_por',
  as: 'atualizadoPor'
});

db.RhApuracao.hasMany(db.RhApuracaoEvento, {
  foreignKey: 'apuracao_id',
  as: 'itens',
  onDelete: 'CASCADE'
});

db.RhApuracaoEvento.belongsTo(db.RhApuracao, {
  foreignKey: 'apuracao_id',
  as: 'apuracao'
});

db.RhColaborador.hasMany(db.RhApuracaoEvento, {
  foreignKey: 'colaborador_id',
  as: 'itensApuracaoRh'
});

db.RhApuracaoEvento.belongsTo(db.RhColaborador, {
  foreignKey: 'colaborador_id',
  as: 'colaborador'
});

db.User.hasMany(db.RhApuracaoEvento, {
  foreignKey: 'ajustado_por',
  as: 'itensApuracaoRhAjustados'
});

db.RhApuracaoEvento.belongsTo(db.User, {
  foreignKey: 'ajustado_por',
  as: 'ajustadoPor'
});

db.RhApuracao.hasOne(db.RhFechamento, {
  foreignKey: 'apuracao_id',
  as: 'fechamentoRh'
});

db.RhFechamento.belongsTo(db.RhApuracao, {
  foreignKey: 'apuracao_id',
  as: 'apuracao'
});

db.CategoriaFinanceira.hasMany(db.RhFechamento, {
  foreignKey: 'categoria_financeira_id',
  as: 'fechamentosRh'
});

db.RhFechamento.belongsTo(db.CategoriaFinanceira, {
  foreignKey: 'categoria_financeira_id',
  as: 'categoriaFinanceira'
});

db.User.hasMany(db.RhFechamento, {
  foreignKey: 'criado_por',
  as: 'fechamentosRhCriados'
});

db.RhFechamento.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.RhFechamento, {
  foreignKey: 'atualizado_por',
  as: 'fechamentosRhAtualizados'
});

db.RhFechamento.belongsTo(db.User, {
  foreignKey: 'atualizado_por',
  as: 'atualizadoPor'
});

db.RhFechamento.hasMany(db.RhFechamentoTitulo, {
  foreignKey: 'fechamento_id',
  as: 'titulos',
  onDelete: 'CASCADE'
});

db.RhFechamentoTitulo.belongsTo(db.RhFechamento, {
  foreignKey: 'fechamento_id',
  as: 'fechamento'
});

db.RhApuracaoEvento.hasOne(db.RhFechamentoTitulo, {
  foreignKey: 'apuracao_evento_id',
  as: 'fechamentoTituloRh'
});

db.RhFechamentoTitulo.belongsTo(db.RhApuracaoEvento, {
  foreignKey: 'apuracao_evento_id',
  as: 'itemApuracao'
});

db.TituloFinanceiro.hasOne(db.RhFechamentoTitulo, {
  foreignKey: 'titulo_financeiro_id',
  as: 'fechamentoRh'
});

db.RhFechamentoTitulo.belongsTo(db.TituloFinanceiro, {
  foreignKey: 'titulo_financeiro_id',
  as: 'tituloFinanceiro'
});

db.Parceiro.hasMany(db.RhFechamentoTitulo, {
  foreignKey: 'parceiro_id',
  as: 'fechamentosRh'
});

db.RhFechamentoTitulo.belongsTo(db.Parceiro, {
  foreignKey: 'parceiro_id',
  as: 'parceiro'
});

db.User.hasMany(db.IntegracaoSiengeConfig, {
  foreignKey: 'criado_por',
  as: 'integracoesSiengeConfigCriadas'
});

db.IntegracaoSiengeConfig.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.IntegracaoSiengeConfig, {
  foreignKey: 'atualizado_por',
  as: 'integracoesSiengeConfigAtualizadas'
});

db.IntegracaoSiengeConfig.belongsTo(db.User, {
  foreignKey: 'atualizado_por',
  as: 'atualizadoPor'
});

db.TituloFinanceiro.hasOne(db.IntegracaoSiengeFila, {
  foreignKey: 'titulo_financeiro_id',
  as: 'integracaoSienge'
});

db.IntegracaoSiengeFila.belongsTo(db.TituloFinanceiro, {
  foreignKey: 'titulo_financeiro_id',
  as: 'tituloFinanceiro'
});

db.User.hasMany(db.IntegracaoSiengeFila, {
  foreignKey: 'criado_por',
  as: 'integracoesSiengeFilaCriadas'
});

db.IntegracaoSiengeFila.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.IntegracaoSiengeFila, {
  foreignKey: 'atualizado_por',
  as: 'integracoesSiengeFilaAtualizadas'
});

db.IntegracaoSiengeFila.belongsTo(db.User, {
  foreignKey: 'atualizado_por',
  as: 'atualizadoPor'
});

db.IntegracaoSiengeFila.hasMany(db.IntegracaoSiengeLog, {
  foreignKey: 'fila_id',
  as: 'logs',
  onDelete: 'CASCADE'
});

db.IntegracaoSiengeLog.belongsTo(db.IntegracaoSiengeFila, {
  foreignKey: 'fila_id',
  as: 'fila'
});

db.User.hasMany(db.IntegracaoSiengeLog, {
  foreignKey: 'criado_por',
  as: 'integracoesSiengeLogsCriados'
});

db.IntegracaoSiengeLog.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.IntegracaoSiengeMapeamento, {
  foreignKey: 'criado_por',
  as: 'integracoesSiengeMapeamentosCriados'
});

db.IntegracaoSiengeMapeamento.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.IntegracaoSiengeMapeamento, {
  foreignKey: 'atualizado_por',
  as: 'integracoesSiengeMapeamentosAtualizados'
});

db.IntegracaoSiengeMapeamento.belongsTo(db.User, {
  foreignKey: 'atualizado_por',
  as: 'atualizadoPor'
});

db.User.hasMany(db.ArquivoModelo, {
  foreignKey: 'criado_por_id',
  as: 'arquivosModelos'
});

db.ArquivoModelo.belongsTo(db.User, {
  foreignKey: 'criado_por_id',
  as: 'criadoPor'
});

db.User.hasMany(db.SecurityEventLog, {
  foreignKey: 'usuario_id',
  as: 'eventosSeguranca'
});

db.SecurityEventLog.belongsTo(db.User, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});


// =====================
// USUÁRIO x SETOR
// =====================
db.Setor.hasMany(db.User, {
  foreignKey: 'setor_id',
  as: 'usuarios'
});

db.User.belongsTo(db.Setor, {
  foreignKey: 'setor_id',
  as: 'setor' // ⚠️ ESTE alias será usado no include
});

// =====================
// HISTORICO x USUARIO
// =====================
db.User.hasMany(db.Historico, {
  foreignKey: 'usuario_responsavel_id',
  as: 'historicos'
});

db.Historico.belongsTo(db.User, {
  foreignKey: 'usuario_responsavel_id',
  as: 'usuario'
});

db.User.hasMany(db.Historico, {
  foreignKey: 'usuario_responsavel_id',
  as: 'historicosResponsavel'
});


// VISIBILIDADE DE SOLICITAÇÃO PARA USUÁRIOS

db.User.hasMany(db.SolicitacaoVisibilidadeUsuario, {
  foreignKey: 'usuario_id',
  as: 'visibilidades',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

db.SolicitacaoVisibilidadeUsuario.belongsTo(db.User, {
  foreignKey: 'usuario_id',
  as: 'usuario',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

db.Solicitacao.hasMany(db.SolicitacaoVisibilidadeUsuario, {
  foreignKey: 'solicitacao_id',
  as: 'visibilidades',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

db.SolicitacaoVisibilidadeUsuario.belongsTo(db.Solicitacao, {
  foreignKey: 'solicitacao_id',
  as: 'solicitacao',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

// =====================
// NOTIFICACOES
// =====================
db.Notificacao.hasMany(db.NotificacaoDestinatario, {
  foreignKey: 'notificacao_id',
  as: 'destinatarios'
});

db.NotificacaoDestinatario.belongsTo(db.Notificacao, {
  foreignKey: 'notificacao_id',
  as: 'notificacao'
});

db.User.hasMany(db.NotificacaoDestinatario, {
  foreignKey: 'usuario_id',
  as: 'notificacoes'
});

db.NotificacaoDestinatario.belongsTo(db.User, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// =====================
// CONVERSAS INTERNAS
// =====================
db.User.hasMany(db.ConversaInterna, {
  foreignKey: 'criado_por_id',
  as: 'conversasCriadas'
});

db.ConversaInterna.belongsTo(db.User, {
  foreignKey: 'criado_por_id',
  as: 'criador'
});

db.User.hasMany(db.ConversaInterna, {
  foreignKey: 'destinatario_id',
  as: 'conversasRecebidas'
});

db.ConversaInterna.belongsTo(db.User, {
  foreignKey: 'destinatario_id',
  as: 'destinatario'
});

db.User.hasMany(db.ConversaInterna, {
  foreignKey: 'concluida_por_id',
  as: 'conversasConcluidas'
});

db.ConversaInterna.belongsTo(db.User, {
  foreignKey: 'concluida_por_id',
  as: 'concluidaPor'
});

db.ConversaInterna.belongsTo(db.Setor, {
  foreignKey: 'setor_id',
  as: 'setorGrupo'
});

db.Setor.hasMany(db.ConversaInterna, {
  foreignKey: 'setor_id',
  as: 'conversasGrupo'
});

db.ConversaInterna.hasMany(db.ConversaInternaMensagem, {
  foreignKey: 'conversa_id',
  as: 'mensagens'
});

db.ConversaInternaMensagem.belongsTo(db.ConversaInterna, {
  foreignKey: 'conversa_id',
  as: 'conversa'
});

db.User.hasMany(db.ConversaInternaMensagem, {
  foreignKey: 'usuario_id',
  as: 'mensagensConversaInterna'
});

db.ConversaInternaMensagem.belongsTo(db.User, {
  foreignKey: 'usuario_id',
  as: 'autor'
});

db.ConversaInterna.hasMany(db.ConversaInternaAnexo, {
  foreignKey: 'conversa_id',
  as: 'anexos'
});

db.ConversaInternaAnexo.belongsTo(db.ConversaInterna, {
  foreignKey: 'conversa_id',
  as: 'conversa'
});

db.ConversaInternaMensagem.hasMany(db.ConversaInternaAnexo, {
  foreignKey: 'mensagem_id',
  as: 'anexos'
});

db.ConversaInternaAnexo.belongsTo(db.ConversaInternaMensagem, {
  foreignKey: 'mensagem_id',
  as: 'mensagem'
});

db.ConversaInterna.hasMany(db.ConversaInternaParticipante, {
  foreignKey: 'conversa_id',
  as: 'participantes'
});

db.ConversaInternaParticipante.belongsTo(db.ConversaInterna, {
  foreignKey: 'conversa_id',
  as: 'conversa'
});

db.User.hasMany(db.ConversaInternaParticipante, {
  foreignKey: 'usuario_id',
  as: 'participacoesConversaInterna'
});

db.ConversaInternaParticipante.belongsTo(db.User, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

db.User.hasMany(db.ConversaInternaParticipante, {
  foreignKey: 'adicionado_por_id',
  as: 'participantesAdicionadosConversaInterna'
});

db.ConversaInternaParticipante.belongsTo(db.User, {
  foreignKey: 'adicionado_por_id',
  as: 'adicionadoPor'
});

db.ConversaInterna.hasMany(db.ConversaInternaArquivoUsuario, {
  foreignKey: 'conversa_id',
  as: 'arquivamentos'
});

db.ConversaInternaArquivoUsuario.belongsTo(db.ConversaInterna, {
  foreignKey: 'conversa_id',
  as: 'conversa'
});

db.User.hasMany(db.ConversaInternaArquivoUsuario, {
  foreignKey: 'usuario_id',
  as: 'conversasArquivadas'
});

db.ConversaInternaArquivoUsuario.belongsTo(db.User, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// =====================
// MODULO DE COMPRAS
// =====================
db.Insumo.belongsTo(db.Unidade, {
  foreignKey: 'unidade_id',
  as: 'unidade'
});

db.Insumo.belongsTo(db.Categoria, {
  foreignKey: 'categoria_id',
  as: 'categoria'
});

db.Unidade.hasMany(db.Insumo, {
  foreignKey: 'unidade_id',
  as: 'insumos'
});

db.Categoria.hasMany(db.Insumo, {
  foreignKey: 'categoria_id',
  as: 'insumos'
});

db.Apropriacao.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.Obra.hasMany(db.Apropriacao, {
  foreignKey: 'obra_id',
  as: 'apropriacoes'
});

db.SolicitacaoCompra.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.SolicitacaoCompra.belongsTo(db.User, {
  foreignKey: 'solicitante_id',
  as: 'solicitante'
});

db.SolicitacaoCompra.belongsTo(db.Solicitacao, {
  foreignKey: 'solicitacao_principal_id',
  as: 'solicitacaoPrincipal'
});

db.SolicitacaoCompra.hasMany(db.SolicitacaoCompraItem, {
  foreignKey: 'solicitacao_compra_id',
  as: 'itens',
  onDelete: 'CASCADE'
});

db.SolicitacaoCompra.hasMany(db.SolicitacaoCompraItemManual, {
  foreignKey: 'solicitacao_compra_id',
  as: 'itensManuais',
  onDelete: 'CASCADE'
});

db.SolicitacaoCompraItem.belongsTo(db.SolicitacaoCompra, {
  foreignKey: 'solicitacao_compra_id',
  as: 'solicitacao'
});

db.SolicitacaoCompraItemManual.belongsTo(db.SolicitacaoCompra, {
  foreignKey: 'solicitacao_compra_id',
  as: 'solicitacao'
});

db.SolicitacaoCompraItem.belongsTo(db.Insumo, {
  foreignKey: 'insumo_id',
  as: 'insumo'
});

db.SolicitacaoCompraItem.belongsTo(db.Unidade, {
  foreignKey: 'unidade_id',
  as: 'unidade'
});

db.SolicitacaoCompraItem.belongsTo(db.Apropriacao, {
  foreignKey: 'apropriacao_id',
  as: 'apropriacao'
});

db.SolicitacaoCompraItemManual.belongsTo(db.Apropriacao, {
  foreignKey: 'apropriacao_id',
  as: 'apropriacao'
});

db.SolicitacaoCompraItem.hasMany(db.SolicitacaoCompraItemApropriacao, {
  foreignKey: 'solicitacao_compra_item_id',
  as: 'apropriacoes',
  onDelete: 'CASCADE'
});

db.SolicitacaoCompraItemApropriacao.belongsTo(db.SolicitacaoCompraItem, {
  foreignKey: 'solicitacao_compra_item_id',
  as: 'item'
});

db.SolicitacaoCompraItemApropriacao.belongsTo(db.Apropriacao, {
  foreignKey: 'apropriacao_id',
  as: 'apropriacao'
});

db.SolicitacaoCompraItemManual.hasMany(db.SolicitacaoCompraItemManualApropriacao, {
  foreignKey: 'solicitacao_compra_item_manual_id',
  as: 'apropriacoes',
  onDelete: 'CASCADE'
});

db.SolicitacaoCompraItemManualApropriacao.belongsTo(db.SolicitacaoCompraItemManual, {
  foreignKey: 'solicitacao_compra_item_manual_id',
  as: 'item'
});

db.SolicitacaoCompraItemManualApropriacao.belongsTo(db.Apropriacao, {
  foreignKey: 'apropriacao_id',
  as: 'apropriacao'
});

db.FornecedorCompra.hasMany(db.SolicitacaoCompraFornecedor, {
  foreignKey: 'fornecedor_compra_id',
  as: 'participacoes'
});

db.Parceiro.hasMany(db.FornecedorCompra, {
  foreignKey: 'parceiro_id',
  as: 'fornecedoresCompra'
});

db.FornecedorCompra.belongsTo(db.Parceiro, {
  foreignKey: 'parceiro_id',
  as: 'parceiro'
});

db.SolicitacaoCompraFornecedor.belongsTo(db.FornecedorCompra, {
  foreignKey: 'fornecedor_compra_id',
  as: 'fornecedor'
});

db.SolicitacaoCompra.hasMany(db.SolicitacaoCompraFornecedor, {
  foreignKey: 'solicitacao_compra_id',
  as: 'fornecedores',
  onDelete: 'CASCADE'
});

db.SolicitacaoCompraFornecedor.belongsTo(db.SolicitacaoCompra, {
  foreignKey: 'solicitacao_compra_id',
  as: 'solicitacao'
});

db.SolicitacaoCompraFornecedor.hasMany(db.SolicitacaoCompraRespostaItem, {
  foreignKey: 'solicitacao_compra_fornecedor_id',
  as: 'respostas',
  onDelete: 'CASCADE'
});

db.SolicitacaoCompraRespostaItem.belongsTo(db.SolicitacaoCompraFornecedor, {
  foreignKey: 'solicitacao_compra_fornecedor_id',
  as: 'cotacaoFornecedor'
});

db.SolicitacaoCompraRespostaItem.belongsTo(db.SolicitacaoCompraItem, {
  foreignKey: 'solicitacao_compra_item_id',
  as: 'itemCadastrado'
});

db.SolicitacaoCompraRespostaItem.belongsTo(db.SolicitacaoCompraItemManual, {
  foreignKey: 'solicitacao_compra_item_manual_id',
  as: 'itemManual'
});

db.SolicitacaoCompra.hasMany(db.SolicitacaoCompraLog, {
  foreignKey: 'solicitacao_compra_id',
  as: 'logs',
  onDelete: 'CASCADE'
});

db.SolicitacaoCompraLog.belongsTo(db.SolicitacaoCompra, {
  foreignKey: 'solicitacao_compra_id',
  as: 'solicitacao'
});

db.SolicitacaoCompraLog.belongsTo(db.User, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

db.SolicitacaoCompraLog.belongsTo(db.FornecedorCompra, {
  foreignKey: 'fornecedor_compra_id',
  as: 'fornecedor'
});

db.SolicitacaoCompra.hasMany(db.PedidoCompra, {
  foreignKey: 'solicitacao_compra_id',
  as: 'pedidos'
});

db.PedidoCompra.belongsTo(db.SolicitacaoCompra, {
  foreignKey: 'solicitacao_compra_id',
  as: 'solicitacao'
});

db.Obra.hasMany(db.PedidoCompra, {
  foreignKey: 'obra_id',
  as: 'pedidosCompra'
});

db.PedidoCompra.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.FornecedorCompra.hasMany(db.PedidoCompra, {
  foreignKey: 'fornecedor_compra_id',
  as: 'pedidosCompra'
});

db.PedidoCompra.belongsTo(db.FornecedorCompra, {
  foreignKey: 'fornecedor_compra_id',
  as: 'fornecedor'
});

db.User.hasMany(db.PedidoCompra, {
  foreignKey: 'criado_por',
  as: 'pedidosCompraCriados'
});

db.PedidoCompra.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criador'
});

db.PedidoCompra.hasMany(db.PedidoCompraItem, {
  foreignKey: 'pedido_compra_id',
  as: 'itens',
  onDelete: 'CASCADE'
});

db.PedidoCompraItem.belongsTo(db.PedidoCompra, {
  foreignKey: 'pedido_compra_id',
  as: 'pedido'
});

db.PedidoCompraItem.belongsTo(db.SolicitacaoCompraRespostaItem, {
  foreignKey: 'resposta_item_id',
  as: 'respostaItem'
});

db.PedidoCompraItem.belongsTo(db.SolicitacaoCompraItem, {
  foreignKey: 'solicitacao_compra_item_id',
  as: 'itemCadastrado'
});

db.PedidoCompraItem.belongsTo(db.SolicitacaoCompraItemManual, {
  foreignKey: 'solicitacao_compra_item_manual_id',
  as: 'itemManual'
});

db.PedidoCompra.hasMany(db.PedidoCompraItemLog, {
  foreignKey: 'pedido_compra_id',
  as: 'logsItens',
  onDelete: 'CASCADE'
});

db.PedidoCompraItemLog.belongsTo(db.PedidoCompra, {
  foreignKey: 'pedido_compra_id',
  as: 'pedido'
});

db.PedidoCompraItem.hasMany(db.PedidoCompraItemLog, {
  foreignKey: 'pedido_compra_item_id',
  as: 'logs',
  onDelete: 'CASCADE'
});

db.PedidoCompraItemLog.belongsTo(db.PedidoCompraItem, {
  foreignKey: 'pedido_compra_item_id',
  as: 'item'
});

db.User.hasMany(db.PedidoCompraItemLog, {
  foreignKey: 'usuario_id',
  as: 'logsItensPedido'
});

db.PedidoCompraItemLog.belongsTo(db.User, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// =====================
// MODULO FINANCEIRO
// =====================
db.User.hasMany(db.ContaBancaria, {
  foreignKey: 'criado_por',
  as: 'contasBancariasCriadas'
});

db.ContaBancaria.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.CategoriaFinanceira, {
  foreignKey: 'criado_por',
  as: 'categoriasFinanceirasCriadas'
});

db.CategoriaFinanceira.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.Obra.hasMany(db.TituloFinanceiro, {
  foreignKey: 'obra_id',
  as: 'titulosFinanceiros'
});

db.TituloFinanceiro.belongsTo(db.Obra, {
  foreignKey: 'obra_id',
  as: 'obra'
});

db.Parceiro.hasMany(db.TituloFinanceiro, {
  foreignKey: 'parceiro_id',
  as: 'titulosFinanceiros'
});

db.TituloFinanceiro.belongsTo(db.Parceiro, {
  foreignKey: 'parceiro_id',
  as: 'parceiro'
});

db.CategoriaFinanceira.hasMany(db.TituloFinanceiro, {
  foreignKey: 'categoria_financeira_id',
  as: 'titulos'
});

db.TituloFinanceiro.belongsTo(db.CategoriaFinanceira, {
  foreignKey: 'categoria_financeira_id',
  as: 'categoriaFinanceira'
});

db.Solicitacao.hasMany(db.TituloFinanceiro, {
  foreignKey: 'solicitacao_id',
  as: 'titulosFinanceiros'
});

db.TituloFinanceiro.belongsTo(db.Solicitacao, {
  foreignKey: 'solicitacao_id',
  as: 'solicitacao'
});

db.User.hasMany(db.TituloFinanceiro, {
  foreignKey: 'criado_por',
  as: 'titulosFinanceirosCriados'
});

db.TituloFinanceiro.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.TituloFinanceiro.hasMany(db.MovimentoFinanceiro, {
  foreignKey: 'titulo_financeiro_id',
  as: 'movimentos',
  onDelete: 'RESTRICT'
});

db.MovimentoFinanceiro.belongsTo(db.TituloFinanceiro, {
  foreignKey: 'titulo_financeiro_id',
  as: 'titulo'
});

db.ContaBancaria.hasMany(db.MovimentoFinanceiro, {
  foreignKey: 'conta_bancaria_id',
  as: 'movimentos'
});

db.MovimentoFinanceiro.belongsTo(db.ContaBancaria, {
  foreignKey: 'conta_bancaria_id',
  as: 'contaBancaria'
});

db.User.hasMany(db.MovimentoFinanceiro, {
  foreignKey: 'criado_por',
  as: 'movimentosFinanceirosCriados'
});

db.MovimentoFinanceiro.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.MovimentoFinanceiro, {
  foreignKey: 'estornado_por',
  as: 'movimentosFinanceirosEstornados'
});

db.MovimentoFinanceiro.belongsTo(db.User, {
  foreignKey: 'estornado_por',
  as: 'estornadoPor'
});

db.TituloFinanceiro.hasMany(db.ConciliacaoBancaria, {
  foreignKey: 'titulo_financeiro_id',
  as: 'conciliacoes'
});

db.ConciliacaoBancaria.belongsTo(db.TituloFinanceiro, {
  foreignKey: 'titulo_financeiro_id',
  as: 'titulo'
});

db.MovimentoFinanceiro.hasMany(db.ConciliacaoBancaria, {
  foreignKey: 'movimento_financeiro_id',
  as: 'conciliacoes'
});

db.ConciliacaoBancaria.belongsTo(db.MovimentoFinanceiro, {
  foreignKey: 'movimento_financeiro_id',
  as: 'movimento'
});

db.ContaBancaria.hasMany(db.ConciliacaoBancaria, {
  foreignKey: 'conta_bancaria_id',
  as: 'conciliacoes'
});

db.ConciliacaoBancaria.belongsTo(db.ContaBancaria, {
  foreignKey: 'conta_bancaria_id',
  as: 'contaBancaria'
});

db.ContaBancaria.hasMany(db.ConciliacaoBancariaImportacao, {
  foreignKey: 'conta_bancaria_id',
  as: 'importacoesConciliacao'
});

db.ConciliacaoBancariaImportacao.belongsTo(db.ContaBancaria, {
  foreignKey: 'conta_bancaria_id',
  as: 'contaBancaria'
});

db.User.hasMany(db.ConciliacaoBancaria, {
  foreignKey: 'confirmado_por',
  as: 'conciliacoesConfirmadas'
});

db.ConciliacaoBancaria.belongsTo(db.User, {
  foreignKey: 'confirmado_por',
  as: 'confirmadoPor'
});

db.User.hasMany(db.ConciliacaoBancaria, {
  foreignKey: 'criado_por',
  as: 'conciliacoesCriadas'
});

db.ConciliacaoBancaria.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

db.User.hasMany(db.ConciliacaoBancariaImportacao, {
  foreignKey: 'criado_por',
  as: 'importacoesConciliacaoCriadas'
});

db.ConciliacaoBancariaImportacao.belongsTo(db.User, {
  foreignKey: 'criado_por',
  as: 'criadoPor'
});

/* ===== CRM ===== */
db.CrmPipeline.hasMany(db.CrmPipelineStage, { foreignKey: 'pipeline_id', as: 'etapas' });
db.CrmPipelineStage.belongsTo(db.CrmPipeline, { foreignKey: 'pipeline_id', as: 'pipeline' });

db.CrmLead.belongsTo(db.CrmPipeline, { foreignKey: 'pipeline_id', as: 'pipeline' });
db.CrmLead.belongsTo(db.CrmPipelineStage, { foreignKey: 'pipeline_stage_id', as: 'etapa' });
db.CrmLead.belongsTo(db.CrmLossReason, { foreignKey: 'motivo_perda_id', as: 'motivoPerda' });
db.CrmLead.belongsTo(db.User, { foreignKey: 'assigned_user_id', as: 'responsavel' });
db.CrmLead.belongsTo(db.User, { foreignKey: 'criado_por', as: 'criadoPor' });
db.CrmLead.belongsTo(db.User, { foreignKey: 'atualizado_por', as: 'atualizadoPor' });

db.CrmPipeline.hasMany(db.CrmLead, { foreignKey: 'pipeline_id', as: 'leads' });
db.CrmPipelineStage.hasMany(db.CrmLead, { foreignKey: 'pipeline_stage_id', as: 'leads' });

db.CrmAuditLog.belongsTo(db.CrmLead, { foreignKey: 'lead_id', as: 'lead' });
db.CrmAuditLog.belongsTo(db.User, { foreignKey: 'user_id', as: 'usuario' });
db.CrmLead.hasMany(db.CrmAuditLog, { foreignKey: 'lead_id', as: 'auditLogs' });

db.CrmInteraction.belongsTo(db.CrmLead, { foreignKey: 'lead_id', as: 'lead' });
db.CrmInteraction.belongsTo(db.User, { foreignKey: 'user_id', as: 'usuario' });
db.CrmLead.hasMany(db.CrmInteraction, { foreignKey: 'lead_id', as: 'interactions' });

db.CrmTask.belongsTo(db.CrmLead, { foreignKey: 'lead_id', as: 'lead' });
db.CrmTask.belongsTo(db.User, { foreignKey: 'assigned_user_id', as: 'responsavel' });
db.CrmTask.belongsTo(db.User, { foreignKey: 'criado_por', as: 'criadoPor' });
db.CrmLead.hasMany(db.CrmTask, { foreignKey: 'lead_id', as: 'tasks' });

db.CrmIntegrationMetaEvent.belongsTo(db.CrmLead, { foreignKey: 'processed_lead_id', as: 'processedLead' });
db.CrmLead.hasMany(db.CrmIntegrationMetaEvent, { foreignKey: 'processed_lead_id', as: 'metaEvents' });
db.CrmIntegrationMetaEvent.belongsTo(db.CrmConversation, { foreignKey: 'processed_conversation_id', as: 'processedConversation' });
db.CrmConversation.hasMany(db.CrmIntegrationMetaEvent, { foreignKey: 'processed_conversation_id', as: 'metaIntegrationEvents' });
db.CrmIntegrationMetaEvent.belongsTo(db.CrmMessage, { foreignKey: 'processed_message_id', as: 'processedMessage' });
db.CrmMessage.hasMany(db.CrmIntegrationMetaEvent, { foreignKey: 'processed_message_id', as: 'metaIntegrationEvents' });
db.CrmIntegrationGoogleEvent.belongsTo(db.CrmLead, { foreignKey: 'processed_lead_id', as: 'processedLead' });
db.CrmLead.hasMany(db.CrmIntegrationGoogleEvent, { foreignKey: 'processed_lead_id', as: 'googleEvents' });
db.CrmIntegrationGoogleEvent.belongsTo(db.CrmConversation, { foreignKey: 'processed_conversation_id', as: 'processedConversation' });
db.CrmConversation.hasMany(db.CrmIntegrationGoogleEvent, { foreignKey: 'processed_conversation_id', as: 'googleIntegrationEvents' });
db.CrmIntegrationGoogleEvent.belongsTo(db.CrmMessage, { foreignKey: 'processed_message_id', as: 'processedMessage' });
db.CrmMessage.hasMany(db.CrmIntegrationGoogleEvent, { foreignKey: 'processed_message_id', as: 'googleIntegrationEvents' });

db.CrmConversation.belongsTo(db.CrmLead, { foreignKey: 'lead_id', as: 'lead' });
db.CrmLead.hasMany(db.CrmConversation, { foreignKey: 'lead_id', as: 'conversations' });
db.CrmConversation.belongsTo(db.CrmChannel, { foreignKey: 'channel_id', as: 'channel' });
db.CrmChannel.hasMany(db.CrmConversation, { foreignKey: 'channel_id', as: 'conversations' });
db.CrmConversation.belongsTo(db.CrmPhoneAsset, { foreignKey: 'phone_asset_id', as: 'phoneAsset' });
db.CrmPhoneAsset.hasMany(db.CrmConversation, { foreignKey: 'phone_asset_id', as: 'conversations' });
db.CrmConversation.belongsTo(db.User, { foreignKey: 'assigned_user_id', as: 'responsavel' });
db.CrmConversation.belongsTo(db.User, { foreignKey: 'created_by_user_id', as: 'criadoPor' });

db.CrmMessage.belongsTo(db.CrmConversation, { foreignKey: 'conversation_id', as: 'conversation' });
db.CrmConversation.hasMany(db.CrmMessage, { foreignKey: 'conversation_id', as: 'messages' });
db.CrmMessage.belongsTo(db.CrmLead, { foreignKey: 'lead_id', as: 'lead' });
db.CrmMessage.belongsTo(db.User, { foreignKey: 'user_id', as: 'usuario' });

db.CrmConversationParticipant.belongsTo(db.CrmConversation, { foreignKey: 'conversation_id', as: 'conversation' });
db.CrmConversation.hasMany(db.CrmConversationParticipant, { foreignKey: 'conversation_id', as: 'participants' });
db.CrmConversationParticipant.belongsTo(db.User, { foreignKey: 'user_id', as: 'usuario' });
db.User.hasMany(db.CrmConversationParticipant, { foreignKey: 'user_id', as: 'crmConversationParticipants' });

db.CrmMessageTemplate.belongsTo(db.User, { foreignKey: 'created_by_user_id', as: 'criadoPor' });
db.CrmAutomationRule.belongsTo(db.User, { foreignKey: 'created_by_user_id', as: 'criadoPor' });
db.CrmAutomationRule.belongsTo(db.User, { foreignKey: 'updated_by_user_id', as: 'atualizadoPor' });
db.CrmAutomationExecution.belongsTo(db.CrmAutomationRule, { foreignKey: 'rule_id', as: 'rule' });
db.CrmAutomationRule.hasMany(db.CrmAutomationExecution, { foreignKey: 'rule_id', as: 'executions' });
db.CrmAutomationExecution.belongsTo(db.CrmLead, { foreignKey: 'lead_id', as: 'lead' });
db.CrmLead.hasMany(db.CrmAutomationExecution, { foreignKey: 'lead_id', as: 'automationExecutions' });
db.CrmAutomationExecution.belongsTo(db.CrmConversation, { foreignKey: 'conversation_id', as: 'conversation' });
db.CrmConversation.hasMany(db.CrmAutomationExecution, { foreignKey: 'conversation_id', as: 'automationExecutions' });
db.CrmAutomationExecution.belongsTo(db.User, { foreignKey: 'created_by_user_id', as: 'criadoPor' });
db.User.hasMany(db.CrmAutomationExecution, { foreignKey: 'created_by_user_id', as: 'crmAutomationExecutions' });

module.exports = db;
