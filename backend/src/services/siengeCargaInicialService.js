const { Op } = require('sequelize');
const {
  CategoriaFinanceira,
  EmpresaGrupo,
  IntegracaoSiengeMapeamento,
  Obra,
  Parceiro,
  TituloFinanceiro,
  sequelize
} = require('../models');

const ENTIDADE_MAPEAMENTO_PARCEIRO = 'PARCEIRO';
const ENTIDADE_MAPEAMENTO_TITULO = 'TITULO_FINANCEIRO';
const MAX_LINHAS_CARGA_INICIAL = 10000;

const MODELO_CSV_HEADERS = [
  'tipo',
  'identificador_externo',
  'external_creditor_id',
  'cpf_cnpj',
  'nome',
  'telefone',
  'email',
  'valor',
  'data_vencimento',
  'data_emissao',
  'competencia_data',
  'numero_documento',
  'descricao',
  'obra_id',
  'obra_codigo',
  'categoria_id',
  'categoria_nome',
  'empresa_contraparte_id',
  'empresa_contraparte_codigo',
  'intercompany',
  'considera_dre',
  'observacoes'
];

function criarErro(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeText(value) {
  const text = String(value ?? '').trim();
  return text || '';
}

function normalizeCpfCnpj(value) {
  return String(value || '').replace(/\D/g, '');
}

function onlyDigitsRepeated(value) {
  return /^(\d)\1+$/.test(value);
}

function isValidCpf(value) {
  const cpf = normalizeCpfCnpj(value);
  if (cpf.length !== 11 || onlyDigitsRepeated(cpf)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  return digit === Number(cpf[10]);
}

function isValidCnpj(value) {
  const cnpj = normalizeCpfCnpj(value);
  if (cnpj.length !== 14 || onlyDigitsRepeated(cnpj)) return false;

  const calc = (factors) => {
    const sum = factors.reduce((acc, factor, index) => acc + Number(cnpj[index]) * factor, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[12])
    && calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[13]);
}

function isValidCpfCnpj(value) {
  const documento = normalizeCpfCnpj(value);
  if (documento.length === 11) return isValidCpf(documento);
  if (documento.length === 14) return isValidCnpj(documento);
  return false;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'sim', 's', 'yes'].includes(String(value).trim().toLowerCase());
}

function parseDecimal(value, fieldName) {
  const text = normalizeText(value);
  if (!text) {
    throw criarErro(`${fieldName} e obrigatorio.`);
  }

  const sanitized = text.replace(/[R$\s]/gi, '');
  const normalized = sanitized.includes(',')
    ? sanitized.replace(/\./g, '').replace(',', '.')
    : sanitized;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw criarErro(`${fieldName} invalido.`);
  }

  return Number(parsed.toFixed(2));
}

function parseDateOnly(value, fieldName, { required = true } = {}) {
  const text = normalizeText(value);
  if (!text) {
    if (required) {
      throw criarErro(`${fieldName} e obrigatorio.`);
    }
    return null;
  }

  let normalized = text;
  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    normalized = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw criarErro(`${fieldName} deve estar em YYYY-MM-DD ou DD/MM/YYYY.`);
  }

  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw criarErro(`${fieldName} invalido.`);
  }

  return normalized;
}

function parseInteger(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function detectDelimiter(headerLine) {
  const candidates = [';', ',', '\t'];
  return candidates
    .map((delimiter) => ({
      delimiter,
      count: String(headerLine || '').split(delimiter).length
    }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(buffer) {
  const raw = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer || '');
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter((line) => String(line || '').trim() !== '');

  if (lines.length < 2) {
    throw criarErro('O arquivo CSV precisa ter cabecalho e pelo menos uma linha de dados.');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);
    return headers.reduce((acc, header, headerIndex) => {
      if (header) {
        acc[header] = values[headerIndex] ?? '';
      }
      return acc;
    }, { _linha: index + 2 });
  });

  if (rows.length > MAX_LINHAS_CARGA_INICIAL) {
    throw criarErro(`A carga inicial aceita no maximo ${MAX_LINHAS_CARGA_INICIAL} linhas por arquivo.`);
  }

  return rows;
}

function getRowValue(row, aliases) {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (Object.prototype.hasOwnProperty.call(row, key) && normalizeText(row[key])) {
      return normalizeText(row[key]);
    }
  }
  return '';
}

function normalizeTipo(value) {
  const text = normalizeText(value).toUpperCase();
  if (['PAGAR', 'CONTAS_A_PAGAR', 'CP', 'A_PAGAR'].includes(text)) return 'PAGAR';
  if (['RECEBER', 'CONTAS_A_RECEBER', 'CR', 'A_RECEBER'].includes(text)) return 'RECEBER';
  throw criarErro('Tipo deve ser PAGAR ou RECEBER.');
}

async function resolverObra(row, transaction) {
  const obraId = parseInteger(getRowValue(row, ['obra_id', 'centro_custo_id']));
  const obraCodigo = getRowValue(row, ['obra_codigo', 'centro_custo_codigo', 'codigo_obra']);

  if (obraId) {
    const obra = await Obra.findByPk(obraId, { transaction });
    if (!obra) {
      throw criarErro(`Obra/Centro de custo id ${obraId} nao encontrado.`);
    }
    if (!obra.empresa_grupo_id) {
      throw criarErro(`Obra/Centro de custo ${obra.nome} nao esta vinculado a uma empresa do grupo.`);
    }
    return obra;
  }

  if (!obraCodigo) {
    throw criarErro('Informe obra_id ou obra_codigo para cada titulo.');
  }

  const obras = await Obra.findAll({
    where: { codigo: obraCodigo, ativo: true },
    transaction
  });

  if (!obras.length) {
    throw criarErro(`Obra/Centro de custo codigo ${obraCodigo} nao encontrado.`);
  }
  if (obras.length > 1) {
    throw criarErro(`Codigo ${obraCodigo} encontrado em mais de uma obra/centro. Use obra_id no CSV.`);
  }
  if (!obras[0].empresa_grupo_id) {
    throw criarErro(`Obra/Centro de custo ${obras[0].nome} nao esta vinculado a uma empresa do grupo.`);
  }

  return obras[0];
}

async function resolverCategoria(row, tipo, transaction) {
  const categoriaId = parseInteger(getRowValue(row, ['categoria_id', 'plano_financeiro_id']));
  const categoriaNome = getRowValue(row, ['categoria_nome', 'plano_financeiro', 'categoria']);

  if (categoriaId) {
    const categoria = await CategoriaFinanceira.findByPk(categoriaId, { transaction });
    if (!categoria || categoria.ativo === false) {
      throw criarErro(`Categoria financeira id ${categoriaId} nao encontrada ou inativa.`);
    }
    if (!['AMBOS', tipo].includes(String(categoria.tipo || '').toUpperCase())) {
      throw criarErro(`Categoria financeira "${categoria.nome}" nao e compativel com titulo ${tipo}.`);
    }
    return categoria;
  }

  if (!categoriaNome) return null;

  const categorias = await CategoriaFinanceira.findAll({
    where: {
      nome: categoriaNome,
      ativo: true,
      tipo: { [Op.in]: ['AMBOS', tipo] }
    },
    transaction
  });

  if (!categorias.length) {
    throw criarErro(`Categoria financeira "${categoriaNome}" nao encontrada para ${tipo}.`);
  }
  if (categorias.length > 1) {
    throw criarErro(`Categoria financeira "${categoriaNome}" encontrada mais de uma vez. Use categoria_id no CSV.`);
  }

  return categorias[0];
}

function validarClassificacaoDreImportacao({ categoria, competenciaData, consideraDre, linha }) {
  if (!consideraDre) return;

  const referenciaLinha = linha ? ` na linha ${linha}` : '';
  if (!competenciaData) {
    throw criarErro(`Competencia DRE e obrigatoria para titulo considerado na DRE${referenciaLinha}.`);
  }
  if (!categoria) {
    throw criarErro(`Categoria financeira e obrigatoria para titulo considerado na DRE${referenciaLinha}.`);
  }
  if (categoria.considera_dre === false) {
    throw criarErro(`Categoria financeira "${categoria.nome}" esta marcada para nao considerar na DRE.`);
  }
  if (!normalizeText(categoria.dre_grupo)) {
    throw criarErro(`Categoria financeira "${categoria.nome}" nao possui grupo DRE classificado.`);
  }
}

async function resolverEmpresaContraparte(row, transaction) {
  const empresaId = parseInteger(getRowValue(row, ['empresa_contraparte_id']));
  const empresaCodigo = getRowValue(row, ['empresa_contraparte_codigo', 'codigo_empresa_contraparte']);

  if (empresaId) {
    const empresa = await EmpresaGrupo.findByPk(empresaId, { transaction });
    if (!empresa || empresa.ativo === false) {
      throw criarErro(`Empresa contraparte id ${empresaId} nao encontrada ou inativa.`);
    }
    return empresa;
  }

  if (!empresaCodigo) return null;

  const empresas = await EmpresaGrupo.findAll({
    where: { codigo: empresaCodigo, ativo: true },
    transaction
  });

  if (!empresas.length) {
    throw criarErro(`Empresa contraparte codigo ${empresaCodigo} nao encontrada.`);
  }
  if (empresas.length > 1) {
    throw criarErro(`Codigo ${empresaCodigo} encontrado em mais de uma empresa. Use empresa_contraparte_id no CSV.`);
  }

  return empresas[0];
}

async function upsertParceiro(row, tipo, transaction) {
  const cpfCnpj = normalizeCpfCnpj(getRowValue(row, ['cpf_cnpj', 'cnpj_cpf', 'documento']));
  const nome = getRowValue(row, ['nome', 'razao_social', 'credor', 'cliente', 'fornecedor']);

  if (!cpfCnpj || !isValidCpfCnpj(cpfCnpj)) {
    throw criarErro('CPF/CNPJ do parceiro invalido.');
  }
  if (!nome) {
    throw criarErro('Nome do parceiro e obrigatorio.');
  }

  const payload = {
    cpf_cnpj: cpfCnpj,
    nome: nome.slice(0, 255),
    telefone: getRowValue(row, ['telefone', 'fone']).slice(0, 50) || null,
    email: getRowValue(row, ['email']).slice(0, 255) || null,
    tipo_pessoa: cpfCnpj.length === 11 ? 'F' : 'J',
    cliente: tipo === 'RECEBER' || parseBoolean(getRowValue(row, ['cliente']), false),
    fornecedor: tipo === 'PAGAR' || parseBoolean(getRowValue(row, ['fornecedor']), false),
    ativo: true
  };

  const parceiro = await Parceiro.findOne({
    where: { cpf_cnpj: cpfCnpj },
    transaction
  });

  if (!parceiro) {
    const criado = await Parceiro.create(payload, { transaction });
    return { parceiro: criado, criado: true, atualizado: false };
  }

  const updates = {
    cliente: parceiro.cliente || payload.cliente,
    fornecedor: parceiro.fornecedor || payload.fornecedor,
    ativo: true
  };

  ['nome', 'telefone', 'email', 'tipo_pessoa'].forEach((field) => {
    if (payload[field] && !normalizeText(parceiro[field])) {
      updates[field] = payload[field];
    }
  });

  await parceiro.update(updates, { transaction });
  return { parceiro, criado: false, atualizado: true };
}

async function upsertMapeamento({ entidadeTipo, entidadeId, externalId, metadata, userId, transaction }) {
  if (!externalId) return null;

  const existente = await IntegracaoSiengeMapeamento.findOne({
    where: {
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId
    },
    transaction
  });

  const payload = {
    external_id: externalId,
    metadata_json: metadata || null,
    ativo: true,
    atualizado_por: userId || null
  };

  if (existente) {
    await existente.update(payload, { transaction });
    return existente;
  }

  return IntegracaoSiengeMapeamento.create({
    entidade_tipo: entidadeTipo,
    entidade_id: entidadeId,
    ...payload,
    criado_por: userId || null
  }, { transaction });
}

async function localizarTituloExistente({
  identificadorExterno,
  tipo,
  parceiroId,
  obraId,
  numeroDocumento,
  dataVencimento,
  valorOriginal,
  transaction
}) {
  if (identificadorExterno) {
    const porExterno = await TituloFinanceiro.findOne({
      where: { identificador_externo: identificadorExterno },
      transaction
    });
    if (porExterno) return porExterno;
  }

  if (!numeroDocumento) return null;

  return TituloFinanceiro.findOne({
    where: {
      tipo,
      parceiro_id: parceiroId,
      obra_id: obraId,
      numero_documento: numeroDocumento,
      data_vencimento: dataVencimento,
      valor_original: valorOriginal
    },
    transaction
  });
}

async function processarLinha(row, user) {
  return sequelize.transaction(async (transaction) => {
    const tipo = normalizeTipo(getRowValue(row, ['tipo', 'tipo_titulo']));
    const valorOriginal = parseDecimal(getRowValue(row, ['valor', 'valor_original', 'valor_saldo']), 'Valor');
    const dataVencimento = parseDateOnly(getRowValue(row, ['data_vencimento', 'vencimento']), 'Data de vencimento');
    const dataEmissao = parseDateOnly(getRowValue(row, ['data_emissao', 'emissao']), 'Data de emissao', { required: false });
    const competenciaData = parseDateOnly(getRowValue(row, ['competencia_data', 'competencia']), 'Competencia DRE', { required: false });
    const identificadorExterno = getRowValue(row, ['identificador_externo', 'titulo_sienge_id', 'bill_id', 'id_sienge']).slice(0, 120);
    const externalCreditorId = getRowValue(row, ['external_creditor_id', 'creditor_id', 'credor_sienge_id']).slice(0, 120);
    const numeroDocumento = getRowValue(row, ['numero_documento', 'documento', 'numero_nota']).slice(0, 120) || null;
    const descricao =
      getRowValue(row, ['descricao', 'historico'])
      || `${tipo === 'PAGAR' ? 'Conta a pagar' : 'Conta a receber'} importada do SIENGE`;
    const observacoes = getRowValue(row, ['observacoes', 'observacao']);
    const consideraDre = parseBoolean(getRowValue(row, ['considera_dre']), true);
    const intercompany = parseBoolean(getRowValue(row, ['intercompany']), false);

    const obra = await resolverObra(row, transaction);
    const categoria = await resolverCategoria(row, tipo, transaction);
    const empresaContraparte = await resolverEmpresaContraparte(row, transaction);
    if (intercompany && !empresaContraparte) {
      throw criarErro(`Empresa contraparte e obrigatoria para titulo intercompany na linha ${row._linha}.`);
    }
    validarClassificacaoDreImportacao({
      categoria,
      competenciaData,
      consideraDre,
      linha: row._linha
    });
    const parceiroResult = await upsertParceiro(row, tipo, transaction);
    const tituloExistente = await localizarTituloExistente({
      identificadorExterno,
      tipo,
      parceiroId: parceiroResult.parceiro.id,
      obraId: obra.id,
      numeroDocumento,
      dataVencimento,
      valorOriginal,
      transaction
    });

    const tituloPayload = {
      obra_id: obra.id,
      empresa_id: obra.empresa_grupo_id,
      parceiro_id: parceiroResult.parceiro.id,
      categoria_financeira_id: categoria?.id || null,
      empresa_contraparte_id: empresaContraparte?.id || null,
      origem_titulo: 'SIENGE_IMPORT',
      tipo,
      status: 'ABERTO',
      descricao: descricao.slice(0, 255),
      numero_documento: numeroDocumento,
      identificador_externo: identificadorExterno || null,
      valor_original: valorOriginal,
      valor_saldo: valorOriginal,
      valor_baixado: 0,
      data_emissao: dataEmissao,
      data_vencimento: dataVencimento,
      competencia_data: competenciaData,
      considera_dre: consideraDre,
      intercompany,
      observacoes: observacoes || null,
      atualizado_por: user?.id || null
    };

    let titulo;
    let acaoTitulo;
    if (tituloExistente) {
      if (String(tituloExistente.status || '').toUpperCase() !== 'ABERTO') {
        throw criarErro(`Titulo ${tituloExistente.codigo || tituloExistente.id} ja existe com status ${tituloExistente.status}.`);
      }

      await tituloExistente.update({
        ...tituloPayload,
        valor_baixado: 0,
        status: 'ABERTO'
      }, { transaction });
      titulo = tituloExistente;
      acaoTitulo = 'ATUALIZADO';
    } else {
      titulo = await TituloFinanceiro.create({
        ...tituloPayload,
        criado_por: user?.id || null
      }, { transaction });
      acaoTitulo = 'CRIADO';
    }

    await upsertMapeamento({
      entidadeTipo: ENTIDADE_MAPEAMENTO_PARCEIRO,
      entidadeId: parceiroResult.parceiro.id,
      externalId: externalCreditorId,
      metadata: { origem: 'CARGA_INICIAL_SIENGE' },
      userId: user?.id || null,
      transaction
    });

    await upsertMapeamento({
      entidadeTipo: ENTIDADE_MAPEAMENTO_TITULO,
      entidadeId: titulo.id,
      externalId: identificadorExterno,
      metadata: {
        origem: 'CARGA_INICIAL_SIENGE',
        numero_documento: numeroDocumento,
        tipo
      },
      userId: user?.id || null,
      transaction
    });

    return {
      linha: row._linha,
      acao_titulo: acaoTitulo,
      titulo_id: titulo.id,
      codigo: titulo.codigo,
      parceiro_id: parceiroResult.parceiro.id,
      parceiro_criado: parceiroResult.criado,
      parceiro_atualizado: parceiroResult.atualizado,
      obra_id: obra.id,
      empresa_id: obra.empresa_grupo_id
    };
  });
}

async function importarCargaInicialSienge({ file, user }) {
  if (!file?.buffer) {
    throw criarErro('Envie um arquivo CSV para importar.');
  }

  const filename = String(file.originalname || '').toLowerCase();
  if (!filename.endsWith('.csv') && !['text/csv', 'application/vnd.ms-excel'].includes(file.mimetype)) {
    throw criarErro('A carga inicial aceita arquivo CSV.');
  }

  const rows = parseCsv(file.buffer);
  const resultado = {
    arquivo: file.originalname || 'carga-inicial.csv',
    total_linhas: rows.length,
    titulos_criados: 0,
    titulos_atualizados: 0,
    parceiros_criados: 0,
    parceiros_atualizados: 0,
    erros: [],
    itens: []
  };

  for (const row of rows) {
    try {
      const item = await processarLinha(row, user);
      resultado.itens.push(item);
      if (item.acao_titulo === 'CRIADO') resultado.titulos_criados += 1;
      if (item.acao_titulo === 'ATUALIZADO') resultado.titulos_atualizados += 1;
      if (item.parceiro_criado) resultado.parceiros_criados += 1;
      if (item.parceiro_atualizado) resultado.parceiros_atualizados += 1;
    } catch (error) {
      resultado.erros.push({
        linha: row._linha,
        identificador_externo: getRowValue(row, ['identificador_externo', 'titulo_sienge_id', 'bill_id', 'id_sienge']) || null,
        documento: getRowValue(row, ['numero_documento', 'documento', 'numero_nota']) || null,
        parceiro: getRowValue(row, ['nome', 'razao_social', 'credor', 'cliente', 'fornecedor']) || null,
        motivo: error?.message || 'Erro ao processar linha.'
      });
    }
  }

  resultado.processados = resultado.titulos_criados + resultado.titulos_atualizados;
  resultado.sucesso = resultado.erros.length === 0;

  return resultado;
}

function gerarModeloCargaInicialSiengeCsv() {
  const exemplo = [
    'PAGAR',
    'SIENGE-CP-123',
    '98765',
    '12345678000195',
    'Fornecedor Exemplo LTDA',
    '27999990000',
    'financeiro@fornecedor.com.br',
    '1250,90',
    '30/06/2026',
    '01/06/2026',
    '01/06/2026',
    'NF 123',
    'Material importado do SIENGE',
    '',
    'OBRA-001',
    '',
    'Materiais',
    '',
    '',
    'nao',
    'sim',
    'Carga inicial dos titulos em aberto'
  ];

  return `\uFEFF${MODELO_CSV_HEADERS.join(';')}\n${exemplo.join(';')}\n`;
}

module.exports = {
  gerarModeloCargaInicialSiengeCsv,
  importarCargaInicialSienge
};
