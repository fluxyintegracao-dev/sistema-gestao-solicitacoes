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
- alteracao de status em massa reaproveitando a mesma regra do detalhe da solicitacao
- solicitacoes arquivadas pelo usuario mantem selecao em massa e usam o painel flutuante para ver, exportar e desarquivar
- permissao especial configuravel para envio fora do setor atual, sem liberar o setor OBRA

## Fluxo de aprovacao por diretoria
- obras podem ser classificadas como `PUBLICA` ou `PRIVADA`
- o `SUPERADMIN` configura qual diretoria atende cada classificacao de obra
- usuarios do setor `OBRA` continuam criando pela tela padrao, mas a `Area Responsavel` fica restrita a diretoria correspondente a classificacao da obra quando essa configuracao existir
- o `SUPERADMIN` tambem configura qual setor recebe a solicitacao apos a aprovacao da diretoria, por `tipo_solicitacao`
- novas solicitacoes criadas nesse fluxo passam a persistir um marcador formal (`fluxo_aprovacao_diretoria`) e os codigos da diretoria/origem e do setor destino
- no detalhe da solicitacao, quando ela estiver na diretoria correta e houver setor destino configurado, o botao `Enviar para outro setor` passa a ser `Aprovar`
- ao aprovar:
  - a solicitacao e enviada ao setor destino configurado atualmente pelo `SUPERADMIN`; o destino persistido na solicitacao fica como fallback para configuracoes ausentes
  - o setor destino vira o dono do fluxo para alteracoes de status e demais regras normais
  - a diretoria que aprovou continua com visibilidade pela regra do fluxo novo, mesmo depois do envio ao setor destino
  - o criador da solicitacao continua com visibilidade
- `DIR_OBRAS_PUBLICAS` visualiza solicitacoes de obras `PUBLICA`, e `DIR_OBRAS_PRIVADAS` visualiza solicitacoes de obras `PRIVADA`, incluindo solicitacoes antigas que nao passaram pelo fluxo formal de aprovacao da diretoria

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
- o `SUPERADMIN` pode configurar um `setor de origem` e, para cada `tipo_solicitacao`, quais setores extras passam a visualizar a solicitacao desde a criacao
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

## Prioridades da diretoria
- `DIR_ADMIN` e `SUPERADMIN` podem abrir lotes de prioridade para `PUBLICA` ou `PRIVADA`
- `DIR_OBRAS_PUBLICAS` e `DIR_OBRAS_PRIVADAS` podem abrir pedidos de urgencia apenas para a propria classificacao e salvar a selecao para aprovacao da `DIR_ADMIN`
- o lote registra:
  - classificacao alvo
  - diretoria alvo resolvida pela configuracao de aprovacao
  - tipo do lote
  - setor criador do lote
  - valor disponivel
  - valor utilizado
  - status do lote
- apenas a diretoria alvo configurada, ou `SUPERADMIN`, pode finalizar o lote
- lotes criados por `DIR_OBRAS_PUBLICAS` ou `DIR_OBRAS_PRIVADAS` sao pedidos de urgencia para aprovacao da `DIR_ADMIN`
- nesses pedidos de urgencia, apenas `DIR_ADMIN` ou `SUPERADMIN` pode finalizar/aprovar o lote
- `SUPERADMIN` pode excluir lotes sem itens autorizados
- as solicitacoes elegiveis nao dependem do setor atual
- no fluxo novo de diretoria, precisam:
  - ja passaram por `APROVADA_DIRETORIA`
  - ou ja sairam da diretoria alvo no fluxo novo
  - nao estao `PAGA`, `REJEITADA` ou `CANCELADA`
- solicitacoes ja adicionadas/autorizadas em outros lotes podem aparecer em novos lotes abertos enquanto nao estiverem `PAGA`, `REJEITADA` ou `CANCELADA`
- na tela de prioridades, a selecao permanece ao trocar filtros e so e removida quando o item e desmarcado ou quando o usuario limpa filtros e selecao
- ao salvar ou finalizar um lote, solicitacoes que deixaram de ser elegiveis sao ignoradas/removidas da selecao sem exigir que o usuario refaca toda a selecao
- ao finalizar:
  - os itens entram em `prioridade_lote_itens`
  - a solicitacao recebe indicador de prioridade autorizada
  - o historico registra `PRIORIDADE_DIRETORIA_AUTORIZADA`
  - participantes recebem notificacao da autorizacao
