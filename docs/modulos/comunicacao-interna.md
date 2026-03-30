# Modulo de Comunicacao Interna

## Frontend
- `frontend/src/pages/ConversasEntrada.jsx`
- `frontend/src/pages/ConversasSaida.jsx`
- `frontend/src/pages/ConversaDetalhe.jsx`
- `frontend/src/layout/Layout.jsx`

## Backend
- `backend/src/controllers/ConversaInternaController.js`
- `backend/src/controllers/NotificacaoController.js`
- models `ConversaInterna*` e `Notificacao*`

## Estado atual
O modulo passou por otimizacoes para reduzir carga:
- pagina??o em entrada e saida
- endpoint leve de resumo para badges
- reducao de polling no frontend
- indices em tabelas de comunicacao e notificacao

## Risco operacional
Esse modulo ja foi identificado como fonte de pressao no banco. Em incidente, priorizar a preservacao do fluxo principal.
