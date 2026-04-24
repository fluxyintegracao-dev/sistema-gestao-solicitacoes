import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { Button } from '../../../src/components/common/Button';
import { LoadingState } from '../../../src/components/common/LoadingState';
import { PickerField } from '../../../src/components/common/PickerField';
import { ProfileShortcut } from '../../../src/components/common/ProfileShortcut';
import { Screen } from '../../../src/components/common/Screen';
import { SectionCard } from '../../../src/components/common/SectionCard';
import { TextField } from '../../../src/components/common/TextField';
import {
  getApropriacoes,
  getAreasObra,
  getAreasPorSetorOrigem,
  getContratos,
  getMinhasObras,
  getSetores,
  getTiposSolicitacao,
  getTiposSolicitacaoPorSetor,
  getTiposSubContrato
} from '../../../src/services/api/lookups';
import {
  buscarParceiros,
  criarParceiro,
  listarCategoriasParceiro
} from '../../../src/services/api/parceiros';
import { createSolicitacao, uploadSolicitacaoArquivos } from '../../../src/services/api/solicitacoes';
import type {
  MobileUploadAsset,
  ParceiroCategoriaOption,
  ParceiroResumo,
  SetorOption,
  TipoSolicitacaoOption
} from '../../../src/services/api/types';
import { colors, spacing } from '../../../src/theme';
import {
  formatCurrencyInputBR,
  maskDateInputBR,
  normalizeCurrencyInput,
  parseDateBRToApi
} from '../../../src/utils/format';
import { getTipoSolicitacaoBehavior } from '../../../src/utils/tipoSolicitacao';

const createSchema = z.object({
  obra_id: z.string().min(1, 'Selecione a obra'),
  area_responsavel: z.string().min(1, 'Selecione a area responsavel'),
  tipo_solicitacao_id: z.string().min(1, 'Selecione o tipo'),
  parceiro_id: z.string().optional(),
  apropriacao_id: z.string().optional(),
  tipo_sub_id: z.string().optional(),
  contrato_id: z.string().optional(),
  codigo_contrato: z.string().optional(),
  descricao: z.string().max(50, 'Use ate 50 caracteres').optional(),
  valor: z.string().optional(),
  data_vencimento: z
    .string()
    .refine((value) => Boolean(parseDateBRToApi(value)), 'Informe a data no formato DD/MM/AAAA'),
  data_inicio_medicao: z.string().optional(),
  data_fim_medicao: z.string().optional(),
  ref_contrato_abertura: z.string().optional(),
  itens_apropriacao: z.string().optional()
});

type CreateFormValues = z.infer<typeof createSchema>;

function normalizeToken(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getSetorValue(item?: Pick<SetorOption, 'codigo' | 'nome'> | null) {
  return String(item?.codigo || item?.nome || '').trim();
}

function getTodayApi() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDigits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

export default function NovaSolicitacaoPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [files, setFiles] = useState<MobileUploadAsset[]>([]);
  const [partnerQuery, setPartnerQuery] = useState('');
  const [partnerResults, setPartnerResults] = useState<ParceiroResumo[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ParceiroResumo | null>(null);
  const [partnerSearching, setPartnerSearching] = useState(false);
  const [partnerSearchExecuted, setPartnerSearchExecuted] = useState(false);
  const [partnerModalVisible, setPartnerModalVisible] = useState(false);
  const [newPartner, setNewPartner] = useState({
    cpf_cnpj: '',
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
    numero: '',
    bairro: '',
    cep: '',
    municipio: '',
    estado: '',
    categoria_ids: [] as number[]
  });

  const obrasQuery = useQuery({
    queryKey: ['lookups', 'obras', 'criacao'],
    queryFn: getMinhasObras
  });
  const tiposQuery = useQuery({
    queryKey: ['lookups', 'tipos-solicitacao'],
    queryFn: getTiposSolicitacao
  });
  const setoresQuery = useQuery({
    queryKey: ['lookups', 'setores'],
    queryFn: getSetores
  });
  const areasObraQuery = useQuery({
    queryKey: ['configuracoes', 'areas-obra'],
    queryFn: getAreasObra
  });
  const areasPorSetorOrigemQuery = useQuery({
    queryKey: ['configuracoes', 'areas-por-setor-origem'],
    queryFn: getAreasPorSetorOrigem
  });
  const tiposPorSetorQuery = useQuery({
    queryKey: ['configuracoes', 'tipos-solicitacao-por-setor'],
    queryFn: getTiposSolicitacaoPorSetor
  });
  const partnerCategoriesQuery = useQuery({
    queryKey: ['parceiros', 'categorias'],
    queryFn: listarCategoriasParceiro
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      obra_id: '',
      area_responsavel: '',
      tipo_solicitacao_id: '',
      parceiro_id: '',
      apropriacao_id: '',
      tipo_sub_id: '',
      contrato_id: '',
      codigo_contrato: '',
      descricao: '',
      valor: '',
      data_vencimento: '',
      data_inicio_medicao: '',
      data_fim_medicao: '',
      ref_contrato_abertura: '',
      itens_apropriacao: ''
    }
  });

  const obraId = watch('obra_id');
  const areaResponsavel = watch('area_responsavel');
  const tipoSolicitacaoId = watch('tipo_solicitacao_id');
  const valorAtual = watch('valor');
  const contratoId = watch('contrato_id');
  const parceiroId = watch('parceiro_id');

  const tipoSelecionado = useMemo(
    () => (tiposQuery.data || []).find((item) => String(item.id) === String(tipoSolicitacaoId)),
    [tipoSolicitacaoId, tiposQuery.data]
  );
  const comportamentoTipo = useMemo(
    () => getTipoSolicitacaoBehavior(tipoSelecionado || {}),
    [tipoSelecionado]
  );

  const subtipoObrigatorio = comportamentoTipo.exige_subtipo;
  const medicaoObrigatoria = comportamentoTipo.exige_periodo_medicao;
  const aberturaContratoObrigatoria =
    comportamentoTipo.exige_ref_contrato_abertura || comportamentoTipo.exige_itens_apropriacao;
  const solicitacaoCompra = !comportamentoTipo.mostrar_apropriacao_principal && !comportamentoTipo.mostrar_valor;
  const exigeApropriacaoPrincipal = Boolean(tipoSolicitacaoId) && comportamentoTipo.exige_apropriacao_principal;
  const tipoSemValor = !comportamentoTipo.mostrar_valor;
  const exibirCamposContrato = comportamentoTipo.mostrar_contrato;
  const exibirCampoSubtipo = comportamentoTipo.mostrar_subtipo;

  const tiposSubQuery = useQuery({
    queryKey: ['lookups', 'tipos-sub-contrato', tipoSolicitacaoId],
    queryFn: () => getTiposSubContrato(tipoSolicitacaoId),
    enabled: Boolean(tipoSolicitacaoId) && exibirCampoSubtipo
  });

  const contratosQuery = useQuery({
    queryKey: ['lookups', 'contratos', obraId],
    queryFn: () => getContratos({ obra_id: obraId, modo: 'CRIACAO' }),
    enabled: Boolean(obraId) && exibirCamposContrato
  });

  const apropriacoesQuery = useQuery({
    queryKey: ['lookups', 'apropriacoes', obraId],
    queryFn: () => getApropriacoes({ obra_id: obraId }),
    enabled: Boolean(obraId)
  });

  const tokensSetorUsuario = useMemo(
    () => Array.from(new Set([
      normalizeToken(user?.setor?.codigo),
      normalizeToken(user?.setor?.nome),
      normalizeToken(user?.area),
      normalizeToken(user?.setor_id)
    ].filter(Boolean))),
    [user]
  );

  const isSetorObra = Boolean(user?.setor?.eh_setor_obra) || tokensSetorUsuario.includes('OBRA');

  const destinosPermitidosPorSetorOrigem = useMemo(() => {
    const regras = areasPorSetorOrigemQuery.data?.regras || {};
    const destinos = new Set<string>();

    tokensSetorUsuario.forEach((token) => {
      const lista = regras?.[token];
      if (Array.isArray(lista)) {
        lista.forEach((item) => destinos.add(normalizeToken(item)));
      }
    });

    return destinos;
  }, [areasPorSetorOrigemQuery.data?.regras, tokensSetorUsuario]);

  const areasObraPermitidas = useMemo(
    () => new Set((areasObraQuery.data?.areas || []).map((item) => normalizeToken(item))),
    [areasObraQuery.data?.areas]
  );

  const setoresFiltrados = useMemo(() => {
    let lista = Array.isArray(setoresQuery.data) ? [...setoresQuery.data] : [];

    if (destinosPermitidosPorSetorOrigem.size > 0) {
      lista = lista.filter((item) =>
        destinosPermitidosPorSetorOrigem.has(normalizeToken(item.codigo || item.nome))
      );
    }

    if (isSetorObra && areasObraPermitidas.size > 0) {
      lista = lista.filter((item) =>
        areasObraPermitidas.has(normalizeToken(item.codigo || item.nome))
      );
    }

    return lista;
  }, [areasObraPermitidas, destinosPermitidosPorSetorOrigem, isSetorObra, setoresQuery.data]);

  const tiposFiltradosPorSetor = useMemo(() => {
    const setorKey = normalizeToken(areaResponsavel);
    if (!setorKey) return [];

    const tiposAtivos = Array.isArray(tiposQuery.data)
      ? tiposQuery.data.filter((item) => item?.ativo !== false)
      : [];

    const regra = tiposPorSetorQuery.data?.regras?.[setorKey];
    const tiposPermitidos = Array.isArray(regra?.tipos)
      ? regra.tipos.map(Number).filter(Number.isFinite)
      : [];

    if (tiposPermitidos.length === 0) {
      return tiposAtivos;
    }

    const idsPermitidos = new Set(tiposPermitidos);
    return tiposAtivos.filter((item) => idsPermitidos.has(Number(item.id)));
  }, [areaResponsavel, tiposPorSetorQuery.data?.regras, tiposQuery.data]);

  const contratosDisponiveis = contratosQuery.data || [];
  const apropriacoesDisponiveis = apropriacoesQuery.data || [];
  const tiposSubDisponiveis = tiposSubQuery.data || [];

  useEffect(() => {
    const valoresPermitidos = new Set(setoresFiltrados.map((item) => getSetorValue(item)));
    if (areaResponsavel && !valoresPermitidos.has(areaResponsavel)) {
      setValue('area_responsavel', '');
      setValue('tipo_solicitacao_id', '');
    }
  }, [areaResponsavel, setValue, setoresFiltrados]);

  useEffect(() => {
    if (!areaResponsavel) {
      if (tipoSolicitacaoId) {
        setValue('tipo_solicitacao_id', '');
      }
      return;
    }

    const idsPermitidos = new Set(tiposFiltradosPorSetor.map((item) => String(item.id)));
    if (tipoSolicitacaoId && !idsPermitidos.has(tipoSolicitacaoId)) {
      setValue('tipo_solicitacao_id', '');
    }
  }, [areaResponsavel, setValue, tipoSolicitacaoId, tiposFiltradosPorSetor]);

  useEffect(() => {
    if (!obraId) {
      setValue('apropriacao_id', '');
      setValue('contrato_id', '');
      setValue('codigo_contrato', '');
    }
  }, [obraId, setValue]);

  useEffect(() => {
    if (tipoSemValor && valorAtual) {
      setValue('valor', '');
    }

    if (!exigeApropriacaoPrincipal) {
      setValue('apropriacao_id', '');
    }

    if (!exibirCamposContrato) {
      setValue('contrato_id', '');
      setValue('codigo_contrato', '');
    }

    if (!exibirCampoSubtipo) {
      setValue('tipo_sub_id', '');
    }

    if (!medicaoObrigatoria) {
      setValue('data_inicio_medicao', '');
      setValue('data_fim_medicao', '');
    }

    if (!aberturaContratoObrigatoria) {
      setValue('ref_contrato_abertura', '');
      setValue('itens_apropriacao', '');
    }
  }, [
    aberturaContratoObrigatoria,
    exigeApropriacaoPrincipal,
    exibirCampoSubtipo,
    exibirCamposContrato,
    medicaoObrigatoria,
    setValue,
    tipoSemValor,
    valorAtual
  ]);

  useEffect(() => {
    if (!contratoId) {
      setValue('codigo_contrato', '');
      return;
    }

    const contratoSelecionado = contratosDisponiveis.find(
      (item) => String(item.id) === String(contratoId)
    );

    if (!contratoSelecionado) {
      setValue('contrato_id', '');
      setValue('codigo_contrato', '');
      return;
    }

    setValue('codigo_contrato', String(contratoSelecionado.codigo || ''));
  }, [contratoId, contratosDisponiveis, setValue]);

  const clearSelectedPartner = () => {
    setSelectedPartner(null);
    setPartnerQuery('');
    setPartnerResults([]);
    setPartnerSearchExecuted(false);
    setValue('parceiro_id', '');
  };

  const selectPartner = (partner: ParceiroResumo) => {
    setSelectedPartner(partner);
    setPartnerQuery(partner.nome || partner.cpf_cnpj || '');
    setPartnerResults([]);
    setPartnerSearchExecuted(false);
    setValue('parceiro_id', String(partner.id || ''));
  };

  const handleSearchPartners = async () => {
    const term = partnerQuery.trim();
    if (!term) return;

    try {
      setPartnerSearching(true);
      setPartnerSearchExecuted(true);
      const results = await buscarParceiros({ q: term, limit: 8 });
      const list = Array.isArray(results) ? results : [];
      setPartnerResults(list);

      if (list.length === 1) {
        selectPartner(list[0]);
      }
    } catch (error) {
      Alert.alert(
        'Erro ao buscar parceiros',
        error instanceof Error ? error.message : 'Falha inesperada'
      );
    } finally {
      setPartnerSearching(false);
    }
  };

  const handleCreatePartner = async () => {
    try {
      const created = await criarParceiro({
        ...newPartner,
        cpf_cnpj: normalizeDigits(newPartner.cpf_cnpj),
        categoria_ids: newPartner.categoria_ids
      });
      selectPartner(created);
      setNewPartner({
        cpf_cnpj: '',
        nome: '',
        telefone: '',
        email: '',
        endereco: '',
        numero: '',
        bairro: '',
        cep: '',
        municipio: '',
        estado: '',
        categoria_ids: []
      });
      setPartnerModalVisible(false);
    } catch (error) {
      Alert.alert(
        'Erro ao cadastrar parceiro',
        error instanceof Error ? error.message : 'Falha inesperada'
      );
    }
  };

  const appendFiles = (nextFiles: MobileUploadAsset[]) => {
    setFiles((current) => [...current, ...nextFiles]);
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissao necessaria', 'Libere a camera para anexar fotos no envio.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled) return;

    appendFiles(result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName || `camera-${Date.now()}-${index + 1}.jpg`,
      type: asset.mimeType || 'image/jpeg'
    })));
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });
    if (result.canceled) return;

    appendFiles(result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName || `galeria-${Date.now()}-${index + 1}.jpg`,
      type: asset.mimeType || 'image/jpeg'
    })));
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true
    });
    if (result.canceled) return;

    appendFiles(result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.name || `documento-${Date.now()}-${index + 1}`,
      type: asset.mimeType || 'application/octet-stream'
    })));
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const dataVencimento = parseDateBRToApi(values.data_vencimento);
      const dataInicioMedicao = parseDateBRToApi(values.data_inicio_medicao);
      const dataFimMedicao = parseDateBRToApi(values.data_fim_medicao);
      const valorNormalizado = normalizeCurrencyInput(values.valor);
      const hojeApi = getTodayApi();

      if (!dataVencimento) {
        Alert.alert('Data invalida', 'Informe a data de vencimento no formato DD/MM/AAAA.');
        return;
      }

      if (dataVencimento < hojeApi) {
        Alert.alert('Data invalida', 'A data de vencimento nao pode ser anterior a hoje.');
        return;
      }

      if (exigeApropriacaoPrincipal && !values.apropriacao_id) {
        Alert.alert('Campo obrigatorio', 'Selecione a apropriacao principal da solicitacao.');
        return;
      }

      if (subtipoObrigatorio && !values.tipo_sub_id) {
        Alert.alert('Campo obrigatorio', 'Selecione o subtipo para continuar.');
        return;
      }

      if (!tipoSemValor && valorNormalizado === undefined) {
        Alert.alert('Campo obrigatorio', 'Informe o valor da solicitacao.');
        return;
      }

      if (medicaoObrigatoria && (!dataInicioMedicao || !dataFimMedicao)) {
        Alert.alert('Campos obrigatorios', 'Para Medicao, informe a data inicial e a data final.');
        return;
      }

      if (comportamentoTipo.exige_descricao && !String(values.descricao || '').trim()) {
        Alert.alert('Campo obrigatorio', 'Descreva a solicitacao.');
        return;
      }

      if (exibirCamposContrato && !values.contrato_id) {
        Alert.alert('Campo obrigatorio', 'Selecione um contrato para continuar.');
        return;
      }

      if (aberturaContratoObrigatoria && !String(values.ref_contrato_abertura || '').trim()) {
        Alert.alert('Campo obrigatorio', 'Informe a referencia do contrato.');
        return;
      }

      if (aberturaContratoObrigatoria && !String(values.itens_apropriacao || '').trim()) {
        Alert.alert('Campo obrigatorio', 'Informe os itens de apropriacao.');
        return;
      }

      const created = await createSolicitacao({
        obra_id: Number(values.obra_id),
        tipo_solicitacao_id: Number(values.tipo_solicitacao_id),
        area_responsavel: values.area_responsavel,
        descricao: String(values.descricao || '').trim(),
        data_vencimento: dataVencimento,
        valor: tipoSemValor ? undefined : valorNormalizado,
        parceiro_id: values.parceiro_id ? Number(values.parceiro_id) : undefined,
        apropriacao_id: values.apropriacao_id ? Number(values.apropriacao_id) : undefined,
        tipo_sub_id: values.tipo_sub_id ? Number(values.tipo_sub_id) : undefined,
        contrato_id: values.contrato_id ? Number(values.contrato_id) : undefined,
        codigo_contrato: values.codigo_contrato || undefined,
        data_inicio_medicao: dataInicioMedicao || undefined,
        data_fim_medicao: dataFimMedicao || undefined,
        ref_contrato_abertura: values.ref_contrato_abertura?.trim() || undefined,
        itens_apropriacao: values.itens_apropriacao?.trim() || undefined
      });

      if (files.length > 0) {
        await uploadSolicitacaoArquivos({
          solicitacaoId: created.id,
          files
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      Alert.alert('Solicitacao criada', 'O envio foi concluido com sucesso.');
      router.replace({ pathname: '/solicitacoes/[id]', params: { id: String(created.id) } });
    } catch (error) {
      Alert.alert(
        'Erro ao criar solicitacao',
        error instanceof Error ? error.message : 'Falha inesperada'
      );
    }
  });

  const isLoadingBase =
    obrasQuery.isLoading ||
    tiposQuery.isLoading ||
    setoresQuery.isLoading ||
    areasObraQuery.isLoading ||
    areasPorSetorOrigemQuery.isLoading ||
    tiposPorSetorQuery.isLoading;

  if (isLoadingBase) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparando formulario..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ProfileShortcut subtitle="Conta" />

      <SectionCard
        title="Nova solicitacao"
        subtitle="Fluxo alinhado ao web para abertura rapida em campo"
      >
        <Controller
          control={control}
          name="obra_id"
          render={({ field: { value, onChange } }) => (
            <PickerField
              label="Obra"
              value={value}
              onValueChange={onChange}
              items={(obrasQuery.data || []).map((item) => ({
                label: item.codigo ? `${item.codigo} - ${item.nome}` : item.nome,
                value: String(item.id)
              }))}
              error={errors.obra_id?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="area_responsavel"
          render={({ field: { value, onChange } }) => (
            <PickerField
              label="Area responsavel"
              value={value}
              onValueChange={onChange}
              items={setoresFiltrados.map((item) => ({
                label: item.nome,
                value: getSetorValue(item)
              }))}
              error={errors.area_responsavel?.message}
              helperText="Selecione primeiro a area para carregar apenas os tipos permitidos."
            />
          )}
        />

        <Controller
          control={control}
          name="tipo_solicitacao_id"
          render={({ field: { value, onChange } }) => (
            <PickerField
              label="Tipo"
              value={value}
              onValueChange={onChange}
              items={tiposFiltradosPorSetor.map((item: TipoSolicitacaoOption) => ({
                label: item.nome,
                value: String(item.id)
              }))}
              error={errors.tipo_solicitacao_id?.message}
              enabled={Boolean(areaResponsavel)}
              placeholderLabel={areaResponsavel ? 'Selecione' : 'Selecione a area primeiro'}
              helperText={
                areaResponsavel
                  ? undefined
                  : 'Os tipos seguem a configuracao ativa por setor.'
              }
            />
          )}
        />

        <View style={styles.partnerSection}>
          <TextField
            label="Parceiro"
            value={partnerQuery}
            onChangeText={(text) => {
              setPartnerQuery(text);
              setPartnerSearchExecuted(false);
              setPartnerResults([]);
              if (selectedPartner) {
                setSelectedPartner(null);
                setValue('parceiro_id', '');
              }
            }}
            placeholder="Buscar por nome ou CPF/CNPJ"
            helperText="Mesmo fluxo do web: buscar, selecionar ou cadastrar."
          />

          <View style={styles.inlineActions}>
            <Button
              label={partnerSearching ? 'Buscando...' : 'Buscar'}
              onPress={() => void handleSearchPartners()}
              variant="secondary"
              fullWidth={false}
              disabled={partnerSearching}
            />
            <Button
              label="Cadastrar"
              onPress={() => setPartnerModalVisible(true)}
              variant="secondary"
              fullWidth={false}
            />
            {parceiroId ? (
              <Button
                label="Limpar"
                onPress={clearSelectedPartner}
                variant="ghost"
                fullWidth={false}
              />
            ) : null}
          </View>

          {selectedPartner ? (
            <View style={styles.selectedPartnerCard}>
              <Text style={styles.selectedPartnerName}>{selectedPartner.nome || 'Parceiro selecionado'}</Text>
              <Text style={styles.selectedPartnerMeta}>
                {selectedPartner.cpf_cnpj || '-'}
                {selectedPartner.telefone ? ` - ${selectedPartner.telefone}` : ''}
              </Text>
            </View>
          ) : null}

          {partnerResults.length > 1 && !selectedPartner ? (
            <View style={styles.partnerResults}>
              {partnerResults.map((item) => (
                <Pressable
                  key={String(item.id)}
                  style={({ pressed }) => [
                    styles.partnerResultItem,
                    pressed ? styles.partnerResultPressed : null
                  ]}
                  onPress={() => selectPartner(item)}
                >
                  <Text style={styles.partnerResultName}>{item.nome || '-'}</Text>
                  <Text style={styles.partnerResultMeta}>{item.cpf_cnpj || '-'}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {partnerSearchExecuted && partnerQuery.trim() && partnerResults.length === 0 && !partnerSearching && !selectedPartner ? (
            <Text style={styles.helperText}>
              Nenhum parceiro encontrado. Use o botao Cadastrar para criar um novo.
            </Text>
          ) : null}
        </View>

        <Controller
          control={control}
          name="apropriacao_id"
          render={({ field: { value, onChange } }) => (
            <PickerField
              label="Apropriacao da solicitacao"
              value={value || ''}
              onValueChange={onChange}
              items={apropriacoesDisponiveis.map((item) => ({
                label: item.descricao
                  ? `${item.codigo || '-'} - ${item.descricao}`
                  : String(item.codigo || '-'),
                value: String(item.id)
              }))}
              enabled={Boolean(obraId) && !solicitacaoCompra}
              placeholderLabel={
                !obraId
                  ? 'Selecione a obra primeiro'
                  : solicitacaoCompra
                    ? 'Nao se aplica para solicitacao de compra'
                    : 'Selecione'
              }
              helperText={
                solicitacaoCompra
                  ? 'Na solicitacao de compra, a apropriacao e definida por item no modulo de compras.'
                  : exigeApropriacaoPrincipal
                    ? 'Campo obrigatorio para este tipo.'
                    : undefined
              }
            />
          )}
        />

        {exibirCampoSubtipo ? (
          <Controller
            control={control}
            name="tipo_sub_id"
            render={({ field: { value, onChange } }) => (
              <PickerField
                label="Subtipo"
                value={value || ''}
                onValueChange={onChange}
                items={tiposSubDisponiveis.map((item) => ({
                  label: item.nome,
                  value: String(item.id)
                }))}
                enabled={Boolean(tipoSolicitacaoId)}
                helperText={subtipoObrigatorio ? 'Obrigatorio para este tipo.' : undefined}
              />
            )}
          />
        ) : null}

        {exibirCamposContrato ? (
          <Controller
            control={control}
            name="contrato_id"
            render={({ field: { value, onChange } }) => (
              <PickerField
                label="Contrato"
                value={value || ''}
                onValueChange={onChange}
                items={contratosDisponiveis.map((item) => ({
                  label: `${item.codigo || '-'} - ${item.ref_contrato || '-'}`,
                  value: String(item.id)
                }))}
                enabled={Boolean(obraId)}
                placeholderLabel={obraId ? 'Selecione' : 'Selecione a obra primeiro'}
                helperText="A lista acompanha apenas os contratos da obra selecionada."
              />
            )}
          />
        ) : null}

        {aberturaContratoObrigatoria ? (
          <Controller
            control={control}
            name="ref_contrato_abertura"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Ref. do contrato"
                value={value}
                onChangeText={onChange}
                placeholder="Informe a referencia do contrato"
              />
            )}
          />
        ) : null}

        {aberturaContratoObrigatoria ? (
          <Controller
            control={control}
            name="itens_apropriacao"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Itens de apropriacao"
                value={value}
                onChangeText={onChange}
                placeholder="Descreva os itens de apropriacao"
                multiline
              />
            )}
          />
        ) : null}

        {!tipoSemValor ? (
          <Controller
            control={control}
            name="valor"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Valor"
                value={value}
                onChangeText={(text) => onChange(formatCurrencyInputBR(text))}
                placeholder="Ex.: 1.500,00"
                keyboardType="decimal-pad"
                error={errors.valor?.message}
              />
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="data_vencimento"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="Data de vencimento"
              value={value}
              onChangeText={(text) => onChange(maskDateInputBR(text))}
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              maxLength={10}
              error={errors.data_vencimento?.message}
            />
          )}
        />

        {medicaoObrigatoria ? (
          <Controller
            control={control}
            name="data_inicio_medicao"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Data inicial da medicao"
                value={value}
                onChangeText={(text) => onChange(maskDateInputBR(text))}
                placeholder="DD/MM/AAAA"
                keyboardType="number-pad"
                maxLength={10}
              />
            )}
          />
        ) : null}

        {medicaoObrigatoria ? (
          <Controller
            control={control}
            name="data_fim_medicao"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Data final da medicao"
                value={value}
                onChangeText={(text) => onChange(maskDateInputBR(text))}
                placeholder="DD/MM/AAAA"
                keyboardType="number-pad"
                maxLength={10}
              />
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="descricao"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="Descricao"
              value={value}
              onChangeText={(text) => onChange(text.slice(0, 50))}
              placeholder="Explique o que precisa ser resolvido"
              multiline
              error={errors.descricao?.message}
              helperText={
                comportamentoTipo.exige_descricao
                  ? 'Descricao breve, com no maximo 50 caracteres.'
                  : 'Descricao opcional para este tipo.'
              }
            />
          )}
        />
      </SectionCard>

      <Modal
        visible={partnerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPartnerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Cadastrar parceiro</Text>
                <Text style={styles.modalSubtitle}>
                  Informe os dados principais para vincular o parceiro a esta solicitacao.
                </Text>
              </View>
              <Button
                label="Fechar"
                onPress={() => setPartnerModalVisible(false)}
                variant="ghost"
                fullWidth={false}
              />
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <TextField
                label="CPF/CNPJ"
                value={newPartner.cpf_cnpj}
                onChangeText={(text) => setNewPartner((current) => ({ ...current, cpf_cnpj: text }))}
              />
              <TextField
                label="Nome"
                value={newPartner.nome}
                onChangeText={(text) => setNewPartner((current) => ({ ...current, nome: text }))}
              />
              <TextField
                label="Telefone"
                value={newPartner.telefone}
                onChangeText={(text) => setNewPartner((current) => ({ ...current, telefone: text }))}
              />
              <TextField
                label="Email"
                value={newPartner.email}
                onChangeText={(text) => setNewPartner((current) => ({ ...current, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextField
                label="Endereco"
                value={newPartner.endereco}
                onChangeText={(text) => setNewPartner((current) => ({ ...current, endereco: text }))}
              />
              <View style={styles.dualFields}>
                <View style={styles.dualField}>
                  <TextField
                    label="Numero"
                    value={newPartner.numero}
                    onChangeText={(text) => setNewPartner((current) => ({ ...current, numero: text }))}
                  />
                </View>
                <View style={styles.dualField}>
                  <TextField
                    label="Bairro"
                    value={newPartner.bairro}
                    onChangeText={(text) => setNewPartner((current) => ({ ...current, bairro: text }))}
                  />
                </View>
              </View>
              <View style={styles.dualFields}>
                <View style={styles.dualField}>
                  <TextField
                    label="CEP"
                    value={newPartner.cep}
                    onChangeText={(text) => setNewPartner((current) => ({ ...current, cep: text }))}
                  />
                </View>
                <View style={styles.dualField}>
                  <TextField
                    label="Municipio"
                    value={newPartner.municipio}
                    onChangeText={(text) => setNewPartner((current) => ({ ...current, municipio: text }))}
                  />
                </View>
              </View>
              <TextField
                label="Estado"
                value={newPartner.estado}
                onChangeText={(text) =>
                  setNewPartner((current) => ({ ...current, estado: text.toUpperCase().slice(0, 2) }))
                }
                maxLength={2}
              />

              <View style={styles.categoriesBlock}>
                <Text style={styles.categoriesTitle}>Categorias do parceiro</Text>
                {(partnerCategoriesQuery.data || []).length === 0 ? (
                  <Text style={styles.helperText}>Nenhuma categoria cadastrada.</Text>
                ) : (
                  <View style={styles.categoriesList}>
                    {(partnerCategoriesQuery.data || []).map((categoria: ParceiroCategoriaOption) => {
                      const active = newPartner.categoria_ids.includes(categoria.id);

                      return (
                        <Pressable
                          key={categoria.id}
                          style={({ pressed }) => [
                            styles.categoryChip,
                            active ? styles.categoryChipActive : null,
                            pressed ? styles.categoryChipPressed : null
                          ]}
                          onPress={() => {
                            setNewPartner((current) => {
                              const currentIds = new Set(current.categoria_ids);
                              if (currentIds.has(categoria.id)) {
                                currentIds.delete(categoria.id);
                              } else {
                                currentIds.add(categoria.id);
                              }
                              return { ...current, categoria_ids: Array.from(currentIds) };
                            });
                          }}
                        >
                          <Text style={[styles.categoryChipText, active ? styles.categoryChipTextActive : null]}>
                            {active ? '[x]' : '[ ]'} {categoria.nome}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                label="Cancelar"
                onPress={() => setPartnerModalVisible(false)}
                variant="secondary"
                fullWidth={false}
              />
              <Button
                label="Salvar parceiro"
                onPress={() => void handleCreatePartner()}
                fullWidth={false}
              />
            </View>
          </View>
        </View>
      </Modal>

      <SectionCard title="Anexos" subtitle="Foto, galeria ou documento ainda no momento da abertura">
        <View style={styles.actions}>
          <Button label="Camera" onPress={() => void pickFromCamera()} variant="secondary" />
          <Button label="Galeria" onPress={() => void pickFromGallery()} variant="secondary" />
          <Button label="Documento" onPress={() => void pickDocument()} variant="secondary" />
        </View>

        {files.length > 0 ? (
          <View style={styles.files}>
            <Text style={styles.filesTitle}>Arquivos selecionados</Text>
            {files.map((file) => (
              <Text key={`${file.uri}-${file.name}`} style={styles.fileItem}>
                {file.name}
              </Text>
            ))}
          </View>
        ) : null}
      </SectionCard>

      <Button label="Enviar solicitacao" onPress={() => void onSubmit()} loading={isSubmitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  partnerSection: {
    gap: spacing.sm
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  selectedPartnerCard: {
    gap: spacing.xs,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    padding: spacing.md
  },
  selectedPartnerName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700'
  },
  selectedPartnerMeta: {
    color: colors.textMuted,
    fontSize: 13
  },
  partnerResults: {
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surface,
    padding: spacing.sm
  },
  partnerResultItem: {
    gap: 2,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  partnerResultPressed: {
    backgroundColor: colors.surfaceGlass
  },
  partnerResultName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  partnerResultMeta: {
    color: colors.textMuted,
    fontSize: 12
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 24, 43, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg
  },
  modalCard: {
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.md
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  modalHeaderText: {
    flex: 1,
    gap: spacing.xs
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800'
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20
  },
  modalScroll: {
    maxHeight: 480
  },
  modalContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm
  },
  dualFields: {
    flexDirection: 'row',
    gap: spacing.md
  },
  dualField: {
    flex: 1
  },
  categoriesBlock: {
    gap: spacing.sm
  },
  categoriesTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  categoriesList: {
    gap: spacing.sm
  },
  categoryChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    backgroundColor: colors.surfaceGlass,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  categoryChipActive: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong
  },
  categoryChipPressed: {
    opacity: 0.94
  },
  categoryChipText: {
    color: colors.primaryStrong,
    fontSize: 13,
    fontWeight: '700'
  },
  categoryChipTextActive: {
    color: colors.white
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  actions: {
    gap: spacing.md
  },
  files: {
    gap: spacing.sm
  },
  filesTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  fileItem: {
    color: colors.textMuted,
    fontSize: 13
  }
});
