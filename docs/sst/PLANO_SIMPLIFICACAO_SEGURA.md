# Plano Obrigatorio para Simplificacao Segura do SST

## Status

Plano documental aprovado para ser detalhado antes da implementacao. Nenhuma remocao de codigo ou banco foi executada nesta etapa.

## Objetivo

Reduzir o modulo atual para PCMSO, PGR, exames, ASO, EPI, treinamentos ocupacionais, LTCAT, avaliacoes quantitativas e anexos, preservando dados validos e evitando regressao em autenticacao, arquivos, RH/DP, Obras, notificacoes e relatorios.

## Regra principal

A simplificacao deve ser aditiva antes de ser destrutiva:

1. inventariar;
2. congelar fluxos descontinuados;
3. criar estruturas novas necessarias;
4. migrar e reconciliar dados;
5. trocar frontend e API;
6. observar o uso;
7. remover codigo;
8. remover banco apenas com aprovacao e backup.

## Componentes atuais candidatos a permanecer ou ser adaptados

- `SstPcmso`;
- `SstPgr`;
- `SstExame`;
- `SstAso`;
- `SstEpiEntrega`;
- `SstTreinamento`;
- `SstDocumento`;
- `SstHistorico`;
- services CRUD essenciais;
- upload privado e URLs assinadas;
- permissao base do modulo;
- referencias simples a empresa, colaborador, obra e usuario.

O uso real de cada model deve ser confirmado antes da decisao final.

## Estruturas novas esperadas

- LTCAT;
- avaliacao quantitativa do LTCAT;
- vinculo de participantes por treinamento, se o modelo atual nao atender;
- anexos polimorficos ou tabelas de vinculo que cubram todas as entidades do novo escopo;
- indices por empresa, colaborador, obra, vigencia e validade;
- historico de renovacao/inativacao.

## Componentes candidatos a descontinuacao

### Integracao governamental

- model de evento externo;
- assinatura, SOAP, certificados e consulta de lotes;
- rotas, services, flags e telas de transmissao;
- variaveis de ambiente associadas.

### IA e inteligencia avancada

- providers de IA;
- pipeline de analise documental;
- reconciliacao por IA;
- readiness, predicao e recomendacao;
- logs especificos de IA.

### Orquestracao e operacao enterprise

- workflows, eventos e acoes configuraveis;
- automacoes e bloqueios operacionais;
- filas, workers e jobs especificos;
- rollout e homologacao enterprise;
- cache especifico;
- telemetria e metricas avancadas;
- observabilidade avancada;
- centro corporativo e heatmap;
- hardening, qualidade, scoring e compliance automatico.

### Dominios fora do novo escopo

- acidentes e CAT;
- agentes nocivos e exposicoes como cadastros independentes;
- riscos e ambientes complexos, salvo o minimo necessario para PGR/LTCAT;
- notificacoes e pendencias geradas pelos motores antigos.

Esses itens sao candidatos, nao uma lista de exclusao imediata. Alguns podem conter dados que precisam ser incorporados ao PGR, LTCAT ou historico.

## Fase 0 - Diagnostico obrigatorio

- listar todas as rotas SST e consumidores;
- listar models, tabelas, colunas, FKs, indices e volume de dados;
- identificar registros reais por entidade;
- mapear anexos e chaves S3;
- localizar permissoes, menus, dashboards e exports;
- localizar jobs iniciados no startup;
- localizar eventos/notificacoes consumidos fora de SST;
- verificar dependencias com RH/DP, Obras, Usuarios e Governanca;
- produzir matriz `manter`, `migrar`, `arquivar` ou `remover`;
- definir retencao legal com o responsavel da empresa.

Entregavel: relatorio de impacto e plano de rollback, sem alterar producao.

## Fase 1 - Congelamento dos fluxos descontinuados

- ocultar menus e acoes antigas por feature flag;
- bloquear novas gravacoes nas estruturas descontinuadas;
- manter leitura temporaria para conferencia;
- interromper jobs, workers e chamadas externas de forma controlada;
- registrar logs de qualquer consumidor ainda ativo.

Nao remover tabelas nesta fase.

## Fase 2 - Modelo de dados simplificado

- confirmar se os models atuais atendem PCMSO, PGR, exame, ASO, EPI e treinamento;
- criar migrations aditivas para LTCAT e avaliacoes quantitativas;
- padronizar anexos para todas as entidades;
- adicionar indices e restricoes sem apagar campos antigos;
- criar chaves de idempotencia quando houver importacao ou upload repetido.

## Fase 3 - API e permissoes

- criar ou simplificar endpoints CRUD por entidade;
- separar permissao de dados sensiveis e anexos;
- remover dependencias de services avancados dos fluxos mantidos;
- garantir validacao de empresa, colaborador e obra;
- garantir exclusao logica e historico;
- criar testes de autorizacao, anexos e renovacao.

## Fase 4 - Frontend simples

- substituir dashboards e centros operacionais por uma tela utilitaria do SST;
- oferecer abas/listas para PCMSO, PGR, exames, ASO, EPI, treinamentos e LTCAT;
- incluir filtros por empresa, obra, colaborador, vigencia e status;
- incluir anexos em cada fluxo;
- incluir avaliacoes quantitativas dentro do detalhe do LTCAT;
- proteger botoes contra multiplos envios;
- remover rotas e menus antigos somente depois da API nova estar validada.

## Fase 5 - Migracao e reconciliacao

- migrar dados validos dos models mantidos;
- associar documentos existentes as entidades corretas;
- avaliar se riscos, agentes ou exposicoes antigos alimentam PGR/LTCAT;
- gerar relatorio de registros sem destino;
- comparar contagens antes e depois;
- validar amostras com o responsavel operacional;
- manter backup exportavel dos dados arquivados.

Nenhum registro sem destino pode ser descartado silenciosamente.

## Fase 6 - Desativacao de codigo

- remover imports e inicializadores;
- remover rotas, controllers, services e validators descontinuados;
- remover paginas, services frontend, menus e permissoes antigas;
- remover variaveis de ambiente;
- remover eventos, jobs e notificacoes sem consumidores;
- executar busca global por nomes descontinuados;
- executar build, testes e smoke tests do SST e modulos relacionados.

## Fase 7 - Banco e storage

- observar o novo fluxo em ambiente controlado;
- confirmar que nenhuma consulta acessa tabelas antigas;
- criar migration nova de arquivamento/remocao; nunca editar migrations ja aplicadas;
- preservar backup e relatorio de contagem;
- remover FKs na ordem segura;
- avaliar anexos orfaos sem excluir objetos S3 automaticamente;
- executar limpeza fisica somente com aprovacao explicita.

## Validacoes obrigatorias

- login e sessao;
- modulo habilitado/desabilitado;
- permissoes por usuario;
- CRUD de cada entidade mantida;
- renovacao e historico;
- upload, download e inativacao de anexos;
- dados sensiveis de exames e ASO;
- LTCAT com varias avaliacoes e anexos;
- relatorios de validade;
- referencias a empresa, colaborador e obra;
- inexistencia de jobs e chamadas externas antigas;
- build frontend e smoke tests;
- rollback de migration em copia do banco.

## Criterio de conclusao

A simplificacao so termina quando o codigo, banco, menus, permissoes, documentacao e testes refletirem exclusivamente o novo escopo; os dados antigos estiverem migrados ou arquivados com justificativa; e nao houver consumidores das estruturas removidas.
