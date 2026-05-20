const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  Obra,
  RhColaborador,
  RhColaboradorPagamento,
  RhDocumento,
  RhDocumentoTipo,
  RhEmpresaGrupo,
  Setor,
  User,
  sequelize
} = require('../models');
const { ValidationError } = require('../middlewares/validation');
const { uploadToS3, getPresignedUrl } = require('./s3');
const { normalizeOriginalName } = require('../utils/fileName');
const {
  TIPO_EMPRESA_HOLDING,
  TIPO_EMPRESA_OPERACIONAL,
  normalizeTipoEmpresaGrupo
} = require('../constants/empresaGrupo');

const COLABORADOR_INCLUDE = [
  {
    model: RhEmpresaGrupo,
    as: 'empresaGrupo',
    attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj', 'tipo_empresa', 'holding_id', 'ativo']
  },
  {
    model: Obra,
    as: 'obra',
    attributes: ['id', 'codigo', 'nome']
  },
  {
    model: Setor,
    as: 'setor',
    attributes: ['id', 'codigo', 'nome']
  },
  {
    model: RhColaboradorPagamento,
    as: 'pagamento'
  }
];

const DOCUMENTO_STATUS_PERMITIDOS = ['ENVIADO', 'CONFERIDO', 'REJEITADO'];

const COLABORADOR_DOCUMENTO_INCLUDE = [
  {
    model: RhEmpresaGrupo,
    as: 'empresaGrupo',
    attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj', 'ativo']
  },
  {
    model: Obra,
    as: 'obra',
    attributes: ['id', 'codigo', 'nome']
  }
];

const DOCUMENTO_INCLUDE = [
  {
    model: RhDocumentoTipo,
    as: 'tipoDocumento',
    attributes: ['id', 'codigo', 'nome', 'tipo_vinculo', 'obrigatorio', 'exige_validade', 'ativo']
  },
  {
    model: RhColaborador,
    as: 'colaborador',
    attributes: ['id', 'nome', 'cpf', 'matricula', 'tipo_vinculo', 'empresa_grupo_id', 'obra_id', 'status'],
    include: COLABORADOR_DOCUMENTO_INCLUDE
  },
  {
    model: User,
    as: 'criadoPor',
    attributes: ['id', 'nome', 'email']
  },
  {
    model: RhDocumento,
    as: 'documentoAnterior',
    attributes: ['id', 'nome_original', 'status', 'createdAt']
  }
];

function normalizeDigits(value) {
  return String(value || '').replace(/\D+/g, '');
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

function parseImportDate(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('/');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('Data invalida na importacao.');
  }

  return parsed.toISOString().slice(0, 10);
}

function parseImportDecimal(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return undefined;
  }

  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError('Valor numerico invalido na importacao.');
  }

  return parsed;
}

function toDateOnlyString(value) {
  return value.toISOString().slice(0, 10);
}

function getValidadeStatus(validade) {
  if (!validade) {
    return 'SEM_VALIDADE';
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const alerta = new Date(hoje);
  alerta.setDate(alerta.getDate() + 30);

  const dataValidade = new Date(`${String(validade).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dataValidade.getTime())) {
    return 'SEM_VALIDADE';
  }

  if (dataValidade < hoje) {
    return 'VENCIDO';
  }

  if (dataValidade <= alerta) {
    return 'A_VENCER';
  }

  return 'VALIDO';
}

function enrichDocumento(documento) {
  const plain = typeof documento?.toJSON === 'function' ? documento.toJSON() : documento;
  return {
    ...plain,
    validade_status: getValidadeStatus(plain?.validade)
  };
}

async function ensureEmpresaGrupoExists(empresaGrupoId, transaction) {
  const empresa = await RhEmpresaGrupo.findByPk(empresaGrupoId, {
    transaction,
    attributes: ['id', 'ativo']
  });

  if (!empresa) {
    throw new ValidationError('Empresa do grupo nao encontrada.');
  }

  return empresa;
}

async function ensureObraExists(obraId, transaction) {
  if (!obraId) {
    return null;
  }

  const obra = await Obra.findByPk(obraId, {
    transaction,
    attributes: ['id']
  });

  if (!obra) {
    throw new ValidationError('Obra nao encontrada.');
  }

  return obra;
}

async function ensureSetorExists(setorId, transaction) {
  if (!setorId) {
    return null;
  }

  const setor = await Setor.findByPk(setorId, {
    transaction,
    attributes: ['id']
  });

  if (!setor) {
    throw new ValidationError('Setor nao encontrado.');
  }

  return setor;
}

async function ensureColaboradorExists(colaboradorId, transaction) {
  const colaborador = await RhColaborador.findByPk(colaboradorId, {
    transaction,
    include: COLABORADOR_INCLUDE
  });

  if (!colaborador) {
    throw new ValidationError('Colaborador nao encontrado.');
  }

  return colaborador;
}

async function ensureDocumentoTipoExists(documentoTipoId, transaction) {
  const tipoDocumento = await RhDocumentoTipo.findByPk(documentoTipoId, {
    transaction
  });

  if (!tipoDocumento || !tipoDocumento.ativo) {
    throw new ValidationError('Tipo de documento RH/DP nao encontrado.');
  }

  return tipoDocumento;
}

function ensureDocumentoTipoCompativel(colaborador, tipoDocumento) {
  if (
    tipoDocumento?.tipo_vinculo &&
    String(tipoDocumento.tipo_vinculo).trim().toUpperCase() !==
      String(colaborador?.tipo_vinculo || '').trim().toUpperCase()
  ) {
    throw new ValidationError('Tipo de documento nao compativel com o vinculo do colaborador.');
  }
}

function normalizeDocumentoStatusForWrite(status) {
  const normalized = String(status || 'ENVIADO').trim().toUpperCase();
  if (!DOCUMENTO_STATUS_PERMITIDOS.includes(normalized)) {
    throw new ValidationError('Status do documento invalido para esta operacao.');
  }
  return normalized;
}

async function assertUniqueEmpresaGrupo(data, currentId = null, transaction) {
  if (data.codigo) {
    const existing = await RhEmpresaGrupo.findOne({
      where: {
        codigo: data.codigo,
        ...(currentId ? { id: { [Op.ne]: currentId } } : {})
      },
      attributes: ['id'],
      transaction
    });

    if (existing) {
      throw new ValidationError('Ja existe uma empresa do grupo com este codigo.');
    }
  }

  if (data.cnpj) {
    const existing = await RhEmpresaGrupo.findOne({
      where: {
        cnpj: data.cnpj,
        ...(currentId ? { id: { [Op.ne]: currentId } } : {})
      },
      attributes: ['id'],
      transaction
    });

    if (existing) {
      throw new ValidationError('Ja existe uma empresa do grupo com este CNPJ.');
    }
  }
}

async function assertUniqueColaborador(data, currentId = null, transaction) {
  if (data.cpf) {
    const existing = await RhColaborador.findOne({
      where: {
        cpf: data.cpf,
        ...(currentId ? { id: { [Op.ne]: currentId } } : {})
      },
      attributes: ['id'],
      transaction
    });

    if (existing) {
      throw new ValidationError('Ja existe um colaborador com este CPF.');
    }
  }

  if (data.matricula) {
    const existing = await RhColaborador.findOne({
      where: {
        matricula: data.matricula,
        ...(currentId ? { id: { [Op.ne]: currentId } } : {})
      },
      attributes: ['id'],
      transaction
    });

    if (existing) {
      throw new ValidationError('Ja existe um colaborador com esta matricula.');
    }
  }
}

async function upsertPagamentoColaborador(colaboradorId, pagamento, transaction) {
  if (!pagamento) {
    return null;
  }

  const existing = await RhColaboradorPagamento.findOne({
    where: { colaborador_id: colaboradorId },
    transaction
  });

  const payload = Object.fromEntries(
    Object.entries({
      favorecido_nome: pagamento.favorecido_nome,
      favorecido_documento: pagamento.favorecido_documento,
      banco: pagamento.banco,
      agencia: pagamento.agencia,
      conta: pagamento.conta,
      tipo_conta: pagamento.tipo_conta,
      chave_pix: pagamento.chave_pix,
      observacoes: pagamento.observacoes
    }).filter(([, value]) => value !== undefined)
  );

  if (!existing) {
    if (!Object.keys(payload).length) {
      return null;
    }

    return RhColaboradorPagamento.create(
      {
        colaborador_id: colaboradorId,
        ...payload
      },
      { transaction }
    );
  }

  if (!Object.keys(payload).length) {
    return existing;
  }

  await existing.update(payload, { transaction });
  return existing;
}

async function listarTiposDocumentoRh(filters = {}) {
  let tipoVinculo = filters.tipo_vinculo;

  if (filters.colaborador_id) {
    const colaborador = await RhColaborador.findByPk(filters.colaborador_id, {
      attributes: ['id', 'tipo_vinculo']
    });

    if (!colaborador) {
      throw new ValidationError('Colaborador nao encontrado.', 404);
    }

    tipoVinculo = colaborador.tipo_vinculo;
  }

  const where = {};

  if (filters.ativo !== undefined) {
    where.ativo = filters.ativo;
  }

  if (tipoVinculo) {
    where[Op.or] = [
      { tipo_vinculo: null },
      { tipo_vinculo: tipoVinculo }
    ];
  }

  return RhDocumentoTipo.findAll({
    where,
    order: [
      ['obrigatorio', 'DESC'],
      ['nome', 'ASC']
    ]
  });
}

function buildDocumentoWhere(filters = {}) {
  const whereAnd = [];

  if (!filters.incluir_historico) {
    whereAnd.push({ ativo: true });
  }

  if (filters.colaborador_id) {
    whereAnd.push({ colaborador_id: filters.colaborador_id });
  }

  if (filters.tipo_documento_id) {
    whereAnd.push({ documento_tipo_id: filters.tipo_documento_id });
  }

  if (filters.status) {
    whereAnd.push({ status: filters.status });
  }

  if (filters.empresa_grupo_id) {
    whereAnd.push({ '$colaborador.empresa_grupo_id$': filters.empresa_grupo_id });
  }

  if (filters.obra_id) {
    whereAnd.push({ '$colaborador.obra_id$': filters.obra_id });
  }

  if (filters.tipo_vinculo) {
    whereAnd.push({ '$colaborador.tipo_vinculo$': filters.tipo_vinculo });
  }

  if (filters.validade_status) {
    const hoje = toDateOnlyString(new Date());
    const dataAlerta = new Date();
    dataAlerta.setDate(dataAlerta.getDate() + 30);
    const alerta = toDateOnlyString(dataAlerta);

    if (filters.validade_status === 'SEM_VALIDADE') {
      whereAnd.push({ validade: null });
    }

    if (filters.validade_status === 'VENCIDO') {
      whereAnd.push({ validade: { [Op.lt]: hoje } });
    }

    if (filters.validade_status === 'A_VENCER') {
      whereAnd.push({
        validade: {
          [Op.gte]: hoje,
          [Op.lte]: alerta
        }
      });
    }

    if (filters.validade_status === 'VALIDO') {
      whereAnd.push({ validade: { [Op.gt]: alerta } });
    }
  }

  if (filters.q) {
    const digits = normalizeDigits(filters.q);
    const terms = [
      { nome_original: { [Op.like]: `%${filters.q}%` } },
      { observacoes: { [Op.like]: `%${filters.q}%` } },
      { '$colaborador.nome$': { [Op.like]: `%${filters.q}%` } },
      { '$colaborador.matricula$': { [Op.like]: `%${filters.q}%` } }
    ];

    if (digits) {
      terms.push({ '$colaborador.cpf$': { [Op.like]: `%${digits}%` } });
    }

    whereAnd.push({ [Op.or]: terms });
  }

  return whereAnd.length ? { [Op.and]: whereAnd } : {};
}

async function construirResumoDocumentalColaborador(colaboradorId) {
  const colaborador = await RhColaborador.findByPk(colaboradorId, {
    attributes: ['id', 'nome', 'tipo_vinculo']
  });

  if (!colaborador) {
    throw new ValidationError('Colaborador nao encontrado.', 404);
  }

  const [tipos, documentosAtivos] = await Promise.all([
    listarTiposDocumentoRh({
      colaborador_id: colaborador.id,
      ativo: true
    }),
    RhDocumento.findAll({
      where: {
        colaborador_id: colaborador.id,
        ativo: true
      },
      include: [
        {
          model: RhDocumentoTipo,
          as: 'tipoDocumento',
          attributes: ['id', 'codigo', 'nome', 'tipo_vinculo', 'obrigatorio', 'exige_validade']
        }
      ],
      order: [['createdAt', 'DESC']]
    })
  ]);

  const documentoAtualPorTipo = new Map();
  documentosAtivos.forEach((documento) => {
    if (!documentoAtualPorTipo.has(documento.documento_tipo_id)) {
      documentoAtualPorTipo.set(documento.documento_tipo_id, enrichDocumento(documento));
    }
  });

  const checklist = tipos.map((tipo) => {
    const documento = documentoAtualPorTipo.get(tipo.id) || null;
    const validadeStatus = documento?.validade_status || 'SEM_VALIDADE';

    let situacao = 'PENDENTE';
    if (documento) {
      if (documento.status === 'REJEITADO') {
        situacao = 'REJEITADO';
      } else if (validadeStatus === 'VENCIDO') {
        situacao = 'VENCIDO';
      } else if (validadeStatus === 'A_VENCER') {
        situacao = 'A_VENCER';
      } else {
        situacao = 'OK';
      }
    } else if (!tipo.obrigatorio) {
      situacao = 'OPCIONAL';
    }

    return {
      id: tipo.id,
      codigo: tipo.codigo,
      nome: tipo.nome,
      obrigatorio: Boolean(tipo.obrigatorio),
      exige_validade: Boolean(tipo.exige_validade),
      situacao,
      documento
    };
  });

  return {
    colaborador: {
      id: colaborador.id,
      nome: colaborador.nome,
      tipo_vinculo: colaborador.tipo_vinculo
    },
    total_documentos_anexados: documentosAtivos.length,
    documentos_validos: documentosAtivos.filter((documento) => {
      const enriched = enrichDocumento(documento);
      return enriched.status !== 'REJEITADO' && enriched.validade_status !== 'VENCIDO';
    }).length,
    documentos_vencidos: documentosAtivos.filter((documento) => (
      getValidadeStatus(documento.validade) === 'VENCIDO'
    )).length,
    documentos_a_vencer: documentosAtivos.filter((documento) => (
      getValidadeStatus(documento.validade) === 'A_VENCER'
    )).length,
    obrigatorios_pendentes: checklist.filter((item) => (
      item.obrigatorio && ['PENDENTE', 'REJEITADO', 'VENCIDO'].includes(item.situacao)
    )).length,
    checklist
  };
}

async function listarDocumentosRh(filters = {}) {
  const page = Math.max(Number(filters.page || 1), 1);
  const limit = Math.min(Math.max(Number(filters.limit || 50), 1), 100);
  const offset = (page - 1) * limit;

  const resultado = await RhDocumento.findAndCountAll({
    where: buildDocumentoWhere(filters),
    include: DOCUMENTO_INCLUDE,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true,
    subQuery: false
  });

  const meta = {
    page,
    limit,
    total: Number(resultado.count || 0),
    total_pages: resultado.count ? Math.ceil(Number(resultado.count) / limit) : 0
  };

  if (filters.colaborador_id) {
    meta.resumo_colaborador = await construirResumoDocumentalColaborador(filters.colaborador_id);
  }

  return {
    data: resultado.rows.map(enrichDocumento),
    meta
  };
}

async function listarEmpresasGrupoRh(filters = {}) {
  const where = {};

  if (filters.q) {
    where[Op.or] = [
      { nome: { [Op.like]: `%${filters.q}%` } },
      { razao_social: { [Op.like]: `%${filters.q}%` } },
      { codigo: { [Op.like]: `%${filters.q}%` } },
      { cnpj: { [Op.like]: `%${filters.q}%` } }
    ];
  }

  if (filters.ativo !== undefined) {
    where.ativo = filters.ativo;
  }
  if (filters.tipo_empresa) {
    where.tipo_empresa = normalizeTipoEmpresaGrupo(filters.tipo_empresa);
  }
  if (filters.holding_id) {
    where.holding_id = filters.holding_id;
  }

  return RhEmpresaGrupo.findAll({
    where,
    order: [['tipo_empresa', 'ASC'], ['nome', 'ASC']]
  });
}

async function normalizeEmpresaGrupoHierarchy(data = {}, currentId = null, transaction = null) {
  const payload = { ...data };

  if (payload.tipo_empresa !== undefined) {
    payload.tipo_empresa = normalizeTipoEmpresaGrupo(payload.tipo_empresa);
  }
  if (!payload.tipo_empresa && !currentId) {
    payload.tipo_empresa = TIPO_EMPRESA_OPERACIONAL;
  }

  const tipo = payload.tipo_empresa || TIPO_EMPRESA_OPERACIONAL;
  if (tipo === TIPO_EMPRESA_HOLDING) {
    payload.holding_id = null;
    return payload;
  }

  if (payload.holding_id !== undefined && payload.holding_id !== null) {
    const holdingId = Number(payload.holding_id);
    if (!Number.isInteger(holdingId) || holdingId <= 0) {
      throw new ValidationError('Holding invalida.');
    }
    if (currentId && Number(currentId) === holdingId) {
      throw new ValidationError('Uma empresa nao pode ser holding de si propria.');
    }

    const holding = await RhEmpresaGrupo.findByPk(holdingId, { transaction });
    if (!holding || holding.ativo === false) {
      throw new ValidationError('Holding nao encontrada ou inativa.');
    }
    if (normalizeTipoEmpresaGrupo(holding.tipo_empresa) !== TIPO_EMPRESA_HOLDING) {
      throw new ValidationError('A empresa controladora precisa estar marcada como Holding.');
    }
  }

  return payload;
}

async function criarEmpresaGrupoRh(data, user) {
  return sequelize.transaction(async (transaction) => {
    const normalized = await normalizeEmpresaGrupoHierarchy(data, null, transaction);
    await assertUniqueEmpresaGrupo(normalized, null, transaction);

    const created = await RhEmpresaGrupo.create(
      {
        ...normalized,
        criado_por: user?.id || null,
        atualizado_por: user?.id || null
      },
      { transaction }
    );

    return RhEmpresaGrupo.findByPk(created.id, { transaction });
  });
}

async function atualizarEmpresaGrupoRh(id, data, user) {
  return sequelize.transaction(async (transaction) => {
    const empresa = await RhEmpresaGrupo.findByPk(id, { transaction });
    if (!empresa) {
      throw new ValidationError('Empresa do grupo nao encontrada.', 404);
    }

    const normalized = await normalizeEmpresaGrupoHierarchy(data, empresa.id, transaction);
    await assertUniqueEmpresaGrupo(normalized, empresa.id, transaction);

    await empresa.update(
      {
        ...normalized,
        atualizado_por: user?.id || null
      },
      { transaction }
    );

    return RhEmpresaGrupo.findByPk(empresa.id, { transaction });
  });
}

async function listarColaboradoresRh(filters = {}) {
  const where = {};

  if (filters.q) {
    const digits = normalizeDigits(filters.q);
    const terms = [
      { nome: { [Op.like]: `%${filters.q}%` } },
      { matricula: { [Op.like]: `%${filters.q}%` } }
    ];

    if (digits) {
      terms.push({ cpf: { [Op.like]: `%${digits}%` } });
    }

    where[Op.or] = terms;
  }

  if (filters.empresa_grupo_id) {
    where.empresa_grupo_id = filters.empresa_grupo_id;
  }
  if (filters.obra_id) {
    where.obra_id = filters.obra_id;
  }
  if (filters.setor_id) {
    where.setor_id = filters.setor_id;
  }
  if (filters.tipo_vinculo) {
    where.tipo_vinculo = filters.tipo_vinculo;
  }
  if (filters.status) {
    where.status = filters.status;
  }

  return RhColaborador.findAll({
    where,
    include: COLABORADOR_INCLUDE,
    order: [['nome', 'ASC']]
  });
}

async function detalharColaboradorRh(id) {
  const colaborador = await RhColaborador.findByPk(id, {
    include: COLABORADOR_INCLUDE
  });

  if (!colaborador) {
    throw new ValidationError('Colaborador nao encontrado.', 404);
  }

  return colaborador;
}

async function criarColaboradorRh(data, user) {
  return sequelize.transaction(async (transaction) => {
    await ensureEmpresaGrupoExists(data.empresa_grupo_id, transaction);
    await ensureObraExists(data.obra_id, transaction);
    await ensureSetorExists(data.setor_id, transaction);
    await assertUniqueColaborador(data, null, transaction);

    const created = await RhColaborador.create(
      {
        ...data,
        pagamento: undefined,
        criado_por: user?.id || null,
        atualizado_por: user?.id || null
      },
      { transaction }
    );

    await upsertPagamentoColaborador(created.id, data.pagamento, transaction);

    return RhColaborador.findByPk(created.id, {
      include: COLABORADOR_INCLUDE,
      transaction
    });
  });
}

async function atualizarColaboradorRh(id, data, user) {
  return sequelize.transaction(async (transaction) => {
    const colaborador = await RhColaborador.findByPk(id, { transaction });
    if (!colaborador) {
      throw new ValidationError('Colaborador nao encontrado.', 404);
    }

    if (data.empresa_grupo_id) {
      await ensureEmpresaGrupoExists(data.empresa_grupo_id, transaction);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'obra_id')) {
      await ensureObraExists(data.obra_id, transaction);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'setor_id')) {
      await ensureSetorExists(data.setor_id, transaction);
    }

    await assertUniqueColaborador(data, colaborador.id, transaction);

    const collaboratorPayload = Object.fromEntries(
      Object.entries({
        empresa_grupo_id: data.empresa_grupo_id,
        obra_id: data.obra_id,
        setor_id: data.setor_id,
        nome: data.nome,
        cpf: data.cpf,
        matricula: data.matricula,
        rg: data.rg,
        telefone: data.telefone,
        email: data.email,
        cargo: data.cargo,
        tipo_vinculo: data.tipo_vinculo,
        data_inicio: data.data_inicio,
        data_admissao: data.data_admissao,
        data_nascimento: data.data_nascimento,
        status: data.status,
        salario_base: data.salario_base,
        valor_contratual: data.valor_contratual,
        observacoes: data.observacoes,
        atualizado_por: user?.id || null
      }).filter(([, value]) => value !== undefined)
    );

    await colaborador.update(collaboratorPayload, { transaction });
    await upsertPagamentoColaborador(colaborador.id, data.pagamento, transaction);

    return RhColaborador.findByPk(colaborador.id, {
      include: COLABORADOR_INCLUDE,
      transaction
    });
  });
}

async function detalharDocumentoRh(id) {
  const documento = await RhDocumento.findByPk(id, {
    include: [
      ...DOCUMENTO_INCLUDE,
      {
        model: RhDocumento,
        as: 'substituicoes',
        attributes: ['id', 'nome_original', 'status', 'ativo', 'createdAt']
      }
    ]
  });

  if (!documento) {
    throw new ValidationError('Documento RH/DP nao encontrado.', 404);
  }

  return enrichDocumento(documento);
}

async function criarDocumentoRh(data, file, user) {
  if (!file?.buffer) {
    throw new ValidationError('Arquivo do documento nao enviado.');
  }

  return sequelize.transaction(async (transaction) => {
    const colaborador = await ensureColaboradorExists(data.colaborador_id, transaction);
    const tipoDocumento = await ensureDocumentoTipoExists(data.tipo_documento_id, transaction);
    ensureDocumentoTipoCompativel(colaborador, tipoDocumento);

    const arquivoUrl = await uploadToS3(file, `rh-documentos/${colaborador.id}`);
    const created = await RhDocumento.create(
      {
        colaborador_id: colaborador.id,
        documento_tipo_id: tipoDocumento.id,
        nome_original: normalizeOriginalName(file.originalname),
        arquivo_url: arquivoUrl,
        mimetype: file.mimetype || null,
        tamanho_bytes: file.size || null,
        validade: data.validade,
        status: normalizeDocumentoStatusForWrite(data.status),
        observacoes: data.observacoes,
        criado_por: user?.id || null,
        atualizado_por: user?.id || null
      },
      { transaction }
    );

    return RhDocumento.findByPk(created.id, {
      include: DOCUMENTO_INCLUDE,
      transaction
    });
  });
}

async function atualizarDocumentoRh(id, data, user) {
  return sequelize.transaction(async (transaction) => {
    const documento = await RhDocumento.findByPk(id, {
      transaction,
      include: [
        {
          model: RhColaborador,
          as: 'colaborador',
          attributes: ['id', 'tipo_vinculo']
        }
      ]
    });

    if (!documento) {
      throw new ValidationError('Documento RH/DP nao encontrado.', 404);
    }

    let tipoDocumento = null;
    if (data.tipo_documento_id) {
      tipoDocumento = await ensureDocumentoTipoExists(data.tipo_documento_id, transaction);
      ensureDocumentoTipoCompativel(documento.colaborador, tipoDocumento);
    }

    const payload = Object.fromEntries(
      Object.entries({
        documento_tipo_id: data.tipo_documento_id,
        validade: data.validade,
        status: data.status ? normalizeDocumentoStatusForWrite(data.status) : undefined,
        observacoes: data.observacoes,
        atualizado_por: user?.id || null
      }).filter(([, value]) => value !== undefined)
    );

    await documento.update(payload, { transaction });

    return RhDocumento.findByPk(documento.id, {
      include: DOCUMENTO_INCLUDE,
      transaction
    });
  });
}

async function substituirDocumentoRh(id, data, file, user) {
  if (!file?.buffer) {
    throw new ValidationError('Arquivo do documento nao enviado.');
  }

  return sequelize.transaction(async (transaction) => {
    const documentoAtual = await RhDocumento.findByPk(id, {
      transaction,
      include: [
        {
          model: RhColaborador,
          as: 'colaborador',
          attributes: ['id', 'tipo_vinculo']
        }
      ]
    });

    if (!documentoAtual) {
      throw new ValidationError('Documento RH/DP nao encontrado.', 404);
    }

    const tipoDocumento = data.tipo_documento_id
      ? await ensureDocumentoTipoExists(data.tipo_documento_id, transaction)
      : await ensureDocumentoTipoExists(documentoAtual.documento_tipo_id, transaction);

    ensureDocumentoTipoCompativel(documentoAtual.colaborador, tipoDocumento);

    const arquivoUrl = await uploadToS3(file, `rh-documentos/${documentoAtual.colaborador_id}`);

    await documentoAtual.update(
      {
        status: 'SUBSTITUIDO',
        ativo: false,
        atualizado_por: user?.id || null
      },
      { transaction }
    );

    const novoDocumento = await RhDocumento.create(
      {
        colaborador_id: documentoAtual.colaborador_id,
        documento_tipo_id: tipoDocumento.id,
        documento_anterior_id: documentoAtual.id,
        nome_original: normalizeOriginalName(file.originalname),
        arquivo_url: arquivoUrl,
        mimetype: file.mimetype || null,
        tamanho_bytes: file.size || null,
        validade: data.validade,
        status: normalizeDocumentoStatusForWrite(data.status),
        observacoes: data.observacoes,
        criado_por: user?.id || null,
        atualizado_por: user?.id || null
      },
      { transaction }
    );

    return RhDocumento.findByPk(novoDocumento.id, {
      include: DOCUMENTO_INCLUDE,
      transaction
    });
  });
}

async function obterLinkDocumentoRh(id) {
  const documento = await RhDocumento.findByPk(id, {
    attributes: ['id', 'arquivo_url']
  });

  if (!documento) {
    throw new ValidationError('Documento RH/DP nao encontrado.', 404);
  }

  return {
    url: await getPresignedUrl(documento.arquivo_url, 300)
  };
}

async function importarColaboradoresRh(file, user) {
  const rows = parseSpreadsheetRows(file?.buffer);
  if (!rows.length) {
    throw new ValidationError('A planilha nao contem registros para importar.');
  }

  const empresas = await RhEmpresaGrupo.findAll({
    attributes: ['id', 'codigo', 'nome', 'cnpj']
  });
  const obras = await Obra.findAll({
    attributes: ['id', 'codigo', 'nome']
  });
  const setores = await Setor.findAll({
    attributes: ['id', 'codigo', 'nome']
  });

  const empresaByCodigo = new Map();
  const empresaByNome = new Map();
  const empresaByCnpj = new Map();
  empresas.forEach((empresa) => {
    if (empresa.codigo) empresaByCodigo.set(normalizeToken(empresa.codigo), empresa);
    if (empresa.nome) empresaByNome.set(normalizeToken(empresa.nome), empresa);
    if (empresa.cnpj) empresaByCnpj.set(normalizeDigits(empresa.cnpj), empresa);
  });

  const obraByCodigo = new Map();
  const obraByNome = new Map();
  obras.forEach((obra) => {
    if (obra.codigo) obraByCodigo.set(normalizeToken(obra.codigo), obra);
    if (obra.nome) obraByNome.set(normalizeToken(obra.nome), obra);
  });

  const setorByCodigo = new Map();
  const setorByNome = new Map();
  setores.forEach((setor) => {
    if (setor.codigo) setorByCodigo.set(normalizeToken(setor.codigo), setor);
    if (setor.nome) setorByNome.set(normalizeToken(setor.nome), setor);
  });

  let importados = 0;
  let ignorados = 0;
  const erros = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const linhaPlanilha = index + 2;

    try {
      const cpf = normalizeDigits(pickImportValue(row, ['cpf']));
      const matricula = String(pickImportValue(row, ['matricula']) || '').trim();
      const empresaCodigo = normalizeToken(pickImportValue(row, ['empresa_codigo', 'codigo_empresa']));
      const empresaNome = normalizeToken(pickImportValue(row, ['empresa', 'empresa_nome', 'nome_empresa']));
      const empresaCnpj = normalizeDigits(pickImportValue(row, ['empresa_cnpj', 'cnpj_empresa']));
      const obraCodigo = normalizeToken(pickImportValue(row, ['obra_codigo', 'codigo_obra']));
      const obraNome = normalizeToken(pickImportValue(row, ['obra', 'obra_nome', 'nome_obra']));
      const setorCodigo = normalizeToken(pickImportValue(row, ['setor_codigo', 'codigo_setor']));
      const setorNome = normalizeToken(pickImportValue(row, ['setor', 'setor_nome', 'nome_setor']));

      if (!cpf || cpf.length !== 11) {
        throw new ValidationError('CPF invalido ou ausente.');
      }

      const empresa =
        empresaByCodigo.get(empresaCodigo) ||
        empresaByCnpj.get(empresaCnpj) ||
        empresaByNome.get(empresaNome);

      if (!empresa) {
        throw new ValidationError('Empresa do grupo nao encontrada para a linha.');
      }

      const existing = await RhColaborador.findOne({
        where: {
          [Op.or]: [
            { cpf },
            ...(matricula ? [{ matricula }] : [])
          ]
        },
        attributes: ['id']
      });

      if (existing) {
        ignorados += 1;
        continue;
      }

      const obra =
        obraByCodigo.get(obraCodigo) ||
        obraByNome.get(obraNome) ||
        null;
      const setor =
        setorByCodigo.get(setorCodigo) ||
        setorByNome.get(setorNome) ||
        null;

      const payload = {
        empresa_grupo_id: empresa.id,
        obra_id: obra?.id || undefined,
        setor_id: setor?.id || undefined,
        nome: String(pickImportValue(row, ['nome']) || '').trim(),
        cpf,
        matricula: matricula || undefined,
        rg: String(pickImportValue(row, ['rg']) || '').trim() || undefined,
        telefone: String(pickImportValue(row, ['telefone', 'celular']) || '').trim() || undefined,
        email: String(pickImportValue(row, ['email']) || '').trim() || undefined,
        cargo: String(pickImportValue(row, ['cargo', 'funcao']) || '').trim() || undefined,
        tipo_vinculo: normalizeToken(pickImportValue(row, ['tipo_vinculo', 'vinculo'])) || undefined,
        data_inicio: parseImportDate(pickImportValue(row, ['data_inicio', 'inicio'])) || undefined,
        data_admissao: parseImportDate(pickImportValue(row, ['data_admissao', 'admissao'])) || undefined,
        data_nascimento: parseImportDate(pickImportValue(row, ['data_nascimento', 'nascimento'])) || undefined,
        status: normalizeToken(pickImportValue(row, ['status'])) || 'ATIVO',
        salario_base: parseImportDecimal(pickImportValue(row, ['salario_base', 'salario'])) || undefined,
        valor_contratual: parseImportDecimal(pickImportValue(row, ['valor_contratual', 'valor_contrato'])) || undefined,
        observacoes: String(pickImportValue(row, ['observacoes']) || '').trim() || undefined,
        pagamento: {
          favorecido_nome: String(
            pickImportValue(row, ['favorecido', 'favorecido_nome']) || ''
          ).trim() || undefined,
          favorecido_documento: normalizeDigits(
            pickImportValue(row, ['favorecido_documento', 'documento_favorecido'])
          ) || undefined,
          banco: String(pickImportValue(row, ['banco']) || '').trim() || undefined,
          agencia: String(pickImportValue(row, ['agencia']) || '').trim() || undefined,
          conta: String(pickImportValue(row, ['conta']) || '').trim() || undefined,
          tipo_conta: String(pickImportValue(row, ['tipo_conta']) || '').trim() || undefined,
          chave_pix: String(pickImportValue(row, ['chave_pix', 'pix']) || '').trim() || undefined,
          observacoes: String(
            pickImportValue(row, ['pagamento_observacoes', 'observacoes_pagamento']) || ''
          ).trim() || undefined
        }
      };

      if (!payload.nome) {
        throw new ValidationError('Nome do colaborador nao informado.');
      }
      if (!['CLT', 'NAO_CLT'].includes(payload.tipo_vinculo)) {
        throw new ValidationError('Tipo de vinculo invalido.');
      }
      if (!['ATIVO', 'INATIVO', 'AFASTADO'].includes(payload.status)) {
        throw new ValidationError('Status invalido.');
      }

      await criarColaboradorRh(payload, user);
      importados += 1;
    } catch (error) {
      erros.push({
        linha: linhaPlanilha,
        error: error?.message || 'Erro ao processar linha'
      });
    }
  }

  return {
    importados,
    ignorados,
    erros
  };
}

module.exports = {
  atualizarColaboradorRh,
  atualizarDocumentoRh,
  atualizarEmpresaGrupoRh,
  construirResumoDocumentalColaborador,
  criarColaboradorRh,
  criarDocumentoRh,
  criarEmpresaGrupoRh,
  detalharColaboradorRh,
  detalharDocumentoRh,
  importarColaboradoresRh,
  listarColaboradoresRh,
  listarDocumentosRh,
  listarEmpresasGrupoRh,
  listarTiposDocumentoRh,
  obterLinkDocumentoRh,
  substituirDocumentoRh
};
