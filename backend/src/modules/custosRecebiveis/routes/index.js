'use strict';

const express = require('express');
const CustosRecebiveisController = require('../controllers/CustosRecebiveisController');
const { CUSTOS_RECEBIVEIS_PERMISSIONS } = require('../constants/custosRecebiveisConstants');
const { requireCustosRecebiveisPermission } = require('../policies/permissionPolicy');

const router = express.Router();

router.get(
  '/status',
  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.MODULE_ACCESS),
  CustosRecebiveisController.status
);

module.exports = router;
