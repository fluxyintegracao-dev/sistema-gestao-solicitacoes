# Modulo COMPRAS

## Papel e fronteira

Compras e dono da solicitacao de compra, origem normal/direta, itens, quantidades e rateios de apropriacao. Cotacoes, respostas e pedidos pertencem ao modulo COTACOES. Obras e dono das apropriacoes e Parceiros e dono dos credores/fornecedores referenciados.

## Regras dos itens

- item pode vir do cadastro ou ser manual;
- quantidade e unidade devem ser validas;
- cada item exige apropriacao conforme a operacao;
- a soma das quantidades apropriadas deve fechar a quantidade solicitada do item;
- alteracao de quantidade e apropriacoes exige permissao especifica, escopo da compra e auditoria;
- alteracao de item depois de etapas dependentes precisa ser bloqueada ou versionada;
- cancelamento exige motivo, interrompe novas acoes e preserva o registro visivel no historico;
- exclusao de solicitacao integrada, cotada ou com pedido deve ser bloqueada.

## Compra direta

- usa fluxo proprio de criacao/revisao e pode importar itens por XLSX;
- exige obra e credor ativo marcado como fornecedor;
- permite localizar o credor na base de Parceiros ou cadastra-lo no proprio fluxo;
- cadastro rapido exige nome, CPF/CNPJ e telefone e aceita email;
- valores, desconto, anexos, itens e apropriacoes sao validados no backend.

## Fluxo

1. usuario cria a compra;
2. itens e apropriacoes sao validados;
3. compra normal nasce em `LIBERADO_PARA_COMPRA` e segue diretamente para Compras;
4. compra direta nasce em `ENVIADO` e segue para Gerencia de Processos;
5. nao existe aprovacao previa por diretoria para novos registros;
6. cancelamento posterior precisa verificar cotacoes, pedidos, fiscal e financeiro.

Campos e rotas de diretoria ainda presentes no backend atendem somente compras antigas formalmente marcadas com esse fluxo e nao definem a criacao vigente.

As rotas antigas `PATCH /compras/solicitacoes/:id/integrar` e `PATCH /compras/solicitacoes/:id/liberar` respondem `410`. O codigo depois desse retorno e legado inacessivel e nao define a regra vigente.

## Dependencias

- parceiro fornece solicitante/fornecedor quando aplicavel;
- Obras fornece apropriacoes;
- Solicitacoes pode ser origem, sem perder sua propria trilha;
- Cotacoes consome a compra normal liberada diretamente para Compras;
- Fiscal e Financeiro consomem pedidos e obrigacoes posteriores, nao o rascunho da compra.

## Delegacao de compras

- a lista de responsaveis aceita somente usuarios ativos vinculados a setor ativo com a capacidade `eh_setor_compras`;
- o vinculo pode ser o setor principal do usuario ou um setor adicional registrado em `usuario_setores`;
- o endpoint dedicado `GET /compras/delegacao/usuarios` exige permissao de gerenciamento da delegacao e nao altera o endpoint generico de usuarios usado por outros fluxos;
- o backend revalida a elegibilidade dentro da transacao ao salvar, protegendo contra desativacao ou troca de setor ocorrida depois do carregamento da tela;
- atribuições historicas a usuarios fora de Compras sao preservadas para consulta, mas um novo salvamento gerencial exige trocar ou remover esse responsavel.

## Idempotencia

Criacao, encaminhamento, aprovacao, cancelamento e envio para cotacao devem impedir repeticao concorrente. O backend deve revalidar status em transacao; o frontend bloqueia multiplos cliques.

No fechamento de cotacao, a mesma chave de idempotencia nao pode repetir pedidos, alocacoes nem frete pago a terceiro. Quantidade acima da solicitada exige justificativa auditavel e nunca pode ultrapassar a disponibilidade declarada pelo fornecedor.

A disponibilidade e acumulada por fornecedor e item, sem depender do ID versionado da resposta. Uma edicao interna que aumente a capacidade total do fornecedor pode reabrir uma solicitacao `ENCERRADO` para `FECHAMENTO_PARCIAL`; o sistema abate tudo que ja foi comprado daquele fornecedor para o item e libera somente a diferenca real. A resposta publica continua bloqueada depois do encerramento.

## Mudanca segura

Testar compra normal e direta, destinos iniciais, compatibilidade de registros antigos, credor, itens cadastrados/manuais, importacao, rateio, edicao de apropriacoes, permissoes, cancelamento, cotacao, pedido, relatorios de compras e registros de origem.
