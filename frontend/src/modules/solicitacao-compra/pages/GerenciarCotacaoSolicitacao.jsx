import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineArrowDownTray,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocument
} from 'react-icons/hi2';
import {
  baixarPdfSolicitacaoCompra,
  comentarSolicitacaoCompra,
  criarFornecedorCompra,
  encerrarSolicitacaoCompra,
  enviarSolicitacaoCompraParaFornecedores,
  listarFornecedoresCompra,
  obterComparativoSolicitacaoCompra,
  obterSolicitacaoCompra,
  obterUrlAssinadaCompra,
  obterUrlPdfCotacaoPublica,
  recusarSolicitacaoCompra
} from '../../../services/compras';
import { buscarParceiros, listarCategoriasParceiro } from '../../../services/parceiros';
import { useAuth } from '../../../contexts/AuthContext';
import CompraPreviewModal from '../components/CompraPreviewModal';
import { criarPreviewCompra } from '../utils/preview';
import { montarLinhasResumoApropriacao } from '../utils/apropriacoes';
import { ResizableTable, ResizableTh } from '../../../components/ResizableTable';

// helpers

function fmt(data) {
  if (!data) return '-';
  const raw = String(data);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const v = new Date(data);
  return Number.isNaN(v.getTime()) ? '-' : v.toLocaleDateString('pt-BR');
}

function fmtStatus(status) {
  return String(status || '-').replace(/_/g, ' ').toUpperCase();
}

function fmtMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseNumeroCompra(value) {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value).trim().replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumeroCompra(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return '';
  return parsed.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(parsed) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function clsStatus(status) {
  const v = String(status || '').toUpperCase();
  if (v === 'ENCERRADO') return 'app-status-pill bg-slate-100 text-slate-700';
  if (v === 'RECUSADO') return 'app-status-pill bg-red-100 text-red-700';
  if (v === 'AGUARDANDO_DIRETORIA') return 'app-status-pill bg-amber-100 text-amber-700';
  return 'app-status-pill bg-blue-100 text-blue-700';
}

function buildItemKey(item) {
  return `${String(item?.item_tipo || '').toUpperCase()}:${Number(item?.item_referencia_id || 0)}`;
}

const FORNECEDOR_LINK_COLUMNS = [
  { key: 'nome', width: 250, minWidth: 160 },
  { key: 'telefone', width: 150, minWidth: 120 },
  { key: 'email', width: 250, minWidth: 160 },
  { key: 'status', width: 130, minWidth: 105 },
  { key: 'respondido', width: 130, minWidth: 110 },
  { key: 'acoes', width: 150, minWidth: 136 }
];

function CotacaoActionButton({ as: Component = 'button', children, className = '', ...props }) {
  return (
    <Component
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--c-border)] bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-40 ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function fornecedorSelectionKey(fornecedor) {
  if (fornecedor?.selection_key) return String(fornecedor.selection_key);
  if (fornecedor?.origem_cadastro === 'PARCEIRO' && fornecedor?.parceiro_id) {
    return `parceiro:${fornecedor.parceiro_id}`;
  }
  return `fornecedor:${fornecedor?.fornecedor_compra_id || fornecedor?.id}`;
}

function fornecedorToCotacaoPayload(fornecedor) {
  if (fornecedor?.origem_cadastro === 'PARCEIRO' && fornecedor?.parceiro_id) {
    return { parceiro_id: Number(fornecedor.parceiro_id) };
  }
  return { fornecedor_id: Number(fornecedor?.fornecedor_compra_id || fornecedor?.id) };
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    alert('Link copiado.');
  } catch {
    alert('Nao foi possivel copiar o link automaticamente.');
  }
}

function whatsappLink(numero, mensagem) {
  const digits = String(numero || '').replace(/\D/g, '');
  if (!digits) return null;
  const numero55 = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${numero55}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`;
}

function gerarMensagemCotacao(fornecedorNome, url, itens = [], pdfUrl = '') {
  return [
    `Ola${fornecedorNome ? `, ${fornecedorNome}` : ''}!`,
    '',
    'Temos uma cotacao disponivel para voce.',
    'O preenchimento direto no formulario e opcional: se preferir, voce pode apenas anexar/enviar o PDF ou imagem da sua cotacao.',
    '',
    `Link da cotacao: ${url}`,
    pdfUrl ? `PDF da cotacao: ${pdfUrl}` : '',
    '',
    'Aguardamos sua resposta. Obrigado!'
  ].filter(Boolean).join('\n');
}

function ModalPedidoFinal({ fornecedor, itensGanhos, solicitacaoId, onRemanejamento, onFechar }) {
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [quantidadesRemanejar, setQuantidadesRemanejar] = useState({});
  const [destinoFornecedorId, setDestinoFornecedorId] = useState('');
  const [modoRemanejar, setModoRemanejar] = useState(false);

  const totalGanho = useMemo(() => {
    return itensGanhos.reduce((acc, it) => {
      const preco = Number(it.preco || 0);
      const qtd = Number(it.quantidade || 0);
      return acc + preco * qtd;
    }, 0);
  }, [itensGanhos]);

  const fornecedoresDestinoCotacao = useMemo(() => {
    const selecionados = itensGanhos.filter((item) => itensSelecionados.includes(item.resposta_item_id));
    if (!selecionados.length) return [];

    const candidatos = new Map();
    selecionados.forEach((item) => {
      (item.respostasDestino || [])
        .filter((resp) =>
          Number(resp.fornecedor_compra_id) !== Number(fornecedor.fornecedor_compra_id) &&
          Number(resp.resposta_item_id) > 0 &&
          Boolean(resp.disponivel) &&
          parseNumeroCompra(resp.preco) > 0
        )
        .forEach((resp) => {
          const fornecedorId = Number(resp.fornecedor_compra_id);
          const atual = candidatos.get(fornecedorId) || {
            id: fornecedorId,
            nome: resp.fornecedor_nome || 'Fornecedor',
            itensAtendidos: new Set()
          };
          atual.itensAtendidos.add(item.item_key);
          candidatos.set(fornecedorId, atual);
        });
    });

    return [...candidatos.values()]
      .filter((candidato) => selecionados.every((item) => candidato.itensAtendidos.has(item.item_key)))
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  }, [fornecedor.fornecedor_compra_id, itensGanhos, itensSelecionados]);

  function toggleItem(item) {
    const respItemId = item.resposta_item_id;
    setItensSelecionados((prev) => {
      if (prev.includes(respItemId)) {
        setQuantidadesRemanejar((current) => {
          const next = { ...current };
          delete next[String(respItemId)];
          return next;
        });
        return prev.filter((id) => id !== respItemId);
      }

      setQuantidadesRemanejar((current) => ({
        ...current,
        [String(respItemId)]: formatNumeroCompra(item.quantidade)
      }));
      return [...prev, respItemId];
    });
    setDestinoFornecedorId('');
  }

  function confirmarRemanejamento() {
    if (!itensSelecionados.length || !destinoFornecedorId) return;

    const itens = itensGanhos
      .filter((item) => itensSelecionados.includes(item.resposta_item_id))
      .map((item) => {
        const quantidade = parseNumeroCompra(quantidadesRemanejar[String(item.resposta_item_id)] ?? item.quantidade);
        const quantidadeVencedora = parseNumeroCompra(item.quantidade);
        const quantidadeSolicitada = parseNumeroCompra(item.quantidade_solicitada || item.quantidade);

        if (quantidade <= 0) {
          throw new Error(`Informe uma quantidade maior que zero para ${item.nome}.`);
        }
        if (quantidade > quantidadeVencedora + 0.0001) {
          throw new Error(`A quantidade remanejada de ${item.nome} nao pode ser maior que a quantidade vencida por este fornecedor (${formatNumeroCompra(quantidadeVencedora)} ${item.unidade || ''}).`);
        }
        if (quantidade > quantidadeSolicitada + 0.0001) {
          throw new Error(`A quantidade remanejada de ${item.nome} nao pode ser maior que a quantidade solicitada (${formatNumeroCompra(quantidadeSolicitada)} ${item.unidade || ''}).`);
        }

        const respostaDestino = (item.respostasDestino || []).find((resp) =>
          Number(resp.fornecedor_compra_id) === Number(destinoFornecedorId) &&
          Number(resp.resposta_item_id) > 0 &&
          Boolean(resp.disponivel) &&
          parseNumeroCompra(resp.preco) > 0
        );

        if (!respostaDestino) {
          throw new Error(`O fornecedor destino nao possui resposta valida para ${item.nome}.`);
        }

        return {
          itemKey: item.item_key,
          itemNome: item.nome,
          unidade: item.unidade,
          respostaOrigemId: Number(item.resposta_item_id),
          respostaDestinoId: Number(respostaDestino.resposta_item_id),
          destinoFornecedorId: Number(destinoFornecedorId),
          destinoFornecedorNome: respostaDestino.fornecedor_nome || 'Fornecedor',
          quantidade
        };
      });

    onRemanejamento({ itens, destinoFornecedorId: Number(destinoFornecedorId) });
  }

  const mensagemWhatsApp = useMemo(() => {
    return [
      `Ola ${fornecedor.nome}!`,
      '',
      `Segue o pedido referente a cotacao ${solicitacaoId ? `SC-${String(solicitacaoId).padStart(5, '0')}` : ''}.`,
      `Valor total previsto: ${fmtMoeda(totalGanho)}.`,
      '',
      'O PDF do pedido deve ser enviado junto desta mensagem.',
      'Aguardamos a confirmacao de recebimento, prazo de entrega e condicao final combinada.',
      '',
      'Obrigado!'
    ].join('\n');
  }, [fornecedor, totalGanho, solicitacaoId]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--c-surface)] shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-border)]">
          <h2 className="font-semibold text-[var(--c-text)]">
            Pedido: {fornecedor.nome}
          </h2>
          <button type="button" onClick={onFechar} className="text-[var(--c-muted)] hover:text-[var(--c-text)]">Fechar</button>
        </div>

        <div className="px-6 py-4 grid gap-4">
          {/* Itens ganhos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Itens que este fornecedor ganhou</span>
              {!modoRemanejar && (
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => setModoRemanejar(true)}
                >
                  Remanejar itens para outro fornecedor
                </button>
              )}
            </div>
            <div className="rounded-xl border border-[var(--c-border)] overflow-hidden">
              <table className="table w-full">
                <thead>
                  <tr>
                    {modoRemanejar && <th className="w-8"></th>}
                    <th>Item</th>
                    <th>Qtd</th>
                    <th>Preco unit.</th>
                    <th>Total</th>
                    {!modoRemanejar && <th>Prazo</th>}
                  </tr>
                </thead>
                <tbody>
                  {itensGanhos.map((it) => (
                    <tr key={it.resposta_item_id || it.nome}>
                      {modoRemanejar && (
                        <td>
                          <input
                            type="checkbox"
                            checked={itensSelecionados.includes(it.resposta_item_id)}
                            onChange={() => toggleItem(it)}
                          />
                        </td>
                      )}
                      <td>
                        <div className="font-medium">{it.nome || '-'}</div>
                        {it.especificacao && <div className="text-xs text-[var(--c-muted)]">{it.especificacao}</div>}
                      </td>
                      <td>
                        {it.quantidade} {it.unidade || ''}
                        {modoRemanejar && itensSelecionados.includes(it.resposta_item_id) && (
                          <input
                            className="input mt-2 h-8 w-24 px-2 text-xs"
                            value={quantidadesRemanejar[String(it.resposta_item_id)] ?? ''}
                            onChange={(event) => setQuantidadesRemanejar((current) => ({
                              ...current,
                              [String(it.resposta_item_id)]: event.target.value
                            }))}
                            placeholder="Qtd."
                          />
                        )}
                      </td>
                      <td>{fmtMoeda(it.preco)}</td>
                      <td className="font-semibold">{fmtMoeda(Number(it.quantidade) * Number(it.preco || 0))}</td>
                      {!modoRemanejar && <td>{it.prazo || '-'}</td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={modoRemanejar ? 4 : 3} className="text-right font-semibold text-sm pr-2">Total do pedido:</td>
                    <td className="font-bold text-emerald-700">{fmtMoeda(totalGanho)}</td>
                    {!modoRemanejar && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Remanejamento */}
          {modoRemanejar && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 grid gap-3">
              <p className="text-sm font-medium text-amber-800">
                Selecione os itens acima e escolha o fornecedor destino para remanejar.
              </p>
              <select
                className="input"
                value={destinoFornecedorId}
                onChange={(e) => setDestinoFornecedorId(e.target.value)}
                disabled={!itensSelecionados.length}
              >
                <option value="">
                  {itensSelecionados.length ? 'Selecionar fornecedor destino...' : 'Selecione um item para listar destinos validos'}
                </option>
                {fornecedoresDestinoCotacao
                  .map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))
                }
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setModoRemanejar(false);
                    setItensSelecionados([]);
                    setQuantidadesRemanejar({});
                    setDestinoFornecedorId('');
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!itensSelecionados.length || !destinoFornecedorId}
                  onClick={() => {
                    try {
                      confirmarRemanejamento();
                    } catch (error) {
                      alert(error.message || 'Nao foi possivel remanejar os itens.');
                    }
                  }}
                >
                  Confirmar Remanejamento ({itensSelecionados.length} item{itensSelecionados.length !== 1 ? 's' : ''})
                </button>
              </div>
            </div>
          )}

          {/* Acoes de envio */}
          {!modoRemanejar && (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--c-muted)]">Enviar pedido para o fornecedor:</p>
              <div className="flex flex-wrap gap-2">
                {fornecedor.whatsapp && whatsappLink(fornecedor.whatsapp) && (
                  <a
                    href={whatsappLink(fornecedor.whatsapp, mensagemWhatsApp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    Enviar via WhatsApp
                  </a>
                )}
                {fornecedor.email && (
                  <a
                    href={`mailto:${fornecedor.email}?subject=${encodeURIComponent(`Pedido de Compra - ${solicitacaoId ? `SC-${String(solicitacaoId).padStart(5,'0')}` : 'Cotacao'}`)}&body=${encodeURIComponent(mensagemWhatsApp)}`}
                    className="btn btn-outline"
                  >
                    Enviar por Email
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => copiarTexto(mensagemWhatsApp)}
                >
                  Copiar mensagem
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-[var(--c-border)]">
          <button type="button" className="btn btn-outline" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// SecaoEnvioFornecedores

function SecaoEnvioFornecedores({
  solicitacao,
  podeComprar,
  categoriasFornecedor,
  fornecedores,
  buscandoFornecedores,
  fornecedoresSelecionados,
  fornecedoresSelecionadosDados,
  novoFornecedor,
  categoriaFornecedorId,
  fornecedorBusca,
  enviandoFornecedores,
  itensSelecionadosEnvio,
  onChangeFornecedorBusca,
  onChangeCategoriaFornecedorId,
  onBuscarFornecedores,
  onToggleFornecedor,
  onToggleItemEnvio,
  onSelecionarTodosItensEnvio,
  onLimparItensEnvio,
  onChangeNovoFornecedor,
  onCriarFornecedorRapido,
  onEnviarFornecedores,
  itensCombinados
}) {
  const [selecionandoPorCategoria, setSelecionandoPorCategoria] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');

  // Filtra fornecedores que possuem a categoria selecionada
  const fornecedoresComCategoria = useMemo(() => {
    if (!categoriaSelecionada) return [];
    return fornecedores.filter((f) => {
      const cats = Array.isArray(f.categoria_insumos) ? f.categoria_insumos : [];
      return cats.some((c) => String(c).toLowerCase().includes(categoriaSelecionada.toLowerCase()));
    });
  }, [fornecedores, categoriaSelecionada]);

  const buscaFornecedorNormalizada = normalizeText(fornecedorBusca);
  const deveMostrarAutocomplete = buscaFornecedorNormalizada.length > 0 && !categoriaFornecedorId;
  const deveMostrarListaCategoria = Boolean(categoriaFornecedorId);
  const fornecedoresAutocomplete = useMemo(() => {
    if (!buscaFornecedorNormalizada) return [];
    return fornecedores
      .filter((f) => {
        const texto = normalizeText([
          f.nome,
          f.documento,
          f.cnpj,
          f.cpf,
          f.email,
          f.telefone,
          f.whatsapp,
          f.contato,
          ...(Array.isArray(f.categoria_insumos) ? f.categoria_insumos : [])
        ].filter(Boolean).join(' '));
        return texto.includes(buscaFornecedorNormalizada);
      })
      .slice(0, 8);
  }, [fornecedores, buscaFornecedorNormalizada]);

  const fornecedoresListaCategoria = useMemo(() => {
    if (!categoriaFornecedorId) return [];
    if (!buscaFornecedorNormalizada) return fornecedores;
    return fornecedores.filter((f) => {
      const texto = normalizeText([
        f.nome,
        f.documento,
        f.cnpj,
        f.cpf,
        f.email,
        f.telefone,
        f.whatsapp,
        f.contato,
        ...(Array.isArray(f.categoria_insumos) ? f.categoria_insumos : [])
      ].filter(Boolean).join(' '));
      return texto.includes(buscaFornecedorNormalizada);
    });
  }, [fornecedores, categoriaFornecedorId, buscaFornecedorNormalizada]);

  const fornecedoresSelecionadosDetalhes = useMemo(() => (
    fornecedoresSelecionados
      .map((selectionKey) => fornecedoresSelecionadosDados?.[selectionKey] || fornecedores.find((f) => fornecedorSelectionKey(f) === selectionKey))
      .filter(Boolean)
  ), [fornecedoresSelecionados, fornecedoresSelecionadosDados, fornecedores]);

  const qtdItensSelecionados = itensCombinados.filter((item) => itensSelecionadosEnvio?.[buildItemKey(item)]).length;

  function selecionarTodosComCategoria() {
    fornecedoresComCategoria.forEach((fornecedor) => {
      const selectionKey = fornecedorSelectionKey(fornecedor);
      if (!fornecedoresSelecionados.includes(selectionKey)) {
        onToggleFornecedor(selectionKey, true, fornecedor);
      }
    });
    setSelecionandoPorCategoria(false);
    setCategoriaSelecionada('');
  }

  // Monta links de WhatsApp para todos selecionados com numero
  const linksWhatsApp = useMemo(() => {
    const links = [];
    const publicBase = window.location.origin;

    // Fornecedores selecionados
    fornecedoresSelecionados.forEach((id) => {
      const f = fornecedores.find((x) => fornecedorSelectionKey(x) === id);
      if (!f?.whatsapp) return;

      // Encontra o token da cotacao para este fornecedor, quando ja gerado.
      const vinculo = (solicitacao?.fornecedores || []).find(
        (v) => String(v.fornecedor_compra_id) === String(f.fornecedor_compra_id || f.id)
      );
      if (!vinculo?.token) return;

      const url = `${publicBase}/cotacao/${vinculo.token}`;
      const msg = gerarMensagemCotacao(f.nome, url, itensCombinados, obterUrlPdfCotacaoPublica(vinculo.token));
      links.push({ nome: f.nome, link: whatsappLink(f.whatsapp, msg) });
    });

    return links;
  }, [fornecedoresSelecionados, fornecedores, solicitacao, itensCombinados]);

  // Links para fornecedores ja vinculados com WhatsApp
  const linksVinculados = useMemo(() => {
    return (solicitacao?.fornecedores || [])
      .filter((v) => v.fornecedor?.whatsapp)
      .map((v) => {
        const url = `${window.location.origin}/cotacao/${v.token}`;
        const msg = gerarMensagemCotacao(v.fornecedor.nome, url, itensCombinados, obterUrlPdfCotacaoPublica(v.token));
        return { nome: v.fornecedor.nome, link: whatsappLink(v.fornecedor.whatsapp, msg) };
      });
  }, [solicitacao, itensCombinados]);

  if (!podeComprar) return null;

  return (
    <div className="grid gap-3">
      {/* Envio para fornecedores vinculados via WhatsApp */}
      {linksVinculados.length > 0 && (
        <div className="cotacao-whatsapp-panel rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-700/70 dark:bg-emerald-950/45">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-100">Enviar cotacoes via WhatsApp</h3>
              <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-200">
                {linksVinculados.length} fornecedor(es) com mensagem pronta.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {linksVinculados.map(({ nome, link }) => (
                <a
                  key={nome}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-xs btn-primary"
                >
                  WhatsApp: {nome}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Adicionar novos fornecedores */}
      {solicitacao.status !== 'ENCERRADO' && (
        <div className="cotacao-fornecedores-panel rounded-xl border border-[var(--c-border)] bg-slate-50/70 p-3 dark:bg-slate-950/55">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(240px,0.42fr)_300px]">
            <div className="grid content-start gap-2.5">
              {/* Selecao por categoria */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--c-text)]">Selecionar fornecedores existentes</div>
                  <div className="text-xs text-[var(--c-muted)]">Busque por nome, documento, email ou categoria antes de gerar os links.</div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline text-xs"
                  onClick={() => setSelecionandoPorCategoria(!selecionandoPorCategoria)}
                >
                  Filtrar por categoria de insumo
                </button>
              </div>

              {selecionandoPorCategoria && (
                <div className="grid gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/70 dark:bg-blue-950/45">
                  <p className="text-xs text-blue-700 dark:text-blue-200">
                    Selecione uma categoria para auto-selecionar os fornecedores cadastrados que a atendem:
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="Ex.: Eletrico, Hidraulico, Concreto..."
                      value={categoriaSelecionada}
                      onChange={(e) => setCategoriaSelecionada(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-primary text-sm"
                      onClick={selecionarTodosComCategoria}
                      disabled={!categoriaSelecionada.trim() || !fornecedoresComCategoria.length}
                    >
                      Selecionar {fornecedoresComCategoria.length > 0 ? `(${fornecedoresComCategoria.length})` : ''}
                    </button>
                  </div>
                  {categoriaSelecionada && fornecedoresComCategoria.length === 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-300">Nenhum fornecedor cadastrado com esta categoria.</p>
                  )}
                </div>
              )}

              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">Fornecedores</span>
                  {fornecedoresSelecionados.length > 0 && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/70 dark:text-blue-200">
                      {fornecedoresSelecionados.length} selecionado(s)
                    </span>
                  )}
                </div>
                <div className="mb-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_190px_auto]">
                  <div className="relative">
                    <input
                      className="input"
                      placeholder="Digite nome, CNPJ, email ou contato"
                      value={fornecedorBusca}
                      onChange={(e) => onChangeFornecedorBusca(e.target.value)}
                    />
                    {deveMostrarAutocomplete && (
                      <div className="cotacao-fornecedores-autocomplete absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-xl border border-[var(--c-border)] bg-white shadow-lg dark:bg-slate-950 dark:shadow-black/30">
                        {buscandoFornecedores ? (
                          <div className="px-3 py-3 text-sm text-[var(--c-muted)]">Buscando fornecedores...</div>
                        ) : fornecedoresAutocomplete.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-[var(--c-muted)]">
                            Nenhum fornecedor encontrado para essa busca.
                          </div>
                        ) : (
                          fornecedoresAutocomplete.map((f) => {
                            const selectionKey = fornecedorSelectionKey(f);
                            const checked = fornecedoresSelecionados.includes(selectionKey);
                            return (
                              <button
                                key={selectionKey}
                                type="button"
                                className={`flex w-full items-start gap-3 border-b border-[var(--c-border)] px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-950/45 ${checked ? 'bg-blue-50 dark:bg-blue-950/60' : ''}`}
                                onClick={() => onToggleFornecedor(selectionKey, !checked, f)}
                              >
                                <input type="checkbox" checked={checked} readOnly className="mt-1" />
                                <span className="min-w-0">
                                  <span className="block font-semibold text-[var(--c-text)]">{f.nome}</span>
                                  <span className="block text-xs text-[var(--c-muted)]">
                                    {f.whatsapp ? `WhatsApp: ${f.whatsapp}` : 'Sem WhatsApp'} {f.email ? ` - ${f.email}` : ''}
                                  </span>
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  <select
                    className="input"
                    value={categoriaFornecedorId}
                    onChange={(e) => onChangeCategoriaFornecedorId(e.target.value)}
                  >
                    <option value="">Todas as categorias</option>
                    {categoriasFornecedor.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-outline" onClick={onBuscarFornecedores} disabled={buscandoFornecedores}>
                    {buscandoFornecedores ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
                {!deveMostrarAutocomplete && !deveMostrarListaCategoria && fornecedoresSelecionados.length === 0 && (
                  <div className="cotacao-fornecedores-empty rounded-lg border border-dashed border-[var(--c-border)] bg-white/70 px-3 py-2.5 text-xs text-[var(--c-muted)] dark:bg-slate-950/45">
                    Digite no campo de busca para localizar fornecedores ou escolha uma categoria para listar os cadastrados.
                  </div>
                )}
                {deveMostrarListaCategoria && (
                  <div className="cotacao-fornecedores-list app-list-stack max-h-[220px] overflow-y-auto rounded-xl border border-[var(--c-border)] bg-white/80 p-2 dark:bg-slate-950/45">
                    {buscandoFornecedores ? (
                      <div className="text-sm text-[var(--c-muted)]">Buscando...</div>
                    ) : fornecedoresListaCategoria.length === 0 ? (
                      <div className="text-sm text-[var(--c-muted)]">Nenhum fornecedor encontrado para a categoria selecionada.</div>
                    ) : (
                      fornecedoresListaCategoria.map((f) => (
                        <label key={fornecedorSelectionKey(f)} className="app-list-card flex items-start gap-2 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={fornecedoresSelecionados.includes(fornecedorSelectionKey(f))}
                            onChange={(e) => onToggleFornecedor(fornecedorSelectionKey(f), e.target.checked, f)}
                          />
                          <div>
                            <div className="font-medium">{f.nome}</div>
                            {f.whatsapp && (
                              <div className="text-xs text-[var(--c-muted)]">WhatsApp: {f.whatsapp}</div>
                            )}
                            {Array.isArray(f.categoria_insumos) && f.categoria_insumos.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {f.categoria_insumos.map((c) => (
                                  <span key={c} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-950/70 dark:text-blue-200">{c}</span>
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-[var(--c-muted)]">
                              {f.email || 'Sem email'} {f.telefone ? ` - ${f.telefone}` : ''}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="cotacao-fornecedores-selecionados grid content-start gap-2.5 rounded-xl border border-[var(--c-border)] bg-white/85 p-3 dark:bg-slate-950/65">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--c-text)]">Fornecedores selecionados</div>
                  <div className="text-xs text-[var(--c-muted)]">Revise antes de gerar os links.</div>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/70 dark:text-blue-200">
                  {fornecedoresSelecionadosDetalhes.length}
                </span>
              </div>
              {fornecedoresSelecionadosDetalhes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--c-border)] px-3 py-4 text-xs text-[var(--c-muted)]">
                  Nenhum fornecedor selecionado.
                </div>
              ) : (
                <div className="app-list-stack max-h-[250px] overflow-y-auto">
                  {fornecedoresSelecionadosDetalhes.map((fornecedor) => {
                    const selectionKey = fornecedorSelectionKey(fornecedor);
                    return (
                      <div key={selectionKey} className="rounded-lg border border-[var(--c-border)] bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900/60">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[var(--c-text)]">{fornecedor.nome}</div>
                            <div className="truncate text-[var(--c-muted)]">
                              {fornecedor.whatsapp || fornecedor.telefone || fornecedor.email || 'Sem contato principal'}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-red-600 hover:text-red-700 dark:text-red-300"
                            onClick={() => onToggleFornecedor(selectionKey, false, fornecedor)}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="cotacao-fornecedor-rapido grid content-start gap-2.5 rounded-xl border border-[var(--c-border)] bg-white/85 p-3 dark:bg-slate-950/65">
              <div>
                <div className="text-sm font-semibold text-[var(--c-text)]">Cadastro rapido</div>
                <div className="text-xs text-[var(--c-muted)]">Inclua um fornecedor novo sem sair da cotacao.</div>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-[var(--c-muted)]">Nome do fornecedor</span>
                <input className="input" placeholder="Ex.: Fornecedor ABC" value={novoFornecedor.nome} onChange={(e) => onChangeNovoFornecedor('nome', e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-[var(--c-muted)]">CPF/CNPJ</span>
                <input className="input" placeholder="CPF ou CNPJ do fornecedor" value={novoFornecedor.cnpj} onChange={(e) => onChangeNovoFornecedor('cnpj', e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-[var(--c-muted)]">WhatsApp</span>
                <input className="input" placeholder="(00) 00000-0000" value={novoFornecedor.whatsapp} onChange={(e) => onChangeNovoFornecedor('whatsapp', e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-[var(--c-muted)]">Email</span>
                <input className="input" placeholder="email@fornecedor.com" value={novoFornecedor.email} onChange={(e) => onChangeNovoFornecedor('email', e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-[var(--c-muted)]">Contato</span>
                <input className="input" placeholder="Nome do contato" value={novoFornecedor.contato} onChange={(e) => onChangeNovoFornecedor('contato', e.target.value)} />
              </label>
              <div className="grid gap-1.5 pt-1">
                <button type="button" className="btn btn-outline w-full" onClick={onCriarFornecedorRapido}>Cadastrar e selecionar</button>
                <button type="button" className="btn btn-primary w-full" onClick={onEnviarFornecedores} disabled={enviandoFornecedores}>
                  {enviandoFornecedores ? 'Gerando links...' : 'Gerar links de cotacao'}
                </button>
              </div>
            </div>
          </div>

          {fornecedoresSelecionados.length > 0 && (
            <div className="mt-4 rounded-xl border border-[var(--c-border)] bg-white/85 p-3 dark:bg-slate-950/65">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--c-text)]">Itens que serao enviados</div>
                  <div className="text-xs text-[var(--c-muted)]">
                    Selecione os itens que vao compor estes links. Depois de gerar, a selecao fica gravada na cotacao.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {qtdItensSelecionados}/{itensCombinados.length} item(ns)
                  </span>
                  <button type="button" className="btn btn-xs btn-outline" onClick={onSelecionarTodosItensEnvio}>Todos</button>
                  <button type="button" className="btn btn-xs btn-outline" onClick={onLimparItensEnvio}>Limpar</button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[var(--c-border)]">
                <table className="min-w-[920px] w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <tr>
                      <th className="w-10 px-3 py-2">Sel.</th>
                      <th className="px-3 py-2">Item</th>
                      <th className="w-24 px-3 py-2">Qtd.</th>
                      <th className="px-3 py-2">Especificacao</th>
                      <th className="w-32 px-3 py-2">Necessario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensCombinados.map((item) => {
                      const itemKey = buildItemKey(item);
                      return (
                        <tr key={itemKey} className="border-t border-[var(--c-border)] align-top">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={Boolean(itensSelecionadosEnvio?.[itemKey])}
                              onChange={(event) => onToggleItemEnvio(itemKey, event.target.checked)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-[var(--c-text)]">{item.nome}</div>
                            <div className="text-[11px] text-[var(--c-muted)]">{item.item_tipo === 'MANUAL' ? 'Manual' : 'Cadastrado'}</div>
                          </td>
                          <td className="px-3 py-2">{formatNumeroCompra(item.quantidade)} {item.unidade}</td>
                          <td className="px-3 py-2 text-[var(--c-muted)]">{item.especificacao || '-'}</td>
                          <td className="px-3 py-2">{fmt(item.necessario_para)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// SecaoComparativo

function SecaoComparativo({ comparativo, solicitacao, podeComprar, vencedoresSelecionados, onVencedorChange, onRemanejamentoAplicado, onEncerrar, encerrando }) {
  const [modalFornecedor, setModalFornecedor] = useState(null); // { fornecedor, itensGanhos }

  function getQuantidadeAlocada(respostaItemId) {
    const registro = vencedoresSelecionados[String(respostaItemId)];
    return parseNumeroCompra(registro?.quantidade_alocada);
  }

  function getTotalAlocadoItem(item) {
    return (item.respostas || []).reduce((acc, resp) => acc + getQuantidadeAlocada(resp.resposta_item_id), 0);
  }

  // Agrega totais por fornecedor para o ranking top 3
  const rankingFornecedores = useMemo(() => {
    if (!comparativo?.itens?.length) return [];

    const totaisFornecedor = {};
    const itensFornecedor = {};

    comparativo.itens.forEach((item) => {
      item.respostas.forEach((resp) => {
        if (!resp.fornecedor_id || !resp.disponivel || !resp.preco) return;
        const fId = resp.fornecedor_id;
        const quantidadeGanha = getQuantidadeAlocada(resp.resposta_item_id);
        const totalItem = Number(resp.preco || 0) * (quantidadeGanha || Number(item.quantidade || 0));

        if (!totaisFornecedor[fId]) {
          totaisFornecedor[fId] = {
            fornecedor_id: fId,
            fornecedor_nome: resp.fornecedor_nome,
            fornecedor_whatsapp: resp.fornecedor_whatsapp || null,
            fornecedor_email: resp.fornecedor_email || null,
            fornecedor_compra_id: resp.fornecedor_compra_id || null,
            total: 0,
            itensGanhos: [],
            itensRespondidos: 0,
            vencedor_itens: 0
          };
        }
        totaisFornecedor[fId].total += totalItem;
        totaisFornecedor[fId].itensRespondidos += 1;

        if (!itensFornecedor[fId]) itensFornecedor[fId] = [];
        itensFornecedor[fId].push({
          item_key: buildItemKey(item),
          resposta_item_id: resp.resposta_item_id,
          nome: item.nome,
          unidade: item.unidade,
          quantidade: quantidadeGanha || item.quantidade,
          quantidade_solicitada: item.quantidade,
          preco: resp.preco,
          prazo: resp.prazo,
          especificacao: item.especificacao,
          respostasDestino: item.respostas || [],
          ganhou: quantidadeGanha > 0
        });

        if (quantidadeGanha > 0) {
          totaisFornecedor[fId].vencedor_itens += 1;
        }
      });
    });

    Object.keys(itensFornecedor).forEach((fId) => {
      if (totaisFornecedor[fId]) {
        totaisFornecedor[fId].itensGanhos = itensFornecedor[fId].filter((it) => it.ganhou);
      }
    });

    return Object.values(totaisFornecedor)
      .sort((a, b) => a.total - b.total)
      .slice(0, 3);
  }, [comparativo, vencedoresSelecionados]);

  if (!comparativo?.itens?.length) {
    return (
      <div className="card sol-surface-card cotacao-comparativo-panel">
        <div className="card-header">
          <h2 className="font-semibold">Comparativo de Cotacoes</h2>
        </div>
        <div className="app-empty-card">
          O comparativo aparece assim que os fornecedores responderem a cotacao.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card sol-surface-card">
        <div className="card-header flex flex-wrap items-center justify-between gap-3 pb-3">
          <div>
            <h2 className="font-semibold">Comparativo por item</h2>
            <p className="mt-0.5 text-xs text-[var(--c-muted)]">Compare respostas, selecione vencedores e encerre a cotacao quando estiver pronta.</p>
          </div>
          <span className="cotacao-comparativo-count rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {comparativo.itens.length} item(ns)
          </span>
        </div>

        {rankingFornecedores.length > 0 && (
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            {rankingFornecedores.map((forn, idx) => (
              <div
                key={forn.fornecedor_id}
                className={`cotacao-ranking-card grid gap-1.5 rounded-xl border px-3 py-2.5 ${idx === 0 ? 'cotacao-ranking-card-best border-emerald-300 bg-emerald-50' : 'border-[var(--c-border)] bg-slate-50/80'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-lg font-bold leading-none ${idx === 0 ? 'text-emerald-600' : 'text-[var(--c-muted)]'}`}>
                    {idx + 1}
                  </span>
                   <span className={`cotacao-ranking-pill app-status-pill text-xs ${idx === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {idx === 0 ? 'Menor preco' : `${idx + 1}o lugar`}
                  </span>
                </div>
                <div className="truncate text-sm font-semibold">{forn.fornecedor_nome}</div>
                <div className="text-base font-bold text-[var(--c-text)]">{fmtMoeda(forn.total)}</div>
                <div className="text-xs text-[var(--c-muted)]">
                  {forn.itensRespondidos} item(ns) respondido(s) - {forn.vencedor_itens} ganhador(es)
                </div>
                {forn.itensGanhos.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-xs btn-outline mt-1"
                    onClick={() => setModalFornecedor({
                      fornecedor: {
                        nome: forn.fornecedor_nome,
                        whatsapp: forn.fornecedor_whatsapp,
                        email: forn.fornecedor_email,
                        fornecedor_compra_id: forn.fornecedor_compra_id
                      },
                      itensGanhos: forn.itensGanhos
                    })}
                  >
                    Ver itens ganhos e gerar pedido
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="app-list-stack gap-2">
          {comparativo.itens.map((item) => (
            <div key={buildItemKey(item)} className="cotacao-comparativo-item app-list-card px-3 py-2.5">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{item.nome}</div>
                  <div className="text-xs text-[var(--c-muted)]">
                    {item.quantidade} {item.unidade} - {item.item_tipo === 'MANUAL' ? 'Manual' : 'Cadastrado'}
                    {item.especificacao ? ` - ${item.especificacao}` : ''}
                  </div>
                  {podeComprar ? (
                    <div className="mt-1 text-xs text-[var(--c-muted)]">
                      Selecionado: <strong>{formatNumeroCompra(getTotalAlocadoItem(item))}</strong> de {formatNumeroCompra(item.quantidade)} {item.unidade || ''}
                    </div>
                  ) : null}
                </div>
                {item.melhor_preco && (
                  <div className="cotacao-menor-preco rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
                    Menor: <strong>{item.melhor_preco.fornecedor_nome}</strong> - {fmtMoeda(item.melhor_preco.preco)}/un
                  </div>
                )}
              </div>

              <div className="app-table-shell overflow-x-auto">
                <table className="table text-xs">
                  <thead>
                    <tr>
                      <th>Fornecedor</th>
                      <th>Disponivel</th>
                      <th>Preco unit.</th>
                      <th>Total item</th>
                      <th>Prazo</th>
                      <th>Cond. pag.</th>
                      <th>Qtd. min.</th>
                      <th>Observacao</th>
                      <th className="min-w-[150px]">Comprar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.respostas.map((resp) => {
                      const quantidadeAlocada = getQuantidadeAlocada(resp.resposta_item_id);
                      const isVencedor = quantidadeAlocada > 0;
                      const totalAlocadoItem = getTotalAlocadoItem(item);
                      const quantidadeItem = parseNumeroCompra(item.quantidade);
                      const excedeu = totalAlocadoItem > quantidadeItem + 0.0001;
                      return (
                        <tr
                          key={`${item.id}-${resp.fornecedor_id}`}
                          className={`cotacao-comparativo-resposta ${isVencedor ? 'cotacao-comparativo-resposta-vencedora bg-emerald-50' : ''} ${excedeu ? 'cotacao-comparativo-resposta-excedida bg-red-50' : ''}`}
                        >
                          <td className="text-xs font-medium">{resp.fornecedor_nome}</td>
                          <td>
                            <span className={`app-status-pill text-[11px] ${resp.disponivel ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {resp.disponivel ? 'Sim' : 'Nao'}
                            </span>
                          </td>
                          <td>{resp.preco ? fmtMoeda(resp.preco) : '-'}</td>
                          <td className="font-medium">
                            {resp.preco ? fmtMoeda(Number(resp.preco) * Number(item.quantidade || 0)) : '-'}
                          </td>
                          <td>{resp.prazo || '-'}</td>
                          <td className="max-w-[150px] text-xs">{resp.condicao_pagamento || '-'}</td>
                          <td>{resp.quantidade_minima_item || '-'}</td>
                          <td className="max-w-[160px] text-xs">{resp.observacao || '-'}</td>
                          <td>
                            {resp.resposta_item_id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isVencedor}
                                  disabled={!podeComprar || !resp.disponivel || !resp.preco}
                                  onChange={(event) => {
                                    const checked = event.target.checked;
                                    onVencedorChange({
                                      item,
                                      resposta: resp,
                                      quantidade: checked ? item.quantidade : 0
                                    });
                                  }}
                                />
                                <input
                                  className="input h-8 w-20 px-2 text-xs"
                                  value={isVencedor ? formatNumeroCompra(quantidadeAlocada) : ''}
                                  placeholder="Qtd."
                                  disabled={!podeComprar || !isVencedor}
                                  onChange={(event) => onVencedorChange({
                                    item,
                                    resposta: resp,
                                    quantidade: event.target.value
                                  })}
                                />
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {podeComprar && String(solicitacao.status || '').toUpperCase() !== 'RECUSADO' && (
            <div className="app-page-actions justify-end">
              <button type="button" className="btn btn-primary" onClick={onEncerrar} disabled={encerrando}>
                {encerrando
                  ? 'Atualizando...'
                  : String(solicitacao.status || '').toUpperCase() === 'ENCERRADO'
                    ? 'Atualizar vencedores e pedidos'
                    : 'Encerrar Cotacao e Definir Vencedores'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de pedido final */}
      {modalFornecedor && (
        <ModalPedidoFinal
          fornecedor={modalFornecedor.fornecedor}
          itensGanhos={modalFornecedor.itensGanhos}
          solicitacaoId={solicitacao?.id}
          onRemanejamento={(payload) => {
            onRemanejamentoAplicado?.(payload);
            const totalItens = payload?.itens?.length || 0;
            const fornecedorDestino = payload?.itens?.[0]?.destinoFornecedorNome || 'fornecedor destino';
            alert(`${totalItens} item(ns) remanejado(s) para ${fornecedorDestino}. Confira as quantidades e clique em "Atualizar vencedores e pedidos" para gravar.`);
            setModalFornecedor(null);
          }}
          onFechar={() => setModalFornecedor(null)}
        />
      )}
    </>
  );
}

// Componente principal

export default function GerenciarCotacaoSolicitacao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [solicitacao, setSolicitacao] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [categoriasFornecedor, setCategoriasFornecedor] = useState([]);
  const [categoriaFornecedorId, setCategoriaFornecedorId] = useState('');
  const [fornecedorBusca, setFornecedorBusca] = useState('');
  const [buscandoFornecedores, setBuscandoFornecedores] = useState(false);
  const [comparativo, setComparativo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [previewArquivo, setPreviewArquivo] = useState(null);
  const [enviandoFornecedores, setEnviandoFornecedores] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [comentarioCotacao, setComentarioCotacao] = useState('');
  const [registrandoComentario, setRegistrandoComentario] = useState(false);
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState([]);
  const [fornecedoresSelecionadosDados, setFornecedoresSelecionadosDados] = useState({});
  const [itensSelecionadosEnvio, setItensSelecionadosEnvio] = useState({});
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: '', cnpj: '', email: '', whatsapp: '', contato: '' });
  const [vencedoresSelecionados, setVencedoresSelecionados] = useState({});

  const perfilUpper = String(user?.perfil || '').toUpperCase();
  const tokens = [
    String(user?.area || '').toUpperCase(),
    String(user?.setor?.codigo || '').toUpperCase(),
    String(user?.setor?.nome || '').toUpperCase()
  ];
  const podeComprar =
    perfilUpper === 'SUPERADMIN' || perfilUpper === 'ADMIN' || tokens.includes('COMPRAS');

  async function carregarFornecedores() {
    try {
      setBuscandoFornecedores(true);
      const params = { limit: 200 };
      const parceiroParams = { fornecedor: 1, ativo: 1, incluir_categorias: 1, limit: 200 };
      if (categoriaFornecedorId) {
        const categoria = categoriasFornecedor.find((item) => String(item.id) === String(categoriaFornecedorId));
        if (categoria?.nome) params.categoria = categoria.nome;
        parceiroParams.categoria_id = categoriaFornecedorId;
      }
      if (fornecedorBusca.trim()) {
        params.q = fornecedorBusca.trim();
        parceiroParams.q = fornecedorBusca.trim();
      }
      const [fornecedoresData, parceirosData] = await Promise.all([
        listarFornecedoresCompra(params),
        buscarParceiros(parceiroParams)
      ]);

      const fornecedoresCompra = (Array.isArray(fornecedoresData) ? fornecedoresData : []).map((fornecedor) => ({
        ...fornecedor,
        fornecedor_compra_id: fornecedor.id,
        selection_key: `fornecedor:${fornecedor.id}`,
        origem_cadastro: fornecedor.parceiro_id ? 'FORNECEDOR_COMPRA_PARCEIRO' : 'FORNECEDOR_COMPRA'
      }));
      const parceiroIdsJaSincronizados = new Set(
        fornecedoresCompra
          .map((fornecedor) => Number(fornecedor.parceiro_id || 0))
          .filter((parceiroId) => parceiroId > 0)
      );
      const parceirosFornecedores = (Array.isArray(parceirosData) ? parceirosData : [])
        .filter((parceiro) => !parceiroIdsJaSincronizados.has(Number(parceiro.id)))
        .map((parceiro) => ({
          id: `parceiro:${parceiro.id}`,
          parceiro_id: parceiro.id,
          selection_key: `parceiro:${parceiro.id}`,
          origem_cadastro: 'PARCEIRO',
          nome: parceiro.nome,
          cnpj: parceiro.cpf_cnpj,
          documento: parceiro.cpf_cnpj,
          email: parceiro.email || '',
          whatsapp: parceiro.telefone || '',
          telefone: parceiro.telefone || '',
          contato: '',
          categoria_insumos: Array.isArray(parceiro.categorias)
            ? parceiro.categorias.map((categoria) => categoria.nome).filter(Boolean)
            : []
        }));

      setFornecedores(
        [...fornecedoresCompra, ...parceirosFornecedores]
          .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
      );
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao buscar fornecedores');
    } finally {
      setBuscandoFornecedores(false);
    }
  }

  async function carregarTudo() {
    try {
      setLoading(true);
      const [dataSolicitacao, dataCategorias] = await Promise.all([
        obterSolicitacaoCompra(id),
        listarCategoriasParceiro()
      ]);

      setSolicitacao(dataSolicitacao || null);
      setCategoriasFornecedor(Array.isArray(dataCategorias) ? dataCategorias : []);
      await carregarFornecedores();

      if ((dataSolicitacao?.fornecedores || []).length > 0) {
        const dataComparativo = await obterComparativoSolicitacaoCompra(id);
        setComparativo(dataComparativo || null);

        const vencedoresAtuais = {};
        (dataComparativo?.itens || []).forEach((item) => {
          (item.respostas || [])
            .filter((r) => r.vencedor && r.resposta_item_id)
            .forEach((respostaVencedora) => {
              vencedoresAtuais[String(respostaVencedora.resposta_item_id)] = {
                resposta_item_id: Number(respostaVencedora.resposta_item_id),
                quantidade_alocada: parseNumeroCompra(respostaVencedora.quantidade_alocada || item.quantidade)
              };
            });
        });
        setVencedoresSelecionados(vencedoresAtuais);
      } else {
        setComparativo(null);
        setVencedoresSelecionados({});
      }
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar solicitacao de compra');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarTudo(); }, [id]);
  useEffect(() => {
    if (loading) return undefined;
    const timer = window.setTimeout(() => {
      carregarFornecedores();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fornecedorBusca, categoriaFornecedorId]);

  const itensCombinados = useMemo(() => {
    const itens = (solicitacao?.itens || []).map((item) => ({
      item_tipo: 'CADASTRADO',
      item_referencia_id: item.id,
      nome: item.insumo?.nome || '-',
      unidade: item.unidade?.sigla || '-',
      quantidade: item.quantidade,
      especificacao: item.especificacao || '-',
      apropriacao_linhas: montarLinhasResumoApropriacao(item),
      necessario_para: item.necessario_para,
      link_produto: item.link_produto || '',
      arquivo_url: item.arquivo_url || '',
      arquivo_nome_original: item.arquivo_nome_original || ''
    }));
    const manuais = (solicitacao?.itensManuais || []).map((item) => ({
      item_tipo: 'MANUAL',
      item_referencia_id: item.id,
      nome: item.nome_manual || '-',
      unidade: item.unidade_sigla_manual || '-',
      quantidade: item.quantidade,
      especificacao: item.especificacao || '-',
      apropriacao_linhas: montarLinhasResumoApropriacao(item),
      necessario_para: item.necessario_para,
      link_produto: item.link_produto || '',
      arquivo_url: item.arquivo_url || '',
      arquivo_nome_original: item.arquivo_nome_original || ''
    }));
    return [...itens, ...manuais];
  }, [solicitacao]);

  const selecionarTodosItensEnvio = () => {
    setItensSelecionadosEnvio(
      itensCombinados.reduce((acc, item) => {
        acc[buildItemKey(item)] = true;
        return acc;
      }, {})
    );
  };

  const limparItensEnvio = () => {
    setItensSelecionadosEnvio({});
  };

  const garantirItensEnvioSelecionados = () => {
    setItensSelecionadosEnvio((atual) => {
      if (Object.values(atual || {}).some(Boolean)) {
        return atual;
      }
      return itensCombinados.reduce((acc, item) => {
        acc[buildItemKey(item)] = true;
        return acc;
      }, {});
    });
  };

  const pedidosPorFornecedor = useMemo(() => {
    const mapa = new Map();
    (solicitacao?.pedidos || []).forEach((pedido) => {
      mapa.set(Number(pedido.fornecedor_compra_id), pedido);
    });
    return mapa;
  }, [solicitacao]);

  async function handleAbrirPdf() {
    try {
      setBaixando(true);
      const blob = await baixarPdfSolicitacaoCompra(id);
      const url = window.URL.createObjectURL(blob);
      setPreviewArquivo(await criarPreviewCompra({
        title: `PDF da solicitacao SC-${String(solicitacao?.id || id).padStart(5, '0')}`,
        name: `SC-${String(solicitacao?.id || id).padStart(5, '0')}.pdf`,
        url
      }));
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao abrir PDF');
    } finally {
      setBaixando(false);
    }
  }

  async function handleAbrirArquivo(item) {
    try {
      const url = await obterUrlAssinadaCompra(item?.arquivo_url);
      if (!url) { alert('Arquivo nao encontrado.'); return; }
      setPreviewArquivo(await criarPreviewCompra({
        title: 'Arquivo do item',
        name: item.arquivo_nome_original || 'Arquivo anexado',
        url
      }));
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao abrir arquivo do item');
    }
  }

  async function handleEnviarFornecedores() {
    try {
      const payload = [];
      fornecedoresSelecionados.forEach((selectionKey) => {
        const fornecedor =
          fornecedoresSelecionadosDados[selectionKey] ||
          fornecedores.find((item) => fornecedorSelectionKey(item) === selectionKey);
        if (fornecedor) payload.push(fornecedorToCotacaoPayload(fornecedor));
      });
      if (String(novoFornecedor.nome || '').trim()) {
        payload.push({
          nome: novoFornecedor.nome,
          cnpj: novoFornecedor.cnpj,
          email: novoFornecedor.email,
          whatsapp: novoFornecedor.whatsapp,
          contato: novoFornecedor.contato
        });
      }
      if (!payload.length) { alert('Selecione ou cadastre ao menos um fornecedor.'); return; }

      const itensPayload = itensCombinados
        .filter((item) => itensSelecionadosEnvio[buildItemKey(item)])
        .map((item) => ({
          item_tipo: item.item_tipo,
          item_referencia_id: item.item_referencia_id
        }));

      if (!itensPayload.length) {
        alert('Selecione ao menos um item para gerar a cotacao.');
        return;
      }

      setEnviandoFornecedores(true);
      await enviarSolicitacaoCompraParaFornecedores(id, { fornecedores: payload, itens: itensPayload });
      setFornecedoresSelecionados([]);
      setFornecedoresSelecionadosDados({});
      setItensSelecionadosEnvio({});
      setNovoFornecedor({ nome: '', cnpj: '', email: '', whatsapp: '', contato: '' });
      await carregarTudo();
      alert('Links de cotacao gerados. Use os botoes de WhatsApp para enviar a mensagem a cada fornecedor.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao enviar para fornecedores');
    } finally {
      setEnviandoFornecedores(false);
    }
  }

  async function handleCriarFornecedorRapido() {
    try {
      if (!String(novoFornecedor.nome || '').trim()) { alert('Informe o nome do fornecedor.'); return; }
      if (!String(novoFornecedor.cnpj || '').trim()) { alert('Informe o CPF/CNPJ do fornecedor.'); return; }
      if (!String(novoFornecedor.whatsapp || '').trim()) { alert('Informe o WhatsApp/telefone do fornecedor.'); return; }
      const fornecedor = await criarFornecedorCompra(novoFornecedor);
      const fornecedorFormatado = {
        ...fornecedor,
        fornecedor_compra_id: fornecedor.id,
        selection_key: `fornecedor:${fornecedor.id}`,
        origem_cadastro: fornecedor.parceiro_id ? 'FORNECEDOR_COMPRA_PARCEIRO' : 'FORNECEDOR_COMPRA'
      };
      setFornecedores((atual) => [...atual, fornecedorFormatado].sort((a, b) => String(a.nome).localeCompare(String(b.nome))));
      setFornecedoresSelecionados((atual) => [...atual, fornecedorSelectionKey(fornecedorFormatado)]);
      setFornecedoresSelecionadosDados((atual) => ({
        ...atual,
        [fornecedorSelectionKey(fornecedorFormatado)]: fornecedorFormatado
      }));
      garantirItensEnvioSelecionados();
      setNovoFornecedor({ nome: '', cnpj: '', email: '', whatsapp: '', contato: '' });
      alert('Fornecedor criado e selecionado.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao criar fornecedor');
    }
  }

  function handleVencedorChange({ resposta, quantidade }) {
    if (!resposta?.resposta_item_id) return;

    const respostaId = String(resposta.resposta_item_id);
    const quantidadeNumero = parseNumeroCompra(quantidade);

    setVencedoresSelecionados((prev) => {
      const next = { ...prev };
      if (!quantidadeNumero || quantidadeNumero <= 0) {
        delete next[respostaId];
        return next;
      }

      next[respostaId] = {
        resposta_item_id: Number(resposta.resposta_item_id),
        quantidade_alocada: quantidadeNumero
      };
      return next;
    });
  }

  function handleAplicarRemanejamentoCotacao({ itens = [] }) {
    if (!Array.isArray(itens) || !itens.length) return;

    setVencedoresSelecionados((prev) => {
      const next = { ...prev };

      itens.forEach((item) => {
        const quantidade = parseNumeroCompra(item.quantidade);
        const origemId = Number(item.respostaOrigemId || 0);
        const destinoId = Number(item.respostaDestinoId || 0);
        if (!origemId || !destinoId || quantidade <= 0) return;

        const origemKey = String(origemId);
        const destinoKey = String(destinoId);
        const origemAtual = parseNumeroCompra(next[origemKey]?.quantidade_alocada);
        const origemNova = Number(Math.max(0, origemAtual - quantidade).toFixed(3));

        if (origemNova > 0) {
          next[origemKey] = {
            resposta_item_id: origemId,
            quantidade_alocada: origemNova
          };
        } else {
          delete next[origemKey];
        }

        const destinoAtual = parseNumeroCompra(next[destinoKey]?.quantidade_alocada);
        next[destinoKey] = {
          resposta_item_id: destinoId,
          quantidade_alocada: Number((destinoAtual + quantidade).toFixed(3))
        };
      });

      return next;
    });
  }

  async function handleEncerrar() {
    try {
      const itens = comparativo?.itens || [];
      const alocacoes = Object.values(vencedoresSelecionados)
        .filter((entry) => Number(entry?.resposta_item_id) > 0 && parseNumeroCompra(entry?.quantidade_alocada) > 0)
        .map((entry) => ({
          resposta_item_id: Number(entry.resposta_item_id),
          quantidade_alocada: parseNumeroCompra(entry.quantidade_alocada)
        }));
      if (!alocacoes.length) { alert('Selecione ao menos um vencedor para encerrar.'); return; }

      const errosQuantidade = [];
      itens.forEach((item) => {
        const totalItem = (item.respostas || []).reduce((acc, resp) => {
          const selecionado = vencedoresSelecionados[String(resp.resposta_item_id)];
          return acc + parseNumeroCompra(selecionado?.quantidade_alocada);
        }, 0);
        const quantidadeItem = parseNumeroCompra(item.quantidade);
        if (totalItem > quantidadeItem + 0.0001) {
          errosQuantidade.push(`- ${item.nome}: marcado ${formatNumeroCompra(totalItem)} ${item.unidade || ''}, mas a cotacao solicitou ${formatNumeroCompra(quantidadeItem)} ${item.unidade || ''}.`);
        }
      });

      if (errosQuantidade.length) {
        alert([
          'A quantidade marcada para compra ultrapassa a quantidade solicitada na cotacao.',
          '',
          'Ajuste os itens abaixo antes de atualizar os vencedores:',
          ...errosQuantidade
        ].join('\n'));
        return;
      }

      setEncerrando(true);
      await encerrarSolicitacaoCompra(id, { alocacoes });
      await carregarTudo();
      alert(String(solicitacao?.status || '').toUpperCase() === 'ENCERRADO'
        ? 'Vencedores e pedidos atualizados. Abrindo a tela de pedidos.'
        : 'Cotacao encerrada e pedidos gerados. Abrindo a tela de pedidos.');
      navigate('/pedidos-compra');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao encerrar cotacao');
    } finally {
      setEncerrando(false);
    }
  }

  async function handleRecusarSolicitacao() {
    const motivo = window.prompt('Informe o motivo da recusa da solicitacao de compra:');
    if (motivo === null) return;

    const confirmado = window.confirm('Confirmar recusa desta solicitacao de compra?');
    if (!confirmado) return;

    try {
      await recusarSolicitacaoCompra(id, { motivo });
      await carregarTudo();
      alert('Solicitacao de compra recusada.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao recusar solicitacao de compra');
    }
  }

  async function handleRegistrarComentarioCotacao() {
    const comentario = comentarioCotacao.trim();
    if (!comentario) {
      alert('Digite o comentario da cotacao.');
      return;
    }

    try {
      setRegistrandoComentario(true);
      await comentarSolicitacaoCompra(id, { comentario });
      setComentarioCotacao('');
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao registrar comentario da cotacao');
    } finally {
      setRegistrandoComentario(false);
    }
  }

  if (loading) {
    return <div className="page solicitacoes-page"><div className="app-empty-card sol-surface-card">Carregando...</div></div>;
  }

  if (!solicitacao) {
    return <div className="page solicitacoes-page"><div className="app-empty-card sol-surface-card">Solicitacao de compra nao encontrada.</div></div>;
  }

  const isAvulsa = solicitacao.origem === 'AVULSA';

  return (
    <div className="page solicitacoes-page page-compra-nova cotacao-gestao-page">
      {/* Header */}
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">
              {isAvulsa ? (solicitacao.titulo || 'Cotacao Avulsa') : 'Gestao da Cotacao'}
            </h1>
            <p className="page-subtitle">
              SC-{String(solicitacao.id).padStart(5, '0')}
              {isAvulsa ? ' - Cotacao Avulsa' : ' - fornecedores, links, respostas e comparativo'}
              {solicitacao.obra?.nome ? ` - ${solicitacao.obra.nome}` : ''}
            </p>
          </div>
          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate(`/solicitacoes-compra/${id}`)}>
              Voltar ao detalhe
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/cotacoes')}>
              Lista de cotacoes
            </button>
            {podeComprar && !['ENCERRADO', 'RECUSADO'].includes(String(solicitacao.status || '').toUpperCase()) && (
              <button type="button" className="btn btn-outline text-red-700 hover:border-red-200 hover:bg-red-50" onClick={handleRecusarSolicitacao}>
                Recusar
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={handleAbrirPdf} disabled={baixando}>
              {baixando ? 'Abrindo...' : 'Abrir PDF'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className={clsStatus(solicitacao.status)}>{fmtStatus(solicitacao.status)}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            {solicitacao.fornecedores?.length || 0} fornecedor(es)
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            {itensCombinados.length} item(ns)
          </span>
          {solicitacao.necessario_para && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              Necessario para {fmt(solicitacao.necessario_para)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-3">
          {podeComprar && (
            <div className="card sol-surface-card">
              <div className="card-header">
                <h2 className="font-semibold">Comentario da cotacao</h2>
                <p className="mt-1 text-sm text-[var(--c-muted)]">
                  Registre alinhamentos com compras; o texto tambem alimenta o historico da solicitacao da obra.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <textarea
                  className="input min-h-[92px]"
                  value={comentarioCotacao}
                  onChange={(event) => setComentarioCotacao(event.target.value)}
                  placeholder="Ex.: fornecedor pediu prazo adicional, compra dividida por quantidade, ajuste combinado..."
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRegistrarComentarioCotacao}
                  disabled={registrandoComentario || !comentarioCotacao.trim()}
                >
                  {registrandoComentario ? 'Registrando...' : 'Registrar comentario'}
                </button>
              </div>
            </div>
          )}

          {/* Fornecedores vinculados + envio */}
          <div className="card sol-surface-card">
            <div className="card-header flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Fornecedores e links de cotacao</h2>
                <p className="mt-1 text-sm text-[var(--c-muted)]">Pesquise fornecedores cadastrados, faca cadastro rapido e gere os links do portal.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {solicitacao.fornecedores?.length || 0} vinculado(s)
              </span>
            </div>

            {/* Componente de envio para fornecedores */}
            <SecaoEnvioFornecedores
              solicitacao={solicitacao}
              podeComprar={podeComprar}
              categoriasFornecedor={categoriasFornecedor}
              fornecedores={fornecedores}
              buscandoFornecedores={buscandoFornecedores}
              fornecedoresSelecionados={fornecedoresSelecionados}
              fornecedoresSelecionadosDados={fornecedoresSelecionadosDados}
              novoFornecedor={novoFornecedor}
              categoriaFornecedorId={categoriaFornecedorId}
              fornecedorBusca={fornecedorBusca}
              enviandoFornecedores={enviandoFornecedores}
              itensSelecionadosEnvio={itensSelecionadosEnvio}
              onChangeFornecedorBusca={setFornecedorBusca}
              onChangeCategoriaFornecedorId={setCategoriaFornecedorId}
              onBuscarFornecedores={carregarFornecedores}
              onToggleFornecedor={(selectionKey, checked, fornecedor) => {
                setFornecedoresSelecionados((prev) => {
                  if (checked) {
                    return prev.includes(selectionKey) ? prev : [...prev, selectionKey];
                  }
                  return prev.filter((item) => item !== selectionKey);
                });
                setFornecedoresSelecionadosDados((prev) => {
                  const next = { ...prev };
                  if (checked && fornecedor) {
                    next[selectionKey] = fornecedor;
                  }
                  if (!checked) {
                    delete next[selectionKey];
                  }
                  return next;
                });
                if (checked) {
                  garantirItensEnvioSelecionados();
                }
              }}
              onToggleItemEnvio={(itemKey, checked) => {
                setItensSelecionadosEnvio((prev) => ({ ...prev, [itemKey]: checked }));
              }}
              onSelecionarTodosItensEnvio={selecionarTodosItensEnvio}
              onLimparItensEnvio={limparItensEnvio}
              onChangeNovoFornecedor={(field, value) => setNovoFornecedor((prev) => ({ ...prev, [field]: value }))}
              onCriarFornecedorRapido={handleCriarFornecedorRapido}
              onEnviarFornecedores={handleEnviarFornecedores}
              itensCombinados={itensCombinados}
            />

            {Array.isArray(solicitacao.logs) && solicitacao.logs.some((log) => log.tipo_acao === 'RESPOSTA_INTERNA_COMPRAS') && (
              <div className="mt-4 rounded-2xl border border-[var(--c-border)] bg-slate-50/70 p-4 dark:bg-slate-950/55">
                <div className="mb-3">
                  <h2 className="font-semibold">Auditoria de respostas internas</h2>
                </div>
                <div className="app-list-stack">
                  {solicitacao.logs
                    .filter((log) => log.tipo_acao === 'RESPOSTA_INTERNA_COMPRAS')
                    .map((log) => (
                      <div key={log.id} className="rounded-lg border border-[var(--c-border)] px-3 py-2 text-sm">
                        <div className="font-semibold text-[var(--c-text)]">
                          {log.usuario?.nome || 'Usuario interno'} respondeu pelo fornecedor {log.fornecedor?.nome || '-'}
                        </div>
                        <div className="text-xs text-[var(--c-muted)]">
                          {fmt(log.createdAt)} - {log.descricao}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Lista de fornecedores vinculados */}
            {solicitacao.fornecedores?.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-[var(--c-text)]">Cotações enviadas</h3>
                <div className="app-table-shell overflow-x-auto">
                  <ResizableTable
                    className="table text-[11px]"
                    columns={FORNECEDOR_LINK_COLUMNS}
                    storageKey="fluxy.compras.cotacao.fornecedoresLinks.columns"
                  >
                    <thead>
                      <tr>
                        <ResizableTh columnKey="nome">Nome</ResizableTh>
                        <ResizableTh columnKey="telefone">Telefone</ResizableTh>
                        <ResizableTh columnKey="email">E-mail</ResizableTh>
                        <ResizableTh columnKey="status">Status</ResizableTh>
                        <ResizableTh columnKey="respondido">Respondido em</ResizableTh>
                        <ResizableTh columnKey="acoes">Acoes</ResizableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {solicitacao.fornecedores.map((cotacaoFornecedor) => {
                        const publicUrl = `${window.location.origin}/cotacao/${cotacaoFornecedor.token}`;
                        const pdfUrl = obterUrlPdfCotacaoPublica(cotacaoFornecedor.token);
                        const pedidoFornecedor = pedidosPorFornecedor.get(Number(cotacaoFornecedor.fornecedor_compra_id));
                        const possuiRespostaArquivo = Boolean(cotacaoFornecedor.pdf_resposta_url);
                        const linkWa = cotacaoFornecedor.fornecedor?.whatsapp
                          ? whatsappLink(
                              cotacaoFornecedor.fornecedor.whatsapp,
                              gerarMensagemCotacao(cotacaoFornecedor.fornecedor.nome, publicUrl, itensCombinados, pdfUrl)
                            )
                          : null;

                        return (
                          <tr key={cotacaoFornecedor.id} className="h-11">
                          <td className="whitespace-nowrap align-middle">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-semibold text-[var(--c-text)]">
                                {cotacaoFornecedor.fornecedor?.nome || '-'}
                              </span>
                              {possuiRespostaArquivo && (
                                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  Arquivo
                                </span>
                              )}
                            </div>
                            {pedidoFornecedor?.id && (
                              <button
                                type="button"
                                className="block max-w-full truncate text-left text-[10px] font-semibold text-emerald-700 underline"
                                onClick={() => navigate(`/pedidos-compra/${pedidoFornecedor.id}`)}
                                title={`PC-${String(pedidoFornecedor.id).padStart(5, '0')} - ${fmtMoeda(pedidoFornecedor.valor_total)}`}
                              >
                                PC-{String(pedidoFornecedor.id).padStart(5, '0')} - {fmtMoeda(pedidoFornecedor.valor_total)}
                              </button>
                            )}
                          </td>
                          <td className="whitespace-nowrap align-middle text-[11px]">
                            <span className="block truncate" title={cotacaoFornecedor.fornecedor?.whatsapp || '-'}>
                              {cotacaoFornecedor.fornecedor?.whatsapp || '-'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap align-middle text-[11px]">
                            <span className="block truncate" title={cotacaoFornecedor.fornecedor?.email || '-'}>
                              {cotacaoFornecedor.fornecedor?.email || '-'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap align-middle">
                            <span className="app-status-pill bg-slate-100 px-2 py-1 text-[10px] text-slate-700">
                              {fmtStatus(cotacaoFornecedor.status)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap align-middle text-[11px]">{fmt(cotacaoFornecedor.respondido_em)}</td>
                          <td className="whitespace-nowrap align-middle">
                            <div className="flex flex-nowrap items-center gap-1">
                              <CotacaoActionButton
                                type="button"
                                onClick={() => copiarTexto(publicUrl)}
                                title="Copiar link"
                                aria-label="Copiar link"
                              >
                                <HiOutlineClipboardDocument className="h-3.5 w-3.5" />
                              </CotacaoActionButton>
                              <CotacaoActionButton
                                type="button"
                                onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}
                                title="Abrir portal"
                                aria-label="Abrir portal"
                              >
                                <HiOutlineArrowTopRightOnSquare className="h-3.5 w-3.5" />
                              </CotacaoActionButton>
                              <CotacaoActionButton
                                as="a"
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                title="Baixar PDF"
                                aria-label="Baixar PDF"
                              >
                                <HiOutlineArrowDownTray className="h-3.5 w-3.5" />
                              </CotacaoActionButton>
                              {linkWa ? (
                                <CotacaoActionButton
                                  as="a"
                                  href={linkWa}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Enviar WhatsApp"
                                  aria-label="Enviar WhatsApp"
                                >
                                  <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
                                </CotacaoActionButton>
                              ) : (
                                <CotacaoActionButton type="button" disabled title="WhatsApp indisponivel" aria-label="WhatsApp indisponivel">
                                  <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
                                </CotacaoActionButton>
                              )}
                            </div>
                          </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </ResizableTable>
                </div>
              </div>
            )}
          </div>

          {/* Comparativo */}
          <SecaoComparativo
            comparativo={comparativo}
            solicitacao={solicitacao}
            podeComprar={podeComprar}
            vencedoresSelecionados={vencedoresSelecionados}
            onVencedorChange={handleVencedorChange}
            onRemanejamentoAplicado={handleAplicarRemanejamentoCotacao}
            onEncerrar={handleEncerrar}
            encerrando={encerrando}
          />
        </div>
      </div>

      <CompraPreviewModal preview={previewArquivo} onClose={() => setPreviewArquivo(null)} />
    </div>
  );
}
