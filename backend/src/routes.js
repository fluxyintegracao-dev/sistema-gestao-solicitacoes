// src/routes.js

const express = require('express');
const router = express.Router();

const fakeAuth = require('./middlewares/fakeAuth');
const permit = require('./middlewares/permissions');

const uploadComprovantes = require('./config/uploadComprovantes');

// Controllers
const SolicitacaoController = require('./controllers/SolicitacaoController');
const UsuarioController = require('./controllers/UsuarioController');
const CargoController = require('./controllers/CargoController');
const SetorController = require('./controllers/SetorController');
const ObraController = require('./controllers/ObraController');
const TipoSolicitacaoController = require('./controllers/TipoSolicitacaoController');
const DashboardController = require('./controllers/DashboardController');
const AuthController = require('./controllers/AuthController');
const ContratoController = require('./controllers/ContratoController');
const TipoMacroContratoController = require('./controllers/TipoMacroContratoController');
const TipoSubContratoController = require('./controllers/TipoSubContratoController');
const StatusSetorController = require('./controllers/StatusSetorController');
const ComprovanteController = require('./controllers/ComprovanteController');
const AnexoController = require('./controllers/AnexoController');
const NotificacaoController = require('./controllers/NotificacaoController');
const SetorPermissaoController = require('./controllers/SetorPermissaoController');
const ConfiguracaoSistemaController = require('./controllers/ConfiguracaoSistemaController');
const ProvisaoCategoriaMacroController = require('./controllers/ProvisaoCategoriaMacroController');
const ProvisaoFinanceiraController = require('./controllers/ProvisaoFinanceiraController');
const ProvisaoFinanceiraConfiguracaoController = require('./controllers/ProvisaoFinanceiraConfiguracaoController');
const ProvisaoFinanceiraDashboardController = require('./controllers/ProvisaoFinanceiraDashboardController');
const ConversaInternaController = require('./controllers/ConversaInternaController');
const ArquivoModeloController = require('./controllers/ArquivoModeloController');
const UnidadeController = require('./controllers/UnidadeController');
const CategoriaController = require('./controllers/CategoriaController');
const InsumoController = require('./controllers/InsumoController');
const ApropriacaoController = require('./controllers/ApropriacaoController');
const SolicitacaoCompraController = require('./controllers/SolicitacaoCompraController');
const FornecedorCompraController = require('./controllers/FornecedorCompraController');
const CotacaoFornecedorController = require('./controllers/CotacaoFornecedorController');
const PrioridadeDiretoriaController = require('./controllers/PrioridadeDiretoriaController');
const criarMiddlewareProvisionamentoFinanceiro = require('./middlewares/provisaoFinanceira');
const { obterTokensSetoresUsuario } = require('./services/usuariosSetores');
//console.log('AnexoController =>', AnexoController);


// -------------------------------------------------------------------
// AUTH
// -------------------------------------------------------------------
router.post('/login', AuthController.login);
router.get('/configuracoes/tema', ConfiguracaoSistemaController.getTema);
router.post('/cotacoes/upload', uploadComprovantes.single('file'), CotacaoFornecedorController.upload);
router.get('/cotacoes/:token/modelo', CotacaoFornecedorController.modelo);
router.get('/cotacoes/:token', CotacaoFornecedorController.show);
router.post('/cotacoes/:token', CotacaoFornecedorController.responder);
const auth = require('./middlewares/auth');
router.use(auth);
router.get('/usuarios-lista', UsuarioController.listaPublica);

// -------------------------------------------------------------------
// ARQUIVOS MODELOS
// -------------------------------------------------------------------
router.get('/arquivos-modelos/contexto', ArquivoModeloController.contexto);
router.get('/arquivos-modelos/admins', ArquivoModeloController.listarAdmins);
router.get('/arquivos-modelos', ArquivoModeloController.listarArquivos);
router.post('/arquivos-modelos/upload', uploadComprovantes.single('file'), ArquivoModeloController.upload);
router.get('/arquivos-modelos/:id/link', ArquivoModeloController.obterLink);
router.delete('/arquivos-modelos/:id', ArquivoModeloController.remover);
router.post('/arquivos-modelos/paginas', permit(['SUPERADMIN']), ArquivoModeloController.criarPagina);
router.patch('/arquivos-modelos/paginas', permit(['SUPERADMIN']), ArquivoModeloController.salvarPaginas);
router.patch('/arquivos-modelos/paginas/:codigo/ativar', permit(['SUPERADMIN']), ArquivoModeloController.ativarPagina);
router.patch('/arquivos-modelos/paginas/:codigo/desativar', permit(['SUPERADMIN']), ArquivoModeloController.desativarPagina);
router.patch('/arquivos-modelos/uploaders', permit(['SUPERADMIN']), ArquivoModeloController.salvarUploaders);

const allowGestaoUsuarios = async (req, res, next) => {
  try {
    const perfil = String(req.user?.perfil || '').trim().toUpperCase();
    if (perfil === 'SUPERADMIN') {
      return next();
    }

    if (perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const tokens = new Set(await obterTokensSetoresUsuario(req.user));

    if (tokens.has('GEO')) {
      return next();
    }

    return res.status(403).json({ error: 'Acesso negado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao validar permissao de usuarios' });
  }
};


// -------------------------------------------------------------------
// SOLICITAÇÕES
// -------------------------------------------------------------------

router.post('/solicitacoes', SolicitacaoController.create);
router.get('/solicitacoes/filtros/obras', SolicitacaoController.obrasVisiveis);
router.get('/solicitacoes', SolicitacaoController.index);
router.get('/solicitacoes/:id', SolicitacaoController.show);
router.patch('/solicitacoes/:id/status', SolicitacaoController.updateStatus);
router.patch('/solicitacoes/:id/pedido', SolicitacaoController.atualizarNumeroPedido);
router.patch('/solicitacoes/:id/ref-contrato', SolicitacaoController.atualizarRefContrato);
router.patch('/solicitacoes/:id/valor', SolicitacaoController.atualizarValor);
router.post('/solicitacoes/:id/pagamentos', SolicitacaoController.adicionarPagamento);
router.patch('/solicitacoes/arquivar-massa', SolicitacaoController.arquivarEmMassa);
router.post('/solicitacoes/enviar-setor-massa', SolicitacaoController.enviarParaSetorEmMassa);
router.get('/solicitacoes/resumo', SolicitacaoController.resumo);
router.post('/solicitacoes/:id/comentarios', SolicitacaoController.adicionarComentario);
router.post('/solicitacoes/:id/enviar-setor', SolicitacaoController.enviarParaSetor);
router.post('/solicitacoes/:id/aprovar-diretoria', SolicitacaoController.aprovarDiretoria);
router.post('/solicitacoes/:id/assumir', SolicitacaoController.assumirSolicitacao);
router.patch('/solicitacoes/:id/ocultar', SolicitacaoController.ocultarDaMinhaLista);
router.patch('/solicitacoes/:id/arquivar', SolicitacaoController.ocultarDaMinhaLista);
router.patch('/solicitacoes/:id/desarquivar', SolicitacaoController.desarquivarDaMinhaLista);
router.delete('/solicitacoes/:id', SolicitacaoController.excluir);
router.get('/prioridades-diretoria/contexto', PrioridadeDiretoriaController.contexto);
router.get('/prioridades-diretoria/lotes', PrioridadeDiretoriaController.index);
router.post('/prioridades-diretoria/lotes', PrioridadeDiretoriaController.create);
router.post('/prioridades-diretoria/lotes/solicitar-urgencia', PrioridadeDiretoriaController.solicitarUrgencia);
router.get('/prioridades-diretoria/lotes/:id', PrioridadeDiretoriaController.show);
router.get('/prioridades-diretoria/lotes/:id/solicitacoes-disponiveis', PrioridadeDiretoriaController.solicitacoesDisponiveis);
router.post('/prioridades-diretoria/lotes/:id/salvar-selecao', PrioridadeDiretoriaController.salvarSelecao);
router.post('/prioridades-diretoria/lotes/:id/finalizar', PrioridadeDiretoriaController.finalizar);
router.post('/prioridades-diretoria/lotes/:id/reabrir', PrioridadeDiretoriaController.reabrir);
router.post('/prioridades-diretoria/lotes/:id/cancelar', PrioridadeDiretoriaController.cancelar);
router.delete('/prioridades-diretoria/lotes/:id', PrioridadeDiretoriaController.excluir);

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
  uploadComprovantes.array('files'),
  AnexoController.upload
);

router.get(
  '/anexos/presign',
  AnexoController.presign
);

router.delete(
  '/anexos/historico/:historicoId',
  AnexoController.remover
);

router.get(
  '/solicitacoes/:id/anexos',
  AnexoController.listarPorSolicitacao
);
// -------------------------------------------------------------------
// COMPROVANTES
// -------------------------------------------------------------------
const allowComprovantes = async (req, res, next) => {
  try {
    const perfil = String(req.user?.perfil || '').trim().toUpperCase();
    const tokens = new Set(await obterTokensSetoresUsuario(req.user));
    const isFinanceiro =
      perfil === 'FINANCEIRO' ||
      tokens.has('FINANCEIRO') ||
      tokens.has('4');

    if (
      perfil === 'SUPERADMIN' ||
      isFinanceiro
    ) {
      return next();
    }
    return res.status(403).json({ error: 'Acesso negado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao validar permissao de comprovantes' });
  }
};

router.post(
  '/comprovantes/upload-massa',
  allowComprovantes,
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
  ComprovanteController.vincular
);

router.delete(
  '/comprovantes/:id',
  allowComprovantes,
  ComprovanteController.remover
);
// -------------------------------------------------------------------
// USUÁRIOS
// -------------------------------------------------------------------

router.get('/usuarios', allowGestaoUsuarios, UsuarioController.index);
router.get('/usuarios/opcoes-atribuicao', UsuarioController.opcoesAtribuicao);
router.get('/usuarios/:id', allowGestaoUsuarios, UsuarioController.show);
router.post('/usuarios', allowGestaoUsuarios, UsuarioController.create);
router.post('/usuarios/importar-massa', allowGestaoUsuarios, uploadComprovantes.single('file'), UsuarioController.importarMassa);
router.put('/usuarios/:id', allowGestaoUsuarios, UsuarioController.update);
router.patch('/usuarios/me/senha', UsuarioController.alterarSenha);
router.patch('/usuarios/:id/ativar', allowGestaoUsuarios, UsuarioController.ativar);
router.patch('/usuarios/:id/desativar', allowGestaoUsuarios, UsuarioController.desativar);
router.post('/solicitacoes/:id/atribuir', SolicitacaoController.atribuirResponsavel);




// -------------------------------------------------------------------
// CARGOS
// -------------------------------------------------------------------

router.get('/cargos', CargoController.index);
router.post('/cargos', permit(['SUPERADMIN']), CargoController.create);
router.patch('/cargos/:id', permit(['SUPERADMIN']), CargoController.update);
router.patch('/cargos/:id/ativar', permit(['SUPERADMIN']), CargoController.ativar);
router.patch('/cargos/:id/desativar', permit(['SUPERADMIN']), CargoController.desativar);

// -------------------------------------------------------------------
// SETORES
// -------------------------------------------------------------------

router.get('/setores', SetorController.index);
router.post('/setores', permit(['SUPERADMIN']), SetorController.create);
router.patch('/setores/:id', permit(['SUPERADMIN']), SetorController.update);
router.patch('/setores/:id/ativar', permit(['SUPERADMIN']), SetorController.ativar);
router.patch('/setores/:id/desativar', permit(['SUPERADMIN']), SetorController.desativar);

// -------------------------------------------------------------------
// OBRAS
// -------------------------------------------------------------------

router.get('/obras', ObraController.index);
router.get('/obras/minhas', ObraController.minhas);
router.post('/obras', permit(['SUPERADMIN']), ObraController.create);
router.patch('/obras/:id', permit(['SUPERADMIN']), ObraController.update);
router.patch('/obras/:id/ativar', permit(['SUPERADMIN']), ObraController.ativar);
router.patch('/obras/:id/desativar', permit(['SUPERADMIN']), ObraController.desativar);

// -------------------------------------------------------------------
// COMPRAS - CADASTROS BASICOS
// -------------------------------------------------------------------

router.get('/compras/unidades', UnidadeController.index);
router.post('/compras/unidades', permit(['SUPERADMIN']), UnidadeController.create);
router.put('/compras/unidades/:id', permit(['SUPERADMIN']), UnidadeController.update);
router.delete('/compras/unidades/:id', permit(['SUPERADMIN']), UnidadeController.destroy);

router.get('/compras/categorias', CategoriaController.index);
router.post('/compras/categorias', permit(['SUPERADMIN']), CategoriaController.create);
router.put('/compras/categorias/:id', permit(['SUPERADMIN']), CategoriaController.update);
router.delete('/compras/categorias/:id', permit(['SUPERADMIN']), CategoriaController.destroy);

router.get('/compras/insumos', InsumoController.index);
router.post('/compras/insumos/importar-massa', permit(['SUPERADMIN']), InsumoController.importarEmMassa);
router.post('/compras/insumos', permit(['SUPERADMIN']), InsumoController.create);
router.put('/compras/insumos/:id', permit(['SUPERADMIN']), InsumoController.update);
router.delete('/compras/insumos/:id', permit(['SUPERADMIN']), InsumoController.destroy);

router.get('/compras/apropriacoes', ApropriacaoController.index);
router.post('/compras/apropriacoes', permit(['SUPERADMIN']), ApropriacaoController.create);
router.put('/compras/apropriacoes/:id', permit(['SUPERADMIN']), ApropriacaoController.update);
router.delete('/compras/apropriacoes/:id', permit(['SUPERADMIN']), ApropriacaoController.destroy);
router.get('/compras/fornecedores', FornecedorCompraController.index);
router.post('/compras/fornecedores', FornecedorCompraController.create);
router.put('/compras/fornecedores/:id', FornecedorCompraController.update);
router.delete('/compras/fornecedores/:id', FornecedorCompraController.destroy);
router.post('/compras/anexos-temporarios', uploadComprovantes.single('file'), SolicitacaoCompraController.uploadTemporario);
router.get('/compras/solicitacoes', SolicitacaoCompraController.index);
router.get('/compras/solicitacoes/:id', SolicitacaoCompraController.show);
router.get('/compras/solicitacoes/:id/comparativo', SolicitacaoCompraController.comparativo);
router.get('/compras/solicitacoes/:id/pdf', SolicitacaoCompraController.pdf);
router.post('/compras/solicitacoes', SolicitacaoCompraController.create);
router.patch('/compras/solicitacoes/:id/integrar', SolicitacaoCompraController.integrar);
router.patch('/compras/solicitacoes/:id/liberar', SolicitacaoCompraController.liberar);
router.post('/compras/solicitacoes/:id/enviar', SolicitacaoCompraController.enviarParaFornecedores);
router.patch('/compras/solicitacoes/:id/encerrar', SolicitacaoCompraController.encerrar);

// -------------------------------------------------------------------
// TIPOS DE SOLICITAÇÃO
// -------------------------------------------------------------------

router.get('/tipos-solicitacao', TipoSolicitacaoController.index);
router.post('/tipos-solicitacao', permit(['SUPERADMIN']), TipoSolicitacaoController.create);
router.patch('/tipos-solicitacao/:id', permit(['SUPERADMIN']), TipoSolicitacaoController.update);
router.patch('/tipos-solicitacao/:id/ativar', permit(['SUPERADMIN']), TipoSolicitacaoController.ativar);
router.patch('/tipos-solicitacao/:id/desativar', permit(['SUPERADMIN']), TipoSolicitacaoController.desativar);
router.delete('/tipos-solicitacao/:id', permit(['SUPERADMIN']), TipoSolicitacaoController.excluir);

// -------------------------------------------------------------------
// TIPOS MACRO E SUB DE CONTRATO
// -------------------------------------------------------------------

router.get('/tipos-macro-contrato', TipoMacroContratoController.index);
router.post('/tipos-macro-contrato', permit(['SUPERADMIN']), TipoMacroContratoController.create);
router.patch('/tipos-macro-contrato/:id', permit(['SUPERADMIN']), TipoMacroContratoController.update);
router.patch('/tipos-macro-contrato/:id/ativar', permit(['SUPERADMIN']), TipoMacroContratoController.ativar);
router.patch('/tipos-macro-contrato/:id/desativar', permit(['SUPERADMIN']), TipoMacroContratoController.desativar);

router.get('/tipos-sub-contrato', TipoSubContratoController.index);
router.post('/tipos-sub-contrato', permit(['SUPERADMIN']), TipoSubContratoController.create);
router.patch('/tipos-sub-contrato/:id', permit(['SUPERADMIN']), TipoSubContratoController.update);
router.patch('/tipos-sub-contrato/:id/ativar', permit(['SUPERADMIN']), TipoSubContratoController.ativar);
router.patch('/tipos-sub-contrato/:id/desativar', permit(['SUPERADMIN']), TipoSubContratoController.desativar);
router.delete('/tipos-sub-contrato/:id', permit(['SUPERADMIN']), TipoSubContratoController.excluir);

// -------------------------------------------------------------------
// STATUS POR SETOR (SUPERADMIN)
// -------------------------------------------------------------------

router.get('/status-setor', StatusSetorController.index);
router.post('/status-setor', permit(['SUPERADMIN']), StatusSetorController.create);
router.patch('/status-setor/:id', permit(['SUPERADMIN']), StatusSetorController.update);
router.patch('/status-setor/:id/ativar', permit(['SUPERADMIN']), StatusSetorController.ativar);
router.patch('/status-setor/:id/desativar', permit(['SUPERADMIN']), StatusSetorController.desativar);

// -------------------------------------------------------------------
// PERMISSOES POR SETOR (SUPERADMIN)
// -------------------------------------------------------------------

router.get('/setor-permissoes', SetorPermissaoController.index);
router.patch('/setor-permissoes', permit(['SUPERADMIN']), SetorPermissaoController.upsert);

// -------------------------------------------------------------------
// CONFIGURACOES DO SISTEMA (SUPERADMIN)
// -------------------------------------------------------------------

router.patch('/configuracoes/tema', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateTema);
router.get('/configuracoes/timeout-inatividade', ConfiguracaoSistemaController.getTimeoutInatividade);
router.patch('/configuracoes/timeout-inatividade', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateTimeoutInatividade);
router.get('/configuracoes/areas-obra', ConfiguracaoSistemaController.getAreasObra);
router.patch('/configuracoes/areas-obra', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateAreasObra);
router.get('/configuracoes/aprovacao-diretoria', ConfiguracaoSistemaController.getAprovacaoDiretoria);
router.patch('/configuracoes/aprovacao-diretoria', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateAprovacaoDiretoria);
router.get('/configuracoes/areas-por-setor-origem', ConfiguracaoSistemaController.getAreasPorSetorOrigem);
router.patch('/configuracoes/areas-por-setor-origem', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateAreasPorSetorOrigem);
router.get('/configuracoes/setores-visiveis-usuario', permit(['SUPERADMIN']), ConfiguracaoSistemaController.getSetoresVisiveisPorUsuario);
router.patch('/configuracoes/setores-visiveis-usuario', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateSetoresVisiveisPorUsuario);
router.get('/configuracoes/tipos-solicitacao-por-setor', ConfiguracaoSistemaController.getTiposSolicitacaoPorSetor);
router.patch('/configuracoes/tipos-solicitacao-por-setor', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateTiposSolicitacaoPorSetor);
router.get('/configuracoes/tipos-compartilhados-setor', permit(['SUPERADMIN']), ConfiguracaoSistemaController.getTiposCompartilhadosEntreSetores);
router.patch('/configuracoes/tipos-compartilhados-setor', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateTiposCompartilhadosEntreSetores);
router.get('/configuracoes/automacao-status-setor', permit(['SUPERADMIN']), ConfiguracaoSistemaController.getAutomacaoStatusSetor);
router.patch('/configuracoes/automacao-status-setor', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateAutomacaoStatusSetor);
router.get('/configuracoes/setores-criacao-todas-obras', ConfiguracaoSistemaController.getSetoresCriacaoTodasObras);
router.patch('/configuracoes/setores-criacao-todas-obras', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateSetoresCriacaoTodasObras);
router.get('/configuracoes/setores-sem-alteracao-status', ConfiguracaoSistemaController.getSetoresSemAlteracaoStatus);
router.patch('/configuracoes/setores-sem-alteracao-status', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateSetoresSemAlteracaoStatus);
router.get('/configuracoes/usuarios-acesso-prioridade-diretoria', permit(['SUPERADMIN']), ConfiguracaoSistemaController.getUsuariosAcessoPrioridadeDiretoria);
router.patch('/configuracoes/usuarios-acesso-prioridade-diretoria', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateUsuariosAcessoPrioridadeDiretoria);
router.get('/configuracoes/usuarios-envio-qualquer-setor', permit(['SUPERADMIN']), ConfiguracaoSistemaController.getUsuariosEnvioQualquerSetor);
router.patch('/configuracoes/usuarios-envio-qualquer-setor', permit(['SUPERADMIN']), ConfiguracaoSistemaController.updateUsuariosEnvioQualquerSetor);
router.get('/configuracoes/provisoes-financeiras/permissoes', permit(['SUPERADMIN']), ProvisaoFinanceiraConfiguracaoController.getPermissoes);
router.patch('/configuracoes/provisoes-financeiras/permissoes', permit(['SUPERADMIN']), ProvisaoFinanceiraConfiguracaoController.updatePermissoes);

// -------------------------------------------------------------------
// PROVISIONAMENTO FINANCEIRO
// -------------------------------------------------------------------

router.get(
  '/provisoes-financeiras/contexto',
  criarMiddlewareProvisionamentoFinanceiro('acessar'),
  ProvisaoFinanceiraController.contexto
);
router.get(
  '/provisoes-financeiras/categorias',
  criarMiddlewareProvisionamentoFinanceiro('acessar'),
  ProvisaoCategoriaMacroController.index
);
router.post(
  '/provisoes-financeiras/categorias',
  permit(['SUPERADMIN']),
  ProvisaoCategoriaMacroController.create
);
router.put(
  '/provisoes-financeiras/categorias/:id',
  permit(['SUPERADMIN']),
  ProvisaoCategoriaMacroController.update
);
router.patch(
  '/provisoes-financeiras/categorias/:id/ativar',
  permit(['SUPERADMIN']),
  ProvisaoCategoriaMacroController.ativar
);
router.patch(
  '/provisoes-financeiras/categorias/:id/desativar',
  permit(['SUPERADMIN']),
  ProvisaoCategoriaMacroController.desativar
);
router.get(
  '/provisoes-financeiras/anexos/presign',
  criarMiddlewareProvisionamentoFinanceiro('acessar'),
  ProvisaoFinanceiraController.presignAnexo
);
router.get(
  '/provisoes-financeiras',
  criarMiddlewareProvisionamentoFinanceiro('acessar'),
  ProvisaoFinanceiraController.index
);
router.get(
  '/provisoes-financeiras/exportar',
  criarMiddlewareProvisionamentoFinanceiro('acessar'),
  ProvisaoFinanceiraController.exportarCsv
);
router.get(
  '/provisoes-financeiras/dashboard/resumo',
  criarMiddlewareProvisionamentoFinanceiro('dashboard'),
  ProvisaoFinanceiraDashboardController.resumo
);
router.post(
  '/provisoes-financeiras/:id/aprovar',
  criarMiddlewareProvisionamentoFinanceiro('aprovar'),
  ProvisaoFinanceiraController.aprovar
);
router.post(
  '/provisoes-financeiras/:id/cancelar',
  criarMiddlewareProvisionamentoFinanceiro('aprovar'),
  ProvisaoFinanceiraController.cancelar
);
router.post(
  '/provisoes-financeiras/:id/realizar',
  criarMiddlewareProvisionamentoFinanceiro('aprovar'),
  ProvisaoFinanceiraController.realizar
);
router.get(
  '/provisoes-financeiras/:id',
  criarMiddlewareProvisionamentoFinanceiro('acessar'),
  ProvisaoFinanceiraController.show
);
router.post(
  '/provisoes-financeiras',
  criarMiddlewareProvisionamentoFinanceiro('criar'),
  ProvisaoFinanceiraController.create
);
router.put(
  '/provisoes-financeiras/:id',
  criarMiddlewareProvisionamentoFinanceiro('criar'),
  ProvisaoFinanceiraController.update
);
router.patch(
  '/provisoes-financeiras/:id/status',
  criarMiddlewareProvisionamentoFinanceiro('acessar'),
  ProvisaoFinanceiraController.alterarStatus
);
router.get(
  '/provisoes-financeiras/:id/historico',
  criarMiddlewareProvisionamentoFinanceiro('acessar'),
  ProvisaoFinanceiraController.historico
);
router.post(
  '/provisoes-financeiras/:id/comentarios',
  criarMiddlewareProvisionamentoFinanceiro('acessar'),
  ProvisaoFinanceiraController.adicionarComentario
);
router.post(
  '/provisoes-financeiras/:id/anexos',
  criarMiddlewareProvisionamentoFinanceiro('criar'),
  uploadComprovantes.array('files'),
  ProvisaoFinanceiraController.uploadAnexos
);
router.get(
  '/provisoes-financeiras/:id/anexos',
  criarMiddlewareProvisionamentoFinanceiro('acessar'),
  ProvisaoFinanceiraController.listarAnexos
);

// -------------------------------------------------------------------
// CONTRATOS
// -------------------------------------------------------------------

router.get('/contratos', ContratoController.index);
router.get('/contratos/resumo', ContratoController.resumo);
router.get('/contratos/:id/solicitacoes', ContratoController.solicitacoes);
router.get('/contratos/:id/anexos', ContratoController.listarAnexos);
router.post('/contratos', ContratoController.create);
router.post('/contratos/importar-massa', permit(['SUPERADMIN']), uploadComprovantes.single('file'), ContratoController.importarMassa);
router.post('/contratos/:id/anexos', uploadComprovantes.array('files'), ContratoController.uploadAnexos);
router.patch('/contratos/:id', ContratoController.update);
router.delete('/contratos/:id', ContratoController.excluir);
router.patch('/contratos/:id/ativar', ContratoController.ativar);
router.patch('/contratos/:id/desativar', ContratoController.desativar);

// -------------------------------------------------------------------
// DASHBOARD
// -------------------------------------------------------------------

router.get('/dashboard/executivo', DashboardController.executivo);

// -------------------------------------------------------------------
// CONVERSAS INTERNAS (CAIXA DE ENTRADA/SAIDA)
// -------------------------------------------------------------------
router.get('/conversas-internas/destinatarios', ConversaInternaController.opcoesDestinatario);
router.get('/conversas-internas/resumo', ConversaInternaController.resumo);
router.get('/conversas-internas/entrada', ConversaInternaController.entrada);
router.get('/conversas-internas/saida', ConversaInternaController.saida);
router.get('/conversas-internas/:id', ConversaInternaController.detalhar);
router.post('/conversas-internas', uploadComprovantes.array('files'), ConversaInternaController.criar);
router.post('/conversas-internas/massa', uploadComprovantes.array('files'), ConversaInternaController.criarEmMassa);
router.post('/conversas-internas/:id/mensagens', uploadComprovantes.array('files'), ConversaInternaController.responder);
router.post('/conversas-internas/:id/participantes', ConversaInternaController.adicionarParticipantes);
router.patch('/conversas-internas/arquivar-massa', ConversaInternaController.arquivarMassa);
router.patch('/conversas-internas/desarquivar-massa', ConversaInternaController.desarquivarMassa);
router.patch('/conversas-internas/:id/concluir', ConversaInternaController.concluir);
router.patch('/conversas-internas/:id/reabrir', ConversaInternaController.reabrir);
router.patch('/conversas-internas/mensagens/:mensagemId', ConversaInternaController.editarMensagem);

module.exports = router;
