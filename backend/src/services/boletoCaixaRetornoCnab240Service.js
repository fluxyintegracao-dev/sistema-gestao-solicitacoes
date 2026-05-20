const {
  dateField,
  hashCnab,
  onlyDigits,
  validateCnab240Lines
} = require('./cnab240Utils');

const CODIGOS_OCORRENCIA_RETORNO = {
  '02': 'Entrada confirmada',
  '03': 'Entrada rejeitada',
  '06': 'Liquidacao normal',
  '09': 'Baixa confirmada',
  '10': 'Baixa por ter sido liquidado',
  '11': 'Titulos em carteira',
  '12': 'Abatimento concedido',
  '13': 'Abatimento cancelado',
  '14': 'Vencimento alterado',
  '15': 'Liquidacao em cartorio',
  '17': 'Liquidacao apos baixa ou nao registrado',
  '19': 'Confirmacao de protesto',
  '23': 'Entrada em cartorio',
  '27': 'Baixa rejeitada',
  '28': 'Debito de tarifas/custas',
  '30': 'Alteracao de dados rejeitada',
  '32': 'Instrucao rejeitada',
  '33': 'Confirmacao de alteracao',
  '34': 'Retirado de cartorio',
  '35': 'Desagendamento de debito automatico',
  '40': 'Estorno de pagamento',
  '44': 'Titulo pago com cheque devolvido',
  '45': 'Titulo pago com cheque compensado'
};

const OCORRENCIAS_LIQUIDACAO = new Set(['06', '10', '15', '17']);
const OCORRENCIAS_ENTRADA_CONFIRMADA = new Set(['02']);
const OCORRENCIAS_REJEICAO = new Set(['03', '27', '30', '32']);
const OCORRENCIAS_BAIXA = new Set(['09']);
const OCORRENCIAS_TARIFA = new Set(['28']);

function parseDate(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 8 || digits === '00000000') return null;
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

function parseMoney(value) {
  const digits = onlyDigits(value);
  if (!digits) return 0;
  return Number(digits) / 100;
}

function clean(value) {
  return String(value || '').trim();
}

function getSegment(line) {
  return line?.[13] || '';
}

function getRecordType(line) {
  return line?.[7] || '';
}

function parseHeaderArquivo(line) {
  return {
    banco_codigo: line.slice(0, 3),
    lote: line.slice(3, 7),
    tipo_registro: getRecordType(line),
    tipo_inscricao: clean(line.slice(17, 18)),
    numero_inscricao: clean(line.slice(18, 32)),
    codigo_convenio: clean(line.slice(32, 52)),
    agencia: clean(line.slice(52, 57)),
    agencia_dv: clean(line.slice(57, 58)),
    conta: clean(line.slice(58, 70)),
    conta_dv: clean(line.slice(70, 71)),
    beneficiario_nome: clean(line.slice(72, 102)),
    banco_nome: clean(line.slice(102, 132)),
    codigo_arquivo: clean(line.slice(142, 143)),
    data_geracao: parseDate(line.slice(143, 151)),
    hora_geracao: clean(line.slice(151, 157)),
    numero_sequencial_arquivo: clean(line.slice(157, 163)),
    layout_arquivo_versao: clean(line.slice(163, 166))
  };
}

function parseHeaderLote(line) {
  return {
    banco_codigo: line.slice(0, 3),
    lote: line.slice(3, 7),
    tipo_registro: getRecordType(line),
    operacao: clean(line.slice(8, 9)),
    servico: clean(line.slice(9, 11)),
    forma_lancamento: clean(line.slice(11, 13)),
    layout_lote_versao: clean(line.slice(13, 16)),
    tipo_inscricao: clean(line.slice(17, 18)),
    numero_inscricao: clean(line.slice(18, 33)),
    codigo_convenio: clean(line.slice(33, 53)),
    agencia: clean(line.slice(53, 58)),
    agencia_dv: clean(line.slice(58, 59)),
    conta: clean(line.slice(59, 71)),
    conta_dv: clean(line.slice(71, 72)),
    beneficiario_nome: clean(line.slice(73, 103))
  };
}

function parseSegmentoT(line) {
  const codigoOcorrencia = clean(line.slice(15, 17));
  const nossoNumero = clean(line.slice(40, 57));
  const numeroDocumento = clean(line.slice(58, 73));

  return {
    segmento: 'T',
    banco_codigo: line.slice(0, 3),
    lote: line.slice(3, 7),
    sequencial_registro: clean(line.slice(8, 13)),
    codigo_ocorrencia: codigoOcorrencia,
    descricao_ocorrencia: CODIGOS_OCORRENCIA_RETORNO[codigoOcorrencia] || 'Ocorrencia retorno Caixa',
    agencia: clean(line.slice(17, 22)),
    agencia_dv: clean(line.slice(22, 23)),
    codigo_beneficiario: clean(line.slice(23, 30)),
    nosso_numero: nossoNumero,
    carteira: clean(line.slice(57, 58)),
    numero_documento: numeroDocumento,
    data_vencimento: parseDate(line.slice(73, 81)),
    valor_titulo: parseMoney(line.slice(81, 96)),
    banco_cobrador: clean(line.slice(96, 99)),
    agencia_cobradora: clean(line.slice(99, 104)),
    identificacao_empresa: clean(line.slice(105, 130)),
    moeda: clean(line.slice(130, 132)),
    pagador_tipo_inscricao: clean(line.slice(132, 133)),
    pagador_documento: clean(line.slice(133, 148)),
    pagador_nome: clean(line.slice(148, 188)),
    valor_tarifa_custas: parseMoney(line.slice(198, 213)),
    motivos_ocorrencia: clean(line.slice(213, 223)),
    raw: line
  };
}

function parseSegmentoU(line) {
  return {
    segmento: 'U',
    banco_codigo: line.slice(0, 3),
    lote: line.slice(3, 7),
    sequencial_registro: clean(line.slice(8, 13)),
    codigo_ocorrencia: clean(line.slice(15, 17)),
    juros_multa_encargos: parseMoney(line.slice(17, 32)),
    valor_desconto: parseMoney(line.slice(32, 47)),
    valor_abatimento: parseMoney(line.slice(47, 62)),
    valor_iof: parseMoney(line.slice(62, 77)),
    valor_pago: parseMoney(line.slice(77, 92)),
    valor_liquido: parseMoney(line.slice(92, 107)),
    outras_despesas: parseMoney(line.slice(107, 122)),
    outros_creditos: parseMoney(line.slice(122, 137)),
    data_ocorrencia: parseDate(line.slice(137, 145)),
    data_credito: parseDate(line.slice(145, 153)),
    data_tarifa: parseDate(line.slice(157, 165)),
    codigo_banco_sacado: clean(line.slice(165, 168)),
    raw: line
  };
}

function classificarOcorrencia(codigo) {
  if (OCORRENCIAS_LIQUIDACAO.has(codigo)) return 'LIQUIDACAO';
  if (OCORRENCIAS_ENTRADA_CONFIRMADA.has(codigo)) return 'ENTRADA_CONFIRMADA';
  if (OCORRENCIAS_REJEICAO.has(codigo)) return 'REJEICAO';
  if (OCORRENCIAS_BAIXA.has(codigo)) return 'BAIXA';
  if (OCORRENCIAS_TARIFA.has(codigo)) return 'TARIFA';
  return 'OUTRA';
}

function parseTrailerLote(line) {
  return {
    banco_codigo: line.slice(0, 3),
    lote: line.slice(3, 7),
    tipo_registro: getRecordType(line),
    quantidade_registros_lote: Number(onlyDigits(line.slice(17, 23)) || 0),
    quantidade_titulos: Number(onlyDigits(line.slice(23, 29)) || 0),
    valor_total_titulos: parseMoney(line.slice(29, 46))
  };
}

function parseTrailerArquivo(line) {
  return {
    banco_codigo: line.slice(0, 3),
    lote: line.slice(3, 7),
    tipo_registro: getRecordType(line),
    quantidade_lotes: Number(onlyDigits(line.slice(17, 23)) || 0),
    quantidade_registros: Number(onlyDigits(line.slice(23, 29)) || 0)
  };
}

function normalizarLinhas(content) {
  return String(content || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\r/g, ''))
    .filter(Boolean);
}

function parseRetornoCnab240Caixa(content) {
  const lines = normalizarLinhas(content);
  const validation = validateCnab240Lines(lines);
  const headerArquivo = lines.find((line) => getRecordType(line) === '0');
  const headerLote = lines.find((line) => getRecordType(line) === '1');
  const trailersLote = lines.filter((line) => getRecordType(line) === '5').map(parseTrailerLote);
  const trailerArquivo = lines.find((line) => getRecordType(line) === '9' && line.slice(3, 7) === '9999');
  const ocorrencias = [];

  let pendente = null;
  for (const line of lines) {
    if (getRecordType(line) !== '3') continue;

    const segment = getSegment(line);
    if (segment === 'T') {
      if (pendente) ocorrencias.push(pendente);
      const segmentoT = parseSegmentoT(line);
      pendente = {
        tipo: classificarOcorrencia(segmentoT.codigo_ocorrencia),
        codigo_ocorrencia: segmentoT.codigo_ocorrencia,
        descricao_ocorrencia: segmentoT.descricao_ocorrencia,
        nosso_numero: segmentoT.nosso_numero,
        numero_documento: segmentoT.numero_documento,
        valor_titulo: segmentoT.valor_titulo,
        pagador_documento: segmentoT.pagador_documento,
        pagador_nome: segmentoT.pagador_nome,
        motivos_ocorrencia: segmentoT.motivos_ocorrencia,
        segmento_t: segmentoT,
        segmento_u: null
      };
    }

    if (segment === 'U') {
      const segmentoU = parseSegmentoU(line);
      if (!pendente) {
        pendente = {
          tipo: classificarOcorrencia(segmentoU.codigo_ocorrencia),
          codigo_ocorrencia: segmentoU.codigo_ocorrencia,
          descricao_ocorrencia: CODIGOS_OCORRENCIA_RETORNO[segmentoU.codigo_ocorrencia] || 'Ocorrencia retorno Caixa',
          nosso_numero: null,
          numero_documento: null,
          valor_titulo: 0,
          pagador_documento: null,
          pagador_nome: null,
          motivos_ocorrencia: null,
          segmento_t: null,
          segmento_u: segmentoU
        };
      } else {
        pendente.segmento_u = segmentoU;
        pendente.valor_pago = segmentoU.valor_pago;
        pendente.valor_liquido = segmentoU.valor_liquido;
        pendente.data_ocorrencia = segmentoU.data_ocorrencia;
        pendente.data_credito = segmentoU.data_credito;
      }
    }
  }

  if (pendente) ocorrencias.push(pendente);

  return {
    hash: hashCnab(`${lines.join('\r\n')}\r\n`),
    header_arquivo: headerArquivo ? parseHeaderArquivo(headerArquivo) : null,
    header_lote: headerLote ? parseHeaderLote(headerLote) : null,
    trailer_arquivo: trailerArquivo ? parseTrailerArquivo(trailerArquivo) : null,
    trailers_lote: trailersLote,
    ocorrencias,
    quantidade_linhas: lines.length,
    valid: validation.valid,
    validation
  };
}

function montarLinhaRetornoTeste({ segmento, sequencial, codigoOcorrencia = '06', nossoNumero = '14000000000000101' }) {
  const base = ''.padEnd(240, ' ');
  const set = (line, start, end, value) =>
    `${line.slice(0, start - 1)}${String(value).slice(0, end - start + 1).padEnd(end - start + 1, ' ')}${line.slice(end)}`;

  let line = base;
  line = set(line, 1, 3, '104');
  line = set(line, 4, 7, '0001');
  line = set(line, 8, 8, '3');
  line = set(line, 9, 13, String(sequencial).padStart(5, '0'));
  line = set(line, 14, 14, segmento);
  line = set(line, 16, 17, codigoOcorrencia);

  if (segmento === 'T') {
    line = set(line, 18, 22, '01234');
    line = set(line, 23, 23, '0');
    line = set(line, 24, 30, '1234567');
    line = set(line, 41, 57, nossoNumero);
    line = set(line, 58, 58, '1');
    line = set(line, 59, 73, 'TIT101');
    line = set(line, 74, 81, dateField('2026-06-20'));
    line = set(line, 82, 96, '000000000150075');
    line = set(line, 133, 133, '1');
    line = set(line, 134, 148, '000012345678901');
    line = set(line, 149, 188, 'CLIENTE TESTE UM');
  }

  if (segmento === 'U') {
    line = set(line, 78, 92, '000000000150075');
    line = set(line, 93, 107, '000000000149975');
    line = set(line, 138, 145, dateField('2026-06-21'));
    line = set(line, 146, 153, dateField('2026-06-22'));
  }

  return line;
}

module.exports = {
  CODIGOS_OCORRENCIA_RETORNO,
  OCORRENCIAS_ENTRADA_CONFIRMADA,
  OCORRENCIAS_LIQUIDACAO,
  OCORRENCIAS_REJEICAO,
  classificarOcorrencia,
  montarLinhaRetornoTeste,
  parseRetornoCnab240Caixa
};
