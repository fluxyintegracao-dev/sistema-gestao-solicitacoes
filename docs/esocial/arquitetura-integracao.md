# Arquitetura de integracao eSocial

## Camadas

### 1. Dominio operacional

Responsavel por representar a operacao real:

- colaboradores no RH/DP;
- empresas do grupo;
- obras e centros de custo;
- acidentes;
- ASO;
- exames;
- riscos;
- agentes nocivos;
- ambientes de trabalho;
- exposicoes;
- documentos;
- treinamentos;
- EPI.

### 2. Mapeamento versionado

Responsavel por converter dominio interno em contrato eSocial de uma versao especifica.

Implementado inicialmente em:

```text
backend/src/modules/esocial/mappings/s1_3/
```

### 3. Layout versionado

Responsavel por registrar metadados oficiais:

```text
backend/src/modules/esocial/layouts/s1_3/
backend/src/modules/esocial/layouts/s1_4/
```

### 4. Integracao futura

Reservada para:

- builders XML;
- validadores XSD;
- assinatura digital;
- lotes;
- webservices;
- consulta de processamento;
- armazenamento de recibos;
- tratamento de erros oficiais.

## Fluxo futuro esperado

```text
Registro SST validado
  -> mapeador do layout vigente
  -> payload tecnico versionado
  -> builder XML
  -> validador XSD
  -> assinatura
  -> lote
  -> transmissao
  -> retorno
  -> auditoria
```

## Seguranca

- Todos os documentos devem usar S3 privado e URL assinada.
- Eventos oficiais devem ter trilha de usuario, data, ambiente e versao.
- Transmissao so pode ser habilitada por configuracao explicita e permissao granular.

## Multiempresa e multiobra

Cada evento preparado deve manter:

- `empresa_id`;
- `obra_id` quando aplicavel;
- `colaborador_id` quando aplicavel;
- origem operacional (`origem_tipo`, `origem_id`);
- layout e versao.

## Atualizacao SST Fase 3

A Fase 3 adicionou inteligencia operacional SST com workflows, bloqueios, notificacoes, pendencias, scores, timeline e heatmap.

Essas estruturas continuam pertencendo ao dominio interno do FLUXY. Elas nao alteram a camada de integracao eSocial e nao liberam transmissao real. Quando a transmissao oficial for implementada, os eventos deverao consumir essa base por mappers versionados, preservando o isolamento entre operacao interna e contrato XML externo.

## Atualizacao SST Fase 4

A Fase 4 adicionou workflow engine, automacoes, recomendacoes, score corporativo e IA documental preparada por provider.

Mesmo com IA aplicada, a integracao eSocial permanece bloqueada. A IA pode apoiar leitura documental e pre-validacao operacional, mas nao substitui validacao humana, certificado, assinatura, XSD, ambiente oficial e governanca de envio.

## Atualizacao SST Fase 5

A Fase 5 adicionou feature flags, logs operacionais, observabilidade e homologacao controlada para o modulo SST.

Essa camada aumenta a confiabilidade operacional antes de qualquer integracao oficial. Integracoes com RH/DP e Obras passam a ter acionamento controlado, logs e rollback por configuracao. A transmissao eSocial continua bloqueada, e qualquer envio futuro deve nascer em etapa propria com validacao de schema, certificado, assinatura e ambiente oficial.

## Atualizacao SST Fase 6

A Fase 6 adicionou rollout assistido, telemetria, hardening, alertas operacionais e painel de producao controlada.

Esses recursos servem para estabilizar o dominio SST em operacao real assistida. Eles nao alteram o contrato externo eSocial e nao liberam transmissao oficial. A camada de integracao governamental continua isolada e bloqueada ate existir decisao propria, documentacao tecnica completa, ambiente oficial preparado, certificado, assinatura e validacao de schema.

## Atualizacao SST Fase 7

A Fase 7 adicionou filas, jobs, workers, cache, telemetria historica, quality checks, governanca corporativa e observabilidade avancada.

Essa camada consolida a maturidade enterprise do dominio SST antes de qualquer transmissao oficial ao governo. A fila inicial e database-backed, com arquitetura preparada para BullMQ/Redis em evolucao futura. O objetivo e desacoplar score, notificacoes, workflows, analytics, heatmaps e IA documental sem introduzir uma dependencia operacional obrigatoria antes do go-live corporativo.

A transmissao eSocial continua bloqueada. O fluxo permanece:

```text
Dominio operacional SST
  -> filas, jobs, observabilidade e governanca interna
  -> mapeadores/versionamento eSocial
  -> XML oficial futuro
```
