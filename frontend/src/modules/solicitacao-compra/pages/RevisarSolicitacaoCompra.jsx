import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { criarSolicitacaoCompra } from '../../../services/compras';

const DRAFT_KEY = 'fluxy_solicitacao_compra_draft';

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

export default function RevisarSolicitacaoCompra() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [confirmado, setConfirmado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewVisualizado, setPreviewVisualizado] = useState(false);

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(DRAFT_KEY);
      if (!salvo) {
        navigate('/solicitacoes-compra/nova', { replace: true });
        return;
      }

      const dados = JSON.parse(salvo);
      if (!dados?.payload?.obra_id || !Array.isArray(dados?.payload?.itens) || !dados.payload.itens.length) {
        window.localStorage.removeItem(DRAFT_KEY);
        navigate('/solicitacoes-compra/nova', { replace: true });
        return;
      }

      setDraft(dados);
    } catch (error) {
      console.error(error);
      window.localStorage.removeItem(DRAFT_KEY);
      navigate('/solicitacoes-compra/nova', { replace: true });
    }
  }, [navigate]);

  const totalItens = useMemo(() => draft?.payload?.itens?.length || 0, [draft]);

  function abrirPreviaPdf() {
    if (!draft) {
      return;
    }

    const itensHtml = (draft.resumo?.itens || [])
      .map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.insumo_nome || '-')}</td>
          <td>${escapeHtml(item.unidade_sigla || '-')}</td>
          <td>${escapeHtml(item.quantidade || '-')}</td>
          <td>${escapeHtml(item.especificacao || '-')}</td>
          <td>${escapeHtml(item.apropriacao_label || '-')}</td>
          <td>${escapeHtml(formatarData(item.necessario_para))}</td>
          <td>${escapeHtml(item.link_produto || '-')}</td>
        </tr>
      `)
      .join('');

    const conteudo = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Pré-visualização - Solicitação de Compra</title>
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
          <h1>Solicitação de Compra</h1>
          <div class="meta"><strong>Obra:</strong> ${escapeHtml(draft.resumo?.obra_nome || '-')}</div>
          <div class="meta"><strong>Solicitante:</strong> ${escapeHtml(draft.resumo?.solicitante_nome || '-')}</div>
          <div class="meta"><strong>Necessário para:</strong> ${escapeHtml(formatarData(draft.payload?.necessario_para))}</div>
          <div class="meta"><strong>Observações:</strong> ${escapeHtml(draft.payload?.observacoes || '-')}</div>
          <div class="meta"><strong>Link geral:</strong> ${escapeHtml(draft.payload?.link_geral || '-')}</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Insumo</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                <th>Especificação</th>
                <th>Apropriação</th>
                <th>Necessário para</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>${itensHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const janela = window.open('', '_blank', 'noopener,noreferrer');
    if (!janela) {
      alert('O navegador bloqueou a pré-visualização. Libere pop-ups para continuar.');
      return;
    }

    janela.document.open();
    janela.document.write(conteudo);
    janela.document.close();
    janela.focus();
    setPreviewVisualizado(true);
  }

  async function handleConfirmar() {
    if (!draft) {
      return;
    }

    if (!confirmado) {
      alert('Confirme que revisou os dados antes de criar a solicitação.');
      return;
    }

    if (!previewVisualizado) {
      alert('Abra a pré-visualização do PDF antes de confirmar a criação da solicitação.');
      return;
    }

    try {
      setLoading(true);
      const resposta = await criarSolicitacaoCompra(draft.payload);
      window.localStorage.removeItem(DRAFT_KEY);
      navigate(`/solicitacoes-compra/finalizada/${resposta.id}`, {
        replace: true,
        state: {
          resultado: resposta,
          resumo: draft.resumo
        }
      });
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao criar solicitação de compra');
    } finally {
      setLoading(false);
    }
  }

  if (!draft) {
    return null;
  }

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Revisar Solicitação de Compra</h1>
        <p className="page-subtitle">
          Confira os dados, abra a pré-visualização do PDF e confirme antes de criar a solicitação.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Resumo</h2>
          </div>

          <div className="grid gap-4 text-sm">
            <div>
              <div className="text-[var(--c-muted)]">Obra</div>
              <div className="font-medium">{draft.resumo?.obra_nome || '-'}</div>
            </div>
            <div>
              <div className="text-[var(--c-muted)]">Solicitante</div>
              <div className="font-medium">{draft.resumo?.solicitante_nome || '-'}</div>
            </div>
            <div>
              <div className="text-[var(--c-muted)]">Necessário para</div>
              <div className="font-medium">{formatarData(draft.payload?.necessario_para)}</div>
            </div>
            <div>
              <div className="text-[var(--c-muted)]">Itens</div>
              <div className="font-medium">{totalItens}</div>
            </div>
            <div>
              <div className="text-[var(--c-muted)]">Observações</div>
              <div className="whitespace-pre-wrap">{draft.payload?.observacoes || '-'}</div>
            </div>
            <div>
              <div className="text-[var(--c-muted)]">Link geral</div>
              <div className="break-all">{draft.payload?.link_geral || '-'}</div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline mt-6"
            onClick={abrirPreviaPdf}
          >
            {previewVisualizado ? 'Pré-visualização aberta' : 'Visualizar PDF antes de confirmar'}
          </button>

          <label className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(event) => setConfirmado(event.target.checked)}
            />
            <span className="text-sm">
              Confirmo que revisei os dados e autorizo a criação da solicitação de compra.
            </span>
          </label>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/solicitacoes-compra/nova')}>
              Voltar e editar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirmar} disabled={loading}>
              {loading ? 'Criando...' : 'Criar solicitação'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Itens revisados</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Insumo</th>
                  <th>Unidade</th>
                  <th>Quantidade</th>
                  <th>Especificação</th>
                  <th>Apropriação</th>
                  <th>Necessário para</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {draft.resumo.itens.map((item, index) => (
                  <tr key={`${item.manual ? 'manual' : item.insumo_id}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{item.insumo_nome}</td>
                    <td>{item.unidade_sigla || '-'}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.especificacao || '-'}</td>
                    <td>{item.apropriacao_label || '-'}</td>
                    <td>{formatarData(item.necessario_para)}</td>
                    <td className="max-w-[220px] break-all">{item.link_produto || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
