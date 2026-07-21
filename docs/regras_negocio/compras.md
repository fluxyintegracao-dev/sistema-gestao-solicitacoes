# Regras de Negocio - Compras

## Solicitacao de Compra

- pode ser normal ou compra direta;
- pode ter itens cadastrados e itens manuais;
- cada item precisa de apropriacao valida e o rateio deve fechar a quantidade solicitada;
- apropriacoes pertencem a Obras e sao referenciadas por Compras;
- alteracao de quantidade ou apropriacao depois da criacao exige permissao especifica, validacao de escopo e auditoria;
- novas compras nao passam por aprovacao da diretoria: a normal nasce `LIBERADO_PARA_COMPRA` em Compras e a direta nasce `ENVIADO` em Gerencia de Processos;
- campos e endpoints de diretoria permanecem somente para compatibilidade de registros antigos ja marcados com esse fluxo;
- os endpoints antigos de integracao e liberacao manual respondem `410` e nao fazem parte do fluxo vigente.

## Compra Direta

- usa `origem = COMPRA_DIRETA` e possui fluxo proprio de criacao e revisao;
- exige credor ativo marcado como fornecedor na entidade mestre `parceiros`;
- o usuario pode localizar um credor existente ou cadastra-lo no proprio fluxo;
- o cadastro rapido exige nome, CPF/CNPJ e telefone, aceita email e grava o parceiro ativo exclusivamente como fornecedor;
- itens podem ser importados por planilha XLSX e continuam sujeitos a obra, apropriacao, quantidade, valores e validacoes do backend.

## Cotacao

- fica disponivel quando a solicitacao normal esta liberada para Compras;
- fornecedores podem ser:
  - parceiros fornecedores
  - fornecedores avulsos;
- categorias de parceiro ajudam na selecao de fornecedores;
- cada fornecedor recebe somente os itens marcados para ele na matriz;
- o backend valida que todo item selecionado pertence a mesma solicitacao de compra.

## Resposta do Fornecedor

- fornecedor responde por token publico;
- pode salvar rascunho antes do envio final;
- informa preco unitario e quantidade disponivel por item; vazio ou zero significa que a oferta nao participa do comparativo;
- o prazo de entrega e geral para a resposta e distingue dias corridos de dias uteis; nao existe prazo de entrega por item no fluxo vigente;
- novas respostas nao informam nem exibem data de chegada por item; o campo legado `data_chegada` permanece no backend somente para compatibilidade historica e nao compoe o fluxo operacional atual;
- IPI, ICMS e ST sao valores em reais fechados para toda a quantidade disponivel daquele item;
- DIFAL e informado em reais no cabecalho e rateado proporcionalmente pelo valor das mercadorias efetivamente compradas;
- os valores fiscais sao gerenciais para decisao e custo interno; a escrituracao contabil continua baseada na nota fiscal e na contabilidade;
- frete pode ser sem frete, embutido ou pago a terceiro; para terceiro, valor e data de pagamento sao obrigatorios, enquanto transportador e CPF/CNPJ sao opcionais;
- pode informar minimo por item, minimo do pedido e desconto total;
- respostas podem ser enviadas pela pagina ou por arquivos suportados pelo fluxo;
- status, visualizacao e resposta ficam rastreados;
- resposta interna exige permissao propria e preserva o escopo da cotacao do fornecedor.

## Encerramento

- comprador escolhe vencedor e quantidade por item;
- uma rodada parcial gera somente os pedidos e alocacoes das quantidades escolhidas, preservando o saldo restante em `FECHAMENTO_PARCIAL`;
- a rodada final consome todo o saldo elegivel e leva a solicitacao a `ENCERRADO`;
- o encerramento sem pedido e um fluxo independente: exige a permissao `compras.cotacoes.encerrar_sem_pedido`, confirmacao e justificativa, preserva pedidos anteriores e encerra o saldo remanescente sem criar pedido, alocacao, frete ou efeito financeiro;
- cancelar cotacao e gerar pedidos selecionados mantem seus comportamentos existentes e nao sao substituidos pelo encerramento sem pedido;
- rodadas sao registradas em `SolicitacaoCompraFechamento` e novos pedidos/alocacoes sao acrescentados sem substituir os anteriores;
- e permitido fechar acima da quantidade solicitada, limitado a quantidade ainda disponivel na resposta do fornecedor;
- fechamento excedente exige confirmacao e justificativa obrigatoria, preservadas no fechamento e no log para auditoria;
- fechamento deve ser transacional e idempotente e nao pode gerar os mesmos pedidos novamente.
- uma solicitacao ja encerrada nao aceita geracao posterior de pedidos; se o cancelamento de pedido anterior devolver novo saldo, a sincronizacao operacional pode retornar a compra para `FECHAMENTO_PARCIAL` com auditoria.

## Pedido

- pedido pode ser ajustado manualmente conforme permissao e estado;
- itens podem ser removidos, alterados, adicionados ou remanejados dentro do universo elegivel;
- toda edicao manual de preco e quantidade precisa gerar log;
- status configuravel ou cotacao encerrada pode bloquear alteracao posterior;
- cancelamento e frete possuem regras e permissoes separadas.
- IPI, ICMS, ST e DIFAL rateados compoem o valor gerencial do item e do pedido;
- frete pago a terceiro gera pendencia para Contas a Pagar; se a cotacao nao identificar o transportador, o Financeiro define o credor ao gerar o titulo.

## Cancelamento e preservacao

- cancelamento de solicitacao exige motivo;
- solicitacao com pedido gerado nao pode ser cancelada diretamente: o fluxo deve partir do pedido para preservar efeitos;
- o cancelamento e logico e a solicitacao permanece visivel para consulta e auditoria;
- o operador decide, quando permitido, se tambem cancela cotacoes e a solicitacao principal vinculada.
