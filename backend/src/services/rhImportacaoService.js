const XLSX = require('xlsx');
const {
  Obra,
  RhColaborador,
  RhEmpresaGrupo,
  RhImportacao,
  RhImportacaoLinha,
  User,
  sequelize
} = require('../models');
const { ValidationError } = require('../middlewares/validation');

const IMPORTACAO_INCLUDE = [
  {
    model: RhEmpresaGrupo,
    as: 'empresaGrupo',
    attributes: ['id', 'codigo', 'nome']
  },
  {
    model: Obra,
    as: 'obra',
    attributes: ['id', 'codigo', 'nome']
  },
  {
    model: User,
    as: 'criadoPor',
    attributes: ['id', 'nome', 'email']
  },
  {
    model: User,
    as: 'confirmadoPor',
    attributes: ['id', 'nome', 'email']
  }
];

const IMPORTACAO_LINHA_INCLUDE = [
  {
    model: RhColaborador,
    as: 'colaborador',
    attributes: ['id', 'nome', 'cpf', 'matricula', 'tipo_vinculo', 'status']
  }
];

function normalizeDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function normalizeMatricula(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return '';

  return /^\d+$/.test(raw)
    ? raw.replace(/^0+/, '') || '0'
    : raw;
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeImportHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseSpreadsheetRows(buffer) {
  if (!buffer) {
    throw new ValidationError('Arquivo de importacao invalido.');
  }

  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: false,
    raw: false
  });

  const [sheetName] = workbook.SheetNames;
  if (!sheetName) {
    throw new ValidationError('A planilha nao contem abas validas.');
  }

  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false
  });
}

function pickImportValue(row, aliases = []) {
  const normalizedMap = new Map(
    Object.entries(row || {}).map(([key, value]) => [normalizeImportHeader(key), value])
  );

  for (const alias of aliases) {
    const normalizedAlias = normalizeImportHeader(alias);
    if (normalizedMap.has(normalizedAlias)) {
      return normalizedMap.get(normalizedAlias);
    }
  }

  return undefined;
}

function parseImportDecimal(value, fieldName, { required = false, min = 0 } = {}) {
  const raw = String(value || '').trim();
  if (!raw) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < min) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  return parsed;
}

function parseOptionalText(value, fieldName, max = 255) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.length > max) {
    throw new ValidationError(`${fieldName} excede o tamanho permitido.`);
  }

  return normalized;
}

function parseNaturezaEvento(value) {
  const normalized = normalizeToken(value || 'CREDITO');
  if (!['CREDITO', 'DEBITO'].includes(normalized)) {
    throw new ValidationError('Natureza do evento invalida.');
  }
  return normalized;
}

async function ensureEmpresaGrupoExists(empresaGrupoId, transaction) {
  const empresa = await RhEmpresaGrupo.findByPk(empresaGrupoId, {
    transaction,
    attributes: ['id', 'nome']
  });

  if (!empresa) {
    throw new ValidationError('Empresa do grupo nao encontrada.');
  }

  return empresa;
}

async function ensureObraExists(obraId, transaction) {
  if (!obraId) {
    throw new ValidationError('Obra e obrigatoria para importar planilhas RH/DP.');
  }

  const obra = await Obra.findByPk(obraId, {
    transaction,
    attributes: ['id', 'nome']
  });

  if (!obra) {
    throw new ValidationError('Obra nao encontrada.');
  }

  return obra;
}

async function buildColaboradorLookup({ tipo_vinculo }) {
  const where = {};
  if (tipo_vinculo) {
    where.tipo_vinculo = tipo_vinculo;
  }

  const colaboradores = await RhColaborador.findAll({
    where,
    attributes: ['id', 'nome', 'cpf', 'matricula', 'tipo_vinculo', 'status', 'obra_id']
  });

  const byCpf = new Map();
  const byMatricula = new Map();
  const matriculasDuplicadas = new Set();

  colaboradores.forEach((colaborador) => {
    if (colaborador.cpf) {
      byCpf.set(String(colaborador.cpf), colaborador);
    }
    if (colaborador.matricula) {
      const matriculaNormalizada = normalizeMatricula(colaborador.matricula);
      const colaboradorExistente = byMatricula.get(matriculaNormalizada);

      if (colaboradorExistente && colaboradorExistente.id !== colaborador.id) {
        matriculasDuplicadas.add(matriculaNormalizada);
      } else {
        byMatricula.set(matriculaNormalizada, colaborador);
      }
    }
  });

  return {
    byCpf,
    byMatricula,
    matriculasDuplicadas
  };
}

function resolveColaborador(row, lookup) {
  const cpf = normalizeDigits(pickImportValue(row, ['cpf']));
  const matricula = normalizeMatricula(pickImportValue(row, ['matricula']));

  if (!cpf && !matricula) {
    throw new ValidationError('CPF ou matricula do colaborador e obrigatorio.');
  }

  const colaboradorByCpf = cpf ? lookup.byCpf.get(cpf) : null;
  if (!colaboradorByCpf && matricula && lookup.matriculasDuplicadas.has(matricula)) {
    throw new ValidationError('Matricula encontrada em mais de um colaborador. Informe o CPF para identificar a linha.');
  }

  const colaboradorByMatricula = matricula ? lookup.byMatricula.get(matricula) : null;

  if (colaboradorByCpf && colaboradorByMatricula && colaboradorByCpf.id !== colaboradorByMatricula.id) {
    throw new ValidationError('CPF e matricula referenciam colaboradores diferentes.');
  }

  const colaborador = colaboradorByCpf || colaboradorByMatricula;
  if (!colaborador) {
    throw new ValidationError('Colaborador nao encontrado para a linha importada.');
  }

  return {
    colaborador,
    cpf_ref: cpf || colaborador.cpf || null,
    matricula_ref: matricula || colaborador.matricula || null,
    nome_ref: colaborador.nome || null
  };
}

function ensureColaboradorPertenceObra(colaborador, obraId) {
  const colaboradorObraId = Number(colaborador?.obra_id || 0);
  const importacaoObraId = Number(obraId || 0);

  if (!Number.isInteger(importacaoObraId) || importacaoObraId <= 0) {
    throw new ValidationError('Obra e obrigatoria para importar planilhas RH/DP.');
  }

  if (colaboradorObraId !== importacaoObraId) {
    throw new ValidationError('Colaborador nao pertence a obra selecionada para esta importacao.');
  }
}

function parseLinhaJornada(row) {
  return {
    dias_trabalhados: parseImportDecimal(
      pickImportValue(row, ['dias_trabalhados', 'dias_trabalhados_no_mes', 'dias']),
      'Dias trabalhados',
      { required: true, min: 0.01 }
    ),
    faltas: parseImportDecimal(pickImportValue(row, ['faltas']), 'Faltas', { min: 0 }) || 0,
    horas_extras: parseImportDecimal(
      pickImportValue(row, ['horas_extras', 'horas_extra']),
      'Horas extras',
      { min: 0 }
    ) || 0,
    adicionais: parseImportDecimal(
      pickImportValue(row, ['adicionais', 'valor_adicionais']),
      'Adicionais',
      { min: 0 }
    ) || 0,
    descontos_informados: parseImportDecimal(
      pickImportValue(row, ['descontos', 'descontos_informados']),
      'Descontos informados',
      { min: 0 }
    ) || 0,
    valor_informado: parseImportDecimal(
      pickImportValue(row, ['valor_informado', 'valor']),
      'Valor informado',
      { min: 0 }
    ),
    observacoes: parseOptionalText(pickImportValue(row, ['observacoes']), 'Observacoes', 2000)
  };
}

function parseLinhaEvento(row) {
  const codigoEvento = parseOptionalText(
    pickImportValue(row, ['codigo_evento', 'evento_codigo']),
    'Codigo do evento',
    60
  );
  const descricaoEvento = parseOptionalText(
    pickImportValue(row, ['descricao_evento', 'evento', 'descricao']),
    'Descricao do evento',
    180
  );

  if (!codigoEvento && !descricaoEvento) {
    throw new ValidationError('Codigo ou descricao do evento e obrigatorio.');
  }

  return {
    codigo_evento: codigoEvento,
    descricao_evento: descricaoEvento,
    natureza: parseNaturezaEvento(pickImportValue(row, ['natureza'])),
    valor: parseImportDecimal(pickImportValue(row, ['valor']), 'Valor do evento', {
      required: true,
      min: 0
    }),
    referencia: parseOptionalText(pickImportValue(row, ['referencia']), 'Referencia', 120),
    observacoes: parseOptionalText(pickImportValue(row, ['observacoes']), 'Observacoes', 2000)
  };
}

function parseLinhaDesconto(row) {
  const codigoEvento = parseOptionalText(
    pickImportValue(row, ['codigo_evento', 'evento_codigo']),
    'Codigo do desconto',
    60
  );
  const descricaoEvento = parseOptionalText(
    pickImportValue(row, ['descricao_evento', 'desconto', 'descricao']),
    'Descricao do desconto',
    180
  ) || 'DESCONTO';

  return {
    codigo_evento: codigoEvento,
    descricao_evento: descricaoEvento,
    natureza: 'DEBITO',
    valor: parseImportDecimal(pickImportValue(row, ['valor']), 'Valor do desconto', {
      required: true,
      min: 0
    }),
    referencia: parseOptionalText(pickImportValue(row, ['referencia']), 'Referencia', 120),
    observacoes: parseOptionalText(pickImportValue(row, ['observacoes']), 'Observacoes', 2000)
  };
}

function parseLinhaImportacao(tipo, row, lookup, obraId) {
  const referenciaColaborador = resolveColaborador(row, lookup);
  ensureColaboradorPertenceObra(referenciaColaborador.colaborador, obraId);

  let payload;
  if (tipo === 'JORNADA') {
    payload = parseLinhaJornada(row);
  } else if (tipo === 'EVENTO_VARIAVEL') {
    payload = parseLinhaEvento(row);
  } else if (tipo === 'DESCONTO') {
    payload = parseLinhaDesconto(row);
  } else {
    throw new ValidationError('Tipo de importacao RH/DP nao suportado.');
  }

  return {
    ...referenciaColaborador,
    payload_json: payload
  };
}

function buildResumoImportacao(tipo, linhas = []) {
  const resumoBase = {
    tipo,
    total_linhas: linhas.length,
    total_validas: linhas.filter((item) => item.status === 'VALIDA').length,
    total_erros: linhas.filter((item) => item.status === 'ERRO').length
  };

  if (tipo === 'JORNADA') {
    return linhas.reduce((acc, item) => {
      if (item.status !== 'VALIDA') {
        return acc;
      }

      return {
        ...acc,
        total_dias_trabalhados: Number(acc.total_dias_trabalhados || 0) + Number(item.payload_json?.dias_trabalhados || 0),
        total_faltas: Number(acc.total_faltas || 0) + Number(item.payload_json?.faltas || 0),
        total_horas_extras: Number(acc.total_horas_extras || 0) + Number(item.payload_json?.horas_extras || 0),
        total_adicionais: Number(acc.total_adicionais || 0) + Number(item.payload_json?.adicionais || 0),
        total_descontos_informados: Number(acc.total_descontos_informados || 0) + Number(item.payload_json?.descontos_informados || 0),
        total_valor_informado: Number(acc.total_valor_informado || 0) + Number(item.payload_json?.valor_informado || 0)
      };
    }, resumoBase);
  }

  return linhas.reduce((acc, item) => {
    if (item.status !== 'VALIDA') {
      return acc;
    }

    return {
      ...acc,
      total_valor: Number(acc.total_valor || 0) + Number(item.payload_json?.valor || 0)
    };
  }, resumoBase);
}

async function listarImportacoesRh(filters = {}) {
  const where = {};

  if (filters.tipo) where.tipo = filters.tipo;
  if (filters.competencia) where.competencia = filters.competencia;
  if (filters.empresa_grupo_id) where.empresa_grupo_id = filters.empresa_grupo_id;
  if (filters.obra_id) where.obra_id = filters.obra_id;
  if (filters.tipo_vinculo) where.tipo_vinculo = filters.tipo_vinculo;
  if (filters.status) where.status = filters.status;

  return RhImportacao.findAll({
    where,
    include: IMPORTACAO_INCLUDE,
    order: [['createdAt', 'DESC']]
  });
}

async function detalharImportacaoRh(id, { transaction = undefined } = {}) {
  const importacao = await RhImportacao.findByPk(id, {
    transaction,
    include: [
      ...IMPORTACAO_INCLUDE,
      {
        model: RhImportacaoLinha,
        as: 'linhas',
        separate: true,
        order: [['numero_linha', 'ASC']],
        include: IMPORTACAO_LINHA_INCLUDE,
        limit: 500
      }
    ]
  });

  if (!importacao) {
    throw new ValidationError('Importacao RH/DP nao encontrada.', 404);
  }

  return importacao;
}

async function criarPreviewImportacaoRh(data, file, user) {
  if (!file?.buffer) {
    throw new ValidationError('Arquivo de importacao nao enviado.');
  }

  const rows = parseSpreadsheetRows(file.buffer);
  if (!rows.length) {
    throw new ValidationError('A planilha nao contem registros para importar.');
  }

  if (data.empresa_grupo_id) {
    await ensureEmpresaGrupoExists(data.empresa_grupo_id);
  }
  await ensureObraExists(data.obra_id);

  const lookup = await buildColaboradorLookup(data);
  const linhasProcessadas = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const numeroLinha = index + 2;

    try {
      const linha = parseLinhaImportacao(data.tipo, row, lookup, data.obra_id);
      linhasProcessadas.push({
        numero_linha: numeroLinha,
        colaborador_id: linha.colaborador.id,
        matricula_ref: linha.matricula_ref,
        cpf_ref: linha.cpf_ref,
        nome_ref: linha.nome_ref,
        status: 'VALIDA',
        payload_json: linha.payload_json,
        erro_mensagem: null
      });
    } catch (error) {
      linhasProcessadas.push({
        numero_linha: numeroLinha,
        colaborador_id: null,
        matricula_ref: String(pickImportValue(row, ['matricula']) || '').trim() || null,
        cpf_ref: normalizeDigits(pickImportValue(row, ['cpf'])) || null,
        nome_ref: String(pickImportValue(row, ['nome', 'colaborador']) || '').trim() || null,
        status: 'ERRO',
        payload_json: null,
        erro_mensagem: error?.message || 'Erro ao processar linha'
      });
    }
  }

  const resumo = buildResumoImportacao(data.tipo, linhasProcessadas);

  return sequelize.transaction(async (transaction) => {
    const importacao = await RhImportacao.create(
      {
        tipo: data.tipo,
        competencia: data.competencia,
        empresa_grupo_id: data.empresa_grupo_id || null,
        obra_id: data.obra_id || null,
        tipo_vinculo: data.tipo_vinculo,
        status: 'PREVIEW',
        nome_arquivo: String(file.originalname || 'importacao-rh'),
        total_linhas: resumo.total_linhas,
        total_validas: resumo.total_validas,
        total_erros: resumo.total_erros,
        observacoes: data.observacoes,
        resumo_json: resumo,
        criado_por: user?.id || null
      },
      { transaction }
    );

    if (linhasProcessadas.length) {
      await RhImportacaoLinha.bulkCreate(
        linhasProcessadas.map((linha) => ({
          ...linha,
          importacao_id: importacao.id
        })),
        { transaction }
      );
    }

    return detalharImportacaoRh(importacao.id, { transaction });
  });
}

async function confirmarImportacaoRh(id, user) {
  return sequelize.transaction(async (transaction) => {
    const importacao = await RhImportacao.findByPk(id, {
      transaction
    });

    if (!importacao) {
      throw new ValidationError('Importacao RH/DP nao encontrada.', 404);
    }

    if (importacao.status !== 'PREVIEW') {
      throw new ValidationError('A importacao RH/DP ja foi finalizada.');
    }

    if (!Number(importacao.total_validas || 0)) {
      throw new ValidationError('Nao existem linhas validas para confirmar nesta importacao.');
    }

    await RhImportacaoLinha.update(
      { status: 'CONFIRMADA' },
      {
        where: {
          importacao_id: importacao.id,
          status: 'VALIDA'
        },
        transaction
      }
    );

    await importacao.update(
      {
        status: 'CONFIRMADA',
        confirmado_por: user?.id || null,
        confirmado_em: new Date()
      },
      { transaction }
    );

    return detalharImportacaoRh(importacao.id, { transaction });
  });
}

module.exports = {
  confirmarImportacaoRh,
  criarPreviewImportacaoRh,
  detalharImportacaoRh,
  listarImportacoesRh
};
