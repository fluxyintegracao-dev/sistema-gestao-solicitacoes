# Modulo Fiscal - Fase 14 - Busca de Vinculos Manuais

## Objetivo

Melhorar o detalhe do documento fiscal para permitir que o usuario encontre registros existentes antes de registrar um vinculo manual.

## Entrega

- Nova rota protegida:
  - `GET /api/fiscal/documents/link-options`
- Busca por tipo:
  - solicitacao
  - solicitacao de compra
  - pedido
  - item do pedido
  - titulo financeiro
  - obra
  - fornecedor
  - centro de custo
  - plano financeiro
- A tela de detalhe do documento fiscal passa a exibir uma busca assistida dentro do bloco de vinculo manual.
- A selecao de um resultado preenche o ID correto no formulario de vinculo.
- Os campos de ID continuam disponiveis como fallback operacional.

## Seguranca

- A rota exige autenticacao.
- A rota usa a mesma permissao de vinculo fiscal (`fiscal.document.link`).
- A busca retorna apenas metadados operacionais resumidos, sem XML, arquivos fiscais, certificados ou segredos.
- Nao ha integracao automatica com financeiro, compras ou pedidos.

## Observacoes

- Esta fase nao cria migrations.
- Esta fase nao executa SEFAZ.
- Esta fase nao confirma vinculos automaticamente; apenas facilita a escolha manual do usuario.
