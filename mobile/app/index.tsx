import { Redirect } from 'expo-router';
import { LoadingState } from '../src/components/common/LoadingState';
import { Screen } from '../src/components/common/Screen';
import { useAuth } from '../src/features/auth/AuthContext';

export default function IndexPage() {
  const { status, hasModule } = useAuth();

  if (status === 'bootstrapping') {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparando seu acesso..." />
      </Screen>
    );
  }

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasModule('SOLICITACOES')) {
    return <Redirect href="/modulo-indisponivel" />;
  }

  return <Redirect href="/(tabs)" />;
}
