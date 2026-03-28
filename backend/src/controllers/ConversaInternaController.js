const { Op, fn, col } = require('sequelize');
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
const DEFAULT_CONVERSAS_PAGE_SIZE = 20;
const MAX_CONVERSAS_PAGE_SIZE = 100;

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

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

async function garantirParticipantesBasicos(conversa) {
  const ids = [conversa.criado_por_id, conversa.destinatario_id]
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0);
  for (const usuarioId of ids) {
    await ConversaInternaParticipante.findOrCreate({
      where: { conversa_id: conversa.id, usuario_id: usuarioId },
      defaults: { adicionado_por_id: conversa.criado_por_id }
    });
  }
}

async function criarParticipantes(conversaId, usuarioIds, adicionadoPorId) {
  for (const usuarioId of usuarioIds) {
    await ConversaInternaParticipante.findOrCreate({
      where: { conversa_id: conversaId, usuario_id: usuarioId },
      defaults: { adicionado_por_id: adicionadoPorId }
    });
  }
}

async function salvarAnexosMensagem({ conversaId, mensagemId, files }) {
  if (!Array.isArray(files) || files.length === 0) return;

  for (const file of files) {
    const nomeArquivo = normalizeOriginalName(file.originalname);
    const caminho = await uploadToS3(file, `anexos/conversas/${conversaId}`);
    await ConversaInternaAnexo.create({
      conversa_id: conversaId,
      mensagem_id: mensagemId,
      nome_arquivo: nomeArquivo,
      caminho,
      mime_type: file.mimetype || null,
      tamanho_bytes: Number(file.size || 0) || null
    });
  }
}

async function podeVisualizarConversa(req, conversaId) {
  const conversa = await ConversaInterna.findByPk(conversaId);
  if (!conversa) {
    return { conversa: null, permitido: false };
  }

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

  const permitido = !!participacao;
  return { conversa, permitido };
}

function serializarUsuarioConversa(usuario) {
  if (!usuario) return null;
  return {
    id: usuario.id,
    nome: usuario.nome,
    setor: usuario.setor
      ? {
          id: usuario.setor.id,
          nome: usuario.setor.nome,
          codigo: usuario.setor.codigo
        }
      : null
  };
}

async function montarResumosConversas(conversas) {
  if (!Array.isArray(conversas) || conversas.length === 0) return [];

  const conversaIds = conversas.map((item) => Number(item.id)).filter(Boolean);
  const ordemConversas = new Map(conversaIds.map((id, index) => [id, index]));

  const [mensagens, anexosAgrupados, participantesAgrupados] = await Promise.all([
    ConversaInternaMensagem.findAll({
      where: { conversa_id: { [Op.in]: conversaIds } },
      include: [
        {
          model: User,
          as: 'autor',
          attributes: ['id', 'nome']
        }
      ],
      order: [
        ['conversa_id', 'ASC'],
        ['createdAt', 'DESC']
      ]
    }),
    ConversaInternaAnexo.findAll({
      where: { conversa_id: { [Op.in]: conversaIds } },
      attributes: [
        'conversa_id',
        [fn('COUNT', col('id')), 'total']
      ],
      group: ['conversa_id']
    }),
    ConversaInternaParticipante.findAll({
      where: { conversa_id: { [Op.in]: conversaIds } },
      attributes: [
        'conversa_id',
        [fn('COUNT', col('id')), 'total']
      ],
      group: ['conversa_id']
    })
  ]);

  const ultimaMensagemPorConversa = new Map();
  mensagens.forEach((mensagem) => {
    const conversaId = Number(mensagem.conversa_id);
    if (!ultimaMensagemPorConversa.has(conversaId)) {
      ultimaMensagemPorConversa.set(conversaId, mensagem);
    }
  });

  const anexosTotalPorConversa = new Map(
    anexosAgrupados.map((item) => [Number(item.conversa_id), Number(item.get('total') || 0)])
  );
  const participantesTotalPorConversa = new Map(
    participantesAgrupados.map((item) => [Number(item.conversa_id), Number(item.get('total') || 0)])
  );

  return conversas
    .map((conversa) => {
      const ultimaMensagem = ultimaMensagemPorConversa.get(Number(conversa.id)) || null;
      return {
        id: conversa.id,
        assunto: conversa.assunto,
        status: conversa.status,
        createdAt: conversa.createdAt,
        updatedAt: conversa.updatedAt,
        criador: serializarUsuarioConversa(conversa.criador),
        destinatario: serializarUsuarioConversa(conversa.destinatario),
        ultima_mensagem: ultimaMensagem
          ? {
              id: ultimaMensagem.id,
              mensagem: ultimaMensagem.mensagem,
              autor: ultimaMensagem.autor
                ? { id: ultimaMensagem.autor.id, nome: ultimaMensagem.autor.nome }
                : null,
              createdAt: ultimaMensagem.createdAt,
              editada_em: ultimaMensagem.editada_em
            }
          : null,
        anexos_total: anexosTotalPorConversa.get(Number(conversa.id)) || 0,
        participantes_total: participantesTotalPorConversa.get(Number(conversa.id)) || 0
      };
    })
    .sort(
      (a, b) =>
        (ordemConversas.get(Number(a.id)) || 0) -
        (ordemConversas.get(Number(b.id)) || 0)
    );
}

async function listarConversasPaginadas({
  somenteArquivadas,
  usuarioId,
  page,
  limit,
  where
}) {
  const paginacaoSolicitada = page !== undefined || limit !== undefined;
  const paginaAtual = parsePositiveInt(page, 1);
  const limitePorPagina = Math.min(
    parsePositiveInt(limit, DEFAULT_CONVERSAS_PAGE_SIZE),
    MAX_CONVERSAS_PAGE_SIZE
  );

  const conversasBase = await ConversaInterna.findAll({
    where,
    attributes: ['id', 'updatedAt'],
    order: [['updatedAt', 'DESC']]
  });
  const conversasFiltradas = await filtrarPorArquivamento(
    conversasBase,
    Number(usuarioId),
    somenteArquivadas
  );
  const total = conversasFiltradas.length;
  const offset = (paginaAtual - 1) * limitePorPagina;
  const idsPagina = (paginacaoSolicitada
    ? conversasFiltradas.slice(offset, offset + limitePorPagina)
    : conversasFiltradas
  ).map((item) => Number(item.id));

  if (idsPagina.length === 0) {
    if (!paginacaoSolicitada) {
      return [];
    }
    return {
      items: [],
      meta: {
        page: paginaAtual,
        limit: limitePorPagina,
        total,
        total_pages: total > 0 ? Math.ceil(total / limitePorPagina) : 0
      }
    };
  }

  const ordemPagina = new Map(idsPagina.map((id, index) => [id, index]));
  const conversas = await ConversaInterna.findAll({
    where: { id: { [Op.in]: idsPagina } },
    include: [
      {
        model: User,
        as: 'criador',
        attributes: ['id', 'nome', 'setor_id'],
        include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }]
      },
      {
        model: User,
        as: 'destinatario',
        attributes: ['id', 'nome', 'setor_id'],
        include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }]
      }
    ]
  });

  const itens = await montarResumosConversas(conversas);
  itens.sort(
    (a, b) =>
      (ordemPagina.get(Number(a.id)) || 0) -
      (ordemPagina.get(Number(b.id)) || 0)
  );

  if (!paginacaoSolicitada) {
    return itens;
  }

  return {
    items: itens,
    meta: {
      page: paginaAtual,
      limit: limitePorPagina,
      total,
      total_pages: total > 0 ? Math.ceil(total / limitePorPagina) : 0
    }
  };
}

async function criarConversaIndividual({ criadorId, destinatarioId, assunto, mensagemInicial, files }) {
  const conversa = await ConversaInterna.create({
    assunto,
    criado_por_id: criadorId,
    destinatario_id: destinatarioId,
    status: 'ABERTA'
  });

  await criarParticipantes(conversa.id, [criadorId, destinatarioId], criadorId);

  const primeiraMensagem = await ConversaInternaMensagem.create({
    conversa_id: conversa.id,
    usuario_id: criadorId,
    mensagem: mensagemInicial || '[Anexo enviado]'
  });

  await salvarAnexosMensagem({
    conversaId: conversa.id,
    mensagemId: primeiraMensagem.id,
    files
  });

  return conversa;
}

function parseBoolean(valor) {
  const texto = String(valor || '').trim().toLowerCase();
  return texto === '1' || texto === 'true' || texto === 'sim';
}

async function filtrarPorArquivamento(conversas, usuarioId, somenteArquivadas) {
  if (!Array.isArray(conversas) || conversas.length === 0) return [];
  const conversaIds = conversas.map((item) => item.id);
  const arquivadas = await ConversaInternaArquivoUsuario.findAll({
    where: {
      usuario_id: usuarioId,
      conversa_id: { [Op.in]: conversaIds }
    },
    attributes: ['conversa_id']
  });
  const setArquivadas = new Set(arquivadas.map((item) => Number(item.conversa_id)));
  return conversas.filter((item) => {
    const estaArquivada = setArquivadas.has(Number(item.id));
    return somenteArquivadas ? estaArquivada : !estaArquivada;
  });
}

module.exports = {
  async opcoesDestinatario(req, res) {
    try {
      const setorId = Number(req.query?.setor_id || 0);
      const where = {
        ativo: true,
        id: { [Op.ne]: req.user.id }
      };

      if (setorId > 0) {
        where.setor_id = setorId;
      }

      const usuarios = await User.findAll({
        where,
        attributes: ['id', 'nome', 'email', 'setor_id'],
        include: [
          {
            model: Setor,
            as: 'setor',
            attributes: ['id', 'nome', 'codigo']
          }
        ],
        order: [['nome', 'ASC']]
      });

      return res.json(usuarios);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar destinatarios' });
    }
  },

  async entrada(req, res) {
    try {
      const somenteArquivadas = parseBoolean(req.query?.arquivadas);
      const participacoes = await ConversaInternaParticipante.findAll({
        where: { usuario_id: req.user.id },
        attributes: ['conversa_id']
      });
      const idsParticipacao = participacoes.map((item) => item.conversa_id);

      const resultado = await listarConversasPaginadas({
        somenteArquivadas,
        usuarioId: req.user.id,
        page: req.query?.page,
        limit: req.query?.limit,
        where: {
          [Op.and]: [
            { criado_por_id: { [Op.ne]: req.user.id } },
            {
              [Op.or]: [
                { destinatario_id: req.user.id },
                idsParticipacao.length > 0 ? { id: { [Op.in]: idsParticipacao } } : null
              ].filter(Boolean)
            }
          ]
        }
      });

      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar caixa de entrada' });
    }
  },

  async saida(req, res) {
    try {
      const somenteArquivadas = parseBoolean(req.query?.arquivadas);
      const resultado = await listarConversasPaginadas({
        somenteArquivadas,
        usuarioId: req.user.id,
        page: req.query?.page,
        limit: req.query?.limit,
        where: { criado_por_id: req.user.id }
      });
      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar caixa de saida' });
    }
  },

  async criar(req, res) {
    try {
      const assunto = normalizarTexto(req.body?.assunto);
      const mensagemInicial = normalizarTexto(req.body?.mensagem);
      const destinatarioId = Number(req.body?.destinatario_id || 0);

      if (!assunto) {
        return res.status(400).json({ error: 'Assunto obrigatorio' });
      }

      if (!mensagemInicial && (!Array.isArray(req.files) || req.files.length === 0)) {
        return res.status(400).json({ error: 'Mensagem ou anexo obrigatorio' });
      }

      if (!destinatarioId || destinatarioId === Number(req.user.id)) {
        return res.status(400).json({ error: 'Destinatario invalido' });
      }

      const destinatario = await User.findOne({
        where: { id: destinatarioId, ativo: true },
        attributes: ['id']
      });

      if (!destinatario) {
        return res.status(404).json({ error: 'Destinatario nao encontrado' });
      }

      const conversa = await criarConversaIndividual({
        criadorId: req.user.id,
        destinatarioId,
        assunto,
        mensagemInicial,
        files: req.files
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

      if (!assunto) {
        return res.status(400).json({ error: 'Assunto obrigatorio' });
      }

      if (!mensagemInicial && (!Array.isArray(req.files) || req.files.length === 0)) {
        return res.status(400).json({ error: 'Mensagem ou anexo obrigatorio' });
      }

      const usuarios = new Set(destinatariosIds);
      if (setoresIds.length > 0) {
        const usuariosSetor = await User.findAll({
          where: {
            ativo: true,
            setor_id: { [Op.in]: setoresIds },
            id: { [Op.ne]: req.user.id }
          },
          attributes: ['id']
        });
        usuariosSetor.forEach((item) => usuarios.add(item.id));
      }

      usuarios.delete(Number(req.user.id));
      const usuariosFinal = [...usuarios];
      if (usuariosFinal.length === 0) {
        return res.status(400).json({ error: 'Selecione ao menos um destinatario ou setor com usuarios ativos.' });
      }

      const conversasCriadas = [];
      for (const usuarioId of usuariosFinal) {
        const conversa = await criarConversaIndividual({
          criadorId: req.user.id,
          destinatarioId: usuarioId,
          assunto,
          mensagemInicial,
          files: req.files
        });
        conversasCriadas.push(conversa.id);
      }

      return res.status(201).json({
        total: conversasCriadas.length,
        ids: conversasCriadas
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

      if (!conversa) {
        return res.status(404).json({ error: 'Conversa nao encontrada' });
      }

      if (!permitido) {
        return res.status(403).json({ error: 'Acesso negado a conversa' });
      }

      const conversaCompleta = await ConversaInterna.findByPk(id, {
        include: [
          {
            model: User,
            as: 'criador',
            attributes: ['id', 'nome', 'email', 'setor_id'],
            include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }]
          },
          {
            model: User,
            as: 'destinatario',
            attributes: ['id', 'nome', 'email', 'setor_id'],
            include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }]
          },
          {
            model: User,
            as: 'concluidaPor',
            attributes: ['id', 'nome']
          }
        ]
      });

      const mensagens = await ConversaInternaMensagem.findAll({
        where: { conversa_id: id },
        include: [
          {
            model: User,
            as: 'autor',
            attributes: ['id', 'nome', 'email', 'setor_id'],
            include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }]
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      const participantes = await ConversaInternaParticipante.findAll({
        where: { conversa_id: id },
        include: [
          {
            model: User,
            as: 'usuario',
            attributes: ['id', 'nome', 'email', 'setor_id'],
            include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'] }]
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      const anexos = await ConversaInternaAnexo.findAll({
        where: { conversa_id: id },
        attributes: ['id', 'mensagem_id', 'nome_arquivo', 'caminho', 'mime_type', 'tamanho_bytes', 'createdAt'],
        order: [['createdAt', 'ASC']]
      });

      const anexosPorMensagem = anexos.reduce((acc, item) => {
        if (!acc[item.mensagem_id]) {
          acc[item.mensagem_id] = [];
        }
        acc[item.mensagem_id].push({
          id: item.id,
          nome_arquivo: item.nome_arquivo,
          caminho: item.caminho,
          mime_type: item.mime_type,
          tamanho_bytes: item.tamanho_bytes,
          createdAt: item.createdAt
        });
        return acc;
      }, {});

      const agora = Date.now();
      const usuarioId = Number(req.user.id);

      return res.json({
        conversa: {
          id: conversaCompleta.id,
          assunto: conversaCompleta.assunto,
          status: conversaCompleta.status,
          criado_por_id: conversaCompleta.criado_por_id,
          destinatario_id: conversaCompleta.destinatario_id,
          concluida_por_id: conversaCompleta.concluida_por_id,
          concluida_em: conversaCompleta.concluida_em,
          createdAt: conversaCompleta.createdAt,
          updatedAt: conversaCompleta.updatedAt,
          criador: conversaCompleta.criador,
          destinatario: conversaCompleta.destinatario,
          concluidaPor: conversaCompleta.concluidaPor
        },
        participantes: participantes.map((item) => ({
          id: item.id,
          usuario_id: item.usuario_id,
          createdAt: item.createdAt,
          usuario: item.usuario
        })),
        mensagens: mensagens.map(item => {
          const podeEditar =
            item.usuario_id === usuarioId &&
            (agora - new Date(item.createdAt).getTime()) <= JANELA_EDICAO_MS;
          return {
            id: item.id,
            conversa_id: item.conversa_id,
            usuario_id: item.usuario_id,
            mensagem: item.mensagem,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            editada_em: item.editada_em,
            pode_editar: !!podeEditar,
            autor: item.autor,
            anexos: anexosPorMensagem[item.id] || []
          };
        })
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao detalhar conversa' });
    }
  },

  async responder(req, res) {
    try {
      const id = Number(req.params?.id || 0);
      const { conversa, permitido } = await podeVisualizarConversa(req, id);

      if (!conversa) {
        return res.status(404).json({ error: 'Conversa nao encontrada' });
      }

      if (!permitido) {
        return res.status(403).json({ error: 'Acesso negado a conversa' });
      }

      if (conversa.status === 'CONCLUIDA') {
        return res.status(400).json({ error: 'Conversa concluida. Reabra para enviar nova mensagem.' });
      }

      const mensagem = normalizarTexto(req.body?.mensagem);
      if (!mensagem && (!Array.isArray(req.files) || req.files.length === 0)) {
        return res.status(400).json({ error: 'Mensagem ou anexo obrigatorio' });
      }

      const nova = await ConversaInternaMensagem.create({
        conversa_id: id,
        usuario_id: req.user.id,
        mensagem: mensagem || '[Anexo enviado]'
      });

      await salvarAnexosMensagem({
        conversaId: id,
        mensagemId: nova.id,
        files: req.files
      });

      await conversa.update({ updatedAt: new Date() });

      return res.status(201).json({
        id: nova.id,
        mensagem: nova.mensagem,
        createdAt: nova.createdAt
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

      if (!novoTexto) {
        return res.status(400).json({ error: 'Mensagem obrigatoria' });
      }

      const mensagem = await ConversaInternaMensagem.findByPk(mensagemId);
      if (!mensagem) {
        return res.status(404).json({ error: 'Mensagem nao encontrada' });
      }

      const { conversa, permitido } = await podeVisualizarConversa(req, mensagem.conversa_id);
      if (!conversa || !permitido) {
        return res.status(403).json({ error: 'Acesso negado a mensagem' });
      }

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

      await conversa.update({ updatedAt: new Date() });

      return res.json({
        id: mensagem.id,
        mensagem: mensagem.mensagem,
        editada_em: mensagem.editada_em
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao editar mensagem' });
    }
  },

  async adicionarParticipantes(req, res) {
    try {
      const id = Number(req.params?.id || 0);
      const { conversa, permitido } = await podeVisualizarConversa(req, id);

      if (!conversa) {
        return res.status(404).json({ error: 'Conversa nao encontrada' });
      }
      if (!permitido) {
        return res.status(403).json({ error: 'Acesso negado a conversa' });
      }

      if (String(conversa.status || '').toUpperCase() !== 'ABERTA') {
        return res.status(400).json({ error: 'So e permitido adicionar participantes em conversas abertas.' });
      }

      if (Number(req.user.id) !== Number(conversa.criado_por_id)) {
        return res.status(403).json({ error: 'Apenas o criador pode adicionar participantes' });
      }

      const usuarioIds = extrairIdsNumericos(req.body?.usuario_ids);
      if (usuarioIds.length === 0) {
        return res.status(400).json({ error: 'Informe ao menos um usuario' });
      }

      const usuariosValidos = await User.findAll({
        where: {
          id: { [Op.in]: usuarioIds },
          ativo: true
        },
        attributes: ['id']
      });
      const idsValidos = usuariosValidos.map((item) => item.id);
      if (idsValidos.length === 0) {
        return res.status(400).json({ error: 'Nenhum usuario valido para adicionar' });
      }

      await criarParticipantes(id, idsValidos, req.user.id);
      await conversa.update({ updatedAt: new Date() });

      return res.json({ adicionados: idsValidos.length });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao adicionar participantes' });
    }
  },

  async arquivarMassa(req, res) {
    try {
      const conversaIds = extrairIdsNumericos(req.body?.conversa_ids);
      if (conversaIds.length === 0) {
        return res.status(400).json({ error: 'Informe ao menos uma conversa para arquivar' });
      }

      for (const conversaId of conversaIds) {
        const { conversa, permitido } = await podeVisualizarConversa(req, conversaId);
        if (!conversa || !permitido) continue;

        await ConversaInternaArquivoUsuario.findOrCreate({
          where: {
            conversa_id: conversaId,
            usuario_id: req.user.id
          },
          defaults: {
            arquivada_em: new Date()
          }
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
      if (conversaIds.length === 0) {
        return res.status(400).json({ error: 'Informe ao menos uma conversa para desarquivar' });
      }

      await ConversaInternaArquivoUsuario.destroy({
        where: {
          usuario_id: req.user.id,
          conversa_id: { [Op.in]: conversaIds }
        }
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
      if (!conversa) {
        return res.status(404).json({ error: 'Conversa nao encontrada' });
      }

      if (conversa.criado_por_id !== Number(req.user.id)) {
        return res.status(403).json({ error: 'Apenas o criador pode concluir a conversa' });
      }

      await conversa.update({
        status: 'CONCLUIDA',
        concluida_por_id: req.user.id,
        concluida_em: new Date()
      });

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
      if (!conversa) {
        return res.status(404).json({ error: 'Conversa nao encontrada' });
      }

      if (conversa.criado_por_id !== Number(req.user.id)) {
        return res.status(403).json({ error: 'Apenas o criador pode reabrir a conversa' });
      }

      await conversa.update({
        status: 'ABERTA',
        concluida_por_id: null,
        concluida_em: null
      });

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao reabrir conversa' });
    }
  }
};
