export function normalizarSetorToken(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

export function isGeoSetor(valor) {
  const token = normalizarSetorToken(valor);
  return token === 'GEO' || token === 'GERENCIA_DE_PROCESSOS' || token === 'GERENCIA_PROCESSOS';
}

export function obterTokensSetorUsuario(user) {
  const tokens = [
    String(user?.setor?.codigo || '').toUpperCase(),
    String(user?.setor?.nome || '').toUpperCase(),
    String(user?.setor_id || '').toUpperCase(),
    String(user?.area || '').toUpperCase()
  ];

  if (Array.isArray(user?.setores)) {
    user.setores.forEach(setor => {
      tokens.push(String(setor?.id || '').toUpperCase());
      tokens.push(String(setor?.codigo || '').toUpperCase());
      tokens.push(String(setor?.nome || '').toUpperCase());
    });
  }

  if (Array.isArray(user?.setores_ids)) {
    user.setores_ids.forEach(id => tokens.push(String(id || '').toUpperCase()));
  }

  if (Array.isArray(user?.setoresVinculos)) {
    user.setoresVinculos.forEach(vinculo => {
      tokens.push(String(vinculo?.setor_id || '').toUpperCase());
      tokens.push(String(vinculo?.setor?.id || '').toUpperCase());
      tokens.push(String(vinculo?.setor?.codigo || '').toUpperCase());
      tokens.push(String(vinculo?.setor?.nome || '').toUpperCase());
    });
  }

  return [...new Set(tokens.map(token => String(token || '').trim()).filter(Boolean))];
}

export function obterIdsSetoresUsuario(user) {
  const ids = [];

  function adicionar(valor) {
    const numero = Number(valor);
    if (Number.isInteger(numero) && numero > 0 && !ids.includes(String(numero))) {
      ids.push(String(numero));
    }
  }

  adicionar(user?.setor_id);

  if (Array.isArray(user?.setores_ids)) {
    user.setores_ids.forEach(adicionar);
  }

  if (Array.isArray(user?.setores)) {
    user.setores.forEach(setor => adicionar(setor?.id));
  }

  if (Array.isArray(user?.setoresVinculos)) {
    user.setoresVinculos.forEach(vinculo => {
      adicionar(vinculo?.setor_id);
      adicionar(vinculo?.setor?.id);
    });
  }

  return ids;
}

export function solicitacaoEstaNoSetorDoUsuario(areaResponsavel, user) {
  const setorSolicitacao = normalizarSetorToken(areaResponsavel);
  if (!setorSolicitacao) return false;

  return obterTokensSetorUsuario(user).some(token => {
    const tokenNormalizado = normalizarSetorToken(token);
    if (!tokenNormalizado) return false;
    if (tokenNormalizado === setorSolicitacao) return true;
    return isGeoSetor(tokenNormalizado) && isGeoSetor(setorSolicitacao);
  });
}

export function usuarioPodeEnviarQualquerSetor(user) {
  const perfil = String(user?.perfil || '').trim().toUpperCase();
  return perfil === 'SUPERADMIN' || Boolean(user?.pode_enviar_qualquer_setor);
}

export function usuarioPodeEnviarSolicitacaoParaOutroSetor(areaResponsavel, user) {
  if (usuarioPodeEnviarQualquerSetor(user)) {
    return true;
  }

  return solicitacaoEstaNoSetorDoUsuario(areaResponsavel, user);
}
