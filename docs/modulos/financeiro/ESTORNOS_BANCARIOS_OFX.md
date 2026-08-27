# Estornos bancarios identificados no OFX

## Objetivo

Evitar que creditos de PIX rejeitado, cheque devolvido ou outro estorno bancario sejam conciliados como recebimentos normais e impedir que um titulo permaneca quitado quando o pagamento foi devolvido pelo banco.

## Deteccao

- O texto do OFX e normalizado e classificado por termos de rejeicao, estorno, devolucao, sustacao ou pagamento nao efetivado.
- Estornos de tarifa continuam no fluxo especializado de tarifas.
- PIX procura saidas de mesmo valor e sinal oposto no mesmo dia ou nos dois dias anteriores.
- Cheque procura movimentos compativeis em ate 30 dias e valoriza a coincidencia do documento bancario.
- Outros estornos usam janela de cinco dias.
- A deteccao nunca confirma o estorno automaticamente.

## Comportamento operacional

1. O OFX e importado normalmente e o lancamento recebe o alerta `ESTORNO_ALERTA`.
2. O lancamento fica fora da conciliacao automatica, do lote e da baixa por selecao.
3. A tela apresenta todas as saidas bancarias compativeis.
4. A saida original precisa estar conciliada com uma unica baixa de titulo.
5. Um usuario com permissao `financeiro.conciliacao.estornar` seleciona a origem e informa a justificativa.
6. O sistema estorna a baixa, reabre o saldo do titulo e cria um movimento `ESTORNO_BANCARIO` vinculado ao movimento original.
7. A saida e a devolucao permanecem conciliadas e auditadas no extrato.

## Protecoes

- Valor deve ser exato e possuir sinal oposto.
- Conta bancaria deve ser a mesma.
- Data deve estar dentro da janela do tipo de evento.
- Estorno ambiguo sempre exige escolha humana.
- Saida sem titulo conciliado nao pode reabrir titulo por inferencia.
- Saida vinculada a multiplas baixas exige tratamento individual antes da confirmacao.
- Repetir a confirmacao do mesmo par e idempotente.
- O estorno generico nao desfaz um estorno bancario confirmado.

## Persistencia

A migration `202608270001_conciliacao_estornos_bancarios.js` adiciona classificacao, status, quantidade de candidatos, data de avaliacao e o vinculo entre devolucao e lancamento original em `conciliacoes_bancarias`.

## Implantacao

Executar as migrations antes de reiniciar o backend. O frontend deve ser publicado junto, pois a API passa a devolver `estorno_bancario` nos itens da conciliacao.
