# 2026-04 - Aprovacao por Diretoria por Classificacao da Obra

## Objetivo
Introduzir um fluxo controlado para solicitacoes que precisam passar por diretoria antes de seguir para o setor operacional final.

## O que entrou
- classificacao de obra em `PUBLICA` ou `PRIVADA`
- configuracao de `SUPERADMIN` para:
  - diretoria responsavel por classificacao da obra
  - setor destino apos aprovacao, por tipo de solicitacao
- validacao backend na criacao para impedir que usuarios do setor `OBRA` enviem solicitacoes para a diretoria errada
- novo endpoint de aprovacao por diretoria
- ajuste do detalhe da solicitacao para exibir `Aprovar` no lugar de `Enviar para outro setor` quando a solicitacao estiver no fluxo de diretoria

## Regras operacionais
- obra `PUBLICA` usa a diretoria configurada para `PUBLICA`
- obra `PRIVADA` usa a diretoria configurada para `PRIVADA`
- se a solicitacao estiver em uma diretoria configurada e existir destino configurado para o tipo, a acao correta passa a ser `Aprovar`
- apos aprovar:
  - `area_responsavel` muda para o setor destino configurado
  - o setor destino assume o fluxo normal
  - a diretoria aprovadora continua com visibilidade por historico
  - o criador continua com visibilidade

## Arquivos principais
- `backend/src/services/aprovacaoDiretoriaConfig.js`
- `backend/src/controllers/ObraController.js`
- `backend/src/controllers/ConfiguracaoSistemaController.js`
- `backend/src/controllers/SolicitacaoController.js`
- `backend/src/models/Obra.js`
- `backend/src/routes.js`
- `frontend/src/pages/Obras.jsx`
- `frontend/src/pages/AprovacaoDiretoria.jsx`
- `frontend/src/pages/NovaSolicitacao.jsx`
- `frontend/src/pages/SolicitacaoDetalhe/index.jsx`
- `frontend/src/pages/SolicitacaoDetalhe/Header.jsx`
- `frontend/src/services/configuracoesSistema.js`
- `frontend/src/services/solicitacoes.js`
- `backend/migrations/add-classificacao-obra.sql`

## Deploy
- aplicar `backend/migrations/add-classificacao-obra.sql`
- atualizar backend e reiniciar PM2
- redeploy do frontend
- preencher classificacao das obras existentes
- configurar diretoria por classificacao
- configurar setor destino por tipo de solicitacao
- validar com uma obra publica e uma privada antes de liberar geral
