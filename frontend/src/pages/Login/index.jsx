import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cscLogo from '../../assets/CSC_logo_lockup_padded.png';
import fluxyLogo from '../../assets/fluxy_mark_cropped.png';
import CityBackground from '../../components/CityBackground';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { loginMfaRequest, loginRequest } from '../../services/auth';

function EyeIcon({ open }) {
  return open ? (
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
  ) : (
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
  const introKicker = isMfaStep ? 'Seguranca em duas etapas' : '';
  const introTitle = isMfaStep ? 'Validacao segura' : 'Entrar';
  const introCopy = isMfaStep
    ? 'Confirme o codigo gerado no autenticador para concluir o acesso ao ambiente.'
    : '';
  const isMinimalIntro = !introKicker && !introCopy;

  function normalizeLoginErrorMessage(err) {
    const rawMessage = String(err?.message || '').trim();
    const normalizedMessage = rawMessage.toLowerCase();

    if (err?.data?.code === 'PASSWORD_RESET_REQUIRED') {
      return 'Sua senha precisa ser definida ou redefinida. Use "Esqueci minha senha" para receber um link seguro.';
    }

    if (!rawMessage) {
      return 'Nao foi possivel entrar agora. Tente novamente em alguns instantes.';
    }

    if (
      err?.status === 401 ||
      normalizedMessage.includes('erro ao efetuar login') ||
      normalizedMessage.includes('unauthorized') ||
      normalizedMessage.includes('credenciais') ||
      normalizedMessage.includes('usuario ou senha') ||
      normalizedMessage.includes('e-mail ou senha')
    ) {
      return 'E-mail ou senha invalidos. Confira seus dados e tente novamente.';
    }

    if (
      normalizedMessage.includes('failed to fetch') ||
      normalizedMessage.includes('network') ||
      normalizedMessage.includes('nao foi possivel conectar')
    ) {
      return 'Nao foi possivel conectar ao servidor. Verifique sua conexao e tente novamente.';
    }

    return rawMessage;
  }

  function handlePrimaryButtonPointerMove(event) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    button.style.setProperty('--login-glow-x', `${event.clientX - rect.left}px`);
    button.style.setProperty('--login-glow-y', `${event.clientY - rect.top}px`);
  }

  function handlePrimaryButtonPointerLeave(event) {
    const button = event.currentTarget;
    button.style.removeProperty('--login-glow-x');
    button.style.removeProperty('--login-glow-y');
  }

  function navigateAfterLogin(data) {
    if (data?.user?.mfa_setup_pending) {
      navigate('/perfil');
      return;
    }

    // Tela inicial escolhida pelo usuário, já VALIDADA no backend contra
    // as permissões atuais (payload traz null quando a preferência caiu
    // — permissão perdida ou rota removida — e nesse caso a Home assume
    // silenciosamente). Sem escolha, todo perfil cai na Home.
    const telaInicial = String(data?.user?.tela_inicial?.to || '').trim();
    navigate(telaInicial.startsWith('/') ? telaInicial : '/');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (!email.trim() || !senha) {
      setErro('Preencha e-mail e senha para continuar.');
      return;
    }

    try {
      setLoading(true);
      const data = await loginRequest({ email: email.trim(), senha });
      if (data?.mfa_required) {
        setSenha('');
        setShowPassword(false);
        setMfaCode('');
        setMfaChallenge({ challengeToken: data.challenge_token, user: data.user });
        return;
      }

      await login(data);
      navigateAfterLogin(data);
    } catch (err) {
      setErro(normalizeLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(e) {
    e.preventDefault();
    setErro('');

    if (!mfaChallenge?.challengeToken) {
      setErro('O desafio de autenticacao expirou. Informe sua senha novamente.');
      setMfaChallenge(null);
      return;
    }

    if (!String(mfaCode || '').trim()) {
      setErro('Informe o codigo do autenticador.');
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
    } catch (err) {
      setErro(err?.message || 'Nao foi possivel validar a autenticacao em duas etapas.');
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
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-csc">
              <div className="login-csc-lockup">
                <img src={cscLogo} alt="Construtora Sul Capixaba" className="login-csc-logo" />
              </div>
            </div>
            <div className="login-brand-sep" aria-hidden="true" />
            <div className="login-brand-fluxy">
              <div className="login-fluxy-lockup">
                <div className="login-fluxy-logo-wrap">
                  <img src={fluxyLogo} alt="" aria-hidden="true" className="login-fluxy-icon" />
                </div>
                <span className="login-fluxy-name">Fluxy</span>
              </div>
            </div>
          </div>

          <div className={`login-intro${isMinimalIntro ? ' login-intro--minimal' : ''}`}>
            {introKicker ? <span className="login-kicker">{introKicker}</span> : null}
            <h1 className="login-heading">{introTitle}</h1>
            {introCopy ? <p className="login-copy">{introCopy}</p> : null}
          </div>

          <div className="login-divider" aria-hidden="true" />

          {erro && (
            <div className="login-alert-wrap">
              <Alert type="error" message={erro} onClose={() => setErro('')} />
            </div>
          )}

          {isMfaStep ? (
            <form onSubmit={handleMfaSubmit} noValidate className="login-form">
              <Alert
                type="info"
                message={`Senha validada para ${mfaChallenge.user?.nome || mfaChallenge.user?.email || 'o usuario'}. Informe o codigo do aplicativo autenticador.`}
              />

              <div className="login-field">
                <label htmlFor="login-mfa-code" className="login-label">Codigo do autenticador</label>
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

              <div className="login-security-note">
                <span className="login-security-dot" aria-hidden="true" />
                <span>A validacao adicional protege o ambiente corporativo.</span>
              </div>

              <div className="login-actions-2col">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary login-btn w-full justify-center"
                  onMouseMove={handlePrimaryButtonPointerMove}
                  onMouseLeave={handlePrimaryButtonPointerLeave}
                >
                  {loading ? <><Spinner size="sm" label="" /> Validando...</> : 'Validar e entrar'}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className="btn btn-secondary login-btn w-full justify-center"
                  onClick={cancelarMfa}
                >
                  Voltar
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="login-form">
              <div className="login-field">
                <label htmlFor="login-email" className="login-label">E-mail</label>
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

              <div className="login-field">
                <label htmlFor="login-senha" className="login-label">Senha</label>
                <div className="login-pw-wrap">
                  <input
                    id="login-senha"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="input login-input login-input-pw"
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div className="login-form-meta">
                <div className="login-security-note">
                  <span className="login-security-dot" aria-hidden="true" />
                  <span>Acesso corporativo protegido.</span>
                </div>
                <button
                  type="button"
                  className="login-forgot"
                  onClick={() => navigate('/recuperar-senha', { state: { email: email.trim() } })}
                >
                  Esqueci minha senha
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary login-btn w-full justify-center"
                onMouseMove={handlePrimaryButtonPointerMove}
                onMouseLeave={handlePrimaryButtonPointerLeave}
              >
                {loading ? <><Spinner size="sm" label="" /> Entrando...</> : 'Entrar'}
              </button>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
