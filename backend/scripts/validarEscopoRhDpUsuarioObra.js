const assert = require('assert');
const { Op } = require('sequelize');
const { RhColaborador, UsuarioObra } = require('../src/models');
const {
  canAccessRhDp,
  canManageRhDpColaboradores,
  canViewRhDpColaboradores,
  canViewRhDpDashboard,
  canViewRhDpDocumentos,
  canViewRhDpObrigacoes,
  getRhDpObraScopeIds
} = require('../src/services/authorizationService');
const { detalharColaboradorRh, listarColaboradoresRh } = require('../src/services/rhService');
const rhSolicitacaoService = require('../src/services/rhSolicitacaoService');

async function executar() {
  const usuarioObra = {
    id: 987654,
    perfil: 'USUARIO',
    setor: { id: 1, codigo: 'OBRA', nome: 'Obra', eh_setor_obra: true }
  };

  assert.strictEqual(await canAccessRhDp(usuarioObra), true, 'OBRA deve acessar o modulo RH/DP');
  assert.strictEqual(await canViewRhDpColaboradores(usuarioObra), true, 'OBRA deve acessar Pessoal');
  assert.strictEqual(await canManageRhDpColaboradores(usuarioObra), false, 'OBRA nao gerencia o cadastro geral');
  assert.strictEqual(await canViewRhDpDashboard(usuarioObra), false, 'OBRA nao acessa relatorios do RH/DP');
  assert.strictEqual(await canViewRhDpDocumentos(usuarioObra), false, 'OBRA nao acessa a area geral de documentos');
  assert.strictEqual(await canViewRhDpObrigacoes(usuarioObra), false, 'OBRA nao acessa fechamentos');

  const originalFindAll = UsuarioObra.findAll;
  UsuarioObra.findAll = async ({ where }) => {
    assert.strictEqual(Number(where.user_id), usuarioObra.id, 'o escopo deve usar o usuario autenticado');
    return [{ obra_id: 12 }, { obra_id: 12 }, { obra_id: 35 }];
  };

  try {
    assert.deepStrictEqual(
      await getRhDpObraScopeIds(usuarioObra),
      [12, 35],
      'o escopo do RH/DP deve conter somente as obras vinculadas, sem duplicidade'
    );
  } finally {
    UsuarioObra.findAll = originalFindAll;
  }

  const originalColaboradorFindAll = RhColaborador.findAll;
  const originalColaboradorFindOne = RhColaborador.findOne;
  const originalPedidosAbertos = rhSolicitacaoService.pedidosAbertosPorColaborador;

  RhColaborador.findAll = async ({ where }) => {
    assert.deepStrictEqual(where.obra_id[Op.in], [12, 35], 'a listagem deve filtrar pelas obras vinculadas');
    return [];
  };
  RhColaborador.findOne = async ({ where }) => {
    assert.strictEqual(Number(where.id), 55, 'o detalhe deve preservar o colaborador solicitado');
    assert.deepStrictEqual(where.obra_id[Op.in], [12, 35], 'o detalhe deve exigir obra vinculada');
    return null;
  };
  rhSolicitacaoService.pedidosAbertosPorColaborador = async () => new Map();

  try {
    assert.deepStrictEqual(await listarColaboradoresRh({ obra_ids: [12, 35] }), []);
    await assert.rejects(
      () => listarColaboradoresRh({ obra_id: 99, obra_ids: [12, 35] }),
      (error) => error.statusCode === 403
    );
    await assert.rejects(
      () => detalharColaboradorRh(55, { obra_ids: [12, 35] }),
      (error) => error.statusCode === 403
    );
  } finally {
    RhColaborador.findAll = originalColaboradorFindAll;
    RhColaborador.findOne = originalColaboradorFindOne;
    rhSolicitacaoService.pedidosAbertosPorColaborador = originalPedidosAbertos;
  }

  console.log('Validacao do escopo RH/DP para usuario de OBRA concluida com sucesso.');
}

executar()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
