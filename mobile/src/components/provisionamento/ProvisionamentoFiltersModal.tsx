import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ProvisionamentoCategoriaOption, ObraOption, UsuarioPublicoOption } from '../../services/api/types';
import { colors, radii, spacing } from '../../theme';
import { Button } from '../common/Button';
import { PickerField } from '../common/PickerField';
import { TextField } from '../common/TextField';

export interface ProvisionamentoFilters {
  obra_id: string;
  categoria_macro_id: string;
  status: string;
  prioridade: string;
  fornecedor: string;
  data_inicial: string;
  data_final: string;
  valor_minimo: string;
  valor_maximo: string;
  usuario_criacao_id: string;
}

interface ProvisionamentoFiltersModalProps {
  visible: boolean;
  filters: ProvisionamentoFilters;
  obras: ObraOption[];
  categorias: ProvisionamentoCategoriaOption[];
  criadores: UsuarioPublicoOption[];
  statusOptions: Array<{ label: string; value: string }>;
  prioridadeOptions: Array<{ label: string; value: string }>;
  onChange: (patch: Partial<ProvisionamentoFilters>) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

export const EMPTY_PROVISIONAMENTO_FILTERS: ProvisionamentoFilters = {
  obra_id: '',
  categoria_macro_id: '',
  status: '',
  prioridade: '',
  fornecedor: '',
  data_inicial: '',
  data_final: '',
  valor_minimo: '',
  valor_maximo: '',
  usuario_criacao_id: ''
};

export function ProvisionamentoFiltersModal({
  visible,
  filters,
  obras,
  categorias,
  criadores,
  statusOptions,
  prioridadeOptions,
  onChange,
  onApply,
  onClear,
  onClose
}: ProvisionamentoFiltersModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Filtros do provisionamento</Text>
            <Text style={styles.subtitle}>
              Refine a visao por obra, item macro, status, prioridade, periodo e faixa de valor.
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <PickerField
              label="Obra"
              value={filters.obra_id}
              onValueChange={(value) => onChange({ obra_id: value })}
              items={obras.map((item) => ({
                label: item.codigo ? `${item.codigo} - ${item.nome}` : item.nome,
                value: String(item.id)
              }))}
              placeholderLabel="Todas"
            />

            <PickerField
              label="Item Macro"
              value={filters.categoria_macro_id}
              onValueChange={(value) => onChange({ categoria_macro_id: value })}
              items={categorias.map((item) => ({
                label: item.nome,
                value: String(item.id)
              }))}
              placeholderLabel="Todos"
            />

            <PickerField
              label="Status"
              value={filters.status}
              onValueChange={(value) => onChange({ status: value })}
              items={statusOptions}
              placeholderLabel="Todos"
            />

            <PickerField
              label="Prioridade"
              value={filters.prioridade}
              onValueChange={(value) => onChange({ prioridade: value })}
              items={prioridadeOptions}
              placeholderLabel="Todas"
            />

            <PickerField
              label="Criador"
              value={filters.usuario_criacao_id}
              onValueChange={(value) => onChange({ usuario_criacao_id: value })}
              items={criadores.map((item) => ({
                label: item.nome,
                value: String(item.id)
              }))}
              placeholderLabel="Todos"
            />

            <TextField
              label="Fornecedor"
              value={filters.fornecedor}
              onChangeText={(value) => onChange({ fornecedor: value })}
              placeholder="Nome do fornecedor"
            />

            <TextField
              label="Data inicial"
              value={filters.data_inicial}
              onChangeText={(value) => onChange({ data_inicial: value })}
              placeholder="AAAA-MM-DD"
            />

            <TextField
              label="Data final"
              value={filters.data_final}
              onChangeText={(value) => onChange({ data_final: value })}
              placeholder="AAAA-MM-DD"
            />

            <View style={styles.dualFields}>
              <View style={styles.dualField}>
                <TextField
                  label="Valor minimo"
                  value={filters.valor_minimo}
                  onChangeText={(value) => onChange({ valor_minimo: value })}
                  placeholder="0,00"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.dualField}>
                <TextField
                  label="Valor maximo"
                  value={filters.valor_maximo}
                  onChangeText={(value) => onChange({ valor_maximo: value })}
                  placeholder="0,00"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button label="Limpar" onPress={onClear} variant="ghost" fullWidth={false} />
            <Button label="Aplicar" onPress={onApply} fullWidth={false} />
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
    maxHeight: '90%',
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
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.md
  },
  dualFields: {
    flexDirection: 'row',
    gap: spacing.md
  },
  dualField: {
    flex: 1
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  }
});
