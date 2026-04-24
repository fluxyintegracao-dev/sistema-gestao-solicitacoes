const { Op } = require('sequelize');
const { Parceiro, ParceiroCategoria } = require('../models');

function normalizarCpfCnpj(value) {
  return String(value || '').replace(/\D/g, '');
}

function inferirTipoPessoa(cpfCnpj, tipoPessoaInformado) {
  const tipoInformado = String(tipoPessoaInformado || '')
    .trim()
    .toUpperCase();

  if (tipoInformado === 'F' || tipoInformado === 'J') {
    return tipoInformado;
  }

  if (cpfCnpj.length === 11) return 'F';
  if (cpfCnpj.length === 14) return 'J';
  return '';
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'sim', 'yes'].includes(String(value).trim().toLowerCase());
}

function sanitizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function normalizeParceiroPayload(payload = {}, { partial = false } = {}) {
  const cpfCnpj = normalizarCpfCnpj(payload.cpf_cnpj);
  const nome = String(payload.nome || '').trim();
  const telefone = String(payload.telefone || '').trim();
  let cliente = partial
    ? (payload.cliente !== undefined ? parseBoolean(payload.cliente, false) : undefined)
    : parseBoolean(payload.cliente, false);
  let fornecedor = partial
    ? (payload.fornecedor !== undefined ? parseBoolean(payload.fornecedor, false) : undefined)
    : parseBoolean(payload.fornecedor, false);
  let corretor = partial
    ? (payload.corretor !== undefined ? parseBoolean(payload.corretor, false) : undefined)
    : parseBoolean(payload.corretor, false);

  if (!partial && !cliente && !fornecedor && !corretor) {
    cliente = true;
    fornecedor = true;
  }

  const tipoPessoa = inferirTipoPessoa(cpfCnpj, payload.tipo_pessoa);

  if (!partial) {
    if (!cpfCnpj || ![11, 14].includes(cpfCnpj.length)) {
      throw new Error('Informe um CPF/CNPJ valido.');
    }
    if (!nome) {
      throw new Error('Informe o nome do parceiro.');
    }
    if (!telefone) {
      throw new Error('Informe o telefone do parceiro.');
    }
    if (!tipoPessoa) {
      throw new Error('Nao foi possivel identificar o tipo de pessoa.');
    }
  }

  const data = {
    cpf_cnpj: cpfCnpj || undefined,
    nome: nome || undefined,
    telefone: telefone || undefined,
    email: partial
      ? (payload.email !== undefined ? sanitizeText(payload.email) : undefined)
      : sanitizeText(payload.email),
    endereco: partial
      ? (payload.endereco !== undefined ? sanitizeText(payload.endereco) : undefined)
      : sanitizeText(payload.endereco),
    numero: partial
      ? (payload.numero !== undefined ? sanitizeText(payload.numero) : undefined)
      : sanitizeText(payload.numero),
    bairro: partial
      ? (payload.bairro !== undefined ? sanitizeText(payload.bairro) : undefined)
      : sanitizeText(payload.bairro),
    cep: partial
      ? (payload.cep !== undefined ? sanitizeText(payload.cep) : undefined)
      : sanitizeText(payload.cep),
    municipio: partial
      ? (payload.municipio !== undefined ? sanitizeText(payload.municipio) : undefined)
      : sanitizeText(payload.municipio),
    estado: partial
      ? (payload.estado !== undefined ? (sanitizeText(payload.estado)?.toUpperCase() || null) : undefined)
      : (sanitizeText(payload.estado)?.toUpperCase() || null),
    tipo_pessoa: tipoPessoa || undefined,
    cliente,
    fornecedor,
    corretor,
    ativo: partial
      ? (payload.ativo !== undefined ? parseBoolean(payload.ativo, true) : undefined)
      : (payload.ativo === undefined ? true : parseBoolean(payload.ativo, true))
  };

  if (!partial) {
    return data;
  }

  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
}

function parseCategoriaIds(value) {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
  return Array.from(new Set(ids));
}

async function validarCategorias(categoriaIds = []) {
  if (!categoriaIds.length) return;
  const categorias = await ParceiroCategoria.findAll({
    where: {
      id: categoriaIds,
      ativo: true
    }
  });

  if (categorias.length !== categoriaIds.length) {
    throw new Error('Categoria de parceiro invalida.');
  }
}

async function ensureParceiroUnico(cpfCnpj, parceiroId = null) {
  const existente = await Parceiro.findOne({
    where: {
      cpf_cnpj: cpfCnpj,
      ...(parceiroId ? { id: { [Op.ne]: parceiroId } } : {})
    }
  });

  if (existente) {
    throw new Error('Ja existe um parceiro com este CPF/CNPJ.');
  }
}

async function buscarParceiros({
  q = '',
  nome = '',
  cpf_cnpj = '',
  fornecedor,
  cliente,
  corretor,
  categoria_id,
  incluir_categorias = '0',
  ativo = '1',
  limit = 10
} = {}) {
  const where = {};
  const filtros = [];
  const termoBusca = String(q || '').trim();
  const documento = normalizarCpfCnpj(cpf_cnpj || termoBusca);
  const termoNome = String(nome || termoBusca).trim();
  const categoriaId = Number(categoria_id) || null;

  if (String(ativo || '1').trim() !== '0') {
    where.ativo = true;
  }

  if (fornecedor !== undefined && fornecedor !== null && fornecedor !== '') {
    where.fornecedor = parseBoolean(fornecedor, true);
  }

  if (cliente !== undefined && cliente !== null && cliente !== '') {
    where.cliente = parseBoolean(cliente, true);
  }

  if (corretor !== undefined && corretor !== null && corretor !== '') {
    where.corretor = parseBoolean(corretor, true);
  }

  if (termoNome || documento) {
    const or = [];

    if (termoNome) {
      or.push({
        nome: {
          [Op.like]: `%${termoNome}%`
        }
      });
    }

    if (documento) {
      or.push({
        cpf_cnpj: {
          [Op.like]: `%${documento}%`
        }
      });
    }

    filtros.push({ [Op.or]: or });
  }

  if (filtros.length > 0) {
    where[Op.and] = filtros;
  }

  const include = [];

  if (categoriaId) {
    include.push({
      model: ParceiroCategoria,
      as: 'categorias',
      through: { attributes: [] },
      where: { id: categoriaId, ativo: true },
      required: true
    });
  } else if (String(incluir_categorias || '0').trim() === '1') {
    include.push({
      model: ParceiroCategoria,
      as: 'categorias',
      through: { attributes: [] },
      where: { ativo: true },
      required: false
    });
  }

  return Parceiro.findAll({
    where,
    include,
    order: [['nome', 'ASC']],
    limit: Math.min(Math.max(Number(limit) || 10, 1), 200),
    distinct: true
  });
}

async function criarParceiro(payload) {
  const categoriaIds = parseCategoriaIds(payload?.categoria_ids);
  const data = normalizeParceiroPayload(payload);
  await ensureParceiroUnico(data.cpf_cnpj);
  await validarCategorias(categoriaIds);
  const parceiro = await Parceiro.create(data);

  if (categoriaIds.length) {
    await parceiro.setCategorias(categoriaIds);
  }

  return parceiro;
}

async function atualizarParceiro(id, payload) {
  const parceiro = await Parceiro.findByPk(id);
  if (!parceiro) {
    throw new Error('Parceiro nao encontrado.');
  }

  const data = normalizeParceiroPayload(payload, { partial: true });
  const hasCategorias = Object.prototype.hasOwnProperty.call(payload || {}, 'categoria_ids');
  const categoriaIds = parseCategoriaIds(payload?.categoria_ids);

  if (data.cpf_cnpj) {
    if (![11, 14].includes(String(data.cpf_cnpj).length)) {
      throw new Error('Informe um CPF/CNPJ valido.');
    }
    await ensureParceiroUnico(data.cpf_cnpj, parceiro.id);
    data.tipo_pessoa = inferirTipoPessoa(data.cpf_cnpj, payload.tipo_pessoa);
  }

  const clienteResolvido = data.cliente !== undefined ? data.cliente : parceiro.cliente;
  const fornecedorResolvido = data.fornecedor !== undefined ? data.fornecedor : parceiro.fornecedor;
  const corretorResolvido = data.corretor !== undefined ? data.corretor : parceiro.corretor;

  if (clienteResolvido === false && fornecedorResolvido === false && corretorResolvido === false) {
    data.cliente = true;
    data.fornecedor = true;
  }

  await parceiro.update(data);

  if (hasCategorias) {
    await validarCategorias(categoriaIds);
    await parceiro.setCategorias(categoriaIds);
  }

  return parceiro;
}

module.exports = {
  atualizarParceiro,
  buscarParceiros,
  criarParceiro,
  normalizarCpfCnpj
};
