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
- se a baixa estiver vinculada a uma conciliacao OFX, o estorno deve reabrir o lancamento bancario como `PENDENTE` e remover apenas os vinculos ativos com titulo e movimento; o registro importado e a trilha anterior permanecem preservados
- se uma conciliacao OFX representar transferencia entre contas, o estorno deve cancelar atomicamente a transferencia e devolver todos os lancamentos OFX vinculados para `PENDENTE`; a transferencia cancelada e o motivo permanecem na auditoria
- o estorno de transferencia conciliada exige a permissao granular `financeiro.conciliacao.estornar`, motivo obrigatorio e protecao contra repeticao
- o relatorio de conciliacao bancaria permite localizar registros por periodo, conta, status, natureza, texto e tipo de vinculo (`TRANSFERENCIA`, `TITULO`, `FATURA_CARTAO`, `TARIFA`, `MOVIMENTO` ou `SEM_VINCULO`), exibindo explicitamente cada item como Entrada ou Saida
- a conta do lancamento OFX so pode ser corrigida enquanto a conciliacao estiver `PENDENTE`, sem vinculos financeiros ativos e mediante justificativa auditavel
- depois de corrigir a conta, o usuario deve registrar a nova baixa na conta correta e conciliar novamente; alterar conta diretamente no banco nao faz parte do fluxo operacional
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
- sistema so sugere match quando valor absoluto em centavos e data forem exatamente iguais; a confirmacao continua manual
- confirmacao simples revalida valor e data no backend; na associacao multipla, todos os movimentos devem ter a data do extrato e a soma deve fechar exatamente o valor bancario
- duplicidade de remessa deve ser bloqueada
