const { Op } = require('sequelize');
const dayjs = require('dayjs');
const PDFDocument = require('pdfkit');

const {
  PyObra,
  PyCategoria,
  PyUnidade,
  PyInsumo,
  PyInsumoUnidade,
  PyEspecificacao,
  PyApropriacao,
  PyRequisicao,
  PyRequisicaoItem
} = require('../models');

const REQUEST_LEAD_RULES = [
  { maxItems: 10, days: 7 },
  { maxItems: 30, days: 14 },
  { maxItems: 50, days: 18 },
  { maxItems: 999, days: 21 }
];

const REQUEST_LEAD_FALLBACK_DAYS = 21;

function getLeadDays(totalItens) {
  for (const rule of REQUEST_LEAD_RULES) {
    if (totalItens <= rule.maxItems) return rule.days;
  }
  return REQUEST_LEAD_FALLBACK_DAYS;
}

function buildMinNecessarioDate(totalItens, base = dayjs()) {
  return base.startOf('day').add(getLeadDays(totalItens), 'day');
}

function parseDate(value) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.startOf('day') : null;
}

async function ensureUnidades(nomes = []) {
  const clean = Array.from(
    new Set(
      (nomes || [])
        .map(n => (n || '').trim())
        .filter(Boolean)
    )
  );
  if (!clean.length) return [];

  const existentes = await PyUnidade.findAll({
    where: {
      nome: { [Op.in]: clean }
    }
  });
  const existingMap = new Map(existentes.map(u => [u.nome, u.id]));
  const criadas = [];
  for (const nome of clean) {
    if (existingMap.has(nome)) continue;
    const created = await PyUnidade.create({ nome });
    existingMap.set(nome, created.id);
    criadas.push(created);
  }
  return Array.from(existingMap.values());
}

async function attachUnidades(insumoId, unidadeNomes = []) {
  const unidadeIds = await ensureUnidades(unidadeNomes);
  if (!unidadeIds.length) return;
  await PyInsumoUnidade.bulkCreate(
    unidadeIds.map(unidade_id => ({ insumo_id: insumoId, unidade_id })),
    { ignoreDuplicates: true }
  );
}

function normalizeQuantidade(value) {
  if (value === undefined || value === null) return 0;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidApropriacao(value) {
  if (!value) return false;
  return /^\d+(?:\.\d+)*$/.test(String(value).trim());
}

async function buildApropriacaoLookup(obraId) {
  if (!obraId) return {};
  const rows = await PyApropriacao.findAll({
    where: { obra_id: obraId }
  });
  const normalize = txt =>
    String(txt || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const lookup = {};
  const ambiguous = new Set();
  rows.forEach(row => {
    const codigo = String(row.numero || '').replace(',', '.').trim();
    const nome = String(row.nome || '').trim();
    if (!codigo || !nome) return;
    const key = normalize(nome);
    if (!key) return;
    if (lookup[key] && lookup[key] !== codigo) {
      ambiguous.add(key);
      return;
    }
    lookup[key] = codigo;
  });

  ambiguous.forEach(key => delete lookup[key]);
  return lookup;
}

function resolveApropriacaoCodigo(rawValue, nomeLookup) {
  const texto = String(rawValue || '').trim();
  if (!texto) return '';

  // Tenta código direto
  if (isValidApropriacao(texto)) return texto;

  // Tenta "codigo|nome" ou "nome|codigo"
  const parts = texto.split('|').map(s => s.trim());
  if (parts.length === 2) {
    const [left, right] = parts;
    if (isValidApropriacao(left)) return left;
    if (isValidApropriacao(right)) return right;
  }

  // Tenta pelo nome (lookup)
  const normalize = val =>
    String(val || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const key = normalize(texto);
  if (nomeLookup && nomeLookup[key]) return nomeLookup[key];

  return '';
}

function parseApropriacaoEntry(raw) {
  let texto = String(raw || '').trim();
  if (!texto) return { codigo: '', nome: '' };
  texto = texto.replace(',', '.');

  const separators = ['|', ';', '\t', ' - ', ' -', '- '];
  for (const sep of separators) {
    if (!texto.includes(sep)) continue;
    const [left, right] = texto.split(sep, 2).map(s => s.trim());
    if (isValidApropriacao(left)) return { codigo: left, nome: right };
    if (isValidApropriacao(right)) return { codigo: right, nome: left };
    return { codigo: left, nome: right };
  }

  const startMatch = texto.match(/^(\d+(?:\.\d+)*)(?:\s+(.+))?$/);
  if (startMatch) {
    return { codigo: startMatch[1], nome: (startMatch[2] || '').trim() };
  }

  const endMatch = texto.match(/^(.+?)\s+(\d+(?:\.\d+)*)$/);
  if (endMatch) {
    return { codigo: endMatch[2], nome: (endMatch[1] || '').trim() };
  }

  return { codigo: '', nome: texto };
}

class PyComprasController {
  /* ===== catálogos ===== */
  async listarObras(req, res) {
    try {
      const obras = await PyObra.findAll({ order: [['nome', 'ASC']] });
      return res.json(obras);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao listar obras' });
    }
  }

  async criarObra(req, res) {
    try {
      const nome = (req.body.nome || '').trim();
      if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
      const obra = await PyObra.create({ nome });
      return res.status(201).json(obra);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao criar obra' });
    }
  }

  async listarCategorias(req, res) {
    try {
      const categorias = await PyCategoria.findAll({ order: [['nome', 'ASC']] });
      return res.json(categorias);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao listar categorias' });
    }
  }

  async criarCategoria(req, res) {
    try {
      const nome = (req.body.nome || '').trim();
      if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
      const categoria = await PyCategoria.create({ nome });
      return res.status(201).json(categoria);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }

  async listarUnidades(req, res) {
    try {
      const unidades = await PyUnidade.findAll({ order: [['nome', 'ASC']] });
      return res.json(unidades);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao listar unidades' });
    }
  }

  async criarUnidade(req, res) {
    try {
      const nome = (req.body.nome || '').trim();
      if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
      const unidade = await PyUnidade.create({ nome });
      return res.status(201).json(unidade);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao criar unidade' });
    }
  }

  async listarInsumos(req, res) {
    try {
      const { categoria_id, q } = req.query;
      const where = {};
      if (categoria_id) where.categoria_id = categoria_id;
      if (q) where.nome = { [Op.like]: `%${q}%` };

      const insumos = await PyInsumo.findAll({
        where,
        include: [
          { model: PyCategoria, as: 'categoria', attributes: ['id', 'nome'] },
          { model: PyUnidade, as: 'unidades', through: { attributes: [] }, attributes: ['id', 'nome'] },
          { model: PyEspecificacao, as: 'especificacoes', attributes: ['id', 'nome'] }
        ],
        order: [['nome', 'ASC']]
      });
      return res.json(insumos);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao listar insumos' });
    }
  }

  async criarInsumo(req, res) {
    try {
      const nome = (req.body.nome || '').trim();
      const categoria_id = req.body.categoria_id || null;
      const is_custom = Boolean(req.body.is_custom);
      const unidades = req.body.unidades || [];

      if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });

      const insumo = await PyInsumo.create({ nome, categoria_id, is_custom });
      await attachUnidades(insumo.id, unidades);
      const refreshed = await PyInsumo.findByPk(insumo.id, {
        include: [
          { model: PyCategoria, as: 'categoria', attributes: ['id', 'nome'] },
          { model: PyUnidade, as: 'unidades', through: { attributes: [] }, attributes: ['id', 'nome'] }
        ]
      });
      return res.status(201).json(refreshed);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao criar insumo' });
    }
  }

  async criarEspecificacao(req, res) {
    try {
      const { insumo_id } = req.body;
      const nome = (req.body.nome || '').trim();
      if (!insumo_id || !nome) {
        return res.status(400).json({ error: 'insumo_id e nome são obrigatórios' });
      }
      const spec = await PyEspecificacao.create({ insumo_id, nome });
      return res.status(201).json(spec);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao criar especificação' });
    }
  }

  async listarApropriacoes(req, res) {
    try {
      const { obra_id, search } = req.query;
      const where = {};
      if (obra_id) where.obra_id = obra_id;
      if (search) {
        const like = `%${search}%`;
        where[Op.or] = [
          { numero: { [Op.like]: like } },
          { nome: { [Op.like]: like } }
        ];
      }
      const apropriacoes = await PyApropriacao.findAll({
        where,
        order: [['numero', 'ASC']]
      });
      return res.json(apropriacoes);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao listar apropriações' });
    }
  }

  async criarApropriacao(req, res) {
    try {
      const { obra_id, numero } = req.body;
      const nome = (req.body.nome || '').trim();
      if (!obra_id || !numero) {
        return res.status(400).json({ error: 'obra_id e numero são obrigatórios' });
      }
      if (!isValidApropriacao(numero)) {
        return res.status(400).json({ error: 'numero deve conter apenas dígitos e pontos (ex: 1.2.3)' });
      }
      const apropriacao = await PyApropriacao.create({
        obra_id,
        numero: String(numero).trim(),
        nome
      });
      return res.status(201).json(apropriacao);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao criar apropriação' });
    }
  }

  async bulkApropriacoes(req, res) {
    try {
      const { obra_id, lista } = req.body;
      const texto = (lista || '').trim();
      if (!obra_id || !texto) {
        return res.status(400).json({ error: 'obra_id e lista são obrigatórios' });
      }

      const linhas = texto
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);
      if (!linhas.length) {
        return res.status(400).json({ error: 'Nenhuma linha válida informada' });
      }

      const existentes = await PyApropriacao.findAll({
        where: { obra_id }
      });
      const existentesMap = new Map(
        existentes.map(ap => [String(ap.numero).trim(), ap])
      );

      let novos = 0;
      let atualizados = 0;
      let ignorados = 0;
      for (const linha of linhas) {
        const { codigo, nome } = parseApropriacaoEntry(linha);
        if (!codigo || !isValidApropriacao(codigo)) {
          ignorados += 1;
          continue;
        }
        const existente = existentesMap.get(codigo);
        if (existente) {
          const nomeNormalizado = (existente.nome || '').trim().toLowerCase();
          const novoNomeNormalizado = (nome || '').trim().toLowerCase();
          if (novoNomeNormalizado && nomeNormalizado !== novoNomeNormalizado) {
            await existente.update({ nome });
            atualizados += 1;
          } else {
            ignorados += 1;
          }
          continue;
        }
        await PyApropriacao.create({ obra_id, numero: codigo, nome });
        existentesMap.set(codigo, { numero: codigo, nome });
        novos += 1;
      }

      return res.json({
        mensagem: `Importação concluída: ${novos} nova(s), ${atualizados} atualizada(s), ${ignorados} ignorada(s).`
      });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao importar apropriações' });
    }
  }

  /* ===== requisições ===== */
  async criarRequisicao(req, res) {
    try {
      const { obra_id, solicitante, necessario_em, itens = [] } = req.body;
      if (!obra_id) return res.status(400).json({ error: 'obra_id é obrigatório' });
      if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: 'Informe ao menos 1 item' });
      }

      const apropriacaoLookup = await buildApropriacaoLookup(obra_id);

      const minDate = buildMinNecessarioDate(itens.length);
      let necessarioGlobal = parseDate(necessario_em) || minDate;
      if (necessarioGlobal.isBefore(minDate, 'day')) {
        return res.status(400).json({
          error: `Data mínima permitida para ${itens.length} item(ns) é ${minDate.format('YYYY-MM-DD')}`
        });
      }

      const itensNormalizados = [];
      for (const rawItem of itens) {
        const unidade = (rawItem.unidade || '').trim();
        const especificacao = (rawItem.especificacao || '').trim();
        const apropriacao = resolveApropriacaoCodigo(
          rawItem.apropriacao,
          apropriacaoLookup
        );
        const link_produto = (rawItem.link_produto || '').trim();
        const itemNecessario = parseDate(rawItem.necessario_em);
        const quantidade = normalizeQuantidade(rawItem.quantidade);

        if (!unidade || !especificacao || quantidade <= 0) continue;

        const insumo_id = rawItem.insumo_id;
        const insumo_custom = (rawItem.insumo_custom || '').trim();
        itensNormalizados.push({
          insumo_id,
          insumo_custom,
          unidade,
          especificacao,
          apropriacao,
          quantidade,
          necessario_em: itemNecessario || necessarioGlobal,
          link_produto
        });
      }

      if (!itensNormalizados.length) {
        return res.status(400).json({ error: 'Itens inválidos' });
      }

      // valida datas por item
      for (const item of itensNormalizados) {
        const date = item.necessario_em || necessarioGlobal;
        if (dayjs(date).isBefore(minDate, 'day')) {
          return res.status(400).json({
            error: `Data mínima permitida para ${itensNormalizados.length} item(ns) é ${minDate.format('YYYY-MM-DD')}`
          });
        }
      }

      const criado_em = dayjs();
      const requisicao = await PyRequisicao.create({
        obra_id,
        solicitante: solicitante || null,
        necessario_em: necessarioGlobal.format('YYYY-MM-DD'),
        criado_em: criado_em.toDate()
      });

      for (const item of itensNormalizados) {
        let insumoIdFinal = item.insumo_id;
        if (!insumoIdFinal && item.insumo_custom) {
          const created = await PyInsumo.create({
            nome: item.insumo_custom,
            is_custom: true
          });
          insumoIdFinal = created.id;
        }
        if (!insumoIdFinal) continue;

        await PyRequisicaoItem.create({
          requisicao_id: requisicao.id,
          insumo_id: insumoIdFinal,
          unidade: item.unidade,
          quantidade: item.quantidade,
          especificacao: item.especificacao,
          apropriacao: item.apropriacao || null,
          necessario_em: dayjs(item.necessario_em).format('YYYY-MM-DD'),
          link_produto: item.link_produto || null,
          foto_path: item.foto_path || null
        });
      }

      const full = await PyRequisicao.findByPk(requisicao.id, {
        include: [
          { model: PyObra, as: 'obra_py' },
          {
            model: PyRequisicaoItem,
            as: 'itens',
            include: [{ model: PyInsumo, as: 'insumo' }]
          }
        ]
      });

      return res.status(201).json(full);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao criar requisição' });
    }
  }

  async listarRequisicoes(req, res) {
    try {
      const { obra_id } = req.query;
      const where = {};
      if (obra_id) where.obra_id = obra_id;
      const requisicoes = await PyRequisicao.findAll({
        where,
        include: [
          { model: PyObra, as: 'obra_py' },
          {
            model: PyRequisicaoItem,
            as: 'itens',
            include: [{ model: PyInsumo, as: 'insumo' }]
          }
        ],
        order: [['id', 'DESC']]
      });
      return res.json(requisicoes);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao listar requisições' });
    }
  }

  async exportarPdf(req, res) {
    try {
      const { id } = req.params;
      const requisicao = await PyRequisicao.findByPk(id, {
        include: [
          { model: PyObra, as: 'obra_py' },
          {
            model: PyRequisicaoItem,
            as: 'itens',
            include: [{ model: PyInsumo, as: 'insumo' }]
          }
        ]
      });
      if (!requisicao) return res.status(404).json({ error: 'Requisição não encontrada' });

      const doc = new PDFDocument({ margin: 32 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="requisicao-${requisicao.id}.pdf"`
      );
      doc.pipe(res);

      doc.fontSize(16).text('Solicitação de Compras', { align: 'left' });
      doc.moveDown(0.25);
      doc.fontSize(10).text(`#${requisicao.id}`);
      doc.text(`Obra: ${requisicao.obra_py ? requisicao.obra_py.nome : '-'}`);
      doc.text(`Solicitante: ${requisicao.solicitante || '-'}`);
      doc.text(
        `Necessário em: ${requisicao.necessario_em || '-'} | Criado em: ${dayjs(requisicao.criado_em).format('YYYY-MM-DD HH:mm')}`
      );
      doc.moveDown();

      const tableHeader = ['Insumo', 'Unid.', 'Qtd', 'Especificação', 'Apropriação', 'Necessário', 'Link'];
      const colWidths = [120, 40, 45, 160, 80, 70, 120];

      doc.fontSize(9).fillColor('#111111');
      tableHeader.forEach((h, idx) => {
        doc.text(h, { width: colWidths[idx], continued: idx !== tableHeader.length - 1 });
      });
      doc.moveDown(0.3);
      doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.4);

      requisicao.itens.forEach(item => {
        const cells = [
          item.insumo ? item.insumo.nome : '-',
          item.unidade,
          String(item.quantidade),
          item.especificacao,
          item.apropriacao || '-',
          item.necessario_em || '-',
          item.link_produto || '-'
        ];
        cells.forEach((cell, idx) => {
          doc.text(String(cell || '-'), {
            width: colWidths[idx],
            continued: idx !== cells.length - 1
          });
        });
        doc.moveDown(0.4);
      });

      doc.end();
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao exportar PDF' });
    }
  }
}

module.exports = new PyComprasController();
