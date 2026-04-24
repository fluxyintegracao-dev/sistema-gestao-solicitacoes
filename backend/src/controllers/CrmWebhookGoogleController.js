const { receberEventoGoogle } = require('../services/crmWebhookGoogleService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async receive(req, res) {
    try {
      const signature =
        req.get('x-google-signature') ||
        req.get('x-hub-signature') ||
        req.get('x-signature');
      const rawBody = req.rawBody || JSON.stringify(req.body || {});
      const result = await receberEventoGoogle(req.body || {}, signature, rawBody);
      return res.status(202).json({ received: true, result });
    } catch (error) {
      return responderErroController(res, error, 'Erro ao receber webhook Google');
    }
  }
};
