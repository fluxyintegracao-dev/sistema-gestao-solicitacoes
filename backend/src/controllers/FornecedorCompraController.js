const { Op } = require('sequelize');
const { FornecedorCompra } = require('../models');
const {
  canManageComprasCotacoes,
  canViewComprasCotacoes
} = require('../services/authorizationService');

async function canReadFornecedores(req) {
  return canViewComprasCotacoes(req.user);
}

async function canManageFornecedores(req) {
  return canManageComprasCotacoes(req.user);
}

function parseCategorias(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.map((c) => String(c).trim()).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((c) => String(c).trim()).filter(Boolean) : null;
    } catch {
      return raw.split(',').map((c) => c.trim()).filter(Boolean);
    }
  }
  return null;
}

module.exports = {
  async index(req, res) {
    try {
      if (!(await canReadFornecedores(req))) {
        return res.status(403).json({ error: 'Acesso negado aos fornecedores de compra' });
      }

      const incluirInativos = String(req.query.incluir_inativos || '').trim() === '1';
      const somenteAvulsos = String(req.query.somente_avulsos || '').trim() === '1';
      const busca = String(req.query.q || '').trim();
      const cidade = String(req.query.cidade || '').trim();
      const estado = String(req.query.estado || '').trim().toUpperCase();
      const categoriaFiltro = String(req.query.categoria || '').trim().toLowerCase();

      const where = incluirInativos ? {} : { ativo: true };

      if (somenteAvulsos) {
        where.parceiro_id = null;
      }

      if (busca) {
        where[Op.or] = [
          { nome: { [Op.like]: `%${busca}%` } },
          { cnpj: { [Op.like]: `%${busca}%` } },
          { email: { [Op.like]: `%${busca}%` } },
          { contato: { [Op.like]: `%${busca}%` } }
        ];
      }

      if (cidade) {
        where.cidade = { [Op.like]: `%${cidade}%` };
      }

      if (estado) {
        where.estado = estado;
      }

      let fornecedores = await FornecedorCompra.findAll({
        where,
        order: [['nome', 'ASC']]
      });

      // Filtro por categoria (JSON field — feito em JS por compatibilidade)
      if (categoriaFiltro) {
        fornecedores = fornecedores.filter((f) => {
          const cats = Array.isArray(f.categoria_insumos) ? f.categoria_insumos : [];
          return cats.some((c) => String(c).toLowerCase().includes(categoriaFiltro));
        });
      }

      return res.json(fornecedores);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar fornecedores' });
    }
  },

  async show(req, res) {
    try {
      if (!(await canReadFornecedores(req))) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const fornecedor = await FornecedorCompra.findByPk(req.params.id);
      if (!fornecedor) {
        return res.status(404).json({ error: 'Fornecedor nao encontrado' });
      }

      return res.json(fornecedor);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar fornecedor' });
    }
  },

  async create(req, res) {
    try {
      if (!(await canManageFornecedores(req))) {
        return res.status(403).json({ error: 'Apenas compras pode cadastrar fornecedores' });
      }

      const { nome, cnpj, email, whatsapp, contato, observacoes, categoria_insumos, cidade, estado, cep } = req.body || {};

      if (!String(nome || '').trim()) {
        return res.status(400).json({ error: 'Informe o nome do fornecedor' });
      }

      const fornecedor = await FornecedorCompra.create({
        nome: String(nome).trim(),
        cnpj: cnpj ? String(cnpj).trim() : null,
        email: email ? String(email).trim() : null,
        whatsapp: whatsapp ? String(whatsapp).trim() : null,
        contato: contato ? String(contato).trim() : null,
        observacoes: observacoes ? String(observacoes).trim() : null,
        categoria_insumos: parseCategorias(categoria_insumos),
        cidade: cidade ? String(cidade).trim() : null,
        estado: estado ? String(estado).trim().toUpperCase().slice(0, 2) : null,
        cep: cep ? String(cep).trim() : null,
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

      const { nome, cnpj, email, whatsapp, contato, observacoes, ativo, categoria_insumos, cidade, estado, cep } = req.body || {};

      if (nome !== undefined && !String(nome || '').trim()) {
        return res.status(400).json({ error: 'Informe o nome do fornecedor' });
      }

      await fornecedor.update({
        nome: nome !== undefined ? String(nome).trim() : fornecedor.nome,
        cnpj: cnpj !== undefined ? (cnpj ? String(cnpj).trim() : null) : fornecedor.cnpj,
        email: email !== undefined ? (email ? String(email).trim() : null) : fornecedor.email,
        whatsapp: whatsapp !== undefined ? (whatsapp ? String(whatsapp).trim() : null) : fornecedor.whatsapp,
        contato: contato !== undefined ? (contato ? String(contato).trim() : null) : fornecedor.contato,
        observacoes: observacoes !== undefined ? (observacoes ? String(observacoes).trim() : null) : fornecedor.observacoes,
        categoria_insumos: categoria_insumos !== undefined ? parseCategorias(categoria_insumos) : fornecedor.categoria_insumos,
        cidade: cidade !== undefined ? (cidade ? String(cidade).trim() : null) : fornecedor.cidade,
        estado: estado !== undefined ? (estado ? String(estado).trim().toUpperCase().slice(0, 2) : null) : fornecedor.estado,
        cep: cep !== undefined ? (cep ? String(cep).trim() : null) : fornecedor.cep,
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
