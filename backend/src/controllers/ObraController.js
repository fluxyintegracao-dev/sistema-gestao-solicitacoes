const { Obra, UsuarioObra, Setor, ConfiguracaoSistema, EmpresaGrupo } = require('../models');
const { Op } = require('sequelize');
const {
  listarObrasGestao,
  obterGestaoObra
} = require('../services/obraGestaoService');
const { canAccessFinanceiro } = require('../services/authorizationService');
const {
  TIPO_CENTRO_CUSTO_OBRA,
  TIPOS_CENTRO_CUSTO,
  normalizeTipoCentroCusto
} = require('../constants/centroCusto');
const CHAVE_SETORES_CRIACAO_TODAS_OBRAS = 'SETORES_CRIACAO_TODAS_OBRAS';

function applyCentroCustoScope(where, escopo = 'OBRAS') {
  const scope = String(escopo || 'OBRAS').trim().toUpperCase();

  if (['TODOS', 'OBRA_CENTRO_CUSTO', 'CENTROS_CUSTO'].includes(scope)) {
    return where;
  }

  if (['CENTRO_CUSTO', 'CENTRO_CUSTO_PURO'].includes(scope)) {
    where.tipo_centro_custo = { [Op.ne]: TIPO_CENTRO_CUSTO_OBRA };
    return where;
  }

  where.tipo_centro_custo = TIPO_CENTRO_CUSTO_OBRA;
  return where;
}

function buildObraWhere(query = {}, defaultScope = 'OBRAS') {
  const { codigo, descricao, escopo, empresa_grupo_id } = query;
  const where = {};

  applyCentroCustoScope(where, escopo || defaultScope);

  if (codigo) {
    where.codigo = String(codigo).toUpperCase();
  }
  if (descricao) {
    where.nome = { [Op.like]: `%${descricao}%` };
  }
  if (empresa_grupo_id) {
    where.empresa_grupo_id = Number(empresa_grupo_id);
  }

  return where;
}

async function validarEmpresaGrupoOperacional(empresaGrupoId) {
  if (!empresaGrupoId) {
    return null;
  }

  const id = Number(empresaGrupoId);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('Empresa do grupo invalida');
    error.status = 400;
    throw error;
  }

  const empresa = await EmpresaGrupo.findByPk(id);
  if (!empresa || empresa.ativo === false) {
    const error = new Error('Empresa do grupo nao encontrada ou inativa');
    error.status = 400;
    throw error;
  }
  if (String(empresa.tipo_empresa || 'OPERACIONAL').trim().toUpperCase() === 'HOLDING') {
    const error = new Error('Vincule obras e centros de custo a uma empresa operacional, nao diretamente a Holding');
    error.status = 400;
    throw error;
  }

  return empresa;
}

const OBRA_INCLUDE = [
  {
    model: EmpresaGrupo,
    as: 'empresaGrupo',
    attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj', 'tipo_empresa', 'holding_id'],
    required: false
  }
];

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
    const where = buildObraWhere(req.query, 'OBRAS');

      const obras = await Obra.findAll({
        where,
        include: OBRA_INCLUDE,
        order: [['nome', 'ASC']]
      });
    res.json(obras);
  },

  async minhas(req, res) {
    try {
      const { id: usuarioId, perfil } = req.user;
      const { codigo, descricao, modo } = req.query;
      const modoNormalizado = String(modo || '').trim().toUpperCase();
      const defaultScope = String(req.query?.escopo || '').trim()
        ? req.query.escopo
        : 'TODOS';

      if (perfil === 'SUPERADMIN') {
        const where = buildObraWhere({ codigo, descricao, escopo: defaultScope }, 'TODOS');
        const obras = await Obra.findAll({
          where,
          include: OBRA_INCLUDE,
          order: [['nome', 'ASC']]
        });
        return res.json(obras);
      }

      if (modoNormalizado === 'FINANCEIRO' && await canAccessFinanceiro(req.user)) {
        const where = buildObraWhere({ codigo, descricao, escopo: defaultScope }, 'TODOS');
        const obras = await Obra.findAll({
          where,
          include: OBRA_INCLUDE,
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
          const where = buildObraWhere({ codigo, descricao, escopo: defaultScope }, 'TODOS');
          const obras = await Obra.findAll({
            where,
            include: OBRA_INCLUDE,
            order: [['nome', 'ASC']]
          });
          return res.json(obras);
        }
      }

      if (codigo) {
        const obra = await Obra.findOne({
          where: buildObraWhere({ codigo, escopo: defaultScope }, 'TODOS'),
          include: OBRA_INCLUDE
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
            include: OBRA_INCLUDE,
            where: buildObraWhere({ descricao, escopo: defaultScope }, 'TODOS')
          }
        ]
      });

      const obras = vinculos.map(v => v.obra);
      return res.json(obras);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar obras do usuário' });
    }
  },

  async create(req, res) {
    const { nome, codigo, cidade, classificacao, vgv, planilha_geral, margem_custo_esperada, tipo_centro_custo, empresa_grupo_id } = req.body;

    if (!nome || !codigo) {
      return res.status(400).json({ error: 'Nome e código são obrigatórios' });
    }

    const classificacaoNorm = classificacao ? String(classificacao).trim().toUpperCase() : null;
    if (classificacaoNorm && !['PRIVADA', 'PUBLICA'].includes(classificacaoNorm)) {
      return res.status(400).json({ error: 'Classificação inválida. Use PRIVADA ou PUBLICA' });
    }
    const tipoCentroCustoNorm = normalizeTipoCentroCusto(tipo_centro_custo);
    if (tipo_centro_custo && !TIPOS_CENTRO_CUSTO.includes(String(tipo_centro_custo).trim().toUpperCase())) {
      return res.status(400).json({ error: 'Tipo de centro de custo inválido. Use OBRA ou CENTRO_CUSTO' });
    }

    const existente = await Obra.findOne({
      where: { codigo: String(codigo).toUpperCase() }
    });
    if (existente) {
      return res.status(400).json({ error: 'Código de obra já cadastrado' });
    }

    try {
      await validarEmpresaGrupoOperacional(empresa_grupo_id);
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message || 'Erro ao validar empresa do grupo' });
    }

    const obra = await Obra.create({
      codigo: String(codigo).toUpperCase(),
      cidade: cidade || null,
      nome,
      empresa_grupo_id: empresa_grupo_id ? Number(empresa_grupo_id) : null,
      ativo: true,
      tipo_centro_custo: tipoCentroCustoNorm,
      classificacao: classificacaoNorm,
      vgv: vgv != null ? Number(vgv) : null,
      planilha_geral: planilha_geral != null ? Number(planilha_geral) : null,
      margem_custo_esperada: margem_custo_esperada != null ? Number(margem_custo_esperada) : null
    });

    res.status(201).json(obra);
  },

  async update(req, res) {
    const { id } = req.params;
    const { nome, codigo, cidade, classificacao, vgv, planilha_geral, margem_custo_esperada, tipo_centro_custo, empresa_grupo_id } = req.body;

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
    if (tipo_centro_custo !== undefined) {
      const tipoCentroCustoNorm = String(tipo_centro_custo || '').trim().toUpperCase();
      if (!TIPOS_CENTRO_CUSTO.includes(tipoCentroCustoNorm)) {
        return res.status(400).json({ error: 'Tipo de centro de custo invalido. Use OBRA ou CENTRO_CUSTO' });
      }
      dados.tipo_centro_custo = tipoCentroCustoNorm;
    }
    if (vgv !== undefined) dados.vgv = vgv != null ? Number(vgv) : null;
    if (planilha_geral !== undefined) dados.planilha_geral = planilha_geral != null ? Number(planilha_geral) : null;
    if (margem_custo_esperada !== undefined) dados.margem_custo_esperada = margem_custo_esperada != null ? Number(margem_custo_esperada) : null;
    if (empresa_grupo_id !== undefined) {
      try {
        await validarEmpresaGrupoOperacional(empresa_grupo_id);
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Erro ao validar empresa do grupo' });
      }
      dados.empresa_grupo_id = empresa_grupo_id ? Number(empresa_grupo_id) : null;
    }

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
