import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  criarPedidoCompraDaSolicitacao,
  baixarPdfSolicitacaoCompra,
  criarFornecedorCompra,
  encerrarSolicitacaoCompra,
  enviarSolicitacaoCompraParaFornecedores,
  integrarSolicitacaoCompra,
  liberarSolicitacaoCompra,
  listarFornecedoresCompra,
  obterComparativoSolicitacaoCompra,
  obterSolicitacaoCompra,
  obterUrlAssinadaCompra
} from '../../../services/compras';
import { buscarParceiros, listarCategoriasParceiro } from '../../../services/parceiros';
import { useAuth } from '../../../contexts/AuthContext';
import CompraPreviewModal from '../components/CompraPreviewModal';
import { criarPreviewCompra } from '../utils/preview';
import { montarLinhasResumoApropriacao } from '../utils/apropriacoes';

// ── helpers ────────────────────────────────────────────────────────────────────

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
    .map((it) => `• ${it.nome || it.nome_manual || '-'}: ${it.quantidade} ${it.unidade || it.unidade_sigla_manual || ''}`.trim())
    .join('\n');
  const extra = itens.length > 10 ? `\n... e mais ${itens.length - 10} item(ns)` : '';
  return `${header}\n\nItens:\n${lista}${extra}\n\nAguardamos sua resposta. Obrigado!`;
}

// ── Modal de Pedido Final ──────────────────────────────────────────────────────

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
          <button type="button" onClick={onFechar} className="text-[var(--c-muted)] hover:text-[var(--c-text)]">✕</button>
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

// ── SecaoEnvioFornecedores ─────────────────────────────────────────────────────

function SecaoEnvioFornecedores({
  solicitacao,
  podeComprar,
  categoriasFornecedor,
  fornecedores,
  fornecedoresAvulsos,
  buscandoFornecedores,
  fornecedoresSelecionados,
  fornecedoresAvulsosSelecionados,
  novoFornecedor,
  categoriaFornecedorId,
  fornecedorBusca,
  enviandoFornecedores,
  onChangeFornecedorBusca,
  onChangeCategoriaFornecedorId,
  onBuscarFornecedores,
  onToggleFornecedor,
  onToggleFornecedorAvulso,
  onChangeNovoFornecedor,
  onCriarFornecedorRapido,
  onEnviarFornecedores,
  itensCombinados
}) {
  const [selecionandoPorCategoria, setSelecionandoPorCategoria] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');

  // Filtra fornecedores avulsos que possuem a categoria selecionada
  const fornecedoresAvulsosComCategoria = useMemo(() => {
    if (!categoriaSelecionada) return [];
    return fornecedoresAvulsos.filter((f) => {
      const cats = Array.isArray(f.categoria_insumos) ? f.categoria_insumos : [];
      return cats.some((c) => String(c).toLowerCase().includes(categoriaSelecionada.toLowerCase()));
    });
  }, [fornecedoresAvulsos, categoriaSelecionada]);

  function selecionarTodosComCategoria() {
    const ids = fornecedoresAvulsosComCategoria.map((f) => String(f.id));
    const novos = ids.filter((id) => !fornecedoresAvulsosSelecionados.includes(id));
    novos.forEach((id) => onToggleFornecedorAvulso(id, true));
    setSelecionandoPorCategoria(false);
    setCategoriaSelecionada('');
  }

  // Monta links de WhatsApp para todos selecionados com número
  const linksWhatsApp = useMemo(() => {
    const links = [];
    const publicBase = window.location.origin;

    // Fornecedores avulsos selecionados
    fornecedoresAvulsosSelecionados.forEach((id) => {
      const f = fornecedoresAvulsos.find((x) => String(x.id) === id);
      if (!f?.whatsapp) return;

      // Encontra o token da cotação para este fornecedor (se já gerado)
      const vinculo = (solicitacao?.fornecedores || []).find(
        (v) => String(v.fornecedor_compra_id) === String(f.id)
      );
      if (!vinculo?.token) return;

      const url = `${publicBase}/cotacao/${vinculo.token}`;
      const msg = gerarMensagemCotacao(f.nome, url, itensCombinados);
      links.push({ nome: f.nome, link: whatsappLink(f.whatsapp, msg) });
    });

    return links;
  }, [fornecedoresAvulsosSelecionados, fornecedoresAvulsos, solicitacao, itensCombinados]);

  // Links para fornecedores já vinculados com WhatsApp
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
        <div className="card sol-surface-card border border-emerald-200 bg-emerald-50">
          <div className="card-header">
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
      {solicitacao.status === 'LIBERADO_PARA_COMPRA' && (
        <div className="solicitacoes-filtros app-filters-card">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3">
              {/* Seleção por categoria */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Selecionar fornecedores existentes</span>
                <button
                  type="button"
                  className="btn btn-outline text-xs"
                  onClick={() => setSelecionandoPorCategoria(!selecionandoPorCategoria)}
                >
                  Filtrar por categoria de insumo
                </button>
              </div>

              {selecionandoPorCategoria && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 grid gap-2">
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
                      disabled={!categoriaSelecionada.trim() || !fornecedoresAvulsosComCategoria.length}
                    >
                      Selecionar {fornecedoresAvulsosComCategoria.length > 0 ? `(${fornecedoresAvulsosComCategoria.length})` : ''}
                    </button>
                  </div>
                  {categoriaSelecionada && fornecedoresAvulsosComCategoria.length === 0 && (
                    <p className="text-xs text-blue-600">Nenhum fornecedor cadastrado com esta categoria.</p>
                  )}
                </div>
              )}

              {/* Parceiros */}
              <div>
                <div className="mb-2 text-sm font-medium">Parceiros cadastrados como fornecedores</div>
                <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_200px_auto]">
                  <input
                    className="input"
                    placeholder="Buscar por nome ou CPF/CNPJ"
                    value={fornecedorBusca}
                    onChange={(e) => onChangeFornecedorBusca(e.target.value)}
                  />
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
                <div className="app-list-stack max-h-[220px] overflow-y-auto rounded-xl border border-[var(--c-border)] bg-white/70 p-3">
                  {buscandoFornecedores ? (
                    <div className="text-sm text-[var(--c-muted)]">Buscando...</div>
                  ) : fornecedores.length === 0 ? (
                    <div className="text-sm text-[var(--c-muted)]">Nenhum parceiro fornecedor encontrado.</div>
                  ) : (
                    fornecedores.map((f) => (
                      <label key={f.id} className="app-list-card flex items-start gap-2 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={fornecedoresSelecionados.includes(String(f.id))}
                          onChange={(e) => onToggleFornecedor(String(f.id), e.target.checked)}
                        />
                        <div>
                          <div className="font-medium">{f.nome}</div>
                          <div className="text-xs text-[var(--c-muted)]">
                            {f.email || 'Sem email'} {f.telefone ? ` · ${f.telefone}` : ''}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Fornecedores avulsos */}
              <div>
                <div className="mb-2 text-sm font-medium">Fornecedores avulsos</div>
                <div className="app-list-stack max-h-[180px] overflow-y-auto rounded-xl border border-[var(--c-border)] bg-white/70 p-3">
                  {fornecedoresAvulsos.length === 0 ? (
                    <div className="text-sm text-[var(--c-muted)]">Nenhum fornecedor avulso. Use o cadastro rapido ao lado.</div>
                  ) : (
                    fornecedoresAvulsos.map((f) => (
                      <label key={f.id} className="app-list-card flex items-start gap-2 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={fornecedoresAvulsosSelecionados.includes(String(f.id))}
                          onChange={(e) => onToggleFornecedorAvulso(String(f.id), e.target.checked)}
                        />
                        <div>
                          <div className="font-medium">{f.nome}</div>
                          <div className="text-xs text-[var(--c-muted)]">
                            {f.whatsapp ? `WhatsApp: ${f.whatsapp}` : ''} {f.email || ''}
                          </div>
                          {Array.isArray(f.categoria_insumos) && f.categoria_insumos.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {f.categoria_insumos.map((c) => (
                                <span key={c} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Cadastro rápido */}
            <div className="grid gap-3 content-start">
              <div className="text-sm font-medium">Cadastro rapido</div>
              <input className="input" placeholder="Nome do fornecedor" value={novoFornecedor.nome} onChange={(e) => onChangeNovoFornecedor('nome', e.target.value)} />
              <input className="input" placeholder="WhatsApp" value={novoFornecedor.whatsapp} onChange={(e) => onChangeNovoFornecedor('whatsapp', e.target.value)} />
              <input className="input" placeholder="Email" value={novoFornecedor.email} onChange={(e) => onChangeNovoFornecedor('email', e.target.value)} />
              <input className="input" placeholder="Contato" value={novoFornecedor.contato} onChange={(e) => onChangeNovoFornecedor('contato', e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline" onClick={onCriarFornecedorRapido}>Cadastrar e selecionar</button>
                <button type="button" className="btn btn-primary" onClick={onEnviarFornecedores} disabled={enviandoFornecedores}>
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

// ── SecaoComparativo ───────────────────────────────────────────────────────────

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
      {/* Top 3 fornecedores */}
      {rankingFornecedores.length > 0 && (
        <div className="card sol-surface-card">
          <div className="card-header">
            <h2 className="font-semibold">Top 3 Fornecedores — Menor preco total</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {rankingFornecedores.map((forn, idx) => (
              <div
                key={forn.fornecedor_id}
                className={`rounded-xl border p-4 grid gap-2 ${idx === 0 ? 'border-emerald-300 bg-emerald-50' : 'border-[var(--c-border)] bg-[var(--c-bg)]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-2xl font-bold ${idx === 0 ? 'text-emerald-600' : 'text-[var(--c-muted)]'}`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className={`app-status-pill text-xs ${idx === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {idx === 0 ? 'Menor preco' : `${idx + 1}º lugar`}
                  </span>
                </div>
                <div className="font-semibold text-sm">{forn.fornecedor_nome}</div>
                <div className="text-xl font-bold text-[var(--c-text)]">{fmtMoeda(forn.total)}</div>
                <div className="text-xs text-[var(--c-muted)]">
                  {forn.itensRespondidos} item(ns) respondido(s) · {forn.vencedor_itens} ganhador(es)
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
        </div>
      )}

      {/* Comparativo detalhado por item */}
      <div className="card sol-surface-card">
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Comparativo por Item</h2>
          <span className="text-sm text-[var(--c-muted)]">{comparativo.itens.length} item(ns)</span>
        </div>

        <div className="app-list-stack">
          {comparativo.itens.map((item) => (
            <div key={buildItemKey(item)} className="app-list-card">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-semibold">{item.nome}</div>
                  <div className="text-sm text-[var(--c-muted)]">
                    {item.quantidade} {item.unidade} · {item.item_tipo === 'MANUAL' ? 'Manual' : 'Cadastrado'}
                    {item.especificacao ? ` · ${item.especificacao}` : ''}
                  </div>
                </div>
                {item.melhor_preco && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                    Menor: <strong>{item.melhor_preco.fornecedor_nome}</strong> — {fmtMoeda(item.melhor_preco.preco)}/un
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
                          className={isVencedor ? 'bg-emerald-50' : ''}
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

// ── Componente principal ───────────────────────────────────────────────────────

export default function SolicitacaoCompraDetalheView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [solicitacao, setSolicitacao] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [fornecedoresAvulsos, setFornecedoresAvulsos] = useState([]);
  const [categoriasFornecedor, setCategoriasFornecedor] = useState([]);
  const [categoriaFornecedorId, setCategoriaFornecedorId] = useState('');
  const [fornecedorBusca, setFornecedorBusca] = useState('');
  const [buscandoFornecedores, setBuscandoFornecedores] = useState(false);
  const [comparativo, setComparativo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [previewArquivo, setPreviewArquivo] = useState(null);
  const [salvandoIntegracao, setSalvandoIntegracao] = useState(false);
  const [salvandoLiberacao, setSalvandoLiberacao] = useState(false);
  const [enviandoFornecedores, setEnviandoFornecedores] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [criandoPedidoFornecedorId, setCriandoPedidoFornecedorId] = useState(null);
  const [numeroSienge, setNumeroSienge] = useState('');
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState([]);
  const [fornecedoresAvulsosSelecionados, setFornecedoresAvulsosSelecionados] = useState([]);
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: '', email: '', whatsapp: '', contato: '' });
  const [vencedoresSelecionados, setVencedoresSelecionados] = useState({});

  const perfilUpper = String(user?.perfil || '').toUpperCase();
  const tokens = [
    String(user?.area || '').toUpperCase(),
    String(user?.setor?.codigo || '').toUpperCase(),
    String(user?.setor?.nome || '').toUpperCase()
  ];
  const podeIntegrar =
    perfilUpper === 'SUPERADMIN' || perfilUpper === 'ADMIN' ||
    tokens.includes('GEO') || tokens.includes('GERENCIA DE PROCESSOS') ||
    tokens.includes('GESTAO DE PROCESSOS') || tokens.includes('GERENCIA_PROCESSOS') ||
    tokens.includes('GESTAO_PROCESSOS');
  const podeComprar =
    perfilUpper === 'SUPERADMIN' || perfilUpper === 'ADMIN' || tokens.includes('COMPRAS');

  async function carregarFornecedores() {
    try {
      setBuscandoFornecedores(true);
      const params = { fornecedor: 1, limit: 200 };
      if (categoriaFornecedorId) params.categoria_id = categoriaFornecedorId;
      if (fornecedorBusca.trim()) params.q = fornecedorBusca.trim();
      const data = await buscarParceiros(params);
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
      const [dataSolicitacao, dataCategorias, dataAvulsos] = await Promise.all([
        obterSolicitacaoCompra(id),
        listarCategoriasParceiro(),
        listarFornecedoresCompra({ somente_avulsos: 1 })
      ]);

      setSolicitacao(dataSolicitacao || null);
      setNumeroSienge(dataSolicitacao?.numero_sienge || '');
      setCategoriasFornecedor(Array.isArray(dataCategorias) ? dataCategorias : []);
      setFornecedoresAvulsos(Array.isArray(dataAvulsos) ? dataAvulsos : []);
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
  useEffect(() => { if (!loading) carregarFornecedores(); }, [categoriaFornecedorId]);

  const itensCombinados = useMemo(() => {
    const itens = (solicitacao?.itens || []).map((item) => ({
      item_tipo: 'CADASTRADO',
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

  async function handleIntegrar() {
    try {
      setSalvandoIntegracao(true);
      await integrarSolicitacaoCompra(id, { numero_sienge: numeroSienge });
      await carregarTudo();
      alert('Solicitacao integrada ao Sienge.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao integrar no Sienge');
    } finally {
      setSalvandoIntegracao(false);
    }
  }

  async function handleLiberar() {
    try {
      setSalvandoLiberacao(true);
      await liberarSolicitacaoCompra(id);
      await carregarTudo();
      alert('Solicitacao liberada para compra.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao liberar para compra');
    } finally {
      setSalvandoLiberacao(false);
    }
  }

  async function handleEnviarFornecedores() {
    try {
      const payload = [];
      fornecedoresSelecionados.forEach((fornecedorId) => payload.push({ parceiro_id: Number(fornecedorId) }));
      fornecedoresAvulsosSelecionados.forEach((fornecedorId) => payload.push({ fornecedor_id: Number(fornecedorId) }));
      if (String(novoFornecedor.nome || '').trim()) {
        payload.push({ nome: novoFornecedor.nome, email: novoFornecedor.email, whatsapp: novoFornecedor.whatsapp, contato: novoFornecedor.contato });
      }
      if (!payload.length) { alert('Selecione ou cadastre ao menos um fornecedor.'); return; }

      setEnviandoFornecedores(true);
      await enviarSolicitacaoCompraParaFornecedores(id, { fornecedores: payload });
      setFornecedoresSelecionados([]);
      setFornecedoresAvulsosSelecionados([]);
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
      setFornecedoresAvulsos((atual) => [...atual, fornecedor].sort((a, b) => String(a.nome).localeCompare(String(b.nome))));
      setFornecedoresAvulsosSelecionados((atual) => [...atual, String(fornecedor.id)]);
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
              {isAvulsa ? (solicitacao.titulo || 'Cotacao Avulsa') : 'Centro de Cotacao'}
            </h1>
            <p className="page-subtitle">
              SC-{String(solicitacao.id).padStart(5, '0')}
              {isAvulsa ? ' · Cotacao Avulsa' : ' · Fluxo de compra'}
              {solicitacao.obra?.nome ? ` · ${solicitacao.obra.nome}` : ''}
            </p>
          </div>
          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/solicitacoes-compra')}>
              Voltar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleAbrirPdf} disabled={baixando}>
              {baixando ? 'Abrindo...' : 'Abrir PDF'}
            </button>
          </div>
        </div>

        <div className="app-summary-grid">
          <div className="app-summary-card">
            <div className="app-summary-label">Status</div>
            <div className="app-summary-value">
              <span className={clsStatus(solicitacao.status)}>{fmtStatus(solicitacao.status)}</span>
            </div>
          </div>
          <div className="app-summary-card">
            <div className="app-summary-label">Obra</div>
            <div className="app-summary-value">{solicitacao.obra?.nome || '-'}</div>
          </div>
          <div className="app-summary-card">
            <div className="app-summary-label">Criado por</div>
            <div className="app-summary-value">{solicitacao.solicitante?.nome || '-'}</div>
            <div className="app-summary-subvalue">{fmt(solicitacao.createdAt)}</div>
          </div>
          <div className="app-summary-card">
            <div className="app-summary-label">Necessario para</div>
            <div className="app-summary-value">{fmt(solicitacao.necessario_para) || '-'}</div>
          </div>
          <div className="app-summary-card">
            <div className="app-summary-label">Fornecedores</div>
            <div className="app-summary-value">{solicitacao.fornecedores?.length || 0}</div>
            <div className="app-summary-subvalue">vinculados a cotacao</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Coluna esquerda */}
        <div className="grid gap-4">
          {/* Resumo operacional */}
          <div className="card sol-surface-card">
            <div className="card-header"><h2 className="font-semibold">Resumo</h2></div>
            <div className="app-summary-grid">
              {!isAvulsa && (
                <div className="app-summary-card">
                  <div className="app-summary-label">Integrado Sienge</div>
                  <div className="app-summary-value">{solicitacao.integrado_sienge ? 'Sim' : 'Nao'}</div>
                </div>
              )}
              <div className="app-summary-card">
                <div className="app-summary-label">Origem</div>
                <div className="app-summary-value">{isAvulsa ? 'Cotacao Avulsa' : 'Solicitacao de Compra'}</div>
              </div>
              <div className="app-summary-card">
                <div className="app-summary-label">Observacoes</div>
                <div className="app-summary-subvalue whitespace-pre-wrap">{solicitacao.observacoes || '-'}</div>
              </div>
            </div>
          </div>

          {/* Integracao Sienge (somente fluxo normal) */}
          {!isAvulsa && podeIntegrar && !solicitacao.integrado_sienge && (
            <div className="card sol-surface-card solicitacoes-filtros app-filters-card">
              <div className="card-header"><h2 className="font-semibold">Integracao Sienge</h2></div>
              <div className="grid gap-3">
                <div className="app-filter-field">
                  <label className="app-filter-label">Numero Sienge</label>
                  <input className="input" value={numeroSienge} onChange={(e) => setNumeroSienge(e.target.value)} placeholder="Ex.: PC-2026-001" />
                </div>
                <button type="button" className="btn btn-primary" onClick={handleIntegrar} disabled={salvandoIntegracao}>
                  {salvandoIntegracao ? 'Integrando...' : 'Marcar como integrado'}
                </button>
              </div>
            </div>
          )}

          {!isAvulsa && podeIntegrar && solicitacao.integrado_sienge && solicitacao.status !== 'LIBERADO_PARA_COMPRA' && solicitacao.status !== 'ENCERRADO' && (
            <div className="card sol-surface-card solicitacoes-filtros app-filters-card">
              <div className="card-header"><h2 className="font-semibold">Liberacao para compras</h2></div>
              <div className="grid gap-3">
                <p className="text-sm text-[var(--c-muted)]">Integracao registrada. Libere para envio aos fornecedores.</p>
                <button type="button" className="btn btn-primary" onClick={handleLiberar} disabled={salvandoLiberacao}>
                  {salvandoLiberacao ? 'Liberando...' : 'Liberar para compra'}
                </button>
              </div>
            </div>
          )}

          {/* Itens da solicitacao */}
          <div className="card sol-surface-card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold">Itens</h2>
              <span className="text-sm text-[var(--c-muted)]">{itensCombinados.length} item(ns)</span>
            </div>
            <div className="app-list-stack">
              {itensCombinados.map((item, index) => (
                <div key={`${item.item_tipo}-${index}`} className="app-list-card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold mr-2 ${item.item_tipo === 'MANUAL' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {item.item_tipo}
                      </span>
                      <span className={`font-medium ${item.item_tipo === 'MANUAL' ? 'text-red-700' : ''}`}>{item.nome}</span>
                    </div>
                    <span className="text-sm text-[var(--c-muted)]">{item.quantidade} {item.unidade}</span>
                  </div>
                  {item.especificacao && item.especificacao !== '-' && (
                    <div className="mt-1 text-xs text-[var(--c-muted)]">{item.especificacao}</div>
                  )}
                  {item.arquivo_url && (
                    <button type="button" className="mt-1 text-xs text-blue-600 hover:underline" onClick={() => handleAbrirArquivo(item)}>
                      {item.arquivo_nome_original || 'Abrir arquivo'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div className="grid gap-4">
          {/* Fornecedores vinculados + envio */}
          <div className="card sol-surface-card">
            <div className="card-header flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Fornecedores e Links de Cotacao</h2>
              <span className="text-sm text-[var(--c-muted)]">{solicitacao.fornecedores?.length || 0} fornecedor(es)</span>
            </div>

            {/* Aviso quando nao pode enviar ainda */}
            {podeComprar && solicitacao.status !== 'LIBERADO_PARA_COMPRA' && solicitacao.status !== 'ENCERRADO' && !isAvulsa && (
              <div className="app-alert mb-5">
                {!solicitacao.integrado_sienge
                  ? 'Preencha o numero Sienge e use Marcar como integrado antes de enviar aos fornecedores.'
                  : 'Use Liberar para compra no card lateral para habilitar o envio de cotacoes.'}
              </div>
            )}

            {/* Componente de envio para fornecedores */}
            <SecaoEnvioFornecedores
              solicitacao={solicitacao}
              podeComprar={podeComprar}
              categoriasFornecedor={categoriasFornecedor}
              fornecedores={fornecedores}
              fornecedoresAvulsos={fornecedoresAvulsos}
              buscandoFornecedores={buscandoFornecedores}
              fornecedoresSelecionados={fornecedoresSelecionados}
              fornecedoresAvulsosSelecionados={fornecedoresAvulsosSelecionados}
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
              onToggleFornecedorAvulso={(id, checked) =>
                setFornecedoresAvulsosSelecionados((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id))
              }
              onChangeNovoFornecedor={(field, value) => setNovoFornecedor((prev) => ({ ...prev, [field]: value }))}
              onCriarFornecedorRapido={handleCriarFornecedorRapido}
              onEnviarFornecedores={handleEnviarFornecedores}
              itensCombinados={itensCombinados}
            />

            {/* Lista de fornecedores vinculados */}
            {solicitacao.fornecedores?.length > 0 && (
              <div className="app-list-stack mt-4">
                {solicitacao.fornecedores.map((cotacaoFornecedor) => {
                  const publicUrl = `${window.location.origin}/cotacao/${cotacaoFornecedor.token}`;
                  const pedidoFornecedor = pedidosPorFornecedor.get(Number(cotacaoFornecedor.fornecedor_compra_id));
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
                            Status: {fmtStatus(cotacaoFornecedor.status)} · Respondido em {fmt(cotacaoFornecedor.respondido_em)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn btn-outline" onClick={() => copiarTexto(publicUrl)}>Copiar link</button>
                          <button type="button" className="btn btn-outline" onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}>Abrir portal</button>
                          {linkWa && (
                            <a href={linkWa} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                              WhatsApp
                            </a>
                          )}
                          {podeComprar && solicitacao.status === 'ENCERRADO' && cotacaoFornecedor.status === 'RESPONDIDO' && (
                            <button
                              type="button"
                              className="btn btn-primary"
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
                          {' '} — Total {fmtMoeda(pedidoFornecedor.valor_total)}
                        </div>
                      )}
                      <div className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{publicUrl}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pedidos gerados */}
          {solicitacao.pedidos?.length > 0 && (
            <div className="card sol-surface-card">
              <div className="card-header flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Pedidos Gerados</h2>
                <span className="text-sm text-[var(--c-muted)]">{solicitacao.pedidos.length} pedido(s)</span>
              </div>
              <div className="app-list-stack">
                {solicitacao.pedidos.map((pedido) => {
                  const itensAtivos = (pedido.itens || []).filter((it) => !it.removido).length;
                  return (
                    <div key={pedido.id} className="app-list-card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">PC-{String(pedido.id).padStart(5, '0')} — {pedido.fornecedor?.nome || '-'}</div>
                          <div className="text-sm text-[var(--c-muted)]">{itensAtivos} item(ns) · Total {fmtMoeda(pedido.valor_total)}</div>
                        </div>
                        <button type="button" className="btn btn-outline" onClick={() => navigate(`/pedidos-compra/${pedido.id}`)}>
                          Gerenciar pedido
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
    </div>
  );
}
