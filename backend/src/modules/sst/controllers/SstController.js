'use strict';

const sstService = require('../services/sstService');
const { getSstConfig, saveSstConfig } = require('../services/sstConfigService');
const { gerarEventosVencimentoSst } = require('../services/sstEventService');

module.exports = {
  async config(req, res) {
    try {
      const data = await getSstConfig();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar configuracoes SST' });
    }
  },

  async updateConfig(req, res) {
    try {
      const data = await saveSstConfig(req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao salvar configuracoes SST' });
    }
  },

  async dashboard(req, res) {
    try {
      const data = await sstService.dashboard(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar dashboard SST' });
    }
  },

  async relatorioOperacional(req, res) {
    try {
      const data = await sstService.relatorioOperacional(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar relatorio operacional SST' });
    }
  },

  async index(req, res) {
    try {
      const data = await sstService.listResource(req.params.resource, req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao listar registros SST' });
    }
  },

  async show(req, res) {
    try {
      const data = await sstService.getResource(req.params.resource, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao buscar registro SST' });
    }
  },

  async create(req, res) {
    try {
      const data = await sstService.createResource(req.params.resource, req.body, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao criar registro SST' });
    }
  },

  async update(req, res) {
    try {
      const data = await sstService.updateResource(req.params.resource, req.params.id, req.body, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao atualizar registro SST' });
    }
  },

  async uploadDocument(req, res) {
    try {
      const data = await sstService.uploadDocument(req.file, req.body, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao enviar documento SST' });
    }
  },

  async documentUrl(req, res) {
    try {
      const data = await sstService.getDocumentSignedUrl(req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao assinar documento SST' });
    }
  },

  async syncEvents(req, res) {
    try {
      const data = await gerarEventosVencimentoSst({ usuario_id: req.user?.id || null });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao sincronizar eventos SST' });
    }
  }
};
