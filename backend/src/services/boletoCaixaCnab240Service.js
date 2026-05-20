const {
  blank,
  createLine,
  dateField,
  hashCnab,
  moneyField,
  numberField,
  onlyDigits,
  textField,
  timeField,
  validateCnab240Lines,
  zero
} = require('./cnab240Utils');

const BANCO_CAIXA = '104';
const NOME_BANCO_CAIXA = 'CAIXA ECONOMICA FEDERAL';
const TIPO_REGISTRO_HEADER_ARQUIVO = '0';
const TIPO_REGISTRO_HEADER_LOTE = '1';
const TIPO_REGISTRO_DETALHE = '3';
const TIPO_REGISTRO_TRAILER_LOTE = '5';
const TIPO_REGISTRO_TRAILER_ARQUIVO = '9';
const LOTE_COBRANCA = '0001';
const LOTE_TRAILER_ARQUIVO = '9999';
const CODIGO_REMESSA = '1';
const SERVICO_COBRANCA = '01';
const OPERACAO_REMESSA = 'R';
const MOVIMENTO_ENTRADA_TITULO = '01';
const MOEDA_REAL = '09';

function tipoInscricao(documento) {
  return onlyDigits(documento).length <= 11 ? '1' : '2';
}

function dataReferencia(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function dataIso(date) {
  const normalized = dataReferencia(date);
  return [
    normalized.getFullYear(),
    String(normalized.getMonth() + 1).padStart(2, '0'),
    String(normalized.getDate()).padStart(2, '0')
  ].join('-');
}

function valorBoleto(boleto) {
  return Number(
    boleto?.valor ||
      boleto?.valor_original ||
      boleto?.valor_titulo ||
      boleto?.titulo?.valor_saldo ||
      boleto?.titulo?.valor_original ||
      boleto?.titulo?.valor ||
      0
  );
}

function documentoBoleto(boleto) {
  return (
    boleto?.seu_numero ||
    boleto?.numero_documento ||
    boleto?.titulo?.numero_documento ||
    boleto?.titulo?.id ||
    boleto?.id ||
    ''
  );
}

function vencimentoBoleto(boleto) {
  return (
    boleto?.data_vencimento ||
    boleto?.vencimento ||
    boleto?.titulo?.data_vencimento ||
    boleto?.titulo?.vencimento ||
    null
  );
}

function emissaoBoleto(boleto, fallbackDate) {
  return (
    boleto?.data_emissao ||
    boleto?.emissao ||
    boleto?.titulo?.data_emissao ||
    boleto?.titulo?.createdAt ||
    dataIso(fallbackDate)
  );
}

function resolvePagador(boleto) {
  const pagador = boleto?.pagador || boleto?.parceiro || boleto?.titulo?.parceiro || {};
  const enderecoPartes = [
    pagador.endereco,
    pagador.logradouro,
    pagador.numero ? `N ${pagador.numero}` : '',
    pagador.complemento
  ].filter(Boolean);

  return {
    nome: pagador.nome || pagador.razao_social || pagador.nome_fantasia || boleto?.pagador_nome || '',
    documento: pagador.cpf_cnpj || pagador.cnpj || pagador.cpf || boleto?.pagador_documento || '',
    endereco: enderecoPartes.join(' ') || boleto?.pagador_endereco || '',
    bairro: pagador.bairro || boleto?.pagador_bairro || '',
    cep: pagador.cep || boleto?.pagador_cep || '',
    cidade: pagador.cidade || pagador.municipio || boleto?.pagador_cidade || '',
    uf: pagador.uf || pagador.estado || boleto?.pagador_uf || ''
  };
}

function resolveConvenio(convenio = {}) {
  const empresaDocumento = convenio.beneficiario_cpf_cnpj || convenio.cnpj || convenio.empresa?.cnpj || '';
  return {
    banco_codigo: numberField(convenio.banco_codigo || BANCO_CAIXA, 3),
    banco_nome: convenio.banco_nome || NOME_BANCO_CAIXA,
    tipo_inscricao: convenio.tipo_inscricao || tipoInscricao(empresaDocumento),
    numero_inscricao: empresaDocumento,
    codigo_convenio: convenio.codigo_convenio || convenio.codigo_beneficiario || '',
    codigo_beneficiario: convenio.codigo_beneficiario || convenio.codigo_convenio || '',
    agencia: convenio.agencia || convenio.contaBancaria?.agencia || '',
    agencia_dv: convenio.agencia_dv || convenio.contaBancaria?.agencia_dv || '',
    conta: convenio.conta || convenio.conta_corrente || convenio.contaBancaria?.numero_conta || '',
    conta_dv: convenio.conta_dv || convenio.contaBancaria?.digito_conta || '',
    nome_beneficiario:
      convenio.beneficiario_nome || convenio.nome_beneficiario || convenio.empresa?.razao_social || '',
    layout_arquivo_versao: convenio.layout_arquivo_versao || '081',
    layout_lote_versao: convenio.layout_lote_versao || '067',
    carteira_codigo: convenio.carteira_codigo || '1',
    forma_cadastramento: convenio.forma_cadastramento || '1',
    tipo_documento: convenio.tipo_documento || '2',
    emissao_boleto: convenio.emissao_boleto || '2',
    distribuicao_boleto: convenio.distribuicao_boleto || '2',
    modalidade_nosso_numero: convenio.modalidade_nosso_numero || '14',
    especie_titulo: convenio.especie_titulo || '02',
    aceite: convenio.aceite || 'N',
    codigo_protesto: convenio.codigo_protesto || '3',
    prazo_protesto: convenio.prazo_protesto || '0',
    codigo_baixa_devolucao: convenio.codigo_baixa_devolucao || '0',
    prazo_baixa_devolucao: convenio.prazo_baixa_devolucao || '0'
  };
}

function splitNossoNumero(boleto, convenio) {
  const raw =
    boleto?.nosso_numero_base ||
    boleto?.nosso_numero ||
    boleto?.nossoNumero ||
    boleto?.identificacao_titulo ||
    documentoBoleto(boleto);
  const digits = onlyDigits(raw);
  if (digits.length >= 17) {
    return {
      modalidade: digits.slice(-17, -15),
      identificacao: digits.slice(-15)
    };
  }

  return {
    modalidade: numberField(convenio.modalidade_nosso_numero, 2),
    identificacao: numberField(digits || documentoBoleto(boleto), 15)
  };
}

function montarHeaderArquivo(convenioInput, sequencialArquivo, dataGeracao = new Date()) {
  const convenio = resolveConvenio(convenioInput);
  const data = dataReferencia(dataGeracao);

  return createLine([
    { start: 1, end: 3, value: convenio.banco_codigo },
    { start: 4, end: 7, value: '0000' },
    { start: 8, end: 8, value: TIPO_REGISTRO_HEADER_ARQUIVO },
    { start: 9, end: 17, value: blank(9) },
    { start: 18, end: 18, value: convenio.tipo_inscricao },
    { start: 19, end: 32, value: numberField(convenio.numero_inscricao, 14) },
    { start: 33, end: 52, value: textField(convenio.codigo_convenio, 20) },
    { start: 53, end: 57, value: numberField(convenio.agencia, 5) },
    { start: 58, end: 58, value: textField(convenio.agencia_dv, 1) },
    { start: 59, end: 70, value: numberField(convenio.conta, 12) },
    { start: 71, end: 71, value: textField(convenio.conta_dv, 1) },
    { start: 72, end: 72, value: blank(1) },
    { start: 73, end: 102, value: textField(convenio.nome_beneficiario, 30) },
    { start: 103, end: 132, value: textField(convenio.banco_nome, 30) },
    { start: 133, end: 142, value: blank(10) },
    { start: 143, end: 143, value: CODIGO_REMESSA },
    { start: 144, end: 151, value: dateField(dataIso(data)) },
    { start: 152, end: 157, value: timeField(data) },
    { start: 158, end: 163, value: numberField(sequencialArquivo, 6) },
    { start: 164, end: 166, value: numberField(convenio.layout_arquivo_versao, 3) },
    { start: 167, end: 171, value: '01600' },
    { start: 172, end: 240, value: blank(69) }
  ]);
}

function montarHeaderLote(convenioInput) {
  const convenio = resolveConvenio(convenioInput);

  return createLine([
    { start: 1, end: 3, value: convenio.banco_codigo },
    { start: 4, end: 7, value: LOTE_COBRANCA },
    { start: 8, end: 8, value: TIPO_REGISTRO_HEADER_LOTE },
    { start: 9, end: 9, value: OPERACAO_REMESSA },
    { start: 10, end: 11, value: SERVICO_COBRANCA },
    { start: 12, end: 13, value: '00' },
    { start: 14, end: 16, value: numberField(convenio.layout_lote_versao, 3) },
    { start: 17, end: 17, value: blank(1) },
    { start: 18, end: 18, value: convenio.tipo_inscricao },
    { start: 19, end: 33, value: numberField(convenio.numero_inscricao, 15) },
    { start: 34, end: 53, value: textField(convenio.codigo_convenio, 20) },
    { start: 54, end: 58, value: numberField(convenio.agencia, 5) },
    { start: 59, end: 59, value: textField(convenio.agencia_dv, 1) },
    { start: 60, end: 71, value: numberField(convenio.conta, 12) },
    { start: 72, end: 72, value: textField(convenio.conta_dv, 1) },
    { start: 73, end: 73, value: blank(1) },
    { start: 74, end: 103, value: textField(convenio.nome_beneficiario, 30) },
    { start: 104, end: 143, value: blank(40) },
    { start: 144, end: 183, value: blank(40) },
    { start: 184, end: 191, value: zero(8) },
    { start: 192, end: 199, value: zero(8) },
    { start: 200, end: 207, value: zero(8) },
    { start: 208, end: 240, value: blank(33) }
  ]);
}

function montarSegmentoP(boletoInput, convenioInput, sequencialRegistro, dataGeracao = new Date()) {
  const convenio = resolveConvenio(convenioInput);
  const boleto = boletoInput || {};
  const nossoNumero = splitNossoNumero(boleto, convenio);
  const numeroDocumento = documentoBoleto(boleto);
  const emissao = emissaoBoleto(boleto, dataGeracao);

  return createLine([
    { start: 1, end: 3, value: convenio.banco_codigo },
    { start: 4, end: 7, value: LOTE_COBRANCA },
    { start: 8, end: 8, value: TIPO_REGISTRO_DETALHE },
    { start: 9, end: 13, value: numberField(sequencialRegistro, 5) },
    { start: 14, end: 14, value: 'P' },
    { start: 15, end: 15, value: blank(1) },
    { start: 16, end: 17, value: boleto.codigo_movimento || MOVIMENTO_ENTRADA_TITULO },
    { start: 18, end: 22, value: numberField(convenio.agencia, 5) },
    { start: 23, end: 23, value: textField(convenio.agencia_dv, 1) },
    { start: 24, end: 30, value: numberField(convenio.codigo_beneficiario, 7) },
    { start: 31, end: 37, value: zero(7) },
    { start: 38, end: 39, value: zero(2) },
    { start: 40, end: 40, value: '0' },
    { start: 41, end: 42, value: numberField(nossoNumero.modalidade, 2) },
    { start: 43, end: 57, value: numberField(nossoNumero.identificacao, 15) },
    { start: 58, end: 58, value: convenio.carteira_codigo },
    { start: 59, end: 59, value: convenio.forma_cadastramento },
    { start: 60, end: 60, value: convenio.tipo_documento },
    { start: 61, end: 61, value: convenio.emissao_boleto },
    { start: 62, end: 62, value: convenio.distribuicao_boleto },
    { start: 63, end: 73, value: textField(numeroDocumento, 11) },
    { start: 74, end: 77, value: blank(4) },
    { start: 78, end: 85, value: dateField(vencimentoBoleto(boleto)) },
    { start: 86, end: 100, value: moneyField(valorBoleto(boleto), 15) },
    { start: 101, end: 105, value: zero(5) },
    { start: 106, end: 106, value: blank(1) },
    { start: 107, end: 108, value: numberField(boleto.especie_titulo || convenio.especie_titulo, 2) },
    { start: 109, end: 109, value: convenio.aceite },
    { start: 110, end: 117, value: dateField(emissao) },
    { start: 118, end: 118, value: boleto.codigo_juros || '0' },
    { start: 119, end: 126, value: dateField(boleto.data_juros) },
    { start: 127, end: 141, value: moneyField(boleto.valor_juros, 15) },
    { start: 142, end: 142, value: boleto.codigo_desconto || '0' },
    { start: 143, end: 150, value: dateField(boleto.data_desconto) },
    { start: 151, end: 165, value: moneyField(boleto.valor_desconto, 15) },
    { start: 166, end: 180, value: moneyField(boleto.valor_iof, 15) },
    { start: 181, end: 195, value: moneyField(boleto.valor_abatimento, 15) },
    { start: 196, end: 220, value: textField(boleto.identificacao_empresa || numeroDocumento, 25) },
    { start: 221, end: 221, value: convenio.codigo_protesto },
    { start: 222, end: 223, value: numberField(convenio.prazo_protesto, 2) },
    { start: 224, end: 224, value: convenio.codigo_baixa_devolucao },
    { start: 225, end: 227, value: numberField(convenio.prazo_baixa_devolucao, 3) },
    { start: 228, end: 229, value: MOEDA_REAL },
    { start: 230, end: 239, value: zero(10) },
    { start: 240, end: 240, value: blank(1) }
  ]);
}

function montarSegmentoQ(boletoInput, convenioInput, sequencialRegistro) {
  const convenio = resolveConvenio(convenioInput);
  const boleto = boletoInput || {};
  const pagador = resolvePagador(boleto);
  const cep = onlyDigits(pagador.cep);

  return createLine([
    { start: 1, end: 3, value: convenio.banco_codigo },
    { start: 4, end: 7, value: LOTE_COBRANCA },
    { start: 8, end: 8, value: TIPO_REGISTRO_DETALHE },
    { start: 9, end: 13, value: numberField(sequencialRegistro, 5) },
    { start: 14, end: 14, value: 'Q' },
    { start: 15, end: 15, value: blank(1) },
    { start: 16, end: 17, value: boleto.codigo_movimento || MOVIMENTO_ENTRADA_TITULO },
    { start: 18, end: 18, value: tipoInscricao(pagador.documento) },
    { start: 19, end: 33, value: numberField(pagador.documento, 15) },
    { start: 34, end: 73, value: textField(pagador.nome, 40) },
    { start: 74, end: 113, value: textField(pagador.endereco, 40) },
    { start: 114, end: 128, value: textField(pagador.bairro, 15) },
    { start: 129, end: 133, value: numberField(cep.slice(0, 5), 5) },
    { start: 134, end: 136, value: numberField(cep.slice(5, 8), 3) },
    { start: 137, end: 151, value: textField(pagador.cidade, 15) },
    { start: 152, end: 153, value: textField(pagador.uf, 2) },
    { start: 154, end: 154, value: '0' },
    { start: 155, end: 169, value: zero(15) },
    { start: 170, end: 209, value: blank(40) },
    { start: 210, end: 212, value: zero(3) },
    { start: 213, end: 232, value: blank(20) },
    { start: 233, end: 240, value: blank(8) }
  ]);
}

function montarTrailerLote(convenioInput, quantidadeRegistrosLote, boletos = []) {
  const convenio = resolveConvenio(convenioInput);
  const valorTotal = boletos.reduce((total, boleto) => total + valorBoleto(boleto), 0);

  return createLine([
    { start: 1, end: 3, value: convenio.banco_codigo },
    { start: 4, end: 7, value: LOTE_COBRANCA },
    { start: 8, end: 8, value: TIPO_REGISTRO_TRAILER_LOTE },
    { start: 9, end: 17, value: blank(9) },
    { start: 18, end: 23, value: numberField(quantidadeRegistrosLote, 6) },
    { start: 24, end: 29, value: numberField(boletos.length, 6) },
    { start: 30, end: 46, value: moneyField(valorTotal, 17) },
    { start: 47, end: 52, value: zero(6) },
    { start: 53, end: 69, value: zero(17) },
    { start: 70, end: 75, value: zero(6) },
    { start: 76, end: 92, value: zero(17) },
    { start: 93, end: 240, value: blank(148) }
  ]);
}

function montarTrailerArquivo(convenioInput, quantidadeRegistrosArquivo) {
  const convenio = resolveConvenio(convenioInput);

  return createLine([
    { start: 1, end: 3, value: convenio.banco_codigo },
    { start: 4, end: 7, value: LOTE_TRAILER_ARQUIVO },
    { start: 8, end: 8, value: TIPO_REGISTRO_TRAILER_ARQUIVO },
    { start: 9, end: 17, value: blank(9) },
    { start: 18, end: 23, value: numberField(1, 6) },
    { start: 24, end: 29, value: numberField(quantidadeRegistrosArquivo, 6) },
    { start: 30, end: 35, value: zero(6) },
    { start: 36, end: 240, value: blank(205) }
  ]);
}

function gerarRemessaCnab240Caixa({ convenio, boletos, numeroRemessa, generatedAt = new Date() }) {
  if (!convenio) {
    throw new Error('Convenio Caixa obrigatorio para gerar remessa CNAB 240.');
  }

  if (!Array.isArray(boletos) || boletos.length === 0) {
    throw new Error('Informe ao menos um boleto para gerar remessa CNAB 240.');
  }

  const lines = [
    montarHeaderArquivo(convenio, numeroRemessa || convenio.ultimo_numero_remessa || 1, generatedAt),
    montarHeaderLote(convenio)
  ];

  let sequencialRegistro = 1;
  boletos.forEach((boleto) => {
    lines.push(montarSegmentoP(boleto, convenio, sequencialRegistro, generatedAt));
    sequencialRegistro += 1;
    lines.push(montarSegmentoQ(boleto, convenio, sequencialRegistro));
    sequencialRegistro += 1;
  });

  lines.push(montarTrailerLote(convenio, lines.length + 1, boletos));
  lines.push(montarTrailerArquivo(convenio, lines.length + 1));

  const content = `${lines.join('\r\n')}\r\n`;
  const validation = validateCnab240Lines(lines);

  return {
    content,
    hash: hashCnab(content),
    lines,
    quantidade_boletos: boletos.length,
    quantidade_registros: lines.length,
    valid: validation.valid,
    validation,
    valor_total: boletos.reduce((total, boleto) => total + valorBoleto(boleto), 0)
  };
}

module.exports = {
  gerarRemessaCnab240Caixa,
  montarHeaderArquivo,
  montarHeaderLote,
  montarSegmentoP,
  montarSegmentoQ,
  montarTrailerArquivo,
  montarTrailerLote,
  resolveConvenio,
  resolvePagador,
  splitNossoNumero,
  tipoInscricao
};
