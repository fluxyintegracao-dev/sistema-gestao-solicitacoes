const { receberEventoMeta, verificarTokenMeta } = require('../services/crmWebhookMetaService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async verify(req, res) {
    try {
      const mode = req.query['hub.mode'];
      const verifyToken = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      const valid = mode === 'subscribe' && challenge && await verificarTokenMeta(verifyToken);

      if (!valid) {
        return res.sendStatus(403);
      }

      return res.status(200).send(String(challenge));
    } catch (error) {
      console.error('[META ERROR]', error);
      return responderErroController(res, error, 'Erro ao verificar webhook Meta');
    }
  },

  async receive(req, res) {
    try {
      const signature = req.get('x-hub-signature-256');
      const rawBody = req.rawBody || JSON.stringify(req.body || {});
      const results = await receberEventoMeta(req.body || {}, signature, rawBody);
      return res.status(202).json({ received: true, results });
    } catch (error) {
      console.error('[META ERROR]', error);
      return responderErroController(res, error, 'Erro ao receber webhook Meta');
    }
  }
};
