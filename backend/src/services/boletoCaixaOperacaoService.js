const db = require('../models');
const { gerarRemessaCnab240Caixa } = require('./boletoCaixaCnab240Service');
const { parseRetornoCnab240Caixa } = require('./boletoCaixaRetornoCnab240Service');

const {
  BoletoCaixa,
  BoletoCaixaConvenio,
  BoletoCaixaOcorrencia,
  BoletoCaixaRemessa,
  BoletoCaixaRemessaItem,
  BoletoCaixaRetorno,
  MovimentoFinanceiro,
  Parceiro,
  TituloFinanceiro,
  sequelize
} = db;
const { carregarContaBancaria, obterSessaoAbertaParaConta } = require('./financeiroCaixaSessionHelper');

function formatarNumeroArquivo(value) {
  return String(value || 1).padStart(6, '0');
}

function nomeArquivoRemessa(numeroRemessa, date = new Date()) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `CB${ano}${mes}${dia}_${formatarNumeroArquivo(numeroRemessa)}.REM`;
}

function boletoParaCnab(boleto) {
  const plain = typeof boleto.get === 'function' ? boleto.get({ plain: true }) : boleto;
  return {
    ...plain,
    titulo: plain.titulo,
    pagador: plain.pagador,
    numero_documento: plain.titulo?.numero_documento || plain.titulo?.codigo || plain.titulo_financeiro_id,
    data_vencimento: plain.data_vencimento || plain.titulo?.data_vencimento,
    data_emissao: plain.data_emissao || plain.titulo?.data_emissao,
    valor: Number(plain.valor || plain.titulo?.valor_saldo || plain.titulo?.valor_original || 0)
  };
}

function validarBoletosParaRemessa(boletos = []) {
  const erros = [];
  const nossosNumeros = new Set();

  boletos.forEach((boleto) => {
    const plain = typeof boleto.get === 'function' ? boleto.get({ plain: true }) : boleto;
    const label = `Boleto ${plain.id || plain.nosso_numero_base || ''}`.trim();

    if (!plain.nosso_numero_base && !plain.nosso_numero) {
      erros.push(`${label}: nosso numero ausente.`);
    }

    const nossoNumero = plain.nosso_numero_base || plain.nosso_numero;
    if (nossoNumero && nossosNumeros.has(nossoNumero)) {
      erros.push(`${label}: nosso numero duplicado na remessa.`);
    }
    if (nossoNumero) nossosNumeros.add(nossoNumero);

    if (Number(plain.valor || 0) <= 0) {
      erros.push(`${label}: valor deve ser maior que zero.`);
    }

    if (!plain.data_vencimento) {
      erros.push(`${label}: vencimento obrigatorio.`);
    }

    const pagador = plain.pagador || plain.titulo?.parceiro || {};
    if (!pagador.cpf_cnpj && !pagador.cpf && !pagador.cnpj && !plain.pagador_documento) {
      erros.push(`${label}: CPF/CNPJ do pagador obrigatorio.`);
    }

    if (plain.status_bancario && !['NAO_REMETIDO', 'REJEITADO'].includes(plain.status_bancario)) {
      erros.push(`${label}: status bancario ${plain.status_bancario} nao permite nova remessa de entrada.`);
    }
  });

  return {
    valido: erros.length === 0,
    erros
  };
}

async function carregarBoletosParaRemessa(boletoIds, transaction) {
  return BoletoCaixa.findAll({
    where: { id: boletoIds },
    include: [
      {
        model: TituloFinanceiro,
        as: 'titulo'
      },
      {
        model: Parceiro,
        as: 'pagador'
      }
    ],
    transaction
  });
}

async function gerarRemessaParaBoletosCaixa({ convenioId, boletoIds, tituloIds, usuarioId }) {
  const boletoIdList = Array.isArray(boletoIds) ? boletoIds.filter(Boolean) : [];
  const tituloIdList = Array.isArray(tituloIds) ? tituloIds.filter(Boolean) : [];
  if (boletoIdList.length === 0 && tituloIdList.length === 0) {
    throw new Error('Selecione ao menos um boleto Caixa para gerar a remessa.');
  }

  return sequelize.transaction(async (transaction) => {
    const convenio = await BoletoCaixaConvenio.findByPk(convenioId, { transaction });
    if (!convenio || !convenio.ativo) {
      throw new Error('Convenio Caixa ativo nao encontrado.');
    }

    const whereBoletos = boletoIdList.length
      ? { id: boletoIdList }
      : { titulo_financeiro_id: tituloIdList, convenio_id: convenio.id };
    const boletos = boletoIdList.length
      ? await carregarBoletosParaRemessa(boletoIdList, transaction)
      : await BoletoCaixa.findAll({
          where: whereBoletos,
          include: [
            { model: TituloFinanceiro, as: 'titulo' },
            { model: Parceiro, as: 'pagador' }
          ],
          transaction
        });

    const expectedCount = boletoIdList.length || tituloIdList.length;
    if (boletos.length !== expectedCount) {
      throw new Error('Um ou mais boletos selecionados nao foram encontrados.');
    }

    const validacao = validarBoletosParaRemessa(boletos);
    if (!validacao.valido) {
      throw new Error(validacao.erros.join(' '));
    }

    const numeroRemessa = Number(convenio.numero_remessa_atual || 0) + 1;
    const generatedAt = new Date();
    const remessaCnab = gerarRemessaCnab240Caixa({
      convenio: convenio.get({ plain: true }),
      boletos: boletos.map(boletoParaCnab),
      numeroRemessa,
      generatedAt
    });

    if (!remessaCnab.valid) {
      throw new Error(`Remessa CNAB invalida: ${remessaCnab.validation.errors.join(' ')}`);
    }

    const remessa = await BoletoCaixaRemessa.create(
      {
        convenio_id: convenio.id,
        empresa_id: convenio.empresa_id,
        numero_remessa: numeroRemessa,
        nome_arquivo: nomeArquivoRemessa(numeroRemessa, generatedAt),
        status: 'GERADA',
        quantidade_boletos: remessaCnab.quantidade_boletos,
        quantidade_registros: remessaCnab.quantidade_registros,
        valor_total: remessaCnab.valor_total,
        cnab_hash: remessaCnab.hash,
        homologacao: !convenio.homologado,
        gerado_por: usuarioId || null,
        gerado_em: generatedAt
      },
      { transaction }
    );

    await Promise.all(
      boletos.map((boleto, index) =>
        BoletoCaixaRemessaItem.create(
          {
            remessa_id: remessa.id,
            boleto_id: boleto.id,
            titulo_financeiro_id: boleto.titulo_financeiro_id,
            sequencial_lote: index + 1,
            codigo_movimento_remessa: '01',
            status: 'INCLUIDO'
          },
          { transaction }
        )
      )
    );

    await BoletoCaixa.update(
      {
        status_bancario: 'REMETIDO',
        remessa_inclusao_id: remessa.id,
        ultimo_codigo_movimento: '01',
        atualizado_por: usuarioId || null
      },
      {
        where: { id: boletos.map((boleto) => boleto.id) },
        transaction
      }
    );

    await convenio.update({ numero_remessa_atual: numeroRemessa, atualizado_por: usuarioId || null }, { transaction });

    return {
      remessa,
      cnab: remessaCnab.content,
      hash: remessaCnab.hash,
      validation: remessaCnab.validation
    };
  });
}

function statusBancarioPorOcorrencia(tipo) {
  if (tipo === 'ENTRADA_CONFIRMADA') return 'REGISTRADO';
  if (tipo === 'LIQUIDACAO') return 'LIQUIDADO';
  if (tipo === 'BAIXA') return 'BAIXADO';
  if (tipo === 'REJEICAO') return 'REJEITADO';
  return 'OCORRENCIA';
}

function getHoje() {
  return new Date().toISOString().slice(0, 10);
}

function roundCurrency(value) {
  const number = Number(value || 0);
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function calcularStatusTitulo({ valorOriginal, valorBaixado }) {
  const saldo = roundCurrency(valorOriginal - valorBaixado);
  if (saldo <= 0) {
    return { status: 'QUITADO', valor_saldo: 0 };
  }
  return { status: 'PARCIAL', valor_saldo: saldo };
}

function mensagemErro(error) {
  return String(error?.message || error || 'Erro ao aplicar baixa financeira.').slice(0, 1000);
}

async function marcarOcorrenciaSemBaixa(ocorrenciaCriada, statusAplicacao, erroMensagem, transaction) {
  await ocorrenciaCriada.update(
    {
      status_aplicacao: statusAplicacao,
      erro_mensagem: erroMensagem || null
    },
    { transaction }
  );

  return {
    aplicada: false,
    status_aplicacao: statusAplicacao,
    erro_mensagem: erroMensagem || null
  };
}

async function aplicarBaixaFinanceiraPorLiquidacao({ boleto, convenio, retorno, ocorrenciaCriada, ocorrencia, usuarioId, transaction }) {
  if (ocorrencia.tipo !== 'LIQUIDACAO') {
    return { aplicada: false, status_aplicacao: ocorrenciaCriada.status_aplicacao };
  }

  if (!boleto || !boleto.titulo_financeiro_id) {
    return marcarOcorrenciaSemBaixa(
      ocorrenciaCriada,
      'PENDENTE_TITULO',
      'Ocorrencia de liquidacao sem boleto ou titulo financeiro vinculado.',
      transaction
    );
  }

  if (ocorrenciaCriada.movimento_financeiro_id) {
    return { aplicada: false, status_aplicacao: 'BAIXADO_FINANCEIRO' };
  }

  if (!convenio.conta_bancaria_id) {
    return marcarOcorrenciaSemBaixa(
      ocorrenciaCriada,
      'PENDENTE_CONTA_BANCARIA',
      'Convenio Caixa sem conta bancaria vinculada para registrar a baixa.',
      transaction
    );
  }

  try {
    const titulo = await TituloFinanceiro.findByPk(boleto.titulo_financeiro_id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!titulo) {
      return marcarOcorrenciaSemBaixa(
        ocorrenciaCriada,
        'PENDENTE_TITULO',
        'Titulo financeiro vinculado ao boleto nao foi encontrado.',
        transaction
      );
    }

    if (String(titulo.tipo || '').toUpperCase() !== 'RECEBER') {
      return marcarOcorrenciaSemBaixa(
        ocorrenciaCriada,
        'IGNORADO_TIPO_TITULO',
        'Somente titulos a receber sao baixados automaticamente pelo retorno de boleto.',
        transaction
      );
    }

    const statusAtual = String(titulo.status || '').toUpperCase();
    const saldoAtual = roundCurrency(titulo.valor_saldo);
    if (!['ABERTO', 'PARCIAL'].includes(statusAtual) || saldoAtual <= 0) {
      return marcarOcorrenciaSemBaixa(
        ocorrenciaCriada,
        'IGNORADO_TITULO_QUITADO',
        'Titulo nao esta em aberto/parcial ou ja nao possui saldo para baixa.',
        transaction
      );
    }

    const documentoReferencia = `RETORNO_CAIXA:${retorno.id}:OCORRENCIA:${ocorrenciaCriada.id}`;
    const movimentoExistente = await MovimentoFinanceiro.findOne({
      where: { documento_referencia: documentoReferencia },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (movimentoExistente) {
      await ocorrenciaCriada.update(
        {
          movimento_financeiro_id: movimentoExistente.id,
          status_aplicacao: 'BAIXADO_FINANCEIRO',
          erro_mensagem: null
        },
        { transaction }
      );
      return { aplicada: false, status_aplicacao: 'BAIXADO_FINANCEIRO' };
    }

    const valorPago = roundCurrency(Math.max(
      Number(ocorrencia.valor_pago || 0),
      Number(ocorrencia.valor_liquido || 0)
    ));
    if (valorPago <= 0) {
      return marcarOcorrenciaSemBaixa(
        ocorrenciaCriada,
        'ERRO_BAIXA_FINANCEIRA',
        'Valor pago no retorno Caixa esta zerado ou invalido.',
        transaction
      );
    }

    const valorPrincipal = Math.min(valorPago, saldoAtual);
    const juros = roundCurrency(Math.max(valorPago - valorPrincipal, 0));
    const dataMovimento = ocorrencia.data_credito || ocorrencia.data_ocorrencia || getHoje();
    const contaBancaria = await carregarContaBancaria(convenio.conta_bancaria_id, { transaction });
    const caixaSessao = await obterSessaoAbertaParaConta(contaBancaria, dataMovimento, { transaction });
    const novoValorBaixado = roundCurrency(Number(titulo.valor_baixado || 0) + valorPrincipal);
    const novoEstado = calcularStatusTitulo({
      valorOriginal: Number(titulo.valor_original || 0),
      valorBaixado: novoValorBaixado
    });

    const movimento = await MovimentoFinanceiro.create(
      {
        titulo_financeiro_id: titulo.id,
        conta_bancaria_id: contaBancaria.id,
        empresa_id: contaBancaria.empresa_id || titulo.empresa_id || convenio.empresa_id || null,
        caixa_sessao_id: caixaSessao?.id || null,
        forma_recebimento: 'BOLETO',
        documento_referencia: documentoReferencia,
        tipo_movimento: 'BAIXA',
        status: 'ATIVO',
        valor: valorPrincipal,
        juros,
        multa: 0,
        desconto: 0,
        valor_quitacao: valorPago,
        data_movimento: dataMovimento,
        observacoes: `Baixa automatica por retorno Caixa ${retorno.nome_arquivo || retorno.id}. Nosso numero ${ocorrencia.nosso_numero || boleto.nosso_numero_base}.`,
        criado_por: usuarioId || null
      },
      { transaction }
    );

    await titulo.update(
      {
        valor_baixado: novoValorBaixado,
        valor_saldo: novoEstado.valor_saldo,
        status: novoEstado.status,
        data_quitacao: novoEstado.status === 'QUITADO' ? dataMovimento : null,
        status_cobranca: titulo.forma_cobranca ? 'CONCILIADO' : titulo.status_cobranca,
        atualizado_por: usuarioId || null
      },
      { transaction }
    );

    await ocorrenciaCriada.update(
      {
        movimento_financeiro_id: movimento.id,
        status_aplicacao: 'BAIXADO_FINANCEIRO',
        erro_mensagem: null
      },
      { transaction }
    );

    return {
      aplicada: true,
      status_aplicacao: 'BAIXADO_FINANCEIRO',
      movimento
    };
  } catch (error) {
    return marcarOcorrenciaSemBaixa(
      ocorrenciaCriada,
      'ERRO_BAIXA_FINANCEIRA',
      mensagemErro(error),
      transaction
    );
  }
}

async function importarRetornoCnab240Caixa({ convenioId, content, nomeArquivo, usuarioId }) {
  const parsed = parseRetornoCnab240Caixa(content);
  if (!parsed.valid) {
    throw new Error(`Retorno CNAB invalido: ${parsed.validation.errors.join(' ')}`);
  }

  return sequelize.transaction(async (transaction) => {
    const existente = await BoletoCaixaRetorno.findOne({
      where: { arquivo_hash: parsed.hash },
      transaction
    });

    if (existente) {
      return {
        duplicate: true,
        retorno: existente,
        parsed
      };
    }

    const convenio = await BoletoCaixaConvenio.findByPk(convenioId, { transaction });
    if (!convenio) {
      throw new Error('Convenio Caixa nao encontrado para importar retorno.');
    }

    const valorLiquidado = parsed.ocorrencias
      .filter((ocorrencia) => ocorrencia.tipo === 'LIQUIDACAO')
      .reduce((total, ocorrencia) => total + Number(ocorrencia.valor_liquido || ocorrencia.valor_pago || 0), 0);

    const retorno = await BoletoCaixaRetorno.create(
      {
        convenio_id: convenio.id,
        empresa_id: convenio.empresa_id,
        nome_arquivo: nomeArquivo || 'RETORNO_CAIXA.RET',
        status: 'IMPORTADO',
        arquivo_hash: parsed.hash,
        quantidade_registros: parsed.quantidade_linhas,
        quantidade_ocorrencias: parsed.ocorrencias.length,
        valor_liquidado: valorLiquidado,
        processado_por: usuarioId || null,
        processado_em: new Date()
      },
      { transaction }
    );

    const ocorrenciasCriadas = [];
    let baixasAplicadas = 0;
    for (const ocorrencia of parsed.ocorrencias) {
      const boleto = ocorrencia.nosso_numero
        ? await BoletoCaixa.findOne({
            where: {
              [db.Sequelize.Op.or]: [
                { nosso_numero_base: ocorrencia.nosso_numero },
                { nosso_numero: ocorrencia.nosso_numero }
              ]
            },
            transaction
          })
        : null;

      const ocorrenciaCriada = await BoletoCaixaOcorrencia.create(
        {
          retorno_id: retorno.id,
          boleto_id: boleto?.id || null,
          titulo_financeiro_id: boleto?.titulo_financeiro_id || null,
          nosso_numero_base: ocorrencia.nosso_numero || null,
          codigo_movimento: ocorrencia.codigo_ocorrencia,
          descricao_movimento: ocorrencia.descricao_ocorrencia,
          motivos: ocorrencia.motivos_ocorrencia || null,
          segmento_t_json: ocorrencia.segmento_t || null,
          segmento_u_json: ocorrencia.segmento_u || null,
          data_ocorrencia: ocorrencia.data_ocorrencia || null,
          data_credito: ocorrencia.data_credito || null,
          valor_pago: ocorrencia.valor_pago || 0,
          valor_liquido: ocorrencia.valor_liquido || 0,
          valor_tarifa: ocorrencia.segmento_t?.valor_tarifa_custas || 0,
          status_aplicacao: boleto ? 'APLICADO_BOLETO' : 'PENDENTE_BOLETO'
        },
        { transaction }
      );

      ocorrenciasCriadas.push(ocorrenciaCriada);

      if (boleto) {
        const statusBancario = statusBancarioPorOcorrencia(ocorrencia.tipo);
        await boleto.update(
          {
            status_bancario: statusBancario,
            retorno_confirmacao_id: ocorrencia.tipo === 'ENTRADA_CONFIRMADA' ? retorno.id : boleto.retorno_confirmacao_id,
            retorno_liquidacao_id: ocorrencia.tipo === 'LIQUIDACAO' ? retorno.id : boleto.retorno_liquidacao_id,
            data_registro: ocorrencia.tipo === 'ENTRADA_CONFIRMADA' ? ocorrencia.data_ocorrencia : boleto.data_registro,
            data_liquidacao: ocorrencia.tipo === 'LIQUIDACAO' ? ocorrencia.data_ocorrencia : boleto.data_liquidacao,
            data_baixa: ocorrencia.tipo === 'BAIXA' ? ocorrencia.data_ocorrencia : boleto.data_baixa,
            ultimo_codigo_movimento: ocorrencia.codigo_ocorrencia,
            ultimo_motivo_ocorrencia: ocorrencia.motivos_ocorrencia || ocorrencia.descricao_ocorrencia
          },
          { transaction }
        );
      }

      const resultadoBaixa = await aplicarBaixaFinanceiraPorLiquidacao({
        boleto,
        convenio,
        retorno,
        ocorrenciaCriada,
        ocorrencia,
        usuarioId,
        transaction
      });

      if (resultadoBaixa.aplicada) {
        baixasAplicadas += 1;
      }
    }

    return {
      duplicate: false,
      retorno,
      baixas_aplicadas: baixasAplicadas,
      ocorrencias: ocorrenciasCriadas,
      parsed
    };
  });
}

module.exports = {
  boletoParaCnab,
  aplicarBaixaFinanceiraPorLiquidacao,
  gerarRemessaParaBoletosCaixa,
  importarRetornoCnab240Caixa,
  nomeArquivoRemessa,
  statusBancarioPorOcorrencia,
  validarBoletosParaRemessa
};
