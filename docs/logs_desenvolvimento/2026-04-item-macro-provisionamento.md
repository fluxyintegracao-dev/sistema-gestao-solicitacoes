# 2026-04 - Item Macro no Provisionamento Financeiro

## Objetivo
Ajustar a tela de `Nova Provisao` para usar entrada curta em texto livre no campo macro do item, reduzindo friccao operacional.

## Alteracoes
- `Categoria macro` passou a ser exibido como `Item Macro` na criacao, edicao, listagem, exportacao CSV e dashboard do modulo.
- `Nova Provisao` deixou de usar `select` obrigatorio e passou a usar `input` curto com sugestoes (`datalist`) das categorias existentes.
- o backend passou a resolver `item_macro` em texto livre para `categoria_macro_id`, reutilizando categoria existente por nome ou criando uma nova automaticamente quando necessario.
- o campo `Comentario inicial` foi removido da tela de criacao; a `Descricao` permaneceu como campo principal de contexto da previsao.

## Impacto esperado
- menor tempo de preenchimento para engenheiros e equipe de obra
- menor dependencia de manutencao manual previa da lista de categorias
- sem migracao de banco nesta etapa
