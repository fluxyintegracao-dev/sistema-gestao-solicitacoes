# Checklist Go-Live SST

Documento criado em 2026-05-26.

## 1. Ambiente

- [ ] Backend atualizado.
- [ ] Frontend atualizado.
- [ ] Migration SST Fase 5 executada.
- [ ] S3 validado para documentos SST.
- [ ] Modulo SST habilitado no painel de modulos.
- [ ] eSocial real permanece bloqueado.

## 2. Permissoes

- [ ] SUPERADMIN acessa configuracoes SST.
- [ ] Responsavel SST acessa dashboard, operacao, documentos e observabilidade.
- [ ] Usuario de obra acessa apenas dados autorizados.
- [ ] Usuario sem permissao nao acessa RH/DP, SST, documentos sensiveis ou observabilidade.
- [ ] Visibilidade de dashboards e tabelas revisada.

## 3. Feature Flags

- [ ] `SST_INTEGRACAO_RHDP` validada antes de ativar.
- [ ] `SST_INTEGRACAO_OBRAS` validada antes de ativar.
- [ ] `SST_WORKFLOW_ENGINE` validada antes de ativar.
- [ ] `SST_AUTO_REVISAO_FUNCAO` validada antes de ativar.
- [ ] `SST_BLOQUEIO_OPERACIONAL` validada antes de ativar.
- [ ] `SST_NOTIFICACOES_AUTOMATICAS` validada antes de ativar.
- [ ] `SST_IA_DOCUMENTAL` permanece desativada se nao houver provider real configurado.

## 4. Fluxos Operacionais

- [ ] ASO criado com colaborador real do RH/DP.
- [ ] Exame ocupacional vinculado a ASO.
- [ ] Treinamento criado com validade.
- [ ] EPI entregue com comprovante.
- [ ] Acidente/incidente registrado.
- [ ] Exposicao ocupacional criada.
- [ ] Documento SST enviado e URL assinada abre corretamente.

## 5. Workflows e Automacoes

- [ ] Checklist de homologacao retorna sem P0.
- [ ] Homologacao de workflows roda em dry-run.
- [ ] Simulacao de massa operacional documentada.
- [ ] Nao ha loops de automacao.
- [ ] Nao ha duplicidade de pendencias.
- [ ] Nao ha excesso de notificacoes.

## 6. Observabilidade

- [ ] `/sst/observabilidade` abre para usuario autorizado.
- [ ] Logs de workflow aparecem.
- [ ] Logs de automacao aparecem.
- [ ] Logs de integracao aparecem.
- [ ] Logs de bloqueio aparecem.
- [ ] Erros operacionais sao visiveis e investigaveis.

## 7. Analytics e Dashboards

- [ ] Dashboard principal carrega.
- [ ] Relatorio operacional carrega.
- [ ] Executivo SST carrega.
- [ ] Centro operacional carrega.
- [ ] Heatmap carrega.
- [ ] Timeline do colaborador carrega.
- [ ] Filtros por empresa/obra funcionam.

## 8. Go/No-Go

### Go

- [ ] Nenhum P0 aberto.
- [ ] Permissoes sensiveis revisadas.
- [ ] Logs funcionam.
- [ ] Workflows homologados em dry-run.
- [ ] Integracoes criticas continuam controladas por flag.
- [ ] Usuarios-chave validaram os fluxos principais.

### No-Go

- [ ] Erro 500 em rota critica.
- [ ] Vazamento de permissao.
- [ ] Documento sensivel abre para usuario indevido.
- [ ] Workflow gera duplicidade.
- [ ] Automacao gera loop.
- [ ] Dashboard critico nao carrega.
