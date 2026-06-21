import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiChevronRight } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveUpdateSubscription } from '../../contexts/LiveUpdatesContext';

import Header from './Header';
import Timeline from './Timeline';
import Comentarios from './Comentarios';
import Anexos from './Anexos';
import Pedido from './Pedido';
import FinanceiroCard from './FinanceiroCard';
import Pagamentos from './Pagamentos';
import ModalAlterarStatus from './ModalAlterarStatus';
import ModalEnviarSetor from '../Solicitacoes/ModalEnviarSetor';
import {
  aprovarDiretoriaSolicitacao,
  atualizarPendenciaFinanceiraSolicitacao,
  getSolicitacaoById,
  updateStatusSolicitacao
} from '../../services/solicitacoes';
import { isGeoSetor, solicitacaoEstaNoSetorDoUsuario, userHasSetorCapability } from '../../utils/setor';
import { canAccessFinanceiro, canDeleteSolicitacaoAnexo, hasEnabledModule } from '../../utils/acessoProduto';

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
  const [pendenciaFinanceira, setPendenciaFinanceira] = useState({
    marcar: false,
    tipo: 'FORA_DO_PRAZO',
    observacao: ''
  });
  const [salvandoPendenciaFinanceira, setSalvandoPendenciaFinanceira] = useState(false);
  const localMutationsRef = useRef(new Map());

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

  useEffect(() => {
    if (!solicitacao) return;
    setPendenciaFinanceira({
      marcar: Boolean(solicitacao.financeiro_pendencia_prazo),
      tipo: solicitacao.financeiro_pendencia_tipo || 'FORA_DO_PRAZO',
      observacao: solicitacao.financeiro_pendencia_observacao || ''
    });
  }, [
    solicitacao?.id,
    solicitacao?.financeiro_pendencia_prazo,
    solicitacao?.financeiro_pendencia_tipo,
    solicitacao?.financeiro_pendencia_observacao
  ]);

  function registrarMutacaoLocal(solicitacaoId) {
    const idNumerico = Number(solicitacaoId);
    if (!Number.isInteger(idNumerico) || idNumerico <= 0) return;
    localMutationsRef.current.set(idNumerico, Date.now());
  }

  function eventoFoiTratadoLocalmente(payload) {
    const recordId = Number(payload?.record_id || 0);
    if (!Number.isInteger(recordId) || recordId <= 0) {
      return false;
    }

    const actorId = Number(payload?.actor?.id || 0);
    if (!Number.isInteger(actorId) || actorId <= 0 || actorId !== Number(user?.id || 0)) {
      return false;
    }

    const handledAt = localMutationsRef.current.get(recordId);
    if (!handledAt) {
      return false;
    }

    if (Date.now() - handledAt > 10 * 1000) {
      localMutationsRef.current.delete(recordId);
      return false;
    }

    localMutationsRef.current.delete(recordId);
    return true;
  }

  async function carregar({ silent = false } = {}) {
    try {
      if (!silent) {
        setLoading(true);
      }

      const data = await getSolicitacaoById(id);
      setSolicitacao(data);
    } catch (err) {
      console.error(err);
      const status = Number(err?.status || 0);
      if (status === 403 || status === 404) {
        setSolicitacao(null);
        navigate('/solicitacoes');
        return;
      }
      if (!silent) {
        alert(err?.message || 'Erro ao carregar solicitacao');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function salvarStatus(novoStatus) {
    try {
      await updateStatusSolicitacao(solicitacao.id, novoStatus);
      registrarMutacaoLocal(solicitacao.id);
      setModalStatus(false);
      await carregar({ silent: true });
      alert('Status alterado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao atualizar status');
    }
  }

  async function aprovarDiretoria() {
    try {
      await aprovarDiretoriaSolicitacao(solicitacao.id);
      registrarMutacaoLocal(solicitacao.id);
      await carregar({ silent: true });
      alert('Solicitacao aprovada pela diretoria.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao aprovar solicitacao pela diretoria');
    }
  }

  async function salvarPendenciaFinanceira() {
    try {
      setSalvandoPendenciaFinanceira(true);
      await atualizarPendenciaFinanceiraSolicitacao(solicitacao.id, pendenciaFinanceira);
      registrarMutacaoLocal(solicitacao.id);
      await carregar({ silent: true });
      alert(pendenciaFinanceira.marcar
        ? 'Pendencia registrada para auditoria.'
        : 'Pendencia marcada como regularizada.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao registrar pendencia financeira');
    } finally {
      setSalvandoPendenciaFinanceira(false);
    }
  }

  useLiveUpdateSubscription({
    enabled: !!id,
    filter: (payload) => (
      String(payload?.entity || '').toUpperCase() === 'SOLICITACAO' &&
      Number(payload?.record_id || 0) === Number(id || 0)
    ),
    onEvent: async (payload) => {
      if (eventoFoiTratadoLocalmente(payload)) {
        return;
      }

      const action = String(payload?.action || '').trim().toUpperCase();
      if (action === 'DELETED') {
        navigate('/solicitacoes');
        return;
      }

      await carregar({ silent: true });
    },
    fallbackRefresh: () => carregar({ silent: true }),
    fallbackMs: 45 * 1000
  });

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
  const podeMarcarPendenciaFinanceira = isSuperadmin || isSetorGeo || isSetorFinanceiro;

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
          canRemoveAnexo={canDeleteSolicitacaoAnexo(user)}
          canRemoveComentario={String(user?.perfil || '').trim().toUpperCase() === 'SUPERADMIN'}
          onAnexoRemovido={() => {
            registrarMutacaoLocal(id);
            void carregar({ silent: true });
          }}
        />

        <div className="space-y-6">
          {podeMarcarPendenciaFinanceira && (
            <div className="card space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--c-text)]">Auditoria de prazo e documentos</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Registre solicitacoes enviadas fora do prazo ou sem nota/boleto para medir regularizacao por usuario.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]">
                <input
                  type="checkbox"
                  checked={pendenciaFinanceira.marcar}
                  onChange={(event) => setPendenciaFinanceira((prev) => ({
                    ...prev,
                    marcar: event.target.checked
                  }))}
                />
                Marcar pendencia para auditoria
              </label>

              <div className="grid md:grid-cols-2 gap-3">
                <label className="block text-sm text-[var(--c-muted)]">
                  Tipo
                  <select
                    className="input mt-1"
                    value={pendenciaFinanceira.tipo}
                    onChange={(event) => setPendenciaFinanceira((prev) => ({
                      ...prev,
                      tipo: event.target.value
                    }))}
                    disabled={!pendenciaFinanceira.marcar}
                  >
                    <option value="FORA_DO_PRAZO">Enviada fora do prazo</option>
                    <option value="SEM_NOTA">Sem nota ate o vencimento</option>
                    <option value="SEM_BOLETO">Sem boleto ate o vencimento</option>
                    <option value="SEM_NOTA_E_BOLETO">Sem nota e boleto</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </label>

                <label className="block text-sm text-[var(--c-muted)]">
                  Observacao
                  <textarea
                    className="input mt-1 min-h-[88px]"
                    value={pendenciaFinanceira.observacao}
                    onChange={(event) => setPendenciaFinanceira((prev) => ({
                      ...prev,
                      observacao: event.target.value
                    }))}
                    placeholder="Ex.: nota enviada apos vencimento, boleto ausente, prazo regularizado..."
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={salvarPendenciaFinanceira}
                  disabled={salvandoPendenciaFinanceira}
                >
                  {salvandoPendenciaFinanceira ? 'Salvando...' : 'Salvar auditoria'}
                </button>
              </div>
            </div>
          )}

          {isFinanceiro && (
            <FinanceiroCard
              solicitacao={solicitacao}
              onTituloCriado={() => {
                registrarMutacaoLocal(id);
                void carregar({ silent: true });
              }}
            />
          )}

          <Pagamentos
            solicitacao={solicitacao}
            podeInformarPagamento={podeInformarPagamento}
            onSucesso={async () => {
              registrarMutacaoLocal(id);
              await carregar({ silent: true });
            }}
          />

          <Comentarios
            solicitacaoId={id}
            onSucesso={() => {
              registrarMutacaoLocal(id);
              void carregar({ silent: true });
            }}
          />

          {isSetorGeo && (
            <Pedido
              solicitacaoId={id}
              numeroPedido={solicitacao.numero_pedido}
              onSucesso={() => {
                registrarMutacaoLocal(id);
                void carregar({ silent: true });
              }}
            />
          )}

          <Anexos
            solicitacaoId={id}
            onSucesso={() => {
              registrarMutacaoLocal(id);
              void carregar({ silent: true });
            }}
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
          onSucesso={() => {
            registrarMutacaoLocal(solicitacao.id);
            void carregar({ silent: true });
          }}
        />
      )}
    </div>
  );
}
