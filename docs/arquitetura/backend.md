# Backend

## Estrutura principal
- `backend/src/controllers/`: regras de entrada HTTP
- `backend/src/models/`: modelos Sequelize
- `backend/src/services/`: servicos isolados de negocio e integracoes
- `backend/src/middlewares/`: auth e permissoes
- `backend/src/utils/`: utilitarios

## Controllers centrais
- `SolicitacaoController.js`: listagem, detalhe, historico, status, envio de setor, arquivamento, filtros
- `SolicitacaoCompraController.js`: modulo compras
- `ConversaInternaController.js`: comunicacao interna
- `NotificacaoController.js`: notificacoes e badge
- `AuthController.js`: login e payload do usuario

## Observacoes de implementacao
- O bootstrap do banco e agressivo em `backend/src/app.js`.
- Parte do schema ainda e ajustada por SQL idempotente no startup.
- Existem migrations SQL em `backend/migrations/` para referencia operacional.

## Ponto de atencao
Evitar novas mudancas amplas em `backend/src/app.js` sem revisar o impacto no banco de producao.
