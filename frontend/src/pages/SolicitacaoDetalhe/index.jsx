import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiChevronRight } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';

import Header from './Header';
import Timeline from './Timeline';
import Comentarios from './Comentarios';
import Anexos from './Anexos';
import Pedido from './Pedido';
import Pagamentos from './Pagamentos';
import ModalAlterarStatus from './ModalAlterarStatus';
import ModalEnviarSetor from '../Solicitacoes/ModalEnviarSetor';
import {
  aprovarDiretoriaSolicitacao,
  updateStatusSolicitacao
} from '../../services/solicitacoes';
import {
  getSetoresAlteracaoStatusLivre,
  getSetoresSemAlteracaoStatus
} from '../../services/configuracoesSistema';
import { API_URL, authHeaders } from '../../services/api';
import {
  isGeoSetor,
  normalizarSetorToken,
  obterTokensSetorUsuario,
  usuarioPodeEnviarSolicitacaoParaOutroSetor
} from '../../utils/setor';

const TOKENS_DIRETORIA_OBRAS = new Set([
  'DIR_OBRAS_PUBLICAS',
  'DIRETORIA_OBRAS_PUBLICAS',
  'DIRETORIA_DE_OBRAS_PUBLICAS',
  'DIR_DE_OBRAS_PUBLICAS',
  'OBRAS_PUBLICAS',
  'DIR_OBRAS_PRIVADAS',
  'DIRETORIA_OBRAS_PRIVADAS',
  'DIRETORIA_DE_OBRAS_PRIVADAS',
  'DIR_DE_OBRAS_PRIVADAS',
  'OBRAS_PRIVADAS'
]);

function normalizarDiretoriaObrasToken(valor) {
  const token = normalizarSetorToken(valor)
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (token.includes('OBRAS_PRIVAD')) return 'DIR_OBRAS_PRIVADAS';
  if (token.includes('OBRAS_PUBLIC')) return 'DIR_OBRAS_PUBLICAS';
  if (!TOKENS_DIRETORIA_OBRAS.has(token)) return null;
  return token.includes('PRIVAD') ? 'DIR_OBRAS_PRIVADAS' : 'DIR_OBRAS_PUBLICAS';
}

function isDiretoriaObrasToken(valor) {
  return Boolean(normalizarDiretoriaObrasToken(valor));
}

function tokensSetorEquivalentes(tokenA, tokenB) {
  const a = normalizarSetorToken(tokenA);
  const b = normalizarSetorToken(tokenB);
  if (!a || !b) return false;
  if (a === b) return true;
  return isGeoSetor(a) && isGeoSetor(b);
}

function obterDiretoriaObrasUsuarioParaStatus(user, diretoriasPermitidas = []) {
  const tokensNormalizados = obterTokensSetorUsuario(user)
    .map(token => normalizarDiretoriaObrasToken(token) || normalizarSetorToken(token))
    .filter(Boolean);
  const permitidas = (Array.isArray(diretoriasPermitidas) ? diretoriasPermitidas : [diretoriasPermitidas])
    .map(normalizarDiretoriaObrasToken)
    .filter(Boolean);

  if (permitidas.length === 0) return null;

  return permitidas.find(token => tokensNormalizados.includes(token)) || null;
}

export default function SolicitacaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const setorTokens = obterTokensSetorUsuario(user);

  const isSetorGeo = setorTokens.some(isGeoSetor);
  const isSetorCompras = setorTokens.some(token => normalizarSetorToken(token) === 'COMPRAS');
  const isSetorFinanceiro = setorTokens.some(token => normalizarSetorToken(token) === 'FINANCEIRO');
  const isSuperadmin = String(user?.perfil || '').trim().toUpperCase() === 'SUPERADMIN';

  const [solicitacao, setSolicitacao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalStatus, setModalStatus] = useState(false);
  const [modalEnviarSetor, setModalEnviarSetor] = useState(false);
  const [tokensSetoresSemAlteracaoStatus, setTokensSetoresSemAlteracaoStatus] = useState([]);
  const [tokensSetoresAlteracaoStatusLivre, setTokensSetoresAlteracaoStatusLivre] = useState([]);
  const [loadingConfiguracaoStatus, setLoadingConfiguracaoStatus] = useState(true);

  const perfil = String(user?.perfil || '').trim().toUpperCase();
  const setorUsuario = user?.setor?.codigo || user?.area || user?.setor?.nome || '';

  useEffect(() => {
    carregar();
  }, [id]);

  useEffect(() => {
    async function carregarConfiguracaoStatus() {
      try {
        setLoadingConfiguracaoStatus(true);
        const [configuracaoSemAlteracao, configuracaoAlteracaoLivre] = await Promise.all([
          getSetoresSemAlteracaoStatus(),
          getSetoresAlteracaoStatusLivre()
        ]);
        const tokensSemAlteracao = Array.isArray(configuracaoSemAlteracao?.tokens)
          ? configuracaoSemAlteracao.tokens
          : configuracaoSemAlteracao?.setores;
        const tokensAlteracaoLivre = Array.isArray(configuracaoAlteracaoLivre?.tokens)
          ? configuracaoAlteracaoLivre.tokens
          : configuracaoAlteracaoLivre?.setores;
        setTokensSetoresSemAlteracaoStatus(Array.isArray(tokensSemAlteracao) ? tokensSemAlteracao : []);
        setTokensSetoresAlteracaoStatusLivre(Array.isArray(tokensAlteracaoLivre) ? tokensAlteracaoLivre : []);
      } catch (error) {
        console.error('Erro ao carregar configuracao de setores para alteracao de status', error);
        setTokensSetoresSemAlteracaoStatus([]);
        setTokensSetoresAlteracaoStatusLivre([]);
      } finally {
        setLoadingConfiguracaoStatus(false);
      }
    }

    carregarConfiguracaoStatus();
  }, []);

  async function carregar() {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/solicitacoes/${id}`, {
        headers: authHeaders()
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar solicitacao');
      }

      setSolicitacao(data);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar solicitacao');
    } finally {
      setLoading(false);
    }
  }

  async function salvarStatus(novoStatus) {
    try {
      await updateStatusSolicitacao(solicitacao.id, novoStatus);
      setModalStatus(false);
      await carregar();
      alert('Status alterado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao atualizar status');
    }
  }

  async function aprovarDiretoria() {
    const setorDestino = String(solicitacao?.setor_destino_aprovacao || '').trim();
    const confirmou = window.confirm(
      setorDestino
        ? `Aprovar esta solicitacao e enviar para ${setorDestino}?`
        : 'Aprovar esta solicitacao?'
    );

    if (!confirmou) {
      return;
    }

    try {
      await aprovarDiretoriaSolicitacao(solicitacao.id);
      const marcadorAtualizacao = {
        tipo: 'APROVACAO_DIRETORIA',
        solicitacao_id: solicitacao.id,
        timestamp: Date.now()
      };

      try {
        sessionStorage.setItem('solicitacoes:atualizar-lista', JSON.stringify(marcadorAtualizacao));
      } catch (storageError) {
        console.error('Erro ao sinalizar atualizacao da lista de solicitacoes', storageError);
      }

      window.dispatchEvent(new CustomEvent('solicitacoes:atualizar-lista', {
        detail: marcadorAtualizacao
      }));

      alert('Solicitacao aprovada com sucesso.');
      navigate('/solicitacoes', {
        state: {
          atualizarSolicitacoes: marcadorAtualizacao.timestamp,
          solicitacaoAprovadaId: solicitacao.id
        }
      });
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao aprovar solicitacao');
    }
  }

  if (loading || loadingConfiguracaoStatus) return <p>Carregando...</p>;
  if (!solicitacao) return null;

  const isSetorObra = setorTokens.some(token => normalizarSetorToken(token) === 'OBRA');
  const usaFluxoAprovacaoDiretoria = Boolean(solicitacao.usa_fluxo_aprovacao_diretoria);
  const podeAprovarDiretoria = Boolean(solicitacao.acao_aprovar_diretoria_disponivel);
  const podeAlterarStatusDiretoriaApi = Boolean(solicitacao.pode_alterar_status_diretoria);
  const solicitacaoEstaNaDiretoriaObras =
    isDiretoriaObrasToken(solicitacao.area_responsavel) ||
    isDiretoriaObrasToken(solicitacao.diretoria_responsavel) ||
    isDiretoriaObrasToken(solicitacao.diretoria_fluxo_codigo);
  const diretoriaStatusUsuario = obterDiretoriaObrasUsuarioParaStatus(user, [
    solicitacao.area_responsavel,
    solicitacao.diretoria_fluxo_codigo,
    solicitacao.diretoria_responsavel
  ]);
  const podeAlterarStatusDiretoria =
    Boolean(diretoriaStatusUsuario) ||
    solicitacaoEstaNaDiretoriaObras ||
    podeAprovarDiretoria ||
    podeAlterarStatusDiretoriaApi;
  const setorParaStatus =
    perfil === 'SUPERADMIN'
      ? null
      : diretoriaStatusUsuario ||
        (solicitacaoEstaNaDiretoriaObras
          ? (solicitacao.area_responsavel || solicitacao.diretoria_responsavel || solicitacao.diretoria_fluxo_codigo)
          : null) ||
        (podeAprovarDiretoria
          ? (solicitacao.area_responsavel || solicitacao.diretoria_responsavel)
          : null) ||
        (isSetorGeo
          ? 'GEO'
          : setorUsuario);
  const podeEnviarSetor =
    !usaFluxoAprovacaoDiretoria &&
    !isSetorObra &&
    usuarioPodeEnviarSolicitacaoParaOutroSetor(solicitacao.area_responsavel, user);
  const setorSolicitacaoToken = normalizarSetorToken(solicitacao.area_responsavel);
  const setorSemAlteracaoStatus = tokensSetoresSemAlteracaoStatus.some(token =>
    tokensSetorEquivalentes(token, setorSolicitacaoToken)
  );
  const usuarioTemAlteracaoStatusLivre = tokensSetoresAlteracaoStatusLivre.some(tokenLiberado =>
    setorTokens.some(tokenUsuario => tokensSetorEquivalentes(tokenLiberado, tokenUsuario))
  );
  const solicitacaoEstaNoSetorDoUsuario = setorTokens.some(tokenUsuario =>
    tokensSetorEquivalentes(tokenUsuario, solicitacao.area_responsavel)
  );
  const podeAlterarStatus =
    isSuperadmin ||
    usuarioTemAlteracaoStatusLivre ||
    podeAlterarStatusDiretoria ||
    (solicitacaoEstaNoSetorDoUsuario && !setorSemAlteracaoStatus);

  const atualizadoEm = new Date(solicitacao.updatedAt || solicitacao.createdAt).toLocaleString('pt-BR');

  return (
    <div className="sol-detail-page max-w-6xl mx-auto space-y-6">
      <div className="sol-detail-nav">
        <button
          onClick={() => navigate(-1)}
          className="sol-detail-back-btn"
          type="button"
        >
          <HiOutlineArrowLeft className="sol-detail-back-icon" />
          <span>Voltar para solicitacoes</span>
        </button>

        <div className="sol-detail-nav-right">
          <div className="sol-detail-breadcrumb">
            <span>Solicitacoes</span>
            <HiChevronRight className="sol-detail-breadcrumb-sep" />
            <span className="sol-detail-breadcrumb-current">{solicitacao.codigo}</span>
          </div>
          <span className="sol-detail-updated-at">Atualizado em {atualizadoEm}</span>
        </div>
      </div>

      <Header
        solicitacao={solicitacao}
        onAlterarStatus={() => setModalStatus(true)}
        onEnviarSetor={podeAprovarDiretoria ? aprovarDiretoria : () => setModalEnviarSetor(true)}
        mostrarAlterarStatus={podeAlterarStatus}
        mostrarEnviarSetor={podeAprovarDiretoria || podeEnviarSetor}
        textoEnviarSetor={podeAprovarDiretoria ? 'Aprovar' : 'Enviar para outro setor'}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Timeline
          historicos={solicitacao.historicos || []}
          canRemoveAnexo={isSetorCompras || isSuperadmin}
          onAnexoRemovido={carregar}
        />

        <div className="space-y-6">
          <Comentarios
            solicitacaoId={id}
            onSucesso={carregar}
          />

          {isSetorGeo && (
            <Pedido
              solicitacaoId={id}
              numeroPedido={solicitacao.numero_pedido}
              onSucesso={carregar}
            />
          )}

          <Pagamentos
            solicitacao={solicitacao}
            podeInformarPagamento={isSetorFinanceiro}
            onSucesso={carregar}
          />

          <Anexos
            solicitacaoId={id}
            onSucesso={carregar}
          />
        </div>
      </div>

      <ModalAlterarStatus
        aberto={modalStatus}
        setor={setorParaStatus}
        exigirStatusCadastrado={podeAlterarStatusDiretoria}
        onClose={() => setModalStatus(false)}
        onSalvar={salvarStatus}
      />

      {modalEnviarSetor && podeEnviarSetor && (
        <ModalEnviarSetor
          solicitacaoId={solicitacao.id}
          onClose={() => setModalEnviarSetor(false)}
          onSucesso={carregar}
        />
      )}
    </div>
  );
}
