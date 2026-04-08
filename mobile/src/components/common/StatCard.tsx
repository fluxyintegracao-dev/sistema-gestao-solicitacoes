import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';

interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
}

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  value: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800'
  },
  helper: {
    color: colors.textMuted,
    fontSize: 12
  }
});
