import { useEffect, useState } from 'react';
import { HiOutlineMagnifyingGlass, HiOutlineShieldCheck } from 'react-icons/hi2';
import { listarAuditoriaCustosRecebiveis } from '../services/custosRecebiveis';

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}

function formatEvent(value) {
  return String(value || '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export default function CrAuditoriaView({ obra }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!obra?.id) {
      setItems([]);
      return undefined;
    }
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await listarAuditoriaCustosRecebiveis(obra.id, {
          evento: appliedQuery,
          limit: 150
        });
        if (active) setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (requestError) {
        if (active) setError(requestError.message || 'Erro ao consultar auditoria.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [obra?.id, appliedQuery]);

  if (!obra?.id) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <HiOutlineShieldCheck className="h-7 w-7" />
        <strong>Selecione uma obra</strong>
        <span>A trilha é consultada dentro do escopo de cada obra.</span>
      </section>
    );
  }

  return (
    <section className="cr-section">
      <header className="cr-section-heading cr-section-header--actions">
        <div>
          <span>Registro append-only</span>
          <h2>Auditoria da obra</h2>
          <p>Ações, justificativas e mudanças de estado em ordem cronológica reversa.</p>
        </div>
        <form
          className="cr-audit-search"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedQuery(query.trim());
          }}
        >
          <label className="cr-field">
            <span>Buscar pelo evento</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: PLANO, RESPONSABILIDADE"
            />
          </label>
          <button className="btn btn-outline" type="submit">
            <HiOutlineMagnifyingGlass className="h-4 w-4" />
            Buscar
          </button>
        </form>
      </header>

      {error ? <div className="cr-feedback" data-tone="error">{error}</div> : null}
      {loading ? <div className="cr-inline-state">Carregando trilha...</div> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="cr-empty-state">
          <HiOutlineShieldCheck className="h-6 w-6" />
          <strong>Nenhum evento encontrado</strong>
          <span>Os registros aparecerão aqui conforme o módulo for operado.</span>
        </div>
      ) : null}

      {!loading && items.length ? (
        <div className="cr-audit-list">
          {items.map((item) => (
            <article key={item.id} className="cr-audit-row">
              <time>{formatDateTime(item.criado_em)}</time>
              <div>
                <strong>{formatEvent(item.evento)}</strong>
                <span>{item.descricao || 'Evento registrado sem descrição adicional.'}</span>
              </div>
              <div>
                <strong>{item.usuario?.nome || 'Processo do sistema'}</strong>
                <span>{item.origem === 'job' ? 'Processamento automático' : 'Operação web'}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
