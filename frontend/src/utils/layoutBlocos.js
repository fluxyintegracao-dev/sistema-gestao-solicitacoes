// =====================================================================
// MOTOR GENÉRICO DE LAYOUT EM BLOCOS (detalhe da solicitação e Home)
// ---------------------------------------------------------------------
// Um catálogo FIXO de blocos por tela; a configuração só ORDENA/OCULTA.
// Resolução em três camadas (a primeira que existir vence):
//   1. arranjo do USUÁRIO (usuario_lista_preferencias, chave da tela)
//   2. layout do SETOR (setor_detalhe_layout, coluna `tela`)
//   3. ordem padrão do código — o layout atual da tela.
//
// Extraído de blocosDetalhe.js para a Home reaproveitar o MESMO motor
// (nada de sistema paralelo). `resolverLayoutDetalhe` delega para cá.
// =====================================================================

// Combina as camadas em um arranjo final:
// - `ordemPadrao`: ids do catálogo da tela, na ordem do código
// - `configSetor`: [{ bloco, visivel, posicao }] (admin) ou null
// - `prefsUsuario`: { ordem, recolhidos, removidos, larguras } ou null —
//    a camada do usuário VENCE a do setor (o padrão do setor é padrão,
//    não restrição; restrição é permissão).
// Retorna { ordem, ocultos: Set, recolhidos: Set, larguras: {} }.
// `larguras` preserva valores 'normal' E 'total' — cada tela interpreta
// com o próprio padrão (detalhe: padrão normal; Home: padrão total).
// Blocos que não constem na configuração entram no FIM, visíveis —
// um bloco novo no código nunca some por causa de config antiga.
export function resolverLayoutBlocos(ordemPadrao, { configSetor = null, prefsUsuario = null } = {}) {
  const idsValidos = new Set(ordemPadrao);

  let ordemBase = ordemPadrao;
  const ocultosSetor = new Set();

  if (Array.isArray(configSetor) && configSetor.length > 0) {
    const daConfig = configSetor
      .filter((item) => idsValidos.has(item?.bloco))
      .sort((a, b) => (a.posicao ?? 0) - (b.posicao ?? 0));
    const listados = new Set(daConfig.map((item) => item.bloco));
    ordemBase = [
      ...daConfig.map((item) => item.bloco),
      ...ordemPadrao.filter((id) => !listados.has(id))
    ];
    for (const item of daConfig) {
      if (item.visivel === false) ocultosSetor.add(item.bloco);
    }
  }

  let ordem = ordemBase;
  const recolhidos = new Set();
  const larguras = {};
  // Quando o usuário tem lista própria de removidos, ela SUBSTITUI a
  // ocultação do setor (ele pode readicionar um bloco que o admin
  // ocultou por padrão).
  let ocultos = ocultosSetor;

  if (prefsUsuario && Array.isArray(prefsUsuario.ordem) && prefsUsuario.ordem.length > 0) {
    const doUsuario = prefsUsuario.ordem.filter((id) => idsValidos.has(id));
    const listados = new Set(doUsuario);
    ordem = [...doUsuario, ...ordemBase.filter((id) => !listados.has(id))];
  }
  if (prefsUsuario && Array.isArray(prefsUsuario.removidos)) {
    ocultos = new Set(prefsUsuario.removidos.filter((id) => idsValidos.has(id)));
  }
  if (prefsUsuario && Array.isArray(prefsUsuario.recolhidos)) {
    for (const id of prefsUsuario.recolhidos) {
      if (idsValidos.has(id)) recolhidos.add(id);
    }
  }
  if (prefsUsuario && prefsUsuario.larguras && typeof prefsUsuario.larguras === 'object') {
    for (const [id, largura] of Object.entries(prefsUsuario.larguras)) {
      if (idsValidos.has(id) && (largura === 'total' || largura === 'normal')) {
        larguras[id] = largura;
      }
    }
  }

  return { ordem, ocultos, recolhidos, larguras };
}
