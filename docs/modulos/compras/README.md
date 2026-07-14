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
3. quando configurada, a diretoria aprova ou rejeita;
4. a aprovacao habilita a cotacao diretamente, sem integracao externa nem liberacao manual adicional;
5. cancelamento posterior precisa verificar cotacoes, pedidos, fiscal e financeiro.

As rotas antigas `PATCH /compras/solicitacoes/:id/integrar` e `PATCH /compras/solicitacoes/:id/liberar` respondem `410`. O codigo depois desse retorno e legado inacessivel e nao define a regra vigente.

## Dependencias

- parceiro fornece solicitante/fornecedor quando aplicavel;
- Obras fornece apropriacoes;
- Solicitacoes pode ser origem, sem perder sua propria trilha;
- Cotacoes consome a compra aprovada/liberada pelo fluxo interno;
- Fiscal e Financeiro consomem pedidos e obrigacoes posteriores, nao o rascunho da compra.

## Idempotencia

Criacao, encaminhamento, aprovacao, cancelamento e envio para cotacao devem impedir repeticao concorrente. O backend deve revalidar status em transacao; o frontend bloqueia multiplos cliques.

## Mudanca segura

Testar compra normal e direta, credor, itens cadastrados/manuais, importacao, rateio, edicao de apropriacoes, permissoes, aprovacao, cancelamento, cotacao, pedido, relatorios de compras e registros de origem.
