import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { loginMfaRequest, loginRequest } from '../../services/auth';
import { getInstalacaoPublica } from '../../services/instalacao';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import CityBackground from '../../components/CityBackground';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [instalacao, setInstalacao] = useState({
    product_name: 'Fluxy',
    company_name: '',
    logo_url: '',
    login_title: 'Fluxy',
    login_subtitle: ''
  });

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

  useEffect(() => {
    let ativo = true;

    getInstalacaoPublica()
      .then((data) => {
        if (!ativo || !data) {
          return;
        }

        setInstalacao((current) => ({ ...current, ...data }));
      })
      .catch(() => {});

    return () => {
      ativo = false;
    };
  }, []);

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

  const inicial = String(instalacao.product_name || 'F').trim().charAt(0).toUpperCase();
  const loginTitle = instalacao.login_title || instalacao.product_name || 'Fluxy';
  const loginSubtitle = instalacao.login_subtitle || instalacao.company_name;

  return (
    <div className="login-bg-wrap">
      <CityBackground />
      <div className="login-bg-overlay" aria-hidden="true" />

      <div className="login-content-wrap">
        <div className="login-layout">
          <section className="login-hero">
            <span className="login-hero-kicker">Ambiente seguro</span>
            <div className="login-hero-copy">
              <h2 className="login-hero-title">
                Operacao, financeiro e obras em uma mesma linha de decisao.
              </h2>
              <p className="login-hero-description">
                Entre no {loginTitle} com um skyline procedural gerado na abertura da tela,
                desenhado para deixar o acesso mais elegante e atual.
              </p>
            </div>

            <div className="login-hero-tags" aria-hidden="true">
              <span>Skyline procedural</span>
              <span>Visual corporativo</span>
              <span>Somente frontend</span>
            </div>
          </section>

          <div className="login-panel-column">
            <div className="login-shell p-8">
              <div className="mb-7 flex flex-col items-center gap-3">
                {instalacao.logo_url ? (
                  <img
                    src={instalacao.logo_url}
                    alt={instalacao.company_name || instalacao.product_name || 'Fluxy'}
                    className="h-20 w-auto object-contain"
                  />
                ) : (
                  <div className="login-brand-mark flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white">
                    {inicial}
                  </div>
                )}

                <div className="text-center">
                  <h1 className="text-xl font-bold" style={{ color: 'var(--c-text)' }}>
                    {loginTitle}
                  </h1>
                  {loginSubtitle && (
                    <p className="mt-0.5 text-sm" style={{ color: 'var(--c-muted)' }}>
                      {loginSubtitle}
                    </p>
                  )}
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

            <p className="login-footnote">
              Sistema de Gestao | {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
