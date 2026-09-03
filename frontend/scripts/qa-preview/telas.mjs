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
 * - semDado: { ITEM: 'motivo' } — SEM DADO registrado (03/09): a tela TEM a
 *   capacidade e o harness a exercitaria, mas o ambiente compartilhado não
 *   oferece o registro necessário e o harness é SOMENTE LEITURA (não cria,
 *   não altera, não apaga). NÃO É APROVAÇÃO e não vira aprovação por
 *   equivalência com outra tela — é lacuna de evidência, declarada.
 * - semSessao: true — medida em contexto anônimo, sem login. É o caso das
 *   telas fora do shell, que existem justamente para quem não está logado.
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
  /*
    CATEGORIA "TELAS COMPARTILHADAS" (03/09) — ver docs/TELAS-COMPARTILHADAS.md.

    Oito telas do sistema não pertencem a leva de módulo nenhuma: duas são
    servidas por VÁRIOS módulos (ModuloRelatorios por nove; Relatórios
    Administrativos por dois), duas têm uma segunda família de rota fora do
    menu, e quatro renderizam fora do shell (login, recuperação e definição
    de senha, e a cotação pública do fornecedor). Organizado por módulo, o
    inventário não reivindicava nenhuma delas — escapavam de todas as levas.
    Entram no manifesto na leva própria; as de fora do shell só depois de
    ganharem DoD própria, porque a régua atual pressupõe topbar, menu e
    breadcrumb.

    A primeira delas — retirada deste manifesto em 02/09, com justificativa
    (decisão do cliente).

    `/rh-dp/relatorios` renderiza `ModuloRelatorios.jsx`, que é um hub
    COMPARTILHADO por seis módulos (solicitações, financeiro, CRM, SST,
    comercial e RH/DP) — cada um com seu próprio bloco de configuração
    dentro do mesmo arquivo. Ele nunca foi migrado: não usa `Pagina`,
    `PageHeader` nem `.app-bloco`; é Tailwind à mão.

    Eu a coloquei no manifesto por engano ao abrir a Etapa B: a rota começa
    com /rh-dp, mas o arquivo não é do RH/DP e ninguém o reescreveu nesta
    leva. O resultado foram cinco células FALHOU (C1, C2, C5, B1, X2) que
    não pertenciam à leva e que a matriz apresentava como se pertencessem.

    Reescrevê-la muda a cara dos relatórios de TODOS os módulos ao mesmo
    tempo — é leva própria, não um apêndice do RH/DP. Volta ao manifesto
    quando essa leva acontecer. Enquanto isso, fica registrado em
    docs/PENDENCIAS-REGISTRADAS.md, com um achado extra: o título renderiza
    "Relatorios de RH/DP", ou seja, o prefixo que a D7 mandou tirar
    sobrevive nesta tela por ela estar fora do escopo.
  */
  {
    id: 'rhdp-relatorio-operacional',
    arquivo: 'src/pages/RhDpRelatorioOperacional.jsx',
    rota: '/rh-dp/relatorios/operacional',
    tipo: 'listagem'
  },

  /* =================================================================
     TELAS COMPARTILHADAS (leva de 03/09) — categoria própria.
     Servidas por VÁRIOS módulos, ou por nenhum. Não pertencem a leva de
     módulo nenhuma e por isso escapavam de todas — o ponto cego exposto
     quando a ModuloRelatorios entrou por engano no manifesto do RH/DP.
     Dono: leva-compartilhadas. Ver docs/TELAS-COMPARTILHADAS.md.
     ================================================================= */

  {
    id: 'modulo-relatorios',
    arquivo: 'src/pages/ModuloRelatorios.jsx',
    // Um arquivo, nove módulos. A rota do RH/DP é a que o usuário de QA
    // alcança; as outras oito renderizam o MESMO componente com outro
    // bloco de configuração.
    rota: '/rh-dp/relatorios',
    tipo: 'mista',
    naoAplica: {
      F1: 'hub de cartões: não há listagem com recorte',
      F2: 'idem F1',
      F3: 'idem F1',
      F4: 'idem F1',
      C3: 'hub de entrada do módulo, não é tela de detalhe',
      C4: 'idem C3'
    }
  },
  {
    id: 'relatorios-administrativos',
    arquivo: 'src/pages/RelatoriosAdministrativos.jsx',
    rota: '/relatorios/administrativos',
    tipo: 'listagem'
  },
  {
    id: 'comunicacao-interna',
    arquivo: 'src/pages/ComunicacaoInterna.jsx',
    rota: '/comunicacao-interna',
    tipo: 'mista',
    naoAplica: {
      C3: 'painel de trabalho em duas colunas, não é tela de detalhe com retorno hierárquico',
      C4: 'idem C3'
    }
  },
  {
    id: 'config-contrato-alertas-formas',
    arquivo: 'src/pages/ConfiguracoesContratoAlertasEFormas.jsx',
    // A rota do MENU. A irmã (/configuracoes-contrato-alertas) não tem
    // entrada nenhuma na interface — registrado como E2 em
    // docs/PENDENCIAS-REGISTRADAS.md.
    rota: '/configuracoes-formas-pagamento-solicitacao',
    tipo: 'form',
    naoAplica: {
      F1: 'tela de configuração: não há listagem com recorte',
      F2: 'idem F1',
      F3: 'idem F1',
      F4: 'idem F1',
      C3: 'configuração de sistema, não é tela de detalhe de registro',
      C4: 'idem C3'
    }
  },

  /* =================================================================
     FORA DO SHELL — renderizam sem o Layout: sem topbar, sem menu, sem
     breadcrumb. Medidas em SESSÃO ANÔNIMA (semSessao), porque é assim
     que o usuário real as vê. DoD própria: docs/DEFINICAO-DE-PRONTO.md,
     seção "TELAS FORA DO SHELL".

     O que sai (C1/C2/C3/X2/F1–F4) sai porque pressupõe o shell. O que
     INVERTE (C6/R11) está declarado como ESCOPO da regra, não exceção:
     ali o link de navegação é a única saída e é obrigatório.
     ================================================================= */

  {
    id: 'login',
    arquivo: 'src/pages/Login/index.jsx',
    rota: '/login',
    tipo: 'form',
    semSessao: true,
    naoAplica: {
      C1: 'fora do shell: não há topbar para a faixa grudar',
      C2: 'idem C1',
      C3: 'não é tela de detalhe',
      C4: 'idem C3',
      C6: 'ESCOPO da R11 (03/09): sem menu e sem breadcrumb, "Esqueci minha senha" é a única navegação e é obrigatória',
      X2: 'idem C1',
      F1: 'não há listagem', F2: 'não há listagem', F3: 'não há listagem', F4: 'não há listagem'
    }
  },
  {
    id: 'recuperar-senha',
    arquivo: 'src/pages/RecuperarSenha.jsx',
    rota: '/recuperar-senha',
    tipo: 'form',
    semSessao: true,
    naoAplica: {
      C1: 'fora do shell: não há topbar para a faixa grudar',
      C2: 'idem C1',
      C3: 'não é tela de detalhe',
      C4: 'idem C3',
      C6: 'ESCOPO da R11 (03/09): "Voltar ao login" é a única navegação disponível e é obrigatória',
      X2: 'idem C1',
      F1: 'não há listagem', F2: 'não há listagem', F3: 'não há listagem', F4: 'não há listagem'
    }
  },
  {
    id: 'definir-senha',
    arquivo: 'src/pages/DefinirSenha.jsx',
    // SEM token na URL — de propósito. O harness é SOMENTE LEITURA e não
    // dispara e-mail de recuperação para conseguir um token válido. Então
    // o que se mede aqui é o estado "endereço veio sem o código do link",
    // que é um estado REAL e importante. O formulário preenchido fica
    // NÃO PROVADO, e isso está declarado abaixo — não vira PASSOU por
    // equivalência com a tela irmã.
    rota: '/definir-senha',
    tipo: 'form',
    semSessao: true,
    naoAplica: {
      C1: 'fora do shell: não há topbar para a faixa grudar',
      C2: 'idem C1',
      C3: 'não é tela de detalhe',
      C4: 'idem C3',
      X2: 'idem C1',
      F1: 'não há listagem', F2: 'não há listagem', F3: 'não há listagem', F4: 'não há listagem'
    },
    semDado: {
      R1: 'medida SEM token na URL: o harness não dispara e-mail de recuperação no ambiente compartilhado (somente leitura). O formulário de senha habilitado, as etiquetas de requisito ao vivo e o caminho de sucesso NÃO FORAM PROVADOS',
      R2: 'idem R1: os campos de senha ficam desabilitados no estado sem token',
      A1: 'idem R1: o percurso de teclado pelo formulário habilitado não foi exercitado'
    }
  },
  {
    id: 'cotacao-publica',
    arquivo: 'src/modules/solicitacao-compra/pages/CotacaoFornecedorPublica.jsx',
    // Token inválido de propósito, pelo mesmo motivo da definir-senha: um
    // token válido só existe criando/abrindo cotação no ambiente
    // compartilhado, e o harness não cria registro. O estado medido é o
    // "este link não abre mais uma cotação em aberto" — que é justamente
    // o texto que esta leva reescreveu, e o que mais aparece na vida real
    // (link copiado pela metade, prazo vencido).
    rota: '/cotacao/harness-sem-token-valido',
    tipo: 'form',
    semSessao: true,
    naoAplica: {
      C1: 'fora do shell: não há topbar para a faixa grudar',
      C2: 'idem C1',
      C3: 'não é tela de detalhe',
      C4: 'idem C3',
      X2: 'idem C1',
      F1: 'não há listagem com recorte', F2: 'idem F1', F3: 'idem F1', F4: 'idem F1'
    },
    semDado: {
      T1: 'medida com token INVÁLIDO: um token válido só existe criando ou abrindo cotação no ambiente compartilhado, e o harness não cria registro. A tabela de itens NÃO FOI PROVADA',
      T2: 'idem T1', T3: 'idem T1', T4: 'idem T1', T5: 'idem T1', T6: 'idem T1', T7: 'idem T1',
      X1: 'idem T1: a virada da tabela para cards em 390px não foi exercitada',
      R1: 'idem T1: o formulário de proposta não renderiza sem cotação carregada',
      R2: 'idem T1',
      A1: 'idem T1: o percurso de teclado pelo formulário e pelo anexo não foi exercitado',
      B4: 'idem T1: os campos de contexto (fornecedor, obra, situação) não renderizam sem cotação'
    }
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
