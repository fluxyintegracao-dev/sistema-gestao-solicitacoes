# Modulo COTACOES E PEDIDOS

## Papel

O modulo administra fornecedores convidados, tokens publicos, respostas, comparativo, escolha de vencedor e pedidos de compra. Ele depende de uma solicitacao de compra liberada.

## Cotacao

- cada fornecedor possui vinculo e token proprios;
- token permite somente acesso ao escopo daquela cotacao;
- prazo pode ser configurado por fornecedor;
- resposta registra preco, prazo, disponibilidade, minimos e observacoes;
- reenvio deve atualizar de forma controlada, sem criar fornecedor duplicado;
- configuracoes de minimo e criterio de vencedor sao validadas no backend;
- aprovacao fora do menor preco ou sem minimo pode exigir justificativa.

## Encerramento

- vencedor e selecionado por item;
- itens sem resposta ou sem vencedor precisam de tratamento explicito;
- encerramento e uma operacao idempotente;
- uma cotacao encerrada nao pode gerar pedidos novamente;
- reabertura, quando permitida, deve registrar motivo e bloquear efeitos inconsistentes.

## Pedido

- pedido nasce do resultado encerrado;
- alteracoes posteriores de quantidade, item e preco sao auditadas;
- status configuravel pode bloquear edicao;
- cancelamento verifica efeitos fiscais e financeiros;
- PDF e uma representacao; o estado oficial permanece no banco.

## Dependencias

Compras fornece itens e apropriacoes. Parceiros fornece fornecedores. Fiscal pode vincular documentos ao pedido. Financeiro pode gerar obrigacao a partir do pedido conforme regra explicita. Obras e relatorios consomem valores e apropriacoes.

## Seguranca

Rotas publicas aceitam somente o token e os campos do fornecedor. Uploads, CSV e respostas possuem limites e validacao. Rotas internas exigem permissao de compras/cotacoes.
