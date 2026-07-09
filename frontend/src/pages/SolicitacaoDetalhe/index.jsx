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
import ApropriacaoAutocomplete from '../../components/ui/ApropriacaoAutocomplete';
import {
  aprovarDiretoriaSolicitacao,
  atualizarApropriacoesSolicitacao,
  atualizarPendenciaFinanceiraSolicitacao,
  getSolicitacaoById,
  updateStatusSolicitacao
} from '../../services/solicitacoes';
import { listarApropriacoes } from '../../services/apropriacoes';
import { isGeoSetor, solicitacaoEstaNoSetorDoUsuario, userHasSetorCapability } from '../../utils/setor';
import {
  canAccessFinanceiro,
  canDeleteSolicitacaoAnexo,
  canEditarApropriacoesSolicitacao,
  canViewSolicitacaoFinanceiro,
  hasConfiguredAreaPermissions,
  hasEnabledModule,
  hasPermissao
} from '../../utils/acessoProduto';
import { useSafeNavigateBack } from '../../utils/navigation';

function parseNumeroLocal(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor).trim().replace(/\s+/g, '');
  if (!texto) return 0;
  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function formatarMoedaLocal(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarNumeroEntrada(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  return String(valor);
}

function normalizarRateiosSolicitacao(solicitacao) {
  const rateios = Array.isArray(solicitacao?.apropriacoes) ? solicitacao.apropriacoes : [];
  if (rateios.length) {
    return rateios.map((item) => ({
      apropriacao_id: item?.apropriacao_id ? String(item.apropriacao_id) : '',
      percentual: formatarNumeroEntrada(item?.percentual),
      valor: formatarNumeroEntrada(item?.valor)
    }));
  }

  if (solicitacao?.apropriacao_id) {
    return [{
      apropriacao_id: String(solicitacao.apropriacao_id),
      percentual: '100',
      valor: ''
    }];
  }

  return [{
    apropriacao_id: '',
    percentual: '100',
    valor: ''
  }];
}

export default function SolicitacaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const navigateBack = useSafeNavigateBack('/solicitacoes');
  const { user } = useAuth();

  const setorTokens = [
    String(user?.setor?.codigo || '').toUpperCase(),
    String(user?.setor?.nome || '').toUpperCase(),
    String(user?.area || '').toUpperCase()
  ];

  const isSetorGeo = setorTokens.some(isGeoSetor);
  const isSetorFinanceiro = setorTokens.includes('FINANCEIRO') || userHasSetorCapability(user, 'eh_setor_financeiro');
  const isSuperadmin = String(user?.perfil || '').trim().toUpperCase() === 'SUPERADMIN';
  const podeAcessarModuloFinanceiro = canAccessFinanceiro(user);
  const isFinanceiro = canViewSolicitacaoFinanceiro(user);
  const podeEnviarQualquerSetor = Boolean(user?.pode_enviar_qualquer_setor);
  const podeAlterarStatusQualquerSetor =
    hasConfiguredAreaPermissions(user) &&
    hasPermissao(user, 'solicitacoes.acoes.alterar_status_qualquer_setor');
  const podeInformarPagamento = isSuperadmin || isSetorFinanceiro;
  const moduloContratosHabilitado = hasEnabledModule(user, 'CONTRATOS');
  const moduloComprasHabilitado = hasEnabledModule(user, 'COMPRAS');
  const podeEditarApropriacoes = moduloComprasHabilitado && canEditarApropriacoesSolicitacao(user);

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
  const [apropriacoesCatalogo, setApropriacoesCatalogo] = useState([]);
  const [modalApropriacoesAberto, setModalApropriacoesAberto] = useState(false);
  const [salvandoApropriacoes, setSalvandoApropriacoes] = useState(false);
  const [apropriacaoPrincipalId, setApropriacaoPrincipalId] = useState('');
  const [rateiosApropriacao, setRateiosApropriacao] = useState([]);
  const [motivoApropriacoes, setMotivoApropriacoes] = useState('');
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
    const obraId = solicitacao?.obra_id || solicitacao?.obra?.id;
    if (!obraId || !podeEditarApropriacoes) {
      setApropriacoesCatalogo([]);
      return;
    }

    let ativo = true;
    listarApropriacoes({ obra_id: obraId })
      .then((dados) => {
        if (!ativo) return;
        const lista = Array.isArray(dados) ? dados : dados?.items || dados?.rows || [];
        setApropriacoesCatalogo(
          lista.filter((item) => item?.ativo !== false && item?.somadora !== true)
        );
      })
      .catch((error) => {
        console.error(error);
        if (ativo) setApropriacoesCatalogo([]);
      });

    return () => {
      ativo = false;
    };
  }, [solicitacao?.obra_id, solicitacao?.obra?.id, podeEditarApropriacoes]);

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

  function abrirModalApropriacoes() {
    setApropriacaoPrincipalId(solicitacao?.apropriacao_id ? String(solicitacao.apropriacao_id) : '');
    setRateiosApropriacao(normalizarRateiosSolicitacao(solicitacao));
    setMotivoApropriacoes('');
    setModalApropriacoesAberto(true);
  }

  function fecharModalApropriacoes() {
    if (salvandoApropriacoes) return;
    setModalApropriacoesAberto(false);
  }

  function atualizarRateioApropriacao(index, campo, valor) {
    setRateiosApropriacao((atuais) => (
      atuais.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    ));
  }

  function adicionarRateioApropriacao() {
    setRateiosApropriacao((atuais) => [
      ...atuais,
      { apropriacao_id: '', percentual: '', valor: '' }
    ]);
  }

  function removerRateioApropriacao(index) {
    setRateiosApropriacao((atuais) => (
      atuais.length <= 1 ? atuais : atuais.filter((_, i) => i !== index)
    ));
  }

  function resumoRateioApropriacao() {
    const percentual = rateiosApropriacao.reduce(
      (acc, item) => acc + parseNumeroLocal(item.percentual),
      0
    );
    const valor = rateiosApropriacao.reduce(
      (acc, item) => acc + parseNumeroLocal(item.valor),
      0
    );

    return {
      percentual,
      valor,
      usaPercentual: rateiosApropriacao.some((item) => String(item.percentual || '').trim()),
      usaValor: rateiosApropriacao.some((item) => String(item.valor || '').trim())
    };
  }

  async function salvarApropriacoesSolicitacao() {
    if (!String(motivoApropriacoes || '').trim()) {
      alert('Informe o motivo da alteracao das apropriacoes.');
      return;
    }

    const rateiosValidos = rateiosApropriacao
      .filter((item) => (
        String(item.apropriacao_id || '').trim() ||
        String(item.percentual || '').trim() ||
        String(item.valor || '').trim()
      ))
      .map((item) => ({
        apropriacao_id: item.apropriacao_id ? Number(item.apropriacao_id) : null,
        percentual: String(item.percentual || '').trim() ? parseNumeroLocal(item.percentual) : null,
        valor: String(item.valor || '').trim() ? parseNumeroLocal(item.valor) : null
      }));

    if (rateiosValidos.some((item) => !item.apropriacao_id)) {
      alert('Preencha todas as apropriacoes do rateio.');
      return;
    }

    const resumo = resumoRateioApropriacao();
    if (resumo.usaPercentual && resumo.usaValor) {
      alert('Use somente percentual ou somente valor em R$ no rateio.');
      return;
    }

    try {
      setSalvandoApropriacoes(true);
      await atualizarApropriacoesSolicitacao(solicitacao.id, {
        apropriacao_id: apropriacaoPrincipalId ? Number(apropriacaoPrincipalId) : null,
        apropriacoes_rateio: rateiosValidos,
        motivo: motivoApropriacoes.trim()
      });
      registrarMutacaoLocal(solicitacao.id);
      setModalApropriacoesAberto(false);
      await carregar({ silent: true });
      alert('Apropriacoes atualizadas com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao atualizar apropriacoes');
    } finally {
      setSalvandoApropriacoes(false);
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
    (
      isSuperadmin ||
      podeEnviarQualquerSetor ||
      solicitacaoEstaNoSetorDoUsuario(solicitacao.area_responsavel, user)
    );
  const podeAlterarStatus =
    isSuperadmin ||
    podeAlterarStatusQualquerSetor ||
    solicitacaoEstaNoSetorDoUsuario(solicitacao.area_responsavel, user);
  const podeMarcarPendenciaFinanceira = isSuperadmin || isSetorGeo || isSetorFinanceiro;

  const atualizadoEm = new Date(solicitacao.updatedAt || solicitacao.createdAt).toLocaleString('pt-BR');

  return (
    <div className="sol-detail-page max-w-6xl mx-auto space-y-6">
      <div className="sol-detail-nav">
        <button
          onClick={() => navigateBack('/solicitacoes')}
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
        mostrarAlterarStatus={podeAlterarStatus}
        mostrarEnviarSetor={podeEnviarSetor}
        mostrarContratoInfo={moduloContratosHabilitado}
        mostrarApropriacaoInfo={moduloComprasHabilitado}
      />

      {podeEditarApropriacoes && (
        <div className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Apropriacoes da solicitacao</h2>
            <p className="text-sm text-[var(--c-muted)]">
              Ajuste a apropriacao principal ou o rateio do contrato com motivo e auditoria.
            </p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={abrirModalApropriacoes}>
            Editar apropriacoes
          </button>
        </div>
      )}

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
              podeAcessarModuloFinanceiro={podeAcessarModuloFinanceiro}
              onSolicitacaoAtualizada={() => {
                registrarMutacaoLocal(id);
                return carregar({ silent: true });
              }}
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

      {modalApropriacoesAberto && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-[var(--c-surface)] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Editar apropriacoes</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  A alteracao nao muda a visibilidade da solicitacao e fica registrada no historico.
                </p>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={fecharModalApropriacoes}>
                Fechar
              </button>
            </div>

            <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
              <label className="block text-sm font-semibold text-[var(--c-text)]">
                Apropriacao principal
                <ApropriacaoAutocomplete
                  value={apropriacaoPrincipalId}
                  options={apropriacoesCatalogo}
                  onChange={setApropriacaoPrincipalId}
                  placeholder="Digite para buscar a apropriacao"
                  className="mt-1"
                />
              </label>

              <div className="rounded-2xl border border-[var(--c-border)] p-4">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--c-text)]">Rateio do contrato</h3>
                    <p className="text-sm text-[var(--c-muted)]">
                      Use percentual ou valor em R$. Nao misture os dois criterios na mesma alteracao.
                    </p>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={adicionarRateioApropriacao}>
                    Adicionar linha
                  </button>
                </div>

                <div className="space-y-3">
                  {rateiosApropriacao.map((rateio, index) => (
                    <div
                      key={`${index}-${rateio.apropriacao_id || 'nova'}`}
                      className="grid gap-2 rounded-xl border border-[var(--c-border)] p-3 md:grid-cols-[1fr_140px_160px_auto]"
                    >
                      <ApropriacaoAutocomplete
                        value={rateio.apropriacao_id}
                        options={apropriacoesCatalogo}
                        onChange={(valor) => atualizarRateioApropriacao(index, 'apropriacao_id', valor)}
                        placeholder="Buscar apropriacao"
                      />
                      <input
                        className="input"
                        value={rateio.percentual}
                        onChange={(event) => atualizarRateioApropriacao(index, 'percentual', event.target.value)}
                        placeholder="%"
                        inputMode="decimal"
                      />
                      <input
                        className="input"
                        value={rateio.valor}
                        onChange={(event) => atualizarRateioApropriacao(index, 'valor', event.target.value)}
                        placeholder="Valor R$"
                        inputMode="decimal"
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => removerRateioApropriacao(index)}
                        disabled={rateiosApropriacao.length <= 1}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-2 text-sm text-[var(--c-muted)] md:grid-cols-3">
                  <span>Percentual informado: <strong>{resumoRateioApropriacao().percentual.toFixed(4)}%</strong></span>
                  <span>Valor informado: <strong>{formatarMoedaLocal(resumoRateioApropriacao().valor)}</strong></span>
                  <span>Valor da solicitacao: <strong>{formatarMoedaLocal(solicitacao?.valor)}</strong></span>
                </div>
              </div>

              <label className="block text-sm font-semibold text-[var(--c-text)]">
                Motivo da alteracao *
                <textarea
                  className="input mt-1 min-h-[96px]"
                  value={motivoApropriacoes}
                  onChange={(event) => setMotivoApropriacoes(event.target.value)}
                  placeholder="Explique por que a apropriacao foi alterada."
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={fecharModalApropriacoes}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={salvarApropriacoesSolicitacao}
                disabled={salvandoApropriacoes}
              >
                {salvandoApropriacoes ? 'Salvando...' : 'Salvar apropriacoes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
