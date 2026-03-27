const { FornecedorCompra, Setor } = require('../models');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

async function getUserTokens(req) {
  const tokens = new Set([
    normalizeText(req.user?.perfil),
    normalizeText(req.user?.area),
    normalizeText(req.user?.setor?.codigo),
    normalizeText(req.user?.setor?.nome)
  ].filter(Boolean));

  if (req.user?.setor_id) {
    const setor = await Setor.findByPk(req.user.setor_id, {
      attributes: ['codigo', 'nome']
    });
    if (setor?.codigo) tokens.add(normalizeText(setor.codigo));
    if (setor?.nome) tokens.add(normalizeText(setor.nome));
  }

  return tokens;
}

async function canReadFornecedores(req) {
  const tokens = await getUserTokens(req);
  return (
    tokens.has('SUPERADMIN') ||
    tokens.has('ADMIN') ||
    tokens.has('COMPRAS') ||
    tokens.has('GEO') ||
    tokens.has('GERENCIA DE PROCESSOS') ||
    tokens.has('GESTAO DE PROCESSOS') ||
    tokens.has('GERENCIA_PROCESSOS') ||
    tokens.has('GESTAO_PROCESSOS') ||
    Boolean(req.user?.pode_criar_solicitacao_compra)
  );
}

async function canManageFornecedores(req) {
  const tokens = await getUserTokens(req);
  return (
    tokens.has('SUPERADMIN') ||
    tokens.has('ADMIN') ||
    tokens.has('COMPRAS')
  );
}

module.exports = {
  async index(req, res) {
    try {
      if (!(await canReadFornecedores(req))) {
        return res.status(403).json({ error: 'Acesso negado aos fornecedores de compra' });
      }

      const incluirInativos = String(req.query.incluir_inativos || '').trim() === '1';
      const where = incluirInativos ? {} : { ativo: true };

      const fornecedores = await FornecedorCompra.findAll({
        where,
        order: [['nome', 'ASC']]
      });

      return res.json(fornecedores);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar fornecedores' });
    }
  },

  async create(req, res) {
    try {
      if (!(await canManageFornecedores(req))) {
        return res.status(403).json({ error: 'Apenas compras pode cadastrar fornecedores' });
      }

      const { nome, email, whatsapp, contato, observacoes } = req.body || {};

      if (!String(nome || '').trim()) {
        return res.status(400).json({ error: 'Informe o nome do fornecedor' });
      }

      const fornecedor = await FornecedorCompra.create({
        nome: String(nome).trim(),
        email: email ? String(email).trim() : null,
        whatsapp: whatsapp ? String(whatsapp).trim() : null,
        contato: contato ? String(contato).trim() : null,
        observacoes: observacoes ? String(observacoes).trim() : null,
        ativo: true
      });

      return res.status(201).json(fornecedor);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar fornecedor' });
    }
  },

  async update(req, res) {
    try {
      if (!(await canManageFornecedores(req))) {
        return res.status(403).json({ error: 'Apenas compras pode atualizar fornecedores' });
      }

      const fornecedor = await FornecedorCompra.findByPk(req.params.id);
      if (!fornecedor) {
        return res.status(404).json({ error: 'Fornecedor nao encontrado' });
      }

      const { nome, email, whatsapp, contato, observacoes, ativo } = req.body || {};

      if (nome !== undefined && !String(nome || '').trim()) {
        return res.status(400).json({ error: 'Informe o nome do fornecedor' });
      }

      await fornecedor.update({
        nome: nome !== undefined ? String(nome).trim() : fornecedor.nome,
        email: email !== undefined ? (email ? String(email).trim() : null) : fornecedor.email,
        whatsapp: whatsapp !== undefined ? (whatsapp ? String(whatsapp).trim() : null) : fornecedor.whatsapp,
        contato: contato !== undefined ? (contato ? String(contato).trim() : null) : fornecedor.contato,
        observacoes: observacoes !== undefined ? (observacoes ? String(observacoes).trim() : null) : fornecedor.observacoes,
        ativo: ativo !== undefined ? Boolean(ativo) : fornecedor.ativo
      });

      return res.json(fornecedor);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
    }
  },

  async destroy(req, res) {
    try {
      if (!(await canManageFornecedores(req))) {
        return res.status(403).json({ error: 'Apenas compras pode desativar fornecedores' });
      }

      const fornecedor = await FornecedorCompra.findByPk(req.params.id);
      if (!fornecedor) {
        return res.status(404).json({ error: 'Fornecedor nao encontrado' });
      }

      await fornecedor.update({ ativo: false });
      return res.json({ ok: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao desativar fornecedor' });
    }
  }
};
