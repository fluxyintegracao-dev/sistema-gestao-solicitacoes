# Fase 6 - Operacao Real Assistida e Producao Controlada SST

## Objetivo

Consolidar o modulo SST para uso real assistido, com ativacao gradual, telemetria, hardening, alertas operacionais e monitoramento de prontidao.

Esta fase nao implementa transmissao real ao eSocial. SOAP, certificado digital, assinatura XML, lote real e envio ao governo permanecem bloqueados.

## Escopo Implementado

### Rollout assistido

Estrutura criada para ativacao gradual por empresa, obra, setor, grupo piloto ou usuario:

- `sst_rollout_planos`
- recurso SST `rollout_planos`
- endpoint `/api/sst/rollout/status`
- leitura de readiness de rollout no painel de producao controlada.

### Telemetria operacional

Estrutura criada para registrar e consultar metricas operacionais:

- `sst_telemetry_metrics`
- recurso SST `telemetria`
- endpoint `/api/sst/telemetria/resumo`
- endpoint `/api/sst/telemetria/registrar`
- agregacao de falhas, duracao media e metricas por tipo/status.

O registro de metrica respeita a flag `SST_TELEMETRIA_OPERACIONAL`.

### Hardening operacional

Estrutura criada para politicas conceituais de resiliência:

- `sst_hardening_policies`
- recurso SST `hardening_policies`
- endpoint `/api/sst/hardening/status`
- avaliacao de timeout, retry, cooldown, workflows lentos e erros de automacao/integracao.

### Alertas operacionais avancados

Estrutura criada para alertas persistentes:

- `sst_operational_alerts`
- recurso SST `alertas_operacionais`
- endpoint `/api/sst/alertas/gerar`

Alertas gerados a partir de:

- falhas de workflow;
- falhas de automacao;
- falhas de integracao;
- excesso de notificacoes;
- score critico.

A geracao respeita a flag `SST_ALERTAS_AVANCADOS`.

### Monitoramento de producao SST

Novo agregador backend:

- `/api/sst/producao/monitoramento`
- `backend/src/modules/sst/production/sstProductionReadinessService.js`

Nova pagina frontend:

- `/sst/producao`
- `frontend/src/modules/sst/pages/SstProducaoMonitoramento.jsx`

Indicadores exibidos:

- planos ativos;
- alertas abertos e criticos;
- falhas operacionais;
- media de workflow;
- hardening;
- erros observados;
- readiness de go-live assistido;
- flags de controle.

## Feature Flags

Novas flags adicionadas:

- `SST_ROLLOUT_ASSISTIDO`
- `SST_TELEMETRIA_OPERACIONAL`
- `SST_ALERTAS_AVANCADOS`
- `SST_HARDENING_OPERACIONAL`
- `SST_MONITORAMENTO_PRODUCAO`

Todas iniciam desabilitadas por padrao.

## Permissoes

Novas permissoes adicionadas:

- `sst.producao.visualizar`
- `sst.rollout.gerenciar`
- `sst.telemetria.visualizar`
- `sst.alertas.gerenciar`
- `sst.hardening.gerenciar`

## Garantias Arquiteturais

- Backend continua como fonte da verdade.
- RH/DP continua fonte da verdade de colaboradores.
- Nao houve duplicacao de trabalhadores.
- eSocial real segue bloqueado.
- Toda ativacao operacional pode ser controlada por flags.
- Estrutura preparada para rollback e auditoria.

## Proximos Passos

1. Cadastrar politicas minimas de hardening.
2. Criar planos de rollout piloto por obra/empresa.
3. Ativar telemetria em ambiente controlado.
4. Acompanhar alertas antes de ampliar uso real.
5. Validar com usuarios de RH, SST, Obras e Diretoria.
