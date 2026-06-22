import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';
import { resetPasswordRequest } from '../services/auth';

const PASSWORD_HINT = 'Minimo 8 caracteres, com letra maiuscula, minuscula, numero e caractere especial.';

const PASSWORD_RULES = [
  { key: 'length', label: '8+ caracteres', test: (value) => value.length >= 8 },
  { key: 'upper', label: 'maiuscula', test: (value) => /\p{Lu}/u.test(value) },
  { key: 'lower', label: 'minuscula', test: (value) => /\p{Ll}/u.test(value) },
  { key: 'number', label: 'numero', test: (value) => /\p{N}/u.test(value) },
  { key: 'special', label: 'especial', test: (value) => /[^\p{L}\p{N}\s]/u.test(value) }
];

export default function DefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const passwordStatus = PASSWORD_RULES.map((rule) => ({
    ...rule,
    ok: rule.test(senha)
  }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Link invalido ou incompleto. Solicite um novo link de senha.');
      return;
    }

    if (senha !== confirmacao) {
      setError('A confirmacao precisa ser igual a nova senha.');
      return;
    }

    try {
      setLoading(true);
      await resetPasswordRequest({ token, senha });
      setSenha('');
      setConfirmacao('');
      setMessage('Senha definida com sucesso. Agora voce ja pode entrar no sistema.');
    } catch (err) {
      setError(err?.message || 'Nao foi possivel definir a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page solicitacoes-page min-h-screen flex items-center justify-center">
      <div className="sol-surface-card max-w-xl w-full rounded-2xl p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--c-muted)]">
          Senha de acesso
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--c-text)]">
          Definir senha
        </h1>
        <p className="mt-2 text-sm text-[var(--c-muted)]">{PASSWORD_HINT}</p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm">
            Nova senha
            <span className="relative block">
              <input
                className="input w-full pr-12"
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                autoComplete="new-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--c-muted)] hover:bg-slate-100 hover:text-[var(--c-text)]"
                onClick={() => setMostrarSenha((current) => !current)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                disabled={loading}
              >
                {mostrarSenha ? <HiEyeSlash className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
              </button>
            </span>
          </label>

          <div className="flex flex-wrap gap-2 text-xs">
            {passwordStatus.map((rule) => (
              <span
                key={rule.key}
                className={`rounded-full px-3 py-1 font-semibold ${
                  rule.ok
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {rule.label}
              </span>
            ))}
          </div>

          <label className="grid gap-1 text-sm">
            Confirmar senha
            <span className="relative block">
              <input
                className="input w-full pr-12"
                type={mostrarConfirmacao ? 'text' : 'password'}
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                autoComplete="new-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--c-muted)] hover:bg-slate-100 hover:text-[var(--c-text)]"
                onClick={() => setMostrarConfirmacao((current) => !current)}
                aria-label={mostrarConfirmacao ? 'Ocultar confirmacao de senha' : 'Mostrar confirmacao de senha'}
                disabled={loading}
              >
                {mostrarConfirmacao ? <HiEyeSlash className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
              </button>
            </span>
          </label>

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <button className="btn btn-primary justify-center" type="submit" disabled={loading || Boolean(message)}>
            {loading ? 'Salvando...' : 'Definir senha'}
          </button>
        </form>

        <Link className="mt-5 inline-flex text-sm font-semibold text-blue-700" to="/login">
          Ir para o login
        </Link>
      </div>
    </div>
  );
}
