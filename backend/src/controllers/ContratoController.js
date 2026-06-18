const { Op } = require('sequelize');
const {
  Contrato,
  ContratoAnexo,
  ContratoApropriacao,
  ContratoCredor,
  EmpresaGrupo,
  Obra,
  Apropriacao,
  Parceiro,
  TipoSolicitacao,
  TipoSubContrato,
  Solicitacao,
  Comprovante,
  Setor,
  ConfiguracaoSistema,
  sequelize
} = require('../models');
const { env } = require('../config/env');
const { uploadToS3 } = require('../services/s3');
const {
  canAccessContratos,
  canAccessContratosGlobal,
  canCreateContratos,
  canManageContratos,
  getUserObraScopeIds,
  isBusinessAdmin,
  isSuperadmin,
  shouldRestrictContratosToObras
} = require('../services/authorizationService');
const { registrarEventoSeguranca } = require('../services/securityLogService');
const { normalizeOriginalName } = require('../utils/fileName');
const CHAVE_SETORES_CRIACAO_TODAS_OBRAS = 'SETORES_CRIACAO_TODAS_OBRAS';

function normalizarCabecalho(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(content) {
  const texto = String(content || '').replace(/^\uFEFF/, '');
  const linhas = texto
    .split(/\r?\n/)
    .map(l => l.replace(/\r$/, ''))
    .filter(l => l.trim() !== '');

  if (linhas.length < 2) return { headers: [], rows: [] };

  const first = linhas[0];
  const semicolonCount = (first.match(/;/g) || []).length;
  const commaCount = (first.match(/,/g) || []).length;
  const delimiter = semicolonCount >= commaCount ? ';' : ',';

  const headers = parseCsvLine(first, delimiter).map(h => h.trim());
  const rows = linhas.slice(1).map(line => parseCsvLine(line, delimiter));
  return { headers, rows };
}

function parseValorMonetario(valor) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  const numero = Number(
    texto
      .replace(/[R$\s]/gi, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );
  return Number.isNaN(numero) ? null : numero;
}

function parseDecimalOpcional(valor) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  const numero = Number(texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

function normalizarApropriacoesPayload(lista = []) {
  if (!Array.isArray(lista)) return [];
  const normalizadas = [];
  const vistos = new Set();

  lista.forEach((item) => {
    const apropriacaoId = Number(item?.apropriacao_id);
    if (!Number.isInteger(apropriacaoId) || apropriacaoId <= 0 || vistos.has(apropriacaoId)) {
      return;
    }
    vistos.add(apropriacaoId);
    normalizadas.push({
      apropriacao_id: apropriacaoId,
      percentual: parseDecimalOpcional(item?.percentual),
      quantidade: parseDecimalOpcional(item?.quantidade),
      observacao: String(item?.observacao || '').trim() || null
    });
  });

  return normalizadas;
}

function contratoApropriacoesInclude() {
  return {
    model: ContratoApropriacao,
    as: 'apropriacoes',
    include: [
      {
        model: Apropriacao,
        as: 'apropriacao',
        attributes: ['id', 'obra_id', 'codigo', 'descricao', 'ativo']
      }
    ]
  };
}

function contratoCredoresInclude() {
  return {
    model: Parceiro,
    as: 'credores',
    attributes: ['id', 'nome', 'cpf_cnpj', 'telefone', 'email', 'fornecedor', 'corretor', 'ativo'],
    through: {
      attributes: ['id', 'observacao', 'ativo']
    }
  };
}

function formatarApropriacaoContrato(item) {
  const apropriacao = item.apropriacao || {};
  const codigo = apropriacao.codigo || apropriacao.id || item.apropriacao_id;
  const descricao = apropriacao.descricao ? ` - ${apropriacao.descricao}` : '';
  const percentual = item.percentual !== null && item.percentual !== undefined
    ? ` (${Number(item.percentual).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%)`
    : '';
  const quantidade = item.quantidade !== null && item.quantidade !== undefined
    ? ` qtd ${Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}`
    : '';
  return `${codigo}${descricao}${percentual}${quantidade}`;
}

function resumoCredoresContrato(contrato) {
  const credores = Array.isArray(contrato?.credores) ? contrato.credores : [];
  return credores
    .map((credor) => {
      const documento = credor.cpf_cnpj ? ` (${credor.cpf_cnpj})` : '';
      return `${credor.nome || credor.id}${documento}`;
    })
    .filter(Boolean)
    .join(' | ');
}

function normalizarCredoresPayload(lista = []) {
  if (!Array.isArray(lista)) return [];
  const normalizados = [];
  const vistos = new Set();

  lista.forEach((item) => {
    const parceiroId = Number(item?.parceiro_id ?? item?.id);
    if (!Number.isInteger(parceiroId) || parceiroId <= 0 || vistos.has(parceiroId)) {
      return;
    }
    vistos.add(parceiroId);
    normalizados.push({
      parceiro_id: parceiroId,
      observacao: String(item?.observacao || '').trim() || null
    });
  });

  return normalizados;
}

async function validarCredoresContrato(lista = []) {
  const credores = normalizarCredoresPayload(lista);
  if (credores.length === 0) return credores;

  const ids = credores.map(item => item.parceiro_id);
  const parceiros = await Parceiro.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'nome', 'fornecedor', 'corretor', 'ativo']
  });
  const parceirosMap = new Map(parceiros.map(item => [Number(item.id), item]));

  for (const item of credores) {
    const parceiro = parceirosMap.get(Number(item.parceiro_id));
    if (!parceiro) {
      const error = new Error('Um ou mais credores vinculados ao contrato nao foram encontrados.');
      error.statusCode = 400;
      throw error;
    }
    if (parceiro.ativo === false) {
      const error = new Error(`O credor ${parceiro.nome || parceiro.id} esta inativo.`);
      error.statusCode = 400;
      throw error;
    }
    if (parceiro.fornecedor === false && parceiro.corretor === false) {
      const error = new Error(`O parceiro ${parceiro.nome || parceiro.id} nao esta marcado como fornecedor/corretor.`);
      error.statusCode = 400;
      throw error;
    }
  }

  return credores;
}

async function validarApropriacoesContrato(obraId, lista = []) {
  const apropriacoes = normalizarApropriacoesPayload(lista);
  if (apropriacoes.length === 0) return apropriacoes;

  const ids = apropriacoes.map(item => item.apropriacao_id);
  const registros = await Apropriacao.findAll({
    where: {
      id: { [Op.in]: ids },
      obra_id: Number(obraId)
    },
    attributes: ['id', 'obra_id', 'ativo']
  });
  const registrosMap = new Map(registros.map(item => [Number(item.id), item]));

  for (const item of apropriacoes) {
    const registro = registrosMap.get(Number(item.apropriacao_id));
    if (!registro) {
      const error = new Error('Uma ou mais apropriacoes nao pertencem a obra do contrato.');
      error.statusCode = 400;
      throw error;
    }
    if (registro.ativo === false) {
      const error = new Error('Uma ou mais apropriacoes do contrato estao inativas.');
      error.statusCode = 400;
      throw error;
    }
  }

  return apropriacoes;
}

async function salvarApropriacoesContrato(contratoId, apropriacoes = [], transaction = null) {
  await ContratoApropriacao.destroy({
    where: { contrato_id: contratoId },
    transaction
  });

  if (apropriacoes.length === 0) return;

  await ContratoApropriacao.bulkCreate(
    apropriacoes.map(item => ({
      contrato_id: contratoId,
      apropriacao_id: item.apropriacao_id,
      percentual: item.percentual,
      quantidade: item.quantidade,
      observacao: item.observacao
    })),
    { transaction }
  );
}

async function salvarCredoresContrato(contratoId, credores = [], transaction = null) {
  await ContratoCredor.destroy({
    where: { contrato_id: contratoId },
    transaction
  });

  if (credores.length === 0) return;

  await ContratoCredor.bulkCreate(
    credores.map(item => ({
      contrato_id: contratoId,
      parceiro_id: item.parceiro_id,
      observacao: item.observacao,
      ativo: true
    })),
    { transaction }
  );
}

function contratoToCsvValue(valor) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`;
}

async function isAdminGEO(req) {
  const perfil = String(req.user?.perfil || '').trim().toUpperCase();
  if (isBusinessAdmin(req.user)) return true;
  if (perfil !== 'ADMIN') return false;

  if (!req.user?.setor_id) return false;

  const setor = await Setor.findByPk(req.user.setor_id, {
    attributes: ['nome', 'codigo']
  });
  if (!setor) return false;

  const nome = String(setor.nome || '').trim().toUpperCase();
  const codigo = String(setor.codigo || '').trim().toUpperCase();
  const areaToken = String(req.user?.area || '').trim().toUpperCase();

  return nome === 'GEO' || codigo === 'GEO' || areaToken === 'GEO';
}

async function isSetorObra(req) {
  if (!req.user?.setor_id && !req.user?.area) return false;

  const areaToken = String(req.user?.area || '').trim().toUpperCase();
  if (areaToken === 'OBRA') return true;

  if (!req.user?.setor_id) return false;

  const setor = await Setor.findByPk(req.user.setor_id, {
    attributes: ['nome', 'codigo']
  });
  if (!setor) return false;

  const nome = String(setor.nome || '').trim().toUpperCase();
  const codigo = String(setor.codigo || '').trim().toUpperCase();

  return nome === 'OBRA' || codigo === 'OBRA';
}

async function obterSetoresCriacaoTodasObras() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_SETORES_CRIACAO_TODAS_OBRAS },
    order: [['id', 'DESC']]
  });
  if (!item?.valor) return [];

  try {
    const data = JSON.parse(item.valor);
    if (!Array.isArray(data?.setores)) return [];
    return [...new Set(
      data.setores
        .map(v => String(v || '').trim().toUpperCase())
        .filter(Boolean)
    )];
  } catch {
    return [];
  }
}

async function obterTokensSetorUsuario(req) {
  const tokens = new Set();
  if (req.user?.area) tokens.add(String(req.user.area).trim().toUpperCase());
  if (req.user?.setor_id) {
    tokens.add(String(req.user.setor_id).trim().toUpperCase());
    const setor = await Setor.findByPk(req.user.setor_id, { attributes: ['codigo', 'nome'] });
    if (setor?.codigo) tokens.add(String(setor.codigo).trim().toUpperCase());
    if (setor?.nome) tokens.add(String(setor.nome).trim().toUpperCase());
  }
  return Array.from(tokens).filter(Boolean);
}

async function usuarioPodeAcessarObraContrato(req, obraId) {
  if (!obraId) {
    return false;
  }

  if (isSuperadmin(req.user)) {
    return true;
  }

  if (await canAccessContratosGlobal(req.user)) {
    return true;
  }

  const obrasPermitidas = await getUserObraScopeIds(req.user);
  if (obrasPermitidas === null) {
    return true;
  }

  if (obrasPermitidas.length > 0) {
    return obrasPermitidas.includes(Number(obraId));
  }

  return isAdminGEO(req);
}

async function registrarNegacaoContrato(req, contratoId, obraId, descricao) {
  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'AUTHZ_DENIED',
    recursoTipo: 'CONTRATO',
    recursoId: contratoId != null ? contratoId : obraId,
    status: 'DENIED',
    descricao,
    metadata: {
      obra_id: obraId || null
    }
  });
}

function toNumber(value) {
  const numero = Number(value || 0);
  return Number.isFinite(numero) ? numero : 0;
}

function getContratoMetrics(contrato) {
  const solicitacoes = contrato.solicitacoes || [];
  const totalPagoStatus = solicitacoes.reduce((acc, solicitacao) => {
    if (String(solicitacao.status_global || '').toUpperCase() !== 'PAGA') {
      return acc;
    }
    return acc + toNumber(solicitacao.valor);
  }, 0);

  const valorContrato = toNumber(contrato.valor_total);
  const ajusteSolicitado = toNumber(contrato.ajuste_solicitado);
  const ajustePago = toNumber(contrato.ajuste_pago);
  const totalSolicitado = valorContrato + ajusteSolicitado;
  const totalPago = totalPagoStatus + ajustePago;

  return {
    valor_contrato: valorContrato,
    ajuste_solicitado: ajusteSolicitado,
    ajuste_pago: ajustePago,
    total_solicitado: totalSolicitado,
    total_pago: totalPago,
    total_a_pagar: Math.max(totalSolicitado - totalPago, 0),
    total_solicitacoes: solicitacoes.length,
    total_anexos: (contrato.anexos || []).length
  };
}

function createContratoAccumulator(label, extras = {}) {
  return {
    label,
    total: 0,
    ativos: 0,
    inativos: 0,
    sem_anexo: 0,
    valor_total: 0,
    total_solicitado: 0,
    total_pago: 0,
    total_a_pagar: 0,
    solicitacoes: 0,
    ...extras
  };
}

function addContratoToGroup(map, key, label, contrato, metrics, extras = {}) {
  const groupKey = key || 'SEM_INFORMACAO';
  if (!map.has(groupKey)) {
    map.set(groupKey, createContratoAccumulator(label || 'Sem informacao', extras));
  }

  const item = map.get(groupKey);
  item.total += 1;
  item.ativos += contrato.ativo ? 1 : 0;
  item.inativos += contrato.ativo ? 0 : 1;
  item.sem_anexo += metrics.total_anexos > 0 ? 0 : 1;
  item.valor_total += metrics.valor_contrato;
  item.total_solicitado += metrics.total_solicitado;
  item.total_pago += metrics.total_pago;
  item.total_a_pagar += metrics.total_a_pagar;
  item.solicitacoes += metrics.total_solicitacoes;
  return item;
}

function sortContratoGroups(map, valueKey = 'valor_total') {
  return Array.from(map.values()).sort((a, b) => {
    const valueDiff = toNumber(b[valueKey]) - toNumber(a[valueKey]);
    if (valueDiff !== 0) return valueDiff;
    return String(a.label || '').localeCompare(String(b.label || ''), 'pt-BR');
  });
}

function emptyContratoOperationalReport() {
  return {
    filtros: {},
    resumo: {
      total_contratos: 0,
      ativos: 0,
      inativos: 0,
      sem_anexo: 0,
      com_anexo: 0,
      valor_total: 0,
      ajuste_solicitado: 0,
      ajuste_pago: 0,
      total_solicitado: 0,
      total_pago: 0,
      total_a_pagar: 0,
      solicitacoes_vinculadas: 0
    },
    por_status: [],
    por_obra: [],
    por_empresa: [],
    por_referencia: [],
    por_tipo_macro: [],
    por_tipo_sub: [],
    por_mes_cadastro: [],
    pendencias_cadastrais: []
  };
}

module.exports = {
  async index(req, res) {
    try {
      const { obra_id, ref, codigo, modo } = req.query;
      const where = {};
      const podeVisualizarContratos = await canAccessContratos(req.user);
      const restringirPorObra = await shouldRestrictContratosToObras(req.user);
      const acessoGlobalContratos = !restringirPorObra && await canAccessContratosGlobal(req.user);
      const obrasPermitidas = isSuperadmin(req.user) ? null : await getUserObraScopeIds(req.user);
      const modoCriacao = String(modo || '').trim().toUpperCase() === 'CRIACAO';
      let podeCriarEmTodasObras = false;

      if (!podeVisualizarContratos) {
        return res.status(403).json({
          error: 'Acesso negado',
          code: 'CONTRATOS_PERMISSAO_VISUALIZAR_AUSENTE'
        });
      }

      if (modoCriacao && !acessoGlobalContratos) {
        const [tokensUsuario, setoresPermitidos] = await Promise.all([
          obterTokensSetorUsuario(req),
          obterSetoresCriacaoTodasObras()
        ]);
        podeCriarEmTodasObras = tokensUsuario.some(token => setoresPermitidos.includes(token));
      }

      if (obra_id) {
        where.obra_id = obra_id;
      }

      if (ref) {
        where.ref_contrato = { [Op.like]: `%${String(ref).trim()}%` };
      }
      if (codigo) {
        where.codigo = { [Op.like]: `%${String(codigo).trim()}%` };
      }

      if (!acessoGlobalContratos && obrasPermitidas && obrasPermitidas.length > 0) {
        if (where.obra_id && !obrasPermitidas.includes(Number(where.obra_id))) {
          await registrarNegacaoContrato(
            req,
            null,
            Number(where.obra_id),
            'Usuario tentou consultar contratos de obra fora do seu escopo'
          );
          return res.status(403).json({ error: 'Acesso negado para esta obra' });
        }
        where.obra_id = where.obra_id
          ? Number(where.obra_id)
          : { [Op.in]: obrasPermitidas };
      } else if (!acessoGlobalContratos && obrasPermitidas !== null && !podeCriarEmTodasObras) {
        return res.json([]);
      }

      const contratos = await Contrato.findAll({
        where,
        include: [
          { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
          { model: TipoSolicitacao, as: 'tipoMacro', attributes: ['id', 'nome'] },
          { model: TipoSubContrato, as: 'tipoSub', attributes: ['id', 'nome'] },
          contratoApropriacoesInclude(),
          contratoCredoresInclude()
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json(contratos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar contratos' });
    }
  },

  async create(req, res) {
    try {
      const podeCriarContrato = await canCreateContratos(req.user);
      if (!podeCriarContrato) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const {
        obra_id,
        codigo,
        ref_contrato,
        fornecedor,
        descricao,
        itens_apropriacao,
        valor_total,
        tipo_macro_id,
        tipo_sub_id,
        ajuste_solicitado,
        ajuste_pago,
        apropriacoes,
        credores
      } = req.body;

      const refContratoFinal = ref_contrato ?? fornecedor;
      if (!obra_id || !codigo || !refContratoFinal || valor_total === undefined || valor_total === null) {
        return res.status(400).json({
          error: 'Obra, codigo, ref do contrato e valor total sao obrigatorios'
        });
      }

      if (!(await usuarioPodeAcessarObraContrato(req, obra_id))) {
        await registrarNegacaoContrato(
          req,
          null,
          obra_id,
          'Usuario tentou criar contrato em obra fora do seu escopo'
        );
        return res.status(403).json({ error: 'Acesso negado para esta obra' });
      }

      if (tipo_macro_id) {
        const macro = await TipoSolicitacao.findByPk(tipo_macro_id);
        if (!macro) {
          return res.status(400).json({
            error: 'Tipo macro nao encontrado'
          });
        }
      }

      const apropriacoesNormalizadas = await validarApropriacoesContrato(obra_id, apropriacoes);
      const credoresNormalizados = await validarCredoresContrato(credores);

      const contrato = await sequelize.transaction(async (transaction) => {
        const novoContrato = await Contrato.create({
          obra_id,
          codigo,
          ref_contrato: refContratoFinal,
          descricao: descricao || null,
          itens_apropriacao: itens_apropriacao || null,
          valor_total,
          ajuste_solicitado: ajuste_solicitado ?? 0,
          ajuste_pago: ajuste_pago ?? 0,
          tipo_macro_id: tipo_macro_id || null,
          tipo_sub_id: tipo_sub_id || null
        }, { transaction });

        await salvarApropriacoesContrato(novoContrato.id, apropriacoesNormalizadas, transaction);
        await salvarCredoresContrato(novoContrato.id, credoresNormalizados, transaction);
        return novoContrato;
      });

      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'CONTRACT_CREATED',
        recursoTipo: 'CONTRATO',
        recursoId: contrato.id,
        status: 'SUCCESS',
        descricao: 'Contrato criado',
        metadata: {
          obra_id: obra_id,
          codigo: contrato.codigo
        }
      });

      const contratoCriado = await Contrato.findByPk(contrato.id, {
        include: [
          { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
          contratoApropriacoesInclude(),
          contratoCredoresInclude()
        ]
      });

      return res.status(201).json(contratoCriado || contrato);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Erro ao criar contrato' });
    }
  },

  async importarMassa(req, res) {
    try {
      const podeAcessar = await isAdminGEO(req);
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      if (!podeAcessar || perfil !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Apenas SUPERADMIN pode importar contratos em massa.' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Envie um arquivo CSV no campo "file".' });
      }

      const nomeArquivo = normalizeOriginalName(file.originalname).toLowerCase();
      if (!nomeArquivo.endsWith('.csv')) {
        return res.status(400).json({ error: 'Formato invalido. Utilize a planilha modelo em CSV.' });
      }

      const conteudo = file.buffer.toString('utf8');
      const { headers, rows } = parseCsv(conteudo);
      if (rows.length > env.csvImportMaxRows) {
        return res.status(400).json({
          error: `O arquivo excede o limite de ${env.csvImportMaxRows} linhas para importacao.`
        });
      }
      if (!headers.length) {
        return res.status(400).json({ error: 'Arquivo CSV vazio ou sem cabecalho.' });
      }

      const headerMap = headers.map(normalizarCabecalho);
      const idxContrato = headerMap.findIndex(h => ['contrato'].includes(h));
      const idxCodigoObra = headerMap.findIndex(h => ['codigo', 'codigo_obra'].includes(h));
      const idxRef = headerMap.findIndex(h => ['ref_do_contrato', 'ref_contrato'].includes(h));
      const idxDescricao = headerMap.findIndex(h => ['descricao'].includes(h));
      const idxItens = headerMap.findIndex(h => ['itens_de_apropriacao', 'itens_apropriacao'].includes(h));
      const idxSolicitado = headerMap.findIndex(h => ['solicitado', 'valor_total'].includes(h));
      const idxApropriacaoCodigo = headerMap.findIndex(h => ['apropriacao_codigo', 'codigo_apropriacao', 'apropriacao'].includes(h));
      const idxApropriacaoPercentual = headerMap.findIndex(h => ['apropriacao_percentual', 'percentual', 'percentual_apropriacao'].includes(h));
      const idxApropriacaoQuantidade = headerMap.findIndex(h => ['apropriacao_quantidade', 'quantidade', 'quantidade_apropriacao'].includes(h));
      const idxApropriacaoObservacao = headerMap.findIndex(h => ['apropriacao_observacao', 'observacao_apropriacao'].includes(h));

      const camposObrigatorios = [
        ['Contrato', idxContrato],
        ['Codigo', idxCodigoObra],
        ['Ref. do Contrato', idxRef],
        ['Solicitado', idxSolicitado]
      ];
      const faltando = camposObrigatorios.filter(([, idx]) => idx < 0).map(([nome]) => nome);
      if (faltando.length > 0) {
        return res.status(400).json({
          error: `Cabecalhos obrigatorios ausentes: ${faltando.join(', ')}. (Descricao e Itens de Apropriacao sao opcionais)`
        });
      }

      const obras = await Obra.findAll({
        attributes: ['id', 'codigo', 'nome']
      });
      const obraMap = new Map();
      obras.forEach(obra => {
        const codigo = String(obra.codigo || '').trim().toUpperCase();
        if (codigo) obraMap.set(codigo, obra);
      });

      const apropriacoes = await Apropriacao.findAll({
        attributes: ['id', 'obra_id', 'codigo', 'descricao', 'ativo']
      });
      const apropriacaoMap = new Map();
      apropriacoes.forEach((apropriacao) => {
        const codigo = String(apropriacao.codigo || '').trim().toUpperCase();
        if (codigo) apropriacaoMap.set(`${Number(apropriacao.obra_id)}:${codigo}`, apropriacao);
      });

      const resultado = {
        total_linhas: rows.length,
        importados: 0,
        atualizados: 0,
        apropriacoes_vinculadas: 0,
        ignorados: 0,
        erros: []
      };

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const linhaPlanilha = i + 2;

        const codigoContrato = String(row[idxContrato] ?? '').trim();
        const codigoObra = String(row[idxCodigoObra] ?? '').trim();
        const refContrato = String(row[idxRef] ?? '').trim();
        const descricao = idxDescricao >= 0 ? String(row[idxDescricao] ?? '').trim() : '';
        const itensApropriacao = idxItens >= 0 ? String(row[idxItens] ?? '').trim() : '';
        const valorTotal = parseValorMonetario(row[idxSolicitado]);

        if (!codigoContrato && !codigoObra && !refContrato && (row.join('').trim() === '')) {
          resultado.ignorados += 1;
          continue;
        }

        if (!codigoContrato || !codigoObra || !refContrato || valorTotal === null) {
          resultado.erros.push({
            linha: linhaPlanilha,
            error: 'Campos obrigatorios invalidos (Contrato, Codigo, Ref. do Contrato, Solicitado).'
          });
          continue;
        }

        const obra = obraMap.get(codigoObra.toUpperCase());
        if (!obra) {
          resultado.erros.push({
            linha: linhaPlanilha,
            error: `Obra nao encontrada para o codigo "${codigoObra}".`
          });
          continue;
        }

        const apropriacaoCodigo = idxApropriacaoCodigo >= 0
          ? String(row[idxApropriacaoCodigo] ?? '').trim()
          : '';
        const apropriacaoRegistro = apropriacaoCodigo
          ? apropriacaoMap.get(`${Number(obra.id)}:${apropriacaoCodigo.toUpperCase()}`)
          : null;

        if (apropriacaoCodigo && !apropriacaoRegistro) {
          resultado.erros.push({
            linha: linhaPlanilha,
            error: `Apropriacao "${apropriacaoCodigo}" nao encontrada para a obra "${obra.nome}".`
          });
          continue;
        }
        if (apropriacaoRegistro?.ativo === false) {
          resultado.erros.push({
            linha: linhaPlanilha,
            error: `Apropriacao "${apropriacaoCodigo}" esta inativa.`
          });
          continue;
        }

        const existente = await Contrato.findOne({
          where: {
            obra_id: obra.id,
            codigo: codigoContrato
          },
          attributes: ['id', 'descricao', 'itens_apropriacao']
        });

        if (existente) {
          await sequelize.transaction(async (transaction) => {
            await existente.update({
              ref_contrato: refContrato,
              descricao: descricao || existente.descricao || null,
              itens_apropriacao: itensApropriacao || existente.itens_apropriacao || null,
              valor_total: valorTotal
            }, { transaction });

            if (apropriacaoRegistro) {
              await ContratoApropriacao.upsert({
                contrato_id: existente.id,
                apropriacao_id: apropriacaoRegistro.id,
                percentual: idxApropriacaoPercentual >= 0 ? parseDecimalOpcional(row[idxApropriacaoPercentual]) : null,
                quantidade: idxApropriacaoQuantidade >= 0 ? parseDecimalOpcional(row[idxApropriacaoQuantidade]) : null,
                observacao: idxApropriacaoObservacao >= 0
                  ? (String(row[idxApropriacaoObservacao] ?? '').trim() || null)
                  : null
              }, { transaction });
              resultado.apropriacoes_vinculadas += 1;
            }
          });
          resultado.atualizados += 1;
          continue;
        }

        const contratoCriado = await Contrato.create({
          obra_id: obra.id,
          codigo: codigoContrato,
          ref_contrato: refContrato,
          descricao: descricao || null,
          itens_apropriacao: itensApropriacao || null,
          valor_total: valorTotal,
          ajuste_solicitado: 0,
          ajuste_pago: 0
        });

        if (apropriacaoRegistro) {
          await ContratoApropriacao.create({
            contrato_id: contratoCriado.id,
            apropriacao_id: apropriacaoRegistro.id,
            percentual: idxApropriacaoPercentual >= 0 ? parseDecimalOpcional(row[idxApropriacaoPercentual]) : null,
            quantidade: idxApropriacaoQuantidade >= 0 ? parseDecimalOpcional(row[idxApropriacaoQuantidade]) : null,
            observacao: idxApropriacaoObservacao >= 0
              ? (String(row[idxApropriacaoObservacao] ?? '').trim() || null)
              : null
          });
          resultado.apropriacoes_vinculadas += 1;
        }

        resultado.importados += 1;
      }

      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao importar contratos em massa' });
    }
  },

  async exportarCsv(req, res) {
    try {
      const podeVisualizarContratos = await canAccessContratos(req.user);
      const restringirPorObra = await shouldRestrictContratosToObras(req.user);
      const acessoGlobalContratos = !restringirPorObra && await canAccessContratosGlobal(req.user);
      const obrasPermitidas = isSuperadmin(req.user) ? null : await getUserObraScopeIds(req.user);

      if (!podeVisualizarContratos) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const where = {};
      const { obra_id, ref, codigo } = req.query;

      if (!acessoGlobalContratos && obrasPermitidas && obrasPermitidas.length > 0) {
        if (obra_id && !obrasPermitidas.includes(Number(obra_id))) {
          return res.status(403).json({ error: 'Acesso negado para esta obra' });
        }
        where.obra_id = obra_id ? Number(obra_id) : { [Op.in]: obrasPermitidas };
      } else if (!acessoGlobalContratos && obrasPermitidas !== null) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      if (obra_id) where.obra_id = obra_id;
      if (ref) where.ref_contrato = { [Op.like]: `%${String(ref).trim()}%` };
      if (codigo) where.codigo = { [Op.like]: `%${String(codigo).trim()}%` };

      const contratos = await Contrato.findAll({
        where,
        include: [
          { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
          contratoApropriacoesInclude(),
          contratoCredoresInclude()
        ],
        order: [
          [{ model: Obra, as: 'obra' }, 'codigo', 'ASC'],
          ['codigo', 'ASC']
        ]
      });

      const linhas = [[
        'Contrato',
        'Codigo',
        'Ref. do Contrato',
        'Descricao',
        'Credores',
        'Itens de Apropriacao',
        'Solicitado',
        'Apropriacao Codigo',
        'Apropriacao Descricao',
        'Apropriacao Percentual',
        'Apropriacao Quantidade',
        'Apropriacao Observacao'
      ]];

      contratos.forEach((contrato) => {
        const apropriacoesContrato = Array.isArray(contrato.apropriacoes) ? contrato.apropriacoes : [];
        if (apropriacoesContrato.length === 0) {
          linhas.push([
            contrato.codigo,
            contrato.obra?.codigo || '',
            contrato.ref_contrato || '',
            contrato.descricao || '',
            resumoCredoresContrato(contrato),
            contrato.itens_apropriacao || '',
            contrato.valor_total || '',
            '',
            '',
            '',
            '',
            ''
          ]);
          return;
        }

        apropriacoesContrato.forEach((item) => {
          linhas.push([
            contrato.codigo,
            contrato.obra?.codigo || '',
            contrato.ref_contrato || '',
            contrato.descricao || '',
            resumoCredoresContrato(contrato),
            contrato.itens_apropriacao || '',
            contrato.valor_total || '',
            item.apropriacao?.codigo || '',
            item.apropriacao?.descricao || '',
            item.percentual ?? '',
            item.quantidade ?? '',
            item.observacao || ''
          ]);
        });
      });

      const csv = linhas
        .map(linha => linha.map(contratoToCsvValue).join(';'))
        .join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="contratos-apropriacoes.csv"');
      return res.send(`\uFEFF${csv}`);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao exportar contratos' });
    }
  },

  async resumo(req, res) {
    try {
      const podeVisualizarContratos = await canAccessContratos(req.user);
      const restringirPorObra = await shouldRestrictContratosToObras(req.user);
      const acessoGlobalContratos = !restringirPorObra && await canAccessContratosGlobal(req.user);
      const obrasPermitidas = isSuperadmin(req.user) ? null : await getUserObraScopeIds(req.user);

      if (!podeVisualizarContratos) {
        return res.status(403).json({
          error: 'Acesso negado',
          code: 'CONTRATOS_PERMISSAO_VISUALIZAR_AUSENTE'
        });
      }

      const where = {};

      const { obra_id, ref, codigo } = req.query;

      if (!acessoGlobalContratos && obrasPermitidas && obrasPermitidas.length > 0) {
        if (obra_id && !obrasPermitidas.includes(Number(obra_id))) {
          await registrarNegacaoContrato(
            req,
            null,
            Number(obra_id),
            'Usuario tentou consultar resumo de contratos de obra fora do seu escopo'
          );
          return res.status(403).json({ error: 'Acesso negado para esta obra' });
        }
        where.obra_id = obra_id ? Number(obra_id) : { [Op.in]: obrasPermitidas };
      } else if (!acessoGlobalContratos && obrasPermitidas !== null) {
        return res.json([]);
      }

      if (obra_id) {
        where.obra_id = obra_id;
      }
      if (ref) {
        where.ref_contrato = { [Op.like]: `%${String(ref).trim()}%` };
      }
      if (codigo) {
        where.codigo = { [Op.like]: `%${String(codigo).trim()}%` };
      }

      const contratos = await Contrato.findAll({
        where,
        include: [
          { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
          { model: TipoSolicitacao, as: 'tipoMacro', attributes: ['id', 'nome'] },
          { model: TipoSubContrato, as: 'tipoSub', attributes: ['id', 'nome'] },
          contratoApropriacoesInclude(),
          contratoCredoresInclude(),
          {
            model: Solicitacao,
            as: 'solicitacoes',
            attributes: ['id', 'valor', 'status_global'],
            include: [
              {
                model: Comprovante,
                as: 'comprovantes',
                attributes: ['id', 'valor']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const resultado = contratos.map(c => {
        const solicitacoes = c.solicitacoes || [];
        const totalPagoStatus = solicitacoes.reduce((acc, s) => {
          if (String(s.status_global || '').toUpperCase() !== 'PAGA') {
            return acc;
          }
          return acc + Number(s.valor || 0);
        }, 0);

        const ajusteSolicitado = Number(c.ajuste_solicitado || 0);
        const ajustePago = Number(c.ajuste_pago || 0);
        const valorContrato = Number(c.valor_total || 0);
        // "Solicitado" do contrato deve refletir apenas o valor do contrato e ajustes manuais,
        // sem somar automaticamente os valores das solicitacoes vinculadas.
        const totalSolicitadoFinal = valorContrato + ajusteSolicitado;
        const totalPagoFinal = totalPagoStatus + ajustePago;

        return {
          ...c.toJSON(),
          total_solicitado: totalSolicitadoFinal,
          total_pago: totalPagoFinal,
          total_a_pagar: Math.max(totalSolicitadoFinal - totalPagoFinal, 0),
          total_solicitacoes: solicitacoes.length
        };
      });

      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar resumo de contratos' });
    }
  },

  async relatorioOperacional(req, res) {
    try {
      const podeVisualizarContratos = await canAccessContratos(req.user);
      const restringirPorObra = await shouldRestrictContratosToObras(req.user);
      const acessoGlobalContratos = !restringirPorObra && await canAccessContratosGlobal(req.user);
      const obrasPermitidas = isSuperadmin(req.user) ? null : await getUserObraScopeIds(req.user);

      if (!podeVisualizarContratos) {
        return res.status(403).json({
          error: 'Acesso negado',
          code: 'CONTRATOS_PERMISSAO_VISUALIZAR_AUSENTE'
        });
      }

      const { obra_id, ref, codigo, ativo, data_inicio, data_fim } = req.query;
      const where = {};

      if (!acessoGlobalContratos && obrasPermitidas && obrasPermitidas.length > 0) {
        if (obra_id && !obrasPermitidas.includes(Number(obra_id))) {
          await registrarNegacaoContrato(
            req,
            null,
            Number(obra_id),
            'Usuario tentou consultar relatorio de contratos de obra fora do seu escopo'
          );
          return res.status(403).json({ error: 'Acesso negado para esta obra' });
        }
        where.obra_id = obra_id ? Number(obra_id) : { [Op.in]: obrasPermitidas };
      } else if (!acessoGlobalContratos && obrasPermitidas !== null) {
        return res.json(emptyContratoOperationalReport());
      } else if (obra_id) {
        where.obra_id = Number(obra_id);
      }

      if (ref) {
        where.ref_contrato = { [Op.like]: `%${String(ref).trim()}%` };
      }
      if (codigo) {
        where.codigo = { [Op.like]: `%${String(codigo).trim()}%` };
      }
      if (ativo !== undefined) {
        where.ativo = Boolean(ativo);
      }
      if (data_inicio || data_fim) {
        where.createdAt = {};
        if (data_inicio) {
          where.createdAt[Op.gte] = new Date(`${data_inicio}T00:00:00.000`);
        }
        if (data_fim) {
          where.createdAt[Op.lte] = new Date(`${data_fim}T23:59:59.999`);
        }
      }

      const contratos = await Contrato.findAll({
        where,
        include: [
          {
            model: Obra,
            as: 'obra',
            attributes: ['id', 'nome', 'codigo', 'tipo_centro_custo', 'empresa_grupo_id'],
            include: [
              {
                model: EmpresaGrupo,
                as: 'empresaGrupo',
                attributes: ['id', 'nome', 'razao_social', 'tipo_empresa']
              }
            ]
          },
          { model: TipoSolicitacao, as: 'tipoMacro', attributes: ['id', 'nome'] },
          { model: TipoSubContrato, as: 'tipoSub', attributes: ['id', 'nome'] },
          {
            model: Solicitacao,
            as: 'solicitacoes',
            attributes: ['id', 'valor', 'status_global']
          },
          {
            model: ContratoAnexo,
            as: 'anexos',
            attributes: ['id']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const resumo = emptyContratoOperationalReport().resumo;
      const porStatus = new Map();
      const porObra = new Map();
      const porEmpresa = new Map();
      const porReferencia = new Map();
      const porTipoMacro = new Map();
      const porTipoSub = new Map();
      const porMesCadastro = new Map();
      const pendenciasCadastrais = [];

      for (const contrato of contratos) {
        const metrics = getContratoMetrics(contrato);
        const statusKey = contrato.ativo ? 'ATIVO' : 'INATIVO';
        const obra = contrato.obra;
        const empresa = obra?.empresaGrupo;
        const empresaLabel = empresa?.nome || empresa?.razao_social || 'Sem empresa vinculada';
        const obraLabel = obra
          ? `${obra.codigo ? `${obra.codigo} - ` : ''}${obra.nome}`
          : 'Sem obra/centro';
        const refLabel = contrato.ref_contrato || 'Sem referencia';
        const tipoMacroLabel = contrato.tipoMacro?.nome || 'Sem tipo macro';
        const tipoSubLabel = contrato.tipoSub?.nome || 'Sem tipo sub';
        const mesCadastro = contrato.createdAt
          ? new Date(contrato.createdAt).toISOString().slice(0, 7)
          : 'Sem data';

        resumo.total_contratos += 1;
        resumo.ativos += contrato.ativo ? 1 : 0;
        resumo.inativos += contrato.ativo ? 0 : 1;
        resumo.sem_anexo += metrics.total_anexos > 0 ? 0 : 1;
        resumo.com_anexo += metrics.total_anexos > 0 ? 1 : 0;
        resumo.valor_total += metrics.valor_contrato;
        resumo.ajuste_solicitado += metrics.ajuste_solicitado;
        resumo.ajuste_pago += metrics.ajuste_pago;
        resumo.total_solicitado += metrics.total_solicitado;
        resumo.total_pago += metrics.total_pago;
        resumo.total_a_pagar += metrics.total_a_pagar;
        resumo.solicitacoes_vinculadas += metrics.total_solicitacoes;

        addContratoToGroup(porStatus, statusKey, contrato.ativo ? 'Ativos' : 'Inativos', contrato, metrics);
        addContratoToGroup(porObra, obra?.id, obraLabel, contrato, metrics, {
          obra_id: obra?.id || null,
          codigo: obra?.codigo || null,
          tipo_centro_custo: obra?.tipo_centro_custo || null,
          empresa: empresaLabel
        });
        addContratoToGroup(porEmpresa, empresa?.id, empresaLabel, contrato, metrics, {
          empresa_id: empresa?.id || null,
          tipo_empresa: empresa?.tipo_empresa || null
        });
        addContratoToGroup(porReferencia, refLabel, refLabel, contrato, metrics);
        addContratoToGroup(porTipoMacro, contrato.tipoMacro?.id, tipoMacroLabel, contrato, metrics);
        addContratoToGroup(porTipoSub, contrato.tipoSub?.id, tipoSubLabel, contrato, metrics);
        addContratoToGroup(porMesCadastro, mesCadastro, mesCadastro, contrato, metrics);

        const pendencias = [];
        if (metrics.total_anexos === 0) pendencias.push('Sem anexo');
        if (!obra?.empresa_grupo_id) pendencias.push('Obra/centro sem empresa do grupo');
        if (!contrato.ref_contrato) pendencias.push('Sem referencia do contrato');
        if (metrics.valor_contrato <= 0) pendencias.push('Valor do contrato zerado');

        if (pendencias.length > 0) {
          pendenciasCadastrais.push({
            id: contrato.id,
            codigo: contrato.codigo,
            referencia: contrato.ref_contrato || null,
            obra: obraLabel,
            empresa: empresaLabel,
            valor_total: metrics.valor_contrato,
            total_a_pagar: metrics.total_a_pagar,
            pendencias
          });
        }
      }

      return res.json({
        filtros: { obra_id, ref, codigo, ativo, data_inicio, data_fim },
        resumo,
        por_status: sortContratoGroups(porStatus, 'total'),
        por_obra: sortContratoGroups(porObra, 'valor_total'),
        por_empresa: sortContratoGroups(porEmpresa, 'valor_total'),
        por_referencia: sortContratoGroups(porReferencia, 'valor_total').slice(0, 50),
        por_tipo_macro: sortContratoGroups(porTipoMacro, 'valor_total'),
        por_tipo_sub: sortContratoGroups(porTipoSub, 'valor_total'),
        por_mes_cadastro: Array.from(porMesCadastro.entries())
          .sort(([a], [b]) => String(a).localeCompare(String(b)))
          .map(([, item]) => item),
        pendencias_cadastrais: pendenciasCadastrais
          .sort((a, b) => b.pendencias.length - a.pendencias.length || toNumber(b.valor_total) - toNumber(a.valor_total))
          .slice(0, 80)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar relatorio operacional de contratos' });
    }
  },

  async solicitacoes(req, res) {
    try {
      const podeVisualizarContratos = await canAccessContratos(req.user);
      if (!podeVisualizarContratos) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        return res.status(404).json({ error: 'Contrato nao encontrado' });
      }

      if (!(await usuarioPodeAcessarObraContrato(req, contrato.obra_id))) {
        await registrarNegacaoContrato(
          req,
          contrato.id,
          contrato.obra_id,
          'Usuario tentou consultar solicitacoes de contrato fora do seu escopo'
        );
        return res.status(403).json({ error: 'Acesso negado para esta obra' });
      }

      const solicitacoes = await Solicitacao.findAll({
        where: { contrato_id: id },
        order: [['createdAt', 'DESC']]
      });

      return res.json(solicitacoes);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar solicitacoes do contrato' });
    }
  },

  async update(req, res) {
    try {
      const podeEditarContrato = await canManageContratos(req.user);
      if (!podeEditarContrato) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const {
        obra_id,
        codigo,
        ref_contrato,
        fornecedor,
        descricao,
        itens_apropriacao,
        valor_total,
        tipo_macro_id,
        tipo_sub_id,
        ativo,
        ajuste_solicitado,
        ajuste_pago,
        apropriacoes,
        credores
      } = req.body;

      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        return res.status(404).json({ error: 'Contrato nao encontrado' });
      }

      if (obra_id !== undefined && obra_id !== null) {
        const obra = await Obra.findByPk(obra_id, { attributes: ['id'] });
        if (!obra) {
          return res.status(400).json({ error: 'Obra nao encontrada' });
        }
      }

      const obraFinalId = obra_id !== undefined && obra_id !== null ? obra_id : contrato.obra_id;
      const apropriacoesNormalizadas = apropriacoes !== undefined
        ? await validarApropriacoesContrato(obraFinalId, apropriacoes)
        : null;
      const credoresNormalizados = credores !== undefined
        ? await validarCredoresContrato(credores)
        : null;

      await sequelize.transaction(async (transaction) => {
        await contrato.update({
          obra_id: obraFinalId,
          codigo: codigo ?? contrato.codigo,
          ref_contrato: (ref_contrato ?? fornecedor) ?? contrato.ref_contrato,
          descricao: descricao ?? contrato.descricao,
          itens_apropriacao: itens_apropriacao ?? contrato.itens_apropriacao,
          valor_total: valor_total ?? contrato.valor_total,
          tipo_macro_id: tipo_macro_id ?? contrato.tipo_macro_id,
          tipo_sub_id: tipo_sub_id ?? contrato.tipo_sub_id,
          ativo: ativo ?? contrato.ativo,
          ajuste_solicitado: ajuste_solicitado ?? contrato.ajuste_solicitado,
          ajuste_pago: ajuste_pago ?? contrato.ajuste_pago
        }, { transaction });

        if (apropriacoesNormalizadas !== null) {
          await salvarApropriacoesContrato(contrato.id, apropriacoesNormalizadas, transaction);
        }
        if (credoresNormalizados !== null) {
          await salvarCredoresContrato(contrato.id, credoresNormalizados, transaction);
        }
      });

      const contratoAtualizado = await Contrato.findByPk(contrato.id, {
        include: [
          { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
          contratoApropriacoesInclude(),
          contratoCredoresInclude()
        ]
      });

      return res.json(contratoAtualizado || contrato);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Erro ao atualizar contrato' });
    }
  },

  async ativar(req, res) {
    try {
      const podeEditarContrato = await canManageContratos(req.user);
      if (!podeEditarContrato) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        return res.status(404).json({ error: 'Contrato nao encontrado' });
      }
      await contrato.update({ ativo: true });
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao ativar contrato' });
    }
  },

  async desativar(req, res) {
    try {
      const podeEditarContrato = await canManageContratos(req.user);
      if (!podeEditarContrato) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        return res.status(404).json({ error: 'Contrato nao encontrado' });
      }
      await contrato.update({ ativo: false });
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao desativar contrato' });
    }
  },

  async excluir(req, res) {
    try {
      const podeEditarContrato = await canManageContratos(req.user);
      if (!podeEditarContrato) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        return res.status(404).json({ error: 'Contrato nao encontrado' });
      }

      const totalSolicitacoesRelacionadas = await Solicitacao.count({
        where: {
          [Op.or]: [
            { contrato_id: contrato.id },
            { codigo_contrato: contrato.codigo }
          ]
        }
      });

      await contrato.update({ ativo: false });
      return res.json({
        message: 'Contrato excluido da visualizacao operacional.',
        softDelete: true,
        vinculos: {
          solicitacoes: totalSolicitacoesRelacionadas
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao excluir contrato' });
    }
  },

  async uploadAnexos(req, res) {
    try {
      const podeEditarContrato = await canManageContratos(req.user);
      if (!podeEditarContrato) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        return res.status(404).json({ error: 'Contrato nao encontrado' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const codigo = contrato.codigo || `CONTRATO-${contrato.id}`;

      const registros = [];

      for (const file of req.files) {
        const nomeOriginal = normalizeOriginalName(file.originalname);
        const url = await uploadToS3(
          file,
          `contratos/${String(codigo)}`
        );

        const anexo = await ContratoAnexo.create({
          contrato_id: contrato.id,
          nome_original: nomeOriginal,
          caminho_arquivo: url,
          uploaded_by: req.user.id
        });
        registros.push(anexo);
      }

      return res.status(201).json(registros);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar anexos do contrato' });
    }
  },

  async listarAnexos(req, res) {
    try {
      const podeVisualizarContratos = await canAccessContratos(req.user);
      if (!podeVisualizarContratos) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        return res.status(404).json({ error: 'Contrato nao encontrado' });
      }

      const anexos = await ContratoAnexo.findAll({
        where: { contrato_id: id },
        order: [['createdAt', 'DESC']]
      });

      return res.json(anexos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar anexos do contrato' });
    }
  }
};
