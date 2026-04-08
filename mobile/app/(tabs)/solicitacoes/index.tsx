import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/common/Button';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { ProfileShortcut } from '../../../src/components/common/ProfileShortcut';
import { SectionCard } from '../../../src/components/common/SectionCard';
import { TextField } from '../../../src/components/common/TextField';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { SolicitationCard } from '../../../src/components/solicitacoes/SolicitationCard';
import {
  EMPTY_SOLICITACOES_FILTERS,
  SolicitacoesFiltersModal,
  cloneSolicitacoesFilters,
  countActiveSolicitacaoFilters,
  type SolicitacoesAdvancedFilters
} from '../../../src/components/solicitacoes/SolicitacoesFiltersModal';
import {
  getSetores,
  getSolicitacoesObrasVisiveis,
  getTiposSolicitacao
} from '../../../src/services/api/lookups';
import { getSolicitacoesPage, getSolicitacoesResumo } from '../../../src/services/api/solicitacoes';
import type { SolicitacaoListItem } from '../../../src/services/api/types';
import { colors, spacing } from '../../../src/theme';
import { matchesSolicitacaoSearch } from '../../../src/utils/solicitacoes';

function normalizeText(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isCodeLikeSearchTerm(term: string) {
  const normalized = normalizeText(term);
  if (normalized.length < 3) return false;
  return /^([a-z]{0,4}-?)?\d/.test(normalized) || normalized.includes('-');
}

function findLabel(
  items: Array<{ label: string; value: string }>,
  value: string
) {
  return items.find((item) => item.value === value)?.label || value;
}

export default function SolicitacoesListPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<SolicitacoesAdvancedFilters>(
    cloneSolicitacoesFilters(EMPTY_SOLICITACOES_FILTERS)
  );
  const [draftFilters, setDraftFilters] = useState<SolicitacoesAdvancedFilters>(
    cloneSolicitacoesFilters(EMPTY_SOLICITACOES_FILTERS)
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const summaryQuery = useQuery({
    queryKey: ['solicitacoes', 'resumo'],
    queryFn: getSolicitacoesResumo
  });
  const obrasQuery = useQuery({
    queryKey: ['solicitacoes', 'filtros', 'obras'],
    queryFn: getSolicitacoesObrasVisiveis
  });
  const setoresQuery = useQuery({
    queryKey: ['setores'],
    queryFn: getSetores
  });
  const tiposQuery = useQuery({
    queryKey: ['tipos-solicitacao'],
    queryFn: getTiposSolicitacao
  });

  const obraItems = useMemo(
    () => (obrasQuery.data || []).map((obra) => ({
      label: obra.codigo ? `${obra.codigo} · ${obra.nome}` : obra.nome,
      value: String(obra.id)
    })),
    [obrasQuery.data]
  );
  const setorItems = useMemo(
    () => (setoresQuery.data || []).map((setor) => ({
      label: setor.codigo ? `${setor.codigo} · ${setor.nome}` : setor.nome,
      value: String(setor.id ?? setor.codigo ?? setor.nome)
    })),
    [setoresQuery.data]
  );
  const tipoItems = useMemo(
    () => (tiposQuery.data || []).map((tipo) => ({
      label: tipo.nome,
      value: String(tipo.id)
    })),
    [tiposQuery.data]
  );

  const queryParams = useMemo(() => ({
    obra_ids: appliedFilters.obraIds.join(',') || undefined,
    area: appliedFilters.areas.join(',') || undefined,
    tipo_solicitacao_id: appliedFilters.tipoSolicitacaoIds.join(',') || undefined,
    status: appliedFilters.statuses.join(',') || undefined,
    responsavel: appliedFilters.onlyMine ? user?.nome || undefined : undefined,
    codigo: isCodeLikeSearchTerm(debouncedSearchTerm) ? debouncedSearchTerm.trim() : undefined
  }), [appliedFilters, debouncedSearchTerm, user?.nome]);

  const query = useInfiniteQuery({
    queryKey: ['solicitacoes', 'feed', queryParams],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getSolicitacoesPage({
      page: pageParam,
      limit: 20,
      ...queryParams
    }),
    getNextPageParam: (lastPage) => (
      lastPage.meta.page < lastPage.meta.total_pages
        ? lastPage.meta.page + 1
        : undefined
    )
  });

  const allItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) || [],
    [query.data]
  );
  const statusItems = useMemo(() => {
    const values = new Set<string>();

    Object.values(summaryQuery.data || {}).forEach((statuses) => {
      Object.keys(statuses || {}).forEach((status) => {
        if (status) values.add(status);
      });
    });

    allItems.forEach((item) => {
      if (item.status_global) {
        values.add(item.status_global);
      }
    });

    return Array.from(values)
      .sort((left, right) => left.localeCompare(right, 'pt-BR'))
      .map((status) => ({ label: status, value: status }));
  }, [allItems, summaryQuery.data]);

  const filteredItems = useMemo(() => {
    const expectedUser = normalizeText(user?.nome);

    return allItems
      .filter((item) => {
        if (!appliedFilters.onlyMine || !expectedUser) return true;
        return normalizeText(item.responsavel).includes(expectedUser);
      })
      .filter((item) => matchesSolicitacaoSearch(item, debouncedSearchTerm));
  }, [allItems, appliedFilters.onlyMine, debouncedSearchTerm, user?.nome]);

  const appliedFiltersCount = countActiveSolicitacaoFilters(appliedFilters);
  const draftFiltersCount = countActiveSolicitacaoFilters(draftFilters);
  const appliedFilterLabels = useMemo(() => {
    const labels: string[] = [];

    if (appliedFilters.onlyMine) {
      labels.push('Somente minhas');
    }

    appliedFilters.obraIds.forEach((value) => {
      labels.push(`Obra: ${findLabel(obraItems, value)}`);
    });
    appliedFilters.areas.forEach((value) => {
      labels.push(`Setor: ${findLabel(setorItems, value)}`);
    });
    appliedFilters.tipoSolicitacaoIds.forEach((value) => {
      labels.push(`Tipo: ${findLabel(tipoItems, value)}`);
    });
    appliedFilters.statuses.forEach((value) => {
      labels.push(`Status: ${findLabel(statusItems, value)}`);
    });

    return labels;
  }, [appliedFilters, obraItems, setorItems, statusItems, tipoItems]);

  const handleRefresh = async () => {
    await Promise.all([
      query.refetch(),
      summaryQuery.refetch()
    ]);
  };

  const handleOpenFilters = () => {
    setDraftFilters(cloneSolicitacoesFilters(appliedFilters));
    setFiltersOpen(true);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(cloneSolicitacoesFilters(draftFilters));
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    const emptyFilters = cloneSolicitacoesFilters(EMPTY_SOLICITACOES_FILTERS);
    setDraftFilters(emptyFilters);
    setAppliedFilters(cloneSolicitacoesFilters(emptyFilters));
    setFiltersOpen(false);
  };

  if (query.isLoading && allItems.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Carregando solicitacoes...</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        refreshing={query.isRefetching}
        onRefresh={() => void handleRefresh()}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={(
          <View style={styles.header}>
            <ProfileShortcut subtitle="Conta" />

            <SectionCard
              title="Solicitacoes"
              subtitle="Visao operacional para triagem rapida, busca e acompanhamento de responsabilidade."
            >
              <View style={styles.actionRow}>
                <Button
                  label="Nova solicitacao"
                  onPress={() => router.push('/solicitacoes/nova')}
                  fullWidth={false}
                />
                <Button
                  label={appliedFiltersCount > 0 ? `Filtros (${appliedFiltersCount})` : 'Filtros'}
                  onPress={handleOpenFilters}
                  variant="secondary"
                  fullWidth={false}
                />
                {appliedFiltersCount > 0 ? (
                  <Button
                    label="Limpar"
                    onPress={handleClearFilters}
                    variant="ghost"
                    fullWidth={false}
                  />
                ) : null}
              </View>
            </SectionCard>

            <SectionCard
              title="Busca e escopo"
              subtitle="Refine por codigo, descricao, obra, setor, status e combinacoes de filtros."
            >
              <TextField
                label="Buscar"
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Codigo, descricao, obra, setor ou responsavel"
              />

              {appliedFilterLabels.length > 0 ? (
                <View style={styles.appliedFilters}>
                  {appliedFilterLabels.map((label) => (
                    <View key={label} style={styles.appliedFilterPill}>
                      <Text style={styles.appliedFilterText}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {query.isError ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>Atualizacao parcial</Text>
                  <Text style={styles.warningText}>
                    A ultima consulta falhou. Voce ainda pode trabalhar com os dados carregados e puxar para atualizar.
                  </Text>
                </View>
              ) : null}
            </SectionCard>
          </View>
        )}
        renderItem={({ item }) => (
          <SolicitationCard
            item={item}
            onPress={() => router.push({ pathname: '/solicitacoes/[id]', params: { id: String(item.id) } })}
          />
        )}
        ListEmptyComponent={(
          <EmptyState
            title={query.isError ? 'Nao foi possivel carregar a lista' : 'Nenhuma solicitacao encontrada'}
            description={
              query.isError
                ? 'Verifique a conexao e tente atualizar novamente.'
                : 'Ajuste a busca ou os filtros para ampliar o escopo mostrado.'
            }
            actionLabel={query.isError ? 'Tentar novamente' : undefined}
            onAction={query.isError ? () => void handleRefresh() : undefined}
          />
        )}
        ListFooterComponent={
          query.isFetchingNextPage
            ? <ActivityIndicator color={colors.primary} />
            : <View style={{ height: spacing.lg }} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

      <SolicitacoesFiltersModal
        visible={filtersOpen}
        filters={draftFilters}
        selectedCount={draftFiltersCount}
        obraItems={obraItems}
        setorItems={setorItems}
        tipoItems={tipoItems}
        statusItems={statusItems}
        onChange={(patch) => setDraftFilters((current) => ({ ...current, ...patch }))}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
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
    paddingBottom: spacing.xxxl
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  appliedFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  appliedFilterPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  appliedFilterText: {
    color: colors.primaryStrong,
    fontSize: 12,
    fontWeight: '700'
  },
  warningBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0D3A5',
    backgroundColor: colors.warningSoft,
    padding: spacing.lg,
    gap: spacing.xs
  },
  warningTitle: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '800'
  },
  warningText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background
  },
  loadingText: {
    color: colors.textMuted
  }
});
