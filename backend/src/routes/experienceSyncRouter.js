/**
 * Experience Sync Router
 * Rotas públicas (protegidas por API key) para o FLUXY EXPERIENCE sincronizar dados.
 * Montado FORA do routes.js principal para isolamento total.
 * Nunca expõe dados financeiros, contratos ou clientes.
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getPublicUnitPrice(unit = {}) {
  return toNumberOrNull(unit.valor_base_venda) ?? toNumberOrNull(unit.valor_tabela);
}

function normalizeSituacao(value) {
  const situacao = String(value || 'DISPONIVEL').toUpperCase();
  if (['VENDIDO', 'VENDIDA'].includes(situacao)) return 'VENDIDO';
  if (['RESERVADO', 'RESERVADA'].includes(situacao)) return 'RESERVADO';
  if (situacao === 'DISPONIVEL') return 'DISPONIVEL';
  return 'DISPONIVEL';
}

function isSoldUnit(unit = {}) {
  return normalizeSituacao(unit.situacao) === 'VENDIDO';
}

// Middleware: valida X-Experience-Sync-Key
function requireSyncKey(req, res, next) {
  const key = String(process.env.EXPERIENCE_SYNC_KEY || '').trim();
  if (!key) {
    return res.status(503).json({ error: 'Sincronizacao do Experience nao configurada' });
  }
  const header = String(req.headers['x-experience-sync-key'] || '').trim();
  const headerBuffer = Buffer.from(header);
  const keyBuffer = Buffer.from(key);
  if (headerBuffer.length !== keyBuffer.length || !crypto.timingSafeEqual(headerBuffer, keyBuffer)) {
    return res.status(401).json({ error: 'Chave de sincronização inválida' });
  }
  return next();
}

// GET /experience-sync/empreendimentos
// Retorna empreendimentos ativos com agregações de unidades.
// Dados: nome, localização, metragem, preços, disponibilidade.
// NÃO retorna: clientes, contratos, financeiro.
router.get('/empreendimentos', requireSyncKey, async (req, res) => {
  try {
    const { Empreendimento, UnidadeComercial, Obra } = require('../models');

    const empreendimentos = await Empreendimento.findAll({
      where: { ativo: true },
      include: [
        {
          model: UnidadeComercial,
          as: 'unidadesComerciais',
          where: { ativo: true },
          required: false,
          attributes: [
            'id', 'codigo', 'bloco', 'torre', 'pavimento',
            'tipologia', 'metragem_privativa',
            'valor_tabela', 'valor_base_venda', 'situacao'
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const data = empreendimentos.map((emp) => {
      const unidades = emp.unidadesComerciais || [];
      const disponiveis = unidades.filter((u) => normalizeSituacao(u.situacao) === 'DISPONIVEL');
      const precos = unidades
        .filter((u) => !isSoldUnit(u))
        .map(getPublicUnitPrice)
        .filter((v) => v !== null && v > 0);
      const areas = unidades
        .map((u) => Number(u.metragem_privativa || 0))
        .filter((v) => v > 0);

      return {
        core_id: emp.id,
        codigo: emp.codigo,
        nome: emp.nome,
        descricao: emp.descricao,
        endereco: emp.endereco,
        bairro: emp.bairro,
        cidade: emp.cidade,
        estado: emp.estado,
        cep: emp.cep,
        obra_id: emp.obra_id,
        unidades_total: unidades.length,
        unidades_disponiveis: disponiveis.length,
        preco_min: precos.length ? Math.min(...precos) : null,
        preco_max: precos.length ? Math.max(...precos) : null,
        area_privativa_min: areas.length ? Math.min(...areas) : null,
        area_privativa_max: areas.length ? Math.max(...areas) : null,
        tipologias: [...new Set(unidades.map((u) => u.tipologia).filter(Boolean))],
        unidades: unidades.map((u) => ({
          core_id: u.id,
          codigo: u.codigo,
          bloco: u.bloco,
          torre: u.torre,
          pavimento: u.pavimento,
          tipologia: u.tipologia,
          situacao: normalizeSituacao(u.situacao),
          preco: getPublicUnitPrice(u),
          valor_base_venda: toNumberOrNull(u.valor_base_venda),
          valor_tabela: toNumberOrNull(u.valor_tabela),
          area_privativa: Number(u.metragem_privativa || 0) || null,
        })),
        synced_at: new Date().toISOString()
      };
    });

    return res.json({ data, total: data.length });
  } catch (err) {
    console.error('[ExperienceSync] empreendimentos', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /experience-sync/health
router.get('/health', requireSyncKey, (req, res) => {
  res.json({ status: 'ok', service: 'fluxy-core-experience-sync' });
});

module.exports = router;
