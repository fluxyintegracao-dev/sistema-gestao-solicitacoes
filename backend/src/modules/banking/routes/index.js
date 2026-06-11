const express = require('express');
const BankingController = require('../controllers/BankingController');

const router = express.Router();

router.get('/dashboard', BankingController.dashboard);
router.get('/cnab240-pagamentos', BankingController.cnab240Pagamentos);
router.get('/caixa-pagamentos/convenios', BankingController.listarConveniosCaixaPagamento);
router.post('/caixa-pagamentos/convenios', BankingController.criarConvenioCaixaPagamento);
router.patch('/caixa-pagamentos/convenios/:id', BankingController.atualizarConvenioCaixaPagamento);
router.get('/caixa-pagamentos/titulos-elegiveis', BankingController.listarTitulosElegiveisCaixaPagamento);
router.get('/caixa-pagamentos/remessas', BankingController.listarRemessasCaixaPagamento);
router.post('/caixa-pagamentos/remessas', BankingController.gerarRemessaCaixaPagamento);
router.get('/caixa-pagamentos/remessas/:id/download', BankingController.downloadRemessaCaixaPagamento);

module.exports = router;
