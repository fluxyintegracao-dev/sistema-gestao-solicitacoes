const CATEGORIAS_PLANO_SIENGE = [
  'RECEBER|1.01.01.01|NAO|Receitas de Serviços',
  'RECEBER|1.01.01.02|NAO|Receitas de Vendas de Imóveis',
  'RECEBER|1.01.01.03|NAO|Receitas de Projetos e Desenvolvimentos',
  'RECEBER|1.01.01.04|NAO|Receitas de Vendas de Lotes',
  'RECEBER|1.01.01.05|NAO|Receitas de Administração',
  'RECEBER|1.01.01.06.01|NAO|Receitas de Automóveis',
  'RECEBER|1.01.01.06.02|NAO|Receita de Imóveis',
  'RECEBER|1.01.01.99|SIM|(-) Cancelamentos',
  'RECEBER|1.01.02.01|SIM|(-) Retenção de ISS s/ Faturamento',
  'RECEBER|1.01.02.02|SIM|(-) Retenção de PIS s/ Faturamento',
  'RECEBER|1.01.02.03|SIM|(-) Retenção de COFINS s/ Faturamento',
  'RECEBER|1.01.02.04|SIM|(-) Retenção IRRF s/ Faturamento',
  'RECEBER|1.01.02.05|SIM|(-) Retenção de CSLL s/ Faturamento',
  'RECEBER|1.01.02.06|SIM|(-) Retenção de INSS s/ Faturamento',
  'RECEBER|1.01.02.07|SIM|(-) Retenção de RET s/ Faturamento',
  'RECEBER|1.02.01.01|NAO|Aporte de Sócio',
  'RECEBER|1.02.01.99|SIM|(-) Devolução de Aporte Sócio',
  'RECEBER|1.02.02.01|NAO|Financiamento para Construção',
  'RECEBER|1.02.02.02|NAO|Financiamento de Capital de Giro',
  'RECEBER|1.02.02.99|SIM|(-) Anulação de Receitas de Empréstimos',
  'RECEBER|1.02.03.01|NAO|Seguros',
  'RECEBER|1.02.03.02|NAO|Condomínio',
  'RECEBER|1.02.03.03|NAO|IPTU',
  'RECEBER|1.02.03.04|NAO|Taxa administrativa',
  'RECEBER|1.02.03.99|SIM|(-) Anulação de Repasses',
  'RECEBER|1.02.04.01|NAO|Alienação Terrenos',
  'RECEBER|1.02.04.02|NAO|Alienação Prédios e Instalações',
  'RECEBER|1.02.04.03|NAO|Móveis e Utensílios',
  'RECEBER|1.02.04.04|NAO|Máquinas e Equipamentos',
  'RECEBER|1.02.04.05|NAO|Veículos',
  'RECEBER|1.03.01.02|NAO|Rendimentos de Conta-Corrente',
  'RECEBER|1.03.01.03|NAO|Rendimentos de Conta-Poupança',
  'RECEBER|1.03.01.04|NAO|Receita de Aplicações Financeiras',
  'RECEBER|1.03.01.05|NAO|Transferência de valores entre empresas',
  'RECEBER|1.03.01.99|SIM|(-) Anulação de Receitas Bancárias',
  'RECEBER|1.03.02.01|NAO|Resgate de Aplicações',
  'RECEBER|1.03.02.02|NAO|Desbloqueios Judiciais',
  'RECEBER|1.03.02.03|NAO|Ações Judiciais',
  'RECEBER|1.03.03.01|NAO|Multas e Acréscimos Recebidos',
  'RECEBER|1.03.03.02|SIM|Descontos Concedidos',
  'RECEBER|1.03.03.03|NAO|Variações Monetárias Ativas',
  'RECEBER|1.09.02.01|SIM|(-) Retenção Caução Serviços p/ clientes',
  'RECEBER|1.09.02.02|SIM|(-) Retenção Sinal Serviços p/ clientes',
  'RECEBER|1.09.02.03|SIM|(-) Retenção Permutas Serviços p/ clientes',
  'PAGAR|2.01.01.01|NAO|Aquisição de Bens Imóveis - Terrenos',
  'PAGAR|2.01.01.02|NAO|Mão de Obra Contratada',
  'PAGAR|2.01.01.03|NAO|Insumos',
  'PAGAR|2.01.01.04|NAO|Locação de Equipamentos',
  'PAGAR|2.01.01.05|NAO|Serviços Terceirizados e Empreiteiros',
  'PAGAR|2.01.01.06|NAO|Material de Consumo e ferramental',
  'PAGAR|2.01.01.07|NAO|Despesas com Legalizações e Certidões',
  'PAGAR|2.01.01.08|NAO|Projetos',
  'PAGAR|2.01.01.09|NAO|Uniformes, EPIs e EPCs',
  'PAGAR|2.01.01.98|NAO|Taxas e Outros Custos',
  'PAGAR|2.01.01.99|SIM|(-) Anulação de Custos',
  'PAGAR|2.01.02.01|NAO|Salários e Ordenados',
  'PAGAR|2.01.02.02|NAO|Férias',
  'PAGAR|2.01.02.03|NAO|Horas Extras',
  'PAGAR|2.01.02.04|NAO|13º Salário',
  'PAGAR|2.01.02.05|NAO|Gratificações',
  'PAGAR|2.01.02.06|NAO|Salário Família',
  'PAGAR|2.01.02.07|NAO|Pensão Alimentícia',
  'PAGAR|2.01.02.08|NAO|Periculosidade/Insalubridade',
  'PAGAR|2.01.02.09|NAO|Aviso Prévio Indenizado',
  'PAGAR|2.01.02.99|SIM|(-) Anulação de Custos Mão de Obra',
  'PAGAR|2.01.03.01|NAO|Adiantamento e Vales',
  'PAGAR|2.01.03.02|NAO|Alimentação',
  'PAGAR|2.01.03.03|NAO|Transporte',
  'PAGAR|2.01.03.04|NAO|Custeio de Treinamento',
  'PAGAR|2.01.03.05|NAO|Estagiários',
  'PAGAR|2.01.03.06|NAO|Assistência Médica',
  'PAGAR|2.01.03.07|NAO|Assistência Odontológica',
  'PAGAR|2.01.03.08|NAO|Seguros',
  'PAGAR|2.01.03.09|NAO|Uniformes e EPIs',
  'PAGAR|2.01.03.10|NAO|Medicina Ocupacional',
  'PAGAR|2.01.03.11|NAO|Custo de Rescisões',
  'PAGAR|2.01.04.01|NAO|Aquisição de Equipamentos e Veículos',
  'PAGAR|2.01.04.02|NAO|Peças e Componentes',
  'PAGAR|2.01.04.03|NAO|Manutenção Preventiva/Corretiva',
  'PAGAR|2.01.04.04|NAO|Abastecimento',
  'PAGAR|2.01.04.05|NAO|Licenciamento',
  'PAGAR|2.01.04.06|NAO|Seguros',
  'PAGAR|2.01.04.07|NAO|Pedágio/Estacionamento',
  'PAGAR|2.01.04.08|NAO|Locação de Veículo',
  'PAGAR|2.01.05.01|NAO|Passagens',
  'PAGAR|2.01.05.02|NAO|Hospedagem',
  'PAGAR|2.01.05.03|NAO|Diárias/Reembolsos',
  'PAGAR|2.01.05.04|NAO|Traslados',
  'PAGAR|2.01.06.01|NAO|Aluguéis',
  'PAGAR|2.01.06.02|NAO|Condomínio',
  'PAGAR|2.01.06.03|NAO|Seguros',
  'PAGAR|2.01.06.04|NAO|Água e Esgoto',
  'PAGAR|2.01.06.05|NAO|Energia Elétrica',
  'PAGAR|2.01.06.06|NAO|Gás',
  'PAGAR|2.01.06.07|NAO|Mudanças, Manutenção e Obras',
  'PAGAR|2.01.06.08|NAO|Segurança',
  'PAGAR|2.01.07.01|NAO|Material de Escritório',
  'PAGAR|2.01.07.02|NAO|Material de Copa e Limpeza',
  'PAGAR|2.01.07.03|NAO|Assinatura de Periódicos',
  'PAGAR|2.01.07.04|NAO|Anúncios e Publicações',
  'PAGAR|2.01.07.05|NAO|Despesas Postais',
  'PAGAR|2.01.07.06|NAO|Móveis e Utensílios',
  'PAGAR|2.01.07.07|NAO|Manutenção de Móveis e Utensílios',
  'PAGAR|2.01.07.08|NAO|Despesas com Cartórios e Legalizações',
  'PAGAR|2.01.07.09|NAO|Traslados e Deslocamentos',
  'PAGAR|2.01.07.10|NAO|Doações',
  'PAGAR|2.01.07.11|NAO|Confraternização',
  'PAGAR|2.01.07.12|NAO|Fretes e Entrega',
  'PAGAR|2.01.08.01|NAO|Telefonia Fixa',
  'PAGAR|2.01.08.02|NAO|Telefonia Móvel',
  'PAGAR|2.01.08.03|NAO|Provedores de Internet e TV por Assinatura',
  'PAGAR|2.01.08.04|NAO|Hardware (Computadores e Impressoras)',
  'PAGAR|2.01.08.05|NAO|Licenças de Softwares',
  'PAGAR|2.01.08.06|NAO|Equipamentos Eletrônicos Diversos',
  'PAGAR|2.01.08.07|NAO|Manutenção Mensal de Softwares',
  'PAGAR|2.01.09.01|NAO|Assessoria Jurídica',
  'PAGAR|2.01.09.02|NAO|Assessoria Contábil',
  'PAGAR|2.01.09.03|NAO|Assessoria em RH',
  'PAGAR|2.01.09.04|NAO|Consultoria em TI',
  'PAGAR|2.01.09.05|NAO|Assessoria de Qualidade',
  'PAGAR|2.01.09.06|NAO|Despachantes',
  'PAGAR|2.01.10.01|NAO|Assessoria de Marketing',
  'PAGAR|2.01.10.02|NAO|Assessoria de Imprensa',
  'PAGAR|2.01.10.03|NAO|Verba de Representação junto a Clientes',
  'PAGAR|2.01.10.04|NAO|Mídia Impressa (cartões de visita, folders, etc.)',
  'PAGAR|2.01.10.05|NAO|Brindes',
  'PAGAR|2.01.10.06|NAO|Feiras e Exposições',
  'PAGAR|2.01.10.07|NAO|Comissão de Venda',
  'PAGAR|2.01.11.01|NAO|Despesas Administração Local Obra',
  'PAGAR|2.01.12.01|NAO|Despesa Administrativas Escritórios',
  'PAGAR|2.02.01.01|NAO|Pró-Labore',
  'PAGAR|2.02.01.02|NAO|Gratificações',
  'PAGAR|2.02.01.03|NAO|Dividendos',
  'PAGAR|2.02.01.04|NAO|Distribuição de Lucros',
  'PAGAR|2.02.01.99|SIM|(-) Reembolso Diversos',
  'PAGAR|2.02.02.01|NAO|Aporte de Capital',
  'PAGAR|2.02.02.99|SIM|(-) Devolução de Aporte',
  'PAGAR|2.03.01.01|NAO|Tarifa de Manutenção de Conta Corrente',
  'PAGAR|2.03.01.02|NAO|Tarifas Diversas',
  'PAGAR|2.03.01.03|NAO|Taxa de Aquisição de Crédito',
  'PAGAR|2.03.01.04|NAO|Juros sobre Empréstimos',
  'PAGAR|2.03.01.05|NAO|IOF',
  'PAGAR|2.03.01.06|NAO|Tarifa Crédito Rotativo',
  'PAGAR|2.03.01.07|NAO|Cheque Especial',
  'PAGAR|2.03.01.99|SIM|(-) Restituições de Tarifas e Estornos Bancários',
  'PAGAR|2.03.02.02|NAO|Adiantamento a Fornecedores',
  'PAGAR|2.03.02.99|SIM|(-) Devolução de Adiantamento a Fornecedores',
  'PAGAR|2.03.03.01|NAO|Multas e Acréscimos',
  'PAGAR|2.03.03.02|SIM|Descontos Obtidos',
  'PAGAR|2.03.03.03|NAO|Variações Monetárias Passivas',
  'PAGAR|2.03.03.04|NAO|Juros Bancários',
  'PAGAR|2.03.04.01|NAO|Financiamento para Construção - Principal',
  'PAGAR|2.03.04.02|NAO|Financiamento de Capital de Giro - Principal',
  'PAGAR|2.03.04.03|NAO|Encargos Financeiros',
  'PAGAR|2.03.04.04|NAO|Devolução de Empréstimos Terceiros',
  'PAGAR|2.03.04.05|SIM|(-) Entrada de Empréstimos Terceiros',
  'PAGAR|2.03.04.06|NAO|Consórcios',
  'PAGAR|2.03.04.07|SIM|(-) Créditos fatura cartão',
  'PAGAR|2.03.05.01|NAO|Ações Trabalhistas',
  'PAGAR|2.03.05.02|NAO|Ações Civis Diversas',
  'PAGAR|2.04.01.01|NAO|Pagamento de PIS s/ Faturamento',
  'PAGAR|2.04.01.02|NAO|Pagamento de COFINS s/ Faturamento',
  'PAGAR|2.04.01.03|NAO|Pagamento de ISS s/ Faturamento',
  'PAGAR|2.04.01.04|NAO|Pagamento de IRPJ s/ Faturamento',
  'PAGAR|2.04.01.05|NAO|Pagamento de CSLL s/ Faturamento',
  'PAGAR|2.04.01.06|NAO|Pagamento de RET s/ Faturamento',
  'PAGAR|2.04.01.07|NAO|Pagamento de DAS (Simples)',
  'PAGAR|2.04.02.01|NAO|INSS Funcionários',
  'PAGAR|2.04.02.02|NAO|INSS Patronal (Desoneração)',
  'PAGAR|2.04.02.03|NAO|FGTS',
  'PAGAR|2.04.02.04|NAO|FGTS Rescisório',
  'PAGAR|2.04.02.05|NAO|IRRF Terceiros PF (0561)',
  'PAGAR|2.04.02.07|NAO|Contribuição Sindical Confederativa',
  'PAGAR|2.04.02.08|NAO|Contribuição Sindical Patronal',
  'PAGAR|2.04.02.09|NAO|Entidades/Conselhos de Classe (CREA, CRA)',
  'PAGAR|2.04.03.01|NAO|Pagamento de ISS retido de terceiros',
  'PAGAR|2.04.03.02|NAO|Pagamento de IRRF retido de terceiros',
  'PAGAR|2.04.03.03|NAO|Pagamento PIS/COFINS/CSLL de terceiros',
  'PAGAR|2.04.03.04|NAO|Pagamento de INSS retido de terceiros',
  'PAGAR|2.04.04.01|NAO|IPTU',
  'PAGAR|2.04.04.02|NAO|ITBI',
  'PAGAR|2.04.04.03|NAO|IPVA',
  'PAGAR|2.04.04.04|NAO|Taxa de Incêndio',
  'PAGAR|2.04.04.05|NAO|Taxa de Recolhimento de Lixo',
  'PAGAR|2.04.04.06|NAO|Laudêmio',
  'PAGAR|2.04.04.07|NAO|Foro',
  'PAGAR|2.04.05.01|NAO|Impostos Municipais',
  'PAGAR|2.04.05.02|NAO|Impostos Estaduais',
  'PAGAR|2.04.05.03|NAO|Impostos Federais',
  'PAGAR|2.04.05.04|NAO|Contribuições Previdenciárias',
  'PAGAR|2.04.06.01|NAO|Aplicação Financeira',
  'PAGAR|2.04.06.02|NAO|Transferência de valores entre empresas',
  'PAGAR|2.04.07.01|NAO|Multas e Correções por Atraso no Pagamento',
  'PAGAR|2.04.07.02|NAO|Autuações Fiscais',
  'PAGAR|2.04.07.03|NAO|Infrações de Trânsito',
  'PAGAR|2.04.07.04|NAO|Infrações Ambientais (ruído, limpeza, licenças)',
  'PAGAR|2.09.01.01|SIM|(-) Retenção de PIS/COFINS/CSLL de terceiros',
  'PAGAR|2.09.01.02|SIM|(-) Retenção de ISS de terceiros',
  'PAGAR|2.09.01.03|SIM|(-) Retenção de IRRF de terceiros',
  'PAGAR|2.09.01.04|SIM|(-) Retenção de INSS de terceiros',
  'PAGAR|2.09.02.01|SIM|(-) Retenção de Caução de Serviços',
  'PAGAR|2.09.02.02|SIM|(-) Retenção de Sinal',
  'PAGAR|2.09.02.03|SIM|(-) Retenção de Permuta',
  'PAGAR|2.10.01|NAO|Despesas gerais até 28/02/2025'
];

function parseCategoria(raw) {
  const [tipo, codigo, redutora, ...nomeParts] = raw.split('|');
  const nomeBase = nomeParts.join('|');

  return {
    codigo,
    nome: `${codigo} - ${nomeBase}`,
    tipo,
    descricao: `Plano Sienge ${codigo}; redutora: ${redutora === 'SIM' ? 'Sim' : 'Não'}`,
    ativo: true
  };
}

module.exports = {
  async up({ sequelize }) {
    for (const categoria of CATEGORIAS_PLANO_SIENGE.map(parseCategoria)) {
      const [existentes] = await sequelize.query(
        'SELECT id FROM categorias_financeiras WHERE nome = :nome AND tipo = :tipo LIMIT 1',
        {
          replacements: {
            nome: categoria.nome,
            tipo: categoria.tipo
          }
        }
      );

      if (existentes.length) {
        await sequelize.query(
          `UPDATE categorias_financeiras
             SET descricao = :descricao,
                 ativo = 1,
                 updatedAt = CURRENT_TIMESTAMP
           WHERE id = :id`,
          {
            replacements: {
              id: existentes[0].id,
              descricao: categoria.descricao
            }
          }
        );
        continue;
      }

      await sequelize.query(
        `INSERT INTO categorias_financeiras
          (nome, tipo, descricao, ativo, criado_por, atualizado_por, createdAt, updatedAt)
         VALUES
          (:nome, :tipo, :descricao, 1, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          replacements: {
            nome: categoria.nome,
            tipo: categoria.tipo,
            descricao: categoria.descricao
          }
        }
      );
    }
  },

  async down({ sequelize }) {
    const nomes = CATEGORIAS_PLANO_SIENGE.map(parseCategoria).map((categoria) => categoria.nome);

    for (const nome of nomes) {
      await sequelize.query(
        `DELETE FROM categorias_financeiras
          WHERE nome = :nome
            AND descricao LIKE 'Plano Sienge %'`,
        { replacements: { nome } }
      );
    }
  }
};
