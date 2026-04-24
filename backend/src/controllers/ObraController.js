const { Obra, UsuarioObra, Setor, ConfiguracaoSistema } = require('../models');
const { Op } = require('sequelize');
const {
  listarObrasGestao,
  obterGestaoObra
} = require('../services/obraGestaoService');
const { canAccessFinanceiro } = require('../services/authorizationService');
const CHAVE_SETORES_CRIACAO_TODAS_OBRAS = 'SETORES_CRIACAO_TODAS_OBRAS';

async function obterSetoresCriacaoTodasObras() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_SETORES_CRIACAO_TODAS_OBRAS },
    order: [['id', 'DESC']]
  });
  if (!item?.valor) return [];
  try {
    const data = JSON.parse(item.valor);
    if (!Array.isArray(data?.setores)) return [];
    return [...new Set(
      data.setores
        .map(v => String(v || '').trim().toUpperCase())
        .filter(Boolean)
    )];
  } catch {
    return [];
  }
}

async function obterTokensSetorUsuario(req) {
  const tokens = new Set();
  if (req.user?.area) tokens.add(String(req.user.area).trim().toUpperCase());
  if (req.user?.setor_id) {
    tokens.add(String(req.user.setor_id).trim().toUpperCase());
    const setor = await Setor.findByPk(req.user.setor_id, { attributes: ['codigo', 'nome'] });
    if (setor?.codigo) tokens.add(String(setor.codigo).trim().toUpperCase());
    if (setor?.nome) tokens.add(String(setor.nome).trim().toUpperCase());
  }
  return Array.from(tokens).filter(Boolean);
}

module.exports = {
  async gestaoIndex(req, res) {
    try {
      const dados = await listarObrasGestao();
      return res.json(dados);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar gestao das obras' });
    }
  },

  async gestaoShow(req, res) {
    try {
      const obraId = Number(req.params.id);
      const dados = await obterGestaoObra(obraId);

      if (!dados) {
        return res.status(404).json({ error: 'Obra nao encontrada' });
      }

      return res.json(dados);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar detalhes da obra' });
    }
  },

  async index(req, res) {
    const { codigo, descricao } = req.query;
    const where = {};

    if (codigo) {
      where.codigo = String(codigo).toUpperCase();
    }
    if (descricao) {
      where.nome = { [Op.like]: `%${descricao}%` };
    }

    const obras = await Obra.findAll({
      where,
      order: [['nome', 'ASC']]
    });
    res.json(obras);
  },

  async minhas(req, res) {
    try {
      const { id: usuarioId, perfil } = req.user;
      const { codigo, descricao, modo } = req.query;
      const modoNormalizado = String(modo || '').trim().toUpperCase();

      if (perfil === 'SUPERADMIN') {
        const where = {};
        if (codigo) where.codigo = String(codigo).toUpperCase();
        if (descricao) where.nome = { [Op.like]: `%${descricao}%` };
        const obras = await Obra.findAll({
          where,
          order: [['nome', 'ASC']]
        });
        return res.json(obras);
      }

      if (modoNormalizado === 'FINANCEIRO' && await canAccessFinanceiro(req.user)) {
        const where = {};
        if (codigo) where.codigo = String(codigo).toUpperCase();
        if (descricao) where.nome = { [Op.like]: `%${descricao}%` };
        const obras = await Obra.findAll({
          where,
          order: [['nome', 'ASC']]
        });
        return res.json(obras);
      }

      const modoCriacao = modoNormalizado === 'CRIACAO';
      if (modoCriacao) {
        const [tokensUsuario, setoresPermitidos] = await Promise.all([
          obterTokensSetorUsuario(req),
          obterSetoresCriacaoTodasObras()
        ]);

        const podeCriarEmTodas = tokensUsuario.some(token => setoresPermitidos.includes(token));
        if (podeCriarEmTodas) {
          const where = {};
          if (codigo) where.codigo = String(codigo).toUpperCase();
          if (descricao) where.nome = { [Op.like]: `%${descricao}%` };
          const obras = await Obra.findAll({
            where,
            order: [['nome', 'ASC']]
          });
          return res.json(obras);
        }
      }

      if (codigo) {
        const obra = await Obra.findOne({
          where: { codigo: String(codigo).toUpperCase() }
        });
        if (!obra) return res.json([]);

        const vinculo = await UsuarioObra.findOne({
          where: { user_id: usuarioId, obra_id: obra.id }
        });
        return res.json(vinculo ? [obra] : []);
      }

      const vinculos = await UsuarioObra.findAll({
        where: { user_id: usuarioId },
        include: [
          {
            model: Obra,
            as: 'obra',
            where: descricao ? { nome: { [Op.like]: `%${descricao}%` } } : undefined
          }
        ]
      });

      const obras = vinculos.map(v => v.obra);
      return res.json(obras);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar obras do usuÃ¡rio' });
    }
  },

  async create(req, res) {
    const { nome, codigo, cidade, classificacao, vgv, planilha_geral, margem_custo_esperada } = req.body;

    if (!nome || !codigo) {
      return res.status(400).json({ error: 'Nome e codigo sao obrigatorios' });
    }

    const classificacaoNorm = classificacao ? String(classificacao).trim().toUpperCase() : null;
    if (classificacaoNorm && !['PRIVADA', 'PUBLICA'].includes(classificacaoNorm)) {
      return res.status(400).json({ error: 'Classificacao invalida. Use PRIVADA ou PUBLICA' });
    }

    const existente = await Obra.findOne({
      where: { codigo: String(codigo).toUpperCase() }
    });
    if (existente) {
      return res.status(400).json({ error: 'Codigo de obra ja cadastrado' });
    }

    const obra = await Obra.create({
      codigo: String(codigo).toUpperCase(),
      cidade: cidade || null,
      nome,
      ativo: true,
      classificacao: classificacaoNorm,
      vgv: vgv != null ? Number(vgv) : null,
      planilha_geral: planilha_geral != null ? Number(planilha_geral) : null,
      margem_custo_esperada: margem_custo_esperada != null ? Number(margem_custo_esperada) : null
    });

    res.status(201).json(obra);
  },

  async update(req, res) {
    const { id } = req.params;
    const { nome, codigo, cidade, classificacao, vgv, planilha_geral, margem_custo_esperada } = req.body;

    const dados = {};
    if (nome) dados.nome = nome;
    if (cidade !== undefined) dados.cidade = cidade || null;
    if (codigo !== undefined) {
      if (!codigo) {
        return res.status(400).json({ error: 'Codigo invalido' });
      }
      dados.codigo = String(codigo).toUpperCase();
    }
    if (classificacao !== undefined) {
      const classificacaoNorm = classificacao ? String(classificacao).trim().toUpperCase() : null;
      if (classificacaoNorm && !['PRIVADA', 'PUBLICA'].includes(classificacaoNorm)) {
        return res.status(400).json({ error: 'Classificacao invalida. Use PRIVADA ou PUBLICA' });
      }
      dados.classificacao = classificacaoNorm;
    }
    if (vgv !== undefined) dados.vgv = vgv != null ? Number(vgv) : null;
    if (planilha_geral !== undefined) dados.planilha_geral = planilha_geral != null ? Number(planilha_geral) : null;
    if (margem_custo_esperada !== undefined) dados.margem_custo_esperada = margem_custo_esperada != null ? Number(margem_custo_esperada) : null;

    if (Object.keys(dados).length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    if (dados.codigo) {
      const existente = await Obra.findOne({
        where: {
          codigo: dados.codigo,
          id: { [Op.ne]: id }
        }
      });
      if (existente) {
        return res.status(400).json({ error: 'Codigo de obra ja cadastrado' });
      }
    }

    await Obra.update(
      dados,
      { where: { id } }
    );

    res.sendStatus(204);
  },

  async ativar(req, res) {
    const { id } = req.params;

    await Obra.update(
      { ativo: true },
      { where: { id } }
    );

    res.sendStatus(204);
  },

  async desativar(req, res) {
    const { id } = req.params;

    await Obra.update(
      { ativo: false },
      { where: { id } }
    );

    res.sendStatus(204);
  }
};
