# Frontend

## Estrutura principal
- `frontend/src/pages/`: telas principais do sistema
- `frontend/src/modules/solicitacao-compra/`: modulo compras
- `frontend/src/components/`: componentes compartilhados
- `frontend/src/services/`: camada de acesso a API
- `frontend/src/utils/`: normalizacoes e regras de apoio

## Arquivos centrais
- `frontend/src/App.jsx`: mapa de rotas e gates de permissao
- `frontend/src/layout/Layout.jsx`: menu lateral, badge de comunicacao, tema e shell
- `frontend/src/pages/Solicitacoes/`: listagem, filtros, tabela e modais do fluxo principal
- `frontend/src/pages/SolicitacaoDetalhe/`: detalhe da solicitacao principal

## Persistencia local
O frontend usa `localStorage` para:
- tema
- filtros da listagem de solicitacoes
- colunas visiveis da tabela
- marcacao local de leitura em comunicacao interna
