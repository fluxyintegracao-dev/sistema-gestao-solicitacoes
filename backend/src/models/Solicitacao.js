module.exports = (sequelize, DataTypes) => {
  const Solicitacao = sequelize.define(
    'Solicitacao',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      codigo: {
        type: DataTypes.STRING,
        allowNull: true
      },
      codigo_contrato: {
        type: DataTypes.STRING,
        allowNull: true
      },
      numero_pedido: {
        type: DataTypes.STRING,
        allowNull: true
      },
      numero_sienge: {
        type: DataTypes.STRING,
        allowNull: true
      },
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      tipo_solicitacao_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'tipo_solicitacao',
          key: 'id'
        }
      },
      tipo_macro_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'tipo_solicitacao',
          key: 'id'
        }
      },
      tipo_sub_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'tipos_sub_contrato',
          key: 'id'
        }
      },
      contrato_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'contratos',
          key: 'id'
        }
      },

      descricao: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      valor: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
      },
      valor_pago_acumulado: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      status_global: {
        type: DataTypes.STRING,
        allowNull: false
      },
      area_responsavel: {
        type: DataTypes.STRING,
        allowNull: false
      },
      fluxo_aprovacao_diretoria: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      diretoria_fluxo_codigo: {
        type: DataTypes.STRING,
        allowNull: true
      },
      setor_destino_pos_aprovacao: {
        type: DataTypes.STRING,
        allowNull: true
      },
      prioridade_diretoria_ativa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      prioridade_diretoria_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      prioridade_diretoria_lote_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'prioridade_lotes',
          key: 'id'
        }
      },
      criado_por: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      data_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      data_inicio_medicao: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      data_fim_medicao: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      cancelada: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      tableName: 'solicitacoes',
      timestamps: true
    }
  );

  return Solicitacao;
};
