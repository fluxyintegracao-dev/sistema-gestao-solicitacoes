# Handoff — Responsividade do módulo de Compras

Data: 2026-07-21

## Objetivo

Aplicar no frontend o plano aprovado de responsividade do módulo de Compras, preservando integralmente as rotas, permissões, endpoints, ações e regras de negócio existentes. Nenhuma alteração de backend faz parte desta entrega.

## Escopo implementado

- Camada visual responsiva isolada pelo escopo `compras-responsive-scope`.
- Layout compacto para notebook, tablet e smartphone.
- Filtros reorganizados e recolhíveis no mobile.
- Tabelas preservadas no desktop, com rolagem horizontal local quando necessária.
- Listas operacionais principais com cartões equivalentes no mobile.
- Modais em tela cheia no smartphone, sem alteração das ações internas.
- Ajustes em cabeçalhos, indicadores, barras de ação, formulários, relatórios, configurações e página pública de cotação.

## Rotas abrangidas

- `/solicitacoes-compra`
- `/solicitacoes-compra-direta`
- `/pedidos-compra`
- `/compras/delegacao`
- `/compras/relatorios`
- `/relatorios/administrativos`
- `/gestao-apropriacoes`
- `/gestao-insumos`
- `/gestao-unidades`
- `/gestao-categorias`
- `/gestao-fornecedores`
- `/cotacoes`
- `/configuracoes-cotacao`
- `/configuracoes-status-pedidos-compra`
- Fluxos internos e detalhes que herdam o shell de Compras.
- Página pública `/cotacao/:token`.

## Arquivos de runtime alterados

- `frontend/src/layout/Layout.jsx`
- `frontend/src/main.jsx`
- `frontend/src/modules/solicitacao-compra/compras-responsive.css`
- `frontend/src/modules/solicitacao-compra/pages/SolicitacoesCompra.jsx`
- `frontend/src/modules/solicitacao-compra/pages/PedidosCompra.jsx`
- `frontend/src/modules/solicitacao-compra/pages/ListaCotacoes.jsx`
- `frontend/src/modules/solicitacao-compra/pages/GestaoFornecedores.jsx`
- `frontend/src/modules/solicitacao-compra/pages/GestaoApropriacoes.jsx`
- `frontend/src/modules/solicitacao-compra/pages/GestaoCategorias.jsx`
- `frontend/src/modules/solicitacao-compra/pages/GestaoInsumos.jsx`
- `frontend/src/modules/solicitacao-compra/pages/GestaoUnidades.jsx`

## Preservações confirmadas

- `frontend/src/App.jsx` não foi alterado: definições de rotas e guardas permanecem iguais.
- `frontend/src/services/` não foi alterado: contratos e chamadas de API permanecem iguais.
- `backend/` não foi alterado.
- As novas visualizações mobile chamam as mesmas funções, verificam as mesmas permissões e navegam para as mesmas rotas das tabelas desktop.
- A tabela desktop continua no DOM e permanece como visualização principal fora do mobile.

## Validações executadas

- `npm.cmd run build` no diretório `frontend`: aprovado.
- Vite transformou 308 módulos e gerou o bundle de produção sem erro.
- `git diff --check -- frontend`: aprovado durante a implementação.
- Inspeção local em 1280x720, 820x1180, 390x844 e 320x568: sem estouro horizontal global na tela pública/login.
- Teste local autenticado ficou limitado pela ausência de sessão e backend local; os erros de console observados foram somente falhas esperadas de acesso à API local.

## Checklist obrigatório na dev

Testar com perfis de consulta, gestão e SUPERADMIN, preferencialmente em 1366x768, 1280x720, 1024x768, tablet e smartphone:

1. Solicitações: filtros, seleção, envio para compras, inativação, PDF e navegação para detalhe.
2. Cotações: edição, portal do fornecedor, rodadas, fechamento parcial/integral e geração de pedidos.
3. Pedidos: filtros, visualização, edição, status e PDF.
4. Fornecedores: busca, filtro, cadastro, edição, ativação/desativação e WhatsApp.
5. Apropriações, categorias, insumos e unidades: seleção, cadastro, edição e exclusão.
6. Delegação, relatórios e configurações: formulários, tabelas, exportações e barras de ação.
7. Página pública da cotação: formulário, itens, anexos e envio pelo fornecedor.
8. Confirmar que usuários sem permissão continuam sem visualizar ou executar ações restritas.
9. Confirmar bloqueios de botões durante ações críticas e ausência de envio duplicado.

## Próximo passo exato

Publicar somente o frontend na dev, executar o checklist autenticado acima e registrar qualquer divergência com rota, perfil, resolução e captura de tela antes de migrar para a `main`.
