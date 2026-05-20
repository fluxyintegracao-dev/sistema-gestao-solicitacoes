'use strict';

const {
  atualizarDivergenciaDocumentoFiscal,
  criarDivergenciaDocumentoFiscal,
  criarVinculoDocumentoFiscal,
  gerarUrlArquivoFiscal,
  ignorarDocumentoFiscal,
  importarArquivoDocumentoFiscal,
  listarDocumentosFiscais,
  obterDocumentoFiscal,
  validarDocumentoFiscal
} = require('../services/fiscalDocumentService');
const { buscarOpcoesVinculoFiscal } = require('../services/fiscalLinkSearchService');
const {
  atualizarSugestaoVinculoFiscal,
  sugerirVinculosDocumentoFiscal
} = require('../services/fiscalMatchingService');
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
      files: req.files,
      body: req.body || {}
    });
    return res.status(result.created_count > 0 || result.created ? 201 : 200).json(result);
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

async function validate(req, res) {
  try {
    const document = await validarDocumentoFiscal(req, req.params.id);
    return res.json(document);
  } catch (error) {
    return handleError(res, error);
  }
}

async function link(req, res) {
  try {
    const document = await criarVinculoDocumentoFiscal(req, req.params.id, req.body || {});
    return res.status(201).json(document);
  } catch (error) {
    return handleError(res, error);
  }
}

async function suggestLinks(req, res) {
  try {
    const result = await sugerirVinculosDocumentoFiscal(req, req.params.id);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateLink(req, res) {
  try {
    const document = await atualizarSugestaoVinculoFiscal(
      req,
      req.params.id,
      req.params.linkId,
      req.body || {}
    );
    return res.json(document);
  } catch (error) {
    return handleError(res, error);
  }
}

async function linkOptions(req, res) {
  try {
    const result = await buscarOpcoesVinculoFiscal(req.query || {});
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function createDivergence(req, res) {
  try {
    const document = await criarDivergenciaDocumentoFiscal(req, req.params.id, req.body || {});
    return res.status(201).json(document);
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateDivergence(req, res) {
  try {
    const document = await atualizarDivergenciaDocumentoFiscal(
      req,
      req.params.id,
      req.params.divergenceId,
      req.body || {}
    );
    return res.json(document);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createDivergence,
  ignore,
  index,
  link,
  linkOptions,
  pdfUrl,
  xmlUrl,
  uploadFile,
  uploadXml,
  suggestLinks,
  updateLink,
  updateDivergence,
  validate,
  show
};
