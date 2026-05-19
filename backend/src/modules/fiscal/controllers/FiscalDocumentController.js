'use strict';

const {
  gerarUrlArquivoFiscal,
  ignorarDocumentoFiscal,
  importarArquivoDocumentoFiscal,
  listarDocumentosFiscais,
  obterDocumentoFiscal
} = require('../services/fiscalDocumentService');
const { importarXmlFiscalManual } = require('../services/fiscalXmlImportService');

function handleError(res, error) {
  console.error('[fiscal] documento fiscal:', error);
  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Erro interno ao processar documento fiscal.'
  });
}

async function index(req, res) {
  try {
    const result = await listarDocumentosFiscais(req.query);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function show(req, res) {
  try {
    const document = await obterDocumentoFiscal(req.params.id);
    return res.json(document);
  } catch (error) {
    return handleError(res, error);
  }
}

async function xmlUrl(req, res) {
  try {
    const result = await gerarUrlArquivoFiscal(req, req.params.id, 'xml');
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function pdfUrl(req, res) {
  try {
    const result = await gerarUrlArquivoFiscal(req, req.params.id, 'pdf');
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function uploadXml(req, res) {
  try {
    const result = await importarXmlFiscalManual(req, {
      file: req.file,
      body: req.body || {}
    });
    return res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function uploadFile(req, res) {
  try {
    const result = await importarArquivoDocumentoFiscal(req, req.params.id, {
      file: req.file,
      body: req.body || {}
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function ignore(req, res) {
  try {
    const document = await ignorarDocumentoFiscal(req, req.params.id, req.body || {});
    return res.json(document);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  ignore,
  index,
  pdfUrl,
  xmlUrl,
  uploadFile,
  uploadXml,
  show
};
