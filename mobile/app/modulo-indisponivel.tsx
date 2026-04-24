import { Redirect } from 'expo-router';
import { Button } from '../src/components/common/Button';
import { EmptyState } from '../src/components/common/EmptyState';
import { Screen } from '../src/components/common/Screen';
import { useAuth } from '../src/features/auth/AuthContext';

export default function ModuloIndisponivelPage() {
  const { status, signOut } = useAuth();

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <EmptyState
        title="Modulo indisponivel"
        description="O modulo de Solicitacoes nao esta habilitado para este usuario neste momento."
      />
      <Button label="Sair" onPress={() => void signOut()} variant="secondary" />
    </Screen>
  );
}
