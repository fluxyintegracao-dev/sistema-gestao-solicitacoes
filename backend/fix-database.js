const sequelize = require('./src/database');

async function fixDatabase() {
  try {
    console.log('Conectando ao banco de dados...');
    await sequelize.authenticate();
    console.log('✓ Conectado!');

    console.log('\n1. Tornando unidade_id nullable...');
    await sequelize.query('ALTER TABLE solicitacao_compra_itens MODIFY COLUMN unidade_id INT NULL;');
    console.log('✓ unidade_id agora aceita NULL');

    console.log('\n2. Adicionando coluna unidade_sigla_manual...');
    try {
      await sequelize.query('ALTER TABLE solicitacao_compra_itens ADD COLUMN unidade_sigla_manual VARCHAR(50) NULL;');
      console.log('✓ Coluna unidade_sigla_manual adicionada');
    } catch (err) {
      if (err.original && err.original.errno === 1060) {
        console.log('✓ Coluna unidade_sigla_manual já existe');
      } else {
        throw err;
      }
    }

    console.log('\n✅ Banco de dados atualizado com sucesso!');
    console.log('\nAgora você pode criar solicitações com unidades manuais.');
    console.log('Reinicie o backend para aplicar as mudanças.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao atualizar banco:', error.message);
    process.exit(1);
  }
}

fixDatabase();
