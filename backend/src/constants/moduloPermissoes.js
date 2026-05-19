'use strict';

/**
 * Registro central de permissões de área por módulo.
 *
 * Regras:
 * - SUPERADMIN e ADMINISTRADOR têm bypass total — nunca são afetados.
 * - Se um usuário NÃO tiver entradas neste sistema → acesso completo ao que seu perfil já permite (backwards compat).
 * - Se um usuário TIVER entradas → somente as permissões listadas são concedidas.
 *
 * Chave de permissão: "modulo.area.acao" em minúsculo.
 * Exemplo: "financeiro.titulos.criar"
 */

const MODULO_PERMISSION_GROUPS = [
  {
    modulo: 'SOLICITACOES',
    label: 'Solicitações',
    descricao: 'Controle de criação, visualização e aprovação de solicitações operacionais.',
    areas: [
      {
        key: 'solicitacoes.lista',
        label: 'Lista de Solicitações',
        permissoes: [
          { key: 'solicitacoes.lista.visualizar_minhas', label: 'Ver suas próprias solicitações', descricao: 'Exibe somente solicitações criadas pelo próprio usuário.' },
          { key: 'solicitacoes.lista.visualizar_setor', label: 'Ver solicitações do setor', descricao: 'Exibe solicitações de todos os usuários do setor.' },
          { key: 'solicitacoes.lista.visualizar_todas', label: 'Ver todas as solicitações', descricao: 'Acesso irrestrito à lista completa.' }
        ]
      },
      {
        key: 'solicitacoes.acoes',
        label: 'Ações em Solicitações',
        permissoes: [
          { key: 'solicitacoes.acoes.criar', label: 'Criar solicitação', descricao: 'Permite abrir novas solicitações.' },
          { key: 'solicitacoes.acoes.aprovar', label: 'Aprovar / rejeitar', descricao: 'Permite aprovar ou rejeitar solicitações pendentes.' },
          { key: 'solicitacoes.acoes.ver_aba_financeiro', label: 'Ver aba Financeiro', descricao: 'Exibe a aba de títulos financeiros dentro de uma solicitação.' }
        ]
      },
      {
        key: 'solicitacoes.anexos',
        label: 'Anexos de Solicitações',
        permissoes: [
          { key: 'solicitacoes.anexos.excluir', label: 'Excluir anexos', descricao: 'Permite remover anexos do histórico de solicitações.' }
        ]
      },
      {
        key: 'solicitacoes.prioridades',
        label: 'Prioridades Diretoria',
        permissoes: [
          { key: 'solicitacoes.prioridades.visualizar', label: 'Visualizar lotes', descricao: 'Acessar os lotes de prioridade da diretoria conforme o escopo configurado.' },
          { key: 'solicitacoes.prioridades.criar', label: 'Criar lotes', descricao: 'Solicitar novos lotes de prioridade da diretoria.' },
          { key: 'solicitacoes.prioridades.finalizar', label: 'Finalizar lotes', descricao: 'Selecionar solicitações e finalizar lotes de prioridade.' },
          { key: 'solicitacoes.prioridades.cancelar', label: 'Cancelar lotes', descricao: 'Cancelar lotes abertos sem itens autorizados.' },
          { key: 'solicitacoes.prioridades.excluir', label: 'Excluir lotes', descricao: 'Excluir lotes sem solicitações autorizadas.' }
        ]
      }
    ]
  },
  {
    modulo: 'COMPRAS',
    label: 'Compras',
    descricao: 'Pedidos de compra, cotações e aprovações.',
    areas: [
      {
        key: 'compras.pedidos',
        label: 'Pedidos de Compra',
        permissoes: [
          { key: 'compras.pedidos.visualizar', label: 'Visualizar pedidos', descricao: 'Ver lista e detalhes de pedidos de compra.' },
          { key: 'compras.pedidos.criar', label: 'Criar pedidos', descricao: 'Gerar novos pedidos de compra.' },
          { key: 'compras.pedidos.aprovar', label: 'Aprovar pedidos', descricao: 'Avançar o status de pedidos no fluxo de aprovação.' },
          { key: 'compras.pedidos.auditoria', label: 'Auditoria de itens', descricao: 'Acessar o relatório de auditoria de itens dos pedidos.' }
        ]
      },
      {
        key: 'compras.cotacoes',
        label: 'Cotações',
        permissoes: [
          { key: 'compras.cotacoes.visualizar', label: 'Visualizar cotações', descricao: 'Ver cotações e comparativo de fornecedores.' },
          { key: 'compras.cotacoes.gerenciar', label: 'Gerenciar cotações', descricao: 'Criar, editar e encerrar cotações.' }
        ]
      }
    ]
  },
  {
    modulo: 'FINANCEIRO',
    label: 'Financeiro',
    descricao: 'Títulos, conciliação bancária, relatórios e cadastros financeiros.',
    areas: [
      {
        key: 'financeiro.titulos',
        label: 'Títulos Financeiros',
        permissoes: [
          { key: 'financeiro.titulos.visualizar', label: 'Visualizar títulos', descricao: 'Ver lista e detalhes dos títulos a pagar e a receber.' },
          { key: 'financeiro.titulos.criar', label: 'Criar conta manual', descricao: 'Abrir novo título financeiro manualmente.' },
          { key: 'financeiro.titulos.baixar', label: 'Registrar baixa / pagamento', descricao: 'Quitar ou baixar parcialmente um título.' },
          { key: 'financeiro.titulos.estornar', label: 'Estornar movimento', descricao: 'Reverter uma baixa ou pagamento registrado.' }
        ]
      },
      {
        key: 'financeiro.comprovantes',
        label: 'Comprovantes',
        permissoes: [
          { key: 'financeiro.comprovantes.excluir', label: 'Excluir comprovantes', descricao: 'Permite excluir comprovantes pendentes ou vinculados.' }
        ]
      },
      {
        key: 'financeiro.relatorios',
        label: 'Relatórios Financeiros',
        permissoes: [
          { key: 'financeiro.relatorios.visualizar', label: 'Visualizar relatórios', descricao: 'Acessar fluxo de caixa e relatórios gerenciais.' },
          { key: 'financeiro.relatorios.resultado_obras', label: 'Resultado de obras', descricao: 'Ver dashboard financeiro por obra.' }
        ]
      },
      {
        key: 'financeiro.conciliacao',
        label: 'Conciliação OFX',
        permissoes: [
          { key: 'financeiro.conciliacao.visualizar', label: 'Visualizar conciliação', descricao: 'Ver movimentos e sugestões de conciliação bancária.' },
          { key: 'financeiro.conciliacao.importar', label: 'Importar arquivo OFX', descricao: 'Fazer upload de extratos bancários em formato OFX.' },
          { key: 'financeiro.conciliacao.conciliar', label: 'Conciliar lançamentos', descricao: 'Confirmar, criar título ou ignorar movimentos bancários.' }
        ]
      },
      {
        key: 'financeiro.cadastros',
        label: 'Cadastros Financeiros',
        permissoes: [
          { key: 'financeiro.cadastros.visualizar', label: 'Visualizar cadastros', descricao: 'Ver contas bancárias e categorias financeiras.' },
          { key: 'financeiro.cadastros.gerenciar', label: 'Gerenciar cadastros', descricao: 'Criar e editar contas bancárias e categorias.' }
        ]
      },
      {
        key: 'financeiro.pagamentos',
        label: 'Pagamentos em Massa',
        permissoes: [
          { key: 'financeiro.pagamentos.visualizar', label: 'Visualizar pagamentos', descricao: 'Ver lotes, intents e status bancario.' },
          { key: 'financeiro.pagamentos.preparar', label: 'Preparar lotes', descricao: 'Selecionar titulos elegiveis e criar lotes de pagamento.' },
          { key: 'financeiro.pagamentos.aprovar', label: 'Aprovar lotes', descricao: 'Aprovar ou rejeitar lotes conforme alcada.' },
          { key: 'financeiro.pagamentos.enviar_banco', label: 'Enviar ao banco', descricao: 'Enviar lote aprovado para o provider bancario.' },
          { key: 'financeiro.pagamentos.cancelar', label: 'Cancelar pagamentos', descricao: 'Cancelar lotes ou itens antes do envio definitivo.' },
          { key: 'financeiro.pagamentos.reprocessar', label: 'Reprocessar falhas', descricao: 'Reprocessar jobs ou retornos elegiveis.' },
          { key: 'financeiro.pagamentos.confirmar_baixa', label: 'Confirmar baixa', descricao: 'Confirmar baixa semiautomatica apos confirmacao bancaria.' },
          { key: 'financeiro.pagamentos.auditar', label: 'Auditar pagamentos', descricao: 'Consultar logs tecnicos, aprovacoes e eventos bancarios.' },
          { key: 'financeiro.pagamentos.configurar', label: 'Configurar pagamentos', descricao: 'Gerenciar providers e contas pagadoras.' }
        ]
      },
      {
        key: 'financeiro.favorecidos',
        label: 'Favorecidos Bancarios',
        permissoes: [
          { key: 'financeiro.favorecidos.visualizar', label: 'Visualizar favorecidos', descricao: 'Ver dados bancarios/PIX de favorecidos.' },
          { key: 'financeiro.favorecidos.gerenciar', label: 'Gerenciar favorecidos', descricao: 'Criar, editar, validar, ativar e desativar favorecidos.' },
          { key: 'financeiro.favorecidos.auditar', label: 'Auditar favorecidos', descricao: 'Ver historico de alteracoes sensiveis em favorecidos.' }
        ]
      }
    ]
  },
  {
    modulo: 'BOLETOS',
    label: 'Boletos',
    descricao: 'Emissao de boletos bancarios a partir de titulos financeiros a receber.',
    areas: [
      {
        key: 'boletos.emitir',
        label: 'Emissao de Boletos',
        permissoes: [
          { key: 'boletos.emitir.visualizar', label: 'Visualizar boletos', descricao: 'Ver titulos elegiveis e boletos ja emitidos.' },
          { key: 'boletos.emitir.gerar', label: 'Gerar boleto', descricao: 'Gerar codigo de barras, linha digitavel e ficha de compensacao.' }
        ]
      }
    ]
  },
  {
    modulo: 'FISCAL',
    label: 'Fiscal',
    descricao: 'Entrada fiscal, documentos fiscais, configuracoes e logs de sincronizacao.',
    areas: [
      {
        key: 'fiscal.geral',
        label: 'Acesso Fiscal',
        permissoes: [
          { key: 'fiscal.view', label: 'Acessar modulo fiscal', descricao: 'Exibe o menu e o painel inicial do modulo Fiscal.' }
        ]
      },
      {
        key: 'fiscal.config',
        label: 'Configuracoes Fiscais',
        permissoes: [
          { key: 'fiscal.config.manage', label: 'Gerenciar configuracoes fiscais', descricao: 'Cadastrar empresas fiscais e parametrizacoes iniciais do modulo.' }
        ]
      },
      {
        key: 'fiscal.document',
        label: 'Documentos Fiscais',
        permissoes: [
          { key: 'fiscal.document.view', label: 'Visualizar documentos fiscais', descricao: 'Consultar caixa de entrada e detalhes de documentos fiscais.' },
          { key: 'fiscal.document.upload', label: 'Importar XML fiscal', descricao: 'Importar XML fiscal manualmente para a caixa fiscal.' },
          { key: 'fiscal.document.link', label: 'Vincular documentos fiscais', descricao: 'Preparar vinculos manuais entre documentos fiscais e outros modulos.' },
          { key: 'fiscal.document.ignore', label: 'Ignorar documentos fiscais', descricao: 'Marcar documentos fiscais como ignorados na caixa fiscal.' }
        ]
      },
      {
        key: 'fiscal.sync',
        label: 'Sincronizacao Fiscal',
        permissoes: [
          { key: 'fiscal.sync.view', label: 'Visualizar sincronizacao', descricao: 'Consultar estado de NSU e sincronizacoes fiscais.' },
          { key: 'fiscal.sync.run', label: 'Executar sincronizacao manual', descricao: 'Iniciar tentativa manual controlada de sincronizacao fiscal em DEV.' },
          { key: 'fiscal.logs.view', label: 'Visualizar logs fiscais', descricao: 'Consultar logs de processamento e auditoria tecnica fiscal.' }
        ]
      }
    ]
  },
  {
    modulo: 'OBRAS',
    label: 'Obras',
    descricao: 'Cadastro e gestão de obras.',
    areas: [
      {
        key: 'obras.cadastro',
        label: 'Cadastro de Obras',
        permissoes: [
          { key: 'obras.cadastro.visualizar', label: 'Visualizar obras', descricao: 'Ver lista de obras e informações básicas.' },
          { key: 'obras.cadastro.gerenciar', label: 'Criar e editar obras', descricao: 'Cadastrar novas obras e editar existentes.' }
        ]
      },
      {
        key: 'obras.gestao',
        label: 'Gestão de Obras',
        permissoes: [
          { key: 'obras.gestao.visualizar', label: 'Visualizar gestão', descricao: 'Acessar o dashboard de gestão por obra (orçado, executado, solicitações).' },
          { key: 'obras.gestao.apropriacoes', label: 'Gerenciar apropriações', descricao: 'Criar e editar apropriações orçamentárias por obra.' }
        ]
      }
    ]
  },
  {
    modulo: 'CONTRATOS',
    label: 'Contratos',
    descricao: 'Gestão de contratos com fornecedores e parceiros.',
    areas: [
      {
        key: 'contratos.geral',
        label: 'Contratos',
        permissoes: [
          { key: 'contratos.geral.visualizar', label: 'Visualizar contratos', descricao: 'Ver lista e detalhes de contratos.' },
          { key: 'contratos.geral.criar', label: 'Criar contratos', descricao: 'Abrir novos contratos.' },
          { key: 'contratos.geral.editar', label: 'Editar contratos', descricao: 'Alterar dados e status de contratos existentes.' }
        ]
      }
    ]
  },
  {
    modulo: 'COMERCIAL',
    label: 'Comercial',
    descricao: 'Empreendimentos, unidades, vendas e contratos comerciais.',
    areas: [
      {
        key: 'comercial.empreendimentos',
        label: 'Empreendimentos e Unidades',
        permissoes: [
          { key: 'comercial.empreendimentos.visualizar', label: 'Visualizar empreendimentos', descricao: 'Ver empreendimentos e disponibilidade de unidades.' },
          { key: 'comercial.empreendimentos.gerenciar', label: 'Gerenciar empreendimentos', descricao: 'Criar e editar empreendimentos e unidades.' }
        ]
      },
      {
        key: 'comercial.vendas',
        label: 'Vendas e Contratos',
        permissoes: [
          { key: 'comercial.vendas.visualizar', label: 'Visualizar vendas', descricao: 'Ver propostas, vendas e contratos comerciais.' },
          { key: 'comercial.vendas.criar', label: 'Criar proposta/venda', descricao: 'Registrar novas propostas e vendas.' },
          { key: 'comercial.vendas.contratos', label: 'Gerenciar contratos comerciais', descricao: 'Emitir e gerenciar contratos de venda.' }
        ]
      }
    ]
  },
  {
    modulo: 'CRM',
    label: 'CRM',
    descricao: 'Leads, atendimento, tarefas, dashboards, automacoes e configuracoes comerciais.',
    areas: [
      {
        key: 'crm.dashboard',
        label: 'Dashboards CRM',
        permissoes: [
          { key: 'crm.dashboard.visualizar', label: 'Visualizar dashboards', descricao: 'Acessar dashboards operacional, gerencial, SLA e distribuicao.' }
        ]
      },
      {
        key: 'crm.leads',
        label: 'Leads e Pipeline',
        permissoes: [
          { key: 'crm.leads.visualizar', label: 'Visualizar leads', descricao: 'Ver listas, kanban, carteira, tarefas e detalhes de leads.' },
          { key: 'crm.leads.criar', label: 'Criar e editar leads', descricao: 'Criar leads, alterar etapas, registrar interacoes e tarefas.' },
          { key: 'crm.leads.exportar', label: 'Exportar leads', descricao: 'Exportar base de leads em relatorios.' },
          { key: 'crm.leads.redistribuir', label: 'Redistribuir leads', descricao: 'Redistribuir responsaveis e operar fila de distribuicao.' }
        ]
      },
      {
        key: 'crm.atendimento',
        label: 'Atendimento CRM',
        permissoes: [
          { key: 'crm.atendimento.visualizar', label: 'Visualizar conversas', descricao: 'Acessar inbox e historico de conversas.' },
          { key: 'crm.atendimento.enviar', label: 'Enviar mensagens', descricao: 'Criar conversas, mensagens e templates.' }
        ]
      },
      {
        key: 'crm.automacoes',
        label: 'Automacoes CRM',
        permissoes: [
          { key: 'crm.automacoes.visualizar', label: 'Visualizar automacoes', descricao: 'Ver regras e execucoes de automacao.' },
          { key: 'crm.automacoes.gerenciar', label: 'Gerenciar automacoes', descricao: 'Criar, editar, ativar e executar automacoes.' }
        ]
      },
      {
        key: 'crm.configuracoes',
        label: 'Configuracoes CRM',
        permissoes: [
          { key: 'crm.configuracoes.visualizar', label: 'Visualizar configuracoes', descricao: 'Ver canais, numeros e integracoes.' },
          { key: 'crm.configuracoes.gerenciar', label: 'Gerenciar configuracoes', descricao: 'Criar, editar e remover canais, numeros e integracoes.' }
        ]
      }
    ]
  },
  {
    modulo: 'RH_DP',
    label: 'RH/DP',
    descricao: 'Colaboradores, documentos, importacoes, apuracoes e fechamentos.',
    areas: [
      {
        key: 'rh_dp.dashboard',
        label: 'Dashboard RH/DP',
        permissoes: [
          { key: 'rh_dp.dashboard.visualizar', label: 'Visualizar dashboard', descricao: 'Abrir a visao inicial do modulo RH/DP.' }
        ]
      },
      {
        key: 'rh_dp.empresas',
        label: 'Empresas do Grupo',
        permissoes: [
          { key: 'rh_dp.empresas.gerenciar', label: 'Gerenciar empresas', descricao: 'Criar e editar empresas do grupo usadas no RH/DP.' }
        ]
      },
      {
        key: 'rh_dp.colaboradores',
        label: 'Colaboradores',
        permissoes: [
          { key: 'rh_dp.colaboradores.visualizar', label: 'Visualizar colaboradores', descricao: 'Listar e detalhar colaboradores.' },
          { key: 'rh_dp.colaboradores.editar', label: 'Editar colaboradores', descricao: 'Cadastrar, editar e importar colaboradores.' }
        ]
      },
      {
        key: 'rh_dp.documentos',
        label: 'Documentos',
        permissoes: [
          { key: 'rh_dp.documentos.visualizar', label: 'Visualizar documentos', descricao: 'Consultar documentos, pendencias e links assinados.' },
          { key: 'rh_dp.documentos.gerenciar', label: 'Gerenciar documentos', descricao: 'Enviar, substituir e atualizar documentos.' }
        ]
      },
      {
        key: 'rh_dp.importacoes',
        label: 'Importacoes',
        permissoes: [
          { key: 'rh_dp.importacoes.executar', label: 'Executar importacoes', descricao: 'Subir planilhas, gerar preview e confirmar lotes.' }
        ]
      },
      {
        key: 'rh_dp.apuracao',
        label: 'Apuracao',
        permissoes: [
          { key: 'rh_dp.apuracao.visualizar', label: 'Visualizar apuracoes', descricao: 'Listar e detalhar apuracoes.' },
          { key: 'rh_dp.apuracao.editar', label: 'Editar apuracoes', descricao: 'Gerar apuracao, ajustar itens e concluir conferencia.' }
        ]
      },
      {
        key: 'rh_dp.fechamento',
        label: 'Fechamentos',
        permissoes: [
          { key: 'rh_dp.fechamento.executar', label: 'Fechar competencia', descricao: 'Fechar competencia e gerar titulos no financeiro.' },
          { key: 'rh_dp.fechamento.reabrir', label: 'Reabrir fechamento', descricao: 'Reabrir competencias fechadas quando necessario.' },
          { key: 'rh_dp.obrigacoes.visualizar', label: 'Visualizar obrigacoes', descricao: 'Acessar fechamentos e titulos gerados.' }
        ]
      }
    ]
  },
  {
    modulo: 'INTEGRACAO_SIENGE',
    label: 'Integracao SIENGE',
    descricao: 'Fila, logs, reprocessamentos, credores e configuracao da integracao SIENGE.',
    areas: [
      {
        key: 'integracao_sienge.geral',
        label: 'Operacao SIENGE',
        permissoes: [
          { key: 'integracao_sienge.geral.visualizar', label: 'Visualizar fila e logs', descricao: 'Consultar status, fila, saude, prontidao e logs.' },
          { key: 'integracao_sienge.geral.reprocessar', label: 'Operar fila', descricao: 'Enviar titulos, buscar credores e reprocessar falhas.' },
          { key: 'integracao_sienge.geral.configurar', label: 'Configurar integracao', descricao: 'Editar endpoint, defaults, credores e parametros da integracao.' }
        ]
      }
    ]
  },
  {
    modulo: 'PROVISOES',
    label: 'Provisionamento',
    descricao: 'Previsao gerencial de desembolso, dashboard e acompanhamento de provisoes por obra.',
    areas: [
      {
        key: 'provisoes.lista',
        label: 'Provisionamentos',
        permissoes: [
          { key: 'provisoes.lista.visualizar', label: 'Visualizar provisionamentos', descricao: 'Ver a lista e o detalhe das provisoes financeiras.' },
          { key: 'provisoes.cadastro.criar', label: 'Criar provisoes', descricao: 'Registrar novas provisoes financeiras.' },
          { key: 'provisoes.cadastro.editar', label: 'Editar provisoes', descricao: 'Editar dados, comentarios e anexos das provisoes.' }
        ]
      },
      {
        key: 'provisoes.dashboard',
        label: 'Dashboard de Previsao',
        permissoes: [
          { key: 'provisoes.dashboard.visualizar', label: 'Visualizar dashboard', descricao: 'Acessar a leitura gerencial de previsao por obra, periodo e categoria.' }
        ]
      },
      {
        key: 'provisoes.categorias',
        label: 'Categorias Macro',
        permissoes: [
          { key: 'provisoes.categorias.gerenciar', label: 'Gerenciar categorias macro', descricao: 'Criar, editar, ativar e desativar categorias macro do modulo.' }
        ]
      }
    ]
  },
  {
    modulo: 'BIBLIOTECA_MODELOS',
    label: 'Biblioteca de Modelos',
    descricao: 'Arquivos e documentos modelo compartilhados.',
    areas: [
      {
        key: 'biblioteca.geral',
        label: 'Biblioteca',
        permissoes: [
          { key: 'biblioteca.geral.visualizar', label: 'Visualizar arquivos', descricao: 'Baixar e consultar arquivos da biblioteca.' },
          { key: 'biblioteca.geral.gerenciar', label: 'Gerenciar arquivos', descricao: 'Fazer upload e excluir arquivos da biblioteca.' }
        ]
      }
    ]
  },
  {
    modulo: 'COMUNICACAO_INTERNA',
    label: 'Comunicação Interna',
    descricao: 'Mensagens e avisos internos entre usuários.',
    areas: [
      {
        key: 'comunicacao.geral',
        label: 'Comunicação',
        permissoes: [
          { key: 'comunicacao.geral.visualizar', label: 'Visualizar mensagens', descricao: 'Ler mensagens e avisos recebidos.' },
          { key: 'comunicacao.geral.enviar', label: 'Enviar mensagens', descricao: 'Criar e enviar mensagens para outros usuários ou grupos.' }
        ]
      }
    ]
  }
];

/**
 * Lista plana de todas as chaves de permissão para normalização.
 */
const ALL_PERMISSION_KEYS = new Set(
  MODULO_PERMISSION_GROUPS.flatMap((m) =>
    m.areas.flatMap((a) =>
      a.permissoes.map((p) => p.key.toLowerCase())
    )
  )
);

function normalizeModuloPermissaoKey(key) {
  return String(key || '').trim().toLowerCase();
}

function normalizeModuloPermissaoList(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(
    list
      .map(normalizeModuloPermissaoKey)
      .filter((k) => k && ALL_PERMISSION_KEYS.has(k))
  )];
}

module.exports = {
  MODULO_PERMISSION_GROUPS,
  ALL_PERMISSION_KEYS,
  normalizeModuloPermissaoKey,
  normalizeModuloPermissaoList
};
