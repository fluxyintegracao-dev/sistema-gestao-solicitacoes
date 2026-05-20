const {
  classificarCategoriaFinanceiraDre,
  isDreClassificationBlank
} = require('../src/constants/dreCategorias');

module.exports = {
  async up({ sequelize }) {
    const [categorias] = await sequelize.query(
      `SELECT id, nome, tipo, descricao, dre_grupo, dre_subgrupo, dre_ordem, considera_dre
         FROM categorias_financeiras`
    );

    for (const categoria of categorias) {
      if (!isDreClassificationBlank(categoria)) {
        continue;
      }

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
            considera_dre: classificacao.considera_dre === false ? 0 : 1
          }
        }
      );
    }
  },

  async down({ sequelize }) {
    await sequelize.query(
      `UPDATE categorias_financeiras
          SET dre_grupo = NULL,
              dre_subgrupo = NULL,
              dre_ordem = NULL,
              considera_dre = 1,
              updatedAt = CURRENT_TIMESTAMP
        WHERE descricao LIKE 'Plano Sienge %'`
    );
  }
};
