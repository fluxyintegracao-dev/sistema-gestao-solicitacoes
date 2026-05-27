'use strict';

const { Op } = require('sequelize');
const {
  SstComplianceScore,
  SstJob,
  SstPendenciaOperacional,
  SstQualityIssue,
  SstWorkflowExecucao
} = require('../../../models');

async function createIssueIfMissing(payload, usuario_id = null) {
  const existente = await SstQualityIssue.findOne({
    where: {
      issue_type: payload.issue_type,
      status: 'ABERTA',
      origem_tipo: payload.origem_tipo || null,
      origem_id: payload.origem_id || null
    }
  });
  if (existente) return { created: false, issue: existente };

  const issue = await SstQualityIssue.create({
    ...payload,
    payload_json: payload.payload_json ? JSON.stringify(payload.payload_json) : null,
    criado_por: usuario_id,
    atualizado_por: usuario_id
  });
  return { created: true, issue };
}

async function executarQualityCheckSst({ usuario_id = null } = {}) {
  const criados = [];

  const [scoresInvalidos, jobsDeadLetter, workflowsOrfaos] = await Promise.all([
    SstComplianceScore.findAll({
      where: {
        [Op.or]: [
          { score: { [Op.lt]: 0 } },
          { score: { [Op.gt]: 100 } }
        ]
      },
      limit: 50
    }),
    SstJob.findAll({ where: { status: 'DEAD_LETTER' }, limit: 50 }),
    SstWorkflowExecucao.findAll({ where: { workflow_id: null }, limit: 50 })
  ]);

  for (const score of scoresInvalidos) {
    criados.push(await createIssueIfMissing({
      issue_type: 'SCORE_INVALIDO',
      severidade: 'ALTA',
      empresa_id: score.empresa_id,
      obra_id: score.obra_id,
      colaborador_id: score.colaborador_id,
      titulo: 'Score SST fora do intervalo permitido',
      descricao: `Score registrado como ${score.score}.`,
      origem_tipo: 'sst_compliance_scores',
      origem_id: score.id
    }, usuario_id));
  }

  for (const job of jobsDeadLetter) {
    criados.push(await createIssueIfMissing({
      issue_type: 'JOB_DEAD_LETTER',
      severidade: 'CRITICA',
      empresa_id: job.empresa_id,
      obra_id: job.obra_id,
      colaborador_id: job.colaborador_id,
      titulo: 'Job SST em dead letter',
      descricao: job.last_error || `Job ${job.job_type} excedeu tentativas.`,
      origem_tipo: 'sst_jobs',
      origem_id: job.id
    }, usuario_id));
  }

  for (const workflow of workflowsOrfaos) {
    criados.push(await createIssueIfMissing({
      issue_type: 'WORKFLOW_ORFAO',
      severidade: 'MEDIA',
      empresa_id: workflow.empresa_id,
      obra_id: workflow.obra_id,
      colaborador_id: workflow.colaborador_id,
      titulo: 'Execucao de workflow sem workflow vinculado',
      descricao: 'Execucao registrada sem workflow_id.',
      origem_tipo: 'sst_workflow_execucoes',
      origem_id: workflow.id
    }, usuario_id));
  }

  const pendenciasDuplicadas = await SstPendenciaOperacional.findAll({
    attributes: [
      'tipo_pendencia',
      'colaborador_id',
      'obra_id',
      [SstPendenciaOperacional.sequelize.fn('COUNT', SstPendenciaOperacional.sequelize.col('id')), 'total']
    ],
    where: { status: 'ABERTA' },
    group: ['tipo_pendencia', 'colaborador_id', 'obra_id'],
    having: SstPendenciaOperacional.sequelize.literal('COUNT(id) > 1'),
    raw: true,
    limit: 50
  });

  for (const item of pendenciasDuplicadas) {
    criados.push(await createIssueIfMissing({
      issue_type: 'PENDENCIA_DUPLICADA',
      severidade: 'MEDIA',
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      titulo: 'Pendencias SST duplicadas',
      descricao: `${item.total} pendencias abertas para ${item.tipo_pendencia}.`,
      origem_tipo: 'sst_pendencias_operacionais',
      origem_id: null,
      payload_json: item
    }, usuario_id));
  }

  return {
    checks: {
      scores_invalidos: scoresInvalidos.length,
      jobs_dead_letter: jobsDeadLetter.length,
      workflows_orfaos: workflowsOrfaos.length,
      pendencias_duplicadas: pendenciasDuplicadas.length
    },
    issues_criadas: criados.filter((item) => item.created).length,
    issues_existentes: criados.filter((item) => !item.created).length,
    issues: criados.map((item) => item.issue)
  };
}

async function gerarResumoQualidadeSst() {
  const rows = await SstQualityIssue.findAll({
    attributes: [
      'status',
      'severidade',
      [SstQualityIssue.sequelize.fn('COUNT', SstQualityIssue.sequelize.col('id')), 'total']
    ],
    group: ['status', 'severidade'],
    raw: true
  });

  return rows.reduce((acc, row) => {
    const status = row.status || 'SEM_STATUS';
    acc[status] = acc[status] || {};
    acc[status][row.severidade || 'SEM_SEVERIDADE'] = Number(row.total || 0);
    return acc;
  }, {});
}

module.exports = {
  executarQualityCheckSst,
  gerarResumoQualidadeSst
};
