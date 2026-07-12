# Seguranca - Autenticacao e Autorizacao

Autenticacao:
- JWT com expiracao configuravel
- login com rate limit

Autorizacao:
- validacao por perfil (ADMIN, USUARIO, SUPERADMIN)
- validacao por setor e obra
- backend decide escopo de dados

## Camadas de Permissao (ordem de precedencia)

1. Perfil do usuario (SUPERADMIN, ADMINISTRADOR, ADMIN, FINANCEIRO, USUARIO)
   - SUPERADMIN e ADMINISTRADOR tem bypass total em todas as camadas abaixo.

2. Modulos habilitados por instalacao
   - Chave `MODULOS_HABILITADOS` em `ConfiguracaoSistema`.
   - Define quais modulos estao ativos para a empresa.

3. Acesso financeiro por usuario
   - Chave `USUARIOS_ACESSO_FINANCEIRO` em `ConfiguracaoSistema`.
   - Libera o modulo FINANCEIRO para usuarios fora do perfil FINANCEIRO.

4. Capacidades granulares RH/DP
   - Chave `USUARIOS_PERMISSOES_RH_DP` em `ConfiguracaoSistema`.
   - Controla acesso por area dentro do modulo RH_DP para compatibilidade com configuracoes existentes.
   - Exemplo de chave: `rh_dp_colaboradores_view`.

5. Permissoes de areas por usuario (modular, todos os demais modulos)
   - Chave `PERMISSOES_AREAS_USUARIOS` em `ConfiguracaoSistema`.
   - Registro central em `backend/src/constants/moduloPermissoes.js`.
   - Cobre: SOLICITACOES, COMPRAS, FINANCEIRO, OBRAS, CONTRATOS, COMERCIAL, BIBLIOTECA, COMUNICACAO_INTERNA.
   - Chave no formato `modulo.area.acao` (ex: `financeiro.titulos.criar`).
   - Se um usuario nao tiver entradas: acesso completo ao que seu perfil permite (compatibilidade).
   - Se tiver entradas: somente as chaves marcadas valem.
   - Sessao do usuario recebe `areas_permissoes: [...]`.
   - Frontend verifica via `hasPermissao(user, 'chave')` em `acessoProduto.js`.
   - Configuracao administrativa em: Configuracoes > Permissoes de Areas por Usuario.

## Session User Object

Campos relevantes enviados ao frontend apos autenticacao:
- `perfil` - papel do usuario
- `modulos_habilitados` - modulos ativos da instalacao
- `financeiro_liberado` - acesso ao modulo financeiro
- `rh_dp_capacidades` - lista de chaves de capacidade RH/DP
- `areas_permissoes` - lista de chaves de permissao de area (vazia = acesso completo)

Observacao:
- frontend nao deve decidir permissoes
- verificacoes de permissao no frontend sao UX (ocultar elementos); o backend sempre valida
