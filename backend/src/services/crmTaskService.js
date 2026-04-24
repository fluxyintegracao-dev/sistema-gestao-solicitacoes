const { Op } = require('sequelize');
const { CrmTask, CrmLead, User } = require('../models');
const { registrarAuditCrm } = require('./crmService');

async function listarTarefas(query = {}) {
  const { status, task_type, assigned_user_id, lead_id, vencidas, page = 1, limit = 50 } = query;
  const where = {};

  if (status) where.status = String(status).toUpperCase();
  if (task_type) where.task_type = String(task_type).toUpperCase();
  if (assigned_user_id) where.assigned_user_id = Number(assigned_user_id);
  if (lead_id) where.lead_id = Number(lead_id);
  if (vencidas === 'true' || vencidas === true) {
    where.status = 'PENDING';
    where.due_at = { [Op.lt]: new Date() };
  }

  const offset = (Number(page) - 1) * Number(limit);

  const { count, rows } = await CrmTask.findAndCountAll({
    where,
    include: [
      { model: CrmLead, as: 'lead', attributes: ['id', 'nome', 'telefone', 'lifecycle_status'] },
      { model: User, as: 'responsavel', attributes: ['id', 'nome'] },
      { model: User, as: 'criadoPor', attributes: ['id', 'nome'] }
    ],
    order: [
      ['due_at', 'ASC'],
      ['priority', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit: Number(limit),
    offset
  });

  return { total: count, page: Number(page), tasks: rows };
}

async function criarTarefa(dados, userId, req) {
  const { lead_id, assigned_user_id, title, description, task_type = 'OTHER', due_at, priority = 'MEDIUM' } = dados;

  if (!lead_id) throw Object.assign(new Error('lead_id e obrigatorio'), { status: 400 });
  if (!title?.trim()) throw Object.assign(new Error('Titulo e obrigatorio'), { status: 400 });

  const lead = await CrmLead.findByPk(lead_id);
  if (!lead) throw Object.assign(new Error('Lead nao encontrado'), { status: 404 });

  const task = await CrmTask.create({
    lead_id,
    assigned_user_id: assigned_user_id || userId || null,
    title: title.trim(),
    description: description?.trim() || null,
    task_type,
    due_at: due_at || null,
    status: 'PENDING',
    priority,
    criado_por: userId || null
  });

  if (due_at) {
    const dueDate = new Date(due_at);
    if (!lead.proximo_followup_at || dueDate < new Date(lead.proximo_followup_at)) {
      await lead.update({ proximo_followup_at: dueDate });
    }
  }

  await registrarAuditCrm({
    leadId: lead_id,
    userId,
    eventType: 'TASK_CREATED',
    metadata: { task_id: task.id, title: task.title, task_type },
    req
  });

  return task;
}

async function atualizarTarefa(id, dados, userId, req) {
  const task = await CrmTask.findByPk(id);
  if (!task) throw Object.assign(new Error('Tarefa nao encontrada'), { status: 404 });

  const campos = ['title', 'description', 'task_type', 'due_at', 'priority', 'assigned_user_id'];
  const updates = {};
  for (const campo of campos) {
    if (dados[campo] !== undefined) updates[campo] = dados[campo];
  }

  await task.update(updates);

  await registrarAuditCrm({
    leadId: task.lead_id,
    userId,
    eventType: 'TASK_UPDATED',
    metadata: { task_id: id, campos: Object.keys(updates) },
    req
  });

  return task.reload();
}

async function concluirTarefa(id, userId, req) {
  const task = await CrmTask.findByPk(id);
  if (!task) throw Object.assign(new Error('Tarefa nao encontrada'), { status: 404 });

  if (task.status === 'DONE') return task;

  await task.update({ status: 'DONE', completed_at: new Date() });

  await registrarAuditCrm({
    leadId: task.lead_id,
    userId,
    eventType: 'TASK_COMPLETED',
    metadata: { task_id: id },
    req
  });

  return task;
}

async function cancelarTarefa(id, userId, req) {
  const task = await CrmTask.findByPk(id);
  if (!task) throw Object.assign(new Error('Tarefa nao encontrada'), { status: 404 });

  await task.update({ status: 'CANCELLED' });

  await registrarAuditCrm({
    leadId: task.lead_id,
    userId,
    eventType: 'TASK_CANCELLED',
    metadata: { task_id: id },
    req
  });

  return task;
}

module.exports = { listarTarefas, criarTarefa, atualizarTarefa, concluirTarefa, cancelarTarefa };
