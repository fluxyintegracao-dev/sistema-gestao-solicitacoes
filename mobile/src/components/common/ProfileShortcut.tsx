import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../features/auth/AuthContext';
import { colors, spacing } from '../../theme';
import { BrandLogo } from './BrandLogo';
import { NotificationBell } from './NotificationBell';

interface ProfileShortcutProps {
  subtitle?: string;
}

export function ProfileShortcut({ subtitle = 'Meu perfil' }: ProfileShortcutProps) {
  const { user } = useAuth();

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => router.push('/perfil')}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.pressed : null
        ]}
      >
        <BrandLogo withCard />
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
    gap: spacing.md
  },
  pressed: {
    opacity: 0.94
  },
  textBlock: {
    flex: 1,
    gap: 2,
    maxWidth: 180
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
