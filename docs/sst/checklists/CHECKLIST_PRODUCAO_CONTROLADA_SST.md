# Checklist de Producao Controlada SST

## Antes de Ativar Piloto

- [ ] Modulo SST habilitado para a empresa.
- [ ] Permissoes SST revisadas por usuario.
- [ ] Plano de rollout cadastrado.
- [ ] Flag `SST_ROLLOUT_ASSISTIDO` habilitada quando aprovado.
- [ ] Flag `SST_TELEMETRIA_OPERACIONAL` habilitada quando aprovado.
- [ ] Politicas de hardening cadastradas.
- [ ] Dashboard `/sst/producao` acessivel para usuarios autorizados.
- [ ] eSocial real confirmado como bloqueado.

## Durante o Piloto

- [ ] Monitorar alertas operacionais.
- [ ] Monitorar falhas de workflows.
- [ ] Monitorar falhas de automacoes.
- [ ] Monitorar falhas de integracoes.
- [ ] Monitorar dashboards lentos/workflows lentos.
- [ ] Revisar volume de notificacoes.
- [ ] Registrar feedback dos usuarios reais.

## Criterios Para Ampliar Rollout

- [ ] Sem alertas criticos abertos.
- [ ] Telemetria em estado controlado.
- [ ] Observabilidade sem erros operacionais.
- [ ] Hardening sem pendencias criticas.
- [ ] Checklist de homologacao SST sem bloqueio.
- [ ] Usuarios-chave validaram a rotina.

## Criterios Para Pausar Rollout

- [ ] Vazamento de permissao.
- [ ] Loop de workflow ou automacao.
- [ ] Falha recorrente de integracao.
- [ ] Alertas criticos sem responsavel.
- [ ] Baixa confianca operacional dos usuarios.
- [ ] Performance comprometendo operacao.

## Pos-Piloto

- [ ] Registrar decisoes.
- [ ] Atualizar plano de rollout.
- [ ] Ajustar permissões.
- [ ] Atualizar treinamento.
- [ ] Classificar pendencias P0/P1/P2/P3.
