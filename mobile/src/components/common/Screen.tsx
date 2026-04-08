import type { ReactNode } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import { colors, spacing } from '../../theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentContainerStyle
}: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.shell}>
          <View pointerEvents="none" style={styles.backdrop}>
            <View style={styles.glowPrimary} />
            <View style={styles.glowSecondary} />
          </View>
          <View style={[styles.content, contentContainerStyle]}>{children}</View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <View pointerEvents="none" style={styles.backdrop}>
          <View style={styles.glowPrimary} />
          <View style={styles.glowSecondary} />
        </View>
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  shell: {
    flex: 1,
    overflow: 'hidden'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  glowPrimary: {
    position: 'absolute',
    top: -120,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: colors.primaryGlow
  },
  glowSecondary: {
    position: 'absolute',
    bottom: -120,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: colors.panelGlow
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg
  }
});
