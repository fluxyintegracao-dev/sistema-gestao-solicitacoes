# 2026-04 - Permissao Especial de Envio Entre Setores

## Objetivo
Permitir que o `SUPERADMIN` marque usuarios especificos que podem enviar solicitacoes para outro setor mesmo quando a solicitacao nao estiver no setor atual deles.

## Escopo aplicado
- nova flag em `users`: `pode_enviar_qualquer_setor`
- enforcement no backend de envio unitario e envio em massa
- nova tela de configuracao no frontend para gerenciamento da permissao
- exibicao da acao de envio no frontend respeitando a nova permissao

## Regra preservada
- o bloqueio especial do setor `OBRA` continua valendo
- o fluxo principal de solicitacoes, compras e demais modulos nao foi alterado

## Impacto operacional
- a permissao passa a ser administrada pelo `SUPERADMIN` em `Configuracoes`
- o backend aplica a regra de seguranca mesmo que o frontend esteja desatualizado
