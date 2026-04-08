import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/common/Button';
import { LoadingState } from '../../../src/components/common/LoadingState';
import { PickerField } from '../../../src/components/common/PickerField';
import { ProfileShortcut } from '../../../src/components/common/ProfileShortcut';
import { Screen } from '../../../src/components/common/Screen';
import { SectionCard } from '../../../src/components/common/SectionCard';
import { TextField } from '../../../src/components/common/TextField';
import { useModules } from '../../../src/features/modules/ModulesContext';
import {
  criarProvisaoFinanceira,
  listarCategoriasMacroProvisionamento
} from '../../../src/services/api/provisionamento';
import { colors, spacing } from '../../../src/theme';
import {
  formatCurrencyInputBR,
  maskDateInputBR,
  normalizeCurrencyInput,
  parseDateBRToApi
} from '../../../src/utils/format';

export default function NovaProvisaoPage() {
  const queryClient = useQueryClient();
  const { hasProvisionamentoAccess, canCreateProvisionamento, provisionamentoContexto } = useModules();
  const [saving, setSaving] = useState(false);
  const [itemMacro, setItemMacro] = useState('');
  const [obraId, setObraId] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [fornecedorTexto, setFornecedorTexto] = useState('');
  const [prioridade, setPrioridade] = useState('');
  const [status, setStatus] = useState('previsto');

  const categoriasQuery = useQuery({
    queryKey: ['provisionamento', 'categorias-mobile', 'nova'],
    queryFn: () => listarCategoriasMacroProvisionamento(),
    enabled: hasProvisionamentoAccess
  });

  const obrasCriacao = provisionamentoContexto?.obras_criacao || [];
  const statusOptions = useMemo(
    () => (provisionamentoContexto?.status_disponiveis || ['previsto', 'em_analise'])
      .filter((value) => ['previsto', 'em_analise'].includes(String(value)))
      .map((value) => ({ label: String(value).replace(/_/g, ' '), value: String(value) })),
    [provisionamentoContexto?.status_disponiveis]
  );
  const prioridadeOptions = useMemo(
    () => (provisionamentoContexto?.prioridades_disponiveis || ['baixa', 'media', 'alta', 'critica'])
      .map((value) => ({ label: String(value), value: String(value) })),
    [provisionamentoContexto?.prioridades_disponiveis]
  );

  if (!hasProvisionamentoAccess || !canCreateProvisionamento) {
    return <Redirect href="/modulo-indisponivel" />;
  }

  if (categoriasQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparando formulario..." />
      </Screen>
    );
  }

  const handleSalvar = async () => {
    const valorPrevisto = normalizeCurrencyInput(valorTexto);
    const dataPrevistaApi = parseDateBRToApi(dataPrevista);

    if (!obraId || !dataPrevistaApi || !itemMacro.trim() || !descricao.trim() || !valorPrevisto || valorPrevisto <= 0) {
      Alert.alert('Campos obrigatorios', 'Preencha obra, data prevista, item macro, descricao e valor previsto.');
      return;
    }

    try {
      setSaving(true);
      const created = await criarProvisaoFinanceira({
        obra_id: Number(obraId),
        item_macro: itemMacro.trim(),
        data_prevista_desembolso: dataPrevistaApi,
        descricao: descricao.trim(),
        valor_previsto: valorPrevisto,
        fornecedor_texto: fornecedorTexto.trim() || undefined,
        prioridade: prioridade || undefined,
        status: status || 'previsto'
      });

      await queryClient.invalidateQueries({ queryKey: ['provisionamento'] });
      Alert.alert('Previsao criada', 'O provisionamento foi registrado com sucesso.');
      router.replace({ pathname: '/provisionamento/[id]', params: { id: String(created.id) } });
    } catch (error) {
      Alert.alert(
        'Erro ao criar previsao',
        error instanceof Error ? error.message : 'Falha inesperada ao salvar.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ProfileShortcut subtitle="Conta" />

      <SectionCard
        title="Nova provisao financeira"
        subtitle="Registre uma previsao gerencial de desembolso com o mesmo backend do FLUXY web."
      >
        <PickerField
          label="Obra"
          value={obraId}
          onValueChange={setObraId}
          items={obrasCriacao.map((item) => ({
            label: item.codigo ? `${item.codigo} - ${item.nome}` : item.nome,
            value: String(item.id)
          }))}
        />

        <TextField
          label="Item Macro"
          value={itemMacro}
          onChangeText={setItemMacro}
          placeholder="Ex.: concretagem, insumos, locacao"
          helperText={
            (categoriasQuery.data || []).length > 0
              ? `Sugestoes existentes: ${(categoriasQuery.data || []).slice(0, 6).map((item) => item.nome).join(', ')}`
              : undefined
          }
        />

        <TextField
          label="Data prevista de desembolso"
          value={dataPrevista}
          onChangeText={(value) => setDataPrevista(maskDateInputBR(value))}
          placeholder="DD/MM/AAAA"
          keyboardType="numeric"
        />

        <TextField
          label="Descricao"
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Explique o que precisa ser provisionado"
          multiline
        />

        <TextField
          label="Valor previsto"
          value={valorTexto}
          onChangeText={(value) => setValorTexto(formatCurrencyInputBR(value))}
          placeholder="0,00"
          keyboardType="numeric"
        />

        <TextField
          label="Fornecedor (opcional)"
          value={fornecedorTexto}
          onChangeText={setFornecedorTexto}
          placeholder="Nome do fornecedor"
        />

        <PickerField
          label="Prioridade"
          value={prioridade}
          onValueChange={setPrioridade}
          items={prioridadeOptions}
          placeholderLabel="Nao definida"
        />

        <PickerField
          label="Status inicial"
          value={status}
          onValueChange={setStatus}
          items={statusOptions}
        />

        <View style={styles.helperBox}>
          <Text style={styles.helperTitle}>Anexos</Text>
          <Text style={styles.helperText}>
            Os anexos sao adicionados apos a criacao, na tela de detalhe da previsao.
          </Text>
        </View>
      </SectionCard>

      <View style={styles.actions}>
        <Button
          label="Cancelar"
          onPress={() => router.back()}
          variant="secondary"
        />
        <Button
          label={saving ? 'Salvando...' : 'Criar previsao'}
          onPress={() => void handleSalvar()}
          loading={saving}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  helperBox: {
    gap: spacing.xs,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.infoSoft,
    padding: spacing.lg
  },
  helperTitle: {
    color: colors.primaryStrong,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  helperText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20
  },
  actions: {
    gap: spacing.md
  }
});
