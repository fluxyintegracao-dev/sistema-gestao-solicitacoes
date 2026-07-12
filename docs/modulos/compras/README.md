# Modulo COMPRAS

## Papel e fronteira

Compras e dono da solicitacao de compra, itens, quantidades, apropriacoes por item, aprovacao e liberacao para cotacao. Cotacoes, respostas e pedidos pertencem ao modulo COTACOES.

## Regras dos itens

- item pode vir do cadastro ou ser manual;
- quantidade e unidade devem ser validas;
- cada item exige apropriacao conforme a operacao;
- rateio multiplo deve fechar 100%;
- alteracao de item depois de etapas dependentes precisa ser bloqueada ou versionada;
- cancelamento interrompe novas acoes e preserva historico;
- exclusao de solicitacao integrada, cotada ou com pedido deve ser bloqueada.

## Fluxo

1. usuario cria a compra;
2. itens e apropriacoes sao validados;
3. aprovacao/liberacao muda o estado de forma auditada;
4. liberacao habilita a criacao de cotacao;
5. cancelamento posterior precisa verificar cotacoes, pedidos, fiscal e financeiro.

## Dependencias

- parceiro fornece solicitante/fornecedor quando aplicavel;
- Obras fornece apropriacoes;
- Solicitacoes pode ser origem, sem perder sua propria trilha;
- Cotacoes consome a compra liberada;
- Fiscal e Financeiro consomem pedidos e obrigacoes posteriores, nao o rascunho da compra.

## Idempotencia

Criacao, encaminhamento, aprovacao, liberacao e integracao devem impedir repeticao concorrente. O backend deve revalidar status em transacao; o frontend bloqueia multiplos cliques.

## Mudanca segura

Testar itens cadastrados/manuais, rateio, permissoes, cancelamento, liberacao, cotacao, pedido, relatorios de compras e registros de origem.
