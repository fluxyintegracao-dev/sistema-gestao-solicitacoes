const XLSX = require('xlsx');
const { Parceiro, ParceiroCategoria } = require('../models');
const {
  atualizarParceiro,
  buscarParceiros,
  criarParceiro,
  normalizarCpfCnpj
} = require('../services/parceiroService');
const { responderErroController } = require('../utils/controllerError');

const PLANILHA_COLUNAS = [
  ['cpf_cnpj', 'CPF/CNPJ'],
  ['nome', 'Nome'],
  ['telefone', 'Telefone'],
  ['email', 'E-mail'],
  ['tipo_pessoa', 'Tipo Pessoa (F/J)'],
  ['cliente', 'Cliente (sim/nao)'],
  ['fornecedor', 'Credor/Fornecedor (sim/nao)'],
  ['corretor', 'Corretor (sim/nao)'],
  ['testemunha', 'Testemunha (sim/nao)'],
  ['categorias', 'Categorias (separar por ;)'],
  ['rg', 'RG'],
  ['data_nascimento', 'Data nascimento (AAAA-MM-DD)'],
  ['nacionalidade', 'Nacionalidade'],
  ['profissao', 'Profissao'],
  ['estado_civil', 'Estado civil'],
  ['endereco', 'Endereco'],
  ['numero', 'Numero'],
  ['complemento', 'Complemento'],
  ['bairro', 'Bairro'],
  ['cep', 'CEP'],
  ['municipio', 'Municipio'],
  ['estado', 'UF'],
  ['pix_chave_fixa_1_tipo', 'PIX fixa 1 tipo'],
  ['pix_chave_fixa_1', 'PIX fixa 1'],
  ['pix_chave_fixa_2_tipo', 'PIX fixa 2 tipo'],
  ['pix_chave_fixa_2', 'PIX fixa 2'],
  ['pix_chave_variavel_tipo', 'PIX variavel tipo'],
  ['pix_chave_variavel', 'PIX variavel'],
  ['ativo', 'Ativo (sim/nao)']
];

const HEADER_ALIASES = {
  cpf_cnpj: 'cpf_cnpj',
  cpfcnpj: 'cpf_cnpj',
  documento: 'cpf_cnpj',
  nome: 'nome',
  razao_social: 'nome',
  telefone: 'telefone',
  whatsapp: 'telefone',
  email: 'email',
  e_mail: 'email',
  tipo_pessoa_f_j: 'tipo_pessoa',
  tipo_pessoa: 'tipo_pessoa',
  cliente_sim_nao: 'cliente',
  cliente: 'cliente',
  credor_fornecedor_sim_nao: 'fornecedor',
  credor_fornecedor: 'fornecedor',
  fornecedor: 'fornecedor',
  credor: 'fornecedor',
  corretor_sim_nao: 'corretor',
  corretor: 'corretor',
  testemunha_sim_nao: 'testemunha',
  testemunha: 'testemunha',
  categorias_separar_por: 'categorias',
  categorias_separar_por_ponto_e_virgula: 'categorias',
  categorias: 'categorias',
  categoria: 'categorias',
  rg: 'rg',
  data_nascimento_aaaa_mm_dd: 'data_nascimento',
  data_nascimento: 'data_nascimento',
  nacionalidade: 'nacionalidade',
  profissao: 'profissao',
  estado_civil: 'estado_civil',
  endereco: 'endereco',
  numero: 'numero',
  complemento: 'complemento',
  bairro: 'bairro',
  cep: 'cep',
  municipio: 'municipio',
  uf: 'estado',
  estado: 'estado',
  pix_fixa_1_tipo: 'pix_chave_fixa_1_tipo',
  pix_chave_fixa_1_tipo: 'pix_chave_fixa_1_tipo',
  pix_fixa_1: 'pix_chave_fixa_1',
  pix_chave_fixa_1: 'pix_chave_fixa_1',
  pix_fixa_2_tipo: 'pix_chave_fixa_2_tipo',
  pix_chave_fixa_2_tipo: 'pix_chave_fixa_2_tipo',
  pix_fixa_2: 'pix_chave_fixa_2',
  pix_chave_fixa_2: 'pix_chave_fixa_2',
  pix_variavel_tipo: 'pix_chave_variavel_tipo',
  pix_chave_variavel_tipo: 'pix_chave_variavel_tipo',
  pix_variavel: 'pix_chave_variavel',
  pix_chave_variavel: 'pix_chave_variavel',
  ativo_sim_nao: 'ativo',
  ativo: 'ativo'
};

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeCell(value) {
  return String(value ?? '').trim();
}

function normalizeBoolText(value) {
  if (value === true) return 'sim';
  if (value === false) return 'nao';
  const text = normalizeCell(value).toLowerCase();
  if (['1', 'true', 'sim', 'yes', 's'].includes(text)) return 'sim';
  if (['0', 'false', 'nao', 'não', 'no', 'n'].includes(text)) return 'nao';
  return normalizeCell(value);
}

function parseBool(value, fallback = false) {
  const text = normalizeBoolText(value).toLowerCase();
  if (['sim', '1', 'true', 'yes', 's'].includes(text)) return true;
  if (['nao', 'não', '0', 'false', 'no', 'n'].includes(text)) return false;
  return fallback;
}

function parseCategoriasTexto(value) {
  return normalizeCell(value)
    .split(/[;|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCategoriaKey(value) {
  return normalizeHeader(value);
}

async function resolverCategoriaIds(categoriasTexto = []) {
  if (!categoriasTexto.length) return { ids: [], criadas: [] };
  const existentes = await ParceiroCategoria.findAll();
  const byNome = new Map(
    existentes.map((categoria) => [normalizeCategoriaKey(categoria.nome), categoria])
  );
  const ids = [];
  const criadas = [];

  for (const nome of categoriasTexto) {
    const key = normalizeCategoriaKey(nome);
    if (!key) continue;

    let categoria = byNome.get(key);
    if (!categoria) {
      categoria = await ParceiroCategoria.create({ nome: nome.slice(0, 120), ativo: true });
      byNome.set(key, categoria);
      criadas.push(categoria.nome);
    } else if (categoria.ativo === false) {
      await categoria.update({ ativo: true });
    }

    ids.push(categoria.id);
  }

  return { ids: Array.from(new Set(ids)), criadas };
}

function mapRowToPayload(row = {}) {
  const payload = {};
  Object.entries(row).forEach(([header, value]) => {
    const key = HEADER_ALIASES[normalizeHeader(header)] || normalizeHeader(header);
    if (!key) return;
    payload[key] = normalizeCell(value);
  });

  return {
    cpf_cnpj: normalizarCpfCnpj(payload.cpf_cnpj),
    nome: payload.nome,
    telefone: normalizarCpfCnpj(payload.telefone),
    email: payload.email,
    tipo_pessoa: normalizeCell(payload.tipo_pessoa).toUpperCase(),
    cliente: parseBool(payload.cliente, false),
    fornecedor: parseBool(payload.fornecedor, false),
    corretor: parseBool(payload.corretor, false),
    testemunha: parseBool(payload.testemunha, false),
    categorias: parseCategoriasTexto(payload.categorias),
    rg: payload.rg,
    data_nascimento: payload.data_nascimento,
    nacionalidade: payload.nacionalidade,
    profissao: payload.profissao,
    estado_civil: payload.estado_civil,
    endereco: payload.endereco,
    numero: payload.numero,
    complemento: payload.complemento,
    bairro: payload.bairro,
    cep: normalizarCpfCnpj(payload.cep),
    municipio: payload.municipio,
    estado: payload.estado,
    pix_chave_fixa_1_tipo: payload.pix_chave_fixa_1_tipo,
    pix_chave_fixa_1: payload.pix_chave_fixa_1,
    pix_chave_fixa_2_tipo: payload.pix_chave_fixa_2_tipo,
    pix_chave_fixa_2: payload.pix_chave_fixa_2,
    pix_chave_variavel_tipo: payload.pix_chave_variavel_tipo,
    pix_chave_variavel: payload.pix_chave_variavel,
    ativo: payload.ativo === '' ? true : parseBool(payload.ativo, true)
  };
}

function montarWorkbookParceiros(parceiros = [], categorias = []) {
  const header = PLANILHA_COLUNAS.map(([, label]) => label);
  const rows = parceiros.map((parceiro) => {
    const categoriasTexto = Array.isArray(parceiro.categorias)
      ? parceiro.categorias.map((categoria) => categoria.nome).join('; ')
      : '';
    const values = {
      ...parceiro.get({ plain: true }),
      fornecedor: parceiro.fornecedor ? 'sim' : 'nao',
      cliente: parceiro.cliente ? 'sim' : 'nao',
      corretor: parceiro.corretor ? 'sim' : 'nao',
      testemunha: parceiro.testemunha ? 'sim' : 'nao',
      ativo: parceiro.ativo ? 'sim' : 'nao',
      categorias: categoriasTexto
    };
    return PLANILHA_COLUNAS.map(([key]) => values[key] ?? '');
  });

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = PLANILHA_COLUNAS.map(([key]) => ({
    wch: key === 'categorias' ? 34 : key.includes('pix') ? 24 : 18
  }));

  const instrucoes = [
    ['Campo', 'Orientacao'],
    ['CPF/CNPJ', 'Obrigatorio. Mantenha como texto para preservar zeros a esquerda.'],
    ['Cliente/Credor/Fornecedor', 'Informe sim ou nao para classificar a pessoa. Uma pessoa pode ser cliente e credor ao mesmo tempo.'],
    ['Categorias', 'Separe multiplas categorias por ponto e virgula, por exemplo: Cliente; Fornecedor; Empreiteiro. Categorias novas serao criadas.'],
    ['PIX tipo', 'Valores aceitos: CPF, CNPJ, EMAIL, TELEFONE, ALEATORIA.'],
    ['Importacao', 'Se o CPF/CNPJ ja existir, o sistema atualiza o cadastro e as categorias.']
  ];
  const categoriasSheet = XLSX.utils.aoa_to_sheet([
    ['Categorias cadastradas'],
    ...categorias.map((categoria) => [categoria.nome])
  ]);

  XLSX.utils.book_append_sheet(workbook, sheet, 'Pessoas');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instrucoes), 'Instrucoes');
  XLSX.utils.book_append_sheet(workbook, categoriasSheet, 'Categorias');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function responderXlsx(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buffer);
}

module.exports = {
  async index(req, res) {
    try {
      const parceiros = await buscarParceiros(req.query || {});
      return res.json(parceiros);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar parceiros' });
    }
  },

  async show(req, res) {
    try {
      const parceiro = await Parceiro.findByPk(req.params.id, {
        include: [
          {
            model: ParceiroCategoria,
            as: 'categorias',
            through: { attributes: [] },
            where: { ativo: true },
            required: false
          }
        ]
      });
      if (!parceiro) {
        return res.status(404).json({ error: 'Parceiro nao encontrado' });
      }

      return res.json(parceiro);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar parceiro' });
    }
  },

  async create(req, res) {
    try {
      const parceiro = await criarParceiro(req.body || {});
      return res.status(201).json(parceiro);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao criar parceiro', { status: 400 });
    }
  },

  async update(req, res) {
    try {
      const parceiro = await atualizarParceiro(req.params.id, req.body || {});
      return res.json(parceiro);
    } catch (error) {
      const status = /nao encontrado/i.test(String(error.message || '')) ? 404 : 400;
      return responderErroController(res, error, 'Erro ao atualizar parceiro', { status });
    }
  },

  async modeloXlsx(req, res) {
    try {
      const categorias = await ParceiroCategoria.findAll({
        where: { ativo: true },
        order: [['nome', 'ASC']]
      });
      const buffer = montarWorkbookParceiros([], categorias);
      return responderXlsx(res, buffer, 'modelo-importacao-pessoas.xlsx');
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar modelo de pessoas', { status: 500 });
    }
  },

  async exportarXlsx(req, res) {
    try {
      const [parceiros, categorias] = await Promise.all([
        Parceiro.findAll({
          include: [
            {
              model: ParceiroCategoria,
              as: 'categorias',
              through: { attributes: [] },
              required: false
            }
          ],
          order: [['nome', 'ASC']]
        }),
        ParceiroCategoria.findAll({ where: { ativo: true }, order: [['nome', 'ASC']] })
      ]);
      const buffer = montarWorkbookParceiros(parceiros, categorias);
      return responderXlsx(res, buffer, 'pessoas-cadastradas.xlsx');
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao exportar pessoas', { status: 500 });
    }
  },

  async importarXlsx(req, res) {
    try {
      const file = req.file;
      if (!file?.buffer) {
        return res.status(400).json({ error: 'Envie uma planilha XLSX ou CSV.' });
      }

      const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

      const resultado = {
        importados: 0,
        atualizados: 0,
        ignorados: 0,
        categorias_criadas: [],
        erros: []
      };

      for (const [index, row] of rows.entries()) {
        const linha = index + 2;
        try {
          const payload = mapRowToPayload(row);
          if (!payload.cpf_cnpj && !payload.nome) {
            resultado.ignorados += 1;
            continue;
          }

          const { ids: categoriaIds, criadas } = await resolverCategoriaIds(payload.categorias);
          resultado.categorias_criadas.push(...criadas);
          const data = {
            ...payload,
            categoria_ids: categoriaIds
          };
          delete data.categorias;

          const existente = payload.cpf_cnpj
            ? await Parceiro.findOne({ where: { cpf_cnpj: payload.cpf_cnpj } })
            : null;

          if (existente) {
            await atualizarParceiro(existente.id, data);
            resultado.atualizados += 1;
          } else {
            await criarParceiro(data);
            resultado.importados += 1;
          }
        } catch (error) {
          resultado.erros.push({
            linha,
            erro: error.message || 'Erro ao importar linha.'
          });
        }
      }

      resultado.categorias_criadas = Array.from(new Set(resultado.categorias_criadas));
      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao importar pessoas', { status: 400 });
    }
  }
};
