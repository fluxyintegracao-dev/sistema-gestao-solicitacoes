const { ConfiguracaoSistema } = require('../models');

const CHAVE_STATUS_PEDIDOS_COMPRA = 'STATUS_PEDIDOS_COMPRA';

const DEFAULT_STATUS_PEDIDOS_COMPRA = [
  {
    codigo: 'ABERTO',
    nome: 'Aberto',
    cor: '#2563eb',
    bloqueia_edicao: false,
    ativo: true
  },
  {
    codigo: 'EM_ANALISE',
    nome: 'Em analise interna',
    cor: '#f59e0b',
    bloqueia_edicao: false,
    ativo: true
  },
  {
    codigo: 'ENVIADO_FORNECEDOR',
    nome: 'Enviado ao fornecedor',
    cor: '#0ea5e9',
    bloqueia_edicao: false,
    ativo: true
  },
  {
    codigo: 'NEGOCIACAO',
    nome: 'Em negociacao',
    cor: '#8b5cf6',
    bloqueia_edicao: false,
    ativo: true
  },
  {
    codigo: 'FECHADO_FORNECEDOR',
    nome: 'Fechado com o fornecedor',
    cor: '#16a34a',
    bloqueia_edicao: true,
    ativo: true
  },
  {
    codigo: 'CANCELADO',
    nome: 'Cancelado',
    cor: '#dc2626',
    bloqueia_edicao: true,
    ativo: true
  }
];

function normalizeStatusCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function normalizeStatusName(value, fallbackCode) {
  const raw = String(value || '').trim();
  if (raw) {
    return raw.slice(0, 120);
  }

  return String(fallbackCode || '')
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0) + token.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 120);
}

function normalizeStatusColor(value, fallback = '#64748b') {
  const raw = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

function normalizeStatusEntry(entry = {}, fallback = null) {
  const fallbackCode = fallback?.codigo || 'STATUS';
  const codigo = normalizeStatusCode(entry.codigo || fallbackCode) || fallbackCode;
  return {
    codigo,
    nome: normalizeStatusName(entry.nome, codigo),
    cor: normalizeStatusColor(entry.cor, fallback?.cor),
    bloqueia_edicao: entry.bloqueia_edicao === undefined
      ? Boolean(fallback?.bloqueia_edicao)
      : Boolean(entry.bloqueia_edicao),
    ativo: entry.ativo === undefined ? (fallback?.ativo !== false) : Boolean(entry.ativo)
  };
}

function normalizePedidoCompraStatusList(value) {
  const input = Array.isArray(value) ? value : [];
  const fallbackMap = new Map(
    DEFAULT_STATUS_PEDIDOS_COMPRA.map((item) => [item.codigo, item])
  );
  const normalized = [];
  const seen = new Set();

  input.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return;
    }

    const codigo = normalizeStatusCode(entry.codigo);
    if (!codigo || seen.has(codigo)) {
      return;
    }

    seen.add(codigo);
    normalized.push(normalizeStatusEntry(entry, fallbackMap.get(codigo) || null));
  });

  for (const fallback of DEFAULT_STATUS_PEDIDOS_COMPRA) {
    if (seen.has(fallback.codigo)) {
      continue;
    }

    const entry = normalizeStatusEntry(fallback, fallback);
    if (fallback.codigo === 'ABERTO') {
      normalized.unshift(entry);
    } else {
      normalized.push(entry);
    }
    seen.add(fallback.codigo);
  }

  if (!normalized.length) {
    return DEFAULT_STATUS_PEDIDOS_COMPRA.map((item) => ({ ...item }));
  }

  return normalized;
}

async function getPedidoCompraStatusConfig() {
  const record = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_STATUS_PEDIDOS_COMPRA },
    order: [['id', 'DESC']]
  });

  if (!record?.valor) {
    return DEFAULT_STATUS_PEDIDOS_COMPRA.map((item) => ({ ...item }));
  }

  try {
    const parsed = JSON.parse(record.valor);
    return normalizePedidoCompraStatusList(parsed?.statuses || parsed);
  } catch {
    return DEFAULT_STATUS_PEDIDOS_COMPRA.map((item) => ({ ...item }));
  }
}

async function savePedidoCompraStatusConfig(statuses = []) {
  const normalized = normalizePedidoCompraStatusList(statuses);
  const valor = JSON.stringify({ statuses: normalized });

  const record = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_STATUS_PEDIDOS_COMPRA },
    order: [['id', 'DESC']]
  });

  if (record) {
    await record.update({ valor });
  } else {
    await ConfiguracaoSistema.create({
      chave: CHAVE_STATUS_PEDIDOS_COMPRA,
      valor
    });
  }

  return normalized;
}

async function findPedidoCompraStatusConfig(statusCode, list = null) {
  const normalizedCode = normalizeStatusCode(statusCode);
  if (!normalizedCode) {
    return null;
  }

  const statuses = Array.isArray(list) ? list : await getPedidoCompraStatusConfig();
  const found = statuses.find((item) => item.codigo === normalizedCode);
  if (found) {
    return found;
  }

  return normalizeStatusEntry({ codigo: normalizedCode, nome: normalizedCode }, {
    cor: '#64748b',
    bloqueia_edicao: false,
    ativo: true
  });
}

async function isPedidoCompraStatusLocked(statusCode, list = null) {
  const status = await findPedidoCompraStatusConfig(statusCode, list);
  return Boolean(status?.bloqueia_edicao);
}

module.exports = {
  CHAVE_STATUS_PEDIDOS_COMPRA,
  DEFAULT_STATUS_PEDIDOS_COMPRA,
  findPedidoCompraStatusConfig,
  getPedidoCompraStatusConfig,
  isPedidoCompraStatusLocked,
  normalizePedidoCompraStatusList,
  normalizeStatusCode,
  savePedidoCompraStatusConfig
};
