const fs = require('fs');
const path = require('path');
const sequelize = require('./src/database');

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('Conectado ao banco de dados');

    const migrationPath = path.join(__dirname, 'migrations', 'add-unidade-manual-solicitacao-compra-itens.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await sequelize.query(sql);
    console.log('Migration executada com sucesso!');
    
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar migration:', error);
    process.exit(1);
  }
}

runMigration();
