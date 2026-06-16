import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  adicionarItemPedidoCompra,
  atualizarStatusPedidoCompra,
  atualizarItemPedidoCompra,
  anexarEspelhoPedidoCompra,
  baixarPdfPedidoCompra,
  cancelarItensPedidoCompra,
  cancelarPedidoCompra,
  comentarPedidoCompra,
  obterPedidoCompra,
  removerItemPedidoCompra,
  remanejarItemPedidoCompra,
  uploadAnexoTemporarioCompra
} from '../../../services/compras';
import { getStatusPedidosCompra } from '../../../services/configuracoesSistema';
import { useAuth } from '../../../contexts/AuthContext';
import { canManageComprasPedidos, isBusinessAdmin } from '../../../utils/acessoProduto';
import CompraPreviewModal from '../components/CompraPreviewModal';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const normalized = typeof value === 'string'
    ? value.trim().replace(',', '.')
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUnitPrice(value, unidade, fallback = '-') {
  const parsed = toNullableNumber(value);
  if (parsed === null) {
    return fallback;
  }

  return `${formatMoney(parsed)}${unidade ? `/${unidade}` : ''}`;
}

function calculateVariationPercent(currentValue, referenceValue) {
  const current = toNullableNumber(currentValue);
  const reference = toNullableNumber(referenceValue);

  if (current === null || reference === null || reference <= 0) {
    return null;
  }

  return ((current - reference) / reference) * 100;
}

function formatVariationPercent(value, fallback = 'Sem historico') {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  const signal = normalized > 0 ? '+' : '';
  return `${signal}${normalized.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function getVariationTextClass(value) {
  if (value === null || value === undefined || Math.abs(value) < 0.005) {
    return 'text-[var(--c-muted)]';
  }

  return value > 0 ? 'text-red-600' : 'text-emerald-700';
}

function buildItemPriceContext(item, currentUnitPriceOverride = undefined) {
  const contexto = item?.contexto_preco || {};
  const precoCotado = toNullableNumber(contexto.preco_cotado);
  const precoAtual = currentUnitPriceOverride !== undefined
    ? toNullableNumber(currentUnitPriceOverride)
    : toNullableNumber(item?.preco_unitario);
  const ultimoPrecoCompra = toNullableNumber(contexto.ultimo_preco_compra);

  return {
    precoCotado,
    precoAtual,
    ultimoPrecoCompra,
    variacaoUltimaCompra: calculateVariationPercent(precoAtual, ultimoPrecoCompra)
  };
}

function formatQuantityIntegerPart(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  const normalized = digits.replace(/^0+(?=\d)/, '') || (digits ? '0' : '');
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function maskBrazilianQuantityInput(value) {
  const raw = String(value ?? '').replace(/[^\d,]/g, '');
  if (!raw) {
    return '';
  }

  const hasComma = raw.includes(',');
  const [integerPartRaw = '', decimalPartRaw = ''] = raw.split(',');
  const integerPart = formatQuantityIntegerPart(integerPartRaw || (hasComma ? '0' : ''));
  const decimalPart = decimalPartRaw.replace(/,/g, '').slice(0, 2);

  return hasComma ? `${integerPart || '0'},${decimalPart}` : integerPart;
}

function parseBrazilianQuantity(value) {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }

  const raw = String(value).trim().replace(/\./g, '').replace(',', '.');
  const normalized = raw.replace(/[^\d.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBrazilianQuantity(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '';
  }

  const isInteger = Math.abs(parsed - Math.trunc(parsed)) < Number.EPSILON;
  return parsed.toLocaleString('pt-BR', {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function formatQuantityLabel(value, unidade) {
  const formatted = formatBrazilianQuantity(value);
  const suffix = unidade || '';
  return `${formatted || '-'}${suffix ? ` ${suffix}` : ''}`;
}

function formatStatusLabel(value, statusMap) {
  return statusMap[String(value || '').toUpperCase()]?.nome || String(value || '-').replace(/_/g, ' ').toUpperCase();
}

function isItemAbaixoMinimo(item) {
  return !item?.removido && item?.quantidade_minima_item && Number(item.quantidade_pedido) < Number(item.quantidade_minima_item);
}

function buildItemSearchText(item) {
  return [
    item?.descricao,
    item?.origem,
    item?.unidade,
    item?.quantidade_solicitada,
    item?.quantidade_pedido
  ]
    .map((value) => String(value || '').toLowerCase())
    .join(' ');
}

function buildPedidoWhatsappMessage(pedido) {
  const pedidoCodigo = `PC-${String(pedido?.id || '').padStart(5, '0')}`;
  const solicitacaoCodigo = `SC-${String(pedido?.solicitacao_compra_id || '').padStart(5, '0')}`;
  const fornecedor = pedido?.fornecedor?.nome || 'fornecedor';

  return `Ola! Segue o pedido de compra ${pedidoCodigo} referente a ${solicitacaoCodigo} para ${fornecedor}. Favor confirmar recebimento e prazo de atendimento.`;
}

function triggerBlobDownload(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function normalizeBrazilianQuantityOnBlur(value) {
  if (!value) {
    return '';
  }

  const parsed = parseBrazilianQuantity(value);
  const forceDecimals = String(value).includes(',');

  if (!Number.isFinite(parsed)) {
    return '';
  }

  return parsed.toLocaleString('pt-BR', {
    minimumFractionDigits: forceDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

function getItemSituacao(item) {
  if (item?.removido) {
    return {
      label: 'Removido',
      className: 'app-status-pill bg-slate-100 text-slate-700'
    };
  }

  if (isItemAbaixoMinimo(item)) {
    return {
      label: 'Atencao',
      className: 'app-status-pill bg-amber-100 text-amber-700'
    };
  }

  return {
    label: 'Ativo',
    className: 'app-status-pill bg-emerald-100 text-emerald-700'
  };
}

export default function PedidoCompraDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const businessAdmin = isBusinessAdmin(user);
  const podeGerenciarPedido = canManageComprasPedidos(user);
  const [pedido, setPedido] = useState(null);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingItemId, setSavingItemId] = useState(null);
  const [addingRespostaId, setAddingRespostaId] = useState(null);
  const [removingItemId, setRemovingItemId] = useState(null);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const [visualizandoPdf, setVisualizandoPdf] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [previewPedido, setPreviewPedido] = useState(null);
  const [edicoes, setEdicoes] = useState({});
  const [buscaItens, setBuscaItens] = useState('');
  const [filtroItens, setFiltroItens] = useState('ATIVOS');
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [itemEditandoId, setItemEditandoId] = useState(null);
  const [comentarioPedido, setComentarioPedido] = useState('');
  const [salvandoComentario, setSalvandoComentario] = useState(false);
  const [anexandoEspelho, setAnexandoEspelho] = useState(false);
  const [cancelandoPedido, setCancelandoPedido] = useState(false);
  const [itensSelecionadosCancelamento, setItensSelecionadosCancelamento] = useState([]);
  const [cancelandoItens, setCancelandoItens] = useState(false);
  const [remanejoSelecionado, setRemanejoSelecionado] = useState('');
  const [remanejoQuantidade, setRemanejoQuantidade] = useState('');
  const [remanejandoItem, setRemanejandoItem] = useState(false);
  const itemSelecionadoId = itemEditandoId;
  const buscaItensDeferred = useDeferredValue(buscaItens);

  async function carregar() {
    try {
      setLoading(true);
      const [data, dataStatus] = await Promise.all([
        obterPedidoCompra(id),
        getStatusPedidosCompra()
      ]);
      setPedido(data || null);
      setStatusOptions(Array.isArray(dataStatus?.statuses) ? dataStatus.statuses : []);

      const proximasEdicoes = {};
      (data?.itens || []).forEach((item) => {
        proximasEdicoes[item.id] = {
          quantidade_pedido: formatBrazilianQuantity(item.quantidade_pedido),
          preco_unitario: item.preco_unitario ?? '',
          observacoes: item.observacoes || ''
        };
      });
      setEdicoes(proximasEdicoes);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar pedido de compra');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [id]);

  const itensAtivos = useMemo(
    () => (pedido?.itens || []).filter((item) => !item.removido),
    [pedido]
  );
  const resumoItens = useMemo(() => {
    return (pedido?.itens || []).reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.removido) {
          acc.removidos += 1;
        } else {
          acc.ativos += 1;
        }
        if (isItemAbaixoMinimo(item)) {
          acc.atencao += 1;
        }
        return acc;
      },
      { total: 0, ativos: 0, atencao: 0, removidos: 0 }
    );
  }, [pedido]);
  const itensFiltrados = useMemo(() => {
    const termo = String(buscaItensDeferred || '').trim().toLowerCase();

    return (pedido?.itens || []).filter((item) => {
      if (filtroItens === 'ATIVOS' && item.removido) {
        return false;
      }
      if (filtroItens === 'ATENCAO' && !isItemAbaixoMinimo(item)) {
        return false;
      }
      if (filtroItens === 'REMOVIDOS' && !item.removido) {
        return false;
      }
      if (filtroItens === 'TODOS') {
        // sem filtro adicional
      }

      if (!termo) {
        return true;
      }

      return buildItemSearchText(item).includes(termo);
    });
  }, [buscaItensDeferred, filtroItens, pedido]);
  const itemEditando = useMemo(
    () => (pedido?.itens || []).find((item) => item.id === itemEditandoId) || null,
    [itemEditandoId, pedido]
  );
  const statusMap = useMemo(
    () => Object.fromEntries((statusOptions || []).map((item) => [String(item.codigo || '').toUpperCase(), item])),
    [statusOptions]
  );
  const statusAtual = statusMap[String(pedido?.status || '').toUpperCase()] || pedido?.status_configuracao || null;
  const edicaoBloqueadaPorStatus = Boolean(statusAtual?.bloqueia_edicao || pedido?.edicao_bloqueada);
  const pedidoBloqueado = Boolean(edicaoBloqueadaPorStatus || !podeGerenciarPedido);
  const statusSelectOptions = useMemo(() => {
    const ativos = (statusOptions || []).filter((item) => item?.ativo !== false);
    if (!pedido?.status) {
      return ativos;
    }

    const currentStatus = String(pedido.status || '').toUpperCase();
    if (ativos.some((item) => String(item.codigo || '').toUpperCase() === currentStatus)) {
      return ativos;
    }

    return statusAtual ? [...ativos, statusAtual] : ativos;
  }, [pedido?.status, statusAtual, statusOptions]);

  useEffect(() => {
    if (!itemEditandoId) {
      return;
    }

    const itemAtual = (pedido?.itens || []).find((item) => item.id === itemEditandoId);
    if (!itemAtual) {
      setModalEdicaoAberto(false);
      setItemEditandoId(null);
    }
  }, [itemEditandoId, pedido]);

  function atualizarEdicaoItem(itemId, changes) {
    setEdicoes((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        ...changes
      }
    }));
  }

  function abrirModalEdicao(itemId) {
    setItemEditandoId(itemId);
    setRemanejoSelecionado('');
    setRemanejoQuantidade('');
    setModalEdicaoAberto(true);
  }

  function fecharModalEdicao() {
    setModalEdicaoAberto(false);
    setItemEditandoId(null);
  }

  function abrirAuditoria(itemId = null) {
    const params = new URLSearchParams();
    params.set('pedido_id', String(pedido?.id || ''));

    if (itemId) {
      params.set('item_id', String(itemId));
    }

    navigate(`/relatorios/administrativos?${params.toString()}`);
  }

  async function handleSalvarItem(itemId) {
    try {
      setSavingItemId(itemId);
      await atualizarItemPedidoCompra(id, itemId, edicoes[itemId] || {});
      await carregar();
      fecharModalEdicao();
      alert('Item atualizado com auditoria registrada.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao atualizar item do pedido');
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleAdicionarResposta(respostaItemId) {
    try {
      setAddingRespostaId(respostaItemId);
      await adicionarItemPedidoCompra(id, { resposta_item_id: respostaItemId });
      await carregar();
      alert('Item adicionado ao pedido.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao adicionar item ao pedido');
    } finally {
      setAddingRespostaId(null);
    }
  }

  async function handleRemoverItem(itemId) {
    try {
      setRemovingItemId(itemId);
      await removerItemPedidoCompra(id, itemId);
      await carregar();
      fecharModalEdicao();
      alert('Item removido do pedido.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao remover item do pedido');
    } finally {
      setRemovingItemId(null);
    }
  }

  async function handleAtualizarStatus(status) {
    if (!status || status === pedido?.status) {
      return;
    }

    try {
      setSavingStatus(true);
      const data = await atualizarStatusPedidoCompra(id, { status });
      setPedido(data || null);
      alert('Status do pedido atualizado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao atualizar status do pedido');
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleBaixarPdf() {
    try {
      setBaixandoPdf(true);
      const blob = await baixarPdfPedidoCompra(id);
      triggerBlobDownload(blob, `pedido-compra-PC-${String(id).padStart(5, '0')}.pdf`);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao baixar PDF do pedido');
    } finally {
      setBaixandoPdf(false);
    }
  }

  async function handleVisualizarPdf() {
    try {
      setVisualizandoPdf(true);
      const blob = await baixarPdfPedidoCompra(id);
      const fileName = `pedido-compra-PC-${String(id).padStart(5, '0')}.pdf`;
      const url = window.URL.createObjectURL(blob);

      setPreviewPedido({
        title: `Pedido de compra PC-${String(id).padStart(5, '0')}`,
        name: fileName,
        url
      });
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao visualizar PDF do pedido');
    } finally {
      setVisualizandoPdf(false);
    }
  }

  async function handleEnviarPedido() {
    try {
      setEnviandoPedido(true);
      const blob = await baixarPdfPedidoCompra(id);
      const fileName = `pedido-compra-PC-${String(id).padStart(5, '0')}.pdf`;
      const message = buildPedidoWhatsappMessage(pedido);
      const whatsapp = String(pedido?.fornecedor?.whatsapp || '').replace(/\D/g, '');

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        typeof navigator.share === 'function'
      ) {
        try {
          const file = new File([blob], fileName, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: fileName,
              text: message,
              files: [file]
            });
            return;
          }
        } catch {
          // fallback para download + WhatsApp Web
        }
      }

      triggerBlobDownload(blob, fileName);

      if (whatsapp) {
        window.open(
          `https://wa.me/${whatsapp}?text=${encodeURIComponent(`${message} O PDF do pedido foi baixado para anexo.`)}`,
          '_blank',
          'noopener,noreferrer'
        );
      } else {
        alert('PDF baixado. Cadastre o WhatsApp do fornecedor para abrir o envio automaticamente.');
      }
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao preparar envio do pedido');
    } finally {
      setEnviandoPedido(false);
    }
  }

  function toggleItemCancelamento(itemId) {
    setItensSelecionadosCancelamento((atuais) => (
      atuais.includes(itemId)
        ? atuais.filter((idAtual) => idAtual !== itemId)
        : [...atuais, itemId]
    ));
  }

  async function handleCancelarPedido() {
    const motivo = window.prompt('Informe o motivo do cancelamento do pedido.');
    if (motivo === null) return;

    try {
      setCancelandoPedido(true);
      const data = await cancelarPedidoCompra(id, { motivo });
      setPedido(data || null);
      alert('Pedido cancelado e historico da solicitacao atualizado.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao cancelar pedido');
    } finally {
      setCancelandoPedido(false);
    }
  }

  async function handleCancelarItensSelecionados() {
    if (!itensSelecionadosCancelamento.length) {
      alert('Selecione ao menos um item ativo para cancelar.');
      return;
    }

    const motivo = window.prompt('Informe o motivo do cancelamento dos itens selecionados.');
    if (motivo === null) return;

    try {
      setCancelandoItens(true);
      const data = await cancelarItensPedidoCompra(id, {
        item_ids: itensSelecionadosCancelamento,
        motivo
      });
      setPedido(data || null);
      setItensSelecionadosCancelamento([]);
      alert('Itens cancelados. As quantidades ficam disponiveis para remanejamento na cotacao.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao cancelar itens');
    } finally {
      setCancelandoItens(false);
    }
  }

  async function handleSalvarComentarioPedido() {
    if (!comentarioPedido.trim()) {
      alert('Digite o comentario do pedido.');
      return;
    }

    try {
      setSalvandoComentario(true);
      await comentarPedidoCompra(id, { comentario: comentarioPedido });
      setComentarioPedido('');
      alert('Comentario registrado no pedido e no historico da solicitacao.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao registrar comentario');
    } finally {
      setSalvandoComentario(false);
    }
  }

  async function handleAnexarEspelho(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setAnexandoEspelho(true);
      const upload = await uploadAnexoTemporarioCompra(file);
      const data = await anexarEspelhoPedidoCompra(id, {
        arquivo_url: upload?.arquivo_url,
        arquivo_nome_original: upload?.arquivo_nome_original || file.name
      });
      setPedido(data || null);
      alert('Espelho anexado ao pedido e ao historico da solicitacao.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao anexar espelho do fornecedor');
    } finally {
      setAnexandoEspelho(false);
    }
  }

  async function handleRemanejarItemAtual() {
    if (!itemEditando) return;
    if (!remanejoSelecionado) {
      alert('Selecione o fornecedor/resposta de destino.');
      return;
    }

    try {
      setRemanejandoItem(true);
      const data = await remanejarItemPedidoCompra(id, itemEditando.id, {
        resposta_item_id_destino: remanejoSelecionado,
        quantidade: remanejoQuantidade || itemEditando.quantidade_pedido,
        motivo: 'Remanejamento operacional pela tela do pedido'
      });
      setPedido(data || null);
      setRemanejoSelecionado('');
      setRemanejoQuantidade('');
      fecharModalEdicao();
      alert('Item remanejado para o fornecedor selecionado.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao remanejar item');
    } finally {
      setRemanejandoItem(false);
    }
  }

  if (loading) {
    return (
      <div className="page solicitacoes-page">
        <div className="app-empty-card sol-surface-card">Carregando...</div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="page solicitacoes-page">
        <div className="app-empty-card sol-surface-card">Pedido de compra nao encontrado.</div>
      </div>
    );
  }

  const edicaoItemAtual = itemEditando ? edicoes[itemEditando.id] || {} : {};
  const itemEditandoAbaixoMinimo = isItemAbaixoMinimo(itemEditando);
  const itemEditandoSituacao = getItemSituacao(itemEditando);
  const itemEditandoPrecoContext = itemEditando
    ? buildItemPriceContext(itemEditando, edicaoItemAtual.preco_unitario ?? itemEditando.preco_unitario)
    : null;
  const itemEditandoValorTotalAtual = itemEditando
    ? parseBrazilianQuantity(edicaoItemAtual.quantidade_pedido ?? itemEditando.quantidade_pedido) * (itemEditandoPrecoContext?.precoAtual ?? 0)
    : 0;
  const modalProcessando = itemEditando ? savingItemId === itemEditando.id || removingItemId === itemEditando.id : false;
  const candidatosRemanejamentoItem = itemEditando
    ? (pedido.candidatos_remanejamento || []).filter((candidato) => (
        String(candidato.descricao || '').trim().toLowerCase() === String(itemEditando.descricao || '').trim().toLowerCase() &&
        Number(candidato.resposta_item_id) !== Number(itemEditando.resposta_item_id)
      ))
    : [];

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Pedido de Compra</h1>
            <p className="page-subtitle">
              PC-{String(pedido.id).padStart(5, '0')} - gestao de itens em lista compacta, edicao em modal e auditoria
              dedicada no painel administrativo.
            </p>
          </div>
          <div className="app-page-actions items-end">
            <div className="min-w-[260px]">
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--c-muted)]">
                Status do pedido
              </label>
              <select
                className="input"
                value={pedido.status || ''}
                onChange={(event) => handleAtualizarStatus(event.target.value)}
                disabled={!podeGerenciarPedido || savingStatus}
              >
                {statusSelectOptions.map((status) => (
                  <option key={status.codigo} value={status.codigo}>
                    {status.nome}
                  </option>
                ))}
              </select>
            </div>
            {businessAdmin ? (
              <button type="button" className="btn btn-outline" onClick={() => abrirAuditoria()}>
                Painel de auditoria
              </button>
            ) : null}
            <button type="button" className="btn btn-outline" onClick={handleVisualizarPdf} disabled={visualizandoPdf}>
              {visualizandoPdf ? 'Abrindo pedido...' : 'Ver pedido'}
            </button>
            <button type="button" className="btn btn-outline" onClick={handleBaixarPdf} disabled={baixandoPdf}>
              {baixandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleEnviarPedido} disabled={enviandoPedido}>
              {enviandoPedido ? 'Preparando envio...' : 'Enviar pedido'}
            </button>
            {podeGerenciarPedido ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCancelarPedido}
                disabled={pedidoBloqueado || cancelandoPedido}
              >
                {cancelandoPedido ? 'Cancelando...' : 'Cancelar pedido'}
              </button>
            ) : null}
            <button type="button" className="btn btn-outline" onClick={() => navigate('/pedidos-compra')}>
              Voltar
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(`/solicitacoes-compra/${pedido.solicitacao_compra_id}`)}
            >
              Abrir solicitacao
            </button>
          </div>
        </div>
      </div>

      {!podeGerenciarPedido ? (
        <div className="app-alert mt-4">
          Voce esta visualizando este pedido. Alteracoes de status e itens ficam restritas ao setor de compras.
        </div>
      ) : null}

      {edicaoBloqueadaPorStatus ? (
        <div className="app-alert mt-4">
          O status atual do pedido bloqueia edicao. Enquanto ele estiver em "{formatStatusLabel(pedido.status, statusMap)}", os itens nao poderao ser alterados, adicionados ou removidos.
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <div className="card sol-surface-card">
            <div className="card-header">
              <h2 className="font-semibold">Resumo</h2>
            </div>
            <div className="grid gap-3 text-sm">
              <div>
                <div className="text-[var(--c-muted)]">Fornecedor</div>
                <div className="font-semibold">{pedido.fornecedor?.nome || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Status</div>
                <div className="font-semibold" style={{ color: statusAtual?.cor || undefined }}>
                  {formatStatusLabel(pedido.status, statusMap)}
                </div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Obra</div>
                <div className="font-semibold">{pedido.obra?.nome || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Solicitacao</div>
                <div className="font-semibold">
                  SC-{String(pedido.solicitacao_compra_id).padStart(5, '0')}
                </div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Valor total</div>
                <div className="font-semibold">{formatMoney(pedido.valor_total)}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Itens ativos</div>
                <div className="font-semibold">{itensAtivos.length}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Pedido minimo do fornecedor</div>
                <div className="font-semibold">
                  {pedido.valor_minimo_pedido ? formatMoney(pedido.valor_minimo_pedido) : '-'}
                </div>
                {!pedido.atingiu_pedido_minimo ? (
                  <div className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    O valor atual ainda nao atinge o pedido minimo informado pelo fornecedor.
                  </div>
                ) : null}
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Criado por</div>
                <div className="font-semibold">{pedido.criador?.nome || '-'}</div>
              </div>
            </div>
          </div>

          {podeGerenciarPedido ? (
            <div className="card sol-surface-card">
              <div className="card-header">
                <h2 className="font-semibold">Historico operacional</h2>
              </div>
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium">
                  Comentario do pedido
                  <textarea
                    className="input min-h-[110px]"
                    value={comentarioPedido}
                    onChange={(event) => setComentarioPedido(event.target.value)}
                    placeholder="Registre alinhamentos, pendencias ou informacoes para a obra."
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-outline justify-center"
                  onClick={handleSalvarComentarioPedido}
                  disabled={salvandoComentario || !comentarioPedido.trim()}
                >
                  {salvandoComentario ? 'Registrando...' : 'Registrar comentario'}
                </button>

                <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 text-sm">
                  <div className="font-semibold">Espelho do pedido do fornecedor</div>
                  <p className="mt-1 text-xs text-[var(--c-muted)]">
                    Anexe aqui o comprovante/espelho enviado pelo fornecedor. Ele tambem aparece no historico da solicitacao.
                  </p>
                  {pedido.espelho_fornecedor_url ? (
                    <div className="mt-2 text-xs text-[var(--c-muted)]">
                      Anexado: <span className="font-semibold text-[var(--c-text)]">{pedido.espelho_fornecedor_nome || 'arquivo'}</span>
                    </div>
                  ) : null}
                  <label className="btn btn-outline mt-3 w-full cursor-pointer justify-center">
                    {anexandoEspelho ? 'Anexando...' : 'Anexar espelho'}
                    <input type="file" className="hidden" onChange={handleAnexarEspelho} disabled={anexandoEspelho} />
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {podeGerenciarPedido ? (
            <div className="card sol-surface-card">
              <div className="card-header">
                <h2 className="font-semibold">Itens cotados disponiveis</h2>
              </div>
              {pedido.candidatos_adicao?.length ? (
                <div className="app-list-stack">
                  {pedido.candidatos_adicao.map((item) => (
                    <div key={item.resposta_item_id} className="app-list-card">
                      <div className="font-medium">{item.descricao}</div>
                      <div className="mt-1 text-sm text-[var(--c-muted)]">
                        {formatQuantityLabel(item.quantidade_solicitada, item.unidade)} - {formatMoney(item.preco_unitario)}
                      </div>
                      <div className="mt-1 text-xs text-[var(--c-muted)]">
                        Minimo do item: {formatQuantityLabel(item.quantidade_minima_item, item.unidade)} - Prazo: {item.prazo || '-'}
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline mt-3"
                        onClick={() => handleAdicionarResposta(item.resposta_item_id)}
                        disabled={pedidoBloqueado || addingRespostaId === item.resposta_item_id}
                      >
                        {addingRespostaId === item.resposta_item_id ? 'Adicionando...' : 'Adicionar ao pedido'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="app-empty-card py-6">
                  Todos os itens cotados desse fornecedor ja foram usados ou nao ha respostas adicionais disponiveis.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="card sol-surface-card">
            <div className="card-header flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Itens do pedido</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Filtros no topo, linhas compactas para escala e edicao concentrada em modal.
                </p>
              </div>
              <span className="text-sm text-[var(--c-muted)]">
                {itensFiltrados.length} visivel(is) de {resumoItens.total} item(ns)
              </span>
            </div>

            <div className="solicitacoes-filtros app-filters-card rounded-xl p-4">
              <div className="app-filters-grid">
                <label className="app-filter-field">
                  <span className="app-filter-label">Buscar item</span>
                  <input
                    className="input"
                    value={buscaItens}
                    onChange={(event) => setBuscaItens(event.target.value)}
                    placeholder="Descricao, origem ou unidade"
                  />
                </label>

                <label className="app-filter-field">
                  <span className="app-filter-label">Situacao</span>
                  <select
                    className="input"
                    value={filtroItens}
                    onChange={(event) => setFiltroItens(event.target.value)}
                  >
                    <option value="ATIVOS">Ativos</option>
                    <option value="ATENCAO">Atencao</option>
                    <option value="REMOVIDOS">Removidos</option>
                    <option value="TODOS">Todos</option>
                  </select>
                </label>
              </div>

              <div className="app-page-actions justify-end">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setBuscaItens('');
                    setFiltroItens('ATIVOS');
                  }}
                >
                  Limpar filtros
                </button>
                {businessAdmin ? (
                  <button type="button" className="btn btn-outline" onClick={() => abrirAuditoria()}>
                    Auditoria do pedido
                  </button>
                ) : null}
                {podeGerenciarPedido ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCancelarItensSelecionados}
                    disabled={pedidoBloqueado || cancelandoItens || itensSelecionadosCancelamento.length === 0}
                  >
                    {cancelandoItens ? 'Cancelando...' : `Cancelar itens (${itensSelecionadosCancelamento.length})`}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 app-summary-grid">
              <div className="app-summary-card">
                <span className="app-summary-label">Ativos</span>
                <strong className="app-summary-value">{resumoItens.ativos}</strong>
                <span className="app-summary-subvalue">Itens operacionais</span>
              </div>
              <div className="app-summary-card">
                <span className="app-summary-label">Atencao</span>
                <strong className="app-summary-value">{resumoItens.atencao}</strong>
                <span className="app-summary-subvalue">Abaixo do minimo</span>
              </div>
              <div className="app-summary-card">
                <span className="app-summary-label">Removidos</span>
                <strong className="app-summary-value">{resumoItens.removidos}</strong>
                <span className="app-summary-subvalue">Mantidos para historico</span>
              </div>
              <div className="app-summary-card">
                <span className="app-summary-label">Valor total</span>
                <strong className="app-summary-value">{formatMoney(pedido.valor_total)}</strong>
                <span className="app-summary-subvalue">Consolidado do pedido</span>
              </div>
            </div>

            {itensFiltrados.length ? (
              <div className="mt-4 app-table-shell overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      {podeGerenciarPedido ? <th className="w-10">Sel.</th> : null}
                      <th>Item</th>
                      <th>Origem</th>
                      <th>Solicitado</th>
                      <th>Pedido</th>
                      <th>Valor total</th>
                      <th>Situacao</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensFiltrados.map((item) => {
                      const situacao = getItemSituacao(item);
                      const precoContext = buildItemPriceContext(item);

                      return (
                        <tr key={item.id} className={item.removido ? 'opacity-80' : ''}>
                          {podeGerenciarPedido ? (
                            <td>
                              <input
                                type="checkbox"
                                checked={itensSelecionadosCancelamento.includes(item.id)}
                                disabled={item.removido || pedidoBloqueado}
                                onChange={() => toggleItemCancelamento(item.id)}
                              />
                            </td>
                          ) : null}
                          <td>
                            <div className="font-medium">{item.descricao}</div>
                            <div className="text-xs text-[var(--c-muted)]">
                              Minimo: {formatQuantityLabel(item.quantidade_minima_item, item.unidade)}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--c-muted)]">
                              <span>
                                Cotado: <span className="font-semibold text-[var(--c-text)]">{formatUnitPrice(precoContext.precoCotado, item.unidade)}</span>
                              </span>
                              <span>
                                Atual: <span className="font-semibold text-[var(--c-text)]">{formatUnitPrice(precoContext.precoAtual, item.unidade)}</span>
                              </span>
                              <span>
                                Ult. compra: <span className="font-semibold text-[var(--c-text)]">{formatUnitPrice(precoContext.ultimoPrecoCompra, item.unidade, 'Sem historico')}</span>
                              </span>
                              <span>
                                Var.: <span className={`font-semibold ${getVariationTextClass(precoContext.variacaoUltimaCompra)}`}>{formatVariationPercent(precoContext.variacaoUltimaCompra)}</span>
                              </span>
                            </div>
                          </td>
                          <td>{item.origem || '-'}</td>
                          <td>{formatQuantityLabel(item.quantidade_solicitada, item.unidade)}</td>
                          <td>{formatQuantityLabel(item.quantidade_pedido, item.unidade)}</td>
                          <td>{formatMoney(item.valor_total)}</td>
                          <td>
                            <span className={situacao.className}>{situacao.label}</span>
                          </td>
                          <td className="whitespace-nowrap">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => abrirModalEdicao(item.id)}
                              >
                                {podeGerenciarPedido && !item.removido ? 'Editar' : 'Ver item'}
                              </button>
                              {businessAdmin ? (
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  onClick={() => abrirAuditoria(item.id)}
                                >
                                  Auditoria
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 app-empty-card">
                Nenhum item encontrado com os filtros atuais.
              </div>
            )}
          </div>
        </div>
      </div>

      {modalEdicaoAberto && itemEditando ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.45)' }}>
          <div
            className="w-full max-w-4xl rounded-2xl border p-6"
            style={{
              background: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.2)'
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--c-text)' }}>
                  {podeGerenciarPedido && !itemEditando.removido ? 'Editar item do pedido' : 'Detalhes do item'}
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--c-muted)' }}>
                  PC-{String(pedido.id).padStart(5, '0')} - {itemEditando.descricao}
                </p>
              </div>
              <button type="button" className="btn btn-outline" onClick={fecharModalEdicao} disabled={modalProcessando}>
                Fechar
              </button>
            </div>

            {itemEditando.removido ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[var(--c-muted)]">
                Este item foi removido do pedido. Ele permanece visivel para consulta, mas a trilha detalhada agora fica no
                painel administrativo de relatorios.
              </div>
            ) : null}

            {itemEditandoAbaixoMinimo ? (
              <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                A quantidade atual do pedido ainda esta abaixo do minimo definido para este item.
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_320px]">
              <div className="grid gap-4">
                {!itemEditando.removido ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="grid gap-2 text-sm font-medium">
                        Quantidade do pedido
                        <input
                          className="input"
                          type="text"
                          inputMode="decimal"
                          value={edicaoItemAtual.quantidade_pedido ?? ''}
                          disabled={pedidoBloqueado}
                          onChange={(event) =>
                            atualizarEdicaoItem(itemEditando.id, {
                              quantidade_pedido: maskBrazilianQuantityInput(event.target.value)
                            })
                          }
                          onBlur={(event) =>
                            atualizarEdicaoItem(itemEditando.id, {
                              quantidade_pedido: normalizeBrazilianQuantityOnBlur(event.target.value)
                            })
                          }
                          placeholder="Ex.: 1.250 ou 1.250,50"
                        />
                        <span className="text-xs text-[var(--c-muted)]">
                          Use `.` para milhar e `,` para decimal, com no maximo 2 casas apos a virgula.
                        </span>
                      </label>

                      <label className="grid gap-2 text-sm font-medium">
                        Preco unitario
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={edicaoItemAtual.preco_unitario ?? ''}
                          disabled={pedidoBloqueado}
                          onChange={(event) =>
                            atualizarEdicaoItem(itemEditando.id, {
                              preco_unitario: event.target.value
                            })
                          }
                        />
                      </label>

                      <div className="grid gap-2 text-sm font-medium">
                        <span>Valor recalculado</span>
                        <div className="input flex items-center bg-slate-50">
                          {formatMoney(
                            parseBrazilianQuantity(edicaoItemAtual.quantidade_pedido) * Number(edicaoItemAtual.preco_unitario || 0)
                          )}
                        </div>
                      </div>
                    </div>

                    <label className="grid gap-2 text-sm font-medium">
                      Observacoes do item
                      <textarea
                        className="input min-h-[120px]"
                        value={edicaoItemAtual.observacoes ?? ''}
                        disabled={pedidoBloqueado}
                        onChange={(event) =>
                          atualizarEdicaoItem(itemEditando.id, {
                            observacoes: event.target.value
                          })
                        }
                      />
                    </label>
                  </>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-[var(--c-muted)]">
                    Item removido do fluxo ativo. Use o atalho de auditoria para consultar toda a trilha historica.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--c-muted)]">
                  Resumo do item
                </div>
                <div className="mt-4 grid gap-3 text-sm">
                  <div>
                    <div className="text-[var(--c-muted)]">Situacao</div>
                    <div className="mt-1">
                      <span className={itemEditandoSituacao.className}>{itemEditandoSituacao.label}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Origem</div>
                    <div className="font-semibold">{itemEditando.origem || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Solicitado</div>
                    <div className="font-semibold">{formatQuantityLabel(itemEditando.quantidade_solicitada, itemEditando.unidade)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Pedido atual</div>
                    <div className="font-semibold">{formatQuantityLabel(itemEditando.quantidade_pedido, itemEditando.unidade)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Minimo</div>
                    <div className="font-semibold">{formatQuantityLabel(itemEditando.quantidade_minima_item, itemEditando.unidade)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Cotado pelo fornecedor</div>
                    <div className="font-semibold">{formatUnitPrice(itemEditandoPrecoContext?.precoCotado, itemEditando.unidade)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Preco atual do pedido</div>
                    <div className="font-semibold">{formatUnitPrice(itemEditandoPrecoContext?.precoAtual, itemEditando.unidade)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Ult. compra</div>
                    <div className="font-semibold">{formatUnitPrice(itemEditandoPrecoContext?.ultimoPrecoCompra, itemEditando.unidade, 'Sem historico')}</div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Variacao x ult. compra</div>
                    <div className={`font-semibold ${getVariationTextClass(itemEditandoPrecoContext?.variacaoUltimaCompra)}`}>
                      {formatVariationPercent(itemEditandoPrecoContext?.variacaoUltimaCompra)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Valor total atual</div>
                    <div className="font-semibold">{formatMoney(itemEditandoValorTotalAtual)}</div>
                  </div>
                </div>

                {businessAdmin ? (
                  <button type="button" className="btn btn-outline mt-4 w-full justify-center" onClick={() => abrirAuditoria(itemEditando.id)}>
                    Abrir auditoria do item
                  </button>
                ) : null}
              </div>
            </div>

            {podeGerenciarPedido && !itemEditando.removido ? (
              <div className="mt-6 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Remanejar quantidade para outro fornecedor</h3>
                    <p className="mt-1 text-sm text-[var(--c-muted)]">
                      Use quando parte ou todo o item precisar voltar para a cotacao e seguir em outro pedido.
                    </p>
                  </div>
                  <span className="app-status-pill bg-blue-50 text-blue-700">
                    Max. {formatQuantityLabel(itemEditando.quantidade_pedido, itemEditando.unidade)}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <select
                    className="input"
                    value={remanejoSelecionado}
                    onChange={(event) => setRemanejoSelecionado(event.target.value)}
                    disabled={pedidoBloqueado || remanejandoItem || candidatosRemanejamentoItem.length === 0}
                  >
                    <option value="">
                      {candidatosRemanejamentoItem.length ? 'Selecione a resposta de destino' : 'Sem fornecedor alternativo respondido'}
                    </option>
                    {candidatosRemanejamentoItem.map((candidato) => (
                      <option key={`${candidato.resposta_item_id}-${candidato.fornecedor_id}`} value={candidato.resposta_item_id}>
                        {candidato.fornecedor_nome} - {formatUnitPrice(candidato.preco_unitario, candidato.unidade)} - prazo {candidato.prazo || '-'}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    value={remanejoQuantidade}
                    onChange={(event) => setRemanejoQuantidade(maskBrazilianQuantityInput(event.target.value))}
                    onBlur={(event) => setRemanejoQuantidade(normalizeBrazilianQuantityOnBlur(event.target.value))}
                    placeholder={formatBrazilianQuantity(itemEditando.quantidade_pedido)}
                    disabled={pedidoBloqueado || remanejandoItem}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleRemanejarItemAtual}
                    disabled={pedidoBloqueado || remanejandoItem || !remanejoSelecionado}
                  >
                    {remanejandoItem ? 'Remanejando...' : 'Remanejar'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[var(--c-muted)]">
                A trilha de auditoria saiu desta tela para evitar sobrecarga visual em pedidos grandes.
              </div>
              <div className="flex flex-wrap gap-2">
                {podeGerenciarPedido && !itemEditando.removido ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleRemoverItem(itemEditando.id)}
                    disabled={pedidoBloqueado || removingItemId === itemEditando.id}
                  >
                    {removingItemId === itemEditando.id ? 'Removendo...' : 'Remover item'}
                  </button>
                ) : null}
                <button type="button" className="btn btn-outline" onClick={fecharModalEdicao} disabled={modalProcessando}>
                  Cancelar
                </button>
                {podeGerenciarPedido && !itemEditando.removido ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSalvarItem(itemEditando.id)}
                    disabled={pedidoBloqueado || savingItemId === itemEditando.id}
                  >
                    {savingItemId === itemEditando.id ? 'Salvando...' : 'Salvar ajustes'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <CompraPreviewModal preview={previewPedido} onClose={() => setPreviewPedido(null)} />
    </div>
  );
}
