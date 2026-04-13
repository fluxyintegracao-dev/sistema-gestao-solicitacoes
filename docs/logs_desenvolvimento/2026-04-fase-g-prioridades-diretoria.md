# 2026-04 - Fase G - Prioridades da Diretoria

## Escopo
- modulo operacional para lotes de prioridade da diretoria
- criacao de lote por `DIR_ADMIN` e `SUPERADMIN`
- finalizacao por diretoria alvo ou `SUPERADMIN`
- indicador de prioridade autorizada nas solicitacoes

## Backend
- novas tabelas:
  - `prioridade_lotes`
  - `prioridade_lote_itens`
- novos campos em `solicitacoes`:
  - `prioridade_diretoria_ativa`
  - `prioridade_diretoria_em`
  - `prioridade_diretoria_lote_id`
- novo controller:
  - `backend/src/controllers/PrioridadeDiretoriaController.js`
- novas rotas:
  - `GET /prioridades-diretoria/contexto`
  - `GET /prioridades-diretoria/lotes`
  - `POST /prioridades-diretoria/lotes`
  - `GET /prioridades-diretoria/lotes/:id`
  - `GET /prioridades-diretoria/lotes/:id/solicitacoes-disponiveis`
  - `POST /prioridades-diretoria/lotes/:id/finalizar`
  - `POST /prioridades-diretoria/lotes/:id/cancelar`

## Frontend
- nova pagina:
  - `frontend/src/pages/PrioridadesDiretoria.jsx`
- novo service:
  - `frontend/src/services/prioridadesDiretoria.js`
- rota web:
  - `/prioridades-diretoria`
- acesso pelo menu para:
  - `DIR_ADMIN`
  - `DIR_OBRAS_PUBLICAS`
  - `DIR_OBRAS_PRIVADAS`
  - `SUPERADMIN`

## Regras
- lotes sao abertos por classificacao (`PUBLICA` ou `PRIVADA`)
- a diretoria alvo e resolvida pela configuracao existente de aprovacao por diretoria
- somente solicitacoes do fluxo novo, ja aprovadas pela diretoria e ainda nao pagas podem entrar no lote
- a finalizacao nao muda owner da solicitacao; apenas registra prioridade autorizada

## Validacao
- `node --check` nos arquivos backend alterados
- `npm run build` em `frontend/`
