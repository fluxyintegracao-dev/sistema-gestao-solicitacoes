import { Feather } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { LoadingState } from '../../src/components/common/LoadingState';
import { Screen } from '../../src/components/common/Screen';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useModules } from '../../src/features/modules/ModulesContext';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  const { status } = useAuth();
  const {
    loadingProvisionamento,
    hasSolicitacoesModule,
    hasProvisionamentoAccess,
    hasAnyOperationalModule
  } = useModules();

  if (status === 'bootstrapping' || (status === 'authenticated' && loadingProvisionamento)) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Carregando app..." />
      </Screen>
    );
  }

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasAnyOperationalModule) {
    return <Redirect href="/modulo-indisponivel" />;
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
          href: hasSolicitacoesModule ? undefined : null,
          title: 'Solicitacoes',
          tabBarIcon: ({ color, size }) => <Feather name="file-text" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="provisionamento"
        options={{
          href: hasProvisionamentoAccess ? undefined : null,
          title: 'Provisionamento',
          tabBarIcon: ({ color, size }) => <Feather name="dollar-sign" size={size} color={color} />
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
