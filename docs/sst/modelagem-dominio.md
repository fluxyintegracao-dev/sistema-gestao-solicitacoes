# Modelagem do dominio SST

## Principio

O SST do FLUXY representa a operacao real da construtora. Ele nao replica XML do governo.

O RH/DP e a fonte da verdade para pessoas. Portanto, toda entidade SST que depende de trabalhador referencia `colaborador_id` da tabela central de colaboradores.

## Entidades operacionais

### Existentes

- `SstRisco`
- `SstAgenteNocivo`
- `SstPgr`
- `SstPcmso`
- `SstAso`
- `SstExame`
- `SstEpiEntrega`
- `SstTreinamento`
- `SstAcidente`
- `SstDocumento`
- `SstEventoOperacional`
- `SstHistorico`

### Complementares para eSocial/analytics

- `SstAmbienteTrabalho`
- `SstExposicao`

## Entidades tecnicas eSocial

- `EsocialLayoutVersion`
- `EsocialLote`
- `EsocialEvento`
- `EsocialRetorno`

Essas entidades pertencem a camada tecnica de integracao. Elas nao substituem os registros operacionais de SST.

## Regras de dado real

- Empresa deve ser informada explicitamente.
- Obra deve ser informada quando a exposicao, acidente ou documento estiver ligado a obra.
- Colaborador deve vir do RH/DP.
- Campo ausente deve virar pendencia, nao valor inferido.
- Documento medico ou trabalhista deve respeitar permissao granular.

## Eventos operacionais internos

- `SST_ASO_VENCENDO`
- `SST_COLABORADOR_INAPTO`
- `SST_EPI_VENCENDO`
- `SST_TREINAMENTO_VENCENDO`
- `SST_ACIDENTE_REGISTRADO`
- `SST_RISCO_CRITICO_IDENTIFICADO`
- `SST_EVENTO_ESOCIAL_REJEITADO`
- `SST_DOCUMENTO_EXPIRADO`
- `SST_COLABORADOR_SEM_NR`

## Preparacao para IA

A separacao entre dominio e XML permite que a IA futura analise:

- reincidencia de acidentes;
- vencimentos de ASO;
- colaboradores expostos a riscos;
- obras com maior criticidade;
- ausencia de treinamento por funcao;
- documentos pendentes;
- impacto operacional de riscos.
