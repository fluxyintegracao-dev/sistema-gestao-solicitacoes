import { Feather } from '@expo/vector-icons';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { LoadingState } from '../../src/components/common/LoadingState';
import { Screen } from '../../src/components/common/Screen';
import { useAuth } from '../../src/features/auth/AuthContext';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  const { status, hasModule, user } = useAuth();
  const pathname = usePathname();

  if (status === 'bootstrapping') {
    return (
      <Screen scroll={false}>
        <LoadingState label="Carregando app..." />
      </Screen>
    );
  }

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasModule('SOLICITACOES')) {
    return <Redirect href="/modulo-indisponivel" />;
  }

  if (user?.mfa_setup_pending && pathname !== '/perfil') {
    return <Redirect href="/perfil" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surfaceGlass,
          borderTopColor: colors.panelBorderStrong,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 6
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          paddingBottom: 6
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="solicitacoes"
        options={{
          title: 'Solicitacoes',
          tabBarIcon: ({ color, size }) => <Feather name="file-text" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />
        }}
      />
    </Tabs>
  );
}
