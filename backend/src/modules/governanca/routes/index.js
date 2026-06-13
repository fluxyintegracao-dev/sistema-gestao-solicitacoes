'use strict';

const express = require('express');
const permit = require('../../../middlewares/permissions');
const {
  canManageSystemGovernance,
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

module.exports = router;
