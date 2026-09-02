import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HiDocumentArrowDown,
  HiViewColumns,
  HiOutlineEye,
  HiOutlineHandRaised,
  HiOutlineUserPlus,
  HiOutlineUserGroup,
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
import ListaAvancada from '../../components/lista-avancada/ListaAvancada';
import StatusBadge from '../../components/StatusBadge';
import {
  formatarMaiusculas,
  formatarDescricao,
  vencimentoHumano,
  urgenciaVencimento
} from '../../utils/formatarTexto';
import {
  arquivarSolicitacoesEmMassa,
  deleteSolicitacao,
  desarquivarSolicitacao,
  enviarSolicitacoesParaSetorEmMassa,
  getSolicitacaoResumoLista,
  getContadoresSolicitacoes,
  getObrasVisiveisSolicitacoes,
  getStatusVisiveisSolicitacoes
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

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const FILTER_DEBOUNCE_MS = 450;
const EXPORT_PAGE_SIZE = 200;
const STATUS_AUTOMATICOS_SOLICITACAO = [
  'TITULO_CADASTRADO',
  'PARCIALMENTE PAGO',
  'PAGA'
];

function validarDataIso(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return true;
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (ano < 1900 || ano > 2200) return false;

  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano
    && data.getUTCMonth() === mes - 1
    && data.getUTCDate() === dia;
}

function obterErrosFiltrosData(filtros) {
  const erros = {};
  const campos = [
    ['data_registro', 'Informe uma data de registro valida.'],
    ['data_vencimento_inicio', 'Informe uma data inicial valida.'],
    ['data_vencimento_fim', 'Informe uma data final valida.']
  ];
  campos.forEach(([campo, mensagem]) => {
    if (!validarDataIso(filtros?.[campo])) erros[campo] = mensagem;
  });

  const inicio = String(filtros?.data_vencimento_inicio || '').trim();
  const fim = String(filtros?.data_vencimento_fim || '').trim();
  if (!erros.data_vencimento_inicio && !erros.data_vencimento_fim && inicio && fim && inicio > fim) {
    erros.data_vencimento_fim = 'A data final deve ser igual ou posterior a data inicial.';
  }
  return erros;
}

const ROTULOS_VISAO_PENDENCIA = {
  'paradas-no-setor': 'solicitações paradas no seu setor',
  'aprovacoes-diretoria': 'aprovações aguardando você',
  'devolucoes-recebidas': 'devoluções recebidas no seu setor',
  'contratos-aguardando-aprovacao': 'contratos aguardando aprovação no seu setor'
};

// ----- Agrupamentos derivados (rótulo por item + ordem dos grupos) ----
function mesDeVencimento(dataVencimento) {
  const texto = String(dataVencimento || '').slice(0, 7); // yyyy-mm
  if (!/^\d{4}-\d{2}$/.test(texto)) return '(sem vencimento)';
  return `${texto.slice(5, 7)}/${texto.slice(0, 4)}`;
}

function compararMesVencimento(a, b) {
  const chave = (rotulo) => (/^\d{2}\/\d{4}$/.test(rotulo) ? `${rotulo.slice(3)}${rotulo.slice(0, 2)}` : '999999');
  return chave(a).localeCompare(chave(b));
}

const FAIXAS_VALOR = [
  { ate: 1000, rotulo: 'até R$ 1 mil' },
  { ate: 10000, rotulo: 'R$ 1 a 10 mil' },
  { ate: 50000, rotulo: 'R$ 10 a 50 mil' },
  { ate: 200000, rotulo: 'R$ 50 a 200 mil' },
  { ate: Infinity, rotulo: 'acima de R$ 200 mil' }
];

function faixaDeValor(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return '(sem valor)';
  return FAIXAS_VALOR.find((faixa) => numero <= faixa.ate).rotulo;
}

function compararFaixaValor(a, b) {
  const ordem = FAIXAS_VALOR.map((faixa) => faixa.rotulo);
  const indice = (rotulo) => {
    const i = ordem.indexOf(rotulo);
    return i < 0 ? ordem.length : i;
  };
  return indice(a) - indice(b);
}

export default function Solicitacoes({ arquivadas = false }) {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [exportando, setExportando] = useState(false);
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

  // Filtro por ids vindo da faixa de pendências do Hub (?ids=1,2,3):
  // leva o usuário direto às solicitações citadas no contador.
  const [filtroIdsUrl, setFiltroIdsUrl] = useState([]);
  // Visão nomeada vinda dos cartões de pendência do Hub (?visao=...):
  // o backend aplica o MESMO recorte SQL do contador — o número do
  // cartão e esta lista sempre batem.
  const [filtroVisaoUrl, setFiltroVisaoUrl] = useState('');

  // Estado de consulta vindo da ListaAvancada (visão, filtros rápidos,
  // busca única, ordenação). A página continua dona dos DADOS.
  const listaRef = useRef(null);
  // DEGRADAÇÃO (onda 3 do porte): o rework do SolicitacaoController
  // (pacote B3 da proposta — busca única `q`, ordenação server-side,
  // visões nomeadas e /solicitacoes/contadores) ainda não existe neste
  // backend. Enquanto isso: busca e ordenação rodam no cliente sobre a
  // janela carregada, e só as visões cujos parâmetros o controller atual
  // entende ficam visíveis. Religar trocando a constante.
  const B3_DISPONIVEL = true;
  const consultaListaRef = useRef({ visao: null, filtros: {}, busca: '', ordenacao: { campo: 'createdAt', direcao: 'desc' } });
  const [versaoConsulta, setVersaoConsulta] = useState(0);
  const acumularProximaRef = useRef(false);
  // ?q= e ?obra_ids= chegam da busca universal (Ctrl+K) e das ações
  // rápidas de obra: a lista abre já filtrada. Lidos uma vez, no mount.
  const [buscaUrlInicial] = useState(() => (
    new URLSearchParams(window.location.search).get('q') || ''
  ));
  const [filtrosUrlIniciais] = useState(() => {
    const csv = String(new URLSearchParams(window.location.search).get('obra_ids') || '').trim();
    if (!csv) return null;
    return { obra: csv.split(',').map((v) => v.trim()).filter(Boolean) };
  });
  const pularDebounceRef = useRef(false);

  const [filtros, setFiltros] = useState({
    codigo: '',
    descricao: '',
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
  const errosFiltrosData = useMemo(() => obterErrosFiltrosData(filtros), [filtros]);
  const filtrosDataValidos = Object.keys(errosFiltrosData).length === 0;

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtros, arquivadas, limitePorPagina]);

  useEffect(() => {
    solicitacoesRef.current = solicitacoes;
  }, [solicitacoes]);

  useEffect(() => {
    if (!filtrosDataValidos) {
      setLoading(false);
      return undefined;
    }
    // O debounce protege a digitação nos filtros; troca de página (rolagem
    // infinita/paginação) busca na hora — senão o cleanup cancela a busca
    // da página anterior quando a seguinte é pedida.
    const atraso = pularDebounceRef.current ? 0 : FILTER_DEBOUNCE_MS;
    pularDebounceRef.current = false;
    const timeout = setTimeout(() => {
      carregar();
    }, atraso);

    return () => clearTimeout(timeout);
  }, [filtros, arquivadas, paginaAtual, limitePorPagina, filtrosDataValidos, filtroIdsUrl, filtroVisaoUrl, versaoConsulta]);

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

  // Parâmetros de URL (links das pendências do Hub e busca global)
  // sobrepõem os filtros salvos: ?area=, ?status=, ?codigo=,
  // ?data_vencimento_inicio=, ?data_vencimento_fim= e ?ids=1,2,3.
  useEffect(() => {
    if (!filtrosStoragePronto) return;
    const params = new URLSearchParams(location.search);
    if ([...params.keys()].length === 0) return;

    const visaoParam = String(params.get('visao') || '').trim().toLowerCase();
    if (visaoParam) {
      // O recorte do cartão substitui qualquer filtro salvo: a lista
      // abre mostrando EXATAMENTE o conjunto contado.
      setFiltroVisaoUrl(visaoParam);
      setFiltros({
        codigo: '',
        descricao: '',
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
    } else {
      setFiltroVisaoUrl('');
    }

    const chavesSuportadas = ['area', 'status', 'codigo', 'data_vencimento_inicio', 'data_vencimento_fim'];
    const sobrescritas = {};
    for (const chave of chavesSuportadas) {
      const valor = params.get(chave);
      if (valor !== null) sobrescritas[chave] = valor;
    }
    if (!visaoParam && Object.keys(sobrescritas).length > 0) {
      setFiltros((prev) => ({ ...prev, ...sobrescritas }));
    }

    const idsParam = params.get('ids');
    if (idsParam !== null) {
      const ids = idsParam
        .split(',')
        .map((valor) => Number(valor))
        .filter((valor) => Number.isInteger(valor) && valor > 0);
      setFiltroIdsUrl(ids);
    } else {
      setFiltroIdsUrl([]);
    }
  }, [filtrosStoragePronto, location.search]);

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
    carregarPermissoes();
  }, []);

  useEffect(() => {
    carregarStatusOptions();
  }, [arquivadas, user?.id]);

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

  function montarStatusOptions(...listas) {
    const map = new Map();

    listas.flat().forEach(item => {
      const label = typeof item === 'string' ? item : item?.label || item?.nome || item?.status_global || item?.value;
      const nome = String(label || '').trim();
      if (!nome) return;
      const key = normalizarStatus(nome);
      if (!map.has(key)) {
        map.set(key, nome);
      }
    });

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  async function carregarStatusOptions() {
    let statusVisiveis = null;
    let statusCadastrados = [];

    try {
      const data = await getStatusVisiveisSolicitacoes(
        arquivadas ? { arquivadas: '1' } : {}
      );
      statusVisiveis = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(error);
    }

    try {
      const data = await getStatusSetor();
      statusCadastrados = (Array.isArray(data) ? data : [])
        .filter(item => item?.ativo)
        .map(item => item?.nome);
    } catch (error) {
      console.error(error);
    }

    const catalogo = montarStatusOptions(
      statusCadastrados,
      STATUS_AUTOMATICOS_SOLICITACAO,
      statusVisiveis || []
    );

    if (statusVisiveis === null) {
      setStatusOptions(catalogo);
      return;
    }

    const statusVisiveisSet = new Set(statusVisiveis.map(normalizarStatus));
    setStatusOptions(catalogo.filter(item => statusVisiveisSet.has(item.value)));
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

    if (filtroIdsUrl.length > 0 && !filtroIdsUrl.includes(Number(item.id))) {
      return false;
    }

    const codigo = String(item?.codigo || '');
    const descricao = String(item?.descricao || '');
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

    if (
      filtros.descricao &&
      !normalizarTextoComparacao(descricao).includes(normalizarTextoComparacao(filtros.descricao))
    ) {
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
      const nextLimit = Math.max(1, Number(prev?.limit || limitePorPagina || 25));
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

      const listaLimitada = proximaLista.slice(0, Number(limitePorPagina || 25));

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

  // Mapeia o estado de consulta da ListaAvancada (visão, filtros rápidos,
  // busca única e ordenação) para os parâmetros da API — SOMANDO aos
  // filtros avançados existentes, sem substituir nenhum deles.
  function aplicarConsultaListaNosParams(paramsObj) {
    const consulta = consultaListaRef.current || {};

    Object.entries(consulta.visao?.params || {}).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
        paramsObj[chave] = String(valor);
      }
    });

    const rapidos = consulta.filtros || {};
    const somarCsv = (chave, valores) => {
      const lista = [paramsObj[chave], ...(valores || [])]
        .map((v) => String(v || '').trim())
        .filter(Boolean);
      if (lista.length > 0) paramsObj[chave] = Array.from(new Set(lista)).join(',');
    };
    somarCsv('status', rapidos.status);
    somarCsv('tipo_solicitacao_id', rapidos.tipo);
    somarCsv('obra_ids', rapidos.obra);

    // Sem o B3, `q`/`ordenar`/`direcao` seriam ignorados em silêncio pelo
    // backend — pior que não enviar: a tela fingiria filtrar. A busca e a
    // ordenação acontecem no cliente (ver itensExibidos).
    if (B3_DISPONIVEL && consulta.busca) paramsObj.q = consulta.busca;

    const MAPA_ORDENACAO = {
      data: 'createdAt',
      codigo: 'codigo',
      descricao: 'descricao',
      valor: 'valor',
      status: 'status_global',
      vencimento: 'data_vencimento',
      setor: 'area_responsavel',
      numero_sienge: 'numero_sienge'
    };
    const ordenacao = consulta.ordenacao || {};
    if (B3_DISPONIVEL && ordenacao.campo && MAPA_ORDENACAO[ordenacao.campo]) {
      paramsObj.ordenar = MAPA_ORDENACAO[ordenacao.campo];
      paramsObj.direcao = ordenacao.direcao === 'asc' ? 'asc' : 'desc';
    }
  }

  async function carregar({ silent = false } = {}) {
    if (!filtrosDataValidos) {
      if (!silent) setLoading(false);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }

      const acumular = acumularProximaRef.current;
      acumularProximaRef.current = false;

      const paramsObj = {};
      Object.entries(filtros).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
          paramsObj[chave] = String(valor).trim();
        }
      });
      if (arquivadas) {
        paramsObj.arquivadas = '1';
      }
      if (filtroIdsUrl.length > 0) {
        paramsObj.ids = filtroIdsUrl.join(',');
      }
      if (filtroVisaoUrl) {
        paramsObj.visao = filtroVisaoUrl;
      }
      aplicarConsultaListaNosParams(paramsObj);

      // Recarga silenciosa com rolagem infinita em andamento: rebusca a
      // janela inteira já carregada (páginas 1..atual) numa consulta só,
      // para não truncar a lista acumulada.
      const janelaCompleta = silent && !acumular && paginaAtual > 1;
      paramsObj.page = janelaCompleta ? '1' : String(paginaAtual);
      paramsObj.limit = janelaCompleta
        ? String(paginaAtual * Number(limitePorPagina || 25))
        : String(limitePorPagina);

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
      if (acumular) {
        setSolicitacoes((prev) => {
          const vistos = new Set(prev.map((item) => Number(item.id)));
          return [...prev, ...lista.filter((item) => !vistos.has(Number(item.id)))];
        });
      } else {
        setSolicitacoes(lista);
      }
      setObrasOptions(prev => {
        if (prev.length > 0) return prev;
        return extrairOpcoesObras(lista);
      });
      const totalRegistros = Number(data?.meta?.total || lista.length);
      const limiteBase = Number(limitePorPagina || 25);
      setMetaPaginacao({
        page: paginaAtual,
        limit: limiteBase,
        total: totalRegistros,
        total_pages: Math.max(Math.ceil(totalRegistros / limiteBase), lista.length > 0 ? 1 : 0)
      });
      if (silent) {
        listaRef.current?.refreshContadores?.();
      }
    } catch (error) {
      console.error(error);
      if (!silent) alert('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  }

  async function carregarEmSegundoPlano() {
    if (!filtrosDataValidos) return;

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
      if (filtroIdsUrl.length > 0) {
        paramsObj.ids = filtroIdsUrl.join(',');
      }
      if (filtroVisaoUrl) {
        paramsObj.visao = filtroVisaoUrl;
      }
      aplicarConsultaListaNosParams(paramsObj);

      // Janela completa: com rolagem infinita, o refresh de fundo rebusca
      // tudo que está carregado (páginas 1..atual) para não truncar.
      const janelaCompleta = paginaAtual > 1;
      paramsObj.page = janelaCompleta ? '1' : String(paginaAtual);
      paramsObj.limit = janelaCompleta
        ? String(paginaAtual * Number(limitePorPagina || 25))
        : String(limitePorPagina);

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
      const totalRegistros = Number(data?.meta?.total || lista.length);
      const limiteBase = Number(limitePorPagina || 25);
      setMetaPaginacao({
        page: paginaAtual,
        limit: limiteBase,
        total: totalRegistros,
        total_pages: Math.max(Math.ceil(totalRegistros / limiteBase), lista.length > 0 ? 1 : 0)
      });
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
  const limiteNumericoAtual = Number(limitePorPagina || 25);
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
  const podeEnviarQualquerSetor = Boolean(user?.pode_enviar_qualquer_setor);
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
    { id: 'vencimento', label: 'Data Resposta/Pagamento' }
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

  function baixarSolicitacoesCsv(lista, escopo) {
    if (!Array.isArray(lista) || lista.length === 0) {
      alert('Nenhuma solicitação encontrada para exportar.');
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
        'Data Resposta/Pagamento'
      ],
      ...lista.map(item => [
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
    a.download = `solicitacoes-${escopo}-${dataRef}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async function buscarTodasSolicitacoesFiltradas() {
    const filtrosSnapshot = { ...filtros };
    const registrosPorId = new Map();
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const paramsObj = {};
      Object.entries(filtrosSnapshot).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
          paramsObj[chave] = String(valor).trim();
        }
      });
      if (arquivadas) paramsObj.arquivadas = '1';
      if (filtroVisaoUrl) paramsObj.visao = filtroVisaoUrl;
      paramsObj.page = String(pagina);
      paramsObj.limit = String(EXPORT_PAGE_SIZE);

      const params = new URLSearchParams(paramsObj).toString();
      const res = await fetch(`${API_URL}/solicitacoes?${params}`, {
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Erro ao buscar solicitações para exportação');

      const data = await res.json();
      const itens = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      itens.forEach((item) => registrosPorId.set(Number(item.id), item));
      totalPaginas = Math.max(1, Number(data?.meta?.total_pages || 1));
      pagina += 1;
    } while (pagina <= totalPaginas);

    return Array.from(registrosPorId.values());
  }

  async function exportarSolicitacoesExcel() {
    if (!filtrosDataValidos) {
      alert('Corrija as datas dos filtros antes de exportar.');
      return;
    }

    const selecionadas = solicitacoes.filter(item => selecionadasIds.includes(Number(item.id)));
    if (selecionadas.length > 0) {
      baixarSolicitacoesCsv(selecionadas, 'selecionadas');
      return;
    }

    try {
      setExportando(true);
      const filtradas = await buscarTodasSolicitacoesFiltradas();
      baixarSolicitacoesCsv(filtradas, 'filtradas');
    } catch (error) {
      console.error(error);
      alert('Erro ao exportar as solicitações filtradas.');
    } finally {
      setExportando(false);
    }
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
    if (selecionadasIds.length === 0) return false;
    if (isSetorObra) return false;
    const modo = String(permissaoUsuario?.modo_recebimento || 'TODOS_VISIVEIS').toUpperCase();
    if (modo !== 'TODOS_VISIVEIS') return false;
    const isUsuario = user?.perfil === 'USUARIO';
    return isUsuario ? (!!permissaoUsuario?.usuario_pode_atribuir || isSetorFinanceiro) : true;
  }, [selecionadasIds.length, isSetorObra, permissaoUsuario, user?.perfil, isSetorFinanceiro]);

  const podeExcluirUnica = !!selecionadaUnica && (isSuperadmin || isAdminGEO);
  const podeEnviarUnica = useMemo(() => {
    if (!selecionadaUnica || isSetorObra) return false;
    return (
      isSuperadmin ||
      podeEnviarQualquerSetor ||
      solicitacaoEstaNoSetorDoUsuario(selecionadaUnica.area_responsavel, user)
    );
  }, [selecionadaUnica, isSetorObra, isSuperadmin, podeEnviarQualquerSetor, user]);
  const podeEnviarMassa = useMemo(() => {
    if (selecionadasIds.length === 0 || isSetorObra) return false;
    if (isSuperadmin || podeEnviarQualquerSetor) return true;
    return selecionadasIds.every(idSelecionado => {
      const solicitacao = solicitacoes.find(item => Number(item.id) === Number(idSelecionado));
      return solicitacao && solicitacaoEstaNoSetorDoUsuario(solicitacao.area_responsavel, user);
    });
  }, [selecionadasIds, isSetorObra, isSuperadmin, podeEnviarQualquerSetor, solicitacoes, user]);

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
    if (selecionadasIds.length === 0) {
      alert('Selecione ao menos uma solicitação.');
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

  // ==================================================================
  // Integração com a ListaAvancada (a página segue dona dos dados)
  // ==================================================================
  function handleQueryChangeLista(consulta) {
    consultaListaRef.current = consulta;
    acumularProximaRef.current = false;
    if (paginaAtual !== 1) setPaginaAtual(1);
    setVersaoConsulta((v) => v + 1);
  }

  function handlePageRequestLista(novaPagina, { acumular = false } = {}) {
    acumularProximaRef.current = acumular;
    pularDebounceRef.current = true;
    setPaginaAtual(novaPagina);
  }

  // Busca e ordenação no CLIENTE enquanto o B3 não existe: agem sobre a
  // janela já carregada (páginas buscadas), não sobre o banco inteiro.
  // `versaoConsulta` muda a cada interação com a barra da lista, então o
  // memo relê o ref na hora certa.
  const normalizarBuscaLocal = (valor) => String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const itensExibidos = useMemo(() => {
    if (B3_DISPONIVEL) return solicitacoes;
    const consulta = consultaListaRef.current || {};
    let lista = solicitacoes;

    const termo = normalizarBuscaLocal(consulta.busca).trim();
    if (termo) {
      lista = lista.filter((item) => normalizarBuscaLocal([
        item.codigo,
        item.descricao,
        item.obra?.nome,
        item.parceiro?.nome,
        item.favorecido?.nome,
        item.status_global,
        item.area_responsavel,
        item.numero_sienge,
        item.valor_exibicao ?? item.valor
      ].filter((campo) => campo !== null && campo !== undefined).join(' ')).includes(termo));
    }

    const ordenacao = consulta.ordenacao || {};
    const EXTRATORES = {
      data: (i) => i.createdAt || '',
      codigo: (i) => String(i.codigo || ''),
      descricao: (i) => String(i.descricao || ''),
      valor: (i) => Number(i.valor_exibicao ?? i.valor ?? 0),
      status: (i) => String(i.status_global || ''),
      vencimento: (i) => i.data_vencimento || '',
      setor: (i) => String(i.area_responsavel || ''),
      numero_sienge: (i) => String(i.numero_sienge || '')
    };
    const extrator = EXTRATORES[ordenacao.campo];
    if (extrator) {
      const direcao = ordenacao.direcao === 'asc' ? 1 : -1;
      lista = [...lista].sort((a, b) => {
        const va = extrator(a);
        const vb = extrator(b);
        if (va < vb) return -1 * direcao;
        if (va > vb) return 1 * direcao;
        return 0;
      });
    }
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [B3_DISPONIVEL, solicitacoes, versaoConsulta]);

  const filtrosAvancadosAtivos = useMemo(() => (
    Object.values(filtros).filter((valor) => String(valor ?? '').trim() !== '').length
  ), [filtros]);

  const hojeISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const visoesLista = useMemo(() => {
    if (arquivadas) return [];
    const isoMais = (dias) => {
      const d = new Date();
      d.setDate(d.getDate() + dias);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const setorUsuario = user?.setor?.codigo || user?.area || '';
    return [
      // "Minhas pendências" e "Fila do setor" usam parâmetros que só o B3
      // conhece (`minhas`, `sem_responsavel`); sem ele o backend as
      // ignoraria e as visões mentiriam. Ficam fora até o pacote entrar.
      ...(B3_DISPONIVEL ? [{ id: 'minhas', rotulo: 'Minhas pendências', params: { minhas: '1' } }] : []),
      // "Fila do setor" (sem responsável definido) em vez de "Do meu setor":
      // para quem é o único do setor, "do meu setor" seria idêntico a
      // "Todas" — a fila sem dono é o recorte acionável.
      ...(B3_DISPONIVEL && setorUsuario ? [{ id: 'fila_setor', rotulo: 'Fila do setor', params: { sem_responsavel: '1', area: setorUsuario } }] : []),
      { id: 'vencendo', rotulo: 'Vencendo', tom: 'warning', params: { data_vencimento_inicio: hojeISO, data_vencimento_fim: isoMais(7) } },
      { id: 'atrasadas', rotulo: 'Atrasadas', tom: 'danger', params: { data_vencimento_fim: isoMais(-1) } },
      { id: 'todas', rotulo: 'Todas', params: {} }
    ];
  }, [arquivadas, user?.setor?.codigo, user?.area, hojeISO, B3_DISPONIVEL]);

  const filtrosRapidosLista = useMemo(() => ([
    {
      id: 'status',
      rotulo: 'Status',
      opcoes: statusOptions.map((opcao) => ({ valor: String(opcao.value), rotulo: opcao.label }))
    },
    {
      id: 'tipo',
      rotulo: 'Tipo',
      opcoes: (tiposSolicitacao || []).map((tipo) => ({ valor: String(tipo.id), rotulo: tipo.nome }))
    },
    {
      id: 'obra',
      rotulo: 'Obra',
      opcoes: obrasOptions.map((opcao) => ({ valor: String(opcao.value), rotulo: opcao.label }))
    }
  ]), [statusOptions, tiposSolicitacao, obrasOptions]);

  const colunasLista = useMemo(() => {
    const todas = [
      {
        id: 'codigo',
        titulo: 'Código',
        principal: true,
        ordenavel: true,
        larguraPadrao: 130,
        render: (item) => formatarMaiusculas(item.codigo || `#${item.id}`)
      },
      {
        id: 'obra',
        titulo: 'Obra',
        larguraPadrao: 180,
        render: (item) => formatarMaiusculas(item.obra?.nome || '-')
      },
      {
        id: 'descricao',
        titulo: 'Descrição',
        ordenavel: true,
        larguraPadrao: 300,
        render: (item) => formatarDescricao(item.descricao || '') || '-'
      },
      {
        id: 'valor',
        titulo: 'Valor',
        ordenavel: true,
        larguraPadrao: 130,
        render: (item) => moeda(item.valor_exibicao ?? item.valor)
      },
      {
        id: 'status',
        titulo: 'Status',
        ordenavel: true,
        larguraPadrao: 170,
        render: (item) => (
          <StatusBadge
            status={item.status_global}
            setor={item.setor_status_atual || item.area_responsavel}
          />
        ),
        tituloCelula: (item) => item.status_global || ''
      },
      {
        id: 'vencimento',
        titulo: 'Vencimento',
        ordenavel: true,
        larguraPadrao: 130,
        render: (item) => (item.data_vencimento ? vencimentoHumano(item.data_vencimento) : '-'),
        tituloCelula: (item) => (item.data_vencimento ? dataCurta(item.data_vencimento) : '')
      },
      // ---- opcionais (seletor de colunas; escolha salva por usuário) ----
      {
        id: 'numero_sienge',
        titulo: 'Nº pedido',
        padrao: false,
        ordenavel: true,
        larguraPadrao: 110,
        render: (item) => item.numero_sienge || item.numero_pedido || '-'
      },
      ...(moduloContratosHabilitado ? [
        {
          id: 'contrato',
          titulo: 'Contrato',
          padrao: false,
          larguraPadrao: 130,
          render: (item) => item.contrato?.codigo || item.codigo_contrato || '-'
        },
        {
          id: 'ref_contrato',
          titulo: 'Ref. do contrato',
          padrao: false,
          larguraPadrao: 140,
          render: (item) => item.contrato?.ref_contrato || item.ref_contrato || '-'
        }
      ] : []),
      {
        id: 'tipo',
        titulo: 'Tipo',
        padrao: false,
        larguraPadrao: 160,
        render: (item) => item.tipo?.nome || '-'
      },
      {
        id: 'setor',
        titulo: 'Setor',
        padrao: false,
        ordenavel: true,
        larguraPadrao: 130,
        render: (item) => item.area_responsavel || '-'
      },
      {
        id: 'responsavel',
        titulo: 'Responsável',
        padrao: false,
        larguraPadrao: 150,
        render: (item) => item.responsavel || '-'
      },
      {
        id: 'data',
        titulo: 'Registro',
        padrao: false,
        ordenavel: true,
        larguraPadrao: 110,
        render: (item) => dataCurta(item.createdAt)
      }
    ];
    return todas;
  }, [moduloContratosHabilitado]);

  const renderCardSolicitacao = (item) => (
    <div className="sol-card-compacto">
      <div className="sol-card-compacto-topo">
        <span className="sol-card-compacto-codigo">{formatarMaiusculas(item.codigo || `#${item.id}`)}</span>
        <StatusBadge
          status={item.status_global}
          setor={item.setor_status_atual || item.area_responsavel}
        />
      </div>
      <div className="sol-card-compacto-meio">
        <span className="sol-card-compacto-obra">{formatarMaiusculas(item.obra?.nome || '-')}</span>
        <span className="sol-card-compacto-descricao" title={formatarDescricao(item.descricao || '')}>
          {formatarDescricao(item.descricao || '') || '-'}
        </span>
      </div>
      <div className="sol-card-compacto-base">
        <span className="sol-card-compacto-valor">{moeda(item.valor_exibicao ?? item.valor)}</span>
        <span className="sol-card-compacto-venc">
          {item.data_vencimento ? vencimentoHumano(item.data_vencimento) : 'Sem vencimento'}
        </span>
      </div>
    </div>
  );

  // Com 1 selecionada o rótulo fica no singular, sem número; com 2 ou
  // mais mantém a contagem ("Enviar 3 para outro setor").
  const acoesLoteLista = arquivadas
    ? [
      {
        id: 'desarquivar',
        rotulo: (n) => (n === 1 ? 'Desarquivar' : `Desarquivar ${n}`),
        desabilitada: () => processandoMassa,
        executar: () => desarquivarEmMassa()
      },
      {
        id: 'exportar',
        rotulo: (n) => (n === 1 ? 'Exportar' : `Exportar ${n}`),
        desabilitada: () => processandoMassa || exportando || !filtrosDataValidos,
        executar: () => exportarSolicitacoesExcel()
      }
    ]
    : [
      {
        id: 'assumir',
        rotulo: () => 'Assumir',
        visivel: (itens) => itens.length === 1 && podeAssumirUnica,
        desabilitada: () => processandoMassa,
        executar: () => assumirSelecionada()
      },
      {
        id: 'enviar',
        rotulo: (n) => (n === 1 ? 'Enviar para outro setor' : `Enviar ${n} para outro setor`),
        visivel: () => podeEnviarMassa,
        desabilitada: () => processandoMassa,
        executar: () => setModalEnvioMassa(true)
      },
      {
        id: 'exportar',
        rotulo: (n) => (n === 1 ? 'Exportar' : `Exportar ${n}`),
        desabilitada: () => processandoMassa || exportando || !filtrosDataValidos,
        executar: () => exportarSolicitacoesExcel()
      },
      {
        id: 'arquivar',
        rotulo: (n) => (n === 1 ? 'Arquivar' : `Arquivar ${n}`),
        desabilitada: () => processandoMassa,
        executar: () => arquivarEmMassa()
      },
      {
        id: 'atribuir',
        rotulo: (n) => (n === 1 ? 'Atribuir responsável' : `Atribuir responsável a ${n}`),
        visivel: () => podeAtribuirMassa,
        desabilitada: () => processandoMassa,
        executar: () => abrirModalAtribuirMassa()
      },
      ...(podeSolicitarPrioridadeFinanceiro ? [{
        id: 'prioridade',
        rotulo: (n) => (n === 1 ? 'Prioridade financeira' : `Prioridade financeira para ${n}`),
        desabilitada: () => processandoMassa,
        executar: () => solicitarPrioridadeFinanceiroSelecionadas()
      }] : [])
    ];

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

      {filtroIdsUrl.length > 0 && (
        <div className="sol-surface-card rounded-xl mb-3 p-3 flex items-center gap-3" role="status">
          <span className="fx-badge fx-badge--warning">
            Mostrando {filtroIdsUrl.length} pendência(s) vinda(s) do Início
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setFiltroIdsUrl([]);
              navigate(location.pathname, { replace: true });
            }}
          >
            Limpar este filtro
          </button>
        </div>
      )}

      {filtroVisaoUrl && (
        <div className="sol-surface-card rounded-xl mb-3 p-3 flex items-center gap-3" role="status">
          <span className="fx-badge fx-badge--warning">
            Mostrando: {ROTULOS_VISAO_PENDENCIA[filtroVisaoUrl] || filtroVisaoUrl} — o mesmo
            conjunto contado no cartão do Início{metaPaginacao?.total != null ? ` (${metaPaginacao.total})` : ''}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setFiltroVisaoUrl('');
              navigate(location.pathname, { replace: true });
            }}
          >
            Limpar este filtro
          </button>
        </div>
      )}

      <ListaAvancada
        ref={listaRef}
        id={arquivadas ? 'solicitacoes-arquivadas' : 'solicitacoes'}
        buscaInicial={buscaUrlInicial}
        filtrosIniciais={filtrosUrlIniciais}
        itens={itensExibidos}
        total={Number(metaPaginacao?.total || 0)}
        totalPaginas={Number(metaPaginacao?.total_pages || 0)}
        pagina={paginaAtual}
        carregando={loading}
        onQueryChange={handleQueryChangeLista}
        onPageRequest={handlePageRequestLista}
        fetchContadores={arquivadas || !B3_DISPONIVEL ? null : getContadoresSolicitacoes}
        visoes={visoesLista}
        visaoInicial="todas"
        filtrosRapidos={filtrosRapidosLista}
        filtrosAvancadosAtivos={filtrosAvancadosAtivos}
        filtrosAvancados={() => (
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
            errosDatas={errosFiltrosData}
          />
        )}
        busca={{
          placeholder: 'Buscar por código, obra, descrição ou fornecedor…',
          // Enquanto o B3 não existe a busca roda no cliente — o usuário
          // precisa saber que ela não varre o banco inteiro.
          aviso: B3_DISPONIVEL ? '' : 'A busca considera apenas os registros já carregados na tela.'
        }}
        colunas={colunasLista}
        agrupamentos={[
          { id: 'obra', rotulo: 'obra', valor: (item) => formatarMaiusculas(item.obra?.nome || '(sem obra)') },
          { id: 'tipo', rotulo: 'tipo', valor: (item) => item.tipo?.nome || '(sem tipo)' },
          { id: 'setor', rotulo: 'setor', valor: (item) => item.area_responsavel || '(sem setor)' },
          { id: 'status', rotulo: 'status', valor: (item) => item.status_global || '(sem status)' },
          { id: 'responsavel', rotulo: 'responsável', valor: (item) => item.responsavel || '(sem responsável)' },
          { id: 'parceiro', rotulo: 'fornecedor/parceiro', valor: (item) => item.parceiro?.nome || '(sem parceiro)' },
          { id: 'vencimento_mes', rotulo: 'mês de vencimento', valor: (item) => mesDeVencimento(item.data_vencimento), ordenarGrupos: compararMesVencimento },
          { id: 'criador', rotulo: 'criador', valor: (item) => item.criador?.nome || '(sem criador)' },
          {
            id: 'apropriacao',
            rotulo: 'apropriação',
            valor: (item) => (item.apropriacao
              ? [item.apropriacao.codigo, item.apropriacao.descricao].filter(Boolean).join(' — ')
              : '(sem apropriação)')
          },
          {
            id: 'contrato',
            rotulo: 'contrato vinculado',
            valor: (item) => item.contrato?.codigo || item.codigo_contrato || '(sem contrato)'
          },
          { id: 'faixa_valor', rotulo: 'faixa de valor', valor: (item) => faixaDeValor(item.valor_exibicao ?? item.valor), ordenarGrupos: compararFaixaValor }
        ]}
        renderCard={renderCardSolicitacao}
        urgencia={(item) => urgenciaVencimento(item.data_vencimento)}
        acoesLote={acoesLoteLista}
        aoAbrirItem={(item) => navigate(`/solicitacoes/${item.id}`)}
        onSelecaoChange={(ids) => setSelecionadasIds(ids.map(Number))}
      />

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
