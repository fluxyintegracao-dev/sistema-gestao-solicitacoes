const db = require('../models');
const {
  gerarRemessaParaBoletosCaixa,
  gerarPacoteHomologacaoRemessaCaixa,
  gerarRelatorioHomologacaoRemessaCaixa,
  importarRetornoCnab240Caixa,
  regenerarArquivoRemessaCaixa,
  relatorioHomologacaoToCsv
} = require('../services/boletoCaixaOperacaoService');
const { parseRetornoCnab240Caixa } = require('../services/boletoCaixaRetornoCnab240Service');
const { responderErroController } = require('../utils/controllerError');

const {
  BoletoCaixaConvenio,
  BoletoCaixaOcorrencia,
  BoletoCaixaRemessa,
  BoletoCaixaRetorno
} = db;

function usuarioId(req) {
  return req.user?.id || req.usuario?.id || null;
}

function booleanQuery(value) {
  return ['1', 'true', 'sim', 'yes'].includes(String(value || '').toLowerCase());
}

async function readRetornoContent(req) {
  if (req.file?.buffer) {
    return req.file.buffer.toString('latin1');
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  if (req.body?.content) {
    return String(req.body.content);
  }

  if (req.body?.arquivo_base64) {
    return Buffer.from(String(req.body.arquivo_base64), 'base64').toString('latin1');
  }

  throw new Error('Conteudo do retorno CNAB 240 nao informado.');
}

module.exports = {
  async convenios(req, res) {
    try {
      const where = {};
      if (req.query?.ativo !== undefined) where.ativo = booleanQuery(req.query.ativo);
      const data = await BoletoCaixaConvenio.findAll({
        where,
        order: [['beneficiario_nome', 'ASC']]
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar convenios Caixa');
    }
  },

  async remessas(req, res) {
    try {
      const where = {};
      if (req.query?.convenio_id) where.convenio_id = req.query.convenio_id;
      const data = await BoletoCaixaRemessa.findAll({
        where,
        order: [['id', 'DESC']],
        limit: 100
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar remessas Caixa');
    }
  },

  async gerarRemessa(req, res) {
    try {
      const convenioId = req.body?.convenio_id || req.body?.convenioId;
      const boletoIds = req.body?.boleto_ids || req.body?.boletoIds || [];
      const tituloIds = req.body?.titulo_ids || req.body?.tituloIds || [];
      const data = await gerarRemessaParaBoletosCaixa({
        convenioId,
        boletoIds,
        tituloIds,
        usuarioId: usuarioId(req)
      });

      if (booleanQuery(req.query?.download)) {
        res.setHeader('Content-Type', 'text/plain; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="${data.remessa.nome_arquivo}"`);
        res.setHeader('X-Remessa-Id', String(data.remessa.id));
        res.setHeader('X-Remessa-Hash', data.hash);
        return res.send(data.cnab);
      }

      return res.status(201).json({
        remessa: data.remessa,
        hash: data.hash,
        validation: data.validation
      });
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar remessa Caixa');
    }
  },

  async downloadRemessa(req, res) {
    try {
      const data = await regenerarArquivoRemessaCaixa(req.params.id);
      res.setHeader('Content-Type', 'text/plain; charset=latin1');
      res.setHeader('Content-Disposition', `attachment; filename="${data.remessa.nome_arquivo}"`);
      res.setHeader('X-Remessa-Id', String(data.remessa.id));
      res.setHeader('X-Remessa-Hash', data.cnab.hash);
      res.setHeader('X-Remessa-Hash-Confere', data.hash_confere ? 'true' : 'false');
      return res.send(data.cnab.content);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao baixar remessa Caixa');
    }
  },

  async homologacaoRemessa(req, res) {
    try {
      const relatorio = await gerarRelatorioHomologacaoRemessaCaixa(req.params.id);
      const format = String(req.query?.format || '').toLowerCase();

      if (format === 'csv') {
        const filename = `homologacao-caixa-remessa-${relatorio.remessa.numero_remessa || relatorio.remessa.id}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(relatorioHomologacaoToCsv(relatorio));
      }

      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar relatorio de homologacao Caixa');
    }
  },

  async pacoteHomologacaoRemessa(req, res) {
    try {
      const data = await gerarPacoteHomologacaoRemessaCaixa(req, req.params.id);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
      res.setHeader('X-Remessa-Id', String(data.relatorio.remessa.id));
      res.setHeader('X-Remessa-Hash-Confere', data.relatorio.remessa.hash_confere ? 'true' : 'false');
      return res.end(data.buffer);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar pacote de homologacao Caixa');
    }
  },

  async retornos(req, res) {
    try {
      const where = {};
      if (req.query?.convenio_id) where.convenio_id = req.query.convenio_id;
      const data = await BoletoCaixaRetorno.findAll({
        where,
        order: [['id', 'DESC']],
        limit: 100
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar retornos Caixa');
    }
  },

  async validarRetorno(req, res) {
    try {
      const content = await readRetornoContent(req);
      const data = parseRetornoCnab240Caixa(content);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao validar retorno Caixa');
    }
  },

  async importarRetorno(req, res) {
    try {
      const content = await readRetornoContent(req);
      const convenioId = req.body?.convenio_id || req.body?.convenioId || req.query?.convenio_id;
      const nomeArquivo = req.file?.originalname || req.body?.nome_arquivo || req.body?.nomeArquivo || 'RETORNO_CAIXA.RET';
      const data = await importarRetornoCnab240Caixa({
        convenioId,
        content,
        nomeArquivo,
        usuarioId: usuarioId(req)
      });
      return res.status(data.duplicate ? 200 : 201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao importar retorno Caixa');
    }
  },

  async ocorrencias(req, res) {
    try {
      const where = {};
      if (req.query?.retorno_id) where.retorno_id = req.query.retorno_id;
      if (req.query?.boleto_id) where.boleto_id = req.query.boleto_id;
      const data = await BoletoCaixaOcorrencia.findAll({
        where,
        order: [['id', 'DESC']],
        limit: 200
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar ocorrencias Caixa');
    }
  }
};
