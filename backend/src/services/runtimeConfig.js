const {
  getDefaultInstallationConfig,
  getInstallationConfig
} = require('./installationConfig');

let installationConfigCache = getDefaultInstallationConfig();

async function loadRuntimeConfig() {
  try {
    installationConfigCache = await getInstallationConfig();
  } catch (error) {
    installationConfigCache = getDefaultInstallationConfig();
  }

  return installationConfigCache;
}

function getRuntimeInstallationConfig() {
  return installationConfigCache;
}

module.exports = {
  getRuntimeInstallationConfig,
  loadRuntimeConfig
};
