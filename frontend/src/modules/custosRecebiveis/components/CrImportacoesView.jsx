import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineArrowDownTray,
  HiOutlineCheckCircle,
  HiOutlineDocumentArrowUp,
  HiOutlineExclamationCircle
} from 'react-icons/hi2';
import CrStatusPill from './CrStatusPill';

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

function PreviewSummary({ preview }) {
  if (!preview) return null;
  const summary = preview.summary || {};
  const hasErrors = Number(summary.linhas_rejeitadas || 0) > 0;
  return (
    <div className="cr-preview" data-status={hasErrors ? 'error' : 'success'}>
      <div className="cr-preview-heading">
        {hasErrors
          ? <HiOutlineExclamationCircle className="h-5 w-5" />
          : <HiOutlineCheckCircle className="h-5 w-5" />}
        <div>
          <strong>{hasErrors ? 'A planilha precisa de correções' : 'Validação concluída'}</strong>
          <span>
            {hasErrors
              ? 'Corrija as linhas rejeitadas e valide o arquivo novamente.'
              : 'O arquivo pode ser importado como uma nova versão em rascunho.'}
          </span>
        </div>
      </div>
      <div className="cr-preview-metrics">
        <div><span>Lidas</span><strong>{summary.linhas_total || 0}</strong></div>
        <div><span>Válidas</span><strong>{summary.linhas_validas || 0}</strong></div>
        <div><span>Rejeitadas</span><strong>{summary.linhas_rejeitadas || 0}</strong></div>
        <div>
          <span>Divergência</span>
          <strong>
            {summary.divergencia_macro_pct == null
              ? '-'
              : `${Number(summary.divergencia_macro_pct).toFixed(2)}%`}
          </strong>
        </div>
      </div>
      {preview.errors?.length ? (
        <div className="cr-validation-errors">
          <div className="cr-validation-errors-heading">Erros encontrados</div>
          {preview.errors.slice(0, 50).map((error, index) => (
            <div key={`${error.linha}-${error.campo}-${index}`}>
              <strong>Linha {error.linha}</strong>
              <span>{error.campo ? `${error.campo}: ` : ''}{error.mensagem}</span>
            </div>
          ))}
          {preview.errors.length > 50 ? (
            <div><span>Mais {preview.errors.length - 50} erro(s) não exibido(s).</span></div>
          ) : null}
        </div>
      ) : null}
      {preview.warnings?.length ? (
        <div className="cr-validation-warnings">
          <strong>{preview.warnings.length} aviso(s)</strong>
          <span>Itens sem vínculo macro podem ser importados, mas bloqueiam a publicação.</span>
        </div>
      ) : null}
    </div>
  );
}

export default function CrImportacoesView({
  obra,
  data,
  canImport,
  validating,
  importing,
  feedback,
  onDownloadModel,
  onValidate,
  onImport,
  onOpenPlan
}) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const hasPreviousPlan = (data?.planos || []).length > 0;
  const canConfirmImport = Boolean(
    preview
    && Number(preview.summary?.linhas_rejeitadas || 0) === 0
    && file
    && (!hasPreviousPlan || reason.trim())
  );

  const importsByPlan = useMemo(
    () => new Map((data?.importacoes || []).map((item) => [Number(item.plano_id), item])),
    [data?.importacoes]
  );

  useEffect(() => {
    setFile(null);
    setReason('');
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }, [obra?.id]);

  async function handleValidate() {
    if (!file) return;
    const result = await onValidate(file);
    setPreview(result || null);
  }

  async function handleImport() {
    if (!canConfirmImport) return;
    const result = await onImport(file, reason);
    if (result) {
      setPreview(null);
      setFile(null);
      setReason('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (!obra) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <HiOutlineDocumentArrowUp className="h-7 w-7" />
        <strong>Selecione uma obra</strong>
        <span>Use o seletor de contexto acima para consultar ou importar versões da estrutura micro.</span>
      </section>
    );
  }

  return (
    <div className="cr-import-layout">
      <section className="cr-section">
        <div className="cr-section-heading">
          <div>
            <h2>Nova importação</h2>
            <p>Valide primeiro. A importação só cria uma nova versão após a conferência do arquivo.</p>
          </div>
          {canImport ? (
            <button type="button" className="btn btn-outline" onClick={onDownloadModel}>
              <HiOutlineArrowDownTray className="h-4 w-4" />
              Baixar modelo
            </button>
          ) : null}
        </div>

        {!canImport ? (
          <div className="cr-feedback" data-tone="warning">
            Você possui acesso de leitura, mas não tem permissão para importar estruturas.
          </div>
        ) : (
          <div className="cr-import-form">
            <label className="cr-field cr-file-field">
              <span>Arquivo .xlsx</span>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setPreview(null);
                }}
              />
              <small>{file ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB` : 'Limite de 10 MB'}</small>
            </label>
            <label className="cr-field">
              <span>
                Motivo da versão
                {hasPreviousPlan ? ' *' : ''}
              </span>
              <textarea
                rows="3"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={hasPreviousPlan
                  ? 'Explique por que uma nova versão está sendo criada'
                  : 'Opcional na primeira importação'}
              />
            </label>
            <div className="cr-import-actions">
              <button
                type="button"
                className="btn btn-outline"
                disabled={!file || validating || importing}
                onClick={handleValidate}
              >
                {validating ? 'Validando...' : 'Validar arquivo'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canConfirmImport || validating || importing}
                onClick={handleImport}
              >
                <HiOutlineDocumentArrowUp className="h-4 w-4" />
                {importing ? 'Importando...' : 'Importar como rascunho'}
              </button>
            </div>
          </div>
        )}

        {feedback ? (
          <div className="cr-feedback mt-4" data-tone={feedback.tone || 'info'}>
            {feedback.message}
          </div>
        ) : null}
        <PreviewSummary preview={preview} />
      </section>

      <section className="cr-section">
        <div className="cr-section-heading">
          <div>
            <h2>Histórico de versões</h2>
            <p>Cada reimportação preserva as versões anteriores e sua trilha de origem.</p>
          </div>
        </div>
        {(data?.planos || []).length === 0 ? (
          <div className="cr-empty-state">Nenhuma versão importada para esta obra.</div>
        ) : (
          <>
            <div className="cr-table-shell cr-desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>Versão</th>
                    <th>Arquivo</th>
                    <th>Importado por</th>
                    <th>Data</th>
                    <th>Linhas</th>
                    <th>Situação</th>
                    <th aria-label="Ação" />
                  </tr>
                </thead>
                <tbody>
                  {(data.planos || []).map((plan) => {
                    const importInfo = importsByPlan.get(Number(plan.id));
                    return (
                      <tr key={plan.id}>
                        <td><strong>v{plan.versao}</strong></td>
                        <td>{importInfo?.arquivo_nome || '-'}</td>
                        <td>{importInfo?.usuario?.nome || '-'}</td>
                        <td>{formatDate(importInfo?.createdAt || plan.createdAt)}</td>
                        <td>
                          {importInfo
                            ? `${importInfo.linhas_validas}/${importInfo.linhas_total}`
                            : '-'}
                        </td>
                        <td><CrStatusPill status={plan.situacao} /></td>
                        <td className="text-right">
                          <button type="button" className="btn btn-outline" onClick={() => onOpenPlan(plan.id)}>
                            Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="cr-mobile-list">
              {(data.planos || []).map((plan) => {
                const importInfo = importsByPlan.get(Number(plan.id));
                return (
                  <article className="cr-mobile-record" key={plan.id}>
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-base text-[var(--c-text)]">Versão v{plan.versao}</strong>
                      <CrStatusPill status={plan.situacao} />
                    </div>
                    <dl className="cr-mobile-record-grid">
                      <div><dt>Arquivo</dt><dd>{importInfo?.arquivo_nome || '-'}</dd></div>
                      <div><dt>Linhas válidas</dt><dd>{importInfo?.linhas_validas ?? '-'}</dd></div>
                      <div><dt>Importado por</dt><dd>{importInfo?.usuario?.nome || '-'}</dd></div>
                      <div><dt>Data</dt><dd>{formatDate(importInfo?.createdAt || plan.createdAt)}</dd></div>
                    </dl>
                    <button type="button" className="btn btn-outline w-full" onClick={() => onOpenPlan(plan.id)}>
                      Abrir estrutura
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
