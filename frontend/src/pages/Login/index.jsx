import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cscLogo from '../../assets/CSC_logo_colorida.png';
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
      <path d="M140 172H363L334 201H140V172Z" fill="#123a78" />
      <path d="M140 250H304L275 289H140V250Z" fill="#123a78" />
      <path d="M140 328H241L210 375H140V328Z" fill="#123a78" />
    </svg>
  );
}

function VisibilityIcon({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M3 3l18 18M10.58 10.59A2 2 0 0012 14a2 2 0 001.41-.58M9.88 5.09A10.94 10.94 0 0112 5c5.05 0 8.27 4.11 9 5-.35.43-1.3 1.53-2.8 2.63M6.61 6.62C4.55 8.06 3.29 9.63 3 10c.73.89 3.95 5 9 5 1.59 0 3-.31 4.22-.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zm11 3a3 3 0 100-6 3 3 0 000 6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const isMfaStep = Boolean(mfaChallenge);
  const headingKicker = isMfaStep ? 'Validacao adicional' : 'Portal integrado';
  const headingTitle = isMfaStep ? 'Confirme seu acesso' : 'Acesse sua central';
  const headingSubtitle = isMfaStep
    ? 'Digite o codigo do autenticador para concluir a entrada com seguranca.'
    : 'Operacao, financeiro e obras no mesmo fluxo de trabalho.';

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
        setShowPassword(false);
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
          <div className="login-shell login-shell--centered">
            <div className="login-shell-chrome" aria-hidden="true" />

            <div className="login-brand-header">
              <div className="login-brand-rail">
                <div className="login-brand-chip login-brand-chip--company">
                  <img
                    src={cscLogo}
                    alt="Construtora Sul Capixaba"
                    className="login-brand-company-logo"
                  />
                  <span className="login-brand-company-name">Construtora Sul Capixaba</span>
                </div>

                <span className="login-brand-divider" aria-hidden="true" />

                <div className="login-brand-chip login-brand-chip--platform">
                  <FluxyMark />
                  <span className="login-brand-wordmark">Fluxy</span>
                </div>
              </div>

              <div className="login-heading">
                <span className="login-heading-kicker">{headingKicker}</span>
                <h1 className="login-heading-title">{headingTitle}</h1>
                <p className="login-heading-subtitle">{headingSubtitle}</p>
              </div>
            </div>

            {erro && (
              <div className="mb-4">
                <Alert type="error" message={erro} onClose={() => setErro('')} />
              </div>
            )}

            {mfaChallenge ? (
              <form onSubmit={handleMfaSubmit} noValidate className="grid gap-5">
                <Alert
                  type="info"
                  message={`Senha validada para ${mfaChallenge.user?.nome || mfaChallenge.user?.email || 'o usuario'}. Informe o codigo gerado no aplicativo autenticador para concluir o login.`}
                />

                <div className="grid gap-2">
                  <label htmlFor="login-mfa-code" className="login-field-label">
                    Codigo do autenticador
                  </label>
                  <input
                    id="login-mfa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="input login-input"
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
                    className="btn btn-primary login-submit-btn w-full justify-center"
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
                    className="btn btn-secondary login-secondary-btn w-full justify-center"
                    onClick={cancelarMfa}
                  >
                    Voltar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="grid gap-5">
                <div className="grid gap-2">
                  <label htmlFor="login-email" className="login-field-label">
                    E-mail
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com.br"
                    className="input login-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="login-senha" className="login-field-label">
                    Senha
                  </label>
                  <div className="login-password-wrap">
                    <input
                      id="login-senha"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      className="input login-input login-input--password"
                      value={senha}
                      onChange={(event) => setSenha(event.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                      aria-pressed={showPassword}
                    >
                      <VisibilityIcon visible={showPassword} />
                      <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary login-submit-btn w-full justify-center"
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
