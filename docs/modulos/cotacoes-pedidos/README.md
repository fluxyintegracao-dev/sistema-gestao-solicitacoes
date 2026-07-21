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
- resposta registra preco unitario, quantidade disponivel, minimo por item, condicao de pagamento, prazo geral em dias corridos/uteis e observacoes;
- quantidade disponivel vazia ou zero remove a oferta daquele fornecedor do mapa comparativo sem remover a demanda original;
- IPI, ICMS e ST sao valores gerenciais em reais por item para toda a quantidade disponivel informada, nao aliquotas;
- DIFAL e um valor gerencial em reais no cabecalho da resposta e e rateado proporcionalmente pelo valor das mercadorias selecionadas;
- frete pode ser `SEM_FRETE`, `EMBUTIDO` ou `TERCEIRO`; no frete de terceiro, valor e vencimento sao obrigatorios e nome/documento do transportador sao opcionais;
- fornecedor pode salvar rascunho e enviar resposta final;
- CSV, XLSX, PDF e uploads usam o mesmo escopo do token;
- operador autorizado pode registrar ou editar resposta interna sem ampliar o escopo de itens;
- reenvio deve atualizar de forma controlada, sem criar fornecedor duplicado;
- configuracoes de minimo e criterio de vencedor sao validadas no backend;
- aprovacao fora do menor preco ou sem minimo pode exigir justificativa.

## Fechamento parcial e final

- vencedor e selecionado por item;
- o mapa comparativo considera apenas fornecedores nao cancelados com resposta valida;
- itens sem resposta ou sem vencedor precisam de tratamento explicito;
- cada rodada e registrada em `SolicitacaoCompraFechamento` como `PARCIAL` ou `FINAL`;
- fechamento parcial exige permissao `compras.cotacoes.fechar_parcial`, confirmacao explicita e justificativa;
- enquanto houver saldo, a solicitacao permanece em `FECHAMENTO_PARCIAL` e pode receber novas rodadas;
- fechamento final exige permissao de encerramento, consome todo o saldo elegivel e muda a solicitacao para `ENCERRADO`;
- pedidos e alocacoes de uma nova rodada sao acrescentados e nunca substituem os gerados anteriormente;
- a chave de idempotencia e escopada pela solicitacao e impede repetir a mesma rodada;
- cotacoes nao canceladas recebem `FINALIZADA` somente na rodada final;
- usuario autorizado apenas ao fechamento parcial nao pode consumir todo o saldo;
- a quantidade fechada pode superar a solicitada somente ate a disponibilidade declarada pelo fornecedor;
- todo excedente exige confirmacao e justificativa obrigatoria, gravadas no fechamento e no log para auditoria;
- reabertura, quando permitida, deve registrar motivo e bloquear efeitos inconsistentes.

## Pedido

- pedido nasce de uma rodada de fechamento e referencia `fechamento_id` quando criado pelo fluxo atual;
- o pedido preserva os valores rateados de IPI, ICMS, ST e DIFAL para formar o custo gerencial dos itens;
- frete embutido permanece como informacao da cotacao; frete pago a terceiro cria uma pendencia financeira idempotente, sem exigir credor na cotacao;
- quando o transportador nao for informado, o Financeiro escolhe o credor ao gerar o titulo de contas a pagar;
- pedidos legados sem `fechamento_id` continuam validos;
- alteracoes posteriores de quantidade, item e preco sao auditadas;
- status configuravel pode bloquear edicao;
- cancelamento verifica efeitos fiscais e financeiros; item/pedido sem titulo financeiro pode devolver saldo para nova rodada, mas a existencia de titulo bloqueia essa reversao;
- PDF e uma representacao; o estado oficial permanece no banco.

## Dependencias

Compras fornece itens e apropriacoes. Parceiros fornece fornecedores. Fiscal pode vincular documentos ao pedido. Financeiro pode gerar obrigacao a partir do pedido conforme regra explicita. Obras e relatorios consomem valores e apropriacoes.

## Seguranca

Rotas publicas aceitam somente o token e os campos do fornecedor. Uploads, CSV, XLSX, PDF, rascunho e resposta possuem limites e validacao. Rotas internas separam permissoes de visualizar, operar, editar respostas, cancelar, fechar parcialmente, encerrar, reabrir e gerar pedidos.
