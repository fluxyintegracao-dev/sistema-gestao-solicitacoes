# Modulo GOVERNANCA

## Papel

Governanca oferece visao institucional de auditoria, saude tecnica, eventos de risco, uso agregado e evolucao operacional. O modulo observa e consolida; nao deve alterar silenciosamente registros dos modulos de origem.

## Regras

- indicadores devem informar fonte, periodo e criterio;
- eventos sensiveis apontam para a auditoria de origem;
- health check diferencia indisponibilidade, degradacao e falha de dependencia;
- jobs diarios sao idempotentes e registram execucao;
- snapshots nao substituem dados operacionais;
- metricas de adocao devem ser agregadas e nao usadas como avaliacao individual opaca;
- exportacoes respeitam permissoes e protegem dados sensiveis;
- alertas nao podem ser disparados repetidamente para o mesmo evento sem controle.

## Integracoes

Consome auditoria, logs, modulos habilitados, usuarios, eventos de risco e indicadores agregados. Nao recebe acesso irrestrito ao conteudo de RH/DP, SST ou documentos privados apenas por ser Governanca.

## Mudanca segura

Validar fonte dos indicadores, permissoes, jobs, duplicidade de alertas, volume de consultas e ausencia de efeitos de escrita nos dominios observados.
