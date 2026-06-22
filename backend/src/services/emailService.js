const nodemailer = require('nodemailer');

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

function getMailConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: parseBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER
  };
}

function isEmailConfigured() {
  const config = getMailConfig();
  return Boolean(config.host && config.port && config.user && config.pass && config.from);
}

function createTransport() {
  const config = getMailConfig();
  if (!isEmailConfigured()) {
    const error = new Error('Servico de email nao configurado. Revise SMTP_HOST, SMTP_USER, SMTP_PASS e MAIL_FROM.');
    error.statusCode = 500;
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

async function sendMail({ to, subject, text, html }) {
  const config = getMailConfig();
  const transport = createTransport();

  return transport.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html
  });
}

module.exports = {
  getMailConfig,
  isEmailConfigured,
  sendMail
};
