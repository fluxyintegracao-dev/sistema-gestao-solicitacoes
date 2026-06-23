import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { criarSolicitacaoCompra, criarSolicitacaoCompraDireta, obterUrlAssinadaCompra } from '../../../services/compras';
import CompraPreviewModal from '../components/CompraPreviewModal';
import { criarPreviewCompra } from '../utils/preview';
import { montarLinhasResumoApropriacao, montarTextoResumoApropriacao } from '../utils/apropriacoes';

const DRAFT_KEY = 'fluxy_solicitacao_compra_draft';
const DRAFT_COMPRA_DIRETA_KEY = 'fluxy_compra_direta_draft';

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
  const draftKey = modoCompraDireta ? DRAFT_COMPRA_DIRETA_KEY : DRAFT_KEY;
  const [draft, setDraft] = useState(null);
  const [confirmado, setConfirmado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewVisualizado, setPreviewVisualizado] = useState(false);
  const [modalPreviewAberto, setModalPreviewAberto] = useState(false);
  const [previewArquivo, setPreviewArquivo] = useState(null);

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(draftKey);
      if (!salvo) {
        navigate(modoCompraDireta ? '/solicitacoes-compra-direta/nova' : '/solicitacoes-compra/nova', { replace: true });
        return;
      }

      const dados = JSON.parse(salvo);
      if (!dados?.payload?.obra_id || !Array.isArray(dados?.payload?.itens) || !dados.payload.itens.length) {
        window.localStorage.removeItem(draftKey);
        navigate(modoCompraDireta ? '/solicitacoes-compra-direta/nova' : '/solicitacoes-compra/nova', { replace: true });
        return;
      }

      setDraft(dados);
    } catch (error) {
      console.error(error);
      window.localStorage.removeItem(draftKey);
      navigate(modoCompraDireta ? '/solicitacoes-compra-direta/nova' : '/solicitacoes-compra/nova', { replace: true });
    }
  }, [draftKey, modoCompraDireta, navigate]);

  const itensResumo = useMemo(() => draft?.resumo?.itens || [], [draft]);
  const totalItens = itensResumo.length;

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
          <td>${escapeHtml(item.especificacao || '-')}</td>
          <td>${montarLinhasResumoApropriacao(item).map((linha) => escapeHtml(linha)).join('<br />') || '-'}</td>
          <td>${escapeHtml(formatarData(item.necessario_para))}</td>
          <td>${escapeHtml(item.link_produto || '-')}</td>
          <td>${escapeHtml(item.arquivo_nome_original || '-')}</td>
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
          ${modoCompraDireta ? `<div class="meta"><strong>Valor total:</strong> ${escapeHtml(formatarMoeda(draft.resumo?.valor_total))}</div>` : ''}
          <div class="meta"><strong>Necessario para:</strong> ${escapeHtml(
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
                <th>Especificacao</th>
                <th>Apropriacao</th>
                <th>Necessario para</th>
                <th>Link</th>
                <th>Arquivo</th>
              </tr>
            </thead>
            <tbody>${itensHtml}</tbody>
          </table>
        </body>
      </html>
    `;
  }, [draft, itensResumo, modoCompraDireta]);

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
      window.localStorage.removeItem(draftKey);
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
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
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
                  titulo="Total"
                  valor={formatarMoeda(draft.resumo?.valor_total)}
                  detalhe="Valor que sera levado para a solicitacao"
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
            <LinhaResumo
              titulo="Necessario para"
              valor={textoOuPadrao(formatarData(draft.payload?.necessario_para))}
            />
            <LinhaResumo titulo="Link geral" valor={textoOuPadrao(draft.payload?.link_geral)} className="break-all" />
            {modoCompraDireta && (
              <>
                <LinhaResumo titulo="Valor total" valor={formatarMoeda(draft.resumo?.valor_total)} />
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

          <div className="overflow-hidden rounded-2xl border border-[var(--c-border)]">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-slate-100 text-[11px] uppercase tracking-[0.16em] text-[var(--c-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Quantidade</th>
                    {modoCompraDireta && <th className="px-4 py-3 font-semibold">Valor</th>}
                    <th className="px-4 py-3 font-semibold">Apropriacao</th>
                    <th className="px-4 py-3 font-semibold">Necessario para</th>
                    <th className="px-4 py-3 font-semibold">Especificacao</th>
                    <th className="px-4 py-3 font-semibold">Acessos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--c-border)]">
                  {itensResumo.map((item, index) => (
                    <tr key={`${item.manual ? 'manual' : item.insumo_id}-${index}`} className="align-top">
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-[var(--c-border)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          {item.manual && (
                            <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                              Manual
                            </span>
                          )}
                        </div>
                        <div className="mt-2 max-w-[240px] font-semibold text-[var(--c-text)]">{item.insumo_nome}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-[var(--c-text)]">
                        {item.quantidade} {item.unidade_sigla || '-'}
                      </td>
                      {modoCompraDireta && (
                        <td className="px-4 py-4 whitespace-nowrap text-[var(--c-text)]">
                          <div>{formatarMoeda(item.valor_unitario)} un.</div>
                          <div className="mt-1 font-semibold">{formatarMoeda(item.valor_total)}</div>
                        </td>
                      )}
                      <td className="px-4 py-4 max-w-[220px] text-[var(--c-muted)]">
                        {montarTextoResumoApropriacao(item)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-semibold text-[var(--c-text)]">
                        {formatarData(item.necessario_para)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[320px] whitespace-pre-wrap text-[var(--c-text)]">
                          {textoOuPadrao(item.especificacao)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[180px] flex-wrap gap-2">
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
                              className="inline-flex max-w-[180px] rounded-lg border border-[var(--c-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--c-text)] transition hover:border-[var(--c-primary)] hover:text-[var(--c-primary)]"
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
