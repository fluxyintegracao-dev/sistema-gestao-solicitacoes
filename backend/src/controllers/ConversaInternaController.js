const { Op } = require('sequelize');
const {
  ConversaInterna,
  ConversaInternaMensagem,
  ConversaInternaAnexo,
  ConversaInternaParticipante,
  ConversaInternaArquivoUsuario,
  User,
  Setor
} = require('../models');
const { uploadToS3 } = require('../services/s3');
const { normalizeOriginalName } = require('../utils/fileName');

const JANELA_EDICAO_MS = 5 * 60 * 1000;
const MSG_PAGE_SIZE = 50;

function normalizarTexto(valor) {
  return String(valor || '').trim();
}

function extrairIdsNumericos(lista) {
  const valores = Array.isArray(lista)
    ? lista
    : String(lista || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  return [...new Set(
    valores
      .map((item) => Number(item))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
}

function parseBoolean(valor) {
  const texto = String(valor || '').trim().toLowerCase();
  return texto === '1' || texto === 'true' || texto === 'sim';
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const incluirCriador = {
  model: User,
  as: 'criador',
  attributes: ['id', 'nome', 'setor_id'],
  include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }]
};

const incluirDestinatario = {
  model: User,
  as: 'destinatario',
  attributes: ['id', 'nome', 'setor_id'],
  include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }]
};

function resumirUsuarioConversa(usuario) {
  if (!usuario) return null;
  return {
    id: usuario.id,
    nome: usuario.nome,
    setor_id: usuario.setor_id ?? null,
    setor: usuario.setor
      ? {
          id: usuario.setor.id,
          nome: usuario.setor.nome,
          codigo: usuario.setor.codigo
        }
      : null
  };
}

async function podeVisualizarConversa(req, conversaId) {
  const conversa = await ConversaInterna.findByPk(conversaId);
  if (!conversa) return { conversa: null, permitido: false };

  const usuarioId = Number(req.user?.id);
  if (
    Number(conversa.criado_por_id) === usuarioId ||
    Number(conversa.destinatario_id) === usuarioId
  ) {
    return { conversa, permitido: true };
  }

  const participacao = await ConversaInternaParticipante.findOne({
    where: { conversa_id: conversa.id, usuario_id: usuarioId },
    attributes: ['id']
  });
  return { conversa, permitido: !!participacao };
}

async function criarParticipantes(conversaId, usuarioIds, adicionadoPorId) {
  const idsValidos = [...new Set(
    (Array.isArray(usuarioIds) ? usuarioIds : [])
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
  )];
  if (idsValidos.length === 0) return;

  await ConversaInternaParticipante.bulkCreate(
    idsValidos.map((usuarioId) => ({
      conversa_id: conversaId,
      usuario_id: usuarioId,
      adicionado_por_id: adicionadoPorId
    })),
    { ignoreDuplicates: true }
  );
}

async function salvarAnexosMensagem({ conversaId, mensagemId, files }) {
  if (!Array.isArray(files) || files.length === 0) return;

  const anexos = [];
  for (const file of files) {
    const nomeArquivo = normalizeOriginalName(file.originalname);
    const caminho = await uploadToS3(file, `anexos/conversas/${conversaId}`);
    anexos.push({
      conversa_id: conversaId,
      mensagem_id: mensagemId,
      nome_arquivo: nomeArquivo,
      caminho,
      mime_type: file.mimetype || null,
      tamanho_bytes: Number(file.size || 0) || null
    });
  }

  if (anexos.length > 0) {
    await ConversaInternaAnexo.bulkCreate(anexos);
  }
}

async function atualizarUltimaMensagem(conversaId, mensagem, autor) {
  const preview = `${autor ? autor + ': ' : ''}${mensagem}`.substring(0, 200);
  await ConversaInterna.update(
    {
      last_message_at: new Date(),
      last_message_preview: preview,
      updatedAt: new Date()
    },
    { where: { id: conversaId } }
  );
}

async function filtrarPorArquivamento(conversas, usuarioId, somenteArquivadas) {
  if (!Array.isArray(conversas) || conversas.length === 0) return [];
  const conversaIds = conversas.map((item) => item.id);
  const arquivadas = await ConversaInternaArquivoUsuario.findAll({
    where: { usuario_id: usuarioId, conversa_id: { [Op.in]: conversaIds } },
    attributes: ['conversa_id']
  });
  const setArquivadas = new Set(arquivadas.map((item) => Number(item.conversa_id)));
  return conversas.filter((item) => {
    const estaArquivada = setArquivadas.has(Number(item.id));
    return somenteArquivadas ? estaArquivada : !estaArquivada;
  });
}

async function criarConversaIndividual({ criadorId, destinatarioId, assunto, mensagemInicial, files, nomeAutor }) {
  const conversa = await ConversaInterna.create({
    assunto,
    criado_por_id: criadorId,
    destinatario_id: destinatarioId,
    is_group: false,
    status: 'ABERTA',
    last_message_at: new Date(),
    last_message_preview: (mensagemInicial || '[Anexo]').substring(0, 200)
  });

  await criarParticipantes(conversa.id, [criadorId, destinatarioId], criadorId);

  const primeiraMensagem = await ConversaInternaMensagem.create({
    conversa_id: conversa.id,
    usuario_id: criadorId,
    mensagem: mensagemInicial || '[Anexo enviado]'
  });

  await salvarAnexosMensagem({ conversaId: conversa.id, mensagemId: primeiraMensagem.id, files });

  return conversa;
}

async function obterOuCriarGrupoSetor({ setorId, assunto, criadorId }) {
  let conversa = await ConversaInterna.findOne({
    where: { is_group: true, setor_id: setorId, status: 'ABERTA' }
  });

  if (!conversa) {
    const setor = await Setor.findByPk(setorId, { attributes: ['id', 'nome'] });
    conversa = await ConversaInterna.create({
      assunto: assunto || (setor ? `Grupo: ${setor.nome}` : `Grupo Setor ${setorId}`),
      criado_por_id: criadorId,
      destinatario_id: null,
      is_group: true,
      setor_id: setorId,
      status: 'ABERTA',
      last_message_at: new Date(),
      last_message_preview: null
    });
  }

  // Sincroniza participantes do setor
  const membros = await User.findAll({
    where: { ativo: true, setor_id: setorId },
    attributes: ['id']
  });
  const ids = membros.map((u) => u.id);
  if (!ids.includes(criadorId)) ids.push(criadorId);
  await criarParticipantes(conversa.id, ids, criadorId);

  return conversa;
}

module.exports = {
  async listar(req, res) {
    try {
      const usuarioId = Number(req.user.id);
      const somenteArquivadas = parseBoolean(req.query?.arquivadas);
      const page = parsePositiveInt(req.query?.page, 1);
      const limit = Math.min(parsePositiveInt(req.query?.limit, 30), 100);
      const offset = (page - 1) * limit;

      // lida_em pode não existir antes da migration — busca tudo e trata undefined
      const participacoes = await ConversaInternaParticipante.findAll({
        where: { usuario_id: usuarioId },
        attributes: ['conversa_id', 'lida_em']
      });

      const lidaEmMap = new Map(
        participacoes.map((p) => [Number(p.conversa_id), p.lida_em ?? null])
      );
      const idsParticipacao = [...lidaEmMap.keys()];
      const arquivadas = await ConversaInternaArquivoUsuario.findAll({
        where: { usuario_id: usuarioId },
        attributes: ['conversa_id']
      });
      const idsArquivadas = arquivadas.map((item) => Number(item.conversa_id)).filter(Boolean);

      const whereBase = {
        [Op.or]: [
          { criado_por_id: usuarioId },
          { destinatario_id: usuarioId },
          idsParticipacao.length > 0 ? { id: { [Op.in]: idsParticipacao } } : null
        ].filter(Boolean)
      };

      if (somenteArquivadas) {
        whereBase.id = idsArquivadas.length > 0 ? { [Op.in]: idsArquivadas } : { [Op.eq]: -1 };
      } else if (idsArquivadas.length > 0) {
        whereBase.id = { [Op.notIn]: idsArquivadas };
      }

      // last_message_at pode não existir antes da migration — fallback para updatedAt
      const pagina = await ConversaInterna.findAndCountAll({
        where: whereBase,
        attributes: ['id', 'last_message_at', 'updatedAt'],
        order: [['last_message_at', 'DESC'], ['updatedAt', 'DESC'], ['id', 'DESC']],
        limit,
        offset
      });

      const total = pagina.count;
      const idsPagina = pagina.rows.map((c) => Number(c.id));

      if (idsPagina.length === 0) {
        return res.json({ items: [], meta: { page, limit, total, total_pages: Math.ceil(total / limit) || 0 } });
      }

      const includesExtra = [];
      try {
        // setorGrupo só existe após migration — tenta incluir, ignora erro
        includesExtra.push({ model: Setor, as: 'setorGrupo', attributes: ['id', 'nome', 'codigo'] });
      } catch { /* ignorar */ }

      const conversas = await ConversaInterna.findAll({
        where: { id: { [Op.in]: idsPagina } },
        attributes: [
          'id',
          'assunto',
          'criado_por_id',
          'destinatario_id',
          'is_group',
          'setor_id',
          'status',
          'last_message_at',
          'last_message_preview',
          'createdAt',
          'updatedAt'
        ],
        include: [
          incluirCriador,
          incluirDestinatario,
          { model: Setor, as: 'setorGrupo', attributes: ['id', 'nome', 'codigo'] }
        ]
      });

      conversas.sort((a, b) => {
        const da = new Date(a.last_message_at || a.updatedAt || 0);
        const db = new Date(b.last_message_at || b.updatedAt || 0);
        return db - da;
      });

      const items = conversas.map((c) => {
        const lidaEm = lidaEmMap.get(Number(c.id));
        const lastAt = c.last_message_at || null;
        const temNovidade = lastAt && (!lidaEm || new Date(lastAt) > new Date(lidaEm));
        return {
          id: c.id,
          assunto: c.assunto,
          status: c.status,
          is_group: c.is_group ?? false,
          setor_id: c.setor_id ?? null,
          last_message_at: lastAt || c.updatedAt,
          last_message_preview: c.last_message_preview ?? null,
          tem_novidade: !!temNovidade,
          createdAt: c.createdAt,
          criador: resumirUsuarioConversa(c.criador),
          destinatario: resumirUsuarioConversa(c.destinatario),
          setor_grupo: c.setorGrupo ? { id: c.setorGrupo.id, nome: c.setorGrupo.nome } : null
        };
      });

      return res.json({ items, meta: { page, limit, total, total_pages: Math.ceil(total / limit) || 0 } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar conversas' });
    }
  },

  async resumo(req, res) {
    try {
      const usuarioId = Number(req.user.id);

      const participacoes = await ConversaInternaParticipante.findAll({
        where: { usuario_id: usuarioId },
        attributes: ['conversa_id', 'lida_em']
      });

      const idsParticipacao = participacoes.map((p) => p.conversa_id);
      const lidaEmMap = new Map(participacoes.map((p) => [Number(p.conversa_id), p.lida_em ?? null]));

      const conversas = await ConversaInterna.findAll({
        where: {
          status: 'ABERTA',
          [Op.or]: [
            { criado_por_id: usuarioId },
            { destinatario_id: usuarioId },
            idsParticipacao.length > 0 ? { id: { [Op.in]: idsParticipacao } } : null
          ].filter(Boolean)
        },
        attributes: ['id', 'last_message_at', 'updatedAt', 'criado_por_id']
      });

      const nao_lidas = conversas.filter((c) => {
        const lastAt = c.last_message_at || c.updatedAt;
        if (!lastAt) return false;
        const lidaEm = lidaEmMap.get(Number(c.id));
        return !lidaEm || new Date(lastAt) > new Date(lidaEm);
      }).length;

      return res.json({ nao_lidas, entrada_nao_vistas: nao_lidas, saida_nao_vistas: 0 });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar resumo' });
    }
  },

  // Mantido para compatibilidade com clientes antigos
  async entrada(req, res) {
    return module.exports.listar(req, res);
  },

  async saida(req, res) {
    return module.exports.listar(req, res);
  },

  async opcoesDestinatario(req, res) {
    try {
      const setorId = Number(req.query?.setor_id || 0);
      const where = { ativo: true, id: { [Op.ne]: req.user.id } };
      if (setorId > 0) where.setor_id = setorId;

      const usuarios = await User.findAll({
        where,
        attributes: ['id', 'nome', 'email', 'setor_id'],
        include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }],
        order: [['nome', 'ASC']]
      });

      return res.json(usuarios);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar destinatarios' });
    }
  },

  async criar(req, res) {
    try {
      const assunto = normalizarTexto(req.body?.assunto);
      const mensagemInicial = normalizarTexto(req.body?.mensagem);
      const destinatarioId = Number(req.body?.destinatario_id || 0);

      if (!assunto) return res.status(400).json({ error: 'Assunto obrigatorio' });
      if (!mensagemInicial && (!Array.isArray(req.files) || req.files.length === 0)) {
        return res.status(400).json({ error: 'Mensagem ou anexo obrigatorio' });
      }
      if (!destinatarioId || destinatarioId === Number(req.user.id)) {
        return res.status(400).json({ error: 'Destinatario invalido' });
      }

      const destinatario = await User.findOne({ where: { id: destinatarioId, ativo: true }, attributes: ['id', 'nome'] });
      if (!destinatario) return res.status(404).json({ error: 'Destinatario nao encontrado' });

      const remetente = await User.findByPk(req.user.id, { attributes: ['nome'] });

      const conversa = await criarConversaIndividual({
        criadorId: req.user.id,
        destinatarioId,
        assunto,
        mensagemInicial,
        files: req.files,
        nomeAutor: remetente?.nome
      });

      return res.status(201).json({ id: conversa.id });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar conversa' });
    }
  },

  async criarEmMassa(req, res) {
    try {
      const assunto = normalizarTexto(req.body?.assunto);
      const mensagemInicial = normalizarTexto(req.body?.mensagem);
      const destinatariosIds = extrairIdsNumericos(
        req.body?.destinatarios_ids || req.body?.['destinatarios_ids[]']
      );
      const setoresIds = extrairIdsNumericos(
        req.body?.setores_ids || req.body?.['setores_ids[]']
      );

      if (!assunto) return res.status(400).json({ error: 'Assunto obrigatorio' });
      if (!mensagemInicial && (!Array.isArray(req.files) || req.files.length === 0)) {
        return res.status(400).json({ error: 'Mensagem ou anexo obrigatorio' });
      }
      if (destinatariosIds.length === 0 && setoresIds.length === 0) {
        return res.status(400).json({ error: 'Selecione ao menos um destinatario ou setor.' });
      }

      const remetente = await User.findByPk(req.user.id, { attributes: ['nome'] });
      const criadorId = Number(req.user.id);
      const conversasCriadas = [];

      // Grupos por setor: um grupo por setor, reutilizando se ja existir
      for (const setorId of setoresIds) {
        const grupo = await obterOuCriarGrupoSetor({ setorId, assunto, criadorId });

        const nova = await ConversaInternaMensagem.create({
          conversa_id: grupo.id,
          usuario_id: criadorId,
          mensagem: mensagemInicial || '[Anexo enviado]'
        });

        await salvarAnexosMensagem({ conversaId: grupo.id, mensagemId: nova.id, files: req.files });
        await atualizarUltimaMensagem(grupo.id, nova.mensagem, remetente?.nome);
        conversasCriadas.push({ id: grupo.id, tipo: 'grupo', setor_id: setorId });
      }

      // Conversas individuais para destinatarios diretos
      const usuariosValidos = destinatariosIds.filter((id) => id !== criadorId);
      for (const usuarioId of usuariosValidos) {
        const destinatario = await User.findOne({ where: { id: usuarioId, ativo: true }, attributes: ['id'] });
        if (!destinatario) continue;

        const conversa = await criarConversaIndividual({
          criadorId,
          destinatarioId: usuarioId,
          assunto,
          mensagemInicial,
          files: req.files,
          nomeAutor: remetente?.nome
        });
        conversasCriadas.push({ id: conversa.id, tipo: 'individual' });
      }

      if (conversasCriadas.length === 0) {
        return res.status(400).json({ error: 'Nenhuma conversa criada. Verifique os destinatarios.' });
      }

      return res.status(201).json({
        total: conversasCriadas.length,
        ids: conversasCriadas.map((c) => c.id),
        conversas: conversasCriadas
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar conversas em massa' });
    }
  },

  async detalhar(req, res) {
    try {
      const id = Number(req.params?.id || 0);
      const { conversa, permitido } = await podeVisualizarConversa(req, id);

      if (!conversa) return res.status(404).json({ error: 'Conversa nao encontrada' });
      if (!permitido) return res.status(403).json({ error: 'Acesso negado a conversa' });

      const [conversaCompleta, participantes] = await Promise.all([
        ConversaInterna.findByPk(id, {
          include: [
            { ...incluirCriador, include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }] },
            { ...incluirDestinatario, include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }] },
            { model: User, as: 'concluidaPor', attributes: ['id', 'nome'] },
            { model: Setor, as: 'setorGrupo', attributes: ['id', 'nome', 'codigo'] }
          ]
        }),
        ConversaInternaParticipante.findAll({
          where: { conversa_id: id },
          include: [{
            model: User,
            as: 'usuario',
            attributes: ['id', 'nome', 'setor_id'],
            include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }]
          }],
          order: [['createdAt', 'ASC']]
        })
      ]);

      return res.json({
        conversa: {
          id: conversaCompleta.id,
          assunto: conversaCompleta.assunto,
          status: conversaCompleta.status,
          is_group: conversaCompleta.is_group,
          setor_id: conversaCompleta.setor_id,
          criado_por_id: conversaCompleta.criado_por_id,
          destinatario_id: conversaCompleta.destinatario_id,
          last_message_at: conversaCompleta.last_message_at,
          concluida_em: conversaCompleta.concluida_em,
          createdAt: conversaCompleta.createdAt,
          criador: conversaCompleta.criador,
          destinatario: conversaCompleta.destinatario,
          setor_grupo: conversaCompleta.setorGrupo,
          concluidaPor: conversaCompleta.concluidaPor
        },
        participantes: participantes.map((p) => ({
          id: p.id,
          usuario_id: p.usuario_id,
          usuario: p.usuario
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao detalhar conversa' });
    }
  },

  // GET /conversas-internas/:id/mensagens?before_id=&limit=50
  async listarMensagens(req, res) {
    try {
      const id = Number(req.params?.id || 0);
      const { conversa, permitido } = await podeVisualizarConversa(req, id);

      if (!conversa) return res.status(404).json({ error: 'Conversa nao encontrada' });
      if (!permitido) return res.status(403).json({ error: 'Acesso negado a conversa' });

      const limit = Math.min(parsePositiveInt(req.query?.limit, MSG_PAGE_SIZE), 100);
      const beforeId = Number(req.query?.before_id || 0);
      const afterId = Number(req.query?.after_id || 0);

      const where = { conversa_id: id };
      if (afterId > 0) {
        where.id = { [Op.gt]: afterId };
      } else if (beforeId > 0) {
        where.id = { [Op.lt]: beforeId };
      }

      const mensagens = await ConversaInternaMensagem.findAll({
        where,
        include: [
          {
            model: User,
            as: 'autor',
            attributes: ['id', 'nome', 'setor_id'],
            include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }]
          }
        ],
        order: afterId > 0 ? [['id', 'ASC']] : [['id', 'DESC']],
        limit
      });

      const mensagensOrdenadas = afterId > 0 ? mensagens : [...mensagens].reverse();
      const ids = mensagensOrdenadas.map((m) => m.id);

      const anexos = ids.length > 0
        ? await ConversaInternaAnexo.findAll({
            where: { mensagem_id: { [Op.in]: ids } },
            attributes: ['id', 'mensagem_id', 'nome_arquivo', 'caminho', 'mime_type', 'tamanho_bytes', 'createdAt']
          })
        : [];

      const anexosPorMensagem = {};
      for (const a of anexos) {
        if (!anexosPorMensagem[a.mensagem_id]) anexosPorMensagem[a.mensagem_id] = [];
        anexosPorMensagem[a.mensagem_id].push(a);
      }

      const usuarioId = Number(req.user.id);
      const agora = Date.now();

      const resultado = mensagensOrdenadas.map((m) => {
        const podeEditar =
          m.usuario_id === usuarioId &&
          (agora - new Date(m.createdAt).getTime()) <= JANELA_EDICAO_MS;
        return {
          id: m.id,
          conversa_id: m.conversa_id,
          usuario_id: m.usuario_id,
          mensagem: m.mensagem,
          createdAt: m.createdAt,
          editada_em: m.editada_em,
          pode_editar: !!podeEditar,
          autor: m.autor,
          anexos: anexosPorMensagem[m.id] || []
        };
      });

      const temMais = mensagens.length === limit;
      const oldestId = resultado.length > 0 ? resultado[0].id : null;
      const newestId = resultado.length > 0 ? resultado[resultado.length - 1].id : null;

      return res.json({ mensagens: resultado, tem_mais: temMais, oldest_id: oldestId, newest_id: newestId });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar mensagens' });
    }
  },

  async marcarLida(req, res) {
    try {
      const id = Number(req.params?.id || 0);
      const usuarioId = Number(req.user.id);
      const { conversa, permitido } = await podeVisualizarConversa(req, id);

      if (!conversa) return res.status(404).json({ error: 'Conversa nao encontrada' });
      if (!permitido) return res.status(403).json({ error: 'Acesso negado a conversa' });

      const agora = new Date();
      const [participacao, created] = await ConversaInternaParticipante.findOrCreate({
        where: { conversa_id: id, usuario_id: usuarioId },
        defaults: {
          conversa_id: id,
          usuario_id: usuarioId,
          adicionado_por_id: conversa.criado_por_id,
          lida_em: agora
        }
      });

      if (!created) {
        await participacao.update({ lida_em: agora });
      }

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao marcar como lida' });
    }
  },

  async responder(req, res) {
    try {
      const id = Number(req.params?.id || 0);
      const { conversa, permitido } = await podeVisualizarConversa(req, id);

      if (!conversa) return res.status(404).json({ error: 'Conversa nao encontrada' });
      if (!permitido) return res.status(403).json({ error: 'Acesso negado a conversa' });
      if (conversa.status === 'CONCLUIDA') {
        await conversa.update({ status: 'ABERTA', concluida_por_id: null, concluida_em: null });
      }

      const mensagem = normalizarTexto(req.body?.mensagem);
      if (!mensagem && (!Array.isArray(req.files) || req.files.length === 0)) {
        return res.status(400).json({ error: 'Mensagem ou anexo obrigatorio' });
      }

      const remetente = await User.findByPk(req.user.id, { attributes: ['nome'] });

      const nova = await ConversaInternaMensagem.create({
        conversa_id: id,
        usuario_id: req.user.id,
        mensagem: mensagem || '[Anexo enviado]'
      });

      await salvarAnexosMensagem({ conversaId: id, mensagemId: nova.id, files: req.files });
      await atualizarUltimaMensagem(id, nova.mensagem, remetente?.nome);

      // Marca própria leitura
      await ConversaInternaParticipante.update(
        { lida_em: new Date() },
        { where: { conversa_id: id, usuario_id: req.user.id } }
      );

      return res.status(201).json({
        id: nova.id,
        mensagem: nova.mensagem,
        createdAt: nova.createdAt,
        usuario_id: nova.usuario_id
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
  },

  async editarMensagem(req, res) {
    try {
      const mensagemId = Number(req.params?.mensagemId || 0);
      const novoTexto = normalizarTexto(req.body?.mensagem);

      if (!novoTexto) return res.status(400).json({ error: 'Mensagem obrigatoria' });

      const mensagem = await ConversaInternaMensagem.findByPk(mensagemId);
      if (!mensagem) return res.status(404).json({ error: 'Mensagem nao encontrada' });

      const { conversa, permitido } = await podeVisualizarConversa(req, mensagem.conversa_id);
      if (!conversa || !permitido) return res.status(403).json({ error: 'Acesso negado a mensagem' });
      if (mensagem.usuario_id !== Number(req.user.id)) {
        return res.status(403).json({ error: 'Apenas o autor pode editar a mensagem' });
      }

      const tempoPassado = Date.now() - new Date(mensagem.createdAt).getTime();
      if (tempoPassado > JANELA_EDICAO_MS) {
        return res.status(400).json({ error: 'Prazo de edicao expirado (maximo 5 minutos).' });
      }

      mensagem.mensagem = novoTexto;
      mensagem.editada_em = new Date();
      await mensagem.save();

      return res.json({ id: mensagem.id, mensagem: mensagem.mensagem, editada_em: mensagem.editada_em });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao editar mensagem' });
    }
  },

  async adicionarParticipantes(req, res) {
    try {
      const id = Number(req.params?.id || 0);
      const { conversa, permitido } = await podeVisualizarConversa(req, id);

      if (!conversa) return res.status(404).json({ error: 'Conversa nao encontrada' });
      if (!permitido) return res.status(403).json({ error: 'Acesso negado a conversa' });
      if (String(conversa.status || '').toUpperCase() !== 'ABERTA') {
        return res.status(400).json({ error: 'So e permitido adicionar participantes em conversas abertas.' });
      }
      if (Number(req.user.id) !== Number(conversa.criado_por_id)) {
        return res.status(403).json({ error: 'Apenas o criador pode adicionar participantes' });
      }

      const usuarioIds = extrairIdsNumericos(req.body?.usuario_ids);
      if (usuarioIds.length === 0) return res.status(400).json({ error: 'Informe ao menos um usuario' });

      const usuariosValidos = await User.findAll({
        where: { id: { [Op.in]: usuarioIds }, ativo: true },
        attributes: ['id']
      });
      const idsValidos = usuariosValidos.map((u) => u.id);
      if (idsValidos.length === 0) return res.status(400).json({ error: 'Nenhum usuario valido' });

      await criarParticipantes(id, idsValidos, req.user.id);
      await ConversaInterna.update({ updatedAt: new Date() }, { where: { id } });

      return res.json({ adicionados: idsValidos.length });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao adicionar participantes' });
    }
  },

  async arquivarMassa(req, res) {
    try {
      const conversaIds = extrairIdsNumericos(req.body?.conversa_ids);
      if (conversaIds.length === 0) return res.status(400).json({ error: 'Informe ao menos uma conversa' });

      for (const conversaId of conversaIds) {
        const { conversa, permitido } = await podeVisualizarConversa(req, conversaId);
        if (!conversa || !permitido) continue;
        await ConversaInternaArquivoUsuario.findOrCreate({
          where: { conversa_id: conversaId, usuario_id: req.user.id },
          defaults: { arquivada_em: new Date() }
        });
      }

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao arquivar conversas' });
    }
  },

  async desarquivarMassa(req, res) {
    try {
      const conversaIds = extrairIdsNumericos(req.body?.conversa_ids);
      if (conversaIds.length === 0) return res.status(400).json({ error: 'Informe ao menos uma conversa' });

      await ConversaInternaArquivoUsuario.destroy({
        where: { usuario_id: req.user.id, conversa_id: { [Op.in]: conversaIds } }
      });

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao desarquivar conversas' });
    }
  },

  async concluir(req, res) {
    try {
      const id = Number(req.params?.id || 0);
      const conversa = await ConversaInterna.findByPk(id);
      if (!conversa) return res.status(404).json({ error: 'Conversa nao encontrada' });
      if (conversa.criado_por_id !== Number(req.user.id)) {
        return res.status(403).json({ error: 'Apenas o criador pode concluir a conversa' });
      }

      await conversa.update({ status: 'CONCLUIDA', concluida_por_id: req.user.id, concluida_em: new Date() });
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao concluir conversa' });
    }
  },

  async reabrir(req, res) {
    try {
      const id = Number(req.params?.id || 0);
      const conversa = await ConversaInterna.findByPk(id);
      if (!conversa) return res.status(404).json({ error: 'Conversa nao encontrada' });
      if (conversa.criado_por_id !== Number(req.user.id)) {
        return res.status(403).json({ error: 'Apenas o criador pode reabrir a conversa' });
      }

      await conversa.update({ status: 'ABERTA', concluida_por_id: null, concluida_em: null });
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao reabrir conversa' });
    }
  }
};
