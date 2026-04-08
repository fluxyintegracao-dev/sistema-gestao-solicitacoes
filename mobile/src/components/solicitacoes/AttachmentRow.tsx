import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { formatDateTimeBR } from '../../utils/format';

interface AttachmentRowProps {
  title: string;
  createdAt?: string | null;
  onPress: () => void;
}

export function AttachmentRow({ title, createdAt, onPress }: AttachmentRowProps) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]} onPress={onPress}>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{formatDateTimeBR(createdAt)}</Text>
      </View>
      <Text style={styles.cta}>Abrir</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surfaceGlass,
    padding: spacing.md
  },
  pressed: {
    opacity: 0.92
  },
  texts: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  meta: {
    color: colors.textSoft,
    fontSize: 12
  },
  cta: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700'
  }
});
