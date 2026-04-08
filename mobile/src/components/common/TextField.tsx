import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
}

export function TextField({
  label,
  error,
  helperText,
  multiline,
  style,
  editable = true,
  ...props
}: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        editable={editable}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          !editable ? styles.inputDisabled : null,
          style
        ]}
        multiline={multiline}
        {...props}
      />
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
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
    ...shadows.button
  },
  inputDisabled: {
    opacity: 0.65
  },
  multiline: {
    minHeight: 120,
    paddingTop: spacing.md,
    textAlignVertical: 'top'
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
