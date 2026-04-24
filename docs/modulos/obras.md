# Modulo - Obras

## Objetivo

Dar visibilidade operacional e financeira por obra, consolidando orcamento, custo, parcelas, pedidos, arquivos e relatorio final.

## O que o modulo entrega hoje

- cards de obras com resumo
- pagina de gerenciamento da obra
- abas de dashboard, orcamento, custos, parcelas, pedidos, arquivos e relatorio final
- orcamento por apropriacao
- gestao administrativa de apropriacoes por obra
- custo executado vindo do financeiro
- parcelas abertas vinculadas a obra
- pedidos operacionais e pedidos de compra da obra
- arquivos e comprovantes relacionados
- classificacao da obra (PRIVADA ou PUBLICA)
- campos financeiros por classificacao: VGV (privada) ou planilha geral (publica)
- margem de custo esperada (percentual)
- orcamento calculado automaticamente: valor_referencia * (1 - margem / 100)
- pagina Resultado de Obras com dashboard financeiro consolidado por obra

## Campos Financeiros da Obra

- `classificacao` VARCHAR(20): PRIVADA ou PUBLICA. Define qual valor de referencia usar.
- `vgv` DECIMAL(14,2): Valor Geral de Vendas. Usado somente em obras PRIVADA.
- `planilha_geral` DECIMAL(14,2): Valor contratado ou licitado. Usado somente em obras PUBLICA.
- `margem_custo_esperada` DECIMAL(5,2): Percentual do valor de referencia reservado para custos de obra.
- `orcamento` (calculado): valor_referencia * (1 - margem / 100). Exemplo: VGV 42M com margem 30% = orcamento 29.4M.

## Pagina Resultado de Obras

Rota: `/financeiro/relatorios/resultado-obras`
API: `GET /financeiro/relatorios/resultado-obras`

Exibe por obra:
- VGV ou planilha geral
- orcamento calculado
- executado: soma de `valor_baixado` dos titulos PAGAR nao cancelados
- recebido: soma de `valor_baixado` dos titulos RECEBER nao cancelados
- falta receber: soma de `valor_saldo` dos titulos RECEBER nao cancelados
- barras de progresso: executado/orcamento e recebido/total_receber

Filtros disponiveis: Todas / Privadas / Publicas.
Totais consolidados atualizados conforme filtro selecionado.

## Origem dos Dados

- orcamento
  Apropriacoes da obra e seus valores orcados (modulo de gestao).
  No Resultado de Obras, o orcamento vem dos campos financeiros da obra.

- custos
  Movimentos financeiros pagos e ativos ligados a titulos da obra.

- parcelas
  Titulos a pagar em aberto ou parcial da obra.

- pedidos
  Numeros de pedido em solicitacoes e pedidos de compra gerados.

## Funcao Gerencial

O modulo de obras fecha a leitura operacional do projeto. Ele nao substitui a solicitacao nem o financeiro, mas consolida ambos sob o contexto da obra.
A pagina Resultado de Obras complementa essa visao com o desempenho financeiro real de cada obra frente ao orcamento esperado.

## Apropriacoes como Dominio Compartilhado

As apropriacoes pertencem tecnicamente ao dominio `OBRAS`.

Elas sao:

- cadastradas e geridas a partir do contexto de obras
- consumidas por `SOLICITACOES`
- consumidas por `COMPRAS`
- consumidas por `FINANCEIRO`

API oficial compartilhada:

- `GET /apropriacoes`
- `POST /apropriacoes`
- `PUT /apropriacoes/:id`
- `DELETE /apropriacoes/:id`

Regra de acesso:

- leitura liberada para modulos consumidores habilitados
- gestao administrativa condicionada ao modulo `OBRAS`
