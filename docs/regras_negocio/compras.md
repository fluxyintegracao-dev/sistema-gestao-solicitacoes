# Regras de Negocio - Compras

## Solicitacao de Compra

- pode ter itens cadastrados e itens manuais
- cada item precisa de apropriacao valida
- o rateio por item deve fechar 100%

## Cotacao

- so pode ser enviada apos integracao/liberacao para compra
- fornecedores podem ser:
  - parceiros fornecedores
  - fornecedores avulsos
- categorias de parceiro ajudam na selecao de fornecedores

## Resposta do Fornecedor

- fornecedor responde por token publico
- pode informar preco, prazo, disponibilidade, minimo por item e minimo do pedido
- status da resposta fica rastreado

## Encerramento

- comprador escolhe vencedor por item
- encerramento gera base para pedido de compra

## Pedido

- pedido pode ser ajustado manualmente apos a geracao
- itens podem ser removidos, alterados ou adicionados a partir do universo cotado
- toda edicao manual de preco e quantidade precisa gerar log
- status configuravel pode bloquear alteracao posterior
