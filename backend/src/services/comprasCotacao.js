const crypto = require('crypto');
const {
  FornecedorCompra,
  SolicitacaoCompra,
  SolicitacaoCompraFornecedor,
  SolicitacaoCompraItem,
  SolicitacaoCompraItemManual,
  SolicitacaoCompraLog
} = require('../models');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function gerarTokenCotacao() {
  return crypto.randomBytes(24).toString('hex');
}

function obterOrigemFrontend(req) {
  const envOrigin =
    process.env.FRONTEND_PUBLIC_URL ||
    process.env.FRONTEND_URL ||
    process.env.APP_FRONTEND_URL ||
    process.env.WEB_URL;

  if (envOrigin) {
    return String(envOrigin).replace(/\/+$/, '');
  }

  const origin = String(req.headers.origin || '').trim();
  if (origin) {
    return origin.replace(/\/+$/, '');
  }

  return 'http://localhost:5173';
}

function montarUrlCotacaoPublica(req, token) {
  return `${obterOrigemFrontend(req)}/cotacao/${token}`;
}

function obterCodigoProdutoCotacao(item) {
  return item.item_tipo === 'MANUAL' ? `MAN-${item.id}` : `INS-${item.id}`;
}

function obterItemReferenciaId(item) {
  return Number(item.id);
}

function obterItensCotaveis(solicitacao) {
  const itens = (solicitacao?.itens || []).map((item) => ({
    id: Number(item.id),
    item_tipo: 'CADASTRADO',
    produto_id: obterCodigoProdutoCotacao({ ...item, item_tipo: 'CADASTRADO' }),
    item_referencia_id: obterItemReferenciaId(item),
    nome: item.insumo?.nome || '-',
    quantidade: Number(item.quantidade || 0),
    unidade: item.unidade?.sigla || '-',
    especificacao: item.especificacao || '',
    necessario_para: item.necessario_para || null
  }));

  const itensManuais = (solicitacao?.itensManuais || []).map((item) => ({
    id: Number(item.id),
    item_tipo: 'MANUAL',
    produto_id: obterCodigoProdutoCotacao({ ...item, item_tipo: 'MANUAL' }),
    item_referencia_id: obterItemReferenciaId(item),
    nome: item.nome_manual || '-',
    quantidade: Number(item.quantidade || 0),
    unidade: item.unidade_sigla_manual || '-',
    especificacao: item.especificacao || '',
    necessario_para: item.necessario_para || null
  }));

  return [...itens, ...itensManuais];
}

async function registrarLogSolicitacaoCompra({
  solicitacaoCompraId,
  usuarioId = null,
  fornecedorCompraId = null,
  tipoAcao,
  descricao,
  metadados = null,
  transaction
}) {
  if (!solicitacaoCompraId || !tipoAcao || !descricao) {
    return null;
  }

  return SolicitacaoCompraLog.create(
    {
      solicitacao_compra_id: solicitacaoCompraId,
      usuario_id: usuarioId,
      fornecedor_compra_id: fornecedorCompraId,
      tipo_acao: tipoAcao,
      descricao,
      metadados: metadados ? JSON.stringify(metadados) : null
    },
    { transaction }
  );
}

function serializeCsvValue(value) {
  const raw = String(value ?? '');
  if (raw.includes(',') || raw.includes(';') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function gerarModeloCotacaoCsv(solicitacao) {
  const linhas = obterItensCotaveis(solicitacao);
  const header = ['produto_id', 'nome', 'quantidade', 'preco', 'prazo', 'disponivel'];
  const rows = linhas.map((item) =>
    [
      item.produto_id,
      item.nome,
      item.quantidade,
      '',
      '',
      ''
    ]
      .map(serializeCsvValue)
      .join(',')
  );

  return `${header.join(',')}\n${rows.join('\n')}\n`;
}

function splitCsvLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((value) => value.trim());
}

function parseCsvRows(buffer) {
  const raw = String(buffer || '').replace(/^\uFEFF/, '').trim();
  if (!raw) {
    return [];
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeText);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

function parseDisponivel(value) {
  const normalized = normalizeText(value);
  return ['SIM', 'S', 'TRUE', '1', 'DISPONIVEL', 'DISPONIVEL'].includes(normalized);
}

async function carregarSolicitacaoCompraCompleta(id) {
  return SolicitacaoCompra.findByPk(id, {
    include: [
      {
        model: SolicitacaoCompraItem,
        as: 'itens'
      },
      {
        model: SolicitacaoCompraItemManual,
        as: 'itensManuais'
      },
      {
        model: SolicitacaoCompraFornecedor,
        as: 'fornecedores',
        include: [
          {
            model: FornecedorCompra,
            as: 'fornecedor'
          }
        ]
      }
    ]
  });
}

module.exports = {
  carregarSolicitacaoCompraCompleta,
  gerarModeloCotacaoCsv,
  gerarTokenCotacao,
  montarUrlCotacaoPublica,
  normalizeText,
  obterCodigoProdutoCotacao,
  obterItensCotaveis,
  parseCsvRows,
  parseDisponivel,
  registrarLogSolicitacaoCompra
};
