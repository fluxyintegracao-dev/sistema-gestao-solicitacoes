export const CUSTOS_RECEBIVEIS_PERMISSIONS = Object.freeze({
  MODULE_ACCESS: 'custos_recebiveis.modulo.acessar',
  OBRAS_VIEW: 'custos_recebiveis.obras.visualizar',
  ESTRUTURA_VIEW: 'custos_recebiveis.estrutura_micro.visualizar',
  ESTRUTURA_IMPORT: 'custos_recebiveis.estrutura_micro.importar',
  ESTRUTURA_PUBLISH: 'custos_recebiveis.estrutura_micro.publicar_versao'
});

export const CUSTOS_RECEBIVEIS_TABS = Object.freeze([
  {
    id: 'obras',
    label: 'Obras',
    permission: CUSTOS_RECEBIVEIS_PERMISSIONS.OBRAS_VIEW
  },
  {
    id: 'importacoes',
    label: 'Importações',
    permission: CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_VIEW
  }
]);

export const PLANO_SITUACAO_LABELS = Object.freeze({
  RASCUNHO: 'Rascunho',
  PUBLICADA: 'Publicada',
  SUBSTITUIDA: 'Substituída'
});
