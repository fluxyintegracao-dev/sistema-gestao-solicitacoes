import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../common/Button';
import { colors, radii, spacing } from '../../theme';

export interface SolicitacoesAdvancedFilters {
  obraIds: string[];
  areas: string[];
  tipoSolicitacaoIds: string[];
  statuses: string[];
  onlyMine: boolean;
}

interface PickerOption {
  label: string;
  value: string;
}

interface SolicitacoesFiltersModalProps {
  visible: boolean;
  filters: SolicitacoesAdvancedFilters;
  selectedCount: number;
  obraItems: PickerOption[];
  setorItems: PickerOption[];
  tipoItems: PickerOption[];
  statusItems: PickerOption[];
  onChange: (patch: Partial<SolicitacoesAdvancedFilters>) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

export const EMPTY_SOLICITACOES_FILTERS: SolicitacoesAdvancedFilters = {
  obraIds: [],
  areas: [],
  tipoSolicitacaoIds: [],
  statuses: [],
  onlyMine: false
};

export function cloneSolicitacoesFilters(
  filters: SolicitacoesAdvancedFilters = EMPTY_SOLICITACOES_FILTERS
): SolicitacoesAdvancedFilters {
  return {
    obraIds: [...filters.obraIds],
    areas: [...filters.areas],
    tipoSolicitacaoIds: [...filters.tipoSolicitacaoIds],
    statuses: [...filters.statuses],
    onlyMine: filters.onlyMine
  };
}

export function countActiveSolicitacaoFilters(filters: SolicitacoesAdvancedFilters) {
  return (
    filters.obraIds.length +
    filters.areas.length +
    filters.tipoSolicitacaoIds.length +
    filters.statuses.length +
    (filters.onlyMine ? 1 : 0)
  );
}

function toggleSelection(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function CheckboxRow({
  label,
  checked,
  onPress
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.optionRow} onPress={onPress}>
      <View style={[styles.checkbox, checked ? styles.checkboxActive : null]}>
        {checked ? <View style={styles.checkboxInner} /> : null}
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
    </Pressable>
  );
}

function FilterSection({
  title,
  items,
  selectedValues,
  onToggle
}: {
  title: string;
  items: PickerOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        style={styles.sectionScroll}
        contentContainerStyle={styles.sectionOptions}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        persistentScrollbar
      >
        {items.map((item) => (
          <CheckboxRow
            key={`${title}-${item.value}`}
            label={item.label}
            checked={selectedValues.includes(item.value)}
            onPress={() => onToggle(item.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export function SolicitacoesFiltersModal({
  visible,
  filters,
  selectedCount,
  obraItems,
  setorItems,
  tipoItems,
  statusItems,
  onChange,
  onApply,
  onClear,
  onClose
}: SolicitacoesFiltersModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Filtros da operacao</Text>
              <Text style={styles.subtitle}>
                Selecione mais de uma opcao por grupo para refinar a lista com o mesmo criterio do web.
              </Text>
            </View>
            {selectedCount > 0 ? (
              <View style={styles.counter}>
                <Text style={styles.counterText}>{selectedCount} ativos</Text>
              </View>
            ) : null}
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Escopo</Text>
              <View style={styles.sectionOptions}>
                <CheckboxRow
                  label="Somente minhas"
                  checked={filters.onlyMine}
                  onPress={() => onChange({ onlyMine: !filters.onlyMine })}
                />
              </View>
            </View>

            <FilterSection
              title="Obra"
              items={obraItems}
              selectedValues={filters.obraIds}
              onToggle={(value) => onChange({ obraIds: toggleSelection(filters.obraIds, value) })}
            />

            <FilterSection
              title="Setor"
              items={setorItems}
              selectedValues={filters.areas}
              onToggle={(value) => onChange({ areas: toggleSelection(filters.areas, value) })}
            />

            <FilterSection
              title="Tipo de solicitacao"
              items={tipoItems}
              selectedValues={filters.tipoSolicitacaoIds}
              onToggle={(value) => onChange({
                tipoSolicitacaoIds: toggleSelection(filters.tipoSolicitacaoIds, value)
              })}
            />

            <FilterSection
              title="Status especifico"
              items={statusItems}
              selectedValues={filters.statuses}
              onToggle={(value) => onChange({ statuses: toggleSelection(filters.statuses, value) })}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="Limpar"
              onPress={onClear}
              variant="ghost"
              fullWidth={false}
            />
            <Button
              label="Aplicar"
              onPress={onApply}
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
    maxHeight: '88%',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  headerText: {
    flex: 1,
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
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  counterText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.md
  },
  section: {
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  sectionOptions: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass
  },
  sectionScroll: {
    maxHeight: 208
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.primary
  },
  optionLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  }
});
