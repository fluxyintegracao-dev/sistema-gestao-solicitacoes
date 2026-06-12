const XLSX = require('xlsx');
const { Apropriacao, Obra } = require('../models');
const { isObraCentroCusto } = require('../constants/centroCusto');

function parseBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return fallback;
}

function parseValorOrcado(value, fallback = 0) {
  if (value === undefined) {
    return fallback;
  }

  if (value === null || value === '') {
    return 0;
  }

  const raw = String(value).trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  modeloXlsx(req, res) {
    try {
      const linhasModelo = [
        ['codigo_obra', 'codigo', 'descricao', 'valor_orcado'],
        ['11111', '001', 'Fundacao', 0],
        ['11111', '002', 'Estrutura', 0],
        ['11111', '003', 'Instalacoes', 0]
      ];

      const instrucoes = [
        ['Modelo de importacao de apropriacoes por obra'],
        ['codigo_obra deve corresponder ao codigo da obra cadastrada no Fluxy.'],
        ['Preencha uma apropriacao por linha.'],
        ['codigo_obra e codigo sao obrigatorios. descricao e valor_orcado sao opcionais.'],
        ['Na importacao em massa atual pela tela, selecione a obra e cole no formato Codigo|Descricao.']
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(linhasModelo), 'Apropriacoes');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instrucoes), 'Instrucoes');

      const buffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'buffer'
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="modelo-apropriacoes-obras.xlsx"');
      return res.send(buffer);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar modelo de apropriacoes' });
    }
  },

  async index(req, res) {
    try {
      const { obra_id } = req.query;
      const where = { ativo: true };

      if (obra_id) {
        where.obra_id = obra_id;
      }

      const apropriacoes = await Apropriacao.findAll({
        where,
        order: [['codigo', 'ASC']]
      });

      return res.json(apropriacoes);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar apropriacoes' });
    }
  },

  async create(req, res) {
    try {
      const obra_id = req.body?.obra_id;
      const codigo = String(req.body?.codigo || '').trim();
      const descricao = req.body?.descricao != null ? String(req.body.descricao).trim() : '';
      const valorOrcado = parseValorOrcado(req.body?.valor_orcado, 0);

      if (!obra_id || !codigo) {
        return res.status(400).json({ error: 'Informe obra e codigo' });
      }

      const obra = await Obra.findByPk(obra_id);
      if (!obra) {
        return res.status(400).json({ error: 'Obra nao encontrada' });
      }
      if (!isObraCentroCusto(obra.tipo_centro_custo)) {
        return res.status(400).json({ error: 'Apropriacoes so podem ser cadastradas para registros marcados como obra.' });
      }

      const apropriacao = await Apropriacao.create({
        obra_id,
        codigo,
        descricao: descricao || null,
        valor_orcado: valorOrcado
      });

      return res.status(201).json(apropriacao);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar apropriacao' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const apropriacao = await Apropriacao.findByPk(id);

      if (!apropriacao) {
        return res.status(404).json({ error: 'Apropriacao nao encontrada' });
      }

      const codigo = req.body?.codigo != null ? String(req.body.codigo).trim() : apropriacao.codigo;
      const descricao = req.body?.descricao != null ? String(req.body.descricao).trim() : apropriacao.descricao;
      const ativo = parseBoolean(req.body?.ativo, apropriacao.ativo);
      const valorOrcado = parseValorOrcado(req.body?.valor_orcado, Number(apropriacao.valor_orcado || 0));

      if (req.body?.obra_id && Number(req.body.obra_id) !== Number(apropriacao.obra_id)) {
        const obra = await Obra.findByPk(req.body.obra_id);
        if (!obra) {
          return res.status(400).json({ error: 'Obra nao encontrada' });
        }
        if (!isObraCentroCusto(obra.tipo_centro_custo)) {
          return res.status(400).json({ error: 'Apropriacoes so podem ser vinculadas a registros marcados como obra.' });
        }
      } else {
        const obra = await Obra.findByPk(apropriacao.obra_id);
        if (obra && !isObraCentroCusto(obra.tipo_centro_custo)) {
          return res.status(400).json({ error: 'Este centro de custo nao aceita apropriacoes porque nao esta marcado como obra.' });
        }
      }

      await apropriacao.update({
        obra_id: req.body?.obra_id || apropriacao.obra_id,
        codigo: codigo || apropriacao.codigo,
        descricao: descricao === '' ? null : descricao,
        valor_orcado: valorOrcado,
        ativo
      });

      return res.json(apropriacao);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar apropriacao' });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const apropriacao = await Apropriacao.findByPk(id);

      if (!apropriacao) {
        return res.status(404).json({ error: 'Apropriacao nao encontrada' });
      }

      await apropriacao.update({ ativo: false });
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao remover apropriacao' });
    }
  }
};
