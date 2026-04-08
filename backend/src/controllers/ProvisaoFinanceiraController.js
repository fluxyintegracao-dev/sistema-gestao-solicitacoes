const { Op } = require('sequelize');
const {
  sequelize,
  ProvisaoFinanceira,
  ProvisaoCategoriaMacro,
  ProvisaoFinanceiraHistorico,
  ProvisaoFinanceiraAnexo,
  Obra,
  User
} = require('../models');
const { uploadToS3, getPresignedUrl } = require('../services/s3');
const { normalizeOriginalName } = require('../utils/fileName');
const { gerarCodigoProvisionamentoFinanceiro } = require('../services/provisaoFinanceira/gerarCodigo');
const {
  resolverPermissoesProvisionamentoFinanceiro,
  usuarioPodeAtuarNaObra,
  normalizarIdInteiro
} = require('../services/provisaoFinanceira/permissoes');
const { registrarHistoricoProvisionamento } = require('../services/provisaoFinanceira/historico');

const STATUS_PROVISAO_FINANCEIRA = [
  'previsto',
  'em_analise',
  'aprovado',
  'cancelado',
  'realizado'
];
const MAX_LIMITE_LISTAGEM = 200;

function normalizarTexto(valor) {
  const texto = String(valor || '').trim();
  return texto || null;
}

function normalizarValorDecimal(valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  let texto = String(valor)
    .trim()
    .replace(/[R$\s]/gi, '');

  if (!texto) return null;

  if (texto.includes(',')) {
    texto = texto
      .replace(/\./g, '')
      .replace(',', '.');
  } else {
    texto = texto.replace(/,/g, '');
  }

  const numero = Number(texto);
  if (!Number.isFinite(numero)) return null;
  return Number(numero.toFixed(2));
}

function parsePositiveInt(valor, fallback = null) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) return fallback;
  return numero;
}

function parsePagina(valor, padrao) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) return padrao;
  return numero;
}

function normalizarDirecaoOrdenacao(valor) {
  return String(valor || 'DESC').trim().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
}

function normalizarCampoOrdenacao(valor) {
  const campo = String(valor || '').trim().toLowerCase();
  const mapa = {
    codigo: 'codigo',
    data_prevista: 'data_prevista_desembolso',
    data_prevista_desembolso: 'data_prevista_desembolso',
    categoria: 'categoria_macro_id',
    valor: 'valor_previsto',
    valor_previsto: 'valor_previsto',
    status: 'status',
    prioridade: 'prioridade',
    criador: 'usuario_criacao_id',
    createdat: 'createdAt',
    created_at: 'createdAt',
    criacao: 'createdAt'
  };

  return mapa[campo] || 'data_prevista_desembolso';
}

function serializarStatus(valor) {
  return String(valor || '').trim().toLowerCase();
}

function validarStatusEdicao(statusAtual, statusNovo) {
  if (!statusNovo || statusNovo === statusAtual) return true;
  return ['previsto', 'em_analise'].includes(statusNovo);
}

function descricaoMudancaStatus(statusAnterior, statusNovo) {
  return `Status alterado de ${String(statusAnterior || '-').toUpperCase()} para ${String(statusNovo || '-').toUpperCase()}.`;
}

function obterResumoUsuario(usuario) {
  if (!usuario) return null;
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil
  };
}

async function obterPermissoes(req) {
  if (req.provisaoFinanceiraPermissoes) {
    return req.provisaoFinanceiraPermissoes;
  }

  const permissoes = await resolverPermissoesProvisionamentoFinanceiro(req.user);
  req.provisaoFinanceiraPermissoes = permissoes;
  return permissoes;
}

async function listarObrasPorEscopo(obrasPermitidas) {
  const where = {};
  if (Array.isArray(obrasPermitidas)) {
    if (obrasPermitidas.length === 0) return [];
    where.id = { [Op.in]: obrasPermitidas };
  }

  const obras = await Obra.findAll({
    where,
    attributes: ['id', 'codigo', 'nome', 'ativo'],
    order: [['nome', 'ASC']]
  });

  return obras.map((obra) => ({
    id: obra.id,
    codigo: obra.codigo,
    nome: obra.nome,
    ativo: obra.ativo !== false
  }));
}

async function validarAcessoNaObra(req, obraId, acao) {
  const permissoes = await obterPermissoes(req);
  if (permissoes?.superadmin) {
    return { ok: true, permissoes };
  }

  const permitido = usuarioPodeAtuarNaObra({
    permissoes,
    obraId,
    acao
  });

  if (!permitido) {
    return {
      ok: false,
      permissoes,
      resposta: {
        status: 403,
        body: { error: 'Acesso negado a esta obra no modulo de provisionamento financeiro' }
      }
    };
  }

  return { ok: true, permissoes };
}

async function validarAcessoParaGerenciarStatus(req, obraId) {
  const permissoes = await obterPermissoes(req);
  if (permissoes?.superadmin) {
    return { ok: true, permissoes };
  }

  const podeAprovar = usuarioPodeAtuarNaObra({
    permissoes,
    obraId,
    acao: 'aprovar'
  });

  if (podeAprovar) {
    return { ok: true, permissoes };
  }

  return {
    ok: false,
    permissoes,
    resposta: {
      status: 403,
      body: { error: 'Acesso negado para alterar status desta provisao financeira' }
    }
  };
}

function obterIncludesLista() {
  return [
    {
      model: Obra,
      as: 'obra',
      attributes: ['id', 'codigo', 'nome', 'ativo']
    },
    {
      model: ProvisaoCategoriaMacro,
      as: 'categoriaMacro',
      attributes: ['id', 'nome', 'ativo']
    },
    {
      model: User,
      as: 'usuarioCriacao',
      attributes: ['id', 'nome', 'email', 'perfil']
    }
  ];
}

function obterIncludesDetalhe() {
  return [
    ...obterIncludesLista(),
    {
      model: User,
      as: 'usuarioAtualizacao',
      attributes: ['id', 'nome', 'email', 'perfil']
    },
    {
      model: User,
      as: 'aprovadoPor',
      attributes: ['id', 'nome', 'email', 'perfil']
    },
    {
      model: User,
      as: 'canceladoPor',
      attributes: ['id', 'nome', 'email', 'perfil']
    }
  ];
}

async function carregarProvisaoDetalhada(id) {
  const provisao = await ProvisaoFinanceira.findByPk(id, {
    include: obterIncludesDetalhe()
  });

  if (!provisao) {
    return null;
  }

  const [historicos, anexos] = await Promise.all([
    ProvisaoFinanceiraHistorico.findAll({
      where: { provisao_financeira_id: id },
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nome', 'email', 'perfil']
        }
      ],
      order: [['createdAt', 'DESC']]
    }),
    ProvisaoFinanceiraAnexo.findAll({
      where: { provisao_financeira_id: id },
      include: [
        {
          model: User,
          as: 'uploadUser',
          attributes: ['id', 'nome', 'email', 'perfil']
        }
      ],
      order: [['createdAt', 'DESC']]
    })
  ]);

  const json = provisao.toJSON();
  json.historicos = historicos;
  json.anexos = anexos;
  return json;
}

function normalizarDadosProvisionamento(body = {}) {
  return {
    obra_id: parsePositiveInt(body.obra_id),
    categoria_macro_id: parsePositiveInt(body.categoria_macro_id),
    item_macro: normalizarTexto(body.item_macro),
    descricao: normalizarTexto(body.descricao),
    fornecedor_id: parsePositiveInt(body.fornecedor_id),
    fornecedor_texto: normalizarTexto(body.fornecedor_texto),
    data_prevista_desembolso: normalizarTexto(body.data_prevista_desembolso),
    valor_previsto: normalizarValorDecimal(body.valor_previsto),
    comentario: normalizarTexto(body.comentario),
    status: serializarStatus(body.status) || 'previsto',
    prioridade: normalizarTexto(body.prioridade)
  };
}

async function validarCategoriaAtiva(categoriaId, options = {}) {
  const categoria = await ProvisaoCategoriaMacro.findByPk(categoriaId, {
    attributes: ['id', 'nome', 'ativo'],
    transaction: options.transaction
  });

  if (!categoria) {
    return { ok: false, error: 'Categoria macro nao encontrada.' };
  }

  if (categoria.ativo === false) {
    return { ok: false, error: 'Categoria macro inativa.' };
  }

  return { ok: true, categoria };
}

async function resolverCategoriaMacroProvisionamento({
  categoriaMacroId,
  itemMacro,
  transaction
}) {
  const itemMacroNormalizado = normalizarTexto(itemMacro);

  if (itemMacroNormalizado) {
    let categoria = await ProvisaoCategoriaMacro.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nome')),
        itemMacroNormalizado.toLowerCase()
      ),
      attributes: ['id', 'nome', 'ativo'],
      transaction
    });

    if (categoria) {
      if (categoria.ativo === false) {
        await categoria.update({ ativo: true }, { transaction });
      }

      return { ok: true, categoria };
    }

    categoria = await ProvisaoCategoriaMacro.create({
      nome: itemMacroNormalizado,
      ativo: true
    }, { transaction });

    return { ok: true, categoria };
  }

  return validarCategoriaAtiva(categoriaMacroId, { transaction });
}

function serializarHistoricoItem(item) {
  return {
    id: item.id,
    acao: item.acao,
    status_anterior: item.status_anterior,
    status_novo: item.status_novo,
    descricao: item.descricao,
    comentario: item.comentario,
    dados_antes_json: item.dados_antes_json,
    dados_depois_json: item.dados_depois_json,
    metadata_json: item.metadata_json,
    createdAt: item.createdAt,
    usuario: obterResumoUsuario(item.usuario)
  };
}

function aplicarEscopoObrasNoWhere(where, permissoes) {
  if (permissoes?.superadmin) {
    return true;
  }

  if (Array.isArray(permissoes?.obras_acesso) && permissoes.obras_acesso.length === 0) {
    return false;
  }

  if (Array.isArray(permissoes?.obras_acesso)) {
    where.obra_id = { [Op.in]: permissoes.obras_acesso };
  }

  return true;
}

async function listarCriadoresFiltro(permissoes) {
  const where = {};
  const possuiAcesso = aplicarEscopoObrasNoWhere(where, permissoes);
  if (!possuiAcesso) {
    return [];
  }

  const registros = await ProvisaoFinanceira.findAll({
    where,
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('usuario_criacao_id')), 'usuario_criacao_id']
    ],
    raw: true
  });

  const ids = registros
    .map((item) => parsePositiveInt(item?.usuario_criacao_id))
    .filter(Boolean);

  if (ids.length === 0) {
    return [];
  }

  const usuarios = await User.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'nome', 'email'],
    order: [['nome', 'ASC']]
  });

  return usuarios.map((usuario) => ({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email
  }));
}

async function construirConsultaListagem(req) {
  const permissoes = await obterPermissoes(req);
  const where = {};
  const obraId = parsePositiveInt(req.query?.obra_id);
  const categoriaId = parsePositiveInt(req.query?.categoria_macro_id);
  const usuarioCriacaoId = parsePositiveInt(req.query?.usuario_criacao_id);
  const status = serializarStatus(req.query?.status);
  const prioridade = serializarStatus(req.query?.prioridade);
  const busca = normalizarTexto(req.query?.busca);
  const fornecedor = normalizarTexto(req.query?.fornecedor);
  const dataInicial = normalizarTexto(req.query?.data_inicial);
  const dataFinal = normalizarTexto(req.query?.data_final);
  const valorMinimo = normalizarValorDecimal(req.query?.valor_minimo);
  const valorMaximo = normalizarValorDecimal(req.query?.valor_maximo);
  const sortBy = normalizarCampoOrdenacao(req.query?.sort_by);
  const sortDir = normalizarDirecaoOrdenacao(req.query?.sort_dir);

  const possuiAcesso = aplicarEscopoObrasNoWhere(where, permissoes);
  if (!possuiAcesso) {
    return {
      permissoes,
      where,
      vazio: true,
      order: [['data_prevista_desembolso', 'ASC'], ['createdAt', 'DESC']]
    };
  }

  if (obraId) {
    const acessoObra = await validarAcessoNaObra(req, obraId, 'acessar');
    if (!acessoObra.ok) {
      return {
        permissoes,
        erro: acessoObra.resposta
      };
    }

    where.obra_id = obraId;
  }

  if (categoriaId) {
    where.categoria_macro_id = categoriaId;
  }

  if (usuarioCriacaoId) {
    where.usuario_criacao_id = usuarioCriacaoId;
  }

  if (status) {
    if (!STATUS_PROVISAO_FINANCEIRA.includes(status)) {
      return {
        permissoes,
        erro: {
          status: 400,
          body: { error: 'Status invalido para o modulo.' }
        }
      };
    }
    where.status = status;
  }

  if (prioridade) {
    where.prioridade = prioridade;
  }

  if (dataInicial || dataFinal) {
    where.data_prevista_desembolso = {};
    if (dataInicial) {
      where.data_prevista_desembolso[Op.gte] = dataInicial;
    }
    if (dataFinal) {
      where.data_prevista_desembolso[Op.lte] = dataFinal;
    }
  }

  if (valorMinimo !== null || valorMaximo !== null) {
    where.valor_previsto = {};
    if (valorMinimo !== null) {
      where.valor_previsto[Op.gte] = valorMinimo;
    }
    if (valorMaximo !== null) {
      where.valor_previsto[Op.lte] = valorMaximo;
    }
  }

  const blocosBusca = [];
  if (busca) {
    blocosBusca.push(
      { codigo: { [Op.like]: `%${busca}%` } },
      { descricao: { [Op.like]: `%${busca}%` } },
      { fornecedor_texto: { [Op.like]: `%${busca}%` } }
    );
  }

  if (fornecedor) {
    blocosBusca.push({ fornecedor_texto: { [Op.like]: `%${fornecedor}%` } });
  }

  if (blocosBusca.length > 0) {
    where[Op.and] = [
      ...(Array.isArray(where[Op.and]) ? where[Op.and] : []),
      { [Op.or]: blocosBusca }
    ];
  }

  return {
    permissoes,
    where,
    vazio: false,
    order: [
      [sortBy, sortDir],
      ['createdAt', sortBy === 'createdAt' ? sortDir : 'DESC']
    ]
  };
}

function formatarDataCsv(valor) {
  if (!valor) return '';
  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return '';
  }

  return data.toLocaleString('pt-BR');
}

function escaparValorCsv(valor) {
  const texto = String(valor ?? '');
  if (!texto.includes(';') && !texto.includes('"') && !texto.includes('\n')) {
    return texto;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}

async function registrarHistoricoMudancaStatus({
  provisaoId,
  usuarioId,
  statusAnterior,
  statusNovo,
  acao,
  descricao,
  comentario,
  metadata,
  transaction
}) {
  await registrarHistoricoProvisionamento({
    provisao_financeira_id: provisaoId,
    usuario_id: usuarioId,
    acao: 'STATUS_ALTERADO',
    status_anterior: statusAnterior,
    status_novo: statusNovo,
    descricao: descricaoMudancaStatus(statusAnterior, statusNovo),
    comentario,
    metadata,
    transaction
  });

  return registrarHistoricoProvisionamento({
    provisao_financeira_id: provisaoId,
    usuario_id: usuarioId,
    acao,
    status_anterior: statusAnterior,
    status_novo: statusNovo,
    descricao,
    comentario,
    metadata,
    transaction
  });
}

module.exports = {
  STATUS_PROVISAO_FINANCEIRA,

  async contexto(req, res) {
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');

      const permissoes = await obterPermissoes(req);
      const [obrasAcesso, obrasCriacao, criadoresFiltro] = await Promise.all([
        listarObrasPorEscopo(permissoes?.obras_acesso),
        listarObrasPorEscopo(permissoes?.obras_criacao),
        listarCriadoresFiltro(permissoes)
      ]);

      return res.json({
        modulo: 'provisionamento-financeiro',
        permissoes,
        status_disponiveis: STATUS_PROVISAO_FINANCEIRA,
        prioridades_disponiveis: ['baixa', 'media', 'alta', 'critica'],
        obras_acesso: obrasAcesso,
        obras_criacao: obrasCriacao,
        criadores_filtro: criadoresFiltro
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao carregar contexto do modulo de provisionamento financeiro'
      });
    }
  },

  async index(req, res) {
    try {
      const page = parsePagina(req.query?.page, 1);
      const limit = Math.min(parsePagina(req.query?.limit, 20), MAX_LIMITE_LISTAGEM);
      const offset = (page - 1) * limit;
      const consulta = await construirConsultaListagem(req);
      if (consulta?.erro) {
        return res.status(consulta.erro.status).json(consulta.erro.body);
      }

      if (consulta?.vazio) {
        return res.json({
          items: [],
          meta: { page, limit, total: 0, pages: 0 },
          resumo: {
            total_registros_filtrados: 0,
            valor_total_filtrado: 0
          }
        });
      }

      const { rows, count } = await ProvisaoFinanceira.findAndCountAll({
        where: consulta.where,
        include: obterIncludesLista(),
        order: consulta.order,
        limit,
        offset,
        distinct: true
      });
      const somaValores = await ProvisaoFinanceira.sum('valor_previsto', {
        where: consulta.where
      });

      return res.json({
        items: rows,
        meta: {
          page,
          limit,
          total: count,
          pages: count > 0 ? Math.ceil(count / limit) : 0
        },
        resumo: {
          total_registros_filtrados: count,
          valor_total_filtrado: Number(somaValores || 0)
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar provisoes financeiras' });
    }
  },

  async exportarCsv(req, res) {
    try {
      const consulta = await construirConsultaListagem(req);
      if (consulta?.erro) {
        return res.status(consulta.erro.status).json(consulta.erro.body);
      }

      const itens = consulta?.vazio
        ? []
        : await ProvisaoFinanceira.findAll({
            where: consulta.where,
            include: obterIncludesLista(),
            order: consulta.order
          });

      const cabecalho = [
        'Codigo',
        'Obra',
        'Data prevista',
        'Item Macro',
        'Descricao',
        'Fornecedor',
        'Valor previsto',
        'Status',
        'Prioridade',
        'Criador',
        'Data de criacao'
      ];

      const linhas = itens.map((item) => ([
        item.codigo,
        item.obra ? `${item.obra.codigo ? `${item.obra.codigo} - ` : ''}${item.obra.nome}` : '',
        formatarDataCsv(item.data_prevista_desembolso),
        item.categoriaMacro?.nome || '',
        item.descricao || '',
        item.fornecedor_texto || '',
        Number(item.valor_previsto || 0).toFixed(2).replace('.', ','),
        item.status || '',
        item.prioridade || '',
        item.usuarioCriacao?.nome || '',
        formatarDataCsv(item.createdAt)
      ]));

      const csv = [
        cabecalho,
        ...linhas
      ]
        .map((colunas) => colunas.map(escaparValorCsv).join(';'))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="provisoes-financeiras-${new Date().toISOString().slice(0, 10)}.csv"`
      );

      return res.send(`\uFEFF${csv}`);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao exportar provisoes financeiras' });
    }
  },

  async show(req, res) {
    try {
      const id = parsePositiveInt(req.params?.id);
      if (!id) {
        return res.status(400).json({ error: 'Identificador invalido.' });
      }

      const provisao = await carregarProvisaoDetalhada(id);
      if (!provisao) {
        return res.status(404).json({ error: 'Provisao financeira nao encontrada.' });
      }

      const acesso = await validarAcessoNaObra(req, provisao.obra_id, 'acessar');
      if (!acesso.ok) {
        return res.status(acesso.resposta.status).json(acesso.resposta.body);
      }

      return res.json(provisao);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar provisao financeira' });
    }
  },

  async create(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const dados = normalizarDadosProvisionamento(req.body);

      if (!dados.obra_id || !dados.descricao || !dados.data_prevista_desembolso || (!dados.item_macro && !dados.categoria_macro_id)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Obra, item macro, descricao e data prevista sao obrigatorios.' });
      }

      if (dados.valor_previsto === null || dados.valor_previsto <= 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Informe um valor previsto maior que zero.' });
      }

      if (!STATUS_PROVISAO_FINANCEIRA.includes(dados.status)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Status invalido para o modulo.' });
      }

      const acesso = await validarAcessoNaObra(req, dados.obra_id, 'criar');
      if (!acesso.ok) {
        await transaction.rollback();
        return res.status(acesso.resposta.status).json(acesso.resposta.body);
      }

      const validacaoCategoria = await resolverCategoriaMacroProvisionamento({
        categoriaMacroId: dados.categoria_macro_id,
        itemMacro: dados.item_macro,
        transaction
      });
      if (!validacaoCategoria.ok) {
        await transaction.rollback();
        return res.status(400).json({ error: validacaoCategoria.error });
      }

      const codigo = await gerarCodigoProvisionamentoFinanceiro({
        obraId: dados.obra_id,
        transaction
      });

      const provisao = await ProvisaoFinanceira.create({
        obra_id: dados.obra_id,
        categoria_macro_id: validacaoCategoria.categoria.id,
        descricao: dados.descricao,
        fornecedor_id: dados.fornecedor_id,
        fornecedor_texto: dados.fornecedor_texto,
        data_prevista_desembolso: dados.data_prevista_desembolso,
        valor_previsto: dados.valor_previsto,
        comentario: dados.comentario,
        status: dados.status,
        prioridade: dados.prioridade,
        codigo,
        usuario_criacao_id: req.user.id,
        usuario_atualizacao_id: req.user.id
      }, { transaction });

      await registrarHistoricoProvisionamento({
        provisao_financeira_id: provisao.id,
        usuario_id: req.user.id,
        acao: 'CRIADA',
        status_novo: provisao.status,
        descricao: 'Provisao financeira criada.',
        dados_depois: provisao.toJSON(),
        transaction
      });

      await transaction.commit();

      const provisaoCompleta = await carregarProvisaoDetalhada(provisao.id);
      return res.status(201).json(provisaoCompleta);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: error.message || 'Erro ao criar provisao financeira' });
    }
  },

  async update(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const id = parsePositiveInt(req.params?.id);
      if (!id) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Identificador invalido.' });
      }

      const provisao = await ProvisaoFinanceira.findByPk(id, { transaction });
      if (!provisao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Provisao financeira nao encontrada.' });
      }

      const permissoes = await obterPermissoes(req);
      if (!permissoes?.superadmin) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Somente SUPERADMIN pode editar registros de provisionamento financeiro.' });
      }

      if (['aprovado', 'cancelado', 'realizado'].includes(String(provisao.status || '').toLowerCase())) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Esta provisao nao pode mais ser editada nesta etapa.' });
      }

      const dados = normalizarDadosProvisionamento({
        ...provisao.toJSON(),
        ...req.body,
        obra_id: provisao.obra_id,
        codigo: provisao.codigo
      });

      if (!dados.descricao || !dados.data_prevista_desembolso || (!dados.item_macro && !dados.categoria_macro_id)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Item macro, descricao e data prevista sao obrigatorios.' });
      }

      if (dados.valor_previsto === null || dados.valor_previsto <= 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Informe um valor previsto maior que zero.' });
      }

      if (!STATUS_PROVISAO_FINANCEIRA.includes(dados.status) || !validarStatusEdicao(provisao.status, dados.status)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Transicao de status invalida para esta etapa.' });
      }

      const validacaoCategoria = await resolverCategoriaMacroProvisionamento({
        categoriaMacroId: dados.categoria_macro_id,
        itemMacro: dados.item_macro,
        transaction
      });
      if (!validacaoCategoria.ok) {
        await transaction.rollback();
        return res.status(400).json({ error: validacaoCategoria.error });
      }

      const antes = provisao.toJSON();

      await provisao.update({
        categoria_macro_id: validacaoCategoria.categoria.id,
        descricao: dados.descricao,
        fornecedor_id: dados.fornecedor_id,
        fornecedor_texto: dados.fornecedor_texto,
        data_prevista_desembolso: dados.data_prevista_desembolso,
        valor_previsto: dados.valor_previsto,
        comentario: dados.comentario,
        prioridade: dados.prioridade,
        usuario_atualizacao_id: req.user.id
      }, { transaction });

      await registrarHistoricoProvisionamento({
        provisao_financeira_id: provisao.id,
        usuario_id: req.user.id,
        acao: 'EDITADA',
        status_anterior: antes.status,
        status_novo: provisao.status,
        descricao: 'Provisao financeira atualizada.',
        dados_antes: antes,
        dados_depois: provisao.toJSON(),
        transaction
      });

      if (String(antes.data_prevista_desembolso || '') !== String(provisao.data_prevista_desembolso || '')) {
        await registrarHistoricoProvisionamento({
          provisao_financeira_id: provisao.id,
          usuario_id: req.user.id,
          acao: 'DATA_ALTERADA',
          descricao: 'Data prevista de desembolso alterada.',
          metadata: {
            anterior: antes.data_prevista_desembolso,
            novo: provisao.data_prevista_desembolso
          },
          transaction
        });
      }

      if (Number(antes.valor_previsto || 0) !== Number(provisao.valor_previsto || 0)) {
        await registrarHistoricoProvisionamento({
          provisao_financeira_id: provisao.id,
          usuario_id: req.user.id,
          acao: 'VALOR_ALTERADO',
          descricao: 'Valor previsto alterado.',
          metadata: {
            anterior: antes.valor_previsto,
            novo: provisao.valor_previsto
          },
          transaction
        });
      }

      await transaction.commit();

      const provisaoCompleta = await carregarProvisaoDetalhada(provisao.id);
      return res.json(provisaoCompleta);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: error.message || 'Erro ao atualizar provisao financeira' });
    }
  },

  async alterarStatus(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const id = parsePositiveInt(req.params?.id);
      const statusNovo = serializarStatus(req.body?.status);
      const comentario = normalizarTexto(req.body?.comentario);

      if (!id) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Identificador invalido.' });
      }

      if (!['previsto', 'em_analise'].includes(statusNovo)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Status invalido para alteracao manual.' });
      }

      const provisao = await ProvisaoFinanceira.findByPk(id, { transaction });
      if (!provisao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Provisao financeira nao encontrada.' });
      }

      const acesso = await validarAcessoParaGerenciarStatus(req, provisao.obra_id);
      if (!acesso.ok) {
        await transaction.rollback();
        return res.status(acesso.resposta.status).json(acesso.resposta.body);
      }

      const statusAtual = serializarStatus(provisao.status);
      if (['cancelado', 'realizado', 'aprovado'].includes(statusAtual)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Nao e possivel alterar manualmente o status desta provisao.' });
      }

      if (statusAtual === statusNovo) {
        await transaction.rollback();
        const provisaoCompleta = await carregarProvisaoDetalhada(provisao.id);
        return res.json(provisaoCompleta);
      }

      if (!validarStatusEdicao(statusAtual, statusNovo)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Transicao de status invalida para alteracao manual.' });
      }

      await provisao.update({
        status: statusNovo,
        usuario_atualizacao_id: req.user.id
      }, { transaction });

      await registrarHistoricoMudancaStatus({
        provisaoId: provisao.id,
        usuarioId: req.user.id,
        statusAnterior: statusAtual,
        statusNovo,
        acao: 'STATUS_ALTERADO_MANUAL',
        descricao: 'Status alterado manualmente.',
        comentario,
        metadata: {
          origem: 'acao-status'
        },
        transaction
      });

      await transaction.commit();
      const provisaoCompleta = await carregarProvisaoDetalhada(provisao.id);
      return res.json(provisaoCompleta);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: error.message || 'Erro ao alterar status da provisao financeira' });
    }
  },

  async historico(req, res) {
    try {
      const id = parsePositiveInt(req.params?.id);
      const provisao = await ProvisaoFinanceira.findByPk(id, { attributes: ['id', 'obra_id'] });
      if (!provisao) {
        return res.status(404).json({ error: 'Provisao financeira nao encontrada.' });
      }

      const acesso = await validarAcessoNaObra(req, provisao.obra_id, 'acessar');
      if (!acesso.ok) {
        return res.status(acesso.resposta.status).json(acesso.resposta.body);
      }

      const historicos = await ProvisaoFinanceiraHistorico.findAll({
        where: { provisao_financeira_id: id },
        include: [
          {
            model: User,
            as: 'usuario',
            attributes: ['id', 'nome', 'email', 'perfil']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json(historicos.map(serializarHistoricoItem));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar historico da provisao financeira' });
    }
  },

  async adicionarComentario(req, res) {
    try {
      const id = parsePositiveInt(req.params?.id);
      const comentario = normalizarTexto(req.body?.comentario);

      if (!comentario) {
        return res.status(400).json({ error: 'Informe o comentario.' });
      }

      const provisao = await ProvisaoFinanceira.findByPk(id, { attributes: ['id', 'obra_id', 'status'] });
      if (!provisao) {
        return res.status(404).json({ error: 'Provisao financeira nao encontrada.' });
      }

      const acesso = await validarAcessoNaObra(req, provisao.obra_id, 'acessar');
      if (!acesso.ok) {
        return res.status(acesso.resposta.status).json(acesso.resposta.body);
      }

      const historico = await registrarHistoricoProvisionamento({
        provisao_financeira_id: provisao.id,
        usuario_id: req.user.id,
        acao: 'COMENTARIO_ADICIONADO',
        status_novo: provisao.status,
        descricao: 'Comentario registrado na provisao financeira.',
        comentario,
        metadata: { origem: 'detalhe' }
      });

      return res.status(201).json(serializarHistoricoItem(historico));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao adicionar comentario' });
    }
  },

  async uploadAnexos(req, res) {
    try {
      const id = parsePositiveInt(req.params?.id);
      const provisao = await ProvisaoFinanceira.findByPk(id, { attributes: ['id', 'obra_id', 'codigo', 'status'] });
      if (!provisao) {
        return res.status(404).json({ error: 'Provisao financeira nao encontrada.' });
      }

      const acesso = await validarAcessoNaObra(req, provisao.obra_id, 'criar');
      if (!acesso.ok) {
        return res.status(acesso.resposta.status).json(acesso.resposta.body);
      }

      if (!Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const anexos = [];
      for (const file of req.files) {
        const nomeOriginal = normalizeOriginalName(file.originalname);
        const url = await uploadToS3(file, `provisoes-financeiras/${provisao.codigo}`);

        const anexo = await ProvisaoFinanceiraAnexo.create({
          provisao_financeira_id: provisao.id,
          nome_original: nomeOriginal,
          caminho_arquivo: url,
          uploaded_by: req.user.id,
          area_origem: req.user?.setor_id ? String(req.user.setor_id) : null
        });

        await registrarHistoricoProvisionamento({
          provisao_financeira_id: provisao.id,
          usuario_id: req.user.id,
          acao: 'ANEXO_ADICIONADO',
          status_novo: provisao.status,
          descricao: nomeOriginal,
          metadata: {
            anexo_id: anexo.id,
            caminho_arquivo: anexo.caminho_arquivo
          }
        });

        anexos.push(anexo);
      }

      return res.status(201).json(anexos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao enviar anexos da provisao financeira' });
    }
  },

  async listarAnexos(req, res) {
    try {
      const id = parsePositiveInt(req.params?.id);
      const provisao = await ProvisaoFinanceira.findByPk(id, { attributes: ['id', 'obra_id'] });
      if (!provisao) {
        return res.status(404).json({ error: 'Provisao financeira nao encontrada.' });
      }

      const acesso = await validarAcessoNaObra(req, provisao.obra_id, 'acessar');
      if (!acesso.ok) {
        return res.status(acesso.resposta.status).json(acesso.resposta.body);
      }

      const anexos = await ProvisaoFinanceiraAnexo.findAll({
        where: { provisao_financeira_id: id },
        include: [
          {
            model: User,
            as: 'uploadUser',
            attributes: ['id', 'nome', 'email', 'perfil']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json(anexos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar anexos da provisao financeira' });
    }
  },

  async presignAnexo(req, res) {
    try {
      const alvo = req.query?.url || req.query?.key;
      if (!alvo) {
        return res.status(400).json({ error: 'url obrigatoria' });
      }

      const url = await getPresignedUrl(alvo);
      return res.json({ url });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar URL assinada do anexo' });
    }
  },

  async aprovar(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const id = parsePositiveInt(req.params?.id);
      const comentario = normalizarTexto(req.body?.comentario);
      if (!id) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Identificador invalido.' });
      }

      const provisao = await ProvisaoFinanceira.findByPk(id, { transaction });
      if (!provisao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Provisao financeira nao encontrada.' });
      }

      const acesso = await validarAcessoNaObra(req, provisao.obra_id, 'aprovar');
      if (!acesso.ok) {
        await transaction.rollback();
        return res.status(acesso.resposta.status).json(acesso.resposta.body);
      }

      if (serializarStatus(provisao.status) !== 'em_analise') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Somente provisoes em analise podem ser aprovadas.' });
      }

      const statusAnterior = provisao.status;
      await provisao.update({
        status: 'aprovado',
        aprovado_por_id: req.user.id,
        aprovado_em: new Date(),
        usuario_atualizacao_id: req.user.id
      }, { transaction });

      await registrarHistoricoMudancaStatus({
        provisaoId: provisao.id,
        usuarioId: req.user.id,
        statusAnterior,
        statusNovo: provisao.status,
        acao: 'APROVADA',
        descricao: 'Provisao financeira aprovada.',
        comentario,
        metadata: {
          origem: 'aprovacao'
        },
        transaction
      });

      await transaction.commit();
      const provisaoCompleta = await carregarProvisaoDetalhada(provisao.id);
      return res.json(provisaoCompleta);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: error.message || 'Erro ao aprovar provisao financeira' });
    }
  },

  async cancelar(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const id = parsePositiveInt(req.params?.id);
      const comentario = normalizarTexto(req.body?.comentario);
      if (!id) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Identificador invalido.' });
      }

      const provisao = await ProvisaoFinanceira.findByPk(id, { transaction });
      if (!provisao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Provisao financeira nao encontrada.' });
      }

      const permissoes = await obterPermissoes(req);
      const acesso = await validarAcessoNaObra(req, provisao.obra_id, 'aprovar');
      if (!acesso.ok) {
        await transaction.rollback();
        return res.status(acesso.resposta.status).json(acesso.resposta.body);
      }

      const statusAtual = serializarStatus(provisao.status);
      if (statusAtual === 'cancelado') {
        await transaction.rollback();
        return res.status(400).json({ error: 'A provisao ja esta cancelada.' });
      }

      if (statusAtual === 'realizado') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Provisoes realizadas nao podem ser canceladas.' });
      }

      if (statusAtual === 'aprovado' && !permissoes?.superadmin) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas SUPERADMIN pode cancelar provisoes aprovadas.' });
      }

      if (!comentario) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Informe o motivo do cancelamento.' });
      }

      const statusAnterior = provisao.status;
      await provisao.update({
        status: 'cancelado',
        cancelado_por_id: req.user.id,
        cancelado_em: new Date(),
        usuario_atualizacao_id: req.user.id
      }, { transaction });

      await registrarHistoricoMudancaStatus({
        provisaoId: provisao.id,
        usuarioId: req.user.id,
        statusAnterior,
        statusNovo: provisao.status,
        acao: 'CANCELADA',
        descricao: 'Provisao financeira cancelada.',
        comentario,
        metadata: {
          origem: 'cancelamento'
        },
        transaction
      });

      await transaction.commit();
      const provisaoCompleta = await carregarProvisaoDetalhada(provisao.id);
      return res.json(provisaoCompleta);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: error.message || 'Erro ao cancelar provisao financeira' });
    }
  },

  async realizar(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const id = parsePositiveInt(req.params?.id);
      const comentario = normalizarTexto(req.body?.comentario);
      if (!id) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Identificador invalido.' });
      }

      const provisao = await ProvisaoFinanceira.findByPk(id, { transaction });
      if (!provisao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Provisao financeira nao encontrada.' });
      }

      const acesso = await validarAcessoNaObra(req, provisao.obra_id, 'aprovar');
      if (!acesso.ok) {
        await transaction.rollback();
        return res.status(acesso.resposta.status).json(acesso.resposta.body);
      }

      if (serializarStatus(provisao.status) !== 'aprovado') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Somente provisoes aprovadas podem ser marcadas como realizadas.' });
      }

      const statusAnterior = provisao.status;
      await provisao.update({
        status: 'realizado',
        realizado_em: new Date(),
        usuario_atualizacao_id: req.user.id
      }, { transaction });

      await registrarHistoricoMudancaStatus({
        provisaoId: provisao.id,
        usuarioId: req.user.id,
        statusAnterior,
        statusNovo: provisao.status,
        acao: 'REALIZADA',
        descricao: 'Provisao financeira marcada como realizada.',
        comentario,
        metadata: {
          origem: 'realizacao'
        },
        transaction
      });

      await transaction.commit();
      const provisaoCompleta = await carregarProvisaoDetalhada(provisao.id);
      return res.json(provisaoCompleta);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: error.message || 'Erro ao realizar provisao financeira' });
    }
  }
};
