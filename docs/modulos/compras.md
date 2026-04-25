# Modulo - Compras

## Objetivo

Transformar a necessidade de compra em um fluxo rastreavel com itens, apropriacao, cotacao, comparativo e pedido.

## O que o modulo entrega hoje

- solicitacao de compra com itens cadastrados e manuais
- apropriacao simples ou multipla por item
- revisao operacional da solicitacao
- PDF da solicitacao com distribuicao por apropriacao
- centro de cotacao no detalhe da compra
- envio de cotacao por link publico
- selecao de parceiros por categoria
- comparativo por fornecedor
- encerramento da cotacao
- geracao de pedidos de compra
- gestao de pedidos com edicao e auditoria de itens
- PDF do pedido e apoio ao envio por WhatsApp

## Fluxo Principal

1. Criar solicitacao de compra.
2. Adicionar itens.
3. Apropriar os itens.
4. Revisar.
5. Integrar/liberar para compra.
6. Selecionar fornecedores.
7. Gerar links de cotacao.
8. Receber respostas.
9. Encerrar cotacao.
10. Gerar pedidos.

## Pontos de Atencao

- o pedido nasce da cotacao, mas pode ser ajustado manualmente
- alteracoes de itens no pedido geram trilha de auditoria
- minimo por item e minimo por pedido podem impactar escolha do fornecedor
- status de pedido pode bloquear edicao

## Permissoes de Pedidos

- a listagem, o detalhe e o PDF de pedidos seguem o acesso ao modulo `COMPRAS` e o escopo de obras do usuario
- usuarios de compras, GEO e usuarios liberados para solicitacao de compra podem consultar pedidos dentro do seu escopo
- alteracao de status, adicao, edicao e remocao de itens permanecem restritas ao setor de compras e administradores de negocio

## Relacao com Apropriacoes

O modulo `COMPRAS` consome apropriacoes por item, mas nao e o dono tecnico desse cadastro.

Regra oficial:

- o cadastro mestre de apropriacoes pertence ao dominio `OBRAS`
- `COMPRAS` reutiliza esse cadastro por API compartilhada
- para novas implantacoes, se a operacao de compras exigir apropriacao por item, a combinacao recomendada e `COMPRAS + OBRAS`
