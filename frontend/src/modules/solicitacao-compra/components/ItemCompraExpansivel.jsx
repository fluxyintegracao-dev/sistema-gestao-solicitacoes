import { Fragment, useState } from 'react';
import { HiOutlineChevronDown, HiOutlineDocumentArrowDown, HiOutlineLink } from 'react-icons/hi2';
import { fileUrl } from '../../../services/api';
import TratamentoItemManual from './TratamentoItemManual';

function statusCatalogacao(item) {
  if (item.tipo !== 'MANUAL') return { label: 'Cadastro oficial', className: 'is-official' };
  if (item.insumo_catalogado_id) return { label: 'Catalogado', className: 'is-cataloged' };
  return { label: 'Pendente de cadastro', className: 'is-pending' };
}

export default function ItemCompraExpansivel({
  item,
  index,
  solicitacaoId,
  podeEditarQuantidade,
  podeEditarApropriacao,
  podeCatalogar,
  bloqueado,
  salvandoQuantidade,
  salvandoApropriacao,
  onEditarQuantidade,
  onEditarApropriacao,
  onCatalogado
}) {
  const [aberto, setAberto] = useState(false);
  const status = statusCatalogacao(item);
  const detalheId = `compra-item-detalhe-${item.item_tipo}-${item.id}`;

  return (
    <Fragment>
      <tr className={`compra-item-table-row ${aberto ? 'is-open' : ''}`}>
        <td className="compra-item-cell-index">
          <span className="compra-item-index">{String(index + 1).padStart(2, '0')}</span>
        </td>
        <td>
          <span className={`compra-item-origin ${item.tipo === 'MANUAL' ? 'is-manual' : ''}`}>{item.tipo}</span>
        </td>
        <td className="compra-item-cell-main">
          <strong>{item.nome}</strong>
          <small>{item.especificacao || 'Sem especificacao adicional'}</small>
        </td>
        <td className="compra-item-cell-quantity">
          <strong>{item.quantidade}</strong>
          <small>{item.unidade}</small>
        </td>
        <td className="compra-item-cell-apropriacao" title={item.apropriacao}>{item.apropriacao}</td>
        <td className="compra-item-cell-date">{item.necessario_para_formatado}</td>
        <td>
          <span className={`compra-item-catalog-status ${status.className}`}>{status.label}</span>
        </td>
        <td className="compra-item-cell-toggle">
          <button
            type="button"
            className="compra-item-toggle"
            onClick={() => setAberto((atual) => !atual)}
            aria-expanded={aberto}
            aria-controls={detalheId}
            aria-label={`${aberto ? 'Recolher' : 'Expandir'} detalhes de ${item.nome}`}
            title={aberto ? 'Recolher detalhes' : 'Expandir detalhes'}
          >
            <HiOutlineChevronDown className="compra-item-chevron" aria-hidden="true" />
          </button>
        </td>
      </tr>

      {aberto ? (
        <tr className="compra-item-table-detail-row">
          <td colSpan={8}>
            <div id={detalheId} className="compra-item-table-detail">
              <div className="compra-item-expanded-head">
                <div className="compra-item-expanded-spec">
                  <span>Especificacao do item</span>
                  <strong>{item.especificacao || 'Sem especificacao adicional'}</strong>
                </div>

                <div className="compra-item-inline-actions">
                  {podeEditarQuantidade && !bloqueado ? (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => onEditarQuantidade(item)} disabled={salvandoQuantidade}>
                      {salvandoQuantidade ? 'Salvando quantidade...' : 'Editar quantidade'}
                    </button>
                  ) : null}
                  {podeEditarApropriacao && !bloqueado ? (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => onEditarApropriacao(item)} disabled={salvandoApropriacao}>
                      {salvandoApropriacao ? 'Salvando apropriacao...' : 'Editar apropriacao'}
                    </button>
                  ) : null}
                  {item.link_produto ? (
                    <a className="btn btn-outline btn-sm" href={item.link_produto} target="_blank" rel="noreferrer">
                      <HiOutlineLink aria-hidden="true" /> Abrir link
                    </a>
                  ) : null}
                  {item.arquivo_url ? (
                    <a className="btn btn-outline btn-sm" href={fileUrl(item.arquivo_url)} target="_blank" rel="noreferrer">
                      <HiOutlineDocumentArrowDown aria-hidden="true" /> {item.arquivo_nome_original || 'Abrir anexo'}
                    </a>
                  ) : null}
                </div>
              </div>

              {item.tipo === 'MANUAL' && item.insumoCatalogado ? (
                <div className="compra-item-cataloged-banner">
                  <span>Cadastro oficial vinculado</span>
                  <strong>{item.insumoCatalogado.codigo || `ID ${item.insumoCatalogado.id}`} — {item.insumoCatalogado.nome}</strong>
                  <small>O item original desta solicitacao continua preservado.</small>
                </div>
              ) : null}

              {aberto && item.tipo === 'MANUAL' && podeCatalogar ? (
                <TratamentoItemManual item={item} solicitacaoId={solicitacaoId} onCatalogado={onCatalogado} />
              ) : null}

              {item.tipo === 'MANUAL' && !podeCatalogar && !item.insumo_catalogado_id ? (
                <div className="compra-item-permission-note">Item pendente de cadastro. Somente usuarios com permissao de catalogacao podem trata-lo.</div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}
