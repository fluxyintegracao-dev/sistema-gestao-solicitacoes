import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import AppRouteFallback from './components/AppRouteFallback';
import Layout from './layout/Layout';
import { useAuth } from './contexts/AuthContext';
import {
  canAccessBiblioteca,
  canAccessBoletos,
  canAccessCadastroObras,
  canAccessComercial,
  canAccessComunicacao,
  canAccessCompras,
  canAccessContratos,
  canAccessFinanceiro,
  canAccessFiscal,
  canAccessPagamentos,
  canAccessGestaoObras,
  canAccessPrioridadesDiretoria,
  canCreateComprasPedidos,
  canCreateProvisionamentos,
  canAccessRhDpDashboard,
  canAccessRhDpEmpresas,
  canExecuteRhDpImportacoes,
  canManageComprasCotacoes,
  canManageProvisionamentoCategorias,
  canViewComprasCotacoes,
  canViewComprasPedidos,
  canViewComercialContratos,
  canViewComercialEmpreendimentos,
  canViewProvisionamentos,
  canViewProvisionamentosDashboard,
  canViewIntegracaoSienge,
  canViewRhDpApuracao,
  canViewRhDpColaboradores,
  canViewRhDpDocumentos,
  canViewRhDpObrigacoes,
  canCreateCrmLeads,
  canManageFiscalConfig,
  canManageUsers,
  canViewCrmAtendimento,
  canViewCrmAutomacoes,
  canViewCrmConfiguracoes,
  canViewCrmDashboard,
  canViewCrmLeads,
  canViewFiscalDocuments,
  canViewFiscalLogs,
  hasEnabledModule,
  isBusinessAdmin,
  isSuperadmin
} from './utils/acessoProduto';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Solicitacoes = lazy(() => import('./pages/Solicitacoes'));
const SolicitacaoDetalhe = lazy(() => import('./pages/SolicitacaoDetalhe'));
const SolicitacoesArquivadas = lazy(() => import('./pages/SolicitacoesArquivadas'));
const SolicitacoesRelatorioOperacional = lazy(() => import('./pages/SolicitacoesRelatorioOperacional'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const UsuarioNovo = lazy(() => import('./pages/UsuarioNovo'));
const NovaSolicitacao = lazy(() => import('./pages/NovaSolicitacao'));
const UploadComprovantes = lazy(() => import('./pages/UploadComprovantes'));
const ComprovantesPendentes = lazy(() => import('./pages/ComprovantesPendentes'));
const FinanceiroTitulos = lazy(() => import('./pages/FinanceiroTitulos'));
const FinanceiroTituloNovo = lazy(() => import('./pages/FinanceiroTituloNovo'));
const FinanceiroTituloDetalhe = lazy(() => import('./pages/FinanceiroTituloDetalhe'));
const FinanceiroTituloEditar = lazy(() => import('./pages/FinanceiroTituloEditar'));
const FinanceiroPagamentos = lazy(() => import('./pages/FinanceiroPagamentos'));
const FinanceiroBoletos = lazy(() => import('./pages/FinanceiroBoletos'));
const FinanceiroCadastros = lazy(() => import('./pages/FinanceiroCadastros'));
const FinanceiroRelatorios = lazy(() => import('./pages/FinanceiroRelatorios'));
const FinanceiroExecutivoGrupo = lazy(() => import('./pages/FinanceiroExecutivoGrupo'));
const FinanceiroFluxoConsolidado = lazy(() => import('./pages/FinanceiroFluxoConsolidado'));
const FinanceiroDre = lazy(() => import('./pages/FinanceiroDre'));
const FinanceiroDiagnosticoDre = lazy(() => import('./pages/FinanceiroDiagnosticoDre'));
const FinanceiroIntercompany = lazy(() => import('./pages/FinanceiroIntercompany'));
const FinanceiroEndividamento = lazy(() => import('./pages/FinanceiroEndividamento'));
const FinanceiroRelatorioAnalitico = lazy(() => import('./pages/FinanceiroRelatorioAnalitico'));
const FinanceiroBaixas = lazy(() => import('./pages/FinanceiroBaixas'));
const FinanceiroConciliacao = lazy(() => import('./pages/FinanceiroConciliacao'));
const FinanceiroCaixas = lazy(() => import('./pages/FinanceiroCaixas'));
const FinanceiroResultadoObras = lazy(() => import('./pages/FinanceiroResultadoObras'));
const FinanceiroResultadoCentrosCusto = lazy(() => import('./pages/FinanceiroResultadoCentrosCusto'));
  const ModuloRelatorios = lazy(() => import('./pages/ModuloRelatorios'));
  const ComprasRelatorioCategoriasInsumos = lazy(() => import('./pages/ComprasRelatorioCategoriasInsumos'));
  const ComprasRelatorioDemandaPedidos = lazy(() => import('./pages/ComprasRelatorioDemandaPedidos'));
  const ComprasRelatorioCiclo = lazy(() => import('./pages/ComprasRelatorioCiclo'));
const ComprasRelatorioEconomiaCotacoes = lazy(() => import('./pages/ComprasRelatorioEconomiaCotacoes'));
const ComprasRelatorioFornecedores = lazy(() => import('./pages/ComprasRelatorioFornecedores'));
const Obras = lazy(() => import('./pages/Obras'));
const ObraGestao = lazy(() => import('./pages/ObraGestao'));
const RelatoriosAdministrativos = lazy(() => import('./pages/RelatoriosAdministrativos'));
const Setores = lazy(() => import('./pages/Setores'));
const TiposSolicitacao = lazy(() => import('./pages/TiposSolicitacao'));
const GestaoContratos = lazy(() => import('./pages/GestaoContratos'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const ConfiguracoesSuporte = lazy(() => import('./pages/ConfiguracoesSuporte'));
const EmpresasGrupo = lazy(() => import('./pages/EmpresasGrupo'));
const AprovacaoDiretoria = lazy(() => import('./pages/AprovacaoDiretoria'));
const TiposSubContrato = lazy(() => import('./pages/TiposSubContrato'));
const StatusSetor = lazy(() => import('./pages/StatusSetor'));
const Perfil = lazy(() => import('./pages/Perfil'));
const PermissoesSetor = lazy(() => import('./pages/PermissoesSetor'));
const CoresSistema = lazy(() => import('./pages/CoresSistema'));
const AreasObra = lazy(() => import('./pages/AreasObra'));
const AreasPorSetorOrigem = lazy(() => import('./pages/AreasPorSetorOrigem'));
const SetoresVisiveisUsuario = lazy(() => import('./pages/SetoresVisiveisUsuario'));
const ComportamentoRecebimentoSetor = lazy(() => import('./pages/ComportamentoRecebimentoSetor'));
const TimeoutInatividade = lazy(() => import('./pages/TimeoutInatividade'));
const TiposSolicitacaoPorSetor = lazy(() => import('./pages/TiposSolicitacaoPorSetor'));
const NovaSolicitacaoCamposConfig = lazy(() => import('./pages/NovaSolicitacaoCamposConfig'));
const NovaSolicitacaoAutomacaoDestinoConfig = lazy(() => import('./pages/NovaSolicitacaoAutomacaoDestinoConfig'));
const TiposCompartilhadosSetor = lazy(() => import('./pages/TiposCompartilhadosSetor'));
const AutomacaoStatusSetor = lazy(() => import('./pages/AutomacaoStatusSetor'));
const SetoresCriacaoTodasObras = lazy(() => import('./pages/SetoresCriacaoTodasObras'));
const SetoresAcessoTodasObras = lazy(() => import('./pages/SetoresAcessoTodasObras'));
const UsuariosEnvioQualquerSetor = lazy(() => import('./pages/UsuariosEnvioQualquerSetor'));
const UsuariosAcessoFinanceiro = lazy(() => import('./pages/UsuariosAcessoFinanceiro'));
const UsuariosAcessoPrioridadeDiretoria = lazy(() => import('./pages/UsuariosAcessoPrioridadeDiretoria'));
const UsuariosPermissoesRhDp = lazy(() => import('./pages/UsuariosPermissoesRhDp'));
const PermissoesAreas = lazy(() => import('./pages/PermissoesAreas'));
const ComunicacaoInterna = lazy(() => import('./pages/ComunicacaoInterna'));
const PrioridadesDiretoria = lazy(() => import('./pages/PrioridadesDiretoria'));
const ArquivosModelos = lazy(() => import('./pages/ArquivosModelos'));
const ArquivosModelosConfig = lazy(() => import('./pages/ArquivosModelosConfig'));
const ConfiguracoesCotacao = lazy(() => import('./pages/ConfiguracoesCotacao'));
const ConfiguracoesStatusPedidoCompra = lazy(() => import('./pages/ConfiguracoesStatusPedidoCompra'));
const ConfiguracoesComercialCategorias = lazy(() => import('./pages/ConfiguracoesComercialCategorias'));
const ConfiguracoesModulos = lazy(() => import('./pages/ConfiguracoesModulos'));
const Parceiros = lazy(() => import('./pages/Parceiros'));
const ParceiroCategorias = lazy(() => import('./pages/ParceiroCategorias'));
const ComercialEmpreendimentos = lazy(() => import('./pages/ComercialEmpreendimentos'));
const ComercialUnidades = lazy(() => import('./pages/ComercialUnidades'));
const ComercialContratos = lazy(() => import('./pages/ComercialContratos'));
const ComercialModelosContrato = lazy(() => import('./pages/ComercialModelosContrato'));
const ComercialTabelasPreco = lazy(() => import('./pages/ComercialTabelasPreco'));
const ComercialMapaUnidades = lazy(() => import('./pages/ComercialMapaUnidades'));
const DashboardProvisionamentoFinanceiro = lazy(() => import('./modules/provisionamento-financeiro/pages/DashboardProvisionamentoFinanceiro'));
const ProvisionamentosFinanceiros = lazy(() => import('./modules/provisionamento-financeiro/pages/ProvisionamentosFinanceiros'));
const NovaProvisaoFinanceira = lazy(() => import('./modules/provisionamento-financeiro/pages/NovaProvisaoFinanceira'));
const ProvisionamentoFinanceiroDetalhe = lazy(() => import('./modules/provisionamento-financeiro/pages/ProvisionamentoFinanceiroDetalhe'));
const GestaoCategoriasMacro = lazy(() => import('./modules/provisionamento-financeiro/pages/GestaoCategoriasMacro'));
const RhDpInicio = lazy(() => import('./pages/RhDpInicio'));
const RhDpEmpresas = lazy(() => import('./pages/RhDpEmpresas'));
const RhDpColaboradores = lazy(() => import('./pages/RhDpColaboradores'));
const RhDpDocumentos = lazy(() => import('./pages/RhDpDocumentos'));
const RhDpImportacoes = lazy(() => import('./pages/RhDpImportacoes'));
const RhDpApuracao = lazy(() => import('./pages/RhDpApuracao'));
const RhDpFechamentos = lazy(() => import('./pages/RhDpFechamentos'));
const IntegracaoSiengeInicio = lazy(() => import('./pages/IntegracaoSiengeInicio'));
const SolicitacoesCompra = lazy(() => import('./modules/solicitacao-compra/pages/SolicitacoesCompra'));
const CotacaoFornecedorPublica = lazy(() => import('./modules/solicitacao-compra/pages/CotacaoFornecedorPublica'));
const SolicitacaoCompraDetalhe = lazy(() => import('./modules/solicitacao-compra/pages/SolicitacaoCompraDetalheView'));
const NovaSolicitacaoCompra = lazy(() => import('./modules/solicitacao-compra/pages/NovaSolicitacaoCompra'));
const RevisarSolicitacaoCompra = lazy(() => import('./modules/solicitacao-compra/pages/RevisarSolicitacaoCompra'));
const RevisarSolicitacaoCompraFinal = lazy(() => import('./modules/solicitacao-compra/pages/RevisarSolicitacaoCompraFinal'));
const GestaoApropriacoes = lazy(() => import('./modules/solicitacao-compra/pages/GestaoApropriacoes'));
const GestaoInsumos = lazy(() => import('./modules/solicitacao-compra/pages/GestaoInsumos'));
const GestaoCategorias = lazy(() => import('./modules/solicitacao-compra/pages/GestaoCategorias'));
const GestaoUnidades = lazy(() => import('./modules/solicitacao-compra/pages/GestaoUnidades'));
const PedidosCompra = lazy(() => import('./modules/solicitacao-compra/pages/PedidosCompra'));
const PedidoCompraDetalhe = lazy(() => import('./modules/solicitacao-compra/pages/PedidoCompraDetalhe'));
const GestaoFornecedores = lazy(() => import('./modules/solicitacao-compra/pages/GestaoFornecedores'));
const NovaCotacaoAvulsa = lazy(() => import('./modules/solicitacao-compra/pages/NovaCotacaoAvulsa'));
const ListaCotacoes = lazy(() => import('./modules/solicitacao-compra/pages/ListaCotacoes'));
const CrmLeads = lazy(() => import('./modules/crm/pages/CrmLeads'));
const CrmKanban = lazy(() => import('./modules/crm/pages/CrmKanban'));
const CrmLeadDetalhe = lazy(() => import('./modules/crm/pages/CrmLeadDetalhe'));
const CrmNovoLead = lazy(() => import('./modules/crm/pages/CrmNovoLead'));
const CrmDashboard = lazy(() => import('./modules/crm/pages/CrmDashboard'));
const CrmDashboardGerencial = lazy(() => import('./modules/crm/pages/CrmDashboardGerencial'));
const CrmDashboardSla = lazy(() => import('./modules/crm/pages/CrmDashboardSla'));
const CrmDashboardDistribuicao = lazy(() => import('./modules/crm/pages/CrmDashboardDistribuicao'));
const CrmTarefas = lazy(() => import('./modules/crm/pages/CrmTarefas'));
const CrmCarteira = lazy(() => import('./modules/crm/pages/CrmCarteira'));
const CrmInbox = lazy(() => import('./modules/crm/pages/CrmInbox'));
const CrmAutomacoes = lazy(() => import('./modules/crm/pages/CrmAutomacoes'));
const CrmAdminCanais = lazy(() => import('./modules/crm/pages/CrmAdminCanais'));
const CrmAdminNumeros = lazy(() => import('./modules/crm/pages/CrmAdminNumeros'));
const CrmAdminIntegracoes = lazy(() => import('./modules/crm/pages/CrmAdminIntegracoes'));
const FiscalDashboard = lazy(() => import('./modules/fiscal/pages/FiscalDashboard'));
const FiscalCompanies = lazy(() => import('./modules/fiscal/pages/FiscalCompanies'));
const FiscalDiagnostics = lazy(() => import('./modules/fiscal/pages/FiscalDiagnostics'));
const FiscalDocuments = lazy(() => import('./modules/fiscal/pages/FiscalDocuments'));
const FiscalDocumentDetail = lazy(() => import('./modules/fiscal/pages/FiscalDocumentDetail'));
const FiscalDivergences = lazy(() => import('./modules/fiscal/pages/FiscalDivergences'));
const FiscalAccountingBatches = lazy(() => import('./modules/fiscal/pages/FiscalAccountingBatches'));
const FiscalLogs = lazy(() => import('./modules/fiscal/pages/FiscalLogs'));

function PublicPage({ children }) {
  return (
    <Suspense fallback={<AppRouteFallback fullScreen />}>
      {children}
    </Suspense>
  );
}

function GestaoUsuariosRoute({ children }) {
  const { user } = useAuth();
  if (!canManageUsers(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function SuperadminRoute({ children }) {
  const { user } = useAuth();
  if (!isSuperadmin(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function BusinessAdminRoute({ children }) {
  const { user } = useAuth();
  if (!isBusinessAdmin(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function EnabledModuleRoute({ moduleKey, children }) {
  const { user } = useAuth();
  if (!hasEnabledModule(user, moduleKey)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ModuloComprasRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessCompras(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ComprasPedidosRoute({ children }) {
  const { user } = useAuth();
  if (!canViewComprasPedidos(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ComprasPedidosCreateRoute({ children }) {
  const { user } = useAuth();
  if (!canCreateComprasPedidos(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ComprasCotacoesRoute({ children }) {
  const { user } = useAuth();
  if (!canViewComprasCotacoes(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ComprasCotacoesManageRoute({ children }) {
  const { user } = useAuth();
  if (!canManageComprasCotacoes(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function FinanceiroRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessFinanceiro(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function FinanceiroPagamentosRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessPagamentos(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function BoletosRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessBoletos(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ComunicacaoRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessComunicacao(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function BibliotecaRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessBiblioteca(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function CadastroObrasRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessCadastroObras(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function CrmDashboardRoute({ children }) {
  const { user } = useAuth();
  if (!canViewCrmDashboard(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function CrmLeadsRoute({ children }) {
  const { user } = useAuth();
  if (!canViewCrmLeads(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function CrmLeadsCreateRoute({ children }) {
  const { user } = useAuth();
  if (!canCreateCrmLeads(user)) {
    return <Navigate to="/crm/leads" replace />;
  }
  return children;
}

function CrmAtendimentoRoute({ children }) {
  const { user } = useAuth();
  if (!canViewCrmAtendimento(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function CrmAutomacoesRoute({ children }) {
  const { user } = useAuth();
  if (!canViewCrmAutomacoes(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function CrmConfiguracoesRoute({ children }) {
  const { user } = useAuth();
  if (!canViewCrmConfiguracoes(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function FiscalRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessFiscal(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function FiscalConfigRoute({ children }) {
  const { user } = useAuth();
  if (!canManageFiscalConfig(user)) {
    return <Navigate to="/fiscal" replace />;
  }
  return children;
}

function FiscalDocumentsRoute({ children }) {
  const { user } = useAuth();
  if (!canViewFiscalDocuments(user)) {
    return <Navigate to="/fiscal" replace />;
  }
  return children;
}

function FiscalLogsRoute({ children }) {
  const { user } = useAuth();
  if (!canViewFiscalLogs(user)) {
    return <Navigate to="/fiscal" replace />;
  }
  return children;
}

function PrioridadesDiretoriaRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessPrioridadesDiretoria(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function GestaoObrasRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessGestaoObras(user)) {
    return <Navigate to="/obras" replace />;
  }
  return children;
}

function ContratosRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessContratos(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ComercialRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessComercial(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ComercialEmpreendimentosRoute({ children }) {
  const { user } = useAuth();
  if (!canViewComercialEmpreendimentos(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ComercialContratosRoute({ children }) {
  const { user } = useAuth();
  if (!canViewComercialContratos(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ProvisionamentosRoute({ children }) {
  const { user } = useAuth();
  if (!canViewProvisionamentos(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ProvisionamentosCreateRoute({ children }) {
  const { user } = useAuth();
  if (!canCreateProvisionamentos(user)) {
    return <Navigate to="/provisoes-financeiras" replace />;
  }
  return children;
}

function ProvisionamentosDashboardRoute({ children }) {
  const { user } = useAuth();
  if (!canViewProvisionamentosDashboard(user)) {
    return <Navigate to="/provisoes-financeiras" replace />;
  }
  return children;
}

function ProvisionamentosCategoriasRoute({ children }) {
  const { user } = useAuth();
  if (!canManageProvisionamentoCategorias(user)) {
    return <Navigate to="/provisoes-financeiras" replace />;
  }
  return children;
}

function RhDpDashboardRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessRhDpDashboard(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RhDpEmpresasRoute({ children }) {
  const { user } = useAuth();
  if (!canAccessRhDpEmpresas(user)) {
    return <Navigate to="/rh-dp" replace />;
  }
  return children;
}

function RhDpColaboradoresRoute({ children }) {
  const { user } = useAuth();
  if (!canViewRhDpColaboradores(user)) {
    return <Navigate to="/rh-dp" replace />;
  }
  return children;
}

function RhDpDocumentosRoute({ children }) {
  const { user } = useAuth();
  if (!canViewRhDpDocumentos(user)) {
    return <Navigate to="/rh-dp" replace />;
  }
  return children;
}

function RhDpImportacoesRoute({ children }) {
  const { user } = useAuth();
  if (!canExecuteRhDpImportacoes(user)) {
    return <Navigate to="/rh-dp" replace />;
  }
  return children;
}

function RhDpApuracaoRoute({ children }) {
  const { user } = useAuth();
  if (!canViewRhDpApuracao(user)) {
    return <Navigate to="/rh-dp" replace />;
  }
  return children;
}

function RhDpFinanceiroRoute({ children }) {
  const { user } = useAuth();
  if (!canViewRhDpObrigacoes(user)) {
    return <Navigate to="/rh-dp" replace />;
  }
  if (!hasEnabledModule(user, 'FINANCEIRO')) {
    return <Navigate to="/rh-dp" replace />;
  }
  return children;
}

function IntegracaoSiengeRoute({ children }) {
  const { user } = useAuth();
  if (!canViewIntegracaoSienge(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={(
          <PublicPage>
            <Login />
          </PublicPage>
        )}
      />
      <Route
        path="/cotacao/:token"
        element={(
          <PublicPage>
            <CotacaoFornecedorPublica />
          </PublicPage>
        )}
      />

      <Route
        path="/"
        element={(
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        )}
      >
        <Route index element={<Dashboard />} />

        <Route path="solicitacoes" element={<Solicitacoes />} />
        <Route path="solicitacoes/relatorios" element={<ModuloRelatorios modulo="solicitacoes" />} />
        <Route path="solicitacoes/relatorios/operacional" element={<SolicitacoesRelatorioOperacional />} />
        <Route path="solicitacoes-arquivadas" element={<SolicitacoesArquivadas />} />
        <Route path="solicitacoes/:id" element={<SolicitacaoDetalhe />} />
        <Route path="prioridades-diretoria" element={<PrioridadesDiretoriaRoute><PrioridadesDiretoria /></PrioridadesDiretoriaRoute>} />
        <Route path="comunicacao-interna" element={<ComunicacaoRoute><ComunicacaoInterna /></ComunicacaoRoute>} />
        <Route path="conversas/entrada" element={<ComunicacaoRoute><ComunicacaoInterna /></ComunicacaoRoute>} />
        <Route path="conversas/saida" element={<ComunicacaoRoute><ComunicacaoInterna /></ComunicacaoRoute>} />
        <Route path="conversas/:id" element={<ComunicacaoRoute><ComunicacaoInterna /></ComunicacaoRoute>} />
        <Route path="arquivos-modelos" element={<BibliotecaRoute><ArquivosModelos /></BibliotecaRoute>} />

        <Route path="nova-solicitacao" element={<NovaSolicitacao />} />

        <Route path="usuarios" element={<GestaoUsuariosRoute><Usuarios /></GestaoUsuariosRoute>} />
        <Route path="usuarios/novo" element={<GestaoUsuariosRoute><UsuarioNovo /></GestaoUsuariosRoute>} />
        <Route path="usuarios/:id" element={<GestaoUsuariosRoute><UsuarioNovo /></GestaoUsuariosRoute>} />
        <Route path="usuarios/:id/editar" element={<GestaoUsuariosRoute><UsuarioNovo /></GestaoUsuariosRoute>} />

        <Route path="obras" element={<CadastroObrasRoute><Obras /></CadastroObrasRoute>} />
        <Route path="obras/:id" element={<GestaoObrasRoute><ObraGestao /></GestaoObrasRoute>} />
        <Route path="setores" element={<BusinessAdminRoute><Setores /></BusinessAdminRoute>} />
        <Route path="tipos-solicitacao" element={<BusinessAdminRoute><TiposSolicitacao /></BusinessAdminRoute>} />
        <Route path="gestao-contratos" element={<ContratosRoute><GestaoContratos /></ContratosRoute>} />
        <Route path="configuracoes" element={<BusinessAdminRoute><Configuracoes /></BusinessAdminRoute>} />
        <Route path="configuracoes-suporte" element={<SuperadminRoute><ConfiguracoesSuporte /></SuperadminRoute>} />
        <Route path="empresas-grupo" element={<SuperadminRoute><EmpresasGrupo /></SuperadminRoute>} />
        <Route path="aprovacao-diretoria" element={<BusinessAdminRoute><AprovacaoDiretoria /></BusinessAdminRoute>} />
        <Route path="tipos-sub-contrato" element={<BusinessAdminRoute><TiposSubContrato /></BusinessAdminRoute>} />
        <Route path="status-setor" element={<BusinessAdminRoute><StatusSetor /></BusinessAdminRoute>} />
        <Route path="permissoes-setor" element={<BusinessAdminRoute><PermissoesSetor /></BusinessAdminRoute>} />
        <Route path="cores-sistema" element={<BusinessAdminRoute><CoresSistema /></BusinessAdminRoute>} />
        <Route path="areas-obra" element={<BusinessAdminRoute><AreasObra /></BusinessAdminRoute>} />
        <Route path="areas-por-setor-origem" element={<BusinessAdminRoute><AreasPorSetorOrigem /></BusinessAdminRoute>} />
        <Route path="setores-visiveis-usuario" element={<BusinessAdminRoute><SetoresVisiveisUsuario /></BusinessAdminRoute>} />
        <Route path="comportamento-recebimento-setor" element={<BusinessAdminRoute><ComportamentoRecebimentoSetor /></BusinessAdminRoute>} />
        <Route path="timeout-inatividade" element={<BusinessAdminRoute><TimeoutInatividade /></BusinessAdminRoute>} />
        <Route path="tipos-solicitacao-por-setor" element={<BusinessAdminRoute><TiposSolicitacaoPorSetor /></BusinessAdminRoute>} />
        <Route path="nova-solicitacao-campos" element={<SuperadminRoute><NovaSolicitacaoCamposConfig /></SuperadminRoute>} />
        <Route path="nova-solicitacao-automacao-destino" element={<SuperadminRoute><NovaSolicitacaoAutomacaoDestinoConfig /></SuperadminRoute>} />
        <Route path="tipos-compartilhados-setor" element={<BusinessAdminRoute><TiposCompartilhadosSetor /></BusinessAdminRoute>} />
        <Route path="automacao-status-setor" element={<BusinessAdminRoute><AutomacaoStatusSetor /></BusinessAdminRoute>} />
        <Route path="setores-criacao-todas-obras" element={<BusinessAdminRoute><SetoresCriacaoTodasObras /></BusinessAdminRoute>} />
        <Route path="setores-acesso-todas-obras" element={<BusinessAdminRoute><SetoresAcessoTodasObras /></BusinessAdminRoute>} />
        <Route path="usuarios-envio-qualquer-setor" element={<BusinessAdminRoute><UsuariosEnvioQualquerSetor /></BusinessAdminRoute>} />
        <Route path="usuarios-acesso-financeiro" element={<BusinessAdminRoute><UsuariosAcessoFinanceiro /></BusinessAdminRoute>} />
        <Route path="usuarios-acesso-prioridade-diretoria" element={<BusinessAdminRoute><UsuariosAcessoPrioridadeDiretoria /></BusinessAdminRoute>} />
        <Route path="usuarios-permissoes-rh-dp" element={<BusinessAdminRoute><UsuariosPermissoesRhDp /></BusinessAdminRoute>} />
        <Route path="permissoes-areas" element={<BusinessAdminRoute><PermissoesAreas /></BusinessAdminRoute>} />
        <Route path="arquivos-modelos-config" element={<SuperadminRoute><ArquivosModelosConfig /></SuperadminRoute>} />
        <Route path="configuracoes-cotacao" element={<EnabledModuleRoute moduleKey="COMPRAS"><EnabledModuleRoute moduleKey="COTACOES"><BusinessAdminRoute><ConfiguracoesCotacao /></BusinessAdminRoute></EnabledModuleRoute></EnabledModuleRoute>} />
        <Route path="configuracoes-status-pedidos-compra" element={<EnabledModuleRoute moduleKey="COMPRAS"><BusinessAdminRoute><ConfiguracoesStatusPedidoCompra /></BusinessAdminRoute></EnabledModuleRoute>} />
        <Route path="configuracoes-comercial-categorias" element={<EnabledModuleRoute moduleKey="COMERCIAL"><SuperadminRoute><ConfiguracoesComercialCategorias /></SuperadminRoute></EnabledModuleRoute>} />
        <Route path="configuracoes-modulos" element={<SuperadminRoute><ConfiguracoesModulos /></SuperadminRoute>} />
        <Route path="parceiros" element={<BusinessAdminRoute><Parceiros /></BusinessAdminRoute>} />
        <Route path="parceiros-categorias" element={<BusinessAdminRoute><ParceiroCategorias /></BusinessAdminRoute>} />
        <Route path="crm/dashboard" element={<CrmDashboardRoute><CrmDashboard /></CrmDashboardRoute>} />
        <Route path="crm/relatorios" element={<CrmDashboardRoute><ModuloRelatorios modulo="crm" /></CrmDashboardRoute>} />
        <Route path="crm/dashboard-gerencial" element={<CrmDashboardRoute><CrmDashboardGerencial /></CrmDashboardRoute>} />
        <Route path="crm/dashboard-sla" element={<CrmDashboardRoute><CrmDashboardSla /></CrmDashboardRoute>} />
        <Route path="crm/dashboard-distribuicao" element={<CrmDashboardRoute><CrmDashboardDistribuicao /></CrmDashboardRoute>} />
        <Route path="crm/leads" element={<CrmLeadsRoute><CrmLeads /></CrmLeadsRoute>} />
        <Route path="crm/leads/novo" element={<CrmLeadsCreateRoute><CrmNovoLead /></CrmLeadsCreateRoute>} />
        <Route path="crm/leads/:id" element={<CrmLeadsRoute><CrmLeadDetalhe /></CrmLeadsRoute>} />
        <Route path="crm/kanban" element={<CrmLeadsRoute><CrmKanban /></CrmLeadsRoute>} />
        <Route path="crm/tarefas" element={<CrmLeadsRoute><CrmTarefas /></CrmLeadsRoute>} />
        <Route path="crm/carteira" element={<CrmLeadsRoute><CrmCarteira /></CrmLeadsRoute>} />
        <Route path="crm/inbox" element={<CrmAtendimentoRoute><CrmInbox /></CrmAtendimentoRoute>} />
        <Route path="crm/automacoes" element={<CrmAutomacoesRoute><CrmAutomacoes /></CrmAutomacoesRoute>} />
        <Route path="crm/admin/canais" element={<CrmConfiguracoesRoute><CrmAdminCanais /></CrmConfiguracoesRoute>} />
        <Route path="crm/admin/numeros" element={<CrmConfiguracoesRoute><CrmAdminNumeros /></CrmConfiguracoesRoute>} />
        <Route path="crm/admin/integracoes" element={<CrmConfiguracoesRoute><CrmAdminIntegracoes /></CrmConfiguracoesRoute>} />
        <Route path="fiscal" element={<FiscalRoute><FiscalDashboard /></FiscalRoute>} />
        <Route path="fiscal/relatorios" element={<FiscalRoute><ModuloRelatorios modulo="fiscal" /></FiscalRoute>} />
        <Route path="fiscal/empresas" element={<FiscalConfigRoute><FiscalCompanies /></FiscalConfigRoute>} />
        <Route path="fiscal/diagnostico" element={<FiscalConfigRoute><FiscalDiagnostics /></FiscalConfigRoute>} />
        <Route path="fiscal/documentos" element={<FiscalDocumentsRoute><FiscalDocuments /></FiscalDocumentsRoute>} />
        <Route path="fiscal/documentos/:id" element={<FiscalDocumentsRoute><FiscalDocumentDetail /></FiscalDocumentsRoute>} />
        <Route path="fiscal/divergencias" element={<FiscalDocumentsRoute><FiscalDivergences /></FiscalDocumentsRoute>} />
        <Route path="fiscal/exportacao-contabil" element={<FiscalDocumentsRoute><FiscalAccountingBatches /></FiscalDocumentsRoute>} />
        <Route path="fiscal/logs" element={<FiscalLogsRoute><FiscalLogs /></FiscalLogsRoute>} />
        <Route path="comercial/empreendimentos" element={<ComercialEmpreendimentosRoute><ComercialEmpreendimentos /></ComercialEmpreendimentosRoute>} />
        <Route path="comercial/relatorios" element={<ComercialRoute><ModuloRelatorios modulo="comercial" /></ComercialRoute>} />
        <Route path="comercial/unidades" element={<ComercialEmpreendimentosRoute><ComercialUnidades /></ComercialEmpreendimentosRoute>} />
        <Route path="comercial/tabelas-preco" element={<ComercialEmpreendimentosRoute><ComercialTabelasPreco /></ComercialEmpreendimentosRoute>} />
        <Route path="comercial/mapa-unidades" element={<ComercialEmpreendimentosRoute><ComercialMapaUnidades /></ComercialEmpreendimentosRoute>} />
        <Route path="comercial/contratos" element={<ComercialContratosRoute><ComercialContratos /></ComercialContratosRoute>} />
        <Route path="comercial/modelos-contrato" element={<ComercialContratosRoute><ComercialModelosContrato /></ComercialContratosRoute>} />
        <Route path="provisoes-financeiras" element={<ProvisionamentosRoute><ProvisionamentosFinanceiros /></ProvisionamentosRoute>} />
        <Route path="provisoes-financeiras/relatorios" element={<ProvisionamentosDashboardRoute><ModuloRelatorios modulo="provisionamento" /></ProvisionamentosDashboardRoute>} />
        <Route path="provisoes-financeiras/nova" element={<ProvisionamentosCreateRoute><NovaProvisaoFinanceira /></ProvisionamentosCreateRoute>} />
        <Route path="provisoes-financeiras/:id" element={<ProvisionamentosRoute><ProvisionamentoFinanceiroDetalhe /></ProvisionamentosRoute>} />
        <Route path="provisoes-financeiras/dashboard" element={<ProvisionamentosDashboardRoute><DashboardProvisionamentoFinanceiro /></ProvisionamentosDashboardRoute>} />
        <Route path="provisoes-financeiras/categorias" element={<ProvisionamentosCategoriasRoute><GestaoCategoriasMacro /></ProvisionamentosCategoriasRoute>} />
        <Route path="rh-dp" element={<RhDpDashboardRoute><RhDpInicio /></RhDpDashboardRoute>} />
        <Route path="rh-dp/relatorios" element={<RhDpDashboardRoute><ModuloRelatorios modulo="rhdp" /></RhDpDashboardRoute>} />
        <Route path="rh-dp/empresas" element={<RhDpEmpresasRoute><RhDpEmpresas /></RhDpEmpresasRoute>} />
        <Route path="rh-dp/colaboradores" element={<RhDpColaboradoresRoute><RhDpColaboradores /></RhDpColaboradoresRoute>} />
        <Route path="rh-dp/documentos" element={<RhDpDocumentosRoute><RhDpDocumentos /></RhDpDocumentosRoute>} />
        <Route path="rh-dp/importacoes" element={<RhDpImportacoesRoute><RhDpImportacoes /></RhDpImportacoesRoute>} />
        <Route path="rh-dp/apuracao" element={<RhDpApuracaoRoute><RhDpApuracao /></RhDpApuracaoRoute>} />
        <Route path="rh-dp/fechamentos" element={<RhDpFinanceiroRoute><RhDpFechamentos /></RhDpFinanceiroRoute>} />
        <Route path="integracao-sienge" element={<IntegracaoSiengeRoute><IntegracaoSiengeInicio /></IntegracaoSiengeRoute>} />

        <Route path="comprovantes/upload" element={<FinanceiroRoute><UploadComprovantes /></FinanceiroRoute>} />
        <Route path="comprovantes/pendentes" element={<FinanceiroRoute><ComprovantesPendentes /></FinanceiroRoute>} />
        <Route path="financeiro/titulos" element={<FinanceiroRoute><FinanceiroTitulos /></FinanceiroRoute>} />
        <Route path="financeiro/titulos/novo" element={<FinanceiroRoute><FinanceiroTituloNovo /></FinanceiroRoute>} />
        <Route path="financeiro/titulos/:id/editar" element={<FinanceiroRoute><FinanceiroTituloEditar /></FinanceiroRoute>} />
        <Route path="financeiro/titulos/:id" element={<FinanceiroRoute><FinanceiroTituloDetalhe /></FinanceiroRoute>} />
        <Route path="financeiro/pagamentos" element={<FinanceiroPagamentosRoute><FinanceiroPagamentos /></FinanceiroPagamentosRoute>} />
        <Route path="financeiro/boletos" element={<BoletosRoute><FinanceiroBoletos /></BoletosRoute>} />
        <Route path="financeiro/relatorios" element={<FinanceiroRoute><FinanceiroRelatorios /></FinanceiroRoute>} />
        <Route path="financeiro/relatorios/grupo-consolidado" element={<FinanceiroRoute><FinanceiroExecutivoGrupo /></FinanceiroRoute>} />
        <Route path="financeiro/relatorios/fluxo-consolidado" element={<FinanceiroRoute><FinanceiroFluxoConsolidado /></FinanceiroRoute>} />
        <Route path="financeiro/relatorios/dre" element={<FinanceiroRoute><FinanceiroDre /></FinanceiroRoute>} />
        <Route path="financeiro/relatorios/dre/diagnostico" element={<FinanceiroRoute><FinanceiroDiagnosticoDre /></FinanceiroRoute>} />
        <Route path="financeiro/relatorios/intercompany" element={<FinanceiroRoute><FinanceiroIntercompany /></FinanceiroRoute>} />
        <Route path="financeiro/relatorios/endividamento" element={<FinanceiroRoute><FinanceiroEndividamento /></FinanceiroRoute>} />
        <Route path="financeiro/relatorios/analitico" element={<FinanceiroRoute><FinanceiroRelatorioAnalitico /></FinanceiroRoute>} />
        <Route path="financeiro/relatorios/resultado-obras" element={<FinanceiroRoute><FinanceiroResultadoObras /></FinanceiroRoute>} />
        <Route path="financeiro/relatorios/centros-custo" element={<FinanceiroRoute><FinanceiroResultadoCentrosCusto /></FinanceiroRoute>} />
        <Route path="financeiro/baixas" element={<FinanceiroRoute><FinanceiroBaixas /></FinanceiroRoute>} />
        <Route path="financeiro/conciliacao" element={<FinanceiroRoute><FinanceiroConciliacao /></FinanceiroRoute>} />
        <Route path="financeiro/caixas" element={<FinanceiroRoute><FinanceiroCaixas /></FinanceiroRoute>} />
        <Route path="financeiro/cadastros" element={<FinanceiroRoute><FinanceiroCadastros /></FinanceiroRoute>} />
        <Route path="compras/relatorios" element={<ModuloComprasRoute><ModuloRelatorios modulo="compras" /></ModuloComprasRoute>} />
        <Route path="compras/relatorios/auditoria" element={<ModuloComprasRoute><BusinessAdminRoute><RelatoriosAdministrativos /></BusinessAdminRoute></ModuloComprasRoute>} />
        <Route path="compras/relatorios/categorias-insumos" element={<ModuloComprasRoute><ComprasCotacoesRoute><ComprasRelatorioCategoriasInsumos /></ComprasCotacoesRoute></ModuloComprasRoute>} />
        <Route path="compras/relatorios/demanda-pedidos" element={<ModuloComprasRoute><ComprasCotacoesRoute><ComprasRelatorioDemandaPedidos /></ComprasCotacoesRoute></ModuloComprasRoute>} />
        <Route path="compras/relatorios/ciclo" element={<ModuloComprasRoute><ComprasCotacoesRoute><ComprasRelatorioCiclo /></ComprasCotacoesRoute></ModuloComprasRoute>} />
        <Route path="compras/relatorios/economia-cotacoes" element={<ModuloComprasRoute><ComprasCotacoesRoute><ComprasRelatorioEconomiaCotacoes /></ComprasCotacoesRoute></ModuloComprasRoute>} />
        <Route path="compras/relatorios/fornecedores" element={<ModuloComprasRoute><ComprasCotacoesRoute><ComprasRelatorioFornecedores /></ComprasCotacoesRoute></ModuloComprasRoute>} />
        <Route path="relatorios/administrativos" element={<ModuloComprasRoute><BusinessAdminRoute><RelatoriosAdministrativos /></BusinessAdminRoute></ModuloComprasRoute>} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="contratos/relatorios" element={<ContratosRoute><ModuloRelatorios modulo="contratos" /></ContratosRoute>} />
        <Route path="solicitacoes-compra" element={<ModuloComprasRoute><SolicitacoesCompra /></ModuloComprasRoute>} />
        <Route path="solicitacoes-compra/:id" element={<ModuloComprasRoute><SolicitacaoCompraDetalhe /></ModuloComprasRoute>} />
        <Route path="solicitacoes-compra/nova" element={<ComprasPedidosCreateRoute><NovaSolicitacaoCompra /></ComprasPedidosCreateRoute>} />
        <Route path="solicitacoes-compra/revisar" element={<ModuloComprasRoute><RevisarSolicitacaoCompra /></ModuloComprasRoute>} />
        <Route path="solicitacoes-compra/finalizada/:id" element={<ModuloComprasRoute><RevisarSolicitacaoCompraFinal /></ModuloComprasRoute>} />
        <Route path="pedidos-compra" element={<ComprasPedidosRoute><PedidosCompra /></ComprasPedidosRoute>} />
        <Route path="pedidos-compra/:id" element={<ComprasPedidosRoute><PedidoCompraDetalhe /></ComprasPedidosRoute>} />
        <Route path="gestao-apropriacoes" element={<GestaoObrasRoute><BusinessAdminRoute><GestaoApropriacoes /></BusinessAdminRoute></GestaoObrasRoute>} />
        <Route path="gestao-insumos" element={<ModuloComprasRoute><BusinessAdminRoute><GestaoInsumos /></BusinessAdminRoute></ModuloComprasRoute>} />
        <Route path="gestao-unidades" element={<ModuloComprasRoute><BusinessAdminRoute><GestaoUnidades /></BusinessAdminRoute></ModuloComprasRoute>} />
        <Route path="gestao-categorias" element={<ModuloComprasRoute><BusinessAdminRoute><GestaoCategorias /></BusinessAdminRoute></ModuloComprasRoute>} />
        <Route path="gestao-fornecedores" element={<EnabledModuleRoute moduleKey="COTACOES"><ComprasCotacoesManageRoute><GestaoFornecedores /></ComprasCotacoesManageRoute></EnabledModuleRoute>} />
        <Route path="cotacoes" element={<EnabledModuleRoute moduleKey="COTACOES"><ComprasCotacoesRoute><ListaCotacoes /></ComprasCotacoesRoute></EnabledModuleRoute>} />
        <Route path="cotacoes/nova" element={<EnabledModuleRoute moduleKey="COTACOES"><ComprasCotacoesManageRoute><NovaCotacaoAvulsa /></ComprasCotacoesManageRoute></EnabledModuleRoute>} />
      </Route>
    </Routes>
  );
}
