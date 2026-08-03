'use strict';

const express = require('express');
const uploadComprovantes = require('../../../config/uploadComprovantes');
const CustosRecebiveisController = require('../controllers/CustosRecebiveisController');
const { CUSTOS_RECEBIVEIS_PERMISSIONS } = require('../constants/custosRecebiveisConstants');
const {
  requireAnyCustosRecebiveisPermission,
  requireCustosRecebiveisPermission
} = require('../policies/permissionPolicy');
const { requireCustosRecebiveisObraScope } = require('../policies/obraScopePolicy');
const { resolverObraIdPorPlano } = require('../services/planoMicroService');
const {
  resolverObraIdPorCompetencia,
  resolverObraIdPorReabertura
} = require('../services/planejamentoService');
const { resolverObraIdPorRealizado } = require('../services/realizadoService');
const {
  resolverObraIdPorResponsabilidade
} = require('../services/governancaService');

const router = express.Router();

router.use(
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.MODULE_ACCESS)
);

router.get(
  '/status',
  CustosRecebiveisController.status
);

router.get(
  '/obras',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.OBRAS_VIEW),
  CustosRecebiveisController.obras
);

router.get(
  '/dashboard',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.DASHBOARD_VIEW),
  CustosRecebiveisController.dashboard
);

router.get(
  '/obras/:obraId/competencias',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_VIEW),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.competencias
);

router.post(
  '/obras/:obraId/competencias',
  requireAnyCustosRecebiveisPermission([
    CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_COSTS,
    CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_RECEIVABLES
  ]),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.criarCompetencia
);

router.get(
  '/obras/:obraId/plano/itens',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_VIEW),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.itensPlano
);

router.get(
  '/obras/:obraId/competencias/:competencia',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_VIEW),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.planejamento
);

router.put(
  '/obras/:obraId/competencias/:competencia/custos',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_COSTS),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.salvarCustos
);

router.put(
  '/obras/:obraId/competencias/:competencia/receitas',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_RECEIVABLES),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.salvarRecebiveis
);

router.post(
  '/obras/:obraId/competencias/:competencia/finalizar',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_FINISH),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.finalizarCompetencia
);

router.post(
  '/obras/:obraId/competencias/:competencia/medicao',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.MEDICAO_CONSOLIDATE),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.consolidarMedicao
);

router.get(
  '/obras/:obraId/comparativo',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.COMPARATIVO_VIEW),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.comparativo
);

router.get(
  '/obras/:obraId/realizados',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.REALIZADOS_VIEW),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.realizados
);

router.post(
  '/obras/:obraId/realizados/reprocessar',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.REALIZADOS_UPDATE),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.reprocessarRealizados
);

router.post(
  '/realizados/:id/reconciliar',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.REALIZADOS_RECONCILE),
  requireCustosRecebiveisObraScope(
    async (req) => resolverObraIdPorRealizado(req.params.id)
  ),
  CustosRecebiveisController.reconciliarRealizado
);

router.post(
  '/competencias/:competenciaId/reabertura',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.REOPEN_REQUEST),
  requireCustosRecebiveisObraScope(
    async (req) => resolverObraIdPorCompetencia(req.params.competenciaId)
  ),
  CustosRecebiveisController.solicitarReabertura
);

router.post(
  '/obras/:obraId/competencias/:competencia/reabertura',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.REOPEN_REQUEST),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.solicitarReaberturaPorObraCompetencia
);

router.post(
  '/reaberturas/:reaberturaId/aprovar',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.REOPEN_APPROVE),
  requireCustosRecebiveisObraScope(
    async (req) => resolverObraIdPorReabertura(req.params.reaberturaId)
  ),
  CustosRecebiveisController.decidirReabertura
);

router.get(
  '/obrigacoes/minhas',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.OBRIGACOES_VIEW),
  CustosRecebiveisController.minhasObrigacoes
);

router.get(
  '/obrigacoes/bypass',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.OBLIGATION_BYPASS),
  CustosRecebiveisController.bypasses
);

router.post(
  '/obrigacoes/bypass',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.OBLIGATION_BYPASS),
  CustosRecebiveisController.concederBypass
);

router.delete(
  '/obrigacoes/bypass/:id',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.OBLIGATION_BYPASS),
  CustosRecebiveisController.revogarBypass
);

router.get(
  '/obras/:obraId/responsaveis',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.CONFIG_MANAGE),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.responsaveisObra
);

router.post(
  '/obras/:obraId/responsaveis',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.CONFIG_MANAGE),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.cadastrarResponsavelObra
);

router.patch(
  '/responsaveis/:id/encerrar',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.CONFIG_MANAGE),
  requireCustosRecebiveisObraScope(
    async (req) => resolverObraIdPorResponsabilidade(req.params.id)
  ),
  CustosRecebiveisController.encerrarResponsabilidade
);

router.get(
  '/obras/:obraId/auditoria',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.AUDITORIA_VIEW),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.auditoriaObra
);

router.get(
  '/obras/:obraId/plano/modelo',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_IMPORT),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.modeloPlano
);

router.get(
  '/obras/:obraId/plano',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_VIEW),
  requireCustosRecebiveisObraScope(),
  CustosRecebiveisController.plano
);

router.post(
  '/obras/:obraId/plano/importar/validar',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_IMPORT),
  requireCustosRecebiveisObraScope(),
  uploadComprovantes.single('file'),
  CustosRecebiveisController.validarImportacao
);

router.post(
  '/obras/:obraId/plano/importar',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_IMPORT),
  requireCustosRecebiveisObraScope(),
  uploadComprovantes.single('file'),
  CustosRecebiveisController.importar
);

router.post(
  '/planos/:planoId/publicar',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_PUBLISH),
  requireCustosRecebiveisObraScope(async (req) => resolverObraIdPorPlano(req.params.planoId)),
  CustosRecebiveisController.publicar
);

router.get(
  '/exportacoes/:tipo',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.REPORT_EXPORT),
  CustosRecebiveisController.exportacao
);

module.exports = router;
