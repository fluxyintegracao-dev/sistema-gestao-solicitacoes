import { useState } from 'react';
import { Redirect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../../src/components/common/Button';
import { Screen } from '../../src/components/common/Screen';
import { TextField } from '../../src/components/common/TextField';
import { useAuth } from '../../src/features/auth/AuthContext';
import { colors, spacing } from '../../src/theme';

const loginSchema = z.object({
  email: z.string().email('Informe um email valido'),
  senha: z.string().min(4, 'Informe a senha')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const {
    status,
    hasModule,
    signIn,
    verifyMfa,
    cancelMfa,
    mfaChallenge,
    authError,
    clearAuthError
  } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      senha: ''
    }
  });
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Redirect href={hasModule('SOLICITACOES') ? '/(tabs)' : '/modulo-indisponivel'} />;
  }

  const onSubmit = handleSubmit(async (values) => {
    clearAuthError();
    await signIn(values);
  });

  const onSubmitMfa = async () => {
    clearAuthError();
    setMfaSubmitting(true);
    try {
      await verifyMfa({ codigo: mfaCode });
    } finally {
      setMfaSubmitting(false);
    }
  };

  return (
    <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <Text style={styles.brand}>FLUXY</Text>
          <Text style={styles.title}>Solicitacoes em campo, sem depender do desktop.</Text>
          <Text style={styles.subtitle}>
            Entre com seu acesso para abrir, acompanhar e interagir com solicitacoes.
          </Text>
        </View>

        <View style={styles.form}>
          {mfaChallenge ? (
            <>
              <View style={styles.mfaCallout}>
                <Text style={styles.mfaTitle}>Autenticacao em duas etapas</Text>
                <Text style={styles.mfaText}>
                  Senha validada para {mfaChallenge.user?.nome || mfaChallenge.user?.email || 'este usuario'}.
                  {' '}Informe o codigo de 6 digitos do aplicativo autenticador para concluir o login.
                </Text>
              </View>

              <TextField
                label="Codigo do autenticador"
                value={mfaCode}
                onChangeText={(value) => setMfaCode(value.replace(/\D+/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                helperText="Use o codigo atual do aplicativo autenticador."
              />
            </>
          ) : (
            <>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <TextField
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    error={errors.email?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="senha"
                render={({ field: { onChange, value } }) => (
                  <TextField
                    label="Senha"
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                    error={errors.senha?.message}
                  />
                )}
              />
            </>
          )}

          {authError ? <Text style={styles.error}>{authError}</Text> : null}

          {mfaChallenge ? (
            <View style={styles.actionsRow}>
              <Button
                label="Validar e entrar"
                onPress={() => void onSubmitMfa()}
                loading={mfaSubmitting}
              />
              <Button
                label="Voltar"
                variant="secondary"
                onPress={() => {
                  setMfaCode('');
                  cancelMfa();
                }}
              />
            </View>
          ) : (
            <Button label="Entrar" onPress={() => void onSubmit()} loading={isSubmitting} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md,
    marginBottom: spacing.xxl
  },
  brand: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22
  },
  form: {
    gap: spacing.lg
  },
  error: {
    color: colors.danger,
    fontSize: 13
  },
  mfaCallout: {
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.sm
  },
  mfaTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  mfaText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21
  },
  actionsRow: {
    gap: spacing.md
  }
});
