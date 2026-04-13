# 2026-04 - Visibilidade de diretoria e pagamentos parciais

## Escopo
- consolidar o fluxo novo de aprovacao por diretoria sem afetar solicitacoes antigas
- manter `DIR_ADMIN` fora da visibilidade global automatica
- adicionar pagamentos parciais com operacao restrita ao `FINANCEIRO`

## Backend
- `backend/src/models/Solicitacao.js`
  - adicionados:
    - `fluxo_aprovacao_diretoria`
    - `diretoria_fluxo_codigo`
    - `setor_destino_pos_aprovacao`
    - `valor_pago_acumulado`
- `backend/src/models/SolicitacaoPagamento.js`
  - novo model para pagamentos parciais
- `backend/src/models/index.js`
  - associacoes entre `Solicitacao`, `SolicitacaoPagamento` e `User`
- `backend/src/controllers/SolicitacaoController.js`
  - o fluxo novo passa a persistir marcador e setores da aprovacao na criacao/aprovacao
  - `DIR_OBRAS_PUBLICAS` e `DIR_OBRAS_PRIVADAS` ganham visibilidade continua para solicitacoes novas do proprio fluxo
  - `DIR_ADMIN` permanece sem visibilidade automatica adicional
  - novo endpoint de pagamento parcial com validacao de setor e atualizacao transacional
  - a API passa a devolver:
    - `valor_total`
    - `valor_pago_acumulado`
    - `saldo_pagamento`
    - `valor_exibicao`
- `backend/src/routes.js`
  - nova rota `POST /solicitacoes/:id/pagamentos`
- `backend/migrations/add-solicitacao-fluxo-diretoria-e-pagamentos.sql`
  - migration aditiva para colunas novas, tabela de pagamentos e indice do fluxo

## Frontend
- `frontend/src/pages/Solicitacoes/index.jsx`
  - soma filtrada e exportacao passam a considerar `valor_exibicao`
- `frontend/src/pages/Solicitacoes/LinhaSolicitacao.jsx`
  - coluna `Valor` passa a mostrar saldo para solicitacoes ainda nao pagas
- `frontend/src/pages/SolicitacaoDetalhe/Header.jsx`
  - detalhe passa a destacar valor total, pago acumulado e saldo
- `frontend/src/pages/SolicitacaoDetalhe/Pagamentos.jsx`
  - novo card de historico e lancamento de pagamentos
- `frontend/src/pages/SolicitacaoDetalhe/index.jsx`
  - integra o bloco de pagamentos e restringe o botao a `FINANCEIRO`
- `frontend/src/services/solicitacoes.js`
  - novo client `adicionarPagamentoSolicitacao`

## Regras finais
- somente solicitacoes novas marcadas com `fluxo_aprovacao_diretoria = 1` entram na visibilidade adicional das diretorias de obras
- solicitacoes antigas continuam no comportamento anterior
- o botao `Informar pagamento` aparece apenas para o setor `FINANCEIRO`
- o backend mantem `SUPERADMIN` como excecao administrativa no endpoint de pagamento

## Validacao executada
- `node --check backend/src/controllers/SolicitacaoController.js`
- `node --check backend/src/models/Solicitacao.js`
- `node --check backend/src/models/SolicitacaoPagamento.js`
- `node --check backend/src/routes.js`
- `npm run build` em `frontend/`
