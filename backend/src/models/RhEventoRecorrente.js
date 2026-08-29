module.exports = (sequelize, DataTypes) => sequelize.define(
  'RhEventoRecorrente',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
    codigo: { type: DataTypes.STRING(40), allowNull: false },
    descricao: { type: DataTypes.STRING(160), allowNull: true },
    // CREDITO | DESCONTO
    natureza: { type: DataTypes.STRING(10), allowNull: false },
    forma: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'VALOR_FIXO' },
    valor: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    // false = pagamento a parte (vale alimentacao); true = mexe no liquido do salario.
    entra_no_liquido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    competencia_inicio: { type: DataTypes.STRING(7), allowNull: false },
    competencia_fim: { type: DataTypes.STRING(7), allowNull: true },
    // Nulo = indefinido. Preenchido = para sozinho na ultima parcela.
    parcelas_total: { type: DataTypes.INTEGER, allowNull: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    solicitacao_id: { type: DataTypes.INTEGER, allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    criado_por: { type: DataTypes.INTEGER, allowNull: true }
  },
  { tableName: 'rh_eventos_recorrentes', timestamps: true }
);
