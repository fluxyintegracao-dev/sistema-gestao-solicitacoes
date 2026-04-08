import { StyleSheet, Text, View } from 'react-native';
import type { HistoricoItem } from '../../services/api/types';
import { colors, radii, spacing } from '../../theme';
import { formatDateTimeBR } from '../../utils/format';

export function TimelineEventCard({ item }: { item: HistoricoItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.action}>{item.acao || 'Historico'}</Text>
        <Text style={styles.meta}>{formatDateTimeBR(item.createdAt)}</Text>
      </View>
      {item.descricao ? <Text style={styles.description}>{item.descricao}</Text> : null}
      {item.observacao ? <Text style={styles.observation}>{item.observacao}</Text> : null}
      {(item.status_anterior || item.status_novo) ? (
        <Text style={styles.meta}>
          Status: {item.status_anterior || '-'} {'->'} {item.status_novo || '-'}
        </Text>
      ) : null}
      <Text style={styles.signature}>{item.usuario?.nome || 'Sistema'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surfaceGlass,
    padding: spacing.md,
    gap: spacing.xs
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md
  },
  action: {
    color: colors.primaryStrong,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  description: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20
  },
  observation: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20
  },
  meta: {
    color: colors.textSoft,
    fontSize: 12
  },
  signature: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700'
  }
});
