const bcrypt = require('bcryptjs');
const { Op, fn, col, where } = require('sequelize');
const { User, Setor } = require('../models');
const { registrarEventoSeguranca } = require('../services/securityLogService');
const { getModuloConfig } = require('../services/moduleConfigService');
const {
  canAccessFinanceiro,
  getAreasPermissoesForUser,
  getRhDpCapabilitiesForUser
} = require('../services/authorizationService');
const { marcarAtividadeUsuario } = require('../services/userActivityService');
const {
  buildAuthToken,
  buildMfaChallengeToken,
  clearAuthCookies,
  decodeTokenExpiry,
  generateCsrfToken,
  setAuthCookies,
  setCsrfHeader,
  setCsrfCookie,
  verifyMfaChallengeToken
} = require('../services/authSessionService');
const { env } = require('../config/env');
const {
  buildTotpSetup,
  generateTotpSecret,
  verifyTotpCode
} = require('../services/mfaService');
const { isMfaRequiredProfile } = require('../services/mfaPolicyService');
const { listarSetoresDoUsuario } = require('../services/usuariosSetores');

const SETOR_ATTRIBUTES = [
  'id',
  'nome',
  'codigo',
  'eh_setor_obra',
  'eh_setor_financeiro',
  'eh_setor_compras',
  'eh_setor_geo',
  'eh_setor_administrativo'
];

async function findUserByEmail(emailNormalizado) {
  return User.findOne({
    where: {
      [Op.or]: [
        { email: emailNormalizado },
        where(fn('LOWER', fn('TRIM', col('email'))), emailNormalizado)
      ]
    },
    include: [
      {
        model: Setor,
        as: 'setor',
        attributes: SETOR_ATTRIBUTES
      }
    ]
  });
}

async function buildSessionUser(user) {
  const modules = await getModuloConfig();
  const financeiroLiberado = await canAccessFinanceiro(user);
  const capacidadesRhDp = await getRhDpCapabilitiesForUser(user);
  const areasPermissoes = await getAreasPermissoesForUser(user);
  const mfaRequiredByPolicy = isMfaRequiredProfile(user);
  const mfaEnabled = Boolean(user.mfa_totp_enabled);
  const setores = await listarSetoresDoUsuario(user);

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    setor_id: user.setor_id,
    setor: user.setor,
    setores,
    financeiro_liberado: Boolean(financeiroLiberado),
    rh_dp_capacidades: capacidadesRhDp.filter((item) => item.startsWith('rh_dp_')),
    integracao_sienge_capacidades: capacidadesRhDp.filter((item) => item.startsWith('integracao_sienge_')),
    areas_permissoes: areasPermissoes,
    pode_criar_solicitacao_compra: Boolean(user.pode_criar_solicitacao_compra),
    pode_enviar_qualquer_setor: Boolean(user.pode_enviar_qualquer_setor),
    modulos_habilitados: modules,
    mfa_totp_enabled: Boolean(user.mfa_totp_enabled),
    mfa_required_by_policy: mfaRequiredByPolicy,
    mfa_setup_pending: mfaRequiredByPolicy && !mfaEnabled
  };
}

function buildAuthPayload(user) {
  return {
    id: user.id,
    perfil: user.perfil,
    area: user.setor?.codigo || null,
    setor_id: user.setor_id
  };
}

async function issueAuthenticatedSession(req, res, user, options = {}) {
  const token = buildAuthToken({
    ...buildAuthPayload(user),
    mfa_setup_pending: Boolean(options.mfaSetupPending)
  });
  const csrfToken = generateCsrfToken();
  setAuthCookies(res, token, csrfToken);

  await registrarEventoSeguranca({
    req,
    usuarioId: user.id,
    tipoEvento: 'AUTH_LOGIN_SUCCESS',
    recursoTipo: 'AUTH',
    recursoId: user.id,
    status: 'SUCCESS',
    descricao: 'Login efetuado com sucesso'
  });

  await marcarAtividadeUsuario(user.id);

  return {
    token,
    session_expires_at: decodeTokenExpiry(token),
    user: await buildSessionUser(user)
  };
}

module.exports = {
  async login(req, res) {
    try {
      const emailNormalizado = String(req.body?.email || '').trim().toLowerCase();
      const senha = req.body?.senha;
      const user = await findUserByEmail(emailNormalizado);

      if (!user || !user.senha || user.ativo === false) {
        await registrarEventoSeguranca({
          req,
          tipoEvento: 'AUTH_LOGIN_FAILURE',
          recursoTipo: 'AUTH',
          recursoId: emailNormalizado || null,
          status: 'DENIED',
          descricao: 'Tentativa de login com credenciais invalidas'
        });
        return res.status(401).json({ error: 'Credenciais invalidas' });
      }

      const ok = await bcrypt.compare(String(senha), String(user.senha));
      if (!ok) {
        await registrarEventoSeguranca({
          req,
          usuarioId: user.id,
          tipoEvento: 'AUTH_LOGIN_FAILURE',
          recursoTipo: 'AUTH',
          recursoId: user.id,
          status: 'DENIED',
          descricao: 'Tentativa de login com credenciais invalidas'
        });
        return res.status(401).json({ error: 'Credenciais invalidas' });
      }

      const mfaRequiredByPolicy = isMfaRequiredProfile(user);
      const mfaEnabled = Boolean(user.mfa_totp_enabled && user.mfa_totp_secret);

      if (mfaEnabled) {
        await registrarEventoSeguranca({
          req,
          usuarioId: user.id,
          tipoEvento: 'AUTH_MFA_CHALLENGE_ISSUED',
          recursoTipo: 'AUTH',
          recursoId: user.id,
          status: 'INFO',
          descricao: 'Senha validada, MFA pendente para conclusao do login'
        });

        return res.json({
          mfa_required: true,
          challenge_token: buildMfaChallengeToken(user.id),
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            perfil: user.perfil,
            mfa_totp_enabled: true
          }
        });
      }

      if (mfaRequiredByPolicy) {
        await registrarEventoSeguranca({
          req,
          usuarioId: user.id,
          tipoEvento: 'AUTH_MFA_SETUP_REQUIRED',
          recursoTipo: 'AUTH',
          recursoId: user.id,
          status: 'INFO',
          descricao: 'Login permitido apenas para concluir configuracao obrigatoria de MFA'
        });

        return res.json(await issueAuthenticatedSession(req, res, user, { mfaSetupPending: true }));
      }

      return res.json(await issueAuthenticatedSession(req, res, user, { mfaSetupPending: false }));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro no login' });
    }
  },

  async loginMfa(req, res) {
    try {
      const { challenge_token: challengeToken, codigo } = req.body;

      let decoded;
      try {
        decoded = verifyMfaChallengeToken(challengeToken);
      } catch {
        return res.status(401).json({ error: 'Desafio MFA invalido ou expirado.' });
      }

      const user = await User.findByPk(decoded.id, {
        include: [
          {
            model: Setor,
            as: 'setor',
            attributes: SETOR_ATTRIBUTES
          }
        ]
      });

      if (!user || user.ativo === false || !user.mfa_totp_enabled || !user.mfa_totp_secret) {
        return res.status(401).json({ error: 'MFA nao esta disponivel para este usuario.' });
      }

      if (!verifyTotpCode(user.mfa_totp_secret, codigo)) {
        await registrarEventoSeguranca({
          req,
          usuarioId: user.id,
          tipoEvento: 'AUTH_MFA_FAILURE',
          recursoTipo: 'AUTH',
          recursoId: user.id,
          status: 'DENIED',
          descricao: 'Codigo MFA invalido no login'
        });
        return res.status(401).json({ error: 'Codigo de autenticacao invalido.' });
      }

      await user.update({
        mfa_totp_last_verified_at: new Date()
      });

      await registrarEventoSeguranca({
        req,
        usuarioId: user.id,
        tipoEvento: 'AUTH_MFA_SUCCESS',
        recursoTipo: 'AUTH',
        recursoId: user.id,
        status: 'SUCCESS',
        descricao: 'MFA validado com sucesso no login'
      });

      return res.json(await issueAuthenticatedSession(req, res, user, { mfaSetupPending: false }));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao validar autenticacao em duas etapas.' });
    }
  },

  async me(req, res) {
    try {
      if (req.auth_mode === 'cookie') {
        const currentCsrfToken = String(req.cookies?.[env.csrfCookieName] || '').trim();
        if (currentCsrfToken) {
          setCsrfHeader(res, currentCsrfToken);
        } else {
          const expiresAtMs = Number(req.auth?.exp || 0) > 0
            ? (Number(req.auth.exp) * 1000) - Date.now()
            : null;
          setCsrfCookie(res, generateCsrfToken(), expiresAtMs && expiresAtMs > 0 ? expiresAtMs : null);
        }
      }

      return res.json({
        user: await buildSessionUser(req.user),
        session_expires_at: Number(req.auth?.exp || 0) > 0 ? Number(req.auth.exp) * 1000 : null
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao carregar sessao atual.' });
    }
  },

  async logout(req, res) {
    try {
      clearAuthCookies(res);
      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'AUTH_LOGOUT',
        recursoTipo: 'AUTH',
        recursoId: req.user?.id || null,
        status: 'SUCCESS',
        descricao: 'Logout efetuado com sucesso'
      });
      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao encerrar sessao.' });
    }
  },

  async mfaSetup(req, res) {
    try {
      const user = await User.findByPk(req.user?.id);
      if (!user || user.ativo === false) {
        return res.status(404).json({ error: 'Usuario nao encontrado.' });
      }

      if (user.mfa_totp_enabled && user.mfa_totp_secret) {
        return res.status(409).json({ error: 'MFA ja esta habilitado para este usuario.' });
      }

      const secret = generateTotpSecret();
      const setup = await buildTotpSetup(user, secret);

      await user.update({
        mfa_totp_temp_secret: secret
      });

      return res.json(setup);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao iniciar configuracao do MFA.' });
    }
  },

  async mfaEnable(req, res) {
    try {
      const user = await User.findByPk(req.user?.id);
      if (!user || user.ativo === false) {
        return res.status(404).json({ error: 'Usuario nao encontrado.' });
      }

      if (!user.mfa_totp_temp_secret) {
        return res.status(400).json({ error: 'Nenhuma configuracao MFA pendente para este usuario.' });
      }

      if (!verifyTotpCode(user.mfa_totp_temp_secret, req.body?.codigo)) {
        return res.status(401).json({ error: 'Codigo de autenticacao invalido.' });
      }

      await user.update({
        mfa_totp_enabled: true,
        mfa_totp_secret: user.mfa_totp_temp_secret,
        mfa_totp_temp_secret: null,
        mfa_totp_last_verified_at: new Date()
      });

      await registrarEventoSeguranca({
        req,
        usuarioId: user.id,
        tipoEvento: 'AUTH_MFA_ENABLED',
        recursoTipo: 'AUTH',
        recursoId: user.id,
        status: 'SUCCESS',
        descricao: 'MFA habilitado pelo usuario'
      });

      await user.reload({
        include: [
          {
            model: Setor,
            as: 'setor',
            attributes: SETOR_ATTRIBUTES
          }
        ]
      });

      return res.json(await issueAuthenticatedSession(req, res, user, { mfaSetupPending: false }));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao habilitar MFA.' });
    }
  },

  async mfaDisable(req, res) {
    try {
      const user = await User.findByPk(req.user?.id);
      if (!user || user.ativo === false) {
        return res.status(404).json({ error: 'Usuario nao encontrado.' });
      }

      if (!user.mfa_totp_enabled || !user.mfa_totp_secret) {
        return res.status(400).json({ error: 'MFA nao esta habilitado para este usuario.' });
      }

      if (isMfaRequiredProfile(user)) {
        return res.status(403).json({ error: 'Este perfil exige MFA obrigatorio e nao pode desabilitar essa protecao.' });
      }

      if (!verifyTotpCode(user.mfa_totp_secret, req.body?.codigo)) {
        return res.status(401).json({ error: 'Codigo de autenticacao invalido.' });
      }

      await user.update({
        mfa_totp_enabled: false,
        mfa_totp_secret: null,
        mfa_totp_temp_secret: null,
        mfa_totp_last_verified_at: null
      });

      await registrarEventoSeguranca({
        req,
        usuarioId: user.id,
        tipoEvento: 'AUTH_MFA_DISABLED',
        recursoTipo: 'AUTH',
        recursoId: user.id,
        status: 'SUCCESS',
        descricao: 'MFA desabilitado pelo usuario'
      });

      return res.json({ ok: true, mfa_totp_enabled: false });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao desabilitar MFA.' });
    }
  },

  async heartbeat(req, res) {
    try {
      await marcarAtividadeUsuario(req.user?.id);
      return res.json({ ok: true, recebido_em: new Date().toISOString() });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao registrar atividade da sessao' });
    }
  }
};
