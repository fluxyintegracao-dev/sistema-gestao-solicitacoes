import { useQuery } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../../../src/components/common/Button';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { LoadingState } from '../../../src/components/common/LoadingState';
import { ProfileShortcut } from '../../../src/components/common/ProfileShortcut';
import { Screen } from '../../../src/components/common/Screen';
import { SectionCard } from '../../../src/components/common/SectionCard';
import { StatCard } from '../../../src/components/common/StatCard';
import { TextField } from '../../../src/components/common/TextField';
import {
  EMPTY_PROVISIONAMENTO_FILTERS,
  ProvisionamentoFiltersModal,
  type ProvisionamentoFilters
} from '../../../src/components/provisionamento/ProvisionamentoFiltersModal';
import { ProvisionamentoCard } from '../../../src/components/provisionamento/ProvisionamentoCard';
import { useModules } from '../../../src/features/modules/ModulesContext';
import {
  listarCategoriasMacroProvisionamento,
  listarProvisoesFinanceiras
} from '../../../src/services/api/provisionamento';
import { colors, spacing } from '../../../src/theme';
import { formatCurrencyBR } from '../../../src/utils/format';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'previsto', label: 'Previsto' },
  { value: 'em_analise', label: 'Em analise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'realizado', label: 'Realizado' }
];

const PRIORIDADE_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Critica' }
];

export default function ProvisionamentoListPage() {
  const {
    hasProvisionamentoAccess,
    canCreateProvisionamento,
    canViewProvisionamentoDashboard,
    provisionamentoContexto
  } = useModules();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<ProvisionamentoFilters>(EMPTY_PROVISIONAMENTO_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ProvisionamentoFilters>(EMPTY_PROVISIONAMENTO_FILTERS);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const categoriasQuery = useQuery({
    queryKey: ['provisionamento', 'categorias-mobile'],
    queryFn: () => listarCategoriasMacroProvisionamento(),
    enabled: hasProvisionamentoAccess
  });

  const listQuery = useQuery({
    queryKey: ['provisionamento', 'list-mobile', page, debouncedSearchTerm, appliedFilters],
    queryFn: () => listarProvisoesFinanceiras({
      page,
      limit: 20,
      sort_by: 'data_prevista_desembolso',
      sort_dir: 'ASC',
      busca: debouncedSearchTerm || undefined,
      ...appliedFilters
    }),
    enabled: hasProvisionamentoAccess
  });

  const resumo = listQuery.data?.resumo;
  const meta = listQuery.data?.meta;
  const itens = listQuery.data?.items || [];
  const obras = provisionamentoContexto?.obras_acesso || [];
  const criadores = provisionamentoContexto?.criadores_filtro || [];

  const filtrosAtivos = useMemo(() => (
    Object.values(appliedFilters).filter((value) => String(value || '').trim()).length + (debouncedSearchTerm ? 1 : 0)
  ), [appliedFilters, debouncedSearchTerm]);

  if (!hasProvisionamentoAccess) {
    return <Redirect href="/modulo-indisponivel" />;
  }

  if (categoriasQuery.isLoading || listQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Carregando provisionamento..." />
      </Screen>
    );
  }

  const aplicarFiltros = () => {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
    setFiltersOpen(false);
  };

  const limparFiltros = () => {
    setDraftFilters(EMPTY_PROVISIONAMENTO_FILTERS);
    setAppliedFilters(EMPTY_PROVISIONAMENTO_FILTERS);
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setPage(1);
    setFiltersOpen(false);
  };

  const refresh = async () => {
    await Promise.all([
      categoriasQuery.refetch(),
      listQuery.refetch()
    ]);
  };

  return (
    <>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={itens}
        keyExtractor={(item) => String(item.id)}
        refreshing={listQuery.isRefetching}
        onRefresh={() => void refresh()}
        ListHeaderComponent={(
          <View style={styles.header}>
            <ProfileShortcut subtitle="Conta" />

            <SectionCard
              title="Provisionamento"
              subtitle="Previsao gerencial de desembolso por obra, com o mesmo backend ativo no sistema web."
            >
              <View style={styles.actionRow}>
                {canCreateProvisionamento ? (
                  <Button
                    label="Nova provisao"
                    onPress={() => router.push('/provisionamento/nova')}
                    fullWidth={false}
                    icon={<Feather name="plus" size={16} color={colors.white} />}
                  />
                ) : null}
                <Button
                  label={filtrosAtivos > 0 ? `Filtros (${filtrosAtivos})` : 'Filtros'}
                  onPress={() => {
                    setDraftFilters({ ...appliedFilters });
                    setFiltersOpen(true);
                  }}
                  variant="secondary"
                  fullWidth={false}
                />
                {canViewProvisionamentoDashboard ? (
                  <Button
                    label="Dashboard"
                    onPress={() => router.push('/provisionamento/dashboard')}
                    variant="ghost"
                    fullWidth={false}
                  />
                ) : null}
              </View>
            </SectionCard>

            <SectionCard title="Busca e leitura" subtitle="Busque por codigo, descricao ou fornecedor e acompanhe o total filtrado.">
              <TextField
                label="Buscar"
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Codigo, descricao ou fornecedor"
              />

              <View style={styles.statsRow}>
                <StatCard
                  label="Total filtrado"
                  value={formatCurrencyBR(resumo?.valor_total_filtrado || 0)}
                  helper={`${resumo?.total_registros_filtrados || 0} registro(s)`}
                />
                <StatCard
                  label="Pagina"
                  value={`${meta?.page || 1}/${meta?.pages || 1}`}
                  helper={`${meta?.limit || 20} itens por pagina`}
                />
              </View>
            </SectionCard>
          </View>
        )}
        renderItem={({ item }) => (
          <ProvisionamentoCard
            item={item}
            onPress={() => router.push({ pathname: '/provisionamento/[id]', params: { id: String(item.id) } })}
          />
        )}
        ListEmptyComponent={(
          <EmptyState
            title={listQuery.isError ? 'Nao foi possivel carregar a lista' : 'Nenhuma provisao encontrada'}
            description={
              listQuery.isError
                ? 'Verifique a conexao e tente atualizar novamente.'
                : 'Ajuste a busca ou os filtros para ampliar o escopo.'
            }
            actionLabel={listQuery.isError ? 'Tentar novamente' : undefined}
            onAction={listQuery.isError ? () => void refresh() : undefined}
          />
        )}
        ListFooterComponent={(
          <View style={styles.footer}>
            {listQuery.isFetching ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}

            {meta ? (
              <View style={styles.pagination}>
                <Button
                  label="Anterior"
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                  variant="secondary"
                  fullWidth={false}
                  disabled={(meta.page || 1) <= 1}
                />
                <Text style={styles.paginationLabel}>
                  Pagina {meta.page || 1} de {meta.pages || 1}
                </Text>
                <Button
                  label="Proxima"
                  onPress={() => setPage((current) => current + 1)}
                  variant="secondary"
                  fullWidth={false}
                  disabled={(meta.page || 1) >= (meta.pages || 1)}
                />
              </View>
            ) : null}
          </View>
        )}
      />

      <ProvisionamentoFiltersModal
        visible={filtersOpen}
        filters={draftFilters}
        obras={obras}
        categorias={categoriasQuery.data || []}
        criadores={criadores}
        statusOptions={STATUS_OPTIONS}
        prioridadeOptions={PRIORIDADE_OPTIONS}
        onChange={(patch) => setDraftFilters((current) => ({ ...current, ...patch }))}
        onApply={aplicarFiltros}
        onClear={limparFiltros}
        onClose={() => setFiltersOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg
  },
  header: {
    gap: spacing.lg
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.md
  },
  loadingMore: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  paginationLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700'
  }
});
