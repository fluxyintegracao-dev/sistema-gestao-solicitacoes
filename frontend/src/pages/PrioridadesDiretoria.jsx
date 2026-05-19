import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  cancelarLotePrioridadeDiretoria,
  criarLotePrioridadeDiretoria,
  excluirLotePrioridadeDiretoria,
  finalizarPedidoPrioridadeDiretoria,
  finalizarLotePrioridadeDiretoria,
  getLotePrioridadeDiretoria,
  getPrioridadesDiretoriaContexto,
  getSolicitacoesDisponiveisPrioridadeDiretoria,
  listarLotesPrioridadeDiretoria,
  reabrirLotePrioridadeDiretoria,
  salvarSelecaoLotePrioridadeDiretoria
} from '../services/prioridadesDiretoria';

const SELECAO_RASCUNHO_PREFIX = 'prioridades_diretoria_selecao_rascunho';

function formatarValor(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '-';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataHora(valor) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleString('pt-BR');
}

function formatarData(valor) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleDateString('pt-BR');
}

function normalizarBusca(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarIdsSelecao(ids) {
  return Array.from(
    new Set((Array.isArray(ids) ? ids : [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0))
  );
}

function BadgeStatus({ status }) {
  const valor = String(status || '').trim().toUpperCase();
  const classes = {
    ABERTO: 'bg-amber-100 text-amber-800 border-amber-200',
    FINALIZADO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CANCELADO: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classes[valor] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {valor || '-'}
    </span>
  );
}

function BadgeStatusSolicitacao({ status }) {
  const valor = String(status || '').trim().toUpperCase();
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
      {valor || '-'}
    </span>
  );
}

export default function PrioridadesDiretoria() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contexto, setContexto] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [loteSelecionadoId, setLoteSelecionadoId] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [solicitacoesDisponiveis, setSolicitacoesDisponiveis] = useState([]);
  const [obrasDisponiveis, setObrasDisponiveis] = useState([]);
  const [selecionadasIds, setSelecionadasIds] = useState([]);
  const [selecionadasCache, setSelecionadasCache] = useState({});
  const [buscaDisponiveis, setBuscaDisponiveis] = useState('');
  const [filtroItensLote, setFiltroItensLote] = useState('');
  const [filtroObraId, setFiltroObraId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [loadingDisponiveis, setLoadingDisponiveis] = useState(false);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [salvandoSelecao, setSalvandoSelecao] = useState(false);
  const [finalizandoPedido, setFinalizandoPedido] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [formNovoLote, setFormNovoLote] = useState({
    classificacao_alvo: '',
    valor_disponivel: '',
    observacao: ''
  });

  const diretoriasDisponiveis = contexto?.diretorias_disponiveis || [];
  const permissoes = contexto?.permissoes || {};
  const isLoteSolicitacaoDiretoria = String(detalhe?.tipo_lote || '').toUpperCase() === 'SOLICITACAO_DIRETORIA';
  const isCriacaoDirAdmin = Boolean(permissoes.is_dir_admin || permissoes.is_superadmin);
  const podeEditarSelecaoLote = Boolean(detalhe?.pode_editar_selecao || detalhe?.pode_finalizar);
  const podeFinalizarPedidoDiretoria = Boolean(
    isLoteSolicitacaoDiretoria &&
    podeEditarSelecaoLote &&
    !detalhe?.pode_finalizar &&
    detalhe?.status === 'ABERTO'
  );

  function chaveRascunhoSelecao(loteId) {
    const usuarioId = Number(user?.id);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0 || !loteId) return null;
    return `${SELECAO_RASCUNHO_PREFIX}_${usuarioId}_${loteId}`;
  }

  function lerRascunhoSelecao(loteId) {
    const chave = chaveRascunhoSelecao(loteId);
    if (!chave) return null;
    try {
      const payload = JSON.parse(localStorage.getItem(chave) || 'null');
      if (!payload) return null;
      return {
        ids: normalizarIdsSelecao(payload.ids),
        cache: payload.cache && typeof payload.cache === 'object' ? payload.cache : {}
      };
    } catch {
      return null;
    }
  }

  function salvarRascunhoSelecao(loteId, ids, cache) {
    const chave = chaveRascunhoSelecao(loteId);
    if (!chave) return;
    localStorage.setItem(chave, JSON.stringify({
      ids: normalizarIdsSelecao(ids),
      cache: cache && typeof cache === 'object' ? cache : {},
      updatedAt: new Date().toISOString()
    }));
  }

  function removerRascunhoSelecao(loteId) {
    const chave = chaveRascunhoSelecao(loteId);
    if (chave) localStorage.removeItem(chave);
  }

  useEffect(() => {
    carregarInicial();
  }, []);

  useEffect(() => {
    if (!formNovoLote.classificacao_alvo && diretoriasDisponiveis.length > 0) {
      setFormNovoLote((atual) => ({
        ...atual,
        classificacao_alvo: diretoriasDisponiveis[0].classificacao
      }));
    }
  }, [diretoriasDisponiveis, formNovoLote.classificacao_alvo]);

  useEffect(() => {
    if (!contexto?.permissoes) return;
    carregarLotes();
  }, [filtroStatus, contexto?.permissoes]);

  useEffect(() => {
    if (!loteSelecionadoId) {
      setDetalhe(null);
      setSolicitacoesDisponiveis([]);
      setObrasDisponiveis([]);
      setSelecionadasIds([]);
      setSelecionadasCache({});
      setBuscaDisponiveis('');
      setFiltroItensLote('');
      setFiltroObraId('');
      return;
    }
    carregarDetalheLote(loteSelecionadoId);
  }, [loteSelecionadoId]);

  useEffect(() => {
    if (!detalhe?.id || detalhe.status !== 'ABERTO' || !podeEditarSelecaoLote) {
      setSolicitacoesDisponiveis([]);
      setObrasDisponiveis([]);
      setSelecionadasIds([]);
      setSelecionadasCache({});
      setBuscaDisponiveis('');
      setFiltroItensLote('');
      setFiltroObraId('');
      return;
    }

    const timeout = setTimeout(() => {
      carregarSolicitacoesDisponiveis(detalhe.id, buscaDisponiveis, filtroObraId);
    }, 250);

    return () => clearTimeout(timeout);
  }, [detalhe?.id, detalhe?.status, podeEditarSelecaoLote, buscaDisponiveis, filtroObraId]);

  useEffect(() => {
    if (!detalhe?.id || detalhe.status !== 'ABERTO' || !podeEditarSelecaoLote) return;
    salvarRascunhoSelecao(detalhe.id, selecionadasIds, selecionadasCache);
  }, [detalhe?.id, detalhe?.status, podeEditarSelecaoLote, selecionadasIds, selecionadasCache, user?.id]);

  const mapaDisponiveis = useMemo(() => {
    const mapa = new Map();
    (solicitacoesDisponiveis || []).forEach((item) => mapa.set(Number(item.id), item));
    return mapa;
  }, [solicitacoesDisponiveis]);

  const solicitacoesSelecionadas = useMemo(() => (
    selecionadasIds
      .map((id) => selecionadasCache[String(id)] || mapaDisponiveis.get(Number(id)))
      .filter(Boolean)
  ), [selecionadasIds, selecionadasCache, mapaDisponiveis]);

  const selecionadasVisiveisCount = useMemo(() => (
    solicitacoesDisponiveis.filter((item) => selecionadasIds.includes(Number(item.id))).length
  ), [solicitacoesDisponiveis, selecionadasIds]);

  const totalSelecionado = useMemo(() => (
    solicitacoesSelecionadas.reduce((total, item) => total + Number(item.valor_prioridade || 0), 0)
  ), [solicitacoesSelecionadas]);

  const resumoLote = useMemo(() => {
    const valorDisponivel = Number(detalhe?.valor_disponivel || 0);
    const valorUtilizadoBase = Number(detalhe?.valor_utilizado || 0);
    const itensBase = Number(detalhe?.itens?.length || detalhe?.itens_count || 0);
    const abertoComSelecao = detalhe?.status === 'ABERTO' && podeEditarSelecaoLote;

    const valorUtilizadoProjetado = abertoComSelecao
      ? totalSelecionado
      : valorUtilizadoBase;
    const saldoProjetado = isLoteSolicitacaoDiretoria
      ? 0
      : Math.max(valorDisponivel - valorUtilizadoProjetado, 0);
    const itensProjetados = abertoComSelecao
      ? solicitacoesSelecionadas.length
      : itensBase;

    return {
      valorDisponivel,
      valorUtilizadoBase,
      valorUtilizadoProjetado,
      saldoProjetado,
      itensBase,
      itensProjetados,
      possuiPrevia: abertoComSelecao && solicitacoesSelecionadas.length > 0
    };
  }, [
    detalhe?.valor_disponivel,
    detalhe?.valor_utilizado,
    detalhe?.itens,
    detalhe?.itens_count,
    detalhe?.status,
    podeEditarSelecaoLote,
    isLoteSolicitacaoDiretoria,
    solicitacoesSelecionadas.length,
    totalSelecionado
  ]);

  const excedeuLimite = !isLoteSolicitacaoDiretoria && resumoLote.valorUtilizadoProjetado > resumoLote.valorDisponivel;

  const itensLoteFiltrados = useMemo(() => {
    const itens = Array.isArray(detalhe?.itens) ? detalhe.itens : [];
    const termo = normalizarBusca(filtroItensLote);
    if (!termo) return itens;

    return itens.filter((item) => {
      const solicitacao = item?.solicitacao || {};
      const campos = [
        solicitacao.codigo,
        solicitacao.numero_sienge,
        solicitacao.obra?.nome,
        solicitacao.obra?.codigo,
        solicitacao.tipo?.nome
      ].map(normalizarBusca);

      return campos.some((campo) => campo.includes(termo));
    });
  }, [detalhe?.itens, filtroItensLote]);

  function abrirSolicitacao(solicitacaoId) {
    const id = Number(solicitacaoId);
    if (!Number.isInteger(id) || id <= 0) return;
    navigate(`/solicitacoes/${id}`);
  }

  async function carregarInicial() {
    try {
      setLoading(true);
      const data = await getPrioridadesDiretoriaContexto();
      setContexto(data);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar modulo de prioridades');
    } finally {
      setLoading(false);
    }
  }

  async function carregarLotes() {
    try {
      const data = await listarLotesPrioridadeDiretoria(
        filtroStatus ? { status: filtroStatus } : {}
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      setLotes(items);

      setLoteSelecionadoId((atual) => {
        if (atual && items.some((item) => Number(item.id) === Number(atual))) {
          return atual;
        }
        return items[0]?.id || null;
      });
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar lotes de prioridade');
    }
  }

  async function carregarDetalheLote(id) {
    try {
      setLoadingDetalhe(true);
      const data = await getLotePrioridadeDiretoria(id);
      const item = data?.item || null;
      const itensSalvos = Array.isArray(item?.itens) ? item.itens : [];

      if (item?.status === 'ABERTO') {
        const idsSalvos = itensSalvos
          .map((linha) => Number(linha?.solicitacao?.id))
          .filter((numero) => Number.isInteger(numero) && numero > 0);
        const cacheSalvo = {};
        itensSalvos.forEach((linha) => {
          if (linha?.solicitacao?.id) {
            cacheSalvo[String(linha.solicitacao.id)] = {
              ...linha.solicitacao,
              valor_prioridade: linha.valor_considerado
            };
          }
        });
        const rascunho = lerRascunhoSelecao(id);
        const idsRascunho = normalizarIdsSelecao(rascunho?.ids);
        const cacheRascunho = rascunho?.cache && typeof rascunho.cache === 'object' ? rascunho.cache : {};

        if (rascunho) {
          setSelecionadasIds(idsRascunho);
          setSelecionadasCache({
            ...cacheSalvo,
            ...cacheRascunho
          });
        } else {
          setSelecionadasIds(idsSalvos);
          setSelecionadasCache(cacheSalvo);
        }
      } else {
        setSolicitacoesDisponiveis([]);
        setObrasDisponiveis([]);
        setSelecionadasIds([]);
        setSelecionadasCache({});
        removerRascunhoSelecao(id);
      }

      setDetalhe(item);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar detalhe do lote');
    } finally {
      setLoadingDetalhe(false);
    }
  }

  async function carregarSolicitacoesDisponiveis(id, busca = '', obraId = '') {
    try {
      setLoadingDisponiveis(true);
      const params = {};
      if (busca) params.busca = busca;
      if (obraId) params.obra_id = obraId;
      const data = await getSolicitacoesDisponiveisPrioridadeDiretoria(id, params);
      const items = Array.isArray(data?.items) ? data.items : [];
      const obras = Array.isArray(data?.obras) ? data.obras : [];
      setSolicitacoesDisponiveis(items);
      setObrasDisponiveis(obras);
      setSelecionadasCache((atual) => {
        const proximo = { ...atual };
        items.forEach((item) => {
          if (selecionadasIds.includes(Number(item.id))) {
            proximo[String(item.id)] = item;
          }
        });
        return proximo;
      });
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar solicitacoes disponiveis');
    } finally {
      setLoadingDisponiveis(false);
    }
  }

  function atualizarCampoNovoLote(campo, valor) {
    setFormNovoLote((atual) => ({ ...atual, [campo]: valor }));
  }

  async function criarLote(event) {
    event.preventDefault();
    try {
      setSalvandoLote(true);
      const payload = {
        classificacao_alvo: formNovoLote.classificacao_alvo,
        observacao: formNovoLote.observacao
      };

      if (isCriacaoDirAdmin) {
        payload.valor_disponivel = Number(formNovoLote.valor_disponivel);
      }

      const resposta = await criarLotePrioridadeDiretoria(payload);
      setFormNovoLote({
        classificacao_alvo: diretoriasDisponiveis[0]?.classificacao || '',
        valor_disponivel: '',
        observacao: ''
      });
      await carregarLotes();
      if (resposta?.item?.id) {
        setLoteSelecionadoId(resposta.item.id);
      }
      alert(isCriacaoDirAdmin
        ? 'Lote de prioridade criado com sucesso.'
        : 'Pedido de prioridade criado. Selecione as solicitacoes e finalize o pedido para aprovacao.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao criar lote de prioridade');
    } finally {
      setSalvandoLote(false);
    }
  }

  function limparSelecaoDisponiveis() {
    setSelecionadasIds([]);
    setSelecionadasCache({});
    removerRascunhoSelecao(detalhe?.id);
  }

  function alternarSolicitacao(id) {
    setSelecionadasIds((atual) => {
      const numeroId = Number(id);
      if (atual.includes(numeroId)) {
        setSelecionadasCache((cacheAtual) => {
          const proximo = { ...cacheAtual };
          delete proximo[String(numeroId)];
          return proximo;
        });
        return atual.filter((item) => Number(item) !== numeroId);
      }
      const itemSelecionado = mapaDisponiveis.get(numeroId);
      if (itemSelecionado) {
        setSelecionadasCache((cacheAtual) => ({
          ...cacheAtual,
          [String(numeroId)]: itemSelecionado
        }));
      }
      return [...atual, numeroId];
    });
  }

  function obterIdsIgnoradosPrioridade(resposta) {
    const ids = resposta?.item?.solicitacao_ids_ignorados || resposta?.solicitacao_ids_ignorados || [];
    return Array.isArray(ids)
      ? ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [];
  }

  function removerSelecionadasIgnoradas(idsIgnorados = []) {
    if (!Array.isArray(idsIgnorados) || idsIgnorados.length === 0) return;
    const ignoradosSet = new Set(idsIgnorados.map(Number));
    setSelecionadasIds((atual) => atual.filter((id) => !ignoradosSet.has(Number(id))));
    setSelecionadasCache((atual) => {
      const proximo = { ...atual };
      idsIgnorados.forEach((id) => {
        delete proximo[String(id)];
      });
      return proximo;
    });
  }

  function descreverSolicitacoesIgnoradas(idsIgnorados = []) {
    if (!Array.isArray(idsIgnorados) || idsIgnorados.length === 0) return '';

    const descricoes = idsIgnorados.map((id) => {
      const item =
        selecionadasCache[String(id)] ||
        mapaDisponiveis.get(Number(id)) ||
        solicitacoesDisponiveis.find((solicitacao) => Number(solicitacao.id) === Number(id));

      const codigo = item?.codigo || `ID ${id}`;
      const obra = item?.obra?.nome ? ` - ${item.obra.nome}` : '';
      const status = item?.status_global ? ` - ${item.status_global}` : '';
      return `${codigo}${obra}${status}`;
    });

    const limite = 12;
    const visiveis = descricoes.slice(0, limite);
    const restantes = descricoes.length - visiveis.length;
    return [
      'Solicitacoes que precisam ser revisadas:',
      ...visiveis.map((item) => `- ${item}`),
      ...(restantes > 0 ? [`- mais ${restantes} solicitacao(oes)`] : [])
    ].join('\n');
  }

  function mensagemSolicitacoesIgnoradas(idsIgnorados = []) {
    const detalheIgnorados = descreverSolicitacoesIgnoradas(idsIgnorados);
    return detalheIgnorados ? `\n\n${detalheIgnorados}` : '';
  }

  async function tratarErroElegibilidade(error, fallback) {
    const idsIgnorados = obterIdsIgnoradosPrioridade(error?.data);
    if (idsIgnorados.length > 0) {
      const complemento = mensagemSolicitacoesIgnoradas(idsIgnorados);
      removerSelecionadasIgnoradas(idsIgnorados);
      if (detalhe?.id) {
        await carregarSolicitacoesDisponiveis(detalhe.id, buscaDisponiveis, filtroObraId);
      }
      alert(`${error?.message || fallback} ${idsIgnorados.length} solicitacao(oes) foram removidas da selecao. Tente novamente com as restantes.${complemento}`);
      return;
    }
    alert(error?.message || fallback);
  }

  async function finalizarLote() {
    if (!detalhe?.id || solicitacoesSelecionadas.length === 0) {
      alert('Selecione ao menos uma solicitacao.');
      return;
    }
    if (excedeuLimite) {
      alert('O total selecionado excede o valor disponivel do lote.');
      return;
    }
    if (!window.confirm(`Finalizar lote com ${solicitacoesSelecionadas.length} solicitacao(oes)?`)) {
      return;
    }

    try {
      setFinalizando(true);
      const resposta = await finalizarLotePrioridadeDiretoria(detalhe.id, {
        solicitacao_ids: selecionadasIds
      });
      const idsIgnorados = obterIdsIgnoradosPrioridade(resposta);
      const complemento = mensagemSolicitacoesIgnoradas(idsIgnorados);
      removerRascunhoSelecao(detalhe.id);
      await carregarLotes();
      await carregarDetalheLote(detalhe.id);
      setSelecionadasIds([]);
      alert(idsIgnorados.length > 0
        ? `Lote finalizado com sucesso. ${idsIgnorados.length} solicitacao(oes) foram ignoradas por nao estarem mais elegiveis.${complemento}`
        : 'Lote finalizado com sucesso.');
    } catch (error) {
      console.error(error);
      await tratarErroElegibilidade(error, 'Erro ao finalizar lote');
    } finally {
      setFinalizando(false);
    }
  }

  async function finalizarPedidoDiretoria() {
    if (!detalhe?.id || solicitacoesSelecionadas.length === 0) {
      alert('Selecione ao menos uma solicitacao.');
      return;
    }
    if (excedeuLimite) {
      alert('O total selecionado excede o valor disponivel do lote.');
      return;
    }
    if (!window.confirm(`Finalizar pedido com ${solicitacoesSelecionadas.length} solicitacao(oes) para aprovacao?`)) {
      return;
    }

    try {
      setFinalizandoPedido(true);
      const resposta = await finalizarPedidoPrioridadeDiretoria(detalhe.id, {
        solicitacao_ids: selecionadasIds
      });
      const idsIgnorados = obterIdsIgnoradosPrioridade(resposta);
      const complemento = mensagemSolicitacoesIgnoradas(idsIgnorados);
      removerRascunhoSelecao(detalhe.id);
      await carregarLotes();
      await carregarDetalheLote(detalhe.id);
      alert(idsIgnorados.length > 0
        ? `Pedido finalizado e enviado para aprovacao. ${idsIgnorados.length} solicitacao(oes) foram ignoradas por nao estarem mais elegiveis.${complemento}`
        : 'Pedido finalizado e enviado para aprovacao.');
    } catch (error) {
      console.error(error);
      await tratarErroElegibilidade(error, 'Erro ao finalizar pedido de prioridade');
    } finally {
      setFinalizandoPedido(false);
    }
  }

  async function salvarSelecaoLote() {
    if (!detalhe?.id) return;
    if (excedeuLimite) {
      alert('O total selecionado excede o valor disponivel do lote.');
      return;
    }

    try {
      setSalvandoSelecao(true);
      const resposta = await salvarSelecaoLotePrioridadeDiretoria(detalhe.id, {
        solicitacao_ids: selecionadasIds
      });
      const idsIgnorados = obterIdsIgnoradosPrioridade(resposta);
      const complemento = mensagemSolicitacoesIgnoradas(idsIgnorados);
      await carregarLotes();
      await carregarDetalheLote(detalhe.id);
      alert(idsIgnorados.length > 0
        ? `Selecao salva com sucesso. ${idsIgnorados.length} solicitacao(oes) foram ignoradas por nao estarem mais elegiveis.${complemento}`
        : 'Selecao salva com sucesso.');
    } catch (error) {
      console.error(error);
      await tratarErroElegibilidade(error, 'Erro ao salvar selecao do lote');
    } finally {
      setSalvandoSelecao(false);
    }
  }

  async function reabrirLote() {
    if (!detalhe?.id) return;
    if (!window.confirm('Reabrir este lote finalizado para edicao?')) {
      return;
    }

    try {
      setReabrindo(true);
      await reabrirLotePrioridadeDiretoria(detalhe.id);
      await carregarLotes();
      await carregarDetalheLote(detalhe.id);
      alert('Lote reaberto com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao reabrir lote');
    } finally {
      setReabrindo(false);
    }
  }

  async function cancelarLote() {
    if (!detalhe?.id) return;
    if (!window.confirm('Cancelar este lote de prioridade?')) {
      return;
    }

    try {
      setCancelando(true);
      await cancelarLotePrioridadeDiretoria(detalhe.id);
      await carregarLotes();
      await carregarDetalheLote(detalhe.id);
      alert('Lote cancelado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao cancelar lote');
    } finally {
      setCancelando(false);
    }
  }

  async function excluirLote() {
    if (!detalhe?.id) return;
    if (!window.confirm('Excluir este lote de prioridade? Esta acao nao podera ser desfeita.')) {
      return;
    }

    try {
      setExcluindo(true);
      await excluirLotePrioridadeDiretoria(detalhe.id);
      setDetalhe(null);
      setLoteSelecionadoId(null);
      setSolicitacoesDisponiveis([]);
      setObrasDisponiveis([]);
      setSelecionadasIds([]);
      setSelecionadasCache({});
      await carregarLotes();
      alert('Lote excluido com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao excluir lote');
    } finally {
      setExcluindo(false);
    }
  }

  if (loading) {
    return <p>Carregando modulo de prioridades...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Prioridades da Diretoria</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Diretoria Administrativa solicita lotes com limite de caixa. Diretorias tambem podem enviar pedidos de urgencia para aprovacao da Diretoria Administrativa.
        </p>
      </div>

      {permissoes.pode_solicitar_lote && (
        <form onSubmit={criarLote} className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-medium">Solicitar prioridade</h2>
            <span className="text-sm text-gray-500">
              {isCriacaoDirAdmin
                ? 'Criacao de lote pela Diretoria Administrativa'
                : 'Pedido de urgencia para aprovacao da DIR_ADMIN'}
            </span>
          </div>

          <div className={`grid grid-cols-1 gap-3 ${isCriacaoDirAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <label className="grid gap-1 text-sm">
              Diretoria alvo
              <select
                className="input"
                value={formNovoLote.classificacao_alvo}
                onChange={(event) => atualizarCampoNovoLote('classificacao_alvo', event.target.value)}
              >
                <option value="">Selecione</option>
                {diretoriasDisponiveis.map((item) => (
                  <option key={item.classificacao} value={item.classificacao}>
                    {item.classificacao} - {item.diretoria_label}
                  </option>
                ))}
              </select>
            </label>

            {isCriacaoDirAdmin && (
              <label className="grid gap-1 text-sm">
                Valor disponivel
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formNovoLote.valor_disponivel}
                  onChange={(event) => atualizarCampoNovoLote('valor_disponivel', event.target.value)}
                  placeholder="0,00"
                />
              </label>
            )}

            <label className="grid gap-1 text-sm md:col-span-1">
              Observacao
              <input
                className="input"
                value={formNovoLote.observacao}
                onChange={(event) => atualizarCampoNovoLote('observacao', event.target.value)}
                placeholder="Contexto do lote"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={salvandoLote}>
              {salvandoLote ? 'Salvando...' : isCriacaoDirAdmin ? 'Criar lote' : 'Criar pedido'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-medium">Lotes</h2>
            <select
              className="input max-w-[180px]"
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="ABERTO">Abertos</option>
              <option value="FINALIZADO">Finalizados</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>

          <div className="space-y-2.5">
            {lotes.length === 0 && (
              <p className="text-sm text-gray-500">Nenhum lote encontrado.</p>
            )}

            {lotes.map((lote) => (
              <button
                key={lote.id}
                type="button"
                onClick={() => setLoteSelecionadoId(lote.id)}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  Number(loteSelecionadoId) === Number(lote.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Lote #{lote.id}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lote.classificacao_alvo} - {lote.diretoria_alvo_codigo}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Criador: {lote.setor_criador_nome || lote.setor_criador_codigo || '-'}
                    </p>
                  </div>
                  <BadgeStatus status={lote.status} />
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-xs">
                  <div>
                    <span className="text-gray-500">Disponivel</span>
                    <p className="font-medium">{formatarValor(lote.valor_disponivel)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Utilizado</span>
                    <p className="font-medium">{formatarValor(lote.valor_utilizado)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Itens</span>
                    <p className="font-medium">{lote.itens_count || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Criado em</span>
                    <p className="font-medium">{formatarDataHora(lote.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 space-y-4 min-h-[420px]">
          {!loteSelecionadoId && <p className="text-sm text-gray-500">Selecione um lote para visualizar os detalhes.</p>}

          {loadingDetalhe && <p>Carregando lote...</p>}

          {!loadingDetalhe && detalhe && (
            <>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Lote #{detalhe.id}</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {detalhe.classificacao_alvo} - {detalhe.diretoria_alvo_codigo}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Criador: <strong>{detalhe.setor_criador_nome || detalhe.setor_criador_codigo || '-'}</strong>
                    {isLoteSolicitacaoDiretoria && ' | Pedido de urgencia da diretoria'}
                  </p>
                  {detalhe.observacao && (
                    <p className="text-sm text-gray-700 mt-2">{detalhe.observacao}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <BadgeStatus status={detalhe.status} />
                  {detalhe.pode_reabrir && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={reabrirLote}
                      disabled={reabrindo}
                    >
                      {reabrindo ? 'Reabrindo...' : 'Reabrir lote'}
                    </button>
                  )}
                  {detalhe.pode_excluir && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={excluirLote}
                      disabled={excluindo}
                    >
                      {excluindo ? 'Excluindo...' : 'Excluir lote'}
                    </button>
                  )}
                  {detalhe.pode_cancelar && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={cancelarLote}
                      disabled={cancelando}
                    >
                      {cancelando ? 'Cancelando...' : 'Cancelar lote'}
                    </button>
                  )}
                </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <ResumoCard
                  label={isLoteSolicitacaoDiretoria ? 'Valor solicitado' : 'Valor disponivel'}
                  value={formatarValor(resumoLote.valorDisponivel)}
                />
                <ResumoCard
                  label="Valor utilizado"
                  value={formatarValor(resumoLote.valorUtilizadoProjetado)}
                  helper={resumoLote.possuiPrevia ? 'Total projetado com a selecao atual' : null}
                  destaque={resumoLote.possuiPrevia}
                />
                <ResumoCard
                  label={isLoteSolicitacaoDiretoria ? 'Aguardando caixa' : 'Saldo'}
                  value={formatarValor(resumoLote.saldoProjetado)}
                  helper={isLoteSolicitacaoDiretoria ? 'Aprovacao pela Diretoria Administrativa' : resumoLote.possuiPrevia ? 'Saldo projetado com a selecao atual' : null}
                  destaque={resumoLote.possuiPrevia}
                />
                <ResumoCard
                  label={detalhe?.status === 'ABERTO' ? 'Itens selecionados' : 'Itens autorizados'}
                  value={String(resumoLote.itensProjetados)}
                  helper={resumoLote.possuiPrevia ? `${solicitacoesSelecionadas.length} item(ns) selecionado(s)` : null}
                />
              </div>

              {detalhe.status === 'ABERTO' && podeEditarSelecaoLote && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(220px,1.2fr)_minmax(220px,0.9fr)_minmax(240px,0.8fr)_auto] gap-3">
                    <input
                      className="input"
                      value={buscaDisponiveis}
                      onChange={(event) => setBuscaDisponiveis(event.target.value)}
                      placeholder="Filtrar por codigo, obra ou tipo"
                    />
                    <select
                      className="input"
                      value={filtroObraId}
                      onChange={(event) => setFiltroObraId(event.target.value)}
                    >
                      <option value="">Todas as obras</option>
                      {obrasDisponiveis.map((obra) => (
                        <option key={obra.id} value={obra.id}>
                          {obra.nome}
                        </option>
                      ))}
                    </select>
                    <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-50">
                      <span className="text-gray-600">Selecionadas:</span> <strong>{solicitacoesSelecionadas.length}</strong>
                      <span className="text-gray-400 mx-1.5">|</span>
                      <span className="text-gray-600">Total:</span> <strong>{formatarValor(totalSelecionado)}</strong>
                      {solicitacoesSelecionadas.length > selecionadasVisiveisCount && (
                        <>
                          <span className="text-gray-400 mx-1.5">|</span>
                          <span className="text-gray-600">Fora do filtro:</span> <strong>{solicitacoesSelecionadas.length - selecionadasVisiveisCount}</strong>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline whitespace-nowrap"
                      onClick={limparSelecaoDisponiveis}
                    >
                      Limpar selecao
                    </button>
                  </div>

                  {excedeuLimite && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                      O total selecionado excede o limite disponivel do lote.
                    </div>
                  )}

                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2.5 w-12">Sel.</th>
                          <th className="text-left px-3 py-2.5">Codigo</th>
                          <th className="text-left px-3 py-2.5">Obra</th>
                          <th className="text-left px-3 py-2.5">Tipo</th>
                          <th className="text-left px-3 py-2.5">Vencimento</th>
                          <th className="text-right px-3 py-2.5">Valor</th>
                          <th className="text-left px-3 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingDisponiveis && (
                          <tr>
                            <td className="px-3 py-2.5" colSpan={7}>Carregando solicitacoes elegiveis...</td>
                          </tr>
                        )}

                        {!loadingDisponiveis && solicitacoesDisponiveis.length === 0 && (
                          <tr>
                            <td className="px-3 py-2.5 text-gray-500" colSpan={7}>
                              Nenhuma solicitacao elegivel encontrada para este lote.
                            </td>
                          </tr>
                        )}

                        {!loadingDisponiveis && solicitacoesDisponiveis.map((item) => {
                          const checked = selecionadasIds.includes(Number(item.id));
                          return (
                            <tr
                              key={item.id}
                              className="border-t cursor-pointer hover:bg-blue-50/60"
                              onClick={() => abrirSolicitacao(item.id)}
                              title="Abrir solicitacao"
                            >
                              <td className="px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={() => alternarSolicitacao(item.id)}
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-medium">{item.codigo || `#${item.id}`}</div>
                                <div className="text-xs text-gray-500">{item.numero_sienge || '-'}</div>
                              </td>
                              <td className="px-3 py-2.5">{item.obra?.nome || '-'}</td>
                              <td className="px-3 py-2.5">{item.tipo?.nome || '-'}</td>
                              <td className="px-3 py-2.5">{formatarData(item.data_vencimento)}</td>
                              <td className="px-3 py-2.5 text-right font-medium">{formatarValor(item.valor_prioridade)}</td>
                              <td className="px-3 py-2.5">
                                <BadgeStatusSolicitacao status={item.status_global} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={salvarSelecaoLote}
                      disabled={salvandoSelecao || excedeuLimite}
                    >
                      {salvandoSelecao ? 'Salvando...' : 'Salvar selecao'}
                    </button>
                    {podeFinalizarPedidoDiretoria && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={finalizarPedidoDiretoria}
                        disabled={finalizandoPedido || solicitacoesSelecionadas.length === 0 || excedeuLimite}
                      >
                        {finalizandoPedido ? 'Finalizando...' : 'Finalizar pedido'}
                      </button>
                    )}
                    {detalhe.pode_finalizar && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={finalizarLote}
                        disabled={finalizando || solicitacoesSelecionadas.length === 0 || excedeuLimite}
                      >
                        {finalizando ? 'Finalizando...' : 'Finalizar lote'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {detalhe.status === 'ABERTO' && !podeEditarSelecaoLote && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                  Este lote ainda esta aberto. Apenas a diretoria responsavel pode selecionar solicitacoes.
                </div>
              )}

              {detalhe.status !== 'ABERTO' && (
                <div className="space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                      <h3 className="text-base font-medium">Solicitacoes autorizadas</h3>
                      <span className="text-sm text-gray-500">
                        Finalizado em {formatarDataHora(detalhe.finalizado_em)}
                      </span>
                    </div>
                    <input
                      className="input lg:max-w-sm"
                      value={filtroItensLote}
                      onChange={(event) => setFiltroItensLote(event.target.value)}
                      placeholder="Filtrar por codigo, obra ou tipo"
                    />
                  </div>

                  {filtroItensLote && (
                    <span className="text-sm text-gray-500">
                      Exibindo {itensLoteFiltrados.length} de {(detalhe.itens || []).length} solicitacao(oes)
                    </span>
                  )}

                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2.5">Codigo</th>
                          <th className="text-left px-3 py-2.5">Obra</th>
                          <th className="text-left px-3 py-2.5">Tipo</th>
                          <th className="text-left px-3 py-2.5">Autorizado em</th>
                          <th className="text-right px-3 py-2.5">Valor</th>
                          <th className="text-left px-3 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detalhe.itens || []).length === 0 && (
                          <tr>
                            <td className="px-3 py-2.5 text-gray-500" colSpan={6}>
                              Nenhuma solicitacao foi vinculada a este lote.
                            </td>
                          </tr>
                        )}

                        {(detalhe.itens || []).length > 0 && itensLoteFiltrados.length === 0 && (
                          <tr>
                            <td className="px-3 py-2.5 text-gray-500" colSpan={6}>
                              Nenhuma solicitacao encontrada para o filtro informado.
                            </td>
                          </tr>
                        )}

                        {itensLoteFiltrados.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t cursor-pointer hover:bg-blue-50/60"
                            onClick={() => abrirSolicitacao(item.solicitacao?.id)}
                            title="Abrir solicitacao"
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium">{item.solicitacao?.codigo || `#${item.solicitacao?.id || '-'}`}</div>
                              <div className="text-xs text-gray-500">{item.solicitacao?.numero_sienge || '-'}</div>
                            </td>
                            <td className="px-3 py-2.5">{item.solicitacao?.obra?.nome || '-'}</td>
                            <td className="px-3 py-2.5">{item.solicitacao?.tipo?.nome || '-'}</td>
                            <td className="px-3 py-2.5">{formatarDataHora(item.autorizado_em)}</td>
                            <td className="px-3 py-2.5 text-right font-medium">{formatarValor(item.valor_considerado)}</td>
                            <td className="px-3 py-2.5">
                              <BadgeStatusSolicitacao status={item.solicitacao?.status_global} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumoCard({ label, value, helper = null, destaque = false }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${destaque ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200 bg-gray-50'}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-base font-semibold mt-1">{value}</p>
      {helper && <p className="text-[11px] text-gray-500 mt-1 leading-4">{helper}</p>}
    </div>
  );
}
