const { Op } = require('sequelize');
const { ConfiguracaoSistema, User, Setor, TipoSolicitacao } = require('../models');
const {
  CHAVE_DIRETORIA_POR_CLASSIFICACAO_OBRA,
  CHAVE_SETOR_DESTINO_APOS_APROVACAO_DIRETORIA,
  normalizarMapaDiretoriasPorClassificacao,
  normalizarMapaSetorDestinoAprovacao
} = require('../services/aprovacaoDiretoriaConfig');
const {
  CHAVE_TIPOS_COMPARTILHADOS_ENTRE_SETORES,
  CHAVE_AUTOMACAO_STATUS_SETOR,
  normalizarTiposCompartilhados,
  normalizarAutomacoesStatus
} = require('../services/solicitacao/configuracoesVisibilidadeAutomacao');
const {
  obterConfiguracaoSetoresSemAlteracaoStatus,
  salvarConfiguracaoSetoresSemAlteracaoStatus,
  obterTokensSetoresSemAlteracaoStatus
} = require('../services/solicitacao/setoresSemAlteracaoStatus');
const {
  obterConfiguracaoSetoresAlteracaoStatusLivre,
  salvarConfiguracaoSetoresAlteracaoStatusLivre,
  obterTokensSetoresAlteracaoStatusLivre
} = require('../services/solicitacao/setoresAlteracaoStatusLivre');
const {
  obterUsuariosAcessoPrioridadeDiretoria,
  salvarUsuariosAcessoPrioridadeDiretoria,
  normalizarUsuarioIds
} = require('../services/prioridadeDiretoriaAcesso');
const {
  obterConfiguracaoUsuariosAlterarValorSolicitacao,
  salvarUsuariosAlterarValorSolicitacao,
  usuarioPodeAlterarValorSolicitacao
} = require('../services/solicitacao/permissaoAlterarValor');
const {
  obterConfiguracaoUsuariosListarTodasSolicitacoes,
  salvarUsuariosListarTodasSolicitacoes,
  usuarioPodeListarTodasSolicitacoes
} = require('../services/solicitacao/permissaoListarTodas');

const CHAVE_TEMA = 'TEMA_SISTEMA';
const CHAVE_AREAS_OBRA = 'AREAS_OBRA_VISIVEIS';
const CHAVE_AREAS_POR_SETOR_ORIGEM = 'AREAS_POR_SETOR_ORIGEM';
const CHAVE_SETORES_VISIVEIS_POR_USUARIO = 'SETORES_VISIVEIS_POR_USUARIO';
const CHAVE_TIMEOUT_INATIVIDADE = 'TIMEOUT_INATIVIDADE_MINUTOS';
const CHAVE_TIPOS_SOLICITACAO_POR_SETOR = 'TIPOS_SOLICITACAO_POR_SETOR';
const CHAVE_SETORES_CRIACAO_TODAS_OBRAS = 'SETORES_CRIACAO_TODAS_OBRAS';
const TIMEOUT_INATIVIDADE_PADRAO_MINUTOS = 20;

function parseJsonOrDefault(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getTemaPadrao() {
  return {
    palette: {
      bg: '#f5f7fb',
      surface: '#ffffff',
      border: '#e3e7ef',
      text: '#0f172a',
      muted: '#64748b',
      primary: '#2563eb',
      primary600: '#1d4ed8',
      secondary: '#0f766e',
      warning: '#d97706',
      danger: '#dc2626',
      success: '#16a34a'
    },
    actions: {
      ver: '#2563eb',
      assumir: '#16a34a',
      atribuir: '#7c3aed',
      enviar: '#f97316',
      ocultar: '#6b7280'
    },
    status: {
      global: {
        PENDENTE: '#64748b',
        EM_ANALISE: '#0ea5e9',
        AGUARDANDO_AJUSTE: '#f59e0b',
        APROVADA: '#16a34a',
        REJEITADA: '#dc2626',
        CONCLUIDA: '#059669'
      },
      setores: {}
    }
  };
}

function normalizarListaSetores(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(
    lista
      .map(item => String(item || '').trim().toUpperCase())
      .filter(Boolean)
  )];
}

function normalizarTokenSetorConfiguracao(valor) {
  return String(valor || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isSetorGeoConfiguracao(valor) {
  return [
    'GEO',
    'GERENCIA_DE_PROCESSOS',
    'GERENCIA_PROCESSOS',
    'GERENCIAS_DE_PROCESSOS',
    'GERENCIAS_PROCESSOS'
  ].includes(normalizarTokenSetorConfiguracao(valor));
}

function normalizarIdList(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(
    lista
      .map(item => Number(item))
      .filter(item => Number.isInteger(item) && item > 0)
  )];
}

function isSetorObra(setor) {
  const codigo = String(setor?.codigo || '').trim().toUpperCase();
  const nome = String(setor?.nome || '').trim().toUpperCase();
  return codigo === 'OBRA' || nome === 'OBRA';
}

async function salvarConfiguracaoJson(chave, payload) {
  const existente = await ConfiguracaoSistema.findOne({
    where: { chave },
    order: [['id', 'DESC']]
  });

  const valor = JSON.stringify(payload);
  if (existente) {
    await existente.update({ valor });
  } else {
    await ConfiguracaoSistema.create({ chave, valor });
  }
}

module.exports = {
  async getTimeoutInatividade(req, res) {
    try {
      const item = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_TIMEOUT_INATIVIDADE },
        order: [['id', 'DESC']]
      });

      const minutos = Number(item?.valor);
      if (Number.isNaN(minutos) || minutos <= 0) {
        return res.json({ minutos: TIMEOUT_INATIVIDADE_PADRAO_MINUTOS });
      }

      return res.json({ minutos });
    } catch (error) {
      console.error(error);
      return res.json({ minutos: TIMEOUT_INATIVIDADE_PADRAO_MINUTOS });
    }
  },

  async updateTimeoutInatividade(req, res) {
    try {
      const minutos = Number(req.body?.minutos);
      if (Number.isNaN(minutos) || minutos < 1 || minutos > 480) {
        return res.status(400).json({ error: 'Informe um tempo entre 1 e 480 minutos.' });
      }

      const valor = String(Math.floor(minutos));
      const existente = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_TIMEOUT_INATIVIDADE },
        order: [['id', 'DESC']]
      });

      if (existente) {
        await existente.update({ valor });
      } else {
        await ConfiguracaoSistema.create({
          chave: CHAVE_TIMEOUT_INATIVIDADE,
          valor
        });
      }

      return res.json({ ok: true, minutos: Number(valor) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar timeout de inatividade' });
    }
  },

  async getTema(req, res) {
    try {
      const item = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_TEMA },
        order: [['id', 'DESC']]
      });
      if (!item || !item.valor) {
        return res.json(getTemaPadrao());
      }
      try {
        return res.json(JSON.parse(item.valor));
      } catch {
        return res.json(getTemaPadrao());
      }
    } catch (error) {
      console.error(error);
      return res.json(getTemaPadrao());
    }
  },

  async updateTema(req, res) {
    try {
      const tema = req.body || {};
      const valor = JSON.stringify(tema);

      const existente = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_TEMA },
        order: [['id', 'DESC']]
      });

      if (existente) {
        await existente.update({ valor });
      } else {
        await ConfiguracaoSistema.create({
          chave: CHAVE_TEMA,
          valor
        });
      }

      return res.json({ ok: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de tema' });
    }
  }
  ,

  async getAreasObra(req, res) {
    try {
      const item = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_AREAS_OBRA },
        order: [['id', 'DESC']]
      });

      if (!item || !item.valor) {
        return res.json({ areas: [] });
      }

      const data = parseJsonOrDefault(item.valor, { areas: [] });
      const areas = Array.isArray(data?.areas) ? data.areas : [];
      return res.json({ areas });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de areas' });
    }
  },

  async updateAreasObra(req, res) {
    try {
      const raw = Array.isArray(req.body?.areas) ? req.body.areas : [];
      const areas = [...new Set(raw
        .map(item => String(item || '').trim().toUpperCase())
        .filter(Boolean)
      )];

      const existente = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_AREAS_OBRA },
        order: [['id', 'DESC']]
      });

      if (existente) {
        await existente.update({ valor: JSON.stringify({ areas }) });
      } else {
        await ConfiguracaoSistema.create({
          chave: CHAVE_AREAS_OBRA,
          valor: JSON.stringify({ areas })
        });
      }

      return res.json({ ok: true, areas });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de areas' });
    }
  }
  ,

  async getAprovacaoDiretoria(req, res) {
    try {
      const [itemDiretorias, itemDestinos] = await Promise.all([
        ConfiguracaoSistema.findOne({
          where: { chave: CHAVE_DIRETORIA_POR_CLASSIFICACAO_OBRA },
          order: [['id', 'DESC']]
        }),
        ConfiguracaoSistema.findOne({
          where: { chave: CHAVE_SETOR_DESTINO_APOS_APROVACAO_DIRETORIA },
          order: [['id', 'DESC']]
        })
      ]);

      const diretorias = normalizarMapaDiretoriasPorClassificacao(
        parseJsonOrDefault(itemDiretorias?.valor, { diretorias: {} })?.diretorias
      );
      const destinos = normalizarMapaSetorDestinoAprovacao(
        parseJsonOrDefault(itemDestinos?.valor, { destinos: {} })?.destinos
      );

      return res.json({
        diretorias_por_classificacao: diretorias,
        setores_destino_por_tipo: destinos
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de aprovacao por diretoria' });
    }
  },

  async updateAprovacaoDiretoria(req, res) {
    try {
      const diretorias = normalizarMapaDiretoriasPorClassificacao(
        req.body?.diretorias_por_classificacao
      );
      const destinos = normalizarMapaSetorDestinoAprovacao(
        req.body?.setores_destino_por_tipo
      );

      const [setores, tipos] = await Promise.all([
        Setor.findAll({
          attributes: ['id', 'codigo', 'nome']
        }),
        TipoSolicitacao.findAll({
          attributes: ['id']
        })
      ]);

      const tokensSetorValidos = new Set(
        setores.flatMap(setor => [
          String(setor.id || '').trim().toUpperCase(),
          String(setor.codigo || '').trim().toUpperCase(),
          String(setor.nome || '').trim().toUpperCase()
        ]).filter(Boolean)
      );
      const tiposValidos = new Set(tipos.map(tipo => String(tipo.id)));

      const diretoriasInvalidas = Object.entries(diretorias)
        .filter(([, setor]) => !tokensSetorValidos.has(String(setor || '').trim().toUpperCase()))
        .map(([classificacao]) => classificacao);
      if (diretoriasInvalidas.length > 0) {
        return res.status(400).json({
          error: 'Uma ou mais diretorias configuradas sao invalidas.',
          classificacoes_invalidas: diretoriasInvalidas
        });
      }

      const destinosInvalidos = Object.entries(destinos)
        .filter(([tipoId, setor]) => (
          !tiposValidos.has(String(tipoId)) ||
          !tokensSetorValidos.has(String(setor || '').trim().toUpperCase())
        ))
        .map(([tipoId]) => String(tipoId));
      if (destinosInvalidos.length > 0) {
        return res.status(400).json({
          error: 'Um ou mais destinos de aprovacao sao invalidos.',
          tipos_invalidos: destinosInvalidos
        });
      }

      await Promise.all([
        salvarConfiguracaoJson(CHAVE_DIRETORIA_POR_CLASSIFICACAO_OBRA, {
          diretorias
        }),
        salvarConfiguracaoJson(CHAVE_SETOR_DESTINO_APOS_APROVACAO_DIRETORIA, {
          destinos
        })
      ]);

      return res.json({
        ok: true,
        diretorias_por_classificacao: diretorias,
        setores_destino_por_tipo: destinos
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de aprovacao por diretoria' });
    }
  },

  async getAreasPorSetorOrigem(req, res) {
    try {
      const item = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_AREAS_POR_SETOR_ORIGEM },
        order: [['id', 'DESC']]
      });

      if (!item || !item.valor) {
        return res.json({ regras: {} });
      }

      const data = parseJsonOrDefault(item.valor, { regras: {} });
      const regras = data?.regras && typeof data.regras === 'object' ? data.regras : {};
      return res.json({ regras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de areas por setor' });
    }
  },

  async updateAreasPorSetorOrigem(req, res) {
    try {
      const input = req.body?.regras && typeof req.body.regras === 'object'
        ? req.body.regras
        : {};

      const regras = {};
      Object.entries(input).forEach(([origem, destinos]) => {
        const key = String(origem || '').trim().toUpperCase();
        if (!key) return;
        regras[key] = normalizarListaSetores(destinos);
      });

      const existente = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_AREAS_POR_SETOR_ORIGEM },
        order: [['id', 'DESC']]
      });

      const valor = JSON.stringify({ regras });
      if (existente) {
        await existente.update({ valor });
      } else {
        await ConfiguracaoSistema.create({
          chave: CHAVE_AREAS_POR_SETOR_ORIGEM,
          valor
        });
      }

      return res.json({ ok: true, regras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de areas por setor' });
    }
  },

  async getSetoresVisiveisPorUsuario(req, res) {
    try {
      const item = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_SETORES_VISIVEIS_POR_USUARIO },
        order: [['id', 'DESC']]
      });

      if (!item || !item.valor) {
        return res.json({ regras: {} });
      }

      const data = parseJsonOrDefault(item.valor, { regras: {} });
      const regras = data?.regras && typeof data.regras === 'object' ? data.regras : {};
      return res.json({ regras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de visibilidade por usuario' });
    }
  },

  async updateSetoresVisiveisPorUsuario(req, res) {
    try {
      const input = req.body?.regras && typeof req.body.regras === 'object'
        ? req.body.regras
        : {};

      const regras = {};
      Object.entries(input).forEach(([usuarioId, setores]) => {
        const key = String(usuarioId || '').trim();
        if (!key) return;
        regras[key] = normalizarListaSetores(setores);
      });

      const existente = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_SETORES_VISIVEIS_POR_USUARIO },
        order: [['id', 'DESC']]
      });

      const valor = JSON.stringify({ regras });
      if (existente) {
        await existente.update({ valor });
      } else {
        await ConfiguracaoSistema.create({
          chave: CHAVE_SETORES_VISIVEIS_POR_USUARIO,
          valor
        });
      }

      return res.json({ ok: true, regras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de visibilidade por usuario' });
    }
  },

  async getTiposSolicitacaoPorSetor(req, res) {
    try {
      const item = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_TIPOS_SOLICITACAO_POR_SETOR },
        order: [['id', 'DESC']]
      });

      if (!item || !item.valor) {
        return res.json({ regras: {} });
      }

      const data = parseJsonOrDefault(item.valor, { regras: {} });
      const raw = data?.regras && typeof data.regras === 'object' ? data.regras : {};
      const regras = {};

      Object.entries(raw).forEach(([setor, config]) => {
        const key = String(setor || '').trim().toUpperCase();
        if (!key) return;

        const tipos = normalizarIdList(config?.tipos);
        const modosRaw = config?.modos && typeof config.modos === 'object' ? config.modos : {};
        const modos = {};

        Object.entries(modosRaw).forEach(([tipoId, modo]) => {
          const id = Number(tipoId);
          if (!Number.isInteger(id) || id <= 0) return;
          const modoNorm = String(modo || '').trim().toUpperCase();
          modos[String(id)] = modoNorm === 'ADMIN_PRIMEIRO' ? 'ADMIN_PRIMEIRO' : 'TODOS_VISIVEIS';
        });

        regras[key] = { tipos, modos };
      });

      return res.json({ regras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de tipos por setor' });
    }
  },

  async updateTiposSolicitacaoPorSetor(req, res) {
    try {
      const input = req.body?.regras && typeof req.body.regras === 'object'
        ? req.body.regras
        : {};

      const regras = {};
      Object.entries(input).forEach(([setor, config]) => {
        const key = String(setor || '').trim().toUpperCase();
        if (!key) return;

        const tipos = normalizarIdList(config?.tipos);
        const modosRaw = config?.modos && typeof config.modos === 'object' ? config.modos : {};
        const modos = {};

        tipos.forEach(tipoId => {
          const modoNorm = String(modosRaw?.[tipoId] || '').trim().toUpperCase();
          modos[String(tipoId)] = modoNorm === 'ADMIN_PRIMEIRO' ? 'ADMIN_PRIMEIRO' : 'TODOS_VISIVEIS';
        });

        regras[key] = { tipos, modos };
      });

      const existente = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_TIPOS_SOLICITACAO_POR_SETOR },
        order: [['id', 'DESC']]
      });

      const valor = JSON.stringify({ regras });
      if (existente) {
        await existente.update({ valor });
      } else {
        await ConfiguracaoSistema.create({ chave: CHAVE_TIPOS_SOLICITACAO_POR_SETOR, valor });
      }

      return res.json({ ok: true, regras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de tipos por setor' });
    }
  },

  async getTiposCompartilhadosEntreSetores(req, res) {
    try {
      const item = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_TIPOS_COMPARTILHADOS_ENTRE_SETORES },
        order: [['id', 'DESC']]
      });

      const data = parseJsonOrDefault(item?.valor, { regras: {} });
      const regras = normalizarTiposCompartilhados(data?.regras);
      return res.json({ regras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de tipos compartilhados' });
    }
  },

  async updateTiposCompartilhadosEntreSetores(req, res) {
    try {
      const regras = normalizarTiposCompartilhados(req.body?.regras);

      const [setores, tipos] = await Promise.all([
        Setor.findAll({
          attributes: ['id', 'codigo', 'nome']
        }),
        TipoSolicitacao.findAll({
          attributes: ['id']
        })
      ]);

      const tokensSetorValidos = new Set(
        setores.flatMap(setor => [
          String(setor.id || '').trim().toUpperCase(),
          String(setor.codigo || '').trim().toUpperCase(),
          String(setor.nome || '').trim().toUpperCase()
        ]).filter(Boolean)
      );
      const tiposValidos = new Set(tipos.map(tipo => String(tipo.id)));

      const regrasInvalidas = [];

      Object.entries(regras).forEach(([setorOrigem, tiposCompartilhados]) => {
        const setorOrigemValido = tokensSetorValidos.has(String(setorOrigem || '').trim().toUpperCase());
        if (!setorOrigemValido) {
          regrasInvalidas.push({ setor_origem: setorOrigem });
          return;
        }

        Object.entries(tiposCompartilhados || {}).forEach(([tipoId, setoresCompartilhados]) => {
          const tipoValido = tiposValidos.has(String(tipoId));
          const setoresValidos = Array.isArray(setoresCompartilhados)
            ? setoresCompartilhados.every(setor =>
                tokensSetorValidos.has(String(setor || '').trim().toUpperCase())
              )
            : false;

          if (!tipoValido || !setoresValidos) {
            regrasInvalidas.push({
              setor_origem: setorOrigem,
              tipo_solicitacao_id: String(tipoId)
            });
          }
        });
      });

      if (regrasInvalidas.length > 0) {
        return res.status(400).json({
          error: 'Uma ou mais regras de tipos compartilhados sao invalidas.',
          regras_invalidas: regrasInvalidas
        });
      }

      await salvarConfiguracaoJson(CHAVE_TIPOS_COMPARTILHADOS_ENTRE_SETORES, {
        regras
      });

      return res.json({ ok: true, regras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de tipos compartilhados' });
    }
  },

  async getAutomacaoStatusSetor(req, res) {
    try {
      const item = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_AUTOMACAO_STATUS_SETOR },
        order: [['id', 'DESC']]
      });

      const data = parseJsonOrDefault(item?.valor, { regras: [] });
      const regras = normalizarAutomacoesStatus(data?.regras);
      return res.json({ regras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de automacao por status' });
    }
  },

  async updateAutomacaoStatusSetor(req, res) {
    try {
      const regras = normalizarAutomacoesStatus(req.body?.regras);

      const [setores, tipos] = await Promise.all([
        Setor.findAll({
          attributes: ['id', 'codigo', 'nome']
        }),
        TipoSolicitacao.findAll({
          attributes: ['id']
        })
      ]);

      const tokensSetorValidos = new Set(
        setores.flatMap(setor => [
          String(setor.id || '').trim().toUpperCase(),
          String(setor.codigo || '').trim().toUpperCase(),
          String(setor.nome || '').trim().toUpperCase()
        ]).filter(Boolean)
      );
      const tiposValidos = new Set(tipos.map(tipo => String(tipo.id)));

      const regrasInvalidas = regras.filter((regra) => (
        !tiposValidos.has(String(regra.tipo_solicitacao_id)) ||
        (
          regra.setor_origem &&
          !tokensSetorValidos.has(String(regra.setor_origem || '').trim().toUpperCase())
        ) ||
        !tokensSetorValidos.has(String(regra.setor_destino || '').trim().toUpperCase())
      ));

      if (regrasInvalidas.length > 0) {
        return res.status(400).json({
          error: 'Uma ou mais automacoes sao invalidas.',
          regras_invalidas: regrasInvalidas
        });
      }

      await salvarConfiguracaoJson(CHAVE_AUTOMACAO_STATUS_SETOR, {
        regras
      });

      return res.json({ ok: true, regras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de automacao por status' });
    }
  },

  async getSetoresCriacaoTodasObras(req, res) {
    try {
      const item = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_SETORES_CRIACAO_TODAS_OBRAS },
        order: [['id', 'DESC']]
      });

      if (!item || !item.valor) {
        return res.json({ setores: [] });
      }

      const data = parseJsonOrDefault(item.valor, { setores: [] });
      const setores = normalizarListaSetores(data?.setores);
      return res.json({ setores });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de setores para criacao em todas as obras' });
    }
  },

  async updateSetoresCriacaoTodasObras(req, res) {
    try {
      const setores = normalizarListaSetores(req.body?.setores);

      const existente = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE_SETORES_CRIACAO_TODAS_OBRAS },
        order: [['id', 'DESC']]
      });

      const valor = JSON.stringify({ setores });
      if (existente) {
        await existente.update({ valor });
      } else {
        await ConfiguracaoSistema.create({
          chave: CHAVE_SETORES_CRIACAO_TODAS_OBRAS,
          valor
        });
      }

      return res.json({ ok: true, setores });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de setores para criacao em todas as obras' });
    }
  },

  async getSetoresSemAlteracaoStatus(req, res) {
    try {
      const configuracao = await obterConfiguracaoSetoresSemAlteracaoStatus();
      const tokens = await obterTokensSetoresSemAlteracaoStatus();
      return res.json({
        setores: configuracao.setores,
        tokens
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de setores sem alteracao de status' });
    }
  },

  async updateSetoresSemAlteracaoStatus(req, res) {
    try {
      const configuracao = await salvarConfiguracaoSetoresSemAlteracaoStatus(req.body?.setores);
      const tokens = await obterTokensSetoresSemAlteracaoStatus();
      return res.json({
        ok: true,
        setores: configuracao.setores,
        tokens
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de setores sem alteracao de status' });
    }
  },

  async getSetoresAlteracaoStatusLivre(req, res) {
    try {
      const configuracao = await obterConfiguracaoSetoresAlteracaoStatusLivre();
      const tokens = await obterTokensSetoresAlteracaoStatusLivre();
      return res.json({
        setores: configuracao.setores,
        tokens
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de setores com alteracao livre de status' });
    }
  },

  async updateSetoresAlteracaoStatusLivre(req, res) {
    try {
      const configuracao = await salvarConfiguracaoSetoresAlteracaoStatusLivre(req.body?.setores);
      const tokens = await obterTokensSetoresAlteracaoStatusLivre();
      return res.json({
        ok: true,
        setores: configuracao.setores,
        tokens
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de setores com alteracao livre de status' });
    }
  },

  async getUsuariosAcessoPrioridadeDiretoria(req, res) {
    try {
      const configuracao = await obterUsuariosAcessoPrioridadeDiretoria();
      const selecionados = new Set(configuracao.usuario_ids.map((id) => Number(id)));

      const usuariosRaw = await User.findAll({
        where: {
          perfil: { [Op.ne]: 'SUPERADMIN' }
        },
        attributes: ['id', 'nome', 'email', 'perfil', 'ativo', 'setor_id'],
        include: [
          {
            model: Setor,
            as: 'setor',
            attributes: ['id', 'nome', 'codigo']
          }
        ],
        order: [['nome', 'ASC']]
      });

      const usuarios = usuariosRaw.map((usuario) => {
        const plain = typeof usuario.toJSON === 'function' ? usuario.toJSON() : usuario;
        return {
          ...plain,
          acesso_prioridade_diretoria: selecionados.has(Number(plain.id))
        };
      });

      return res.json({
        usuario_ids: configuracao.usuario_ids,
        usuarios
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar usuarios com acesso a prioridade diretoria' });
    }
  },

  async updateUsuariosAcessoPrioridadeDiretoria(req, res) {
    try {
      const usuarioIds = normalizarUsuarioIds(req.body?.usuario_ids);

      const usuariosValidos = await User.findAll({
        where: {
          id: { [Op.in]: usuarioIds },
          ativo: true
        },
        attributes: ['id']
      });
      const idsValidos = usuariosValidos.map((usuario) => Number(usuario.id));
      const configuracao = await salvarUsuariosAcessoPrioridadeDiretoria(idsValidos);

      return res.json({
        ok: true,
        usuario_ids: configuracao.usuario_ids
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar usuarios com acesso a prioridade diretoria' });
    }
  },

  async getUsuariosEnvioQualquerSetor(req, res) {
    try {
      const usuariosRaw = await User.findAll({
        where: {
          perfil: { [Op.ne]: 'SUPERADMIN' }
        },
        attributes: [
          'id',
          'nome',
          'email',
          'perfil',
          'ativo',
          'setor_id',
          'pode_enviar_qualquer_setor'
        ],
        include: [
          {
            model: Setor,
            as: 'setor',
            attributes: ['id', 'nome', 'codigo']
          }
        ],
        order: [
          ['ativo', 'DESC'],
          ['nome', 'ASC']
        ]
      });

      const usuarios = usuariosRaw.filter(usuario => !isSetorObra(usuario?.setor));

      return res.json({ usuarios });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar usuarios com permissao especial de envio' });
    }
  },

  async updateUsuariosEnvioQualquerSetor(req, res) {
    const transaction = await User.sequelize.transaction();

    try {
      const usuarioIds = normalizarIdList(req.body?.usuario_ids);

      if (usuarioIds.length > 0) {
        const usuariosValidos = await User.findAll({
          where: {
            id: { [Op.in]: usuarioIds },
            perfil: { [Op.ne]: 'SUPERADMIN' }
          },
          attributes: ['id'],
          include: [
            {
              model: Setor,
              as: 'setor',
              attributes: ['id', 'nome', 'codigo']
            }
          ],
          transaction
        });

        const idsValidos = new Set(
          usuariosValidos
            .filter(usuario => !isSetorObra(usuario?.setor))
            .map(usuario => Number(usuario.id))
        );
        const idsInvalidos = usuarioIds.filter(id => !idsValidos.has(id));
        if (idsInvalidos.length > 0) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'Um ou mais usuarios informados sao invalidos para esta permissao.',
            usuario_ids_invalidos: idsInvalidos
          });
        }
      }

      await User.update(
        { pode_enviar_qualquer_setor: false },
        {
          where: {
            perfil: { [Op.ne]: 'SUPERADMIN' }
          },
          transaction
        }
      );

      if (usuarioIds.length > 0) {
        await User.update(
          { pode_enviar_qualquer_setor: true },
          {
            where: {
              id: { [Op.in]: usuarioIds },
              perfil: { [Op.ne]: 'SUPERADMIN' }
            },
            transaction
          }
        );
      }

      await transaction.commit();
      return res.json({ ok: true, usuario_ids: usuarioIds });
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar permissao especial de envio' });
    }
  },

  async getUsuariosAlterarValorSolicitacao(req, res) {
    try {
      const configuracao = await obterConfiguracaoUsuariosAlterarValorSolicitacao();
      const selecionados = new Set(configuracao.usuario_ids.map((id) => Number(id)));

      const usuariosRaw = await User.findAll({
        attributes: [
          'id',
          'nome',
          'email',
          'perfil',
          'ativo',
          'setor_id'
        ],
        include: [
          {
            model: Setor,
            as: 'setor',
            attributes: ['id', 'nome', 'codigo']
          }
        ],
        order: [
          ['ativo', 'DESC'],
          ['nome', 'ASC']
        ]
      });

      const usuarios = usuariosRaw.map((usuario) => {
        const plain = usuario.toJSON();
        const perfil = String(plain.perfil || '').toUpperCase();
        const permissaoPadrao = perfil === 'SUPERADMIN' ||
          (perfil.startsWith('ADMIN') && [
            plain?.setor?.codigo,
            plain?.setor?.nome
          ].some(isSetorGeoConfiguracao));

        return {
          ...plain,
          pode_alterar_valor_solicitacao: permissaoPadrao || selecionados.has(Number(plain.id)),
          permissao_padrao_alterar_valor_solicitacao: permissaoPadrao
        };
      });

      return res.json({
        usuario_ids: configuracao.usuario_ids,
        usuarios
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar usuarios com permissao para alterar valor' });
    }
  },

  async updateUsuariosAlterarValorSolicitacao(req, res) {
    try {
      const usuarioIds = normalizarUsuarioIds(req.body?.usuario_ids);

      if (usuarioIds.length > 0) {
        const usuariosValidos = await User.findAll({
          where: {
            id: { [Op.in]: usuarioIds },
            ativo: true
          },
          attributes: ['id']
        });
        const idsValidos = usuariosValidos.map((usuario) => Number(usuario.id));
        const idsValidosSet = new Set(idsValidos);
        const idsInvalidos = usuarioIds.filter(id => !idsValidosSet.has(id));

        if (idsInvalidos.length > 0) {
          return res.status(400).json({
            error: 'Um ou mais usuarios informados sao invalidos para esta permissao.',
            usuario_ids_invalidos: idsInvalidos
          });
        }
      }

      const configuracao = await salvarUsuariosAlterarValorSolicitacao(usuarioIds);
      return res.json(configuracao);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar usuarios com permissao para alterar valor' });
    }
  },

  async getMinhaPermissaoAlterarValorSolicitacao(req, res) {
    try {
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      const isGeo = [
        req.user?.area,
        req.user?.setor?.codigo,
        req.user?.setor?.nome,
        ...(Array.isArray(req.user?.setores) ? req.user.setores : [])
      ].some(isSetorGeoConfiguracao);
      const permissaoConfigurada = await usuarioPodeAlterarValorSolicitacao(req.user?.id);

      return res.json({
        pode_alterar_valor_solicitacao: perfil === 'SUPERADMIN' ||
          (perfil.startsWith('ADMIN') && isGeo) ||
          permissaoConfigurada
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar permissao para alterar valor' });
    }
  },

  async getUsuariosListarTodasSolicitacoes(req, res) {
    try {
      const configuracao = await obterConfiguracaoUsuariosListarTodasSolicitacoes();
      const selecionados = new Set(configuracao.usuario_ids.map((id) => Number(id)));

      const usuariosRaw = await User.findAll({
        attributes: [
          'id',
          'nome',
          'email',
          'perfil',
          'ativo',
          'setor_id'
        ],
        include: [
          {
            model: Setor,
            as: 'setor',
            attributes: ['id', 'nome', 'codigo']
          }
        ],
        order: [
          ['ativo', 'DESC'],
          ['nome', 'ASC']
        ]
      });

      const usuarios = usuariosRaw.map((usuario) => {
        const plain = usuario.toJSON();
        const perfil = String(plain.perfil || '').toUpperCase();
        const permissaoPadrao = perfil === 'SUPERADMIN';

        return {
          ...plain,
          pode_listar_todas_solicitacoes: permissaoPadrao || selecionados.has(Number(plain.id)),
          permissao_padrao_listar_todas_solicitacoes: permissaoPadrao
        };
      });

      return res.json({
        usuario_ids: configuracao.usuario_ids,
        usuarios
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar usuarios com permissao para listar todas as solicitacoes' });
    }
  },

  async updateUsuariosListarTodasSolicitacoes(req, res) {
    try {
      const usuarioIds = normalizarUsuarioIds(req.body?.usuario_ids);

      if (usuarioIds.length > 0) {
        const usuariosValidos = await User.findAll({
          where: {
            id: { [Op.in]: usuarioIds },
            ativo: true
          },
          attributes: ['id']
        });
        const idsValidos = usuariosValidos.map((usuario) => Number(usuario.id));
        const idsValidosSet = new Set(idsValidos);
        const idsInvalidos = usuarioIds.filter(id => !idsValidosSet.has(id));

        if (idsInvalidos.length > 0) {
          return res.status(400).json({
            error: 'Um ou mais usuarios informados sao invalidos para esta permissao.',
            usuario_ids_invalidos: idsInvalidos
          });
        }
      }

      const configuracao = await salvarUsuariosListarTodasSolicitacoes(usuarioIds);
      return res.json(configuracao);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar usuarios com permissao para listar todas as solicitacoes' });
    }
  },

  async getMinhaPermissaoListarTodasSolicitacoes(req, res) {
    try {
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      const permissaoConfigurada = await usuarioPodeListarTodasSolicitacoes(req.user?.id);

      return res.json({
        pode_listar_todas_solicitacoes: perfil === 'SUPERADMIN' || permissaoConfigurada
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar permissao para listar todas as solicitacoes' });
    }
  }
};
