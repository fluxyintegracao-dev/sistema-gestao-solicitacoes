# Modulo Fiscal - Fase 2 Fundacao

Data: 2026-05-19

## Objetivo entregue

Foi criada a fundacao tecnica do modulo Fiscal em arquitetura hibrida:

- Backend isolado em `backend/src/modules/fiscal`.
- Registro de rotas no roteador central `backend/src/routes.js`.
- Sem consulta real a SEFAZ.
- Sem jobs ativos.
- Sem integracao automatica com financeiro, compras ou pedidos.
- Sem certificado A1.
- Sem alteracao de status ou fluxo dos modulos existentes.

## Arquitetura criada

### Backend

Estrutura criada:

- `backend/src/modules/fiscal/constants`
- `backend/src/modules/fiscal/controllers`
- `backend/src/modules/fiscal/models`
- `backend/src/modules/fiscal/routes`
- `backend/src/modules/fiscal/services`
- `backend/src/modules/fiscal/validators`

Rotas registradas:

- `GET /api/fiscal/health`
- `GET /api/fiscal/dashboard`
- `GET /api/fiscal/companies`
- `POST /api/fiscal/companies`
- `PATCH /api/fiscal/companies/:id`
- `GET /api/fiscal/documents`
- `GET /api/fiscal/documents/:id`
- `GET /api/fiscal/sync/logs`

Todas passam por autenticação, módulo `FISCAL` habilitado e autorização fiscal.

### Frontend

Estrutura criada:

- `frontend/src/modules/fiscal/pages/FiscalDashboard.jsx`
- `frontend/src/modules/fiscal/pages/FiscalCompanies.jsx`
- `frontend/src/modules/fiscal/pages/FiscalDocuments.jsx`
- `frontend/src/modules/fiscal/pages/FiscalLogs.jsx`
- `frontend/src/modules/fiscal/services/fiscalApi.js`

Menu criado:

- Fiscal
  - Painel Fiscal
  - Empresas Fiscais
  - Documentos Fiscais
  - Logs de Sincronizacao

O menu depende do módulo `FISCAL` e das permissões fiscais.

## Banco de dados

Migration criada:

- `backend/migrations/202605190005_fiscal_base.js`

Tabelas:

- `fiscal_companies`
- `fiscal_dfe_sync_states`
- `fiscal_dfe_documents`
- `fiscal_sync_logs`
- `fiscal_document_links`
- `fiscal_divergences`

As tabelas novas são isoladas e só possuem vínculos opcionais com estruturas existentes.

## Permissões

Permissões iniciais adicionadas ao catálogo de permissões por área:

- `fiscal.view`
- `fiscal.config.manage`
- `fiscal.document.view`
- `fiscal.document.link`
- `fiscal.sync.view`
- `fiscal.logs.view`

Também foram adicionadas regras backend/frontend de acesso fiscal.

## Módulo habilitável

O módulo `FISCAL` foi adicionado ao catálogo de `MODULOS_HABILITADOS`, com padrão desabilitado.

## S3 Fiscal

Foi criada base de service para S3 fiscal:

- leitura de configuração
- normalização de prefixo
- geração segura de chave fiscal
- cálculo SHA-256

Nenhum upload fiscal real foi ativado nesta fase.

Variáveis adicionadas em `.env.example`:

```env
FISCAL_MODULE_ENABLED=false
FISCAL_SEFAZ_ENABLED=false
FISCAL_ENV=dev
FISCAL_S3_BUCKET=
FISCAL_S3_REGION=sa-east-1
FISCAL_S3_PREFIX=dev
FISCAL_S3_PRESIGNED_EXPIRES_SECONDS=300
```

## Comandos DEV

Rodar migrations apenas em DEV:

```bash
cd backend
npm run migrate
```

Testar rotas com usuário autenticado:

```bash
curl -i https://api-dev.jrfluxy.com.br/api/fiscal/health \
  -H "Authorization: Bearer TOKEN"

curl -i https://api-dev.jrfluxy.com.br/api/fiscal/dashboard \
  -H "Authorization: Bearer TOKEN"
```

Cadastrar empresa fiscal em DEV:

```bash
curl -i -X POST https://api-dev.jrfluxy.com.br/api/fiscal/companies \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"razao_social":"Empresa Teste","cnpj":"00000000000000","uf":"ES","ambiente_sefaz":"homologacao"}'
```

## Checklist de validação manual

- Habilitar módulo `FISCAL` em configurações.
- Configurar permissões fiscais para usuário de teste ou usar SUPERADMIN.
- Acessar `/fiscal`.
- Cadastrar uma empresa fiscal em homologação.
- Confirmar criação automática do estado NSU inicial `nfe/homologacao`.
- Abrir `/fiscal/documentos` e confirmar lista vazia sem erro.
- Abrir `/fiscal/logs` e confirmar lista vazia sem erro.
- Confirmar que usuário sem permissão não vê menu e recebe bloqueio nas rotas.
- Confirmar que nenhuma rotina financeira, compras ou pedidos foi alterada no fluxo.

## Pendências para fases seguintes

- Criar serviço de certificado A1 seguro.
- Criar bucket S3 fiscal DEV/PROD.
- Implementar upload/consulta presigned real para XML/DANFE.
- Implementar service SEFAZ `NFeDistribuicaoDFe`.
- Implementar sync manual controlado.
- Implementar eventos fiscais.
- Implementar manifestação.
- Implementar matching sugerido com pedidos/financeiro.
