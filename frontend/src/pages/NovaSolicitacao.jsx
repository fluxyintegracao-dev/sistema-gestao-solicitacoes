import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMinhasObras } from '../services/obras';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import { getSetores } from '../services/setores';
import { createSolicitacao } from '../services/solicitacoes';
import { uploadArquivos } from '../services/uploads';
import { getTiposSubContrato } from '../services/tiposSubContrato';
import { getContratos } from '../services/contratos';
import { buscarParceiros, criarParceiro, listarCategoriasParceiro } from '../services/parceiros';
import { listarApropriacoes } from '../services/apropriacoes';
import { getAprovacaoDiretoria, getAreasObra, getAreasPorSetorOrigem, getAutomacaoDestinoNovaSolicitacao, getCamposNovaSolicitacao, getTiposSolicitacaoPorSetor } from '../services/configuracoesSistema';
import { useAuth } from '../contexts/AuthContext';
import { HiPaperClip } from 'react-icons/hi2';
import ApropriacaoAutocomplete from '../components/ui/ApropriacaoAutocomplete';
import PendingAttachmentsList from '../components/attachments/PendingAttachmentsList';
import { userHasSetorCapability } from '../utils/setor';
import { hasEnabledModule } from '../utils/acessoProduto';
import { applyTipoSolicitacaoModuleAvailability, getTipoSolicitacaoBehavior } from '../utils/tipoSolicitacao';
import { resolverCamposNovaSolicitacaoFrontend } from '../utils/novaSolicitacaoCampos';
import {
  normalizarConfigAutomacaoDestinoNovaSolicitacao,
  obterRegraAutomacaoDestinoNovaSolicitacao
} from '../utils/novaSolicitacaoAutomacaoDestino';
import { maskCep, maskCpfCnpj, maskPhone, onlyDigits } from '../utils/formatters';
import {
  UPLOAD_MAX_FILE_SIZE_MB_PADRAO,
  concatenarAnexosPendentes,
  extrairFilesAnexosPendentes,
  montarMensagemArquivosAcimaDoLimite
} from '../utils/pendingAttachments';

function normalizarBusca(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
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
  const [aprovacaoDiretoriaConfig, setAprovacaoDiretoriaConfig] = useState({ diretorias: {}, destinos: {} });
  const [tiposSub, setTiposSub] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [contratosRef, setContratosRef] = useState([]);
  const [apropriacoes, setApropriacoes] = useState([]);
  const [refContratoBusca, setRefContratoBusca] = useState('');
  const [refResultados, setRefResultados] = useState([]);
  const [parceiroBusca, setParceiroBusca] = useState('');
  const [parceiroResultados, setParceiroResultados] = useState([]);
  const [parceiroSelecionado, setParceiroSelecionado] = useState(null);
  const [parceiroBuscando, setParceiroBuscando] = useState(false);
  const [parceiroBuscaExecutada, setParceiroBuscaExecutada] = useState(false);
  const [modalParceiroAberto, setModalParceiroAberto] = useState(false);
  const [categoriasParceiro, setCategoriasParceiro] = useState([]);
  const [novoParceiro, setNovoParceiro] = useState(criarNovoParceiroPadrao);
  const [arquivos, setArquivos] = useState([]);
  const [valorTexto, setValorTexto] = useState('');
  const anexosRef = useRef(null);
  const obraBuscaBlurTimeoutRef = useRef(null);
  const automacaoDestinoExecutadaRef = useRef('');

  const [form, setForm] = useState({
    obra_id: '',
    parceiro_id: '',
    apropriacao_id: '',
    tipo_solicitacao_id: '',
    tipo_sub_id: '',
    contrato_id: '',
    codigo_contrato: '',
    area_responsavel: '',
    diretoria_fluxo_codigo: '',
    descricao: '',
    itens_apropriacao: '',
    ref_contrato_abertura: '',
    valor: '',
    data_vencimento: '',
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
        const categoriasData = await listarCategoriasParceiro();
        setCategoriasParceiro(Array.isArray(categoriasData) ? categoriasData : []);
      } catch (error) {
        console.error(error);
        setCategoriasParceiro([]);
      }
      try {
        const [cfg, cfgSetorOrigem, cfgTiposPorSetor, cfgAprovacaoDiretoria, cfgCamposNovaSolicitacao, cfgAutomacaoDestino] = await Promise.all([
          getAreasObra(),
          getAreasPorSetorOrigem(),
          getTiposSolicitacaoPorSetor(),
          getAprovacaoDiretoria(),
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
        setAprovacaoDiretoriaConfig({
          diretorias: cfgAprovacaoDiretoria?.diretorias || {},
          destinos: cfgAprovacaoDiretoria?.destinos || {}
        });
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
        setAprovacaoDiretoriaConfig({ diretorias: {}, destinos: {} });
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
      return;
    }

    async function loadSub() {
      const data = await getTiposSubContrato({
        tipo_macro_id: form.tipo_solicitacao_id
      });
      setTiposSub(Array.isArray(data) ? data : []);
    }

    loadSub();
  }, [form.tipo_solicitacao_id]);

  useEffect(() => {
    if (!form.obra_id) {
      setContratos([]);
      setForm(prev => ({ ...prev, contrato_id: '', ref_contrato_abertura: '' }));
      setContratosRef([]);
      setApropriacoes([]);
      setForm(prev => ({ ...prev, apropriacao_id: '', itens_apropriacao: '' }));
      return;
    }

    if (!obraSelecionadaEhObra) {
      setContratos([]);
      setContratosRef([]);
      setApropriacoes([]);
      setRefContratoBusca('');
      setRefResultados([]);
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
    setForm({ ...form, [e.target.name]: e.target.value });
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
  }

  function limparParceiroSelecionado() {
    setParceiroSelecionado(null);
    setParceiroBusca('');
    setParceiroResultados([]);
    setParceiroBuscaExecutada(false);
    setForm(prev => ({ ...prev, parceiro_id: '' }));
  }

  async function buscarParceirosRelacionados() {
    try {
      const termo = parceiroBusca.trim();
      if (!termo) return;
      setParceiroBuscando(true);
      setParceiroBuscaExecutada(true);
      const data = await buscarParceiros({ q: termo, fornecedor: 1, ativo: 1, limit: 8 });
      const lista = Array.isArray(data) ? data : [];
      setParceiroResultados(lista);

      if (lista.length === 1) {
        selecionarParceiro(lista[0]);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao buscar credores');
    } finally {
      setParceiroBuscando(false);
    }
  }

  async function salvarNovoParceiro() {
    try {
      const payload = {
        ...novoParceiro,
        cpf_cnpj: normalizarDocumento(novoParceiro.cpf_cnpj),
        telefone: onlyDigits(novoParceiro.telefone),
        cep: onlyDigits(novoParceiro.cep)
      };

      const parceiro = await criarParceiro(payload);
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
      diretoria_fluxo_codigo: '',
      apropriacao_id: '',
      tipo_solicitacao_id: '',
      tipo_sub_id: '',
      contrato_id: '',
      codigo_contrato: ''
    }));
    setContratos([]);
    setApropriacoes([]);
    setContratosRef([]);
    setRefContratoBusca('');
    setRefResultados([]);
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
  const camposNovaSolicitacao = useMemo(() => (
    resolverCamposNovaSolicitacaoFrontend(
      comportamentoTipo,
      camposNovaSolicitacaoConfig,
      form.tipo_solicitacao_id,
      {
        apropriacoesDisponiveis: moduloApropriacoesHabilitado,
        areaResponsavel: form.area_responsavel
      }
    )
  ), [comportamentoTipo, camposNovaSolicitacaoConfig, form.tipo_solicitacao_id, form.area_responsavel, moduloApropriacoesHabilitado]);
  const campoVisivel = (campo) => camposNovaSolicitacao?.[campo]?.visivel !== false;
  const campoObrigatorio = (campo) => Boolean(camposNovaSolicitacao?.[campo]?.obrigatorio);
  const subtipoObrigatorio = campoObrigatorio('subtipo');
  const medicaoObrigatoria = campoObrigatorio('periodo_medicao');
  const solicitacaoCompra = !comportamentoTipo.mostrar_apropriacao_principal && !comportamentoTipo.mostrar_valor;
  const exigeApropriacaoPrincipal =
    Boolean(form.tipo_solicitacao_id) &&
    obraSelecionadaEhObra &&
    campoObrigatorio('apropriacao_principal');
  const tipoSemValor = !campoVisivel('valor');
  const exibirCamposContrato = obraSelecionadaEhObra && campoVisivel('contrato');
  const exibirCampoApropriacao = obraSelecionadaEhObra && moduloApropriacoesHabilitado && campoVisivel('apropriacao_principal');
  const camposContratoObrigatorios = campoObrigatorio('contrato');
  const exibirCampoSubtipo = campoVisivel('subtipo');
  const exibirCampoCredor = campoVisivel('credor');
  const exibirDataVencimento = campoVisivel('data_vencimento');
  const dataVencimentoObrigatoria = campoObrigatorio('data_vencimento');
  const exibirPeriodoMedicao = campoVisivel('periodo_medicao');
  const exibirRefContratoAbertura = campoVisivel('ref_contrato_abertura');
  const exibirItensApropriacao = obraSelecionadaEhObra && campoVisivel('itens_apropriacao');
  const refContratoAberturaObrigatoria = campoObrigatorio('ref_contrato_abertura');
  const itensApropriacaoObrigatorio = campoObrigatorio('itens_apropriacao');
  const exibirDescricao = campoVisivel('descricao');
  const descricaoObrigatoria = campoObrigatorio('descricao');
  const exibirAnexos = campoVisivel('anexos');

  useEffect(() => {
    if (!exibirCamposContrato) {
      setForm(prev => ({
        ...prev,
        tipo_sub_id: '',
        contrato_id: '',
        codigo_contrato: '',
        ref_contrato_abertura: ''
      }));
      setRefContratoBusca('');
      setRefResultados([]);
      setContratosRef([]);
    }
    if (tipoSemValor) {
      setForm(prev => ({ ...prev, valor: '' }));
      setValorTexto('');
    }
    if (!exigeApropriacaoPrincipal) {
      setForm(prev => ({ ...prev, apropriacao_id: '', itens_apropriacao: '' }));
    }
    if (!exibirCampoCredor) {
      limparParceiroSelecionado();
    }
    if (!exibirDataVencimento) {
      setForm(prev => ({ ...prev, data_vencimento: '' }));
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
    tipoSemValor,
    exigeApropriacaoPrincipal,
    exibirCampoCredor,
    exibirDataVencimento,
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

  async function buscarRefContrato() {
    try {
      if (!form.obra_id) {
        alert('Selecione uma obra antes de buscar a ref. do contrato.');
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
    setForm(prev => ({
      ...prev,
      contrato_id: String(contrato.id),
      codigo_contrato: contrato.codigo || ''
    }));
    setRefContratoBusca(contrato.ref_contrato || '');
    setRefResultados([]);
  }

  function limparRefContrato() {
    setRefContratoBusca('');
    setRefResultados([]);
    setContratosRef([]);
    setForm(prev => ({ ...prev, contrato_id: '', codigo_contrato: '' }));
  }

  function removerArquivo(index) {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  }

  function adicionarArquivos(files) {
    const { arquivos: proximoEstado, rejeitados } = concatenarAnexosPendentes(arquivos, files, {
      maxFileSizeMb: UPLOAD_MAX_FILE_SIZE_MB_PADRAO
    });
    setArquivos(proximoEstado);
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
      apropriacao_id: '',
      itens_apropriacao: ''
    }));
    setObraBusca(formatarRotuloBuscaObra(obra));
    setObraBuscaAtiva(false);
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

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.obra_id) {
      alert('Selecione uma obra/centro de custo');
      return;
    }

    if (exigeApropriacaoPrincipal && !form.apropriacao_id) {
      alert('Selecione a apropriação principal da solicitação.');
      return;
    }

    if (subtipoObrigatorio && !form.tipo_sub_id) {
      alert('Para continuar, selecione o subtipo.');
      return;
    }
    if (!tipoSemValor && (form.valor === '' || form.valor === null || form.valor === undefined)) {
      alert('Informe o valor da solicitação.');
      return;
    }
    if (medicaoObrigatoria && (!form.data_inicio_medicao || !form.data_fim_medicao)) {
      alert('Para Medicao, informe data inicial e data final.');
      return;
    }
    if (dataVencimentoObrigatoria && !form.data_vencimento) {
      alert('Informe a data de vencimento.');
      return;
    }
    if (camposContratoObrigatorios && !form.contrato_id) {
      alert('Selecione um contrato.');
      return;
    }
    if (camposContratoObrigatorios && !refContratoBusca.trim()) {
      alert('Informe a ref. do contrato.');
      return;
    }
    if (itensApropriacaoObrigatorio && !form.itens_apropriacao) {
      alert('Para Abertura de Contrato, informe os itens de apropriacao.');
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

    if (exibirDataVencimento && form.data_vencimento && String(form.data_vencimento) < String(hojeInput)) {
      alert('Data de vencimento não pode ser menor que a data atual.');
      return;
    }

    if (descricaoObrigatoria && !form.descricao.trim()) {
      alert('Informe a descrição da solicitação.');
      return;
    }

    const payload = {
      ...form,
      parceiro_id: exibirCampoCredor ? (form.parceiro_id || null) : null,
      apropriacao_id: exibirCampoApropriacao ? (form.apropriacao_id || null) : null,
      contrato_id: exibirCamposContrato ? (form.contrato_id || null) : null,
      tipo_sub_id: exibirCampoSubtipo ? (form.tipo_sub_id || null) : null,
      tipo_macro_id: form.tipo_solicitacao_id || null,
      data_vencimento: exibirDataVencimento ? (form.data_vencimento || null) : null,
      data_inicio_medicao: exibirPeriodoMedicao ? (form.data_inicio_medicao || null) : null,
      data_fim_medicao: exibirPeriodoMedicao ? (form.data_fim_medicao || null) : null,
      itens_apropriacao: exibirItensApropriacao ? (form.itens_apropriacao || null) : null,
      ref_contrato_abertura: exibirRefContratoAbertura ? (form.ref_contrato_abertura || null) : null,
      descricao: exibirDescricao ? form.descricao : ''
    };

    try {
      const solicitacao = await createSolicitacao(payload);

      if (exibirAnexos && arquivos.length > 0) {
        await uploadArquivos({
          files: extrairFilesAnexosPendentes(arquivos),
          solicitacao_id: solicitacao.id,
          tipo: 'SOLICITACAO'
        });
      }

      alert('Solicitacao criada com sucesso');
      setForm({
        obra_id: '',
        parceiro_id: '',
        apropriacao_id: '',
        tipo_solicitacao_id: '',
        tipo_sub_id: '',
        contrato_id: '',
        codigo_contrato: '',
        area_responsavel: '',
        diretoria_fluxo_codigo: '',
        descricao: '',
        itens_apropriacao: '',
        ref_contrato_abertura: '',
        valor: '',
        data_vencimento: '',
        data_inicio_medicao: '',
        data_fim_medicao: ''
      });
      setContratos([]);
      setTiposSub([]);
      setArquivos([]);
      setObraBusca('');
      setObraBuscaAtiva(false);
      setValorTexto('');
      setParceiroBusca('');
      setParceiroResultados([]);
      setParceiroSelecionado(null);
      setParceiroBuscaExecutada(false);
      setRefContratoBusca('');
      setRefResultados([]);
      setContratosRef([]);
      if (anexosRef.current) {
        anexosRef.current.value = '';
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao criar solicitação');
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
  const hoje = new Date();
  const hojeInput = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const classificacaoObraSelecionada = String(
    obraSelecionadaEhObra
      ? obraSelecionada?.classificacao || obraSelecionada?.classificacao_obra || ''
      : ''
  ).trim().toUpperCase();
  const diretoriaSugerida = classificacaoObraSelecionada
    ? aprovacaoDiretoriaConfig?.diretorias?.[classificacaoObraSelecionada] || ''
    : '';
  const tiposFiltradosPorSetor = useMemo(() => {
    const setorKey = String(form.area_responsavel || '').trim().toUpperCase();
    if (!setorKey) return [];

    const tiposAtivos = Array.isArray(tipos)
      ? tipos.filter(tipo => tipo?.ativo !== false)
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
  }, [tipos, tiposPorSetorConfig, form.area_responsavel]);

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
    if (!form.obra_id) {
      if (form.diretoria_fluxo_codigo) {
        setForm(prev => ({ ...prev, diretoria_fluxo_codigo: '' }));
      }
      return;
    }
    setForm(prev => {
      if (prev.diretoria_fluxo_codigo === diretoriaSugerida) return prev;
      return { ...prev, diretoria_fluxo_codigo: diretoriaSugerida || '' };
    });
  }, [form.obra_id, form.diretoria_fluxo_codigo, diretoriaSugerida]);

  useEffect(() => {
    if (!form.obra_id || !form.area_responsavel || !form.tipo_solicitacao_id) return;

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
    navigate
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
            {obraSelecionada && (
              <div className="nova-solicitacao-selection-card nova-solicitacao-obra-selection border border-[var(--c-border)] bg-[var(--c-surface)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">
                      {getTipoCentroCustoLabel(obraSelecionada)} selecionada
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[var(--c-text)] break-words">
                      {obraSelecionada.nome || 'Obra sem nome'}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--c-muted)]">
                      <span>Código: {obraSelecionada.codigo || '-'}</span>
                      <span>{formatarLocalidadeObra(obraSelecionada)}</span>
                    </div>
                  </div>
                  <span className="nova-solicitacao-obra-badge nova-solicitacao-obra-badge-selected">
                    ID {obraSelecionada.id}
                  </span>
                </div>
              </div>
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

          <label className="grid gap-1 text-sm lg:col-span-4">
            Área Responsável
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

          <label className="grid gap-1 text-sm lg:col-span-4">
            Diretoria de aprovação
            <select
              name="diretoria_fluxo_codigo"
              onChange={handleChange}
              className="input input-sm"
              value={form.diretoria_fluxo_codigo}
              disabled={!form.obra_id || !diretoriaSugerida}
            >
              <option value="">
                {!form.obra_id
                  ? 'Selecione a obra/centro de custo primeiro'
                  : diretoriaSugerida
                    ? 'Selecione'
                    : 'Sem diretoria configurada'}
              </option>
              {diretoriaSugerida && (
                <option value={diretoriaSugerida}>{diretoriaSugerida}</option>
              )}
            </select>
          </label>

          <label className="grid gap-1 text-sm lg:col-span-4">
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

          {exibirCampoCredor && (
            <label className="grid gap-1 text-sm lg:col-span-6">
              Credor
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
                  onClick={buscarParceirosRelacionados}
                  disabled={parceiroBuscando}
                >
                  {parceiroBuscando ? 'Buscando...' : 'Buscar'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setModalParceiroAberto(true)}
                >
                  Cadastrar
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
                  Nenhum credor encontrado. Use o botao Cadastrar para criar uma nova pessoa como credor.
                </span>
              )}
            </label>
          )}

          {exibirCampoApropriacao && (
            <label className="grid gap-1 text-sm lg:col-span-6">
              Apropriacao da Solicitacao na Obra
              <ApropriacaoAutocomplete
                value={form.apropriacao_id}
                options={apropriacoes}
                onChange={(id) => setForm({ ...form, apropriacao_id: id })}
                disabled={!form.obra_id || solicitacaoCompra}
                required={exigeApropriacaoPrincipal}
                inputClassName="input input-sm w-full"
                disabledPlaceholder={
                  !form.obra_id
                    ? 'Selecione a obra primeiro'
                    : 'Não se aplica para solicitação de compra'
                }
              />
              {solicitacaoCompra ? (
                <span className="text-xs text-gray-500">
                  Para solicitação de compra, a apropriação é feita por item no módulo de compras.
                </span>
              ) : exigeApropriacaoPrincipal ? (
                <span className="text-xs text-gray-500">
                  Campo obrigatório para solicitações gerais vinculadas a esta obra.
                </span>
              ) : null}
              {form.obra_id && apropriacoes.length === 0 && !solicitacaoCompra && (
                <span className="text-xs text-gray-500">
                  Nenhuma apropriacao ativa encontrada para esta obra.
                </span>
              )}
            </label>
          )}

          {exibirCamposContrato && (
            <label className="grid gap-1 text-sm lg:col-span-12">
              Ref. do Contrato
              <div className="flex gap-2 nova-solicitacao-inline-actions">
                <input
                  className="input input-sm"
                  placeholder="Buscar por referência do contrato"
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
        </div>

        {exibirCamposContrato && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 nova-solicitacao-grid-secundaria">
            {exibirCampoSubtipo && (
              <label className="grid gap-1 text-sm">
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
                    Obrigatório para Adm Local de Obra.
                  </span>
                )}
              </label>
            )}

            <label className="grid gap-1 text-sm">
              Contrato
              <select
                name="contrato_id"
                onChange={e => {
                  const contratoId = e.target.value;
                  const contrato = contratosDisponiveis.find(c => String(c.id) === String(contratoId));
                  setForm(prev => ({
                    ...prev,
                    contrato_id: contratoId,
                    codigo_contrato: contrato?.codigo || ''
                  }));
                  setRefContratoBusca(contrato?.ref_contrato || '');
                  setRefResultados([]);
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
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 nova-solicitacao-grid-curta">
          {!tipoSemValor && (
            <label className="grid gap-1 text-sm">
              Valor
              <input
                type="text"
                className="input input-sm"
                value={valorTexto}
                onChange={e => atualizarValor(e.target.value)}
                placeholder="R$ 0,00"
                required={campoObrigatorio('valor')}
              />
            </label>
          )}

          {exibirDataVencimento && (
          <label className="grid gap-1 text-sm">
            Data de vencimento
            <input
              name="data_vencimento"
              type="date"
              onChange={handleChange}
              className="input input-sm"
              value={form.data_vencimento}
              min={hojeInput}
              required={dataVencimentoObrigatoria}
            />
          </label>
          )}
        </div>

        {exibirPeriodoMedicao && (
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

        {exibirDescricao && (
        <label className="grid gap-1 text-sm">
          Descrição
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
            required={descricaoObrigatoria}
            value={form.descricao}
          />
          <span className="text-xs text-gray-500">
            Descrição breve, com no máximo 50 caracteres.
          </span>
          </label>
        )}

        <div className="nova-solicitacao-actions-bar">
          {exibirAnexos && (
          <label className="grid gap-1 text-sm nova-solicitacao-anexos">
          Anexos
          <div className="flex items-center gap-2 flex-wrap nova-solicitacao-inline-actions nova-solicitacao-anexos-head">
            <label className="btn btn-outline btn-sm inline-flex items-center gap-2 cursor-pointer">
              <HiPaperClip className="w-4 h-4" />
              <span>Anexar arquivos</span>
              <input
                type="file"
                multiple
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
          <button className="btn btn-primary btn-sm">
            Criar Solicitação
          </button>
          </div>
        </div>
        </div>
      </form>

      {modalParceiroAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
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

            <div className="flex justify-end gap-2">
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

    </div>
  );
}
