'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  cadastrarResponsavelObra,
  listarAuditoriaObra,
  listarResponsaveisObra
} = require('../services/governancaService');

const moduleRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(moduleRoot, '..', '..', '..');
const frontendRoot = path.resolve(backendRoot, '..', 'frontend', 'src', 'modules', 'custosRecebiveis');

function read(relativePath) {
  return fs.readFileSync(relativePath, 'utf8');
}

function transactionRunner(callback) {
  return callback({ LOCK: { UPDATE: 'UPDATE' } });
}

const TEST_TODAY = new Date().toISOString().slice(0, 10);
const TEST_COMPETENCIA = TEST_TODAY.slice(0, 7);

async function validateBusinessGuards() {
  await assert.rejects(
    cadastrarResponsavelObra(
      { id: 1 },
      10,
      {
        user_id: 2,
        papel: 'RESPONSAVEL',
        competencia_inicial: TEST_COMPETENCIA,
        vigencia_inicio: TEST_TODAY
      },
      null,
      {}
    ),
    (error) => error.code === 'CR_IDEMPOTENCY_REQUIRED'
  );

  await assert.rejects(
    cadastrarResponsavelObra(
      { id: 1 },
      10,
      {
        user_id: 2,
        papel: 'RESPONSAVEL',
        competencia_inicial: '2020-01',
        vigencia_inicio: '2099-01-01'
      },
      'key',
      {}
    ),
    (error) => error.code === 'CR_RESPONSIBILITY_RETROACTIVE_FORBIDDEN'
  );
}

async function validateResponsibilityCreation() {
  const audit = [];
  const target = {
    id: 2,
    nome: 'Usuario Teste',
    email: 'teste@example.com',
    ativo: true,
    toJSON() {
      return { id: this.id, nome: this.nome, email: this.email, ativo: this.ativo };
    }
  };
  const created = {
    id: 9,
    obra_id: 10,
    user_id: 2,
    papel: 'SUBSTITUTO',
    competencia_inicial: TEST_COMPETENCIA,
    vigencia_inicio: TEST_TODAY,
    vigencia_fim: null,
    ativo: true,
    toJSON() {
      return { ...this };
    }
  };

  const result = await cadastrarResponsavelObra(
    { id: 1 },
    10,
    {
      user_id: 2,
      papel: 'SUBSTITUTO',
      competencia_inicial: TEST_COMPETENCIA,
      vigencia_inicio: TEST_TODAY
    },
    'cr-test-key',
    {
      sequelize: { transaction: transactionRunner },
      User: { findByPk: async () => target },
      UsuarioObra: { findOne: async () => ({ id: 3 }) },
      CrResponsavelObra: {
        findOne: async () => null,
        create: async () => created
      },
      CrAuditoria: {
        create: async (values) => {
          audit.push(values);
          return values;
        }
      }
    }
  );

  assert.strictEqual(result.idempotente, false);
  assert.strictEqual(result.responsabilidade.usuario.nome, 'Usuario Teste');
  assert.strictEqual(audit.length, 1);
  assert.strictEqual(audit[0].evento, 'RESPONSABILIDADE_OBRA_CADASTRADA');
}

async function validateListings() {
  const user = { id: 4, nome: 'Maria', email: 'maria@example.com', ativo: true };
  const result = await listarResponsaveisObra(10, {
    CrResponsavelObra: {
      findAll: async () => [{
        id: 7,
        obra_id: 10,
        user_id: 4,
        papel: 'RESPONSAVEL',
        competencia_inicial: '2099-01',
        vigencia_inicio: '2099-01-01',
        ativo: true,
        usuario: user
      }]
    },
    UsuarioObra: {
      findAll: async () => [
        { perfil: 'RESPONSAVEL', usuario: user },
        { perfil: 'RESPONSAVEL', usuario: user }
      ]
    },
    User: {}
  });
  assert.strictEqual(result.items.length, 1);
  assert.strictEqual(result.usuarios_elegiveis.length, 1);

  const auditResult = await listarAuditoriaObra(10, { limit: 999 }, {
    CrAuditoria: {
      findAll: async (options) => {
        assert.strictEqual(options.limit, 200);
        return [{
          id: 1,
          obra_id: 10,
          evento: 'TESTE',
          origem: 'web',
          criado_em: new Date(),
          usuario: user
        }];
      }
    },
    User: {}
  });
  assert.strictEqual(auditResult.items[0].usuario.nome, 'Maria');
}

function validateContracts() {
  const routes = read(path.join(moduleRoot, 'routes', 'index.js'));
  const controller = read(path.join(moduleRoot, 'controllers', 'CustosRecebiveisController.js'));
  const service = read(path.join(moduleRoot, 'services', 'governancaService.js'));
  const constants = read(path.join(frontendRoot, 'constants', 'custosRecebiveis.js'));
  const page = read(path.join(frontendRoot, 'pages', 'CustosRecebiveis.jsx'));
  const api = read(path.join(frontendRoot, 'services', 'custosRecebiveis.js'));

  [
    "'/obras/:obraId/responsaveis'",
    "'/responsaveis/:id/encerrar'",
    "'/obras/:obraId/auditoria'",
    'CUSTOS_RECEBIVEIS_PERMISSIONS.CONFIG_MANAGE',
    'CUSTOS_RECEBIVEIS_PERMISSIONS.AUDITORIA_VIEW'
  ].forEach((contract) => assert(routes.includes(contract), `Contrato ausente: ${contract}`));

  assert(controller.includes('static async cadastrarResponsavelObra'));
  assert(service.includes('CR_RESPONSIBILITY_WORK_SCOPE_REQUIRED'));
  assert(service.includes('RESPONSABILIDADE_OBRA_CADASTRADA'));
  assert(constants.includes("id: 'configuracoes'"));
  assert(constants.includes("id: 'auditoria'"));
  assert(page.includes('<CrConfiguracoesView'));
  assert(page.includes('<CrAuditoriaView'));
  assert(api.includes("'Idempotency-Key': newIdempotencyKey('cr-responsavel')"));
}

async function run() {
  await validateBusinessGuards();
  await validateResponsibilityCreation();
  await validateListings();
  validateContracts();
  console.log('Custos e Recebiveis: prontidao operacional validada.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
