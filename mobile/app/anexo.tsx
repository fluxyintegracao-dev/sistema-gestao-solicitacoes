import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Screen } from '../src/components/common/Screen';
import { colors, radii, shadows, spacing } from '../src/theme';

type PreviewKind = 'image' | 'pdf' | 'document';

function inferPreviewKind(source?: string | null, title?: string | null): PreviewKind {
  const referencia = String(source || title || '').toLowerCase();

  if (/\.(png|jpg|jpeg|gif|webp|bmp|heic)(\?|$)/i.test(referencia)) {
    return 'image';
  }

  if (/\.pdf(\?|$)/i.test(referencia)) {
    return 'pdf';
  }

  return 'document';
}

export default function AnexoPreviewPage() {
  const params = useLocalSearchParams<{ url?: string; title?: string; source?: string }>();
  const url = String(params.url || '').trim();
  const title = String(params.title || 'Anexo').trim();
  const kind = useMemo(() => inferPreviewKind(params.source, params.title), [params.source, params.title]);

  const handleAbrirNavegador = async () => {
    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Erro ao abrir anexo', error instanceof Error ? error.message : 'Falha inesperada.');
    }
  };

  if (!url) {
    return (
      <Screen>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Anexo indisponivel</Text>
          <Text style={styles.emptyDescription}>
            Nao foi possivel identificar a URL assinada deste arquivo.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Visualizacao interna</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Pressable style={styles.browserButton} onPress={() => void handleAbrirNavegador()}>
          <Feather name="external-link" size={16} color={colors.primaryStrong} />
          <Text style={styles.browserButtonLabel}>Abrir no navegador</Text>
        </Pressable>
      </View>

      <View style={styles.viewerShell}>
        {kind === 'image' ? (
          <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
        ) : (
          <WebView
            source={{ uri: url }}
            style={styles.webview}
            startInLoadingState
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    ...shadows.card
  },
  headerText: {
    gap: spacing.xs
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800'
  },
  browserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  browserButtonLabel: {
    color: colors.primaryStrong,
    fontSize: 13,
    fontWeight: '700'
  },
  viewerShell: {
    flex: 1,
    minHeight: 520,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    ...shadows.card
  },
  image: {
    width: '100%',
    height: '100%'
  },
  webview: {
    flex: 1,
    backgroundColor: colors.surface
  },
  emptyState: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800'
  },
  emptyDescription: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21
  }
});
