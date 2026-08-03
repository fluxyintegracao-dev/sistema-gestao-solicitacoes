# Custos e Recebíveis — planejamento mensal

## Escopo

O planejamento mensal usa a estrutura macro da versão publicada do orçamento da obra somente como referência de agrupamento. A tela não replica toda a planilha micro no preenchimento da competência.

## Custos planejados

- Cada etapa macro possui seus próprios subitens mensais.
- O usuário inclui os subitens livremente e informa descrição do serviço, unidade, quantidade e valor unitário.
- O valor planejado do subitem é `quantidade × valor unitário`.
- Novos subitens são acrescentados abaixo dos existentes na mesma etapa.
- O subitem pertence à competência e não altera a planilha orçamentária publicada nem o cadastro de apropriações.
- Ao excluir um subitem do planejamento mensal, as previsões de medição e medições aprovadas vinculadas a ele são removidas pela mesma transação relacional.

## Obra pública — Medição Prevista

Depois de salvar os custos planejados, o usuário seleciona em cada etapa macro quais subitens farão parte da Medição Prevista. O sistema carrega automaticamente descrição, unidade, quantidade planejada e valor unitário. O único valor operacional informado nessa etapa é a quantidade medida prevista.

O valor da Medição Prevista é calculado por `quantidade medida × valor unitário do subitem`. A quantidade não pode superar a quantidade planejada no subitem.

## Obra pública — Medição Aprovada

A Medição Aprovada continua sendo uma etapa posterior e independente. Ela referencia o mesmo subitem mensal, não pode superar a Medição Prevista e exige justificativa quando houver glosa.

## Obra privada

Obras privadas mantêm o fluxo de custos planejados seguido da leitura automática dos recebíveis financeiros da competência. Não existe etapa de Medição Prevista ou Medição Aprovada para obra privada.

## Integridade

- Subitens mensais são identificados por chave local idempotente enquanto ainda não possuem ID no banco.
- Salvamentos atualizam registros existentes, criam os novos e removem somente os itens omitidos daquela competência.
- As operações permanecem transacionais e respeitam as regras de competência finalizada, vencida ou reaberta.
- Os campos legados baseados em item do plano continuam aceitos internamente para compatibilidade, embora o fluxo novo use `previsao_custo_id`.

