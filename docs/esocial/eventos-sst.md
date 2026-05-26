# Eventos SST prioritarios no eSocial

## S-2210 - Comunicacao de Acidente de Trabalho

Arquivo: `evtCAT.xsd`

Dominio interno principal:

- `SstAcidente`
- `RhColaborador`
- `EmpresaGrupo`
- `Obra`

Uso operacional:

- registrar acidente;
- registrar afastamento;
- registrar CAT;
- anexar documentos;
- controlar acoes corretivas;
- alimentar indicadores de risco.

## S-2220 - Monitoramento da Saude do Trabalhador

Arquivo: `evtMonit.xsd`

Dominio interno principal:

- `SstAso`
- `SstExame`
- `RhColaborador`
- `EmpresaGrupo`

Uso operacional:

- controlar ASO;
- controlar exames ocupacionais;
- acompanhar validade;
- controlar aptidao/inaptidao;
- gerar alertas de vencimento.

## S-2240 - Condicoes Ambientais do Trabalho

Arquivo: `evtExpRisco.xsd`

Dominio interno principal:

- `SstExposicao`
- `SstAmbienteTrabalho`
- `SstRisco`
- `SstAgenteNocivo`
- `SstEpiEntrega`
- `RhColaborador`

Uso operacional:

- mapear exposicao ocupacional;
- relacionar colaborador, ambiente e risco;
- controlar agentes nocivos;
- registrar EPC/EPI;
- preparar mapa de risco e analytics.

## Eventos auxiliares

- `evtTabEstab.xsd`: dados de estabelecimento.
- `evtTabLotacao.xsd`: lotacao tributaria.
- `evtAdmissao.xsd`: vinculo CLT.
- `evtTSVInicio.xsd`: trabalhador sem vinculo.
- `tipos.xsd`: tipos compartilhados.
- `xmldsig-core-schema.xsd`: assinatura XML futura.
