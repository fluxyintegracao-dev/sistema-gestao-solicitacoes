import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Button } from './Button';
import { TextField } from './TextField';

interface ActionCommentModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  value: string;
  onChangeText: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  required?: boolean;
  confirmLabel?: string;
}

export function ActionCommentModal({
  visible,
  title,
  subtitle,
  value,
  onChangeText,
  onClose,
  onSubmit,
  loading = false,
  required = false,
  confirmLabel = 'Confirmar'
}: ActionCommentModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <TextField
            label={required ? 'Comentario obrigatorio' : 'Comentario'}
            value={value}
            onChangeText={onChangeText}
            placeholder={required ? 'Informe o motivo desta acao' : 'Opcional'}
            multiline
          />

          <View style={styles.footer}>
            <Button
              label="Cancelar"
              onPress={onClose}
              variant="secondary"
              fullWidth={false}
            />
            <Button
              label={loading ? 'Enviando...' : confirmLabel}
              onPress={onSubmit}
              loading={loading}
              fullWidth={false}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end'
  },
  sheet: {
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
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  }
});
