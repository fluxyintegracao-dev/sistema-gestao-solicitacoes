const { env } = require('../config/env');
const { ConfiguracaoSistema } = require('../models');

const INSTALLATION_CONFIG_KEY = 'INSTALACAO_CONFIG';
// Compatibilidade temporaria para a instalacao atual ate a configuracao
// da instancia ser persistida e validada fora do contexto da construtora original.
const LEGACY_COMPAT_ALLOWED_ORIGINS = [
  'https://sistema-gestao-solicitacoes.vercel.app',
  'https://api.jrfluxy.com.br',
  'https://jrfluxy.com.br',
  'https://www.jrfluxy.com.br',
  'https://csc.jrfluxy.com.br',
  'https://dev.jrfluxy.com.br',
  'https://api-dev.jrfluxy.com.br'
];

function getDefaultInstallationConfig() {
  return {
    product_name: env.productName || 'Fluxy',
    company_name: env.companyName || '',
    company_legal_name: env.companyLegalName || '',
    logo_url: env.companyLogoUrl || '',
    pdf_logo_url: env.companyLogoUrl || '',
    domain: env.appDomain || '',
    allowed_origins: Array.isArray(env.corsAllowedOrigins) && env.corsAllowedOrigins.length > 0
      ? env.corsAllowedOrigins
      : LEGACY_COMPAT_ALLOWED_ORIGINS,
    login_title: env.productName || 'Fluxy',
    login_subtitle: '',
    pdf_company_name:
      env.companyLegalName ||
      env.companyName ||
      env.productName ||
      'Fluxy'
  };
}

function normalizeAllowedOrigins(value) {
  return Array.from(
    new Set(
      (Array.isArray(value) ? value : LEGACY_COMPAT_ALLOWED_ORIGINS)
        .map((item) => String(item || '').trim())
        .filter((item) => Boolean(item) && !item.includes('*'))
    )
  );
}

function normalizeInstallationConfig(input = {}) {
  const defaults = getDefaultInstallationConfig();
  const merged = {
    ...defaults,
    ...(input && typeof input === 'object' ? input : {})
  };

  return {
    product_name: String(merged.product_name || defaults.product_name).trim() || 'Fluxy',
    company_name: String(merged.company_name || '').trim(),
    company_legal_name: String(merged.company_legal_name || '').trim(),
    logo_url: String(merged.logo_url || '').trim(),
    pdf_logo_url: String(merged.pdf_logo_url || merged.logo_url || '').trim(),
    domain: String(merged.domain || '').trim(),
    allowed_origins: normalizeAllowedOrigins(merged.allowed_origins),
    login_title: String(merged.login_title || merged.product_name || defaults.product_name).trim() || 'Fluxy',
    login_subtitle: String(merged.login_subtitle || '').trim(),
    pdf_company_name:
      String(
        merged.pdf_company_name ||
          merged.company_legal_name ||
          merged.company_name ||
          merged.product_name ||
          defaults.product_name
      ).trim() || 'Fluxy'
  };
}

async function getInstallationConfigRecord() {
  return ConfiguracaoSistema.findOne({
    where: { chave: INSTALLATION_CONFIG_KEY },
    order: [['id', 'DESC']]
  });
}

async function getInstallationConfig() {
  const defaults = getDefaultInstallationConfig();
  const record = await getInstallationConfigRecord();

  if (!record?.valor) {
    return normalizeInstallationConfig(defaults);
  }

  try {
    const parsed = JSON.parse(record.valor);
    return normalizeInstallationConfig({
      ...defaults,
      ...(parsed && typeof parsed === 'object' ? parsed : {})
    });
  } catch {
    return normalizeInstallationConfig(defaults);
  }
}

async function saveInstallationConfig(payload = {}) {
  const current = await getInstallationConfig();
  const config = normalizeInstallationConfig({
    ...current,
    ...(payload && typeof payload === 'object' ? payload : {})
  });

  const record = await getInstallationConfigRecord();
  const valor = JSON.stringify(config);

  if (record) {
    await record.update({ valor });
  } else {
    await ConfiguracaoSistema.create({
      chave: INSTALLATION_CONFIG_KEY,
      valor
    });
  }

  return config;
}

module.exports = {
  INSTALLATION_CONFIG_KEY,
  getDefaultInstallationConfig,
  getInstallationConfig,
  normalizeInstallationConfig,
  saveInstallationConfig
};
