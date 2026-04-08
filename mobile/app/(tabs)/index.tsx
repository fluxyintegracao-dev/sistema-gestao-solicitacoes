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
import { useModules } from '../../src/features/modules/ModulesContext';
import { getSolicitacoesPage } from '../../src/services/api/solicitacoes';
import { listarProvisoesFinanceiras } from '../../src/services/api/provisionamento';
import { colors, spacing } from '../../src/theme';
import { formatCurrencyBR, formatDateBR } from '../../src/utils/format';

export default function HomePage() {
  const { user } = useAuth();
  const {
    hasSolicitacoesModule,
    hasProvisionamentoAccess,
    canCreateProvisionamento,
    canViewProvisionamentoDashboard
  } = useModules();
  const recentesQuery = useQuery({
    queryKey: ['solicitacoes', 'recentes'],
    queryFn: () => getSolicitacoesPage({ page: 1, limit: 5 }),
    enabled: hasSolicitacoesModule
  });
  const provisoesRecentesQuery = useQuery({
    queryKey: ['provisionamento', 'recentes'],
    queryFn: () => listarProvisoesFinanceiras({ page: 1, limit: 5, sort_by: 'createdAt', sort_dir: 'DESC' }),
    enabled: hasProvisionamentoAccess
  });

  const recentes = recentesQuery.data?.items || [];
  const provisoesRecentes = provisoesRecentesQuery.data?.items || [];

  if ((hasSolicitacoesModule && recentesQuery.isLoading) || (hasProvisionamentoAccess && provisoesRecentesQuery.isLoading)) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Carregando sua operacao..." />
      </Screen>
    );
  }

  const refresh = async () => {
    await Promise.all([
      hasSolicitacoesModule ? recentesQuery.refetch() : Promise.resolve(),
      hasProvisionamentoAccess ? provisoesRecentesQuery.refetch() : Promise.resolve()
    ]);
  };

  return (
    <Screen
      refreshing={recentesQuery.isRefetching}
      onRefresh={() => void refresh()}
    >
      <ProfileShortcut subtitle="Conta" />

      <View style={styles.hero}>
        <Text style={styles.title}>Ola, {user?.nome?.split(' ')[0] || 'usuario'}</Text>
        <Text style={styles.subtitle}>
          Use os modulos operacionais do FLUXY com o mesmo backend em producao, sem depender do desktop.
        </Text>
      </View>

      <SectionCard
        title="Acoes rapidas"
        subtitle="Atalhos diretos para o fluxo principal de Solicitacoes e Provisionamento"
      >
        <View style={styles.actions}>
          {hasSolicitacoesModule ? (
            <>
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
            </>
          ) : null}
          {hasProvisionamentoAccess ? (
            <>
              {canCreateProvisionamento ? (
                <Button
                  label="Nova provisao"
                  onPress={() => router.push('/provisionamento/nova')}
                  variant={hasSolicitacoesModule ? 'secondary' : 'primary'}
                  icon={<Feather name="plus-circle" size={16} color={hasSolicitacoesModule ? colors.primary : colors.white} />}
                />
              ) : null}
              <Button
                label="Provisionamento"
                onPress={() => router.push('/provisionamento')}
                variant="secondary"
                icon={<Feather name="dollar-sign" size={16} color={colors.primary} />}
              />
              {canViewProvisionamentoDashboard ? (
                <Button
                  label="Dashboard financeiro"
                  onPress={() => router.push('/provisionamento/dashboard')}
                  variant="ghost"
                  icon={<Feather name="bar-chart-2" size={16} color={colors.primary} />}
                />
              ) : null}
            </>
          ) : null}
          <Button
            label="Atualizar"
            onPress={() => void refresh()}
            variant="ghost"
            icon={<Feather name="refresh-cw" size={16} color={colors.primary} />}
          />
        </View>
      </SectionCard>

      {hasSolicitacoesModule ? (
        <SectionCard title="Solicitacoes recentes" subtitle="Ultimas solicitacoes visiveis para voce">
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
      ) : null}

      {hasProvisionamentoAccess ? (
        <SectionCard title="Provisionamento recente" subtitle="Ultimas previsoes financeiras registradas no seu escopo">
          {provisoesRecentes.length === 0 ? (
            <EmptyState
              title="Nenhuma provisao recente"
              description="As previsoes financeiras visiveis para voce aparecerao aqui."
            />
          ) : (
            <View style={styles.list}>
              {provisoesRecentes.map((item) => (
                <View key={item.id} style={styles.provisaoCard}>
                  <View style={styles.provisaoHeader}>
                    <Text style={styles.provisaoCode}>{item.codigo}</Text>
                    <Text style={styles.provisaoStatus}>{String(item.status || '-').replace(/_/g, ' ').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.provisaoDescricao}>{item.descricao || 'Previsao sem descricao'}</Text>
                  <View style={styles.provisaoMeta}>
                    <Text style={styles.provisaoMetaText}>{item.categoriaMacro?.nome || '-'}</Text>
                    <Text style={styles.provisaoMetaText}>{formatDateBR(item.data_prevista_desembolso)}</Text>
                  </View>
                  <View style={styles.provisaoFooter}>
                    <Text style={styles.provisaoObra}>{item.obra?.nome || '-'}</Text>
                    <Text style={styles.provisaoValor}>{formatCurrencyBR(item.valor_previsto)}</Text>
                  </View>
                  <Button
                    label="Abrir previsao"
                    onPress={() => router.push({ pathname: '/provisionamento/[id]', params: { id: String(item.id) } })}
                    variant="ghost"
                    fullWidth={false}
                  />
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      ) : null}
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
  },
  provisaoCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass
  },
  provisaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  provisaoCode: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800'
  },
  provisaoStatus: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700'
  },
  provisaoDescricao: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700'
  },
  provisaoMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  provisaoMetaText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  provisaoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm
  },
  provisaoObra: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600'
  },
  provisaoValor: {
    color: colors.primaryStrong,
    fontSize: 15,
    fontWeight: '800'
  }
});
