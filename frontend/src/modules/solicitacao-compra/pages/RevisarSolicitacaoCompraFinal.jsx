import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { baixarPdfSolicitacaoCompra, obterUrlAssinadaCompra } from '../../../services/compras';
import CompraPreviewModal from '../components/CompraPreviewModal';
import { criarPreviewCompra } from '../utils/preview';

export default function RevisarSolicitacaoCompraFinal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [baixando, setBaixando] = useState(false);
  const [previewArquivo, setPreviewArquivo] = useState(null);
  const resultado = location.state?.resultado || null;
  const resumo = location.state?.resumo || null;

  const codigo = useMemo(
    () => resultado?.codigo || `SC-${String(id || '').padStart(5, '0')}`,
    [id, resultado]
  );

  async function handleAbrirPdf() {
    try {
      setBaixando(true);
      const blob = await baixarPdfSolicitacaoCompra(id);
      const url = window.URL.createObjectURL(blob);
      setPreviewArquivo(await criarPreviewCompra({
        title: `PDF da solicitacao ${codigo}`,
        name: `${codigo}.pdf`,
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

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Solicitacao de Compra Criada</h1>
        <p className="page-subtitle">
          O registro foi criado no modulo compras e ja gerou uma solicitacao no fluxo principal.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Confirmacao</h2>
          </div>

          <div className="grid gap-4 text-sm">
            <div>
              <div className="text-[var(--c-muted)]">Codigo principal</div>
              <div className="font-semibold">{codigo}</div>
            </div>
            <div>
              <div className="text-[var(--c-muted)]">ID da solicitacao de compra</div>
              <div className="font-semibold">{resultado?.id || id}</div>
            </div>
            <div>
              <div className="text-[var(--c-muted)]">Solicitacao principal vinculada</div>
              <div className="font-semibold">{resultado?.solicitacao_principal_id || '-'}</div>
            </div>
            <div>
              <div className="text-[var(--c-muted)]">Quantidade de itens</div>
              <div className="font-semibold">
                {resultado?.quantidade_itens || resumo?.itens?.length || 0}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={handleAbrirPdf} disabled={baixando}>
              {baixando ? 'Abrindo PDF...' : 'Abrir PDF'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/solicitacoes')}>
              Ir para solicitacoes
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/solicitacoes-compra/nova')}
            >
              Nova solicitacao
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Resumo enviado</h2>
          </div>

          {resumo ? (
            <div className="grid gap-4 text-sm">
              <div>
                <div className="text-[var(--c-muted)]">Obra</div>
                <div className="font-medium">{resumo.obra_nome || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Solicitante</div>
                <div className="font-medium">{resumo.solicitante_nome || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Itens</div>
                <ul className="grid gap-2">
                  {resumo.itens?.map((item, index) => (
                    <li
                      key={`${item.manual ? 'manual' : item.insumo_id}-${index}`}
                      className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2"
                    >
                      <div className="font-medium">{item.insumo_nome}</div>
                      <div className="text-[var(--c-muted)]">
                        {item.quantidade} {item.unidade_sigla || ''} - {item.apropriacao_label || '-'}
                      </div>
                      {(item.link_produto || item.arquivo_url) && (
                        <div className="mt-2 flex flex-wrap gap-3 text-xs">
                          {item.link_produto && (
                            <a
                              href={item.link_produto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Abrir link do produto
                            </a>
                          )}
                          {item.arquivo_url && (
                            <button
                              type="button"
                              className="text-blue-600 hover:underline"
                              onClick={() => handleAbrirArquivo(item)}
                            >
                              {item.arquivo_nome_original || 'Abrir arquivo'}
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[var(--c-muted)]">
              Resumo nao disponivel nesta navegacao. O PDF pode ser aberto normalmente.
            </div>
          )}
        </div>
      </div>

      <CompraPreviewModal preview={previewArquivo} onClose={() => setPreviewArquivo(null)} />
    </div>
  );
}
