# Documentacao - FLUXY

Este diretorio organiza o conhecimento funcional, tecnico e operacional do produto para continuidade segura por pessoas e por IA.

O produto esta evoluindo para um ERP simples, intuitivo, de facil registro e controle, sem perder o foco operacional e a implantacao enxuta.

## Objetivo

Manter documentado:

- o contexto de produto
- a arquitetura atual
- as regras de negocio
- os modulos ativos
- a seguranca aplicada
- o historico de decisoes e mudancas

## Ordem Recomendada de Leitura

1. `docs/contexto/visao_geral.md`
2. `docs/contexto/escopo_produto.md`
3. `docs/arquitetura/visao_geral.md`
4. `docs/arquitetura/stack_e_componentes.md`
5. `docs/arquitetura/deploy_ambientes.md`
6. `docs/arquitetura/fluxos_principais.md`
7. `docs/arquitetura/modularidade_solicitacoes_contratos_apropriacoes.md`
8. `docs/modulos/solicitacoes.md`
9. `docs/modulos/compras.md`
10. `docs/modulos/financeiro.md`
11. `docs/modulos/comercial.md`
12. `docs/modulos/provisionamento_financeiro.md`
13. `docs/modulos/rh_dp.md`
14. `docs/modulos/integracao_sienge.md`
15. `docs/modulos/obras.md`
16. `docs/seguranca/visao_geral.md`

## Estrutura

- `docs/contexto`
  Resume posicionamento, escopo, origem do produto e publico-alvo.

- `docs/arquitetura`
  Explica stack, deploy, banco, fluxos macro e responsabilidades de cada camada.

- `docs/regras_negocio`
  Documenta regras operacionais que nao devem ficar apenas implcitas no codigo.

- `docs/modulos`
  Descreve o comportamento de cada modulo na pratica.

- `docs/seguranca`
  Registra autenticacao, autorizacao, auditoria, anexos e protecoes da API.

- `docs/logs_desenvolvimento`
  Guarda changelog e decisoes que impactam continuidade do produto.

- `docs/prompts_padrao`
  Base para trabalho assistido por IA em feature, bugfix e refactor.

## Documentos Operacionais Importantes

- `docs/arquitetura/deploy_ambientes.md`
- `docs/ROTEIRO_APRESENTACAO_TREINAMENTO_FLUXY.md`
- `docs/CHECKLIST_IMPLANTACAO_CLIENTE_FLUXY.md`
- `docs/MANUAL_FLUXO_OPERACIONAL_FINANCEIRO.md`
- `docs/CHECKLIST_ATIVACAO_MODULO_COMPRAS.md`
- `docs/PLANO_INTEGRACAO_MODULO_COMPRAS.md`
- `docs/RELATORIO_FUNCIONALIDADES_REGRAS_E_VALOR.md`
- `docs/arquitetura/modularidade_solicitacoes_contratos_apropriacoes.md`
- `docs/modulos/comercial.md`
- `docs/modulos/provisionamento_financeiro.md`
- `docs/modulos/integracao_sienge.md`
- `docs/PLANO_MODULO_COMERCIAL_CONSTRUCAO_CIVIL.md`
- `docs/PLANO_MODULO_RH_DP_E_INTEGRACAO_SIENGE.md`

## Regras de Manutencao

- Mudanca de regra de negocio deve atualizar `docs/regras_negocio`.
- Mudanca estrutural deve atualizar `docs/arquitetura`.
- Mudanca funcional relevante deve atualizar `docs/modulos`.
- Toda entrega importante deve registrar resumo em `docs/logs_desenvolvimento/changelog.md`.
- Documentacao deve permanecer em ASCII para reduzir risco de problema de encoding no projeto.
