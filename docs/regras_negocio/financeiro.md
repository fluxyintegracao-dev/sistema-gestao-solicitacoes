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
- baixa corrigida deve ser tratada como estorno do movimento anterior seguido de nova baixa
- titulo baixado deve poder ser consultado em tela propria para conferencia, correcao e auditoria

## Estorno e Correcao

- estorno nao apaga historico
- apos estorno, o usuario pode corrigir dados operacionais e refazer a baixa
- juros, multa e desconto devem permanecer auditaveis
- a acao de "excluir baixa" na interface deve marcar o movimento como `ESTORNADO`, nunca remover o registro fisicamente
- ao estornar uma baixa, o sistema deve recalcular saldo, valor baixado, data de quitacao e status do titulo
- apos estorno, o titulo pode ser baixado novamente em outra conta bancaria ou com novos valores de juros, multa, desconto e valor de quitacao
- estorno de baixa deve registrar usuario, data/hora, IP, user agent, motivo e snapshot dos valores anteriores
- conciliacoes, pagamentos bancarios e comprovantes vinculados devem ser revisados para evitar baixa duplicada ou relatorio inconsistente

## Previsto x Realizado

- previsto = titulos em aberto/parcial
- realizado = movimentos financeiros ativos
- solicitacao so influencia o relatorio quando gera titulo
- movimentos `ESTORNADO` nao entram no realizado
- relatorios financeiros, fluxo de caixa e resultado de obras devem refletir imediatamente estornos e novas baixas
- relatorios analiticos devem permitir organizacao de colunas por usuario sem alterar o calculo financeiro

## Navegacao e Filtros

- ao mudar entre abas `PAGAR` e `RECEBER`, a tela deve limpar filtros, selecoes e lista carregada da aba anterior
- filtros aplicados em uma aba nao devem ser reaproveitados silenciosamente na outra
- preferencias visuais de relatorios, como ordem e visibilidade de colunas, podem ser persistidas por usuario

## Conciliacao

- OFX e conferencia, nao automacao contabil
- sistema sugere match, mas a confirmacao e manual
- duplicidade de remessa deve ser bloqueada
