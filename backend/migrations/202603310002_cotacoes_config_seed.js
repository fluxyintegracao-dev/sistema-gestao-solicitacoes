module.exports = {
  async up({ sequelize }) {
    const defaults = [
      { chave: 'COTACOES_MIN_COTACOES', valor: '3' },
      { chave: 'COTACOES_CRITERIO_VENCEDOR', valor: 'menor_total' },
      { chave: 'COTACOES_PRAZO_RESPOSTA_PADRAO_DIAS', valor: '5' },
      { chave: 'COTACOES_PERMITIR_APROVAR_SEM_MINIMO', valor: 'true' },
      { chave: 'COTACOES_EXIGIR_JUSTIFICATIVA_SE_NAO_MENOR_PRECO', valor: 'true' }
    ];

    for (const entry of defaults) {
      const [rows] = await sequelize.query(
        'SELECT id FROM configuracoes_sistema WHERE chave = ? LIMIT 1',
        { replacements: [entry.chave] }
      );
      if (!rows.length) {
        await sequelize.query(
          'INSERT INTO configuracoes_sistema (chave, valor, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())',
          { replacements: [entry.chave, entry.valor] }
        );
      }
    }
  }
};
