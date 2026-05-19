const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const {
  ContratoComercial,
  ContratoComercialParcela,
  Empreendimento,
  Obra,
  Parceiro,
  TituloFinanceiro,
  User
} = require('../models');
const { env } = require('../config/env');
const { canAccessBoletos, getFinanceiroObraScopeIds } = require('./authorizationService');
const { registrarEventoSeguranca } = require('./securityLogService');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function padLeft(value, size) {
  return onlyDigits(value).padStart(size, '0').slice(-size);
}

function toMoneyCents(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

function formatCpfCnpj(value) {
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value || '-';
}

function parseDateOnly(value) {
  const normalized = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function diffDays(date, baseDate) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((date.getTime() - baseDate.getTime()) / ms);
}

function calcularFatorVencimento(dataVencimento) {
  const vencimento = parseDateOnly(dataVencimento);
  if (!vencimento) {
    throw createHttpError(400, 'Data de vencimento invalida para gerar boleto.');
  }

  const resetBase = new Date(Date.UTC(2025, 1, 22));
  if (vencimento >= resetBase) {
    return String(1000 + diffDays(vencimento, resetBase)).padStart(4, '0');
  }

  const base = new Date(Date.UTC(1997, 9, 7));
  return String(diffDays(vencimento, base)).padStart(4, '0');
}

function modulo11(value, { general = false } = {}) {
  const digits = onlyDigits(value);
  let weight = 2;
  let sum = 0;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += Number(digits[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }

  const result = 11 - (sum % 11);
  if (general) {
    return result === 0 || result > 9 ? '1' : String(result);
  }
  return result > 9 ? '0' : String(result);
}

function modulo10(value) {
  const digits = onlyDigits(value);
  let weight = 2;
  let sum = 0;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    const product = Number(digits[index]) * weight;
    sum += product > 9 ? Math.floor(product / 10) + (product % 10) : product;
    weight = weight === 2 ? 1 : 2;
  }

  const rest = sum % 10;
  return rest === 0 ? '0' : String(10 - rest);
}

function formatarLinhaCampo(value) {
  return `${value.slice(0, 5)}.${value.slice(5)}`;
}

function resolverCodigoBeneficiario() {
  const configured = onlyDigits(env.caixaCodigoBeneficiario);
  if (!configured) {
    throw createHttpError(400, 'Configure CAIXA_CODIGO_BENEFICIARIO no backend/.env para gerar boletos Caixa.');
  }

  if (configured.length === 7 && Number(configured) >= 1100000) {
    return configured;
  }

  const base = configured.length >= 7 ? configured.slice(0, 6) : padLeft(configured, 6);
  return `${base}${modulo11(base)}`;
}

function resolverNossoNumero(titulo) {
  const existing = onlyDigits(titulo?.nosso_numero).slice(0, 17);
  if (existing.length === 17) {
    return existing;
  }

  const sequencia = padLeft(titulo?.id, 15);
  return `14${sequencia}`;
}

function montarCampoLivre({ codigoBeneficiario, nossoNumero }) {
  const semDvCampoLivre = [
    codigoBeneficiario,
    nossoNumero.slice(2, 5),
    nossoNumero.slice(0, 1),
    nossoNumero.slice(5, 8),
    nossoNumero.slice(1, 2),
    nossoNumero.slice(8, 17)
  ].join('');

  return `${semDvCampoLivre}${modulo11(semDvCampoLivre)}`;
}

function montarLinhaDigitavel(codigoBarras) {
  const campo1Base = `${codigoBarras.slice(0, 4)}${codigoBarras.slice(19, 24)}`;
  const campo2Base = codigoBarras.slice(24, 34);
  const campo3Base = codigoBarras.slice(34, 44);
  const campo4 = codigoBarras.slice(4, 5);
  const campo5 = codigoBarras.slice(5, 19);

  return [
    formatarLinhaCampo(`${campo1Base}${modulo10(campo1Base)}`),
    formatarLinhaCampo(`${campo2Base}${modulo10(campo2Base)}`),
    formatarLinhaCampo(`${campo3Base}${modulo10(campo3Base)}`),
    campo4,
    campo5
  ].join(' ');
}

function normalizeBarcode(value) {
  const digits = onlyDigits(value);
  return digits.length % 2 === 0 ? digits : `0${digits}`;
}

function drawInterleavedBarcode(doc, value, x, y, options = {}) {
  const digits = normalizeBarcode(value);
  const narrow = options.narrow || 1;
  const wide = options.wide || 3;
  const height = options.height || 46;
  const quietZone = options.quietZone ?? narrow * 10;
  const patterns = {
    0: 'nnwwn',
    1: 'wnnnw',
    2: 'nwnnw',
    3: 'wwnnn',
    4: 'nnwnw',
    5: 'wnwnn',
    6: 'nwwnn',
    7: 'nnnww',
    8: 'wnnwn',
    9: 'nwnwn'
  };
  let cursor = x + quietZone;

  function addBar(width) {
    doc.rect(cursor, y, width, height).fill('#000000');
    cursor += width;
  }

  function addSpace(width) {
    cursor += width;
  }

  addBar(narrow);
  addSpace(narrow);
  addBar(narrow);
  addSpace(narrow);

  for (let index = 0; index < digits.length; index += 2) {
    const first = patterns[digits[index]];
    const second = patterns[digits[index + 1]];
    for (let pos = 0; pos < 5; pos += 1) {
      addBar(first[pos] === 'w' ? wide : narrow);
      addSpace(second[pos] === 'w' ? wide : narrow);
    }
  }

  addBar(wide);
  addSpace(narrow);
  addBar(narrow);
  cursor += quietZone;
  return cursor - x;
}

function calcularBoletoCaixa(titulo) {
  const codigoBeneficiario = resolverCodigoBeneficiario();
  const nossoNumeroBase = resolverNossoNumero(titulo);
  const nossoNumeroDv = modulo11(nossoNumeroBase);
  const fatorVencimento = calcularFatorVencimento(titulo.data_vencimento);
  const valor = padLeft(toMoneyCents(titulo.valor_saldo || titulo.valor_original), 10);
  const campoLivre = montarCampoLivre({ codigoBeneficiario, nossoNumero: nossoNumeroBase });

  const codigoSemDv = `1049${fatorVencimento}${valor}${campoLivre}`;
  const dvGeral = modulo11(codigoSemDv, { general: true });
  const codigoBarras = `${codigoSemDv.slice(0, 4)}${dvGeral}${codigoSemDv.slice(4)}`;

  return {
    banco: 'CAIXA',
    codigo_banco: '104-0',
    agencia: onlyDigits(env.caixaAgencia).padStart(4, '0').slice(-4),
    codigo_beneficiario: codigoBeneficiario,
    agencia_codigo_beneficiario: `${onlyDigits(env.caixaAgencia).padStart(4, '0').slice(-4)} / ${codigoBeneficiario}`,
    nosso_numero: `${nossoNumeroBase}-${nossoNumeroDv}`,
    nosso_numero_base: nossoNumeroBase,
    fator_vencimento: fatorVencimento,
    valor_codigo_barras: valor,
    campo_livre: campoLivre,
    codigo_barras: codigoBarras,
    linha_digitavel: montarLinhaDigitavel(codigoBarras),
    ambiente: env.caixaBoletoAmbiente === 'PRODUCAO' ? 'PRODUCAO' : 'TESTE',
    modo_teste: env.caixaBoletoAmbiente !== 'PRODUCAO',
    homologado: env.caixaBoletoHomologado,
    local_pagamento: env.caixaLocalPagamento || 'EM TODA A REDE BANCARIA E SEUS CORRESPONDENTES ATE O VALOR LIMITE',
    instrucao: env.caixaBoletoInstrucao || 'Nao receber apos o vencimento sem autorizacao do beneficiario.',
    beneficiario: {
      nome: env.caixaBeneficiarioNome || env.companyLegalName || env.companyName || env.productName,
      cpf_cnpj: env.caixaBeneficiarioCpfCnpj,
      endereco: env.caixaBeneficiarioEndereco
    }
  };
}

async function assertBoletoAccess(req) {
  if (!(await canAccessBoletos(req.user))) {
    throw createHttpError(403, 'Acesso negado ao modulo de boletos');
  }
}

async function assertTituloScope(req, titulo) {
  const obrasPermitidas = await getFinanceiroObraScopeIds(req.user);
  if (obrasPermitidas === null || obrasPermitidas.includes(Number(titulo.obra_id))) {
    return;
  }

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'AUTHZ_DENIED',
    recursoTipo: 'BOLETO_CAIXA',
    recursoId: String(titulo.id),
    status: 'DENIED',
    descricao: 'Usuario tentou acessar boleto de titulo fora do seu escopo de obra',
    metadata: { obra_id: Number(titulo.obra_id) || null }
  });

  throw createHttpError(403, 'Acesso negado para esta obra');
}

function buildTituloBoletoInclude({ comercialObrigatorio = false, empreendimentoId = null } = {}) {
  const contratoInclude = {
    model: ContratoComercial,
    as: 'contrato',
    attributes: ['id', 'numero', 'data_contrato', 'unidade_comercial_id', 'empreendimento_id'],
    required: Boolean(empreendimentoId),
    include: [
      {
        model: Empreendimento,
        as: 'empreendimento',
        attributes: ['id', 'codigo', 'nome']
      }
    ]
  };

  if (empreendimentoId) {
    contratoInclude.where = { empreendimento_id: Number(empreendimentoId) };
  }

  return [
    {
      model: Obra,
      as: 'obra',
      attributes: ['id', 'nome', 'codigo']
    },
    {
      model: Parceiro,
      as: 'parceiro',
      attributes: ['id', 'nome', 'cpf_cnpj', 'telefone', 'email', 'endereco', 'numero', 'bairro', 'cep', 'municipio', 'estado']
    },
    {
      model: User,
      as: 'criadoPor',
      attributes: ['id', 'nome', 'email']
    },
    {
      model: ContratoComercialParcela,
      as: 'parcelasComerciais',
      required: comercialObrigatorio,
      include: [contratoInclude]
    }
  ];
}

function validarTituloParaBoleto(titulo) {
  if (!titulo) {
    throw createHttpError(404, 'Titulo financeiro nao encontrado.');
  }
  if (String(titulo.tipo || '').toUpperCase() !== 'RECEBER') {
    throw createHttpError(400, 'Somente titulos a receber podem gerar boleto.');
  }
  if (!['ABERTO', 'PARCIAL'].includes(String(titulo.status || '').toUpperCase())) {
    throw createHttpError(400, 'Somente titulos em aberto ou parcial podem gerar boleto.');
  }
  if (Number(titulo.valor_saldo || 0) <= 0) {
    throw createHttpError(400, 'Titulo sem saldo para gerar boleto.');
  }
  if (!titulo.parceiro?.nome || !titulo.parceiro?.cpf_cnpj) {
    throw createHttpError(400, 'O pagador precisa ter nome e CPF/CNPJ cadastrado.');
  }
  if (toMoneyCents(titulo.valor_saldo || titulo.valor_original) > 999999999) {
    throw createHttpError(400, 'O valor do boleto nao pode exceder R$ 9.999.999,99.');
  }
}

function validarConfiguracaoCaixaParaGeracao() {
  const missing = [];
  if (!env.caixaAgencia) missing.push('CAIXA_AGENCIA');
  if (!env.caixaCodigoBeneficiario) missing.push('CAIXA_CODIGO_BENEFICIARIO');
  if (!(env.caixaBeneficiarioNome || env.companyLegalName || env.companyName)) {
    missing.push('CAIXA_BENEFICIARIO_NOME ou COMPANY_LEGAL_NAME');
  }
  if (!env.caixaBeneficiarioCpfCnpj) missing.push('CAIXA_BENEFICIARIO_CPF_CNPJ');

  if (missing.length) {
    throw createHttpError(400, `Configuracao Caixa incompleta: ${missing.join(', ')}.`);
  }
}

function assertPodeEmitirEmProducao() {
  if (env.caixaBoletoAmbiente === 'PRODUCAO' && !env.caixaBoletoHomologado) {
    throw createHttpError(403, 'Emissao real bloqueada. Defina CAIXA_BOLETO_HOMOLOGADO=true somente apos homologacao formal com a Caixa.');
  }
}

function toBoletoView(titulo) {
  const boleto = titulo.codigo_barras && titulo.linha_digitavel
    ? {
        banco: titulo.banco_cobranca || 'CAIXA',
        codigo_banco: '104-0',
        nosso_numero: titulo.nosso_numero,
        codigo_barras: titulo.codigo_barras,
        linha_digitavel: titulo.linha_digitavel,
        ambiente: env.caixaBoletoAmbiente === 'PRODUCAO' ? 'PRODUCAO' : 'TESTE',
        modo_teste: env.caixaBoletoAmbiente !== 'PRODUCAO',
        homologado: env.caixaBoletoHomologado,
        agencia_codigo_beneficiario: `${onlyDigits(env.caixaAgencia).padStart(4, '0').slice(-4)} / ${resolverCodigoBeneficiario()}`,
        local_pagamento: env.caixaLocalPagamento || 'EM TODA A REDE BANCARIA E SEUS CORRESPONDENTES ATE O VALOR LIMITE',
        instrucao: env.caixaBoletoInstrucao || 'Nao receber apos o vencimento sem autorizacao do beneficiario.',
        beneficiario: {
          nome: env.caixaBeneficiarioNome || env.companyLegalName || env.companyName || env.productName,
          cpf_cnpj: env.caixaBeneficiarioCpfCnpj,
          endereco: env.caixaBeneficiarioEndereco
        }
      }
    : null;

  return {
    titulo,
    boleto,
    pagador: titulo.parceiro,
    valor_formatado: formatMoney(titulo.valor_saldo || titulo.valor_original)
  };
}

function toBoletoAmostraView(titulo) {
  const boleto = calcularBoletoCaixa(titulo);
  return {
    titulo,
    boleto: {
      ...boleto,
      amostra_homologacao: true,
      modo_teste: true
    },
    pagador: titulo.parceiro,
    valor_formatado: formatMoney(titulo.valor_saldo || titulo.valor_original)
  };
}

function drawField(doc, label, value, x, y, width, height = 34) {
  doc.rect(x, y, width, height).stroke('#CBD5E1');
  doc.fontSize(6).fillColor('#64748B').text(label, x + 4, y + 4, { width: width - 8 });
  doc.fontSize(9).fillColor('#0F172A').text(String(value || '-'), x + 4, y + 16, { width: width - 8 });
}

function buildBoletoPdfBuffer(detalhe) {
  return new Promise((resolve, reject) => {
    const titulo = detalhe?.titulo || {};
    const boleto = detalhe?.boleto || {};
    const pagador = detalhe?.pagador || titulo.parceiro || {};
    const beneficiario = boleto.beneficiario || {};
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 28, bufferPages: false });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    let y = 30;

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0F172A').text('CAIXA', left, y);
    doc.font('Helvetica').fontSize(8).fillColor('#475569').text(`Banco ${boleto.codigo_banco || '104-0'}`, left + 58, y + 5);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text(boleto.linha_digitavel || '-', left + 210, y + 4, {
      width: pageWidth - 210,
      align: 'right'
    });
    y += 28;

    if (boleto.modo_teste || boleto.amostra_homologacao) {
      doc.rect(left, y, pageWidth, 28).fill('#FEF3C7');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#92400E').text('BOLETO DE TESTE / AMOSTRA PARA HOMOLOGACAO - NAO PAGAR', left + 8, y + 9);
      y += 38;
    }

    drawField(doc, 'Local de pagamento', boleto.local_pagamento, left, y, pageWidth * 0.68, 36);
    drawField(doc, 'Vencimento', formatDate(titulo.data_vencimento), left + pageWidth * 0.68, y, pageWidth * 0.32, 36);
    y += 36;

    drawField(doc, 'Beneficiario', `${beneficiario.nome || '-'}\n${formatCpfCnpj(beneficiario.cpf_cnpj)}\n${beneficiario.endereco || '-'}`, left, y, pageWidth * 0.68, 54);
    drawField(doc, 'Agencia / Codigo beneficiario', boleto.agencia_codigo_beneficiario, left + pageWidth * 0.68, y, pageWidth * 0.32, 54);
    y += 54;

    const cell = pageWidth / 5;
    drawField(doc, 'Data documento', formatDate(titulo.data_emissao), left, y, cell);
    drawField(doc, 'Nr. documento', titulo.numero_documento || titulo.id, left + cell, y, cell);
    drawField(doc, 'Especie doc', 'DS', left + cell * 2, y, cell);
    drawField(doc, 'Aceite', 'N', left + cell * 3, y, cell);
    drawField(doc, 'Nosso numero', boleto.nosso_numero || titulo.nosso_numero || '-', left + cell * 4, y, cell);
    y += 34;

    drawField(doc, 'Uso do banco', '-', left, y, cell);
    drawField(doc, 'Carteira', 'RG', left + cell, y, cell);
    drawField(doc, 'Especie moeda', 'R$', left + cell * 2, y, cell);
    drawField(doc, 'Quantidade moeda', '-', left + cell * 3, y, cell);
    drawField(doc, '(=) Valor documento', formatMoney(titulo.valor_saldo || titulo.valor_original), left + cell * 4, y, cell);
    y += 34;

    doc.rect(left, y, pageWidth * 0.68, 105).stroke('#CBD5E1');
    doc.fontSize(6).fillColor('#64748B').text('Instrucoes', left + 4, y + 4);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A').text('Instrucoes (Texto de Responsabilidade do Beneficiario)', left + 4, y + 16, { width: pageWidth * 0.68 - 8 });
    doc.font('Helvetica').fontSize(8).text(boleto.instrucao || '-', left + 4, y + 31, { width: pageWidth * 0.68 - 8 });
    doc.fontSize(8).text(titulo.descricao || '-', left + 4, y + 47, { width: pageWidth * 0.68 - 8 });
    if (boleto.modo_teste || boleto.amostra_homologacao) {
      doc.font('Helvetica-Bold').fillColor('#B45309').text('AMOSTRA. Nao distribuir ao pagador e nao usar para cobranca real.', left + 4, y + 70, { width: pageWidth * 0.68 - 8 });
    }

    const rightX = left + pageWidth * 0.68;
    const rightW = pageWidth * 0.32;
    drawField(doc, '(-) Desconto / Abatimento', '', rightX, y, rightW, 26);
    drawField(doc, '(+) Juros / Multa', '', rightX, y + 26, rightW, 26);
    drawField(doc, '(=) Valor cobrado', '', rightX, y + 52, rightW, 26);
    drawField(doc, 'Autenticacao mecanica', '', rightX, y + 78, rightW, 27);
    y += 105;

    const enderecoPagador = [pagador.endereco, pagador.numero, pagador.bairro, pagador.municipio, pagador.estado, pagador.cep].filter(Boolean).join(' - ');
    drawField(doc, 'Pagador', `${pagador.nome || '-'}\n${formatCpfCnpj(pagador.cpf_cnpj)}\n${enderecoPagador || '-'}`, left, y, pageWidth, 50);
    y += 64;

    if (boleto.codigo_barras) {
      drawInterleavedBarcode(doc, boleto.codigo_barras, left, y, { height: 50, narrow: 1, wide: 3 });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A').text('Autenticacao Mecanica - Ficha de Compensacao', left + pageWidth - 220, y + 54, { width: 220, align: 'right' });
      y += 72;
      doc.font('Helvetica').fontSize(7).fillColor('#475569').text(`Linha digitavel: ${boleto.linha_digitavel || '-'}`, left, y, { width: pageWidth });
    }

    doc.end();
  });
}

async function carregarTituloBoleto(req, tituloId, { comercialObrigatorio = false } = {}) {
  await assertBoletoAccess(req);
  const titulo = await TituloFinanceiro.findByPk(tituloId, {
    include: buildTituloBoletoInclude({ comercialObrigatorio })
  });
  if (!titulo) {
    throw createHttpError(404, 'Titulo financeiro nao encontrado.');
  }
  await assertTituloScope(req, titulo);
  return titulo;
}

async function listarTitulosBoleto(req, filters = {}) {
  await assertBoletoAccess(req);
  const origem = String(filters.origem || 'COMERCIAL').toUpperCase();
  const where = {
    tipo: 'RECEBER',
    status: { [Op.in]: ['ABERTO', 'PARCIAL'] }
  };

  const obrasPermitidas = await getFinanceiroObraScopeIds(req.user);
  if (obrasPermitidas !== null) {
    if (!obrasPermitidas.length) return [];
    where.obra_id = { [Op.in]: obrasPermitidas };
  }

  if (filters.status_cobranca) {
    where.status_cobranca = filters.status_cobranca;
  }
  if (filters.codigo) {
    where.codigo = { [Op.like]: `%${filters.codigo}%` };
  }
  if (filters.numero_documento) {
    where.numero_documento = { [Op.like]: `%${filters.numero_documento}%` };
  }
  if (filters.empresa_id) {
    where.empresa_id = Number(filters.empresa_id);
  }
  if (filters.obra_id) {
    where.obra_id = Number(filters.obra_id);
  }
  if (filters.parceiro_id) {
    where.parceiro_id = Number(filters.parceiro_id);
  }
  if (filters.vencimento_inicial || filters.vencimento_final) {
    where.data_vencimento = {};
    if (filters.vencimento_inicial) {
      where.data_vencimento[Op.gte] = filters.vencimento_inicial;
    }
    if (filters.vencimento_final) {
      where.data_vencimento[Op.lte] = filters.vencimento_final;
    }
  }
  if (filters.q) {
    const term = `%${String(filters.q).trim()}%`;
    where[Op.or] = [
      { codigo: { [Op.like]: term } },
      { descricao: { [Op.like]: term } },
      { numero_documento: { [Op.like]: term } },
      { nosso_numero: { [Op.like]: term } },
      { linha_digitavel: { [Op.like]: term } },
      { '$parceiro.nome$': { [Op.like]: term } },
      { '$obra.nome$': { [Op.like]: term } },
      { '$obra.codigo$': { [Op.like]: term } }
    ];
  }

  if (origem === 'MANUAL') {
    where['$parcelasComerciais.id$'] = null;
  }

  return TituloFinanceiro.findAll({
    where,
    include: buildTituloBoletoInclude({
      comercialObrigatorio: origem === 'COMERCIAL' || Boolean(filters.empreendimento_id),
      empreendimentoId: filters.empreendimento_id || null
    }),
    subQuery: false,
    order: [['data_vencimento', 'ASC'], ['id', 'ASC']]
  });
}

function resolveOrigemTituloBoleto(titulo) {
  return Array.isArray(titulo?.parcelasComerciais) && titulo.parcelasComerciais.length > 0
    ? 'COMERCIAL'
    : 'MANUAL';
}

async function gerarBoletoTitulo(req, tituloId) {
  const titulo = await carregarTituloBoleto(req, tituloId);
  validarConfiguracaoCaixaParaGeracao();
  assertPodeEmitirEmProducao();
  validarTituloParaBoleto(titulo);

  const boleto = calcularBoletoCaixa(titulo);
  const hoje = new Date().toISOString().slice(0, 10);

  await titulo.update({
    forma_cobranca: 'BOLETO',
    status_cobranca: 'EMITIDO',
    banco_cobranca: 'CAIXA',
    nosso_numero: boleto.nosso_numero,
    linha_digitavel: boleto.linha_digitavel,
    codigo_barras: boleto.codigo_barras,
    identificador_externo: boleto.nosso_numero_base,
    boleto_emitido_em: hoje,
    atualizado_por: req.user?.id || null
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'BOLETO_CAIXA_GERADO',
    recursoTipo: 'TITULO_FINANCEIRO',
    recursoId: String(titulo.id),
    status: 'SUCCESS',
    descricao: `Boleto Caixa gerado para o titulo financeiro #${titulo.id}`,
    metadata: JSON.stringify({
      titulo_financeiro_id: titulo.id,
      nosso_numero: boleto.nosso_numero,
      linha_digitavel: boleto.linha_digitavel,
      codigo_barras: boleto.codigo_barras,
      ambiente: boleto.ambiente,
      homologado: boleto.homologado,
      origem: resolveOrigemTituloBoleto(titulo)
    })
  });

  const atualizado = await carregarTituloBoleto(req, titulo.id);
  return toBoletoView(atualizado);
}

async function visualizarBoletoTitulo(req, tituloId) {
  const titulo = await carregarTituloBoleto(req, tituloId);
  return toBoletoView(titulo);
}

async function gerarAmostraBoletoTitulo(req, tituloId) {
  const titulo = await carregarTituloBoleto(req, tituloId);
  validarConfiguracaoCaixaParaGeracao();
  validarTituloParaBoleto(titulo);
  const detalhe = toBoletoAmostraView(titulo);

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'BOLETO_CAIXA_AMOSTRA_GERADA',
    recursoTipo: 'TITULO_FINANCEIRO',
    recursoId: String(titulo.id),
    status: 'SUCCESS',
    descricao: `Amostra de boleto Caixa gerada para homologacao do titulo financeiro #${titulo.id}`,
    metadata: JSON.stringify({
      titulo_financeiro_id: titulo.id,
      nosso_numero: detalhe.boleto.nosso_numero,
      linha_digitavel: detalhe.boleto.linha_digitavel,
      codigo_barras: detalhe.boleto.codigo_barras,
      ambiente: detalhe.boleto.ambiente,
      origem: resolveOrigemTituloBoleto(titulo)
    })
  });

  return detalhe;
}

async function gerarPdfBoletoTitulo(req, tituloId, { amostra = false } = {}) {
  const detalhe = amostra
    ? await gerarAmostraBoletoTitulo(req, tituloId)
    : await visualizarBoletoTitulo(req, tituloId);

  if (!detalhe?.boleto?.codigo_barras) {
    throw createHttpError(400, 'Gere o boleto ou use o modo amostra antes de baixar o PDF.');
  }

  const pdf = await buildBoletoPdfBuffer(detalhe);
  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: amostra ? 'BOLETO_CAIXA_AMOSTRA_PDF_BAIXADO' : 'BOLETO_CAIXA_PDF_BAIXADO',
    recursoTipo: 'TITULO_FINANCEIRO',
    recursoId: String(detalhe.titulo.id),
    status: 'SUCCESS',
    descricao: `${amostra ? 'PDF de amostra' : 'PDF'} de boleto Caixa baixado para o titulo financeiro #${detalhe.titulo.id}`,
    metadata: JSON.stringify({
      titulo_financeiro_id: detalhe.titulo.id,
      nosso_numero: detalhe.boleto.nosso_numero,
      linha_digitavel: detalhe.boleto.linha_digitavel,
      ambiente: detalhe.boleto.ambiente,
      amostra: Boolean(amostra)
    })
  });

  return {
    buffer: pdf,
    filename: `boleto-caixa-${detalhe.titulo.numero_documento || detalhe.titulo.id}${amostra ? '-amostra' : ''}.pdf`
      .replace(/[^\w.-]+/g, '-')
      .toLowerCase()
  };
}

function getConfigBoletoCaixa() {
  const codigoBeneficiario = onlyDigits(env.caixaCodigoBeneficiario);
  const missing = [];
  if (!env.caixaAgencia) missing.push('CAIXA_AGENCIA');
  if (!codigoBeneficiario) missing.push('CAIXA_CODIGO_BENEFICIARIO');
  if (!(env.caixaBeneficiarioNome || env.companyLegalName || env.companyName)) {
    missing.push('CAIXA_BENEFICIARIO_NOME ou COMPANY_LEGAL_NAME');
  }
  if (!env.caixaBeneficiarioCpfCnpj) missing.push('CAIXA_BENEFICIARIO_CPF_CNPJ');

  return {
    banco: 'CAIXA',
    codigo_banco: '104',
    ambiente: env.caixaBoletoAmbiente === 'PRODUCAO' ? 'PRODUCAO' : 'TESTE',
    modo_teste: env.caixaBoletoAmbiente !== 'PRODUCAO',
    homologado: env.caixaBoletoHomologado,
    configurado: missing.length === 0,
    configuracao_pendente: missing,
    agencia_configurada: Boolean(env.caixaAgencia),
    codigo_beneficiario_configurado: Boolean(codigoBeneficiario),
    beneficiario_configurado: Boolean(env.caixaBeneficiarioNome || env.companyLegalName || env.companyName),
    beneficiario_cpf_cnpj_configurado: Boolean(env.caixaBeneficiarioCpfCnpj),
    emissao_real_bloqueada: env.caixaBoletoAmbiente === 'PRODUCAO' && !env.caixaBoletoHomologado,
    homologacao_necessaria: true
  };
}

module.exports = {
  _internals: {
    calcularFatorVencimento,
    drawInterleavedBarcode,
    modulo10,
    modulo11,
    montarCampoLivre,
    montarLinhaDigitavel,
    resolverNossoNumero
  },
  calcularBoletoCaixa,
  gerarAmostraBoletoTitulo,
  gerarBoletoTitulo,
  gerarPdfBoletoTitulo,
  getConfigBoletoCaixa,
  listarTitulosBoleto,
  visualizarBoletoTitulo
};
