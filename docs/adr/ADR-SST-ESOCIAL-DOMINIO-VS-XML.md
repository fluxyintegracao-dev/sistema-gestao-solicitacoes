# ADR - SST/eSocial: dominio operacional separado do XML oficial

Data: 2026-05-26

Status: Aceita

## Contexto

O modulo SST do FLUXY precisa operar como camada institucional de saude e seguranca do trabalho para construcao civil e, no futuro, gerar eventos oficiais do eSocial, especialmente `S-2210`, `S-2220` e `S-2240`.

Os XSDs oficiais recebidos em `SST ARQUIVOS/2026-04-27_esquemas_xsd_v_s_01_03_00` representam o contrato externo do governo para a versao `S-1.3`, schema `v_s_01_03_00`.

## Decisao

O banco e o dominio operacional do FLUXY nao devem replicar a estrutura literal dos XMLs do eSocial.

A arquitetura adotada e:

```text
Dominio operacional FLUXY
        |
        v
Mapeamento versionado por layout
        |
        v
XML oficial eSocial
```

Foram separadas duas areas:

- `backend/src/modules/sst/`: dominio operacional real de SST.
- `backend/src/modules/esocial/`: integracao tecnica, versionamento, mapeamentos, eventos, lotes e retornos.

## Consequencias positivas

- Mudancas futuras do governo nao quebram diretamente o dominio interno.
- O RH/DP permanece fonte da verdade para colaboradores.
- SST trabalha com acidentes, ASO, exames, EPI, treinamentos, riscos, ambientes e exposicoes.
- eSocial passa a ser uma camada de saida versionada.
- O sistema fica preparado para validadores, builders XML, assinatura, lotes e retornos sem pressa operacional.
- Analytics e IA podem consumir eventos e dominio interno sem depender do formato XML.

## Consequencias negativas

- Existe uma camada adicional de mapeamento para manter.
- A transmissao real exigira etapa futura de validacao rigorosa contra XSD, regras de negocio e ambiente oficial.
- O time precisa entender que "ter dado SST" nao significa automaticamente "ter XML apto para envio".

## Regras obrigatorias

- Nao criar tabela paralela de trabalhadores para SST.
- Toda entidade de SST ligada a pessoa deve referenciar `colaborador_id` da base central do RH/DP.
- Nao implementar transmissao real sem certificado, assinatura, ambiente, validacao de schema e governanca de envio.
- Nao preencher campo critico por inferencia.
- Ausencia de dado deve aparecer como pendencia operacional.

## Estado atual

Esta ADR registra a fundacao arquitetural. A transmissao real permanece bloqueada por produto ate conclusao da fase futura de integracao oficial.

## Atualizacao 2026-05-26 - Fase 3 SST

A Fase 3 confirmou a decisao arquitetural ao criar workflows, bloqueios, notificacoes, pendencias, scores, timeline e heatmap como entidades internas do FLUXY.

Essas entidades representam inteligencia operacional da construtora, nao estruturas XML do governo. A futura transmissao eSocial devera continuar consumindo estes dados por mappers versionados, mantendo o dominio SST livre de acoplamento com leiautes externos.

## Atualizacao 2026-05-26 - Fase 4 SST

A Fase 4 reforca esta ADR ao adicionar workflow engine, automacoes, recomendacoes e IA documental como recursos do dominio operacional do FLUXY.

Mesmo quando a IA documental extrair dados de ASO, certificados ou ficha EPI, o resultado deve ser tratado como dado operacional a validar. O XML eSocial continua sendo contrato externo versionado, nunca o modelo interno do banco.

## Atualizacao 2026-05-26 - Fase 5 SST

A Fase 5 reforca a separacao entre dominio operacional e contrato externo ao criar feature flags, logs, observabilidade, homologacao e integracoes controladas.

As integracoes com RH/DP e Obras nao sao acoplamento com XML. Elas apenas conectam eventos operacionais internos sob controle de flags e logs. A transmissao ao governo permanece fora do escopo e continua bloqueada ate existir fase tecnica especifica para certificado, assinatura, XSD, lote e retorno oficial.
