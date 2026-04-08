import { Redirect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { BrandLogo } from '../../src/components/common/BrandLogo';
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
  const { status, signIn, authError, clearAuthError } = useAuth();
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

  if (status === 'authenticated') {
    return <Redirect href="/" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    clearAuthError();
    await signIn(values);
  });

  return (
    <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <BrandLogo withCard />
          <Text style={styles.title}>Solicitacoes em campo, sem depender do desktop.</Text>
          <Text style={styles.subtitle}>
            Entre com seu acesso para abrir, acompanhar e interagir com solicitacoes.
          </Text>
        </View>

        <View style={styles.form}>
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

          {authError ? <Text style={styles.error}>{authError}</Text> : null}

          <Button label="Entrar" onPress={() => void onSubmit()} loading={isSubmitting} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xxl
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
  }
});
