# Regras de Negocio - Financeiro

## Titulos

- todo titulo e do tipo `PAGAR` ou `RECEBER`
- titulo pode nascer:
  - da solicitacao
  - de criacao manual no financeiro
- titulo financeiro permanece unico mesmo quando a compra possui multiplas apropriacoes por item

## Categorias Financeiras

- categoria pode ser:
  - `PAGAR`
  - `RECEBER`
  - `AMBOS`
- ao criar um titulo, o sistema mostra apenas categorias compativeis com o tipo escolhido

## Baixa

- pode ser parcial ou total
- registra valor base, juros, multa e desconto
- atualiza saldo e status
- exige conta bancaria e data do movimento

## Estorno e Correcao

- estorno nao apaga historico
- apos estorno, o usuario pode corrigir dados operacionais e refazer a baixa
- juros, multa e desconto devem permanecer auditaveis

## Previsto x Realizado

- previsto = titulos em aberto/parcial
- realizado = movimentos financeiros ativos
- solicitacao so influencia o relatorio quando gera titulo

## Conciliacao

- OFX e conferencia, nao automacao contabil
- sistema sugere match, mas a confirmacao e manual
- duplicidade de remessa deve ser bloqueada
