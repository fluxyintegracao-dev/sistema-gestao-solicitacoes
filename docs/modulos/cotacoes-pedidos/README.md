# Modulo COTACOES E PEDIDOS

## Papel

O modulo administra fornecedores convidados, escopo de itens por fornecedor, tokens publicos, respostas, comparativo, escolha de vencedor e pedidos de compra. Ele depende de uma solicitacao aprovada/liberada pelo fluxo interno de Compras.

## Cotacao

- cada fornecedor possui vinculo e token proprios;
- a matriz `fornecedores[].itens` define quais itens cada fornecedor recebe;
- cada fornecedor precisa receber ao menos um item;
- IDs cadastrados e manuais sao normalizados e obrigatoriamente validados contra a mesma solicitacao de compra;
- o payload global de itens permanece apenas como compatibilidade; a matriz por fornecedor e o contrato canonico;
- token permite somente acesso ao escopo daquela cotacao;
- prazo pode ser configurado por fornecedor;
- resposta registra preco, prazo, disponibilidade, minimos e observacoes;
- fornecedor pode salvar rascunho e enviar resposta final;
- CSV, XLSX, PDF e uploads usam o mesmo escopo do token;
- operador autorizado pode registrar ou editar resposta interna sem ampliar o escopo de itens;
- reenvio deve atualizar de forma controlada, sem criar fornecedor duplicado;
- configuracoes de minimo e criterio de vencedor sao validadas no backend;
- aprovacao fora do menor preco ou sem minimo pode exigir justificativa.

## Encerramento

- vencedor e selecionado por item;
- o mapa comparativo considera apenas fornecedores nao cancelados com resposta valida;
- itens sem resposta ou sem vencedor precisam de tratamento explicito;
- encerramento e uma operacao idempotente;
- uma cotacao encerrada nao pode gerar pedidos novamente;
- ao encerrar, pedidos sao gerados/fechados e as cotacoes nao canceladas recebem status `FINALIZADA` na mesma transacao;
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

Rotas publicas aceitam somente o token e os campos do fornecedor. Uploads, CSV, XLSX, PDF, rascunho e resposta possuem limites e validacao. Rotas internas separam permissoes de visualizar, operar, editar respostas, cancelar, encerrar, reabrir e gerar pedidos.
