process.env.DOTENV_CONFIG_QUIET = 'true';

const db = require('../src/models');
const {
  applyTipoSolicitacaoModuleAvailability,
  normalizeTipoSolicitacaoBehavior,
  normalizeTipoSolicitacaoCodigo
} = require('../src/services/tipoSolicitacaoBehaviorService');
const {
  CAMPOS_NOVA_SOLICITACAO,
  obterConfigCamposNovaSolicitacao,
  resolverCamposNovaSolicitacao
} = require('../src/services/novaSolicitacaoCamposConfig');
const {
  obterConfigAutomacaoDestinoNovaSolicitacao,
  obterRegraAutomacaoDestino
} = require('../src/services/novaSolicitacaoAutomacaoDestinoConfig');
const { getModuloConfig } = require('../src/services/moduleConfigService');
const { env } = require('../src/config/env');

const CONFIG_KEYS = [
  'AREAS_POR_SETOR_ORIGEM',
  'AREAS_OBRA_VISIVEIS',
  'TIPOS_SOLICITACAO_POR_SETOR',
  'NOVA_SOLICITACAO_CAMPOS_POR_TIPO',
  'NOVA_SOLICITACAO_AUTOMACAO_DESTINO',
  'MODULOS_HABILITADOS'
];

const CAMPOS_SOLICITACAO_COMPRA = [
  {
    id: 'obra_id',
    label: 'Obra',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Deve existir e estar no escopo de criacao do usuario.'
  },
  {
    id: 'solicitante',
    label: 'Solicitante',
    nivel: 'cabecalho',
    visivel: true,
    somente_leitura: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'Obtido da sessao autenticada; nao e enviado como escolha do usuario.'
  },
  {
    id: 'necessario_para',
    label: 'Necessario para (cabecalho)',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'Valor padrao opcional para os itens.'
  },
  {
    id: 'observacoes',
    label: 'Observacoes',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'Texto opcional, limitado a 5.000 caracteres pelo backend.'
  },
  {
    id: 'itens',
    label: 'Itens da solicitacao',
    nivel: 'colecao',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Minimo de 1 e maximo de 300 itens.'
  },
  {
    id: 'item_tipo',
    label: 'Origem do item (cadastrado ou manual)',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Item cadastrado exige insumo; item manual exige nome e unidade.'
  },
  {
    id: 'insumo_id',
    label: 'Insumo cadastrado',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: 'CONDICIONAL',
    obrigatorio_backend: 'CONDICIONAL',
    condicao: 'Obrigatorio quando o item nao for manual.'
  },
  {
    id: 'nome_manual',
    label: 'Nome do item manual',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: 'CONDICIONAL',
    obrigatorio_backend: 'CONDICIONAL',
    condicao: 'Obrigatorio quando o item for manual.'
  },
  {
    id: 'unidade',
    label: 'Unidade',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: 'CONDICIONAL',
    obrigatorio_backend: 'CONDICIONAL',
    condicao: 'Obrigatoria para item manual; para item cadastrado pode vir do cadastro do insumo.'
  },
  {
    id: 'quantidade',
    label: 'Quantidade',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Deve ser maior que zero.'
  },
  {
    id: 'especificacao',
    label: 'Especificacao',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false
  },
  {
    id: 'apropriacoes',
    label: 'Apropriacoes do item',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Ao menos uma apropriacao analitica da obra; sem repeticao; quantidades positivas; soma deve fechar a quantidade do item.'
  },
  {
    id: 'necessario_para_item',
    label: 'Necessario para (item)',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: false,
    regra: 'A tela bloqueia item sem data; o backend atualmente aceita nulo.'
  },
  {
    id: 'link_produto',
    label: 'Link do produto',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false
  },
  {
    id: 'arquivo_item',
    label: 'Arquivo do item',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false
  },
  {
    id: 'modelo_importacao',
    label: 'Modelo e importacao em massa de itens',
    nivel: 'acao_auxiliar',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'A importacao alimenta os mesmos campos dos itens e respeita o limite de 300.'
  }
];

const CAMPOS_COMPRA_DIRETA = [
  {
    id: 'obra_id',
    label: 'Obra',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Deve existir e estar no escopo de criacao do usuario.'
  },
  {
    id: 'solicitante',
    label: 'Solicitante',
    nivel: 'cabecalho',
    visivel: true,
    somente_leitura: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'Obtido da sessao autenticada.'
  },
  {
    id: 'necessario_para',
    label: 'Data de vencimento',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false
  },
  {
    id: 'forma_pagamento_ids',
    label: 'Formas de pagamento',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Ao menos uma forma ativa cadastrada no Financeiro; maximo de 20.'
  },
  {
    id: 'parceiro_id',
    label: 'Credor',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'Quando informado, precisa existir, estar ativo e marcado como fornecedor/credor.'
  },
  {
    id: 'observacoes',
    label: 'Observacoes',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'Texto opcional, limitado a 5.000 caracteres.'
  },
  {
    id: 'dados_pagamento',
    label: 'Dados para pagamento',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'Texto opcional, limitado a 1.500 caracteres.'
  },
  {
    id: 'desconto_total',
    label: 'Desconto concedido',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'Maior ou igual a zero e nao pode superar o valor bruto dos itens.'
  },
  {
    id: 'anexos_cabecalho',
    label: 'Nota fiscal, guia ou boleto',
    nivel: 'cabecalho',
    visivel: true,
    obrigatorio_frontend: 'CONDICIONAL',
    obrigatorio_backend: 'CONDICIONAL',
    condicao: 'Boleto e obrigatorio quando qualquer forma de pagamento selecionada for boleto; nota fiscal/guia permanece opcional.'
  },
  {
    id: 'itens',
    label: 'Itens da compra direta',
    nivel: 'colecao',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Minimo de 1 e maximo de 300 itens.'
  },
  {
    id: 'item_tipo',
    label: 'Origem do item (cadastrado ou manual)',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Item cadastrado exige insumo; item manual exige nome e unidade.'
  },
  {
    id: 'insumo_id',
    label: 'Insumo cadastrado',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: 'CONDICIONAL',
    obrigatorio_backend: 'CONDICIONAL',
    condicao: 'Obrigatorio quando o item nao for manual.'
  },
  {
    id: 'nome_manual',
    label: 'Nome do item manual',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: 'CONDICIONAL',
    obrigatorio_backend: 'CONDICIONAL',
    condicao: 'Obrigatorio quando o item for manual.'
  },
  {
    id: 'unidade',
    label: 'Unidade',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: 'CONDICIONAL',
    obrigatorio_backend: 'CONDICIONAL',
    condicao: 'Obrigatoria para item manual; para item cadastrado pode vir do cadastro do insumo.'
  },
  {
    id: 'quantidade',
    label: 'Quantidade',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Deve ser maior que zero.'
  },
  {
    id: 'valor_unitario',
    label: 'Valor unitario',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: 'PARCIAL',
    regra: 'A tela exige valor positivo em cada item; o backend exige apenas valor total liquido positivo para a compra.'
  },
  {
    id: 'valor_total',
    label: 'Valor total do item',
    nivel: 'item',
    visivel: true,
    somente_leitura: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'Calculado por quantidade x valor unitario e ajustado pelo rateio do desconto.'
  },
  {
    id: 'apropriacoes',
    label: 'Apropriacoes do item',
    nivel: 'item',
    visivel: true,
    obrigatorio_frontend: true,
    obrigatorio_backend: true,
    regra: 'Ao menos uma apropriacao analitica da obra; sem repeticao; quantidades positivas; soma deve fechar a quantidade do item.'
  },
  {
    id: 'modelo_importacao',
    label: 'Modelo e importacao Excel',
    nivel: 'acao_auxiliar',
    visivel: true,
    obrigatorio_frontend: false,
    obrigatorio_backend: false,
    regra: 'A importacao alimenta os mesmos campos dos itens e respeita o limite de 300.'
  }
];

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toPlain(model) {
  return model?.get ? model.get({ plain: true }) : model;
}

function unique(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

function sectorTokens(sector) {
  return unique([normalizeToken(sector?.codigo), normalizeToken(sector?.nome)]);
}

function findConfigForSector(rules, sector) {
  for (const token of sectorTokens(sector)) {
    if (rules?.[token]) return { token, regra: rules[token] };
  }
  return { token: null, regra: null };
}

function configLatestMap(rows) {
  const map = {};
  rows
    .map(toPlain)
    .sort((a, b) => Number(b.id) - Number(a.id))
    .forEach((item) => {
      if (map[item.chave]) return;
      map[item.chave] = {
        id: item.id,
        updated_at: item.updatedAt || null,
        valor: parseJson(item.valor, item.valor)
      };
    });
  return map;
}

function getConfigValue(configs, key, fallback = {}) {
  const value = configs?.[key]?.valor;
  return value && typeof value === 'object' ? value : fallback;
}

function summarizeFields(fields) {
  return Object.values(fields || {}).map((field) => ({
    id: field.id,
    label: field.label,
    visivel: Boolean(field.visivel),
    obrigatorio: Boolean(field.obrigatorio),
    fixo: Boolean(field.fixo),
    visivel_padrao: Boolean(field.visivel_padrao),
    obrigatorio_padrao: Boolean(field.obrigatorio_padrao),
    origem_visibilidade: Boolean(field.visivel) === Boolean(field.visivel_padrao) ? 'PADRAO_DO_TIPO' : 'CONFIGURACAO_DO_BANCO',
    origem_obrigatoriedade: Boolean(field.obrigatorio) === Boolean(field.obrigatorio_padrao) ? 'PADRAO_DO_TIPO' : 'CONFIGURACAO_DO_BANCO'
  }));
}

function buildCatalogoNovaSolicitacao() {
  return CAMPOS_NOVA_SOLICITACAO.map((field) => ({
    id: field.id,
    label: field.label,
    descricao: field.descricao,
    fixo: Boolean(field.fixo),
    permite_obrigatorio: field.permiteObrigatorio !== false
  }));
}

function resolveSectorByToken(sectors, token) {
  const normalized = normalizeToken(token);
  return sectors.find((sector) => sectorTokens(sector).includes(normalized)) || null;
}

function buildInconsistencias({ sectors, types, typeRules }) {
  const inconsistencias = [];
  const typeMap = new Map(types.map((type) => [Number(type.id), type]));

  Object.entries(typeRules || {}).forEach(([sectorKey, rule]) => {
    const sector = resolveSectorByToken(sectors, sectorKey);
    if (!sector) {
      inconsistencias.push({
        nivel: 'ALERTA',
        codigo: 'REGRA_TIPOS_SETOR_INEXISTENTE',
        detalhe: `A configuracao TIPOS_SOLICITACAO_POR_SETOR possui a chave ${sectorKey}, mas nenhum setor cadastrado corresponde a ela.`
      });
    }

    (Array.isArray(rule?.tipos) ? rule.tipos : []).forEach((typeId) => {
      const type = typeMap.get(Number(typeId));
      if (!type) {
        inconsistencias.push({
          nivel: 'ERRO',
          codigo: 'TIPO_REFERENCIADO_INEXISTENTE',
          detalhe: `O setor ${sectorKey} referencia o tipo ${typeId}, que nao existe no cadastro.`
        });
      } else if (type.ativo === false) {
        inconsistencias.push({
          nivel: 'ALERTA',
          codigo: 'TIPO_INATIVO_REFERENCIADO',
          detalhe: `O setor ${sectorKey} referencia o tipo inativo ${type.nome} (#${type.id}).`
        });
      }
    });
  });

  inconsistencias.push({
    nivel: 'ALERTA',
    codigo: 'SC_DATA_ITEM_APENAS_FRONTEND',
    detalhe: 'Na Solicitacao de Compra, Necessario para por item e obrigatorio na tela, mas o backend aceita o campo nulo.'
  });
  inconsistencias.push({
    nivel: 'ALERTA',
    codigo: 'CD_VALOR_ITEM_VALIDACAO_DIFERENTE',
    detalhe: 'Na Compra Direta, a tela exige valor unitario positivo em cada item; o backend exige valor liquido total positivo, sem repetir a mesma obrigatoriedade por item.'
  });
  inconsistencias.push({
    nivel: 'ATENCAO',
    codigo: 'CD_TIPO_INFORMADO_NAO_REVALIDADO_POR_CODIGO',
    detalhe: 'Quando tipo_solicitacao_id e enviado na Compra Direta, o backend aceita o cadastro encontrado pelo ID sem confirmar que seu codigo interno seja COMPRA_DIRETA.'
  });

  return inconsistencias;
}

async function run() {
  await db.sequelize.authenticate();

  const [sectorRows, typeRows, subtypeRows, configRows, modules, fieldsConfig, destinationConfig] = await Promise.all([
    db.Setor.findAll({
      attributes: [
        'id', 'codigo', 'nome', 'ativo', 'eh_setor_obra', 'eh_setor_financeiro',
        'eh_setor_compras', 'eh_setor_geo', 'eh_setor_administrativo', 'createdAt', 'updatedAt'
      ],
      order: [['nome', 'ASC']]
    }),
    db.TipoSolicitacao.findAll({ order: [['nome', 'ASC']] }),
    db.TipoSubContrato.findAll({ order: [['tipo_macro_id', 'ASC'], ['nome', 'ASC']] }),
    db.ConfiguracaoSistema.findAll({
      where: { chave: { [db.Sequelize.Op.in]: CONFIG_KEYS } },
      attributes: ['id', 'chave', 'valor', 'updatedAt'],
      order: [['id', 'DESC']]
    }),
    getModuloConfig(),
    obterConfigCamposNovaSolicitacao(),
    obterConfigAutomacaoDestinoNovaSolicitacao()
  ]);

  const sectors = sectorRows.map(toPlain);
  const types = typeRows.map(toPlain).map((type) => ({
    ...type,
    codigo_interno: normalizeTipoSolicitacaoCodigo(type.codigo_interno, type.nome),
    comportamento_normalizado: normalizeTipoSolicitacaoBehavior(type)
  }));
  const subtypes = subtypeRows.map(toPlain);
  const configs = configLatestMap(configRows);
  const typeRules = getConfigValue(configs, 'TIPOS_SOLICITACAO_POR_SETOR', { regras: {} }).regras || {};
  const moduleMap = new Map(modules.map((item) => [item.key, Boolean(item.enabled)]));
  const activeTypes = types.filter((type) => type.ativo !== false);

  const setoresDetalhados = sectors.map((sector) => {
    const { token: configToken, regra: typeRule } = findConfigForSector(typeRules, sector);
    const configuredTypeIds = Array.isArray(typeRule?.tipos)
      ? typeRule.tipos.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const configuredTypeSet = new Set(configuredTypeIds);
    const allowedTypes = configuredTypeSet.size > 0
      ? activeTypes.filter((type) => configuredTypeSet.has(Number(type.id)))
      : activeTypes;

    const tiposDoSetor = allowedTypes.map((type) => {
      const behavior = applyTipoSolicitacaoModuleAvailability(type.comportamento_normalizado, {
        contratos: moduleMap.get('CONTRATOS') !== false,
        apropriacoes: moduleMap.get('OBRAS') !== false
      });
      const fields = resolverCamposNovaSolicitacao(behavior, fieldsConfig, type.id, {
        apropriacoesDisponiveis: moduleMap.get('OBRAS') !== false,
        areaResponsavel: sector.codigo || sector.nome
      });
      const redirect = obterRegraAutomacaoDestino(
        destinationConfig,
        sector.codigo || sector.nome,
        type.id
      );
      const isDirectPurchase = type.codigo_interno === 'COMPRA_DIRETA';
      const effectiveRedirect = isDirectPurchase
        ? {
            ativo: true,
            destino: 'COMPRA_DIRETA',
            rota: '/solicitacoes-compra-direta/nova',
            origem: 'REGRA_FIXA_FRONTEND'
          }
        : (redirect ? { ...redirect, origem: 'CONFIGURACAO_DO_BANCO' } : null);

      return {
        id: type.id,
        codigo: type.codigo_interno,
        nome: type.nome,
        ativo: type.ativo !== false,
        modo_recebimento: typeRule?.modos?.[String(type.id)] || 'TODOS_VISIVEIS',
        comportamento: behavior,
        entrada: effectiveRedirect
          ? { tipo: 'REDIRECIONAMENTO', ...effectiveRedirect }
          : { tipo: 'NOVA_SOLICITACAO_GERAL', rota: '/nova-solicitacao' },
        campos: summarizeFields(fields),
        campos_visiveis: summarizeFields(fields).filter((field) => field.visivel),
        campos_obrigatorios: summarizeFields(fields).filter((field) => field.obrigatorio),
        subtipos_ativos: subtypes
          .filter((subtype) => Number(subtype.tipo_macro_id) === Number(type.id) && subtype.ativo !== false)
          .map((subtype) => ({ id: subtype.id, nome: subtype.nome }))
      };
    });

    return {
      id: sector.id,
      codigo: sector.codigo,
      nome: sector.nome,
      ativo: sector.ativo !== false,
      capacidades: {
        obra: Boolean(sector.eh_setor_obra),
        financeiro: Boolean(sector.eh_setor_financeiro),
        compras: Boolean(sector.eh_setor_compras),
        geo: Boolean(sector.eh_setor_geo),
        administrativo: Boolean(sector.eh_setor_administrativo)
      },
      configuracao_tipos: {
        possui_regra_especifica: Boolean(typeRule),
        chave_utilizada: configToken,
        fallback_todos_tipos_ativos: !typeRule || configuredTypeIds.length === 0,
        ids_configurados: configuredTypeIds
      },
      total_tipos_disponiveis: tiposDoSetor.length,
      tipos: tiposDoSetor
    };
  });

  const report = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    environment: env.nodeEnv,
    database_name: env.dbName || null,
    read_only: true,
    privacy: 'Nao inclui usuarios, solicitacoes, credores, descricoes, anexos ou outros dados pessoais.',
    objetivo: 'Auditar todos os setores, tipos de solicitacao e campos disponiveis/obrigatorios nas tres entradas de criacao.',
    resumo: {
      setores_cadastrados: sectors.length,
      setores_ativos: sectors.filter((sector) => sector.ativo !== false).length,
      tipos_cadastrados: types.length,
      tipos_ativos: activeTypes.length,
      combinacoes_setor_tipo_ativas: setoresDetalhados
        .filter((sector) => sector.ativo)
        .reduce((total, sector) => total + sector.total_tipos_disponiveis, 0)
    },
    modulos_habilitados: modules.map((item) => ({ key: item.key, enabled: Boolean(item.enabled) })),
    setores: setoresDetalhados,
    tipos_solicitacao: types.map((type) => ({
      id: type.id,
      codigo: type.codigo_interno,
      nome: type.nome,
      ativo: type.ativo !== false,
      comportamento: type.comportamento_normalizado,
      subtipos: subtypes
        .filter((subtype) => Number(subtype.tipo_macro_id) === Number(type.id))
        .map((subtype) => ({ id: subtype.id, nome: subtype.nome, ativo: subtype.ativo !== false }))
    })),
    formularios: {
      nova_solicitacao: {
        rota: '/nova-solicitacao',
        catalogo_campos: buildCatalogoNovaSolicitacao(),
        observacao: 'A visibilidade e a obrigatoriedade efetivas estao detalhadas em setores[].tipos[].campos.'
      },
      solicitacao_compra: {
        rota: '/solicitacoes-compra/nova',
        endpoint: 'POST /api/compras/solicitacoes',
        campos: CAMPOS_SOLICITACAO_COMPRA
      },
      compra_direta: {
        rota: '/solicitacoes-compra-direta/nova',
        endpoint: 'POST /api/compras/solicitacoes-diretas',
        campos: CAMPOS_COMPRA_DIRETA
      }
    },
    inconsistencias_e_pontos_de_atencao: buildInconsistencias({
      sectors,
      types,
      typeRules
    }),
    configuracoes_relevantes: Object.fromEntries(
      Object.entries(configs).map(([key, item]) => [key, {
        id: item.id,
        updated_at: item.updated_at,
        valor: item.valor
      }])
    ),
    fontes_de_codigo: [
      'backend/src/services/novaSolicitacaoCamposConfig.js',
      'backend/src/services/tipoSolicitacaoBehaviorService.js',
      'backend/src/controllers/SolicitacaoController.js',
      'backend/src/validators/operationalValidators.js',
      'backend/src/controllers/SolicitacaoCompraController.js',
      'frontend/src/pages/NovaSolicitacao.jsx',
      'frontend/src/modules/solicitacao-compra/pages/NovaSolicitacaoCompra.jsx',
      'frontend/src/modules/solicitacao-compra/utils/apropriacoes.js'
    ]
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

run()
  .catch((error) => {
    process.stderr.write(`${JSON.stringify({
      error: error.message,
      stack: error.stack,
      read_only: true
    }, null, 2)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.sequelize.close().catch(() => {});
  });
