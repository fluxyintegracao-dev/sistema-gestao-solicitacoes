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
