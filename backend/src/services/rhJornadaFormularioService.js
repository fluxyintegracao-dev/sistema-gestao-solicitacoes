'use strict';

const { Op } = require('sequelize');
const {
  RhImportacao,
  RhImportacaoLinha,
  RhColaborador,
  RhColaboradorVinculo,
  sequelize
} = require('../models');
const { ValidationError } = require('../middlewares/validation');
const rhVinculoObraService = require('./rhVinculoObraService');

/**
 * JORNADA PELO FORMULARIO, sem planilha (Fase 4 do modulo DP, 26/08).
 *
 * Pedido do cliente: a solicitacao de pagamento de pessoal pode ser "de forma individual direto no
 * colaborador ou atraves de um formulario onde a obra vai ter listados todos os colaboradores e
 * podera informar a jornada trabalhada, acrescimos e descontos".
 *
 * A DECISAO CENTRAL: isto NAO tem calculo proprio. Grava a mesma estrutura que a planilha grava —
 * `rh_importacoes` + `rh_importacao_linhas` com `tipo = 'JORNADA'` — e a apuracao segue sem saber a
 * diferenca.
 *
 * A alternativa era um segundo calculo de folha ao lado do que existe. Dois calculos DIVERGEM: um
 * ganha uma correcao que o outro nao ganha, e a partir dai o mesmo colaborador recebe valores
 * diferentes dependendo de por onde a obra digitou. Nao ha erro mais caro de achar do que esse.
 *
 * O pagamento INDIVIDUAL e o mesmo caminho com uma linha so — nao um terceiro codigo. Se fosse
 * codigo separado, seria a terceira versao da mesma conta.
 */

const ORIGENS = new Set(['FORMULARIO', 'INDIVIDUAL']);

function competenciaValida(valor) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(valor || '').trim());
}

function numeroNaoNegativo(valor, campo, colaboradorId) {
  const numero = Number(valor || 0);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new ValidationError(`${campo} do colaborador #${colaboradorId} e invalido: "${valor}".`);
  }
  return numero;
}

/** DATEONLY do Sequelize pode vir como string ou Date; a tela precisa sempre de `AAAA-MM-DD`. */
function paraDataIso(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).slice(0, 10);
}

/** O primeiro e o ultimo dia da competencia, para perguntar ao vinculo quem estava na obra. */
function limitesDaCompetencia(competencia) {
  const [ano, mes] = competencia.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return {
    inicio: `${competencia}-01`,
    fim: `${competencia}-${String(ultimoDia).padStart(2, '0')}`
  };
}

/**
 * Registra a jornada de uma obra numa competencia.
 *
 * SUBSTITUI o envio anterior da mesma obra e competencia, em vez de somar. A obra preenche, ve um
 * dia de falta errado e preenche de novo — se os dois envios ficassem valendo, a apuracao somaria
 * os dois (a agregacao soma as linhas de todas as importacoes confirmadas do recorte) e o
 * colaborador apareceria com 60 dias trabalhados num mes de 30.
 *
 * O envio anterior e marcado SUBSTITUIDA, nao apagado: ele e o registro do que a obra tinha
 * informado antes, e quem conferir o pagamento depois vai querer ver isso.
 */
async function registrarJornada(dados = {}, contexto = {}) {
  return sequelize.transaction(async (transaction) => {
    const competencia = String(dados.competencia || '').trim();
    if (!competenciaValida(competencia)) {
      throw new ValidationError(`A competencia deve estar no formato AAAA-MM (recebi "${dados.competencia}").`);
    }

    const obraId = Number(dados.obra_id);
    if (!obraId) throw new ValidationError('Informe a obra da jornada.');

    const linhas = Array.isArray(dados.linhas) ? dados.linhas : [];
    if (!linhas.length) throw new ValidationError('Informe ao menos um colaborador na jornada.');

    const origem = ORIGENS.has(String(dados.origem || '').toUpperCase())
      ? String(dados.origem).toUpperCase()
      : 'FORMULARIO';

    const diasBase = Number(dados.dias_base || 30);

    // Um colaborador so pode aparecer uma vez: repetido, a agregacao somaria as duas linhas e o
    // sujeito trabalharia dois meses no mesmo mes.
    const vistos = new Set();
    for (const linha of linhas) {
      const id = Number(linha.colaborador_id);
      if (!id) throw new ValidationError('Toda linha da jornada precisa de um colaborador.');
      if (vistos.has(id)) {
        throw new ValidationError(`O colaborador #${id} aparece mais de uma vez na jornada.`);
      }
      vistos.add(id);
    }

    const colaboradores = await RhColaborador.findAll({
      where: { id: Array.from(vistos) },
      transaction
    });
    const porId = new Map(colaboradores.map((c) => [Number(c.id), c]));

    for (const id of vistos) {
      if (!porId.has(id)) throw new ValidationError(`Colaborador #${id} nao encontrado.`, 404);
    }

    /**
     * QUEM ESTAVA NESTA OBRA NESTA COMPETENCIA — usando o vinculo da Fase 1.
     *
     * E a primeira vez que o historico de lotacao paga o proprio custo. Sem ele so daria para
     * comparar com `rh_colaboradores.obra_id`, a obra ATUAL — e quem foi transferido no meio do mes
     * apareceria como "nao e desta obra" na folha do mes em que ainda estava nela.
     */
    const { inicio, fim } = limitesDaCompetencia(competencia);
    const vinculosDaObra = await rhVinculoObraService.colaboradoresDaObraEm(obraId, inicio, fim);
    const estiveramNaObra = new Set(vinculosDaObra.map((v) => Number(v.colaborador_id)));

    for (const id of vistos) {
      if (!estiveramNaObra.has(id)) {
        const colaborador = porId.get(id);
        throw new ValidationError(
          `${colaborador.nome} nao esteve nesta obra em ${competencia}. `
          + 'Se houve transferencia, abra uma solicitacao de troca de obra antes de lancar a jornada.'
        );
      }
    }

    // O envio anterior sai de cena, mas fica legivel.
    await RhImportacao.update(
      { status: 'SUBSTITUIDA' },
      {
        where: { competencia, obra_id: obraId, tipo: 'JORNADA', status: 'CONFIRMADA' },
        transaction
      }
    );

    const importacao = await RhImportacao.create(
      {
        tipo: 'JORNADA',
        origem,
        competencia,
        empresa_grupo_id: dados.empresa_grupo_id || null,
        obra_id: obraId,
        tipo_vinculo: dados.tipo_vinculo || null,
        status: 'CONFIRMADA',
        nome_arquivo: origem === 'INDIVIDUAL' ? 'Pagamento individual' : 'Formulario de jornada',
        total_linhas: linhas.length,
        total_validas: linhas.length,
        total_erros: 0,
        observacoes: dados.observacoes || null,
        criado_por: contexto.usuarioId || null,
        confirmado_por: contexto.usuarioId || null,
        confirmado_em: new Date()
      },
      { transaction }
    );

    const linhasGravadas = [];
    let numero = 0;

    for (const linha of linhas) {
      numero += 1;
      const colaboradorId = Number(linha.colaborador_id);

      const dias = numeroNaoNegativo(linha.dias_trabalhados, 'Dias trabalhados', colaboradorId);
      const faltas = numeroNaoNegativo(linha.faltas, 'Faltas', colaboradorId);

      if (dias > diasBase) {
        throw new ValidationError(
          `Dias trabalhados (${dias}) do colaborador #${colaboradorId} passam da base do mes (${diasBase}).`
        );
      }
      if (dias + faltas > diasBase) {
        throw new ValidationError(
          `Dias trabalhados (${dias}) mais faltas (${faltas}) do colaborador #${colaboradorId} `
          + `passam da base do mes (${diasBase}).`
        );
      }

      // eslint-disable-next-line no-await-in-loop
      const gravada = await RhImportacaoLinha.create(
        {
          importacao_id: importacao.id,
          numero_linha: numero,
          colaborador_id: colaboradorId,
          matricula_ref: porId.get(colaboradorId).matricula || null,
          cpf_ref: porId.get(colaboradorId).cpf || null,
          nome_ref: porId.get(colaboradorId).nome || null,
          // CONFIRMADA e o status que a agregacao da apuracao le. Linha do formulario ja nasce
          // confirmada porque nao ha etapa de conferencia de arquivo para atravessar.
          status: 'CONFIRMADA',
          payload_json: {
            dias_trabalhados: dias,
            faltas,
            horas_extras: numeroNaoNegativo(linha.horas_extras, 'Horas extras', colaboradorId),
            /**
             * OS QUATRO ADICIONAIS SEPARADOS (Fase 12, item 11 do escopo).
             *
             * Nao e preciosismo: insalubridade e periculosidade sao percentuais de norma e NAO se
             * acumulam entre si; o noturno depende da hora; a bonificacao e liberalidade da
             * empresa. Somados num campo, a "planilha-resumo para conferencia" que o escopo pede
             * mostraria um numero unico que ninguem consegue contestar linha a linha.
             */
            adicional_noturno: numeroNaoNegativo(linha.adicional_noturno, 'Adicional noturno', colaboradorId),
            adicional_insalubridade: numeroNaoNegativo(linha.adicional_insalubridade, 'Adicional de insalubridade', colaboradorId),
            adicional_periculosidade: numeroNaoNegativo(linha.adicional_periculosidade, 'Adicional de periculosidade', colaboradorId),
            bonificacoes: numeroNaoNegativo(linha.bonificacoes, 'Bonificacoes', colaboradorId),
            // `adicionais` continua existindo para o que nao cabe nos quatro, e para os registros
            // gravados antes desta fase. Somar as cinco e trabalho do calculo, nao do schema.
            adicionais: numeroNaoNegativo(linha.adicionais, 'Acrescimos', colaboradorId),
            descontos_informados: numeroNaoNegativo(linha.descontos, 'Descontos', colaboradorId),
            valor_informado: numeroNaoNegativo(linha.valor_informado, 'Valor informado', colaboradorId),
            observacoes: linha.observacoes || null
          }
        },
        { transaction }
      );

      linhasGravadas.push(gravada);
    }

    return { importacao, linhas: linhasGravadas };
  });
}

/**
 * O pagamento individual: o mesmo caminho, com uma linha so.
 *
 * Existe como funcao propria para a tela ter um verbo claro — nao para ter regra propria. Toda a
 * validacao e a gravacao sao as mesmas.
 */
async function registrarPagamentoIndividual(dados = {}, contexto = {}) {
  return registrarJornada(
    {
      ...dados,
      origem: 'INDIVIDUAL',
      linhas: [{
        colaborador_id: dados.colaborador_id,
        dias_trabalhados: dados.dias_trabalhados,
        faltas: dados.faltas,
        horas_extras: dados.horas_extras,
        adicional_noturno: dados.adicional_noturno,
        adicional_insalubridade: dados.adicional_insalubridade,
        adicional_periculosidade: dados.adicional_periculosidade,
        bonificacoes: dados.bonificacoes,
        adicionais: dados.adicionais,
        descontos: dados.descontos,
        valor_informado: dados.valor_informado,
        observacoes: dados.observacoes
      }]
    },
    contexto
  );
}

/**
 * A lista que o formulario abre: quem estava na obra na competencia, com o que ja foi informado.
 *
 * Vem do VINCULO, nao de `rh_colaboradores.obra_id`: a folha de um mes passado tem de listar quem
 * estava la NAQUELE mes, e nao quem esta la hoje.
 */
async function colaboradoresParaJornada(obraId, competencia) {
  if (!competenciaValida(competencia)) {
    throw new ValidationError(`A competencia deve estar no formato AAAA-MM (recebi "${competencia}").`);
  }

  const { inicio, fim } = limitesDaCompetencia(competencia);
  const vinculos = await rhVinculoObraService.colaboradoresDaObraEm(obraId, inicio, fim);

  /**
   * QUEM AINDA NAO COMECOU TAMBEM APARECE — desligado, com a data (26/08).
   *
   * 19 dos 137 colaboradores tem admissao programada para o futuro. Quem acabou de lotar um deles
   * numa obra abre a jornada do mes corrente e recebe "nenhum colaborador esteve nesta obra nesta
   * competencia". A resposta esta CERTA — ele nao foi admitido ainda —, mas quem acabou de fazer a
   * lotacao conclui que ela nao funcionou.
   *
   * Entao eles vem na lista, marcados com `ainda_nao_comecou` e a data de inicio. A tela mostra a
   * linha sem campos: da para ver que a lotacao existe, e da para ver que nao e para este mes.
   *
   * Eles NAO podem ser enviados: `registrarJornada` recusa quem nao esteve na obra na competencia,
   * e listar sem marcar seria oferecer uma linha que o servidor vai rejeitar.
   */
  const futuros = await RhColaboradorVinculo.findAll({
    where: { obra_id: obraId, vigencia_inicio: { [Op.gt]: fim } },
    order: [['vigencia_inicio', 'ASC']],
    include: [{ association: 'colaborador', required: true }]
  });

  const jaInformado = await RhImportacaoLinha.findAll({
    include: [{
      association: 'importacao',
      required: true,
      where: { competencia, obra_id: obraId, tipo: 'JORNADA', status: 'CONFIRMADA' }
    }]
  });

  const porColaborador = new Map(
    jaInformado.map((linha) => [Number(linha.colaborador_id), linha.payload_json])
  );

  const linhaDe = (vinculo, extras = {}) => ({
    colaborador_id: Number(vinculo.colaborador_id),
    nome: vinculo.colaborador.nome,
    matricula: vinculo.colaborador.matricula,
    tipo_vinculo: vinculo.colaborador.tipo_vinculo,
    salario_base: vinculo.colaborador.salario_base,
    jornada_informada: porColaborador.get(Number(vinculo.colaborador_id)) || null,
    ainda_nao_comecou: false,
    comeca_em: null,
    ...extras
  });

  return [
    ...vinculos.filter((v) => v.colaborador).map((v) => linhaDe(v)),
    ...futuros.filter((v) => v.colaborador).map((v) => linhaDe(v, {
      ainda_nao_comecou: true,
      comeca_em: paraDataIso(v.vigencia_inicio)
    }))
  ];
}

module.exports = {
  ORIGENS,
  competenciaValida,
  limitesDaCompetencia,
  registrarJornada,
  registrarPagamentoIndividual,
  colaboradoresParaJornada
};
