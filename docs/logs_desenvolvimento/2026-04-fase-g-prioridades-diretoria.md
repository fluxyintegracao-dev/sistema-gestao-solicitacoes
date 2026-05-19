# 2026-04 - Fase G - Prioridades da Diretoria

## Escopo
- modulo operacional para lotes de prioridade da diretoria
- criacao de lote por `DIR_ADMIN` e `SUPERADMIN`
- criacao de pedido de urgencia por `DIR_OBRAS_PUBLICAS` e `DIR_OBRAS_PRIVADAS`
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
  - `POST /prioridades-diretoria/lotes/solicitar-urgencia`
  - `GET /prioridades-diretoria/lotes/:id`
  - `GET /prioridades-diretoria/lotes/:id/solicitacoes-disponiveis`
  - `POST /prioridades-diretoria/lotes/:id/salvar-selecao`
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
- somente solicitacoes do fluxo novo, ja aprovadas pela diretoria e que nao estejam `PAGA`, `REJEITADA` ou `CANCELADA` podem entrar no lote
- a finalizacao nao muda owner da solicitacao; apenas registra prioridade autorizada
- diretorias de obras podem criar pedidos de urgencia e salvar a selecao; a aprovacao/finalizacao desses pedidos fica com `DIR_ADMIN` ou `SUPERADMIN`
- a troca de filtros na tela nao remove solicitacoes selecionadas; a selecao so e limpa por desmarcacao ou pelo comando de limpar filtros e selecao
- criterio de elegibilidade ficou mais robusto:
  - aceita solicitacoes com historico `APROVADA_DIRETORIA`
  - ou solicitacoes que ja sairam da diretoria alvo no fluxo novo
- `SUPERADMIN` pode excluir lotes sem itens autorizados

## Validacao
- `node --check` nos arquivos backend alterados
- `npm run build` em `frontend/`
