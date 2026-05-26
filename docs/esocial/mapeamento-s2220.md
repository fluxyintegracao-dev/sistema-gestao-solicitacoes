# Mapeamento S-2220 - Monitoramento da Saude

Arquivo oficial: `evtMonit.xsd`

Versao: `S-1.3`, schema `v_s_01_03_00`

## Objetivo

Preparar o evento de monitoramento da saude do trabalhador a partir de ASO e exames ocupacionais registrados no FLUXY.

## Entidades internas

- `SstAso`
- `SstExame`
- `RhColaborador`
- `EmpresaGrupo`
- `SstDocumento`
- `EsocialEvento`

## Campos criticos do XSD

- `ideEvento`
- `ideEmpregador`
- `ideVinculo`
- `exMedOcup`
- `tpExameOcup`
- `aso`
- `dtAso`
- `resAso`
- `exame`
- `procRealizado`
- `medico`
- `nrCRM`
- `ufCRM`
- `respMonit`

## Mapeamento operacional inicial

| eSocial | FLUXY |
|---|---|
| `ideEmpregador` | `EmpresaGrupo` |
| `ideVinculo` | `RhColaborador.cpf` + `RhColaborador.matricula` |
| `tpExameOcup` | `SstAso.tipo_exame` |
| `dtAso` | `SstAso.data_exame` |
| `resAso` | `SstAso.apto` |
| `exame[]` | `SstExame[]` vinculado ao colaborador/ASO |
| `medico` | `SstAso.medico` |
| `nrCRM` | `SstAso.crm` |
| documento | `SstAso.documento_url` / `SstDocumento` |

## Pendencias para transmissao real

- Codigo oficial do procedimento realizado.
- Ordem do exame.
- Indicador de resultado.
- UF do CRM.
- Responsavel pelo monitoramento, quando exigido.
- Regra de validade e retificacao conforme MOS vigente.

## Impacto operacional

O relatorio executivo deve mostrar falta de ASO, vencimentos, inaptidao e ausencia de exames obrigatorios sem inferir que o colaborador esta regular.
