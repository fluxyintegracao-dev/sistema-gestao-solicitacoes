import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.glow} />
      <View pointerEvents="none" style={styles.accent} />
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
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
    overflow: 'hidden',
    ...shadows.card
  },
  glow: {
    position: 'absolute',
    top: -30,
    right: -10,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: colors.panelGlow
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: colors.primarySoft
  },
  header: {
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19
  },
  content: {
    gap: spacing.md
  }
});
