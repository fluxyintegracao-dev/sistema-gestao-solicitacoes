# Seguranca - Visao Geral

## Principios

- backend e a autoridade
- menor privilegio
- defesa em camadas
- rastreabilidade de acoes sensiveis

## Camadas Ativas

- autenticacao por JWT
- senha com hash via bcrypt
- autorizacao por perfil, setor, obra e recurso
- validacao de `body`, `params` e `query`
- rate limit em login, upload e rotas criticas
- auditoria de eventos sensiveis
- protecao de anexos por presign e controle de acesso
- protecao CSRF em requisicoes autenticadas por cookie, com token exposto em header controlado para frontends permitidos por CORS

## Modulos Mais Sensiveis

- financeiro
- compras e pedidos
- anexos
- usuarios e configuracoes

## Regra Estrutural

O frontend pode sugerir uma acao. A permissao real, o valor valido e o escopo final sempre dependem do backend.
