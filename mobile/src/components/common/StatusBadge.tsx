import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing } from '../../theme';
import { getStatusTone } from '../../utils/status';

export function StatusBadge({ status }: { status?: string | null }) {
  const tone = getStatusTone(status);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: tone.backgroundColor,
          borderColor: tone.textColor
        }
      ]}
    >
      <Text style={[styles.label, { color: tone.textColor }]}>{status || 'Sem status'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  }
});
