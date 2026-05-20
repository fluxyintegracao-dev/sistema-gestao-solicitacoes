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
  Parceiro,
  TituloFinanceiro,
  sequelize
} = db;

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
    }

    return {
      duplicate: false,
      retorno,
      ocorrencias: ocorrenciasCriadas,
      parsed
    };
  });
}

module.exports = {
  boletoParaCnab,
  gerarRemessaParaBoletosCaixa,
  importarRetornoCnab240Caixa,
  nomeArquivoRemessa,
  statusBancarioPorOcorrencia,
  validarBoletosParaRemessa
};
