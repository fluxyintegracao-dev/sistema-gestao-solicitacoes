'use strict';

const express = require('express');
const uploadComprovantes = require('../../../config/uploadComprovantes');
const CustosRecebiveisController = require('../controllers/CustosRecebiveisController');
const { CUSTOS_RECEBIVEIS_PERMISSIONS } = require('../constants/custosRecebiveisConstants');
const { requireCustosRecebiveisPermission } = require('../policies/permissionPolicy');
const { requireCustosRecebiveisObraScope } = require('../policies/obraScopePolicy');
const { resolverObraIdPorPlano } = require('../services/planoMicroService');

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

module.exports = router;
