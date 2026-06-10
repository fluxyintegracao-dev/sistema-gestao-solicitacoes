import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  criarPedidoCompraDaSolicitacao,
  baixarPdfSolicitacaoCompra,
  criarFornecedorCompra,
  encerrarSolicitacaoCompra,
  enviarSolicitacaoCompraParaFornecedores,
  listarFornecedoresCompra,
  obterComparativoSolicitacaoCompra,
  obterSolicitacaoCompra,
  obterUrlAssinadaCompra,
  responderCotacaoPublica
} from '../../../services/compras';
import { listarCategoriasParceiro } from '../../../services/parceiros';
import { useAuth } from '../../../contexts/AuthContext';
import CompraPreviewModal from '../components/CompraPreviewModal';
import { criarPreviewCompra } from '../utils/preview';
import { montarLinhasResumoApropriacao } from '../utils/apropriacoes';

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

function clsStatus(status) {
  const v = String(status || '').toUpperCase();
  if (v === 'ENCERRADO') return 'app-status-pill bg-slate-100 text-slate-700';
  if (v === 'LIBERADO_PARA_COMPRA') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (v === 'INTEGRADO_SIENGE') return 'app-status-pill bg-amber-100 text-amber-700';
  return 'app-status-pill bg-blue-100 text-blue-700';
}

function buildItemKey(item) {
  return `${String(item?.item_tipo || '').toUpperCase()}:${Number(item?.item_referencia_id || 0)}`;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

function gerarMensagemCotacao(fornecedorNome, url, itens = []) {
  const header = `Ola${fornecedorNome ? `, ${fornecedorNome}` : ''}!\n\nTemos uma cotacao disponivel para voce responder.\n\nLink da cotacao:\n${url}`;
  if (!itens.length) return header;
  const lista = itens
    .slice(0, 10)
    .map((it) => `- ${it.nome || it.nome_manual || '-'}: ${it.quantidade} ${it.unidade || it.unidade_sigla_manual || ''}`.trim())
    .join('\n');
  const extra = itens.length > 10 ? `\n... e mais ${itens.length - 10} item(ns)` : '';
  return `${header}\n\nItens:\n${lista}${extra}\n\nAguardamos sua resposta. Obrigado!`;
}

// Modal de Pedido Final

function ModalRevisarRespostaArquivo({ fornecedor, itens, onSalvar, onFechar }) {
  const [linhas, setLinhas] = useState(() => itens.map((item) => ({
    ...item,
    preco: '',
    prazo: '',
    disponivel: true,
    observacao: '',
    quantidade_minima_item: ''
  })));
  const [valorMinimoPedido, setValorMinimoPedido] = useState(fornecedor?.valor_minimo_pedido ?? '');
  const [condicaoPagamento, setCondicaoPagamento] = useState(fornecedor?.condicao_pagamento || '');
  const [prazoEntrega, setPrazoEntrega] = useState(fornecedor?.prazo_entrega || '');
  const [salvando, setSalvando] = useState(false);

  function atualizarLinha(index, field, value) {
    setLinhas((prev) => prev.map((linha, linhaIndex) => (
      linhaIndex === index ? { ...linha, [field]: value } : linha
    )));
  }

  async function handleSalvar() {
    try {
      if (valorMinimoPedido === '' || valorMinimoPedido === null || valorMinimoPedido === undefined) {
        alert('Informe o VLR minimo pedido.');
        return;
      }
      if (!String(condicaoPagamento || '').trim()) {
        alert('Informe a condicao de pagamento.');
        return;
      }
      if (!String(prazoEntrega || '').trim()) {
        alert('Informe o prazo de entrega.');
        return;
      }

      setSalvando(true);
      await onSalvar({
        valor_minimo_pedido: valorMinimoPedido,
        condicao_pagamento: condicaoPagamento,
        prazo_entrega: prazoEntrega,
        itens: linhas.map((linha) => ({
          item_tipo: linha.item_tipo,
          item_referencia_id: linha.item_referencia_id,
          status_disponibilidade: linha.disponivel ? 'DISPONIVEL' : 'NAO_TEM',
          disponivel: linha.disponivel,
          preco: linha.disponivel ? linha.preco : '',
          prazo: linha.disponivel ? linha.prazo : '',
          observacao: linha.observacao,
          quantidade_minima_item: linha.quantidade_minima_item
        }))
      });
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao registrar resposta do fornecedor');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-3 py-6">
      <div className="w-full max-w-5xl rounded-2xl bg-[var(--c-surface)] shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-5 py-4">
          <div>
            <h2 className="font-semibold text-[var(--c-text)]">Revisar resposta anexada</h2>
            <p className="text-sm text-[var(--c-muted)]">{fornecedor?.fornecedor?.nome || 'Fornecedor'}</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={onFechar}>Fechar</button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 text-sm text-[var(--c-muted)]">
            Transcreva os valores do arquivo anexado para que a resposta entre no comparativo da cotacao.
          </p>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-[var(--c-muted)]">VLR minimo pedido *</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={valorMinimoPedido}
                onChange={(event) => setValorMinimoPedido(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-[var(--c-muted)]">Condicao de pagamento *</span>
              <input
                className="input"
                value={condicaoPagamento}
                onChange={(event) => setCondicaoPagamento(event.target.value)}
                placeholder="Ex.: PIX, 30/60 dias"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-[var(--c-muted)]">Prazo de entrega *</span>
              <input
                className="input"
                value={prazoEntrega}
                onChange={(event) => setPrazoEntrega(event.target.value)}
                placeholder="Ex.: 7 dias"
              />
            </label>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--c-border)]">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Qtd.</th>
                  <th className="px-3 py-2">Disponivel</th>
                  <th className="px-3 py-2">Preco unit.</th>
                  <th className="px-3 py-2">Prazo</th>
                  <th className="px-3 py-2">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, index) => (
                  <tr key={`${linha.item_tipo}-${linha.item_referencia_id}`} className="border-t border-[var(--c-border)]">
                    <td className="px-3 py-2">
                      <div className="font-medium text-[var(--c-text)]">{linha.nome}</div>
                      <div className="text-xs text-[var(--c-muted)]">{linha.especificacao}</div>
                    </td>
                    <td className="px-3 py-2 text-[var(--c-muted)]">{linha.quantidade} {linha.unidade}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={linha.disponivel}
                        onChange={(event) => atualizarLinha(index, 'disponivel', event.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="input h-9 w-full"
                        value={linha.preco}
                        disabled={!linha.disponivel}
                        onChange={(event) => atualizarLinha(index, 'preco', event.target.value)}
                        placeholder="0,00"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="input h-9 w-full"
                        value={linha.prazo}
                        disabled={!linha.disponivel}
                        onChange={(event) => atualizarLinha(index, 'prazo', event.target.value)}
                        placeholder="Ex.: 7 dias"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="input h-9 w-full"
                        value={linha.observacao}
                        onChange={(event) => atualizarLinha(index, 'observacao', event.target.value)}
                        placeholder="Opcional"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--c-border)] px-5 py-4">
          <button type="button" className="btn btn-outline" onClick={onFechar}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar no comparativo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalPedidoFinal({ fornecedor, itensGanhos, solicitacaoId, onRemanejamento, onFechar }) {
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [destinoFornecedorId, setDestinoFornecedorId] = useState('');
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState([]);
  const [modoRemanejar, setModoRemanejar] = useState(false);

  const totalGanho = useMemo(() => {
    return itensGanhos.reduce((acc, it) => {
      const preco = Number(it.preco || 0);
      const qtd = Number(it.quantidade || 0);
      return acc + preco * qtd;
    }, 0);
  }, [itensGanhos]);

  useEffect(() => {
    if (modoRemanejar) {
      listarFornecedoresCompra({}).then((data) => {
        setFornecedoresDisponiveis(Array.isArray(data) ? data : []);
      }).catch(() => {});
    }
  }, [modoRemanejar]);

  function toggleItem(respItemId) {
    setItensSelecionados((prev) =>
      prev.includes(respItemId) ? prev.filter((id) => id !== respItemId) : [...prev, respItemId]
    );
  }

  const mensagemWhatsApp = useMemo(() => {
    const linhas = itensGanhos.map((it) =>
      `${it.nome || '-'}: ${it.quantidade} ${it.unidade || ''} x ${fmtMoeda(it.preco)} = ${fmtMoeda(Number(it.quantidade) * Number(it.preco || 0))}`
    ).join('\n');
    return `Ola ${fornecedor.nome}!\n\nSegue o pedido referente a cotacao ${solicitacaoId ? `SC-${String(solicitacaoId).padStart(5, '0')}` : ''}:\n\n${linhas}\n\nTOTAL: ${fmtMoeda(totalGanho)}\n\nAguardamos a confirmacao. Obrigado!`;
  }, [fornecedor, itensGanhos, totalGanho, solicitacaoId]);

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
                            onChange={() => toggleItem(it.resposta_item_id)}
                          />
                        </td>
                      )}
                      <td>
                        <div className="font-medium">{it.nome || '-'}</div>
                        {it.especificacao && <div className="text-xs text-[var(--c-muted)]">{it.especificacao}</div>}
                      </td>
                      <td>{it.quantidade} {it.unidade || ''}</td>
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
              >
                <option value="">Selecionar fornecedor destino...</option>
                {fornecedoresDisponiveis
                  .filter((f) => f.id !== fornecedor.fornecedor_compra_id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))
                }
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setModoRemanejar(false); setItensSelecionados([]); }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!itensSelecionados.length || !destinoFornecedorId}
                  onClick={() => onRemanejamento({ itensIds: itensSelecionados, destinoFornecedorId: Number(destinoFornecedorId) })}
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
  novoFornecedor,
  categoriaFornecedorId,
  fornecedorBusca,
  enviandoFornecedores,
  onChangeFornecedorBusca,
  onChangeCategoriaFornecedorId,
  onBuscarFornecedores,
  onToggleFornecedor,
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

  function selecionarTodosComCategoria() {
    const ids = fornecedoresComCategoria.map((f) => String(f.id));
    const novos = ids.filter((id) => !fornecedoresSelecionados.includes(id));
    novos.forEach((id) => onToggleFornecedor(id, true));
    setSelecionandoPorCategoria(false);
    setCategoriaSelecionada('');
  }

  // Monta links de WhatsApp para todos selecionados com numero
  const linksWhatsApp = useMemo(() => {
    const links = [];
    const publicBase = window.location.origin;

    // Fornecedores selecionados
    fornecedoresSelecionados.forEach((id) => {
      const f = fornecedores.find((x) => String(x.id) === id);
      if (!f?.whatsapp) return;

      // Encontra o token da cotacao para este fornecedor, quando ja gerado.
      const vinculo = (solicitacao?.fornecedores || []).find(
        (v) => String(v.fornecedor_compra_id) === String(f.id)
      );
      if (!vinculo?.token) return;

      const url = `${publicBase}/cotacao/${vinculo.token}`;
      const msg = gerarMensagemCotacao(f.nome, url, itensCombinados);
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
        const msg = gerarMensagemCotacao(v.fornecedor.nome, url, itensCombinados);
        return { nome: v.fornecedor.nome, link: whatsappLink(v.fornecedor.whatsapp, msg) };
      });
  }, [solicitacao, itensCombinados]);

  if (!podeComprar) return null;

  return (
    <div className="grid gap-4">
      {/* Envio para fornecedores vinculados via WhatsApp */}
      {linksVinculados.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="mb-2">
            <h3 className="font-semibold text-emerald-800">Enviar cotacoes via WhatsApp</h3>
          </div>
          <p className="text-sm text-emerald-700 mb-3">
            {linksVinculados.length} fornecedor(es) com WhatsApp cadastrado. Clique em cada um para abrir a conversa com a mensagem pronta.
          </p>
          <div className="flex flex-wrap gap-2">
            {linksVinculados.map(({ nome, link }) => (
              <a
                key={nome}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-sm"
              >
                WhatsApp: {nome}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Adicionar novos fornecedores */}
      {solicitacao.status !== 'ENCERRADO' && (
        <div className="rounded-2xl border border-[var(--c-border)] bg-slate-50/70 p-4">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid gap-3">
              {/* Selecao por categoria */}
              <div className="flex flex-wrap items-center justify-between gap-3">
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
                <div className="grid gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs text-blue-700">
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
                    <p className="text-xs text-blue-600">Nenhum fornecedor cadastrado com esta categoria.</p>
                  )}
                </div>
              )}

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">Fornecedores</span>
                  {fornecedoresSelecionados.length > 0 && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {fornecedoresSelecionados.length} selecionado(s)
                    </span>
                  )}
                </div>
                <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_200px_auto]">
                  <div className="relative">
                    <input
                      className="input"
                      placeholder="Digite nome, CNPJ, email ou contato"
                      value={fornecedorBusca}
                      onChange={(e) => onChangeFornecedorBusca(e.target.value)}
                    />
                    {deveMostrarAutocomplete && (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-xl border border-[var(--c-border)] bg-white shadow-lg">
                        {buscandoFornecedores ? (
                          <div className="px-3 py-3 text-sm text-[var(--c-muted)]">Buscando fornecedores...</div>
                        ) : fornecedoresAutocomplete.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-[var(--c-muted)]">
                            Nenhum fornecedor encontrado para essa busca.
                          </div>
                        ) : (
                          fornecedoresAutocomplete.map((f) => {
                            const checked = fornecedoresSelecionados.includes(String(f.id));
                            return (
                              <button
                                key={f.id}
                                type="button"
                                className={`flex w-full items-start gap-3 border-b border-[var(--c-border)] px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 ${checked ? 'bg-blue-50' : ''}`}
                                onClick={() => onToggleFornecedor(String(f.id), !checked)}
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
                  <div className="rounded-xl border border-dashed border-[var(--c-border)] bg-white/70 px-3 py-4 text-sm text-[var(--c-muted)]">
                    Digite no campo de busca para localizar fornecedores ou escolha uma categoria para listar os cadastrados.
                  </div>
                )}
                {deveMostrarListaCategoria && (
                  <div className="app-list-stack max-h-[260px] overflow-y-auto rounded-xl border border-[var(--c-border)] bg-white/80 p-3">
                    {buscandoFornecedores ? (
                      <div className="text-sm text-[var(--c-muted)]">Buscando...</div>
                    ) : fornecedoresListaCategoria.length === 0 ? (
                      <div className="text-sm text-[var(--c-muted)]">Nenhum fornecedor encontrado para a categoria selecionada.</div>
                    ) : (
                      fornecedoresListaCategoria.map((f) => (
                        <label key={f.id} className="app-list-card flex items-start gap-2 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={fornecedoresSelecionados.includes(String(f.id))}
                            onChange={(e) => onToggleFornecedor(String(f.id), e.target.checked)}
                          />
                          <div>
                            <div className="font-medium">{f.nome}</div>
                            {f.whatsapp && (
                              <div className="text-xs text-[var(--c-muted)]">WhatsApp: {f.whatsapp}</div>
                            )}
                            {Array.isArray(f.categoria_insumos) && f.categoria_insumos.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {f.categoria_insumos.map((c) => (
                                  <span key={c} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">{c}</span>
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

            <div className="grid content-start gap-3 rounded-xl border border-[var(--c-border)] bg-white/85 p-4">
              <div>
                <div className="text-sm font-semibold text-[var(--c-text)]">Cadastro rapido</div>
                <div className="text-xs text-[var(--c-muted)]">Inclua um fornecedor novo sem sair da cotacao.</div>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-[var(--c-muted)]">Nome do fornecedor</span>
                <input className="input" placeholder="Ex.: Fornecedor ABC" value={novoFornecedor.nome} onChange={(e) => onChangeNovoFornecedor('nome', e.target.value)} />
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
              <div className="grid gap-2">
                <button type="button" className="btn btn-outline w-full" onClick={onCriarFornecedorRapido}>Cadastrar e selecionar</button>
                <button type="button" className="btn btn-primary w-full" onClick={onEnviarFornecedores} disabled={enviandoFornecedores}>
                  {enviandoFornecedores ? 'Gerando links...' : 'Gerar links de cotacao'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// SecaoComparativo

function SecaoComparativo({ comparativo, solicitacao, podeComprar, vencedoresSelecionados, onVencedorChange, onEncerrar, encerrando }) {
  const [modalFornecedor, setModalFornecedor] = useState(null); // { fornecedor, itensGanhos }

  // Agrega totais por fornecedor para o ranking top 3
  const rankingFornecedores = useMemo(() => {
    if (!comparativo?.itens?.length) return [];

    const totaisFornecedor = {};
    const itensFornecedor = {};

    comparativo.itens.forEach((item) => {
      const keyItem = buildItemKey(item);
      const vencedorId = vencedoresSelecionados[keyItem];

      item.respostas.forEach((resp) => {
        if (!resp.fornecedor_id || !resp.disponivel || !resp.preco) return;
        const fId = resp.fornecedor_id;
        const totalItem = Number(resp.preco || 0) * Number(item.quantidade || 0);

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
          resposta_item_id: resp.resposta_item_id,
          nome: item.nome,
          unidade: item.unidade,
          quantidade: item.quantidade,
          preco: resp.preco,
          prazo: resp.prazo,
          especificacao: item.especificacao,
          ganhou: String(vencedorId) === String(resp.resposta_item_id)
        });

        if (String(vencedorId) === String(resp.resposta_item_id)) {
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
      <div className="card sol-surface-card">
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
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Comparativo por item</h2>
            <p className="mt-1 text-sm text-[var(--c-muted)]">Compare respostas, selecione vencedores e encerre a cotacao quando estiver pronta.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {comparativo.itens.length} item(ns)
          </span>
        </div>

        {rankingFornecedores.length > 0 && (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            {rankingFornecedores.map((forn, idx) => (
              <div
                key={forn.fornecedor_id}
                className={`grid gap-2 rounded-xl border p-4 ${idx === 0 ? 'border-emerald-300 bg-emerald-50' : 'border-[var(--c-border)] bg-slate-50/80'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-2xl font-bold ${idx === 0 ? 'text-emerald-600' : 'text-[var(--c-muted)]'}`}>
                    {idx + 1}
                  </span>
                  <span className={`app-status-pill text-xs ${idx === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {idx === 0 ? 'Menor preco' : `${idx + 1}o lugar`}
                  </span>
                </div>
                <div className="font-semibold text-sm">{forn.fornecedor_nome}</div>
                <div className="text-xl font-bold text-[var(--c-text)]">{fmtMoeda(forn.total)}</div>
                <div className="text-xs text-[var(--c-muted)]">
                  {forn.itensRespondidos} item(ns) respondido(s) - {forn.vencedor_itens} ganhador(es)
                </div>
                {forn.itensGanhos.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline text-xs mt-1"
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

        <div className="app-list-stack">
          {comparativo.itens.map((item) => (
            <div key={buildItemKey(item)} className="app-list-card">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-semibold">{item.nome}</div>
                  <div className="text-sm text-[var(--c-muted)]">
                    {item.quantidade} {item.unidade} - {item.item_tipo === 'MANUAL' ? 'Manual' : 'Cadastrado'}
                    {item.especificacao ? ` - ${item.especificacao}` : ''}
                  </div>
                </div>
                {item.melhor_preco && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                    Menor: <strong>{item.melhor_preco.fornecedor_nome}</strong> - {fmtMoeda(item.melhor_preco.preco)}/un
                  </div>
                )}
              </div>

              <div className="app-table-shell overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fornecedor</th>
                      <th>Disponivel</th>
                      <th>Preco unit.</th>
                      <th>Total item</th>
                      <th>Prazo</th>
                      <th>Qtd. min.</th>
                      <th>Observacao</th>
                      <th>Vencedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.respostas.map((resp) => {
                      const isVencedor = String(vencedoresSelecionados[buildItemKey(item)] || '') === String(resp.resposta_item_id);
                      return (
                        <tr
                          key={`${item.id}-${resp.fornecedor_id}`}
                          className={`${isVencedor ? 'bg-emerald-50' : ''} ${resp.resposta_item_id && podeComprar && solicitacao.status !== 'ENCERRADO' ? 'cursor-pointer hover:bg-emerald-50/60' : ''}`}
                          onClick={() => resp.resposta_item_id && podeComprar && solicitacao.status !== 'ENCERRADO' && onVencedorChange(buildItemKey(item), String(resp.resposta_item_id))}
                        >
                          <td className="font-medium">{resp.fornecedor_nome}</td>
                          <td>
                            <span className={`app-status-pill text-xs ${resp.disponivel ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {resp.disponivel ? 'Sim' : 'Nao'}
                            </span>
                          </td>
                          <td>{resp.preco ? fmtMoeda(resp.preco) : '-'}</td>
                          <td className="font-medium">
                            {resp.preco ? fmtMoeda(Number(resp.preco) * Number(item.quantidade || 0)) : '-'}
                          </td>
                          <td>{resp.prazo || '-'}</td>
                          <td>{resp.quantidade_minima_item || '-'}</td>
                          <td className="max-w-[160px] text-xs">{resp.observacao || '-'}</td>
                          <td>
                            {resp.resposta_item_id ? (
                              <input
                                type="radio"
                                name={`vencedor-${buildItemKey(item)}`}
                                checked={isVencedor}
                                onChange={() => onVencedorChange(buildItemKey(item), String(resp.resposta_item_id))}
                              />
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

          {podeComprar && solicitacao.status !== 'ENCERRADO' && (
            <div className="app-page-actions justify-end">
              <button type="button" className="btn btn-primary" onClick={onEncerrar} disabled={encerrando}>
                {encerrando ? 'Encerrando...' : 'Encerrar Cotacao e Definir Vencedores'}
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
          onRemanejamento={({ itensIds, destinoFornecedorId }) => {
            alert(`Remanejamento registrado: ${itensIds.length} item(ns) para fornecedor ID ${destinoFornecedorId}.\n\nPara concluir, ajuste manualmente os vencedores no comparativo abaixo e encerre a cotacao novamente.`);
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
  const [criandoPedidoFornecedorId, setCriandoPedidoFornecedorId] = useState(null);
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState([]);
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: '', email: '', whatsapp: '', contato: '' });
  const [vencedoresSelecionados, setVencedoresSelecionados] = useState({});
  const [cotacaoRevisaoArquivo, setCotacaoRevisaoArquivo] = useState(null);

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
      if (categoriaFornecedorId) {
        const categoria = categoriasFornecedor.find((item) => String(item.id) === String(categoriaFornecedorId));
        if (categoria?.nome) params.categoria = categoria.nome;
      }
      if (fornecedorBusca.trim()) params.q = fornecedorBusca.trim();
      const data = await listarFornecedoresCompra(params);
      setFornecedores(Array.isArray(data) ? data : []);
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
          const respostaVencedora = (item.respostas || []).find((r) => r.vencedor);
          if (respostaVencedora?.resposta_item_id) {
            vencedoresAtuais[buildItemKey(item)] = String(respostaVencedora.resposta_item_id);
          }
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
      fornecedoresSelecionados.forEach((fornecedorId) => payload.push({ fornecedor_id: Number(fornecedorId) }));
      if (String(novoFornecedor.nome || '').trim()) {
        payload.push({ nome: novoFornecedor.nome, email: novoFornecedor.email, whatsapp: novoFornecedor.whatsapp, contato: novoFornecedor.contato });
      }
      if (!payload.length) { alert('Selecione ou cadastre ao menos um fornecedor.'); return; }

      setEnviandoFornecedores(true);
      await enviarSolicitacaoCompraParaFornecedores(id, { fornecedores: payload });
      setFornecedoresSelecionados([]);
      setNovoFornecedor({ nome: '', email: '', whatsapp: '', contato: '' });
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
      const fornecedor = await criarFornecedorCompra(novoFornecedor);
      setFornecedores((atual) => [...atual, fornecedor].sort((a, b) => String(a.nome).localeCompare(String(b.nome))));
      setFornecedoresSelecionados((atual) => [...atual, String(fornecedor.id)]);
      setNovoFornecedor({ nome: '', email: '', whatsapp: '', contato: '' });
      alert('Fornecedor criado e selecionado.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao criar fornecedor');
    }
  }

  async function handleEncerrar() {
    try {
      const itens = comparativo?.itens || [];
      const vencedores = itens
        .map((item) => vencedoresSelecionados[buildItemKey(item)])
        .filter(Boolean)
        .map((respostaItemId) => ({ resposta_item_id: Number(respostaItemId) }));
      if (!vencedores.length) { alert('Selecione ao menos um vencedor para encerrar.'); return; }

      setEncerrando(true);
      await encerrarSolicitacaoCompra(id, { vencedores });
      await carregarTudo();
      alert('Cotacao encerrada. Agora voce pode gerar os pedidos para cada fornecedor vencedor.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao encerrar cotacao');
    } finally {
      setEncerrando(false);
    }
  }

  async function handleSalvarRevisaoArquivo(payload) {
    if (!cotacaoRevisaoArquivo?.token) {
      throw new Error('Cotacao do fornecedor nao localizada.');
    }

    await responderCotacaoPublica(cotacaoRevisaoArquivo.token, payload);
    setCotacaoRevisaoArquivo(null);
    await carregarTudo();
    alert('Resposta registrada no comparativo.');
  }

  async function handleCriarPedidoFornecedor(fornecedorCompraId) {
    const pedidoExistente = pedidosPorFornecedor.get(Number(fornecedorCompraId));
    if (pedidoExistente?.id) { navigate(`/pedidos-compra/${pedidoExistente.id}`); return; }

    try {
      setCriandoPedidoFornecedorId(fornecedorCompraId);
      const pedido = await criarPedidoCompraDaSolicitacao(id, { fornecedor_compra_id: fornecedorCompraId });
      await carregarTudo();
      if (pedido?.id) navigate(`/pedidos-compra/${pedido.id}`);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao criar pedido para o fornecedor');
    } finally {
      setCriandoPedidoFornecedorId(null);
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
    <div className="page solicitacoes-page page-compra-nova">
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
          {/* Fornecedores vinculados + envio */}
          <div className="card sol-surface-card">
            <div className="card-header flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Fornecedores e links de cotacao</h2>
                <p className="mt-1 text-sm text-[var(--c-muted)]">Pesquise fornecedores cadastrados, faca cadastro rapido e gere os links do portal.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
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
              novoFornecedor={novoFornecedor}
              categoriaFornecedorId={categoriaFornecedorId}
              fornecedorBusca={fornecedorBusca}
              enviandoFornecedores={enviandoFornecedores}
              onChangeFornecedorBusca={setFornecedorBusca}
              onChangeCategoriaFornecedorId={setCategoriaFornecedorId}
              onBuscarFornecedores={carregarFornecedores}
              onToggleFornecedor={(id, checked) =>
                setFornecedoresSelecionados((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id))
              }
              onChangeNovoFornecedor={(field, value) => setNovoFornecedor((prev) => ({ ...prev, [field]: value }))}
              onCriarFornecedorRapido={handleCriarFornecedorRapido}
              onEnviarFornecedores={handleEnviarFornecedores}
              itensCombinados={itensCombinados}
            />

            {Array.isArray(solicitacao.logs) && solicitacao.logs.some((log) => log.tipo_acao === 'RESPOSTA_INTERNA_COMPRAS') && (
              <div className="mt-4 rounded-2xl border border-[var(--c-border)] bg-slate-50/70 p-4">
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
              <div className="app-list-stack mt-4">
                {solicitacao.fornecedores.map((cotacaoFornecedor) => {
                  const publicUrl = `${window.location.origin}/cotacao/${cotacaoFornecedor.token}`;
                  const pedidoFornecedor = pedidosPorFornecedor.get(Number(cotacaoFornecedor.fornecedor_compra_id));
                  const possuiRespostaArquivo = Boolean(cotacaoFornecedor.pdf_resposta_url);
                  const linkWa = cotacaoFornecedor.fornecedor?.whatsapp
                    ? whatsappLink(cotacaoFornecedor.fornecedor.whatsapp, gerarMensagemCotacao(cotacaoFornecedor.fornecedor.nome, publicUrl, itensCombinados))
                    : null;

                  return (
                    <div key={cotacaoFornecedor.id} className="app-list-card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <div className="font-semibold">{cotacaoFornecedor.fornecedor?.nome || '-'}</div>
                          <div className="text-sm text-[var(--c-muted)]">
                            {cotacaoFornecedor.fornecedor?.whatsapp ? `WhatsApp: ${cotacaoFornecedor.fornecedor.whatsapp}` : ''}{' '}
                            {cotacaoFornecedor.fornecedor?.email || ''}
                          </div>
                          <div className="text-xs text-[var(--c-muted)]">
                            Status: {fmtStatus(cotacaoFornecedor.status)} - Respondido em {fmt(cotacaoFornecedor.respondido_em)}
                          </div>
                          {cotacaoFornecedor.status === 'RESPONDIDO' && (
                            <div className="text-xs text-[var(--c-muted)]">
                              Pedido minimo: {cotacaoFornecedor.valor_minimo_pedido !== null && cotacaoFornecedor.valor_minimo_pedido !== undefined ? fmtMoeda(cotacaoFornecedor.valor_minimo_pedido) : '-'} - Condicao: {cotacaoFornecedor.condicao_pagamento || '-'} - Prazo entrega: {cotacaoFornecedor.prazo_entrega || '-'}
                            </div>
                          )}
                          {possuiRespostaArquivo && (
                            <div className="text-xs font-semibold text-blue-700">
                              Resposta por arquivo anexado
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn btn-xs btn-outline" onClick={() => copiarTexto(publicUrl)}>Copiar link</button>
                          <button type="button" className="btn btn-xs btn-outline" onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}>Abrir portal</button>
                          {possuiRespostaArquivo && (
                            <button type="button" className="btn btn-xs btn-outline" onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}>
                              Ver anexo
                            </button>
                          )}
                          {podeComprar && possuiRespostaArquivo && solicitacao.status !== 'ENCERRADO' && (
                            <button type="button" className="btn btn-xs btn-outline" onClick={() => setCotacaoRevisaoArquivo(cotacaoFornecedor)}>
                              Revisar resposta
                            </button>
                          )}
                          {linkWa && (
                            <a href={linkWa} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-outline">
                              WhatsApp
                            </a>
                          )}
                          {podeComprar && solicitacao.status === 'ENCERRADO' && cotacaoFornecedor.status === 'RESPONDIDO' && (
                            <button
                              type="button"
                              className="btn btn-xs btn-primary"
                              onClick={() => handleCriarPedidoFornecedor(cotacaoFornecedor.fornecedor_compra_id)}
                              disabled={criandoPedidoFornecedorId === cotacaoFornecedor.fornecedor_compra_id}
                            >
                              {criandoPedidoFornecedorId === cotacaoFornecedor.fornecedor_compra_id
                                ? 'Gerando...'
                                : pedidoFornecedor?.id ? 'Abrir pedido' : 'Gerar pedido'}
                            </button>
                          )}
                        </div>
                      </div>
                      {pedidoFornecedor?.id && (
                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          Pedido vinculado:{' '}
                          <button type="button" className="font-semibold underline" onClick={() => navigate(`/pedidos-compra/${pedidoFornecedor.id}`)}>
                            PC-{String(pedidoFornecedor.id).padStart(5, '0')}
                          </button>
                          {' '} - Total {fmtMoeda(pedidoFornecedor.valor_total)}
                        </div>
                      )}
                      <div className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{publicUrl}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comparativo */}
          <SecaoComparativo
            comparativo={comparativo}
            solicitacao={solicitacao}
            podeComprar={podeComprar}
            vencedoresSelecionados={vencedoresSelecionados}
            onVencedorChange={(key, value) => setVencedoresSelecionados((prev) => ({ ...prev, [key]: value }))}
            onEncerrar={handleEncerrar}
            encerrando={encerrando}
          />
        </div>
      </div>

      <CompraPreviewModal preview={previewArquivo} onClose={() => setPreviewArquivo(null)} />
      {cotacaoRevisaoArquivo && (
        <ModalRevisarRespostaArquivo
          fornecedor={cotacaoRevisaoArquivo}
          itens={itensCombinados}
          onSalvar={handleSalvarRevisaoArquivo}
          onFechar={() => setCotacaoRevisaoArquivo(null)}
        />
      )}
    </div>
  );
}

