import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiChevronRight } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';

import Header from './Header';
import Timeline from './Timeline';
import Comentarios from './Comentarios';
import Anexos from './Anexos';
import Pedido from './Pedido';
import FinanceiroCard from './FinanceiroCard';
import Pagamentos from './Pagamentos';
import ModalAlterarStatus from './ModalAlterarStatus';
import ModalEnviarSetor from '../Solicitacoes/ModalEnviarSetor';
import { aprovarDiretoriaSolicitacao, updateStatusSolicitacao } from '../../services/solicitacoes';
import { API_URL, authHeaders } from '../../services/api';
import { isGeoSetor, solicitacaoEstaNoSetorDoUsuario, userHasSetorCapability } from '../../utils/setor';
import { canAccessFinanceiro, hasEnabledModule } from '../../utils/acessoProduto';

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
  const isSetorCompras = userHasSetorCapability(user, 'eh_setor_compras');
  const isSetorFinanceiro = setorTokens.includes('FINANCEIRO') || userHasSetorCapability(user, 'eh_setor_financeiro');
  const isSuperadmin = String(user?.perfil || '').trim().toUpperCase() === 'SUPERADMIN';
  const isFinanceiro = canAccessFinanceiro(user);
  const podeInformarPagamento = isSuperadmin || isSetorFinanceiro;
  const moduloContratosHabilitado = hasEnabledModule(user, 'CONTRATOS');
  const moduloComprasHabilitado = hasEnabledModule(user, 'COMPRAS');

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
    try {
      await aprovarDiretoriaSolicitacao(solicitacao.id);
      await carregar();
      alert('Solicitacao aprovada pela diretoria.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao aprovar solicitacao pela diretoria');
    }
  }

  if (loading) return <p>Carregando...</p>;
  if (!solicitacao) return null;

  const isSetorObra = userHasSetorCapability(user, 'eh_setor_obra');
  const usaFluxoAprovacaoDiretoria = Boolean(
    solicitacao.usa_fluxo_aprovacao_diretoria ??
    (
      solicitacao.fluxo_aprovacao_diretoria &&
      !solicitacao.aprovada_diretoria_em &&
      solicitacao.diretoria_fluxo_codigo
    )
  );
  const podeAprovarDiretoria = Boolean(
    solicitacao.acao_aprovar_diretoria_disponivel ??
    (
      solicitacao.fluxo_aprovacao_diretoria &&
      !solicitacao.aprovada_diretoria_em &&
      (isSuperadmin || solicitacaoEstaNoSetorDoUsuario(solicitacao.area_responsavel, user))
    )
  );
  const podeEnviarSetor =
    !usaFluxoAprovacaoDiretoria &&
    !isSetorObra &&
    (isSuperadmin || solicitacaoEstaNoSetorDoUsuario(solicitacao.area_responsavel, user));

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
        onEnviarSetor={() => setModalEnviarSetor(true)}
        mostrarAlterarStatus
        mostrarEnviarSetor={podeEnviarSetor}
        mostrarContratoInfo={moduloContratosHabilitado}
        mostrarApropriacaoInfo={moduloComprasHabilitado}
      />

      {podeAprovarDiretoria && (
        <div className="card flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Aprovacao por diretoria</h2>
            <p className="text-sm text-[var(--c-muted)]">
              Ao aprovar, a solicitacao segue para {solicitacao.setor_destino_aprovacao || solicitacao.setor_destino_pos_aprovacao || 'a area responsavel'}.
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={aprovarDiretoria}>
            Aprovar e enviar
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Timeline
          historicos={solicitacao.historicos || []}
          canRemoveAnexo={isSetorCompras || isSuperadmin}
          onAnexoRemovido={carregar}
        />

        <div className="space-y-6">
          {isFinanceiro && (
            <FinanceiroCard
              solicitacao={solicitacao}
              onTituloCriado={carregar}
            />
          )}

          <Pagamentos
            solicitacao={solicitacao}
            podeInformarPagamento={podeInformarPagamento}
            onSucesso={carregar}
          />

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
