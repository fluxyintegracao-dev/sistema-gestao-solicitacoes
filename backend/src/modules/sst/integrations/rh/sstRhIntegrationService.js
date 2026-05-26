'use strict';

const { RhColaborador } = require('../../../../models');
const { ValidationError } = require('../../../../middlewares/validation');
const { SST_EVENT_TYPES } = require('../../constants/sstConstants');
const { registrarEventoSst } = require('../../services/sstEventService');
const { automatizarMudancaFuncao } = require('../../automation/sstAutomationService');

async function getColaborador(colaborador_id) {
  const colaborador = await RhColaborador.findByPk(colaborador_id, {
    attributes: ['id', 'nome', 'cpf', 'matricula', 'cargo', 'empresa_grupo_id', 'obra_id', 'setor_id', 'status']
  });
  if (!colaborador) throw new ValidationError('Colaborador nao encontrado para integracao SST/RH.', 404);
  return colaborador;
}

async function registrarAdmissaoSst({ colaborador_id, usuario_id = null } = {}) {
  const colaborador = await getColaborador(colaborador_id);
  const evento = await registrarEventoSst({
    empresa_id: colaborador.empresa_grupo_id || null,
    obra_id: colaborador.obra_id || null,
    colaborador_id,
    tipo_evento: SST_EVENT_TYPES.ADMISSAO_DETECTADA,
    severidade: 'ALERTA',
    origem_tipo: 'rh_colaboradores',
    origem_id: colaborador_id,
    mensagem: 'Admissao detectada: onboarding SST obrigatorio.',
    payload: colaborador.toJSON(),
    usuario_id
  });
  const automacao = await automatizarMudancaFuncao({
    colaborador_id,
    motivo: 'ADMISSAO',
    alteracao: colaborador.toJSON(),
    usuario_id
  });
  return { evento, automacao };
}

async function registrarDesligamentoSst({ colaborador_id, usuario_id = null } = {}) {
  const colaborador = await getColaborador(colaborador_id);
  const evento = await registrarEventoSst({
    empresa_id: colaborador.empresa_grupo_id || null,
    obra_id: colaborador.obra_id || null,
    colaborador_id,
    tipo_evento: SST_EVENT_TYPES.DESLIGAMENTO_DETECTADO,
    severidade: 'INFO',
    origem_tipo: 'rh_colaboradores',
    origem_id: colaborador_id,
    mensagem: 'Desligamento detectado: timeline SST deve ser congelada e pendencias encerradas conforme governanca.',
    payload: colaborador.toJSON(),
    usuario_id
  });
  return { evento };
}

async function registrarMudancaObraSst({ colaborador_id, obra_anterior_id = null, obra_nova_id = null, usuario_id = null } = {}) {
  const colaborador = await getColaborador(colaborador_id);
  const payload = { obra_anterior_id, obra_nova_id, colaborador: colaborador.toJSON() };
  const evento = await registrarEventoSst({
    empresa_id: colaborador.empresa_grupo_id || null,
    obra_id: obra_nova_id || colaborador.obra_id || null,
    colaborador_id,
    tipo_evento: SST_EVENT_TYPES.OBRA_ALTERADA,
    severidade: 'ALERTA',
    origem_tipo: 'rh_colaboradores',
    origem_id: colaborador_id,
    mensagem: 'Mudanca de obra detectada: revisar riscos, exposicao, ASO, EPI e treinamentos.',
    payload,
    usuario_id
  });
  const automacao = await automatizarMudancaFuncao({
    colaborador_id,
    motivo: 'MUDANCA_OBRA',
    alteracao: payload,
    usuario_id
  });
  return { evento, automacao };
}

module.exports = {
  registrarAdmissaoSst,
  registrarDesligamentoSst,
  registrarMudancaObraSst
};
