const { QueryTypes } = require('sequelize');
const sequelize = require('../database');

const CHAVE_TIMEOUT_INATIVIDADE = 'TIMEOUT_INATIVIDADE_MINUTOS';
const DEFAULT_TIMEOUT_MINUTES = 20;
const ACTIVITY_UPDATE_THROTTLE_SECONDS = 60;

function normalizePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

async function obterJanelaConcorrenciaMinutos(sequelizeInstance = sequelize) {
  try {
    const [row] = await sequelizeInstance.query(
      `SELECT valor
         FROM configuracoes_sistema
        WHERE chave = :chave
        ORDER BY id DESC
        LIMIT 1`,
      {
        replacements: { chave: CHAVE_TIMEOUT_INATIVIDADE },
        type: QueryTypes.SELECT
      }
    );

    return normalizePositiveInt(row?.valor, DEFAULT_TIMEOUT_MINUTES);
  } catch {
    return DEFAULT_TIMEOUT_MINUTES;
  }
}

async function marcarAtividadeUsuario(usuarioId, sequelizeInstance = sequelize) {
  const normalizedId = Number(usuarioId);
  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    return false;
  }

  try {
    await sequelizeInstance.query(
      `UPDATE users
          SET ultimo_acesso_em = NOW()
        WHERE id = :usuarioId
          AND (
            ultimo_acesso_em IS NULL
            OR ultimo_acesso_em < DATE_SUB(NOW(), INTERVAL ${ACTIVITY_UPDATE_THROTTLE_SECONDS} SECOND)
          )`,
      {
        replacements: { usuarioId: normalizedId },
        type: QueryTypes.UPDATE
      }
    );

    return true;
  } catch {
    return false;
  }
}

async function contarUsuariosSimultaneos(sequelizeInstance = sequelize) {
  const janelaMinutos = await obterJanelaConcorrenciaMinutos(sequelizeInstance);

  try {
    const [row] = await sequelizeInstance.query(
      `SELECT COUNT(*) AS total
         FROM users
        WHERE ativo = 1
          AND UPPER(TRIM(COALESCE(perfil, ''))) <> 'SUPERADMIN'
          AND ultimo_acesso_em IS NOT NULL
          AND ultimo_acesso_em >= DATE_SUB(NOW(), INTERVAL ${janelaMinutos} MINUTE)`,
      { type: QueryTypes.SELECT }
    );

    return {
      total: Number(row?.total || 0),
      janelaMinutos
    };
  } catch {
    return {
      total: 0,
      janelaMinutos
    };
  }
}

module.exports = {
  ACTIVITY_UPDATE_THROTTLE_SECONDS,
  CHAVE_TIMEOUT_INATIVIDADE,
  DEFAULT_TIMEOUT_MINUTES,
  contarUsuariosSimultaneos,
  marcarAtividadeUsuario,
  obterJanelaConcorrenciaMinutos
};
