'use strict';

const fs = require('fs/promises');
const path = require('path');
const tls = require('tls');
const { Op } = require('sequelize');
const {
  FiscalCertificate,
  FiscalCompany,
  sequelize
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');
const {
  decryptFiscalSecret,
  encryptFiscalSecret,
  isFiscalCryptoConfigured
} = require('./fiscalCryptoService');

const STORAGE_TYPES = ['local_secure_path', 's3_private', 'secrets_manager'];

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeCertificate(certificate) {
  if (!certificate) return null;
  const plain = typeof certificate.get === 'function' ? certificate.get({ plain: true }) : certificate;
  delete plain.certificate_path_encrypted;
  delete plain.certificate_s3_key_encrypted;
  delete plain.password_encrypted;
  return plain;
}

function assertCryptoWhenSecrets(payload) {
  const hasSecret = Boolean(payload.certificate_path || payload.certificate_s3_key || payload.password);
  if (hasSecret && !isFiscalCryptoConfigured()) {
    throw createHttpError('Criptografia fiscal nao configurada. Informe FISCAL_CRYPTO_KEY antes de cadastrar certificado.', 400);
  }
}

function normalizeLocalPath(localPath) {
  const normalized = path.normalize(String(localPath || '').trim());
  if (!normalized || normalized.includes('\0')) {
    throw createHttpError('Caminho do certificado invalido.');
  }
  if (!path.isAbsolute(normalized)) {
    throw createHttpError('O caminho local do certificado deve ser absoluto.');
  }
  return normalized;
}

async function validateLocalPfxFile({ certificatePath, passphrase }) {
  const normalized = normalizeLocalPath(certificatePath);
  const stat = await fs.stat(normalized);
  if (!stat.isFile()) {
    throw createHttpError('O caminho informado nao aponta para um arquivo de certificado.');
  }

  const pfx = await fs.readFile(normalized);
  if (!pfx.length) {
    throw createHttpError('Arquivo de certificado vazio.');
  }

  tls.createSecureContext({
    pfx,
    ...(passphrase ? { passphrase } : {})
  });

  return {
    normalized,
    size: stat.size
  };
}

async function listarFiscalCertificates(query = {}) {
  const where = {};
  if (query.company_id) where.fiscal_company_id = query.company_id;
  if (query.is_active !== undefined) where.is_active = query.is_active;

  const certificates = await FiscalCertificate.findAll({
    where,
    include: [
      {
        model: FiscalCompany,
        as: 'company',
        attributes: ['id', 'razao_social', 'cnpj', 'uf', 'ambiente_sefaz'],
        required: false
      }
    ],
    order: [['is_active', 'DESC'], ['certificate_alias', 'ASC']]
  });

  return certificates.map(sanitizeCertificate);
}

async function criarFiscalCertificate(req, payload) {
  assertCryptoWhenSecrets(payload);

  return sequelize.transaction(async (transaction) => {
    const company = await FiscalCompany.findByPk(payload.fiscal_company_id, { transaction });
    if (!company) throw createHttpError('Empresa fiscal nao encontrada.', 404);

    if (!STORAGE_TYPES.includes(payload.storage_type)) {
      throw createHttpError('Tipo de armazenamento do certificado invalido.');
    }

    if (payload.storage_type === 'local_secure_path' && !payload.certificate_path) {
      throw createHttpError('Informe o caminho local seguro do certificado.');
    }

    if (payload.storage_type === 's3_private' && !payload.certificate_s3_key) {
      throw createHttpError('Informe a chave S3 privada do certificado.');
    }

    if (payload.is_active) {
      await FiscalCertificate.update(
        { is_active: false, updated_by: req.user?.id || null },
        {
          where: {
            fiscal_company_id: payload.fiscal_company_id,
            is_active: true
          },
          transaction
        }
      );
    }

    const certificate = await FiscalCertificate.create({
      fiscal_company_id: payload.fiscal_company_id,
      certificate_alias: payload.certificate_alias,
      storage_type: payload.storage_type,
      certificate_path_encrypted: payload.certificate_path
        ? encryptFiscalSecret(normalizeLocalPath(payload.certificate_path))
        : null,
      certificate_s3_key_encrypted: payload.certificate_s3_key
        ? encryptFiscalSecret(payload.certificate_s3_key)
        : null,
      password_encrypted: payload.password ? encryptFiscalSecret(payload.password) : null,
      valid_from: payload.valid_from || null,
      valid_until: payload.valid_until || null,
      serial_number: payload.serial_number || null,
      issuer: payload.issuer || null,
      subject: payload.subject || null,
      is_active: Boolean(payload.is_active),
      validation_status: 'pending',
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null
    }, { transaction });

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FISCAL_CERTIFICATE_CREATED',
      recursoTipo: 'FISCAL_CERTIFICATE',
      recursoId: certificate.id,
      status: 'SUCCESS',
      descricao: 'Metadados de certificado fiscal cadastrados',
      metadata: {
        fiscal_company_id: payload.fiscal_company_id,
        storage_type: payload.storage_type,
        is_active: Boolean(payload.is_active)
      }
    });

    return sanitizeCertificate(await FiscalCertificate.findByPk(certificate.id, {
      include: [
        {
          model: FiscalCompany,
          as: 'company',
          attributes: ['id', 'razao_social', 'cnpj', 'uf', 'ambiente_sefaz'],
          required: false
        }
      ],
      transaction
    }));
  });
}

async function validarFiscalCertificate(req, id) {
  const certificate = await FiscalCertificate.scope('withSecrets').findByPk(id, {
    include: [
      {
        model: FiscalCompany,
        as: 'company',
        attributes: ['id', 'razao_social', 'cnpj', 'uf', 'ambiente_sefaz'],
        required: false
      }
    ]
  });

  if (!certificate) throw createHttpError('Certificado fiscal nao encontrado.', 404);
  if (!isFiscalCryptoConfigured()) {
    throw createHttpError('Criptografia fiscal nao configurada. Informe FISCAL_CRYPTO_KEY para validar certificado.', 400);
  }

  const checks = [];
  let validationStatus = 'metadata_validated';

  if (certificate.valid_until) {
    const expired = new Date(certificate.valid_until).getTime() < Date.now();
    checks.push({
      name: 'validade_informada',
      status: expired ? 'ERROR' : 'OK',
      message: expired ? 'Certificado informado esta vencido.' : 'Validade informada ainda esta vigente.'
    });
    if (expired) validationStatus = 'expired';
  } else {
    checks.push({
      name: 'validade_informada',
      status: 'WARN',
      message: 'Validade nao informada nos metadados.'
    });
  }

  if (certificate.storage_type === 'local_secure_path') {
    const certificatePath = decryptFiscalSecret(certificate.certificate_path_encrypted);
    const passphrase = certificate.password_encrypted
      ? decryptFiscalSecret(certificate.password_encrypted)
      : null;
    const normalized = normalizeLocalPath(certificatePath);
    try {
      await fs.access(normalized);
      checks.push({
        name: 'arquivo_local',
        status: 'OK',
        message: 'Arquivo local encontrado e acessivel pelo processo backend.'
      });
      if (validationStatus !== 'expired') validationStatus = 'local_path_accessible';
    } catch {
      checks.push({
        name: 'arquivo_local',
        status: 'ERROR',
        message: 'Arquivo local nao encontrado ou sem permissao de leitura.'
      });
      validationStatus = 'local_path_error';
    }

    if (validationStatus !== 'local_path_error') {
      try {
        const pfxValidation = await validateLocalPfxFile({
          certificatePath: normalized,
          passphrase
        });
        checks.push({
          name: 'pfx_abre_com_senha',
          status: 'OK',
          message: `Arquivo PFX carregado com sucesso pelo backend (${pfxValidation.size} bytes).`
        });
        if (validationStatus !== 'expired') validationStatus = 'pfx_valid';
      } catch {
        checks.push({
          name: 'pfx_abre_com_senha',
          status: 'ERROR',
          message: 'Nao foi possivel abrir o PFX com a senha cadastrada. Revise arquivo e senha.'
        });
        validationStatus = 'pfx_error';
      }
    }
  } else if (certificate.storage_type === 's3_private') {
    decryptFiscalSecret(certificate.certificate_s3_key_encrypted);
    checks.push({
      name: 'storage_s3',
      status: 'WARN',
      message: 'Chave S3 criptografada existe, mas a leitura binaria sera validada na fase de SEFAZ/certificado.'
    });
  } else {
    checks.push({
      name: 'secrets_manager',
      status: 'WARN',
      message: 'Secrets Manager planejado para fase futura; metadados mantidos sem exposicao.'
    });
  }

  await certificate.update({
    last_validated_at: new Date(),
    validation_status: validationStatus,
    updated_by: req.user?.id || null
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FISCAL_CERTIFICATE_VALIDATED',
    recursoTipo: 'FISCAL_CERTIFICATE',
    recursoId: certificate.id,
    status: checks.some((check) => check.status === 'ERROR') ? 'ERROR' : 'SUCCESS',
    descricao: 'Validacao administrativa de certificado fiscal executada',
    metadata: {
      fiscal_company_id: certificate.fiscal_company_id,
      storage_type: certificate.storage_type,
      validation_status: validationStatus,
      checks: checks.map((check) => ({ name: check.name, status: check.status }))
    }
  });

  return {
    certificate: sanitizeCertificate(await FiscalCertificate.findByPk(certificate.id, {
      include: [
        {
          model: FiscalCompany,
          as: 'company',
          attributes: ['id', 'razao_social', 'cnpj', 'uf', 'ambiente_sefaz'],
          required: false
        }
      ]
    })),
    checks
  };
}

async function obterCertificadoAtivoComSegredos(fiscalCompanyId) {
  const certificate = await FiscalCertificate.scope('withSecrets').findOne({
    where: {
      fiscal_company_id: fiscalCompanyId,
      is_active: true,
      storage_type: { [Op.in]: STORAGE_TYPES }
    },
    order: [['updatedAt', 'DESC']]
  });

  if (!certificate) return null;

  return {
    ...certificate.get({ plain: true }),
    certificate_path: certificate.certificate_path_encrypted
      ? decryptFiscalSecret(certificate.certificate_path_encrypted)
      : null,
    certificate_s3_key: certificate.certificate_s3_key_encrypted
      ? decryptFiscalSecret(certificate.certificate_s3_key_encrypted)
      : null,
    password: certificate.password_encrypted
      ? decryptFiscalSecret(certificate.password_encrypted)
      : null
  };
}

module.exports = {
  criarFiscalCertificate,
  listarFiscalCertificates,
  obterCertificadoAtivoComSegredos,
  validateLocalPfxFile,
  validarFiscalCertificate
};
