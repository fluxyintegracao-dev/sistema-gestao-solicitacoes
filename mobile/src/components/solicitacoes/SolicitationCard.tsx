import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SolicitacaoListItem } from '../../services/api/types';
import { colors, radii, shadows, spacing } from '../../theme';
import { formatCurrencyBR, formatDateBR } from '../../utils/format';
import { StatusBadge } from '../common/StatusBadge';

interface SolicitationCardProps {
  item: SolicitacaoListItem;
  onPress: () => void;
}

export function SolicitationCard({ item, onPress }: SolicitationCardProps) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.code}>{item.codigo || `SC-${item.id}`}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {item.descricao || 'Solicitacao sem descricao'}
          </Text>
        </View>
        <StatusBadge status={item.status_global} />
      </View>

      <View style={styles.heroLine}>
        <View style={styles.heroMetric}>
          <Text style={styles.heroLabel}>Responsavel atual</Text>
          <Text style={styles.heroValue} numberOfLines={1}>
            {item.responsavel || 'Aguardando assuncao'}
          </Text>
        </View>
        <View style={styles.valuePill}>
          <Text style={styles.valueLabel}>Valor</Text>
          <Text style={styles.valueText}>{formatCurrencyBR(item.valor)}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Obra</Text>
          <Text style={styles.metaValue} numberOfLines={1}>{item.obra?.nome || '-'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Setor atual</Text>
          <Text style={styles.metaValue} numberOfLines={1}>{item.setor_status_atual || item.area_responsavel || '-'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Tipo</Text>
          <Text style={styles.metaValue} numberOfLines={1}>{item.tipo?.nome || '-'}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Criada em</Text>
        <Text style={styles.footerValue}>{formatDateBR(item.createdAt)}</Text>
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
    minWidth: 118,
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
    minWidth: '30%',
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
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.sm
  },
  footerLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  footerValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  }
});
