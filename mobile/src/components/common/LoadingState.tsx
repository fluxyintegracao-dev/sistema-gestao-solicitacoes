import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceGlass
  },
  label: {
    color: colors.textSoft,
    fontSize: 14,
    textAlign: 'center'
  }
});
