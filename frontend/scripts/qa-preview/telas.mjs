/**
 * MANIFESTO DO HARNESS DE QA VISUAL — as telas verificadas no PREVIEW
 * PUBLICADO (docs/DEFINICAO-DE-PRONTO.md). Começa com as 22 telas já
 * entregues; cada leva nova adiciona as suas aqui.
 *
 * Campos:
 * - id: nome curto (vira pasta de captura e linha da matriz)
 * - arquivo: o .jsx correspondente (rastreabilidade com telas-reformadas.json)
 * - rota: caminho fixo, OU resolver: 'tituloDetalhe' | 'obraGestao' para
 *   telas de registro cujo id vem da própria base (o harness navega pela
 *   listagem e abre o registro de PIOR CASO — maior valor/nome real).
 * - tipo: 'listagem' | 'detalhe' | 'form' | 'mista' | 'pivo'
 *   (detalhe/form exigem C3/C4; listagem reprova seta de voltar)
 * - naoAplica: { ITEM: 'motivo' } — N/A registrado, nunca silencioso.
 */
export const TELAS = [
  {
    id: 'usuarios',
    arquivo: 'src/pages/Usuarios.jsx',
    rota: '/usuarios',
    tipo: 'listagem'
  },
  {
    id: 'usuario-novo',
    arquivo: 'src/pages/UsuarioNovo.jsx',
    rota: '/usuarios/novo',
    tipo: 'form',
    naoAplica: {
      R1: 'cadastro de usuário é fluxo frequente com página própria (decisão registrada)',
      B4: 'formulário de criação não tem campos de leitura vazios a recolher'
    }
  },
  {
    id: 'parceiros',
    arquivo: 'src/pages/Parceiros.jsx',
    rota: '/parceiros',
    tipo: 'mista',
    naoAplica: {
      R1: 'cadastro de uso FREQUENTE mantém painel acima da lista (decisão registrada em R9)'
    }
  },
  {
    id: 'parceiro-categorias',
    arquivo: 'src/pages/ParceiroCategorias.jsx',
    rota: '/parceiros-categorias',
    tipo: 'listagem'
  },
  {
    id: 'financeiro-titulo-detalhe',
    arquivo: 'src/pages/FinanceiroTituloDetalhe.jsx',
    resolver: 'tituloDetalhe',
    tipo: 'detalhe',
    naoAplica: {
      C6: '"Abrir solicitação" é link para outra rota na barra de ações — item 5 da lista de decisões (DECISOES-PENDENTES-QA.md), aguardando o cliente; exceção registrada até lá'
    }
  },
  {
    id: 'obras',
    arquivo: 'src/pages/Obras.jsx',
    rota: '/obras',
    tipo: 'listagem'
  },
  {
    id: 'obra-gestao',
    arquivo: 'src/pages/ObraGestao.jsx',
    resolver: 'obraGestao',
    tipo: 'detalhe',
    // As tabelas da tela vivem nas ABAS — verificar só o dashboard seria
    // "implementado no componente" sem cobertura (proibido pela DoD).
    variantes: ['?aba=orcamento', '?aba=custos', '?aba=parcelas', '?aba=arquivos', '?aba=relatorio-final']
  },
  {
    id: 'obra-tipo-apropriacao',
    arquivo: 'src/pages/ObraTipoApropriacao.jsx',
    rota: '/obra-tipo-apropriacao',
    tipo: 'pivo',
    naoAplica: {
      T2: 'pivô de colunas dinâmicas — exceção registrada no manifesto (decisão do cliente pendente)',
      T3: 'pivô de colunas dinâmicas — exceção registrada no manifesto (decisão do cliente pendente)'
    }
  },
  {
    id: 'setores',
    arquivo: 'src/pages/Setores.jsx',
    rota: '/setores',
    tipo: 'listagem'
  },
  {
    id: 'tipos-solicitacao',
    arquivo: 'src/pages/TiposSolicitacao.jsx',
    rota: '/tipos-solicitacao',
    tipo: 'listagem'
  },
  {
    id: 'tipos-sub-contrato',
    arquivo: 'src/pages/TiposSubContrato.jsx',
    rota: '/tipos-sub-contrato',
    tipo: 'listagem'
  },
  {
    id: 'empresas-grupo',
    arquivo: 'src/pages/EmpresasGrupo.jsx',
    rota: '/empresas-grupo',
    tipo: 'listagem'
  },
  {
    id: 'areas-obra',
    arquivo: 'src/pages/AreasObra.jsx',
    rota: '/areas-obra',
    tipo: 'listagem'
  },
  {
    id: 'setores-visiveis-usuario',
    arquivo: 'src/pages/SetoresVisiveisUsuario.jsx',
    rota: '/setores-visiveis-usuario',
    tipo: 'listagem'
  },
  {
    id: 'tipos-solicitacao-por-setor',
    arquivo: 'src/pages/TiposSolicitacaoPorSetor.jsx',
    rota: '/tipos-solicitacao-por-setor',
    tipo: 'listagem'
  },
  {
    id: 'tipos-compartilhados-setor',
    arquivo: 'src/pages/TiposCompartilhadosSetor.jsx',
    rota: '/tipos-compartilhados-setor',
    tipo: 'listagem'
  },
  {
    id: 'setores-criacao-todas-obras',
    arquivo: 'src/pages/SetoresCriacaoTodasObras.jsx',
    rota: '/setores-criacao-todas-obras',
    tipo: 'listagem'
  },
  {
    id: 'setores-acesso-todas-obras',
    arquivo: 'src/pages/SetoresAcessoTodasObras.jsx',
    rota: '/setores-acesso-todas-obras',
    tipo: 'listagem'
  },
  {
    id: 'usuarios-envio-qualquer-setor',
    arquivo: 'src/pages/UsuariosEnvioQualquerSetor.jsx',
    rota: '/usuarios-envio-qualquer-setor',
    tipo: 'listagem'
  },
  {
    id: 'usuarios-acesso-financeiro',
    arquivo: 'src/pages/UsuariosAcessoFinanceiro.jsx',
    rota: '/usuarios-acesso-financeiro',
    tipo: 'listagem'
  },
  {
    id: 'usuarios-acesso-prioridade-diretoria',
    arquivo: 'src/pages/UsuariosAcessoPrioridadeDiretoria.jsx',
    rota: '/usuarios-acesso-prioridade-diretoria',
    tipo: 'listagem'
  },
  {
    id: 'usuarios-permissoes-rh-dp',
    arquivo: 'src/pages/UsuariosPermissoesRhDp.jsx',
    rota: '/usuarios-permissoes-rh-dp',
    tipo: 'listagem'
  },

  /* ---------------------------------------------------------------------
     ETAPA B — MÓDULO RH/DP (02/09). Nenhuma destas telas tinha sido medida
     contra a DoD até esta leva: o módulo inteiro estava fora do manifesto,
     e a matriz de 22 telas que fechou 100% não o cobria.

     Duas telas do levantamento NÃO entram porque deixaram de existir:
     RhDpInicio (D3 — o hub do módulo já é o índice) e RhDpEmpresas (D2 —
     Empresas do grupo passou a existir uma vez só, em Cadastros). Jornada e
     Apuração também não têm linha própria: viraram ABAS do Pessoal (D1) e
     são medidas como variantes dele.
     --------------------------------------------------------------------- */
  {
    id: 'rhdp-pessoal',
    arquivo: 'src/pages/RhDpPessoal.jsx',
    rota: '/rh-dp/pessoal',
    tipo: 'mista',
    // As quatro abas da porta única do DP (D1). Jornada e Apuração são
    // arquivos próprios (RhDpJornada.jsx, RhDpApuracao.jsx) medidos aqui —
    // é onde o usuário os encontra.
    variantes: ['?aba=colaboradores', '?aba=jornada', '?aba=apuracao']
  },
  {
    id: 'rhdp-colaboradores',
    arquivo: 'src/pages/RhDpColaboradores.jsx',
    rota: '/rh-dp/colaboradores',
    tipo: 'listagem'
  },
  {
    id: 'rhdp-documentos',
    arquivo: 'src/pages/RhDpDocumentos.jsx',
    rota: '/rh-dp/documentos',
    tipo: 'listagem'
  },
  {
    id: 'rhdp-importacoes',
    arquivo: 'src/pages/RhDpImportacoes.jsx',
    rota: '/rh-dp/importacoes',
    tipo: 'mista'
  },
  {
    id: 'rhdp-fechamentos',
    arquivo: 'src/pages/RhDpFechamentos.jsx',
    rota: '/rh-dp/fechamentos',
    tipo: 'listagem'
  },
  {
    id: 'rhdp-relatorios',
    arquivo: 'src/pages/ModuloRelatorios.jsx',
    rota: '/rh-dp/relatorios',
    tipo: 'listagem',
    naoAplica: {
      T1: 'hub de relatórios do módulo: cartões de destino, não tem tabela',
      T2: 'sem tabela', T3: 'sem tabela', T4: 'sem tabela', T5: 'sem tabela',
      T6: 'sem tabela', T7: 'sem tabela',
      X1: 'sem tabela para virar card no mobile'
    }
  },
  {
    id: 'rhdp-relatorio-operacional',
    arquivo: 'src/pages/RhDpRelatorioOperacional.jsx',
    rota: '/rh-dp/relatorios/operacional',
    tipo: 'listagem'
  }
];

/** Itens da DoD, na ordem da matriz. */
export const ITENS_DOD = [
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6',
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7',
  'F1', 'F2', 'F3', 'F4',
  'B1', 'B2', 'B3', 'B4', 'B5',
  'M1', 'M2', 'M3', 'M4',
  'R1', 'R2',
  // Leva RH/DP (02/09): nenhuma caixa do navegador — aviso e confirmação
  // usam o componente do sistema.
  'R3',
  'X1', 'X2', 'X3',
  // Leva do componente (02/09): sticky sequestrado por overflow hidden e
  // acessibilidade por teclado da linha acionável.
  'R18', 'A1'
];
