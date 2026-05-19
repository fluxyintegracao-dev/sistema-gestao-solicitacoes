# Fiscal - Fase 21: filtros da Caixa de Entrada

## Objetivo
Melhorar a consulta operacional da Caixa de Entrada Fiscal sem alterar documentos, pedidos, financeiro ou sincronizacao SEFAZ.

## Entregue
- Novos filtros backend em `GET /api/fiscal/documents`:
  - empresa fiscal
  - status do documento
  - tipo documental
  - origem
  - status de manifestacao
  - CNPJ do fornecedor
  - periodo de emissao
  - faixa de valor
  - com/sem XML
  - com/sem PDF/DANFE
  - busca textual
- Tela de documentos fiscais com formulario de filtros.
- Validacoes de intervalo de data e valor.

## Regras preservadas
- Nenhuma migration nova.
- Nenhum job automatico.
- Nenhuma consulta SEFAZ real.
- Nenhum vinculo ou status e alterado pela filtragem.
