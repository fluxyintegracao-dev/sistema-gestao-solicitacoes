import { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../../src/components/common/Button';
import { Screen } from '../../src/components/common/Screen';
import { SectionCard } from '../../src/components/common/SectionCard';
import { TextField } from '../../src/components/common/TextField';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../../src/config/legal';
import { useAuth } from '../../src/features/auth/AuthContext';
import { changePasswordRequest } from '../../src/services/api/auth';
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
  const { user, signOut } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const openExternalLink = async (url: string, errorTitle: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(errorTitle, error instanceof Error ? error.message : 'Falha inesperada.');
    }
  };

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
            Consulte seus dados de acesso e altere a senha sem depender do desktop.
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

      <SectionCard title="Privacidade e termos" subtitle="Links exigidos para distribuicao e publicacao do app">
        <Text style={styles.legalText}>
          O aplicativo usa camera e galeria apenas quando voce escolhe anexar arquivos manualmente. O app nao
          usa localizacao nem microfone.
        </Text>
        <View style={styles.legalActions}>
          <Button
            label="Politica de privacidade"
            onPress={() => void openExternalLink(PRIVACY_POLICY_URL, 'Erro ao abrir politica')}
            variant="secondary"
          />
          <Button
            label="Termos de uso"
            onPress={() => void openExternalLink(TERMS_OF_USE_URL, 'Erro ao abrir termos')}
            variant="ghost"
          />
        </View>
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
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
  legalText: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21
  },
  legalActions: {
    gap: spacing.sm
  }
});
