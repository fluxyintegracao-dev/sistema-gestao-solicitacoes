'use strict';

const { Op } = require('sequelize');
const {
  Apropriacao,
  CategoriaFinanceira,
  Obra,
  Parceiro,
  PedidoCompra,
  PedidoCompraItem,
  Solicitacao,
  SolicitacaoCompra,
  TituloFinanceiro
} = require('../../../models');

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function like(value) {
  return { [Op.like]: `%${value}%` };
}

function numericId(value) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function buildWhere(query, fields = [], extra = {}) {
  const q = String(query || '').trim();
  const where = { ...extra };
  const id = numericId(q);
  const or = [];

  if (id) {
    or.push({ id });
  }

  if (q) {
    fields.forEach((field) => {
      or.push({ [field]: like(q) });
    });
  }

  if (or.length) {
    where[Op.or] = or;
  }

  return where;
}

function normalizeOption(type, row, label, description, payload = {}) {
  return {
    id: row.id,
    type,
    label,
    description,
    payload
  };
}

const SEARCHERS = {
  solicitacao: {
    field: 'solicitacao_id',
    async find({ q, limit }) {
      const rows = await Solicitacao.findAll({
        where: buildWhere(q, ['codigo', 'numero_pedido', 'numero_sienge', 'descricao', 'status_global', 'area_responsavel']),
        attributes: ['id', 'codigo', 'numero_pedido', 'numero_sienge', 'descricao', 'valor', 'status_global', 'area_responsavel'],
        order: [['id', 'DESC']],
        limit
      });

      return rows.map((row) => normalizeOption(
        'solicitacao',
        row,
        `Solicitacao #${row.id}${row.codigo ? ` - ${row.codigo}` : ''}`,
        [row.status_global, row.area_responsavel, row.numero_pedido ? `Pedido ${row.numero_pedido}` : null].filter(Boolean).join(' | '),
        row.toJSON()
      ));
    }
  },
  solicitacao_compra: {
    field: 'solicitacao_compra_id',
    async find({ q, limit }) {
      const rows = await SolicitacaoCompra.findAll({
        where: buildWhere(q, ['titulo', 'status', 'numero_sienge', 'observacoes']),
        attributes: ['id', 'titulo', 'status', 'numero_sienge', 'obra_id', 'necessario_para'],
        order: [['id', 'DESC']],
        limit
      });

      return rows.map((row) => normalizeOption(
        'solicitacao_compra',
        row,
        `Compra #${row.id}${row.titulo ? ` - ${row.titulo}` : ''}`,
        [row.status, row.numero_sienge ? `Sienge ${row.numero_sienge}` : null, row.obra_id ? `Obra #${row.obra_id}` : null].filter(Boolean).join(' | '),
        row.toJSON()
      ));
    }
  },
  pedido: {
    field: 'pedido_id',
    async find({ q, limit }) {
      const id = numericId(q);
      const where = buildWhere(q, ['status', 'origem', 'observacoes']);
      if (id) {
        where[Op.or].push({ solicitacao_compra_id: id });
      }

      const rows = await PedidoCompra.findAll({
        where,
        attributes: ['id', 'solicitacao_compra_id', 'obra_id', 'fornecedor_compra_id', 'status', 'valor_total', 'origem'],
        order: [['id', 'DESC']],
        limit
      });

      return rows.map((row) => normalizeOption(
        'pedido',
        row,
        `Pedido #${row.id}`,
        [row.status, `Valor ${Number(row.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, `Compra #${row.solicitacao_compra_id}`].join(' | '),
        row.toJSON()
      ));
    }
  },
  pedido_item: {
    field: 'pedido_item_id',
    async find({ q, limit }) {
      const id = numericId(q);
      const where = buildWhere(q, ['descricao', 'unidade', 'origem']);
      if (id) {
        where[Op.or].push({ pedido_compra_id: id });
      }

      const rows = await PedidoCompraItem.findAll({
        where,
        attributes: ['id', 'pedido_compra_id', 'descricao', 'unidade', 'quantidade_pedido', 'preco_unitario', 'valor_total'],
        order: [['id', 'DESC']],
        limit
      });

      return rows.map((row) => normalizeOption(
        'pedido_item',
        row,
        `Item #${row.id} - ${row.descricao}`,
        [`Pedido #${row.pedido_compra_id}`, `Valor ${Number(row.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`].join(' | '),
        row.toJSON()
      ));
    }
  },
  titulo: {
    field: 'financeiro_titulo_id',
    async find({ q, limit }) {
      const rows = await TituloFinanceiro.findAll({
        where: buildWhere(q, ['codigo', 'descricao', 'numero_documento', 'status', 'tipo']),
        attributes: ['id', 'codigo', 'descricao', 'numero_documento', 'tipo', 'status', 'valor_original', 'data_vencimento'],
        order: [['id', 'DESC']],
        limit
      });

      return rows.map((row) => normalizeOption(
        'titulo',
        row,
        `${row.codigo || `Titulo #${row.id}`} - ${row.descricao}`,
        [row.tipo, row.status, `Valor ${Number(row.valor_original || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`].filter(Boolean).join(' | '),
        row.toJSON()
      ));
    }
  },
  obra: {
    field: 'obra_id',
    async find({ q, limit }) {
      const rows = await Obra.findAll({
        where: buildWhere(q, ['codigo', 'nome', 'cidade'], { ativo: true }),
        attributes: ['id', 'codigo', 'nome', 'cidade', 'classificacao'],
        order: [['nome', 'ASC']],
        limit
      });

      return rows.map((row) => normalizeOption(
        'obra',
        row,
        `${row.codigo ? `${row.codigo} - ` : ''}${row.nome}`,
        [row.cidade, row.classificacao].filter(Boolean).join(' | '),
        row.toJSON()
      ));
    }
  },
  fornecedor: {
    field: 'fornecedor_id',
    async find({ q, limit }) {
      const digits = String(q || '').replace(/\D/g, '');
      const where = buildWhere(q, ['nome', 'cpf_cnpj', 'email'], { fornecedor: true, ativo: true });
      if (digits && where[Op.or]) {
        where[Op.or].push({ cpf_cnpj: like(digits) });
      }

      const rows = await Parceiro.findAll({
        where,
        attributes: ['id', 'nome', 'cpf_cnpj', 'email', 'telefone'],
        order: [['nome', 'ASC']],
        limit
      });

      return rows.map((row) => normalizeOption(
        'fornecedor',
        row,
        row.nome,
        [row.cpf_cnpj, row.email].filter(Boolean).join(' | '),
        row.toJSON()
      ));
    }
  },
  centro_custo: {
    field: 'centro_custo_id',
    async find({ q, limit }) {
      const id = numericId(q);
      const where = buildWhere(q, ['codigo', 'descricao'], { ativo: true });
      if (id) {
        where[Op.or].push({ obra_id: id });
      }

      const rows = await Apropriacao.findAll({
        where,
        attributes: ['id', 'obra_id', 'codigo', 'descricao', 'valor_orcado'],
        order: [['codigo', 'ASC']],
        limit
      });

      return rows.map((row) => normalizeOption(
        'centro_custo',
        row,
        `${row.codigo} - ${row.descricao || 'Centro de custo'}`,
        row.obra_id ? `Obra #${row.obra_id}` : '',
        row.toJSON()
      ));
    }
  },
  plano_financeiro: {
    field: 'plano_financeiro_id',
    async find({ q, limit }) {
      const rows = await CategoriaFinanceira.findAll({
        where: buildWhere(q, ['nome', 'tipo', 'descricao'], { ativo: true }),
        attributes: ['id', 'nome', 'tipo', 'descricao'],
        order: [['nome', 'ASC']],
        limit
      });

      return rows.map((row) => normalizeOption(
        'plano_financeiro',
        row,
        row.nome,
        [row.tipo, row.descricao].filter(Boolean).join(' | '),
        row.toJSON()
      ));
    }
  }
};

async function buscarOpcoesVinculoFiscal(query = {}) {
  const type = String(query.type || '').trim();
  const searcher = SEARCHERS[type];
  if (!searcher) {
    throw createHttpError('Tipo de busca de vinculo fiscal invalido.', 400);
  }

  const data = await searcher.find({
    q: query.q || '',
    limit: query.limit || 20
  });

  return {
    data,
    target_field: searcher.field,
    type
  };
}

module.exports = {
  buscarOpcoesVinculoFiscal
};
