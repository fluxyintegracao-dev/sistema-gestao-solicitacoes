# Modulo PROVISOES

## Papel

Provisionamento registra previsoes gerenciais de desembolso por obra, competencia, item macro e apropriacao. Ele nao substitui titulo financeiro, pedido ou baixa.

## Dependencias obrigatorias

O modulo exige `FINANCEIRO` e `OBRAS`. Obras fornece estrutura e apropriacoes; Financeiro fornece realizado e compromissos oficiais. A provisao permanece uma camada de planejamento.

## Regras

- previsao deve possuir obra, competencia, classificacao e valor;
- alteracoes preservam historico e justificativa;
- importacoes precisam identificar lote e linha de origem;
- consolidacao nao pode somar duas versoes do mesmo item;
- realizado financeiro nao deve ser sobrescrito por previsao;
- vinculo futuro com solicitacao ou titulo exige chave unica e regra explicita;
- exclusao de previsao com historico deve ser logica.

## Relatorios

Dashboards comparam previsto, comprometido e realizado sem preencher lacunas por inferencia. Filtros por empresa, obra, competencia e item macro precisam usar as mesmas dimensoes dos demais relatorios.

## Mudanca segura

Validar importacao, edicao, historico, consolidacao, filtros, dashboards e reconciliacao com Obras e Financeiro. Os documentos antigos de sprint registram evolucao historica, nao a regra atual.
