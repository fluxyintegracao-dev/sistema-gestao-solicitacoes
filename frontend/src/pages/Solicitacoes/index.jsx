import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  HiDocumentArrowDown,
  HiViewColumns,
  HiOutlineEye,
  HiOutlineUserPlus,
  HiOutlineFolderOpen,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBanknotes,
  HiOutlineTrash,
  HiOutlineXMark
} from 'react-icons/hi2';
import Filtros from './Filtros';
import TabelaSolicitacoes from './TabelaSolicitacoes';
import ModalAtribuirResponsavel from './ModalAtribuirResponsavel';
import ModalEnviarSetor from './ModalEnviarSetor';
import { API_URL, authHeaders } from '../../services/api';
import { getSetores } from '../../services/setores';
import { getTiposSolicitacao } from '../../services/tiposSolicitacao';
import { getSetorPermissoes } from '../../services/setorPermissoes';
import { getStatusSetor } from '../../services/statusSetor';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveUpdateSubscription } from '../../contexts/LiveUpdatesContext';
import { parseDateSmart } from '../../utils/dateLocal';
import { isGeoSetor, solicitacaoEstaNoSetorDoUsuario, userHasSetorCapability } from '../../utils/setor';
import { hasEnabledModule } from '../../utils/acessoProduto';
import {
  arquivarSolicitacoesEmMassa,
  deleteSolicitacao,
  desarquivarSolicitacao,
  enviarSolicitacoesParaSetorEmMassa,
  getSolicitacaoResumoLista,
  getObrasVisiveisSolicitacoes
} from '../../services/solicitacoes';
import {
  getTitulosPrioridadePorSolicitacoes,
  listarLotesPrioridadeDiretoria,
  solicitarUrgenciaPrioridadeDiretoria
} from '../../services/prioridadesDiretoria';

function normalizarTextoComparacao(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatarDataParaFiltro(valor) {
  if (!valor) return '';
  const data = parseDateSmart(valor) || new Date(valor);
  if (!data || Number.isNaN(data.getTime())) return '';

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function moeda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '-';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataCurta(valor) {
  if (!valor) return '-';
  const data = parseDateSmart(valor) || new Date(valor);
  if (!data || Number.isNaN(data.getTime())) return '-';
  return data.toLocaleDateString('pt-BR');
}

const PAGE_SIZE_ALL = 'all';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 300, 500];

export default function Solicitacoes({ arquivadas = false }) {
  const DEFAULT_VISIBLE_COLUMNS = [
    'data',
    'codigo',
    'numero_sienge',
    'obra',
    'contrato',
    'ref_contrato',
    'descricao',
    'tipo',
    'valor',
    'setor',
    'responsavel',
    'status',
    'vencimento'
  ];
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setoresMap, setSetoresMap] = useState({});
  const [setoresLista, setSetoresLista] = useState([]);
  const [tiposSolicitacao, setTiposSolicitacao] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [obrasOptions, setObrasOptions] = useState([]);
  const [responsaveisOptions, setResponsaveisOptions] = useState([]);
  const [permissaoUsuario, setPermissaoUsuario] = useState(null);
  const [selecionadasIds, setSelecionadasIds] = useState([]);
  const [modalEnvioMassa, setModalEnvioMassa] = useState(false);
  const [modalAtribuir, setModalAtribuir] = useState(false);
  const [modalEnviarUnitario, setModalEnviarUnitario] = useState(false);
  const [modalAtribuirMassa, setModalAtribuirMassa] = useState(false);
  const [usuariosAtribuicao, setUsuariosAtribuicao] = useState([]);
  const [usuarioAtribuicaoMassa, setUsuarioAtribuicaoMassa] = useState('');
  const [setorEnvioMassa, setSetorEnvioMassa] = useState('');
  const [processandoMassa, setProcessandoMassa] = useState(false);
  const [modalPrioridadeTitulos, setModalPrioridadeTitulos] = useState(false);
  const [titulosPrioridade, setTitulosPrioridade] = useState([]);
  const [solicitacoesPrioridadeSemTitulos, setSolicitacoesPrioridadeSemTitulos] = useState([]);
  const [lotesPrioridadeAbertos, setLotesPrioridadeAbertos] = useState([]);
  const [lotePrioridadeDestino, setLotePrioridadeDestino] = useState('');
  const [titulosPrioridadeSelecionados, setTitulosPrioridadeSelecionados] = useState(new Set());
  const [mostrarSeletorColunas, setMostrarSeletorColunas] = useState(false);
  const [colunasVisiveis, setColunasVisiveis] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [colunasStoragePronto, setColunasStoragePronto] = useState(false);
  const [seletorColunasPosition, setSeletorColunasPosition] = useState({ left: 16, top: 16 });
  const [filtrosStoragePronto, setFiltrosStoragePronto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [limitePorPagina, setLimitePorPagina] = useState(25);
  const [metaPaginacao, setMetaPaginacao] = useState({
    page: 1,
    limit: 25,
    total: 0,
    total_pages: 0
  });
  const seletorColunasRef = useRef(null);
  const botaoColunasRef = useRef(null);
  const solicitacoesRef = useRef([]);
  const localMutationsRef = useRef(new Map());
  const { user } = useAuth();
  const moduloContratosHabilitado = hasEnabledModule(user, 'CONTRATOS');

  const [filtros, setFiltros] = useState({
    codigo: '',
    numero_sienge: '',
    obra_ids: '',
    area: '',
    tipo_solicitacao_id: '',
    status: '',
    valor_min: '',
    valor_max: '',
    data_registro: '',
    data_vencimento: '',
    data_vencimento_inicio: '',
    data_vencimento_fim: '',
    responsavel: ''
  });

  const filtrosStorageKey = useMemo(() => {
    const identificador = user?.id || user?.email || user?.nome || user?.perfil || 'anon';
    const escopo = arquivadas ? 'arquivadas' : 'ativas';
    return `solicitacoes:filtros:${escopo}:${identificador}`;
  }, [user?.id, user?.email, user?.nome, user?.perfil, arquivadas]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtros, arquivadas, limitePorPagina]);

  useEffect(() => {
    solicitacoesRef.current = solicitacoes;
  }, [solicitacoes]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      carregar();
    }, 250);

    return () => clearTimeout(timeout);
  }, [filtros, arquivadas, paginaAtual, limitePorPagina]);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(filtrosStorageKey);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed && typeof parsed === 'object') {
          const normalizado = { ...parsed };
          if (!normalizado.numero_sienge && normalizado.numero_solicitacao) {
            normalizado.numero_sienge = normalizado.numero_solicitacao;
          }
          delete normalizado.numero_solicitacao;
          setFiltros(prev => ({ ...prev, ...normalizado }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar filtros salvos', error);
    } finally {
      setFiltrosStoragePronto(true);
    }
  }, [filtrosStorageKey]);

  useEffect(() => {
    if (!filtrosStoragePronto) return;
    try {
      localStorage.setItem(filtrosStorageKey, JSON.stringify(filtros));
    } catch (error) {
      console.error('Erro ao salvar filtros', error);
    }
  }, [filtros, filtrosStorageKey, filtrosStoragePronto]);

  useEffect(() => {
    carregarSetores();
    carregarTiposSolicitacao();
    carregarStatusOptions();
    carregarPermissoes();
  }, []);

  useEffect(() => {
    carregarObrasOptions();
  }, [arquivadas, user?.id]);

  useEffect(() => {
    setResponsaveisOptions(extrairOpcoesResponsaveis(solicitacoes));
  }, [solicitacoes]);

  async function carregarTiposSolicitacao() {
    try {
      const data = await getTiposSolicitacao();
      setTiposSolicitacao(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  }

  async function carregarSetores() {
    try {
      const data = await getSetores();
      const map = {};
      (Array.isArray(data) ? data : []).forEach(s => {
        if (s?.codigo) map[s.codigo] = s;
        if (s?.nome) map[s.nome] = s;
      });
      setSetoresLista(Array.isArray(data) ? data : []);
      setSetoresMap(map);
    } catch (error) {
      console.error(error);
    }
  }

  function normalizarStatus(status) {
    return String(status || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
  }

  async function carregarStatusOptions() {
    try {
      const data = await getStatusSetor();
      const lista = Array.isArray(data) ? data : [];
      const map = new Map();
      lista.forEach(item => {
        if (!item?.ativo) return;
        const nome = String(item.nome || '').trim();
        if (!nome) return;
        const key = normalizarStatus(nome);
        if (!map.has(key)) {
          map.set(key, nome);
        }
      });
      setStatusOptions(Array.from(map.entries()).map(([value, label]) => ({ value, label })));
    } catch (error) {
      console.error(error);
      setStatusOptions([]);
    }
  }

  async function carregarPermissoes() {
    try {
      if (user?.perfil !== 'USUARIO') {
        setPermissaoUsuario(null);
        return;
      }
      const setorToken = user?.setor?.codigo || user?.setor?.nome || user?.area || user?.setor_id;
      if (!setorToken) return;
      const data = await getSetorPermissoes({ setor: setorToken });
      const item = Array.isArray(data) && data.length > 0 ? data[0] : null;
      setPermissaoUsuario(item);
    } catch (error) {
      console.error(error);
      setPermissaoUsuario(null);
    }
  }

  function extrairOpcoesObras(lista) {
    const obrasMap = new Map();

    (Array.isArray(lista) ? lista : []).forEach(item => {
      const obraId = item?.obra?.id ?? item?.obra_id;
      const obraNome = item?.obra?.nome || null;
      if (obraId && obraNome) {
        const chave = String(obraId);
        if (!obrasMap.has(chave)) {
          obrasMap.set(chave, {
            value: chave,
            label: obraNome
          });
        }
      }
    });

    return Array.from(obrasMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  function extrairOpcoesResponsaveis(lista) {
    const responsaveisMap = new Map();

    (Array.isArray(lista) ? lista : []).forEach(item => {
      const responsavel = String(item?.responsavel || '').trim();
      if (responsavel && responsavel !== '-') {
        const chaveResp = responsavel.toUpperCase();
        if (!responsaveisMap.has(chaveResp)) {
          responsaveisMap.set(chaveResp, {
            value: responsavel,
            label: responsavel
          });
        }
      }
    });

    return Array.from(responsaveisMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  async function carregarObrasOptions() {
    try {
      const params = arquivadas ? { arquivadas: '1' } : {};
      const data = await getObrasVisiveisSolicitacoes(params);
      const lista = (Array.isArray(data) ? data : []).map((obra) => ({
        value: String(obra.id),
        label: obra.nome
      }));
      setObrasOptions(lista.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')));
    } catch (error) {
      console.error(error);
      setObrasOptions([]);
    }
  }

  function obterIdsFiltro(valor) {
    return String(valor || '')
      .split(',')
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  function obterValorListaSolicitacao(item) {
    const numero = Number(item?.valor_exibicao ?? item?.saldo_pagamento ?? item?.valor);
    return Number.isFinite(numero) ? numero : null;
  }

  function solicitacaoAtendeFiltros(item) {
    if (!item) return false;

    const codigo = String(item?.codigo || '');
    const numeroPedido = String(item?.numero_sienge || item?.numero_pedido || '');
    const obraId = String(item?.obra?.id ?? item?.obra_id ?? '');
    const tipoId = String(item?.tipo?.id ?? item?.tipo_solicitacao_id ?? '');
    const responsavel = String(item?.responsavel || '');
    const statusNormalizado = normalizarStatus(item?.status_global || '');
    const valorSolicitacao = obterValorListaSolicitacao(item);
    const dataRegistro = formatarDataParaFiltro(item?.createdAt || item?.data_criacao || item?.created_at);
    const dataVencimento = formatarDataParaFiltro(item?.data_vencimento);
    const filtrosObras = obterIdsFiltro(filtros.obra_ids);
    const filtrosTipos = obterIdsFiltro(filtros.tipo_solicitacao_id);
    const filtrosStatus = obterIdsFiltro(filtros.status).map((valor) => normalizarStatus(valor));
    const filtrosSetor = obterIdsFiltro(filtros.area).map((valor) => normalizarTextoComparacao(valor));
    const setorSolicitacao = setoresMap?.[item?.area_responsavel] || null;
    const tokensSetor = new Set(
      [
        item?.area_responsavel,
        setorSolicitacao?.codigo,
        setorSolicitacao?.nome,
        setorSolicitacao?.id
      ]
        .map((valor) => normalizarTextoComparacao(valor))
        .filter(Boolean)
    );

    if (filtros.codigo && !codigo.toLowerCase().includes(String(filtros.codigo).trim().toLowerCase())) {
      return false;
    }

    if (filtros.numero_sienge && !numeroPedido.toLowerCase().includes(String(filtros.numero_sienge).trim().toLowerCase())) {
      return false;
    }

    if (filtrosObras.length > 0 && !filtrosObras.includes(obraId)) {
      return false;
    }

    if (filtrosSetor.length > 0 && !filtrosSetor.some((token) => tokensSetor.has(token))) {
      return false;
    }

    if (filtrosTipos.length > 0 && !filtrosTipos.includes(tipoId)) {
      return false;
    }

    if (filtrosStatus.length > 0 && !filtrosStatus.includes(statusNormalizado)) {
      return false;
    }

    if (String(filtros.valor_min || '').trim() !== '') {
      const valorMin = Number(filtros.valor_min);
      if (!Number.isNaN(valorMin) && (valorSolicitacao === null || valorSolicitacao < valorMin)) {
        return false;
      }
    }

    if (String(filtros.valor_max || '').trim() !== '') {
      const valorMax = Number(filtros.valor_max);
      if (!Number.isNaN(valorMax) && (valorSolicitacao === null || valorSolicitacao > valorMax)) {
        return false;
      }
    }

    if (filtros.data_registro && dataRegistro !== filtros.data_registro) {
      return false;
    }

    if (filtros.data_vencimento_inicio && (!dataVencimento || dataVencimento < filtros.data_vencimento_inicio)) {
      return false;
    }

    if (filtros.data_vencimento_fim && (!dataVencimento || dataVencimento > filtros.data_vencimento_fim)) {
      return false;
    }

    if (filtros.data_vencimento && dataVencimento !== filtros.data_vencimento) {
      return false;
    }

    if (filtros.responsavel && !responsavel.toLowerCase().includes(String(filtros.responsavel).trim().toLowerCase())) {
      return false;
    }

    return true;
  }

  function registrarMutacaoLocal(id) {
    const idNumerico = Number(id);
    if (!Number.isInteger(idNumerico) || idNumerico <= 0) return;
    localMutationsRef.current.set(idNumerico, Date.now());
  }

  function eventoFoiTratadoLocalmente(payload) {
    const idNumerico = Number(payload?.record_id || 0);
    if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
      return false;
    }

    const actorId = Number(payload?.actor?.id || 0);
    if (!Number.isInteger(actorId) || actorId <= 0 || actorId !== Number(user?.id || 0)) {
      return false;
    }

    const handledAt = localMutationsRef.current.get(idNumerico);
    if (!handledAt) {
      return false;
    }

    if (Date.now() - handledAt > 10 * 1000) {
      localMutationsRef.current.delete(idNumerico);
      return false;
    }

    localMutationsRef.current.delete(idNumerico);
    return true;
  }

  function atualizarMetaPaginacaoComDelta(totalDelta = 0) {
    if (!totalDelta) return;

    setMetaPaginacao((prev) => {
      const nextTotal = Math.max(0, Number(prev?.total || 0) + Number(totalDelta || 0));
      const nextLimit = limitePorPagina === PAGE_SIZE_ALL
        ? Math.max(nextTotal, solicitacoesRef.current.length, 1)
        : Math.max(1, Number(prev?.limit || limitePorPagina || 25));
      return {
        ...prev,
        total: nextTotal,
        total_pages: nextTotal > 0 ? Math.ceil(nextTotal / nextLimit) : 0
      };
    });
  }

  function aplicarListaLocal(nextList, { totalDelta = 0 } = {}) {
    const listaNormalizada = Array.isArray(nextList) ? nextList : [];
    setSolicitacoes(listaNormalizada);
    setSelecionadasIds((prev) => prev.filter((idSelecionado) => (
      listaNormalizada.some((item) => Number(item.id) === Number(idSelecionado))
    )));
    atualizarMetaPaginacaoComDelta(totalDelta);
  }

  function removerSolicitacaoDaLista(id, { decrementarTotal = false } = {}) {
    const idNumerico = Number(id);
    if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
      return;
    }

    const listaAtual = solicitacoesRef.current;
    const existeNaLista = listaAtual.some((item) => Number(item.id) === idNumerico);
    if (!existeNaLista) {
      return;
    }

    const proximaLista = listaAtual.filter((item) => Number(item.id) !== idNumerico);
    aplicarListaLocal(proximaLista, { totalDelta: decrementarTotal ? -1 : 0 });
  }

  async function atualizarSolicitacaoDaLista(id, { permitirInsercao = false } = {}) {
    const idNumerico = Number(id);
    if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
      return;
    }

    const listaAtual = solicitacoesRef.current;
    const indiceAtual = listaAtual.findIndex((item) => Number(item.id) === idNumerico);

    try {
      const resumo = await getSolicitacaoResumoLista(idNumerico);
      const atendeFiltros = solicitacaoAtendeFiltros(resumo);

      if (indiceAtual >= 0) {
        if (!atendeFiltros) {
          removerSolicitacaoDaLista(idNumerico, { decrementarTotal: true });
          return;
        }

        const proximaLista = [...listaAtual];
        proximaLista[indiceAtual] = resumo;
        aplicarListaLocal(proximaLista);
        return;
      }

      if (!atendeFiltros || !permitirInsercao || arquivadas || paginaAtual !== 1) {
        return;
      }

      const proximaLista = [resumo, ...listaAtual]
        .filter((item, index, array) => (
          array.findIndex((outro) => Number(outro.id) === Number(item.id)) === index
        ));

      const listaLimitada = limitePorPagina === PAGE_SIZE_ALL
        ? proximaLista
        : proximaLista.slice(0, Number(limitePorPagina || 25));

      aplicarListaLocal(listaLimitada, { totalDelta: 1 });
    } catch (error) {
      const status = Number(error?.status || 0);
      if ((status === 403 || status === 404) && indiceAtual >= 0) {
        removerSolicitacaoDaLista(idNumerico, { decrementarTotal: true });
        return;
      }

      console.error(error);
    }
  }

  async function handleAtualizarLista(mutation = null) {
    if (!mutation || typeof mutation !== 'object') {
      await carregarEmSegundoPlano();
      return;
    }

    const mutationId = Number(mutation.id || 0);
    if (Number.isInteger(mutationId) && mutationId > 0) {
      registrarMutacaoLocal(mutationId);
    }

    if (mutation.type === 'remove_item') {
      removerSolicitacaoDaLista(mutationId, {
        decrementarTotal: mutation.decrementarTotal !== false
      });
      return;
    }

    if (mutation.type === 'refresh_item') {
      await atualizarSolicitacaoDaLista(mutationId, {
        permitirInsercao: !!mutation.permitirInsercao
      });
      return;
    }

    await carregarEmSegundoPlano();
  }

  async function carregar({ silent = false } = {}) {
    try {
      if (!silent) {
        setLoading(true);
      }

      const paramsObj = {};
      Object.entries(filtros).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
          paramsObj[chave] = String(valor).trim();
        }
      });
      if (arquivadas) {
        paramsObj.arquivadas = '1';
      }
      paramsObj.page = String(paginaAtual);
      paramsObj.limit = limitePorPagina === PAGE_SIZE_ALL ? PAGE_SIZE_ALL : String(limitePorPagina);

      const params = new URLSearchParams(paramsObj).toString();

      const res = await fetch(`${API_URL}/solicitacoes?${params}`, {
        headers: authHeaders()
      });

      if (!res.ok) {
        throw new Error('Erro ao buscar solicitações');
      }

      const data = await res.json();
      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setSolicitacoes(lista);
      setObrasOptions(prev => {
        if (prev.length > 0) return prev;
        return extrairOpcoesObras(lista);
      });
      setMetaPaginacao({
        page: Number(data?.meta?.page || paginaAtual),
        limit: data?.meta?.limit === PAGE_SIZE_ALL ? PAGE_SIZE_ALL : Number(data?.meta?.limit || limitePorPagina),
        total: Number(data?.meta?.total || lista.length),
        total_pages: Number(data?.meta?.total_pages || (lista.length > 0 ? 1 : 0))
      });

      setSelecionadasIds((prev) => prev.filter((idSelecionado) => (
        lista.some((item) => Number(item.id) === Number(idSelecionado))
      )));
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  }

  async function carregarEmSegundoPlano() {
    try {
      const paramsObj = {};
      Object.entries(filtros).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
          paramsObj[chave] = String(valor).trim();
        }
      });
      if (arquivadas) {
        paramsObj.arquivadas = '1';
      }
      paramsObj.page = String(paginaAtual);
      paramsObj.limit = limitePorPagina === PAGE_SIZE_ALL ? PAGE_SIZE_ALL : String(limitePorPagina);

      const params = new URLSearchParams(paramsObj).toString();
      const res = await fetch(`${API_URL}/solicitacoes?${params}`, {
        headers: authHeaders()
      });

      if (!res.ok) {
        throw new Error('Erro ao buscar solicitacoes');
      }

      const data = await res.json();
      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];

      setSolicitacoes(lista);
      setObrasOptions((prev) => {
        if (prev.length > 0) return prev;
        return extrairOpcoesObras(lista);
      });
      setMetaPaginacao({
        page: Number(data?.meta?.page || paginaAtual),
        limit: data?.meta?.limit === PAGE_SIZE_ALL ? PAGE_SIZE_ALL : Number(data?.meta?.limit || limitePorPagina),
        total: Number(data?.meta?.total || lista.length),
        total_pages: Number(data?.meta?.total_pages || (lista.length > 0 ? 1 : 0))
      });
      setSelecionadasIds((prev) => prev.filter((idSelecionado) => (
        lista.some((item) => Number(item.id) === Number(idSelecionado))
      )));
    } catch (error) {
      console.error(error);
    }
  }

  const perfilUpper = String(user?.perfil || '').toUpperCase();
  const mostrarSomaValor = perfilUpper.startsWith('ADMIN') || perfilUpper === 'SUPERADMIN';
  const somaValorFiltrado = solicitacoes.reduce((total, item) => {
    const valor = Number(item?.valor || 0);
    return total + (Number.isNaN(valor) ? 0 : valor);
  }, 0);
  const totalSolicitacoes = Number(metaPaginacao?.total || 0);
  const totalPaginas = Number(metaPaginacao?.total_pages || 0);
  const exibindoTodas = limitePorPagina === PAGE_SIZE_ALL;
  const limiteNumericoAtual = exibindoTodas
    ? Math.max(totalSolicitacoes, solicitacoes.length, 1)
    : Number(limitePorPagina || 25);
  const paginaInicial = totalSolicitacoes === 0 ? 0 : ((paginaAtual - 1) * limiteNumericoAtual) + 1;
  const paginaFinal = totalSolicitacoes === 0
    ? 0
    : Math.min(totalSolicitacoes, paginaAtual * limiteNumericoAtual);

  const setorTokens = [
    String(user?.setor?.codigo || '').toUpperCase(),
    String(user?.setor?.nome || '').toUpperCase(),
    String(user?.area || '').toUpperCase()
  ];
  const isSetorObra = userHasSetorCapability(user, 'eh_setor_obra');
  const isSetorFinanceiro = userHasSetorCapability(user, 'eh_setor_financeiro');
  const setorTokensNormalizados = setorTokens.map(normalizarTextoComparacao).filter(Boolean);
  const isDiretoriaObrasPublicas = setorTokensNormalizados.includes('DIR_OBRAS_PUBLICAS');
  const isDiretoriaObrasPrivadas = setorTokensNormalizados.includes('DIR_OBRAS_PRIVADAS');
  const podeSolicitarPrioridadeFinanceiro = !arquivadas && (isDiretoriaObrasPublicas || isDiretoriaObrasPrivadas);
  const classificacaoPrioridadeDiretoria = isDiretoriaObrasPublicas ? 'PUBLICA' : 'PRIVADA';
  const isAdminGEO = perfilUpper.startsWith('ADMIN') && userHasSetorCapability(user, 'eh_setor_geo');
  const isSuperadmin = perfilUpper === 'SUPERADMIN';
  const colunasStorageKey = useMemo(() => {
    const identificador = user?.id || user?.email || user?.nome || user?.perfil || 'anon';
    return `solicitacoes:colunas:${identificador}`;
  }, [user?.id, user?.email, user?.nome, user?.perfil]);
  const opcoesColunas = useMemo(() => [
    { id: 'data', label: 'Data' },
    { id: 'codigo', label: 'Código' },
    { id: 'numero_sienge', label: 'Nº pedido' },
    { id: 'obra', label: 'Obra' },
    ...(moduloContratosHabilitado ? [{ id: 'contrato', label: 'Contrato' }] : []),
    ...(moduloContratosHabilitado && isSetorObra ? [{ id: 'ref_contrato', label: 'Ref. do Contrato' }] : []),
    { id: 'descricao', label: 'Descrição' },
    { id: 'tipo', label: 'Tipo de Solicitação' },
    { id: 'valor', label: 'Valor' },
    { id: 'setor', label: 'Setor' },
    { id: 'responsavel', label: 'Responsável' },
    { id: 'status', label: 'Status' },
    { id: 'vencimento', label: 'Vencimento' }
  ], [moduloContratosHabilitado, isSetorObra]);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(colunasStorageKey);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed)) {
          setColunasVisiveis(parsed);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar preferencia de colunas', error);
    } finally {
      setColunasStoragePronto(true);
    }
  }, [colunasStorageKey]);

  useEffect(() => {
    setColunasVisiveis(prev => {
      const validas = opcoesColunas.map(c => c.id);
      const filtradas = prev.filter(id => validas.includes(id));
      const obrigatorias = ['codigo', 'status'];
      for (const obrigatoria of obrigatorias) {
        if (!filtradas.includes(obrigatoria) && validas.includes(obrigatoria)) {
          filtradas.push(obrigatoria);
        }
      }
      return filtradas.length > 0 ? filtradas : validas;
    });
  }, [opcoesColunas]);

  useEffect(() => {
    if (!colunasStoragePronto) return;
    try {
      localStorage.setItem(colunasStorageKey, JSON.stringify(colunasVisiveis));
    } catch (error) {
      console.error('Erro ao salvar preferencia de colunas', error);
    }
  }, [colunasVisiveis, colunasStorageKey, colunasStoragePronto]);

  useEffect(() => {
    function fecharAoClicarFora(event) {
      if (!mostrarSeletorColunas) return;
      const alvo = event.target;
      if (seletorColunasRef.current?.contains(alvo)) return;
      if (botaoColunasRef.current?.contains(alvo)) return;
      setMostrarSeletorColunas(false);
    }

    document.addEventListener('mousedown', fecharAoClicarFora);
    return () => document.removeEventListener('mousedown', fecharAoClicarFora);
  }, [mostrarSeletorColunas]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== 'Escape') return;
      setMostrarSeletorColunas(false);
      setModalEnvioMassa(false);
      setModalPrioridadeTitulos(false);
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (!mostrarSeletorColunas) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      posicionarSeletorColunas();
    });

    function reposicionarSeletor() {
      posicionarSeletorColunas();
    }

    window.addEventListener('resize', reposicionarSeletor);
    window.addEventListener('scroll', reposicionarSeletor, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', reposicionarSeletor);
      window.removeEventListener('scroll', reposicionarSeletor, true);
    };
  }, [mostrarSeletorColunas]);

  function toggleSelecionada(id) {
    const idNum = Number(id);
    setSelecionadasIds(prev =>
      prev.includes(idNum)
        ? prev.filter(item => item !== idNum)
        : [...prev, idNum]
    );
  }

  function toggleSelecionarTodas() {
    const idsPagina = solicitacoes.map(item => Number(item.id));
    const todasSelecionadas = idsPagina.length > 0 && idsPagina.every(id => selecionadasIds.includes(id));
    setSelecionadasIds(todasSelecionadas ? [] : idsPagina);
  }

  async function arquivarEmMassa() {
    if (selecionadasIds.length === 0) {
      alert('Selecione ao menos uma solicitação.');
      return;
    }
    if (!confirm(`Arquivar ${selecionadasIds.length} solicitação(ões) somente para sua visualização?`)) {
      return;
    }

    try {
      setProcessandoMassa(true);
      const resultado = await arquivarSolicitacoesEmMassa(selecionadasIds);
      setSelecionadasIds([]);
      await carregar({ silent: true });
      if (resultado?.erros?.length > 0) {
        alert(`Arquivamento em massa concluído. Arquivadas: ${resultado.sucesso}. Falhas: ${resultado.erros.length}.`);
      } else {
        alert('Solicitações arquivadas em massa com sucesso.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao arquivar solicitações em massa.');
    } finally {
      setProcessandoMassa(false);
    }
  }

  async function desarquivarEmMassa() {
    if (selecionadasIds.length === 0) {
      alert('Selecione ao menos uma solicitacao.');
      return;
    }
    if (!confirm(`Desarquivar ${selecionadasIds.length} solicitacao(oes) da sua lista de arquivadas?`)) {
      return;
    }

    try {
      setProcessandoMassa(true);
      let sucesso = 0;
      const erros = [];

      for (const solicitacaoId of selecionadasIds) {
        try {
          await desarquivarSolicitacao(solicitacaoId);
          sucesso += 1;
        } catch (error) {
          erros.push({ id: solicitacaoId, error });
        }
      }

      setSelecionadasIds([]);
      await carregar({ silent: true });

      if (erros.length > 0) {
        alert(`Desarquivamento em massa concluido. Desarquivadas: ${sucesso}. Falhas: ${erros.length}.`);
      } else {
        alert('Solicitacoes desarquivadas com sucesso.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao desarquivar solicitacoes em massa.');
    } finally {
      setProcessandoMassa(false);
    }
  }

  function formatarDataExportacao(valor) {
    if (!valor) return '';
    const data = parseDateSmart(valor);
    if (!data || Number.isNaN(data.getTime())) return String(valor);
    return data.toLocaleDateString('pt-BR');
  }

  function formatarValorExportacao(valor) {
    const n = Number(valor);
    if (Number.isNaN(n)) return '';
    return n.toFixed(2).replace('.', ',');
  }

  function exportarSelecionadasExcel() {
    if (selecionadasIds.length === 0) {
      alert('Selecione ao menos uma solicitação.');
      return;
    }

    const selecionadas = solicitacoes.filter(item => selecionadasIds.includes(Number(item.id)));
    if (selecionadas.length === 0) {
      alert('Nenhuma solicitação selecionada para exportar.');
      return;
    }

    const linhas = [
      [
        'Código',
        'Nº pedido',
        'Obra',
        ...(moduloContratosHabilitado ? ['Contrato', 'Ref. do Contrato'] : []),
        'Descrição',
        'Tipo de Solicitação',
        'Valor',
        'Setor',
        'Responsável',
        'Status',
        'Data Registro',
        'Data Vencimento'
      ],
      ...selecionadas.map(item => [
        item.codigo || '',
        item.numero_pedido || '',
        item.obra?.nome || '',
        ...(moduloContratosHabilitado
          ? [
              item.contrato?.codigo || item.codigo_contrato || '',
              item.contrato?.ref_contrato || item.ref_contrato || ''
            ]
          : []),
        item.descricao || '',
        item.tipo?.nome || '',
        formatarValorExportacao(item.valor),
        item.area_responsavel || '',
        item.responsavel || '',
        item.status_global || '',
        formatarDataExportacao(item.createdAt),
        formatarDataExportacao(item.data_vencimento)
      ])
    ];

    const csv = linhas
      .map(colunas => colunas
        .map(valor => `"${String(valor ?? '').replace(/"/g, '""')}"`)
        .join(';'))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dataRef = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `solicitacoes-selecionadas-${dataRef}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  function toggleColuna(id) {
    const obrigatorias = new Set(['codigo', 'status', 'acoes']);
    if (obrigatorias.has(id)) return;
    setColunasVisiveis(prev => (
      prev.includes(id)
        ? prev.filter(col => col !== id)
        : [...prev, id]
    ));
  }

  function posicionarSeletorColunas() {
    if (!botaoColunasRef.current || typeof window === 'undefined') return;

    const margem = 16;
    const btnRect = botaoColunasRef.current.getBoundingClientRect();
    const seletorRect = seletorColunasRef.current?.getBoundingClientRect();
    const larguraSeletor = Math.min(seletorRect?.width || 320, window.innerWidth - margem * 2);
    const alturaSeletor = Math.min(seletorRect?.height || 260, window.innerHeight - margem * 2);
    const maxLeft = Math.max(margem, window.innerWidth - larguraSeletor - margem);
    const espacoAbaixo = window.innerHeight - btnRect.bottom - margem;
    const espacoAcima = btnRect.top - margem;
    const abreAcima = alturaSeletor > espacoAbaixo && espacoAcima > espacoAbaixo;

    setSeletorColunasPosition({
      left: Math.round(Math.min(Math.max(margem, btnRect.left), maxLeft)),
      top: Math.round(abreAcima
        ? Math.max(margem, btnRect.top - alturaSeletor - 8)
        : Math.min(window.innerHeight - alturaSeletor - margem, btnRect.bottom + 8))
    });
  }

  function alternarSeletorColunas() {
    if (!mostrarSeletorColunas) posicionarSeletorColunas();
    setMostrarSeletorColunas(prev => !prev);
  }

  async function confirmarEnvioMassa() {
    if (isSetorObra) {
      alert('Setor OBRA não pode enviar solicitações para outro setor.');
      return;
    }
    if (selecionadasIds.length === 0) {
      alert('Selecione ao menos uma solicitação.');
      return;
    }
    if (!setorEnvioMassa) {
      alert('Selecione um setor de destino.');
      return;
    }

    try {
      setProcessandoMassa(true);
      const resultado = await enviarSolicitacoesParaSetorEmMassa({
        solicitacao_ids: selecionadasIds,
        setor_destino: setorEnvioMassa
      });
      setModalEnvioMassa(false);
      setSetorEnvioMassa('');
      setSelecionadasIds([]);
      await carregar({ silent: true });
      if (resultado?.erros?.length > 0) {
        const detalhes = resultado.erros
          .slice(0, 8)
          .map(item => `#${item.id}: ${item.error || 'Erro ao enviar'}`)
          .join('\n');
        const complemento = resultado.erros.length > 8
          ? `\n... e mais ${resultado.erros.length - 8} falha(s).`
          : '';
        alert(`Envio em massa concluído com pendências.\n\nEnviadas: ${resultado.sucesso}. Falhas: ${resultado.erros.length}.\n\n${detalhes}${complemento}`);
      } else {
        alert('Solicitações enviadas em massa com sucesso.');
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao enviar solicitações em massa.');
    } finally {
      setProcessandoMassa(false);
    }
  }

  async function solicitarPrioridadeFinanceiroSelecionadas() {
    if (!podeSolicitarPrioridadeFinanceiro) {
      alert('Apenas DIR_OBRAS_PUBLICAS ou DIR_OBRAS_PRIVADAS podem solicitar prioridade para o financeiro.');
      return;
    }

    if (selecionadasIds.length === 0) {
      alert('Selecione ao menos uma solicitacao.');
      return;
    }

    const selecionadas = solicitacoes.filter(item => selecionadasIds.includes(Number(item.id)));
    const foraFinanceiro = selecionadas.filter(item => normalizarTextoComparacao(item.area_responsavel) !== 'FINANCEIRO');
    if (foraFinanceiro.length > 0) {
      alert('Selecione apenas solicitacoes que estejam no setor FINANCEIRO para solicitar prioridade.');
      return;
    }

    try {
      setProcessandoMassa(true);
      const [resposta, lotesAbertosData] = await Promise.all([
        getTitulosPrioridadePorSolicitacoes({
          solicitacao_ids: selecionadasIds,
          classificacao_alvo: classificacaoPrioridadeDiretoria
        }),
        listarLotesPrioridadeDiretoria({ status: 'ABERTO' })
      ]);
      const titulos = Array.isArray(resposta?.items) ? resposta.items : [];
      const semTitulos = Array.isArray(resposta?.solicitacoes_sem_titulos) ? resposta.solicitacoes_sem_titulos : [];
      if (titulos.length === 0) {
        const lista = semTitulos.map(item => item.codigo || `#${item.id}`).join(', ');
        alert(`Nenhuma solicitacao selecionada possui titulo financeiro aberto elegivel.${lista ? `\n\nSolicitacoes sem titulo: ${lista}` : ''}\n\nCadastre os titulos financeiros e clique novamente em Prioridade financeiro para recarregar.`);
        return;
      }
      const lotesAbertos = (Array.isArray(lotesAbertosData?.items) ? lotesAbertosData.items : [])
        .filter(lote => (
          String(lote.status || '').toUpperCase() === 'ABERTO' &&
          String(lote.tipo_lote || '').toUpperCase() === 'SOLICITACAO_DIRETORIA' &&
          String(lote.classificacao_alvo || '').toUpperCase() === String(classificacaoPrioridadeDiretoria || '').toUpperCase()
        ));
      setTitulosPrioridade(titulos);
      setSolicitacoesPrioridadeSemTitulos(semTitulos);
      setLotesPrioridadeAbertos(lotesAbertos);
      setLotePrioridadeDestino('');
      setTitulosPrioridadeSelecionados(new Set(titulos.map(item => String(item.id))));
      setModalPrioridadeTitulos(true);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao buscar titulos para prioridade.');
    } finally {
      setProcessandoMassa(false);
    }
  }

  function alternarTituloPrioridade(id) {
    const key = String(id);
    setTitulosPrioridadeSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function confirmarPrioridadeFinanceiroTitulos() {
    const tituloIds = Array.from(titulosPrioridadeSelecionados).map(Number).filter(Boolean);
    if (tituloIds.length === 0) {
      alert('Selecione ao menos um titulo para enviar a prioridade.');
      return;
    }

    if (!window.confirm(`Enviar ${tituloIds.length} titulo(s) para aprovacao de prioridade pela Diretoria Administrativa?`)) {
      return;
    }

    try {
      setProcessandoMassa(true);
      await solicitarUrgenciaPrioridadeDiretoria({
        titulo_ids: tituloIds,
        solicitacao_ids: selecionadasIds,
        classificacao_alvo: classificacaoPrioridadeDiretoria,
        lote_id: lotePrioridadeDestino ? Number(lotePrioridadeDestino) : undefined
      });
      setSelecionadasIds([]);
      setTitulosPrioridade([]);
      setSolicitacoesPrioridadeSemTitulos([]);
      setLotesPrioridadeAbertos([]);
      setLotePrioridadeDestino('');
      setTitulosPrioridadeSelecionados(new Set());
      setModalPrioridadeTitulos(false);
      await carregar({ silent: true });
      alert('Lote de prioridade enviado para aprovacao da Diretoria Administrativa.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao solicitar prioridade para o financeiro.');
    } finally {
      setProcessandoMassa(false);
    }
  }

  const selecionadaUnica = useMemo(() => {
    if (selecionadasIds.length !== 1) return null;
    const idSelecionado = Number(selecionadasIds[0]);
    return solicitacoes.find(item => Number(item.id) === idSelecionado) || null;
  }, [selecionadasIds, solicitacoes]);

  const podeAssumirUnica = useMemo(() => {
    if (!selecionadaUnica) return false;
    if (isSetorObra) return false;
    if (!isSuperadmin && !solicitacaoEstaNoSetorDoUsuario(selecionadaUnica.area_responsavel, user)) return false;
    const modo = String(permissaoUsuario?.modo_recebimento || 'TODOS_VISIVEIS').toUpperCase();
    if (modo !== 'TODOS_VISIVEIS') return false;
    const isUsuario = user?.perfil === 'USUARIO';
    return isUsuario ? (!!permissaoUsuario?.usuario_pode_assumir || isSetorFinanceiro) : true;
  }, [selecionadaUnica, isSetorObra, isSuperadmin, permissaoUsuario, user, isSetorFinanceiro]);

  const podeAtribuirUnica = useMemo(() => {
    if (!selecionadaUnica) return false;
    if (isSetorObra) return false;
    const modo = String(permissaoUsuario?.modo_recebimento || 'TODOS_VISIVEIS').toUpperCase();
    if (modo !== 'TODOS_VISIVEIS') return false;
    const isUsuario = user?.perfil === 'USUARIO';
    return isUsuario ? (!!permissaoUsuario?.usuario_pode_atribuir || isSetorFinanceiro) : true;
  }, [selecionadaUnica, isSetorObra, permissaoUsuario, user?.perfil, isSetorFinanceiro]);
  const podeAtribuirMassa = useMemo(() => {
    if (selecionadasIds.length <= 1) return false;
    if (isSetorObra) return false;
    const modo = String(permissaoUsuario?.modo_recebimento || 'TODOS_VISIVEIS').toUpperCase();
    if (modo !== 'TODOS_VISIVEIS') return false;
    const isUsuario = user?.perfil === 'USUARIO';
    return isUsuario ? (!!permissaoUsuario?.usuario_pode_atribuir || isSetorFinanceiro) : true;
  }, [selecionadasIds.length, isSetorObra, permissaoUsuario, user?.perfil, isSetorFinanceiro]);

  const podeExcluirUnica = !!selecionadaUnica && (isSuperadmin || isAdminGEO);
  const podeEnviarUnica = useMemo(() => {
    if (!selecionadaUnica || isSetorObra) return false;
    return isSuperadmin || solicitacaoEstaNoSetorDoUsuario(selecionadaUnica.area_responsavel, user);
  }, [selecionadaUnica, isSetorObra, isSuperadmin, user]);
  const podeEnviarMassa = useMemo(() => {
    if (selecionadasIds.length <= 1 || isSetorObra) return false;
    if (isSuperadmin) return true;
    return selecionadasIds.every(idSelecionado => {
      const solicitacao = solicitacoes.find(item => Number(item.id) === Number(idSelecionado));
      return solicitacao && solicitacaoEstaNoSetorDoUsuario(solicitacao.area_responsavel, user);
    });
  }, [selecionadasIds, isSetorObra, isSuperadmin, solicitacoes, user]);

  const isSetorObraSolicitacaoUnica = useMemo(() => {
    if (!selecionadaUnica) return false;
    const setorSolicitacao =
      (setoresMap?.[selecionadaUnica.area_responsavel] || null);
    return Boolean(setorSolicitacao?.eh_setor_obra) ||
      String(setorSolicitacao?.nome || selecionadaUnica.area_responsavel || '').trim().toUpperCase() === 'OBRA';
  }, [selecionadaUnica, setoresMap]);

  const exigePrazoCompraDelegacaoUnica = useMemo(() => {
    if (!selecionadaUnica) return false;
    const texto = [
      selecionadaUnica?.tipo_solicitacao?.nome,
      selecionadaUnica?.tipo_solicitacao?.codigo,
      selecionadaUnica?.tipoSolicitacao?.nome,
      selecionadaUnica?.tipoSolicitacao?.codigo,
      selecionadaUnica?.tipo?.nome,
      selecionadaUnica?.tipo?.codigo,
      selecionadaUnica?.tipo_solicitacao_nome,
      selecionadaUnica?.tipo_solicitacao_codigo,
      selecionadaUnica?.titulo,
      selecionadaUnica?.descricao
    ].filter(Boolean).join(' ');
    const normalizado = normalizarTextoComparacao(texto);
    return normalizado.includes('SOLICITACAO DE COMPRA') || normalizado.includes('COMPRA DIRETA');
  }, [selecionadaUnica]);

  async function assumirSelecionada() {
    if (!selecionadaUnica) return;
    try {
      const res = await fetch(`${API_URL}/solicitacoes/${selecionadaUnica.id}/assumir`, {
        method: 'POST',
        headers: authHeaders()
      });

      if (!res.ok) {
        let mensagem = 'Erro ao assumir solicitação';
        try {
          const data = await res.json();
          mensagem = data?.error || mensagem;
        } catch (_) {}
        alert(mensagem);
        return;
      }

      alert('Solicitação assumida com sucesso.');
      await handleAtualizarLista({ type: 'refresh_item', id: selecionadaUnica.id });
    } catch (error) {
      console.error(error);
      alert('Erro ao assumir solicitação');
    }
  }

  async function excluirSelecionada() {
    if (!selecionadaUnica) return;
    if (!confirm('Excluir esta solicitação? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteSolicitacao(selecionadaUnica.id);
      await handleAtualizarLista({ type: 'remove_item', id: selecionadaUnica.id });
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir solicitação');
    }
  }

  useLiveUpdateSubscription({
    enabled: true,
    filter: (payload) => String(payload?.entity || '').toUpperCase() === 'SOLICITACAO',
    onEvent: async (payload) => {
      if (eventoFoiTratadoLocalmente(payload)) {
        return;
      }

      const recordId = Number(payload?.record_id || 0);
      if (!Number.isInteger(recordId) || recordId <= 0) {
        return;
      }

      const action = String(payload?.action || '').trim().toUpperCase();
      if (action === 'DELETED') {
        removerSolicitacaoDaLista(recordId, { decrementarTotal: true });
        return;
      }

      await atualizarSolicitacaoDaLista(recordId, {
        permitirInsercao: ['CREATED', 'SENT_TO_SECTOR', 'APPROVED_DIRETORIA'].includes(action)
      });
    },
    fallbackRefresh: carregarEmSegundoPlano,
    fallbackMs: 45 * 1000
  });

  async function carregarUsuariosAtribuicao() {
    try {
      const res = await fetch(`${API_URL}/usuarios/opcoes-atribuicao`, {
        headers: authHeaders()
      });
      if (!res.ok) {
        setUsuariosAtribuicao([]);
        return;
      }

      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      const setorUsuario = user?.setor_id ? String(user.setor_id) : '';
      const filtrados = setorUsuario
        ? lista.filter(u => String(u.setor_id) === setorUsuario)
        : lista;
      setUsuariosAtribuicao(filtrados);
    } catch (error) {
      console.error(error);
      setUsuariosAtribuicao([]);
    }
  }

  async function abrirModalAtribuirMassa() {
    setUsuarioAtribuicaoMassa('');
    await carregarUsuariosAtribuicao();
    setModalAtribuirMassa(true);
  }

  async function confirmarAtribuirMassa() {
    if (!usuarioAtribuicaoMassa) {
      alert('Selecione um usuário.');
      return;
    }
    if (selecionadasIds.length <= 1) {
      alert('Selecione mais de uma solicitação.');
      return;
    }

    try {
      setProcessandoMassa(true);
      let sucesso = 0;
      const erros = [];

      for (const solicitacaoId of selecionadasIds) {
        try {
          const res = await fetch(`${API_URL}/solicitacoes/${solicitacaoId}/atribuir`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              usuario_responsavel_id: usuarioAtribuicaoMassa
            })
          });

          if (!res.ok) {
            let mensagem = 'Erro ao atribuir';
            try {
              const data = await res.json();
              mensagem = data?.error || mensagem;
            } catch (_) {}
            erros.push(`SOL-${solicitacaoId}: ${mensagem}`);
            continue;
          }

          sucesso += 1;
        } catch (error) {
          erros.push(`SOL-${solicitacaoId}: falha de conexão`);
        }
      }

      setModalAtribuirMassa(false);
      await carregar();

      if (erros.length > 0) {
        alert(`Atribuição em massa concluída. Sucesso: ${sucesso}. Falhas: ${erros.length}.`);
      } else {
        alert('Atribuição em massa realizada com sucesso.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao atribuir em massa.');
    } finally {
      setProcessandoMassa(false);
    }
  }

  return (
    <div className="solicitacoes-page px-0 py-1 md:py-2">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold">
          {arquivadas ? 'Solicitações Arquivadas' : 'Solicitações'}
        </h1>
      </div>

      {modalPrioridadeTitulos && typeof document !== 'undefined' && createPortal((
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Selecionar titulos para prioridade</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Confirme quais titulos abertos das solicitacoes selecionadas devem seguir para a Diretoria Administrativa.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setModalPrioridadeTitulos(false)}
                aria-label="Fechar"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {solicitacoesPrioridadeSemTitulos.length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  <p className="font-semibold">Algumas solicitacoes ainda nao possuem titulo financeiro aberto.</p>
                  <p className="mt-1">
                    Elas nao serao enviadas agora. Clique em OK/Cancelar para voltar, desmarque se desejar, ou cadastre o titulo e clique novamente em Prioridade financeiro para recarregar.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {solicitacoesPrioridadeSemTitulos.map((item) => (
                      <span key={item.id} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950 dark:bg-amber-900/70 dark:text-amber-50">
                        {item.codigo || `#${item.id}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <label className="mb-4 block text-sm">
                <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Destino dos titulos</span>
                <select
                  className="input"
                  value={lotePrioridadeDestino}
                  onChange={event => setLotePrioridadeDestino(event.target.value)}
                >
                  <option value="">Criar novo lote de prioridade</option>
                  {lotesPrioridadeAbertos.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      Incluir no lote aberto #{lote.id} - {dataCurta(lote.createdAt)} - {moeda(lote.valor_utilizado)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span>
                  Selecionados: <strong>{titulosPrioridadeSelecionados.size}</strong> de <strong>{titulosPrioridade.length}</strong>
                </span>
                <span>
                  Total selecionado: <strong>{moeda(titulosPrioridade
                    .filter(item => titulosPrioridadeSelecionados.has(String(item.id)))
                    .reduce((total, item) => total + Number(item.valor_prioridade || item.valor_saldo || 0), 0))}</strong>
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="w-10 px-3 py-3"></th>
                      <th className="px-3 py-3">Titulo</th>
                      <th className="px-3 py-3">Solicitacao</th>
                      <th className="px-3 py-3">Obra</th>
                      <th className="px-3 py-3">Vencimento</th>
                      <th className="px-3 py-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {titulosPrioridade.map((titulo) => (
                      <tr key={titulo.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={titulosPrioridadeSelecionados.has(String(titulo.id))}
                            onChange={() => alternarTituloPrioridade(titulo.id)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900 dark:text-slate-50">{titulo.codigo || `#${titulo.id}`}</p>
                          <p className="text-xs text-slate-500">{titulo.parceiro?.nome || titulo.descricao || '-'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{titulo.solicitacao?.codigo || '-'}</p>
                          <p className="text-xs text-slate-500">{titulo.solicitacao?.descricao || ''}</p>
                        </td>
                        <td className="px-3 py-3">{titulo.obra?.nome || '-'}</td>
                        <td className="px-3 py-3">{dataCurta(titulo.data_vencimento)}</td>
                        <td className="px-3 py-3 text-right font-semibold">{moeda(titulo.valor_prioridade || titulo.valor_saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-outline" onClick={() => setModalPrioridadeTitulos(false)} disabled={processandoMassa}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmarPrioridadeFinanceiroTitulos} disabled={processandoMassa || titulosPrioridadeSelecionados.size === 0}>
                Enviar titulos selecionados
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      <Filtros
        filtros={filtros}
        setFiltros={setFiltros}
        obrasOptions={obrasOptions}
        responsaveisOptions={responsaveisOptions}
        setores={setoresLista}
        tiposSolicitacao={tiposSolicitacao}
        statusOptions={statusOptions}
        mostrarFiltroResponsavel={isSetorFinanceiro}
        mostrarSomaValor={mostrarSomaValor}
        somaValorFiltrado={somaValorFiltrado}
      />

      {!arquivadas && (
        <div className="acoes-massa-solicitacoes solicitacoes-toolbar sol-surface-card relative p-3 md:p-4 rounded-xl mb-4 flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-slate-300">
            Selecionadas: <strong>{selecionadasIds.length}</strong>
          </div>
          <div className="flex flex-wrap gap-2 xl:ml-auto">
            <button
              type="button"
              className="btn btn-outline inline-flex items-center gap-2"
              onClick={exportarSelecionadasExcel}
              disabled={processandoMassa || selecionadasIds.length === 0}
              title="Exportar selecionadas para Excel (.csv)"
              aria-label="Exportar selecionadas para Excel"
            >
              <HiDocumentArrowDown className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              ref={botaoColunasRef}
              type="button"
              className="btn btn-outline inline-flex items-center gap-2"
              onClick={alternarSeletorColunas}
              title="Selecionar colunas"
              aria-label="Selecionar colunas"
            >
              <HiViewColumns className="w-4 h-4" />
              <span className="hidden sm:inline">Colunas</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={arquivarEmMassa}
              disabled={processandoMassa || selecionadasIds.length === 0}
            >
              Arquivar em massa
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setModalEnvioMassa(true)}
              disabled={processandoMassa || selecionadasIds.length === 0 || !podeEnviarMassa}
            >
              Enviar em massa
            </button>
            {podeSolicitarPrioridadeFinanceiro && (
              <button
                type="button"
                className="btn btn-outline inline-flex items-center gap-2"
                onClick={solicitarPrioridadeFinanceiroSelecionadas}
                disabled={processandoMassa || selecionadasIds.length === 0}
                title="Enviar lote de prioridade para aprovacao da Diretoria Administrativa"
              >
                <HiOutlineBanknotes className="w-4 h-4" />
                <span className="hidden sm:inline">Prioridade financeiro</span>
              </button>
            )}
          </div>

          {mostrarSeletorColunas && typeof document !== 'undefined' && createPortal((
            <div
              ref={seletorColunasRef}
              className="sol-floating-panel fixed z-[1000] w-[320px] max-w-[calc(100vw-2rem)] max-h-[min(70vh,420px)] overflow-hidden p-3"
              style={{
                left: `${seletorColunasPosition.left}px`,
                top: `${seletorColunasPosition.top}px`
              }}
            >
              <div className="sol-floating-panel-header mb-2">
                <p className="text-sm font-medium">Colunas visíveis</p>
                <button
                  type="button"
                  className="sol-floating-panel-link"
                  onClick={() => setColunasVisiveis(opcoesColunas.map(c => c.id))}
                >
                  Mostrar todas
                </button>
              </div>
              <div className="sol-floating-panel-grid sol-floating-panel-scroll">
                {opcoesColunas.map(col => {
                  const obrigatoria = ['codigo', 'status', 'acoes'].includes(col.id);
                  const marcada = colunasVisiveis.includes(col.id);
                  return (
                    <label key={col.id} className={`sol-floating-panel-option ${obrigatoria ? 'is-disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={marcada}
                        disabled={obrigatoria}
                        onChange={() => toggleColuna(col.id)}
                      />
                      <span className={obrigatoria ? 'sol-floating-panel-option-subtle' : ''}>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ), document.body)}
        </div>
      )}

      {loading && <p className="mt-6 text-sm md:text-base text-[var(--c-muted)]">Carregando...</p>}

      {!loading && solicitacoes.length === 0 && (
        <p className="mt-6">
          {arquivadas ? 'Nenhuma solicitação arquivada.' : 'Nenhuma solicitação encontrada.'}
        </p>
      )}

      {!loading && solicitacoes.length > 0 && (
        <>
          <TabelaSolicitacoes
            solicitacoes={solicitacoes}
            onAtualizar={handleAtualizarLista}
            setoresMap={setoresMap}
            permissaoUsuario={permissaoUsuario}
            mostrarArquivadas={arquivadas}
            visibleColumns={colunasVisiveis}
            selecionadasIds={selecionadasIds}
            onToggleSelecionada={toggleSelecionada}
            onToggleSelecionarTodas={toggleSelecionarTodas}
          />

          <div className="sol-surface-card mt-4 p-3 md:p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-gray-600 dark:text-slate-300">
              {totalSolicitacoes > 0
                ? `Exibindo ${paginaInicial}-${paginaFinal} de ${totalSolicitacoes} solicitações`
                : 'Nenhuma solicitação encontrada'}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                <span>Por página</span>
                <select
                  className="input !w-auto min-w-[88px]"
                  value={limitePorPagina}
                  onChange={(event) => {
                    const valor = event.target.value;
                    setLimitePorPagina(valor === PAGE_SIZE_ALL ? PAGE_SIZE_ALL : Number(valor) || 25);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((opcao) => (
                    <option key={opcao} value={opcao}>{opcao}</option>
                  ))}
                  <option value={PAGE_SIZE_ALL}>Todas</option>
                </select>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
                  disabled={exibindoTodas || paginaAtual <= 1}
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-700 dark:text-slate-200 min-w-[96px] text-center">
                  {exibindoTodas ? 'Todas' : `Página ${paginaAtual} de ${Math.max(totalPaginas, 1)}`}
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setPaginaAtual((prev) => Math.min(Math.max(totalPaginas, 1), prev + 1))}
                  disabled={exibindoTodas || totalPaginas === 0 || paginaAtual >= totalPaginas}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selecionadasIds.length > 0 && (
        <div className="solicitacoes-massa-modal fixed left-1/2 -translate-x-1/2 bottom-4 z-40 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl rounded-2xl px-3 py-2 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200 px-2">
            {selecionadasIds.length} selecionada(s)
          </span>

          {selecionadaUnica && (
            <button
              type="button"
              className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
              onClick={() => window.location.assign(`/solicitacoes/${selecionadaUnica.id}`)}
              title="Ver solicitação"
            >
              <HiOutlineEye className="w-4 h-4" />
              <span className="hidden sm:inline">Ver</span>
            </button>
          )}

          {!arquivadas && selecionadaUnica && podeAssumirUnica && (
            <button
              type="button"
              className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
              onClick={assumirSelecionada}
              disabled={processandoMassa}
              title="Assumir solicitação"
            >
              <HiOutlineUserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Assumir</span>
            </button>
          )}

          {!arquivadas && selecionadaUnica && podeAtribuirUnica && (
            <button
              type="button"
              className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
              onClick={() => setModalAtribuir(true)}
              disabled={processandoMassa}
              title="Atribuir responsável"
            >
              <HiOutlineUserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Atribuir</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
            onClick={exportarSelecionadasExcel}
            disabled={processandoMassa}
            title="Exportar selecionadas"
          >
            <HiDocumentArrowDown className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {!arquivadas && podeSolicitarPrioridadeFinanceiro && (
            <button
              type="button"
              className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
              onClick={solicitarPrioridadeFinanceiroSelecionadas}
              disabled={processandoMassa}
              title="Solicitar prioridade financeira"
            >
              <HiOutlineBanknotes className="w-4 h-4" />
              <span className="hidden sm:inline">Prioridade financeiro</span>
            </button>
          )}

          {arquivadas ? (
            <button
              type="button"
              className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
              onClick={desarquivarEmMassa}
              disabled={processandoMassa}
              title="Desarquivar selecionadas"
            >
              <HiOutlineFolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Desarquivar</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
              onClick={arquivarEmMassa}
              disabled={processandoMassa}
              title="Arquivar selecionadas"
            >
              <HiOutlineFolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Arquivar</span>
            </button>
          )}

          {!arquivadas && selecionadaUnica && podeEnviarUnica && (
            <button
              type="button"
              className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
              onClick={() => setModalEnviarUnitario(true)}
              disabled={processandoMassa}
              title="Enviar para outro setor"
            >
              <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          )}

          {!arquivadas && selecionadasIds.length > 1 && podeEnviarMassa && (
            <button
              type="button"
              className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
              onClick={() => setModalEnvioMassa(true)}
              disabled={processandoMassa}
              title="Enviar selecionadas para outro setor"
            >
              <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar em massa</span>
            </button>
          )}

          {!arquivadas && podeAtribuirMassa && (
            <button
              type="button"
              className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
              onClick={abrirModalAtribuirMassa}
              disabled={processandoMassa}
              title="Atribuir responsável em massa"
            >
              <HiOutlineUserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Atribuir em massa</span>
            </button>
          )}

          {!arquivadas && selecionadaUnica && podeExcluirUnica && (
            <button
              type="button"
              className="btn btn-outline !min-h-0 h-9 px-3 inline-flex items-center gap-2"
              onClick={excluirSelecionada}
              disabled={processandoMassa}
              title="Excluir solicitação"
            >
              <HiOutlineTrash className="w-4 h-4" />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline !min-h-0 h-9 px-2.5 inline-flex items-center gap-1"
            onClick={() => setSelecionadasIds([])}
            disabled={processandoMassa}
            title="Limpar seleção"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {!arquivadas && modalAtribuir && selecionadaUnica && (
        <ModalAtribuirResponsavel
          solicitacaoId={selecionadaUnica.id}
          obraId={selecionadaUnica.obra_id}
          isSetorObraSolicitacao={isSetorObraSolicitacaoUnica}
          isUsuarioSetorObra={isSetorObra}
          exigirPrazoCompra={exigePrazoCompraDelegacaoUnica}
          onClose={() => setModalAtribuir(false)}
          onSucesso={() => {
            void handleAtualizarLista({ type: 'refresh_item', id: selecionadaUnica.id });
          }}
        />
      )}

      {!arquivadas && modalEnviarUnitario && selecionadaUnica && (
        <ModalEnviarSetor
          solicitacaoId={selecionadaUnica.id}
          onClose={() => setModalEnviarUnitario(false)}
          onSucesso={() => {
            void handleAtualizarLista({ type: 'refresh_item', id: selecionadaUnica.id });
          }}
        />
      )}

      {modalAtribuirMassa && !arquivadas && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-3">
          <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl w-full max-w-md ring-1 ring-gray-200 dark:ring-slate-700">
            <h2 className="text-lg font-semibold mb-3">Atribuir em massa</h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
              Selecionadas: {selecionadasIds.length}
            </p>
            <select
              className="input mb-4"
              value={usuarioAtribuicaoMassa}
              onChange={e => setUsuarioAtribuicaoMassa(e.target.value)}
            >
              <option value="">Selecione um usuário</option>
              {usuariosAtribuicao.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setModalAtribuirMassa(false)}
                disabled={processandoMassa}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn bg-blue-700 text-white disabled:opacity-60"
                onClick={confirmarAtribuirMassa}
                disabled={processandoMassa}
              >
                {processandoMassa ? 'Atribuindo...' : 'Atribuir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEnvioMassa && !arquivadas && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-3">
          <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl w-full max-w-md ring-1 ring-gray-200 dark:ring-slate-700" role="dialog" aria-modal="true" aria-label="Enviar solicita??es em massa">
            <h2 className="text-lg font-semibold mb-4">Enviar solicitações em massa</h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
              Selecionadas: {selecionadasIds.length}
            </p>
            <select
              className="input mb-4"
              value={setorEnvioMassa}
              onChange={e => setSetorEnvioMassa(e.target.value)}
            >
              <option value="">Selecione um setor</option>
              {setoresLista.map(s => (
                <option key={s.id} value={s.nome}>
                  {s.nome}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setModalEnvioMassa(false);
                  setSetorEnvioMassa('');
                }}
                disabled={processandoMassa}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn bg-blue-600 text-white disabled:opacity-60"
                onClick={confirmarEnvioMassa}
                disabled={processandoMassa}
              >
                {processandoMassa ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
