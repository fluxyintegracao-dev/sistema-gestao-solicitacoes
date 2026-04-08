import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing } from '../../theme';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function Chip({ label, active = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        active ? styles.active : styles.inactive,
        pressed ? styles.pressed : null
      ]}
    >
      <Text style={[styles.label, active ? styles.activeLabel : styles.inactiveLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1
  },
  active: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  inactive: {
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.panelBorder
  },
  label: {
    fontSize: 13,
    fontWeight: '700'
  },
  activeLabel: {
    color: colors.white
  },
  inactiveLabel: {
    color: colors.primary
  },
  pressed: {
    opacity: 0.94
  }
});
