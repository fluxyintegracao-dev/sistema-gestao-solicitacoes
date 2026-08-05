import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBuildingOffice2,
  HiOutlineMagnifyingGlass
} from 'react-icons/hi2';
import CrStatusPill from './CrStatusPill';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const BUDGET_STATUS = Object.freeze({
  ORCAMENTO_PUBLICADO: { label: 'Orçamento publicado', status: 'PUBLICADA' },
  RASCUNHO: { label: 'Orçamento em rascunho', status: 'RASCUNHO' },
  PENDENTE: { label: 'Orçamento pendente', status: 'PENDENTE' }
});

function ClassificationPill({ value }) {
  const normalized = String(value || '').toUpperCase();
  return (
    <span className="cr-classification-pill" data-kind={normalized || 'NAO_INFORMADA'}>
      {normalized === 'PUBLICA' ? 'Pública' : normalized === 'PRIVADA' ? 'Privada' : 'Não informada'}
    </span>
  );
}

function BudgetStatus({ obra }) {
  const value = BUDGET_STATUS[obra.situacao_orcamento] || BUDGET_STATUS.PENDENTE;
  return <CrStatusPill status={value.status} label={value.label} />;
}

function ContractReference({ obra }) {
  if (!obra.contrato?.referencia) return '-';
  return (
    <span title={(obra.contrato.referencias || []).join(' · ')}>
      {obra.contrato.referencia}
      {Number(obra.contrato.quantidade) > 1
        ? ` +${Number(obra.contrato.quantidade) - 1}`
        : ''}
    </span>
  );
}

function ObraMobileCard({ obra, onOpen }) {
  return (
    <article className="cr-mobile-record cr-work-access-card">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase text-[var(--c-muted)]">
            {obra.codigo || `Obra ${obra.id}`}
          </div>
          <h3 className="mt-1 text-sm font-bold text-[var(--c-text)]">{obra.nome}</h3>
          <div className="mt-1 text-xs text-[var(--c-muted)]">
            {obra.empresa?.nome || 'Empresa não informada'}
          </div>
        </div>
        <ClassificationPill value={obra.classificacao} />
      </div>
      <dl className="cr-mobile-record-grid">
        <div>
          <dt>Contrato</dt>
          <dd><ContractReference obra={obra} /></dd>
        </div>
        <div>
          <dt>Valor contratado</dt>
          <dd>{currency.format(obra.contrato?.valor_total || 0)}</dd>
        </div>
        <div>
          <dt>Valor orçado</dt>
          <dd>{currency.format(obra.valor_orcado || 0)}</dd>
        </div>
        <div>
          <dt>Eng. responsável</dt>
          <dd>{obra.responsavel?.nome || 'Não definido'}</dd>
        </div>
        <div>
          <dt>Situação</dt>
          <dd className="mt-1"><BudgetStatus obra={obra} /></dd>
        </div>
      </dl>
      <button type="button" className="btn btn-primary w-full" onClick={() => onOpen(obra.id)}>
        Abrir planejamento
      </button>
    </article>
  );
}

export default function CrObrasView({
  obras,
  loading,
  error,
  onReload,
  onOpen,
  showAdministrationLink = false
}) {
  const [busca, setBusca] = useState('');
  const [classificacao, setClassificacao] = useState('');
  const [situacao, setSituacao] = useState('');

  const filtered = useMemo(() => {
    const query = String(busca || '').trim().toLocaleLowerCase('pt-BR');
    return (Array.isArray(obras) ? obras : []).filter((obra) => {
      const matchesSearch = !query || [
        obra.codigo,
        obra.nome,
        obra.cidade,
        obra.empresa?.nome,
        obra.responsavel?.nome,
        obra.contrato?.referencia,
        ...(obra.contrato?.referencias || [])
      ].some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(query));
      const matchesClassification = !classificacao
        || String(obra.classificacao || '').toUpperCase() === classificacao;
      const matchesStatus = !situacao
        || String(obra.situacao_orcamento || 'PENDENTE').toUpperCase() === situacao;
      return matchesSearch && matchesClassification && matchesStatus;
    });
  }, [busca, classificacao, obras, situacao]);

  return (
    <section className="cr-section cr-works-access">
      <div className="cr-section-heading">
        <div>
          <h2>Obras no seu escopo</h2>
          <p>Abra uma obra para planejar os meses, acompanhar medições e consultar os resultados.</p>
        </div>
        {showAdministrationLink ? (
          <Link className="btn btn-outline" to="/obras">
            <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
            Cadastro de Obras
          </Link>
        ) : null}
      </div>

      <div className="cr-filter-grid">
        <label className="cr-field cr-field--search">
          <span>Buscar obra</span>
          <div className="cr-input-icon">
            <HiOutlineMagnifyingGlass className="h-4 w-4" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Código, nome, contrato ou responsável"
            />
          </div>
        </label>
        <label className="cr-field">
          <span>Classificação</span>
          <select value={classificacao} onChange={(event) => setClassificacao(event.target.value)}>
            <option value="">Todas</option>
            <option value="PUBLICA">Pública</option>
            <option value="PRIVADA">Privada</option>
          </select>
        </label>
        <label className="cr-field">
          <span>Situação do orçamento</span>
          <select value={situacao} onChange={(event) => setSituacao(event.target.value)}>
            <option value="">Todas</option>
            <option value="ORCAMENTO_PUBLICADO">Publicado</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="PENDENTE">Pendente</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="cr-feedback" data-tone="error">
          <div>
            <strong>Não foi possível carregar as obras.</strong>
            <span>{error}</span>
          </div>
          <button type="button" className="btn btn-outline" onClick={onReload}>Tentar novamente</button>
        </div>
      ) : loading ? (
        <div className="cr-empty-state">Carregando obras do seu escopo...</div>
      ) : filtered.length === 0 ? (
        <div className="cr-empty-state">
          <HiOutlineBuildingOffice2 className="h-6 w-6" />
          <strong>Nenhuma obra encontrada</strong>
          <span>Ajuste os filtros ou solicite o vínculo da obra ao administrador.</span>
        </div>
      ) : (
        <>
          <div className="cr-table-shell cr-desktop-table cr-works-table">
            <table>
              <thead>
                <tr>
                  <th>Obra</th>
                  <th>Contrato</th>
                  <th className="text-right">Valor contratado</th>
                  <th className="text-right">Valor orçado</th>
                  <th>Eng. responsável</th>
                  <th>Situação</th>
                  <th aria-label="Ação" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((obra) => (
                  <tr key={obra.id}>
                    <td>
                      <strong>{obra.codigo || `OBRA ${obra.id}`} · {obra.nome}</strong>
                      <span>{obra.cidade || '-'} · {obra.empresa?.nome || 'Empresa não informada'}</span>
                    </td>
                    <td><ContractReference obra={obra} /></td>
                    <td className="text-right cr-cell-currency">
                      {currency.format(obra.contrato?.valor_total || 0)}
                    </td>
                    <td className="text-right cr-cell-currency">
                      {currency.format(obra.valor_orcado || 0)}
                    </td>
                    <td>{obra.responsavel?.nome || 'Não definido'}</td>
                    <td><BudgetStatus obra={obra} /></td>
                    <td className="text-right">
                      <button type="button" className="btn btn-primary" onClick={() => onOpen(obra.id)}>
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cr-mobile-list">
            {filtered.map((obra) => (
              <ObraMobileCard key={obra.id} obra={obra} onOpen={onOpen} />
            ))}
          </div>
          <div className="cr-result-count">{filtered.length} obra(s) exibida(s)</div>
        </>
      )}
    </section>
  );
}
