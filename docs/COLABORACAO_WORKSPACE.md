# Colaboracao em Workspace

## Objetivo

Coordenar trabalho entre repositorios explicitamente abertos no mesmo workspace sem sobrescrever arquivos ou quebrar contratos de integracao.

## Regras

- a sessao multirrepositorio precisa ser explicitamente autorizada;
- cada repositorio conserva seu proprio `AGENTS.md`;
- ownership deve ser registrado antes da edicao;
- nenhum arquivo pode ser editado por dois agentes simultaneamente;
- contratos entre repositorios devem ser documentados antes de implementar consumidores;
- dados e regras criticas permanecem no repositorio que e autoridade pelo dominio;
- handoff deve registrar arquivos, validacoes, riscos e proximo passo.

Os controles compartilhados ficam em `docs/workspace/`.
