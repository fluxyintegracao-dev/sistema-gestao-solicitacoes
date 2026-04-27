import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CityBackground from '../../components/CityBackground';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { loginMfaRequest, loginRequest } from '../../services/auth';

function FluxyMark() {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
      className="login-brand-logo"
    >
      <path d="M140 172H363L334 201H140V172Z" fill="#102553" />
      <path d="M140 250H304L275 289H140V250Z" fill="#102553" />
      <path d="M140 328H241L210 375H140V328Z" fill="#102553" />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  function navigateAfterLogin(data) {
    if (data?.user?.mfa_setup_pending) {
      navigate('/perfil');
      return;
    }

    const perfil = String(data?.user?.perfil || '').trim().toUpperCase();
    const isAdmin = perfil === 'SUPERADMIN' || perfil.startsWith('ADMIN');
    navigate(isAdmin ? '/' : '/solicitacoes');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');

    if (!email.trim() || !senha) {
      setErro('Preencha e-mail e senha para continuar.');
      return;
    }

    try {
      setLoading(true);
      const data = await loginRequest({
        email: email.trim(),
        senha
      });

      if (data?.mfa_required) {
        setSenha('');
        setMfaCode('');
        setMfaChallenge({
          challengeToken: data.challenge_token,
          user: data.user
        });
        return;
      }

      await login(data);
      navigateAfterLogin(data);
    } catch (error) {
      setErro(error?.message || 'Nao foi possivel conectar ao servidor. Verifique sua conexao.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(event) {
    event.preventDefault();
    setErro('');

    if (!mfaChallenge?.challengeToken) {
      setErro('O desafio de autenticacao expirou. Informe sua senha novamente.');
      setMfaChallenge(null);
      return;
    }

    if (!String(mfaCode || '').trim()) {
      setErro('Informe o codigo de autenticacao para continuar.');
      return;
    }

    try {
      setLoading(true);
      const data = await loginMfaRequest({
        challenge_token: mfaChallenge.challengeToken,
        codigo: mfaCode
      });

      await login(data);
      setMfaChallenge(null);
      setMfaCode('');
      navigateAfterLogin(data);
    } catch (error) {
      setErro(error?.message || 'Nao foi possivel validar a autenticacao em duas etapas.');
    } finally {
      setLoading(false);
    }
  }

  function cancelarMfa() {
    setMfaChallenge(null);
    setMfaCode('');
    setErro('');
  }

  return (
    <div className="login-bg-wrap">
      <CityBackground />
      <div className="login-bg-overlay" aria-hidden="true" />

      <div className="login-content-wrap">
        <div className="login-panel-column login-panel-column--centered">
          <div className="login-shell login-shell--centered p-8">
            <div className="login-brand-header">
              <div className="login-brand-lockup">
                <FluxyMark />
                <span className="login-brand-wordmark">Fluxy</span>
              </div>
            </div>

            {erro && (
              <div className="mb-4">
                <Alert type="error" message={erro} onClose={() => setErro('')} />
              </div>
            )}

            {mfaChallenge ? (
              <form onSubmit={handleMfaSubmit} noValidate className="grid gap-4">
                <Alert
                  type="info"
                  message={`Senha validada para ${mfaChallenge.user?.nome || mfaChallenge.user?.email || 'o usuario'}. Informe o codigo gerado no aplicativo autenticador para concluir o login.`}
                />

                <div className="grid gap-1.5">
                  <label
                    htmlFor="login-mfa-code"
                    className="text-sm font-medium"
                    style={{ color: 'var(--c-text)' }}
                  >
                    Codigo do autenticador
                  </label>
                  <input
                    id="login-mfa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="input"
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value.replace(/\D+/g, '').slice(0, 6))}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full justify-center"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" />
                        Validando...
                      </>
                    ) : (
                      'Validar e entrar'
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    className="btn btn-secondary w-full justify-center"
                    onClick={cancelarMfa}
                  >
                    Voltar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="grid gap-4">
                <div className="grid gap-1.5">
                  <label
                    htmlFor="login-email"
                    className="text-sm font-medium"
                    style={{ color: 'var(--c-text)' }}
                  >
                    E-mail
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com.br"
                    className="input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <label
                    htmlFor="login-senha"
                    className="text-sm font-medium"
                    style={{ color: 'var(--c-text)' }}
                  >
                    Senha
                  </label>
                  <input
                    id="login-senha"
                    type="password"
                    autoComplete="current-password"
                    placeholder="........"
                    className="input"
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full justify-center"
                  style={{ marginTop: '0.25rem' }}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
