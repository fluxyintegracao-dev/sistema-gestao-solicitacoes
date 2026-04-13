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
- no detalhe da solicitacao, quando ela estiver na diretoria correta e houver setor destino configurado, o botao `Enviar para outro setor` passa a ser `Aprovar`
- ao aprovar:
  - a solicitacao e enviada ao setor destino configurado
  - o setor destino vira o dono do fluxo para alteracoes de status e demais regras normais
  - a diretoria que aprovou continua com visibilidade via historico de envio
  - o criador da solicitacao continua com visibilidade
