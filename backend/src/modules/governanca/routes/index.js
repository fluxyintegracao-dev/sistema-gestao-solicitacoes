'use strict';

const express = require('express');
const permit = require('../../../middlewares/permissions');
const {
  canExportOperationalAudit,
  canManageSystemGovernance,
  canViewOperationalAudit,
  canViewOperationalAuditDetails,
  canViewOperationalAuditUsers,
  canViewSystemAudit,
  canViewSystemGovernance,
  canViewSystemProductEvolution,
  canViewSystemTechMonitor
} = require('../../../services/authorizationService');
const GovernancaController = require('../controllers/GovernancaController');

const router = express.Router();

const allowGovernanceView = permit({
  resource: 'SYSTEM_GOVERNANCE',
  custom: async (req) => (
    (await canViewSystemGovernance(req.user))
      ? true
      : 'Acesso negado para Governanca do Sistema'
  )
});

const allowGovernanceManage = permit({
  resource: 'SYSTEM_GOVERNANCE_MANAGE',
  custom: async (req) => (
    (await canManageSystemGovernance(req.user))
      ? true
      : 'Acesso negado para gerenciar Governanca do Sistema'
  )
});

const allowTechMonitor = permit({
  resource: 'SYSTEM_TECH_MONITOR',
  custom: async (req) => (
    (await canViewSystemTechMonitor(req.user))
      ? true
      : 'Acesso negado para Saude Tecnica do Sistema'
  )
});

const allowAudit = permit({
  resource: 'SYSTEM_AUDIT',
  custom: async (req) => (
    (await canViewSystemAudit(req.user))
      ? true
      : 'Acesso negado para Auditoria do Sistema'
  )
});

const allowProductEvolution = permit({
  resource: 'SYSTEM_PRODUCT_EVOLUTION',
  custom: async (req) => (
    (await canViewSystemProductEvolution(req.user))
      ? true
      : 'Acesso negado para Evolucao do Produto'
  )
});

const allowOperationalAudit = permit({
  resource: 'SYSTEM_OPERATIONAL_AUDIT',
  custom: async (req) => (await canViewOperationalAudit(req.user)) || 'Acesso negado para Auditoria Operacional'
});

const allowOperationalAuditDetails = permit({
  resource: 'SYSTEM_OPERATIONAL_AUDIT_DETAILS',
  custom: async (req) => (await canViewOperationalAuditDetails(req.user)) || 'Acesso negado para detalhes da Auditoria Operacional'
});

const allowOperationalAuditUsers = permit({
  resource: 'SYSTEM_OPERATIONAL_AUDIT_USERS',
  custom: async (req) => (await canViewOperationalAuditUsers(req.user)) || 'Acesso negado para atividade por usuario'
});

const allowOperationalAuditExport = permit({
  resource: 'SYSTEM_OPERATIONAL_AUDIT_EXPORT',
  custom: async (req) => (await canExportOperationalAudit(req.user)) || 'Acesso negado para exportar Auditoria Operacional'
});

router.get('/dashboard', allowGovernanceView, GovernancaController.dashboard);
router.get('/executiva', allowGovernanceView, GovernancaController.executiva);
router.get('/adocao', allowGovernanceView, GovernancaController.adocao);
router.get('/eficiencia', allowGovernanceView, GovernancaController.eficiencia);
router.get('/auditoria', allowAudit, GovernancaController.auditoria);
router.get('/health', allowTechMonitor, GovernancaController.health);
router.get('/produto', allowProductEvolution, GovernancaController.produto);
router.get('/snapshots', allowGovernanceView, GovernancaController.snapshots);
router.post('/snapshots/gerar', allowGovernanceManage, GovernancaController.gerarSnapshot);
router.get('/export', allowGovernanceView, GovernancaController.exportar);
router.post('/auditoria-operacional/navegacao', GovernancaController.auditoriaOperacionalNavegacao);
router.get('/auditoria-operacional/resumo', allowOperationalAudit, GovernancaController.auditoriaOperacionalResumo);
router.get('/auditoria-operacional/indicadores-financeiros', allowOperationalAudit, GovernancaController.auditoriaOperacionalIndicadoresFinanceiros);
router.get('/auditoria-operacional/usuarios', allowOperationalAuditUsers, GovernancaController.auditoriaOperacionalUsuarios);
router.get('/auditoria-operacional/opcoes', allowOperationalAudit, GovernancaController.auditoriaOperacionalOpcoes);
router.get('/auditoria-operacional/eventos', allowOperationalAuditDetails, GovernancaController.auditoriaOperacionalEventos);
router.get('/auditoria-operacional/export', allowOperationalAuditExport, GovernancaController.auditoriaOperacionalExportar);

module.exports = router;
