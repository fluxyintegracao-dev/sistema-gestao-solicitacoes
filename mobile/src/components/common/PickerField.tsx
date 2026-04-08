import { Picker } from '@react-native-picker/picker';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';

interface PickerItem {
  label: string;
  value: string;
}

interface PickerFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: PickerItem[];
  error?: string;
  helperText?: string;
  enabled?: boolean;
  placeholderLabel?: string;
}

export function PickerField({
  label,
  value,
  onValueChange,
  items,
  error,
  helperText,
  enabled = true,
  placeholderLabel = 'Selecione'
}: PickerFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.container, !enabled ? styles.containerDisabled : null]}>
        <Picker
          enabled={enabled}
          selectedValue={value}
          onValueChange={(nextValue) => onValueChange(String(nextValue || ''))}
        >
          <Picker.Item label={placeholderLabel} value="" />
          {items.map((item) => (
            <Picker.Item key={`${item.value}-${item.label}`} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  container: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.button
  },
  containerDisabled: {
    opacity: 0.65
  },
  error: {
    color: colors.danger,
    fontSize: 12
  },
  helper: {
    color: colors.textMuted,
    fontSize: 12
  }
});
