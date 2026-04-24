import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../../src/components/common/Button';
import { EmptyState } from '../../src/components/common/EmptyState';
import { LoadingState } from '../../src/components/common/LoadingState';
import { ProfileShortcut } from '../../src/components/common/ProfileShortcut';
import { Screen } from '../../src/components/common/Screen';
import { SectionCard } from '../../src/components/common/SectionCard';
import { SolicitationCard } from '../../src/components/solicitacoes/SolicitationCard';
import { useAuth } from '../../src/features/auth/AuthContext';
import { getSolicitacoesPage } from '../../src/services/api/solicitacoes';
import { colors, spacing } from '../../src/theme';

export default function HomePage() {
  const { user } = useAuth();
  const recentesQuery = useQuery({
    queryKey: ['solicitacoes', 'recentes'],
    queryFn: () => getSolicitacoesPage({ page: 1, limit: 5 })
  });

  const recentes = recentesQuery.data?.items || [];

  if (recentesQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Carregando sua operacao..." />
      </Screen>
    );
  }

  const refresh = async () => {
    await recentesQuery.refetch();
  };

  return (
    <Screen
      refreshing={recentesQuery.isRefetching}
      onRefresh={() => void refresh()}
    >
      <ProfileShortcut subtitle="Conta" />

      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Text style={styles.eyebrow}>Fluxy mobile</Text>
          <Text style={styles.heroBadgeText}>Operacao em campo</Text>
        </View>
        <Text style={styles.title}>Ola, {user?.nome?.split(' ')[0] || 'usuario'}</Text>
        <Text style={styles.subtitle}>
          Acompanhe, assuma e resolva solicitacoes com leitura rapida, historico auditavel e anexos no mesmo fluxo.
        </Text>
      </View>

      <SectionCard
        title="Acoes rapidas"
        subtitle="Atalhos diretos para o que mais acontece no dia a dia da obra e da operacao"
      >
        <View style={styles.actions}>
          <Button
            label="Nova solicitacao"
            onPress={() => router.push('/solicitacoes/nova')}
            icon={<Feather name="plus" size={16} color={colors.white} />}
          />
          <Button
            label="Minhas solicitacoes"
            onPress={() => router.push('/solicitacoes')}
            variant="secondary"
            icon={<Feather name="layers" size={16} color={colors.primary} />}
          />
          <Button
            label="Atualizar"
            onPress={() => void refresh()}
            variant="ghost"
            icon={<Feather name="refresh-cw" size={16} color={colors.primary} />}
          />
        </View>
      </SectionCard>

      <SectionCard title="Recentes" subtitle="Ultimas solicitacoes visiveis para voce">
        {recentes.length === 0 ? (
          <EmptyState
            title="Nada por aqui"
            description="Assim que novas solicitacoes aparecerem, elas vao ficar disponiveis nesta tela."
          />
        ) : (
          <View style={styles.list}>
            {recentes.map((item) => (
              <SolicitationCard
                key={item.id}
                item={item}
                onPress={() => router.push({ pathname: '/solicitacoes/[id]', params: { id: String(item.id) } })}
              />
            ))}
          </View>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    ...({
      shadowColor: colors.primary,
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 6
    })
  },
  heroBadge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center'
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  heroBadgeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700'
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22
  },
  actions: {
    gap: spacing.md
  },
  list: {
    gap: spacing.md
  }
});
