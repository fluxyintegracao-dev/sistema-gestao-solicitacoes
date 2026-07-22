const { Op } = require('sequelize');
const { Setor, User, UsuarioSetor } = require('../models');

function asPlain(value) {
  return typeof value?.toJSON === 'function' ? value.toJSON() : (value || {});
}

function normalizeId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function montarUsuariosElegiveisDelegacaoCompras({ setores = [], usuarios = [], vinculos = [] } = {}) {
  const setoresCompras = new Map(
    setores
      .map(asPlain)
      .filter((setor) => setor.ativo === true && setor.eh_setor_compras === true)
      .map((setor) => [normalizeId(setor.id), setor])
      .filter(([id]) => Boolean(id))
  );
  const setoresPorUsuario = new Map();

  vinculos.map(asPlain).forEach((vinculo) => {
    const userId = normalizeId(vinculo.user_id);
    const setorId = normalizeId(vinculo.setor_id);
    if (!userId || !setoresCompras.has(setorId)) return;
    const ids = setoresPorUsuario.get(userId) || new Set();
    ids.add(setorId);
    setoresPorUsuario.set(userId, ids);
  });

  return usuarios
    .map(asPlain)
    .filter((usuario) => usuario.ativo === true)
    .filter((usuario) => String(usuario.perfil || '').trim().toUpperCase() !== 'SUPERADMIN')
    .map((usuario) => {
      const userId = normalizeId(usuario.id);
      if (!userId) return null;

      const setorIds = new Set(setoresPorUsuario.get(userId) || []);
      const setorPrincipalId = normalizeId(usuario.setor_id);
      if (setorPrincipalId && setoresCompras.has(setorPrincipalId)) {
        setorIds.add(setorPrincipalId);
      }
      if (setorIds.size === 0) return null;

      const setoresUsuario = Array.from(setorIds)
        .map((id) => setoresCompras.get(id))
        .filter(Boolean)
        .map((setor) => ({
          id: normalizeId(setor.id),
          nome: setor.nome || null,
          codigo: setor.codigo || null
        }))
        .sort((a, b) => String(a.nome || a.codigo || '').localeCompare(
          String(b.nome || b.codigo || ''),
          'pt-BR'
        ));

      return {
        id: userId,
        nome: usuario.nome || null,
        email: usuario.email || null,
        setor: setoresUsuario[0]?.nome || setoresUsuario[0]?.codigo || null,
        setores: setoresUsuario
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const byName = String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
      return byName || a.id - b.id;
    });
}

async function carregarDadosElegibilidade({ transaction } = {}) {
  const setores = await Setor.findAll({
    where: { ativo: true, eh_setor_compras: true },
    attributes: ['id', 'nome', 'codigo', 'ativo', 'eh_setor_compras'],
    transaction
  });
  const setorIds = setores.map((setor) => normalizeId(setor.id)).filter(Boolean);

  if (setorIds.length === 0) {
    return { setores, usuarios: [], vinculos: [] };
  }

  const vinculos = await UsuarioSetor.findAll({
    where: { setor_id: { [Op.in]: setorIds } },
    attributes: ['user_id', 'setor_id'],
    transaction
  });
  const usuarioIdsVinculados = vinculos.map((vinculo) => normalizeId(vinculo.user_id)).filter(Boolean);

  const usuarios = await User.findAll({
    where: {
      ativo: true,
      perfil: { [Op.ne]: 'SUPERADMIN' },
      [Op.or]: [
        { setor_id: { [Op.in]: setorIds } },
        ...(usuarioIdsVinculados.length > 0 ? [{ id: { [Op.in]: usuarioIdsVinculados } }] : [])
      ]
    },
    attributes: ['id', 'nome', 'email', 'perfil', 'setor_id', 'ativo'],
    order: [['nome', 'ASC'], ['id', 'ASC']],
    transaction
  });

  return { setores, usuarios, vinculos };
}

async function listarUsuariosElegiveisDelegacaoCompras(options = {}) {
  const dados = await carregarDadosElegibilidade(options);
  return montarUsuariosElegiveisDelegacaoCompras(dados);
}

function createResponsavelInvalidoError() {
  const error = new Error('O responsavel deve ser um usuario ativo vinculado ao setor de Compras.');
  error.statusCode = 400;
  error.code = 'COMPRAS_DELEGACAO_RESPONSAVEL_INVALIDO';
  return error;
}

async function validarResponsavelElegivelDelegacaoCompras(responsavelId, options = {}) {
  if (responsavelId === null || responsavelId === undefined || String(responsavelId).trim() === '') {
    return null;
  }

  const id = normalizeId(responsavelId);
  if (!id) throw createResponsavelInvalidoError();

  const usuario = await User.findOne({
    where: {
      id,
      ativo: true,
      perfil: { [Op.ne]: 'SUPERADMIN' }
    },
    attributes: ['id', 'nome', 'email', 'setor_id'],
    transaction: options.transaction
  });
  if (!usuario) throw createResponsavelInvalidoError();

  const vinculos = await UsuarioSetor.findAll({
    where: { user_id: id },
    attributes: ['setor_id'],
    transaction: options.transaction
  });
  const setorIds = Array.from(new Set([
    normalizeId(usuario.setor_id),
    ...vinculos.map((vinculo) => normalizeId(vinculo.setor_id))
  ].filter(Boolean)));

  const setorCompras = setorIds.length > 0
    ? await Setor.findOne({
      where: {
        id: { [Op.in]: setorIds },
        ativo: true,
        eh_setor_compras: true
      },
      attributes: ['id'],
      transaction: options.transaction
    })
    : null;

  if (!setorCompras) throw createResponsavelInvalidoError();
  return asPlain(usuario);
}

module.exports = {
  listarUsuariosElegiveisDelegacaoCompras,
  montarUsuariosElegiveisDelegacaoCompras,
  validarResponsavelElegivelDelegacaoCompras
};
