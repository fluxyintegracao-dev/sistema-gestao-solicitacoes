// =====================================================================
// CATÁLOGO FIXO DE BLOCOS DO DETALHE DA SOLICITAÇÃO
// ---------------------------------------------------------------------
// O layout configurável (admin por setor + personalização do usuário)
// só ORDENA/OCULTA blocos deste catálogo — nenhum bloco novo nasce em
// configuração. As condições de permissão e de tipo da solicitação
// continuam decidindo se um bloco PODE aparecer; a configuração decide
// apenas onde e se aparece quando pode.
//
// Resolução em três níveis (o primeiro que existir vence):
//   1. arranjo do USUÁRIO (usuario_lista_preferencias, 'detalhe-solicitacao')
//   2. layout do SETOR (setor_detalhe_layout, tela de administração)
//   3. ORDEM_PADRAO abaixo — o layout atual da tela (nada configurado,
//      nada muda).
// =====================================================================

import { resolverLayoutBlocos } from '../../utils/layoutBlocos';

// ⚠️ CATÁLOGO ESPELHADO NO BACKEND: BLOCOS_POR_TELA['detalhe-solicitacao']
// em backend/src/controllers/DetalheLayoutController.js valida a config do
// admin contra uma CÓPIA desta lista. Mudou aqui, mude lá — o
// frontend/scripts/validarNavegacao.mjs FALHA se os dois divergirem.
export const BLOCOS_DETALHE = [
  { id: 'apropriacoes', rotulo: 'Apropriações da solicitação' },
  { id: 'itens_compra_direta', rotulo: 'Itens da compra direta' },
  { id: 'rateio_contrato', rotulo: 'Rateio do contrato' },
  // ITEM 26: aditivo pendente é decisão que trava o contrato — antes das ações.
  { id: 'aditivos_contrato', rotulo: 'Aditivos do contrato' },
  { id: 'acoes_contrato', rotulo: 'Ações do contrato' },
  { id: 'aprovacao_diretoria', rotulo: 'Aprovação por diretoria' },
  { id: 'historico', rotulo: 'Histórico' },
  { id: 'financeiro', rotulo: 'Financeiro' },
  { id: 'conversa', rotulo: 'Conversa (comentários e anexos)' },
  { id: 'auditoria', rotulo: 'Auditoria de prazo e documentos' }
];

// Ordem atual da tela — o nível 3 da resolução.
export const ORDEM_PADRAO = BLOCOS_DETALHE.map((bloco) => bloco.id);

export function rotuloBloco(id) {
  return BLOCOS_DETALHE.find((bloco) => bloco.id === id)?.rotulo || id;
}

// Combina as camadas em um arranjo final — o motor genérico vive em
// utils/layoutBlocos.js (compartilhado com a Home); aqui só o extra do
// detalhe: `historico_ordem` e o padrão de largura 'normal' (na prática
// o detalhe grava apenas exceções 'total', comportamento preservado).
// Retorna { ordem, ocultos: Set, recolhidos: Set, larguras: {},
//           historicoOrdem: 'asc'|'desc' }.
export function resolverLayoutDetalhe({ configSetor = null, prefsUsuario = null } = {}) {
  const base = resolverLayoutBlocos(ORDEM_PADRAO, { configSetor, prefsUsuario });
  const larguras = {};
  for (const [id, largura] of Object.entries(base.larguras)) {
    if (largura === 'total') larguras[id] = 'total';
  }
  return {
    ...base,
    larguras,
    historicoOrdem: prefsUsuario?.historico_ordem === 'desc' ? 'desc' : 'asc'
  };
}
