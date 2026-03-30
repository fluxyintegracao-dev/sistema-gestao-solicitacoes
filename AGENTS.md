# AGENTS.md

## Objetivo
Guia rapido para colaboradores e agentes automatizados.

## Regras
- O sistema esta funcionando e pronto para deploy dentro dos objetivos pretendidos. Tudo o que for criado precisa levar em conta todo o contexto criado ate o momento para nao quebrar o sistema.
- Nao alterar arquivos fora deste repositorio.
- Evitar mudancas destrutivas.
- Sempre explicar as alteracoes.

## Fluxo
1. Ler este arquivo antes de qualquer mudanca.
2. Ler `docs/README.md` para navegar pela documentacao estruturada do projeto.
3. Pedir confirmacao antes de alteracoes grandes.
4. Ler `docs/COLABORACAO_CODEX.md` antes de iniciar trabalho compartilhado entre dois agentes.

## Estado Atual (resumo das mudancas feitas)

### Infra / Deploy
- Backend roda em EC2 com PM2 (`backend-solicitacoes`) e Nginx proxy em `api.jrfluxy.com.br` para `127.0.0.1:8000`.
- Frontend hospedado na Vercel (root `frontend/`).
- Dominios configurados: `jrfluxy.com.br`, `www.jrfluxy.com.br`, `csc.jrfluxy.com.br` (apontando para Vercel).
- CORS do backend ajustado para aceitar dominios Vercel (preview) e dominios customizados.
- S3 usado para anexos/comprovantes com URLs assinadas e CORS liberado (atual: `AllowedOrigins: ["*"]`).
- O repositorio nao possui mais `python-service`; o runtime ativo e apenas Node/React (`backend/` + `frontend/`).

### Uploads / S3
- Uploads migram para S3 via `uploadToS3`.
- Backend gera URL assinada para download/preview (`/anexos/presign`).
- Ajuste no `fileUrl` do frontend para usar origem da API em paths relativos `/uploads/...`.
- Correcoes de encoding no presign (decode do key antes de assinar).

### CORS
- Backend (`backend/src/app.js`) usa allowlist com:
  - `https://sistema-gestao-solicitacoes.vercel.app`
  - `https://api.jrfluxy.com.br`
  - `https://jrfluxy.com.br`
  - `https://www.jrfluxy.com.br`
  - `https://csc.jrfluxy.com.br`
  - e aceita previews `https://sistema-gestao-solicitacoes-*.vercel.app`

### Frontend (UX/UI)
- Menu lateral inicia oculto e abre por hover na borda esquerda; fecha ao sair do mouse.
- Menu com rolagem (`overflow-y-auto`) e dimensoes reduzidas para caber em notebook.
- Tabela de solicitacoes com coluna "Data" e melhorias visuais.
- Login com logo CSC (em `frontend/public/CSC_logo_colorida.png`) e tamanho aumentado.
- Rewrites SPA via `frontend/vercel.json`.

### Permissoes / Regras de Negocio
- Numero do pedido: somente setor GEO pode editar.
  - Backend valida setor GEO no endpoint `PATCH /solicitacoes/:id/pedido`.
  - Frontend exibe componente Pedido apenas para GEO.
- Status por setor: na tela de detalhe, usuarios veem lista de status do proprio setor.
  - `SUPERADMIN` permanece como excecao administrativa.
  - Backend e frontend estao alinhados para usar o setor do usuario nas trocas de status.
- Assumir e enviar solicitacoes:
  - Usuarios so podem assumir solicitacoes que estejam atualmente no proprio setor.
  - Usuarios so podem enviar para outro setor solicitacoes que estejam atualmente no proprio setor.
  - `SUPERADMIN` permanece como excecao administrativa.
  - Setor `OBRA` continua sem poder enviar para outros setores e o frontend apenas oculta o botao, sem mensagem explicativa.
- Configuracao de areas visiveis para OBRA:
  - Nova config salva em `configuracoes_sistema` (chave `AREAS_OBRA_VISIVEIS`).
  - Nova pagina `AreasObra` em Configuracoes para SUPERADMIN.
  - NovaSolicitacao filtra `Area Responsavel` para setor OBRA.

### Correcoes importantes (hist?rico)
- Corrigido case-sensitivity no Linux: `CargoController.js`.
- Corrigido regex no `s3.js` (parse key).
- Corrigido `src` da logo no login.

## Checklist de Deploy
- Backend: `git pull` -> `npm install` (backend) -> `pm2 restart backend-solicitacoes --update-env`.
- Frontend: `git push` -> Redeploy na Vercel (cache limpo).

## Observacoes
- Se o backend nao responde em `127.0.0.1:8000`, Nginx retorna 502.
- Se anexos antigos ainda estiverem em `/uploads`, o frontend usa a origem da API para baixar.

## Colaboracao entre agentes
- Quando houver dois agentes trabalhando no repositorio, seguir obrigatoriamente `docs/COLABORACAO_CODEX.md`.
- Nenhum agente deve editar o mesmo arquivo que esteja explicitamente reservado por outro agente.
- Antes de iniciar qualquer tarefa, registrar ownership temporario dos arquivos que serao alterados.
