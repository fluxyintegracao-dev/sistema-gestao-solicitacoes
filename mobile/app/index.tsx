import { Redirect } from 'expo-router';
import { LoadingState } from '../src/components/common/LoadingState';
import { Screen } from '../src/components/common/Screen';
import { useAuth } from '../src/features/auth/AuthContext';
import { useModules } from '../src/features/modules/ModulesContext';

export default function IndexPage() {
  const { status } = useAuth();
  const { loadingProvisionamento, hasAnyOperationalModule } = useModules();

  if (status === 'bootstrapping' || (status === 'authenticated' && loadingProvisionamento)) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparando seu acesso..." />
      </Screen>
    );
  }

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasAnyOperationalModule) {
    return <Redirect href="/modulo-indisponivel" />;
  }

  return <Redirect href="/(tabs)" />;
}
