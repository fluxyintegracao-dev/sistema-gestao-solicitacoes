# Inventário de tabelas e listas tabulares do frontend

> Gerado em 2026-09-02 na branch `refactor/frontend`, varrendo todos os `.jsx` de `frontend/src/pages`, `frontend/src/modules` e `frontend/src/components` em busca de `<table>`, `TabelaPadrao`, `ListaAvancada`, `ResizableTable` e listas tabulares caseiras. Este documento é o backlog de migração das próximas levas.

## Resumo

- **Arquivos com tabela/lista tabular:** 135 (excluídos os 3 componentes de infraestrutura: `TabelaPadrao`, `ListaAvancada`, `ResizableTable`)
- **Já no padrão (TabelaPadrao/ListaAvancada, redimensionar + menu de alinhamento):** 12
- **Exceções registradas no manifesto (`excecoes_tabela_crua`):** 1 — `ObraTipoApropriacao.jsx`
- **A migrar:** 117 arquivos — sendo 12 casos técnicos que precisam de decisão do cliente antes da migração (marcados na coluna Situação)
  - 28 usam só `ResizableTable` direto (têm redimensionamento; falta só o menu de alinhamento — troca direta por `TabelaPadrao`/`ListaAvancada`)
  - 81 usam só `<table>` crua (sem redimensionamento nem alinhamento)
  - 8 misturam componentes (parte já em `ResizableTable`/`ListaAvancada`, parte crua)
- **Código morto (têm tabela, mas nenhuma rota/uso os referencia):** 5 — avaliar remoção em vez de migração

### Casos técnicos que precisam de decisão do cliente

- `frontend/src/pages/ObraTipoApropriacao.jsx` *(exceção já registrada no manifesto)*: pivô de colunas dinâmicas com painel expansível por célula
- `frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx`: matriz de cotação com colunas dinâmicas por fornecedor e 13 campos de edição inline
- `frontend/src/modules/solicitacao-compra/pages/CotacaoFornecedorPublica.jsx`: tela pública (sem login, layout próprio) com edição inline de preços pelo fornecedor
- `frontend/src/pages/RhDpImportacoes.jsx`: preview de importação com colunas dinâmicas vindas do arquivo importado
- `frontend/src/pages/FinanceiroConciliacao.jsx`: duas tabelas espelhadas lado a lado (extrato x sistema) com seleção cruzada para conciliar
- `frontend/src/pages/FinanceiroDre.jsx`: árvore de DRE com linhas expansíveis e sub-tabela embutida via colSpan dentro das linhas
- `frontend/src/pages/SolicitacoesRelatorioOperacional.jsx`: heatmap em CSS grid com colunas dinâmicas por status (as 11 ResizableTable migram normalmente)
- `frontend/src/pages/Solicitacoes/TabelaSolicitacoes.jsx`: tabela principal do sistema com redimensionamento próprio integrado à ListaAvancada — unificar exige cuidado extra
- `frontend/src/modules/custosRecebiveis/components/CrPlanejamentoView.jsx`: planejamento com 9 campos de edição inline e agrupamento macro/subitens em 4 tabelas
- `frontend/src/modules/solicitacao-compra/pages/NovaSolicitacaoCompra.jsx`: grade de itens com 8 campos de edição inline (entrada de dados, não listagem)
- `frontend/src/pages/ComercialContratos.jsx`: geração/edição de parcelas com 7 campos inline dentro da tabela
- `frontend/src/pages/RhDpJornada.jsx`: ResizableTable com 6 campos de edição inline de jornada
- `frontend/src/pages/FinanceiroChequesTerceiros.jsx`: tabelas com 6 campos de edição inline (dados do cheque)

### Legenda

- **Redimensionar? / Alinhamento?**: o que a tela oferece hoje. `TabelaPadrao`/`ListaAvancada` dão os dois; `ResizableTable` direto dá só redimensionamento; `<table>` crua não dá nenhum.
- **Situação**: `OK (padrão)` = já usa TabelaPadrao/ListaAvancada; `MIGRAR` = entra no backlog das levas; `EXCEÇÃO REGISTRADA` = tabela crua aceita e documentada em `frontend/scripts/telas-reformadas.json` (`excecoes_tabela_crua`).

## 1. Telas do manifesto (já reformadas — `frontend/scripts/telas-reformadas.json`)

| Arquivo | Tela/rota | Nº de tabelas | Componente usado | Redimensionar? | Alinhamento? | Situação |
|---|---|---|---|---|---|---|
| `frontend/src/pages/Usuarios.jsx` | `/usuarios` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/UsuarioNovo.jsx` | `/usuarios/novo`, `/usuarios/:id`, `/usuarios/:id/editar` | 0 | — (sem tabela) | — | — | OK (padrão — tela sem tabela) |
| `frontend/src/pages/Parceiros.jsx` | `/parceiros` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/ParceiroCategorias.jsx` | `/parceiros-categorias` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/FinanceiroTituloDetalhe.jsx` | `/financeiro/titulos/:id` | 0 | — (sem tabela) | — | — | OK (padrão — tela sem tabela) |
| `frontend/src/pages/Obras.jsx` | `/obras` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/ObraGestao.jsx` | `/obras/:id` | 5 | TabelaPadrao (5) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/ObraTipoApropriacao.jsx` | `/obra-tipo-apropriacao` | 1 | `<table>` crua (1) | Não | Não | EXCEÇÃO REGISTRADA (pivô de colunas dinâmicas com painel expansível por célula — `excecoes_tabela_crua` do manifesto) |
| `frontend/src/pages/Setores.jsx` | `/setores` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/TiposSolicitacao.jsx` | `/tipos-solicitacao` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/TiposSubContrato.jsx` | `/tipos-sub-contrato` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/EmpresasGrupo.jsx` | `/empresas-grupo` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/AreasObra.jsx` | `/areas-obra` | 0 | — (sem tabela) | — | — | OK (padrão — tela sem tabela) |
| `frontend/src/pages/SetoresVisiveisUsuario.jsx` | `/setores-visiveis-usuario` | 0 | — (sem tabela) | — | — | OK (padrão — tela sem tabela) |
| `frontend/src/pages/TiposSolicitacaoPorSetor.jsx` | `/tipos-solicitacao-por-setor` | 0 | — (sem tabela) | — | — | OK (padrão — tela sem tabela) |
| `frontend/src/pages/TiposCompartilhadosSetor.jsx` | `/tipos-compartilhados-setor` | 0 | — (sem tabela) | — | — | OK (padrão — tela sem tabela) |
| `frontend/src/pages/SetoresCriacaoTodasObras.jsx` | `/setores-criacao-todas-obras` | 0 | — (sem tabela) | — | — | OK (padrão — tela sem tabela) |
| `frontend/src/pages/SetoresAcessoTodasObras.jsx` | `/setores-acesso-todas-obras` | 0 | — (sem tabela) | — | — | OK (padrão — tela sem tabela) |
| `frontend/src/pages/UsuariosEnvioQualquerSetor.jsx` | `/usuarios-envio-qualquer-setor` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/UsuariosAcessoFinanceiro.jsx` | `/usuarios-acesso-financeiro` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/UsuariosAcessoPrioridadeDiretoria.jsx` | `/usuarios-acesso-prioridade-diretoria` | 1 | TabelaPadrao (1) | Sim | Sim | OK (padrão) |
| `frontend/src/pages/UsuariosPermissoesRhDp.jsx` | `/usuarios-permissoes-rh-dp` | 0 | — (sem tabela) | — | — | OK (padrão — tela sem tabela) |

> 9 telas do manifesto não têm tabela (formulários/listas de marcação) e aparecem acima apenas para fechar as 22.

## 2. RH/DP

| Arquivo | Tela/rota | Nº de tabelas | Componente usado | Redimensionar? | Alinhamento? | Situação |
|---|---|---|---|---|---|---|
| `frontend/src/pages/RhDpApuracao.jsx` | `/rh-dp/apuracao` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/pages/RhDpColaboradores.jsx` | `/rh-dp/colaboradores` | 2 | ResizableTable (1) + `<table>` crua (1) | Parcial | Não | MIGRAR |
| `frontend/src/pages/RhDpDocumentos.jsx` | `/rh-dp/documentos` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/RhDpEmpresas.jsx` | `/rh-dp/empresas` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/RhDpFechamentos.jsx` | `/rh-dp/fechamentos` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/pages/RhDpImportacoes.jsx` | `/rh-dp/importacoes` | 2 | `<table>` crua (2) | Não | Não | MIGRAR — decisão do cliente: preview de importação com colunas dinâmicas vindas do arquivo importado |
| `frontend/src/pages/RhDpJornada.jsx` | `/rh-dp/jornada` | 1 | ResizableTable (1) | Sim | Não | MIGRAR — decisão do cliente: ResizableTable com 6 campos de edição inline de jornada |
| `frontend/src/pages/RhDpPessoal.jsx` | `/rh-dp/pessoal` | 1 | ResizableTable (1) | Sim | Não | MIGRAR |
| `frontend/src/pages/RhDpPessoalSolicitacoes.jsx` | embutido em RhDpPessoal (`/rh-dp/pessoal`) | 1 | ResizableTable (1) | Sim | Não | MIGRAR |
| `frontend/src/pages/RhDpRelatorioOperacional.jsx` | `/rh-dp/relatorios/operacional` | 2 | ResizableTable (2) | Sim | Não | MIGRAR |
| `frontend/src/pages/Cargos.jsx` | sem rota/uso encontrado | 1 | `<table>` crua (1) | Não | Não | CÓDIGO MORTO (sem uso — avaliar remoção antes de migrar) |

## 3. Financeiro

| Arquivo | Tela/rota | Nº de tabelas | Componente usado | Redimensionar? | Alinhamento? | Situação |
|---|---|---|---|---|---|---|
| `frontend/src/pages/FinanceiroBaixas.jsx` | `/financeiro/baixas` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/FinanceiroBaixasCompostas.jsx` | `/financeiro/baixas-compostas` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/pages/FinanceiroBancos.jsx` | `/financeiro/bancos` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/pages/FinanceiroBoletos.jsx` | `/financeiro/boletos` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/pages/FinanceiroCaixas.jsx` | `/financeiro/caixas` | 2 | ResizableTable (2) | Sim | Não | MIGRAR |
| `frontend/src/pages/FinanceiroChequesTerceiros.jsx` | `/financeiro/cheques-terceiros` | 2 | `<table>` crua (2) | Não | Não | MIGRAR — decisão do cliente: tabelas com 6 campos de edição inline (dados do cheque) |
| `frontend/src/pages/FinanceiroConciliacao.jsx` | `/financeiro/conciliacao` | 2 | `<table>` crua (2) | Não | Não | MIGRAR — decisão do cliente: duas tabelas espelhadas lado a lado (extrato x sistema) com seleção cruzada para conciliar |
| `frontend/src/pages/FinanceiroDda.jsx` | `/financeiro/dda` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/pages/FinanceiroDre.jsx` | `/financeiro/relatorios/dre` | 6 | ResizableTable (5) + `<table>` crua (1) | Parcial | Não | MIGRAR — decisão do cliente: árvore de DRE com linhas expansíveis e sub-tabela embutida via colSpan dentro das linhas |
| `frontend/src/pages/FinanceiroEndividamento.jsx` | `/financeiro/relatorios/endividamento` | 4 | ResizableTable (4) | Sim | Não | MIGRAR |
| `frontend/src/pages/FinanceiroExecutivoGrupo.jsx` | `/financeiro/relatorios/grupo-consolidado` | 4 | ResizableTable (4) | Sim | Não | MIGRAR |
| `frontend/src/pages/FinanceiroFaturaCartaoDetalhe.jsx` | `/financeiro/faturas-cartao/:id` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/FinanceiroFaturasCartao.jsx` | `/financeiro/faturas-cartao` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/FinanceiroFinanciamentosBancarios.jsx` | `/financeiro/financiamentos-bancarios` | 2 | ResizableTable (2) | Sim | Não | MIGRAR |
| `frontend/src/pages/FinanceiroFluxoConsolidado.jsx` | `/financeiro/relatorios/fluxo-consolidado` | 3 | ResizableTable (3) | Sim | Não | MIGRAR |
| `frontend/src/pages/FinanceiroIntercompany.jsx` | `/financeiro/relatorios/intercompany` | 4 | ResizableTable (4) | Sim | Não | MIGRAR |
| `frontend/src/pages/FinanceiroObras.jsx` | `/financeiro/relatorios/financeiro-obras` | 2 | ResizableTable (2) | Sim | Não | MIGRAR |
| `frontend/src/pages/FinanceiroPagamentos.jsx` | `/financeiro/pagamentos` | 3 | `<table>` crua (3) | Não | Não | MIGRAR |
| `frontend/src/pages/FinanceiroRelatorioAnalitico.jsx` | `/financeiro/relatorios/analitico` | 1 | ResizableTable (1) | Sim | Não | MIGRAR |
| `frontend/src/pages/FinanceiroRelatorios.jsx` | `/financeiro/relatorios` | 3 | ResizableTable (3) | Sim | Não | MIGRAR |
| `frontend/src/pages/FinanceiroTitulos.jsx` | `/financeiro/contas-a-receber`, `/financeiro/contas-a-pagar`, `/financeiro/titulos` | 2 | ResizableTable (1) + `<table>` crua (1) | Parcial | Não | MIGRAR |
| `frontend/src/pages/ComprovantesPendentes.jsx` | `/comprovantes/pendentes` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/components/financeiro/BaixaCompostaModal.jsx` | modal em FinanceiroTitulos (`/financeiro/titulos`) | 1 | `<table>` crua (1) | Não | Não | MIGRAR |

## 4. Compras

| Arquivo | Tela/rota | Nº de tabelas | Componente usado | Redimensionar? | Alinhamento? | Situação |
|---|---|---|---|---|---|---|
| `frontend/src/modules/solicitacao-compra/pages/SolicitacoesCompra.jsx` | `/solicitacoes-compra` | 1 | ResizableTable (1) | Sim | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/SolicitacaoCompraDetalheView.jsx` | `/solicitacoes-compra/:id` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/NovaSolicitacaoCompra.jsx` | `/solicitacoes-compra/nova` | 1 | `<table>` crua (1) | Não | Não | MIGRAR — decisão do cliente: grade de itens com 8 campos de edição inline (entrada de dados, não listagem) |
| `frontend/src/modules/solicitacao-compra/pages/RevisarSolicitacaoCompra.jsx` | `/solicitacoes-compra/revisar` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/ListaCotacoes.jsx` | `/cotacoes` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx` | `/solicitacoes-compra/:id/cotacao` | 6 | ResizableTable (1) + `<table>` crua (5) | Parcial | Não | MIGRAR — decisão do cliente: matriz de cotação com colunas dinâmicas por fornecedor e 13 campos de edição inline |
| `frontend/src/modules/solicitacao-compra/pages/CotacaoFornecedorPublica.jsx` | `/cotacao/:token` | 1 | `<table>` crua (1) | Não | Não | MIGRAR — decisão do cliente: tela pública (sem login, layout próprio) com edição inline de preços pelo fornecedor |
| `frontend/src/modules/solicitacao-compra/pages/PedidosCompra.jsx` | `/pedidos-compra` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/PedidoCompraDetalhe.jsx` | `/pedidos-compra/:id` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/GestaoApropriacoes.jsx` | `/gestao-apropriacoes` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/GestaoCategorias.jsx` | `/gestao-categorias` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/GestaoFornecedores.jsx` | `/gestao-fornecedores` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/GestaoInsumos.jsx` | `/gestao-insumos` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/GestaoUnidades.jsx` | `/gestao-unidades` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/solicitacao-compra/pages/SolicitacaoCompraDetalhe.jsx` | sem rota/uso (substituida por SolicitacaoCompraDetalheView) | 1 | `<table>` crua (1) | Não | Não | CÓDIGO MORTO (sem uso — avaliar remoção antes de migrar) |
| `frontend/src/pages/ComprasRelatorioCategoriasInsumos.jsx` | `/compras/relatorios/categorias-insumos` | 3 | ResizableTable (3) | Sim | Não | MIGRAR |
| `frontend/src/pages/ComprasRelatorioCiclo.jsx` | `/compras/relatorios/ciclo` | 1 | ResizableTable (1) | Sim | Não | MIGRAR |
| `frontend/src/pages/ComprasRelatorioComprasDiretas.jsx` | `/compras/relatorios/compras-diretas` | 2 | ResizableTable (1) + `<table>` crua (1) | Parcial | Não | MIGRAR |
| `frontend/src/pages/ComprasRelatorioComprasFornecedor.jsx` | `/compras/relatorios/compras-fornecedor` | 3 | ResizableTable (3) | Sim | Não | MIGRAR |
| `frontend/src/pages/ComprasRelatorioDemandaPedidos.jsx` | `/compras/relatorios/demanda-pedidos` | 5 | ResizableTable (5) | Sim | Não | MIGRAR |
| `frontend/src/pages/ComprasRelatorioEconomiaCotacoes.jsx` | `/compras/relatorios/economia-cotacoes` | 1 | ResizableTable (1) | Sim | Não | MIGRAR |
| `frontend/src/pages/ComprasRelatorioEvolucao.jsx` | `/compras/relatorios/evolucao` | 3 | ResizableTable (3) | Sim | Não | MIGRAR |
| `frontend/src/pages/ComprasRelatorioFornecedores.jsx` | `/compras/relatorios/fornecedores` | 2 | ResizableTable (2) | Sim | Não | MIGRAR |
| `frontend/src/pages/ComprasRelatorioPendenciasCotacoes.jsx` | `/compras/relatorios/pendencias-cotacoes` | 3 | ResizableTable (3) | Sim | Não | MIGRAR |
| `frontend/src/pages/ComprasRelatorioPrecosInsumos.jsx` | `/compras/relatorios/precos-insumos` | 3 | ResizableTable (3) | Sim | Não | MIGRAR |

## 5. Comercial/CRM

| Arquivo | Tela/rota | Nº de tabelas | Componente usado | Redimensionar? | Alinhamento? | Situação |
|---|---|---|---|---|---|---|
| `frontend/src/pages/ComercialContratos.jsx` | `/comercial/contratos` | 3 | ResizableTable (1) + `<table>` crua (2) | Parcial | Não | MIGRAR — decisão do cliente: geração/edição de parcelas com 7 campos inline dentro da tabela |
| `frontend/src/pages/ComercialRelatorioOperacional.jsx` | `/comercial/relatorios/operacional` | 1 | ResizableTable (1) | Sim | Não | MIGRAR |
| `frontend/src/modules/crm/pages/CrmLeads.jsx` | `/crm/leads` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/crm/pages/CrmCarteira.jsx` | `/crm/carteira` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/crm/pages/CrmTarefas.jsx` | `/crm/tarefas` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/crm/pages/CrmAutomacoes.jsx` | `/crm/automacoes` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/modules/crm/pages/CrmDashboardDistribuicao.jsx` | `/crm/dashboard-distribuicao` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/crm/pages/CrmDashboardSla.jsx` | `/crm/dashboard-sla` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/modules/crm/pages/CrmAdminCanais.jsx` | `/crm/admin/canais` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/crm/pages/CrmAdminIntegracoes.jsx` | `/crm/admin/integracoes` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/crm/pages/CrmAdminNumeros.jsx` | `/crm/admin/numeros` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |

## 6. Fiscal

| Arquivo | Tela/rota | Nº de tabelas | Componente usado | Redimensionar? | Alinhamento? | Situação |
|---|---|---|---|---|---|---|
| `frontend/src/modules/fiscal/pages/FiscalDashboard.jsx` | `/fiscal` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/modules/fiscal/pages/FiscalDocuments.jsx` | `/fiscal/documentos` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/modules/fiscal/pages/FiscalDocumentDetail.jsx` | `/fiscal/documentos/:id` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/fiscal/pages/FiscalDivergences.jsx` | `/fiscal/divergencias` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/fiscal/pages/FiscalCompanies.jsx` | `/fiscal/empresas` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/fiscal/pages/FiscalAccountingBatches.jsx` | `/fiscal/exportacao-contabil` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/fiscal/pages/FiscalLogs.jsx` | `/fiscal/logs` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/modules/fiscal/pages/FiscalOperationalReport.jsx` | `/fiscal/relatorios/operacional` | 2 | ResizableTable (2) | Sim | Não | MIGRAR |

## 7. Contratos

| Arquivo | Tela/rota | Nº de tabelas | Componente usado | Redimensionar? | Alinhamento? | Situação |
|---|---|---|---|---|---|---|
| `frontend/src/pages/GestaoContratos.jsx` | `/gestao-contratos` | 2 | ResizableTable (1) + `<table>` crua (1) | Parcial | Não | MIGRAR |
| `frontend/src/pages/ContratoFluxoNovo.jsx` | `/contratos/novo` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/ContratosRelatorioOperacional.jsx` | `/contratos/relatorios/operacional` | 2 | ResizableTable (2) | Sim | Não | MIGRAR |
| `frontend/src/pages/TiposMacroContrato.jsx` | sem rota/uso encontrado | 1 | `<table>` crua (1) | Não | Não | CÓDIGO MORTO (sem uso — avaliar remoção antes de migrar) |
| `frontend/src/components/contratos/BlocoContratoFluxoNovo.jsx` | bloco em NovaSolicitacao e BlocoMedicaoContrato | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/components/contratos/BlocoMedicaoContrato.jsx` | bloco em NovaSolicitacao (medicao de contrato) | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/components/contratos/RateioApropriacoesContrato.jsx` | bloco em NovaSolicitacao e `/solicitacoes/:id` (apropriacoes) | 1 | `<table>` crua (1) | Não | Não | MIGRAR |

## 8. Configurações/Administração

| Arquivo | Tela/rota | Nº de tabelas | Componente usado | Redimensionar? | Alinhamento? | Situação |
|---|---|---|---|---|---|---|
| `frontend/src/pages/ConfiguracoesAcoesPrincipais.jsx` | `/configuracoes-acoes-principais` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/ConfiguracoesAtalhosSetor.jsx` | `/configuracoes-atalhos-setor` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/PermissoesSetor.jsx` | `/permissoes-setor` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/StatusSetor.jsx` | `/status-setor` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/SolicitacoesSlaSetor.jsx` | `/solicitacoes-sla-setor` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/ComportamentoRecebimentoSetor.jsx` | `/comportamento-recebimento-setor` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/PrioridadesDiretoria.jsx` | `/prioridades-diretoria` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/NovaSolicitacaoCamposConfig.jsx` | `/nova-solicitacao-campos` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/CartoesRecarga.jsx` | `/configuracoes-cartoes-recarga` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/RelatoriosAdministrativos.jsx` | `/compras/relatorios/auditoria`, `/relatorios/administrativos` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/governanca/pages/GovernancaSistema.jsx` | `/governanca` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/governanca/pages/AuditoriaOperacional.jsx` | `/governanca/auditoria-operacional` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |

## 9. SST

| Arquivo | Tela/rota | Nº de tabelas | Componente usado | Redimensionar? | Alinhamento? | Situação |
|---|---|---|---|---|---|---|
| `frontend/src/modules/sst/pages/SstCrudPage.jsx` | `/sst/:resource` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/sst/pages/SstEsocial.jsx` | `/sst/esocial` | 2 | `<table>` crua (2) | Não | Não | MIGRAR |
| `frontend/src/modules/sst/pages/SstObservabilidadeAvancada.jsx` | `/sst/observabilidade-avancada` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/sst/pages/SstRelatorioOperacional.jsx` | `/sst/relatorios/operacional` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |

## 10. Restante (Solicitações, Conversas, Custos & Recebíveis, Provisões)

| Arquivo | Tela/rota | Nº de tabelas | Componente usado | Redimensionar? | Alinhamento? | Situação |
|---|---|---|---|---|---|---|
| `frontend/src/pages/Solicitacoes/index.jsx` | `/solicitacoes` (tela principal) | 2 | ListaAvancada (1) + `<table>` crua (1) | Parcial | Parcial | MIGRAR (parcial: lista principal já na ListaAvancada; tabela crua no modal de lote de prioridade) |
| `frontend/src/pages/Solicitacoes/TabelaSolicitacoes.jsx` | tabela da tela `/solicitacoes` (dentro da ListaAvancada) | 1 | `<table>` crua (1) | Sim (implementação própria) | Não | MIGRAR — decisão do cliente: tabela principal do sistema com redimensionamento próprio integrado à ListaAvancada — unificar exige cuidado extra |
| `frontend/src/pages/SolicitacoesRelatorioOperacional.jsx` | `/solicitacoes/relatorios/operacional` | 11 | ResizableTable (11) | Sim | Não | MIGRAR — decisão do cliente: heatmap em CSS grid com colunas dinâmicas por status (as 11 ResizableTable migram normalmente) |
| `frontend/src/pages/SolicitacaoDetalhe/ApropriacoesDoContrato.jsx` | aba de `/solicitacoes/:id` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/SolicitacaoDetalhe/Pagamentos.jsx` | aba de `/solicitacoes/:id` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/SolicitacaoDetalhe/PrevisoesContrato.jsx` | aba de `/solicitacoes/:id` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/ConversasEntrada.jsx` | `/conversas/entrada` (aba de ComunicacaoInterna) | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/pages/ConversasSaida.jsx` | `/conversas/saida` (aba de ComunicacaoInterna) | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/custosRecebiveis/components/CrObrasView.jsx` | aba de `/custos-recebiveis` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/custosRecebiveis/components/CrPlanoWorkspace.jsx` | aba de `/custos-recebiveis` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/custosRecebiveis/components/CrPlanejamentoView.jsx` | aba de `/custos-recebiveis` | 4 | `<table>` crua (4) | Não | Não | MIGRAR — decisão do cliente: planejamento com 9 campos de edição inline e agrupamento macro/subitens em 4 tabelas |
| `frontend/src/modules/custosRecebiveis/components/CrMonthlyDetailView.jsx` | aba de `/custos-recebiveis` | 3 | `<table>` crua (3) | Não | Não | MIGRAR |
| `frontend/src/modules/custosRecebiveis/components/CrRealizadoView.jsx` | aba de `/custos-recebiveis` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/custosRecebiveis/components/CrComparativoView.jsx` | aba de `/custos-recebiveis` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/custosRecebiveis/components/CrImportacoesView.jsx` | aba de `/custos-recebiveis` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/custosRecebiveis/components/CrPlanningImportModal.jsx` | modal de importacao em `/custos-recebiveis` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/provisionamento-financeiro/pages/ProvisionamentosFinanceiros.jsx` | `/provisoes-financeiras` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/provisionamento-financeiro/pages/GestaoCategoriasMacro.jsx` | `/provisoes-financeiras/categorias` | 1 | `<table>` crua (1) | Não | Não | MIGRAR |
| `frontend/src/modules/provisionamento-financeiro/pages/ProvisionamentoRelatorioOperacional.jsx` | `/provisoes-financeiras/relatorios/operacional` | 2 | ResizableTable (2) | Sim | Não | MIGRAR |
| `frontend/src/components/ObraSearchModal.jsx` | sem uso encontrado | 1 | `<table>` crua (1) | Não | Não | CÓDIGO MORTO (sem uso — avaliar remoção antes de migrar) |
| `frontend/src/components/SolicitacaoTable.jsx` | sem uso encontrado | 1 | `<table>` crua (1) | Não | Não | CÓDIGO MORTO (sem uso — avaliar remoção antes de migrar) |

## Componentes de infraestrutura (fora do backlog)

| Arquivo | Papel |
|---|---|
| `frontend/src/components/padrao/TabelaPadrao.jsx` | Componente padrão: redimensionamento + menu de alinhamento (envolve ResizableTable) |
| `frontend/src/components/lista-avancada/ListaAvancada.jsx` | Lista avançada padrão: visões, filtros, tabela com redimensionamento + alinhamento |
| `frontend/src/components/ResizableTable.jsx` | Base de redimensionamento usada pelos dois acima; uso direto NÃO dá menu de alinhamento |

