import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import PrivateRoute from './components/PrivateRoute';

// Layout
import Layout from './layout/Layout';

// Páginas públicas
import Login from './pages/Login';

// Páginas protegidas
import Dashboard from './pages/Dashboard';
import Solicitacoes from './pages/Solicitacoes';
import SolicitacaoDetalhe from './pages/SolicitacaoDetalhe';
import SolicitacoesArquivadas from './pages/SolicitacoesArquivadas';
import Usuarios from './pages/Usuarios';
import UsuarioNovo from './pages/UsuarioNovo';
import NovaSolicitacao from './pages/NovaSolicitacao';
import UploadComprovantes from './pages/UploadComprovantes';
import ComprovantesPendentes from './pages/ComprovantesPendentes';
import Obras from './pages/Obras';
import Setores from './pages/Setores';
import TiposSolicitacao from './pages/TiposSolicitacao';
import Cargo from './pages/Cargos';
import GestaoContratos from './pages/GestaoContratos';
import Configuracoes from './pages/Configuracoes';
import TiposSubContrato from './pages/TiposSubContrato';
import StatusSetor from './pages/StatusSetor';
import Perfil from './pages/Perfil';
import PermissoesSetor from './pages/PermissoesSetor';
import CoresSistema from './pages/CoresSistema';
import AreasObra from './pages/AreasObra';
import AprovacaoDiretoria from './pages/AprovacaoDiretoria';
import AreasPorSetorOrigem from './pages/AreasPorSetorOrigem';
import SetoresVisiveisUsuario from './pages/SetoresVisiveisUsuario';
import ComportamentoRecebimentoSetor from './pages/ComportamentoRecebimentoSetor';
import TimeoutInatividade from './pages/TimeoutInatividade';
import TiposSolicitacaoPorSetor from './pages/TiposSolicitacaoPorSetor';
import TiposCompartilhadosSetor from './pages/TiposCompartilhadosSetor';
import AutomacaoStatusSetor from './pages/AutomacaoStatusSetor';
import SetoresCriacaoTodasObras from './pages/SetoresCriacaoTodasObras';
import SetoresSemAlteracaoStatus from './pages/SetoresSemAlteracaoStatus';
import SetoresAlteracaoStatusLivre from './pages/SetoresAlteracaoStatusLivre';
import UsuariosAcessoPrioridadeDiretoria from './pages/UsuariosAcessoPrioridadeDiretoria';
import UsuariosEnvioQualquerSetor from './pages/UsuariosEnvioQualquerSetor';
import UsuariosAlterarValorSolicitacao from './pages/UsuariosAlterarValorSolicitacao';
import UsuariosListarTodasSolicitacoes from './pages/UsuariosListarTodasSolicitacoes';
import PrioridadesDiretoria from './pages/PrioridadesDiretoria';
import ConversasEntrada from './pages/ConversasEntrada';
import ConversasSaida from './pages/ConversasSaida';
import ConversaDetalhe from './pages/ConversaDetalhe';
import ArquivosModelos from './pages/ArquivosModelos';
import ArquivosModelosConfig from './pages/ArquivosModelosConfig';
import ConfiguracaoProvisionamentoFinanceiro from './modules/provisionamento-financeiro/pages/ConfiguracaoProvisionamentoFinanceiro';
import DashboardProvisionamentoFinanceiro from './modules/provisionamento-financeiro/pages/DashboardProvisionamentoFinanceiro';
import GestaoCategoriasMacro from './modules/provisionamento-financeiro/pages/GestaoCategoriasMacro';
import NovaProvisaoFinanceira from './modules/provisionamento-financeiro/pages/NovaProvisaoFinanceira';
import ProvisionamentoFinanceiroDetalhe from './modules/provisionamento-financeiro/pages/ProvisionamentoFinanceiroDetalhe';
import ProvisionamentosFinanceiros from './modules/provisionamento-financeiro/pages/ProvisionamentosFinanceiros';
import {
  CotacaoFornecedorPublica,
  GestaoApropriacoes,
  GestaoCategorias,
  GestaoInsumos,
  GestaoUnidades,
  NovaSolicitacaoCompra,
  RevisarSolicitacaoCompra,
  RevisarSolicitacaoCompraFinal,
  SolicitacaoCompraDetalhe,
  SolicitacoesCompra
} from './modules/solicitacao-compra/pages';
import { useAuth } from './contexts/AuthContext';
import { isGeoSetor, normalizarSetorToken } from './utils/setor';
import { getPrioridadesDiretoriaContexto } from './services/prioridadesDiretoria';

const SETORES_PRIORIDADES_DIRETORIA = new Set([
  'DIR_ADMIN',
  'DIRETORIA_ADMINISTRATIVA',
  'DIR_ADMINISTRATIVA',
  'DIR_OBRAS_PUBLICAS',
  'DIRETORIA_OBRAS_PUBLICAS',
  'DIRETORIA_DE_OBRAS_PUBLICAS',
  'DIR_OBRAS_PRIVADAS',
  'DIRETORIA_OBRAS_PRIVADAS',
  'DIRETORIA_DE_OBRAS_PRIVADAS'
]);

function GestaoUsuariosRoute({ children }) {
  const { user } = useAuth();
  const perfil = String(user?.perfil || '').toUpperCase();
  const tokens = [
    String(user?.setor?.codigo || '').toUpperCase(),
    String(user?.setor?.nome || '').toUpperCase(),
    String(user?.area || '').toUpperCase()
  ];
  const isAdminGEO = perfil === 'ADMIN' && tokens.some(isGeoSetor);
  const permitido = perfil === 'SUPERADMIN' || isAdminGEO;

  if (!permitido) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function SuperadminRoute({ children }) {
  const { user } = useAuth();
  const perfil = String(user?.perfil || '').toUpperCase();
  if (perfil !== 'SUPERADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ModuloComprasRoute({ children }) {
  const { user } = useAuth();
  const perfil = String(user?.perfil || '').toUpperCase();
  const permitido =
    perfil === 'SUPERADMIN' ||
    perfil === 'ADMIN' ||
    Boolean(user?.pode_criar_solicitacao_compra);

  if (!permitido) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PrioridadesDiretoriaRoute({ children }) {
  const { user } = useAuth();
  const [acessoConfigurado, setAcessoConfigurado] = useState(false);
  const [carregandoAcesso, setCarregandoAcesso] = useState(true);
  const perfil = String(user?.perfil || '').toUpperCase();
  const tokens = [
    user?.setor?.codigo,
    user?.setor?.nome,
    user?.area
  ]
    .map(normalizarSetorToken)
    .filter(Boolean);

  const permitido =
    perfil === 'SUPERADMIN' ||
    tokens.some((token) => SETORES_PRIORIDADES_DIRETORIA.has(token));

  useEffect(() => {
    let ativo = true;

    async function validarAcessoConfigurado() {
      if (permitido || !user?.id) {
        if (ativo) {
          setAcessoConfigurado(false);
          setCarregandoAcesso(false);
        }
        return;
      }

      try {
        setCarregandoAcesso(true);
        const contexto = await getPrioridadesDiretoriaContexto();
        if (ativo) {
          setAcessoConfigurado(Boolean(contexto?.permissoes?.pode_acessar_modulo));
        }
      } catch {
        if (ativo) {
          setAcessoConfigurado(false);
        }
      } finally {
        if (ativo) {
          setCarregandoAcesso(false);
        }
      }
    }

    validarAcessoConfigurado();
    return () => {
      ativo = false;
    };
  }, [permitido, user?.id]);

  if (!permitido && carregandoAcesso) {
    return <p>Carregando...</p>;
  }

  if (!permitido && !acessoConfigurado) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>

      {/* =========================
          LOGIN (PÚBLICO)
      ========================= */}
      <Route path="/login" element={<Login />} />
      <Route path="/cotacao/:token" element={<CotacaoFornecedorPublica />} />

      {/* =========================
          ÁREA PROTEGIDA
      ========================= */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >

        <Route index element={<Dashboard />} />

        <Route path="solicitacoes" element={<Solicitacoes />} />
        <Route path="solicitacoes-arquivadas" element={<SolicitacoesArquivadas />} />
        <Route path="solicitacoes/:id" element={<SolicitacaoDetalhe />} />
        <Route path="prioridades-diretoria" element={<PrioridadesDiretoriaRoute><PrioridadesDiretoria /></PrioridadesDiretoriaRoute>} />
        <Route path="conversas/entrada" element={<ConversasEntrada />} />
        <Route path="conversas/saida" element={<ConversasSaida />} />
        <Route path="conversas/:id" element={<ConversaDetalhe />} />
        <Route path="arquivos-modelos" element={<ArquivosModelos />} />

        <Route path="nova-solicitacao" element={<NovaSolicitacao />} />

        <Route path="usuarios" element={<GestaoUsuariosRoute><Usuarios /></GestaoUsuariosRoute>} />
        <Route path="usuarios/novo" element={<GestaoUsuariosRoute><UsuarioNovo /></GestaoUsuariosRoute>} />
        <Route path="usuarios/:id" element={<GestaoUsuariosRoute><UsuarioNovo /></GestaoUsuariosRoute>} />
        <Route path="usuarios/:id/editar" element={<GestaoUsuariosRoute><UsuarioNovo /></GestaoUsuariosRoute>} />

        <Route path="obras" element={<Obras />} />
        <Route path="setores" element={<Setores />} />
        <Route path="cargos" element={<Cargo />} />
        <Route path="tipos-solicitacao" element={<TiposSolicitacao />} />
        <Route path="gestao-contratos" element={<GestaoContratos />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="tipos-sub-contrato" element={<TiposSubContrato />} />
        <Route path="status-setor" element={<StatusSetor />} />
        <Route path="permissoes-setor" element={<PermissoesSetor />} />
        <Route path="cores-sistema" element={<CoresSistema />} />
        <Route path="areas-obra" element={<AreasObra />} />
        <Route path="aprovacao-diretoria" element={<SuperadminRoute><AprovacaoDiretoria /></SuperadminRoute>} />
        <Route path="areas-por-setor-origem" element={<AreasPorSetorOrigem />} />
        <Route path="setores-visiveis-usuario" element={<SetoresVisiveisUsuario />} />
        <Route path="usuarios-envio-qualquer-setor" element={<SuperadminRoute><UsuariosEnvioQualquerSetor /></SuperadminRoute>} />
        <Route path="usuarios-alterar-valor-solicitacao" element={<SuperadminRoute><UsuariosAlterarValorSolicitacao /></SuperadminRoute>} />
        <Route path="usuarios-listar-todas-solicitacoes" element={<SuperadminRoute><UsuariosListarTodasSolicitacoes /></SuperadminRoute>} />
        <Route path="comportamento-recebimento-setor" element={<ComportamentoRecebimentoSetor />} />
        <Route path="timeout-inatividade" element={<TimeoutInatividade />} />
        <Route path="tipos-solicitacao-por-setor" element={<TiposSolicitacaoPorSetor />} />
        <Route path="tipos-compartilhados-setor" element={<SuperadminRoute><TiposCompartilhadosSetor /></SuperadminRoute>} />
        <Route path="automacao-status-setor" element={<SuperadminRoute><AutomacaoStatusSetor /></SuperadminRoute>} />
        <Route path="setores-criacao-todas-obras" element={<SetoresCriacaoTodasObras />} />
        <Route path="setores-sem-alteracao-status" element={<SuperadminRoute><SetoresSemAlteracaoStatus /></SuperadminRoute>} />
        <Route path="setores-alteracao-status-livre" element={<SuperadminRoute><SetoresAlteracaoStatusLivre /></SuperadminRoute>} />
        <Route path="usuarios-acesso-prioridade-diretoria" element={<SuperadminRoute><UsuariosAcessoPrioridadeDiretoria /></SuperadminRoute>} />
        <Route path="arquivos-modelos-config" element={<SuperadminRoute><ArquivosModelosConfig /></SuperadminRoute>} />
        <Route path="provisionamento-financeiro-config" element={<SuperadminRoute><ConfiguracaoProvisionamentoFinanceiro /></SuperadminRoute>} />
        <Route path="provisoes-financeiras/dashboard" element={<DashboardProvisionamentoFinanceiro />} />
        <Route path="provisoes-financeiras" element={<ProvisionamentosFinanceiros />} />
        <Route path="provisoes-financeiras/nova" element={<NovaProvisaoFinanceira />} />
        <Route path="provisoes-financeiras/categorias" element={<SuperadminRoute><GestaoCategoriasMacro /></SuperadminRoute>} />
        <Route path="provisoes-financeiras/:id" element={<ProvisionamentoFinanceiroDetalhe />} />

        <Route path="comprovantes/upload" element={<UploadComprovantes />} />
        <Route path="comprovantes/pendentes" element={<ComprovantesPendentes />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="solicitacoes-compra" element={<ModuloComprasRoute><SolicitacoesCompra /></ModuloComprasRoute>} />
        <Route path="solicitacoes-compra/:id" element={<ModuloComprasRoute><SolicitacaoCompraDetalhe /></ModuloComprasRoute>} />
        <Route path="solicitacoes-compra/nova" element={<ModuloComprasRoute><NovaSolicitacaoCompra /></ModuloComprasRoute>} />
        <Route path="solicitacoes-compra/revisar" element={<ModuloComprasRoute><RevisarSolicitacaoCompra /></ModuloComprasRoute>} />
        <Route path="solicitacoes-compra/finalizada/:id" element={<ModuloComprasRoute><RevisarSolicitacaoCompraFinal /></ModuloComprasRoute>} />
        <Route path="gestao-apropriacoes" element={<SuperadminRoute><GestaoApropriacoes /></SuperadminRoute>} />
        <Route path="gestao-insumos" element={<SuperadminRoute><GestaoInsumos /></SuperadminRoute>} />
        <Route path="gestao-unidades" element={<SuperadminRoute><GestaoUnidades /></SuperadminRoute>} />
        <Route path="gestao-categorias" element={<SuperadminRoute><GestaoCategorias /></SuperadminRoute>} />

      </Route>

    </Routes>
  );
}
