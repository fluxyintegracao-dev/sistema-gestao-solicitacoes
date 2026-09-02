import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiChevronRight } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveUpdateSubscription } from '../../contexts/LiveUpdatesContext';

import Header from './Header';
import ApropriacoesDoContrato from './ApropriacoesDoContrato';
import AditivosDoContrato from './AditivosDoContrato';
import Timeline from './Timeline';
import Conversa from './Conversa';
import FinanceiroCard from './FinanceiroCard';
import AcoesContrato from './AcoesContrato';
import RetornoSolicitacaoBar from './RetornoSolicitacaoBar';
import RecargaCartaoDetalhe from './RecargaCartaoDetalhe';
import { getContratoParcelas } from '../../services/contratos';
import ModalAlterarStatus from './ModalAlterarStatus';
import { getAcoesPrincipais, resolverAcaoPrincipal } from '../../services/acoesPrincipais';
import { resolverLayoutDetalhe, rotuloBloco } from './blocosDetalhe';
import { getDetalheLayouts } from '../../services/detalheLayout';
import { getListaPreferencias, salvarListaPreferencias } from '../../services/listasPreferencias';
import { tokenSetorDe } from '../../services/atalhos';
import ModalEnviarSetor from '../Solicitacoes/ModalEnviarSetor';
import ApropriacaoAutocomplete from '../../components/ui/ApropriacaoAutocomplete';
import TratamentoItemManual from '../../modules/solicitacao-compra/components/TratamentoItemManual';
import {
  aprovarDiretoriaSolicitacao,
  atualizarApropriacoesSolicitacao,
  atualizarPendenciaFinanceiraSolicitacao,
  getSolicitacaoById,
  updateStatusSolicitacao
} from '../../services/solicitacoes';
import {
  atualizarApropriacoesItemSolicitacaoCompra,
  obterCompraDiretaPorSolicitacao
} from '../../services/compras';
import { listarApropriacoes } from '../../services/apropriacoes';
import {
  criarRateioBase,
  montarLinhasResumoApropriacao,
  normalizarRateiosEntrada,
  parseQuantidade,
  sincronizarItemComRateios,
  validarRateiosItem
} from '../../modules/solicitacao-compra/utils/apropriacoes';
import { isGeoSetor, solicitacaoEstaNoSetorDoUsuario, userHasSetorCapability } from '../../utils/setor';
import {
  canAccessFinanceiro,
  canCatalogarItensManuaisCompras,
  canDeleteSolicitacaoAnexo,
  canEditarApropriacoesItemCompraDireta,
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

function normalizarTextoBusca(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function normalizarRateiosSolicitacao(solicitacao) {
  const rateios = Array.isArray(solicitacao?.apropriacoes) ? solicitacao.apropriacoes : [];
  if (rateios.length) {
    return rateios.map((item) => ({
      apropriacao_id: item?.apropriacao_id || item?.apropriacao?.id ? String(item.apropriacao_id || item.apropriacao.id) : '',
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

function mapearItemManualCompraDireta(item) {
  const insumoOficial = item?.insumoCatalogado || null;
  const descricaoOficial = String(insumoOficial?.descricao || '').trim()
    || insumoOficial?.nome
    || item?.nome_manual
    || item?.descricao
    || `Item manual #${item?.id || ''}`;
  const unidadeOficial = insumoOficial?.unidade?.sigla
    || insumoOficial?.unidade?.nome
    || insumoOficial?.unidade_manual
    || item?.unidade_sigla_manual
    || item?.unidade_sigla
    || '';

  return {
    ...item,
    item_tipo: 'MANUAL',
    descricao: descricaoOficial,
    unidade_label: unidadeOficial,
    nome: insumoOficial?.nome || item?.nome_manual || descricaoOficial,
    unidade: unidadeOficial || '-',
    especificacao: insumoOficial?.descricao || item?.especificacao || '-',
    descricao_original: item?.nome_manual || item?.descricao || '',
    especificacao_original: item?.especificacao || ''
  };
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
  const isSetorObra = userHasSetorCapability(user, 'eh_setor_obra');
  const isSetorFinanceiro = setorTokens.includes('FINANCEIRO') || userHasSetorCapability(user, 'eh_setor_financeiro');
  const isSuperadmin = String(user?.perfil || '').trim().toUpperCase() === 'SUPERADMIN';
  const podeAcessarModuloFinanceiro = canAccessFinanceiro(user);
  const isFinanceiro = canViewSolicitacaoFinanceiro(user);
  const podeEnviarQualquerSetor = Boolean(user?.pode_enviar_qualquer_setor);
  const podeAlterarStatusQualquerSetor =
    hasConfiguredAreaPermissions(user) &&
    hasPermissao(user, 'solicitacoes.acoes.alterar_status_qualquer_setor');
  useEffect(() => {
    let ativo = true;
    getAcoesPrincipais()
      .then((lista) => {
        if (ativo) setMapeamentosAcaoPrincipal(lista);
      })
      .catch(() => {});
    // Layout configurável do detalhe: camada do setor (admin) + camada do
    // usuário (banco). Falha em qualquer uma = layout atual, nada quebra.
    const setorUsuario = tokenSetorDe(user);
    if (setorUsuario) {
      getDetalheLayouts(setorUsuario)
        .then((linhas) => {
          if (ativo) setLayoutSetor(linhas[0]?.config || null);
        })
        .catch(() => {});
    }
    getListaPreferencias('detalhe-solicitacao')
      .then((prefs) => {
        const temAlgo = prefs && (
          Array.isArray(prefs.ordem) || Array.isArray(prefs.recolhidos)
          || Array.isArray(prefs.removidos) || prefs.larguras || prefs.historico_ordem
        );
        if (ativo && temAlgo) setPrefsLayoutUsuario(prefs);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);
  const moduloContratosHabilitado = hasEnabledModule(user, 'CONTRATOS');
  const moduloComprasHabilitado = hasEnabledModule(user, 'COMPRAS');
  const podeEditarApropriacoes = moduloComprasHabilitado && canEditarApropriacoesSolicitacao(user);
  const podeEditarItensCompraDiretaBase = moduloComprasHabilitado && canEditarApropriacoesItemCompraDireta(user);
  const podeCatalogarItensManuaisCompra = moduloComprasHabilitado && canCatalogarItensManuaisCompras(user);

  const [solicitacao, setSolicitacao] = useState(null);
  // PI-16: o contrato do fluxo novo vive DENTRO desta solicitacao. O estado dele decide o que a
  // barra de acoes oferece — e e o contrato quem tem a maquina de estados; a solicitacao espelha.
  const [contratoDoFluxo, setContratoDoFluxo] = useState(null);
  // Por que o contrato nao carregou. Vazio quando carregou ou quando a solicitacao nem tem contrato.
  const [falhaContrato, setFalhaContrato] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalStatus, setModalStatus] = useState(false);
  const [statusDependenciasVersao, setStatusDependenciasVersao] = useState(0);
  // Mapeamento configurável setor+estado → ação em destaque (Configurações
  // → Ação principal por setor). Vazio/indisponível = layout atual.
  const [mapeamentosAcaoPrincipal, setMapeamentosAcaoPrincipal] = useState([]);
  // Camadas do layout configurável do detalhe (usuário → setor → padrão).
  const [layoutSetor, setLayoutSetor] = useState(null);
  const [prefsLayoutUsuario, setPrefsLayoutUsuario] = useState(null);
  const [personalizando, setPersonalizando] = useState(false);
  const [adicionarBlocoAberto, setAdicionarBlocoAberto] = useState(false);
  const dragBlocoRef = useRef(null);
  // Abaixo de 768px o detalhe vira ABAS, com a ação principal fixa no topo.
  const [isMobileDetalhe, setIsMobileDetalhe] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  ));
  const [abaMobile, setAbaMobile] = useState('detalhes');
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const listener = (event) => setIsMobileDetalhe(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);
  // Auditoria de prazo/documentos é de uso raro: colapsada num botão e
  // abaixo de Financeiro/Pagamentos/Histórico.
  const [auditoriaAberta, setAuditoriaAberta] = useState(false);
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
  const [modalCompraDiretaAberto, setModalCompraDiretaAberto] = useState(false);
  const [compraDiretaDetalhe, setCompraDiretaDetalhe] = useState(null);
  const [carregandoCompraDireta, setCarregandoCompraDireta] = useState(false);
  const [itemCompraDiretaSelecionado, setItemCompraDiretaSelecionado] = useState(null);
  const [rateiosCompraDireta, setRateiosCompraDireta] = useState([]);
  const [motivoCompraDireta, setMotivoCompraDireta] = useState('');
  const [salvandoCompraDireta, setSalvandoCompraDireta] = useState(false);
  const [acaoItemCompraDireta, setAcaoItemCompraDireta] = useState('APROPRIAR');
  const localMutationsRef = useRef(new Map());

  const tipoSolicitacaoNormalizado = normalizarTextoBusca(
    solicitacao?.tipo?.nome ||
    solicitacao?.tipo_nome ||
    solicitacao?.tipo_solicitacao ||
    solicitacao?.descricao_tipo
  );
  const isCompraDiretaSolicitacao = tipoSolicitacaoNormalizado.includes('COMPRA DIRETA');
  const isRecargaCartaoSolicitacao = tipoSolicitacaoNormalizado.includes('RECARGA DE CARTAO');
  // Numa solicitacao de Abertura de Contrato o rateio que vale e o do CONTRATO
  // (`contrato_apropriacoes`). O card da solicitacao grava em `solicitacao_apropriacoes`, que ali
  // ninguem consome — deixa-lo aberto convidava a criar uma segunda verdade sobre o mesmo contrato.
  const solicitacaoEhContrato = Boolean(contratoDoFluxo);
  const contextoInteracao = solicitacao?.contexto_interacao || null;
  const podeInteragirSolicitacao = contextoInteracao
    ? contextoInteracao.pode_interagir === true
    : Boolean(solicitacao?.area_responsavel && solicitacaoEstaNoSetorDoUsuario(solicitacao.area_responsavel, user));
  const podeEditarApropriacoesSolicitacaoNormal = podeEditarApropriacoes
    && podeInteragirSolicitacao
    && !isCompraDiretaSolicitacao
    && !solicitacaoEhContrato;
  const podeEditarItensCompraDireta = podeInteragirSolicitacao && podeEditarItensCompraDiretaBase && isCompraDiretaSolicitacao;
  const podeGerenciarItensCompraDireta = isCompraDiretaSolicitacao && (
    podeEditarItensCompraDireta || (podeInteragirSolicitacao && podeCatalogarItensManuaisCompra)
  );
  const contratoSomenteLeitura = contratoDoFluxo && !podeInteragirSolicitacao
    ? { ...contratoDoFluxo, permissoes: {} }
    : contratoDoFluxo;

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
    if (!obraId || (!podeEditarApropriacoesSolicitacaoNormal && !podeEditarItensCompraDireta)) {
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
  }, [
    solicitacao?.obra_id,
    solicitacao?.obra?.id,
    podeEditarApropriacoesSolicitacaoNormal,
    podeEditarItensCompraDireta
  ]);

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

      // PI-16: carrega o contrato quando esta solicitacao E a solicitacao DELE.
      //
      // A guarda do `solicitacao_id` importa: uma solicitacao de medicao ou de aditivo do fluxo
      // ANTIGO tambem aponta para um contrato (`contrato_id`), e sem a guarda ela mostraria a
      // barra de acoes de um contrato que nao e dela.
      //
      // O erro nao derruba a tela — a solicitacao abre de qualquer jeito —, mas ele APARECE.
      // Engolir esta falha ja custou duas investigacoes: sem o contrato, somem de uma vez as
      // previsoes e o botao Aprovar, e a tela nao dava nenhuma pista do motivo (na pratica, um
      // 403 de escopo de obra). Quem olha precisa ler "acesso negado", nao encarar o vazio.
      if (data?.contrato_id) {
        try {
          const doContrato = await getContratoParcelas(data.contrato_id);
          const c = doContrato?.contrato;
          setContratoDoFluxo(c?.fluxo_novo && String(c.solicitacao_id) === String(data.id) ? c : null);
          setFalhaContrato('');
        } catch (erroContrato) {
          setContratoDoFluxo(null);
          setFalhaContrato(erroContrato?.message || 'Nao foi possivel carregar o contrato desta solicitacao.');
        }
      } else {
        setContratoDoFluxo(null);
        setFalhaContrato('');
      }
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
      // Recarga e Financeiro carregam dados por endpoints proprios. A solicitacao principal ja
      // atualizou, mas esses paineis precisam remontar para refletir no mesmo instante a troca
      // PREVISAO -> ABERTO (ou o cancelamento), sem depender de F5.
      setStatusDependenciasVersao((versao) => versao + 1);
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

  function montarItensCompraDireta() {
    const itens = Array.isArray(compraDiretaDetalhe?.itens) ? compraDiretaDetalhe.itens : [];
    const itensManuais = Array.isArray(compraDiretaDetalhe?.itensManuais) ? compraDiretaDetalhe.itensManuais : [];

    return [
      ...itens.map((item) => ({
        ...item,
        item_tipo: 'CADASTRADO',
        descricao: item?.insumo?.nome || item?.descricao || `Item #${item?.id || ''}`,
        unidade_label: item?.unidade?.sigla || item?.unidade?.nome || item?.unidade_sigla || ''
      })),
      ...itensManuais.map(mapearItemManualCompraDireta)
    ];
  }

  async function abrirModalCompraDireta() {
    if (!solicitacao?.id) return;

    try {
      setCarregandoCompraDireta(true);
      setItemCompraDiretaSelecionado(null);
      setRateiosCompraDireta([]);
      setMotivoCompraDireta('');
      setAcaoItemCompraDireta(podeCatalogarItensManuaisCompra ? 'CATALOGAR' : 'APROPRIAR');
      const data = await obterCompraDiretaPorSolicitacao(solicitacao.id);
      setCompraDiretaDetalhe(data || null);
      setModalCompraDiretaAberto(true);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar itens da compra direta');
    } finally {
      setCarregandoCompraDireta(false);
    }
  }

  function fecharModalCompraDireta() {
    if (salvandoCompraDireta) return;
    setModalCompraDiretaAberto(false);
    setItemCompraDiretaSelecionado(null);
    setRateiosCompraDireta([]);
    setMotivoCompraDireta('');
    setAcaoItemCompraDireta(podeCatalogarItensManuaisCompra ? 'CATALOGAR' : 'APROPRIAR');
  }

  function selecionarItemCompraDireta(item) {
    const rateios = normalizarRateiosEntrada(item);
    setItemCompraDiretaSelecionado(item);
    setRateiosCompraDireta(rateios.length ? rateios : [criarRateioBase(item?.quantidade)]);
    setMotivoCompraDireta('');
    setAcaoItemCompraDireta(
      item?.item_tipo === 'MANUAL' && podeCatalogarItensManuaisCompra
        ? 'CATALOGAR'
        : 'APROPRIAR'
    );
  }

  async function recarregarCompraDiretaAposCatalogacao() {
    if (!solicitacao?.id) return;

    try {
      const data = await obterCompraDiretaPorSolicitacao(solicitacao.id);
      setCompraDiretaDetalhe(data || null);
      const itemAtualizado = (data?.itensManuais || []).find(
        (item) => Number(item.id) === Number(itemCompraDiretaSelecionado?.id)
      );
      if (itemAtualizado) {
        selecionarItemCompraDireta(mapearItemManualCompraDireta(itemAtualizado));
      }
      registrarMutacaoLocal(solicitacao.id);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'O item foi catalogado, mas a lista nao pôde ser atualizada. Reabra os itens da compra direta.');
    }
  }

  function atualizarRateioCompraDireta(index, campo, valor) {
    setRateiosCompraDireta((atuais) => (
      atuais.map((rateio, i) => (i === index ? { ...rateio, [campo]: valor } : rateio))
    ));
  }

  function adicionarRateioCompraDireta() {
    setRateiosCompraDireta((atuais) => [...atuais, criarRateioBase('')]);
  }

  function removerRateioCompraDireta(index) {
    setRateiosCompraDireta((atuais) => (
      atuais.length <= 1 ? atuais : atuais.filter((_, i) => i !== index)
    ));
  }

  async function salvarApropriacoesCompraDireta() {
    if (!compraDiretaDetalhe?.id || !itemCompraDiretaSelecionado?.id) {
      alert('Selecione um item para alterar.');
      return;
    }

    const itemComRateios = sincronizarItemComRateios({
      ...itemCompraDiretaSelecionado,
      apropriacoes: rateiosCompraDireta
    });
    const validacao = validarRateiosItem(itemComRateios);

    if (!validacao.ok) {
      alert(validacao.mensagem);
      return;
    }

    const motivo = String(motivoCompraDireta || '').trim();
    if (!motivo) {
      alert('Informe o motivo da alteracao.');
      return;
    }

    try {
      setSalvandoCompraDireta(true);
      const data = await atualizarApropriacoesItemSolicitacaoCompra(
        compraDiretaDetalhe.id,
        itemCompraDiretaSelecionado.id,
        {
          item_tipo: itemCompraDiretaSelecionado.item_tipo,
          apropriacoes: normalizarRateiosEntrada(itemComRateios).map((rateio) => ({
            apropriacao_id: Number(rateio.apropriacao_id),
            quantidade_apropriada: parseQuantidade(rateio.quantidade_apropriada)
          })),
          motivo
        }
      );

      setCompraDiretaDetalhe(data || null);
      setItemCompraDiretaSelecionado(null);
      setRateiosCompraDireta([]);
      setMotivoCompraDireta('');
      registrarMutacaoLocal(solicitacao.id);
      alert('Apropriacoes do item atualizadas com auditoria.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao atualizar apropriacoes do item');
    } finally {
      setSalvandoCompraDireta(false);
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

  const usaFluxoAprovacaoDiretoria = Boolean(
    solicitacao.usa_fluxo_aprovacao_diretoria ??
    (
      solicitacao.fluxo_aprovacao_diretoria &&
      !solicitacao.aprovada_diretoria_em &&
      solicitacao.diretoria_fluxo_codigo
    )
  );
  const podeAprovarDiretoria = Boolean(
    podeInteragirSolicitacao && (
      solicitacao.acao_aprovar_diretoria_disponivel ??
      (
        solicitacao.fluxo_aprovacao_diretoria &&
        !solicitacao.aprovada_diretoria_em &&
        (isSuperadmin || solicitacaoEstaNoSetorDoUsuario(solicitacao.area_responsavel, user))
      )
    )
  );
  const podeEnviarSetor =
    podeInteragirSolicitacao &&
    !usaFluxoAprovacaoDiretoria &&
    !isSetorObra &&
    (
      isSuperadmin ||
      podeEnviarQualquerSetor ||
      solicitacaoEstaNoSetorDoUsuario(solicitacao.area_responsavel, user)
    );
  const podeAlterarStatus =
    podeInteragirSolicitacao && (
      isSuperadmin ||
      podeAlterarStatusQualquerSetor ||
      solicitacaoEstaNoSetorDoUsuario(solicitacao.area_responsavel, user)
    );
  const podeMarcarPendenciaFinanceira = podeInteragirSolicitacao && (isSuperadmin || isSetorGeo || isSetorFinanceiro);

  const atualizadoEm = new Date(solicitacao.updatedAt || solicitacao.createdAt).toLocaleString('pt-BR');

  // Ação principal por setor+estado — compartilhada pelo cabeçalho e pela
  // barra fixa do mobile. Catálogo restrito a handlers que JÁ existem.
  const rolarAte = (idAlvo) => () => {
    document.getElementById(idAlvo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const catalogoAcoes = {
    alterar_status: { rotulo: 'Alterar status', disponivel: podeAlterarStatus, executar: () => setModalStatus(true) },
    enviar_setor: { rotulo: 'Enviar para outro setor', disponivel: podeEnviarSetor, executar: () => setModalEnviarSetor(true) },
    aprovar_diretoria: { rotulo: 'Aprovar e enviar', disponivel: podeAprovarDiretoria, executar: aprovarDiretoria },
    gerar_titulo: { rotulo: 'Gerar conta', disponivel: isFinanceiro && podeAcessarModuloFinanceiro, executar: rolarAte('sol-detail-financeiro') },
    // O card Pagamentos saiu do detalhe (a função vive no card Financeiro);
    // "informar_pagamento" leva ao mesmo destino para mapeamentos antigos.
    informar_pagamento: { rotulo: 'Informar pagamento', disponivel: isFinanceiro && podeAcessarModuloFinanceiro, executar: rolarAte('sol-detail-financeiro') },
    registrar_medicao: { rotulo: 'Registrar medição', disponivel: solicitacaoEhContrato, executar: rolarAte('sol-detail-contrato-acoes') }
  };
  const acaoPrincipalResolvida = (() => {
    const mapeada = resolverAcaoPrincipal(
      mapeamentosAcaoPrincipal,
      solicitacao.area_responsavel,
      solicitacao.status_global
    );
    if (!mapeada) return null;
    const acao = catalogoAcoes[mapeada.acao];
    if (!acao || !acao.disponivel) return null;
    return { acao: mapeada.acao, rotulo: mapeada.rotulo || acao.rotulo, executar: acao.executar };
  })();

  // ----- LAYOUT CONFIGURÁVEL: resolução usuário → setor → padrão --------
  const {
    ordem: ordemBlocos,
    ocultos: blocosOcultos,
    recolhidos: blocosRecolhidos,
    larguras: largurasBlocos,
    historicoOrdem
  } = resolverLayoutDetalhe({ configSetor: layoutSetor, prefsUsuario: prefsLayoutUsuario });

  const temCamadaUsuario = (novo) => Boolean(
    novo && (
      novo.ordem?.length || novo.recolhidos?.length || novo.removidos?.length
      || Object.keys(novo.larguras || {}).length || novo.historico_ordem === 'desc'
    )
  );
  const persistirLayoutUsuario = (novo) => {
    setPrefsLayoutUsuario(temCamadaUsuario(novo) ? novo : null);
    salvarListaPreferencias('detalhe-solicitacao', novo || {}).catch(() => {});
  };
  // Sempre grava a camada completa — mudar uma coisa não perde as outras.
  const camadaAtual = () => ({
    ordem: prefsLayoutUsuario?.ordem?.length ? ordemBlocos : [],
    recolhidos: Array.from(blocosRecolhidos),
    removidos: Array.from(blocosOcultos),
    larguras: { ...largurasBlocos },
    historico_ordem: historicoOrdem
  });
  const moverBloco = (origemId, alvoId) => {
    if (!origemId || !alvoId || origemId === alvoId) return;
    const ordem = ordemBlocos.slice();
    const de = ordem.indexOf(origemId);
    const para = ordem.indexOf(alvoId);
    if (de < 0 || para < 0) return;
    ordem.splice(para, 0, ordem.splice(de, 1)[0]);
    persistirLayoutUsuario({ ...camadaAtual(), ordem });
  };
  const alternarBlocoRecolhido = (blocoId) => {
    const recolhidos = new Set(blocosRecolhidos);
    if (recolhidos.has(blocoId)) recolhidos.delete(blocoId);
    else recolhidos.add(blocoId);
    persistirLayoutUsuario({ ...camadaAtual(), recolhidos: Array.from(recolhidos) });
  };
  const removerBloco = (blocoId) => {
    const removidos = new Set(blocosOcultos);
    removidos.add(blocoId);
    persistirLayoutUsuario({ ...camadaAtual(), removidos: Array.from(removidos) });
  };
  const readicionarBloco = (blocoId) => {
    const removidos = new Set(blocosOcultos);
    removidos.delete(blocoId);
    persistirLayoutUsuario({ ...camadaAtual(), removidos: Array.from(removidos) });
  };
  const definirLarguraBloco = (blocoId, largura) => {
    const larguras = { ...largurasBlocos };
    if (largura === 'total') larguras[blocoId] = 'total';
    else delete larguras[blocoId];
    persistirLayoutUsuario({ ...camadaAtual(), larguras });
  };
  const definirOrdemHistorico = (ordem) => {
    persistirLayoutUsuario({ ...camadaAtual(), historico_ordem: ordem === 'desc' ? 'desc' : 'asc' });
  };
  const restaurarPadraoSetor = () => {
    persistirLayoutUsuario(null);
  };

  const aoRecarregarSilencioso = () => {
    registrarMutacaoLocal(id);
    void carregar({ silent: true });
  };

  // Cada bloco: condições de permissão/tipo continuam decidindo se PODE
  // aparecer; a configuração decide onde e se aparece quando pode.
  const conteudoBlocos = {
    apropriacoes: podeEditarApropriacoesSolicitacaoNormal ? (
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
    ) : null,

    itens_compra_direta: podeGerenciarItensCompraDireta ? (
      <div className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)]">Itens da compra direta</h2>
          <p className="text-sm text-[var(--c-muted)]">
            {podeCatalogarItensManuaisCompra
              ? 'Trate os itens manuais para reutiliza-los em novas compras, mantendo o registro original.'
              : 'Ajuste as apropriacoes item por item, com motivo e auditoria.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={abrirModalCompraDireta}
          disabled={carregandoCompraDireta}
        >
          {carregandoCompraDireta ? 'Carregando itens...' : 'Gerenciar itens'}
        </button>
      </div>
    ) : null,

    rateio_contrato: solicitacaoEhContrato ? (
      <ApropriacoesDoContrato
        contrato={contratoDoFluxo}
        podeEditar={podeInteragirSolicitacao && podeEditarApropriacoes}
        onMudou={aoRecarregarSilencioso}
      />
    ) : null,

    // ITEM 26 (23/08): os termos aditivos, com Aprovar, Rejeitar e Cancelar. Fica ANTES da barra
    // de acoes do contrato porque um aditivo pendente e uma decisao que trava o contrato: quem
    // abre a tela precisa ver que ha algo esperando por ele. O card se oculta sozinho quando o
    // contrato nao tem aditivo, que e a maioria.
    aditivos_contrato: solicitacaoEhContrato ? (
      <AditivosDoContrato
        contrato={contratoSomenteLeitura}
        onMudou={aoRecarregarSilencioso}
      />
    ) : null,

    acoes_contrato: (solicitacaoEhContrato || falhaContrato) ? (
      <>
        {falhaContrato && (
          <div className="app-alert app-alert--warning" data-testid="falha-contrato">
            {falhaContrato} As previsoes de parcela e as acoes do contrato dependem deste acesso.
          </div>
        )}
        <div id="sol-detail-contrato-acoes">
          <AcoesContrato contrato={contratoSomenteLeitura} onMudou={aoRecarregarSilencioso} />
        </div>
      </>
    ) : null,

    aprovacao_diretoria: podeAprovarDiretoria ? (
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
    ) : null,

    historico: (
      <Timeline
        ordem={historicoOrdem}
        historicos={solicitacao.historicos || []}
        canRemoveAnexo={podeInteragirSolicitacao && canDeleteSolicitacaoAnexo(user)}
        canRemoveComentario={podeInteragirSolicitacao && String(user?.perfil || '').trim().toUpperCase() === 'SUPERADMIN'}
        onAnexoRemovido={aoRecarregarSilencioso}
      />
    ),

    financeiro: isFinanceiro ? (
      <div id="sol-detail-financeiro">
        <FinanceiroCard
          key={`financeiro-${id}-${statusDependenciasVersao}`}
          solicitacao={solicitacao}
          podeAcessarModuloFinanceiro={podeAcessarModuloFinanceiro}
          podeVisualizarTitulos={isFinanceiro}
          somenteLeitura={isSetorObra}
          onSolicitacaoAtualizada={() => {
            registrarMutacaoLocal(id);
            return carregar({ silent: true });
          }}
          onTituloCriado={aoRecarregarSilencioso}
        />
      </div>
    ) : null,

    // Comentar e anexar num ato só (dá para anexar sem escrever).
    conversa: (
      <Conversa
        solicitacaoId={id}
        podeInteragir={podeInteragirSolicitacao}
        motivoBloqueio={contextoInteracao?.motivo_bloqueio}
        onSucesso={aoRecarregarSilencioso}
      />
    ),

    auditoria: podeMarcarPendenciaFinanceira ? (
      !auditoriaAberta ? (
        <button
          type="button"
          className="btn btn-outline btn-sm self-start"
          onClick={() => setAuditoriaAberta(true)}
        >
          Registrar pendência de auditoria
        </button>
      ) : (
        <div className="space-y-2">
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
          <div className="flex justify-end">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAuditoriaAberta(false)}>
              Recolher auditoria
            </button>
          </div>
        </div>
      )
    ) : null
  };

  const blocosVisiveis = ordemBlocos
    .filter((blocoId) => !blocosOcultos.has(blocoId))
    .map((blocoId) => ({ id: blocoId, conteudo: conteudoBlocos[blocoId] }))
    .filter((bloco) => bloco.conteudo);

  const ABA_DO_BLOCO = {
    apropriacoes: 'detalhes',
    itens_compra_direta: 'detalhes',
    rateio_contrato: 'detalhes',
    aditivos_contrato: 'detalhes',
    acoes_contrato: 'detalhes',
    aprovacao_diretoria: 'detalhes',
    conversa: 'conversa',
    financeiro: 'financeiro',
    auditoria: 'financeiro',
    historico: 'historico'
  };
  const ABAS_MOBILE = [
    { id: 'detalhes', rotulo: 'Detalhes' },
    { id: 'conversa', rotulo: 'Conversa' },
    { id: 'financeiro', rotulo: 'Financeiro' },
    { id: 'historico', rotulo: 'Histórico' }
  ];

  const renderizarBloco = (bloco) => {
    const recolhido = blocosRecolhidos.has(bloco.id);
    return (
      <section
        key={bloco.id}
        className="sol-detail-bloco"
        draggable={personalizando && !isMobileDetalhe}
        onDragStart={() => { dragBlocoRef.current = bloco.id; }}
        onDragOver={(event) => { if (personalizando) event.preventDefault(); }}
        onDrop={() => {
          if (!personalizando) return;
          moverBloco(dragBlocoRef.current, bloco.id);
          dragBlocoRef.current = null;
        }}
      >
        {personalizando && (
          <div className="sol-detail-bloco-toolbar">
            <span className="sol-detail-bloco-arrastar" aria-hidden="true">⋮⋮</span>
            <span className="sol-detail-bloco-nome">{rotuloBloco(bloco.id)}</span>
            {!isMobileDetalhe && (
              <label className="sol-detail-bloco-largura">
                <select
                  value={largurasBlocos[bloco.id] === 'total' ? 'total' : 'normal'}
                  onChange={(event) => definirLarguraBloco(bloco.id, event.target.value)}
                  aria-label={`Largura do bloco ${rotuloBloco(bloco.id)}`}
                >
                  <option value="normal">Normal</option>
                  <option value="total">Largura total</option>
                </select>
              </label>
            )}
            <button type="button" className="la-link" onClick={() => alternarBlocoRecolhido(bloco.id)}>
              {recolhido ? 'Mostrar' : 'Recolher'}
            </button>
            <button
              type="button"
              className="sol-detail-bloco-remover"
              onClick={() => removerBloco(bloco.id)}
              title={`Remover ${rotuloBloco(bloco.id)} do seu layout`}
              aria-label={`Remover ${rotuloBloco(bloco.id)} do seu layout`}
            >
              ×
            </button>
          </div>
        )}
        {recolhido ? (
          !personalizando && (
            <button
              type="button"
              className="sol-detail-bloco-recolhido"
              onClick={() => alternarBlocoRecolhido(bloco.id)}
            >
              {rotuloBloco(bloco.id)} — mostrar
            </button>
          )
        ) : bloco.conteudo}
      </section>
    );
  };

  // Blocos removíveis/readicionáveis: o catálogo do "Adicionar bloco" só
  // oferece o que a permissão e o tipo JÁ permitem nesta solicitação —
  // adicionar/remover nunca muda o que o usuário PODE ver.
  const blocosDisponiveisParaAdicionar = ordemBlocos
    .filter((blocoId) => blocosOcultos.has(blocoId))
    .map((blocoId) => ({ id: blocoId, conteudo: conteudoBlocos[blocoId] }))
    .filter((bloco) => bloco.conteudo);

  // Segmentos para a grade: bloco de LARGURA TOTAL quebra a linha e
  // ocupa tudo; os demais fluem em 2 colunas dentro do segmento.
  const segmentosBlocos = (() => {
    const segmentos = [];
    let corrente = null;
    for (const bloco of blocosVisiveis) {
      if (largurasBlocos[bloco.id] === 'total') {
        segmentos.push({ tipo: 'total', blocos: [bloco] });
        corrente = null;
      } else {
        if (!corrente) {
          corrente = { tipo: 'colunas', blocos: [] };
          segmentos.push(corrente);
        }
        corrente.blocos.push(bloco);
      }
    }
    return segmentos;
  })();


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
        contratoDoFluxo={contratoDoFluxo}
        onAlterarStatus={() => setModalStatus(true)}
        onEnviarSetor={() => setModalEnviarSetor(true)}
        mostrarAlterarStatus={podeAlterarStatus}
        mostrarEnviarSetor={podeEnviarSetor}
        mostrarContratoInfo={moduloContratosHabilitado}
        acaoPrincipal={acaoPrincipalResolvida}
      />

      <RetornoSolicitacaoBar
        solicitacao={solicitacao}
        onMudou={() => carregar({ silent: true })}
      />

      {isRecargaCartaoSolicitacao && (
        <RecargaCartaoDetalhe
          key={`recarga-${id}-${statusDependenciasVersao}`}
          solicitacaoId={id}
          podeInteragir={podeInteragirSolicitacao}
        />
      )}

      {/* Barra fixa do mobile: a ação principal sempre visível. */}
      {isMobileDetalhe && (acaoPrincipalResolvida || podeAlterarStatus) && (
        <div className="sol-detail-acao-fixa">
          {acaoPrincipalResolvida ? (
            <button type="button" className="btn btn-primary w-full" onClick={acaoPrincipalResolvida.executar}>
              {acaoPrincipalResolvida.rotulo}
            </button>
          ) : (
            <button type="button" className="btn btn-primary w-full" onClick={() => setModalStatus(true)}>
              Alterar status
            </button>
          )}
        </div>
      )}

      {/* Personalização do layout (desktop): arrastar blocos, recolher,
          restaurar o padrão do setor. */}
      {!isMobileDetalhe && (
        <div className="sol-detail-blocos-toolbar">
          <button
            type="button"
            className={`btn btn-outline btn-sm ${personalizando ? 'sol-detail-personalizando' : ''}`}
            onClick={() => {
              setPersonalizando((atual) => !atual);
              setAdicionarBlocoAberto(false);
            }}
            aria-pressed={personalizando}
          >
            {personalizando ? 'Concluir personalização' : 'Personalizar layout'}
          </button>
          {personalizando && (
            <>
              <div className="sol-detail-adicionar-wrap">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setAdicionarBlocoAberto((aberto) => !aberto)}
                  aria-expanded={adicionarBlocoAberto}
                  disabled={blocosDisponiveisParaAdicionar.length === 0}
                >
                  Adicionar bloco{blocosDisponiveisParaAdicionar.length > 0 ? ` (${blocosDisponiveisParaAdicionar.length})` : ''}
                </button>
                {adicionarBlocoAberto && blocosDisponiveisParaAdicionar.length > 0 && (
                  <div className="sol-detail-adicionar-pop" role="menu" aria-label="Blocos disponíveis">
                    {blocosDisponiveisParaAdicionar.map((bloco) => (
                      <button
                        key={bloco.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          readicionarBloco(bloco.id);
                          setAdicionarBlocoAberto(false);
                        }}
                      >
                        {rotuloBloco(bloco.id)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className="sol-detail-historico-ordem">
                Histórico:
                <select
                  value={historicoOrdem}
                  onChange={(event) => definirOrdemHistorico(event.target.value)}
                  aria-label="Ordem do histórico"
                >
                  <option value="asc">mais antigos primeiro</option>
                  <option value="desc">mais recentes primeiro</option>
                </select>
              </label>
              <button type="button" className="btn btn-outline btn-sm" onClick={restaurarPadraoSetor}>
                Restaurar padrão do setor
              </button>
              <span className="text-sm text-[var(--c-muted)]">
                Arraste para reordenar; largura, recolher e "×" em cada bloco. Salvo automaticamente.
                No celular valem a ordem e os blocos mantidos — largura é só do desktop.
              </span>
            </>
          )}
        </div>
      )}

      {isMobileDetalhe ? (
        <>
          <div className="sol-detail-abas" role="tablist" aria-label="Seções do detalhe">
            {ABAS_MOBILE.map((aba) => (
              <button
                key={aba.id}
                type="button"
                role="tab"
                aria-selected={abaMobile === aba.id}
                className={`sol-detail-aba ${abaMobile === aba.id ? 'ativa' : ''}`}
                onClick={() => setAbaMobile(aba.id)}
              >
                {aba.rotulo}
              </button>
            ))}
          </div>
          <div className="sol-detail-blocos sol-detail-blocos--mobile">
            {blocosVisiveis
              .filter((bloco) => ABA_DO_BLOCO[bloco.id] === abaMobile)
              .map(renderizarBloco)}
            {blocosVisiveis.filter((bloco) => ABA_DO_BLOCO[bloco.id] === abaMobile).length === 0 && (
              <p className="text-sm text-[var(--c-muted)]">Nada nesta aba para esta solicitação.</p>
            )}
          </div>
        </>
      ) : (
        <div className="sol-detail-arranjo">
          {segmentosBlocos.map((segmento, indice) => (
            segmento.tipo === 'total' ? (
              <div key={`seg-${indice}`} className="sol-detail-segmento-total">
                {segmento.blocos.map(renderizarBloco)}
              </div>
            ) : (
              <div key={`seg-${indice}`} className="sol-detail-blocos">
                {segmento.blocos.map(renderizarBloco)}
              </div>
            )
          ))}
        </div>
      )}

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
          <div className="flex max-h-[94vh] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl bg-[var(--c-surface)] p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
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

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
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
                      key={`rateio-solicitacao-${index}`}
                      className="grid gap-2 rounded-xl border border-[var(--c-border)] p-3 md:grid-cols-[1fr_112px_132px_auto]"
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

            <div className="mt-5 flex shrink-0 justify-end gap-2">
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

      {modalCompraDiretaAberto && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[88vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-[var(--c-surface)] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Itens da compra direta</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Selecione um item manual para catalogar ou corrigir seu vínculo oficial.
                </p>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={fecharModalCompraDireta}>
                Fechar
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--c-text)]">Itens</h3>
                {montarItensCompraDireta().length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--c-border)] p-4 text-sm text-[var(--c-muted)]">
                    Nenhum item localizado para esta compra direta.
                  </div>
                ) : (
                  montarItensCompraDireta().map((item) => {
                    const selecionado =
                      itemCompraDiretaSelecionado?.id === item.id &&
                      itemCompraDiretaSelecionado?.item_tipo === item.item_tipo;
                    const resumoApropriacao = montarLinhasResumoApropriacao(item, apropriacoesCatalogo).join(' | ') || '-';

                    return (
                      <button
                        key={`${item.item_tipo}-${item.id}`}
                        type="button"
                        className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                          selecionado
                            ? 'border-[var(--c-primary)] bg-[var(--c-primary-soft)]'
                            : 'border-[var(--c-border)] bg-[var(--c-surface)] hover:border-[var(--c-primary)]'
                        }`}
                        onClick={() => selecionarItemCompraDireta(item)}
                      >
                        <div className="font-semibold text-[var(--c-text)]">{item.descricao}</div>
                        <div className="mt-1 text-xs text-[var(--c-muted)]">
                          Qtd.: {item.quantidade || '-'} {item.unidade_label || ''}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[var(--c-muted)]">
                          {item.item_tipo === 'MANUAL'
                            ? (item.insumo_catalogado_id ? 'Manual · catalogado' : 'Manual · pendente de cadastro')
                            : 'Cadastro oficial'}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-[var(--c-muted)]">
                          {resumoApropriacao}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="rounded-2xl border border-[var(--c-border)] p-4">
                {!itemCompraDiretaSelecionado ? (
                  <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-[var(--c-border)] p-4 text-center text-sm text-[var(--c-muted)]">
                    Selecione um item para ver as ações disponíveis.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 border-b border-[var(--c-border)] pb-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--c-text)]">{itemCompraDiretaSelecionado.descricao}</h3>
                        <p className="text-sm text-[var(--c-muted)]">
                          Quantidade total: {itemCompraDiretaSelecionado.quantidade || '-'} {itemCompraDiretaSelecionado.unidade_label || ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Ação do item selecionado">
                        {itemCompraDiretaSelecionado.item_tipo === 'MANUAL' && podeCatalogarItensManuaisCompra ? (
                          <button
                            type="button"
                            className={`btn btn-sm ${acaoItemCompraDireta === 'CATALOGAR' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setAcaoItemCompraDireta('CATALOGAR')}
                            aria-pressed={acaoItemCompraDireta === 'CATALOGAR'}
                          >
                            Catalogar item
                          </button>
                        ) : null}
                        {podeEditarItensCompraDireta ? (
                          <button
                            type="button"
                            className={`btn btn-sm ${acaoItemCompraDireta === 'APROPRIAR' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setAcaoItemCompraDireta('APROPRIAR')}
                            aria-pressed={acaoItemCompraDireta === 'APROPRIAR'}
                          >
                            Editar apropriações
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {acaoItemCompraDireta === 'CATALOGAR' && itemCompraDiretaSelecionado.item_tipo === 'MANUAL' && podeCatalogarItensManuaisCompra ? (
                      <div className="compras-responsive-scope">
                        <TratamentoItemManual
                          item={itemCompraDiretaSelecionado}
                          solicitacaoId={compraDiretaDetalhe.id}
                          onCatalogado={() => { void recarregarCompraDiretaAposCatalogacao(); }}
                        />
                      </div>
                    ) : null}

                    {acaoItemCompraDireta === 'CATALOGAR' && itemCompraDiretaSelecionado.item_tipo !== 'MANUAL' ? (
                      <div className="rounded-xl border border-dashed border-[var(--c-border)] p-4 text-sm text-[var(--c-muted)]">
                        Este item já pertence ao cadastro oficial de insumos e não precisa ser catalogado.
                      </div>
                    ) : null}

                    {acaoItemCompraDireta === 'APROPRIAR' && podeEditarItensCompraDireta ? (
                      <>
                        <div className="space-y-3">
                          {rateiosCompraDireta.map((rateio, index) => (
                            <div
                              key={`rateio-compra-direta-${index}`}
                              className="grid gap-2 rounded-xl border border-[var(--c-border)] p-3 md:grid-cols-[1fr_140px_auto]"
                            >
                              <ApropriacaoAutocomplete
                                value={rateio.apropriacao_id}
                                options={apropriacoesCatalogo}
                                onChange={(valor) => atualizarRateioCompraDireta(index, 'apropriacao_id', valor)}
                                placeholder="Buscar apropriacao"
                              />
                              <input
                                className="input"
                                value={rateio.quantidade_apropriada}
                                onChange={(event) => atualizarRateioCompraDireta(index, 'quantidade_apropriada', event.target.value)}
                                placeholder="Qtd."
                                inputMode="decimal"
                              />
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => removerRateioCompraDireta(index)}
                                disabled={rateiosCompraDireta.length <= 1}
                              >
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>

                        <button type="button" className="btn btn-outline btn-sm" onClick={adicionarRateioCompraDireta}>
                          Adicionar linha
                        </button>

                        <label className="block text-sm font-semibold text-[var(--c-text)]">
                          Motivo da alteração *
                          <textarea
                            className="input mt-1 min-h-[88px]"
                            value={motivoCompraDireta}
                            onChange={(event) => setMotivoCompraDireta(event.target.value)}
                            placeholder="Explique por que a apropriação do item foi alterada."
                          />
                        </label>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => selecionarItemCompraDireta(itemCompraDiretaSelecionado)}
                            disabled={salvandoCompraDireta}
                          >
                            Desfazer alterações
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={salvarApropriacoesCompraDireta}
                            disabled={salvandoCompraDireta}
                          >
                            {salvandoCompraDireta ? 'Salvando apropriações...' : 'Salvar apropriações'}
                          </button>
                        </div>
                      </>
                    ) : null}

                    {itemCompraDiretaSelecionado.item_tipo !== 'MANUAL' && !podeEditarItensCompraDireta ? (
                      <div className="rounded-xl border border-dashed border-[var(--c-border)] p-4 text-sm text-[var(--c-muted)]">
                        Este item já está cadastrado. Sua permissão atual é exclusiva para tratar itens manuais.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
