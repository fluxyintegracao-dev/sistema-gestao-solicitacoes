module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await queryInterface.createTable('financiamentos_bancarios', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      codigo: {
        type: DataTypes.STRING(40),
        allowNull: true,
        unique: true
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'RASCUNHO'
      },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'empresas_grupo', key: 'id' }
      },
      conta_bancaria_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'contas_bancarias', key: 'id' }
      },
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Obras', key: 'id' }
      },
      parceiro_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'parceiros', key: 'id' }
      },
      categoria_financeira_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'categorias_financeiras', key: 'id' }
      },
      numero_contrato: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      documento_referencia: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      tipo_contrato: {
        type: DataTypes.STRING(80),
        allowNull: true
      },
      sistema_amortizacao: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'FIXO'
      },
      taxa_juros_mensal: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true
      },
      data_contrato: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      data_credito: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      primeiro_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      quantidade_parcelas: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      valor_credito: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false
      },
      valor_juros_total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_iof: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_tarifas: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      titulos_gerados_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      criado_por: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      },
      atualizado_por: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.createTable('financiamento_bancario_parcelas', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      financiamento_bancario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'financiamentos_bancarios', key: 'id' },
        onDelete: 'CASCADE'
      },
      titulo_financeiro_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'titulos_financeiros', key: 'id' }
      },
      numero_parcela: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      data_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      valor_principal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false
      },
      valor_juros: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_iof: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_tarifa: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_parcela: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PREVISTA'
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await sequelize.query(`
      CREATE INDEX idx_financiamentos_status
        ON financiamentos_bancarios (status)
    `);
    await sequelize.query(`
      CREATE INDEX idx_financiamentos_empresa
        ON financiamentos_bancarios (empresa_id)
    `);
    await sequelize.query(`
      CREATE INDEX idx_financiamentos_conta
        ON financiamentos_bancarios (conta_bancaria_id)
    `);
    await sequelize.query(`
      CREATE UNIQUE INDEX idx_financiamento_parcela_numero
        ON financiamento_bancario_parcelas (financiamento_bancario_id, numero_parcela)
    `);
    await sequelize.query(`
      CREATE INDEX idx_financiamento_parcela_titulo
        ON financiamento_bancario_parcelas (titulo_financeiro_id)
    `);
  },

  async down({ queryInterface }) {
    await queryInterface.dropTable('financiamento_bancario_parcelas');
    await queryInterface.dropTable('financiamentos_bancarios');
  }
};
