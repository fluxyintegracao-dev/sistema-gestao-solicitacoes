import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useNotifications } from '../../features/notifications/NotificationsContext';
import type { NotificacaoItem } from '../../services/api/types';
import { colors, radii, shadows, spacing } from '../../theme';
import { formatDateTimeBR } from '../../utils/format';
import { Button } from './Button';

function buildNotificationPreview(item: NotificacaoItem) {
  const comentario = String(item.metadata?.comentario || '').trim();
  if (comentario) {
    return comentario;
  }

  const mensagem = String(item.mensagem || '').trim();
  if (mensagem) {
    return mensagem;
  }

  return 'Voce foi mencionado em uma solicitacao.';
}

export function NotificationBell() {
  const [visible, setVisible] = useState(false);
  const {
    items,
    unreadCount,
    isLoading,
    isRefreshing,
    refresh,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const handleOpen = () => {
    setVisible(true);
    void refresh();
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      Alert.alert(
        'Erro ao atualizar notificacoes',
        error instanceof Error ? error.message : 'Falha ao marcar notificacoes como lidas.'
      );
    }
  };

  const handleOpenNotification = async (item: NotificacaoItem) => {
    try {
      if (!item.lida_em) {
        await markAsRead(item.destinatario_id);
      }

      setVisible(false);

      if (item.solicitacao_id) {
        router.push({
          pathname: '/solicitacoes/[id]',
          params: { id: String(item.solicitacao_id) }
        });
      }
    } catch (error) {
      Alert.alert(
        'Erro ao abrir notificacao',
        error instanceof Error ? error.message : 'Falha ao abrir a solicitacao mencionada.'
      );
    }
  };

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : null
        ]}
      >
        <Feather name="bell" size={20} color={colors.primaryStrong} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : String(unreadCount)}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Mencoes</Text>
                <Text style={styles.subtitle}>
                  O sino do app acompanha apenas mencoes em comentarios para evitar ruido e reduzir leitura desnecessaria.
                </Text>
              </View>
              <View style={styles.counter}>
                <Text style={styles.counterText}>{unreadCount} nao lida(s)</Text>
              </View>
            </View>

            <View style={styles.toolbar}>
              <Button
                label={isRefreshing ? 'Atualizando...' : 'Atualizar'}
                onPress={() => void refresh()}
                variant="ghost"
                fullWidth={false}
              />
              {unreadCount > 0 ? (
                <Button
                  label="Marcar todas"
                  onPress={() => void handleMarkAll()}
                  variant="secondary"
                  fullWidth={false}
                />
              ) : null}
            </View>

            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Carregando mencoes...</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nenhuma mencao pendente</Text>
                <Text style={styles.emptyDescription}>
                  Quando alguem mencionar voce em uma solicitacao, ela vai aparecer aqui.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {items.map((item) => (
                  <Pressable
                    key={item.destinatario_id}
                    onPress={() => void handleOpenNotification(item)}
                    style={({ pressed }) => [
                      styles.itemCard,
                      !item.lida_em ? styles.itemCardUnread : null,
                      pressed ? styles.itemCardPressed : null
                    ]}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemType}>Mencao em comentario</Text>
                      {!item.lida_em ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <Text style={styles.itemMessage} numberOfLines={3}>
                      {buildNotificationPreview(item)}
                    </Text>
                    <View style={styles.itemFooter}>
                      <Text style={styles.itemMeta}>
                        {item.solicitacao_id ? `Solicitacao #${item.solicitacao_id}` : 'Sem vinculo'}
                      </Text>
                      <Text style={styles.itemMeta}>{formatDateTimeBR(item.createdAt)}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.button
  },
  buttonPressed: {
    opacity: 0.96
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: radii.pill,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800'
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end'
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.panelBorderStrong
  },
  header: {
    gap: spacing.sm
  },
  headerText: {
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20
  },
  counter: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  counterText: {
    color: colors.primaryStrong,
    fontSize: 12,
    fontWeight: '800'
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13
  },
  emptyState: {
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    alignItems: 'center'
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20
  },
  list: {
    flexGrow: 0
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.md
  },
  itemCard: {
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: spacing.lg
  },
  itemCardUnread: {
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceRaised
  },
  itemCardPressed: {
    opacity: 0.96
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  itemType: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.danger
  },
  itemMessage: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600'
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700'
  }
});
