const { Op, fn, col, literal } = require('sequelize');
const {
  ProvisaoFinanceira,
  ProvisaoCategoriaMacro,
  Obra,
  sequelize
} = require('../models');
const {
  resolverPermissoesProvisionamentoFinanceiro,
  usuarioPodeAtuarNaObra
} = require('../services/provisaoFinanceira/permissoes');

const STATUS_PROVISAO_FINANCEIRA = [
  'previsto',
  'em_analise',
  'aprovado',
  'cancelado',
  'realizado'
];

const STATUS_ABERTOS = ['previsto', 'em_analise', 'aprovado'];
const STATUS_PENDENTES = ['previsto', 'em_analise'];

function parsePositiveInt(valor, fallback = null) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) return fallback;
  return numero;
}

function normalizarTexto(valor) {
  const texto = String(valor || '').trim();
  return texto || null;
}

function serializarStatus(valor) {
  return String(valor || '').trim().toLowerCase();
}

function combineWhere(...conditions) {
  const filtros = conditions.filter((item) => item && Object.keys(item).length > 0);
  if (filtros.length === 0) return {};
  if (filtros.length === 1) return filtros[0];
  return { [Op.and]: filtros };
}

function formatDateOnly(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function parseDateOnly(valor) {
  const match = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addDays(date, amount) {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  base.setDate(base.getDate() + amount);
  return base;
}

function startOfWeek(date) {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  return base;
}

function formatarSemanaLabel(date) {
  const inicio = startOfWeek(date);
  const fim = addDays(inicio, 6);
  return `${String(inicio.getDate()).padStart(2, '0')}/${String(inicio.getMonth() + 1).padStart(2, '0')} - ${String(fim.getDate()).padStart(2, '0')}/${String(fim.getMonth() + 1).padStart(2, '0')}`;
}

async function obterPermissoes(req) {
  if (req.provisaoFinanceiraPermissoes) {
    return req.provisaoFinanceiraPermissoes;
  }

  const permissoes = await resolverPermissoesProvisionamentoFinanceiro(req.user);
  req.provisaoFinanceiraPermissoes = permissoes;
  return permissoes;
}

async function construirEscopoDashboard(req) {
  const permissoes = await obterPermissoes(req);
  const whereEscopo = {};
  const obraId = parsePositiveInt(req.query?.obra_id);
  const categoriaId = parsePositiveInt(req.query?.categoria_macro_id);
  const status = serializarStatus(req.query?.status);
  const prioridade = serializarStatus(req.query?.prioridade);
  const dataInicial = normalizarTexto(req.query?.data_inicial);
  const dataFinal = normalizarTexto(req.query?.data_final);

  const global = Boolean(permissoes?.superadmin || permissoes?.pode_dashboard_global);
  if (!global) {
    if (Array.isArray(permissoes?.obras_acesso) && permissoes.obras_acesso.length === 0) {
      return { permissoes, global, vazio: true, whereBase: {}, filtros: { obraId, categoriaId, status, prioridade, dataInicial, dataFinal } };
    }

    if (Array.isArray(permissoes?.obras_acesso)) {
      whereEscopo.obra_id = { [Op.in]: permissoes.obras_acesso };
    }
  }

  if (obraId) {
    if (!global && !usuarioPodeAtuarNaObra({ permissoes, obraId, acao: 'acessar' })) {
      return {
        permissoes,
        global,
        erro: {
          status: 403,
          body: { error: 'Acesso negado a esta obra no dashboard de provisionamento financeiro' }
        }
      };
    }
    whereEscopo.obra_id = obraId;
  }

  const whereFiltros = {};
  if (categoriaId) {
    whereFiltros.categoria_macro_id = categoriaId;
  }
  if (status) {
    if (!STATUS_PROVISAO_FINANCEIRA.includes(status)) {
      return {
        permissoes,
        global,
        erro: {
          status: 400,
          body: { error: 'Status invalido para o dashboard do provisionamento financeiro' }
        }
      };
    }
    whereFiltros.status = status;
  }
  if (prioridade) {
    whereFiltros.prioridade = prioridade;
  }
  if (dataInicial || dataFinal) {
    whereFiltros.data_prevista_desembolso = {};
    if (dataInicial) whereFiltros.data_prevista_desembolso[Op.gte] = dataInicial;
    if (dataFinal) whereFiltros.data_prevista_desembolso[Op.lte] = dataFinal;
  }

  return {
    permissoes,
    global,
    vazio: false,
    whereBase: combineWhere(whereEscopo, whereFiltros),
    filtros: { obraId, categoriaId, status, prioridade, dataInicial, dataFinal }
  };
}

async function mapearObras(ids = []) {
  if (!ids.length) return new Map();
  const obras = await Obra.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'codigo', 'nome'],
    order: [['nome', 'ASC']]
  });
  return new Map(obras.map((obra) => [Number(obra.id), {
    id: obra.id,
    codigo: obra.codigo,
    nome: obra.nome
  }]));
}

async function mapearCategorias(ids = []) {
  if (!ids.length) return new Map();
  const categorias = await ProvisaoCategoriaMacro.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'nome'],
    order: [['nome', 'ASC']]
  });
  return new Map(categorias.map((categoria) => [Number(categoria.id), {
    id: categoria.id,
    nome: categoria.nome
  }]));
}

function normalizarNumero(valor) {
  return Number(valor || 0);
}

module.exports = {
  async resumo(req, res) {
    try {
      const escopo = await construirEscopoDashboard(req);
      if (escopo?.erro) {
        return res.status(escopo.erro.status).json(escopo.erro.body);
      }

      if (escopo?.vazio) {
        return res.json({
          escopo: {
            global: escopo.global,
            obras_restritas: Array.isArray(escopo?.permissoes?.obras_acesso) ? escopo.permissoes.obras_acesso.length : null
          },
          periodo: {
            data_inicial: escopo.filtros.dataInicial,
            data_final: escopo.filtros.dataFinal
          },
          cards: {
            total_periodo: 0,
            total_proximos_7_dias: 0,
            total_proximos_30_dias: 0,
            quantidade_abertas: 0
          },
          graficos: {
            por_mes: [],
            por_obra: [],
            por_categoria: [],
            curva_semanal: [],
            pipeline_status: []
          },
          alertas: {
            vencidas_nao_tratadas: { quantidade: 0, itens: [] },
            itens_criticos_proximos: { quantidade: 0, itens: [] },
            obras_concentracao_alta: []
          }
        });
      }

      const hoje = parseDateOnly(formatDateOnly(new Date()));
      const hojeTexto = formatDateOnly(hoje);
      const mais7Texto = formatDateOnly(addDays(hoje, 7));
      const mais30Texto = formatDateOnly(addDays(hoje, 30));

      const whereAtivoPeriodo = combineWhere(
        escopo.whereBase,
        { status: { [Op.ne]: 'cancelado' } }
      );
      const whereAbertas = combineWhere(
        escopo.whereBase,
        { status: { [Op.in]: STATUS_ABERTOS } }
      );
      const where7Dias = combineWhere(
        escopo.whereBase,
        {
          status: { [Op.in]: STATUS_ABERTOS },
          data_prevista_desembolso: { [Op.gte]: hojeTexto, [Op.lte]: mais7Texto }
        }
      );
      const where30Dias = combineWhere(
        escopo.whereBase,
        {
          status: { [Op.in]: STATUS_ABERTOS },
          data_prevista_desembolso: { [Op.gte]: hojeTexto, [Op.lte]: mais30Texto }
        }
      );

      const exprMes = literal("DATE_FORMAT(data_prevista_desembolso, '%Y-%m')");

      const [
        totalPeriodo,
        totalProximos7Dias,
        totalProximos30Dias,
        quantidadeAbertas,
        pipelineStatusRaw,
        porMesRaw,
        porObraRaw,
        porCategoriaRaw,
        alertasVencidasRaw,
        alertasCriticosRaw,
        curvaSemanalRaw
      ] = await Promise.all([
        ProvisaoFinanceira.sum('valor_previsto', { where: whereAtivoPeriodo }),
        ProvisaoFinanceira.sum('valor_previsto', { where: where7Dias }),
        ProvisaoFinanceira.sum('valor_previsto', { where: where30Dias }),
        ProvisaoFinanceira.count({ where: whereAbertas }),
        ProvisaoFinanceira.findAll({
          where: escopo.whereBase,
          attributes: [
            'status',
            [fn('COUNT', col('id')), 'quantidade'],
            [fn('SUM', col('valor_previsto')), 'total_valor']
          ],
          group: ['status'],
          order: [['status', 'ASC']],
          raw: true
        }),
        ProvisaoFinanceira.findAll({
          where: whereAtivoPeriodo,
          attributes: [
            [exprMes, 'mes'],
            [fn('COUNT', col('id')), 'quantidade'],
            [fn('SUM', col('valor_previsto')), 'total_valor']
          ],
          group: [exprMes],
          order: [[exprMes, 'ASC']],
          raw: true
        }),
        ProvisaoFinanceira.findAll({
          where: whereAtivoPeriodo,
          attributes: [
            'obra_id',
            [fn('COUNT', col('id')), 'quantidade'],
            [fn('SUM', col('valor_previsto')), 'total_valor']
          ],
          group: ['obra_id'],
          order: [[literal('total_valor'), 'DESC']],
          limit: 10,
          raw: true
        }),
        ProvisaoFinanceira.findAll({
          where: whereAtivoPeriodo,
          attributes: [
            'categoria_macro_id',
            [fn('COUNT', col('id')), 'quantidade'],
            [fn('SUM', col('valor_previsto')), 'total_valor']
          ],
          group: ['categoria_macro_id'],
          order: [[literal('total_valor'), 'DESC']],
          limit: 10,
          raw: true
        }),
        ProvisaoFinanceira.findAll({
          where: combineWhere(
            escopo.whereBase,
            {
              status: { [Op.in]: STATUS_PENDENTES },
              data_prevista_desembolso: { [Op.lt]: hojeTexto }
            }
          ),
          include: [
            {
              model: Obra,
              as: 'obra',
              attributes: ['id', 'codigo', 'nome']
            }
          ],
          attributes: ['id', 'codigo', 'data_prevista_desembolso', 'valor_previsto', 'status', 'prioridade', 'obra_id'],
          order: [['data_prevista_desembolso', 'ASC']],
          limit: 10
        }),
        ProvisaoFinanceira.findAll({
          where: combineWhere(
            escopo.whereBase,
            {
              prioridade: 'critica',
              status: { [Op.in]: STATUS_ABERTOS },
              data_prevista_desembolso: { [Op.gte]: hojeTexto, [Op.lte]: mais7Texto }
            }
          ),
          include: [
            {
              model: Obra,
              as: 'obra',
              attributes: ['id', 'codigo', 'nome']
            }
          ],
          attributes: ['id', 'codigo', 'data_prevista_desembolso', 'valor_previsto', 'status', 'prioridade', 'obra_id'],
          order: [['data_prevista_desembolso', 'ASC']],
          limit: 10
        }),
        ProvisaoFinanceira.findAll({
          where: whereAtivoPeriodo,
          attributes: ['data_prevista_desembolso', 'valor_previsto'],
          raw: true
        })
      ]);

      const obrasMap = await mapearObras(
        porObraRaw.map((item) => parsePositiveInt(item?.obra_id)).filter(Boolean)
      );
      const categoriasMap = await mapearCategorias(
        porCategoriaRaw.map((item) => parsePositiveInt(item?.categoria_macro_id)).filter(Boolean)
      );

      const porObra = porObraRaw.map((item) => {
        const obraId = parsePositiveInt(item?.obra_id);
        const obra = obrasMap.get(obraId);
        return {
          obra_id: obraId,
          obra,
          quantidade: normalizarNumero(item?.quantidade),
          total_valor: normalizarNumero(item?.total_valor)
        };
      });

      const porCategoria = porCategoriaRaw.map((item) => {
        const categoriaId = parsePositiveInt(item?.categoria_macro_id);
        const categoria = categoriasMap.get(categoriaId);
        return {
          categoria_macro_id: categoriaId,
          categoria,
          quantidade: normalizarNumero(item?.quantidade),
          total_valor: normalizarNumero(item?.total_valor)
        };
      });

      const totalAtivoReferencia = normalizarNumero(totalPeriodo);
      const obrasConcentracaoAlta = porObra
        .filter((item) => totalAtivoReferencia > 0)
        .map((item) => ({
          ...item,
          percentual: Number(((item.total_valor / totalAtivoReferencia) * 100).toFixed(2))
        }))
        .filter((item) => item.percentual >= 35)
        .sort((a, b) => b.percentual - a.percentual)
        .slice(0, 5);

      const curvaSemanalMap = new Map();
      curvaSemanalRaw.forEach((item) => {
        const data = parseDateOnly(item?.data_prevista_desembolso);
        if (!data) return;
        const semana = startOfWeek(data);
        const chave = formatDateOnly(semana);
        const atual = curvaSemanalMap.get(chave) || {
          semana_inicio: chave,
          semana_label: formatarSemanaLabel(semana),
          total_valor: 0,
          quantidade: 0
        };
        atual.total_valor += normalizarNumero(item?.valor_previsto);
        atual.quantidade += 1;
        curvaSemanalMap.set(chave, atual);
      });

      const curvaSemanal = Array.from(curvaSemanalMap.values())
        .sort((a, b) => String(a.semana_inicio).localeCompare(String(b.semana_inicio)));

      return res.json({
        escopo: {
          global: escopo.global,
          obras_restritas: escopo.global ? null : Array.isArray(escopo?.permissoes?.obras_acesso) ? escopo.permissoes.obras_acesso.length : null
        },
        periodo: {
          data_inicial: escopo.filtros.dataInicial,
          data_final: escopo.filtros.dataFinal
        },
        cards: {
          total_periodo: normalizarNumero(totalPeriodo),
          total_proximos_7_dias: normalizarNumero(totalProximos7Dias),
          total_proximos_30_dias: normalizarNumero(totalProximos30Dias),
          quantidade_abertas: normalizarNumero(quantidadeAbertas)
        },
        graficos: {
          por_mes: porMesRaw.map((item) => ({
            mes: item?.mes,
            quantidade: normalizarNumero(item?.quantidade),
            total_valor: normalizarNumero(item?.total_valor)
          })),
          por_obra: porObra,
          por_categoria: porCategoria,
          curva_semanal: curvaSemanal,
          pipeline_status: pipelineStatusRaw.map((item) => ({
            status: item?.status,
            quantidade: normalizarNumero(item?.quantidade),
            total_valor: normalizarNumero(item?.total_valor)
          }))
        },
        alertas: {
          vencidas_nao_tratadas: {
            quantidade: alertasVencidasRaw.length,
            itens: alertasVencidasRaw.map((item) => ({
              id: item.id,
              codigo: item.codigo,
              data_prevista_desembolso: item.data_prevista_desembolso,
              valor_previsto: normalizarNumero(item.valor_previsto),
              status: item.status,
              prioridade: item.prioridade,
              obra: item.obra ? {
                id: item.obra.id,
                codigo: item.obra.codigo,
                nome: item.obra.nome
              } : null
            }))
          },
          itens_criticos_proximos: {
            quantidade: alertasCriticosRaw.length,
            itens: alertasCriticosRaw.map((item) => ({
              id: item.id,
              codigo: item.codigo,
              data_prevista_desembolso: item.data_prevista_desembolso,
              valor_previsto: normalizarNumero(item.valor_previsto),
              status: item.status,
              prioridade: item.prioridade,
              obra: item.obra ? {
                id: item.obra.id,
                codigo: item.obra.codigo,
                nome: item.obra.nome
              } : null
            }))
          },
          obras_concentracao_alta: obrasConcentracaoAlta
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao carregar dashboard do provisionamento financeiro'
      });
    }
  }
};
