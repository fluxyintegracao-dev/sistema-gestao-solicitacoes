import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineUserGroup
} from 'react-icons/hi2';
import {
  cadastrarResponsavelCustosRecebiveis,
  encerrarResponsabilidadeCustosRecebiveis,
  listarResponsaveisCustosRecebiveis
} from '../services/custosRecebiveis';

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

function formatDate(value) {
  if (!value) return 'sem data final';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function CrConfiguracoesView({ obra, onChanged }) {
  const [data, setData] = useState({ items: [], usuarios_elegiveis: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [endingId, setEndingId] = useState(null);
  const [endDraft, setEndDraft] = useState({ id: null, motivo: '' });
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState({
    user_id: '',
    papel: 'RESPONSAVEL',
    competencia_inicial: currentMonth(),
    vigencia_inicio: today()
  });

  async function load() {
    if (!obra?.id) {
      setData({ items: [], usuarios_elegiveis: [] });
      return;
    }
    try {
      setLoading(true);
      const response = await listarResponsaveisCustosRecebiveis(obra.id);
      setData(response || { items: [], usuarios_elegiveis: [] });
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setFeedback(null);
    load();
  }, [obra?.id]);

  const active = useMemo(
    () => (data.items || []).filter((item) => item.ativo),
    [data.items]
  );
  const history = useMemo(
    () => (data.items || []).filter((item) => !item.ativo),
    [data.items]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.user_id) return;
    if (
      form.papel === 'RESPONSAVEL'
      && active.some((item) => item.papel === 'RESPONSAVEL')
      && !window.confirm('O novo responsável encerrará o responsável atual. Deseja continuar?')
    ) return;

    try {
      setSaving(true);
      setFeedback(null);
      const result = await cadastrarResponsavelCustosRecebiveis(obra.id, {
        ...form,
        user_id: Number(form.user_id)
      });
      setFeedback({
        tone: 'success',
        message: result.idempotente
          ? 'Esse vínculo já estava ativo.'
          : 'Responsabilidade cadastrada com trilha de auditoria.'
      });
      setForm((current) => ({ ...current, user_id: '' }));
      await load();
      await onChanged?.();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleEnd(item) {
    if (endDraft.motivo.trim().length < 10) {
      setFeedback({ tone: 'error', message: 'A justificativa deve possuir pelo menos 10 caracteres.' });
      return;
    }
    try {
      setEndingId(item.id);
      setFeedback(null);
      await encerrarResponsabilidadeCustosRecebiveis(item.id, {
        vigencia_fim: today(),
        motivo: endDraft.motivo.trim()
      });
      setFeedback({ tone: 'success', message: 'Responsabilidade encerrada e preservada no histórico.' });
      setEndDraft({ id: null, motivo: '' });
      await load();
      await onChanged?.();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setEndingId(null);
    }
  }

  if (!obra?.id) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <HiOutlineUserGroup className="h-7 w-7" />
        <strong>Selecione uma obra</strong>
        <span>O cadastro de responsáveis é independente para cada obra.</span>
      </section>
    );
  }

  return (
    <section className="cr-section cr-governance">
      <header className="cr-section-heading">
        <div>
          <span>Governança da obra</span>
          <h2>Responsáveis e substitutos</h2>
          <p>
            Estes vínculos determinam quem recebe as obrigações mensais. A competência
            inicial impede cobrança retroativa.
          </p>
        </div>
      </header>

      {feedback ? (
        <div className="cr-feedback" data-tone={feedback.tone}>{feedback.message}</div>
      ) : null}

      <div className="cr-governance-layout">
        <form className="cr-governance-form" onSubmit={handleSubmit}>
          <div className="cr-governance-form__title">
            <HiOutlineUserGroup className="h-5 w-5" />
            <div>
              <strong>Novo vínculo</strong>
              <span>Somente usuários ativos vinculados à obra aparecem na lista.</span>
            </div>
          </div>
          <label className="cr-field">
            <span>Usuário</span>
            <select
              required
              value={form.user_id}
              onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}
            >
              <option value="">Selecione</option>
              {(data.usuarios_elegiveis || []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nome}{user.email ? ` · ${user.email}` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="cr-form-pair">
            <label className="cr-field">
              <span>Papel</span>
              <select
                value={form.papel}
                onChange={(event) => setForm((current) => ({ ...current, papel: event.target.value }))}
              >
                <option value="RESPONSAVEL">Responsável</option>
                <option value="SUBSTITUTO">Substituto</option>
              </select>
            </label>
            <label className="cr-field">
              <span>Competência inicial</span>
              <input
                type="month"
                min={currentMonth()}
                required
                value={form.competencia_inicial}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  competencia_inicial: event.target.value
                }))}
              />
            </label>
          </div>
          <label className="cr-field">
            <span>Início da vigência</span>
            <input
              type="date"
              max={today()}
              required
              value={form.vigencia_inicio}
              onChange={(event) => setForm((current) => ({
                ...current,
                vigencia_inicio: event.target.value
              }))}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.user_id}>
            {saving ? 'Salvando...' : 'Cadastrar vínculo'}
          </button>
        </form>

        <div className="cr-governance-register">
          <div className="cr-governance-register__heading">
            <strong>Vínculos ativos</strong>
            <span>{active.length} registro(s)</span>
          </div>
          {loading ? <div className="cr-inline-state">Carregando...</div> : null}
          {!loading && active.length === 0 ? (
            <div className="cr-governance-warning">
              <HiOutlineExclamationTriangle className="h-5 w-5" />
              <div>
                <strong>Nenhum responsável configurado</strong>
                <span>A obra ainda não produzirá obrigações mensais.</span>
              </div>
            </div>
          ) : null}
          {active.map((item) => (
            <article className="cr-responsibility-row" key={item.id}>
              <HiOutlineCheckCircle className="h-5 w-5" />
              <div>
                <strong>{item.usuario?.nome || `Usuário #${item.user_id}`}</strong>
                <span>
                  {item.papel === 'RESPONSAVEL' ? 'Responsável' : 'Substituto'}
                  {' · '}desde {formatDate(item.vigencia_inicio)}
                </span>
                <small>Obrigações a partir de {item.competencia_inicial}</small>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                disabled={endingId === item.id}
                onClick={() => setEndDraft((current) => ({
                  id: current.id === item.id ? null : item.id,
                  motivo: current.id === item.id ? '' : current.motivo
                }))}
              >
                {endDraft.id === item.id ? 'Cancelar' : 'Encerrar'}
              </button>
              {endDraft.id === item.id ? (
                <div className="cr-responsibility-end">
                  <label className="cr-field">
                    <span>Justificativa do encerramento</span>
                    <textarea
                      rows="2"
                      autoFocus
                      value={endDraft.motivo}
                      onChange={(event) => setEndDraft({
                        id: item.id,
                        motivo: event.target.value
                      })}
                      placeholder="Explique a troca, afastamento ou término da responsabilidade."
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={endingId === item.id || endDraft.motivo.trim().length < 10}
                    onClick={() => handleEnd(item)}
                  >
                    {endingId === item.id ? 'Encerrando...' : 'Confirmar encerramento'}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      {history.length ? (
        <details className="cr-governance-history">
          <summary>Histórico de responsabilidades ({history.length})</summary>
          <div>
            {history.map((item) => (
              <div key={item.id}>
                <strong>{item.usuario?.nome || `Usuário #${item.user_id}`}</strong>
                <span>
                  {item.papel === 'RESPONSAVEL' ? 'Responsável' : 'Substituto'}
                  {' · '}{formatDate(item.vigencia_inicio)} até {formatDate(item.vigencia_fim)}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
