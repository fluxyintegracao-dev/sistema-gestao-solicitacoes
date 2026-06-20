import { useState } from 'react';
import PreviewAnexoModal from './PreviewAnexoModal';
import { API_URL, authHeaders, fileUrl } from '../../services/api';

export default function Timeline({ historicos, canRemoveAnexo = false, onAnexoRemovido }) {
  const [preview, setPreview] = useState(null);
  const historicosVisiveis = Array.isArray(historicos)
    ? historicos.filter((h) => !['PENDENCIA_FINANCEIRA_MARCADA', 'PENDENCIA_FINANCEIRA_REGULARIZADA'].includes(h?.acao))
    : [];

  function normalizarUrlArquivo(url) {
    const valor = String(url || '');
    if (!valor.startsWith('http')) return valor;

    // Corrige anexos antigos salvos com '%' literal no nome.
    return valor.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
  }

  async function obterUrlAssinada(caminhoArquivo) {
    if (!caminhoArquivo) return null;
    if (!String(caminhoArquivo).startsWith('http')) {
      return fileUrl(caminhoArquivo);
    }

    const caminhoNormalizado = normalizarUrlArquivo(caminhoArquivo);

    try {
      const res = await fetch(
        `${API_URL}/anexos/presign?url=${encodeURIComponent(caminhoNormalizado)}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error('Falha ao assinar URL');
      const data = await res.json();
      return data?.url || caminhoNormalizado;
    } catch (error) {
      console.error(error);
      return caminhoNormalizado;
    }
  }

  async function baixarArquivo(caminhoArquivo, nomeArquivo) {
    try {
      const urlArquivo = await obterUrlAssinada(caminhoArquivo);
      const response = await fetch(urlArquivo);
      if (!response.ok) throw new Error('Falha ao baixar arquivo');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo || 'arquivo';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Erro ao baixar arquivo');
    }
  }

  async function baixarPedidoCompraPdf(pedidoCompraId, codigoPedido) {
    try {
      const response = await fetch(`${API_URL}/compras/pedidos/${pedidoCompraId}/pdf`, {
        headers: authHeaders()
      });
      if (!response.ok) throw new Error('Falha ao baixar pedido de compra');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${codigoPedido || `PC-${String(pedidoCompraId).padStart(5, '0')}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao baixar pedido de compra');
    }
  }

  async function removerAnexo(historicoId) {
    const confirmar = window.confirm('Deseja remover este anexo do historico?');
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/anexos/historico/${historicoId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao remover anexo');
      }

      if (typeof onAnexoRemovido === 'function') {
        onAnexoRemovido();
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao remover anexo');
    }
  }

  return (
    <div className="sol-detail-card">
      <h2 className="sol-detail-card-title">Historico</h2>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {historicosVisiveis.map(h => {
          let meta = null;
          try {
            meta = h.metadata ? JSON.parse(h.metadata) : null;
          } catch {
            meta = null;
          }

          const acaoLabel = {
            NUMERO_PEDIDO_ATUALIZADO: 'Número do pedido atualizado',
            PEDIDO_COMPRA_GERADO: 'Pedido de compra gerado',
            PEDIDO_COMPRA_STATUS_ALTERADO: 'Status do pedido de compra alterado',
            PEDIDO_COMPRA_ENCERRADO: 'Pedido de compra encerrado/cancelado'
          }[h.acao] || h.acao;
          const atorNome = meta?.ator_nome || null;
          const responsavelNome = meta?.responsavel_nome || h.usuario?.nome || null;
          const caminhoArquivo = meta?.caminho || null;
          const podeExibirArquivo = ['ANEXO_ADICIONADO', 'COMPROVANTE_ADICIONADO'].includes(h.acao);
          const pedidoCompraId = meta?.pedido_compra_id || null;
          const pedidoCompraCodigo = meta?.pedido_compra_codigo || (pedidoCompraId ? `PC-${String(pedidoCompraId).padStart(5, '0')}` : null);

          return (
            <div key={h.id} className="sol-detail-timeline-item">
              <p className="text-sm font-semibold">{acaoLabel}</p>

              {(h.status_anterior || h.status_novo) && (
                <p className="text-sm" style={{ color: 'var(--c-text)' }}>
                  Status: {h.status_anterior || '-'} {'->'} {h.status_novo || '-'}
                </p>
              )}

              {h.acao === 'RESPONSAVEL_ATRIBUIDO' && (
                <p className="text-sm" style={{ color: 'var(--c-text)' }}>
                  {atorNome ? `${atorNome} atribuiu` : 'Responsavel atribuido'}
                  {responsavelNome ? ` para ${responsavelNome}` : ''}
                </p>
              )}

              {h.acao === 'RESPONSAVEL_ASSUMIU' && (
                <p className="text-sm" style={{ color: 'var(--c-text)' }}>
                  {atorNome ? `${atorNome} assumiu a solicitacao` : 'Responsavel assumiu a solicitacao'}
                </p>
              )}

              {h.acao === 'ENVIADA_SETOR' && h.observacao && (
                <p className="sol-detail-timeline-text text-sm">{h.observacao}</p>
              )}

              {h.descricao && <p className="sol-detail-timeline-text text-sm">{h.descricao}</p>}

              {pedidoCompraId && (
                <div className="flex flex-wrap gap-3 mt-1">
                  <button
                    type="button"
                    className="text-sm"
                    style={{ color: 'var(--c-primary)' }}
                    onClick={() => {
                      window.location.href = `/pedidos-compra/${pedidoCompraId}`;
                    }}
                  >
                    Visualizar {pedidoCompraCodigo}
                  </button>
                  <button
                    type="button"
                    className="text-sm"
                    style={{ color: 'var(--c-primary)' }}
                    onClick={() => baixarPedidoCompraPdf(pedidoCompraId, pedidoCompraCodigo)}
                  >
                    Download
                  </button>
                </div>
              )}

              {podeExibirArquivo && meta && caminhoArquivo && (
                <div className="flex gap-3 mt-1">
                  <button
                    className="text-sm" style={{ color: 'var(--c-primary)' }}
                    onClick={async () => {
                      const urlArquivo = await obterUrlAssinada(caminhoArquivo);
                      setPreview({
                        nome: h.descricao,
                        caminho: caminhoArquivo,
                        url: urlArquivo
                      });
                    }}
                    type="button"
                  >
                    Visualizar
                  </button>

                  <button
                    type="button"
                    className="text-sm" style={{ color: 'var(--c-primary)' }}
                    onClick={async e => {
                      e.preventDefault();
                      e.stopPropagation();
                      await baixarArquivo(caminhoArquivo, h.descricao);
                    }}
                  >
                    Download
                  </button>

                  {canRemoveAnexo && (
                    <button
                      type="button"
                      className="text-blue-700 text-sm"
                      onClick={() => removerAnexo(h.id)}
                    >
                      Remover
                    </button>
                  )}
                </div>
              )}

              <span className="sol-detail-timeline-meta">
                {h.usuario?.nome || '-'} | {new Date(h.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
          );
        })}
      </div>

      {preview && (
        <PreviewAnexoModal
          anexo={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
