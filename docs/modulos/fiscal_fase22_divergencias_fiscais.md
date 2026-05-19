# Modulo Fiscal - Fase 22 - Divergencias fiscais

## Objetivo

Criar uma visao centralizada e somente leitura das divergencias fiscais registradas nos documentos DFe.

## Entrega

- Endpoint protegido `GET /api/fiscal/divergences`.
- Service dedicado `fiscalDivergenceService`.
- Controller dedicado `FiscalDivergenceController`.
- Validacao de filtros por empresa, status, severidade, tipo e busca textual.
- Pagina frontend `/fiscal/divergencias`.
- Atalho no menu Fiscal.

## Regras mantidas

- Nenhuma consulta real a SEFAZ foi adicionada.
- Nenhum pedido, recebimento ou titulo financeiro e alterado.
- A tela apenas lista divergencias e direciona para o detalhe do documento fiscal.
- Acesso segue a permissao de visualizacao de documentos fiscais.

## Filtros disponiveis

- Empresa fiscal.
- Status da divergencia.
- Severidade.
- Tipo de divergencia.
- Busca por descricao, nota, chave ou fornecedor.

## Proxima etapa sugerida

Criar filtros e indicadores de divergencia no detalhe do documento e, depois, preparar fluxo de lote/relatorio para divergencias abertas por periodo.
