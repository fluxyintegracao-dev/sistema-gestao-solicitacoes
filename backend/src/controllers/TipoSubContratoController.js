const { Op } = require('sequelize');
const { TipoSubContrato, TipoSolicitacao, Solicitacao, Contrato } = require('../models');

function normalizarSetor(valor) {
  return String(valor || '').trim().toUpperCase();
}

module.exports = {
  async index(req, res) {
    try {
      const { tipo_macro_id, setor } = req.query;
      const where = {};
      if (tipo_macro_id) where.tipo_macro_id = tipo_macro_id;

      const setorNormalizado = normalizarSetor(setor);
      if (setorNormalizado) {
        where[Op.or] = [
          { setor: setorNormalizado },
          { setor: null },
          { setor: '' }
        ];
      }

      const tipos = await TipoSubContrato.findAll({
        where,
        include: [
          { model: TipoSolicitacao, as: 'macro', attributes: ['id', 'nome'] }
        ],
        order: [['nome', 'ASC']]
      });

      return res.json(tipos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar subtipos' });
    }
  },

  async create(req, res) {
    try {
      const { nome, tipo_macro_id, setor } = req.body;
      const setorNormalizado = normalizarSetor(setor);
      if (!nome || !tipo_macro_id || !setorNormalizado) {
        return res.status(400).json({
          error: 'Setor, nome e tipo macro sao obrigatorios'
        });
      }

      const macro = await TipoSolicitacao.findByPk(tipo_macro_id);
      if (!macro) {
        return res.status(400).json({ error: 'Tipo macro nao encontrado' });
      }

      const tipo = await TipoSubContrato.create({
        nome: String(nome).trim(),
        tipo_macro_id,
        setor: setorNormalizado
      });
      return res.status(201).json(tipo);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar subtipo' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, tipo_macro_id, setor } = req.body;
      const setorNormalizado = normalizarSetor(setor);

      if (!nome || !tipo_macro_id || !setorNormalizado) {
        return res.status(400).json({ error: 'Setor, nome e tipo macro sao obrigatorios' });
      }

      const macro = await TipoSolicitacao.findByPk(tipo_macro_id);
      if (!macro) {
        return res.status(400).json({ error: 'Tipo macro nao encontrado' });
      }

      const tipo = await TipoSubContrato.findByPk(id);
      if (!tipo) return res.status(404).json({ error: 'Tipo nao encontrado' });

      await tipo.update({
        nome: String(nome).trim(),
        tipo_macro_id,
        setor: setorNormalizado
      });
      return res.json(tipo);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar subtipo' });
    }
  },

  async ativar(req, res) {
    try {
      const { id } = req.params;
      const tipo = await TipoSubContrato.findByPk(id);
      if (!tipo) return res.status(404).json({ error: 'Subtipo nao encontrado' });

      await tipo.update({ ativo: true });
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao ativar subtipo' });
    }
  },

  async desativar(req, res) {
    try {
      const { id } = req.params;
      const tipo = await TipoSubContrato.findByPk(id);
      if (!tipo) return res.status(404).json({ error: 'Subtipo nao encontrado' });

      await tipo.update({ ativo: false });
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao desativar subtipo' });
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      const tipo = await TipoSubContrato.findByPk(id);
      if (!tipo) return res.status(404).json({ error: 'Subtipo nao encontrado' });

      const [totalSolicitacoes, totalContratos] = await Promise.all([
        Solicitacao.count({ where: { tipo_sub_id: id } }),
        Contrato.count({ where: { tipo_sub_id: id } })
      ]);

      if (totalSolicitacoes > 0 || totalContratos > 0) {
        return res.status(409).json({
          error: 'Nao e possivel excluir subtipo com solicitacoes ou contratos vinculados.'
        });
      }

      await tipo.destroy();
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao excluir subtipo' });
    }
  }
};
