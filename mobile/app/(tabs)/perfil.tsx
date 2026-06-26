import { useState } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../../src/components/common/Button';
import { Screen } from '../../src/components/common/Screen';
import { SectionCard } from '../../src/components/common/SectionCard';
import { TextField } from '../../src/components/common/TextField';
import { useAuth } from '../../src/features/auth/AuthContext';
import {
  changePasswordRequest,
  disableMfaRequest,
  enableMfaRequest,
  startMfaSetupRequest
} from '../../src/services/api/auth';
import { API_URL } from '../../src/services/api/client';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../../src/config/legal';
import { colors, radii, shadows, spacing } from '../../src/theme';

function buildInitials(name?: string | null) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'FL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export default function PerfilPage() {
  const { user, signOut, updateUser, applySessionData } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const [mfaSetup, setMfaSetup] = useState<{
    secret: string;
    secret_masked: string;
    otpauth_url: string;
    qr_code_data_url: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSaving, setMfaSaving] = useState(false);
  const [mfaErro, setMfaErro] = useState('');
  const [mfaMensagem, setMfaMensagem] = useState('');

  const mfaEnabled = Boolean(user?.mfa_totp_enabled);
  const mfaRequiredByPolicy = Boolean(user?.mfa_required_by_policy);
  const mfaSetupPending = Boolean(user?.mfa_setup_pending);

  const handleAlterarSenha = async () => {
    setMensagem('');
    setErro('');

    if (!senhaAtual || !senhaNova || !confirmacao) {
      setErro('Preencha a senha atual, a nova senha e a confirmacao.');
      return;
    }

    if (senhaNova.length < 8) {
      setErro('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (senhaNova !== confirmacao) {
      setErro('A confirmacao da nova senha nao confere.');
      return;
    }

    try {
      setSaving(true);
      await changePasswordRequest({
        senha_atual: senhaAtual,
        senha_nova: senhaNova
      });
      setSenhaAtual('');
      setSenhaNova('');
      setConfirmacao('');
      setMensagem('Senha atualizada com sucesso.');
      Alert.alert('Senha atualizada', 'Sua nova senha ja esta ativa no app e no web.');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Nao foi possivel alterar a senha.');
    } finally {
      setSaving(false);
    }
  };

  const iniciarMfa = async () => {
    setMfaErro('');
    setMfaMensagem('');
    setMfaCode('');

    try {
      setMfaSaving(true);
      const setup = await startMfaSetupRequest();
      setMfaSetup(setup);
    } catch (error) {
      setMfaErro(error instanceof Error ? error.message : 'Nao foi possivel iniciar a configuracao do MFA.');
    } finally {
      setMfaSaving(false);
    }
  };

  const ativarMfa = async () => {
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
      setMfaSaving(true);
      const nextSession = await enableMfaRequest(mfaCode);
      await applySessionData(nextSession);
      setMfaSetup(null);
      setMfaCode('');
      setMfaMensagem('Autenticacao em duas etapas habilitada com sucesso.');
    } catch (error) {
      setMfaErro(error instanceof Error ? error.message : 'Nao foi possivel habilitar o MFA.');
    } finally {
      setMfaSaving(false);
    }
  };

  const desabilitarMfa = async () => {
    setMfaErro('');
    setMfaMensagem('');

    if (!String(mfaCode || '').trim()) {
      setMfaErro('Informe o codigo atual do autenticador para desabilitar o MFA.');
      return;
    }

    try {
      setMfaSaving(true);
      await disableMfaRequest(mfaCode);
      await updateUser({
        mfa_totp_enabled: false,
        mfa_setup_pending: false,
        mfa_required_by_policy: mfaRequiredByPolicy
      });
      setMfaSetup(null);
      setMfaCode('');
      setMfaMensagem('Autenticacao em duas etapas desabilitada com sucesso.');
    } catch (error) {
      setMfaErro(error instanceof Error ? error.message : 'Nao foi possivel desabilitar o MFA.');
    } finally {
      setMfaSaving(false);
    }
  };

  const cancelarMfa = () => {
    setMfaSetup(null);
    setMfaCode('');
    setMfaErro('');
    setMfaMensagem('');
  };

  const abrirLinkLegal = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Nao foi possivel abrir o link', error instanceof Error ? error.message : 'Tente novamente em instantes.');
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{buildInitials(user?.nome)}</Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>Minha conta</Text>
          <Text style={styles.title}>{user?.nome || 'Usuario'}</Text>
          <Text style={styles.subtitle}>
            Consulte seus dados de acesso e ajuste a seguranca da conta sem depender do desktop.
          </Text>
        </View>
      </View>

      <SectionCard title="Dados da conta" subtitle="Informacoes do usuario autenticado neste dispositivo">
        <InfoLine label="Email" value={user?.email || '-'} />
        <InfoLine label="Perfil" value={user?.perfil || '-'} />
        <InfoLine label="Setor" value={user?.setor?.nome || user?.setor?.codigo || '-'} />
      </SectionCard>

      <SectionCard title="Seguranca" subtitle="Troque sua senha com o mesmo backend usado pelo sistema web">
        <TextField
          label="Senha atual"
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          secureTextEntry
        />
        <TextField
          label="Nova senha"
          value={senhaNova}
          onChangeText={setSenhaNova}
          secureTextEntry
          helperText="Use pelo menos 8 caracteres."
        />
        <TextField
          label="Confirmar nova senha"
          value={confirmacao}
          onChangeText={setConfirmacao}
          secureTextEntry
        />

        {erro ? <Text style={styles.error}>{erro}</Text> : null}
        {mensagem ? <Text style={styles.success}>{mensagem}</Text> : null}

        <Button
          label={saving ? 'Salvando...' : 'Alterar senha'}
          onPress={() => void handleAlterarSenha()}
          loading={saving}
        />
      </SectionCard>

      <SectionCard title="MFA" subtitle="Autenticacao em duas etapas para proteger perfis sensiveis">
        {mfaSetupPending ? (
          <Text style={styles.warning}>
            Este perfil exige MFA obrigatorio. Conclua a configuracao abaixo para liberar o uso normal do app.
          </Text>
        ) : null}

        {!mfaSetupPending && mfaRequiredByPolicy ? (
          <Text style={styles.helper}>
            Este perfil esta enquadrado na politica de seguranca e deve manter MFA ativo continuamente.
          </Text>
        ) : null}

        <InfoLine label="Status" value={mfaEnabled ? 'MFA habilitado' : 'MFA desabilitado'} />

        {mfaErro ? <Text style={styles.error}>{mfaErro}</Text> : null}
        {mfaMensagem ? <Text style={styles.success}>{mfaMensagem}</Text> : null}

        {!mfaEnabled && !mfaSetup ? (
          <Button
            label={mfaSaving ? 'Preparando...' : 'Iniciar configuracao do MFA'}
            onPress={() => void iniciarMfa()}
            loading={mfaSaving}
          />
        ) : null}

        {!mfaEnabled && mfaSetup ? (
          <View style={styles.mfaSetupBlock}>
            <Image
              source={{ uri: mfaSetup.qr_code_data_url }}
              style={styles.qrCode}
              resizeMode="contain"
            />
            <TextField
              label="Chave manual"
              value={mfaSetup.secret}
              editable={false}
            />
            <TextField
              label="Codigo do autenticador"
              value={mfaCode}
              onChangeText={(value) => setMfaCode(value.replace(/\D+/g, '').slice(0, 6))}
              keyboardType="number-pad"
              helperText="Abra o aplicativo autenticador, escaneie o QR Code e informe o codigo atual."
            />
            <Button
              label={mfaSaving ? 'Validando...' : 'Ativar MFA'}
              onPress={() => void ativarMfa()}
              loading={mfaSaving}
            />
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={cancelarMfa}
              disabled={mfaSaving}
            />
          </View>
        ) : null}

        {mfaEnabled ? (
          <View style={styles.mfaSetupBlock}>
            <TextField
              label="Codigo atual do autenticador"
              value={mfaCode}
              onChangeText={(value) => setMfaCode(value.replace(/\D+/g, '').slice(0, 6))}
              keyboardType="number-pad"
              helperText={
                mfaRequiredByPolicy
                  ? 'Este perfil exige MFA obrigatorio. Em caso de perda de dispositivo, trate o reset com suporte interno.'
                  : 'Informe o codigo atual para desabilitar o MFA.'
              }
            />
            {!mfaRequiredByPolicy ? (
              <Button
                label={mfaSaving ? 'Processando...' : 'Desabilitar MFA'}
                variant="secondary"
                onPress={() => void desabilitarMfa()}
                loading={mfaSaving}
              />
            ) : null}
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="App e sessao" subtitle="Leitura util para homologacao, suporte e testes do mobile">
        <InfoLine label="API" value={API_URL} mono />
        <InfoLine label="Modulo focado" value="Solicitacoes" />
        <InfoLine
          label="Modulos habilitados"
          value={
            Object.entries(user?.modulos_habilitados || {})
              .filter(([, enabled]) => enabled)
              .map(([code]) => code)
              .join(', ') || '-'
          }
        />
      </SectionCard>

      <SectionCard title="Legal" subtitle="Politica de privacidade e termos publicados para as lojas">
        <Button
          label="Politica de privacidade"
          variant="secondary"
          onPress={() => void abrirLinkLegal(PRIVACY_POLICY_URL)}
          icon={<Feather name="external-link" size={16} color={colors.primary} />}
        />
        <Button
          label="Termos de uso"
          variant="secondary"
          onPress={() => void abrirLinkLegal(TERMS_OF_USE_URL)}
          icon={<Feather name="external-link" size={16} color={colors.primary} />}
        />
      </SectionCard>

      <Button
        label="Sair da conta"
        onPress={() => void signOut()}
        variant="secondary"
        icon={<Feather name="log-out" size={16} color={colors.primary} />}
      />
    </Screen>
  );
}

function InfoLine({
  label,
  value,
  mono = false
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, mono ? styles.valueMono : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    ...shadows.card
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryStrong,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    ...shadows.button
  },
  avatarLabel: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800'
  },
  heroText: {
    flex: 1,
    gap: spacing.xs
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21
  },
  infoBlock: {
    gap: spacing.xs
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600'
  },
  valueMono: {
    fontSize: 13
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600'
  },
  success: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600'
  },
  helper: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20
  },
  warning: {
    color: colors.warning || colors.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20
  },
  mfaSetupBlock: {
    gap: spacing.md
  },
  qrCode: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong
  }
});
