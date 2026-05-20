const { classificarCategoriaFinanceiraDre } = require('../src/constants/dreCategorias');

module.exports = {
  async up({ sequelize }) {
    const [categorias] = await sequelize.query(
      `SELECT id, nome, tipo, descricao
         FROM categorias_financeiras
        WHERE descricao LIKE 'Plano Sienge %'`
    );

    for (const categoria of categorias) {
      const classificacao = classificarCategoriaFinanceiraDre(categoria);

      await sequelize.query(
        `UPDATE categorias_financeiras
            SET dre_grupo = :dre_grupo,
                dre_subgrupo = :dre_subgrupo,
                dre_ordem = :dre_ordem,
                considera_dre = :considera_dre,
                updatedAt = CURRENT_TIMESTAMP
          WHERE id = :id`,
        {
          replacements: {
            id: categoria.id,
            dre_grupo: classificacao.dre_grupo,
            dre_subgrupo: classificacao.dre_subgrupo,
            dre_ordem: classificacao.dre_ordem,
            considera_dre: classificacao.considera_dre
          }
        }
      );
    }
  },

  async down() {
    // Mantem a classificacao atual para nao reverter categorias possivelmente ajustadas em producao.
  }
};
