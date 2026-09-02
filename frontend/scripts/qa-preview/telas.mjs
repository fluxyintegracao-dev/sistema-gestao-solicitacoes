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
    tipo: 'detalhe'
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
    tipo: 'detalhe'
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
  'X1', 'X2', 'X3'
];
