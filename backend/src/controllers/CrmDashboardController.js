const { Op, fn, col, literal } = require('sequelize');
const {
  CrmLead,
  CrmAuditLog,
  CrmTask,
  CrmConversation,
  CrmAutomationExecution,
  CrmAutomationRule,
  CrmPipelineStage,
  User
} = require('../models');
const { responderErroController } = require('../utils/controllerError');

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function normalizeGroup(rows, keyName, labelFallback = 'Nao informado') {
  return rows.map((row) => ({
    chave: row[keyName] || labelFallback,
    total: toNumber(row.total)
  }));
}

function safeJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function mapCountByUser(rows) {
  return new Map(
    rows.map((row) => [Number(row.assigned_user_id), toNumber(row.total)])
  );
}

function buildNoActivityWhere(thresholdDate, extraWhere = {}) {
  const activityClause = {
    [Op.or]: [
      { ultima_interacao_at: { [Op.lte]: thresholdDate } },
      {
        ultima_interacao_at: null,
        createdAt: { [Op.lte]: thresholdDate }
      }
    ]
  };

  return {
    archived_at: null,
    lifecycle_status: { [Op.notIn]: ['PERDIDO', 'ARQUIVADO', 'CONVERTIDO'] },
    ...extraWhere,
    [Op.and]: [
      activityClause,
      ...(extraWhere[Op.and] || [])
    ]
  };
}

function buildNoActivityBucket(startDate, endDate) {
  const range = {};
  if (startDate) range[Op.gt] = startDate;
  if (endDate) range[Op.lte] = endDate;

  return {
    [Op.or]: [
      { ultima_interacao_at: range },
      {
        ultima_interacao_at: null,
        createdAt: range
      }
    ]
  };
}

module.exports = {
  async operacional(req, res) {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

      const activeWhere = { archived_at: null };

      // Totais gerais
      const [totalAtivos, totalHoje, totalSemana, totalConvertidos, totalPerdidos] = await Promise.all([
        CrmLead.count({ where: activeWhere }),
        CrmLead.count({ where: { ...activeWhere, createdAt: { [Op.gte]: startOfToday } } }),
        CrmLead.count({ where: { ...activeWhere, createdAt: { [Op.gte]: startOfWeek } } }),
        CrmLead.count({ where: { lifecycle_status: 'CONVERTIDO' } }),
        CrmLead.count({ where: { lifecycle_status: 'PERDIDO' } })
      ]);

      // Leads sem primeiro contato (SLA: em etapa inicial há mais de 60 min)
      const slaThreshold = new Date(now.getTime() - 60 * 60 * 1000);
      const semPrimeiroContato = await CrmLead.count({
        where: {
          archived_at: null,
          lifecycle_status: { [Op.in]: ['NOVO', 'CONTATO'] },
          primeiro_contato_at: null,
          createdAt: { [Op.lt]: slaThreshold }
        }
      });

      // Tarefas pendentes e vencidas
      const [tarefasPendentes, tarefasVencidas] = await Promise.all([
        CrmTask.count({ where: { status: 'PENDING' } }),
        CrmTask.count({
          where: { status: 'PENDING', due_at: { [Op.lt]: now, [Op.ne]: null } }
        })
      ]);

      // Distribuição por lifecycle_status
      const porLifecycle = await CrmLead.findAll({
        where: activeWhere,
        attributes: ['lifecycle_status', [fn('COUNT', col('id')), 'total']],
        group: ['lifecycle_status'],
        raw: true
      });

      // Backlog por responsavel (top 10)
      const backlogPorResponsavel = await CrmLead.findAll({
        where: { ...activeWhere, assigned_user_id: { [Op.ne]: null } },
        attributes: ['assigned_user_id', [fn('COUNT', col('CrmLead.id')), 'total']],
        include: [{ model: User, as: 'responsavel', attributes: ['id', 'nome'] }],
        group: ['assigned_user_id', 'responsavel.id', 'responsavel.nome'],
        order: [[literal('total'), 'DESC']],
        limit: 10,
        raw: false
      });

      // Conversoes ultimos 7 dias
      const seteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const conversoesRecentes = await CrmLead.count({
        where: { lifecycle_status: 'CONVERTIDO', convertido_at: { [Op.gte]: seteDiasAtras } }
      });

      return res.json({
        leads: {
          ativos: totalAtivos,
          hoje: totalHoje,
          semana: totalSemana,
          convertidos: totalConvertidos,
          perdidos: totalPerdidos,
          conversoesUltimos7Dias: conversoesRecentes
        },
        sla: {
          semPrimeiroContato
        },
        tarefas: {
          pendentes: tarefasPendentes,
          vencidas: tarefasVencidas
        },
        distribuicaoLifecycle: porLifecycle,
        backlogPorResponsavel: backlogPorResponsavel.map((r) => ({
          usuario: r.responsavel,
          total: parseInt(r.dataValues.total, 10)
        }))
      });
    } catch (error) {
      return responderErroController(res, error, 'Erro ao carregar dashboard operacional');
    }
  },

  async gerencial(req, res) {
    try {
      const now = new Date();
      const diasParam = Number(req.query?.dias || 30);
      const dias = Math.min(Math.max(Number.isFinite(diasParam) ? diasParam : 30, 1), 365);
      const inicio = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000);
      const slaThreshold = new Date(now.getTime() - 60 * 60 * 1000);

      const activeLeadWhere = { archived_at: null };
      const periodoWhere = { createdAt: { [Op.gte]: inicio } };

      const [
        leadsAtivos,
        leadsPeriodo,
        convertidosPeriodo,
        perdidosPeriodo,
        semPrimeiroContato,
        tarefasVencidas,
        conversasAbertas,
        mensagensNaoLidasRaw,
        automacoesAtivas
      ] = await Promise.all([
        CrmLead.count({ where: activeLeadWhere }),
        CrmLead.count({ where: periodoWhere }),
        CrmLead.count({ where: { lifecycle_status: 'CONVERTIDO', convertido_at: { [Op.gte]: inicio } } }),
        CrmLead.count({ where: { lifecycle_status: 'PERDIDO', updatedAt: { [Op.gte]: inicio } } }),
        CrmLead.count({
          where: {
            archived_at: null,
            lifecycle_status: { [Op.in]: ['NOVO', 'CONTATO'] },
            primeiro_contato_at: null,
            createdAt: { [Op.lt]: slaThreshold }
          }
        }),
        CrmTask.count({
          where: { status: 'PENDING', due_at: { [Op.lt]: now, [Op.ne]: null } }
        }),
        CrmConversation.count({ where: { status: { [Op.in]: ['OPEN', 'PENDING'] } } }),
        CrmConversation.sum('unread_count', { where: { status: { [Op.in]: ['OPEN', 'PENDING'] } } }),
        CrmAutomationRule.count({ where: { ativo: true } })
      ]);

      const [
        leadsPorOrigem,
        leadsPorResponsavel,
        conversasPorCanal,
        conversasPorStatus,
        automacoesPorGatilho
      ] = await Promise.all([
        CrmLead.findAll({
          where: periodoWhere,
          attributes: ['source_type', [fn('COUNT', col('id')), 'total']],
          group: ['source_type'],
          order: [[literal('total'), 'DESC']],
          raw: true
        }),
        CrmLead.findAll({
          where: { ...activeLeadWhere, assigned_user_id: { [Op.ne]: null } },
          attributes: ['assigned_user_id', [fn('COUNT', col('CrmLead.id')), 'total']],
          include: [{ model: User, as: 'responsavel', attributes: ['id', 'nome'] }],
          group: ['assigned_user_id', 'responsavel.id', 'responsavel.nome'],
          order: [[literal('total'), 'DESC']],
          limit: 10,
          raw: false
        }),
        CrmConversation.findAll({
          attributes: ['channel_type', [fn('COUNT', col('id')), 'total']],
          group: ['channel_type'],
          order: [[literal('total'), 'DESC']],
          raw: true
        }),
        CrmConversation.findAll({
          attributes: ['status', [fn('COUNT', col('id')), 'total']],
          group: ['status'],
          order: [[literal('total'), 'DESC']],
          raw: true
        }),
        CrmAutomationRule.findAll({
          attributes: ['trigger_type', [fn('COUNT', col('id')), 'total']],
          group: ['trigger_type'],
          order: [[literal('total'), 'DESC']],
          raw: true
        })
      ]);

      const taxaConversaoPeriodo = leadsPeriodo > 0
        ? Number(((convertidosPeriodo / leadsPeriodo) * 100).toFixed(2))
        : 0;

      return res.json({
        periodo: { dias, inicio, fim: now },
        kpis: {
          leadsAtivos,
          leadsPeriodo,
          convertidosPeriodo,
          perdidosPeriodo,
          taxaConversaoPeriodo,
          semPrimeiroContato,
          tarefasVencidas,
          conversasAbertas,
          mensagensNaoLidas: toNumber(mensagensNaoLidasRaw),
          automacoesAtivas
        },
        leadsPorOrigem: normalizeGroup(leadsPorOrigem, 'source_type'),
        leadsPorResponsavel: leadsPorResponsavel.map((row) => ({
          usuario: row.responsavel,
          total: toNumber(row.dataValues.total)
        })),
        conversasPorCanal: normalizeGroup(conversasPorCanal, 'channel_type'),
        conversasPorStatus: normalizeGroup(conversasPorStatus, 'status'),
        automacoesPorGatilho: normalizeGroup(automacoesPorGatilho, 'trigger_type')
      });
    } catch (error) {
      return responderErroController(res, error, 'Erro ao carregar dashboard gerencial');
    }
  },

  async sla(req, res) {
    try {
      const now = new Date();
      const firstContactMinutes = clampNumber(req.query?.first_contact_minutes, 60, 15, 1440);
      const noActivityHours = clampNumber(req.query?.no_activity_hours, 24, 1, 720);
      const recentDays = clampNumber(req.query?.recent_days, 7, 1, 90);

      const firstContactThreshold = new Date(now.getTime() - firstContactMinutes * 60 * 1000);
      const noActivityThreshold = new Date(now.getTime() - noActivityHours * 60 * 60 * 1000);
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentExecutionsThreshold = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000);

      const firstContactBaseWhere = {
        archived_at: null,
        lifecycle_status: { [Op.in]: ['NOVO', 'CONTATO'] },
        primeiro_contato_at: null,
        createdAt: { [Op.lte]: firstContactThreshold }
      };

      const noActivityBaseWhere = buildNoActivityWhere(noActivityThreshold);

      const [
        leadsSemPrimeiroContato,
        leadsSemAtividade,
        tarefasVencidas,
        tarefasCriticas,
        conversasAbertas,
        conversasPendentes,
        mensagensNaoLidas,
        regrasSlaAtivas,
        execucoesRecentes,
        execucoesRecentesErro,
        bucketPrimeiroContatoAte4h,
        bucketPrimeiroContato4a24h,
        bucketPrimeiroContatoMais24h,
        bucketSemAtividade24a48h,
        bucketSemAtividade2a7d,
        bucketSemAtividadeMais7d
      ] = await Promise.all([
        CrmLead.count({ where: firstContactBaseWhere }),
        CrmLead.count({ where: noActivityBaseWhere }),
        CrmTask.count({ where: { status: 'PENDING', due_at: { [Op.lt]: now, [Op.ne]: null } } }),
        CrmTask.count({ where: { status: 'PENDING', priority: 'HIGH', due_at: { [Op.lt]: now, [Op.ne]: null } } }),
        CrmConversation.count({ where: { status: 'OPEN' } }),
        CrmConversation.count({ where: { status: 'PENDING' } }),
        CrmConversation.sum('unread_count', { where: { status: { [Op.in]: ['OPEN', 'PENDING'] } } }),
        CrmAutomationRule.count({ where: { ativo: true, trigger_type: { [Op.in]: ['NO_FIRST_CONTACT', 'NO_ACTIVITY'] } } }),
        CrmAutomationExecution.count({ where: { createdAt: { [Op.gte]: recentExecutionsThreshold } } }),
        CrmAutomationExecution.count({ where: { createdAt: { [Op.gte]: recentExecutionsThreshold }, status: 'ERROR' } }),
        CrmLead.count({
          where: {
            ...firstContactBaseWhere,
            createdAt: { [Op.gt]: fourHoursAgo, [Op.lte]: firstContactThreshold }
          }
        }),
        CrmLead.count({
          where: {
            ...firstContactBaseWhere,
            createdAt: { [Op.lte]: fourHoursAgo, [Op.gt]: twentyFourHoursAgo }
          }
        }),
        CrmLead.count({
          where: {
            ...firstContactBaseWhere,
            createdAt: { [Op.lte]: twentyFourHoursAgo }
          }
        }),
        CrmLead.count({
          where: buildNoActivityWhere(noActivityThreshold, buildNoActivityBucket(fortyEightHoursAgo, noActivityThreshold))
        }),
        CrmLead.count({
          where: buildNoActivityWhere(noActivityThreshold, buildNoActivityBucket(sevenDaysAgo, fortyEightHoursAgo))
        }),
        CrmLead.count({
          where: buildNoActivityWhere(noActivityThreshold, buildNoActivityBucket(null, sevenDaysAgo))
        })
      ]);

      const [
        leadsPrimeiroContatoLista,
        leadsSemAtividadeLista,
        tarefasVencidasLista,
        conversasPendentesLista,
        backlogLeadsPorResponsavel,
        backlogTasksPorResponsavel,
        backlogConversationsPorResponsavel,
        execucoesPorStatus
      ] = await Promise.all([
        CrmLead.findAll({
          where: firstContactBaseWhere,
          include: [
            { model: User, as: 'responsavel', attributes: ['id', 'nome'] },
            { model: CrmPipelineStage, as: 'etapa', attributes: ['id', 'nome', 'cor'] }
          ],
          order: [['createdAt', 'ASC']],
          limit: 10
        }),
        CrmLead.findAll({
          where: noActivityBaseWhere,
          include: [
            { model: User, as: 'responsavel', attributes: ['id', 'nome'] },
            { model: CrmPipelineStage, as: 'etapa', attributes: ['id', 'nome', 'cor'] }
          ],
          order: [['createdAt', 'ASC']],
          limit: 30
        }),
        CrmTask.findAll({
          where: { status: 'PENDING', due_at: { [Op.lt]: now, [Op.ne]: null } },
          include: [
            { model: CrmLead, as: 'lead', attributes: ['id', 'nome', 'telefone', 'lifecycle_status'] },
            { model: User, as: 'responsavel', attributes: ['id', 'nome'] }
          ],
          order: [['due_at', 'ASC']],
          limit: 10
        }),
        CrmConversation.findAll({
          where: { status: { [Op.in]: ['OPEN', 'PENDING'] } },
          include: [
            { model: CrmLead, as: 'lead', attributes: ['id', 'nome', 'telefone', 'lifecycle_status'] },
            { model: User, as: 'responsavel', attributes: ['id', 'nome'] }
          ],
          order: [['unread_count', 'DESC'], ['last_message_at', 'ASC']],
          limit: 10
        }),
        CrmLead.findAll({
          where: { ...firstContactBaseWhere, assigned_user_id: { [Op.ne]: null } },
          attributes: ['assigned_user_id', [fn('COUNT', col('CrmLead.id')), 'total']],
          group: ['assigned_user_id'],
          raw: true
        }),
        CrmTask.findAll({
          where: { status: 'PENDING', due_at: { [Op.lt]: now, [Op.ne]: null }, assigned_user_id: { [Op.ne]: null } },
          attributes: ['assigned_user_id', [fn('COUNT', col('CrmTask.id')), 'total']],
          group: ['assigned_user_id'],
          raw: true
        }),
        CrmConversation.findAll({
          where: { status: { [Op.in]: ['OPEN', 'PENDING'] }, assigned_user_id: { [Op.ne]: null } },
          attributes: ['assigned_user_id', [fn('COUNT', col('CrmConversation.id')), 'total'], [fn('SUM', col('unread_count')), 'unread_total']],
          group: ['assigned_user_id'],
          raw: true
        }),
        CrmAutomationExecution.findAll({
          where: { createdAt: { [Op.gte]: recentExecutionsThreshold } },
          attributes: ['status', [fn('COUNT', col('id')), 'total']],
          group: ['status'],
          raw: true
        })
      ]);

      const leadsSemAtividadeOrdenados = leadsSemAtividadeLista
        .map((lead) => {
          const anchor = lead.ultima_interacao_at || lead.createdAt;
          return {
            lead,
            atrasoHoras: Math.max(0, Math.floor((now.getTime() - new Date(anchor).getTime()) / (60 * 60 * 1000)))
          };
        })
        .sort((a, b) => b.atrasoHoras - a.atrasoHoras)
        .slice(0, 10)
        .map((item) => item.lead);

      const userIds = [...new Set([
        ...backlogLeadsPorResponsavel.map((row) => Number(row.assigned_user_id)),
        ...backlogTasksPorResponsavel.map((row) => Number(row.assigned_user_id)),
        ...backlogConversationsPorResponsavel.map((row) => Number(row.assigned_user_id))
      ].filter((id) => Number.isInteger(id) && id > 0))];

      const usuarios = userIds.length
        ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'nome'] })
        : [];

      const usuarioMap = new Map(usuarios.map((usuario) => [usuario.id, usuario]));
      const firstContactMap = new Map(backlogLeadsPorResponsavel.map((row) => [Number(row.assigned_user_id), toNumber(row.total)]));
      const taskMap = new Map(backlogTasksPorResponsavel.map((row) => [Number(row.assigned_user_id), toNumber(row.total)]));
      const conversationMap = new Map(backlogConversationsPorResponsavel.map((row) => [Number(row.assigned_user_id), {
        total: toNumber(row.total),
        unread: toNumber(row.unread_total)
      }]));

      const backlogResponsaveis = userIds
        .map((userId) => {
          const conversationInfo = conversationMap.get(userId) || { total: 0, unread: 0 };
          const primeiroContato = firstContactMap.get(userId) || 0;
          const tarefas = taskMap.get(userId) || 0;
          const conversas = conversationInfo.total || 0;
          const unread = conversationInfo.unread || 0;

          return {
            usuario: usuarioMap.get(userId) || { id: userId, nome: `Usuario #${userId}` },
            leadsSemPrimeiroContato: primeiroContato,
            tarefasVencidas: tarefas,
            conversasPendentes: conversas,
            mensagensNaoLidas: unread,
            score: primeiroContato + tarefas + conversas
          };
        })
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return String(a.usuario?.nome || '').localeCompare(String(b.usuario?.nome || ''), 'pt-BR');
        })
        .slice(0, 10);

      return res.json({
        thresholds: {
          firstContactMinutes,
          noActivityHours,
          recentDays
        },
        kpis: {
          leadsSemPrimeiroContato,
          leadsSemAtividade,
          tarefasVencidas,
          tarefasCriticas,
          conversasAbertas,
          conversasPendentes,
          mensagensNaoLidas: toNumber(mensagensNaoLidas),
          regrasSlaAtivas,
          execucoesRecentes,
          execucoesRecentesErro
        },
        buckets: {
          primeiroContato: [
            { faixa: `Ate ${Math.max(4, Math.ceil(firstContactMinutes / 60))}h`, total: bucketPrimeiroContatoAte4h },
            { faixa: '4h a 24h', total: bucketPrimeiroContato4a24h },
            { faixa: 'Mais de 24h', total: bucketPrimeiroContatoMais24h }
          ],
          semAtividade: [
            { faixa: `${noActivityHours}h a 48h`, total: bucketSemAtividade24a48h },
            { faixa: '2 a 7 dias', total: bucketSemAtividade2a7d },
            { faixa: 'Mais de 7 dias', total: bucketSemAtividadeMais7d }
          ]
        },
        backlogResponsaveis,
        leadsPrimeiroContato: leadsPrimeiroContatoLista.map((lead) => ({
          id: lead.id,
          nome: lead.nome,
          telefone: lead.telefone,
          responsavel: lead.responsavel,
          etapa: lead.etapa,
          atrasoMinutos: Math.max(0, Math.floor((now.getTime() - new Date(lead.createdAt).getTime()) / (60 * 1000))),
          createdAt: lead.createdAt
        })),
        leadsSemAtividade: leadsSemAtividadeOrdenados.map((lead) => {
          const anchor = lead.ultima_interacao_at || lead.createdAt;
          return {
            id: lead.id,
            nome: lead.nome,
            telefone: lead.telefone,
            responsavel: lead.responsavel,
            etapa: lead.etapa,
            ultimaInteracaoAt: anchor,
            atrasoHoras: Math.max(0, Math.floor((now.getTime() - new Date(anchor).getTime()) / (60 * 60 * 1000)))
          };
        }),
        tarefas: tarefasVencidasLista.map((task) => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          dueAt: task.due_at,
          responsavel: task.responsavel,
          lead: task.lead,
          atrasoHoras: task.due_at ? Math.max(0, Math.floor((now.getTime() - new Date(task.due_at).getTime()) / (60 * 60 * 1000))) : 0
        })),
        conversas: conversasPendentesLista.map((conversation) => ({
          id: conversation.id,
          status: conversation.status,
          priority: conversation.priority,
          unreadCount: conversation.unread_count,
          lastMessageAt: conversation.last_message_at,
          responsavel: conversation.responsavel,
          lead: conversation.lead
        })),
        automacoes: {
          execucoesPorStatus: normalizeGroup(execucoesPorStatus, 'status'),
          recenteDesde: recentExecutionsThreshold
        }
      });
    } catch (error) {
      return responderErroController(res, error, 'Erro ao carregar dashboard de SLA do CRM');
    }
  },

  async distribuicao(req, res) {
    try {
      const now = new Date();
      const dias = clampNumber(req.query?.dias, 30, 1, 365);
      const noActivityHours = clampNumber(req.query?.no_activity_hours, 24, 1, 720);
      const inicio = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000);
      const noActivityThreshold = new Date(now.getTime() - noActivityHours * 60 * 60 * 1000);

      const activeWhere = {
        archived_at: null,
        lifecycle_status: { [Op.notIn]: ['ARQUIVADO', 'PERDIDO', 'CONVERTIDO'] }
      };
      const redistribuicaoWhere = {
        event_type: 'LEAD_REDISTRIBUTED',
        createdAt: { [Op.gte]: inicio }
      };

      const [
        totalAtivos,
        leadsComResponsavel,
        leadsSemResponsavel,
        leadsSemAtividade,
        redistribuicoesPeriodo,
        redistribuicoesPorLead,
        backlogPorResponsavel,
        novosPorResponsavel,
        semAtividadePorResponsavel,
        convertidosPorResponsavel,
        redistribuicoesPorDia,
        redistribuicoesPorAtor,
        redistribuicoesRecentes
      ] = await Promise.all([
        CrmLead.count({ where: activeWhere }),
        CrmLead.count({ where: { ...activeWhere, assigned_user_id: { [Op.ne]: null } } }),
        CrmLead.count({ where: { ...activeWhere, assigned_user_id: null } }),
        CrmLead.count({ where: buildNoActivityWhere(noActivityThreshold) }),
        CrmAuditLog.count({ where: redistribuicaoWhere }),
        CrmAuditLog.findAll({
          where: redistribuicaoWhere,
          attributes: ['lead_id', [fn('COUNT', col('CrmAuditLog.id')), 'total']],
          group: ['lead_id'],
          raw: true
        }),
        CrmLead.findAll({
          where: { ...activeWhere, assigned_user_id: { [Op.ne]: null } },
          attributes: ['assigned_user_id', [fn('COUNT', col('CrmLead.id')), 'total']],
          include: [{ model: User, as: 'responsavel', attributes: ['id', 'nome', 'perfil'] }],
          group: ['assigned_user_id', 'responsavel.id', 'responsavel.nome', 'responsavel.perfil'],
          order: [[literal('total'), 'DESC']],
          raw: false
        }),
        CrmLead.findAll({
          where: {
            archived_at: null,
            assigned_user_id: { [Op.ne]: null },
            createdAt: { [Op.gte]: inicio }
          },
          attributes: ['assigned_user_id', [fn('COUNT', col('CrmLead.id')), 'total']],
          group: ['assigned_user_id'],
          raw: true
        }),
        CrmLead.findAll({
          where: {
            ...buildNoActivityWhere(noActivityThreshold),
            assigned_user_id: { [Op.ne]: null }
          },
          attributes: ['assigned_user_id', [fn('COUNT', col('CrmLead.id')), 'total']],
          group: ['assigned_user_id'],
          raw: true
        }),
        CrmLead.findAll({
          where: {
            lifecycle_status: 'CONVERTIDO',
            assigned_user_id: { [Op.ne]: null },
            convertido_at: { [Op.gte]: inicio }
          },
          attributes: ['assigned_user_id', [fn('COUNT', col('CrmLead.id')), 'total']],
          group: ['assigned_user_id'],
          raw: true
        }),
        CrmAuditLog.findAll({
          where: redistribuicaoWhere,
          attributes: [[fn('DATE', col('CrmAuditLog.createdAt')), 'dia'], [fn('COUNT', col('CrmAuditLog.id')), 'total']],
          group: [fn('DATE', col('CrmAuditLog.createdAt'))],
          order: [[fn('DATE', col('CrmAuditLog.createdAt')), 'ASC']],
          raw: true
        }),
        CrmAuditLog.findAll({
          where: redistribuicaoWhere,
          attributes: ['user_id', [fn('COUNT', col('CrmAuditLog.id')), 'total']],
          include: [{ model: User, as: 'usuario', attributes: ['id', 'nome'] }],
          group: ['user_id', 'usuario.id', 'usuario.nome'],
          order: [[literal('total'), 'DESC']],
          limit: 10,
          raw: false
        }),
        CrmAuditLog.findAll({
          where: redistribuicaoWhere,
          include: [
            { model: CrmLead, as: 'lead', attributes: ['id', 'nome', 'telefone', 'lifecycle_status', 'assigned_user_id'] },
            { model: User, as: 'usuario', attributes: ['id', 'nome'] }
          ],
          order: [['createdAt', 'DESC']],
          limit: 15
        })
      ]);

      const novosMap = mapCountByUser(novosPorResponsavel);
      const semAtividadeMap = mapCountByUser(semAtividadePorResponsavel);
      const convertidosMap = mapCountByUser(convertidosPorResponsavel);

      const responsaveis = backlogPorResponsavel.map((row) => {
        const userId = Number(row.assigned_user_id);
        const totalCarteira = toNumber(row.dataValues.total);
        const novosPeriodo = novosMap.get(userId) || 0;
        const semAtividade = semAtividadeMap.get(userId) || 0;
        const convertidosPeriodo = convertidosMap.get(userId) || 0;

        return {
          usuario: row.responsavel,
          totalCarteira,
          novosPeriodo,
          semAtividade,
          convertidosPeriodo,
          taxaConversaoPeriodo: novosPeriodo > 0 ? Number(((convertidosPeriodo / novosPeriodo) * 100).toFixed(2)) : 0,
          pressaoCarteira: totalCarteira + semAtividade
        };
      }).sort((a, b) => {
        if (b.pressaoCarteira !== a.pressaoCarteira) return b.pressaoCarteira - a.pressaoCarteira;
        return String(a.usuario?.nome || '').localeCompare(String(b.usuario?.nome || ''), 'pt-BR');
      });

      const leadsComMaisDeUmaRedistribuicao = redistribuicoesPorLead
        .filter((row) => Number(row.lead_id) > 0 && toNumber(row.total) > 1)
        .length;

      const maiorCarteira = responsaveis[0]?.totalCarteira || 0;
      const menorCarteira = responsaveis.length
        ? Math.min(...responsaveis.map((row) => Number(row.totalCarteira || 0)))
        : 0;
      const desequilibrioCarteira = responsaveis.length > 1 ? maiorCarteira - menorCarteira : 0;

      return res.json({
        periodo: {
          dias,
          inicio,
          fim: now,
          noActivityHours
        },
        kpis: {
          totalAtivos,
          leadsComResponsavel,
          leadsSemResponsavel,
          percentualAtribuido: totalAtivos > 0 ? Number(((leadsComResponsavel / totalAtivos) * 100).toFixed(2)) : 0,
          leadsSemAtividade,
          redistribuicoesPeriodo,
          leadsComMaisDeUmaRedistribuicao,
          responsaveisComCarteira: responsaveis.length,
          desequilibrioCarteira
        },
        responsaveis,
        redistribuicoesPorDia: redistribuicoesPorDia.map((row) => ({
          dia: row.dia,
          total: toNumber(row.total)
        })),
        redistribuicoesPorAtor: redistribuicoesPorAtor.map((row) => ({
          usuario: row.usuario || { id: row.user_id, nome: row.user_id ? `Usuario #${row.user_id}` : 'Sistema' },
          total: toNumber(row.dataValues.total)
        })),
        redistribuicoesRecentes: redistribuicoesRecentes.map((log) => {
          const metadata = safeJsonObject(log.metadata);
          return {
            id: log.id,
            lead: log.lead,
            usuario: log.usuario,
            oldAssignedUserId: metadata.old_assigned_user_id || null,
            oldAssignedUserName: metadata.old_assigned_user_name || null,
            newAssignedUserId: metadata.new_assigned_user_id || null,
            newAssignedUserName: metadata.new_assigned_user_name || null,
            motivo: metadata.motivo || null,
            createdAt: log.createdAt
          };
        })
      });
    } catch (error) {
      return responderErroController(res, error, 'Erro ao carregar dashboard de distribuicao do CRM');
    }
  }
};
