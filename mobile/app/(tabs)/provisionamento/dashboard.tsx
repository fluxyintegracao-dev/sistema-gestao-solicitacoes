import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { LoadingState } from '../../../src/components/common/LoadingState';
import { ProfileShortcut } from '../../../src/components/common/ProfileShortcut';
import { Screen } from '../../../src/components/common/Screen';
import { SectionCard } from '../../../src/components/common/SectionCard';
import { StatCard } from '../../../src/components/common/StatCard';
import { useModules } from '../../../src/features/modules/ModulesContext';
import { getDashboardProvisionamentoFinanceiro } from '../../../src/services/api/provisionamento';
import { colors, radii, spacing } from '../../../src/theme';
import { formatCurrencyBR } from '../../../src/utils/format';
import { formatProvisionamentoStatus } from '../../../src/utils/provisionamento';

export default function ProvisionamentoDashboardPage() {
  const { hasProvisionamentoAccess, canViewProvisionamentoDashboard } = useModules();
  const dashboardQuery = useQuery({
    queryKey: ['provisionamento', 'dashboard-mobile'],
    queryFn: () => getDashboardProvisionamentoFinanceiro(),
    enabled: hasProvisionamentoAccess && canViewProvisionamentoDashboard
  });

  if (!hasProvisionamentoAccess || !canViewProvisionamentoDashboard) {
    return <Redirect href="/modulo-indisponivel" />;
  }

  if (dashboardQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Carregando dashboard..." />
      </Screen>
    );
  }

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <Screen>
        <EmptyState
          title="Dashboard indisponivel"
          description="Nao foi possivel carregar a leitura gerencial do provisionamento."
          actionLabel="Tentar novamente"
          onAction={() => void dashboardQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={dashboardQuery.isRefetching} onRefresh={() => void dashboardQuery.refetch()}>
      <ProfileShortcut subtitle="Conta" />

      <SectionCard
        title="Dashboard do provisionamento"
        subtitle="Visao consolidada para tomada de decisao financeira no curto prazo."
      >
        <View style={styles.statsGrid}>
          <StatCard label="Total no periodo" value={formatCurrencyBR(dashboard.cards.total_periodo)} />
          <StatCard label="Proximos 7 dias" value={formatCurrencyBR(dashboard.cards.total_proximos_7_dias)} />
          <StatCard label="Proximos 30 dias" value={formatCurrencyBR(dashboard.cards.total_proximos_30_dias)} />
          <StatCard label="Abertas" value={dashboard.cards.quantidade_abertas} />
        </View>
      </SectionCard>

      <SectionCard title="Pipeline por status" subtitle="Leitura do volume financeiro por etapa">
        {(dashboard.graficos.pipeline_status || []).length === 0 ? (
          <EmptyState title="Sem dados" description="Nenhum status consolidado para o recorte atual." />
        ) : (
          <View style={styles.listColumn}>
            {dashboard.graficos.pipeline_status.map((item) => (
              <View key={item.status} style={styles.metricRow}>
                <View>
                  <Text style={styles.metricTitle}>{formatProvisionamentoStatus(item.status)}</Text>
                  <Text style={styles.metricSubtitle}>{item.quantidade} registro(s)</Text>
                </View>
                <Text style={styles.metricValue}>{formatCurrencyBR(item.total_valor)}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Top obras" subtitle="Maior concentracao de provisao no recorte atual">
        {(dashboard.graficos.por_obra || []).length === 0 ? (
          <EmptyState title="Sem obras" description="Nao ha obras com provisao no recorte atual." />
        ) : (
          <View style={styles.listColumn}>
            {dashboard.graficos.por_obra.slice(0, 5).map((item) => (
              <View key={item.obra_id} style={styles.metricRow}>
                <View style={styles.metricTextBlock}>
                  <Text style={styles.metricTitle}>{item.obra?.nome || '-'}</Text>
                  <Text style={styles.metricSubtitle}>{item.quantidade} previsao(oes)</Text>
                </View>
                <Text style={styles.metricValue}>{formatCurrencyBR(item.total_valor)}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Top itens macro" subtitle="Naturezas de gasto com maior peso financeiro">
        {(dashboard.graficos.por_categoria || []).length === 0 ? (
          <EmptyState title="Sem categorias" description="Nao ha itens macro no recorte atual." />
        ) : (
          <View style={styles.listColumn}>
            {dashboard.graficos.por_categoria.slice(0, 5).map((item) => (
              <View key={item.categoria_macro_id} style={styles.metricRow}>
                <View style={styles.metricTextBlock}>
                  <Text style={styles.metricTitle}>{item.categoria?.nome || '-'}</Text>
                  <Text style={styles.metricSubtitle}>{item.quantidade} previsao(oes)</Text>
                </View>
                <Text style={styles.metricValue}>{formatCurrencyBR(item.total_valor)}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Alertas" subtitle="Itens que merecem atencao imediata">
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>Vencidas nao tratadas</Text>
          <Text style={styles.alertValue}>{dashboard.alertas.vencidas_nao_tratadas.quantidade}</Text>
        </View>
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>Criticas proximas</Text>
          <Text style={styles.alertValue}>{dashboard.alertas.itens_criticos_proximos.quantidade}</Text>
        </View>
        {(dashboard.alertas.obras_concentracao_alta || []).slice(0, 3).map((item) => (
          <View key={item.obra_id} style={styles.alertRow}>
            <Text style={styles.metricTitle}>{item.obra?.nome || '-'}</Text>
            <Text style={styles.metricSubtitle}>
              {item.percentual}% do total · {formatCurrencyBR(item.total_valor)}
            </Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  listColumn: {
    gap: spacing.md
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surfaceGlass,
    padding: spacing.md
  },
  metricTextBlock: {
    flex: 1,
    gap: spacing.xs
  },
  metricTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  metricSubtitle: {
    color: colors.textMuted,
    fontSize: 12
  },
  metricValue: {
    color: colors.primaryStrong,
    fontSize: 14,
    fontWeight: '800'
  },
  alertBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    gap: spacing.xs
  },
  alertTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  alertValue: {
    color: colors.warning,
    fontSize: 24,
    fontWeight: '800'
  },
  alertRow: {
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surfaceGlass,
    padding: spacing.md
  }
});
