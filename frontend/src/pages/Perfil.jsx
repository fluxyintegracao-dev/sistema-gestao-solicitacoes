import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  disableMfaRequest,
  enableMfaRequest,
  startMfaSetupRequest
} from '../services/auth';
import { alterarSenhaAtual } from '../services/usuarios';
import { definirTelaInicial, getTelaInicial, limparTelaInicial } from '../services/telaInicial';
import Alert from '../components/ui/Alert';

function StatusBadge({ enabled }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        enabled
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      ].join(' ')}
    >
      {enabled ? 'MFA habilitado' : 'MFA desabilitado'}
    </span>
  );
}

export default function Perfil() {
  const { user, updateUser, login } = useAuth();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaErro, setMfaErro] = useState('');
  const [mfaMensagem, setMfaMensagem] = useState('');

  const mfaEnabled = Boolean(user?.mfa_totp_enabled);
  const mfaRequiredByPolicy = Boolean(user?.mfa_required_by_policy);
  const mfaSetupPending = Boolean(user?.mfa_setup_pending);

  // ----- Tela inicial (onde o login entra) -----
  const [telasDisponiveis, setTelasDisponiveis] = useState([]);
  const [telaInicialEscolhida, setTelaInicialEscolhida] = useState('');
  const [telaInicialSalvando, setTelaInicialSalvando] = useState(false);
  const [telaInicialMensagem, setTelaInicialMensagem] = useState('');
  const [telaInicialErro, setTelaInicialErro] = useState('');

  useEffect(() => {
    let ativo = true;
    getTelaInicial()
      .then((data) => {
        if (!ativo) return;
        setTelasDisponiveis(Array.isArray(data?.telas) ? data.telas : []);
        setTelaInicialEscolhida(data?.tela_inicial?.id || '');
      })
      .catch(() => {
        // sem catálogo (falha de rede): a seção fica só com a Home
        if (ativo) setTelasDisponiveis([]);
      });
    return () => { ativo = false; };
  }, []);

  const telasPorModulo = useMemo(() => {
    const grupos = new Map();
    for (const tela of telasDisponiveis) {
      const chave = tela.moduleLabel || 'Outros';
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(tela);
    }
    return Array.from(grupos.entries());
  }, [telasDisponiveis]);

  async function salvarTelaInicialPerfil() {
    setTelaInicialMensagem('');
    setTelaInicialErro('');
    try {
      setTelaInicialSalvando(true);
      if (!telaInicialEscolhida) {
        await limparTelaInicial();
        updateUser({ tela_inicial: null });
        setTelaInicialMensagem('Você voltará a entrar na Home.');
      } else {
        const data = await definirTelaInicial(telaInicialEscolhida);
        updateUser({ tela_inicial: data?.tela_inicial || null });
        setTelaInicialMensagem(`Você passará a entrar em "${data?.tela_inicial?.label}".`);
      }
    } catch (error) {
      setTelaInicialErro(error?.message || 'Erro ao salvar tela inicial');
    } finally {
      setTelaInicialSalvando(false);
    }
  }

  async function salvarSenha() {
    setMensagem('');
    setErro('');

    if (!senhaAtual || !senhaNova) {
      setErro('Preencha a senha atual e a nova senha.');
      return;
    }

    if (senhaNova !== confirmacao) {
      setErro('A confirmacao da nova senha nao confere.');
      return;
    }

    try {
      setLoading(true);
      await alterarSenhaAtual({
        senha_atual: senhaAtual,
        senha_nova: senhaNova
      });

      setSenhaAtual('');
      setSenhaNova('');
      setConfirmacao('');
      setMensagem('Senha atualizada com sucesso.');
    } catch (e) {
      setErro(e?.message || 'Erro ao alterar senha.');
    } finally {
      setLoading(false);
    }
  }

  async function iniciarMfa() {
    setMfaErro('');
    setMfaMensagem('');
    setMfaCode('');

    try {
      setMfaLoading(true);
      const data = await startMfaSetupRequest();
      setMfaSetup(data);
    } catch (e) {
      setMfaErro(e?.message || 'Nao foi possivel iniciar a configuracao do MFA.');
    } finally {
      setMfaLoading(false);
    }
  }

  async function habilitarMfa() {
    setMfaErro('');
    setMfaMensagem('');

    if (!mfaSetup) {
      setMfaErro('Inicie a configuracao antes de validar o codigo.');
      return;
    }

    if (!String(mfaCode || '').trim()) {
      setMfaErro('Informe o codigo do aplicativo autenticador.');
      return;
    }

    try {
      setMfaLoading(true);
      const nextSession = await enableMfaRequest(mfaCode);
      await login(nextSession);
      setMfaSetup(null);
      setMfaCode('');
      setMfaMensagem('Autenticacao em duas etapas habilitada com sucesso.');
    } catch (e) {
      setMfaErro(e?.message || 'Nao foi possivel habilitar o MFA.');
    } finally {
      setMfaLoading(false);
    }
  }

  async function desabilitarMfa() {
    setMfaErro('');
    setMfaMensagem('');

    if (!String(mfaCode || '').trim()) {
      setMfaErro('Informe o codigo atual do autenticador para desabilitar o MFA.');
      return;
    }

    try {
      setMfaLoading(true);
      await disableMfaRequest(mfaCode);
      updateUser({ mfa_totp_enabled: false });
      setMfaSetup(null);
      setMfaCode('');
      setMfaMensagem('Autenticacao em duas etapas desabilitada com sucesso.');
    } catch (e) {
      setMfaErro(e?.message || 'Nao foi possivel desabilitar o MFA.');
    } finally {
      setMfaLoading(false);
    }
  }

  function cancelarMfa() {
    setMfaSetup(null);
    setMfaCode('');
    setMfaErro('');
    setMfaMensagem('');
  }

  return (
    <div className="page solicitacoes-page max-w-4xl mx-auto space-y-5">
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Meu perfil</h1>
            <p className="page-subtitle">
              Confira seus dados, altere sua senha e mantenha sua conta protegida.
            </p>
          </div>
          <div className="app-page-actions">
            <span className="app-status-pill bg-sky-100 text-sky-700">{user?.perfil || 'USUARIO'}</span>
            <StatusBadge enabled={mfaEnabled} />
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="sol-surface-card rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">Conta</p>
          <p className="mt-3 text-lg font-semibold text-[var(--c-text)]">{user?.nome || '-'}</p>
          <p className="mt-1 text-sm text-[var(--c-muted)]">{user?.email || '-'}</p>
        </div>
        <div className="sol-surface-card rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">Setor</p>
          <p className="mt-3 text-lg font-semibold text-[var(--c-text)]">
            {user?.setor?.nome || user?.setor?.codigo || user?.setor_id || '-'}
          </p>
          <p className="mt-1 text-sm text-[var(--c-muted)]">Escopo operacional atual</p>
        </div>
        <div className="sol-surface-card rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">Seguranca</p>
          <p className="mt-3 text-lg font-semibold text-[var(--c-text)]">
            {mfaEnabled ? 'MFA ativo' : 'MFA pendente'}
          </p>
          <p className="mt-1 text-sm text-[var(--c-muted)]">
            {mfaRequiredByPolicy ? 'Obrigatorio pela politica atual' : 'Protecao complementar da conta'}
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)]">Tela inicial</h2>
          <p className="mt-1 text-sm text-[var(--c-muted)]">
            Em qual tela você quer entrar ao abrir o sistema. Também dá para
            marcar direto na tela, pela casinha ao lado da estrela de atalho.
            Vale em qualquer navegador e no celular.
          </p>
        </div>

        {telaInicialMensagem ? (
          <Alert type="success" message={telaInicialMensagem} onClose={() => setTelaInicialMensagem('')} />
        ) : null}
        {telaInicialErro ? (
          <Alert type="error" message={telaInicialErro} onClose={() => setTelaInicialErro('')} />
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
              Entrar em
            </label>
            <select
              className="input"
              value={telaInicialEscolhida}
              onChange={(e) => setTelaInicialEscolhida(e.target.value)}
              disabled={telaInicialSalvando}
            >
              <option value="">Home (padrão)</option>
              {telasPorModulo.map(([moduloLabel, telas]) => (
                <optgroup key={moduloLabel} label={moduloLabel}>
                  {telas.map((tela) => (
                    <option key={tela.id} value={tela.id}>{tela.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={salvarTelaInicialPerfil}
            disabled={telaInicialSalvando || (telaInicialEscolhida === (user?.tela_inicial?.id || ''))}
          >
            {telaInicialSalvando ? 'Salvando…' : 'Salvar tela inicial'}
          </button>
        </div>
        <p className="text-xs text-[var(--c-muted)]">
          Se você perder o acesso à tela escolhida, o sistema volta a abrir na
          Home automaticamente.
        </p>
      </div>

      <div className="card space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
              Nome
            </label>
            <input
              type="text"
              className="input"
              value={user?.nome || ''}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
              Perfil
            </label>
            <input
              type="text"
              className="input"
              value={user?.perfil || ''}
              readOnly
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
            Email cadastrado
          </label>
          <input
            type="email"
            className="input"
            value={user?.email || ''}
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
            Setor
          </label>
          <input
            type="text"
            className="input"
            value={user?.setor?.nome || user?.setor?.codigo || user?.setor_id || ''}
            readOnly
          />
        </div>

        <div className="space-y-4 border-t border-[var(--c-border)] pt-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">
              Alteracao de senha
            </h2>
            <p className="mt-1 text-sm text-[var(--c-muted)]">
              Use uma senha forte e diferente das credenciais antigas.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
                Senha atual
              </label>
              <input
                type="password"
                className="input"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
                Nova senha
              </label>
              <input
                type="password"
                className="input"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
                Confirmar nova senha
              </label>
              <input
                type="password"
                className="input"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
              />
            </div>
          </div>

          {erro ? <Alert type="error" message={erro} onClose={() => setErro('')} /> : null}
          {mensagem ? <Alert type="success" message={mensagem} onClose={() => setMensagem('')} /> : null}

          <button
            onClick={salvarSenha}
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Alterar senha'}
          </button>
        </div>

        <div className="space-y-4 border-t border-[var(--c-border)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--c-text)]">
                Autenticacao em duas etapas
              </h2>
              <p className="mt-1 text-sm text-[var(--c-muted)]">
                Proteja o acesso com codigo TOTP no autenticador do celular.
              </p>
            </div>
          </div>

          {mfaSetupPending ? (
            <Alert
              type="warning"
              message="Este perfil exige autenticacao em duas etapas. Conclua a configuracao do MFA para liberar o uso normal do sistema."
            />
          ) : null}

          {mfaRequiredByPolicy && !mfaSetupPending ? (
            <Alert
              type="info"
              message="Este perfil esta enquadrado na politica de seguranca do produto e deve manter MFA ativo continuamente."
            />
          ) : null}

          {mfaErro ? <Alert type="error" message={mfaErro} onClose={() => setMfaErro('')} /> : null}
          {mfaMensagem ? <Alert type="success" message={mfaMensagem} onClose={() => setMfaMensagem('')} /> : null}

          {!mfaEnabled && !mfaSetup ? (
            <button
              type="button"
              onClick={iniciarMfa}
              disabled={mfaLoading}
              className="btn btn-primary disabled:opacity-50"
            >
              {mfaLoading ? 'Preparando...' : 'Iniciar configuracao do MFA'}
            </button>
          ) : null}

          {!mfaEnabled && mfaSetup ? (
            <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
              <div className="rounded-2xl border border-[var(--c-border)] bg-white/70 p-4">
                <img
                  src={mfaSetup.qr_code_data_url}
                  alt="QR Code para configurar autenticador"
                  className="mx-auto h-auto w-full max-w-[180px]"
                />
              </div>

              <div className="space-y-4">
                <Alert
                  type="info"
                  message="Abra o aplicativo autenticador, escaneie o QR Code e informe o codigo de 6 digitos para ativar o MFA."
                />

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
                    Chave manual
                  </label>
                  <input
                    type="text"
                    className="input font-mono"
                    value={mfaSetup.secret || ''}
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
                    Codigo do autenticador
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input"
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={habilitarMfa}
                    disabled={mfaLoading}
                    className="btn btn-primary disabled:opacity-50"
                  >
                    {mfaLoading ? 'Validando...' : 'Ativar MFA'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelarMfa}
                    disabled={mfaLoading}
                    className="btn btn-secondary disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {mfaEnabled ? (
            <div className="space-y-4">
              <Alert
                type="info"
                message={
                  mfaRequiredByPolicy
                    ? 'Este perfil exige MFA obrigatorio. Se houver troca de dispositivo, trate o reset com suporte administrativo interno.'
                    : 'Para desabilitar o MFA, confirme com um codigo valido do seu aplicativo autenticador.'
                }
              />

              <div className="max-w-sm">
                <label className="block text-sm mb-1" style={{ color: 'var(--c-muted)' }}>
                  Codigo atual do autenticador
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                />
              </div>

              {!mfaRequiredByPolicy ? (
                <button
                  type="button"
                  onClick={desabilitarMfa}
                  disabled={mfaLoading}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  {mfaLoading ? 'Processando...' : 'Desabilitar MFA'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
