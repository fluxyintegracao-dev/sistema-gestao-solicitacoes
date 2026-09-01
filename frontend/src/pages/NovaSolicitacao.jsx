import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMinhasObras } from '../services/obras';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import { getSetores } from '../services/setores';
import { createSolicitacao, getApropriacaoPadraoSolicitacao, getSaldoDespesaEventual, solicitarRetornoSolicitacao } from '../services/solicitacoes';
import { uploadArquivos } from '../services/uploads';
import { getTiposSubContrato } from '../services/tiposSubContrato';
import { getContratos, criarContratoFluxoNovo, getFormasPagamentoFluxos, getLimiteJuridico, uploadContratoAnexos, uploadNegociacaoContrato, uploadDocumentacaoJuridicaContrato } from '../services/contratos';
import BlocoContratoFluxoNovo, { LIMITE_DETALHES_CONTRATO, MAXIMO_PARCELAS_CONTRATO } from '../components/contratos/BlocoContratoFluxoNovo';
import ModalConferenciaCredores from '../components/contratos/ModalConferenciaCredores';
import BlocoMedicaoContrato from '../components/contratos/BlocoMedicaoContrato';
import ModalAditivoContrato from '../components/contratos/ModalAditivoContrato';
import { buscarParceiros, criarCredorNovaSolicitacao } from '../services/parceiros';
import { listarApropriacoes } from '../services/apropriacoes';
import { getAreasObra, getAreasPorSetorOrigem, getAutomacaoDestinoNovaSolicitacao, getCamposNovaSolicitacao, getTiposSolicitacaoPorSetor } from '../services/configuracoesSistema';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineArrowUturnLeft, HiOutlineClock, HiOutlineMagnifyingGlass, HiPaperClip } from 'react-icons/hi2';
import ApropriacaoAutocomplete from '../components/ui/ApropriacaoAutocomplete';
import ParceiroBuscaRemota from '../components/solicitacoes/ParceiroBuscaRemota';
import RateioApropriacoesContrato, { numeroDoCampo } from '../components/contratos/RateioApropriacoesContrato';
import PendingAttachmentsList from '../components/attachments/PendingAttachmentsList';
import RecargaCartaoFields from '../components/recarga-cartao/RecargaCartaoFields';
import { userHasSetorCapability } from '../utils/setor';
import { hasEnabledModule } from '../utils/acessoProduto';
import { applyTipoSolicitacaoModuleAvailability, getTipoSolicitacaoBehavior } from '../utils/tipoSolicitacao';
import { obterOpcoesNovaSolicitacaoFrontend, resolverCamposNovaSolicitacaoFrontend } from '../utils/novaSolicitacaoCampos';
import {
  normalizarConfigAutomacaoDestinoNovaSolicitacao,
  obterRegraAutomacaoDestinoNovaSolicitacao
} from '../utils/novaSolicitacaoAutomacaoDestino';
import { maskCep, maskCpfCnpj, maskPhone, onlyDigits } from '../utils/formatters';
import {
  UPLOAD_DOCUMENT_ACCEPT,
  UPLOAD_MAX_FILE_SIZE_MB_PADRAO,
  arquivoDocumentoPermitido,
  concatenarAnexosPendentes,
  extrairFilesAnexosPendentes,
  montarMensagemArquivosAcimaDoLimite,
  montarMensagemTiposArquivoNaoPermitidos
} from '../utils/pendingAttachments';
import {
  chavePixPreferencial,
  formaPagamentoEhBoleto,
  formaPagamentoEhPix,
  formaPagamentoPermitidaDespesaEventual
} from '../utils/formaPagamento';

function normalizarBusca(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function isTipoCompraDireta(tipo) {
  const token = normalizarBusca(tipo?.codigo_interno || tipo?.nome).replace(/[^A-Z0-9]+/g, '_');
  return token === 'COMPRA_DIRETA';
}

function isTipoRecargaCartao(tipo, comportamento = {}) {
  if (comportamento?.usa_fluxo_recarga_cartao === true) return true;
  const token = normalizarBusca(tipo?.codigo_interno || tipo?.nome).replace(/[^A-Z0-9]+/g, '_');
  return token === 'RECARGA_DE_CARTAO';
}

function isSetorGerenciaProcessos(setor) {
  const tokens = [setor?.codigo, setor?.nome]
    .map((valor) => normalizarBusca(valor).replace(/[^A-Z0-9]+/g, '_'))
    .filter(Boolean);
  return tokens.some((token) => token === 'GEO' || (token.includes('GERENCIA') && token.includes('PROCESSO')));
}

function formatarLocalidadeObra(obra) {
  if (!obra) return 'Localidade nao informada';
  return [obra.cidade, obra.estado].filter(Boolean).join(' / ') || 'Localidade nao informada';
}

function formatarRotuloBuscaObra(obra) {
  if (!obra) return '';
  const codigo = String(obra.codigo || '').trim();
  const nome = String(obra.nome || '').trim();
  if (codigo && nome) return `${codigo} - ${nome}`;
  return codigo || nome;
}

function formatarCredor(credor) {
  if (!credor) return '';
  const nome = String(credor.nome || '').trim();
  const documento = String(credor.cpf_cnpj || '').trim();
  if (nome && documento) return `${nome} - ${documento}`;
  return nome || documento || `Credor ${credor.id}`;
}

function isCadastroObra(obra) {
  return String(obra?.tipo_centro_custo || 'OBRA').trim().toUpperCase() === 'OBRA';
}

function getTipoCentroCustoLabel(obra) {
  return isCadastroObra(obra) ? 'Obra' : 'Centro de custo';
}

const PIX_TIPOS_CHAVE = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Aleatoria' }
];

function criarNovoParceiroPadrao() {
  return {
    cpf_cnpj: '',
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: '',
    municipio: '',
    estado: '',
    pix_chave_fixa_1_tipo: 'CPF',
    pix_chave_fixa_1: '',
    pix_chave_fixa_2_tipo: 'CNPJ',
    pix_chave_fixa_2: '',
    pix_chave_variavel_tipo: 'ALEATORIA',
    pix_chave_variavel: '',
    cliente: false,
    fornecedor: true,
    corretor: false,
    categoria_ids: []
  };
}

function criarChaveIdempotenciaSolicitacao() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sol-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function NovaSolicitacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const moduloContratosHabilitado = hasEnabledModule(user, 'CONTRATOS');
  const moduloApropriacoesHabilitado = hasEnabledModule(user, 'OBRAS');
  const [obras, setObras] = useState([]);
  const [obraBusca, setObraBusca] = useState('');
  const [obraBuscaAtiva, setObraBuscaAtiva] = useState(false);
  const [tipos, setTipos] = useState([]);
  const [setores, setSetores] = useState([]);
  const [areasObra, setAreasObra] = useState([]);
  const [areasPorSetorOrigem, setAreasPorSetorOrigem] = useState({});
  const [tiposPorSetorConfig, setTiposPorSetorConfig] = useState({});
  const [camposNovaSolicitacaoConfig, setCamposNovaSolicitacaoConfig] = useState({ regras: {} });
  const [automacaoDestinoConfig, setAutomacaoDestinoConfig] = useState({ destinos_disponiveis: [], regras: {} });
  const [tiposSub, setTiposSub] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [contratosRef, setContratosRef] = useState([]);
  const [apropriacoes, setApropriacoes] = useState([]);
  const [apropriacaoAutomatica, setApropriacaoAutomatica] = useState({
    status: 'idle',
    apropriacao: null,
    erro: ''
  });
  const [apropriacoesContratoRateio, setApropriacoesContratoRateio] = useState([]);
  const [refContratoBusca, setRefContratoBusca] = useState('');
  const [refResultados, setRefResultados] = useState([]);
  const [parceiroBusca, setParceiroBusca] = useState('');
  const [parceiroResultados, setParceiroResultados] = useState([]);
  const [parceiroSelecionado, setParceiroSelecionado] = useState(null);
  const [favorecidoSelecionado, setFavorecidoSelecionado] = useState(null);
  const [usarCredorComoFavorecido, setUsarCredorComoFavorecido] = useState(false);
  const [formasPagamentoSolicitacao, setFormasPagamentoSolicitacao] = useState([]);
  const [erroFormasPagamento, setErroFormasPagamento] = useState('');
  const [parceiroBuscando, setParceiroBuscando] = useState(false);
  const [parceiroBuscaExecutada, setParceiroBuscaExecutada] = useState(false);
  const [modalParceiroAberto, setModalParceiroAberto] = useState(false);
  const [modalCredoresContratoAberto, setModalCredoresContratoAberto] = useState(false);
  const [credorContratoSugestoesAbertas, setCredorContratoSugestoesAbertas] = useState(false);
  const [credorContratoModalBusca, setCredorContratoModalBusca] = useState('');
  const [categoriasParceiro, setCategoriasParceiro] = useState([]);
  const [novoParceiro, setNovoParceiro] = useState(criarNovoParceiroPadrao);
  const [arquivos, setArquivos] = useState([]);
  const [boletoArquivos, setBoletoArquivos] = useState([]);
  const [despesaEventualSaldo, setDespesaEventualSaldo] = useState({ status: 'idle', dados: null, erro: '' });
  const [despesaEventualDeclaracoes, setDespesaEventualDeclaracoes] = useState({
    despesa_pontual_nao_recorrente: false,
    sem_vinculo_contratual: false,
    nao_fracionada: false
  });
  const [cartaoRecargaId, setCartaoRecargaId] = useState('');
  const [recargaCartaoContexto, setRecargaCartaoContexto] = useState(null);
  const [criandoSolicitacao, setCriandoSolicitacao] = useState(false);
  const [valorTexto, setValorTexto] = useState('');
  const [contratoNovoDados, setContratoNovoDados] = useState(null);
  // Rateio da apropriacao do CONTRATO (19/08): varias apropriacoes, por % ou por R$.
  // Comeca com uma linha vazia — o caso de uma apropriacao so continua sendo o normal.
  const [rateioContrato, setRateioContrato] = useState([{ apropriacao_id: '', percentual: '100', valor: '' }]);
  const [medicaoContratoDados, setMedicaoContratoDados] = useState(null);
  const [retornoContrato, setRetornoContrato] = useState({
    aberto: false,
    motivo: '',
    processando: false,
    erro: ''
  });
  // PI-15: o aditivo virou uma ACAO sobre o contrato, pedida por um modal na tela de medicao.
  // Nao e mais um subtipo da Nova Solicitacao, e nao participa do envio deste formulario.
  const [modalAditivoAberto, setModalAditivoAberto] = useState(false);
  const anexosRef = useRef(null);
  const boletoRef = useRef(null);
  const obraBuscaBlurTimeoutRef = useRef(null);
  const automacaoDestinoExecutadaRef = useRef('');
  const criandoSolicitacaoRef = useRef(false);

  const [form, setForm] = useState({
    obra_id: '',
    parceiro_id: '',
    apropriacao_id: '',
    tipo_solicitacao_id: '',
    tipo_sub_id: '',
    contrato_id: '',
    codigo_contrato: '',
    area_responsavel: '',
    descricao: '',
    justificativa: '',
    favorecido_id: '',
    forma_pagamento_id: '',
    favorecido_chave_pix: '',
    itens_apropriacao: '',
    ref_contrato_abertura: '',
    valor: '',
    data_vencimento: '',
    data_demissao: '',
    data_inicio_medicao: '',
    data_fim_medicao: ''
  });

  const obraSelecionada = useMemo(
    () => obras.find((obra) => String(obra.id) === String(form.obra_id)) || null,
    [obras, form.obra_id]
  );
  const obraSelecionadaEhObra = isCadastroObra(obraSelecionada);

  useEffect(() => {
    async function load() {
      setObras(await getMinhasObras({ modo: 'CRIACAO', escopo: 'TODOS' }));
      setTipos(await getTiposSolicitacao());
      setSetores(await getSetores());
      try {
        const [cfg, cfgSetorOrigem, cfgTiposPorSetor, cfgCamposNovaSolicitacao, cfgAutomacaoDestino] = await Promise.all([
          getAreasObra(),
          getAreasPorSetorOrigem(),
          getTiposSolicitacaoPorSetor(),
          getCamposNovaSolicitacao(),
          getAutomacaoDestinoNovaSolicitacao()
        ]);
        setAreasObra(Array.isArray(cfg?.areas) ? cfg.areas : []);
        setAreasPorSetorOrigem(
          cfgSetorOrigem?.regras && typeof cfgSetorOrigem.regras === 'object'
            ? cfgSetorOrigem.regras
            : {}
        );
        setTiposPorSetorConfig(
          cfgTiposPorSetor?.regras && typeof cfgTiposPorSetor.regras === 'object'
            ? cfgTiposPorSetor.regras
            : {}
        );
        setCamposNovaSolicitacaoConfig({
          regras: cfgCamposNovaSolicitacao?.regras && typeof cfgCamposNovaSolicitacao.regras === 'object'
            ? cfgCamposNovaSolicitacao.regras
            : {}
        });
        setAutomacaoDestinoConfig(normalizarConfigAutomacaoDestinoNovaSolicitacao(cfgAutomacaoDestino));
      } catch (error) {
        console.error(error);
        setAreasObra([]);
        setAreasPorSetorOrigem({});
        setTiposPorSetorConfig({});
        setCamposNovaSolicitacaoConfig({ regras: {} });
        setAutomacaoDestinoConfig({ destinos_disponiveis: [], regras: {} });
      }
    }
    load();
  }, []);

  useEffect(() => (
    () => {
      if (obraBuscaBlurTimeoutRef.current) {
        clearTimeout(obraBuscaBlurTimeoutRef.current);
      }
    }
  ), []);

  useEffect(() => {
    if (!form.tipo_solicitacao_id) {
      setTiposSub([]);
      setForm(prev => ({ ...prev, tipo_sub_id: '' }));
      return undefined;
    }

    let cancelado = false;
    async function loadSub() {
      const data = await getTiposSubContrato({
        tipo_macro_id: form.tipo_solicitacao_id
      });
      if (cancelado) return;
      setTiposSub(Array.isArray(data) ? data.filter(item => item?.ativo !== false) : []);
    }

    loadSub();
    return () => {
      cancelado = true;
    };
  }, [form.tipo_solicitacao_id]);

  useEffect(() => {
    if (!form.obra_id) {
      setContratos([]);
      setForm(prev => ({ ...prev, contrato_id: '', ref_contrato_abertura: '' }));
      setContratosRef([]);
      setApropriacoes([]);
      setApropriacoesContratoRateio([]);
      setForm(prev => ({ ...prev, apropriacao_id: '', itens_apropriacao: '' }));
      return;
    }

    if (!obraSelecionadaEhObra) {
      setContratos([]);
      setContratosRef([]);
      setApropriacoes([]);
      setRefContratoBusca('');
      setRefResultados([]);
      setApropriacoesContratoRateio([]);
      setForm(prev => ({
        ...prev,
        contrato_id: '',
        codigo_contrato: '',
        apropriacao_id: '',
        itens_apropriacao: ''
      }));
      return;
    }

    async function loadDependenciasObra() {
      const tarefas = [
        moduloContratosHabilitado
          ? getContratos({ obra_id: form.obra_id, modo: 'CRIACAO' })
          : Promise.resolve([]),
        moduloApropriacoesHabilitado
          ? listarApropriacoes({ obra_id: form.obra_id })
          : Promise.resolve([])
      ];

      const [contratosResult, apropriacoesResult] = await Promise.allSettled(tarefas);

      if (contratosResult.status === 'fulfilled') {
        setContratos(Array.isArray(contratosResult.value) ? contratosResult.value : []);
      } else {
        console.error(contratosResult.reason);
        setContratos([]);
      }

      if (apropriacoesResult.status === 'fulfilled') {
        setApropriacoes(Array.isArray(apropriacoesResult.value) ? apropriacoesResult.value : []);
      } else {
        console.error(apropriacoesResult.reason);
        setApropriacoes([]);
      }

      setContratosRef([]);
    }

    loadDependenciasObra();
  }, [form.obra_id, obraSelecionadaEhObra, moduloContratosHabilitado, moduloApropriacoesHabilitado]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'tipo_solicitacao_id') {
      // Um subtipo pertence ao tipo anterior. Limpar no mesmo evento evita que a regra
      // `tipo:subtipo` antiga continue controlando os campos enquanto a nova lista carrega.
      setTiposSub([]);
      setForm((atual) => ({
        ...atual,
        tipo_solicitacao_id: value,
        tipo_sub_id: ''
      }));
      return;
    }
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  function normalizarDocumento(valor) {
    return onlyDigits(valor);
  }

  function selecionarParceiro(parceiro) {
    setParceiroSelecionado(parceiro);
    setForm(prev => ({ ...prev, parceiro_id: String(parceiro.id) }));
    setParceiroBusca(parceiro.nome || parceiro.cpf_cnpj || '');
    setParceiroResultados([]);
    setParceiroBuscaExecutada(false);
    setCredorContratoSugestoesAbertas(false);
    setModalCredoresContratoAberto(false);
  }

  function limparParceiroSelecionado() {
    if (usarCredorComoFavorecido) {
      setUsarCredorComoFavorecido(false);
      setFavorecidoSelecionado(null);
      setForm(prev => ({ ...prev, parceiro_id: '', favorecido_id: '', favorecido_chave_pix: '' }));
    } else {
      setForm(prev => ({ ...prev, parceiro_id: '' }));
    }
    setParceiroSelecionado(null);
    setParceiroBusca('');
    setParceiroResultados([]);
    setParceiroBuscaExecutada(false);
    setCredorContratoSugestoesAbertas(false);
  }

  async function buscarParceirosRelacionados({ automatico = false } = {}) {
    try {
      const termo = parceiroBusca.trim();
      if (!termo) return;
      setParceiroBuscando(true);
      setParceiroBuscaExecutada(true);
      const data = await buscarParceiros({ q: termo, fornecedor: 1, ativo: 1, limit: 20 });
      const lista = Array.isArray(data) ? data : [];
      setParceiroResultados(lista);

      // So auto-seleciona no clique do botao. Na busca AO DIGITAR isso seria hostil: a pessoa
      // digita "JOAO", cai em um resultado unico e o campo se fecha sozinho antes de ela terminar
      // de escrever o nome inteiro.
      if (!automatico && lista.length === 1) {
        selecionarParceiro(lista[0]);
      }
    } catch (error) {
      console.error(error);
      // Busca automatica nao interrompe a digitacao com alerta: quem esta escrevendo nao pediu
      // esta busca, e um popup a cada tecla seria pior que o erro.
      if (!automatico) alert(error.message || 'Erro ao buscar credores');
    } finally {
      setParceiroBuscando(false);
    }
  }


  async function salvarNovoParceiro() {
    try {
      // O backend recusa igual (PI-20). Barrar aqui evita a viagem so para receber o 400, e a
      // mensagem lista o que falta em vez de dizer apenas "cadastro incompleto".
      const faltando = [
        ['nome', 'Nome'], ['cpf_cnpj', 'CPF/CNPJ'], ['endereco', 'Logradouro'], ['numero', 'Numero'],
        ['bairro', 'Bairro'], ['cep', 'CEP'], ['municipio', 'Municipio'], ['estado', 'UF']
      ].filter(([campo]) => !String(novoParceiro[campo] || '').trim()).map(([, rotulo]) => rotulo);

      if (faltando.length > 0) {
        alert(`Complete o cadastro do credor. Falta: ${faltando.join(', ')}.`);
        return;
      }

      const payload = {
        ...novoParceiro,
        cpf_cnpj: normalizarDocumento(novoParceiro.cpf_cnpj),
        telefone: onlyDigits(novoParceiro.telefone),
        cep: onlyDigits(novoParceiro.cep)
      };

      const parceiro = await criarCredorNovaSolicitacao({
        ...payload,
        tipo_solicitacao_id: form.tipo_solicitacao_id,
        area_responsavel: form.area_responsavel,
        contrato_id: permitirCredorAvulsoComContrato ? null : (form.contrato_id || null)
      });
      selecionarParceiro(parceiro);
      setNovoParceiro(criarNovoParceiroPadrao());
      setModalParceiroAberto(false);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao cadastrar credor');
    }
  }

  function limparSelecaoObraERegras() {
    setForm(prev => ({
      ...prev,
      obra_id: '',
      area_responsavel: '',
      apropriacao_id: '',
      tipo_solicitacao_id: '',
      tipo_sub_id: '',
      contrato_id: '',
      codigo_contrato: '',
      parceiro_id: '',
      favorecido_id: '',
      forma_pagamento_id: '',
      favorecido_chave_pix: '',
      justificativa: ''
    }));
    setContratos([]);
    setApropriacoes([]);
    setContratosRef([]);
    setRefContratoBusca('');
    setRefResultados([]);
    setApropriacoesContratoRateio([]);
    limparParceiroSelecionado();
    setFavorecidoSelecionado(null);
    setUsarCredorComoFavorecido(false);
    setBoletoArquivos([]);
    if (boletoRef.current) boletoRef.current.value = '';
  }

  function limparBuscaObra() {
    limparSelecaoObraERegras();
    setObraBusca('');
    setObraBuscaAtiva(false);
  }

  const tipoSelecionado = tipos.find(t => String(t.id) === String(form.tipo_solicitacao_id));
  const comportamentoTipo = useMemo(() => {
    const comportamentoBase = getTipoSolicitacaoBehavior(tipoSelecionado);
    return applyTipoSolicitacaoModuleAvailability(comportamentoBase, {
      contratos: moduloContratosHabilitado,
      apropriacoes: moduloApropriacoesHabilitado
    });
  }, [tipoSelecionado, moduloContratosHabilitado, moduloApropriacoesHabilitado]);
  // Derivado do comportamento, nao do nome/id: qualquer tipo configurado como medicao recebe as
  // mesmas exigencias de documento e pagamento condicional.
  const tipoEhDeMedicao = Boolean(
    comportamentoTipo.mostrar_periodo_medicao || comportamentoTipo.exige_periodo_medicao
  );
  const camposNovaSolicitacao = useMemo(() => (
    resolverCamposNovaSolicitacaoFrontend(
      comportamentoTipo,
      camposNovaSolicitacaoConfig,
      form.tipo_solicitacao_id,
      {
        apropriacoesDisponiveis: moduloApropriacoesHabilitado,
        areaResponsavel: form.area_responsavel,
        // Regra do subtipo tem precedencia sobre a do tipo (escopo de contratos 3.1-3.3).
        tipoSubId: form.tipo_sub_id
      }
    )
    // `form.tipo_sub_id` entra aqui porque e lido dentro do memo: sem ele, trocar o subtipo nao
    // re-resolve os campos e a regra `tipo:subtipo` inteira nao tem efeito na tela (o motor, a
    // tela de configuracao e o backend ja resolviam certo — so esta lista estava incompleta).
  ), [comportamentoTipo, camposNovaSolicitacaoConfig, form.tipo_solicitacao_id, form.area_responsavel, form.tipo_sub_id, moduloApropriacoesHabilitado]);
  const tipoConfiguradoComoDespesaEventual = Boolean(comportamentoTipo.usa_fluxo_despesa_eventual);
  const tipoConfiguradoComoRecargaCartao = isTipoRecargaCartao(tipoSelecionado, comportamentoTipo);
  const tipoSolicitacaoEscolhido = Boolean(form.tipo_solicitacao_id);
  const camposFixosDespesaEventual = new Set([
    'valor',
    'credor',
    'favorecido',
    'forma_pagamento',
    'apropriacao_principal',
    'subtipo',
    'justificativa',
    'anexos',
    'data_vencimento'
  ]);
  const camposFixosRecargaCartao = new Set(['valor', 'data_vencimento']);
  const campoVisivel = (campo) => {
    // Antes de o tipo ser escolhido, nenhum campo funcional deve herdar o comportamento
    // generico. A obra, o setor e o proprio tipo continuam fixos no topo; o restante entra
    // somente depois que a regra do tipo (e, quando houver, do subtipo) puder ser resolvida.
    if (!tipoSolicitacaoEscolhido) return false;
    if (tipoConfiguradoComoRecargaCartao) return camposFixosRecargaCartao.has(campo);
    return (tipoConfiguradoComoDespesaEventual && camposFixosDespesaEventual.has(campo))
      || camposNovaSolicitacao?.[campo]?.visivel !== false;
  };
  const campoObrigatorio = (campo) => {
    if (!tipoSolicitacaoEscolhido) return false;
    if (tipoConfiguradoComoRecargaCartao) return camposFixosRecargaCartao.has(campo);
    return (tipoConfiguradoComoDespesaEventual && camposFixosDespesaEventual.has(campo))
      || Boolean(camposNovaSolicitacao?.[campo]?.obrigatorio);
  };
  const opcoesNovaSolicitacao = useMemo(() => (
    obterOpcoesNovaSolicitacaoFrontend(
      camposNovaSolicitacaoConfig,
      form.tipo_solicitacao_id,
      form.area_responsavel
    )
  ), [camposNovaSolicitacaoConfig, form.tipo_solicitacao_id, form.area_responsavel]);
  // Campo que nao aparece nao pode ser exigido — a guarda usa `exibirCampoSubtipo`, definido logo
  // abaixo, e por isso a exigencia e resolvida junto dele.
  const subtipoObrigatorio = campoObrigatorio('subtipo');
  const medicaoObrigatoria = campoObrigatorio('periodo_medicao');
  const solicitacaoCompra = !comportamentoTipo.mostrar_apropriacao_principal && !comportamentoTipo.mostrar_valor;
  // Fluxo novo de contratos (D38): a flag vem do JSON comportamento do tipo, mesmo estilo
  // da derivacao acima — nunca por nome de tipo.
  const usaFluxoContratoNovo = Boolean(comportamentoTipo.usa_fluxo_contrato_novo);
  const usaFluxoDespesaEventual = tipoConfiguradoComoDespesaEventual;
  const usaFluxoRecargaCartao = tipoConfiguradoComoRecargaCartao;
  const usaApropriacaoAutomaticaObra = Boolean(comportamentoTipo.usa_apropriacao_automatica_obra);
  const rotuloContratoVinculado = tipoEhDeMedicao ? 'Título do Contrato' : 'Ref. do Contrato';
  const placeholderContratoVinculado = tipoEhDeMedicao
    ? 'Buscar pelo título do contrato'
    : 'Buscar por referência do contrato';

  useEffect(() => {
    if (!usaApropriacaoAutomaticaObra || !form.obra_id || !form.tipo_solicitacao_id) {
      setApropriacaoAutomatica({ status: 'idle', apropriacao: null, erro: '' });
      return undefined;
    }

    let cancelado = false;
    setApropriacaoAutomatica({ status: 'loading', apropriacao: null, erro: '' });
    getApropriacaoPadraoSolicitacao({
      obra_id: form.obra_id,
      tipo_solicitacao_id: form.tipo_solicitacao_id
    })
      .then((data) => {
        if (cancelado) return;
        setApropriacaoAutomatica({
          status: data?.apropriacao ? 'success' : 'error',
          apropriacao: data?.apropriacao || null,
          erro: data?.apropriacao ? '' : 'A apropriacao automatica nao esta configurada para esta obra.'
        });
      })
      .catch((error) => {
        if (cancelado) return;
        setApropriacaoAutomatica({
          status: 'error',
          apropriacao: null,
          erro: error?.message || 'Nao foi possivel conferir a apropriacao automatica.'
        });
      });

    return () => {
      cancelado = true;
    };
  }, [usaApropriacaoAutomaticaObra, form.obra_id, form.tipo_solicitacao_id]);

  useEffect(() => {
    if (!usaFluxoDespesaEventual || !form.obra_id) {
      setDespesaEventualSaldo({ status: 'idle', dados: null, erro: '' });
      return undefined;
    }

    let cancelado = false;
    setDespesaEventualSaldo({ status: 'loading', dados: null, erro: '' });
    getSaldoDespesaEventual(form.obra_id)
      .then((dados) => {
        if (!cancelado) setDespesaEventualSaldo({ status: 'success', dados, erro: '' });
      })
      .catch((error) => {
        if (!cancelado) {
          setDespesaEventualSaldo({
            status: 'error',
            dados: null,
            erro: error?.message || 'Nao foi possivel calcular o saldo da obra.'
          });
        }
      });

    return () => { cancelado = true; };
  }, [usaFluxoDespesaEventual, form.obra_id]);

  useEffect(() => {
    if (usaFluxoDespesaEventual) return;
    setDespesaEventualDeclaracoes({
      despesa_pontual_nao_recorrente: false,
      sem_vinculo_contratual: false,
      nao_fracionada: false
    });
  }, [usaFluxoDespesaEventual]);

  useEffect(() => {
    if (usaFluxoRecargaCartao) return;
    setCartaoRecargaId('');
    setRecargaCartaoContexto(null);
  }, [usaFluxoRecargaCartao]);

  function limparCamposNovaRecargaAposReenvio() {
    setCartaoRecargaId('');
    setRecargaCartaoContexto(null);
    setValorTexto('');
    setForm((atual) => ({ ...atual, valor: '', data_vencimento: '' }));
  }

  useEffect(() => {
    if (!usaFluxoRecargaCartao) return;
    const gerencia = setores.find(isSetorGerenciaProcessos);
    if (!gerencia?.codigo || String(form.area_responsavel) === String(gerencia.codigo)) return;
    setForm((atual) => ({ ...atual, area_responsavel: gerencia.codigo }));
  }, [usaFluxoRecargaCartao, setores, form.area_responsavel]);

  // O limite vem da configuracao (`CONTRATO_LIMITE_JURIDICO`). A constante da tela ficou apenas
  // como fallback: com o numero fixo aqui, mudar o limite pela tela de configuracao fazia a tela
  // cobrar num corte e o backend rotear noutro.
  const [limiteJuridico, setLimiteJuridico] = useState(LIMITE_DETALHES_CONTRATO);
  // Conferencia do cadastro dos contratados, exigida acima do limite (20/08).
  const [modalCredoresAberto, setModalCredoresAberto] = useState(false);
  const [credoresParaConferir, setCredoresParaConferir] = useState([]);

  useEffect(() => {
    if (!usaFluxoContratoNovo) return undefined;
    let cancelado = false;
    getLimiteJuridico()
      .then((r) => { if (!cancelado && Number(r?.limite) > 0) setLimiteJuridico(Number(r.limite)); })
      // Falha aqui mantem o fallback: e melhor cobrar no corte antigo do que nao cobrar.
      .catch(() => {});
    return () => { cancelado = true; };
  }, [usaFluxoContratoNovo]);
  const exigeApropriacaoPrincipal =
    Boolean(form.tipo_solicitacao_id) &&
    obraSelecionadaEhObra &&
    campoObrigatorio('apropriacao_principal');
  const tipoSemValor = !campoVisivel('valor');
  const exibirCamposContrato = obraSelecionadaEhObra && campoVisivel('contrato');
  const exibirCampoApropriacao = obraSelecionadaEhObra && moduloApropriacoesHabilitado && campoVisivel('apropriacao_principal');
  const camposContratoObrigatorios = campoObrigatorio('contrato');
  // O SUBTIPO SAI DO CONTRATO (item 1 do lote de 23/08). Pelo tipo CONTRATO so existe a abertura,
  // entao o subtipo nao separava nada — e o gatilho do fluxo novo sempre foi do TIPO
  // (`usa_fluxo_contrato_novo`), nunca do subtipo. Nos demais tipos ele continua como sempre.
  //
  // Consequencia registrada no plano: a configuracao de "campos por subtipo" (PI-13) deixa de valer
  // para CONTRATO — passa a valer a do tipo. As solicitacoes antigas guardam o subtipo e seguem
  // legiveis; nada e apagado.
  const exibirCampoSubtipo = campoVisivel('subtipo') && !usaFluxoContratoNovo;
  const exibirCampoCredor = campoVisivel('credor');

  // Busca do credor AO DIGITAR (pedido do cliente, 19/08), sem minimo de caracteres: procura desde
  // a primeira letra. O atraso existe para nao disparar uma consulta por tecla — e cancelado a
  // cada digito novo, entao so a ultima palavra digitada vira consulta.
  useEffect(() => {
    if (!exibirCampoCredor) return undefined;
    const termo = parceiroBusca.trim();
    if (!termo || parceiroSelecionado) return undefined;
    const id = window.setTimeout(() => { void buscarParceirosRelacionados({ automatico: true }); }, 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parceiroBusca, parceiroSelecionado, exibirCampoCredor]);

  const exibirCadastroCredor = campoVisivel('cadastro_credor');
  const permitirVinculoCredor = exibirCampoCredor || exibirCadastroCredor;
  const permitirCredorAvulsoComContrato = opcoesNovaSolicitacao.permitir_credor_avulso_com_contrato === true;
  const restringirCredorAoContrato = exibirCamposContrato && !permitirCredorAvulsoComContrato;
  // Esta e a data operacional da SOLICITACAO (resposta/pagamento), inclusive no fluxo novo de
  // contratos. Os vencimentos do cronograma continuam independentes e ficam em cada parcela.
  const exibirDataVencimento = campoVisivel('data_vencimento');
  // Campo invisivel nao pode ser exigido: sem esta guarda o submit ficaria travado por um
  // campo que o usuario nao tem como preencher (a validacao roda antes do fluxo do contrato).
  const dataVencimentoObrigatoria = exibirDataVencimento && campoObrigatorio('data_vencimento');
  const exibirDataDemissao = campoVisivel('data_demissao');
  const dataDemissaoObrigatoria = campoObrigatorio('data_demissao');
  const exibirPeriodoMedicao = campoVisivel('periodo_medicao');
  const exibirRefContratoAbertura = campoVisivel('ref_contrato_abertura');
  const exibirItensApropriacao = obraSelecionadaEhObra && campoVisivel('itens_apropriacao');
  const refContratoAberturaObrigatoria = campoObrigatorio('ref_contrato_abertura');
  const itensApropriacaoObrigatorio = campoObrigatorio('itens_apropriacao');
  const apropriacoesContratoObrigatorias =
    Boolean(form.tipo_solicitacao_id) &&
    obraSelecionadaEhObra &&
    exibirCamposContrato &&
    Boolean(form.contrato_id) &&
    (Boolean(comportamentoTipo.exige_apropriacoes_contrato) || campoObrigatorio('apropriacoes_contrato'));
  const exibirDescricao = campoVisivel('descricao');
  const descricaoObrigatoria = campoObrigatorio('descricao');
  const exibirJustificativa = campoVisivel('justificativa') && !usaFluxoContratoNovo;
  const justificativaObrigatoria = exibirJustificativa && campoObrigatorio('justificativa');
  const exibirFormaPagamento = campoVisivel('forma_pagamento') && !usaFluxoContratoNovo;
  // A forma vem primeiro. Depois de selecionada, o favorecido aparece para qualquer pagamento;
  // PIX acrescenta a chave e Boleto acrescenta o anexo especifico.
  const exibirFavorecido = (campoVisivel('favorecido') || exibirFormaPagamento) && !usaFluxoContratoNovo;
  const formaPagamentoObrigatoria = exibirFormaPagamento && campoObrigatorio('forma_pagamento');
  // Em medicao o anexo e regra do fluxo, mesmo que a configuracao visual antiga tenha ocultado o
  // campo: campo invisivel e obrigatorio seria uma tela impossivel de concluir.
  const exibirAnexos = campoVisivel('anexos') || tipoEhDeMedicao;
  const anexosObrigatorios = tipoEhDeMedicao || campoObrigatorio('anexos');
  const formasPagamentoDisponiveis = useMemo(
    () => usaFluxoDespesaEventual
      ? formasPagamentoSolicitacao.filter(formaPagamentoPermitidaDespesaEventual)
      : formasPagamentoSolicitacao,
    [formasPagamentoSolicitacao, usaFluxoDespesaEventual]
  );
  const formaPagamentoSelecionada = useMemo(
    () => formasPagamentoDisponiveis.find((forma) => String(forma.id) === String(form.forma_pagamento_id)) || null,
    [formasPagamentoDisponiveis, form.forma_pagamento_id]
  );
  const pagamentoViaPix = formaPagamentoEhPix(formaPagamentoSelecionada);
  const pagamentoViaBoleto = formaPagamentoEhBoleto(formaPagamentoSelecionada);
  const exibirFavorecidoPagamento = exibirFavorecido && Boolean(formaPagamentoSelecionada);
  // Se existe uma forma de pagamento escolhida, precisa existir quem recebera. A configuracao
  // pode controlar a presenca do bloco, mas nao pode tornar anonima uma solicitacao de pagamento.
  const favorecidoObrigatorio = exibirFavorecidoPagamento;

  useEffect(() => {
    if (!form.forma_pagamento_id || formasPagamentoSolicitacao.length === 0) return;
    const formaContinuaDisponivel = formasPagamentoDisponiveis.some(
      (forma) => String(forma.id) === String(form.forma_pagamento_id)
    );
    if (formaContinuaDisponivel) return;
    setForm((prev) => ({
      ...prev,
      forma_pagamento_id: '',
      favorecido_chave_pix: ''
    }));
    setBoletoArquivos([]);
  }, [form.forma_pagamento_id, formasPagamentoDisponiveis, formasPagamentoSolicitacao.length]);

  useEffect(() => {
    if (!exibirFormaPagamento) {
      setForm((prev) => ({ ...prev, forma_pagamento_id: '', favorecido_chave_pix: '' }));
      setFormasPagamentoSolicitacao([]);
      setErroFormasPagamento('');
      setBoletoArquivos([]);
      return undefined;
    }

    let cancelado = false;
    setErroFormasPagamento('');
    getFormasPagamentoFluxos()
      .then((resposta) => {
        if (cancelado) return;
        setFormasPagamentoSolicitacao(Array.isArray(resposta?.formas) ? resposta.formas : []);
      })
      .catch((error) => {
        if (cancelado) return;
        setFormasPagamentoSolicitacao([]);
        setErroFormasPagamento(error?.message || 'Nao foi possivel carregar as formas de pagamento.');
      });

    return () => { cancelado = true; };
  }, [exibirFormaPagamento]);

  useEffect(() => {
    if (!exibirFavorecidoPagamento) {
      setFavorecidoSelecionado(null);
      setUsarCredorComoFavorecido(false);
      setForm((prev) => ({ ...prev, favorecido_id: '', favorecido_chave_pix: '' }));
    }
    if (!exibirJustificativa) {
      setForm((prev) => ({ ...prev, justificativa: '' }));
    }
  }, [exibirFavorecidoPagamento, exibirJustificativa]);

  useEffect(() => {
    if (!exibirFavorecidoPagamento || !usarCredorComoFavorecido) return;
    setFavorecidoSelecionado(parceiroSelecionado || null);
    setForm((prev) => ({
      ...prev,
      favorecido_id: parceiroSelecionado?.id ? String(parceiroSelecionado.id) : '',
      favorecido_chave_pix: pagamentoViaPix ? chavePixPreferencial(parceiroSelecionado) : ''
    }));
  }, [exibirFavorecidoPagamento, pagamentoViaPix, parceiroSelecionado, usarCredorComoFavorecido]);

  useEffect(() => {
    if (pagamentoViaBoleto) return;
    setBoletoArquivos([]);
    if (boletoRef.current) boletoRef.current.value = '';
  }, [pagamentoViaBoleto]);

  useEffect(() => {
    if (!exibirCamposContrato) {
      setForm(prev => ({
        ...prev,
        contrato_id: '',
        codigo_contrato: '',
        ref_contrato_abertura: ''
      }));
      setRefContratoBusca('');
      setRefResultados([]);
      setApropriacoesContratoRateio([]);
      setContratosRef([]);
    }
    if (!exibirCampoSubtipo) {
      setForm(prev => ({ ...prev, tipo_sub_id: '' }));
    }
    if (tipoSemValor) {
      setForm(prev => ({ ...prev, valor: '' }));
      setValorTexto('');
    }
    if (!exibirCampoApropriacao) {
      setForm(prev => ({ ...prev, apropriacao_id: '' }));
    }
    if (!permitirVinculoCredor) {
      limparParceiroSelecionado();
    }
    if (!exibirDataVencimento) {
      setForm(prev => ({ ...prev, data_vencimento: '' }));
    }
    if (!exibirDataDemissao) {
      setForm(prev => ({ ...prev, data_demissao: '' }));
    }
    if (!exibirPeriodoMedicao) {
      setForm(prev => ({ ...prev, data_inicio_medicao: '', data_fim_medicao: '' }));
    }
    if (!exibirRefContratoAbertura) {
      setForm(prev => ({ ...prev, ref_contrato_abertura: '' }));
    }
    if (!exibirItensApropriacao) {
      setForm(prev => ({ ...prev, itens_apropriacao: '' }));
    }
    if (!exibirAnexos) {
      setArquivos([]);
      if (anexosRef.current) {
        anexosRef.current.value = '';
      }
    }
  }, [
    exibirCamposContrato,
    exibirCampoSubtipo,
    tipoSemValor,
    exibirCampoApropriacao,
    exigeApropriacaoPrincipal,
    permitirVinculoCredor,
    exibirDataVencimento,
    exibirDataDemissao,
    exibirPeriodoMedicao,
    exibirRefContratoAbertura,
    exibirItensApropriacao,
    exibirAnexos
  ]);

  function formatarMoeda(valor) {
    if (Number.isNaN(valor)) return '';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function atualizarValor(raw) {
    const numeros = raw.replace(/\D/g, '');
    const valor = numeros ? Number(numeros) / 100 : 0;
    setValorTexto(numeros ? formatarMoeda(valor) : '');
    setForm(prev => ({ ...prev, valor: valor || '' }));
  }

  function parseDecimalRateio(valor) {
    if (valor === null || valor === undefined) return null;
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
    const texto = String(valor).trim();
    if (!texto) return null;
    const limpo = texto.replace(/[^\d,.-]/g, '');
    const normalizado = limpo.includes(',')
      ? limpo.replace(/\./g, '').replace(',', '.')
      : limpo;
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : null;
  }

  function arredondarCentavos(valor) {
    return Math.round((Number(valor) || 0) * 100) / 100;
  }

  function atualizarValorRateioContrato(index, raw) {
    const numeros = String(raw || '').replace(/\D/g, '');
    const valor = numeros ? Number(numeros) / 100 : 0;
    alterarApropriacaoContratoRateio(index, 'valor_rateio', numeros ? formatarMoeda(valor) : '');
  }

  function normalizarApropriacoesContratoParaRateio(contrato) {
    return (Array.isArray(contrato?.apropriacoes) ? contrato.apropriacoes : []).map((item) => ({
      apropriacao_id: String(item.apropriacao_id || item.apropriacao?.id || ''),
      codigo: item.apropriacao?.codigo || '',
      descricao: item.apropriacao?.descricao || '',
      percentual: item.percentual !== null && item.percentual !== undefined ? String(item.percentual) : '',
      valor_rateio: '',
      observacao: item.observacao || '',
      selecionado: false
    })).filter(item => item.apropriacao_id);
  }

  function getCredoresContrato(contrato) {
    return (Array.isArray(contrato?.credores) ? contrato.credores : [])
      .filter(credor => credor?.ativo !== false && (credor?.fornecedor !== false || credor?.corretor === true));
  }

  function aplicarContratoSelecionado(contrato) {
    setRetornoContrato({ aberto: false, motivo: '', processando: false, erro: '' });
    setMedicaoContratoDados(null);
    if (!contrato) {
      setForm(prev => ({
        ...prev,
        contrato_id: '',
        codigo_contrato: '',
        parceiro_id: ''
      }));
      setRefContratoBusca('');
      setApropriacoesContratoRateio([]);
      limparParceiroSelecionado();
      return;
    }

    const credores = getCredoresContrato(contrato);
    setForm(prev => ({
      ...prev,
      contrato_id: String(contrato.id),
      codigo_contrato: contrato.codigo || '',
      parceiro_id: permitirCredorAvulsoComContrato ? prev.parceiro_id : (credores.length === 1 ? String(credores[0].id) : '')
    }));
    // Contrato do fluxo novo nasce sem `ref_contrato` — a referencia dele e o proprio codigo
    // (CT-0001). Sem este fallback o campo obrigatorio ficava vazio e travava o submit da
    // medicao, mesmo com o contrato escolhido na lista.
    setRefContratoBusca(contrato.ref_contrato || contrato.codigo || '');
    setRefResultados([]);
    setApropriacoesContratoRateio(normalizarApropriacoesContratoParaRateio(contrato));
    if (permitirCredorAvulsoComContrato) {
      setParceiroResultados([]);
      setParceiroBuscaExecutada(false);
      return;
    }
    if (credores.length === 1) {
      setParceiroSelecionado(credores[0]);
      setParceiroBusca(credores[0].nome || credores[0].cpf_cnpj || '');
    } else {
      setParceiroSelecionado(null);
      setParceiroBusca('');
    }
    setParceiroResultados([]);
    setParceiroBuscaExecutada(false);
  }

  function atualizarContextoContrato(contratoId, contextoInteracao) {
    const atualizarLista = (lista) => (Array.isArray(lista) ? lista.map((item) => (
      String(item.id) === String(contratoId)
        ? {
          ...item,
          disponivel_medicao: contextoInteracao?.pode_interagir === true,
          contexto_interacao: contextoInteracao
        }
        : item
    )) : []);
    setContratos(atualizarLista);
    setContratosRef(atualizarLista);
  }

  async function solicitarRetornoDoContrato() {
    const motivo = String(retornoContrato.motivo || '').trim();
    const solicitacaoId = Number(contratoSelecionado?.solicitacao_id);
    if (!solicitacaoId || !motivo || retornoContrato.processando) return;

    setRetornoContrato((atual) => ({ ...atual, processando: true, erro: '' }));
    try {
      const resultado = await solicitarRetornoSolicitacao(solicitacaoId, motivo);
      const contextoAtual = contratoSelecionado?.contexto_interacao || {};
      const contextoAtualizado = {
        ...contextoAtual,
        pode_solicitar_retorno: false,
        pedido_retorno_pendente: resultado?.pedido || null
      };
      atualizarContextoContrato(contratoSelecionado.id, contextoAtualizado);
      setRetornoContrato({ aberto: false, motivo: '', processando: false, erro: '' });
    } catch (error) {
      setRetornoContrato((atual) => ({
        ...atual,
        processando: false,
        erro: error?.message || 'Nao foi possivel solicitar o retorno da solicitacao.'
      }));
    }
  }

  function alternarApropriacaoContratoRateio(index, checked) {
    setApropriacoesContratoRateio(prev => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, selecionado: checked } : item
    )));
  }

  function alterarApropriacaoContratoRateio(index, campo, valor) {
    setApropriacoesContratoRateio(prev => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [campo]: valor } : item
    )));
  }

  const apropriacoesRateioSelecionadas = useMemo(() => (
    apropriacoesContratoRateio.filter(item => item.selecionado && item.apropriacao_id)
  ), [apropriacoesContratoRateio]);

  async function buscarRefContrato() {
    try {
      if (!form.obra_id) {
        alert(`Selecione uma obra antes de buscar ${tipoEhDeMedicao ? 'o título do contrato' : 'a ref. do contrato'}.`);
        setRefResultados([]);
        setContratosRef([]);
        return;
      }

      const termo = refContratoBusca.trim();
      if (!termo) return;
      const listaBase = Array.isArray(contratos) ? contratos : [];
      const termoNormalizado = termo
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
      const lista = listaBase.filter(item => {
        const ref = String(item?.ref_contrato || '');
        const refNormalizada = ref
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase();
        return refNormalizada.includes(termoNormalizado);
      });

      if (lista.length === 0) {
        alert('Nenhuma referencia encontrada');
        setRefResultados([]);
        setContratosRef([]);
        return;
      }
      setRefResultados(lista);
      setContratosRef(lista);
      if (lista.length === 1) {
        selecionarContratoRef(lista[0]);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao buscar referencia de contrato');
    }
  }

  function selecionarContratoRef(contrato) {
    aplicarContratoSelecionado(contrato);
  }

  function limparRefContrato() {
    setRefContratoBusca('');
    setRefResultados([]);
    setContratosRef([]);
    setForm(prev => ({ ...prev, contrato_id: '', codigo_contrato: '', parceiro_id: '' }));
    setApropriacoesContratoRateio([]);
    limparParceiroSelecionado();
  }

  function removerArquivo(index) {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  }

  function adicionarArquivos(files) {
    const lista = Array.from(files || []).filter(Boolean);
    const tiposInvalidos = lista.filter((file) => !arquivoDocumentoPermitido(file));
    const tiposValidos = lista.filter((file) => arquivoDocumentoPermitido(file));
    const { arquivos: proximoEstado, rejeitados } = concatenarAnexosPendentes(arquivos, tiposValidos, {
      maxFileSizeMb: UPLOAD_MAX_FILE_SIZE_MB_PADRAO
    });
    setArquivos(proximoEstado);
    if (tiposInvalidos.length > 0) {
      alert(montarMensagemTiposArquivoNaoPermitidos(tiposInvalidos));
    }
    if (rejeitados.length > 0) {
      alert(montarMensagemArquivosAcimaDoLimite(rejeitados, UPLOAD_MAX_FILE_SIZE_MB_PADRAO));
    }
  }

  function selecionarArquivoBoleto(files) {
    const lista = Array.from(files || []).filter(Boolean);
    const { arquivos: aceitos, rejeitados } = concatenarAnexosPendentes([], lista.slice(0, 1), {
      maxFileSizeMb: UPLOAD_MAX_FILE_SIZE_MB_PADRAO
    });
    setBoletoArquivos(aceitos);
    if (lista.length > 1) {
      alert('Selecione somente um arquivo de boleto.');
    }
    if (rejeitados.length > 0) {
      alert(montarMensagemArquivosAcimaDoLimite(rejeitados, UPLOAD_MAX_FILE_SIZE_MB_PADRAO));
    }
  }

  function selecionarObra(obra) {
    setForm(prev => ({
      ...prev,
      obra_id: String(obra.id),
      contrato_id: '',
      codigo_contrato: '',
      parceiro_id: '',
      apropriacao_id: '',
      itens_apropriacao: ''
    }));
    setObraBusca(formatarRotuloBuscaObra(obra));
    setObraBuscaAtiva(false);
    limparParceiroSelecionado();
  }

  const obrasFiltradas = useMemo(() => {
    const termo = normalizarBusca(obraBusca);
    if (!termo) return [];

    return obras
      .filter((obra) => {
        const codigo = normalizarBusca(obra.codigo);
        const nome = normalizarBusca(obra.nome);
        const cidade = normalizarBusca(formatarLocalidadeObra(obra));
        return codigo.includes(termo) || nome.includes(termo) || cidade.includes(termo);
      })
      .slice(0, 8);
  }, [obras, obraBusca]);

  const mostrarSugestoesObra = useMemo(() => {
    const termo = normalizarBusca(obraBusca);
    if (!obraBuscaAtiva || !termo) return false;
    if (!obraSelecionada) return true;
    return termo !== normalizarBusca(formatarRotuloBuscaObra(obraSelecionada));
  }, [obraBusca, obraBuscaAtiva, obraSelecionada]);

  function handleChangeBuscaObra(valor) {
    setObraBusca(valor);
    setObraBuscaAtiva(true);

    if (!obraSelecionada) return;

    const termoSelecionado = normalizarBusca(formatarRotuloBuscaObra(obraSelecionada));
    if (normalizarBusca(valor) !== termoSelecionado) {
      limparSelecaoObraERegras();
    }
  }

  function handleBlurBuscaObra() {
    obraBuscaBlurTimeoutRef.current = setTimeout(() => {
      setObraBuscaAtiva(false);
    }, 120);
  }

  function handleFocusBuscaObra() {
    if (obraBuscaBlurTimeoutRef.current) {
      clearTimeout(obraBuscaBlurTimeoutRef.current);
    }
    setObraBuscaAtiva(true);
  }

  function handleKeyDownBuscaObra(event) {
    if (event.key !== 'Enter') return;
    if (obrasFiltradas.length !== 1) return;
    event.preventDefault();
    selecionarObra(obrasFiltradas[0]);
  }

  /**
   * `confirmadoNaConferencia` fecha o ciclo do modal de credores: o mesmo submit roda duas vezes
   * acima do limite — a primeira abre a conferencia e para, a segunda (disparada pelo botao do
   * modal) cria. Sem o parametro, seria preciso duplicar toda a validacao num segundo caminho.
   */
  async function handleSubmit(e, { confirmadoNaConferencia = false } = {}) {
    e?.preventDefault?.();

    if (!form.obra_id) {
      alert('Selecione uma obra/centro de custo');
      return;
    }

    if (tipoEhDeMedicao && contratoSelecionadoMedicaoBloqueada) {
      alert(
        `A solicitacao deste contrato esta no setor ${contratoSelecionado?.contexto_interacao?.setor_atual || 'responsavel atual'}. `
        + 'Solicite o retorno antes de registrar a medicao.'
      );
      return;
    }

    if (usaFluxoRecargaCartao && !cartaoRecargaId) {
      alert('Selecione o cartão que receberá a recarga.');
      return;
    }
    if (usaFluxoRecargaCartao && recargaCartaoContexto?.bloqueado) {
      alert(recargaCartaoContexto.motivo_bloqueio || 'Conclua a recarga anterior antes de solicitar uma nova.');
      return;
    }

    if (usaApropriacaoAutomaticaObra && apropriacaoAutomatica.status === 'loading') {
      alert('Aguarde a conferencia da apropriacao automatica da obra.');
      return;
    }
    if (usaApropriacaoAutomaticaObra && !apropriacaoAutomatica.apropriacao) {
      alert(apropriacaoAutomatica.erro || 'Configure a apropriacao padrao desta obra antes de criar a solicitacao.');
      return;
    }

    // No fluxo novo de contrato a apropriacao virou RATEIO (19/08): quem cumpre a exigencia sao as
    // linhas do rateio, nao o campo unico — que nem e exibido nesse caminho. Validar o campo unico
    // aqui barrava o contrato mesmo com o rateio preenchido.
    const temApropriacao = usaFluxoContratoNovo
      ? rateioContrato.some((l) => l.apropriacao_id)
      : Boolean(form.apropriacao_id);
    if (exigeApropriacaoPrincipal && !temApropriacao) {
      alert(usaFluxoContratoNovo
        ? 'Informe ao menos uma apropriacao no rateio do contrato.'
        : 'Selecione a apropriação principal da solicitação.');
      return;
    }

    if (subtipoObrigatorio && exibirCampoSubtipo && !form.tipo_sub_id) {
      alert('Para continuar, selecione o subtipo.');
      return;
    }
    if (valorObrigatorio && (form.valor === '' || form.valor === null || form.valor === undefined)) {
      alert('Informe o valor da solicitação.');
      return;
    }
    if (medicaoObrigatoria && (!form.data_inicio_medicao || !form.data_fim_medicao)) {
      alert('Para Medicao, informe data inicial e data final.');
      return;
    }
    if (dataVencimentoExigida && !form.data_vencimento) {
      alert(usaFluxoRecargaCartao ? 'Informe a data prevista para recarga.' : 'Informe a Data Resposta/Pagamento.');
      return;
    }
    if (dataDemissaoObrigatoria && !form.data_demissao) {
      alert('Informe a data de demissao.');
      return;
    }
    if (camposContratoObrigatorios && !form.contrato_id) {
      alert('Selecione um contrato.');
      return;
    }
    if (camposContratoObrigatorios && !refContratoBusca.trim()) {
      alert(`Informe ${tipoEhDeMedicao ? 'o título do contrato' : 'a ref. do contrato'}.`);
      return;
    }
    if (itensApropriacaoObrigatorio && !form.itens_apropriacao && apropriacoesRateioSelecionadas.length === 0) {
      alert('Para Abertura de Contrato, informe os itens de apropriacao ou selecione as apropriacoes do contrato.');
      return;
    }
    if (apropriacoesContratoExigidas && apropriacoesRateioSelecionadas.length === 0) {
      alert('Selecione ao menos uma apropriacao do contrato para esta solicitacao.');
      return;
    }
    if (refContratoAberturaObrigatoria && !form.ref_contrato_abertura) {
      alert('Para Abertura de Contrato, informe a ref do contrato.');
      return;
    }
    if (campoObrigatorio('credor') && !form.parceiro_id) {
      alert('Selecione o credor da solicitação.');
      return;
    }
    if (formaPagamentoObrigatoria && !form.forma_pagamento_id) {
      alert('Selecione a forma de pagamento.');
      return;
    }
    if (favorecidoObrigatorio && !form.favorecido_id) {
      alert('Selecione o favorecido do pagamento.');
      return;
    }
    if (pagamentoViaPix && !String(form.favorecido_chave_pix || '').trim()) {
      alert('Informe a chave PIX do favorecido.');
      return;
    }
    if (pagamentoViaBoleto && boletoArquivos.length === 0) {
      alert('Anexe o boleto para usar esta forma de pagamento.');
      return;
    }
    if (justificativaObrigatoria && !form.justificativa.trim()) {
      alert('Informe a justificativa da solicitação.');
      return;
    }

    if (exibirCampoDataVencimento && form.data_vencimento && String(form.data_vencimento) < String(hojeInput)) {
      alert('Data Resposta/Pagamento não pode ser menor que a data atual.');
      return;
    }

    // Medicao de contrato do fluxo novo: sem parcela marcada nao ha o que medir, e o saldo
    // e conferido aqui so para avisar antes de enviar — quem decide e o backend.
    if (usaMedicaoFluxoNovo) {
      if (!(medicaoContratoDados?.itens || []).length) {
        alert('Selecione ao menos uma parcela do contrato para medir.');
        return;
      }
      if (medicaoContratoDados?.excedeSaldo) {
        alert('O total selecionado passa do saldo do contrato.');
        return;
      }
      // Os dados de pagamento sao cobrados aqui tambem para a pessoa nao descobrir depois de montar
      // a medicao inteira. Quem recusa de verdade e o servidor.
      const pgto = medicaoContratoDados?.pagamento || {};
      if (!pgto.forma_pagamento_id) { alert('Informe a forma de pagamento da medicao.'); return; }
      if (!pgto.favorecido_id) { alert('Informe o favorecido desta medicao.'); return; }
      if (pgto.via_pix && !String(pgto.favorecido_chave_pix || '').trim()) {
        alert('Informe a chave PIX do favorecido.'); return;
      }
      if (pgto.via_boleto && !String(pgto.boleto_anexo_nome || '').trim()) {
        alert('Anexe o boleto desta medicao.'); return;
      }
      if (!pgto.via_pix && !pgto.via_boleto && !String(pgto.favorecido_contato || '').trim()) {
        alert('Informe os dados para pagamento desta medicao.'); return;
      }
      if (!pgto.dados_confirmados) {
        alert('Confirme que os dados de pagamento estao corretos antes de enviar a medicao.'); return;
      }
    }

    // Vale para medicao nova e legada. No fluxo novo o boleto pode ser o proprio documento
    // obrigatorio; nas demais formas, ao menos um arquivo deve estar no campo unico de anexos.
    const anexosPendentesMedicao = [...arquivos, ...boletoArquivos];
    if (tipoEhDeMedicao && anexosPendentesMedicao.length === 0) {
      alert('Anexe ao menos um arquivo para enviar a solicitacao de medicao.');
      return;
    }
    if (!tipoEhDeMedicao && anexosObrigatorios && arquivos.length === 0) {
      alert('Anexe ao menos um comprovante da despesa.');
      return;
    }

    if (usaFluxoDespesaEventual) {
      if (despesaEventualSaldo.status !== 'success' || !despesaEventualSaldo.dados) {
        alert(despesaEventualSaldo.erro || 'Aguarde o cálculo do saldo de Despesa Eventual da obra.');
        return;
      }
      const valorDespesa = Number(form.valor || 0);
      if (valorDespesa > Number(despesaEventualSaldo.dados.limite_solicitacao || 0)) {
        alert('O valor informado ultrapassa o limite por solicitação.');
        return;
      }
      if (valorDespesa > Number(despesaEventualSaldo.dados.saldo_obra || 0)) {
        alert('O valor informado ultrapassa o saldo de Despesa Eventual desta obra.');
        return;
      }
      if (Object.values(despesaEventualDeclaracoes).some((confirmado) => confirmado !== true)) {
        alert('Confirme todas as declarações obrigatórias da Despesa Eventual.');
        return;
      }
    }

    if (descricaoExigida && !form.descricao.trim()) {
      alert('Informe o título da solicitação.');
      return;
    }

    // Na medicao do fluxo novo o bloco de rateio nem aparece; a guarda existe para o caso de uma
    // selecao ter ficado no estado de antes da troca de contrato.
    if (!usaMedicaoFluxoNovo && apropriacoesRateioSelecionadas.length > 0) {
      const valorTotalSolicitacao = arredondarCentavos(parseDecimalRateio(form.valor));
      if (!valorTotalSolicitacao || valorTotalSolicitacao <= 0) {
        alert('Informe o valor total da solicitacao para validar o rateio das apropriacoes.');
        return;
      }

      const comPercentual = apropriacoesRateioSelecionadas.filter(item => parseDecimalRateio(item.percentual) !== null);
      const comValor = apropriacoesRateioSelecionadas.filter(item => parseDecimalRateio(item.valor_rateio) !== null);
      const possuiDoisCriterios = apropriacoesRateioSelecionadas.some(item => (
        parseDecimalRateio(item.percentual) !== null &&
        parseDecimalRateio(item.valor_rateio) !== null
      ));

      if (possuiDoisCriterios) {
        alert('Informe o rateio usando apenas percentual ou apenas valor em R$ por apropriacao.');
        return;
      }

      if (comPercentual.length === apropriacoesRateioSelecionadas.length) {
        const totalPercentual = comPercentual.reduce((acc, item) => acc + Number(parseDecimalRateio(item.percentual) || 0), 0);
        if (comPercentual.some(item => Number(parseDecimalRateio(item.percentual) || 0) <= 0) || Math.abs(totalPercentual - 100) > 0.0001) {
          alert('A soma dos percentuais do rateio deve ser exatamente 100%.');
          return;
        }
      } else if (comValor.length === apropriacoesRateioSelecionadas.length) {
        const totalValorRateio = arredondarCentavos(comValor.reduce((acc, item) => acc + Number(parseDecimalRateio(item.valor_rateio) || 0), 0));
        if (comValor.some(item => Number(parseDecimalRateio(item.valor_rateio) || 0) <= 0) || totalValorRateio !== valorTotalSolicitacao) {
          alert('A soma dos valores em R$ do rateio deve ser igual ao valor total da solicitacao.');
          return;
        }
      } else {
        alert('Todas as apropriacoes selecionadas devem usar o mesmo criterio de rateio: percentual ou valor em R$.');
        return;
      }
    }

    if (criandoSolicitacaoRef.current) {
      return;
    }
    // Fluxo novo de contratos (D38): cria o CONTRATO pelo endpoint auditado em vez da
    // solicitacao padrao. Obra, credor, valor, descricao e apropriacao principal vem do
    // formulario; o bloco fornece categoria, condicao, parcelas e detalhes.
    if (usaFluxoContratoNovo) {
      const d = contratoNovoDados || {};
      if (!form.parceiro_id) { alert('Selecione o credor do contrato.'); return; }
      const camposObrigatoriosContrato = [
        ['contrato_objeto', d.objeto, 'Informe o objeto do contrato.'],
        ['contrato_justificativa', d.justificativa, 'Informe a justificativa da contratacao.'],
        ['contrato_responsavel', d.responsavel_id, 'Selecione o responsavel pela contratacao.'],
        ['contrato_vigencia_inicio', d.vigencia_inicio, 'Informe a vigencia inicial do contrato.'],
        ['contrato_vigencia_fim', d.vigencia_fim, 'Informe a vigencia final do contrato.']
      ];
      const campoContratoPendente = camposObrigatoriosContrato.find(
        ([campoId, valor]) => campoObrigatorio(campoId) && !String(valor || '').trim()
      );
      if (campoContratoPendente) { alert(campoContratoPendente[2]); return; }
      // O rateio precisa fechar ANTES de enviar: o backend recusaria, mas a pessoa perderia o
      // formulario inteiro para descobrir um erro de digitacao.
      const linhasRateio = rateioContrato.filter((l) => l.apropriacao_id);
      if (linhasRateio.length === 0) { alert('Informe ao menos uma apropriacao para o contrato.'); return; }
      // As duas colunas (% e R$) ficam em sincronia na tela, entao basta conferir uma. O
      // percentual e a que vale, porque e ele que vai gravado.
      const somaPercentual = linhasRateio.reduce((acc, l) => acc + (numeroDoCampo(l.percentual) || 0), 0);
      if (Math.abs(somaPercentual - 100) >= 0.001) {
        alert('O rateio da apropriacao deve fechar 100% (ou o valor total do contrato).');
        return;
      }
      if (!d.qtde_parcelas || !d.primeiro_vencimento) { alert('Informe a quantidade de parcelas e o 1o vencimento.'); return; }
      const qtde = Number(d.qtde_parcelas);
      if (!Number.isInteger(qtde) || qtde < 1 || qtde > MAXIMO_PARCELAS_CONTRATO) {
        alert(`A quantidade de parcelas deve ser um numero inteiro de 1 a ${MAXIMO_PARCELAS_CONTRATO}.`); return;
      }
      // Continua valendo para a CONFERENCIA de cadastro logo abaixo, que so acontece acima do
      // limite — a negociacao e que deixou de olhar o valor.
      const acimaDoLimite = Number(form.valor) > limiteJuridico;

      // A negociacao detalhada agora e documento e vale para TODO contrato (item 7, 23/08). O
      // backend cobra de novo na aprovacao — este aviso existe para a pessoa nao descobrir depois
      // de o contrato ja estar criado.
      if (!d.negociacao_arquivo) {
        alert('Anexe o documento da negociacao detalhada: ele e obrigatorio em todo contrato.'); return;
      }
      if (acimaDoLimite) {
        const documentosObrigatorios = [
          ['Cartao CNPJ', d.cartao_cnpj_arquivo],
          ['Ato constitutivo', d.ato_constitutivo_arquivo],
          ['Documentos do representante legal', d.documentos_representante_legal_arquivo]
        ];
        const documentosFaltantes = documentosObrigatorios.filter(([, arquivo]) => !arquivo).map(([nome]) => nome);
        if (documentosFaltantes.length > 0) {
          alert(`Anexe a documentacao juridica obrigatoria: ${documentosFaltantes.join(', ')}.`); return;
        }

        const qualificacao = d.representante_legal_qualificacao || {};
        const camposQualificacao = [
          ['nome completo', qualificacao.nome],
          ['CPF', qualificacao.cpf],
          ['RG', qualificacao.rg],
          ['cargo ou funcao', qualificacao.cargo],
          ['nacionalidade', qualificacao.nacionalidade],
          ['estado civil', qualificacao.estado_civil],
          ['profissao', qualificacao.profissao]
        ];
        const qualificacaoFaltante = camposQualificacao
          .filter(([, valor]) => !String(valor || '').trim())
          .map(([nome]) => nome);
        if (qualificacaoFaltante.length > 0) {
          alert(`Complete a qualificacao do representante legal: ${qualificacaoFaltante.join(', ')}.`); return;
        }
        if (qualificacao.estado_civil === 'CASADO') {
          const conjuge = qualificacao.conjuge || {};
          const camposConjuge = [
            ['nome completo', conjuge.nome],
            ['CPF', conjuge.cpf],
            ['RG', conjuge.rg],
            ['nacionalidade', conjuge.nacionalidade],
            ['profissao', conjuge.profissao],
            ['regime de bens', conjuge.regime_bens]
          ];
          const dadosConjugeFaltantes = camposConjuge
            .filter(([, valor]) => !String(valor || '').trim())
            .map(([nome]) => nome);
          if (dadosConjugeFaltantes.length > 0) {
            alert(`Complete os dados do conjuge: ${dadosConjugeFaltantes.join(', ')}.`); return;
          }
        }
      }
      // Portao do valor minimo por parcela: a previa deixa digitar livremente (senao nao da
      // para escrever "0,50"), entao a cobranca acontece aqui, antes de enviar.
      const parcelaInvalida = (d.parcelas || []).find((pc) => !(Number(pc.valor) > 0));
      if (parcelaInvalida) {
        alert(`A parcela ${parcelaInvalida.numero} deve ser de no minimo R$ 0,01.`); return;
      }

      // Acima do limite o contrato vai ao Juridico, que monta a minuta a partir do cadastro do
      // contratado — e 98% dos fornecedores estao sem endereco completo. A conferencia acontece
      // aqui, com a chance de corrigir, e nao la na frente com a minuta parada.
      if (acimaDoLimite && !confirmadoNaConferencia) {
        // `d.parceiros` e a lista de ids dos contratados que o bloco emite. Favorecido nao entra
        // nesta conferencia porque sera escolhido na medicao, quando o pagamento for solicitado.
        const ids = [Number(form.parceiro_id), ...(d.parceiros || []).map(Number)]
          .filter((n) => Number.isInteger(n) && n > 0);
        setCredoresParaConferir([...new Set(ids)]);
        setModalCredoresAberto(true);
        return;
      }

      criandoSolicitacaoRef.current = true;
      setCriandoSolicitacao(true);
      // A mesma chave do fluxo padrao: o ref acima so protege o duplo clique nesta aba;
      // retry de rede sem chave duplicaria o contrato (M3 da auditoria).
      const idempotencyKeyContrato = criarChaveIdempotenciaSolicitacao();
      try {
        const apropriacoesDoContrato = rateioContrato
          .filter((l) => l.apropriacao_id)
          .map((l) => ({
            apropriacao_id: Number(l.apropriacao_id),
            percentual: Number((numeroDoCampo(l.percentual) || 0).toFixed(4))
          }));

        const r = await criarContratoFluxoNovo({
          obra_id: Number(form.obra_id),
          parceiro_id: Number(form.parceiro_id),
          // Contratados (o do formulario + os do bloco). Os dados do pagamento pertencem a
          // medicao e nao sao antecipados na abertura do contrato.
          parceiros: (d.parceiros || []).map(Number).filter(Boolean),
          descricao: exibirDescricao ? form.descricao : null,
          // O titulo e a referencia do contrato: e o texto que a Medicao pesquisa depois.
          ref_contrato: exibirDescricao ? form.descricao : null,
          valor_total: form.valor,
          qtde_parcelas: Number(d.qtde_parcelas),
          primeiro_vencimento: d.primeiro_vencimento,
          // Data operacional exibida na lista de solicitacoes. Nao se confunde com os
          // vencimentos individuais do cronograma de parcelas do contrato.
          data_vencimento: exibirDataVencimento ? (form.data_vencimento || null) : null,
          // PI-16: a categoria financeira NAO vai mais daqui. Quem abre o contrato e o usuario da
          // obra, que nao conhece o plano financeiro da empresa — ela passou a ser informada por
          // quem APROVA, no detalhe da solicitacao, e a aprovacao e barrada sem ela.
          // O setor que recebe a solicitacao do contrato. Codigo do setor, nao nome.
          area_responsavel: form.area_responsavel,
          detalhes_contratacao: d.detalhes_contratacao,
          representante_legal_qualificacao: acimaDoLimite ? d.representante_legal_qualificacao : null,
          // Campos do escopo 3.1/3.2 — as colunas ja existiam; faltava o caminho da tela.
          objeto: campoVisivel('contrato_objeto') ? (d.objeto || null) : null,
          justificativa: campoVisivel('contrato_justificativa') ? (d.justificativa || null) : null,
          responsavel_id: campoVisivel('contrato_responsavel') && d.responsavel_id ? Number(d.responsavel_id) : null,
          vigencia_inicio: campoVisivel('contrato_vigencia_inicio') ? (d.vigencia_inicio || null) : null,
          vigencia_fim: campoVisivel('contrato_vigencia_fim') ? (d.vigencia_fim || null) : null,
          // D38-a: o fluxo deriva do subtipo por id vinculado — persiste o vinculo
          tipo_macro_id: Number(form.tipo_solicitacao_id),
          tipo_sub_id: form.tipo_sub_id ? Number(form.tipo_sub_id) : null,
          // Rateio da apropriacao (19/08): N apropriacoes, por % ou por R$.
          //
          // Vai como PERCENTUAL mesmo quando a pessoa digita R$: um rateio em reais e uma
          // proporcao do total, e e proporcionalmente que cada PARCELA precisa ser dividida.
          // A aritmetica fina fica no backend (`montarRateios`), que divide em centavos com a
          // sobra na ultima — aqui nao se recalcula nada disso.
          apropriacoes: apropriacoesDoContrato,
          parcelas: (d.parcelas || []).map((pc) => ({ numero: pc.numero, valor: pc.valor, vencimento: pc.vencimento }))
        }, { idempotencyKey: idempotencyKeyContrato });

        // Anexos vao para o CONTRATO criado (endpoint auditado), espelhando o fluxo
        // padrao: se o upload falhar, o usuario e avisado — nunca descartado em silencio
        // (A1 da auditoria: o arquivo sumia sem requisicao, sem registro e sem aviso).
        const idContrato = r?.contrato?.id;

        // A negociacao detalhada sobe ANTES dos anexos avulsos: sem ela o contrato nao pode ser
        // aprovado, entao falhar aqui e um problema maior do que falhar num anexo qualquer.
        if (d.negociacao_arquivo && idContrato) {
          try {
            await uploadNegociacaoContrato(idContrato, d.negociacao_arquivo);
          } catch (erroNegociacao) {
            console.error(erroNegociacao);
            alert(`O contrato ${r?.contrato?.codigo || idContrato} foi criado, mas a negociacao detalhada NAO foi enviada (${erroNegociacao.message}). Sem ela o contrato nao pode ser aprovado: abra o contrato e envie o documento.`);
            navigate('/gestao-contratos', { replace: true });
            return;
          }
        }

        if (acimaDoLimite && idContrato) {
          try {
            await Promise.all([
              uploadDocumentacaoJuridicaContrato(idContrato, 'cartao-cnpj', d.cartao_cnpj_arquivo),
              uploadDocumentacaoJuridicaContrato(idContrato, 'ato-constitutivo', d.ato_constitutivo_arquivo),
              uploadDocumentacaoJuridicaContrato(idContrato, 'representante-legal', d.documentos_representante_legal_arquivo)
            ]);
          } catch (erroDocumentacao) {
            console.error(erroDocumentacao);
            alert(`O contrato ${r?.contrato?.codigo || idContrato} foi criado, mas a documentacao juridica nao foi enviada por completo (${erroDocumentacao.message}). O contrato permanecera bloqueado para aprovacao ate o dossie ser completado.`);
            navigate('/gestao-contratos', { replace: true });
            return;
          }
        }

        if (exibirAnexos && arquivos.length > 0 && idContrato) {
          try {
            await uploadContratoAnexos(idContrato, extrairFilesAnexosPendentes(arquivos));
          } catch (uploadError) {
            console.error(uploadError);
            alert(`O contrato ${r?.contrato?.codigo || idContrato} foi criado, mas os anexos nao foram enviados. Abra o contrato em Gestao de Contratos e envie os anexos novamente.`);
            navigate('/gestao-contratos', { replace: true });
            return;
          }
        }

        alert(`Contrato ${r?.contrato?.codigo || ''} criado — aguardando aprovacao.`);
        // O contrato do fluxo novo nao aparece na lista de solicitacoes: mandar para la
        // deixava a instrucao de "abra o contrato" sem alvo (N5).
        navigate('/gestao-contratos', { replace: true });
      } catch (error) {
        alert(error?.message || 'Erro ao criar contrato.');
      } finally {
        criandoSolicitacaoRef.current = false;
        setCriandoSolicitacao(false);
      }
      return;
    }

    criandoSolicitacaoRef.current = true;
    setCriandoSolicitacao(true);
    const idempotencyKey = criarChaveIdempotenciaSolicitacao();

    const payload = {
      ...form,
      parceiro_id: permitirVinculoCredor ? (form.parceiro_id || null) : null,
      favorecido_id: exibirFavorecidoPagamento ? (form.favorecido_id || null) : null,
      forma_pagamento_id: exibirFormaPagamento ? (form.forma_pagamento_id || null) : null,
      favorecido_chave_pix: pagamentoViaPix
        ? String(form.favorecido_chave_pix || '').trim()
        : null,
      boleto_anexo_nome: pagamentoViaBoleto ? (boletoArquivos[0]?.nome || null) : null,
      despesa_eventual_declaracoes: usaFluxoDespesaEventual ? despesaEventualDeclaracoes : undefined,
      cartao_recarga_id: usaFluxoRecargaCartao ? Number(cartaoRecargaId) : undefined,
      justificativa: exibirJustificativa ? form.justificativa : null,
      apropriacao_id: exibirCampoApropriacao ? (form.apropriacao_id || null) : null,
      contrato_id: exibirCamposContrato ? (form.contrato_id || null) : null,
      tipo_sub_id: exibirCampoSubtipo ? (form.tipo_sub_id || null) : null,
      tipo_macro_id: form.tipo_solicitacao_id || null,
      data_vencimento: exibirDataVencimento ? (form.data_vencimento || null) : null,
      data_demissao: exibirDataDemissao ? (form.data_demissao || null) : null,
      data_inicio_medicao: exibirPeriodoMedicao ? (form.data_inicio_medicao || null) : null,
      data_fim_medicao: exibirPeriodoMedicao ? (form.data_fim_medicao || null) : null,
      itens_apropriacao: exibirItensApropriacao ? (form.itens_apropriacao || null) : null,
      ref_contrato_abertura: exibirRefContratoAbertura ? (form.ref_contrato_abertura || null) : null,
      descricao: exibirDescricao ? form.descricao : '',
      // Parcelas consumidas pela medicao (wireframe 2). O backend valida antes de gravar a
      // solicitacao e aplica na sequencia.
      medicao_parcelas: usaMedicaoFluxoNovo ? (medicaoContratoDados?.itens || []) : undefined,
      // Dados de pagamento DA MEDICAO (itens 5 e 9, 23/08): favorecido, chave PIX, forma, contato e
      // o aceite. O backend recusa a medicao sem eles.
      medicao_pagamento: usaMedicaoFluxoNovo ? (medicaoContratoDados?.pagamento || {}) : undefined,
      // O endpoint historico recebe JSON e o upload ocorre logo depois. A API valida que havia
      // arquivo selecionado; na aprovacao, o backend confere o anexo efetivamente gravado.
      anexos_pendentes_nomes: tipoEhDeMedicao
        ? anexosPendentesMedicao.map((arquivo) => arquivo.nome).filter(Boolean)
        : (arquivos.length > 0 ? arquivos.map((arquivo) => arquivo.nome).filter(Boolean) : undefined),
      apropriacoes_rateio: exibirCamposContrato
        ? apropriacoesRateioSelecionadas.map(item => ({
            apropriacao_id: item.apropriacao_id,
            percentual: String(item.percentual || '').trim() || null,
            valor_rateio: String(item.valor_rateio || '').trim() || null,
            observacao: String(item.observacao || '').trim() || null
          }))
        : []
    };

    try {
      const solicitacao = await createSolicitacao(payload, { idempotencyKey });

      if (!solicitacao?.id) {
        throw new Error('Solicitacao criada, mas a API nao retornou o identificador para abrir o detalhe.');
      }
      const medicaoIdCriada = Number(solicitacao?.medicao?.id || 0) || null;

      if (pagamentoViaBoleto && boletoArquivos.length > 0) {
        try {
          await uploadArquivos({
            files: extrairFilesAnexosPendentes(boletoArquivos),
            solicitacao_id: solicitacao.id,
            medicao_id: medicaoIdCriada,
            tipo: 'BOLETO',
            criacao_upload_token: solicitacao.criacao_upload_token || null
          });
        } catch (uploadError) {
          console.error(uploadError);
          alert(`A solicitacao ${solicitacao.codigo || solicitacao.id} foi criada, mas o boleto nao foi enviado. Abra a solicitacao e anexe o boleto novamente.`);
          navigate(`/solicitacoes/${solicitacao.id}`, { replace: true });
          return;
        }
      }

      if (exibirAnexos && arquivos.length > 0) {
        try {
          await uploadArquivos({
            files: extrairFilesAnexosPendentes(arquivos),
            solicitacao_id: solicitacao.id,
            medicao_id: medicaoIdCriada,
            tipo: 'SOLICITACAO',
            criacao_upload_token: solicitacao.criacao_upload_token || null
          });
        } catch (uploadError) {
          console.error(uploadError);
          alert(`A solicitacao ${solicitacao.codigo || solicitacao.id} foi criada, mas os anexos nao foram enviados. Abra a solicitacao e envie os anexos novamente.`);
          navigate(`/solicitacoes/${solicitacao.id}`, { replace: true });
          return;
        }
      }

      navigate(`/solicitacoes/${solicitacao.id}`, { replace: true });
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao criar solicitação');
    } finally {
      criandoSolicitacaoRef.current = false;
      setCriandoSolicitacao(false);
    }
  }

  const isSetorObra = userHasSetorCapability(user, 'eh_setor_obra');
  const tokensSetorUsuario = useMemo(() => {
    return Array.from(new Set([
      String(user?.setor?.codigo || '').toUpperCase(),
      String(user?.setor?.nome || '').toUpperCase(),
      String(user?.area || '').toUpperCase(),
      String(user?.setor_id || '').toUpperCase()
    ].filter(Boolean)));
  }, [user]);
  const destinosPermitidosPorSetorOrigem = useMemo(() => {
    const destinos = new Set();
    tokensSetorUsuario.forEach(token => {
      const lista = areasPorSetorOrigem?.[token];
      if (Array.isArray(lista)) {
        lista.forEach(item => destinos.add(String(item || '').toUpperCase()));
      }
    });
    return destinos;
  }, [tokensSetorUsuario, areasPorSetorOrigem]);
  const setoresFiltrados = useMemo(() => {
    let lista = [...setores];

    if (destinosPermitidosPorSetorOrigem.size > 0) {
      lista = lista.filter(s => destinosPermitidosPorSetorOrigem.has(String(s.codigo || '').toUpperCase()));
    }

    if (isSetorObra && areasObra && areasObra.length > 0) {
      const permitidasObra = new Set(areasObra.map(a => String(a).toUpperCase()));
      lista = lista.filter(s => permitidasObra.has(String(s.codigo || '').toUpperCase()));
    }

    return lista;
  }, [setores, isSetorObra, areasObra, destinosPermitidosPorSetorOrigem]);
  const contratosDisponiveis = contratosRef.length > 0 ? contratosRef : contratos;
  const contratoSelecionado = useMemo(() => {
    if (!form.contrato_id) return null;
    return [...contratosDisponiveis, ...contratos, ...contratosRef]
      .find(item => String(item.id) === String(form.contrato_id)) || null;
  }, [form.contrato_id, contratosDisponiveis, contratos, contratosRef]);

  // MD-2/MD-3: a bifurcacao da medicao le o marcador do CONTRATO escolhido. Contrato sem
  // marcador (os 335 existentes) cai na trilha antiga, que nao muda em nada.
  const contratoSelecionadoEhFluxoNovo = Boolean(contratoSelecionado?.fluxo_novo);
  const contratoSelecionadoMedicaoBloqueada = Boolean(
    contratoSelecionadoEhFluxoNovo
    && contratoSelecionado?.disponivel_medicao === false
  );
  const usaMedicaoFluxoNovo = exibirCamposContrato && Boolean(form.contrato_id) && contratoSelecionadoEhFluxoNovo;

  // MEDICAO DO FLUXO NOVO NAO TEM VALOR, TITULO NEM VENCIMENTO PROPRIOS (pedido do cliente, 20/08).
  //
  // Ela nao cria solicitacao: o backend intercepta e a transforma num evento da solicitacao unica
  // do contrato (PI-16). O valor vem da soma das parcelas marcadas e o vencimento vem de cada
  // parcela — os tres campos eram preenchidos, validados e descartados.
  //
  // O periodo (data inicial/final) CONTINUA valendo, mas sobe para o topo do card da medicao, ao
  // lado da tabela que ele data. O estado segue sendo o mesmo (`form.data_inicio_medicao` /
  // `data_fim_medicao`): dar estado proprio ao card faria a validacao conferir um valor e o envio
  // mandar outro.
  //
  // Contrato LEGADO nao entra em nada disto — a medicao dele cria solicitacao propria.
  const exibirValor = !tipoSemValor && !usaMedicaoFluxoNovo;
  const valorObrigatorio = exibirValor && !tipoSemValor;
  const exibirCampoDescricao = exibirDescricao && !usaMedicaoFluxoNovo;
  const descricaoExigida = descricaoObrigatoria && !usaMedicaoFluxoNovo;
  const exibirCampoDataVencimento = exibirDataVencimento && !usaMedicaoFluxoNovo;
  const dataVencimentoExigida = dataVencimentoObrigatoria && !usaMedicaoFluxoNovo;
  // Fora do fluxo novo o par continua onde sempre esteve: o card nao existe para recebe-lo.
  const exibirPeriodoMedicaoSolto = exibirPeriodoMedicao && !usaMedicaoFluxoNovo;
  // Campo que nao aparece nao pode ser exigido: o bloco de rateio some na medicao do fluxo novo, e
  // sem esta linha o envio ficaria travado por uma selecao que a pessoa nao tem como fazer.
  const apropriacoesContratoExigidas = apropriacoesContratoObrigatorias && !usaMedicaoFluxoNovo;
  // PI-15: o termo aditivo e pedido por um botao AQUI, na tela de medicao, e vale para contrato
  // do fluxo ANTIGO e do NOVO — por isso a condicao NAO olha `fluxo_novo`.
  //
  // "Estar na medicao" foi derivado acima do COMPORTAMENTO do tipo (mostra/exige periodo),
  // nunca do nome nem do id: a mesma regra tambem forca o campo unico de anexos a aparecer.
  const podeSolicitarAditivo = tipoEhDeMedicao
    && exibirCamposContrato
    && Boolean(form.contrato_id)
    && !contratoSelecionadoMedicaoBloqueada;
  const credoresContratoSelecionado = useMemo(
    () => getCredoresContrato(contratoSelecionado),
    [contratoSelecionado]
  );
  const credoresContratoDisponiveis = useMemo(() => (
    parceiroSelecionado && !credoresContratoSelecionado.some(credor => String(credor.id) === String(parceiroSelecionado.id))
      ? [...credoresContratoSelecionado, parceiroSelecionado]
      : credoresContratoSelecionado
  ), [credoresContratoSelecionado, parceiroSelecionado]);
  const credoresContratoModalFiltrados = useMemo(() => {
    const termo = normalizarBusca(credorContratoModalBusca);
    return credoresContratoDisponiveis.filter((credor) => {
      if (!termo) return true;
      return normalizarBusca(`${credor.nome || ''} ${credor.cpf_cnpj || ''}`).includes(termo);
    });
  }, [credoresContratoDisponiveis, credorContratoModalBusca]);

  function renderCampoCredor(className = 'grid gap-1 text-sm lg:col-span-6') {
    if (!permitirVinculoCredor) return null;

    if (!exibirCampoCredor && exibirCadastroCredor) {
      return (
        <div className={className}>
          <span className="font-medium text-[var(--c-text)]">Credor</span>
          {parceiroSelecionado ? (
            <div className="flex flex-wrap items-center gap-2 rounded border border-[var(--c-border)] bg-[var(--c-surface)] p-3 text-sm">
              <span className="min-w-0 flex-1">
                {parceiroSelecionado.nome}
                {parceiroSelecionado.cpf_cnpj ? ` - ${parceiroSelecionado.cpf_cnpj}` : ''}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={limparParceiroSelecionado}
              >
                Limpar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-outline btn-sm w-fit"
              onClick={() => setModalParceiroAberto(true)}
            >
              Cadastrar novo credor
            </button>
          )}
        </div>
      );
    }

    const credoresContratoCampo = credoresContratoDisponiveis;
    const termoCredorContrato = normalizarBusca(parceiroBusca);
    const credoresContratoFiltrados = credoresContratoCampo.filter((credor) => {
      if (!termoCredorContrato) return true;
      return normalizarBusca(`${credor.nome || ''} ${credor.cpf_cnpj || ''}`).includes(termoCredorContrato);
    });
    const credoresContratoSugestoes = credoresContratoFiltrados.slice(0, 8);
    const inputCredorContratoDesabilitado = !form.contrato_id && credoresContratoCampo.length === 0;

    return (
      <label className={className}>
        Credor
        {restringirCredorAoContrato ? (
          <>
            <div className="relative">
              <div className="flex gap-2 nova-solicitacao-inline-actions">
                <input
                  className="input input-sm min-w-0 flex-1"
                  placeholder={!form.contrato_id
                    ? 'Selecione o contrato primeiro'
                    : credoresContratoCampo.length === 0
                      ? 'Contrato sem credor vinculado'
                      : 'Pesquisar credor vinculado ao contrato'}
                  value={parceiroBusca}
                  disabled={inputCredorContratoDesabilitado}
                  aria-label="Pesquisar credor"
                  onFocus={() => setCredorContratoSugestoesAbertas(true)}
                  onBlur={() => {
                    window.setTimeout(() => setCredorContratoSugestoesAbertas(false), 120);
                  }}
                  onChange={(e) => {
                    setParceiroBusca(e.target.value);
                    setParceiroBuscaExecutada(false);
                    if (parceiroSelecionado) {
                      setParceiroSelecionado(null);
                      setForm(prev => ({ ...prev, parceiro_id: '' }));
                    }
                    setCredorContratoSugestoesAbertas(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && credoresContratoSugestoes.length === 1) {
                      event.preventDefault();
                      selecionarParceiro(credoresContratoSugestoes[0]);
                    }
                    if (event.key === 'Escape') {
                      setCredorContratoSugestoesAbertas(false);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm shrink-0 px-3"
                  title="Listar credores do contrato"
                  aria-label="Listar credores do contrato"
                  onClick={() => {
                    setCredorContratoModalBusca(parceiroBusca);
                    setModalCredoresContratoAberto(true);
                  }}
                  disabled={credoresContratoCampo.length === 0}
                >
                  <HiOutlineMagnifyingGlass className="h-4 w-4" />
                </button>
                {form.parceiro_id && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm shrink-0"
                    onClick={limparParceiroSelecionado}
                  >
                    Limpar
                  </button>
                )}
              </div>

              {credorContratoSugestoesAbertas && !parceiroSelecionado && !inputCredorContratoDesabilitado && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-auto rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-1 shadow-lg">
                  {credoresContratoSugestoes.length > 0 ? (
                    credoresContratoSugestoes.map((credor) => (
                      <button
                        key={credor.id}
                        type="button"
                        className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selecionarParceiro(credor)}
                      >
                        <span className="block font-medium text-[var(--c-text)]">{formatarCredor(credor)}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-[var(--c-muted)]">
                      Nenhum Contratado vinculado ao contrato corresponde a busca.
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {exibirCadastroCredor
                ? 'O credor e carregado a partir do contrato. Se necessario, cadastre um novo credor para vincular nesta solicitacao.'
                : 'O credor e carregado a partir do contrato. Para pagar um credor diferente, solicite ao setor de Gerencia de Processo o cadastro ou vinculo no contrato.'}
            </span>
            {exibirCadastroCredor && (
              <button
                type="button"
                className="btn btn-outline btn-sm mt-2 w-fit"
                onClick={() => setModalParceiroAberto(true)}
              >
                Cadastrar novo credor
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex gap-2 nova-solicitacao-inline-actions">
              <input
                className="input input-sm"
                placeholder="Buscar credor por nome ou CPF/CNPJ"
                value={parceiroBusca}
                onChange={e => {
                  setParceiroBusca(e.target.value);
                  setParceiroBuscaExecutada(false);
                  setParceiroResultados([]);
                  if (parceiroSelecionado) {
                    setParceiroSelecionado(null);
                    setForm(prev => ({ ...prev, parceiro_id: '' }));
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => buscarParceirosRelacionados()}
                disabled={parceiroBuscando}
              >
                {parceiroBuscando ? 'Buscando...' : 'Buscar'}
              </button>
              {form.parceiro_id && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={limparParceiroSelecionado}
                >
                  Limpar
                </button>
              )}
            </div>

            {parceiroResultados.length > 1 && !parceiroSelecionado && (
              <div className="nova-solicitacao-results-list mt-2 border rounded p-2 max-h-40 overflow-auto">
                {parceiroResultados.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selecionarParceiro(item)}
                    className="block w-full text-left text-sm p-2 hover:bg-gray-50 rounded nova-solicitacao-result-item"
                  >
                    {item.nome} - {item.cpf_cnpj}
                  </button>
                ))}
              </div>
            )}

            {parceiroBuscaExecutada && parceiroBusca.trim() && parceiroResultados.length === 0 && !parceiroBuscando && !parceiroSelecionado && (
              <div className="mt-2 flex flex-col gap-2 rounded border border-[var(--c-border)] bg-[var(--c-surface)] p-3 text-xs text-gray-500">
                <span>
                  Nenhum credor encontrado.
                </span>
                {exibirCadastroCredor ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm w-fit"
                    onClick={() => setModalParceiroAberto(true)}
                  >
                    Cadastrar credor
                  </button>
                ) : (
                  <span>Solicite ao setor de Gerencia de Processo o cadastro do credor.</span>
                )}
              </div>
            )}

            {exibirCadastroCredor && !parceiroSelecionado && !parceiroBuscaExecutada && (
              <button
                type="button"
                className="btn btn-outline btn-sm mt-2 w-fit"
                onClick={() => setModalParceiroAberto(true)}
              >
                Cadastrar novo credor
              </button>
            )}
            {exibirCamposContrato && permitirCredorAvulsoComContrato && (
              <span className="mt-2 block text-xs text-gray-500">
                Credor livre para este tipo de solicitacao; o contrato permanece vinculado para referencia e apropriacao.
              </span>
            )}
          </>
        )}
      </label>
    );
  }
  const hoje = new Date();
  const hojeInput = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const saldoDespesaDados = despesaEventualSaldo.dados;
  const valorDespesaAtual = Number(form.valor || 0);
  const saldoDespesaAposSolicitacao = saldoDespesaDados
    ? Math.max(0, Number(saldoDespesaDados.saldo_obra || 0) - valorDespesaAtual)
    : 0;
  const despesaExcedeLimite = Boolean(
    saldoDespesaDados && (
      valorDespesaAtual > Number(saldoDespesaDados.limite_solicitacao || 0) ||
      valorDespesaAtual > Number(saldoDespesaDados.saldo_obra || 0)
    )
  );
  const tiposFiltradosPorSetor = useMemo(() => {
    const setorKey = String(form.area_responsavel || '').trim().toUpperCase();
    if (!setorKey) return [];

    // PI-16: tipo de USO DO SISTEMA nunca aparece aqui. O filtro e por TIPO, antes da lista por
    // setor, de proposito: a lista por setor e permissiva (setor sem lista mostra tudo, e 9 dos 19
    // setores ativos nao tem lista), entao esconder por la vazaria — e voltaria a vazar a cada
    // setor novo. Aqui nao tem como vazar.
    const setorSelecionado = setores.find(
      (setor) => String(setor.codigo || '').toUpperCase() === setorKey
    ) || null;
    const tiposAtivos = Array.isArray(tipos)
      ? tipos.filter((tipo) => {
          if (tipo?.ativo === false || tipo?.comportamento?.somente_sistema === true) return false;
          const behavior = getTipoSolicitacaoBehavior(tipo);
          return behavior.somente_gerencia_processos !== true || isSetorGerenciaProcessos(setorSelecionado);
        })
      : [];

    const regra = tiposPorSetorConfig?.[setorKey];
    const tiposPermitidos = Array.isArray(regra?.tipos)
      ? regra.tipos.map(Number).filter(Number.isFinite)
      : [];

    if (tiposPermitidos.length === 0) {
      return tiposAtivos;
    }

    const idsPermitidos = new Set(tiposPermitidos);
    return tiposAtivos.filter(tipo => idsPermitidos.has(Number(tipo.id)));
  }, [tipos, tiposPorSetorConfig, form.area_responsavel, setores]);

  useEffect(() => {
    if (!form.area_responsavel) return;
    const existe = setoresFiltrados.some(
      setor => String(setor.codigo || '').toUpperCase() === String(form.area_responsavel || '').toUpperCase()
    );
    if (!existe) {
      setForm(prev => ({ ...prev, area_responsavel: '' }));
    }
  }, [setoresFiltrados, form.area_responsavel]);

  useEffect(() => {
    if (!form.area_responsavel) {
      if (form.tipo_solicitacao_id) {
        setForm(prev => ({ ...prev, tipo_solicitacao_id: '', tipo_sub_id: '' }));
      }
      return;
    }
    if (!form.tipo_solicitacao_id) return;
    const existe = tiposFiltradosPorSetor.some(
      tipo => String(tipo.id) === String(form.tipo_solicitacao_id)
    );
    if (!existe) {
      setForm(prev => ({ ...prev, tipo_solicitacao_id: '', tipo_sub_id: '' }));
    }
  }, [form.area_responsavel, form.tipo_solicitacao_id, tiposFiltradosPorSetor]);

  useEffect(() => {
    if (!form.obra_id || !form.area_responsavel || !form.tipo_solicitacao_id) return;

    const tipoSelecionadoRedirecionamento = tipos.find(
      tipo => String(tipo.id) === String(form.tipo_solicitacao_id)
    );
    if (isTipoCompraDireta(tipoSelecionadoRedirecionamento)) {
      const params = new URLSearchParams();
      params.set('obra_id', String(form.obra_id));
      params.set('tipo_solicitacao_id', String(form.tipo_solicitacao_id));
      params.set('area_responsavel', String(form.area_responsavel));
      params.set('origem', 'nova-solicitacao');
      navigate(`/solicitacoes-compra-direta/nova?${params.toString()}`);
      return;
    }

    const regra = obterRegraAutomacaoDestinoNovaSolicitacao(
      automacaoDestinoConfig,
      form.area_responsavel,
      form.tipo_solicitacao_id
    );
    if (!regra) return;

    const chaveExecucao = `${form.obra_id}:${form.area_responsavel}:${form.tipo_solicitacao_id}:${regra.destino}`;
    if (automacaoDestinoExecutadaRef.current === chaveExecucao) return;
    automacaoDestinoExecutadaRef.current = chaveExecucao;

    const params = new URLSearchParams();
    if (regra.preservar_obra !== false) {
      params.set('obra_id', String(form.obra_id));
    }
    params.set('origem', 'nova-solicitacao');

    navigate(`${regra.rota}?${params.toString()}`);
  }, [
    automacaoDestinoConfig,
    form.area_responsavel,
    form.obra_id,
    form.tipo_solicitacao_id,
    navigate,
    tipos
  ]);

  return (
    <div className="page solicitacoes-page solicitacao-nova-page max-w-6xl mx-auto">
      <h1 className="page-title">Nova Solicitação</h1>

      <p className="page-subtitle">
        Preencha os dados essenciais da solicitação com um fluxo mais direto e operacional.
      </p>

      <form
        onSubmit={handleSubmit}
        className="card nova-solicitacao-form space-y-3"
      >
        <div className="nova-solicitacao-body">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 nova-solicitacao-grid-principal">
          <label className="grid gap-1 text-sm lg:col-span-12">
            Obra/Centro de Custo
            <div className="relative nova-solicitacao-obra-field">
              <input
                className="input input-sm nova-solicitacao-obra-input"
                placeholder="Digite o código ou nome da obra/centro de custo"
                value={obraBusca}
                onChange={e => handleChangeBuscaObra(e.target.value)}
                onFocus={handleFocusBuscaObra}
                onBlur={handleBlurBuscaObra}
                onKeyDown={handleKeyDownBuscaObra}
              />

              {obraSelecionada && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm nova-solicitacao-obra-clear"
                  onMouseDown={e => e.preventDefault()}
                  onClick={limparBuscaObra}
                >
                  Limpar
                </button>
              )}

              {mostrarSugestoesObra && (
                <div className="nova-solicitacao-results-list nova-solicitacao-obra-results absolute left-0 right-0 top-full mt-2 max-h-72 overflow-auto border rounded p-2">
                  {obrasFiltradas.map((obra) => (
                    <button
                      key={obra.id}
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => selecionarObra(obra)}
                      className="block w-full text-left rounded nova-solicitacao-result-item nova-solicitacao-obra-result"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-[var(--c-text)]">{obra.nome || 'Obra sem nome'}</div>
                          <div className="text-xs text-[var(--c-muted)]">{formatarLocalidadeObra(obra)}</div>
                        </div>
                        <span className="nova-solicitacao-obra-badge">
                          {getTipoCentroCustoLabel(obra)} - {obra.codigo || 'Sem código'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500">
              Digite parte do nome ou do código para filtrar obras e centros de custo enquanto você preenche.
              {obrasFiltradas.length === 1 && mostrarSugestoesObra ? ' Pressione Enter para selecionar o único resultado.' : ''}
            </span>
            {mostrarSugestoesObra && obrasFiltradas.length === 0 && (
              <span className="text-xs text-gray-500">
                Nenhuma obra/centro de custo encontrada com esse termo.
              </span>
            )}
          </label>
          {false && (
          <>
          <label className="grid gap-1 text-sm lg:col-span-5">
            Código da obra
            <div className="flex gap-2 nova-solicitacao-inline-actions">
              <input
                className="input input-sm"
                placeholder="Ex: OBRA123"
                value=""
                onChange={e => {
                  const novoCodigo = e.target.value;
                  if (!form.obra_id) return;
                  const obraSelecionada = obras.find(o => String(o.id) === String(form.obra_id));
                  if (!obraSelecionada) {
                    limparSelecaoObraERegras();
                    return;
                  }

                  const codigoAtual = String(obraSelecionada.codigo || '');
                  if (String(novoCodigo) !== codigoAtual) {
                    limparSelecaoObraERegras();
                  }
                }}
              />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => {}}>
                Buscar
              </button>
            </div>
          </label>

          {exibirCampoCredor && (
          <label className="grid gap-1 text-sm lg:col-span-6">
            Descrição da obra
            <div className="flex gap-2 nova-solicitacao-inline-actions">
              <input
                className="input input-sm"
                placeholder="Buscar por descrição"
                value=""
                onChange={e => {
                  const novaDescricao = e.target.value;
                  if (!form.obra_id) return;
                  const obraSelecionada = obras.find(o => String(o.id) === String(form.obra_id));
                  if (!obraSelecionada) {
                    limparSelecaoObraERegras();
                    return;
                  }

                  const descricaoAtual = String(obraSelecionada.nome || '');
                  if (String(novaDescricao) !== descricaoAtual) {
                    limparSelecaoObraERegras();
                  }
                }}
              />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => {}}>
                Buscar
              </button>
            </div>
          </label>
          )}
          </>
          )}

          <label className="grid gap-1 text-sm lg:col-span-6">
            Para qual setor deseja enviar?
            <select
              name="area_responsavel"
              onChange={handleChange}
              className="input input-sm"
              required
              value={form.area_responsavel}
              disabled={!form.obra_id}
            >
              <option value="">
                {form.obra_id ? 'Selecione' : 'Selecione a obra/centro de custo primeiro'}
              </option>
              {setoresFiltrados.map(s => (
                <option key={s.id} value={s.codigo}>
                  {s.nome}
                </option>
              ))}
            </select>
            {!form.obra_id && (
              <span className="text-xs text-gray-500">
                Selecione a obra/centro de custo para habilitar a área responsável.
              </span>
            )}
          </label>

          <label className="grid gap-1 text-sm lg:col-span-6">
            Tipo de Solicitação
            <select
              name="tipo_solicitacao_id"
              onChange={handleChange}
              className="input input-sm"
              required
              value={form.tipo_solicitacao_id}
              disabled={!form.area_responsavel}
            >
              <option value="">{form.area_responsavel ? 'Selecione' : 'Selecione o setor primeiro'}</option>
              {tiposFiltradosPorSetor.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </label>

          {form.area_responsavel && !tipoSolicitacaoEscolhido && (
            <div className="lg:col-span-12 border-t border-[var(--c-border)] pt-3 text-sm text-[var(--c-muted)]">
              Selecione o tipo de solicitação para carregar somente os campos necessários.
            </div>
          )}

          <RecargaCartaoFields
            ativo={usaFluxoRecargaCartao}
            value={cartaoRecargaId}
            onChange={setCartaoRecargaId}
            onContextChange={setRecargaCartaoContexto}
            onSolicitacaoAnteriorEnviada={limparCamposNovaRecargaAposReenvio}
          />

          {false && exibirCampoCredor && (
            <label className="grid gap-1 text-sm lg:col-span-6">
              Credor
              {exibirCamposContrato ? (
                <>
                  <select
                    className="input input-sm"
                    value={form.parceiro_id}
                    disabled={!form.contrato_id || credoresContratoSelecionado.length === 0}
                    required={campoObrigatorio('credor')}
                    onChange={(e) => {
                      const credor = credoresContratoSelecionado.find(item => String(item.id) === String(e.target.value));
                      if (credor) {
                        selecionarParceiro(credor);
                      } else {
                        limparParceiroSelecionado();
                      }
                    }}
                  >
                    <option value="">
                      {!form.contrato_id
                        ? 'Selecione o contrato primeiro'
                        : credoresContratoSelecionado.length === 0
                          ? 'Contrato sem credor vinculado'
                          : 'Selecione o credor'}
                    </option>
                    {credoresContratoSelecionado.map(credor => (
                      <option key={credor.id} value={credor.id}>
                        {credor.nome || credor.cpf_cnpj || `Credor ${credor.id}`}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-500">
                    O credor e carregado a partir do contrato. Para pagar um credor diferente, solicite ao setor de Gerencia de Processo o cadastro ou vinculo no contrato.
                  </span>
                </>
              ) : (
                <>
                  <div className="flex gap-2 nova-solicitacao-inline-actions">
                    <input
                      className="input input-sm"
                      placeholder="Buscar credor por nome ou CPF/CNPJ"
                      value={parceiroBusca}
                      onChange={e => {
                        setParceiroBusca(e.target.value);
                        setParceiroBuscaExecutada(false);
                        setParceiroResultados([]);
                        if (parceiroSelecionado) {
                          setParceiroSelecionado(null);
                          setForm(prev => ({ ...prev, parceiro_id: '' }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => buscarParceirosRelacionados()}
                      disabled={parceiroBuscando}
                    >
                      {parceiroBuscando ? 'Buscando...' : 'Buscar'}
                    </button>
                    {form.parceiro_id && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={limparParceiroSelecionado}
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {parceiroResultados.length > 1 && !parceiroSelecionado && (
                    <div className="nova-solicitacao-results-list mt-2 border rounded p-2 max-h-40 overflow-auto">
                      {parceiroResultados.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selecionarParceiro(item)}
                          className="block w-full text-left text-sm p-2 hover:bg-gray-50 rounded nova-solicitacao-result-item"
                        >
                          {item.nome} - {item.cpf_cnpj}
                        </button>
                      ))}
                    </div>
                  )}

                  {parceiroBuscaExecutada && parceiroBusca.trim() && parceiroResultados.length === 0 && !parceiroBuscando && !parceiroSelecionado && (
                    <span className="text-xs text-gray-500">
                      Nenhum credor encontrado. Solicite ao setor de Gerencia de Processo o cadastro do credor.
                    </span>
                  )}
                </>
              )}
            </label>
          )}


          {exibirCamposContrato && (
            <label className="grid gap-1 text-sm lg:col-span-12">
              {rotuloContratoVinculado}
              <div className="flex gap-2 nova-solicitacao-inline-actions">
                <input
                  className="input input-sm"
                  placeholder={placeholderContratoVinculado}
                  value={refContratoBusca}
                  onChange={e => setRefContratoBusca(e.target.value)}
                  required={camposContratoObrigatorios}
                  disabled={!form.obra_id}
                />
                <button type="button" className="btn btn-outline btn-sm" onClick={buscarRefContrato}>
                  Buscar
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={limparRefContrato}>
                  Limpar
                </button>
              </div>
              {!form.obra_id && (
                <span className="text-xs text-gray-500">
                  Selecione a obra para habilitar a busca de referências de contrato.
                </span>
              )}
              {refResultados.length > 1 && (
                <div className="nova-solicitacao-results-list mt-2 border rounded p-2 max-h-40 overflow-auto">
                  {refResultados.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selecionarContratoRef(item)}
                      className="block w-full text-left text-sm p-2 hover:bg-gray-50 rounded nova-solicitacao-result-item"
                    >
                      {item.codigo} - {item.ref_contrato || '-'}
                    </button>
                  ))}
                </div>
              )}
            </label>
          )}

          {/* Ordem pedida pelo cliente (19/08): Subtipo e Credor lado a lado; a Apropriacao
              desce para a faixa inteira, porque agora ela rateia o contrato entre varias. */}
          {exibirCampoSubtipo && (
            <label className="grid gap-1 text-sm lg:col-span-6">
              Subtipo
              <select
                name="tipo_sub_id"
                onChange={handleChange}
                className="input input-sm"
                required={subtipoObrigatorio}
                disabled={!form.tipo_solicitacao_id}
                value={form.tipo_sub_id}
              >
                <option value="">Selecione</option>
                {tiposSub.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
              {subtipoObrigatorio && (
                <span className="text-xs text-gray-500">
                  Obrigatório para este tipo de solicitação.
                </span>
              )}
            </label>
          )}

          {exibirCampoCredor && renderCampoCredor('grid gap-1 text-sm lg:col-span-6')}

          {/* Padrao dos fluxos de pagamento: primeiro a forma; somente depois aparecem os dados
              que ela realmente exige. Assim boleto nunca pede PIX e PIX nunca pede boleto. */}
          {exibirFormaPagamento && (
            <label className="grid gap-1 text-sm lg:col-span-6">
              Forma de pagamento{formaPagamentoObrigatoria ? ' *' : ''}
              <select
                className="input input-sm"
                name="forma_pagamento_id"
                value={form.forma_pagamento_id}
                required={formaPagamentoObrigatoria}
                onChange={(event) => {
                  const formaId = event.target.value;
                  const forma = formasPagamentoDisponiveis
                    .find((item) => String(item.id) === String(formaId)) || null;
                  setForm((prev) => ({
                    ...prev,
                    forma_pagamento_id: formaId,
                    favorecido_chave_pix: formaPagamentoEhPix(forma)
                      ? chavePixPreferencial(favorecidoSelecionado)
                      : ''
                  }));
                }}
              >
                <option value="">Selecione</option>
                {formasPagamentoDisponiveis.map((forma) => (
                  <option key={forma.id} value={forma.id}>{forma.nome}</option>
                ))}
              </select>
              {erroFormasPagamento && <span className="text-xs text-red-700">{erroFormasPagamento}</span>}
              {!erroFormasPagamento && formasPagamentoDisponiveis.length === 0 && (
                <span className="text-xs text-[var(--c-muted)]">
                  Nenhuma forma de pagamento compatível está ativa e liberada.
                </span>
              )}
            </label>
          )}

          {exibirFavorecidoPagamento && exibirCampoCredor && (
            <label className="flex items-center gap-2 text-sm lg:col-span-12">
              <input
                type="checkbox"
                checked={usarCredorComoFavorecido}
                disabled={!parceiroSelecionado}
                onChange={(event) => {
                  const marcado = event.target.checked;
                  setUsarCredorComoFavorecido(marcado);
                  if (marcado) {
                    setFavorecidoSelecionado(parceiroSelecionado);
                    setForm((prev) => ({
                      ...prev,
                      favorecido_id: parceiroSelecionado?.id ? String(parceiroSelecionado.id) : '',
                      favorecido_chave_pix: pagamentoViaPix ? chavePixPreferencial(parceiroSelecionado) : ''
                    }));
                  } else {
                    setFavorecidoSelecionado(null);
                    setForm((prev) => ({ ...prev, favorecido_id: '', favorecido_chave_pix: '' }));
                  }
                }}
              />
              <span>Usar o credor como favorecido do pagamento</span>
            </label>
          )}

          {exibirFavorecidoPagamento && !usarCredorComoFavorecido && (
            <ParceiroBuscaRemota
              className="lg:col-span-6"
              label="Favorecido do pagamento"
              selecionado={favorecidoSelecionado}
              obrigatorio={favorecidoObrigatorio}
              placeholder="Buscar favorecido por nome ou CPF/CNPJ"
              onSelecionar={(parceiro) => {
                setFavorecidoSelecionado(parceiro);
                setForm((prev) => ({
                  ...prev,
                  favorecido_id: parceiro ? String(parceiro.id) : '',
                  favorecido_chave_pix: pagamentoViaPix ? chavePixPreferencial(parceiro) : ''
                }));
              }}
            />
          )}

          {exibirFormaPagamento && pagamentoViaPix && (
            <label className="grid gap-1 text-sm lg:col-span-6">
              Chave PIX do favorecido *
              <input
                className="input input-sm"
                name="favorecido_chave_pix"
                value={form.favorecido_chave_pix}
                required
                onChange={handleChange}
                placeholder="Informe ou altere a chave PIX"
              />
              <span className="text-xs text-[var(--c-muted)]">
                Sugerida pelas chaves 1, 2 e 3 do cadastro, nesta ordem. O valor pode ser alterado.
              </span>
            </label>
          )}

          {exibirFormaPagamento && pagamentoViaBoleto && (
            <div className="grid gap-1 text-sm lg:col-span-6">
              <span>Boleto *</span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="btn btn-outline btn-sm inline-flex cursor-pointer items-center gap-2">
                  <HiPaperClip className="h-4 w-4" />
                  <span>Selecionar boleto</span>
                  <input
                    ref={boletoRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={(event) => {
                      selecionarArquivoBoleto(event.target.files);
                      event.target.value = '';
                    }}
                  />
                </label>
                <span className="text-xs text-[var(--c-muted)]">
                  {boletoArquivos[0]?.nome || 'Nenhum boleto selecionado'}
                </span>
                {boletoArquivos.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setBoletoArquivos([])}
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {exibirCamposContrato && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 nova-solicitacao-grid-secundaria">
            <label className="grid gap-1 text-sm">
              Contrato
              <select
                name="contrato_id"
                onChange={e => {
                  const contratoId = e.target.value;
                  const contrato = contratosDisponiveis.find(c => String(c.id) === String(contratoId));
                  aplicarContratoSelecionado(contrato || null);
                  if (!contratoId) {
                    setContratosRef([]);
                  }
                }}
                className="input input-sm"
                disabled={!form.obra_id && contratosDisponiveis.length === 0}
                value={form.contrato_id}
                required={camposContratoObrigatorios}
              >
                <option value="">Não vincular</option>
                {contratosDisponiveis.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} - {c.ref_contrato || '-'}
                    {c.disponivel_medicao === false ? ' — retorno necessario' : ''}
                  </option>
                ))}
              </select>
            </label>

            {tipoEhDeMedicao && contratoSelecionadoMedicaoBloqueada && (
              <section
                className="md:col-span-2 border-l-4 border-amber-500 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/25 dark:text-amber-100"
                aria-label="Medicao aguardando retorno da solicitacao"
                data-testid="contrato-medicao-fora-setor"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <HiOutlineArrowUturnLeft className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">
                        Contrato visivel · medicao temporariamente bloqueada
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-amber-800 dark:text-amber-200">
                        A solicitacao {contratoSelecionado?.solicitacaoContrato?.codigo || contratoSelecionado?.codigo || ''}
                        {' '}esta no setor {contratoSelecionado?.contexto_interacao?.setor_atual || 'responsavel atual'}.
                        Ela precisa voltar para {contratoSelecionado?.contexto_interacao?.setor_usuario || 'seu setor'} antes de registrar a medicao.
                      </p>
                    </div>
                  </div>

                  {contratoSelecionado?.contexto_interacao?.pedido_retorno_pendente ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold dark:bg-transparent">
                      <HiOutlineClock className="h-4 w-4" /> Retorno solicitado
                    </span>
                  ) : contratoSelecionado?.contexto_interacao?.pode_solicitar_retorno ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setRetornoContrato((atual) => ({ ...atual, aberto: !atual.aberto, erro: '' }))}
                    >
                      Solicitar retorno
                    </button>
                  ) : null}
                </div>

                {contratoSelecionado?.contexto_interacao?.pedido_retorno_pendente && (
                  <p className="mt-2 border-t border-amber-200 pt-2 text-xs">
                    <span className="font-semibold">Motivo enviado:</span>{' '}
                    {contratoSelecionado.contexto_interacao.pedido_retorno_pendente.motivo}
                  </p>
                )}

                {!contratoSelecionado?.contexto_interacao?.pedido_retorno_pendente
                  && !contratoSelecionado?.contexto_interacao?.pode_solicitar_retorno && (
                  <p className="mt-2 border-t border-amber-200 pt-2 text-xs">
                    Seu usuario pode visualizar o contrato, mas nao possui permissao para solicitar o retorno.
                  </p>
                )}

                {retornoContrato.aberto
                  && !contratoSelecionado?.contexto_interacao?.pedido_retorno_pendente && (
                  <div className="mt-3 grid gap-2 border-t border-amber-200 pt-3 md:grid-cols-[1fr_auto]">
                    <label className="min-w-0">
                      <span className="mb-1 block text-xs font-semibold">Por que precisa do retorno? *</span>
                      <textarea
                        className="input min-h-20 w-full resize-y bg-white dark:bg-gray-950"
                        value={retornoContrato.motivo}
                        onChange={(event) => setRetornoContrato((atual) => ({
                          ...atual,
                          motivo: event.target.value,
                          erro: ''
                        }))}
                        placeholder="Ex.: preciso registrar a medicao deste periodo e anexar os documentos."
                        maxLength={2000}
                        autoFocus
                      />
                    </label>
                    <div className="flex items-end justify-end gap-2">
                      <button type="button" className="btn btn-ghost btn-sm"
                        onClick={() => setRetornoContrato({ aberto: false, motivo: '', processando: false, erro: '' })}
                        disabled={retornoContrato.processando}>
                        Fechar
                      </button>
                      <button type="button" className="btn btn-primary btn-sm"
                        onClick={solicitarRetornoDoContrato}
                        disabled={retornoContrato.processando || !retornoContrato.motivo.trim()}>
                        {retornoContrato.processando ? 'Enviando...' : 'Enviar pedido'}
                      </button>
                    </div>
                  </div>
                )}

                {retornoContrato.erro && (
                  <p className="mt-2 text-xs font-medium text-red-700 dark:text-red-300" role="alert">
                    {retornoContrato.erro}
                  </p>
                )}
              </section>
            )}

            {/* O rateio de apropriacao tambem nao e da MEDICAO do fluxo novo.
                Ela nao cria solicitacao (PI-16): o que o backend recebe aqui e descartado junto com
                valor, descricao e vencimento. E os titulos ja nasceram com o rateio do CONTRATO, na
                aprovacao — este bloco pediria de novo, com base num Valor que nao existe mais, uma
                divisao que ja esta feita. Ele so ficou de pe ate agora porque o campo Valor
                existia. */}
            {form.contrato_id && !usaMedicaoFluxoNovo && (
              <div className="md:col-span-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--c-text)]">
                      Apropriacoes do contrato
                      {apropriacoesContratoObrigatorias ? <span className="text-red-600"> *</span> : null}
                    </p>
                    <p className="text-xs text-[var(--c-muted)]">
                      {apropriacoesContratoObrigatorias
                        ? 'Obrigatorio para este tipo. Marque os itens que receberao esta solicitacao e informe o rateio por percentual ou valor em R$.'
                        : 'Marque os itens que receberao esta solicitacao e informe o rateio por percentual ou valor em R$.'}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--c-surface-alt)] px-2 py-1 text-xs font-semibold text-[var(--c-muted)]">
                    {apropriacoesRateioSelecionadas.length}/{apropriacoesContratoRateio.length} selecionada(s)
                  </span>
                </div>

                {apropriacoesContratoRateio.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[var(--c-border)] px-3 py-2 text-xs text-[var(--c-muted)]">
                    Este contrato ainda nao possui apropriacoes estruturadas cadastradas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {apropriacoesContratoRateio.map((item, index) => (
                      <div
                        key={`${item.apropriacao_id}-${index}`}
                        className="grid gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-2 md:grid-cols-[minmax(240px,1fr)_96px_132px]"
                      >
                        <label className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={Boolean(item.selecionado)}
                            onChange={e => alternarApropriacaoContratoRateio(index, e.target.checked)}
                          />
                          <span>
                            <span className="font-semibold text-[var(--c-text)]">
                              {item.codigo || item.apropriacao_id}
                            </span>
                            {item.descricao && (
                              <span className="text-[var(--c-muted)]"> - {item.descricao}</span>
                            )}
                          </span>
                        </label>
                        <input
                          className="input input-sm"
                          value={item.percentual}
                          onChange={e => alterarApropriacaoContratoRateio(index, 'percentual', e.target.value)}
                          placeholder="%"
                          disabled={!item.selecionado}
                        />
                        <input
                          className="input input-sm"
                          value={item.valor_rateio}
                          onChange={e => atualizarValorRateioContrato(index, e.target.value)}
                          placeholder="Valor R$"
                          disabled={!item.selecionado}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {usaMedicaoFluxoNovo && !contratoSelecionadoMedicaoBloqueada && (
          <BlocoMedicaoContrato
            contratoId={Number(form.contrato_id)}
            onChange={setMedicaoContratoDados}
            periodo={{ inicio: form.data_inicio_medicao, fim: form.data_fim_medicao }}
            periodoObrigatorio={medicaoObrigatoria}
            onPeriodoChange={handleChange}
            boletoArquivo={boletoArquivos[0] || null}
            onSelecionarBoleto={selecionarArquivoBoleto}
            onRemoverBoleto={() => setBoletoArquivos([])}
          />
        )}

        {/* PI-15: acao separada da medicao. Nao envia nem valida o formulario em curso — o modal
            fecha e a medicao continua exatamente como estava. Serve contrato legado e do fluxo
            novo, por isso nao ha condicao de `fluxo_novo` aqui. */}
        {podeSolicitarAditivo && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              data-testid="botao-solicitar-aditivo"
              onClick={() => setModalAditivoAberto(true)}
            >
              Solicitar termo aditivo
            </button>
            <span className="text-xs text-[var(--c-muted)]">
              Acrescenta valor ao contrato selecionado, com limite de 25% do valor original.
              Entra como pendente e nao interfere nesta medicao.
            </span>
          </div>
        )}


        {/* O VALOR VEM ANTES DA APROPRIACAO (item 2 do lote de 23/08). E o valor que a apropriacao
            reparte: pedir o rateio antes do numero a repartir obrigava a pessoa a voltar. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 nova-solicitacao-grid-curta">
          {exibirValor && (
            <label className="grid gap-1 text-sm">
              Valor
              <input
                name="valor"
                type="text"
                className="input input-sm"
                value={valorTexto}
                onChange={e => atualizarValor(e.target.value)}
                placeholder="R$ 0,00"
                required={valorObrigatorio && campoObrigatorio('valor')}
              />
            </label>
          )}

          {usaFluxoDespesaEventual && (
            <div
              className={`md:col-span-2 rounded-lg border px-3 py-2 text-sm ${
                despesaExcedeLimite
                  ? 'border-red-300 bg-red-50 text-red-800'
                  : 'border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)]'
              }`}
              aria-live="polite"
            >
              {despesaEventualSaldo.status === 'loading' && 'Calculando o saldo da obra...'}
              {despesaEventualSaldo.status === 'error' && despesaEventualSaldo.erro}
              {despesaEventualSaldo.status === 'success' && saldoDespesaDados && (
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <span><strong>Limite por solicitação:</strong> {formatarMoeda(Number(saldoDespesaDados.limite_solicitacao || 0))}</span>
                  <span><strong>Comprometido na obra:</strong> {formatarMoeda(Number(saldoDespesaDados.comprometido_obra || 0))}</span>
                  <span><strong>Saldo disponível na obra:</strong> {formatarMoeda(Number(saldoDespesaDados.saldo_obra || 0))}</span>
                  <span><strong>Saldo após esta solicitação:</strong> {formatarMoeda(saldoDespesaAposSolicitacao)}</span>
                </div>
              )}
            </div>
          )}

        </div>

        {exibirCampoApropriacao && (
          <div className="grid gap-1 text-sm w-full">
            Apropriacao da Solicitacao na Obra
            {/* No fluxo novo de contrato a apropriacao deixou de ser UMA: o cliente pediu ratear o
                valor do contrato entre varias, por % ou por R$ (19/08). No fluxo padrao continua
                sendo uma so — nada muda para as 665 solicitacoes historicas. */}
            {usaFluxoContratoNovo ? (
              <RateioApropriacoesContrato
                linhas={rateioContrato}
                apropriacoes={apropriacoes}
                valorTotal={form.valor}
                onChange={setRateioContrato}
                desabilitado={!form.obra_id}
              />
            ) : (
              <ApropriacaoAutocomplete
                value={form.apropriacao_id}
                options={apropriacoes}
                onChange={(id) => setForm({ ...form, apropriacao_id: id })}
                disabled={!form.obra_id}
                required={exigeApropriacaoPrincipal}
                inputClassName="input input-sm w-full"
                disabledPlaceholder="Selecione a obra primeiro"
              />
            )}
            {exigeApropriacaoPrincipal ? (
              <span className="text-xs text-gray-500">
                Campo obrigatorio conforme configuracao da nova solicitacao.
              </span>
            ) : (
              <span className="text-xs text-gray-500">
                Campo opcional. Use quando a solicitacao precisar nascer vinculada a uma apropriacao da obra.
              </span>
            )}
            {form.obra_id && apropriacoes.length === 0 && (
              <span className="text-xs text-gray-500">
                Nenhuma apropriacao ativa encontrada para esta obra.
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 nova-solicitacao-grid-curta">
          {/* Titulo do contrato ABAIXO do Valor (ordem pedida em 19/08), e nao ao lado: ocupa a
              faixa inteira para cair na linha de baixo. Antes ele ficava depois do bloco do
              contrato, longe do valor que ele identifica. */}
          {exibirCampoDescricao && (
            <label className="grid gap-1 text-sm md:col-span-2">
              {usaFluxoContratoNovo ? 'Título do contrato' : 'Título da solicitação'}
              <textarea
                name="descricao"
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    descricao: e.target.value.slice(0, 50)
                  }))
                }
                maxLength={50}
                className="input input-sm nova-solicitacao-textarea text-[var(--c-text)] placeholder:text-[var(--c-muted)]"
                required={descricaoExigida}
                value={form.descricao}
              />
            </label>
          )}

          {exibirJustificativa && (
            <label className="grid gap-1 text-sm md:col-span-2">
              Justificativa{justificativaObrigatoria ? ' *' : ''}
              <textarea
                name="justificativa"
                onChange={handleChange}
                className="input input-sm nova-solicitacao-textarea text-[var(--c-text)] placeholder:text-[var(--c-muted)]"
                required={justificativaObrigatoria}
                value={form.justificativa}
                rows={3}
                placeholder="Explique a necessidade desta solicitação"
              />
            </label>
          )}

          {usaFluxoDespesaEventual && (
            <fieldset className="md:col-span-2 grid gap-2 rounded-lg border border-[var(--c-border)] p-3">
              <legend className="px-1 text-sm font-semibold text-[var(--c-text)]">Declarações obrigatórias</legend>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={despesaEventualDeclaracoes.despesa_pontual_nao_recorrente}
                  onChange={(event) => setDespesaEventualDeclaracoes((atual) => ({
                    ...atual,
                    despesa_pontual_nao_recorrente: event.target.checked
                  }))}
                />
                <span>Confirmo que esta e uma despesa pontual, esporadica e nao recorrente.</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={despesaEventualDeclaracoes.sem_vinculo_contratual}
                  onChange={(event) => setDespesaEventualDeclaracoes((atual) => ({
                    ...atual,
                    sem_vinculo_contratual: event.target.checked
                  }))}
                />
                <span>Confirmo que a despesa nao caracteriza vinculo ou necessidade de contrato.</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={despesaEventualDeclaracoes.nao_fracionada}
                  onChange={(event) => setDespesaEventualDeclaracoes((atual) => ({
                    ...atual,
                    nao_fracionada: event.target.checked
                  }))}
                />
                <span>Confirmo que a despesa nao foi fracionada para se enquadrar no limite.</span>
              </label>
            </fieldset>
          )}

          {exibirCampoDataVencimento && (
          <label className="grid gap-1 text-sm">
            {usaFluxoRecargaCartao ? 'Data prevista para recarga' : 'Data Resposta/Pagamento'}
            <input
              name="data_vencimento"
              type="date"
              onChange={handleChange}
              className="input input-sm"
              value={form.data_vencimento}
              min={hojeInput}
              required={dataVencimentoExigida}
            />
          </label>
          )}

          {exibirDataDemissao && (
            <label className="grid gap-1 text-sm">
              Data de demissao
              <input
                name="data_demissao"
                type="date"
                onChange={handleChange}
                className="input input-sm"
                value={form.data_demissao}
                required={dataDemissaoObrigatoria}
              />
            </label>
          )}
        </div>

        {/* Blocos de contrato ficam FORA do grid de duas colunas: dentro dele o bloco ocupava
            uma coluna so, espremido, com metade da tela vazia ao lado. */}
        {usaFluxoContratoNovo && (
          <BlocoContratoFluxoNovo
            valorTotal={form.valor}
            contratadoPrincipal={parceiroSelecionado}
            limiteJuridico={limiteJuridico}
            camposConfigurados={camposNovaSolicitacao}
            onChange={setContratoNovoDados}
          />
        )}

        {exibirPeriodoMedicaoSolto && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 nova-solicitacao-grid-curta">
            <label className="grid gap-1 text-sm">
              Data inicial (Medição)
              <input
                name="data_inicio_medicao"
                type="date"
                onChange={handleChange}
                className="input input-sm"
                value={form.data_inicio_medicao}
                required={medicaoObrigatoria}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Data final (Medição)
              <input
                name="data_fim_medicao"
                type="date"
                onChange={handleChange}
                className="input input-sm"
                value={form.data_fim_medicao}
                required={medicaoObrigatoria}
              />
            </label>
          </div>
        )}

        {exibirRefContratoAbertura && (
          <label className="grid gap-1 text-sm">
            Ref. do Contrato
            <input
              name="ref_contrato_abertura"
              onChange={handleChange}
              className="input input-sm"
              required={refContratoAberturaObrigatoria}
              value={form.ref_contrato_abertura}
              placeholder="Informe a ref do contrato"
            />
          </label>
        )}

        {exibirItensApropriacao && (
          <label className="grid gap-1 text-sm">
            Itens de Apropriação
            <textarea
              name="itens_apropriacao"
              onChange={handleChange}
              className="input input-sm nova-solicitacao-textarea text-[var(--c-text)] placeholder:text-[var(--c-muted)]"
              required={itensApropriacaoObrigatorio}
              value={form.itens_apropriacao}
              placeholder="Descreva os itens de apropriação"
            />
          </label>
        )}


        {tipoSolicitacaoEscolhido && (
        <div className="nova-solicitacao-actions-bar">
          {exibirAnexos && !(tipoEhDeMedicao && (pagamentoViaBoleto || medicaoContratoDados?.pagamento?.via_boleto)) && (
          <label className="grid gap-1 text-sm nova-solicitacao-anexos">
          {tipoEhDeMedicao
            ? 'Anexo da medição *'
            : (usaFluxoDespesaEventual ? 'Comprovante da despesa *' : `Anexos${anexosObrigatorios ? ' *' : ''}`)}
          <div className="flex items-center gap-2 flex-wrap nova-solicitacao-inline-actions nova-solicitacao-anexos-head">
            <label className="btn btn-outline btn-sm inline-flex items-center gap-2 cursor-pointer">
              <HiPaperClip className="w-4 h-4" />
              <span>Anexar arquivos</span>
              <input
                type="file"
                multiple
                accept={UPLOAD_DOCUMENT_ACCEPT}
                ref={anexosRef}
                className="hidden"
                onChange={e => {
                  adicionarArquivos(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            <span className="text-xs text-[var(--c-muted)]">
              {arquivos.length > 0
                ? `${arquivos.length} arquivo(s) selecionado(s)`
                : 'Nenhum arquivo selecionado'}
            </span>
          </div>
          <PendingAttachmentsList
            items={arquivos}
            onRemove={(index) => removerArquivo(index)}
            className="mt-2 space-y-1"
            itemClassName="nova-solicitacao-file-item flex items-center justify-between gap-3 text-sm bg-[var(--c-surface)] border border-[var(--c-border)] rounded px-2 py-1"
            removeButtonClassName="text-blue-600 font-semibold px-2"
          />
          </label>
          )}

          <div className="flex justify-end nova-solicitacao-footer">
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={
              criandoSolicitacao ||
              (tipoEhDeMedicao && contratoSelecionadoMedicaoBloqueada) ||
              (usaFluxoRecargaCartao && (!cartaoRecargaId || recargaCartaoContexto?.bloqueado)) ||
              (usaApropriacaoAutomaticaObra && apropriacaoAutomatica.status === 'loading') ||
              (usaFluxoDespesaEventual && despesaEventualSaldo.status === 'loading')
            }
          >
            {criandoSolicitacao ? 'Criando...' : 'Criar Solicitação'}
          </button>
          </div>
        </div>
        )}
        </div>
      </form>

      {modalCredoresContratoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--c-text)' }}>Credores do contrato</h2>
                <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
                  Selecione um dos credores vinculados ao contrato informado.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setModalCredoresContratoAberto(false)}
              >
                Fechar
              </button>
            </div>

            <div className="relative">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-muted)]" />
              <input
                className="input input-sm w-full pl-9"
                placeholder="Pesquisar por nome ou CPF/CNPJ"
                value={credorContratoModalBusca}
                onChange={(event) => setCredorContratoModalBusca(event.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-[360px] overflow-auto rounded-lg border border-[var(--c-border)]">
              {credoresContratoModalFiltrados.length === 0 ? (
                <div className="p-4 text-sm text-[var(--c-muted)]">
                  Nenhum credor disponivel para a busca informada.
                </div>
              ) : (
                credoresContratoModalFiltrados.map((credor) => {
                  const selecionado = String(form.parceiro_id) === String(credor.id);
                  return (
                    <button
                      key={credor.id}
                      type="button"
                      className={`block w-full border-b border-[var(--c-border)] px-4 py-3 text-left text-sm last:border-b-0 hover:bg-slate-50 ${selecionado ? 'bg-blue-50' : 'bg-[var(--c-surface)]'}`}
                      onClick={() => selecionarParceiro(credor)}
                    >
                      <span className="block font-semibold text-[var(--c-text)]">{formatarCredor(credor)}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {exibirCadastroCredor && modalParceiroAberto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:items-center sm:p-4">
          <div className="card flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden p-0 sm:max-h-[calc(100vh-2rem)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--c-border)] p-4">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--c-text)' }}>Cadastrar Credor</h2>
                <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
                  Informe os dados principais para vincular o credor a esta solicitação.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setModalParceiroAberto(false)}
              >
                Fechar
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                CPF/CNPJ *
                <input
                  className="input input-sm"
                  value={novoParceiro.cpf_cnpj}
                  onChange={e => setNovoParceiro(prev => ({ ...prev, cpf_cnpj: maskCpfCnpj(e.target.value) }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Nome *
                <input
                  className="input input-sm"
                  value={novoParceiro.nome}
                  onChange={e => setNovoParceiro(prev => ({ ...prev, nome: e.target.value }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Telefone *
                <input
                  className="input input-sm"
                  value={novoParceiro.telefone}
                  onChange={e => setNovoParceiro(prev => ({ ...prev, telefone: maskPhone(e.target.value) }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                E-mail
                <input
                  className="input input-sm"
                  value={novoParceiro.email}
                  onChange={e => setNovoParceiro(prev => ({ ...prev, email: e.target.value }))}
                />
              </label>

              {/* Endereco obrigatorio no cadastro (PI-20).
                  Estes campos ja existiam no estado do formulario, mas nao eram renderizados — e e
                  por isso que 2.428 dos 2.454 fornecedores ativos estao sem endereco. Exigir aqui
                  evita que o contrato acima do limite pare na conferencia depois. */}
              <div className="md:col-span-2 rounded-lg border border-[var(--c-border)] p-3 space-y-3">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>
                    Endereco do credor *
                  </div>
                  <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
                    Obrigatorio: contrato acima do limite vai ao Juridico, e a minuta precisa
                    identificar e localizar a parte.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-6">
                  <label className="grid gap-1 text-sm md:col-span-4">
                    Logradouro *
                    <input className="input input-sm" name="novo_credor_endereco"
                      value={novoParceiro.endereco}
                      onChange={e => setNovoParceiro(prev => ({ ...prev, endereco: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm md:col-span-2">
                    Numero *
                    <input className="input input-sm" name="novo_credor_numero"
                      value={novoParceiro.numero}
                      onChange={e => setNovoParceiro(prev => ({ ...prev, numero: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm md:col-span-2">
                    Complemento
                    <input className="input input-sm" name="novo_credor_complemento"
                      value={novoParceiro.complemento || ''}
                      onChange={e => setNovoParceiro(prev => ({ ...prev, complemento: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm md:col-span-4">
                    Bairro *
                    <input className="input input-sm" name="novo_credor_bairro"
                      value={novoParceiro.bairro}
                      onChange={e => setNovoParceiro(prev => ({ ...prev, bairro: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm md:col-span-2">
                    CEP *
                    <input className="input input-sm" name="novo_credor_cep"
                      value={novoParceiro.cep}
                      onChange={e => setNovoParceiro(prev => ({ ...prev, cep: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm md:col-span-3">
                    Municipio *
                    <input className="input input-sm" name="novo_credor_municipio"
                      value={novoParceiro.municipio}
                      onChange={e => setNovoParceiro(prev => ({ ...prev, municipio: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm md:col-span-1">
                    UF *
                    <input className="input input-sm" name="novo_credor_estado" maxLength={2}
                      value={novoParceiro.estado}
                      onChange={e => setNovoParceiro(prev => ({ ...prev, estado: e.target.value }))} />
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 rounded-lg border border-[var(--c-border)] p-3 space-y-3">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>
                    Chaves PIX opcionais
                  </div>
                  <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
                    Cadastre ate duas chaves fixas e uma chave variavel para uso financeiro.
                  </p>
                </div>

                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm">
                    Chave PIX fixa 1
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[140px_1fr]">
                      <select
                        className="input input-sm"
                        value={novoParceiro.pix_chave_fixa_1_tipo}
                        onChange={e => setNovoParceiro(prev => ({ ...prev, pix_chave_fixa_1_tipo: e.target.value }))}
                      >
                        {PIX_TIPOS_CHAVE.map((tipo) => (
                          <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                        ))}
                      </select>
                      <input
                        className="input input-sm"
                        value={novoParceiro.pix_chave_fixa_1}
                        onChange={e => setNovoParceiro(prev => ({ ...prev, pix_chave_fixa_1: e.target.value }))}
                        placeholder="Informe a chave"
                      />
                    </div>
                  </label>

                  <label className="grid gap-1 text-sm">
                    Chave PIX fixa 2
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[140px_1fr]">
                      <select
                        className="input input-sm"
                        value={novoParceiro.pix_chave_fixa_2_tipo}
                        onChange={e => setNovoParceiro(prev => ({ ...prev, pix_chave_fixa_2_tipo: e.target.value }))}
                      >
                        {PIX_TIPOS_CHAVE.map((tipo) => (
                          <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                        ))}
                      </select>
                      <input
                        className="input input-sm"
                        value={novoParceiro.pix_chave_fixa_2}
                        onChange={e => setNovoParceiro(prev => ({ ...prev, pix_chave_fixa_2: e.target.value }))}
                        placeholder="Informe a chave"
                      />
                    </div>
                  </label>

                  <label className="grid gap-1 text-sm">
                    Chave PIX variavel
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[140px_1fr]">
                      <select
                        className="input input-sm"
                        value={novoParceiro.pix_chave_variavel_tipo}
                        onChange={e => setNovoParceiro(prev => ({ ...prev, pix_chave_variavel_tipo: e.target.value }))}
                      >
                        {PIX_TIPOS_CHAVE.map((tipo) => (
                          <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                        ))}
                      </select>
                      <input
                        className="input input-sm"
                        value={novoParceiro.pix_chave_variavel}
                        onChange={e => setNovoParceiro(prev => ({ ...prev, pix_chave_variavel: e.target.value }))}
                        placeholder="Informe a chave"
                      />
                    </div>
                  </label>
                </div>
              </div>
              <label className="grid gap-1 text-sm">
                Endereco
                <input
                  className="input input-sm"
                  value={novoParceiro.endereco}
                  onChange={e => setNovoParceiro(prev => ({ ...prev, endereco: e.target.value }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Numero
                <input
                  className="input input-sm"
                  value={novoParceiro.numero}
                  onChange={e => setNovoParceiro(prev => ({ ...prev, numero: e.target.value }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Bairro
                <input
                  className="input input-sm"
                  value={novoParceiro.bairro}
                  onChange={e => setNovoParceiro(prev => ({ ...prev, bairro: e.target.value }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                CEP
                <input
                  className="input input-sm"
                  value={novoParceiro.cep}
                  onChange={e => setNovoParceiro(prev => ({ ...prev, cep: maskCep(e.target.value) }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Municipio
                <input
                  className="input input-sm"
                  value={novoParceiro.municipio}
                  onChange={e => setNovoParceiro(prev => ({ ...prev, municipio: e.target.value }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Estado
                <input
                  className="input input-sm"
                  maxLength={2}
                  value={novoParceiro.estado}
                  onChange={e => setNovoParceiro(prev => ({ ...prev, estado: e.target.value.toUpperCase() }))}
                />
              </label>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Categorias da pessoa</div>
              {categoriasParceiro.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhuma categoria cadastrada.</div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 max-h-[160px] overflow-y-auto rounded-lg border border-[var(--c-border)] p-3">
                  {categoriasParceiro.map((categoria) => (
                    <label key={categoria.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={novoParceiro.categoria_ids.includes(categoria.id)}
                        onChange={(event) => {
                          setNovoParceiro((prev) => {
                            const atual = new Set(prev.categoria_ids || []);
                            if (event.target.checked) {
                              atual.add(categoria.id);
                            } else {
                              atual.delete(categoria.id);
                            }
                            return { ...prev, categoria_ids: Array.from(atual) };
                          });
                        }}
                      />
                      <span>{categoria.nome}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--c-border)] bg-[var(--c-card)] p-4">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setModalParceiroAberto(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={salvarNovoParceiro}
              >
                Salvar credor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do termo aditivo (PI-15). Fica fora do <form> de proposito: o envio dele e proprio
          e nao pode disparar o submit da medicao. */}
      <ModalAditivoContrato
        aberto={modalAditivoAberto}
        contratoId={form.contrato_id ? Number(form.contrato_id) : null}
        areaResponsavel={form.area_responsavel}
        contratoRotulo={contratoSelecionado
          ? `${contratoSelecionado.codigo || ''} ${contratoSelecionado.ref_contrato || contratoSelecionado.descricao || ''}`.trim()
          : ''}
        onFechar={() => setModalAditivoAberto(false)}
        onSolicitado={(r) => {
          alert(`Termo aditivo de R$ ${Number(r?.aditivo?.valor || 0).toFixed(2)} solicitado — aguardando aprovacao.`);
        }}
      />

      <ModalConferenciaCredores
        aberto={modalCredoresAberto}
        parceiroIds={credoresParaConferir}
        criando={criandoSolicitacao}
        onFechar={() => setModalCredoresAberto(false)}
        onConfirmar={() => {
          setModalCredoresAberto(false);
          void handleSubmit(null, { confirmadoNaConferencia: true });
        }}
      />

    </div>
  );
}
