import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { criarSolicitacaoCompra, criarSolicitacaoCompraDireta, obterUrlAssinadaCompra } from '../../../services/compras';
import CompraPreviewModal from '../components/CompraPreviewModal';
import { TabelaPadrao } from '../../../components/padrao';
import { criarPreviewCompra } from '../utils/preview';
import { montarLinhasResumoApropriacao, montarTextoResumoApropriacao } from '../utils/apropriacoes';
import { useAuth } from '../../../contexts/AuthContext';
import {
  buildComprasDraftKey,
  readComprasDraft,
  removeComprasDraft,
  writeComprasDraft
} from '../utils/comprasDraftStorage';

function formatarData(data) {
  if (!data) {
    return '-';
  }

  const raw = String(data);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) {
    return data;
  }

  return valor.toLocaleDateString('pt-BR');
}

function escapeHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textoOuPadrao(valor, padrao = '-') {
  return valor ? valor : padrao;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatarFormasPagamento(formas) {
  const lista = Array.isArray(formas) ? formas : [];
  return lista.map((forma) => forma?.nome || forma?.codigo).filter(Boolean).join('; ') || '-';
}

function StatusChecklist({ ativo, titulo, descricao }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        ativo
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <div className="text-sm font-semibold">{ativo ? 'OK' : 'Pendente'}</div>
      <div className="mt-1 text-sm">{titulo}</div>
      <div className="mt-1 text-xs opacity-80">{descricao}</div>
    </div>
  );
}

function CardMetrica({ titulo, valor, detalhe }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">{titulo}</div>
      <div className="mt-2 text-2xl font-semibold">{valor}</div>
      <div className="mt-1 text-sm text-[var(--c-muted)]">{detalhe}</div>
    </div>
  );
}

function LinhaResumo({ titulo, valor, className = '' }) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">{titulo}</div>
      <div className="mt-1 text-sm font-medium text-[var(--c-text)]">{valor}</div>
    </div>
  );
}

export default function RevisarSolicitacaoCompra({ modoCompraDireta = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const draftKey = buildComprasDraftKey(user?.id, modoCompraDireta ? 'compra-direta' : 'solicitacao');
  const [draft, setDraft] = useState(null);
  const [confirmado, setConfirmado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewVisualizado, setPreviewVisualizado] = useState(false);
  const [modalPreviewAberto, setModalPreviewAberto] = useState(false);
  const [previewArquivo, setPreviewArquivo] = useState(null);

  useEffect(() => {
    try {
      const dados = readComprasDraft(draftKey);
      if (!dados) {
        navigate(modoCompraDireta ? '/solicitacoes-compra-direta/nova' : '/solicitacoes-compra/nova', { replace: true });
        return;
      }
      if (!dados?.payload?.obra_id || !Array.isArray(dados?.payload?.itens) || !dados.payload.itens.length) {
        removeComprasDraft(draftKey);
        navigate(modoCompraDireta ? '/solicitacoes-compra-direta/nova' : '/solicitacoes-compra/nova', { replace: true });
        return;
      }

      setDraft(dados);
    } catch (error) {
      console.error(error);
      removeComprasDraft(draftKey);
      navigate(modoCompraDireta ? '/solicitacoes-compra-direta/nova' : '/solicitacoes-compra/nova', { replace: true });
    }
  }, [draftKey, modoCompraDireta, navigate]);

  const itensResumo = useMemo(() => draft?.resumo?.itens || [], [draft]);
  const totalItens = itensResumo.length;
  // A tabela recebe a ordem e a chave da linha já resolvidas (o render de
  // coluna enxerga só o item, não o índice).
  const itensRevisao = useMemo(
    () => itensResumo.map((item, index) => ({
      ...item,
      __ordem: String(index + 1).padStart(2, '0'),
      __chave: `${item.manual ? 'manual' : item.insumo_id}-${index}`
    })),
    [itensResumo]
  );

  const estatisticas = useMemo(() => {
    return itensResumo.reduce(
      (acc, item) => {
        if (item.link_produto) {
          acc.comLink += 1;
        }
        if (item.arquivo_url) {
          acc.comArquivo += 1;
        }
        if (item.manual) {
          acc.manuais += 1;
        }
        return acc;
      },
      {
        comLink: 0,
        comArquivo: 0,
        manuais: 0
      }
    );
  }, [itensResumo]);

  const prontoParaCriar = confirmado && previewVisualizado;
  const valorBrutoCompraDireta = Number(draft?.resumo?.valor_bruto || draft?.resumo?.valor_total || 0);
  const descontoCompraDireta = Number(draft?.resumo?.desconto_total || 0);
  const valorLiquidoItensCompraDireta = Number(
    draft?.resumo?.valor_total_itens ?? draft?.resumo?.valor_total ?? 0
  );
  const valorTotalCompraDireta = Number(draft?.resumo?.valor_total || valorLiquidoItensCompraDireta || 0);
  const freteTipoCompraDireta = String(draft?.payload?.frete_tipo || 'SEM_FRETE').toUpperCase();
  const freteValorCompraDireta = Number(draft?.payload?.frete_valor || 0);
  const freteTipoLabel = freteTipoCompraDireta === 'TERCEIRO'
    ? 'Frete pago a terceiro'
    : freteTipoCompraDireta === 'EMBUTIDO'
      ? 'Frete embutido'
      : 'Sem frete';
  const temDescontoCompraDireta = modoCompraDireta && descontoCompraDireta > 0;

  const conteudoPreviewPdf = useMemo(() => {
    if (!draft) {
      return '';
    }

    const itensHtml = itensResumo
      .map(
        (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.insumo_nome || '-')}</td>
          <td>${escapeHtml(item.unidade_sigla || '-')}</td>
          <td>${escapeHtml(item.quantidade || '-')}</td>
          ${modoCompraDireta ? `<td>${escapeHtml(formatarMoeda(item.valor_unitario))}</td>` : ''}
          ${modoCompraDireta ? `<td>${escapeHtml(formatarMoeda(item.valor_total))}</td>` : ''}
          ${modoCompraDireta ? '' : `<td>${escapeHtml(item.especificacao || '-')}</td>`}
          <td>${montarLinhasResumoApropriacao(item).map((linha) => escapeHtml(linha)).join('<br />') || '-'}</td>
          ${modoCompraDireta ? '' : `<td>${escapeHtml(formatarData(item.necessario_para))}</td>`}
          ${modoCompraDireta ? '' : `<td>${escapeHtml(item.link_produto || '-')}</td>`}
          ${modoCompraDireta ? '' : `<td>${escapeHtml(item.arquivo_nome_original || '-')}</td>`}
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Pre-visualizacao - Solicitacao de Compra</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            .meta { margin: 4px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>${modoCompraDireta ? 'Compra Direta' : 'Solicitacao de Compra'}</h1>
          <div class="meta"><strong>Obra:</strong> ${escapeHtml(draft.resumo?.obra_nome || '-')}</div>
          <div class="meta"><strong>Solicitante:</strong> ${escapeHtml(draft.resumo?.solicitante_nome || '-')}</div>
          ${temDescontoCompraDireta ? `<div class="meta"><strong>Valor bruto:</strong> ${escapeHtml(formatarMoeda(valorBrutoCompraDireta))}</div>` : ''}
          ${temDescontoCompraDireta ? `<div class="meta"><strong>Desconto concedido:</strong> ${escapeHtml(formatarMoeda(descontoCompraDireta))}</div>` : ''}
          ${modoCompraDireta ? `<div class="meta"><strong>Valor líquido dos itens:</strong> ${escapeHtml(formatarMoeda(valorLiquidoItensCompraDireta))}</div>` : ''}
          ${modoCompraDireta ? `<div class="meta"><strong>Frete:</strong> ${escapeHtml(freteTipoLabel)}${freteTipoCompraDireta !== 'SEM_FRETE' ? ` - ${escapeHtml(formatarMoeda(freteValorCompraDireta))}` : ''}</div>` : ''}
          ${modoCompraDireta && freteTipoCompraDireta === 'TERCEIRO' ? `<div class="meta"><strong>Credor do frete:</strong> ${escapeHtml(draft.resumo?.frete_credor_nome || '-')}</div>` : ''}
          ${modoCompraDireta && freteTipoCompraDireta === 'TERCEIRO' ? `<div class="meta"><strong>Pagamento do frete:</strong> ${escapeHtml(formatarData(draft.payload?.frete_data_vencimento))} - ${escapeHtml(draft.payload?.frete_dados_pagamento || '-')}</div>` : ''}
          ${modoCompraDireta ? `<div class="meta"><strong>Valor total da solicitação:</strong> ${escapeHtml(formatarMoeda(valorTotalCompraDireta))}</div>` : ''}
          ${modoCompraDireta ? `<div class="meta"><strong>Credor:</strong> ${escapeHtml(draft.resumo?.credor_nome || '-')}</div>` : ''}
          ${modoCompraDireta ? `<div class="meta"><strong>Formas de pagamento:</strong> ${escapeHtml(formatarFormasPagamento(draft.resumo?.formas_pagamento))}</div>` : ''}
          ${modoCompraDireta ? `<div class="meta"><strong>Dados para pagamento:</strong> ${escapeHtml(draft.payload?.dados_pagamento || '-')}</div>` : ''}
          <div class="meta"><strong>${modoCompraDireta ? 'Data de vencimento' : 'Necessario para'}:</strong> ${escapeHtml(
            formatarData(draft.payload?.necessario_para)
          )}</div>
          <div class="meta"><strong>Observacoes:</strong> ${escapeHtml(draft.payload?.observacoes || '-')}</div>
          <div class="meta"><strong>Link geral:</strong> ${escapeHtml(draft.payload?.link_geral || '-')}</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Insumo</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                ${modoCompraDireta ? '<th>Valor unit.</th><th>Valor total</th>' : ''}
                ${modoCompraDireta ? '' : '<th>Especificacao</th>'}
                <th>Apropriacao</th>
                ${modoCompraDireta ? '' : '<th>Necessario para</th><th>Link</th><th>Arquivo</th>'}
              </tr>
            </thead>
            <tbody>${itensHtml}</tbody>
          </table>
        </body>
      </html>
    `;
  }, [
    descontoCompraDireta,
    draft,
    itensResumo,
    modoCompraDireta,
    temDescontoCompraDireta,
    valorBrutoCompraDireta,
    freteTipoCompraDireta,
    freteTipoLabel,
    freteValorCompraDireta,
    valorLiquidoItensCompraDireta,
    valorTotalCompraDireta
  ]);

  function abrirPreviaPdf() {
    if (!draft) {
      return;
    }

    setModalPreviewAberto(true);
    setPreviewVisualizado(true);
  }

  async function handleAbrirArquivo(item) {
    try {
      const url = await obterUrlAssinadaCompra(item?.arquivo_url);
      if (!url) {
        alert('Arquivo nao encontrado.');
        return;
      }

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

  async function handleConfirmar() {
    if (!draft) {
      return;
    }

    if (!confirmado) {
      alert('Confirme que revisou os dados antes de criar a solicitacao.');
      return;
    }

    if (!previewVisualizado) {
      alert('Abra a pre-visualizacao do PDF antes de confirmar a criacao da solicitacao.');
      return;
    }

    try {
      setLoading(true);
      const resposta = modoCompraDireta
        ? await criarSolicitacaoCompraDireta(draft.payload)
        : await criarSolicitacaoCompra(draft.payload);
      removeComprasDraft(draftKey);
      navigate(`/solicitacoes-compra/finalizada/${resposta.id}`, {
        replace: true,
        state: {
          resultado: resposta,
          resumo: draft.resumo
        }
      });
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao criar solicitacao de compra');
    } finally {
      setLoading(false);
    }
  }

  function handleVoltarEditar() {
    if (draft) {
      writeComprasDraft(draftKey, draft, user?.id);
    }
    navigate(modoCompraDireta ? '/solicitacoes-compra-direta/nova' : '/solicitacoes-compra/nova', {
      state: { preservarRascunhoCompra: true }
    });
  }

  if (!draft) {
    return null;
  }

  return (
    <div className="page solicitacoes-page">
      <div>
        <h1 className="page-title">{modoCompraDireta ? 'Revisar Compra Direta' : 'Revisar Solicitacao de Compra'}</h1>
        <p className="page-subtitle">
          Esta etapa agora mostra o que realmente importa: contexto da compra, checklist do envio e
          leitura clara dos itens antes da criacao.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.55fr)_360px]">
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">
                  Etapa final antes do envio
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--c-text)]">
                  {prontoParaCriar ? 'Solicitacao pronta para criar' : 'Ainda existem pendencias de revisao'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[var(--c-muted)]">
                  Revise o PDF, confira os itens e confirme a autorizacao. Quando os dois
                  checkpoints estiverem ok, o envio fica objetivo.
                </p>
              </div>
              <div
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  prontoParaCriar
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-amber-300 bg-amber-50 text-amber-700'
                }`}
              >
                {prontoParaCriar ? 'Pronto para criar' : 'Revisao pendente'}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <CardMetrica titulo="Itens" valor={totalItens} detalhe="Total revisado nesta compra" />
              {modoCompraDireta && (
                <CardMetrica
                  titulo="Total da solicitação"
                  valor={formatarMoeda(valorTotalCompraDireta)}
                  detalhe={freteTipoCompraDireta !== 'SEM_FRETE'
                    ? `Itens ${formatarMoeda(valorLiquidoItensCompraDireta)} + frete ${formatarMoeda(freteValorCompraDireta)}`
                    : temDescontoCompraDireta
                      ? `Bruto ${formatarMoeda(valorBrutoCompraDireta)} - desconto ${formatarMoeda(descontoCompraDireta)}`
                      : 'Valor que será levado para a solicitação'}
                />
              )}
              <CardMetrica
                titulo="Com arquivo"
                valor={estatisticas.comArquivo}
                detalhe="Itens com documento anexado"
              />
              <CardMetrica
                titulo="Com link"
                valor={estatisticas.comLink}
                detalhe="Itens com link de produto"
              />
              <CardMetrica
                titulo="Manuais"
                valor={estatisticas.manuais}
                detalhe="Itens fora do cadastro padrao"
              />
            </div>
          </div>

          <div className="border-t border-[var(--c-border)] bg-[var(--c-surface)] p-5 md:p-6 xl:border-l xl:border-t-0">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Checklist de envio</div>
            <div className="mt-4 grid gap-3">
              <StatusChecklist
                ativo={previewVisualizado}
                titulo="PDF revisado"
                descricao="Abra a pre-visualizacao para validar o documento que sera anexado ao historico."
              />
              <StatusChecklist
                ativo={confirmado}
                titulo="Autorizacao marcada"
                descricao="Confirme que os dados estao corretos antes de criar a solicitacao."
              />
            </div>

            <button type="button" className="btn btn-outline mt-5 w-full justify-center" onClick={abrirPreviaPdf}>
              {previewVisualizado ? 'Abrir PDF novamente' : 'Visualizar PDF antes de criar'}
            </button>

            <label className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(event) => setConfirmado(event.target.checked)}
              />
              <span className="text-sm text-[var(--c-text)]">
                Confirmo que revisei os dados e autorizo a criacao da {modoCompraDireta ? 'compra direta' : 'solicitacao de compra'}.
              </span>
            </label>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                className="btn btn-primary w-full justify-center"
                onClick={handleConfirmar}
                disabled={loading || !prontoParaCriar}
              >
                {loading ? 'Criando...' : 'Criar solicitacao'}
              </button>
              <button
                type="button"
                className="btn btn-outline w-full justify-center"
                onClick={handleVoltarEditar}
              >
                Voltar e editar
              </button>
            </div>

            <div className="mt-4 text-xs text-[var(--c-muted)]">
              O envio so libera quando o PDF foi aberto e a confirmacao estiver marcada.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="card xl:sticky xl:top-4">
          <div className="card-header">
            <h2 className="font-semibold">{modoCompraDireta ? 'Dados da compra direta' : 'Dados da compra'}</h2>
          </div>

          <div className="grid gap-4 text-sm">
            <LinhaResumo titulo="Obra" valor={textoOuPadrao(draft.resumo?.obra_nome)} />
            <LinhaResumo titulo="Solicitante" valor={textoOuPadrao(draft.resumo?.solicitante_nome)} />
            {modoCompraDireta && <LinhaResumo titulo="Credor" valor={textoOuPadrao(draft.resumo?.credor_nome)} />}
            {modoCompraDireta && (
              <LinhaResumo
                titulo="Formas de pagamento"
                valor={textoOuPadrao(formatarFormasPagamento(draft.resumo?.formas_pagamento))}
              />
            )}
            {modoCompraDireta && (
              <LinhaResumo
                titulo="Dados para pagamento"
                valor={textoOuPadrao(draft.payload?.dados_pagamento)}
                className="whitespace-pre-wrap"
              />
            )}
            <LinhaResumo
              titulo={modoCompraDireta ? 'Data de vencimento' : 'Necessario para'}
              valor={textoOuPadrao(formatarData(draft.payload?.necessario_para))}
            />
            <LinhaResumo titulo="Link geral" valor={textoOuPadrao(draft.payload?.link_geral)} className="break-all" />
            {modoCompraDireta && (
              <>
                {temDescontoCompraDireta && (
                  <LinhaResumo titulo="Valor bruto" valor={formatarMoeda(valorBrutoCompraDireta)} />
                )}
                {temDescontoCompraDireta && (
                  <LinhaResumo titulo="Desconto concedido" valor={formatarMoeda(descontoCompraDireta)} />
                )}
                <LinhaResumo
                  titulo="Valor líquido dos itens"
                  valor={formatarMoeda(valorLiquidoItensCompraDireta)}
                />
                <LinhaResumo titulo="Frete" valor={`${freteTipoLabel}${freteTipoCompraDireta !== 'SEM_FRETE' ? ` - ${formatarMoeda(freteValorCompraDireta)}` : ''}`} />
                {freteTipoCompraDireta === 'TERCEIRO' && (
                  <>
                    <LinhaResumo titulo="Credor do frete" valor={textoOuPadrao(draft.resumo?.frete_credor_nome)} />
                    <LinhaResumo titulo="Vencimento do frete" valor={textoOuPadrao(formatarData(draft.payload?.frete_data_vencimento))} />
                    <LinhaResumo titulo="Dados para pagamento do frete" valor={textoOuPadrao(draft.payload?.frete_dados_pagamento)} className="whitespace-pre-wrap" />
                  </>
                )}
                <LinhaResumo titulo="Valor total da solicitação" valor={formatarMoeda(valorTotalCompraDireta)} />
                <LinhaResumo
                  titulo="Notas/Guias anexadas"
                  valor={`${draft.resumo?.anexos_cabecalho?.length || 0} arquivo(s)`}
                />
              </>
            )}

            <div className="rounded-xl border border-[var(--c-border)] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">Observacoes</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--c-text)]">
                {textoOuPadrao(draft.payload?.observacoes)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Itens revisados</h2>
              <p className="mt-1 text-sm text-[var(--c-muted)]">
                Confira quantidade, rateio de apropriacao, prazo e acessos de compra em uma lista unica.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-[var(--c-border)] px-3 py-1 text-xs font-semibold text-[var(--c-muted)]">
              {totalItens} item(ns)
            </div>
          </div>

          <TabelaPadrao
            colunas={[
              {
                id: 'ordem',
                titulo: '#',
                tipo: 'codigo',
                render: (item) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-[var(--c-border)] px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
                      {item.__ordem}
                    </span>
                    {item.manual && (
                      <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                        Manual
                      </span>
                    )}
                  </div>
                )
              },
              {
                id: 'item',
                titulo: 'Item',
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.insumo_nome
              },
              {
                id: 'quantidade',
                titulo: 'Quantidade',
                tipo: 'numero',
                render: (item) => `${item.quantidade} ${item.unidade_sigla || '-'}`
              },
              ...(modoCompraDireta ? [{
                id: 'valor',
                titulo: 'Valor',
                tipo: 'valor',
                render: (item) => (
                  <>
                    <div>{formatarMoeda(item.valor_unitario)} un.</div>
                    <div className="mt-1 font-semibold">{formatarMoeda(item.valor_total)}</div>
                  </>
                )
              }] : []),
              {
                id: 'apropriacao',
                titulo: 'Apropriacao',
                tipo: 'texto',
                render: (item) => (
                  <span className="text-[var(--c-muted)]">{montarTextoResumoApropriacao(item)}</span>
                )
              },
              ...(modoCompraDireta ? [] : [
                {
                  id: 'necessario_para',
                  titulo: 'Necessario para',
                  tipo: 'data',
                  render: (item) => formatarData(item.necessario_para)
                },
                {
                  id: 'especificacao',
                  titulo: 'Especificacao',
                  tipo: 'texto',
                  render: (item) => (
                    <div className="whitespace-pre-wrap text-[var(--c-text)]">
                      {textoOuPadrao(item.especificacao)}
                    </div>
                  )
                },
                {
                  id: 'acessos',
                  titulo: 'Acessos',
                  tipo: 'texto',
                  render: (item) => (
                    <div className="flex flex-wrap gap-2">
                      {item.link_produto ? (
                        <a
                          href={item.link_produto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-lg border border-[var(--c-border)] px-3 py-2 text-xs font-semibold text-[var(--c-text)] transition hover:border-[var(--c-primary)] hover:text-[var(--c-primary)]"
                        >
                          Abrir link
                        </a>
                      ) : (
                        <span className="inline-flex rounded-lg border border-dashed border-[var(--c-border)] px-3 py-2 text-xs text-[var(--c-muted)]">
                          Sem link
                        </span>
                      )}

                      {item.arquivo_url ? (
                        <button
                          type="button"
                          className="inline-flex rounded-lg border border-[var(--c-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--c-text)] transition hover:border-[var(--c-primary)] hover:text-[var(--c-primary)]"
                          onClick={() => handleAbrirArquivo(item)}
                          title={item.arquivo_nome_original || 'Abrir arquivo'}
                        >
                          <span className="truncate">{item.arquivo_nome_original || 'Abrir arquivo'}</span>
                        </button>
                      ) : (
                        <span className="inline-flex rounded-lg border border-dashed border-[var(--c-border)] px-3 py-2 text-xs text-[var(--c-muted)]">
                          Sem arquivo
                        </span>
                      )}
                    </div>
                  )
                }
              ])
            ]}
            itens={itensRevisao}
            getId={(item) => item.__chave}
            vazio="Nenhum item revisado."
            storageKey="tabela:revisar-solicitacao-compra:itens"
            rotuloRolagem="Itens revisados"
          />
        </div>
      </div>

      {modalPreviewAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl shadow-2xl" style={{ background: 'var(--ui-surface)' }}>
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold">Pre-visualizacao do PDF</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Revise o documento antes de confirmar a criacao da solicitacao.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setModalPreviewAberto(false)}
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 bg-gray-100 p-3">
              <iframe
                title="Pre-visualizacao da solicitacao de compra"
                srcDoc={conteudoPreviewPdf}
                className="h-full w-full rounded-lg border border-[var(--c-border)] bg-white"
              />
            </div>
          </div>
        </div>
      )}

      <CompraPreviewModal preview={previewArquivo} onClose={() => setPreviewArquivo(null)} />
    </div>
  );
}
