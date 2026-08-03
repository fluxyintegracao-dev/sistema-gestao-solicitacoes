import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBuildingOffice2,
  HiOutlineMagnifyingGlass
} from 'react-icons/hi2';
import CrStatusPill from './CrStatusPill';

function ClassificationPill({ value }) {
  const normalized = String(value || '').toUpperCase();
  return (
    <span className="cr-classification-pill" data-kind={normalized || 'NAO_INFORMADA'}>
      {normalized === 'PUBLICA' ? 'Pública' : normalized === 'PRIVADA' ? 'Privada' : 'Não informada'}
    </span>
  );
}

function ObraMobileCard({ obra, onOpen }) {
  return (
    <article className="cr-mobile-record">
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
          <dt>Cidade</dt>
          <dd>{obra.cidade || '-'}</dd>
        </div>
        <div>
          <dt>Responsável</dt>
          <dd>{obra.responsavel?.nome || 'Não definido'}</dd>
        </div>
        <div>
          <dt>Plano micro</dt>
          <dd className="mt-1"><CrStatusPill status={obra.plano_atual?.situacao} /></dd>
        </div>
        <div>
          <dt>Competência</dt>
          <dd>{obra.competencia_atual?.estado || 'Sem registro'}</dd>
        </div>
      </dl>
      <button type="button" className="btn btn-primary w-full" onClick={() => onOpen(obra.id)}>
        Abrir workspace
      </button>
    </article>
  );
}

export default function CrObrasView({
  obras,
  loading,
  error,
  onReload,
  onOpen
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
        obra.responsavel?.nome
      ].some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(query));
      const matchesClassification = !classificacao
        || String(obra.classificacao || '').toUpperCase() === classificacao;
      const matchesStatus = !situacao
        || String(obra.plano_atual?.situacao || 'SEM_PLANO').toUpperCase() === situacao;
      return matchesSearch && matchesClassification && matchesStatus;
    });
  }, [busca, classificacao, obras, situacao]);

  return (
    <section className="cr-section">
      <div className="cr-section-heading">
        <div>
          <h2>Obras no seu escopo</h2>
          <p>Abra o workspace da obra para consultar a referência macro e as versões da estrutura micro.</p>
        </div>
        <Link className="btn btn-outline" to="/obras">
          <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
          Cadastro de Obras
        </Link>
      </div>

      <div className="cr-filter-grid">
        <label className="cr-field cr-field--search">
          <span>Buscar obra</span>
          <div className="cr-input-icon">
            <HiOutlineMagnifyingGlass className="h-4 w-4" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Código, nome, empresa ou responsável"
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
          <span>Plano micro</span>
          <select value={situacao} onChange={(event) => setSituacao(event.target.value)}>
            <option value="">Todos</option>
            <option value="PUBLICADA">Publicado</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="SUBSTITUIDA">Substituído</option>
            <option value="SEM_PLANO">Sem plano</option>
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
          <div className="cr-table-shell cr-desktop-table">
            <table>
              <thead>
                <tr>
                  <th>Obra</th>
                  <th>Empresa</th>
                  <th>Classificação</th>
                  <th>Cidade</th>
                  <th>Responsável</th>
                  <th>Plano micro</th>
                  <th>Competência</th>
                  <th aria-label="Ação" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((obra) => (
                  <tr key={obra.id}>
                    <td>
                      <strong>{obra.codigo || `OBRA ${obra.id}`}</strong>
                      <span>{obra.nome}</span>
                    </td>
                    <td>{obra.empresa?.nome || '-'}</td>
                    <td><ClassificationPill value={obra.classificacao} /></td>
                    <td>{obra.cidade || '-'}</td>
                    <td>{obra.responsavel?.nome || 'Não definido'}</td>
                    <td>
                      <CrStatusPill status={obra.plano_atual?.situacao} />
                      {obra.plano_atual ? <small>v{obra.plano_atual.versao}</small> : null}
                    </td>
                    <td>{obra.competencia_atual?.estado || 'Sem registro'}</td>
                    <td className="text-right">
                      <button type="button" className="btn btn-outline" onClick={() => onOpen(obra.id)}>
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
