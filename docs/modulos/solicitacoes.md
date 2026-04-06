# Modulo de Solicitacoes

## Frontend principal
- `frontend/src/pages/Solicitacoes/`
- `frontend/src/pages/SolicitacaoDetalhe/`
- `frontend/src/pages/NovaSolicitacao.jsx`

## Backend principal
- `backend/src/controllers/SolicitacaoController.js`
- `backend/src/models/Solicitacao.js`
- `backend/src/models/Historico.js`

## Funcoes centrais
- abertura de solicitacao
- filtros e paginacao
- detalhamento
- historico
- acoes em massa
- exportacao
- envio entre setores com regra padrao por setor atual da solicitacao
- permissao especial configuravel para envio fora do setor atual, sem liberar o setor OBRA
