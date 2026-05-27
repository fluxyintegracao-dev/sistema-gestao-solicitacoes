# Checklist Go-Live Corporativo SST

Documento criado em 2026-05-26.

## Ambiente

- [ ] Migration `202605260007_sst_enterprise_go_live_fase7.js` executada.
- [ ] Backend reiniciado apos migrations.
- [ ] Frontend publicado com rota `/sst/observabilidade-avancada`.
- [ ] Modulo SST habilitado na instalacao.
- [ ] Superadmin com permissoes SST enterprise.

## Feature flags

- [ ] `SST_ASYNC_JOBS` avaliada antes de enfileirar jobs.
- [ ] `SST_CACHE_OPERACIONAL` ativada apenas apos definir politica de invalidacao.
- [ ] `SST_OBSERVABILIDADE_AVANCADA` revisada.
- [ ] `SST_QUALITY_PIPELINE` ativada em piloto.
- [ ] `SST_GOVERNANCA_CORPORATIVA` ativada quando houver responsavel pela auditoria.

## Filas e jobs

- [ ] Job de score enfileirado e processado.
- [ ] Job de notificacao enfileirado e processado.
- [ ] Job de workflow enfileirado e processado.
- [ ] Job de analytics enfileirado e processado.
- [ ] Job de heatmap enfileirado e processado.
- [ ] Job de IA documental validado sem provider real obrigatório.
- [ ] Dead letter monitorado.

## Observabilidade

- [ ] Painel `/sst/observabilidade-avancada` acessivel.
- [ ] Cards de jobs exibindo dados.
- [ ] Cache status exibindo dados.
- [ ] Quality check executavel.
- [ ] Performance recente visivel.
- [ ] Governanca resumida.

## Multiempresa

- [ ] Jobs respeitam `empresa_id`.
- [ ] Jobs respeitam `obra_id`.
- [ ] Dashboards respeitam filtros.
- [ ] Usuarios sem permissao nao acessam tela enterprise.

## Operacao

- [ ] Responsavel por monitorar SST Enterprise definido.
- [ ] Rotina de processamento de worker definida.
- [ ] Politica de rollback definida.
- [ ] Pendencias P0/P1 registradas.

## Go / No-Go

Go se:

- [ ] build frontend passou;
- [ ] backend carrega SST sem erro;
- [ ] migrations passaram;
- [ ] permissoes foram revisadas;
- [ ] nao ha dead letters criticos;
- [ ] eSocial real continua bloqueado.

No-Go se:

- [ ] worker entra em loop;
- [ ] jobs duplicam dados criticos;
- [ ] permissao vaza dados;
- [ ] dashboard enterprise gera erro 500;
- [ ] migration falha;
- [ ] transmissao eSocial real foi habilitada por engano.
