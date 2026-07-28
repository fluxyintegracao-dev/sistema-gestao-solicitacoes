import { useMemo, useState } from 'react';
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineDocumentArrowUp,
  HiOutlineExclamationTriangle
} from 'react-icons/hi2';
import CrStatusPill from './CrStatusPill';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
}

function getItemDepth(item, itemById) {
  let depth = 0;
  let parentId = item.item_pai_id;
  const visited = new Set();
  while (parentId && itemById.has(parentId) && !visited.has(parentId) && depth < 8) {
    visited.add(parentId);
    depth += 1;
    parentId = itemById.get(parentId)?.item_pai_id;
  }
  return depth;
}

function Metric({ label, value, helper, tone }) {
  return (
    <div className="cr-plan-metric" data-tone={tone || 'default'}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}

export default function CrPlanoWorkspace({
  data,
  loading,
  error,
  canImport,
  canPublish,
  publishing,
  onReload,
  onSelectPlan,
  onOpenImport,
  onDownloadModel,
  onPublish
}) {
  const [justification, setJustification] = useState('');
  const plan = data?.plano_atual || null;
  const obra = data?.obra || null;
  const tolerance = Number(data?.configuracao?.tolerancia_divergencia_pct || 5);
  const divergence = Number(plan?.divergencia_macro_pct || 0);
  const requiresJustification = plan?.divergencia_macro_pct != null
    && Math.abs(divergence) > tolerance;
  const itemById = useMemo(
    () => new Map((plan?.itens || []).map((item) => [Number(item.id), item])),
    [plan?.itens]
  );

  if (loading) {
    return <section className="cr-section cr-empty-state">Carregando workspace da obra...</section>;
  }
  if (error) {
    return (
      <section className="cr-section">
        <div className="cr-feedback" data-tone="error">
          <div>
            <strong>Não foi possível abrir o workspace.</strong>
            <span>{error}</span>
          </div>
          <button type="button" className="btn btn-outline" onClick={onReload}>Tentar novamente</button>
        </div>
      </section>
    );
  }
  if (!obra) return null;

  return (
    <section className="cr-workspace">
      <div className="cr-workspace-heading">
        <div>
          <span>Workspace da obra</span>
          <h2>{obra.codigo || `OBRA ${obra.id}`} · {obra.nome}</h2>
          <p>
            O orçamento macro abaixo é somente leitura. As versões micro são independentes e
            gravadas exclusivamente nas tabelas do módulo.
          </p>
        </div>
        <div className="cr-workspace-actions">
          {canImport ? (
            <>
              <button type="button" className="btn btn-outline" onClick={onDownloadModel}>
                <HiOutlineArrowDownTray className="h-4 w-4" />
                Baixar modelo
              </button>
              <button type="button" className="btn btn-primary" onClick={onOpenImport}>
                <HiOutlineDocumentArrowUp className="h-4 w-4" />
                {plan ? 'Nova versão' : 'Importar estrutura'}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="cr-subtabs" role="tablist" aria-label="Workspace da obra">
        <button type="button" className="is-active" role="tab" aria-selected="true">
          Estrutura micro
        </button>
      </div>

      {!plan ? (
        <div className="cr-empty-state cr-empty-state--large">
          <HiOutlineDocumentArrowUp className="h-7 w-7" />
          <strong>Esta obra ainda não possui estrutura micro</strong>
          <span>Baixe o modelo, preencha a planilha e valide o arquivo antes da primeira importação.</span>
          {canImport ? (
            <button type="button" className="btn btn-primary" onClick={onOpenImport}>
              Iniciar importação
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="cr-plan-toolbar">
            <label className="cr-field">
              <span>Versão consultada</span>
              <select
                value={plan.id}
                onChange={(event) => onSelectPlan(Number(event.target.value))}
              >
                {(data.planos || []).map((version) => (
                  <option key={version.id} value={version.id}>
                    v{version.versao} · {version.situacao}
                  </option>
                ))}
              </select>
            </label>
            <div className="cr-plan-state">
              <span>Situação</span>
              <CrStatusPill status={plan.situacao} />
            </div>
            <div className="cr-plan-state">
              <span>Importada em</span>
              <strong>{formatDate(plan.createdAt)}</strong>
            </div>
            <button type="button" className="btn btn-outline cr-reload-button" onClick={onReload}>
              <HiOutlineArrowPath className="h-4 w-4" />
              Atualizar
            </button>
          </div>

          <div className="cr-plan-metrics">
            <Metric label="Total micro" value={formatCurrency(plan.total_micro)} helper="Itens de custo" />
            <Metric
              label="Referência macro"
              value={formatCurrency(
                (data.macros || [])
                  .filter((macro) => !macro.somadora)
                  .reduce((total, macro) => total + Number(macro.valor_orcado || 0), 0)
              )}
              helper="Cadastro de Obras"
            />
            <Metric
              label="Divergência"
              value={plan.divergencia_macro_pct == null ? '-' : `${divergence.toFixed(2)}%`}
              helper={`Tolerância operacional: ${tolerance}%`}
              tone={requiresJustification ? 'warning' : 'success'}
            />
            <Metric
              label="Itens"
              value={String((plan.itens || []).length)}
              helper="Linhas da versão"
            />
          </div>

          {plan.situacao === 'RASCUNHO' && canPublish ? (
            <div className="cr-publish-strip" data-warning={requiresJustification ? 'true' : undefined}>
              <div>
                {requiresJustification
                  ? <HiOutlineExclamationTriangle className="h-5 w-5" />
                  : <HiOutlineCheckCircle className="h-5 w-5" />}
                <div>
                  <strong>
                    {requiresJustification
                      ? 'Divergência acima da tolerância'
                      : 'Rascunho pronto para conferência'}
                  </strong>
                  <span>
                    Publicar torna esta versão vigente e substitui a versão publicada anterior,
                    sem alterar competências finalizadas.
                  </span>
                </div>
              </div>
              {requiresJustification ? (
                <label className="cr-field">
                  <span>Justificativa obrigatória</span>
                  <textarea
                    rows="2"
                    value={justification}
                    onChange={(event) => setJustification(event.target.value)}
                    placeholder="Explique a diferença entre o total micro e a referência macro"
                  />
                </label>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                disabled={publishing || (requiresJustification && !justification.trim())}
                onClick={() => onPublish(plan.id, justification)}
              >
                {publishing ? 'Publicando...' : 'Publicar versão'}
              </button>
            </div>
          ) : null}

          <div className="cr-structure-grid">
            <div className="cr-structure-main">
              <div className="cr-block-heading">
                <div>
                  <h3>Estrutura micro da versão v{plan.versao}</h3>
                  <p>Quantidade, custo unitário e vínculo macro recalculados pelo backend.</p>
                </div>
              </div>
              <div className="cr-table-shell cr-desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Código / descrição</th>
                      <th>Unidade</th>
                      <th className="text-right">Quantidade</th>
                      <th className="text-right">Custo unitário</th>
                      <th className="text-right">Total</th>
                      <th>Etapa macro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(plan.itens || []).map((item) => {
                      const macro = item.vinculos_macro?.[0]?.apropriacao;
                      const depth = getItemDepth(item, itemById);
                      return (
                        <tr key={item.id} data-sum={item.somadora ? 'true' : undefined}>
                          <td style={{ paddingLeft: `${16 + depth * 18}px` }}>
                            <strong>{item.codigo}</strong>
                            <span>{item.descricao}</span>
                          </td>
                          <td>{item.unidade || '-'}</td>
                          <td className="text-right">{item.somadora ? '-' : item.quantidade.toLocaleString('pt-BR')}</td>
                          <td className="text-right">{item.somadora ? '-' : formatCurrency(item.custo_unitario)}</td>
                          <td className="text-right"><strong>{item.somadora ? '-' : formatCurrency(item.valor_total)}</strong></td>
                          <td>
                            {macro ? (
                              <>
                                <strong>{macro.codigo}</strong>
                                <span>{macro.descricao || '-'}</span>
                              </>
                            ) : (
                              <span className="cr-link-missing">Sem vínculo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="cr-mobile-list">
                {(plan.itens || []).map((item) => {
                  const macro = item.vinculos_macro?.[0]?.apropriacao;
                  return (
                    <article className="cr-mobile-record" key={item.id}>
                      <div>
                        <span className="text-xs font-semibold uppercase text-[var(--c-muted)]">{item.codigo}</span>
                        <h4 className="mt-1 text-sm font-bold text-[var(--c-text)]">{item.descricao}</h4>
                      </div>
                      <dl className="cr-mobile-record-grid">
                        <div><dt>Unidade</dt><dd>{item.unidade || '-'}</dd></div>
                        <div><dt>Quantidade</dt><dd>{item.somadora ? '-' : item.quantidade.toLocaleString('pt-BR')}</dd></div>
                        <div><dt>Custo unitário</dt><dd>{item.somadora ? '-' : formatCurrency(item.custo_unitario)}</dd></div>
                        <div><dt>Total</dt><dd>{item.somadora ? '-' : formatCurrency(item.valor_total)}</dd></div>
                      </dl>
                      <div className="cr-mobile-macro">
                        <span>Etapa macro</span>
                        <strong>{macro ? `${macro.codigo} · ${macro.descricao || ''}` : 'Sem vínculo'}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="cr-macro-reference">
              <div className="cr-block-heading">
                <div>
                  <h3>Referência macro</h3>
                  <p>Leitura direta de Obras. Nenhuma edição é feita aqui.</p>
                </div>
              </div>
              <div className="cr-macro-list">
                {(data.macros || []).length === 0 ? (
                  <div className="cr-empty-state">Nenhuma apropriação macro ativa.</div>
                ) : (data.macros || []).map((macro) => (
                  <div key={macro.id} className="cr-macro-row" data-sum={macro.somadora ? 'true' : undefined}>
                    <div>
                      <strong>{macro.codigo}</strong>
                      <span>{macro.descricao || 'Sem descrição'}</span>
                    </div>
                    <b>{formatCurrency(macro.valor_orcado)}</b>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
