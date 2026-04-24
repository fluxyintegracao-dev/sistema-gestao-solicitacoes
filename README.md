# FLUXY

ERP operacional simples para solicitacoes, compras, financeiro e gestao por obra.

## Visao Geral

O FLUXY nasceu dentro de uma operacao real de construcao civil e evoluiu para um produto comercial single-tenant por instalacao. O principio central do sistema e manter a solicitacao como hub do fluxo operacional, conectando:

- parceiro
- obra
- apropriacao de custo
- compras e cotacoes
- financeiro
- anexos, historico e auditoria

A direcao atual do produto e evoluir o FLUXY para um ERP simples, intuitivo, de facil registro e controle, preservando a implantacao enxuta, a rastreabilidade e a modularidade por cliente.

O projeto ja roda em producao com uso real, frontend em Vercel e backend Node.js em EC2 com PM2 e Nginx.

## Principais Modulos

- `Solicitacoes`: abertura, acompanhamento, historico, anexos, comentarios, atribuicao, envio entre setores e regras por perfil/setor/obra.
- `Compras`: solicitacao de compra, itens cadastrados e manuais, apropriacao por item, centro de cotacao, resposta publica por token, comparativo e pedidos de compra.
- `Financeiro`: titulos a pagar e receber, contas manuais, geracao a partir da solicitacao, baixa, estorno, juros, multa, desconto, auditoria e relatorios.
- `Conciliacao OFX`: importacao por conta bancaria, bloqueio de duplicidade, sugestao de match, conciliacao manual e historico de remessas.
- `Obras`: cards de gestao, orcamento por apropriacao, custo executado, parcelas, pedidos, arquivos e relatorio final.
- `Parceiros`: cadastro mestre unificado de cliente/fornecedor com categorias para uso operacional e nas cotacoes.
- `Comercial`: fundacao inicial entregue para empreendimentos, unidades, contratos de venda, carteira de recebimentos e integracao com titulos financeiros.
- `Boletos (separado)`: modulo reservado para homologacao bancaria, emissao, remessa e retorno sem contaminar a regra central do financeiro.
- `Seguranca`: JWT, bcrypt, autorizacao centralizada, validacao de input, rate limit e auditoria.

## Stack

### Backend

- Node.js
- Express
- Sequelize
- MySQL
- JWT
- bcryptjs
- PDFKit
- S3 com URLs assinadas

### Frontend

- React
- Vite
- React Router
- Tailwind CSS
- React Icons

### Infra

- Desenvolvimento local com MySQL e `.env`
- Backend em EC2 com PM2
- Nginx como proxy para a API
- Frontend em Vercel
- Arquivos e comprovantes em S3

## Estrutura do Repositorio

```text
backend/
  migrations/
  src/
    config/
    controllers/
    database/
    middlewares/
    models/
    services/
    validators/

frontend/
  public/
  src/
    components/
    contexts/
    layout/
    modules/
    pages/
    services/

docs/
  arquitetura/
  contexto/
  logs_desenvolvimento/
  modulos/
  prompts_padrao/
  regras_negocio/
  seguranca/
```

## Como Rodar Localmente

### 1. Banco de dados

Use MySQL local. O `docker-compose.yml` pode ser usado como base rapida para desenvolvimento.

### 2. Backend

Crie `backend/.env` a partir de `backend/.env.example`.

Exemplo de execucao:

```bash
cd backend
npm install
npm run migrate
npm run dev
```

Observacoes:

- O `server.js` executa `runMigrations()` automaticamente na subida.
- O sistema nao depende de `sync({ alter: true })`.
- O backend tambem carrega configuracoes de instalacao em runtime.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variaveis de Ambiente do Backend

Principais chaves:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`
- `TRUST_PROXY`
- `REQUEST_BODY_LIMIT_MB`
- `UPLOAD_MAX_FILE_SIZE_MB`
- `LOGIN_RATE_LIMIT_WINDOW_MINUTES`
- `LOGIN_RATE_LIMIT_MAX_ATTEMPTS`
- `UPLOAD_RATE_LIMIT_WINDOW_MINUTES`
- `UPLOAD_RATE_LIMIT_MAX_ATTEMPTS`
- `CRITICAL_RATE_LIMIT_WINDOW_MINUTES`
- `CRITICAL_RATE_LIMIT_MAX_ATTEMPTS`
- `PRODUCT_NAME`
- `COMPANY_NAME`
- `COMPANY_LEGAL_NAME`
- `COMPANY_LOGO_URL`
- `APP_DOMAIN`
- `CORS_ALLOWED_ORIGINS`

## Deploy Atual

- Backend: EC2 + PM2 (`backend-solicitacoes`) + Nginx
- API publica: `api.jrfluxy.com.br`
- Frontend: Vercel
- Dominios ativos:
  - `jrfluxy.com.br`
  - `www.jrfluxy.com.br`
  - `csc.jrfluxy.com.br`

Checklist resumido:

```bash
cd backend
git pull
npm install
pm2 restart backend-solicitacoes --update-env
```

No frontend, o deploy ocorre pela Vercel a partir do diretorio `frontend/`.

## Documentacao

Leitura recomendada:

1. [docs/README.md](C:/Projetos/sistema_gestao_solicitacoes/docs/README.md)
2. [docs/contexto/visao_geral.md](C:/Projetos/sistema_gestao_solicitacoes/docs/contexto/visao_geral.md)
3. [docs/arquitetura/visao_geral.md](C:/Projetos/sistema_gestao_solicitacoes/docs/arquitetura/visao_geral.md)
4. [docs/modulos/solicitacoes.md](C:/Projetos/sistema_gestao_solicitacoes/docs/modulos/solicitacoes.md)
5. [docs/modulos/compras.md](C:/Projetos/sistema_gestao_solicitacoes/docs/modulos/compras.md)
6. [docs/modulos/financeiro.md](C:/Projetos/sistema_gestao_solicitacoes/docs/modulos/financeiro.md)
7. [docs/modulos/comercial.md](C:/Projetos/sistema_gestao_solicitacoes/docs/modulos/comercial.md)
8. [docs/MANUAL_FLUXO_OPERACIONAL_FINANCEIRO.md](C:/Projetos/sistema_gestao_solicitacoes/docs/MANUAL_FLUXO_OPERACIONAL_FINANCEIRO.md)
9. [docs/PLANO_MODULO_COMERCIAL_CONSTRUCAO_CIVIL.md](C:/Projetos/sistema_gestao_solicitacoes/docs/PLANO_MODULO_COMERCIAL_CONSTRUCAO_CIVIL.md)

## Observacoes Importantes

- O backend e a autoridade para permissao, escopo de dados, valores financeiros e status.
- O projeto e single-tenant por instalacao. Cada cliente usa sua propria base.
- O OFX nao cria titulos nem baixas automaticamente.
- O pedido de compra pode ser gerado a partir da cotacao encerrada e depois ajustado manualmente com auditoria.
- Alteracoes relevantes devem refletir tambem em `docs/`.
