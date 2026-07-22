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
- a quantidade disponivel representa a capacidade total vigente do fornecedor para o item na cotacao, e nao uma quantidade incremental por edicao;
- o saldo compravel do fornecedor e calculado por `fornecedor + item`: quantidade disponivel vigente menos todas as alocacoes ativas ja compradas desse fornecedor para o mesmo item, mesmo que a resposta tenha sido versionada e recebido outro ID;
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
- uma solicitacao encerrada nao aceita geracao posterior de pedidos enquanto permanecer `ENCERRADO`;
- a edicao interna de uma resposta encerrada pode reabrir a solicitacao para `FECHAMENTO_PARCIAL` somente quando aumentar efetivamente o saldo disponivel de ao menos um item daquele fornecedor; salvar rascunho e alterar a quantidade originalmente solicitada permanecem bloqueados nesse caso;
- a reabertura registra fornecedor, usuario, disponibilidade anterior e nova, quantidade ja comprada e saldo liberado; o link publico do fornecedor continua sem poder alterar cotacao encerrada;
- depois da reabertura, a nova compra continua limitada ao saldo do fornecedor e, quando ultrapassa a quantidade originalmente solicitada, exige confirmacao e justificativa de excedente;
- se o cancelamento de pedido anterior devolver novo saldo, a sincronizacao operacional tambem pode retornar a compra para `FECHAMENTO_PARCIAL` com auditoria.

## Pedido

- pedido pode ser ajustado manualmente conforme permissao e estado;
- reabrir pedido exige permissao e motivo, retorna o pedido ao status aberto configurado e serve para permitir edicao de quantidade, preco, itens e remanejamento; a reabertura nao cancela nem reduz as alocacoes existentes;
- pedido com titulo financeiro ou frete com titulo vinculado nao pode ser reaberto: o efeito financeiro precisa ser tratado antes;
- quando a compra estava encerrada, a reabertura coloca a solicitacao em revisao (`FECHAMENTO_PARCIAL` quando existem alocacoes) e marca a cotacao do fornecedor como `REABERTA`;
- itens podem ser removidos, alterados, adicionados ou remanejados dentro do universo elegivel;
- remanejamento transfere a quantidade entre fornecedores sem aumentar a quantidade total comprada: reduz ou cancela a alocacao de origem e cria uma alocacao ativa no destino;
- o fornecedor de destino deve ter resposta vigente, preco e saldo real suficiente, calculado pela capacidade total menos todas as alocacoes ativas anteriores daquele fornecedor e item;
- remanejamento e bloqueado quando o pedido de origem ou o pedido de destino possui efeitos financeiros vinculados;
- IPI, ICMS, ST, DIFAL, desconto e frete pendente sao recalculados ou rateados na mesma transacao do remanejamento;
- depois dos ajustes, os pedidos envolvidos permanecem abertos e precisam voltar ao status fechado com o fornecedor quando a negociacao estiver concluida;
- quando todos os pedidos ativos ficam fechados e nao existe saldo da solicitacao, a compra volta a `ENCERRADO` e as cotacoes nao canceladas ficam `FINALIZADA`;
- se um pedido for cancelado, suas alocacoes deixam de consumir saldo, a compra volta ao estado operacional conforme o saldo e a resposta do fornecedor permanece `RESPONDIDO`; a cotacao somente fica `CANCELADA` quando o operador solicita explicitamente o cancelamento da cotacao;
- toda edicao manual de preco e quantidade precisa gerar log;
- status configuravel ou cotacao encerrada pode bloquear alteracao posterior;
- cancelamento e frete possuem regras e permissoes separadas.
- IPI, ICMS, ST e DIFAL rateados compoem o valor gerencial do item e do pedido;
- frete pago a terceiro gera pendencia para Contas a Pagar; se a cotacao nao identificar o transportador, o Financeiro define o credor ao gerar o titulo.

## Delegacao

- somente usuario ativo pertencente a um setor ativo marcado com `eh_setor_compras = true` pode ser escolhido como responsavel;
- pertencimento considera tanto `users.setor_id` quanto os vinculos adicionais de `usuario_setores`, sem depender do nome, codigo ou ID fixo do setor;
- `SUPERADMIN` continua fora da lista operacional de responsaveis, preservando o comportamento anterior da selecao;
- consultar candidatos exige permissao de gerenciamento da Delegacao de Compras; usuarios com acesso apenas para registrar atraso nao carregam essa lista;
- remover o responsavel continua permitido;
- atribuicao historica que deixou de ser elegivel nao e apagada automaticamente: permanece identificada na tela e precisa ser substituida ou removida antes de um novo salvamento gerencial;
- o backend valida novamente usuario, atividade e setor no momento da gravacao e replica o responsavel validado para a solicitacao e seus pedidos vinculados na mesma transacao.

## Cancelamento e preservacao

- cancelamento de solicitacao exige motivo;
- solicitacao com pedido gerado nao pode ser cancelada diretamente: o fluxo deve partir do pedido para preservar efeitos;
- o cancelamento e logico e a solicitacao permanece visivel para consulta e auditoria;
- o operador decide, quando permitido, se tambem cancela cotacoes e a solicitacao principal vinculada.
