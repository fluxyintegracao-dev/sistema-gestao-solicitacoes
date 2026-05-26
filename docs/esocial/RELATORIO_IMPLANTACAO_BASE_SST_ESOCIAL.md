# Relatorio - Implantacao da base SST/eSocial

Data: 2026-05-26

## XSDs analisados

Pasta oficial:

```text
SST ARQUIVOS/2026-04-27_esquemas_xsd_v_s_01_03_00
```

Arquivos prioritarios:

- `evtCAT.xsd`
- `evtMonit.xsd`
- `evtExpRisco.xsd`

Arquivos auxiliares:

- `evtTabEstab.xsd`
- `evtTabLotacao.xsd`
- `evtAdmissao.xsd`
- `evtTSVInicio.xsd`
- `tipos.xsd`
- `xmldsig-core-schema.xsd`

## Eventos identificados

- `S-2210`: Comunicacao de Acidente de Trabalho.
- `S-2220`: Monitoramento da Saude do Trabalhador.
- `S-2240`: Condicoes Ambientais do Trabalho.

## Estrutura criada

```text
backend/src/modules/esocial/
backend/src/modules/esocial/constants/
backend/src/modules/esocial/layouts/s1_3/
backend/src/modules/esocial/layouts/s1_4/
backend/src/modules/esocial/mappings/s1_3/
backend/src/modules/esocial/models/
backend/src/modules/esocial/services/
docs/esocial/
docs/sst/
docs/adr/
```

## Entidades adicionadas

Dominio SST:

- `SstAmbienteTrabalho`
- `SstExposicao`

Tecnicas eSocial:

- `EsocialLayoutVersion`
- `EsocialLote`
- `EsocialEvento`
- `EsocialRetorno`

## Decisao arquitetural

O dominio interno do FLUXY foi mantido separado do XML oficial.

O eSocial sera tratado como camada externa, versionada e auditavel.

## Riscos tecnicos

- Transmissao real depende de certificado, assinatura, webservice e validacao XSD.
- Campos oficiais ausentes devem bloquear preparo final do evento.
- Dados de RH/DP incompletos comprometem eventos.
- Dados de ambiente/exposicao incompletos comprometem `S-2240`.

## Pendencias para transmissao real futura

- Implementar builder XML.
- Implementar validacao XSD.
- Implementar assinatura digital.
- Implementar controle de certificado.
- Implementar lotes SOAP.
- Implementar consulta de processamento.
- Implementar retificacao/exclusao.
- Homologar em producao restrita.

## Recomendacao

Antes de ativar qualquer transmissao oficial, executar uma fase propria de homologacao eSocial com dados reais controlados, usuario responsavel, logs completos e ambiente de producao restrita.
