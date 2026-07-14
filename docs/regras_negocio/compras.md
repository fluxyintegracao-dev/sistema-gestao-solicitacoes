# Regras de Negocio - Compras

## Solicitacao de Compra

- pode ser normal ou compra direta;
- pode ter itens cadastrados e itens manuais;
- cada item precisa de apropriacao valida e o rateio deve fechar a quantidade solicitada;
- apropriacoes pertencem a Obras e sao referenciadas por Compras;
- alteracao de quantidade ou apropriacao depois da criacao exige permissao especifica, validacao de escopo e auditoria;
- quando ha aprovacao por diretoria, a compra aguarda essa etapa; depois de aprovada segue diretamente para cotacao;
- os endpoints antigos de integracao e liberacao manual respondem `410` e nao fazem parte do fluxo vigente.

## Compra Direta

- usa `origem = COMPRA_DIRETA` e possui fluxo proprio de criacao e revisao;
- exige credor ativo marcado como fornecedor na entidade mestre `parceiros`;
- o usuario pode localizar um credor existente ou cadastra-lo no proprio fluxo;
- o cadastro rapido exige nome, CPF/CNPJ e telefone, aceita email e grava o parceiro ativo exclusivamente como fornecedor;
- itens podem ser importados por planilha XLSX e continuam sujeitos a obra, apropriacao, quantidade, valores e validacoes do backend.

## Cotacao

- fica disponivel quando a solicitacao esta liberada pelo fluxo interno ou aprovada pela diretoria;
- fornecedores podem ser:
  - parceiros fornecedores
  - fornecedores avulsos;
- categorias de parceiro ajudam na selecao de fornecedores;
- cada fornecedor recebe somente os itens marcados para ele na matriz;
- o backend valida que todo item selecionado pertence a mesma solicitacao de compra.

## Resposta do Fornecedor

- fornecedor responde por token publico;
- pode salvar rascunho antes do envio final;
- pode informar preco, prazo, disponibilidade, minimo por item e minimo do pedido;
- respostas podem ser enviadas pela pagina ou por arquivos suportados pelo fluxo;
- status, visualizacao e resposta ficam rastreados;
- resposta interna exige permissao propria e preserva o escopo da cotacao do fornecedor.

## Encerramento

- comprador escolhe vencedor e quantidade por item;
- encerramento gera os pedidos dos vencedores, fecha os pedidos automaticamente e marca as cotacoes nao canceladas como finalizadas;
- encerramento deve ser transacional e nao pode gerar os mesmos pedidos novamente.

## Pedido

- pedido pode ser ajustado manualmente conforme permissao e estado;
- itens podem ser removidos, alterados, adicionados ou remanejados dentro do universo elegivel;
- toda edicao manual de preco e quantidade precisa gerar log;
- status configuravel ou cotacao encerrada pode bloquear alteracao posterior;
- cancelamento e frete possuem regras e permissoes separadas.

## Cancelamento e preservacao

- cancelamento de solicitacao exige motivo;
- solicitacao com pedido gerado nao pode ser cancelada diretamente: o fluxo deve partir do pedido para preservar efeitos;
- o cancelamento e logico e a solicitacao permanece visivel para consulta e auditoria;
- o operador decide, quando permitido, se tambem cancela cotacoes e a solicitacao principal vinculada.
