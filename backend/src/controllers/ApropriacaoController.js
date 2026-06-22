const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { Apropriacao, Obra, sequelize } = require('../models');
const { isObraCentroCusto } = require('../constants/centroCusto');

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 1 || value === 0) {
    return Boolean(value);
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'sim', 's', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', 'nao', 'não', 'n', '0', 'no'].includes(normalized)) return false;
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

function normalizarCodigoApropriacao(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function codigoEhPaiDe(codigoPai, codigoFilho) {
  const pai = normalizarCodigoApropriacao(codigoPai);
  const filho = normalizarCodigoApropriacao(codigoFilho);
  return Boolean(pai && filho && filho !== pai && filho.startsWith(`${pai}.`));
}

function inferirSomadora(codigo, codigosComparacao = []) {
  return codigosComparacao.some((outro) => codigoEhPaiDe(codigo, outro));
}

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findHeaderRow(rows) {
  return rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return headers.includes('codigo') && headers.includes('descricao');
  });
}

function mapHeaders(headerRow = []) {
  return headerRow.reduce((acc, value, index) => {
    const key = normalizeHeader(value);
    if (key) {
      acc[key] = index;
    }
    return acc;
  }, {});
}

function pick(row, headers, keys, fallbackIndex = null) {
  const key = keys.find((item) => headers[item] !== undefined);
  if (key) {
    return row[headers[key]];
  }
  return fallbackIndex === null ? undefined : row[fallbackIndex];
}

function codigoPareceApropriacao(value) {
  const codigo = normalizarCodigoApropriacao(value);
  return /^\d+(?:\.\d+)*$/.test(codigo);
}

function parseLinhasModelo(rows, headerIndex) {
  const headers = mapHeaders(rows[headerIndex] || []);
  const linhas = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const codigo = normalizarCodigoApropriacao(pick(row, headers, ['codigo']));
    const descricao = String(pick(row, headers, ['descricao']) || '').trim();
    const codigoObra = String(pick(row, headers, ['codigo_obra', 'obra_codigo']) || '').trim();
    const codigoPai = normalizarCodigoApropriacao(pick(row, headers, ['codigo_apropriacao_pai', 'codigo_pai', 'apropriacao_pai']));

    if (!codigo || !codigoPareceApropriacao(codigo)) {
      continue;
    }

    linhas.push({
      codigo_obra: codigoObra,
      codigo,
      descricao,
      valor_orcado: parseValorOrcado(pick(row, headers, ['valor_orcado', 'orcado', 'valor', 'preco_total', 'preco']), 0),
      somadora: parseBoolean(pick(row, headers, ['somadora', 'conta_somadora', 'soma']), null),
      codigo_apropriacao_pai: codigoPai
    });
  }

  return linhas;
}

function parseLinhasSienge(rows) {
  const linhas = [];

  for (const row of rows) {
    const codigo = normalizarCodigoApropriacao(row[0]);
    if (!codigoPareceApropriacao(codigo)) {
      continue;
    }

    const descricao = String(row[3] || row[1] || row[2] || '').trim();
    if (!descricao) {
      continue;
    }

    linhas.push({
      codigo,
      descricao,
      valor_orcado: parseValorOrcado(row[23] || row[24] || row[25], 0),
      somadora: null,
      codigo_apropriacao_pai: ''
    });
  }

  return linhas;
}

function extrairLinhasXlsx(file) {
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const linhas = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: ''
    });

    const headerIndex = findHeaderRow(rows);
    const linhasPlanilha = headerIndex >= 0
      ? parseLinhasModelo(rows, headerIndex)
      : parseLinhasSienge(rows);

    linhas.push(...linhasPlanilha);
  });

  return linhas;
}

async function validarObra(obraId) {
  const obra = await Obra.findByPk(obraId);
  if (!obra) {
    const error = new Error('Obra nao encontrada');
    error.statusCode = 400;
    throw error;
  }
  if (!isObraCentroCusto(obra.tipo_centro_custo)) {
    const error = new Error('Apropriacoes so podem ser cadastradas para registros marcados como obra.');
    error.statusCode = 400;
    throw error;
  }
  return obra;
}

async function resolverObraId(linha, obraIdPadrao, cache) {
  if (obraIdPadrao) {
    return Number(obraIdPadrao);
  }

  const codigoObra = String(linha.codigo_obra || '').trim();
  if (!codigoObra) {
    return null;
  }

  if (cache.has(codigoObra)) {
    return cache.get(codigoObra);
  }

  const obra = await Obra.findOne({
    where: { codigo: codigoObra }
  });
  const id = obra?.id ? Number(obra.id) : null;
  cache.set(codigoObra, id);
  return id;
}

async function resolverPaiPorCodigo(obraId, codigo, ignorarId = null, transaction = null) {
  const apropriacoes = await Apropriacao.findAll({
    where: {
      obra_id: obraId,
      ativo: true,
      ...(ignorarId ? { id: { [Op.ne]: ignorarId } } : {})
    },
    transaction
  });

  return apropriacoes
    .filter((item) => codigoEhPaiDe(item.codigo, codigo))
    .sort((a, b) => normalizarCodigoApropriacao(b.codigo).length - normalizarCodigoApropriacao(a.codigo).length)[0] || null;
}

async function possuiFilhosPorCodigo(obraId, codigo, ignorarId = null, transaction = null) {
  const apropriacoes = await Apropriacao.findAll({
    where: {
      obra_id: obraId,
      ativo: true,
      ...(ignorarId ? { id: { [Op.ne]: ignorarId } } : {})
    },
    transaction
  });
  return apropriacoes.some((item) => codigoEhPaiDe(codigo, item.codigo));
}

async function resolverPaiInformado(obraId, codigoPai, apropriacaoPaiId, transaction = null) {
  if (apropriacaoPaiId) {
    return Apropriacao.findOne({
      where: {
        id: apropriacaoPaiId,
        obra_id: obraId,
        ativo: true
      },
      transaction
    });
  }

  if (codigoPai) {
    return Apropriacao.findOne({
      where: {
        obra_id: obraId,
        codigo: codigoPai,
        ativo: true
      },
      transaction
    });
  }

  return null;
}

async function atualizarHierarquiaApropriacao(apropriacao, options = {}) {
  const transaction = options.transaction || null;
  const paiInformado = await resolverPaiInformado(
    apropriacao.obra_id,
    options.codigoPai,
    options.apropriacaoPaiId,
    transaction
  );
  const paiInferido = paiInformado || await resolverPaiPorCodigo(
    apropriacao.obra_id,
    apropriacao.codigo,
    apropriacao.id,
    transaction
  );
  const temFilhos = await possuiFilhosPorCodigo(
    apropriacao.obra_id,
    apropriacao.codigo,
    apropriacao.id,
    transaction
  );

  const somadora = Boolean(options.somadora || temFilhos);
  await apropriacao.update({
    somadora,
    apropriacao_pai_id: paiInferido?.id || null
  }, { transaction });

  if (paiInferido && !paiInferido.somadora) {
    await paiInferido.update({ somadora: true }, { transaction });
  }

  return apropriacao.reload({
    include: [{ model: Apropriacao, as: 'apropriacao_pai', attributes: ['id', 'codigo', 'descricao'] }],
    transaction
  });
}

module.exports = {
  modeloXlsx(req, res) {
    try {
      const linhasModelo = [
        ['codigo_obra', 'codigo', 'descricao', 'valor_orcado', 'somadora', 'codigo_apropriacao_pai'],
        ['11111', '00.001', 'Projetos e estudos tecnicos', 0, 'sim', ''],
        ['11111', '00.001.001', 'Projetos arquitetonicos', 0, 'nao', '00.001'],
        ['11111', '00.001.002', 'Projetos complementares', 0, 'nao', '00.001']
      ];

      const instrucoes = [
        ['Modelo de importacao de apropriacoes por obra'],
        ['codigo_obra deve corresponder ao codigo da obra cadastrada no Fluxy.'],
        ['Preencha uma apropriacao por linha.'],
        ['codigo_obra e codigo sao obrigatorios. descricao e valor_orcado sao opcionais.'],
        ['somadora aceita sim/nao. Se ficar em branco, o sistema identifica pelo codigo. Ex.: 00.001 soma 00.001.001 e 00.001.002.'],
        ['codigo_apropriacao_pai e opcional. Quando vazio, o sistema usa o prefixo do codigo para encontrar a apropriacao pai.']
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
        include: [{ model: Apropriacao, as: 'apropriacao_pai', attributes: ['id', 'codigo', 'descricao'], required: false }],
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
      const codigo = normalizarCodigoApropriacao(req.body?.codigo);
      const descricao = req.body?.descricao != null ? String(req.body.descricao).trim() : '';
      const valorOrcado = parseValorOrcado(req.body?.valor_orcado, 0);
      const somadora = parseBoolean(req.body?.somadora, false);
      const apropriacaoPaiId = req.body?.apropriacao_pai_id ? Number(req.body.apropriacao_pai_id) : null;
      const codigoPai = normalizarCodigoApropriacao(req.body?.codigo_apropriacao_pai || req.body?.codigo_pai);

      if (!obra_id || !codigo) {
        return res.status(400).json({ error: 'Informe obra e codigo' });
      }

      await validarObra(obra_id);

      const apropriacao = await Apropriacao.create({
        obra_id,
        codigo,
        descricao: descricao || null,
        valor_orcado: valorOrcado,
        somadora
      });

      const data = await atualizarHierarquiaApropriacao(apropriacao, {
        somadora,
        apropriacaoPaiId,
        codigoPai
      });

      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao criar apropriacao' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const apropriacao = await Apropriacao.findByPk(id);

      if (!apropriacao) {
        return res.status(404).json({ error: 'Apropriacao nao encontrada' });
      }

      const obraId = req.body?.obra_id || apropriacao.obra_id;
      const codigo = req.body?.codigo != null ? normalizarCodigoApropriacao(req.body.codigo) : apropriacao.codigo;
      const descricao = req.body?.descricao != null ? String(req.body.descricao).trim() : apropriacao.descricao;
      const ativo = parseBoolean(req.body?.ativo, apropriacao.ativo);
      const valorOrcado = parseValorOrcado(req.body?.valor_orcado, Number(apropriacao.valor_orcado || 0));
      const somadora = parseBoolean(req.body?.somadora, apropriacao.somadora);
      const apropriacaoPaiId = req.body?.apropriacao_pai_id ? Number(req.body.apropriacao_pai_id) : null;
      const codigoPai = normalizarCodigoApropriacao(req.body?.codigo_apropriacao_pai || req.body?.codigo_pai);

      await validarObra(obraId);

      await apropriacao.update({
        obra_id: obraId,
        codigo: codigo || apropriacao.codigo,
        descricao: descricao === '' ? null : descricao,
        valor_orcado: valorOrcado,
        ativo
      });

      const data = await atualizarHierarquiaApropriacao(apropriacao, {
        somadora,
        apropriacaoPaiId,
        codigoPai
      });

      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao atualizar apropriacao' });
    }
  },

  async importarXlsx(req, res) {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ error: 'Arquivo Excel e obrigatorio' });
      }

      const linhasExtraidas = extrairLinhasXlsx(req.file);
      if (!linhasExtraidas.length) {
        return res.status(400).json({ error: 'Nenhuma apropriacao encontrada no arquivo.' });
      }

      const obraIdPadrao = req.body?.obra_id ? Number(req.body.obra_id) : null;
      if (obraIdPadrao) {
        await validarObra(obraIdPadrao);
      }

      const obraCache = new Map();
      const linhasValidas = [];
      const erros = [];

      for (const [index, linha] of linhasExtraidas.entries()) {
        const obraId = await resolverObraId(linha, obraIdPadrao, obraCache);
        if (!obraId) {
          erros.push({ linha: index + 1, codigo: linha.codigo, erro: 'Obra nao identificada para esta apropriacao.' });
          continue;
        }

        linhasValidas.push({ ...linha, obra_id: obraId });
      }

      if (!linhasValidas.length) {
        return res.status(400).json({ error: 'Nenhuma linha valida encontrada para importacao.', erros });
      }

      const resultado = await sequelize.transaction(async (transaction) => {
        const porObra = new Map();
        for (const linha of linhasValidas) {
          if (!porObra.has(linha.obra_id)) {
            porObra.set(linha.obra_id, []);
          }
          porObra.get(linha.obra_id).push(linha);
        }

        const registrosSalvos = [];
        let criados = 0;
        let atualizados = 0;
        let somadorasIdentificadas = 0;

        for (const [obraId, linhasObra] of porObra.entries()) {
          const codigosObra = linhasObra.map((linha) => linha.codigo);
          for (const linha of linhasObra) {
            const somadoraInferida = linha.somadora === null
              ? inferirSomadora(linha.codigo, codigosObra)
              : Boolean(linha.somadora);
            if (somadoraInferida) {
              somadorasIdentificadas += 1;
            }

            const existente = await Apropriacao.findOne({
              where: {
                obra_id: obraId,
                codigo: linha.codigo,
                ativo: true
              },
              transaction
            });

            if (existente) {
              await existente.update({
                descricao: linha.descricao || existente.descricao,
                valor_orcado: linha.valor_orcado,
                somadora: Boolean(somadoraInferida || existente.somadora)
              }, { transaction });
              registrosSalvos.push({ registro: existente, linha, somadora: Boolean(somadoraInferida || existente.somadora) });
              atualizados += 1;
            } else {
              const criado = await Apropriacao.create({
                obra_id: obraId,
                codigo: linha.codigo,
                descricao: linha.descricao || null,
                valor_orcado: linha.valor_orcado,
                somadora: Boolean(somadoraInferida)
              }, { transaction });
              registrosSalvos.push({ registro: criado, linha, somadora: Boolean(somadoraInferida) });
              criados += 1;
            }
          }
        }

        for (const item of registrosSalvos) {
          await atualizarHierarquiaApropriacao(item.registro, {
            transaction,
            somadora: item.somadora,
            codigoPai: item.linha.codigo_apropriacao_pai
          });
        }

        return { criados, atualizados, somadorasIdentificadas };
      });

      return res.json({
        importados: resultado.criados + resultado.atualizados,
        criados: resultado.criados,
        atualizados: resultado.atualizados,
        somadoras_identificadas: resultado.somadorasIdentificadas,
        erros
      });
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao importar apropriacoes' });
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
