# Backend

## Estrutura principal
- `backend/server.js`: valida dependencias de inicializacao, executa migrations, carrega configuracao e inicia a API/jobs
- `backend/src/app.js`: middlewares HTTP, CORS, seguranca, uploads e montagem das rotas
- `backend/src/routes.js` e `backend/src/routes/`: contrato HTTP e middlewares de cada rota
- `backend/src/controllers/`: regras de entrada HTTP
- `backend/src/models/`: modelos Sequelize
- `backend/src/services/`: regras de negocio reutilizaveis e integracoes
- `backend/src/middlewares/`: auth e permissoes
- `backend/src/validators/`: contratos de entrada
- `backend/src/database/runMigrations.js`: executor ordenado de migrations
- `backend/src/utils/`: utilitarios

## Controllers centrais
- `SolicitacaoController.js`: listagem, detalhe, historico, status, envio de setor, arquivamento, filtros
- `SolicitacaoCompraController.js`: modulo compras
- `ConversaInternaController.js`: comunicacao interna
- `NotificacaoController.js`: notificacoes e badge
- `AuthController.js`: login e payload do usuario

## Observacoes de implementacao
- `backend/server.js` valida ambiente, rate limit e antivirus, executa `runMigrations()`, carrega configuracao de runtime e somente depois abre a porta HTTP.
- migrations JavaScript em `backend/migrations/` sao ordenadas por nome e registradas em `schema_migrations`.
- o runtime normal nao executa `sequelize.sync()` nem ajustes de schema em `app.js`.
- `backend/src/database/legacyBootstrap.js` preserva funcoes antigas, mas nao e chamado pelo bootstrap normal; nao reutiliza-lo para novas mudancas.
- apos a API subir, iniciam retencao de eventos, automacoes do CRM, snapshots de Governanca e um sincronizador descontinuado inventariado em `ESTADO_RUNTIME_E_LEGADOS.md`.

## Ponto de atencao
Mudanca de model exige migration controlada. Mudancas em `server.js`, `app.js`, montagem de rotas ou jobs exigem teste de inicializacao, autenticacao, CORS, uploads, health checks e encerramento do processo.
