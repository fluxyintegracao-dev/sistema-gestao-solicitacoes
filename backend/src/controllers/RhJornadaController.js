const {
  registrarJornada,
  registrarPagamentoIndividual,
  colaboradoresParaJornada
} = require('../services/rhJornadaFormularioService');
const { eventosVigentes, desativarEventoRecorrente, itensDaLinha } = require('../services/rhEventoRecorrenteService');
const { historicoDoColaborador: historicoDeVinculo } = require('../services/rhVinculoObraService');
const { historicoDoColaborador: historicoDeSalario } = require('../services/rhSalarioService');
const { responderErroController } = require('../utils/controllerError');
const { codigoDoSetor } = require('../utils/codigoDoSetor');
const { RhColaborador } = require('../models');
const { ValidationError } = require('../middlewares/validation');
const { getRhDpObraScopeIds } = require('../services/authorizationService');

/**
 * Jornada por formulario, eventos recorrentes e os historicos (Fase 4/5 do modulo DP, 26/08).
 *
 * Este controller existe porque os servicos existiam SEM PORTA: `rhJornadaFormularioService` estava
 * provado por 14 conferencias e nao era referenciado por nenhum arquivo do sistema. Servico que
 * ninguem chama parece pronto e nao esta — e a suite verde ajuda a esconder isso.
 */
function contextoDe(req) {
  return { usuarioId: req.user?.id || null, setor: codigoDoSetor(req.user), usuario: req.user };
}

async function exigirObraNoEscopoDoUsuario(req, obraId) {
  const escopo = await getRhDpObraScopeIds(req.user);
  if (!Array.isArray(escopo)) return;
  const id = Number(obraId);
  if (!id || !escopo.includes(id)) {
    throw new ValidationError('Acesso negado: a obra nao esta vinculada ao usuario.', 403);
  }
}

async function exigirColaboradorNoEscopoDoUsuario(req, colaboradorId) {
  const escopo = await getRhDpObraScopeIds(req.user);
  if (!Array.isArray(escopo)) return;
  const colaborador = await RhColaborador.findByPk(colaboradorId, { attributes: ['id', 'obra_id'] });
  if (!colaborador) throw new ValidationError('Colaborador nao encontrado.', 404);
  if (!colaborador.obra_id || !escopo.includes(Number(colaborador.obra_id))) {
    throw new ValidationError('Acesso negado a este colaborador.', 403);
  }
}

module.exports = {
  /** A lista que o formulario abre: quem estava na obra NAQUELA competencia, pelo vinculo. */
  async colaboradoresDaCompetencia(req, res) {
    try {
      await exigirObraNoEscopoDoUsuario(req, req.query.obra_id);
      const dados = await colaboradoresParaJornada(
        Number(req.query.obra_id),
        String(req.query.competencia || '')
      );
      return res.json(dados);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao montar a lista de jornada');
    }
  },

  async registrar(req, res) {
    try {
      await exigirObraNoEscopoDoUsuario(req, req.body?.obra_id);
      const dados = await registrarJornada(req.body || {}, contextoDe(req));
      return res.status(201).json(dados);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao registrar a jornada');
    }
  },

  async pagamentoIndividual(req, res) {
    try {
      await exigirObraNoEscopoDoUsuario(req, req.body?.obra_id);
      const dados = await registrarPagamentoIndividual(req.body || {}, contextoDe(req));
      return res.status(201).json(dados);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao registrar o pagamento individual');
    }
  },

  async eventosDoColaborador(req, res) {
    try {
      await exigirColaboradorNoEscopoDoUsuario(req, req.params.id);
      const competencia = String(req.query.competencia || new Date().toISOString().slice(0, 7));
      return res.json(await eventosVigentes(Number(req.params.id), competencia));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar eventos recorrentes');
    }
  },

  async desativarEvento(req, res) {
    try {
      const evento = await desativarEventoRecorrente(req.params.id, req.body?.motivo, contextoDe(req));
      return res.json(evento);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao desativar o evento recorrente');
    }
  },

  /** Os itens que compoem a soma da folha — para a tela abrir e mostrar de onde veio cada centavo. */
  async itensDaFolha(req, res) {
    try {
      return res.json(await itensDaLinha(Number(req.params.id)));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar os itens da folha');
    }
  },

  async historicoDeVinculo(req, res) {
    try {
      await exigirColaboradorNoEscopoDoUsuario(req, req.params.id);
      return res.json(await historicoDeVinculo(Number(req.params.id)));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar o historico de lotacao');
    }
  },

  async historicoDeSalario(req, res) {
    try {
      await exigirColaboradorNoEscopoDoUsuario(req, req.params.id);
      return res.json(await historicoDeSalario(Number(req.params.id)));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar o historico de salario');
    }
  }
};
