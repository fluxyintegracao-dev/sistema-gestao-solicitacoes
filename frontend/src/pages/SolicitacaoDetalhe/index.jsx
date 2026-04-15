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
import { API_URL, authHeaders } from '../../services/api';
import { isGeoSetor, usuarioPodeEnviarSolicitacaoParaOutroSetor } from '../../utils/setor';

export default function SolicitacaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const setorTokens = [
    String(user?.setor?.codigo || '').toUpperCase(),
    String(user?.setor?.nome || '').toUpperCase(),
    String(user?.area || '').toUpperCase()
  ];

  const isSetorGeo = setorTokens.some(isGeoSetor);
  const isSetorCompras = setorTokens.includes('COMPRAS');
  const isSetorFinanceiro = setorTokens.includes('FINANCEIRO');
  const isSuperadmin = String(user?.perfil || '').trim().toUpperCase() === 'SUPERADMIN';

  const [solicitacao, setSolicitacao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalStatus, setModalStatus] = useState(false);
  const [modalEnviarSetor, setModalEnviarSetor] = useState(false);

  const perfil = String(user?.perfil || '').trim().toUpperCase();
  const setorUsuario = user?.setor?.codigo || user?.area || user?.setor?.nome || '';
  const setorParaStatus =
    perfil === 'SUPERADMIN'
      ? null
      : isSetorGeo
        ? 'GEO'
        : setorUsuario;

  useEffect(() => {
    carregar();
  }, [id]);

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

  if (loading) return <p>Carregando...</p>;
  if (!solicitacao) return null;

  const isSetorObra = setorTokens.includes('OBRA');
  const usaFluxoAprovacaoDiretoria = Boolean(solicitacao.usa_fluxo_aprovacao_diretoria);
  const podeAprovarDiretoria = Boolean(solicitacao.acao_aprovar_diretoria_disponivel);
  const podeEnviarSetor =
    !usaFluxoAprovacaoDiretoria &&
    !isSetorObra &&
    usuarioPodeEnviarSolicitacaoParaOutroSetor(solicitacao.area_responsavel, user);

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
        mostrarAlterarStatus
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
