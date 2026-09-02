// =====================================================================
// PREFERÊNCIAS E FILTROS SALVOS DAS LISTAS (componente ListaAvancada)
// ---------------------------------------------------------------------
// Persistência NO BANCO, por usuário e por lista (chave `lista`, ex.:
// 'solicitacoes'): o usuário não perde colunas, larguras, modo de
// visualização nem os filtros nomeados ao trocar de máquina/navegador.
// Somente o próprio usuário lê e escreve os seus registros.
// =====================================================================
const { UsuarioListaPreferencia, UsuarioListaFiltro } = require('../models');

const LISTA_MAX = 80;
const NOME_MAX = 120;
const JSON_MAX_BYTES = 32 * 1024;
const FILTROS_SALVOS_MAX = 30;

function normalizarLista(valor) {
  const lista = String(valor || '').trim().toLowerCase();
  if (!lista || lista.length > LISTA_MAX || !/^[a-z0-9_-]+$/.test(lista)) {
    return null;
  }
  return lista;
}

function serializarJsonLimitado(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const texto = JSON.stringify(valor);
  if (Buffer.byteLength(texto, 'utf8') > JSON_MAX_BYTES) return null;
  return texto;
}

function parseJsonSeguro(texto, fallback = {}) {
  try {
    const parsed = JSON.parse(texto);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

module.exports = {
  async getPreferencias(req, res) {
    try {
      const lista = normalizarLista(req.params.lista);
      if (!lista) return res.status(400).json({ error: 'Lista invalida' });

      const registro = await UsuarioListaPreferencia.findOne({
        where: { usuario_id: req.user.id, lista }
      });
      return res.json({ preferencias: registro ? parseJsonSeguro(registro.preferencias) : {} });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar preferencias da lista' });
    }
  },

  async putPreferencias(req, res) {
    try {
      const lista = normalizarLista(req.params.lista);
      if (!lista) return res.status(400).json({ error: 'Lista invalida' });

      const texto = serializarJsonLimitado(req.body?.preferencias);
      if (texto === null) {
        return res.status(400).json({ error: 'Preferencias invalidas ou grandes demais' });
      }

      const [registro, criado] = await UsuarioListaPreferencia.findOrCreate({
        where: { usuario_id: req.user.id, lista },
        defaults: { usuario_id: req.user.id, lista, preferencias: texto }
      });
      if (!criado) {
        await registro.update({ preferencias: texto });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar preferencias da lista' });
    }
  },

  async listarFiltros(req, res) {
    try {
      const lista = normalizarLista(req.params.lista);
      if (!lista) return res.status(400).json({ error: 'Lista invalida' });

      const filtros = await UsuarioListaFiltro.findAll({
        where: { usuario_id: req.user.id, lista },
        order: [['nome', 'ASC']]
      });
      return res.json(filtros.map((item) => ({
        id: item.id,
        nome: item.nome,
        filtros: parseJsonSeguro(item.filtros)
      })));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar filtros salvos' });
    }
  },

  async salvarFiltro(req, res) {
    try {
      const lista = normalizarLista(req.params.lista);
      if (!lista) return res.status(400).json({ error: 'Lista invalida' });

      const nome = String(req.body?.nome || '').trim().slice(0, NOME_MAX);
      if (!nome) return res.status(400).json({ error: 'Informe um nome para o filtro' });

      const texto = serializarJsonLimitado(req.body?.filtros);
      if (texto === null) {
        return res.status(400).json({ error: 'Filtros invalidos ou grandes demais' });
      }

      // mesmo nome = substitui (o usuário está atualizando o próprio filtro)
      const existente = await UsuarioListaFiltro.findOne({
        where: { usuario_id: req.user.id, lista, nome }
      });
      if (existente) {
        await existente.update({ filtros: texto });
        return res.json({ id: existente.id, nome, filtros: parseJsonSeguro(texto) });
      }

      const total = await UsuarioListaFiltro.count({ where: { usuario_id: req.user.id, lista } });
      if (total >= FILTROS_SALVOS_MAX) {
        return res.status(400).json({ error: `Limite de ${FILTROS_SALVOS_MAX} filtros salvos por lista` });
      }

      const criado = await UsuarioListaFiltro.create({
        usuario_id: req.user.id,
        lista,
        nome,
        filtros: texto
      });
      return res.status(201).json({ id: criado.id, nome, filtros: parseJsonSeguro(texto) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar filtro' });
    }
  },

  async excluirFiltro(req, res) {
    try {
      const lista = normalizarLista(req.params.lista);
      const id = Number(req.params.id);
      if (!lista || !Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Parametros invalidos' });
      }

      const removidos = await UsuarioListaFiltro.destroy({
        where: { id, usuario_id: req.user.id, lista }
      });
      if (!removidos) {
        return res.status(404).json({ error: 'Filtro nao encontrado' });
      }
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao excluir filtro' });
    }
  }
};
