# 2026-04 - Sprint 1 - Provisionamento Financeiro

## Objetivo
Criar a base segura do novo modulo de Provisionamento Financeiro sem interferir no fluxo principal ja em producao.

## Entregas
- models Sequelize do modulo
- associacoes no `backend/src/models/index.js`
- service de geracao de codigo por obra com controle transacional
- service de permissao isolada do modulo
- middleware de gate do modulo
- controller de contexto do modulo
- controller de configuracao de permissoes
- rotas backend iniciais
- migration SQL de criacao das tabelas-base
- tela inicial de configuracao para SUPERADMIN

## Regras importantes desta etapa
- diretoria sera tratada como `Setor`
- modulo ainda nao entra no menu principal
- acesso operacional nao foi liberado para usuarios comuns
- configuracao por obra usa lista explicita; vazia significa acesso global no escopo
- `SUPERADMIN` continua com acesso total implicito

## Risco controlado
- nenhuma regra do modulo de solicitacoes foi alterada
- nenhuma rota existente foi substituida
- o novo modulo entra desacoplado dos fluxos atuais
