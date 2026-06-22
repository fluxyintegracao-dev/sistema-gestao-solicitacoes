import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '../services/auth';

const PASSWORD_HINT = 'Minimo 8 caracteres, com letra maiuscula, minuscula, numero e caractere especial.';

export default function DefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
            <input
              className="input"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              autoComplete="new-password"
              disabled={loading}
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            Confirmar senha
            <input
              className="input"
              type="password"
              value={confirmacao}
              onChange={(event) => setConfirmacao(event.target.value)}
              autoComplete="new-password"
              disabled={loading}
              required
            />
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
