function normalizeProfile(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const MFA_REQUIRED_PROFILES = new Set(['SUPERADMIN', 'ADMINISTRADOR', 'ADMIN']);

function isMfaRequiredProfile(profileOrUser) {
  const profile = typeof profileOrUser === 'string'
    ? profileOrUser
    : profileOrUser?.perfil;

  return MFA_REQUIRED_PROFILES.has(normalizeProfile(profile));
}

module.exports = {
  isMfaRequiredProfile,
  normalizeProfile
};
