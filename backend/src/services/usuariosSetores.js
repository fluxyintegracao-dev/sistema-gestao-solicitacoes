const { Op } = require('sequelize');
const { Setor, UsuarioSetor } = require('../models');

function normalizarIdInteiro(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function normalizarSetorParaResposta(setor) {
  if (!setor) return null;
  const plain = typeof setor.toJSON === 'function' ? setor.toJSON() : setor;
  const id = normalizarIdInteiro(plain.id || plain.setor_id);
  if (!id) return null;
  return {
    id,
    nome: plain.nome || null,
    codigo: plain.codigo || null,
    ativo: plain.ativo
  };
}

function adicionarSetorNoMapa(mapa, setor) {
  const normalizado = normalizarSetorParaResposta(setor);
  if (!normalizado) return;
  const atual = mapa.get(normalizado.id) || {};
  mapa.set(normalizado.id, {
    ...atual,
    ...normalizado,
    nome: normalizado.nome || atual.nome || null,
    codigo: normalizado.codigo || atual.codigo || null
  });
}

function extrairSetoresUsuarioSemConsulta(usuario) {
  const plain = typeof usuario?.toJSON === 'function' ? usuario.toJSON() : (usuario || {});
  const mapa = new Map();

  if (plain.setor) adicionarSetorNoMapa(mapa, plain.setor);
  if (plain.setor_id) adicionarSetorNoMapa(mapa, { id: plain.setor_id });
  if (Array.isArray(plain.setores)) {
    plain.setores.forEach((setor) => adicionarSetorNoMapa(mapa, setor));
  }
  if (Array.isArray(plain.setores_ids)) {
    plain.setores_ids.forEach((id) => adicionarSetorNoMapa(mapa, { id }));
  }
  if (Array.isArray(plain.setoresVinculos)) {
    plain.setoresVinculos.forEach((vinculo) => {
      adicionarSetorNoMapa(mapa, vinculo?.setor || { id: vinculo?.setor_id });
    });
  }

  return Array.from(mapa.values());
}

async function completarDadosSetores(setores) {
  const mapa = new Map();
  setores.forEach((setor) => adicionarSetorNoMapa(mapa, setor));

  const idsSemDados = Array.from(mapa.values())
    .filter((setor) => setor.id && (!setor.nome || !setor.codigo))
    .map((setor) => setor.id);

  if (idsSemDados.length > 0) {
    const setoresDb = await Setor.findAll({
      where: { id: { [Op.in]: Array.from(new Set(idsSemDados)) } },
      attributes: [
        'id',
        'nome',
        'codigo',
        'ativo',
        'eh_setor_obra',
        'eh_setor_financeiro',
        'eh_setor_compras',
        'eh_setor_geo',
        'eh_setor_administrativo'
      ]
    });
    setoresDb.forEach((setor) => adicionarSetorNoMapa(mapa, setor));
  }

  return Array.from(mapa.values()).sort((a, b) => {
    const nomeA = String(a.nome || a.codigo || a.id || '');
    const nomeB = String(b.nome || b.codigo || b.id || '');
    return nomeA.localeCompare(nomeB, 'pt-BR');
  });
}

async function listarSetoresDoUsuario(usuario) {
  const plain = typeof usuario?.toJSON === 'function' ? usuario.toJSON() : (usuario || {});
  const setoresBase = extrairSetoresUsuarioSemConsulta(plain);
  const userId = normalizarIdInteiro(plain.id);

  if (userId) {
    const vinculos = await UsuarioSetor.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Setor,
          as: 'setor',
          attributes: [
            'id',
            'nome',
            'codigo',
            'ativo',
            'eh_setor_obra',
            'eh_setor_financeiro',
            'eh_setor_compras',
            'eh_setor_geo',
            'eh_setor_administrativo'
          ]
        }
      ],
      order: [['id', 'ASC']]
    });

    vinculos.forEach((vinculo) => {
      setoresBase.push(vinculo?.setor || { id: vinculo?.setor_id });
    });
  }

  return completarDadosSetores(setoresBase);
}

async function obterIdsSetoresUsuario(usuario) {
  const setores = await listarSetoresDoUsuario(usuario);
  return setores.map((setor) => normalizarIdInteiro(setor.id)).filter(Boolean);
}

async function obterTokensSetoresUsuario(usuario, extras = []) {
  const setores = await listarSetoresDoUsuario(usuario);
  const tokens = [];
  (Array.isArray(extras) ? extras : [extras]).forEach((valor) => {
    if (valor) tokens.push(String(valor).trim().toUpperCase());
  });
  if (usuario?.area) tokens.push(String(usuario.area).trim().toUpperCase());
  setores.forEach((setor) => {
    if (setor.id) tokens.push(String(setor.id).trim().toUpperCase());
    if (setor.codigo) tokens.push(String(setor.codigo).trim().toUpperCase());
    if (setor.nome) tokens.push(String(setor.nome).trim().toUpperCase());
  });
  return Array.from(new Set(tokens.filter(Boolean)));
}

module.exports = {
  normalizarIdInteiro,
  normalizarSetorParaResposta,
  extrairSetoresUsuarioSemConsulta,
  listarSetoresDoUsuario,
  obterIdsSetoresUsuario,
  obterTokensSetoresUsuario
};
