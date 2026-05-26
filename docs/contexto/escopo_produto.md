# Contexto - Escopo do Produto

## Escopo Atual

O produto hoje cobre:

- solicitacoes operacionais por setor e obra
- solicitacoes de compra com itens cadastrados e manuais
- apropriacao simples e multipla por item
- centro de cotacao com resposta publica por token
- geracao de pedidos de compra e ajuste manual com auditoria
- parceiros unificados com categorias
- titulos financeiros a pagar e receber
- criacao manual de contas sem solicitacao
- baixa, estorno, juros, multa e desconto
- relatorios financeiros e fluxo de caixa
- conciliacao bancaria por OFX
- gestao de obras com orcamento, custos, parcelas, pedidos e relatorio final

O escopo atual sustenta a proposta de uma infraestrutura operacional institucional, com prioridade em estabilidade, rastreabilidade, governanca, seguranca, documentacao e continuidade operacional.

## Escopo Institucional Atual

- operacao interna controlada;
- core operacional protegido;
- multiempresa dentro da mesma instalacao;
- modulos habilitaveis e desabilitaveis;
- permissoes granulares por usuario, area e visibilidade;
- dados financeiros, fiscais, RH/DP e SST tratados como criticos;
- documentacao operacional e tecnica como parte do produto.

## Evolucao Planejada

Apos o modulo SST, o projeto deve reduzir abertura de grandes frentes funcionais e priorizar consolidacao operacional.

Escopo tecnico priorizado:

- testes automatizados;
- homologacao formal;
- CI/CD;
- deploy e rollback;
- revisao de seguranca;
- revisao de permissoes;
- observabilidade;
- modularizacao de services, controllers e rotas;
- reducao de arquivos gigantes;
- documentacao de regras implicitas;
- onboarding tecnico futuro.

## Fora de Escopo Atual

- multi-tenant SaaS com base compartilhada
- novo repositorio multi-tenant
- expansao comercial massificada
- novos grandes modulos estruturais depois de SST sem nova aprovacao estrategica
- contabilizacao automatica completa
- conciliacao bancaria 100% automatica
- workflow altamente customizavel por script do cliente

## Limite Deliberado do Produto

O FLUXY nao busca competir com ERPs generalistas em amplitude. Nesta fase, ele busca ser melhor em:

- operacional do dia a dia
- visibilidade por obra
- rastreabilidade
- estabilidade institucional
- governanca
- seguranca
- confiabilidade
- facilidade de uso
- configuracao de produto sem hardcodes por cliente
