# Configuracoes e Painel

## Configuracoes

Configuracoes e o dominio administrativo das chaves de runtime persistidas, modulos habilitados, permissoes, setores, tipos, status e regras parametrizaveis. Alteracoes precisam de validacao de schema, auditoria e recarregamento controlado.

Modulos obrigatorios nao podem ser desabilitados. Dependencias (`requiresAll` e `requiresAny`) devem ser aplicadas no backend. Permissoes vazias por compatibilidade precisam ser tratadas conforme a regra vigente, sem ampliar acesso por erro de serializacao.

## Painel

O Painel agrega indicadores e atalhos. Ele nao e fonte de verdade e nao pode implementar calculos diferentes dos services de relatorio. Cards, filtros e totais devem respeitar modulos habilitados, permissoes e escopo.

## Mudanca segura

Testar sessao renovada, habilitacao/desabilitacao, menu, rotas backend, permissoes, filtros, totais e comportamento quando um modulo dependente estiver indisponivel.
