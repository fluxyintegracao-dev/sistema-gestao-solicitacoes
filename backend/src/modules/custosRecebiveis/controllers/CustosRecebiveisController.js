'use strict';

const { CUSTOS_RECEBIVEIS_MODULE_KEY } = require('../constants/custosRecebiveisConstants');
const { resolverEscopoObras } = require('../policies/obraScopePolicy');

class CustosRecebiveisController {
  static async status(req, res) {
    try {
      const escopo = await resolverEscopoObras(req.user);

      return res.json({
        module: CUSTOS_RECEBIVEIS_MODULE_KEY,
        status: 'FOUNDATION_READY',
        escopo: {
          todas_obras: escopo.todas,
          quantidade_obras: escopo.todas ? null : escopo.obraIds.length
        }
      });
    } catch (error) {
      console.error('Erro ao consultar fundacao de Custos e Recebiveis:', error.message);
      return res.status(500).json({ error: 'Erro ao consultar Custos e Recebiveis' });
    }
  }
}

module.exports = CustosRecebiveisController;
