'use strict';

const assert = require('assert');
const { QueryTypes } = require('sequelize');
const {
  CartaoRecarga,
  CartaoRecargaPrestacao,
  CartaoRecargaPrestacaoRateio,
  CartaoRecargaUsuario,
  SolicitacaoRecargaCartao,
  TituloFinanceiro,
  TituloFinanceiroRateio,
  TituloFinanceiroSequencia,
  sequelize
} = require('../src/models');
const {
  decidirPrestacao,
  executarCriacaoRecargaComControle,
  salvarCartao,
  salvarPrestacao,
  sincronizarCicloAposBaixa,
  sincronizarTituloComStatusSolicitacao
} = require('../src/services/recargaCartaoService');
const {
  formaPagamentoEhBoleto,
  formaPagamentoEhPix
} = require('../src/services/formasPagamentoMedicaoService');

async function obterBase(transaction) {
  const [base] = await sequelize.query(
    `SELECT u.id AS user_id,
            u.nome AS user_nome,
            uo.obra_id,
            o.empresa_grupo_id,
            a.id AS apropriacao_id,
            ts.id AS tipo_id
       FROM users u
       JOIN usuarios_obras uo ON uo.user_id = u.id
       JOIN obras o ON o.id = uo.obra_id AND o.ativo = 1 AND o.empresa_grupo_id IS NOT NULL
       JOIN apropriacoes a ON a.obra_id = o.id AND a.ativo = 1 AND a.somadora = 0
      JOIN tipo_solicitacao ts ON ts.codigo_interno = 'RECARGA_DE_CARTAO' AND ts.ativo = 1
      WHERE u.ativo = 1
        AND EXISTS (
          SELECT 1 FROM apropriacoes ax
           WHERE ax.obra_id = o.id AND ax.somadora = 1
        )
        AND EXISTS (
          SELECT 1 FROM apropriacoes ai
           WHERE ai.obra_id = o.id AND ai.ativo = 0
        )
      ORDER BY u.id, o.id, a.id
      LIMIT 1`,
    { type: QueryTypes.SELECT, transaction }
  );
  const [parceiro] = await sequelize.query(
    `SELECT id, nome FROM parceiros WHERE ativo = 1 AND fornecedor = 1 ORDER BY id LIMIT 1`,
    { type: QueryTypes.SELECT, transaction }
  );
  if (!base || !parceiro) throw new Error('QA requer usuario/obra/apropriacao e fornecedor ativos no banco local.');
  return { ...base, parceiro_id: parceiro.id };
}

async function executar() {
  const identificador = `QA-RECARGA-${Date.now()}`;
  const transaction = await sequelize.transaction();
  let ids = {};
  let sequenciaAntes = null;
  try {
    const base = await obterBase(transaction);
    const sequencia = await TituloFinanceiroSequencia.findOne({
      where: { chave: 'GLOBAL' },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    sequenciaAntes = sequencia ? Number(sequencia.ultimo_numero) : null;

    const cartao = await CartaoRecarga.create({
      nome: 'Cartao QA Recarga',
      identificador,
      ultimos_quatro: '9090',
      parceiro_id: base.parceiro_id,
      ativo: true,
      criado_por: base.user_id,
      atualizado_por: base.user_id
    }, { transaction });
    await CartaoRecargaUsuario.create({
      cartao_recarga_id: cartao.id,
      user_id: base.user_id,
      ativo: true,
      criado_por: base.user_id
    }, { transaction });

    const usuario = { id: base.user_id, nome: base.user_nome, perfil: 'SUPERADMIN', area: 'GEO' };
    assert.strictEqual(formaPagamentoEhPix(null), false);
    assert.strictEqual(formaPagamentoEhBoleto(null), false);

    await salvarCartao(cartao.id, {
      nome: cartao.nome,
      identificador: cartao.identificador,
      ultimos_quatro: cartao.ultimos_quatro,
      parceiro_id: base.parceiro_id,
      usuario_ids: [base.user_id],
      observacoes: 'Edicao QA transacional',
      ativo: true
    }, usuario, transaction);
    await cartao.reload({ transaction });
    assert.strictEqual(cartao.observacoes, 'Edicao QA transacional');

    const criacao = await executarCriacaoRecargaComControle({
      cartaoId: cartao.id,
      user: usuario,
      transaction,
      dadosSolicitacao: {
        obra_id: base.obra_id,
        tipo_solicitacao_id: base.tipo_id,
        tipo_macro_id: base.tipo_id,
        valor: 100,
        area_responsavel: 'GEO',
        data_vencimento: new Date().toISOString().slice(0, 10),
        criado_por: base.user_id,
        status_global: 'PENDENTE'
      }
    });
    ids = { cartao: cartao.id, solicitacao: criacao.resultado.id, titulo: criacao.titulo.id, recarga: criacao.recarga.id };

    assert.strictEqual(criacao.titulo.status, 'PREVISAO');
    assert.strictEqual(criacao.titulo.obra_id, null);
    assert.strictEqual(criacao.titulo.considera_dre, false);

    await sincronizarTituloComStatusSolicitacao(ids.solicitacao, 'LIBERADO', base.user_id, transaction);
    await criacao.titulo.reload({ transaction });
    assert.strictEqual(criacao.titulo.status, 'ABERTO');

    await criacao.titulo.update({ status: 'PARCIAL', valor_baixado: 60, valor_saldo: 40 }, { transaction });
    await sincronizarCicloAposBaixa({ solicitacaoId: ids.solicitacao, usuarioId: base.user_id, setor: 'FINANCEIRO', transaction });
    await criacao.titulo.reload({ transaction });
    assert.strictEqual(criacao.titulo.status, 'QUITADO');
    assert.strictEqual(Number(criacao.titulo.valor_original), 60);
    assert.strictEqual(Number(criacao.titulo.valor_saldo), 0);

    const prestacao = await CartaoRecargaPrestacao.findOne({ where: { solicitacao_recarga_id: ids.recarga }, transaction });
    assert(prestacao, 'A baixa parcial deve abrir a prestacao de contas.');
    ids.prestacao = prestacao.id;

    const invalidas = await sequelize.query(
      `SELECT id, obra_id, ativo, somadora
         FROM apropriacoes
        WHERE id <> :apropriacao_id
          AND (
            obra_id <> :obra_id
            OR ativo = 0
            OR somadora = 1
          )
        ORDER BY
          CASE
            WHEN obra_id = :obra_id AND somadora = 1 THEN 1
            WHEN obra_id = :obra_id AND ativo = 0 THEN 2
            WHEN obra_id <> :obra_id THEN 3
            ELSE 4
          END,
          id`,
      {
        replacements: { obra_id: base.obra_id, apropriacao_id: base.apropriacao_id },
        type: QueryTypes.SELECT,
        transaction
      }
    );
    const cenariosInvalidos = [
      invalidas.find((item) => Number(item.obra_id) === Number(base.obra_id) && Boolean(item.somadora)),
      invalidas.find((item) => Number(item.obra_id) === Number(base.obra_id) && !Boolean(item.ativo)),
      invalidas.find((item) => Number(item.obra_id) !== Number(base.obra_id))
    ];
    assert(cenariosInvalidos.every(Boolean), 'QA requer apropriacao somadora, inativa e de outra obra.');
    for (const apropriacaoInvalida of cenariosInvalidos) {
      await assert.rejects(
        () => salvarPrestacao(ids.solicitacao, {
          observacoes: 'QA apropriacao invalida',
          rateios: [{ obra_id: base.obra_id, apropriacao_id: apropriacaoInvalida.id, valor_rateio: 60 }]
        }, usuario, transaction),
        (error) => error?.statusCode === 400,
        'Apropriacao somadora, inativa ou de outra obra deve ser recusada.'
      );
    }
    assert.strictEqual(
      await CartaoRecargaPrestacaoRateio.count({ where: { prestacao_id: ids.prestacao }, transaction }),
      0,
      'Tentativas invalidas nao podem deixar rateios parciais.'
    );

    const payloadPrestacao = {
      observacoes: 'QA transacional',
      rateios: [{ obra_id: base.obra_id, apropriacao_id: base.apropriacao_id, valor_rateio: 60 }]
    };
    const enviosDuplicados = await Promise.allSettled([
      salvarPrestacao(ids.solicitacao, payloadPrestacao, usuario, transaction),
      salvarPrestacao(ids.solicitacao, payloadPrestacao, usuario, transaction)
    ]);
    assert(enviosDuplicados.some((item) => item.status === 'fulfilled'), 'Ao menos um envio deve ser concluido.');
    assert(
      enviosDuplicados.every((item) => item.status === 'fulfilled' || item.reason?.statusCode === 409),
      'A repeticao do envio deve ser absorvida ou recusada por conflito.'
    );
    assert.strictEqual(
      await CartaoRecargaPrestacaoRateio.count({ where: { prestacao_id: ids.prestacao }, transaction }),
      1,
      'Duplo envio deve manter um unico rateio da prestacao.'
    );

    const validacoesDuplicadas = await Promise.allSettled([
      decidirPrestacao(ids.solicitacao, { aprovar: true }, usuario, transaction),
      decidirPrestacao(ids.solicitacao, { aprovar: true }, usuario, transaction)
    ]);
    assert(
      validacoesDuplicadas.some((item) => item.status === 'fulfilled'),
      `Ao menos uma validacao deve ser concluida: ${validacoesDuplicadas.map((item) => item.status === 'fulfilled' ? 'ok' : `${item.reason?.statusCode || '-'}:${item.reason?.message}`).join(' | ')}`
    );
    assert(
      validacoesDuplicadas.every((item) => item.status === 'fulfilled' || item.reason?.statusCode === 409),
      'A repeticao da validacao deve ser absorvida ou recusada por conflito.'
    );

    const [recargaFinal, tituloFinal, rateios] = await Promise.all([
      SolicitacaoRecargaCartao.findByPk(ids.recarga, { transaction }),
      TituloFinanceiro.findByPk(ids.titulo, { transaction }),
      TituloFinanceiroRateio.findAll({ where: { titulo_financeiro_id: ids.titulo }, transaction })
    ]);
    assert.strictEqual(recargaFinal.status_ciclo, 'VALIDADA');
    assert.strictEqual(tituloFinal.considera_dre, true);
    assert.strictEqual(tituloFinal.possui_rateio, true);
    assert.strictEqual(rateios.length, 1);
    assert.strictEqual(Number(rateios[0].valor_rateio), 60);

    await transaction.rollback();

    const [cartaoRestante, solicitacaoRestante, tituloRestante, sequenciaDepois] = await Promise.all([
      CartaoRecarga.count({ where: { identificador } }),
      SolicitacaoRecargaCartao.count({ where: { solicitacao_id: ids.solicitacao } }),
      TituloFinanceiro.count({ where: { id: ids.titulo } }),
      TituloFinanceiroSequencia.findOne({ where: { chave: 'GLOBAL' } })
    ]);
    assert.strictEqual(cartaoRestante, 0);
    assert.strictEqual(solicitacaoRestante, 0);
    assert.strictEqual(tituloRestante, 0);
    assert.strictEqual(sequenciaDepois ? Number(sequenciaDepois.ultimo_numero) : null, sequenciaAntes);
    console.log('QA Recarga de Cartao aprovado: forma ausente, edicao, criacao, previsao, baixa parcial, apropriacoes invalidas, repeticao de envio/validacao, rateio e rollback conferidos.');
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  } finally {
    await sequelize.close();
  }
}

executar().catch((error) => {
  console.error('QA Recarga de Cartao falhou:', error);
  process.exitCode = 1;
});
