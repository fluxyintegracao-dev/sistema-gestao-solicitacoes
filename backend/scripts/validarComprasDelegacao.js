const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  montarUsuariosElegiveisDelegacaoCompras
} = require('../src/services/comprasDelegacaoService');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

function validarRegraElegibilidade() {
  const resultado = montarUsuariosElegiveisDelegacaoCompras({
    setores: [
      { id: 10, nome: 'Compras', codigo: 'COMPRAS', ativo: true, eh_setor_compras: true },
      { id: 11, nome: 'Suprimentos', codigo: 'SUPRIMENTOS', ativo: true, eh_setor_compras: true },
      { id: 20, nome: 'Financeiro', codigo: 'FIN', ativo: true, eh_setor_compras: false },
      { id: 30, nome: 'Compras inativo', codigo: 'COMPRAS_OLD', ativo: false, eh_setor_compras: true }
    ],
    usuarios: [
      { id: 1, nome: 'Ana', email: 'ana@teste', perfil: 'USUARIO', setor_id: 10, ativo: true },
      { id: 2, nome: 'Bruno', email: 'bruno@teste', perfil: 'USUARIO', setor_id: 20, ativo: true },
      { id: 3, nome: 'Carlos', email: 'carlos@teste', perfil: 'USUARIO', setor_id: 20, ativo: true },
      { id: 4, nome: 'Dora', email: 'dora@teste', perfil: 'USUARIO', setor_id: 10, ativo: false },
      { id: 5, nome: 'Eva', email: 'eva@teste', perfil: 'SUPERADMIN', setor_id: 10, ativo: true },
      { id: 6, nome: 'Fabio', email: 'fabio@teste', perfil: 'USUARIO', setor_id: 30, ativo: true }
    ],
    vinculos: [
      { user_id: 2, setor_id: 11 },
      { user_id: 2, setor_id: 10 },
      { user_id: 2, setor_id: 10 },
      { user_id: 3, setor_id: 20 },
      { user_id: 6, setor_id: 30 }
    ]
  });

  assert.deepStrictEqual(resultado.map((usuario) => usuario.id), [1, 2]);
  assert.strictEqual(resultado[0].setor, 'Compras');
  assert.deepStrictEqual(resultado[1].setores.map((setor) => setor.id), [10, 11]);
}

function validarIntegracaoEntreCamadas() {
  const routes = read('src/routes.js');
  const pedidoService = read('src/services/pedidoCompraService.js');
  const controller = read('src/controllers/PedidoCompraController.js');
  const frontend = read('../frontend/src/modules/solicitacao-compra/pages/ComprasDelegacao.jsx');
  const frontendService = read('../frontend/src/services/compras.js');

  assert(routes.includes("router.get('/compras/delegacao/usuarios', allowComprasDelegacaoManage"));
  assert(pedidoService.includes('validarResponsavelElegivelDelegacaoCompras(responsavelId, { transaction })'));
  assert(controller.includes('listarUsuariosElegiveisDelegacaoCompras()'));
  assert(frontend.includes('listarUsuariosDelegacaoCompras'));
  assert(frontend.includes('podeGerenciarDelegacao ? listarUsuariosDelegacaoCompras() : Promise.resolve([])'));
  assert(!frontend.includes('/usuarios-lista'));
  assert(frontendService.includes('/compras/delegacao/usuarios'));
}

function run() {
  validarRegraElegibilidade();
  validarIntegracaoEntreCamadas();
  console.log('Validacao da delegacao de Compras concluida com sucesso.');
}

run();
