# AGENTS.md

## Objetivo
Guia rapido para colaboradores e agentes automatizados que trabalham neste repositorio.

## Regras
- o sistema esta funcionando e em producao dentro do objetivo esperado
- toda alteracao deve considerar o contexto atual para nao quebrar o fluxo principal nem o modulo compras
- nao alterar arquivos fora deste repositorio
- evitar mudancas destrutivas sem necessidade real
- sempre explicar as alteracoes e o impacto esperado

## Fluxo
1. ler este arquivo antes de qualquer mudanca
2. pedir confirmacao antes de alteracoes grandes
3. em trabalho com dois agentes, ler `docs/COLABORACAO_CODEX.md`
4. atualizar `docs/` e este arquivo quando regras, fluxos ou arquitetura mudarem

## Entrypoints reais em runtime
Backend:
- `backend/server.js`
- `backend/src/app.js`
- `backend/src/routes.js`

Frontend:
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`

Observacao:
- arquivos antigos com sufixo `"(1)"` e `"(2)"` foram removidos do codigo por nao fazerem parte do runtime ativo
- artefatos em `backend/uploads/` permanecem preservados

## Estado atual consolidado

### Infra e deploy
- backend em EC2 com PM2 (`backend-solicitacoes`) e Nginx apontando para `127.0.0.1:8000`
- frontend em Vercel com root `frontend/`
- dominios principais:
  - `jrfluxy.com.br`
  - `www.jrfluxy.com.br`
  - `csc.jrfluxy.com.br`
- backend publicado em `api.jrfluxy.com.br`

### CORS e arquivos
- backend usa allowlist para dominios oficiais e previews Vercel
- S3 e usado para anexos e comprovantes com URL assinada
- o sistema ainda suporta anexos antigos em `/uploads`

### Modulos ativos
- autenticacao e sessao
- dashboard
- solicitacoes do fluxo principal
- contratos
- usuarios
- comprovantes
- comunicacao interna
- arquivos modelos
- modulo de solicitacoes de compras

### Regras de negocio criticas
- numero do pedido permanece restrito ao escopo GEO
- lista de status no detalhe segue o setor do usuario logado
- backend valida a mesma regra de status do frontend
- assumir e enviar solicitacoes dependem do setor atual da solicitacao
- arquivamento de solicitacao e individual por usuario
- filtro e escopo de obras dependem de vinculo e perfil
- `SUPERADMIN` continua como excecao administrativa ampla

### Modulo compras
- esta integrado ao backend e ao frontend
- acesso controlado por perfil e pela flag `pode_criar_solicitacao_compra`
- depende diretamente de:
  - `backend/src/app.js`
  - `backend/src/routes.js`
  - `backend/src/models/index.js`
  - `backend/src/models/User.js`
  - `backend/src/controllers/AuthController.js`
  - `backend/src/controllers/UsuarioController.js`
  - `backend/src/controllers/SolicitacaoCompraController.js`
  - `frontend/src/App.jsx`
  - `frontend/src/layout/Layout.jsx`
  - `frontend/src/services/compras.js`
  - `frontend/src/modules/solicitacao-compra/pages/`
- alteracoes nesses pontos exigem validacao reforcada

### Validacoes ja executadas em manutencao recente
- limpeza de duplicados `"(1)"` e `"(2)"` do codigo e documentacao
- `npm run build` do frontend concluido com sucesso
- checagem de sintaxe do backend concluida em arquivos centrais

## Checklist de deploy
Backend:
- `git pull`
- `npm install` em `backend/`, se necessario
- `pm2 restart backend-solicitacoes --update-env`
- validar logs e resposta local

Frontend:
- `git push`
- redeploy na Vercel
- limpar cache se houver mudanca estrutural forte

## Observacoes operacionais
- se o backend nao responder em `127.0.0.1:8000`, o Nginx retorna `502`
- artefatos de `backend/uploads/` nao devem ser removidos em limpezas de codigo
- compras e fluxo principal compartilham partes estruturais; nao tratar o modulo compras como isolado

## Colaboracao entre agentes
- seguir `docs/COLABORACAO_CODEX.md` quando houver dois agentes trabalhando no repositorio
- nenhum agente deve editar arquivo reservado por outro agente
- arquivos centrais e documentacao estrutural devem ter ownership explicito antes de edicao em trabalho colaborativo
