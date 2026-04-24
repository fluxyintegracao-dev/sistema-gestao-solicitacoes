import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../features/auth/AuthContext';
import { colors, radii, shadows, spacing } from '../../theme';
import { NotificationBell } from './NotificationBell';

function buildInitials(name?: string | null) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'FL';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

interface ProfileShortcutProps {
  subtitle?: string;
}

export function ProfileShortcut({ subtitle = 'Meu perfil' }: ProfileShortcutProps) {
  const { user } = useAuth();
  const initials = buildInitials(user?.nome);

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => router.push('/perfil')}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.pressed : null
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.label}>{subtitle}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {user?.nome || 'Usuario'}
          </Text>
        </View>
      </Pressable>
      <NotificationBell />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  pressed: {
    opacity: 0.94
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button
  },
  initials: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800'
  },
  textBlock: {
    flex: 1,
    gap: 2,
    maxWidth: 220
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700'
  }
});
