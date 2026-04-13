# Modulo de Solicitacoes

## Frontend principal
- `frontend/src/pages/Solicitacoes/`
- `frontend/src/pages/SolicitacaoDetalhe/`
- `frontend/src/pages/NovaSolicitacao.jsx`

## Backend principal
- `backend/src/controllers/SolicitacaoController.js`
- `backend/src/models/Solicitacao.js`
- `backend/src/models/Historico.js`

## Funcoes centrais
- abertura de solicitacao
- filtros e paginacao
- detalhamento
- historico
- acoes em massa
- exportacao
- envio entre setores com regra padrao por setor atual da solicitacao
- permissao especial configuravel para envio fora do setor atual, sem liberar o setor OBRA

## Fluxo de aprovacao por diretoria
- obras podem ser classificadas como `PUBLICA` ou `PRIVADA`
- o `SUPERADMIN` configura qual diretoria atende cada classificacao de obra
- usuarios do setor `OBRA` continuam criando pela tela padrao, mas a `Area Responsavel` fica restrita a diretoria correspondente a classificacao da obra quando essa configuracao existir
- o `SUPERADMIN` tambem configura qual setor recebe a solicitacao apos a aprovacao da diretoria, por `tipo_solicitacao`
- novas solicitacoes criadas nesse fluxo passam a persistir um marcador formal (`fluxo_aprovacao_diretoria`) e os codigos da diretoria/origem e do setor destino
- no detalhe da solicitacao, quando ela estiver na diretoria correta e houver setor destino configurado, o botao `Enviar para outro setor` passa a ser `Aprovar`
- ao aprovar:
  - a solicitacao e enviada ao setor destino configurado
  - o setor destino vira o dono do fluxo para alteracoes de status e demais regras normais
  - a diretoria que aprovou continua com visibilidade pela regra do fluxo novo, mesmo depois do envio ao setor destino
  - o criador da solicitacao continua com visibilidade
- solicitacoes antigas continuam no comportamento original; a visibilidade adicional da diretoria vale apenas para solicitacoes novas marcadas com o fluxo de aprovacao

## Pagamentos parciais
- pagamentos parciais sao registrados em `solicitacao_pagamentos`
- o valor acumulado fica refletido em `solicitacoes.valor_pago_acumulado`
- na listagem:
  - se o status global for diferente de `PAGA`, a coluna `Valor` mostra o saldo (`valor total - valor pago acumulado`)
  - se o status global for `PAGA`, a coluna volta a mostrar o valor total
- no detalhe:
  - o valor total permanece visivel
  - pagos acumulados e saldo ficam destacados
  - o historico de pagamentos fica listado
- o botao `Informar pagamento` aparece apenas para o setor `FINANCEIRO`

## Tipos compartilhados entre setores
- o `SUPERADMIN` pode configurar setores extras que passam a visualizar um `tipo_solicitacao` desde a criacao
- esses setores ganham apenas visibilidade adicional
- o setor responsavel da solicitacao nao muda por causa desse compartilhamento
- essa visibilidade vale para listagem e detalhe do fluxo normal

## Automacao por status
- o `SUPERADMIN` pode configurar regras por:
  - `tipo_solicitacao`
  - `status`
  - `setor_destino`
- quando a combinacao configurada e atendida em uma alteracao de status, a solicitacao e enviada automaticamente para o setor destino
- a automacao registra historico com a acao `ENVIO_AUTOMATICO_SETOR`
- as automacoes legadas do fluxo atual continuam ativas:
  - retorno automatico para setor anterior em ajustes atendidos pela `OBRA`
  - `MERCADORIA_ENTREGUE -> FINANCEIRO` no fluxo atual da `OBRA`
