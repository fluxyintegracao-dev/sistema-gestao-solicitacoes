# Filtro de credor nas parcelas de contrato — 2026-08-31

## Diagnostico

No fluxo novo, as previsoes financeiras nascem com o contratado em `parceiro_id`. Quando uma
medicao e aprovada, o titulo medido passa corretamente para `ABERTO` e seu `parceiro_id` e trocado
para o favorecido efetivo informado na medicao. Por isso, ao filtrar a tela de titulos pelo
contratado, apareciam apenas as parcelas ainda em `PREVISAO`; a parcela aprovada continuava
existindo, mas passava a responder somente ao filtro do favorecido.

## Correcao

O filtro `parceiro_id` da listagem de titulos agora considera duas relacoes:

1. o credor/favorecido atual do titulo;
2. o vinculo do parceiro em `contrato_credores` para contratos do fluxo novo.

Na segunda alternativa, a consulta restringe os resultados a `origem_titulo = 'CONTRATO'` e a
solicitacao proprietaria do contrato. Assim, a busca pelo contratado recupera o cronograma
completo, inclusive as medicoes aprovadas, sem trocar de volta o favorecido real do pagamento e
sem incluir outros titulos eventuais da mesma solicitacao.

## Arquivos alterados

- `backend/src/services/tituloFinanceiroService.js`
- `docs/workspace/OWNERSHIP_ATIVO.md`

## Validacoes

- `node --check backend/src/services/tituloFinanceiroService.js`
- carregamento isolado de `tituloFinanceiroService.js`
- `node scripts/validarFiltroValorTitulos.js`
- `git diff --check`

## Validacao funcional em dev

1. Filtrar os titulos pelo contratado do CT-0002.
2. Confirmar que aparecem as quatro parcelas: a medicao aprovada como `ABERTO` e as tres futuras
   como `PREVISAO`.
3. Confirmar que a coluna Credor da parcela aberta continua mostrando o favorecido informado na
   medicao, pois ele e o recebedor real.
4. Filtrar pelo favorecido real e confirmar que a parcela aberta tambem aparece.

Nao ha migration e nao houve alteracao de dados existentes.
