const db = require('../models');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    await db.sequelize.sync();

    // ===== OBRAS =====
    await db.Obra.bulkCreate([
      {
        nome: 'Residencial Jardins',
        codigo: 'OB-001'
      },
      {
        nome: 'Edifício Comercial Centro',
        codigo: 'OB-002'
      }
    ], { ignoreDuplicates: true });

    console.log('✔ Obras criadas');

    // ===== SETORES =====
    const setores = await db.Setor.bulkCreate([
      { nome: 'Engenheiro', codigo: 'ENGENHEIRO' },
      { nome: 'GEO', codigo: 'GEO' },
      { nome: 'Compras', codigo: 'COMPRAS' },
      { nome: 'Financeiro', codigo: 'FINANCEIRO' }
    ], { ignoreDuplicates: true });

    console.log('✔ Setores criados');

    // ===== TIPOS DE SOLICITAÇÃO =====
    await db.TipoSolicitacao.bulkCreate([
      {
        nome: 'Pagamento',
        codigo: 'PAGAMENTO',
        requer_geo: true,
        requer_financeiro: true
      },
      {
        nome: 'Compra',
        codigo: 'COMPRA',
        requer_geo: true,
        requer_compras: true
      },
      {
        nome: 'Serviço',
        codigo: 'SERVICO',
        requer_geo: true,
        requer_compras: true
      }
    ], { ignoreDuplicates: true });

    console.log('✔ Tipos de solicitação criados');

    // ===== USUÁRIOS DE TESTE =====
    const senhaHash = await bcrypt.hash('123456', 10);
    
    const setoresMap = {};
    const setoresDb = await db.Setor.findAll();
    setoresDb.forEach(s => {
      setoresMap[s.codigo] = s.id;
    });

    await db.User.bulkCreate([
      {
        nome: 'Admin',
        email: 'admin@test.com',
        senha: senhaHash,
        perfil: 'SUPERADMIN',
        setor_id: setoresMap['ENGENHEIRO'] || 1,
        ativo: true
      },
      {
        nome: 'Usuário GEO',
        email: 'geo@test.com',
        senha: senhaHash,
        perfil: 'USER',
        setor_id: setoresMap['GEO'] || 2,
        ativo: true
      },
      {
        nome: 'Usuário Compras',
        email: 'compras@test.com',
        senha: senhaHash,
        perfil: 'USER',
        setor_id: setoresMap['COMPRAS'] || 3,
        ativo: true
      },
      {
        nome: 'Usuário Financeiro',
        email: 'financeiro@test.com',
        senha: senhaHash,
        perfil: 'USER',
        setor_id: setoresMap['FINANCEIRO'] || 4,
        ativo: true
      }
    ], { ignoreDuplicates: true });

    console.log('✔ Usuários de teste criados');
    console.log('\n📝 Credenciais de teste:');
    console.log('   Email: admin@test.com | Senha: 123456');
    console.log('   Email: geo@test.com | Senha: 123456');
    console.log('   Email: compras@test.com | Senha: 123456');
    console.log('   Email: financeiro@test.com | Senha: 123456\n');

    process.exit();
  } catch (error) {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  }
}

seed();
