import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ProvisionamentoListItem } from '../../services/api/types';
import { colors, radii, shadows, spacing } from '../../theme';
import { formatCurrencyBR, formatDateBR } from '../../utils/format';
import {
  formatProvisionamentoPrioridade,
  formatProvisionamentoStatus,
  normalizeProvisionamentoStatus
} from '../../utils/provisionamento';

interface ProvisionamentoCardProps {
  item: ProvisionamentoListItem;
  onPress: () => void;
}

function getStatusColors(status?: string | null) {
  const normalized = normalizeProvisionamentoStatus(status);

  const map: Record<string, { backgroundColor: string; borderColor: string; color: string }> = {
    previsto: {
      backgroundColor: colors.infoSoft,
      borderColor: colors.panelBorderStrong,
      color: colors.info
    },
    em_analise: {
      backgroundColor: colors.warningSoft,
      borderColor: '#E9C48B',
      color: colors.warning
    },
    aprovado: {
      backgroundColor: colors.successSoft,
      borderColor: '#B6E0CC',
      color: colors.success
    },
    cancelado: {
      backgroundColor: colors.dangerSoft,
      borderColor: '#F1C8C8',
      color: colors.danger
    },
    realizado: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.panelBorderStrong,
      color: colors.primaryStrong
    }
  };

  return map[normalized] || map.previsto;
}

export function ProvisionamentoCard({ item, onPress }: ProvisionamentoCardProps) {
  const statusColors = getStatusColors(item.status);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.code}>{item.codigo || `PREV-${item.id}`}</Text>
          <Text style={styles.title} numberOfLines={2}>{item.descricao || 'Previsao sem descricao'}</Text>
        </View>
        <View style={[styles.statusBadge, statusColors]}>
          <Text style={[styles.statusText, { color: statusColors.color }]}>{formatProvisionamentoStatus(item.status)}</Text>
        </View>
      </View>

      <View style={styles.heroLine}>
        <View style={styles.heroMetric}>
          <Text style={styles.heroLabel}>Item Macro</Text>
          <Text style={styles.heroValue} numberOfLines={1}>{item.categoriaMacro?.nome || '-'}</Text>
        </View>
        <View style={styles.valuePill}>
          <Text style={styles.valueLabel}>Valor previsto</Text>
          <Text style={styles.valueText}>{formatCurrencyBR(item.valor_previsto)}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Obra</Text>
          <Text style={styles.metaValue} numberOfLines={1}>{item.obra?.nome || '-'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Data prevista</Text>
          <Text style={styles.metaValue}>{formatDateBR(item.data_prevista_desembolso)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Prioridade</Text>
          <Text style={styles.metaValue}>{formatProvisionamentoPrioridade(item.prioridade)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Criador</Text>
          <Text style={styles.metaValue} numberOfLines={1}>{item.usuarioCriacao?.nome || '-'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card
  },
  pressed: {
    opacity: 0.96,
    transform: [{ translateY: 1 }]
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  headerText: {
    flex: 1,
    gap: spacing.xs
  },
  code: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800'
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800'
  },
  heroLine: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm
  },
  heroMetric: {
    flex: 1,
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceGlass,
    padding: spacing.md
  },
  heroLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  heroValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700'
  },
  valuePill: {
    minWidth: 132,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.primaryStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.button
  },
  valueLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  valueText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800'
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  metaItem: {
    minWidth: '44%',
    flex: 1,
    gap: 2
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metaValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500'
  }
});
