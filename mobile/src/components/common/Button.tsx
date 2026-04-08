import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null
      ]}
    >
      {variant === 'primary' ? <View pointerEvents="none" style={styles.primaryGlow} /> : null}
      {variant !== 'ghost' ? <View pointerEvents="none" style={styles.innerStroke} /> : null}
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].indicator} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, variantStyles[variant].label]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    position: 'relative',
    overflow: 'hidden'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  label: {
    fontSize: 15,
    fontWeight: '700'
  },
  primaryGlow: {
    position: 'absolute',
    top: -16,
    left: 18,
    right: 18,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.14)'
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: radii.md - 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)'
  },
  fullWidth: {
    width: '100%'
  },
  pressed: {
    opacity: 0.96,
    transform: [{ translateY: 1 }]
  },
  disabled: {
    opacity: 0.6
  }
});

const variantStyles = {
  primary: {
    container: {
      backgroundColor: colors.primaryStrong,
      borderWidth: 1,
      borderColor: 'rgba(134, 170, 228, 0.32)',
      ...shadows.button
    },
    label: {
      color: colors.white
    },
    indicator: colors.white
  },
  secondary: {
    container: {
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderColor: colors.panelBorderStrong
    },
    label: {
      color: colors.primary
    },
    indicator: colors.primary
  },
  ghost: {
    container: {
      backgroundColor: 'transparent'
    },
    label: {
      color: colors.primary
    },
    indicator: colors.primary
  }
} as const;
