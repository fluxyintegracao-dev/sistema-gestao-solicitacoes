const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models');
const { registrarEventoSeguranca } = require('./securityLogService');
const { sendMail } = require('./emailService');
const {
  assertStrongPassword,
  generatePasswordResetToken,
  generateTemporaryPassword,
  hashPasswordResetToken
} = require('./passwordPolicyService');

const DEFAULT_EXPIRES_HOURS = 2;

function buildPasswordResetUrl(token) {
  const base = String(
    process.env.PASSWORD_RESET_URL ||
    process.env.FRONTEND_URL ||
    process.env.APP_FRONTEND_URL ||
    ''
  ).trim().replace(/\/+$/g, '');

  if (!base) {
    const error = new Error('PASSWORD_RESET_URL ou FRONTEND_URL precisa estar configurado para envio de senha.');
    error.statusCode = 500;
    error.code = 'PASSWORD_RESET_URL_MISSING';
    throw error;
  }

  const url = base.includes('/definir-senha') ? base : `${base}/definir-senha`;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

function renderPasswordEmail({ nome, resetUrl, isInvite }) {
  const title = isInvite ? 'Defina sua senha de acesso' : 'Redefina sua senha';
  const intro = isInvite
    ? 'Sua conta foi criada no sistema. Use o link abaixo para definir sua senha com seguranca.'
    : 'Recebemos uma solicitacao para redefinir sua senha. Use o link abaixo para criar uma nova senha.';

  const text = [
    `Ola, ${nome || 'usuario'}.`,
    '',
    intro,
    '',
    resetUrl,
    '',
    'A senha precisa ter no minimo 8 caracteres, letra maiuscula, letra minuscula, numero e caractere especial.',
    'Se voce nao solicitou esta acao, ignore este email.'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#14213d">
      <h2>${title}</h2>
      <p>Ola, ${nome || 'usuario'}.</p>
      <p>${intro}</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;background:#3558e6;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
          Definir senha
        </a>
      </p>
      <p style="font-size:13px;color:#53627d">A senha precisa ter no minimo 8 caracteres, letra maiuscula, letra minuscula, numero e caractere especial.</p>
      <p style="font-size:13px;color:#53627d">Se voce nao solicitou esta acao, ignore este email.</p>
    </div>
  `;

  return { subject: title, text, html };
}

async function createPasswordResetToken(user, options = {}) {
  const token = generatePasswordResetToken();
  const expiresAt = new Date(Date.now() + Number(options.expiresHours || DEFAULT_EXPIRES_HOURS) * 60 * 60 * 1000);

  await user.update({
    password_reset_token_hash: hashPasswordResetToken(token),
    password_reset_expires_at: expiresAt,
    password_setup_sent_at: new Date(),
    force_password_reset: true
  });

  return { token, expiresAt };
}

async function sendPasswordResetEmail(user, options = {}) {
  const { token } = await createPasswordResetToken(user, options);
  const resetUrl = buildPasswordResetUrl(token);
  const message = renderPasswordEmail({
    nome: user.nome,
    resetUrl,
    isInvite: options.isInvite !== false
  });

  await sendMail({
    to: user.email,
    ...message
  });

  await registrarEventoSeguranca({
    req: options.req,
    usuarioId: options.req?.user?.id || null,
    tipoEvento: options.isInvite === false ? 'PASSWORD_RESET_EMAIL_SENT' : 'USER_INVITE_EMAIL_SENT',
    recursoTipo: 'USER',
    recursoId: user.id,
    status: 'SUCCESS',
    descricao: options.isInvite === false ? 'Email de redefinicao de senha enviado' : 'Convite de definicao de senha enviado'
  });

  return { sent: true, expires_at: user.password_reset_expires_at };
}

async function requestPasswordResetByEmail(email, req) {
  const emailNormalizado = String(email || '').trim().toLowerCase();
  const user = await User.findOne({
    where: {
      email: emailNormalizado,
      ativo: true
    }
  });

  if (user) {
    await sendPasswordResetEmail(user, { req, isInvite: false });
  }

  return { ok: true };
}

async function resetPasswordByToken(token, password, req) {
  assertStrongPassword(password);

  const tokenHash = hashPasswordResetToken(token);
  const user = await User.findOne({
    where: {
      password_reset_token_hash: tokenHash,
      password_reset_expires_at: { [Op.gt]: new Date() },
      ativo: true
    }
  });

  if (!user) {
    const error = new Error('Link de definicao de senha invalido ou expirado.');
    error.statusCode = 400;
    error.code = 'PASSWORD_RESET_TOKEN_INVALID';
    throw error;
  }

  const senhaHash = await bcrypt.hash(String(password), 10);
  await user.update({
    senha: senhaHash,
    force_password_reset: false,
    password_reset_token_hash: null,
    password_reset_expires_at: null,
    password_changed_at: new Date()
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: user.id,
    tipoEvento: 'PASSWORD_RESET_SUCCESS',
    recursoTipo: 'USER',
    recursoId: user.id,
    status: 'SUCCESS',
    descricao: 'Senha definida por link seguro'
  });

  return { ok: true };
}

async function createUserPasswordPayload({ senha, forceInvite = false }) {
  if (senha && String(senha).trim()) {
    assertStrongPassword(senha);
    return {
      senhaHash: await bcrypt.hash(String(senha), 10),
      forcePasswordReset: Boolean(forceInvite),
      passwordChangedAt: forceInvite ? null : new Date()
    };
  }

  return {
    senhaHash: await bcrypt.hash(generateTemporaryPassword(), 10),
    forcePasswordReset: true,
    passwordChangedAt: null
  };
}

module.exports = {
  createPasswordResetToken,
  createUserPasswordPayload,
  requestPasswordResetByEmail,
  resetPasswordByToken,
  sendPasswordResetEmail
};
