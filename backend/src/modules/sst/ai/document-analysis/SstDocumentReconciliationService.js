'use strict';

const { RhColaborador, SstPendenciaOperacional } = require('../../../../models');

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function pickExtracted(extracted = {}, keys = []) {
  for (const key of keys) {
    if (extracted?.[key] !== undefined && extracted?.[key] !== null && extracted?.[key] !== '') return extracted[key];
  }
  return null;
}

async function reconcileDocumentAnalysis({ documento, analise, extracted = {}, usuario_id = null } = {}) {
  const divergencias = [];
  const sugestoes = [];
  let colaborador = null;

  if (documento?.colaborador_id) {
    colaborador = await RhColaborador.findByPk(documento.colaborador_id);
  }

  const cpfExtraido = onlyDigits(pickExtracted(extracted, ['cpf', 'CPF', 'cpf_colaborador']));
  const nomeExtraido = pickExtracted(extracted, ['nome', 'nome_colaborador', 'colaborador']);

  if (colaborador) {
    const cpfColaborador = onlyDigits(colaborador.cpf);
    if (cpfExtraido && cpfColaborador && cpfExtraido !== cpfColaborador) {
      divergencias.push({
        campo: 'cpf',
        valor_documento: cpfExtraido,
        valor_cadastro: cpfColaborador,
        criticidade: 'ALTA'
      });
    }

    if (nomeExtraido && normalizeName(nomeExtraido) && normalizeName(colaborador.nome)) {
      const nomeDoc = normalizeName(nomeExtraido);
      const nomeCadastro = normalizeName(colaborador.nome);
      if (nomeDoc !== nomeCadastro && !nomeCadastro.includes(nomeDoc) && !nomeDoc.includes(nomeCadastro)) {
        divergencias.push({
          campo: 'nome',
          valor_documento: nomeExtraido,
          valor_cadastro: colaborador.nome,
          criticidade: 'MEDIA'
        });
      }
    }
  } else if (cpfExtraido || nomeExtraido) {
    sugestoes.push({
      tipo: 'VINCULAR_COLABORADOR',
      cpf: cpfExtraido || null,
      nome: nomeExtraido || null,
      observacao: 'Documento possui identificacao, mas nao esta vinculado a colaborador central do RH/DP.'
    });
  }

  ['validade', 'data_exame', 'data_realizacao', 'crm', 'medico', 'treinamento', 'epi'].forEach((campo) => {
    if (extracted?.[campo]) {
      sugestoes.push({
        tipo: 'CAMPO_EXTRAIDO',
        campo,
        valor: extracted[campo]
      });
    }
  });

  if (divergencias.length) {
    await SstPendenciaOperacional.create({
      empresa_id: documento?.empresa_id || null,
      obra_id: documento?.obra_id || null,
      colaborador_id: documento?.colaborador_id || null,
      tipo_pendencia: 'DOCUMENTO_IA_DIVERGENTE',
      criticidade: divergencias.some((item) => item.criticidade === 'ALTA') ? 'ALTA' : 'MEDIA',
      status: 'ABERTA',
      titulo: 'Divergencia em documento SST analisado por IA',
      descricao: 'A IA documental identificou divergencias entre o documento SST e os dados internos. Revisao humana obrigatoria.',
      origem_tipo: 'sst_documentos_analises_ia',
      origem_id: analise?.id || null,
      payload_json: JSON.stringify({ divergencias, sugestoes }),
      criado_por: usuario_id,
      atualizado_por: usuario_id
    });
  }

  return { divergencias, sugestoes };
}

module.exports = {
  reconcileDocumentAnalysis
};
