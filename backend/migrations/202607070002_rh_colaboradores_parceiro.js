const {
  columnExists,
  foreignKeyExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

function onlyDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function sanitizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function inferTipoPessoa(documento) {
  return onlyDigits(documento).length === 14 ? 'J' : 'F';
}

function inferPixTipoChave(chavePix, documentoFallback) {
  const raw = String(chavePix || '').trim();
  if (!raw) return null;
  if (raw.includes('@')) return 'EMAIL';

  const digits = onlyDigits(raw);
  const documento = onlyDigits(documentoFallback);
  if (digits.length === 14) return 'CNPJ';
  if (digits.length === 11) {
    return documento && digits === documento ? 'CPF' : 'TELEFONE';
  }
  if (digits.length === 10) return 'TELEFONE';
  return 'ALEATORIA';
}

function normalizePixChaveForType(tipoChave, chavePix) {
  const raw = String(chavePix || '').trim();
  if (!raw) return null;

  const tipo = String(tipoChave || '').toUpperCase();
  if (['CPF', 'CNPJ', 'TELEFONE'].includes(tipo)) {
    return onlyDigits(raw);
  }
  if (tipo === 'EMAIL') {
    return raw.toLowerCase();
  }
  return raw;
}

function buildPixUpdate(colaborador) {
  const updates = {};
  const pixPrincipal = sanitizeText(colaborador.chave_pix);
  const pixSecundaria = sanitizeText(colaborador.chave_pix_secundaria);
  const pixVariavel = sanitizeText(colaborador.chave_pix_variavel);

  if (pixPrincipal) {
    updates.pix_chave_fixa_1_tipo = inferPixTipoChave(pixPrincipal, colaborador.cpf);
    updates.pix_chave_fixa_1 = normalizePixChaveForType(updates.pix_chave_fixa_1_tipo, pixPrincipal);
  }
  if (pixSecundaria) {
    updates.pix_chave_fixa_2_tipo = inferPixTipoChave(pixSecundaria, colaborador.cpf);
    updates.pix_chave_fixa_2 = normalizePixChaveForType(updates.pix_chave_fixa_2_tipo, pixSecundaria);
  }
  if (pixVariavel) {
    updates.pix_chave_variavel_tipo = inferPixTipoChave(pixVariavel, colaborador.cpf);
    updates.pix_chave_variavel = normalizePixChaveForType(updates.pix_chave_variavel_tipo, pixVariavel);
  }

  return updates;
}

async function findParceiroByDocumento(sequelize, documento) {
  const [rows] = await sequelize.query(
    `SELECT id, telefone, email, pix_chave_fixa_1, pix_chave_fixa_2, pix_chave_variavel
       FROM parceiros
      WHERE cpf_cnpj = ?
      LIMIT 1`,
    { replacements: [documento] }
  );

  return rows?.[0] || null;
}

async function createParceiroFromColaborador(sequelize, colaborador, documento) {
  const pixFields = buildPixUpdate(colaborador);
  await sequelize.query(
    `INSERT INTO parceiros (
        cpf_cnpj,
        nome,
        telefone,
        email,
        tipo_pessoa,
        cliente,
        fornecedor,
        corretor,
        testemunha,
        pix_chave_fixa_1_tipo,
        pix_chave_fixa_1,
        pix_chave_fixa_2_tipo,
        pix_chave_fixa_2,
        pix_chave_variavel_tipo,
        pix_chave_variavel,
        ativo,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, 0, 1, 0, 0, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    {
      replacements: [
        documento,
        sanitizeText(colaborador.nome) || `Colaborador ${documento}`,
        sanitizeText(colaborador.telefone) || '',
        sanitizeText(colaborador.email),
        inferTipoPessoa(documento),
        pixFields.pix_chave_fixa_1_tipo || null,
        pixFields.pix_chave_fixa_1 || null,
        pixFields.pix_chave_fixa_2_tipo || null,
        pixFields.pix_chave_fixa_2 || null,
        pixFields.pix_chave_variavel_tipo || null,
        pixFields.pix_chave_variavel || null
      ]
    }
  );

  return findParceiroByDocumento(sequelize, documento);
}

async function updateParceiroFromColaborador(sequelize, parceiro, colaborador) {
  const nome = sanitizeText(colaborador.nome);
  const telefone = sanitizeText(colaborador.telefone);
  const email = sanitizeText(colaborador.email);
  const pixFields = buildPixUpdate(colaborador);

  await sequelize.query(
    `UPDATE parceiros
        SET nome = COALESCE(?, nome),
            telefone = COALESCE(?, telefone),
            email = COALESCE(?, email),
            fornecedor = 1,
            ativo = 1,
            pix_chave_fixa_1_tipo = CASE WHEN ? IS NOT NULL THEN ? ELSE pix_chave_fixa_1_tipo END,
            pix_chave_fixa_1 = COALESCE(?, pix_chave_fixa_1),
            pix_chave_fixa_2_tipo = CASE WHEN ? IS NOT NULL THEN ? ELSE pix_chave_fixa_2_tipo END,
            pix_chave_fixa_2 = COALESCE(?, pix_chave_fixa_2),
            pix_chave_variavel_tipo = CASE WHEN ? IS NOT NULL THEN ? ELSE pix_chave_variavel_tipo END,
            pix_chave_variavel = COALESCE(?, pix_chave_variavel),
            updatedAt = NOW()
      WHERE id = ?`,
    {
      replacements: [
        nome,
        telefone,
        email,
        pixFields.pix_chave_fixa_1 || null,
        pixFields.pix_chave_fixa_1_tipo || null,
        pixFields.pix_chave_fixa_1 || null,
        pixFields.pix_chave_fixa_2 || null,
        pixFields.pix_chave_fixa_2_tipo || null,
        pixFields.pix_chave_fixa_2 || null,
        pixFields.pix_chave_variavel || null,
        pixFields.pix_chave_variavel_tipo || null,
        pixFields.pix_chave_variavel || null,
        parceiro.id
      ]
    }
  );
}

async function backfillParceiros(sequelize) {
  const [colaboradores] = await sequelize.query(
    `SELECT c.id,
            c.nome,
            c.cpf,
            c.telefone,
            c.email,
            p.chave_pix,
            p.chave_pix_secundaria,
            p.chave_pix_variavel
       FROM rh_colaboradores c
       LEFT JOIN rh_colaborador_pagamentos p
         ON p.colaborador_id = c.id
      WHERE c.parceiro_id IS NULL
        AND c.cpf IS NOT NULL
        AND c.cpf <> ''`
  );

  for (const colaborador of colaboradores) {
    const documento = onlyDigits(colaborador.cpf);
    if (![11, 14].includes(documento.length)) {
      continue;
    }

    let parceiro = await findParceiroByDocumento(sequelize, documento);
    if (!parceiro) {
      parceiro = await createParceiroFromColaborador(sequelize, colaborador, documento);
    } else {
      await updateParceiroFromColaborador(sequelize, parceiro, colaborador);
    }

    if (parceiro?.id) {
      await sequelize.query(
        'UPDATE rh_colaboradores SET parceiro_id = ?, updatedAt = updatedAt WHERE id = ?',
        { replacements: [parceiro.id, colaborador.id] }
      );
    }
  }
}

module.exports = {
  async up({ DataTypes, sequelize }) {
    if (!(await tableExists(sequelize, 'rh_colaboradores')) || !(await tableExists(sequelize, 'parceiros'))) {
      return;
    }

    const queryInterface = sequelize.getQueryInterface();

    if (!(await columnExists(sequelize, 'rh_colaboradores', 'parceiro_id'))) {
      await queryInterface.addColumn('rh_colaboradores', 'parceiro_id', {
        type: DataTypes.INTEGER,
        allowNull: true
      });
    }

    if (!(await indexExists(sequelize, 'rh_colaboradores', 'idx_rh_colaboradores_parceiro'))) {
      await sequelize.query('CREATE INDEX idx_rh_colaboradores_parceiro ON rh_colaboradores (parceiro_id)');
    }

    if (!(await foreignKeyExists(sequelize, 'rh_colaboradores', 'fk_rh_colaboradores_parceiro'))) {
      await sequelize.query(
        'ALTER TABLE rh_colaboradores ADD CONSTRAINT fk_rh_colaboradores_parceiro FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE SET NULL ON UPDATE CASCADE'
      );
    }

    await backfillParceiros(sequelize);
  }
};
