const { Op } = require('sequelize');
const { Setor } = require('../models');
const { normalizeSetorCode } = require('../services/setorCapabilityService');

const CAPABILITY_FIELDS = [
  'eh_setor_obra',
  'eh_setor_financeiro',
  'eh_setor_compras',
  'eh_setor_geo',
  'eh_setor_administrativo'
];

function extractCapabilityPayload(body = {}) {
  return CAPABILITY_FIELDS.reduce((acc, field) => {
    if (body[field] !== undefined) {
      acc[field] = Boolean(body[field]);
    }
    return acc;
  }, {});
}

module.exports = {

  async index(req, res) {
    try {
      const setores = await Setor.findAll({
        where: { ativo: true },
        order: [['nome', 'ASC']]
      });

      return res.json(setores);

    } catch (error) {
      console.error('Erro ao listar setores:', error);
      return res.status(500).json({
        error: 'Erro ao buscar setores'
      });
    }
  },

  async create(req, res) {
    try {
      const { nome, codigo } = req.body;
      const nomeNormalizado = String(nome || '').trim();
      const codigoNormalizado = normalizeSetorCode(codigo);

      if (!nomeNormalizado || !codigoNormalizado) {
        return res.status(400).json({ error: 'Nome e codigo sao obrigatorios' });
      }

      const existente = await Setor.findOne({
        where: {
          [Op.or]: [
            { codigo: codigoNormalizado },
            { nome: nomeNormalizado }
          ]
        },
        attributes: ['id']
      });
      if (existente) {
        return res.status(409).json({ error: 'Ja existe setor com mesmo nome ou codigo' });
      }

      const setor = await Setor.create({
        nome: nomeNormalizado,
        codigo: codigoNormalizado,
        ...extractCapabilityPayload(req.body)
      });

      return res.status(201).json(setor);

    } catch (error) {
      console.error('Erro ao criar setor:', error);
      return res.status(500).json({
        error: 'Erro ao criar setor'
      });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, codigo } = req.body;

      const capabilityPayload = extractCapabilityPayload(req.body);
      if (!nome && !codigo && Object.keys(capabilityPayload).length === 0) {
        return res.status(400).json({ error: 'Nada para atualizar' });
      }

      const setor = await Setor.findByPk(id);
      if (!setor) {
        return res.status(404).json({ error: 'Setor nao encontrado' });
      }

      const proximoNome = nome ? String(nome).trim() : setor.nome;
      const proximoCodigo = codigo ? normalizeSetorCode(codigo) : setor.codigo;

      if (nome || codigo) {
        const existente = await Setor.findOne({
          where: {
            id: { [Op.ne]: id },
            [Op.or]: [
              { codigo: proximoCodigo },
              { nome: proximoNome }
            ]
          },
          attributes: ['id']
        });
        if (existente) {
          return res.status(409).json({ error: 'Ja existe setor com mesmo nome ou codigo' });
        }
      }

      await setor.update({
        nome: proximoNome,
        codigo: proximoCodigo,
        ...capabilityPayload
      });

      return res.json(setor);

    } catch (error) {
      console.error('Erro ao atualizar setor:', error);
      return res.status(500).json({
        error: 'Erro ao atualizar setor'
      });
    }
  },

  async ativar(req, res) {
    try {
      const { id } = req.params;

      const setor = await Setor.findByPk(id);
      if (!setor) {
        return res.status(404).json({ error: 'Setor não encontrado' });
      }

      await setor.update({ ativo: true });

      return res.sendStatus(204);

    } catch (error) {
      console.error('Erro ao ativar setor:', error);
      return res.status(500).json({
        error: 'Erro ao ativar setor'
      });
    }
  },

  async desativar(req, res) {
    try {
      const { id } = req.params;

      const setor = await Setor.findByPk(id);
      if (!setor) {
        return res.status(404).json({ error: 'Setor não encontrado' });
      }

      await setor.update({ ativo: false });

      return res.sendStatus(204);

    } catch (error) {
      console.error('Erro ao desativar setor:', error);
      return res.status(500).json({
        error: 'Erro ao desativar setor'
      });
    }
  }

};
