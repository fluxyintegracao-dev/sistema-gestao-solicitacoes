# 2026-04 Ajustes de Listagem do Provisionamento

## Escopo
- simplificacao da experiencia web do modulo de provisionamento financeiro
- foco em acompanhamento das previsoes, sem exposicao de etapas de status na interface principal

## Alteracoes
- remocao do filtro e da coluna de status na listagem web
- remocao da escolha de status na tela de nova provisao
- remocao das acoes de etapa no detalhe web (aprovar, cancelar, realizar, mover para analise)
- ordenacao movida para clique direto nos cabecalhos da tabela
- ordenacao do codigo `PREVx-n` ajustada no backend para usar o numero apos o `-`
- inclusao de barra operacional acima da tabela com:
  - exportacao
  - colunas visiveis
  - filtros visiveis
  - atalho para nova provisao
  - atalho para categorias macro

## Validacao
- `node --check backend/src/controllers/ProvisaoFinanceiraController.js`
- `npm run build` em `frontend/`

## Observacoes
- o backend continua preservando o campo `status` para compatibilidade e historico
- a interface web atual do modulo passa a operar como acompanhamento gerencial de previsoes
