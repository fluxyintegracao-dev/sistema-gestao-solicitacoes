// src/routes.js

const express = require('express');
const router = express.Router();

const fakeAuth = require('./middlewares/fakeAuth');
const permit = require('./middlewares/permissions');
const csrfProtection = require('./middlewares/csrf');
const requireMfaCompletion = require('./middlewares/requireMfaCompletion');
const { auditSuccess } = require('./middlewares/audit');
const { createRateLimit } = require('./middlewares/rateLimit');
const {
  requireCompraAccess,
  requireCompraBodyObraAccess,
  requireContratoAccess,
  requireContratoBodyObraAccess,
  requireContratoOptionalBodyObraAccess,
  requirePedidoCompraAccess,
  scopeCompraListAccess
} = require('./middlewares/resourceAccess');
const { requireAnyEnabledModule, requireEnabledModule } = require('./middlewares/moduleAccess');
const { validateRequest } = require('./middlewares/validation');
const {
  validateLoginBody,
  validateMfaCodeBody,
  validateMfaLoginBody,
  validateNumericIdParam,
  validatePasswordChangeBody,
  validatePresignQuery
} = require('./validators/securityValidators');
const {
  validateCargoCreateBody,
  validateCargoUpdateBody,
  validateSetorCreateBody,
  validateSetorPermissaoBody,
  validateSetorUpdateBody,
  validateStatusSetorCreateBody,
  validateStatusSetorQuery,
  validateStatusSetorUpdateBody
} = require('./validators/adminValidators');
const {
  validateCompraCreateBody,
  validateCompraEncerrarBody,
  validateCompraEnviarBody,
  validateCompraIntegrarBody,
  validateCompraPedidoCreateBody,
  validateCompraPedidoItemAddBody,
  validateCompraPedidoItemParams,
  validateCompraPedidoStatusBody,
  validateCompraPedidoItemUpdateBody,
  validateCompraPedidoAuditoriaQuery,
  validateCompraPedidoQuery,
  validateCompraQuery,
  validateContratoCreateBody,
  validateContratoQuery,
  validateContratoUpdateBody,
  validateSolicitacaoArquivarMassaBody,
  validateSolicitacaoComentarioBody,
  validateSolicitacaoCreateBody,
  validateSolicitacaoEnviarSetorBody,
  validateSolicitacaoEnviarSetorMassaBody,
  validateSolicitacaoPedidoBody,
  validateSolicitacaoRefContratoBody,
  validateSolicitacaoResponsavelBody,
  validateSolicitacaoStatusBody,
  validateSolicitacaoValorBody
} = require('./validators/operationalValidators');
const {
  validateComercialContratoCreateBody,
  validateComercialContratoDistratoBody,
  validateComercialContratoQuery,
  validateComercialContratoTrocaUnidadeBody,
  validateComercialContratoUpdateBody,
  validateComercialEmpreendimentoCreateBody,
  validateComercialEmpreendimentoQuery,
  validateComercialEmpreendimentoUpdateBody,
  validateComercialTabelaPrecoCreateBody,
  validateComercialTabelaPrecoQuery,
  validateComercialTabelaPrecoUpdateBody,
  validateComercialUnidadeCreateBody,
  validateComercialUnidadeQuery,
  validateComercialUnidadeUpdateBody
} = require('./validators/commercialValidators');
const {
  validateRhApuracaoCreateBody,
  validateRhApuracaoItemParams,
  validateRhApuracaoItemUpdateBody,
  validateRhApuracaoQuery,
  validateRhColaboradorCreateBody,
  validateRhColaboradorQuery,
  validateRhColaboradorUpdateBody,
  validateRhDocumentoCreateBody,
  validateRhDocumentoQuery,
  validateRhDocumentoTipoQuery,
  validateRhDocumentoUpdateBody,
  validateRhFechamentoQuery,
  validateRhFecharApuracaoBody,
  validateRhReabrirFechamentoBody,
  validateRhImportacaoCreateBody,
  validateRhImportacaoQuery,
  validateRhEmpresaGrupoCreateBody,
  validateRhEmpresaGrupoQuery,
  validateRhEmpresaGrupoUpdateBody
} = require('./validators/rhValidators');
const {
  validateProvisaoAnexoLinkParams,
  validateProvisaoCategoriaCreateBody,
  validateProvisaoCategoriaQuery,
  validateProvisaoCategoriaUpdateBody,
  validateProvisaoComentarioBody,
  validateProvisaoDashboardQuery,
  validateProvisaoFinanceiraCreateBody,
  validateProvisaoFinanceiraQuery,
  validateProvisaoFinanceiraUpdateBody,
  validateProvisaoIdParams
} = require('./validators/provisaoValidators');
const {
  validateSiengeConfigBody,
  validateSiengeCredorBuscaBody,
  validateSiengeCredorCreateBody,
  validateSiengeCredorMapeamentoBody,
  validateSiengeFilaCreateBody,
  validateSiengeFilaQuery,
  validateSiengeFilaRetryBody,
  validateSiengeLogQuery
} = require('./validators/integrationValidators');
const {
  validateFinanceConciliacaoConciliarSugeridosBody,
  validateFinanceConciliacaoCriarTituloBody,
  validateFinanceConciliacaoConfirmBody,
  validateFinanceConciliacaoImportBody,
  validateFinanceConciliacaoImportacoesQuery,
  validateFinanceConciliacaoMovimentosQuery,
  validateFinanceConciliacaoQuery,
  validateFinanceBoletoTituloQuery,
  validateFinanceCadastroCategoriaBody,
  validateFinanceCadastroContaBody,
  validateFinanceFluxoCaixaQuery,
  validateFinanceTituloBaixaBody,
  validateFinanceTituloCobrancaBody,
  validateFinanceTituloCreateBody,
  validateFinanceTituloCreateFromSolicitacaoBody,
  validateFinanceTituloEstornoBody,
  validateFinanceTituloMovimentoParams,
  validateFinanceTituloQuery
} = require('./validators/financialValidators');
const { env } = require('./config/env');
const {
  canAccessBoletos,
  canAccessProvisoes,
  canCreateProvisoes,
  canAccessFinanceiro,
  canAccessComprovantes,
  canCreateComercialContratos,
  canCreateCrmLeads,
  canExportCrmLeads,
  canGenerateBoletos,
  canManageComercialContratos,
  canManageComercialEmpreendimentos,
  canManageCrmAutomacoes,
  canManageCrmConfiguracoes,
  canRedistributeCrmLeads,
  canSendCrmAtendimento,
  canEditProvisoes,
  canEditRhDpApuracao,
  canExecuteRhDpFechamento,
  canExecuteRhDpImportacoes,
  canManageProvisoesCategorias,
  canManageIntegracaoSiengeConfig,
  canManageRhDpColaboradores,
  canManageRhDpDocumentos,
  canManageRhDpEmpresas,
  canManageUsers,
  canReopenRhDpFechamento,
  canRetryIntegracaoSienge,
  canReadComercialBaseData,
  canViewProvisoes,
  canViewProvisoesDashboard,
  canViewComercialContratos,
  canViewComercialEmpreendimentos,
  canViewCrmAtendimento,
  canViewCrmAutomacoes,
  canViewCrmConfiguracoes,
  canViewCrmDashboard,
  canViewCrmLeads,
  canViewIntegracaoSienge,
  canViewRhDpApuracao,
  canViewRhDpColaboradores,
  canViewRhDpDocumentos,
  canViewRhDpObrigacoes
} = require('./services/authorizationService');

const uploadComprovantes = require('./config/uploadComprovantes');
const uploadOfx = require('./config/uploadOfx');

// Controllers
const SolicitacaoController = require('./controllers/SolicitacaoController');
const PrioridadeDiretoriaController = require('./controllers/PrioridadeDiretoriaController');
const UsuarioController = require('./controllers/UsuarioController');
const CargoController = require('./controllers/CargoController');
const SetorController = require('./controllers/SetorController');
const ObraController = require('./controllers/ObraController');
const TipoSolicitacaoController = require('./controllers/TipoSolicitacaoController');
const DashboardController = require('./controllers/DashboardController');
const AuthController = require('./controllers/AuthController');
const InstalacaoController = require('./controllers/InstalacaoController');
const ContratoController = require('./controllers/ContratoController');
const TipoMacroContratoController = require('./controllers/TipoMacroContratoController');
const TipoSubContratoController = require('./controllers/TipoSubContratoController');
const StatusSetorController = require('./controllers/StatusSetorController');
const ComprovanteController = require('./controllers/ComprovanteController');
const AnexoController = require('./controllers/AnexoController');
const NotificacaoController = require('./controllers/NotificacaoController');
const SetorPermissaoController = require('./controllers/SetorPermissaoController');
const ConfiguracaoSistemaController = require('./controllers/ConfiguracaoSistemaController');
const ConversaInternaController = require('./controllers/ConversaInternaController');
const ArquivoModeloController = require('./controllers/ArquivoModeloController');
const UnidadeController = require('./controllers/UnidadeController');
const CategoriaController = require('./controllers/CategoriaController');
const InsumoController = require('./controllers/InsumoController');
const ApropriacaoController = require('./controllers/ApropriacaoController');
const SolicitacaoCompraController = require('./controllers/SolicitacaoCompraController');
const FornecedorCompraController = require('./controllers/FornecedorCompraController');
const CotacaoFornecedorController = require('./controllers/CotacaoFornecedorController');
const PedidoCompraController = require('./controllers/PedidoCompraController');
const ParceiroController = require('./controllers/ParceiroController');
const ParceiroCategoriaController = require('./controllers/ParceiroCategoriaController');
const ComercialEmpreendimentoController = require('./controllers/ComercialEmpreendimentoController');
const ComercialUnidadeController = require('./controllers/ComercialUnidadeController');
const ComercialContratoController = require('./controllers/ComercialContratoController');
const ComercialContratoDocumentoController = require('./controllers/ComercialContratoDocumentoController');
const ComercialTabelaPrecoController = require('./controllers/ComercialTabelaPrecoController');
const ProvisaoFinanceiraController = require('./controllers/ProvisaoFinanceiraController');
const ProvisaoCategoriaMacroController = require('./controllers/ProvisaoCategoriaMacroController');
const ProvisaoFinanceiraDashboardController = require('./controllers/ProvisaoFinanceiraDashboardController');
const RhEmpresaGrupoController = require('./controllers/RhEmpresaGrupoController');
const RhColaboradorController = require('./controllers/RhColaboradorController');
const RhDocumentoController = require('./controllers/RhDocumentoController');
const RhImportacaoController = require('./controllers/RhImportacaoController');
const RhApuracaoController = require('./controllers/RhApuracaoController');
const RhFechamentoController = require('./controllers/RhFechamentoController');
const IntegracaoSiengeController = require('./controllers/IntegracaoSiengeController');
const ContaBancariaController = require('./controllers/ContaBancariaController');
const CategoriaFinanceiraController = require('./controllers/CategoriaFinanceiraController');
const TituloFinanceiroController = require('./controllers/TituloFinanceiroController');
const RelatorioFinanceiroController = require('./controllers/RelatorioFinanceiroController');
const ConciliacaoBancariaController = require('./controllers/ConciliacaoBancariaController');
const ResultadoObrasController = require('./controllers/ResultadoObrasController');
const PermissoesAreasController = require('./controllers/PermissoesAreasController');
const BoletoController = require('./controllers/BoletoController');
const CrmLeadsController = require('./controllers/CrmLeadsController');
const CrmPipelineController = require('./controllers/CrmPipelineController');
const CrmTasksController = require('./controllers/CrmTasksController');
const CrmDashboardController = require('./controllers/CrmDashboardController');
const CrmAdminController = require('./controllers/CrmAdminController');
const CrmWebhookMetaController = require('./controllers/CrmWebhookMetaController');
const CrmWebhookGoogleController = require('./controllers/CrmWebhookGoogleController');
const CrmConversationsController = require('./controllers/CrmConversationsController');
const CrmAutomationController = require('./controllers/CrmAutomationController');
const { requireCrmModule } = require('./middlewares/crmAccess');
//console.log('AnexoController =>', AnexoController);

const loginRateLimit = createRateLimit({
  windowMs: Math.max(1, env.loginRateLimitWindowMinutes) * 60 * 1000,
  max: Math.max(1, env.loginRateLimitMaxAttempts),
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
  eventType: 'AUTH_RATE_LIMIT',
  resource: 'AUTH',
  keyGenerator: (req) =>
    `login:${String(req.body?.email || '').trim().toLowerCase()}:${req.ip || 'unknown'}`
});

const uploadRateLimit = createRateLimit({
  windowMs: Math.max(1, env.uploadRateLimitWindowMinutes) * 60 * 1000,
  max: Math.max(1, env.uploadRateLimitMaxAttempts),
  message: 'Muitos uploads em pouco tempo. Aguarde antes de tentar novamente.',
  eventType: 'UPLOAD_RATE_LIMIT',
  resource: 'UPLOAD'
});

const criticalRateLimit = createRateLimit({
  windowMs: Math.max(1, env.criticalRateLimitWindowMinutes) * 60 * 1000,
  max: Math.max(1, env.criticalRateLimitMaxAttempts),
  message: 'Muitas operacoes sensiveis em pouco tempo. Aguarde antes de tentar novamente.',
  eventType: 'CRITICAL_RATE_LIMIT',
  resource: 'ROUTE'
});

const crmWebhookRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Muitos eventos CRM recebidos em pouco tempo.',
  eventType: 'CRM_WEBHOOK_RATE_LIMIT',
  resource: 'CRM_WEBHOOK'
});

const d4signWebhookRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Muitos eventos D4Sign recebidos em pouco tempo.',
  eventType: 'D4SIGN_WEBHOOK_RATE_LIMIT',
  resource: 'D4SIGN_WEBHOOK'
});

const passwordChangeRateLimit = createRateLimit({
  windowMs: Math.max(1, env.passwordRateLimitWindowMinutes) * 60 * 1000,
  max: Math.max(1, env.passwordRateLimitMaxAttempts),
  message: 'Muitas tentativas de troca de senha. Aguarde antes de tentar novamente.',
  eventType: 'PASSWORD_CHANGE_RATE_LIMIT',
  resource: 'USER_PASSWORD',
  keyGenerator: (req) => `password-change:${req.user?.id || 'anon'}:${req.ip || 'unknown'}`
});


// -------------------------------------------------------------------
// AUTH
// -------------------------------------------------------------------
router.post('/login', loginRateLimit, validateRequest({ body: validateLoginBody }), AuthController.login);
router.post('/login/mfa', loginRateLimit, validateRequest({ body: validateMfaLoginBody }), AuthController.loginMfa);
router.get('/instalacao/publica', InstalacaoController.publica);
router.get('/configuracoes/tema', ConfiguracaoSistemaController.getTema);
router.post('/cotacoes/upload', requireEnabledModule('COTACOES', { allowSuperadminBypass: false }), uploadRateLimit, uploadComprovantes.single('file'), CotacaoFornecedorController.upload);
router.get('/cotacoes/:token/modelo', requireEnabledModule('COTACOES', { allowSuperadminBypass: false }), CotacaoFornecedorController.modelo);
router.get('/cotacoes/:token/modelo-xlsx', requireEnabledModule('COTACOES', { allowSuperadminBypass: false }), CotacaoFornecedorController.modeloXlsx);
router.get('/cotacoes/:token', requireEnabledModule('COTACOES', { allowSuperadminBypass: false }), CotacaoFornecedorController.show);
router.post('/cotacoes/:token', requireEnabledModule('COTACOES', { allowSuperadminBypass: false }), CotacaoFornecedorController.responder);
router.get('/crm/webhooks/meta', requireEnabledModule('CRM', { allowSuperadminBypass: false }), CrmWebhookMetaController.verify);
router.post('/crm/webhooks/meta', crmWebhookRateLimit, requireEnabledModule('CRM', { allowSuperadminBypass: false }), CrmWebhookMetaController.receive);
router.post('/crm/webhooks/google', crmWebhookRateLimit, requireEnabledModule('CRM', { allowSuperadminBypass: false }), CrmWebhookGoogleController.receive);
router.post('/webhooks/d4sign', d4signWebhookRateLimit, uploadComprovantes.none(), ComercialContratoDocumentoController.webhookD4Sign);
const auth = require('./middlewares/auth');
router.use(auth);
router.use(csrfProtection);
router.get('/auth/me', AuthController.me);
router.post('/auth/logout', AuthController.logout);
router.post('/auth/heartbeat', AuthController.heartbeat);
router.post('/auth/mfa/setup', AuthController.mfaSetup);
router.post('/auth/mfa/enable', validateRequest({ body: validateMfaCodeBody }), AuthController.mfaEnable);
router.post('/auth/mfa/disable', validateRequest({ body: validateMfaCodeBody }), AuthController.mfaDisable);
router.use(requireMfaCompletion);
router.get('/instalacao', permit(['SUPERADMIN']), InstalacaoController.show);
router.patch('/instalacao', permit(['SUPERADMIN']), InstalacaoController.update);
router.get('/usuarios-lista', UsuarioController.listaPublica);
router.use('/solicitacoes', requireEnabledModule('SOLICITACOES'));
router.use('/compras', requireEnabledModule('COMPRAS'));
router.use('/financeiro', requireEnabledModule('FINANCEIRO'));
router.use('/comprovantes', requireEnabledModule('FINANCEIRO'));
router.use('/contratos', requireEnabledModule('CONTRATOS'));
router.use('/comercial', requireEnabledModule('COMERCIAL'));
router.use('/provisoes-financeiras', requireEnabledModule('PROVISOES'));
router.use('/rh', requireEnabledModule('RH_DP'));
router.use('/integracoes/sienge', requireEnabledModule('INTEGRACAO_SIENGE'));
router.use('/boletos', requireEnabledModule('BOLETOS'));
router.use('/arquivos-modelos', requireEnabledModule('BIBLIOTECA_MODELOS'));
router.use('/conversas-internas', requireEnabledModule('COMUNICACAO_INTERNA'));

// -------------------------------------------------------------------
// ARQUIVOS MODELOS
// -------------------------------------------------------------------
router.get('/arquivos-modelos/contexto', ArquivoModeloController.contexto);
router.get('/arquivos-modelos/admins', ArquivoModeloController.listarAdmins);
router.get('/arquivos-modelos', ArquivoModeloController.listarArquivos);
router.post('/arquivos-modelos/upload', uploadRateLimit, uploadComprovantes.single('file'), ArquivoModeloController.upload);
router.get('/arquivos-modelos/:id/link', validateRequest({ params: validateNumericIdParam('id', 'Arquivo modelo') }), ArquivoModeloController.obterLink);
router.delete('/arquivos-modelos/:id', validateRequest({ params: validateNumericIdParam('id', 'Arquivo modelo') }), ArquivoModeloController.remover);
router.post('/arquivos-modelos/paginas', permit(['SUPERADMIN']), ArquivoModeloController.criarPagina);
router.patch('/arquivos-modelos/paginas', permit(['SUPERADMIN']), ArquivoModeloController.salvarPaginas);
router.patch('/arquivos-modelos/paginas/:codigo/ativar', permit(['SUPERADMIN']), ArquivoModeloController.ativarPagina);
router.patch('/arquivos-modelos/paginas/:codigo/desativar', permit(['SUPERADMIN']), ArquivoModeloController.desativarPagina);
router.patch('/arquivos-modelos/uploaders', permit(['SUPERADMIN']), ArquivoModeloController.salvarUploaders);

const allowGestaoUsuarios = permit({
  resource: 'USER_ADMIN',
  custom: async (req) => (
    (await canManageUsers(req.user))
      ? true
      : 'Acesso negado para gestao de usuarios'
  )
});

const allowFinanceiro = permit({
  resource: 'FINANCEIRO',
  custom: async (req) => (
    (await canAccessFinanceiro(req.user))
      ? true
      : 'Acesso negado para o modulo financeiro'
  )
});

const allowBoletosRead = permit({
  resource: 'BOLETOS',
  custom: async (req) => (
    (await canAccessBoletos(req.user))
      ? true
      : 'Acesso negado para boletos'
  )
});

const allowBoletosGenerate = permit({
  resource: 'BOLETOS',
  custom: async (req) => (
    (await canGenerateBoletos(req.user))
      ? true
      : 'Acesso negado para gerar boletos'
  )
});

const allowComercialEmpreendimentosRead = permit({
  resource: 'COMERCIAL',
  custom: async (req) => (
    (await canReadComercialBaseData(req.user))
      ? true
      : 'Acesso negado para empreendimentos comerciais'
  )
});

const allowComercialEmpreendimentosManage = permit({
  resource: 'COMERCIAL',
  custom: async (req) => (
    (await canManageComercialEmpreendimentos(req.user))
      ? true
      : 'Acesso negado para gerenciar empreendimentos comerciais'
  )
});

const allowComercialContratosRead = permit({
  resource: 'COMERCIAL',
  custom: async (req) => (
    (await canViewComercialContratos(req.user))
      ? true
      : 'Acesso negado para contratos comerciais'
  )
});

const allowComercialContratosCreate = permit({
  resource: 'COMERCIAL',
  custom: async (req) => (
    (await canCreateComercialContratos(req.user))
      ? true
      : 'Acesso negado para criar contratos comerciais'
  )
});

const allowComercialContratosManage = permit({
  resource: 'COMERCIAL',
  custom: async (req) => (
    (await canManageComercialContratos(req.user))
      ? true
      : 'Acesso negado para gerenciar contratos comerciais'
  )
});

const allowBusinessAdmin = permit(['SUPERADMIN', 'ADMINISTRADOR']);

router.get('/apropriacoes', requireAnyEnabledModule(['OBRAS', 'SOLICITACOES', 'COMPRAS', 'FINANCEIRO']), ApropriacaoController.index);
router.post('/apropriacoes', requireEnabledModule('OBRAS'), allowBusinessAdmin, ApropriacaoController.create);
router.put('/apropriacoes/:id', requireEnabledModule('OBRAS'), allowBusinessAdmin, ApropriacaoController.update);
router.delete('/apropriacoes/:id', requireEnabledModule('OBRAS'), allowBusinessAdmin, ApropriacaoController.destroy);
const allowProvisoesModule = permit({
  resource: 'PROVISOES',
  custom: async (req) => (
    (await canAccessProvisoes(req.user))
      ? true
      : 'Acesso negado para o modulo de provisionamento'
  )
});
const allowProvisoesRead = permit({
  resource: 'PROVISOES',
  custom: async (req) => (
    (await canViewProvisoes(req.user))
      ? true
      : 'Acesso negado para o modulo de provisionamento'
  )
});
const allowProvisoesCreate = permit({
  resource: 'PROVISOES',
  custom: async (req) => (
    (await canCreateProvisoes(req.user))
      ? true
      : 'Acesso negado para criar provisionamentos'
  )
});
const allowProvisoesEdit = permit({
  resource: 'PROVISOES',
  custom: async (req) => (
    (await canEditProvisoes(req.user))
      ? true
      : 'Acesso negado para editar provisionamentos'
  )
});
const allowProvisoesDashboard = permit({
  resource: 'PROVISOES',
  custom: async (req) => (
    (await canViewProvisoesDashboard(req.user))
      ? true
      : 'Acesso negado para o dashboard de provisionamentos'
  )
});
const allowProvisoesCategorias = permit({
  resource: 'PROVISOES',
  custom: async (req) => (
    (await canManageProvisoesCategorias(req.user))
      ? true
      : 'Acesso negado para gerenciar categorias macro de provisionamento'
  )
});
const allowCrmLeadExport = permit({
  resource: 'CRM_LEADS_EXPORT',
  custom: async (req) => (
    (await canExportCrmLeads(req.user))
      ? true
      : 'Acesso negado para exportar leads do CRM'
  )
});
const allowCrmLeadRedistribute = permit({
  resource: 'CRM_LEADS_REDISTRIBUTE',
  custom: async (req) => (
    (await canRedistributeCrmLeads(req.user))
      ? true
      : 'Acesso negado para redistribuir leads do CRM'
  )
});
const allowCrmDashboardRead = permit({
  resource: 'CRM_DASHBOARD',
  custom: async (req) => (
    (await canViewCrmDashboard(req.user))
      ? true
      : 'Acesso negado para dashboards do CRM'
  )
});
const allowCrmLeadsRead = permit({
  resource: 'CRM_LEADS',
  custom: async (req) => (
    (await canViewCrmLeads(req.user))
      ? true
      : 'Acesso negado para leads do CRM'
  )
});
const allowCrmLeadsWrite = permit({
  resource: 'CRM_LEADS',
  custom: async (req) => (
    (await canCreateCrmLeads(req.user))
      ? true
      : 'Acesso negado para criar ou editar leads do CRM'
  )
});
const allowCrmAtendimentoRead = permit({
  resource: 'CRM_ATENDIMENTO',
  custom: async (req) => (
    (await canViewCrmAtendimento(req.user))
      ? true
      : 'Acesso negado para atendimento do CRM'
  )
});
const allowCrmAtendimentoSend = permit({
  resource: 'CRM_ATENDIMENTO',
  custom: async (req) => (
    (await canSendCrmAtendimento(req.user))
      ? true
      : 'Acesso negado para enviar mensagens no atendimento do CRM'
  )
});
const allowCrmAutomacoesRead = permit({
  resource: 'CRM_AUTOMACOES',
  custom: async (req) => (
    (await canViewCrmAutomacoes(req.user))
      ? true
      : 'Acesso negado para automacoes do CRM'
  )
});
const allowCrmAutomacoesManage = permit({
  resource: 'CRM_AUTOMACOES',
  custom: async (req) => (
    (await canManageCrmAutomacoes(req.user))
      ? true
      : 'Acesso negado para gerenciar automacoes do CRM'
  )
});
const allowCrmConfiguracoesRead = permit({
  resource: 'CRM_CONFIGURACOES',
  custom: async (req) => (
    (await canViewCrmConfiguracoes(req.user))
      ? true
      : 'Acesso negado para configuracoes do CRM'
  )
});
const allowCrmConfiguracoesManage = permit({
  resource: 'CRM_CONFIGURACOES',
  custom: async (req) => (
    (await canManageCrmConfiguracoes(req.user))
      ? true
      : 'Acesso negado para gerenciar configuracoes do CRM'
  )
});
const allowRhDpEmpresasManage = permit({
  resource: 'RH_DP_EMPRESAS',
  custom: async (req) => (
    (await canManageRhDpEmpresas(req.user))
      ? true
      : 'Acesso negado para empresas do RH/DP'
  )
});
const allowRhDpColaboradoresRead = permit({
  resource: 'RH_DP_COLABORADORES',
  custom: async (req) => (
    (await canViewRhDpColaboradores(req.user))
      ? true
      : 'Acesso negado para colaboradores do RH/DP'
  )
});
const allowRhDpColaboradoresWrite = permit({
  resource: 'RH_DP_COLABORADORES',
  custom: async (req) => (
    (await canManageRhDpColaboradores(req.user))
      ? true
      : 'Acesso negado para edicao de colaboradores do RH/DP'
  )
});
const allowRhDpDocumentosRead = permit({
  resource: 'RH_DP_DOCUMENTOS',
  custom: async (req) => (
    (await canViewRhDpDocumentos(req.user))
      ? true
      : 'Acesso negado para documentos do RH/DP'
  )
});
const allowRhDpDocumentosWrite = permit({
  resource: 'RH_DP_DOCUMENTOS',
  custom: async (req) => (
    (await canManageRhDpDocumentos(req.user))
      ? true
      : 'Acesso negado para gestao de documentos do RH/DP'
  )
});
const allowRhDpImportacoes = permit({
  resource: 'RH_DP_IMPORTACOES',
  custom: async (req) => (
    (await canExecuteRhDpImportacoes(req.user))
      ? true
      : 'Acesso negado para importacoes do RH/DP'
  )
});
const allowRhDpApuracaoRead = permit({
  resource: 'RH_DP_APURACAO',
  custom: async (req) => (
    (await canViewRhDpApuracao(req.user))
      ? true
      : 'Acesso negado para apuracao do RH/DP'
  )
});
const allowRhDpApuracaoWrite = permit({
  resource: 'RH_DP_APURACAO',
  custom: async (req) => (
    (await canEditRhDpApuracao(req.user))
      ? true
      : 'Acesso negado para ajuste da apuracao do RH/DP'
  )
});
const allowRhDpObrigacoesRead = permit({
  resource: 'RH_DP_FECHAMENTOS',
  custom: async (req) => (
    (await canViewRhDpObrigacoes(req.user))
      ? true
      : 'Acesso negado para obrigacoes do RH/DP'
  )
});
const allowRhDpFechamentoExecute = permit({
  resource: 'RH_DP_FECHAMENTOS',
  custom: async (req) => (
    (await canExecuteRhDpFechamento(req.user))
      ? true
      : 'Acesso negado para fechamento da competencia do RH/DP'
  )
});
const allowRhDpFechamentoReopen = permit({
  resource: 'RH_DP_FECHAMENTOS',
  custom: async (req) => (
    (await canReopenRhDpFechamento(req.user))
      ? true
      : 'Acesso negado para reabrir fechamento do RH/DP'
  )
});
const allowIntegracaoSiengeRead = permit({
  resource: 'INTEGRACAO_SIENGE',
  custom: async (req) => (
    (await canViewIntegracaoSienge(req.user))
      ? true
      : 'Acesso negado para a Integracao SIENGE'
  )
});
const allowIntegracaoSiengeRetry = permit({
  resource: 'INTEGRACAO_SIENGE',
  custom: async (req) => (
    (await canRetryIntegracaoSienge(req.user))
      ? true
      : 'Acesso negado para operar a fila da Integracao SIENGE'
  )
});
const allowIntegracaoSiengeConfigManage = permit({
  resource: 'INTEGRACAO_SIENGE',
  custom: async (req) => (
    (await canManageIntegracaoSiengeConfig(req.user))
      ? true
      : 'Acesso negado para configurar a Integracao SIENGE'
  )
});


// -------------------------------------------------------------------
// SOLICITAÇÕES
// -------------------------------------------------------------------

router.post('/solicitacoes', validateRequest({ body: validateSolicitacaoCreateBody }), SolicitacaoController.create);
router.get('/solicitacoes/filtros/obras', SolicitacaoController.obrasVisiveis);
router.get('/solicitacoes', SolicitacaoController.index);
router.get('/solicitacoes/resumo', SolicitacaoController.resumo);
router.get('/solicitacoes/:id', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao') }), SolicitacaoController.show);
router.patch('/solicitacoes/:id/status', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao'), body: validateSolicitacaoStatusBody }), auditSuccess({ eventType: 'SOLICITACAO_STATUS_UPDATED', resourceType: 'SOLICITACAO', description: 'Status da solicitacao atualizado', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.updateStatus);
router.post('/solicitacoes/:id/aprovar-diretoria', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao') }), auditSuccess({ eventType: 'SOLICITACAO_DIRETORIA_APPROVED', resourceType: 'SOLICITACAO', description: 'Solicitacao aprovada pela diretoria', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.aprovarDiretoria);
router.post('/solicitacoes/:id/pagamentos', requireEnabledModule('FINANCEIRO'), validateRequest({ params: validateNumericIdParam('id', 'Solicitacao') }), auditSuccess({ eventType: 'SOLICITACAO_PAYMENT_ADDED', resourceType: 'SOLICITACAO', description: 'Pagamento informado na solicitacao', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.adicionarPagamento);
router.patch('/solicitacoes/:id/pedido', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao'), body: validateSolicitacaoPedidoBody }), auditSuccess({ eventType: 'SOLICITACAO_PEDIDO_UPDATED', resourceType: 'SOLICITACAO', description: 'Numero do pedido atualizado', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.atualizarNumeroPedido);
router.patch('/solicitacoes/:id/ref-contrato', requireEnabledModule('CONTRATOS'), validateRequest({ params: validateNumericIdParam('id', 'Solicitacao'), body: validateSolicitacaoRefContratoBody }), auditSuccess({ eventType: 'SOLICITACAO_CONTRATO_UPDATED', resourceType: 'SOLICITACAO', description: 'Referencia de contrato atualizada', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.atualizarRefContrato);
router.patch('/solicitacoes/:id/valor', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao'), body: validateSolicitacaoValorBody }), auditSuccess({ eventType: 'SOLICITACAO_VALOR_UPDATED', resourceType: 'SOLICITACAO', description: 'Valor da solicitacao atualizado', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.atualizarValor);
router.patch('/solicitacoes/arquivar-massa', validateRequest({ body: validateSolicitacaoArquivarMassaBody }), auditSuccess({ eventType: 'SOLICITACAO_ARCHIVED_BATCH', resourceType: 'SOLICITACAO', description: 'Solicitacoes arquivadas em massa', metadataResolver: (req) => ({ solicitacao_ids: req.body?.solicitacao_ids || [] }) }), SolicitacaoController.arquivarEmMassa);
router.post('/solicitacoes/enviar-setor-massa', validateRequest({ body: validateSolicitacaoEnviarSetorMassaBody }), auditSuccess({ eventType: 'SOLICITACAO_SENT_BATCH', resourceType: 'SOLICITACAO', description: 'Solicitacoes enviadas em massa para outro setor', metadataResolver: (req) => ({ solicitacao_ids: req.body?.solicitacao_ids || [], setor_destino: req.body?.setor_destino || null }) }), SolicitacaoController.enviarParaSetorEmMassa);
router.post('/solicitacoes/:id/comentarios', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao'), body: validateSolicitacaoComentarioBody }), auditSuccess({ eventType: 'SOLICITACAO_COMMENTED', resourceType: 'SOLICITACAO', description: 'Comentario adicionado na solicitacao', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.adicionarComentario);
router.post('/solicitacoes/:id/enviar-setor', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao'), body: validateSolicitacaoEnviarSetorBody }), auditSuccess({ eventType: 'SOLICITACAO_SENT_TO_SECTOR', resourceType: 'SOLICITACAO', description: 'Solicitacao enviada para outro setor', resourceIdResolver: (req) => req.params.id, metadataResolver: (req) => ({ setor_destino: req.body?.setor_destino || null }) }), SolicitacaoController.enviarParaSetor);
router.post('/solicitacoes/:id/assumir', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao') }), auditSuccess({ eventType: 'SOLICITACAO_ASSUMED', resourceType: 'SOLICITACAO', description: 'Solicitacao assumida', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.assumirSolicitacao);
router.patch('/solicitacoes/:id/ocultar', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao') }), auditSuccess({ eventType: 'SOLICITACAO_HIDDEN', resourceType: 'SOLICITACAO', description: 'Solicitacao ocultada pelo usuario', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.ocultarDaMinhaLista);
router.patch('/solicitacoes/:id/arquivar', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao') }), auditSuccess({ eventType: 'SOLICITACAO_HIDDEN', resourceType: 'SOLICITACAO', description: 'Solicitacao arquivada pelo usuario', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.ocultarDaMinhaLista);
router.patch('/solicitacoes/:id/desarquivar', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao') }), auditSuccess({ eventType: 'SOLICITACAO_UNHIDDEN', resourceType: 'SOLICITACAO', description: 'Solicitacao desarquivada pelo usuario', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.desarquivarDaMinhaLista);
router.delete('/solicitacoes/:id', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao') }), auditSuccess({ eventType: 'SOLICITACAO_DELETED', resourceType: 'SOLICITACAO', description: 'Solicitacao excluida', resourceIdResolver: (req) => req.params.id }), SolicitacaoController.excluir);

router.get('/prioridades-diretoria/contexto', requireEnabledModule('SOLICITACOES'), PrioridadeDiretoriaController.contexto);
router.get('/prioridades-diretoria/lotes', requireEnabledModule('SOLICITACOES'), PrioridadeDiretoriaController.index);
router.post('/prioridades-diretoria/lotes', requireEnabledModule('SOLICITACOES'), auditSuccess({ eventType: 'DIRETORIA_PRIORITY_BATCH_CREATED', resourceType: 'PRIORIDADE_DIRETORIA', description: 'Lote de prioridade da diretoria criado' }), PrioridadeDiretoriaController.create);
router.get('/prioridades-diretoria/lotes/:id', requireEnabledModule('SOLICITACOES'), validateRequest({ params: validateNumericIdParam('id', 'Lote de prioridade') }), PrioridadeDiretoriaController.show);
router.get('/prioridades-diretoria/lotes/:id/solicitacoes-disponiveis', requireEnabledModule('SOLICITACOES'), validateRequest({ params: validateNumericIdParam('id', 'Lote de prioridade') }), PrioridadeDiretoriaController.solicitacoesDisponiveis);
router.post('/prioridades-diretoria/lotes/:id/finalizar', requireEnabledModule('SOLICITACOES'), validateRequest({ params: validateNumericIdParam('id', 'Lote de prioridade') }), auditSuccess({ eventType: 'DIRETORIA_PRIORITY_BATCH_CLOSED', resourceType: 'PRIORIDADE_DIRETORIA', description: 'Lote de prioridade da diretoria finalizado', resourceIdResolver: (req) => req.params.id }), PrioridadeDiretoriaController.finalizar);
router.post('/prioridades-diretoria/lotes/:id/cancelar', requireEnabledModule('SOLICITACOES'), validateRequest({ params: validateNumericIdParam('id', 'Lote de prioridade') }), PrioridadeDiretoriaController.cancelar);
router.delete('/prioridades-diretoria/lotes/:id', requireEnabledModule('SOLICITACOES'), validateRequest({ params: validateNumericIdParam('id', 'Lote de prioridade') }), PrioridadeDiretoriaController.excluir);
router.get('/solicitacoes/:id/titulos-financeiros', allowFinanceiro, validateRequest({ params: validateNumericIdParam('id', 'Solicitacao') }), TituloFinanceiroController.listarPorSolicitacao);
router.post('/solicitacoes/:id/gerar-conta', requireEnabledModule('FINANCEIRO'), allowFinanceiro, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Solicitacao'), body: validateFinanceTituloCreateFromSolicitacaoBody }), TituloFinanceiroController.criarPorSolicitacao);

// -------------------------------------------------------------------
// NOTIFICACOES
// -------------------------------------------------------------------
router.get('/notificacoes', NotificacaoController.index);
router.patch('/notificacoes/:id/lida', NotificacaoController.marcarLida);
router.patch('/notificacoes/lidas', NotificacaoController.marcarTodasLidas);



// -------------------------------------------------------------------
// ANEXOS (UPLOAD DENTRO DA SOLICITAÇÃO)
// -------------------------------------------------------------------

router.post(
  '/anexos/upload',
  uploadRateLimit,
  uploadComprovantes.array('files'),
  AnexoController.upload
);

router.get(
  '/anexos/presign',
  validateRequest({ query: validatePresignQuery }),
  AnexoController.presign
);

router.delete(
  '/anexos/historico/:historicoId',
  validateRequest({ params: validateNumericIdParam('historicoId', 'Historico') }),
  AnexoController.remover
);

router.get(
  '/solicitacoes/:id/anexos',
  AnexoController.listarPorSolicitacao
);
// -------------------------------------------------------------------
// COMPROVANTES
// -------------------------------------------------------------------
const allowComprovantes = permit({
  resource: 'COMPROVANTE',
  custom: async (req) => (
    (await canAccessComprovantes(req.user))
      ? true
      : 'Acesso negado para comprovantes'
  )
});

router.post(
  '/comprovantes/upload-massa',
  allowComprovantes,
  uploadRateLimit,
  uploadComprovantes.array('files'),
  ComprovanteController.uploadMassa
);

router.get(
  '/comprovantes/solicitacoes',
  allowComprovantes,
  ComprovanteController.solicitacoes
);

router.get(
  '/comprovantes/pendentes',
  allowComprovantes,
  ComprovanteController.pendentes
);

router.post(
  '/comprovantes/:id/vincular',
  allowComprovantes,
  validateRequest({ params: validateNumericIdParam('id', 'Comprovante') }),
  ComprovanteController.vincular
);

router.delete(
  '/comprovantes/:id',
  allowComprovantes,
  validateRequest({ params: validateNumericIdParam('id', 'Comprovante') }),
  ComprovanteController.remover
);
// -------------------------------------------------------------------
// USUÁRIOS
// -------------------------------------------------------------------

router.get('/usuarios', allowGestaoUsuarios, UsuarioController.index);
router.get('/usuarios/opcoes-atribuicao', UsuarioController.opcoesAtribuicao);
router.get('/usuarios/:id', allowGestaoUsuarios, validateRequest({ params: validateNumericIdParam('id', 'Usuario') }), UsuarioController.show);
router.post('/usuarios', allowGestaoUsuarios, UsuarioController.create);
router.post('/usuarios/importar-massa', allowGestaoUsuarios, uploadRateLimit, uploadComprovantes.single('file'), UsuarioController.importarMassa);
router.put('/usuarios/:id', allowGestaoUsuarios, validateRequest({ params: validateNumericIdParam('id', 'Usuario') }), UsuarioController.update);
router.patch('/usuarios/me/senha', passwordChangeRateLimit, validateRequest({ body: validatePasswordChangeBody }), UsuarioController.alterarSenha);
router.patch('/usuarios/:id/ativar', allowGestaoUsuarios, validateRequest({ params: validateNumericIdParam('id', 'Usuario') }), UsuarioController.ativar);
router.patch('/usuarios/:id/desativar', allowGestaoUsuarios, validateRequest({ params: validateNumericIdParam('id', 'Usuario') }), UsuarioController.desativar);
router.post('/solicitacoes/:id/atribuir', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao'), body: validateSolicitacaoResponsavelBody }), auditSuccess({ eventType: 'SOLICITACAO_ASSIGNED', resourceType: 'SOLICITACAO', description: 'Responsavel atribuido a solicitacao', resourceIdResolver: (req) => req.params.id, metadataResolver: (req) => ({ usuario_responsavel_id: req.body?.usuario_responsavel_id || null }) }), SolicitacaoController.atribuirResponsavel);




// -------------------------------------------------------------------
// CARGOS
// -------------------------------------------------------------------

router.get('/cargos', CargoController.index);
router.post('/cargos', allowBusinessAdmin, validateRequest({ body: validateCargoCreateBody }), CargoController.create);
router.patch('/cargos/:id', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Cargo'), body: validateCargoUpdateBody }), CargoController.update);
router.patch('/cargos/:id/ativar', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Cargo') }), CargoController.ativar);
router.patch('/cargos/:id/desativar', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Cargo') }), CargoController.desativar);

// -------------------------------------------------------------------
// SETORES
// -------------------------------------------------------------------

router.get('/setores', SetorController.index);
router.post('/setores', allowBusinessAdmin, validateRequest({ body: validateSetorCreateBody }), SetorController.create);
router.patch('/setores/:id', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Setor'), body: validateSetorUpdateBody }), SetorController.update);
router.patch('/setores/:id/ativar', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Setor') }), SetorController.ativar);
router.patch('/setores/:id/desativar', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Setor') }), SetorController.desativar);

// -------------------------------------------------------------------
// OBRAS
// -------------------------------------------------------------------

router.get('/obras', ObraController.index);
router.get('/obras/minhas', ObraController.minhas);
router.get('/obras/gestao', requireEnabledModule('OBRAS'), ObraController.gestaoIndex);
router.get('/obras/:id/gestao', requireEnabledModule('OBRAS'), validateRequest({ params: validateNumericIdParam('id', 'Obra') }), ObraController.gestaoShow);
router.post('/obras', allowBusinessAdmin, ObraController.create);
router.patch('/obras/:id', allowBusinessAdmin, ObraController.update);
router.patch('/obras/:id/ativar', allowBusinessAdmin, ObraController.ativar);
router.patch('/obras/:id/desativar', allowBusinessAdmin, ObraController.desativar);

// -------------------------------------------------------------------
// PARCEIROS
// -------------------------------------------------------------------

router.get('/parceiros/categorias', ParceiroCategoriaController.index);
router.post('/parceiros/categorias', allowBusinessAdmin, ParceiroCategoriaController.create);
router.patch('/parceiros/categorias/:id', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Categoria de parceiro') }), ParceiroCategoriaController.update);
router.delete('/parceiros/categorias/:id', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Categoria de parceiro') }), ParceiroCategoriaController.destroy);
router.get('/parceiros', ParceiroController.index);
router.get('/parceiros/:id', validateRequest({ params: validateNumericIdParam('id', 'Parceiro') }), ParceiroController.show);
router.post('/parceiros', allowBusinessAdmin, ParceiroController.create);
router.patch('/parceiros/:id', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Parceiro') }), ParceiroController.update);

// -------------------------------------------------------------------
// COMERCIAL
// -------------------------------------------------------------------
router.get('/comercial/empreendimentos', allowComercialEmpreendimentosRead, validateRequest({ query: validateComercialEmpreendimentoQuery }), ComercialEmpreendimentoController.index);
router.post('/comercial/empreendimentos', allowComercialEmpreendimentosManage, criticalRateLimit, validateRequest({ body: validateComercialEmpreendimentoCreateBody }), ComercialEmpreendimentoController.create);
router.patch('/comercial/empreendimentos/:id', allowComercialEmpreendimentosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Empreendimento'), body: validateComercialEmpreendimentoUpdateBody }), ComercialEmpreendimentoController.update);
router.get('/comercial/unidades', allowComercialEmpreendimentosRead, validateRequest({ query: validateComercialUnidadeQuery }), ComercialUnidadeController.index);
router.post('/comercial/unidades', allowComercialEmpreendimentosManage, criticalRateLimit, validateRequest({ body: validateComercialUnidadeCreateBody }), ComercialUnidadeController.create);
router.patch('/comercial/unidades/:id', allowComercialEmpreendimentosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Unidade comercial'), body: validateComercialUnidadeUpdateBody }), ComercialUnidadeController.update);
router.get('/comercial/tabelas-preco', allowComercialEmpreendimentosRead, validateRequest({ query: validateComercialTabelaPrecoQuery }), ComercialTabelaPrecoController.index);
router.post('/comercial/tabelas-preco', allowComercialEmpreendimentosManage, criticalRateLimit, validateRequest({ body: validateComercialTabelaPrecoCreateBody }), ComercialTabelaPrecoController.create);
router.patch('/comercial/tabelas-preco/:id', allowComercialEmpreendimentosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Tabela de preco comercial'), body: validateComercialTabelaPrecoUpdateBody }), ComercialTabelaPrecoController.update);
router.post('/comercial/tabelas-preco/:id/ativar', allowComercialEmpreendimentosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Tabela de preco comercial') }), ComercialTabelaPrecoController.ativar);
router.get('/comercial/contratos-variaveis', allowComercialContratosRead, ComercialContratoDocumentoController.variaveis);
router.get('/comercial/contratos-modelos', allowComercialContratosRead, ComercialContratoDocumentoController.listarModelos);
router.post('/comercial/contratos-modelos', allowComercialContratosManage, uploadRateLimit, uploadComprovantes.single('file'), ComercialContratoDocumentoController.criarModelo);
router.get('/comercial/contratos-documentos/:documentoId/link', allowComercialContratosRead, validateRequest({ params: validateNumericIdParam('documentoId', 'Documento comercial') }), ComercialContratoDocumentoController.obterLink);
router.post('/comercial/contratos-documentos/:documentoId/enviar-d4sign', allowComercialContratosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('documentoId', 'Documento comercial') }), ComercialContratoDocumentoController.enviarD4Sign);
router.delete('/comercial/contratos-documentos/:documentoId', allowComercialContratosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('documentoId', 'Documento comercial') }), ComercialContratoDocumentoController.excluirDocumento);
router.get('/comercial/contratos', allowComercialContratosRead, validateRequest({ query: validateComercialContratoQuery }), ComercialContratoController.index);
router.get('/comercial/contratos/:id', allowComercialContratosRead, validateRequest({ params: validateNumericIdParam('id', 'Contrato comercial') }), ComercialContratoController.show);
router.post('/comercial/contratos', allowComercialContratosCreate, criticalRateLimit, validateRequest({ body: validateComercialContratoCreateBody }), ComercialContratoController.create);
router.patch('/comercial/contratos/:id', allowComercialContratosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Contrato comercial'), body: validateComercialContratoUpdateBody }), ComercialContratoController.update);
router.delete('/comercial/contratos/:id', allowComercialContratosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Contrato comercial') }), ComercialContratoController.destroy);
router.post('/comercial/contratos/:id/distrato', allowComercialContratosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Contrato comercial'), body: validateComercialContratoDistratoBody }), ComercialContratoController.distratar);
router.post('/comercial/contratos/:id/troca-unidade', allowComercialContratosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Contrato comercial'), body: validateComercialContratoTrocaUnidadeBody }), ComercialContratoController.trocarUnidade);
router.post('/comercial/contratos/:id/sincronizar-status-financeiro', allowComercialContratosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Contrato comercial') }), ComercialContratoController.sincronizarStatusFinanceiro);
router.get('/comercial/contratos/:id/documentos', allowComercialContratosRead, validateRequest({ params: validateNumericIdParam('id', 'Contrato comercial') }), ComercialContratoDocumentoController.listarDocumentosContrato);
router.post('/comercial/contratos/:id/documentos/gerar', allowComercialContratosManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Contrato comercial') }), ComercialContratoDocumentoController.gerarDocumento);

// -------------------------------------------------------------------
// PROVISIONAMENTO FINANCEIRO
// -------------------------------------------------------------------
router.get('/provisoes-financeiras/contexto', allowProvisoesModule, ProvisaoFinanceiraController.contexto);
router.get('/provisoes-financeiras/dashboard/resumo', allowProvisoesDashboard, validateRequest({ query: validateProvisaoDashboardQuery }), ProvisaoFinanceiraDashboardController.resumo);
router.get('/provisoes-financeiras/categorias', allowProvisoesModule, validateRequest({ query: validateProvisaoCategoriaQuery }), ProvisaoCategoriaMacroController.index);
router.post('/provisoes-financeiras/categorias', allowProvisoesCategorias, criticalRateLimit, validateRequest({ body: validateProvisaoCategoriaCreateBody }), ProvisaoCategoriaMacroController.create);
router.put('/provisoes-financeiras/categorias/:id', allowProvisoesCategorias, criticalRateLimit, validateRequest({ params: validateProvisaoIdParams, body: validateProvisaoCategoriaUpdateBody }), ProvisaoCategoriaMacroController.update);
router.patch('/provisoes-financeiras/categorias/:id/ativar', allowProvisoesCategorias, criticalRateLimit, validateRequest({ params: validateProvisaoIdParams }), ProvisaoCategoriaMacroController.ativar);
router.patch('/provisoes-financeiras/categorias/:id/desativar', allowProvisoesCategorias, criticalRateLimit, validateRequest({ params: validateProvisaoIdParams }), ProvisaoCategoriaMacroController.desativar);
router.get('/provisoes-financeiras/anexos/:anexoId/link', allowProvisoesRead, validateRequest({ params: validateProvisaoAnexoLinkParams }), ProvisaoFinanceiraController.obterLinkAnexo);
router.get('/provisoes-financeiras', allowProvisoesRead, validateRequest({ query: validateProvisaoFinanceiraQuery }), ProvisaoFinanceiraController.index);
router.post('/provisoes-financeiras', allowProvisoesCreate, criticalRateLimit, validateRequest({ body: validateProvisaoFinanceiraCreateBody }), ProvisaoFinanceiraController.create);
router.get('/provisoes-financeiras/:id', allowProvisoesRead, validateRequest({ params: validateProvisaoIdParams }), ProvisaoFinanceiraController.show);
router.put('/provisoes-financeiras/:id', allowProvisoesEdit, criticalRateLimit, validateRequest({ params: validateProvisaoIdParams, body: validateProvisaoFinanceiraUpdateBody }), ProvisaoFinanceiraController.update);
router.get('/provisoes-financeiras/:id/anexos', allowProvisoesRead, validateRequest({ params: validateProvisaoIdParams }), ProvisaoFinanceiraController.listarAnexos);
router.post('/provisoes-financeiras/:id/anexos', allowProvisoesEdit, uploadRateLimit, uploadComprovantes.array('files'), validateRequest({ params: validateProvisaoIdParams }), ProvisaoFinanceiraController.uploadAnexos);
router.post('/provisoes-financeiras/:id/comentarios', allowProvisoesEdit, criticalRateLimit, validateRequest({ params: validateProvisaoIdParams, body: validateProvisaoComentarioBody }), ProvisaoFinanceiraController.adicionarComentario);

// -------------------------------------------------------------------
// RH/DP - BLOCO 2
// -------------------------------------------------------------------
router.get('/rh/empresas-grupo', allowRhDpEmpresasManage, validateRequest({ query: validateRhEmpresaGrupoQuery }), RhEmpresaGrupoController.index);
router.post('/rh/empresas-grupo', allowRhDpEmpresasManage, criticalRateLimit, validateRequest({ body: validateRhEmpresaGrupoCreateBody }), RhEmpresaGrupoController.create);
router.patch('/rh/empresas-grupo/:id', allowRhDpEmpresasManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Empresa do grupo RH/DP'), body: validateRhEmpresaGrupoUpdateBody }), RhEmpresaGrupoController.update);
router.get('/rh/colaboradores', allowRhDpColaboradoresRead, validateRequest({ query: validateRhColaboradorQuery }), RhColaboradorController.index);
router.get('/rh/colaboradores/:id', allowRhDpColaboradoresRead, validateRequest({ params: validateNumericIdParam('id', 'Colaborador RH/DP') }), RhColaboradorController.show);
router.post('/rh/colaboradores', allowRhDpColaboradoresWrite, criticalRateLimit, validateRequest({ body: validateRhColaboradorCreateBody }), RhColaboradorController.create);
router.patch('/rh/colaboradores/:id', allowRhDpColaboradoresWrite, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Colaborador RH/DP'), body: validateRhColaboradorUpdateBody }), RhColaboradorController.update);
router.post('/rh/colaboradores/importar-massa', allowRhDpColaboradoresWrite, uploadRateLimit, uploadComprovantes.single('file'), RhColaboradorController.importarMassa);
router.get('/rh/documentos/tipos', allowRhDpDocumentosRead, validateRequest({ query: validateRhDocumentoTipoQuery }), RhDocumentoController.listarTipos);
router.get('/rh/documentos', allowRhDpDocumentosRead, validateRequest({ query: validateRhDocumentoQuery }), RhDocumentoController.index);
router.get('/rh/documentos/:id', allowRhDpDocumentosRead, validateRequest({ params: validateNumericIdParam('id', 'Documento RH/DP') }), RhDocumentoController.show);
router.get('/rh/documentos/:id/link', allowRhDpDocumentosRead, validateRequest({ params: validateNumericIdParam('id', 'Documento RH/DP') }), RhDocumentoController.obterLink);
router.post('/rh/documentos', allowRhDpDocumentosWrite, uploadRateLimit, uploadComprovantes.single('file'), validateRequest({ body: validateRhDocumentoCreateBody }), RhDocumentoController.create);
router.patch('/rh/documentos/:id', allowRhDpDocumentosWrite, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Documento RH/DP'), body: validateRhDocumentoUpdateBody }), RhDocumentoController.update);
router.post('/rh/documentos/:id/substituir', allowRhDpDocumentosWrite, uploadRateLimit, uploadComprovantes.single('file'), validateRequest({ params: validateNumericIdParam('id', 'Documento RH/DP'), body: validateRhDocumentoUpdateBody }), RhDocumentoController.substituir);
router.get('/rh/importacoes', allowRhDpImportacoes, validateRequest({ query: validateRhImportacaoQuery }), RhImportacaoController.index);
router.get('/rh/importacoes/:id', allowRhDpImportacoes, validateRequest({ params: validateNumericIdParam('id', 'Importacao RH/DP') }), RhImportacaoController.show);
router.post('/rh/importacoes/preview', allowRhDpImportacoes, uploadRateLimit, uploadComprovantes.single('file'), validateRequest({ body: validateRhImportacaoCreateBody }), RhImportacaoController.createPreview);
router.post('/rh/importacoes/:id/confirmar', allowRhDpImportacoes, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Importacao RH/DP') }), RhImportacaoController.confirmar);
router.get('/rh/apuracoes', allowRhDpApuracaoRead, validateRequest({ query: validateRhApuracaoQuery }), RhApuracaoController.index);
router.get('/rh/apuracoes/:id', allowRhDpApuracaoRead, validateRequest({ params: validateNumericIdParam('id', 'Apuracao RH/DP') }), RhApuracaoController.show);
router.post('/rh/apuracoes', allowRhDpApuracaoWrite, criticalRateLimit, validateRequest({ body: validateRhApuracaoCreateBody }), RhApuracaoController.create);
router.patch('/rh/apuracoes/:id/itens/:itemId', allowRhDpApuracaoWrite, criticalRateLimit, validateRequest({ params: validateRhApuracaoItemParams, body: validateRhApuracaoItemUpdateBody }), RhApuracaoController.updateItem);
router.post('/rh/apuracoes/:id/conferir', allowRhDpApuracaoWrite, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Apuracao RH/DP') }), RhApuracaoController.conferir);
router.get('/rh/fechamentos', requireEnabledModule('FINANCEIRO'), allowRhDpObrigacoesRead, validateRequest({ query: validateRhFechamentoQuery }), RhFechamentoController.index);
router.get('/rh/fechamentos/:id', requireEnabledModule('FINANCEIRO'), allowRhDpObrigacoesRead, validateRequest({ params: validateNumericIdParam('id', 'Fechamento RH/DP') }), RhFechamentoController.show);
router.post('/rh/fechamentos/:id/reabrir', requireEnabledModule('FINANCEIRO'), allowRhDpFechamentoReopen, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Fechamento RH/DP'), body: validateRhReabrirFechamentoBody }), RhFechamentoController.reabrir);
router.post('/rh/apuracoes/:id/fechar', requireEnabledModule('FINANCEIRO'), allowRhDpFechamentoExecute, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Apuracao RH/DP'), body: validateRhFecharApuracaoBody }), RhFechamentoController.fecharApuracao);

// -------------------------------------------------------------------
// INTEGRACAO SIENGE
// -------------------------------------------------------------------
router.get('/integracoes/sienge/config', allowIntegracaoSiengeRead, IntegracaoSiengeController.config);
router.patch('/integracoes/sienge/config', allowIntegracaoSiengeConfigManage, criticalRateLimit, validateRequest({ body: validateSiengeConfigBody }), IntegracaoSiengeController.atualizarConfig);
router.get('/integracoes/sienge/saude', allowIntegracaoSiengeRead, IntegracaoSiengeController.saude);
router.get('/integracoes/sienge/credores/parceiros/:parceiroId/contexto', allowIntegracaoSiengeRead, validateRequest({ params: validateNumericIdParam('parceiroId', 'Parceiro') }), IntegracaoSiengeController.credorParceiroContexto);
router.post('/integracoes/sienge/credores/parceiros/:parceiroId/buscar', allowIntegracaoSiengeRetry, criticalRateLimit, validateRequest({ params: validateNumericIdParam('parceiroId', 'Parceiro'), body: validateSiengeCredorBuscaBody }), IntegracaoSiengeController.credorParceiroBuscar);
router.post('/integracoes/sienge/credores/parceiros/:parceiroId/cadastrar', allowIntegracaoSiengeConfigManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('parceiroId', 'Parceiro'), body: validateSiengeCredorCreateBody }), IntegracaoSiengeController.credorParceiroCadastrar);
router.patch('/integracoes/sienge/credores/parceiros/:parceiroId/mapeamento', allowIntegracaoSiengeConfigManage, criticalRateLimit, validateRequest({ params: validateNumericIdParam('parceiroId', 'Parceiro'), body: validateSiengeCredorMapeamentoBody }), IntegracaoSiengeController.credorParceiroMapeamento);
router.get('/integracoes/sienge/fila', allowIntegracaoSiengeRead, validateRequest({ query: validateSiengeFilaQuery }), IntegracaoSiengeController.fila);
router.get('/integracoes/sienge/fila/:id', allowIntegracaoSiengeRead, validateRequest({ params: validateNumericIdParam('id', 'Fila SIENGE') }), IntegracaoSiengeController.filaShow);
router.post('/integracoes/sienge/fila', allowIntegracaoSiengeRetry, criticalRateLimit, validateRequest({ body: validateSiengeFilaCreateBody }), IntegracaoSiengeController.filaCreate);
router.post('/integracoes/sienge/fila/:id/reprocessar', allowIntegracaoSiengeRetry, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Fila SIENGE'), body: validateSiengeFilaRetryBody }), IntegracaoSiengeController.filaRetry);
router.get('/integracoes/sienge/logs', allowIntegracaoSiengeRead, validateRequest({ query: validateSiengeLogQuery }), IntegracaoSiengeController.logs);

// -------------------------------------------------------------------
// FINANCEIRO
// -------------------------------------------------------------------
router.get('/financeiro/conciliacoes', allowFinanceiro, validateRequest({ query: validateFinanceConciliacaoQuery }), ConciliacaoBancariaController.index);
router.get('/financeiro/conciliacoes/importacoes', allowFinanceiro, validateRequest({ query: validateFinanceConciliacaoImportacoesQuery }), ConciliacaoBancariaController.importacoes);
router.post('/financeiro/conciliacoes/importar-ofx', allowFinanceiro, criticalRateLimit, uploadOfx.single('file'), validateRequest({ body: validateFinanceConciliacaoImportBody }), ConciliacaoBancariaController.importarOfx);
router.post('/financeiro/conciliacoes/conciliar-sugeridos', allowFinanceiro, criticalRateLimit, validateRequest({ body: validateFinanceConciliacaoConciliarSugeridosBody }), ConciliacaoBancariaController.conciliarSugeridos);
router.get('/financeiro/conciliacoes/:id/movimentos', allowFinanceiro, validateRequest({ params: validateNumericIdParam('id', 'Conciliacao bancaria'), query: validateFinanceConciliacaoMovimentosQuery }), ConciliacaoBancariaController.movimentos);
router.post('/financeiro/conciliacoes/:id/criar-titulo', allowFinanceiro, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Conciliacao bancaria'), body: validateFinanceConciliacaoCriarTituloBody }), ConciliacaoBancariaController.criarTitulo);
router.post('/financeiro/conciliacoes/:id/confirmar', allowFinanceiro, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Conciliacao bancaria'), body: validateFinanceConciliacaoConfirmBody }), ConciliacaoBancariaController.confirmar);
router.post('/financeiro/conciliacoes/:id/ignorar', allowFinanceiro, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Conciliacao bancaria') }), ConciliacaoBancariaController.ignorar);
router.get('/financeiro/relatorios/fluxo-caixa', allowFinanceiro, validateRequest({ query: validateFinanceFluxoCaixaQuery }), RelatorioFinanceiroController.fluxoCaixa);
router.get('/financeiro/relatorios/resultado-obras', allowFinanceiro, ResultadoObrasController.index);
router.get('/financeiro/titulos', allowFinanceiro, validateRequest({ query: validateFinanceTituloQuery }), TituloFinanceiroController.index);
router.post('/financeiro/titulos', allowFinanceiro, criticalRateLimit, validateRequest({ body: validateFinanceTituloCreateBody }), TituloFinanceiroController.create);
router.get('/financeiro/titulos/:id', allowFinanceiro, validateRequest({ params: validateNumericIdParam('id', 'Titulo financeiro') }), TituloFinanceiroController.show);
router.get('/financeiro/titulos/:id/auditoria', allowFinanceiro, validateRequest({ params: validateNumericIdParam('id', 'Titulo financeiro') }), TituloFinanceiroController.auditoria);
router.patch('/financeiro/titulos/:id/cobranca', allowFinanceiro, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Titulo financeiro'), body: validateFinanceTituloCobrancaBody }), TituloFinanceiroController.atualizarCobranca);
router.post('/financeiro/titulos/:id/baixas', allowFinanceiro, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Titulo financeiro'), body: validateFinanceTituloBaixaBody }), TituloFinanceiroController.baixar);
router.post('/financeiro/titulos/:id/movimentos/:movimentoId/estornar', allowFinanceiro, criticalRateLimit, validateRequest({ params: validateFinanceTituloMovimentoParams, body: validateFinanceTituloEstornoBody }), TituloFinanceiroController.estornarMovimento);
router.get('/boletos/config', allowBoletosRead, BoletoController.config);
router.get('/boletos/titulos', allowBoletosRead, validateRequest({ query: validateFinanceBoletoTituloQuery }), BoletoController.titulos);
router.get('/boletos/titulos/:id', allowBoletosRead, validateRequest({ params: validateNumericIdParam('id', 'Titulo financeiro') }), BoletoController.show);
router.get('/boletos/titulos/:id/pdf', allowBoletosRead, validateRequest({ params: validateNumericIdParam('id', 'Titulo financeiro') }), BoletoController.pdf);
router.post('/boletos/titulos/:id/amostra', allowBoletosGenerate, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Titulo financeiro') }), BoletoController.amostra);
router.post('/boletos/titulos/:id/gerar', allowBoletosGenerate, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Titulo financeiro') }), BoletoController.gerar);
router.get('/financeiro/contas-bancarias', allowFinanceiro, ContaBancariaController.index);
router.post('/financeiro/contas-bancarias', allowFinanceiro, criticalRateLimit, validateRequest({ body: validateFinanceCadastroContaBody }), ContaBancariaController.create);
router.patch('/financeiro/contas-bancarias/:id', allowFinanceiro, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Conta bancaria'), body: validateFinanceCadastroContaBody }), ContaBancariaController.update);
router.get('/financeiro/categorias', allowFinanceiro, CategoriaFinanceiraController.index);
router.post('/financeiro/categorias', allowFinanceiro, criticalRateLimit, validateRequest({ body: validateFinanceCadastroCategoriaBody }), CategoriaFinanceiraController.create);
router.patch('/financeiro/categorias/:id', allowFinanceiro, criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Categoria financeira'), body: validateFinanceCadastroCategoriaBody }), CategoriaFinanceiraController.update);

// -------------------------------------------------------------------
// COMPRAS - CADASTROS BASICOS
// -------------------------------------------------------------------

router.get('/compras/unidades', UnidadeController.index);
router.post('/compras/unidades', allowBusinessAdmin, UnidadeController.create);
router.put('/compras/unidades/:id', allowBusinessAdmin, UnidadeController.update);
router.delete('/compras/unidades/:id', allowBusinessAdmin, UnidadeController.destroy);

router.get('/compras/categorias', CategoriaController.index);
router.post('/compras/categorias', allowBusinessAdmin, CategoriaController.create);
router.put('/compras/categorias/:id', allowBusinessAdmin, CategoriaController.update);
router.delete('/compras/categorias/:id', allowBusinessAdmin, CategoriaController.destroy);

router.get('/compras/insumos', InsumoController.index);
router.post('/compras/insumos/importar-massa', allowBusinessAdmin, InsumoController.importarEmMassa);
router.post('/compras/insumos', allowBusinessAdmin, InsumoController.create);
router.put('/compras/insumos/:id', allowBusinessAdmin, InsumoController.update);
router.delete('/compras/insumos/:id', allowBusinessAdmin, InsumoController.destroy);

router.get('/compras/apropriacoes', ApropriacaoController.index);
router.post('/compras/apropriacoes', allowBusinessAdmin, ApropriacaoController.create);
router.put('/compras/apropriacoes/:id', allowBusinessAdmin, ApropriacaoController.update);
router.delete('/compras/apropriacoes/:id', allowBusinessAdmin, ApropriacaoController.destroy);
router.get('/compras/fornecedores', requireEnabledModule('COTACOES'), FornecedorCompraController.index);
router.post('/compras/fornecedores', requireEnabledModule('COTACOES'), FornecedorCompraController.create);
router.get('/compras/fornecedores/:id', requireEnabledModule('COTACOES'), FornecedorCompraController.show);
router.put('/compras/fornecedores/:id', requireEnabledModule('COTACOES'), FornecedorCompraController.update);
router.delete('/compras/fornecedores/:id', requireEnabledModule('COTACOES'), FornecedorCompraController.destroy);
router.post('/compras/anexos-temporarios', uploadRateLimit, uploadComprovantes.single('file'), SolicitacaoCompraController.uploadTemporario);
router.get('/compras/solicitacoes', validateRequest({ query: validateCompraQuery }), scopeCompraListAccess, SolicitacaoCompraController.index);
router.get('/compras/solicitacoes/:id', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao de compra') }), requireCompraAccess, SolicitacaoCompraController.show);
router.get('/compras/solicitacoes/:id/comparativo', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao de compra') }), requireCompraAccess, SolicitacaoCompraController.comparativo);
router.get('/compras/solicitacoes/:id/pdf', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao de compra') }), requireCompraAccess, SolicitacaoCompraController.pdf);
router.post('/compras/solicitacoes', validateRequest({ body: validateCompraCreateBody }), requireCompraBodyObraAccess, SolicitacaoCompraController.create);
router.get('/compras/cotacoes', requireEnabledModule('COTACOES'), scopeCompraListAccess, CotacaoFornecedorController.index);
router.post('/compras/cotacoes/avulsa', requireEnabledModule('COTACOES'), SolicitacaoCompraController.createAvulsa);
router.patch('/compras/solicitacoes/:id/integrar', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao de compra'), body: validateCompraIntegrarBody }), requireCompraAccess, SolicitacaoCompraController.integrar);
router.patch('/compras/solicitacoes/:id/liberar', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao de compra') }), requireCompraAccess, SolicitacaoCompraController.liberar);
router.post('/compras/solicitacoes/:id/enviar', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao de compra'), body: validateCompraEnviarBody }), requireCompraAccess, SolicitacaoCompraController.enviarParaFornecedores);
router.patch('/compras/solicitacoes/:id/encerrar', validateRequest({ params: validateNumericIdParam('id', 'Solicitacao de compra'), body: validateCompraEncerrarBody }), requireCompraAccess, SolicitacaoCompraController.encerrar);
router.post('/compras/solicitacoes/:id/pedidos', criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Solicitacao de compra'), body: validateCompraPedidoCreateBody }), requireCompraAccess, PedidoCompraController.createFromSolicitacao);
router.get('/compras/pedidos', validateRequest({ query: validateCompraPedidoQuery }), scopeCompraListAccess, PedidoCompraController.index);
router.get('/compras/relatorios/auditoria-itens-pedido', validateRequest({ query: validateCompraPedidoAuditoriaQuery }), scopeCompraListAccess, PedidoCompraController.auditoria);
router.get('/compras/pedidos/:id', validateRequest({ params: validateNumericIdParam('id', 'Pedido de compra') }), requirePedidoCompraAccess, PedidoCompraController.show);
router.post('/compras/pedidos/:id/itens', criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Pedido de compra'), body: validateCompraPedidoItemAddBody }), requirePedidoCompraAccess, PedidoCompraController.addItem);
router.patch('/compras/pedidos/:id/status', criticalRateLimit, validateRequest({ params: validateNumericIdParam('id', 'Pedido de compra'), body: validateCompraPedidoStatusBody }), requirePedidoCompraAccess, PedidoCompraController.updateStatus);
router.patch('/compras/pedidos/:id/itens/:itemId', criticalRateLimit, validateRequest({ params: validateCompraPedidoItemParams, body: validateCompraPedidoItemUpdateBody }), requirePedidoCompraAccess, PedidoCompraController.updateItem);
router.delete('/compras/pedidos/:id/itens/:itemId', criticalRateLimit, validateRequest({ params: validateCompraPedidoItemParams }), requirePedidoCompraAccess, PedidoCompraController.removeItem);
router.get('/compras/pedidos/:id/pdf', validateRequest({ params: validateNumericIdParam('id', 'Pedido de compra') }), requirePedidoCompraAccess, PedidoCompraController.pdf);

// -------------------------------------------------------------------
// TIPOS DE SOLICITAÇÃO
// -------------------------------------------------------------------

router.get('/tipos-solicitacao', TipoSolicitacaoController.index);
router.post('/tipos-solicitacao', allowBusinessAdmin, TipoSolicitacaoController.create);
router.patch('/tipos-solicitacao/:id', allowBusinessAdmin, TipoSolicitacaoController.update);
router.patch('/tipos-solicitacao/:id/ativar', allowBusinessAdmin, TipoSolicitacaoController.ativar);
router.patch('/tipos-solicitacao/:id/desativar', allowBusinessAdmin, TipoSolicitacaoController.desativar);
router.delete('/tipos-solicitacao/:id', allowBusinessAdmin, TipoSolicitacaoController.excluir);

// -------------------------------------------------------------------
// TIPOS MACRO E SUB DE CONTRATO
// -------------------------------------------------------------------

router.get('/tipos-macro-contrato', TipoMacroContratoController.index);
router.post('/tipos-macro-contrato', allowBusinessAdmin, TipoMacroContratoController.create);
router.patch('/tipos-macro-contrato/:id', allowBusinessAdmin, TipoMacroContratoController.update);
router.patch('/tipos-macro-contrato/:id/ativar', allowBusinessAdmin, TipoMacroContratoController.ativar);
router.patch('/tipos-macro-contrato/:id/desativar', allowBusinessAdmin, TipoMacroContratoController.desativar);

router.get('/tipos-sub-contrato', TipoSubContratoController.index);
router.post('/tipos-sub-contrato', allowBusinessAdmin, TipoSubContratoController.create);
router.patch('/tipos-sub-contrato/:id', allowBusinessAdmin, TipoSubContratoController.update);
router.patch('/tipos-sub-contrato/:id/ativar', allowBusinessAdmin, TipoSubContratoController.ativar);
router.patch('/tipos-sub-contrato/:id/desativar', allowBusinessAdmin, TipoSubContratoController.desativar);
router.delete('/tipos-sub-contrato/:id', allowBusinessAdmin, TipoSubContratoController.excluir);

// -------------------------------------------------------------------
// STATUS POR SETOR (SUPERADMIN)
// -------------------------------------------------------------------

router.get('/status-setor', validateRequest({ query: validateStatusSetorQuery }), StatusSetorController.index);
router.post('/status-setor', allowBusinessAdmin, validateRequest({ body: validateStatusSetorCreateBody }), StatusSetorController.create);
router.patch('/status-setor/:id', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Status do setor'), body: validateStatusSetorUpdateBody }), StatusSetorController.update);
router.patch('/status-setor/:id/ativar', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Status do setor') }), StatusSetorController.ativar);
router.patch('/status-setor/:id/desativar', allowBusinessAdmin, validateRequest({ params: validateNumericIdParam('id', 'Status do setor') }), StatusSetorController.desativar);

// -------------------------------------------------------------------
// PERMISSOES POR SETOR (SUPERADMIN)
// -------------------------------------------------------------------

router.get('/setor-permissoes', SetorPermissaoController.index);
router.patch('/setor-permissoes', allowBusinessAdmin, validateRequest({ body: validateSetorPermissaoBody }), SetorPermissaoController.upsert);

// -------------------------------------------------------------------
// CONFIGURACOES DO SISTEMA (SUPERADMIN)
// -------------------------------------------------------------------

router.patch('/configuracoes/tema', allowBusinessAdmin, ConfiguracaoSistemaController.updateTema);
router.get('/configuracoes/timeout-inatividade', ConfiguracaoSistemaController.getTimeoutInatividade);
router.patch('/configuracoes/timeout-inatividade', allowBusinessAdmin, ConfiguracaoSistemaController.updateTimeoutInatividade);
router.get('/configuracoes/areas-obra', ConfiguracaoSistemaController.getAreasObra);
router.patch('/configuracoes/areas-obra', allowBusinessAdmin, ConfiguracaoSistemaController.updateAreasObra);
router.get('/configuracoes/areas-por-setor-origem', ConfiguracaoSistemaController.getAreasPorSetorOrigem);
router.patch('/configuracoes/areas-por-setor-origem', allowBusinessAdmin, ConfiguracaoSistemaController.updateAreasPorSetorOrigem);
router.get('/configuracoes/setores-visiveis-usuario', allowBusinessAdmin, ConfiguracaoSistemaController.getSetoresVisiveisPorUsuario);
router.patch('/configuracoes/setores-visiveis-usuario', allowBusinessAdmin, ConfiguracaoSistemaController.updateSetoresVisiveisPorUsuario);
router.get('/configuracoes/tipos-solicitacao-por-setor', ConfiguracaoSistemaController.getTiposSolicitacaoPorSetor);
router.patch('/configuracoes/tipos-solicitacao-por-setor', allowBusinessAdmin, ConfiguracaoSistemaController.updateTiposSolicitacaoPorSetor);
router.get('/configuracoes/aprovacao-diretoria', ConfiguracaoSistemaController.getAprovacaoDiretoria);
router.patch('/configuracoes/aprovacao-diretoria', allowBusinessAdmin, ConfiguracaoSistemaController.updateAprovacaoDiretoria);
router.get('/configuracoes/usuarios-acesso-prioridade-diretoria', allowBusinessAdmin, ConfiguracaoSistemaController.getUsuariosAcessoPrioridadeDiretoria);
router.patch('/configuracoes/usuarios-acesso-prioridade-diretoria', allowBusinessAdmin, ConfiguracaoSistemaController.updateUsuariosAcessoPrioridadeDiretoria);
router.get('/configuracoes/tipos-compartilhados-setor', ConfiguracaoSistemaController.getTiposCompartilhadosSetor);
router.patch('/configuracoes/tipos-compartilhados-setor', allowBusinessAdmin, ConfiguracaoSistemaController.updateTiposCompartilhadosSetor);
router.get('/configuracoes/automacao-status-setor', ConfiguracaoSistemaController.getAutomacaoStatusSetor);
router.patch('/configuracoes/automacao-status-setor', allowBusinessAdmin, ConfiguracaoSistemaController.updateAutomacaoStatusSetor);
router.get('/configuracoes/setores-criacao-todas-obras', ConfiguracaoSistemaController.getSetoresCriacaoTodasObras);
router.patch('/configuracoes/setores-criacao-todas-obras', allowBusinessAdmin, ConfiguracaoSistemaController.updateSetoresCriacaoTodasObras);
router.get('/configuracoes/setores-acesso-todas-obras', ConfiguracaoSistemaController.getSetoresAcessoTodasObras);
router.patch('/configuracoes/setores-acesso-todas-obras', allowBusinessAdmin, ConfiguracaoSistemaController.updateSetoresAcessoTodasObras);
router.get('/configuracoes/usuarios-acesso-financeiro', allowBusinessAdmin, ConfiguracaoSistemaController.getUsuariosAcessoFinanceiro);
router.patch('/configuracoes/usuarios-acesso-financeiro', allowBusinessAdmin, ConfiguracaoSistemaController.updateUsuariosAcessoFinanceiro);
router.get('/configuracoes/usuarios-envio-qualquer-setor', allowBusinessAdmin, ConfiguracaoSistemaController.getUsuariosEnvioQualquerSetor);
router.patch('/configuracoes/usuarios-envio-qualquer-setor', allowBusinessAdmin, ConfiguracaoSistemaController.updateUsuariosEnvioQualquerSetor);
router.get('/configuracoes/usuarios-permissoes-rh-dp', allowBusinessAdmin, ConfiguracaoSistemaController.getUsuariosPermissoesRhDp);
router.patch('/configuracoes/usuarios-permissoes-rh-dp', allowBusinessAdmin, ConfiguracaoSistemaController.updateUsuariosPermissoesRhDp);
router.get('/configuracoes/permissoes-areas/registry', allowBusinessAdmin, PermissoesAreasController.registry);
router.get('/configuracoes/permissoes-areas', allowBusinessAdmin, PermissoesAreasController.get);
router.put('/configuracoes/permissoes-areas', allowBusinessAdmin, PermissoesAreasController.save);
router.get('/configuracoes/cotacoes', requireEnabledModule('COTACOES'), ConfiguracaoSistemaController.getCotacoesConfig);
router.patch('/configuracoes/cotacoes', requireEnabledModule('COTACOES'), allowBusinessAdmin, ConfiguracaoSistemaController.setCotacoesConfig);
router.get('/configuracoes/status-pedidos-compra', ConfiguracaoSistemaController.getStatusPedidosCompra);
router.patch('/configuracoes/status-pedidos-compra', allowBusinessAdmin, ConfiguracaoSistemaController.setStatusPedidosCompra);
router.get('/configuracoes/comercial-categorias-contrato', allowBusinessAdmin, ConfiguracaoSistemaController.getComercialCategoriasContrato);
router.patch('/configuracoes/comercial-categorias-contrato', permit(['SUPERADMIN']), ConfiguracaoSistemaController.setComercialCategoriasContrato);
router.get('/configuracoes/modulos', ConfiguracaoSistemaController.getModulos);
router.patch('/configuracoes/modulos', permit(['SUPERADMIN']), ConfiguracaoSistemaController.setModulos);

// -------------------------------------------------------------------
// CONTRATOS
// -------------------------------------------------------------------

router.get('/contratos', validateRequest({ query: validateContratoQuery }), ContratoController.index);
router.get('/contratos/resumo', validateRequest({ query: validateContratoQuery }), ContratoController.resumo);
router.get('/contratos/:id/solicitacoes', validateRequest({ params: validateNumericIdParam('id', 'Contrato') }), requireContratoAccess, ContratoController.solicitacoes);
router.get('/contratos/:id/anexos', validateRequest({ params: validateNumericIdParam('id', 'Contrato') }), requireContratoAccess, ContratoController.listarAnexos);
router.post('/contratos', validateRequest({ body: validateContratoCreateBody }), requireContratoBodyObraAccess, ContratoController.create);
router.post('/contratos/importar-massa', permit(['SUPERADMIN']), uploadRateLimit, uploadComprovantes.single('file'), ContratoController.importarMassa);
router.post('/contratos/:id/anexos', validateRequest({ params: validateNumericIdParam('id', 'Contrato') }), requireContratoAccess, uploadRateLimit, uploadComprovantes.array('files'), auditSuccess({ eventType: 'CONTRACT_FILE_UPLOADED', resourceType: 'CONTRATO', description: 'Anexo de contrato enviado', resourceIdResolver: (req) => req.params.id }), ContratoController.uploadAnexos);
router.patch('/contratos/:id', validateRequest({ params: validateNumericIdParam('id', 'Contrato'), body: validateContratoUpdateBody }), requireContratoAccess, requireContratoOptionalBodyObraAccess, auditSuccess({ eventType: 'CONTRACT_UPDATED', resourceType: 'CONTRATO', description: 'Contrato atualizado', resourceIdResolver: (req) => req.params.id }), ContratoController.update);
router.delete('/contratos/:id', validateRequest({ params: validateNumericIdParam('id', 'Contrato') }), requireContratoAccess, auditSuccess({ eventType: 'CONTRACT_DELETED', resourceType: 'CONTRATO', description: 'Contrato excluido', resourceIdResolver: (req) => req.params.id }), ContratoController.excluir);
router.patch('/contratos/:id/ativar', validateRequest({ params: validateNumericIdParam('id', 'Contrato') }), requireContratoAccess, auditSuccess({ eventType: 'CONTRACT_ACTIVATED', resourceType: 'CONTRATO', description: 'Contrato ativado', resourceIdResolver: (req) => req.params.id }), ContratoController.ativar);
router.patch('/contratos/:id/desativar', validateRequest({ params: validateNumericIdParam('id', 'Contrato') }), requireContratoAccess, auditSuccess({ eventType: 'CONTRACT_DEACTIVATED', resourceType: 'CONTRATO', description: 'Contrato desativado', resourceIdResolver: (req) => req.params.id }), ContratoController.desativar);

// -------------------------------------------------------------------
// CRM
// -------------------------------------------------------------------

router.get('/crm/pipelines', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsRead, CrmPipelineController.index);
router.get('/crm/pipelines/:id/kanban', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsRead, CrmPipelineController.kanban);
router.post('/crm/pipelines/:id/stages', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmPipelineController.createStage);
router.patch('/crm/pipeline-stages/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmPipelineController.updateStage);
router.delete('/crm/pipeline-stages/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmPipelineController.deleteStage);
router.get('/crm/loss-reasons', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsRead, CrmPipelineController.lossReasons);

router.get('/crm/leads', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsRead, CrmLeadsController.index);
router.get('/crm/leads/export', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadExport, CrmLeadsController.export);
router.get('/crm/leads/redistribution-candidates', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadRedistribute, CrmLeadsController.redistributionCandidates);
router.post('/crm/leads', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmLeadsController.create);
router.get('/crm/leads/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsRead, CrmLeadsController.show);
router.patch('/crm/leads/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmLeadsController.update);
router.patch('/crm/leads/:id/stage', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmLeadsController.changeStage);
router.patch('/crm/leads/:id/loss', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmLeadsController.registerLoss);
router.patch('/crm/leads/:id/convert', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmLeadsController.registerConversion);
router.patch('/crm/leads/:id/archive', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmLeadsController.archive);
router.post('/crm/leads/:id/redistribute', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadRedistribute, CrmLeadsController.redistribute);
router.get('/crm/leads/:id/interactions', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsRead, CrmLeadsController.listInteractions);
router.post('/crm/leads/:id/interactions', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmLeadsController.createInteraction);

router.get('/crm/tasks', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsRead, CrmTasksController.index);
router.post('/crm/tasks', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmTasksController.create);
router.patch('/crm/tasks/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmTasksController.update);
router.patch('/crm/tasks/:id/complete', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmTasksController.complete);
router.patch('/crm/tasks/:id/cancel', requireEnabledModule('CRM'), requireCrmModule(), allowCrmLeadsWrite, CrmTasksController.cancel);

router.get('/crm/dashboard/operacional', requireEnabledModule('CRM'), requireCrmModule(), allowCrmDashboardRead, CrmDashboardController.operacional);
router.get('/crm/dashboard/gerencial', requireEnabledModule('CRM'), requireCrmModule(), allowCrmDashboardRead, CrmDashboardController.gerencial);
router.get('/crm/dashboard/sla', requireEnabledModule('CRM'), requireCrmModule(), allowCrmDashboardRead, CrmDashboardController.sla);
router.get('/crm/dashboard/distribuicao', requireEnabledModule('CRM'), requireCrmModule(), allowCrmDashboardRead, CrmDashboardController.distribuicao);

router.get('/crm/conversations', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAtendimentoRead, CrmConversationsController.index);
router.post('/crm/conversations', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAtendimentoSend, CrmConversationsController.create);
router.get('/crm/conversations/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAtendimentoRead, CrmConversationsController.show);
router.patch('/crm/conversations/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAtendimentoSend, CrmConversationsController.update);
router.post('/crm/conversations/:id/messages', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAtendimentoSend, CrmConversationsController.createMessage);
router.post('/crm/conversations/:id/read', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAtendimentoRead, CrmConversationsController.markRead);

router.get('/crm/message-templates', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAtendimentoRead, CrmConversationsController.templates);
router.post('/crm/message-templates', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAtendimentoSend, CrmConversationsController.createTemplate);
router.patch('/crm/message-templates/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAtendimentoSend, CrmConversationsController.updateTemplate);

router.get('/crm/automation-rules', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAutomacoesRead, CrmAutomationController.index);
router.post('/crm/automation-rules', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAutomacoesManage, CrmAutomationController.create);
router.patch('/crm/automation-rules/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAutomacoesManage, CrmAutomationController.update);
router.post('/crm/automation-rules/:id/activate', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAutomacoesManage, CrmAutomationController.activate);
router.post('/crm/automation-rules/:id/deactivate', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAutomacoesManage, CrmAutomationController.deactivate);
router.post('/crm/automation-rules/run-cycle', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAutomacoesManage, CrmAutomationController.runCycle);
router.get('/crm/automation-executions', requireEnabledModule('CRM'), requireCrmModule(), allowCrmAutomacoesRead, CrmAutomationController.executions);

router.get('/crm/channels', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesRead, CrmAdminController.listarCanais);
router.post('/crm/channels', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesManage, CrmAdminController.criarCanal);
router.get('/crm/channels/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesRead, CrmAdminController.obterCanal);
router.patch('/crm/channels/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesManage, CrmAdminController.atualizarCanal);
router.delete('/crm/channels/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesManage, CrmAdminController.excluirCanal);

router.get('/crm/phone-assets', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesRead, CrmAdminController.listarNumeros);
router.post('/crm/phone-assets', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesManage, CrmAdminController.criarNumero);
router.get('/crm/phone-assets/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesRead, CrmAdminController.obterNumero);
router.patch('/crm/phone-assets/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesManage, CrmAdminController.atualizarNumero);
router.delete('/crm/phone-assets/:id', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesManage, CrmAdminController.excluirNumero);

router.get('/crm/integrations/config', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesRead, CrmAdminController.obterIntegracoes);
router.patch('/crm/integrations/config', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesManage, CrmAdminController.atualizarIntegracoes);
router.get('/crm/integrations/meta/events', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesRead, CrmAdminController.listarEventosMeta);
router.post('/crm/integrations/meta/events/:id/reprocess', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesManage, CrmAdminController.reprocessarEventoMeta);
router.get('/crm/integrations/google/events', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesRead, CrmAdminController.listarEventosGoogle);
router.post('/crm/integrations/google/events/:id/reprocess', requireEnabledModule('CRM'), requireCrmModule(), allowCrmConfiguracoesManage, CrmAdminController.reprocessarEventoGoogle);

// -------------------------------------------------------------------
// DASHBOARD
// -------------------------------------------------------------------

router.get('/dashboard/executivo', DashboardController.executivo);

// -------------------------------------------------------------------
// CONVERSAS INTERNAS (CHAT UNIFICADO)
// -------------------------------------------------------------------
router.get('/conversas-internas/destinatarios', ConversaInternaController.opcoesDestinatario);
router.get('/conversas-internas/resumo', ConversaInternaController.resumo);
router.get('/conversas-internas/entrada', ConversaInternaController.listar);
router.get('/conversas-internas/saida', ConversaInternaController.listar);
router.get('/conversas-internas', ConversaInternaController.listar);
router.get('/conversas-internas/:id/mensagens', ConversaInternaController.listarMensagens);
router.post('/conversas-internas/:id/lida', ConversaInternaController.marcarLida);
router.get('/conversas-internas/:id', ConversaInternaController.detalhar);
router.post('/conversas-internas', uploadRateLimit, uploadComprovantes.array('files'), ConversaInternaController.criar);
router.post('/conversas-internas/massa', uploadRateLimit, uploadComprovantes.array('files'), ConversaInternaController.criarEmMassa);
router.post('/conversas-internas/:id/mensagens', uploadRateLimit, uploadComprovantes.array('files'), ConversaInternaController.responder);
router.post('/conversas-internas/:id/participantes', ConversaInternaController.adicionarParticipantes);
router.patch('/conversas-internas/arquivar-massa', ConversaInternaController.arquivarMassa);
router.patch('/conversas-internas/desarquivar-massa', ConversaInternaController.desarquivarMassa);
router.patch('/conversas-internas/:id/concluir', ConversaInternaController.concluir);
router.patch('/conversas-internas/:id/reabrir', ConversaInternaController.reabrir);
router.patch('/conversas-internas/mensagens/:mensagemId', ConversaInternaController.editarMensagem);

module.exports = router;
