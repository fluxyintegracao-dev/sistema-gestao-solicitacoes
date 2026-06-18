const {
  CategoriaFinanceira,
  IntegracaoSiengeFila,
  Notificacao,
  NotificacaoDestinatario,
  Obra,
  Parceiro,
  PaymentBeneficiary,
  RhApuracao,
  RhApuracaoEvento,
  RhColaborador,
  RhColaboradorPagamento,
  RhEmpresaGrupo,
  RhFechamento,
  RhFechamentoTitulo,
  Setor,
  TituloFinanceiro,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const { ValidationError } = require('../middlewares/validation');
const { getUsuariosAcessoFinanceiro } = require('./authorizationService');

const FECHAMENTO_INCLUDE = [
  {
    model: RhApuracao,
    as: 'apuracao',
    attributes: [
      'id',
      'competencia',
      'empresa_grupo_id',
      'obra_id',
      'tipo_vinculo',
      'status',
      'dias_base',
      'total_colaboradores',
      'total_bruto',
      'total_descontos',
      'total_liquido'
    ],
    include: [
      {
        model: RhEmpresaGrupo,
        as: 'empresaGrupo',
        attributes: ['id', 'codigo', 'nome']
      },
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'codigo', 'nome', 'empresa_grupo_id']
      }
    ]
  },
  {
    model: CategoriaFinanceira,
    as: 'categoriaFinanceira',
    attributes: ['id', 'nome', 'tipo', 'dre_grupo', 'dre_subgrupo', 'considera_dre']
  },
  {
    model: User,
    as: 'criadoPor',
    attributes: ['id', 'nome', 'email']
  },
  {
    model: User,
    as: 'atualizadoPor',
    attributes: ['id', 'nome', 'email']
  }
];

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function appendAuditText(currentValue, line) {
  return [String(currentValue || '').trim(), line].filter(Boolean).join('\n');
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getLastDayOfCompetencia(competencia) {
  const [year, month] = String(competencia || '').split('-').map(Number);
  if (!year || !month) {
    return getToday();
  }
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function normalizeDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function inferTipoPessoa(documento) {
  const digits = normalizeDigits(documento);
  if (digits.length === 11) return 'F';
  if (digits.length === 14) return 'J';
  return '';
}

function inferPixTipoChave(chavePix, documentoFallback) {
  const raw = String(chavePix || '').trim();
  if (!raw) return '';
  if (raw.includes('@')) return 'EMAIL';

  const digits = normalizeDigits(raw);
  const documento = normalizeDigits(documentoFallback);
  if (digits.length === 14) return 'CNPJ';
  if (digits.length === 11) {
    return documento && digits === documento ? 'CPF' : 'TELEFONE';
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    return 'ALEATORIA';
  }
  return 'ALEATORIA';
}

function normalizePixChaveForType(tipoChave, chavePix) {
  const raw = String(chavePix || '').trim();
  if (['CPF', 'CNPJ', 'TELEFONE'].includes(String(tipoChave || '').toUpperCase())) {
    return normalizeDigits(raw);
  }
  if (String(tipoChave || '').toUpperCase() === 'EMAIL') {
    return raw.toLowerCase();
  }
  return raw;
}

function getPixKeyOptions(pagamento = {}) {
  return [
    pagamento.chave_pix,
    pagamento.chave_pix_secundaria,
    pagamento.chave_pix_variavel
  ].map((value) => String(value || '').trim()).filter(Boolean);
}

function resolvePixKeyForItem(item, pagamento = {}) {
  const selected = String(item?.detalhes_json?.pagamento?.chave_pix_titulo || '').trim();
  const options = getPixKeyOptions(pagamento);
  if (selected && options.includes(selected)) {
    return selected;
  }
  return options[0] || '';
}

async function ensureCategoriaFinanceiraPagar(categoriaFinanceiraId, transaction) {
  if (!categoriaFinanceiraId) {
    throw new ValidationError('Categoria financeira e obrigatoria para gerar titulos de fechamento RH/DP.');
  }

  const categoria = await CategoriaFinanceira.findByPk(categoriaFinanceiraId, { transaction });
  if (!categoria || categoria.ativo === false) {
    throw new ValidationError('Categoria financeira invalida para o fechamento RH/DP.');
  }

  const tipo = String(categoria.tipo || '').trim().toUpperCase();
  if (tipo && tipo !== 'AMBOS' && tipo !== 'PAGAR') {
    throw new ValidationError('A categoria financeira do fechamento deve ser compativel com titulos a pagar.');
  }

  if (categoria.considera_dre === false) {
    throw new ValidationError('A categoria financeira do fechamento RH/DP precisa estar marcada para DRE.');
  }

  if (!String(categoria.dre_grupo || '').trim()) {
    throw new ValidationError('A categoria financeira do fechamento RH/DP precisa ter grupo DRE classificado.');
  }

  return categoria;
}

async function carregarApuracaoParaFechamento(apuracaoId, transaction) {
  const apuracao = await RhApuracao.findByPk(apuracaoId, {
    transaction,
    include: [
      {
        model: RhEmpresaGrupo,
        as: 'empresaGrupo',
        attributes: ['id', 'codigo', 'nome']
      },
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'codigo', 'nome', 'empresa_grupo_id']
      },
      {
        model: RhFechamento,
        as: 'fechamentoRh',
        required: false,
        where: { status: 'FECHADO' },
        attributes: ['id', 'status', 'data_fechamento', 'data_vencimento']
      },
      {
        model: RhApuracaoEvento,
        as: 'itens',
        separate: true,
        order: [['id', 'ASC']],
        include: [
          {
            model: RhColaborador,
            as: 'colaborador',
            attributes: [
              'id',
              'nome',
              'cpf',
              'matricula',
              'tipo_vinculo',
              'status',
              'empresa_grupo_id',
              'obra_id',
              'telefone',
              'email'
            ],
            include: [
              {
                model: RhColaboradorPagamento,
                as: 'pagamento'
              },
              {
                model: Obra,
                as: 'obra',
                attributes: ['id', 'codigo', 'nome']
              }
            ]
          }
        ]
      }
    ]
  });

  if (!apuracao) {
    throw new ValidationError('Apuracao RH/DP nao encontrada.', 404);
  }

  return apuracao;
}

function validarItemElegivelParaFechamento(item, apuracao) {
  const colaborador = item?.colaborador;
  if (!colaborador) {
    throw new ValidationError('Existe item de apuracao sem colaborador vinculado.');
  }

  if (String(item.status || '').trim().toUpperCase() !== 'CONFERIDO') {
    throw new ValidationError('Todos os itens da apuracao precisam estar conferidos antes do fechamento.');
  }

  const valorLiquido = Number(item.valor_liquido || 0);
  if (!Number.isFinite(valorLiquido) || valorLiquido <= 0) {
    throw new ValidationError(`O colaborador ${colaborador.nome} possui valor liquido invalido para gerar titulo.`);
  }

  const pagamento = colaborador.pagamento || {};
  const favorecidoNome = String(pagamento.favorecido_nome || colaborador.nome || '').trim();
  const favorecidoDocumento = normalizeDigits(pagamento.favorecido_documento || colaborador.cpf);
  const chavePix = resolvePixKeyForItem(item, pagamento);
  const obraId = Number(apuracao.obra_id || 0);
  const empresaId = Number(colaborador.empresa_grupo_id || 0);

  if (!favorecidoNome) {
    throw new ValidationError(`O colaborador ${colaborador.nome} nao possui favorecido definido para pagamento.`);
  }

  if (![11, 14].includes(favorecidoDocumento.length)) {
    throw new ValidationError(`O colaborador ${colaborador.nome} nao possui documento valido para o favorecido.`);
  }

  if (!Number.isInteger(obraId) || obraId <= 0) {
    throw new ValidationError('A apuracao RH/DP precisa estar vinculada a uma obra antes de gerar titulos financeiros.');
  }

  if (!Number.isInteger(empresaId) || empresaId <= 0) {
    throw new ValidationError(`O colaborador ${colaborador.nome} nao possui empresa do grupo vinculada para gerar titulo financeiro.`);
  }

  if (!chavePix) {
    throw new ValidationError(`O colaborador ${colaborador.nome} nao possui chave PIX definida para gerar favorecido bancario.`);
  }

  return {
    favorecidoNome,
    favorecidoDocumento,
    chavePix,
    obraId,
    empresaId,
    email: pagamento.email || colaborador.email || null,
    telefone: colaborador.telefone || null
  };
}

async function syncParceiroFavorecido({ colaborador, favorecidoNome, favorecidoDocumento, email, telefone }, transaction) {
  const digits = normalizeDigits(favorecidoDocumento);
  const tipoPessoa = inferTipoPessoa(digits);
  if (!tipoPessoa) {
    throw new ValidationError(`Documento invalido para o colaborador ${colaborador.nome}.`);
  }

  const parceiro = await Parceiro.findOne({
    where: { cpf_cnpj: digits },
    transaction
  });

  if (!parceiro) {
    return Parceiro.create(
      {
        cpf_cnpj: digits,
        nome: favorecidoNome,
        telefone: telefone || null,
        email: email || null,
        tipo_pessoa: tipoPessoa,
        cliente: false,
        fornecedor: true,
        corretor: false,
        ativo: true
      },
      { transaction }
    );
  }

  const updateData = {
    fornecedor: true,
    ativo: true
  };

  if (!parceiro.nome && favorecidoNome) {
    updateData.nome = favorecidoNome;
  }
  if (!parceiro.telefone && telefone) {
    updateData.telefone = telefone;
  }
  if (!parceiro.email && email) {
    updateData.email = email;
  }

  if (Object.keys(updateData).length > 0) {
    await parceiro.update(updateData, { transaction });
  }

  return parceiro;
}

async function syncFavorecidoBancarioRh({
  parceiro,
  favorecidoNome,
  favorecidoDocumento,
  chavePix,
  usuarioId
}, transaction) {
  const pixTipoChave = inferPixTipoChave(chavePix, favorecidoDocumento);
  const pixChave = normalizePixChaveForType(pixTipoChave, chavePix);

  if (!pixTipoChave || !pixChave) {
    throw new ValidationError('Chave PIX invalida para gerar favorecido bancario RH/DP.');
  }

  const existing = await PaymentBeneficiary.findOne({
    where: {
      parceiro_id: parceiro.id,
      pix_tipo_chave: pixTipoChave,
      pix_chave: pixChave
    },
    transaction
  });

  const payload = {
    parceiro_id: parceiro.id,
    nome: favorecidoNome,
    cpf_cnpj: normalizeDigits(favorecidoDocumento),
    metodo_preferencial: 'PIX_CHAVE',
    pix_tipo_chave: pixTipoChave,
    pix_chave: pixChave,
    ativo: true,
    updated_by: usuarioId || null
  };

  if (existing) {
    await existing.update(payload, { transaction });
    return existing;
  }

  return PaymentBeneficiary.create(
    {
      ...payload,
      created_by: usuarioId || null
    },
    { transaction }
  );
}

function buildTituloRhPayload({ apuracao, item, parceiro, dataVencimento, categoriaFinanceiraId, empresaId, usuarioId }) {
  if (!Number.isInteger(Number(empresaId)) || Number(empresaId) <= 0) {
    throw new ValidationError('Empresa do colaborador RH/DP e obrigatoria para gerar titulo financeiro.');
  }

  const colaborador = item.colaborador;
  const competencia = apuracao.competencia;
  const competenciaData = getLastDayOfCompetencia(competencia);

  return {
    solicitacao_id: null,
    obra_id: Number(apuracao.obra_id),
    empresa_id: Number(empresaId),
    parceiro_id: parceiro.id,
    categoria_financeira_id: categoriaFinanceiraId,
    competencia_data: competenciaData,
    considera_dre: true,
    origem_titulo: 'RH_DP',
    tipo: 'PAGAR',
    status: 'ABERTO',
    descricao: `Folha RH/DP ${competencia} - ${colaborador.nome}`.slice(0, 255),
    numero_documento: `RHDP-${competencia}-${item.id}`.slice(0, 120),
    valor_original: roundCurrency(item.valor_liquido),
    valor_saldo: roundCurrency(item.valor_liquido),
    valor_baixado: 0,
    data_emissao: getToday(),
    data_vencimento: dataVencimento,
    data_quitacao: null,
    observacoes: [
      `Origem: RH/DP`,
      `Competencia: ${competencia}`,
      item.observacoes ? `Apuracao: ${item.observacoes}` : null
    ].filter(Boolean).join(' | ').slice(0, 2000),
    forma_cobranca: null,
    status_cobranca: 'NAO_APLICAVEL',
    banco_cobranca: null,
    nosso_numero: null,
    linha_digitavel: null,
    codigo_barras: null,
    identificador_externo: null,
    boleto_emitido_em: null,
    criado_por: usuarioId || null,
    atualizado_por: usuarioId || null
  };
}

async function listarFechamentosRh(filters = {}) {
  const where = {};
  if (filters.apuracao_id) where.apuracao_id = filters.apuracao_id;
  if (filters.status) where.status = filters.status;

  const include = [...FECHAMENTO_INCLUDE];

  if (filters.competencia || filters.empresa_grupo_id || filters.obra_id) {
    include[0] = {
      ...include[0],
      required: true,
      where: {
        ...(filters.competencia ? { competencia: filters.competencia } : {}),
        ...(filters.empresa_grupo_id ? { empresa_grupo_id: filters.empresa_grupo_id } : {}),
        ...(filters.obra_id ? { obra_id: filters.obra_id } : {})
      }
    };
  }

  return RhFechamento.findAll({
    where,
    include,
    order: [['createdAt', 'DESC']]
  });
}

async function detalharFechamentoRh(id, { transaction = undefined } = {}) {
  const fechamento = await RhFechamento.findByPk(id, {
    transaction,
    include: [
      ...FECHAMENTO_INCLUDE,
      {
        model: RhFechamentoTitulo,
        as: 'titulos',
        separate: true,
        order: [['id', 'ASC']],
        include: [
          {
            model: RhApuracaoEvento,
            as: 'itemApuracao',
            attributes: ['id', 'valor_liquido', 'regra_aplicada', 'observacoes'],
            include: [
              {
                model: RhColaborador,
                as: 'colaborador',
                attributes: ['id', 'nome', 'cpf', 'matricula', 'tipo_vinculo']
              }
            ]
          },
          {
            model: TituloFinanceiro,
            as: 'tituloFinanceiro',
            attributes: [
              'id',
              'tipo',
              'status',
              'descricao',
              'numero_documento',
              'valor_original',
              'valor_saldo',
              'valor_baixado',
              'data_emissao',
              'data_vencimento'
            ],
            include: [
              {
                model: Obra,
                as: 'obra',
                attributes: ['id', 'codigo', 'nome']
              },
              {
                model: Parceiro,
                as: 'parceiro',
                attributes: ['id', 'nome', 'cpf_cnpj', 'telefone', 'email']
              },
              {
                model: IntegracaoSiengeFila,
                as: 'integracaoSienge',
                attributes: [
                  'id',
                  'origem_modulo',
                  'status',
                  'tentativas',
                  'enviado_em',
                  'ultimo_erro',
                  'external_title_id',
                  'updatedAt'
                ]
              }
            ]
          }
        ]
      }
    ]
  });

  if (!fechamento) {
    throw new ValidationError('Fechamento RH/DP nao encontrado.', 404);
  }

  return fechamento;
}

async function obterDestinatariosFinanceiro(transaction) {
  const usuariosConfigurados = await getUsuariosAcessoFinanceiro();
  const setoresFinanceiro = await Setor.findAll({
    where: {
      [Op.or]: [
        { codigo: 'FINANCEIRO' },
        { nome: 'Financeiro' }
      ]
    },
    attributes: ['id'],
    transaction
  });
  const setorIds = setoresFinanceiro.map((setor) => Number(setor.id)).filter(Boolean);
  const usuarios = await User.findAll({
    where: {
      ativo: true,
      [Op.or]: [
        { perfil: 'FINANCEIRO' },
        ...(setorIds.length ? [{ setor_id: { [Op.in]: setorIds } }] : []),
        ...(usuariosConfigurados.length ? [{ id: { [Op.in]: usuariosConfigurados } }] : [])
      ]
    },
    attributes: ['id'],
    transaction
  });

  return [
    ...new Set(
      usuarios
        .map((usuario) => Number(usuario.id))
        .filter((usuarioId) => Number.isInteger(usuarioId) && usuarioId > 0)
    )
  ];
}

async function notificarFinanceiroReabertura({ fechamento, apuracao, justificativa, user, transaction }) {
  const destinatarios = await obterDestinatariosFinanceiro(transaction);
  if (user?.id) {
    const actorId = Number(user.id);
    const index = destinatarios.indexOf(actorId);
    if (index >= 0) destinatarios.splice(index, 1);
  }
  if (!destinatarios.length) {
    return;
  }

  const notificacao = await Notificacao.create(
    {
      solicitacao_id: null,
      tipo: 'RH_DP_FECHAMENTO_REABERTO',
      mensagem: `Fechamento RH/DP #${fechamento.id} da competencia ${apuracao.competencia} foi reaberto por ${user?.nome || 'Usuario'}.`,
      metadata: JSON.stringify({
        fechamento_id: fechamento.id,
        apuracao_id: apuracao.id,
        competencia: apuracao.competencia,
        justificativa
      }),
      created_by: user?.id || null
    },
    { transaction }
  );

  await NotificacaoDestinatario.bulkCreate(
    destinatarios.map((usuarioId) => ({
      notificacao_id: notificacao.id,
      usuario_id: usuarioId
    })),
    { transaction }
  );
}

async function fecharApuracaoRh(apuracaoId, data, user) {
  return sequelize.transaction(async (transaction) => {
    const apuracao = await carregarApuracaoParaFechamento(apuracaoId, transaction);

    if (String(apuracao.status || '').trim().toUpperCase() !== 'CONFERIDA') {
      throw new ValidationError('A apuracao precisa estar conferida antes do fechamento.');
    }

    if (apuracao.fechamentoRh) {
      throw new ValidationError('Esta apuracao RH/DP ja foi fechada.');
    }

    const itens = Array.isArray(apuracao.itens) ? apuracao.itens : [];
    if (!itens.length) {
      throw new ValidationError('A apuracao RH/DP nao possui itens para fechar.');
    }

    const categoria = await ensureCategoriaFinanceiraPagar(data.categoria_financeira_id, transaction);
    const dataFechamento = data.data_fechamento || getToday();
    const dataVencimento = data.data_vencimento || getLastDayOfCompetencia(apuracao.competencia);
    const fechamento = await RhFechamento.create(
      {
        apuracao_id: apuracao.id,
        categoria_financeira_id: categoria?.id || null,
        status: 'FECHADO',
        data_fechamento: dataFechamento,
        data_vencimento: dataVencimento,
        total_titulos: 0,
        total_valor: 0,
        observacoes: data.observacoes || null,
        criado_por: user?.id || null,
        atualizado_por: user?.id || null
      },
      { transaction }
    );

    let totalTitulos = 0;
    let totalValor = 0;

    for (const item of itens) {
      const dadosFechamento = validarItemElegivelParaFechamento(item, apuracao);
      const parceiro = await syncParceiroFavorecido(
        {
          colaborador: item.colaborador,
          favorecidoNome: dadosFechamento.favorecidoNome,
          favorecidoDocumento: dadosFechamento.favorecidoDocumento,
          email: dadosFechamento.email,
          telefone: dadosFechamento.telefone
        },
        transaction
      );

      await syncFavorecidoBancarioRh(
        {
          parceiro,
          favorecidoNome: dadosFechamento.favorecidoNome,
          favorecidoDocumento: dadosFechamento.favorecidoDocumento,
          chavePix: dadosFechamento.chavePix,
          usuarioId: user?.id || null
        },
        transaction
      );

      const titulo = await TituloFinanceiro.create(
        buildTituloRhPayload({
          apuracao,
          item,
          parceiro,
          dataVencimento,
          categoriaFinanceiraId: categoria?.id || null,
          empresaId: dadosFechamento.empresaId,
          usuarioId: user?.id || null
        }),
        { transaction }
      );

      await RhFechamentoTitulo.create(
        {
          fechamento_id: fechamento.id,
          apuracao_evento_id: item.id,
          titulo_financeiro_id: titulo.id,
          parceiro_id: parceiro.id,
          valor_gerado: roundCurrency(item.valor_liquido)
        },
        { transaction }
      );

      totalTitulos += 1;
      totalValor += Number(item.valor_liquido || 0);
    }

    await fechamento.update(
      {
        total_titulos: totalTitulos,
        total_valor: roundCurrency(totalValor),
        resumo_json: {
          competencia: apuracao.competencia,
          total_titulos: totalTitulos,
          total_valor: roundCurrency(totalValor),
          categoria_financeira_id: categoria?.id || null,
          data_vencimento: dataVencimento
        },
        atualizado_por: user?.id || null
      },
      { transaction }
    );

    return detalharFechamentoRh(fechamento.id, { transaction });
  });
}

async function reabrirFechamentoRh(fechamentoId, data, user) {
  const justificativa = String(data?.justificativa || '').trim();
  if (!justificativa) {
    throw new ValidationError('Informe a justificativa da reabertura do fechamento RH/DP.');
  }

  return sequelize.transaction(async (transaction) => {
    const fechamento = await RhFechamento.findByPk(fechamentoId, {
      transaction,
      include: [
        {
          model: RhApuracao,
          as: 'apuracao',
          required: true,
          include: [
            {
              model: RhEmpresaGrupo,
              as: 'empresaGrupo',
              attributes: ['id', 'codigo', 'nome']
            },
            {
              model: Obra,
              as: 'obra',
              attributes: ['id', 'codigo', 'nome']
            }
          ]
        },
        {
          model: RhFechamentoTitulo,
          as: 'titulos',
          required: false,
          include: [
            {
              model: TituloFinanceiro,
              as: 'tituloFinanceiro',
              required: true,
              attributes: [
                'id',
                'status',
                'status_cobranca',
                'forma_cobranca',
                'valor_baixado',
                'valor_saldo',
                'observacoes'
              ]
            }
          ]
        }
      ]
    });

    if (!fechamento) {
      throw new ValidationError('Fechamento RH/DP nao encontrado.', 404);
    }

    if (String(fechamento.status || '').trim().toUpperCase() !== 'FECHADO') {
      throw new ValidationError('Somente fechamentos em status FECHADO podem ser reabertos.');
    }

    const titulos = Array.isArray(fechamento.titulos) ? fechamento.titulos : [];
    const tituloBaixado = titulos.find((item) => {
      const titulo = item.tituloFinanceiro;
      const status = String(titulo?.status || '').trim().toUpperCase();
      return Number(titulo?.valor_baixado || 0) > 0 || status === 'QUITADO';
    });

    if (tituloBaixado) {
      throw new ValidationError(
        `Nao e possivel reabrir este fechamento porque o titulo financeiro #${tituloBaixado.tituloFinanceiro.id} possui baixa registrada.`
      );
    }

    const auditLine = `Reabertura RH/DP em ${new Date().toISOString()} por ${user?.nome || 'Usuario'}: ${justificativa}`;

    for (const item of titulos) {
      const titulo = item.tituloFinanceiro;
      if (!titulo?.id) continue;

      await titulo.update(
        {
          status: 'CANCELADO',
          status_cobranca: titulo.status_cobranca === 'NAO_APLICAVEL' ? 'NAO_APLICAVEL' : 'CANCELADO',
          valor_saldo: 0,
          observacoes: appendAuditText(titulo.observacoes, auditLine),
          atualizado_por: user?.id || null
        },
        { transaction }
      );
    }

    await RhApuracaoEvento.update(
      {
        status: 'PENDENTE',
        ajustado_por: user?.id || null,
        ajustado_em: new Date()
      },
      {
        where: { apuracao_id: fechamento.apuracao_id },
        transaction
      }
    );

    await fechamento.apuracao.update(
      {
        status: 'RASCUNHO',
        observacoes: appendAuditText(fechamento.apuracao.observacoes, auditLine),
        atualizado_por: user?.id || null
      },
      { transaction }
    );

    await fechamento.update(
      {
        status: 'ESTORNADO',
        observacoes: appendAuditText(fechamento.observacoes, auditLine),
        resumo_json: {
          ...(fechamento.resumo_json || {}),
          reabertura: {
            justificativa,
            usuario_id: user?.id || null,
            usuario_nome: user?.nome || null,
            data: new Date().toISOString()
          }
        },
        atualizado_por: user?.id || null
      },
      { transaction }
    );

    await notificarFinanceiroReabertura({
      fechamento,
      apuracao: fechamento.apuracao,
      justificativa,
      user,
      transaction
    });

    return detalharFechamentoRh(fechamento.id, { transaction });
  });
}

module.exports = {
  detalharFechamentoRh,
  fecharApuracaoRh,
  listarFechamentosRh,
  reabrirFechamentoRh
};
