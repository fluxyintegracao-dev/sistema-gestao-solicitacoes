import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { forgotPasswordRequest } from '../services/auth';

export default function RecuperarSenha() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!String(email || '').trim()) {
      setError('Informe seu e-mail para receber o link.');
      return;
    }

    try {
      setLoading(true);
      await forgotPasswordRequest(email);
      setMessage('Se o e-mail estiver cadastrado, enviaremos um link seguro para definir a senha.');
    } catch (err) {
      setError(err?.message || 'Nao foi possivel solicitar a recuperacao agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page solicitacoes-page min-h-screen flex items-center justify-center">
      <div className="sol-surface-card max-w-xl w-full rounded-2xl p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--c-muted)]">
          Acesso seguro
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--c-text)]">
          Recuperar senha
        </h1>
        <p className="mt-2 text-sm text-[var(--c-muted)]">
          Informe o e-mail cadastrado. O sistema enviara um link temporario para configurar uma nova senha.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm">
            E-mail
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com.br"
              autoComplete="email"
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

          <button className="btn btn-primary justify-center" type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>

        <Link className="mt-5 inline-flex text-sm font-semibold text-blue-700" to="/login">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
