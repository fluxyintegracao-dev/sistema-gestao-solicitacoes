# Mapeamento S-2240 - Exposicao a Riscos

Arquivo oficial: `evtExpRisco.xsd`

Versao: `S-1.3`, schema `v_s_01_03_00`

## Objetivo

Preparar o evento de condicoes ambientais do trabalho a partir da exposicao ocupacional registrada no FLUXY.

## Entidades internas

- `SstExposicao`
- `SstAmbienteTrabalho`
- `SstRisco`
- `SstAgenteNocivo`
- `SstEpiEntrega`
- `RhColaborador`
- `EmpresaGrupo`
- `Obra`
- `EsocialEvento`

## Campos criticos do XSD

- `infoExpRisco`
- `dtIniCondicao`
- `dtFimCondicao`
- `infoAmb`
- `localAmb`
- `dscSetor`
- `infoAtiv`
- `dscAtivDes`
- `agNoc`
- `codAgNoc`
- `tpAval`
- `intConc`
- `limTol`
- `unMed`
- `tecMedicao`
- `epcEpi`
- `utilizEPC`
- `eficEpc`
- `utilizEPI`
- `eficEpi`
- `respReg`

## Mapeamento operacional inicial

| eSocial | FLUXY |
|---|---|
| `ideEmpregador` | `EmpresaGrupo` |
| `ideVinculo` | `RhColaborador.cpf` + `RhColaborador.matricula` |
| `dtIniCondicao` | `SstExposicao.data_inicio` |
| `dtFimCondicao` | `SstExposicao.data_fim` |
| `infoAmb` | `SstAmbienteTrabalho` |
| `dscAtivDes` | `SstExposicao.atividade_desempenhada` |
| `agNoc` | `SstAgenteNocivo` + campos complementares da exposicao |
| `utilizEPC` / `eficEpc` | `SstExposicao.utiliza_epc` / `epc_eficaz` |
| `utilizEPI` / `eficEpi` | `SstExposicao.utiliza_epi` / `epi_eficaz` |
| `respReg` | responsavel tecnico da exposicao |

## Pendencias para transmissao real

- Codigo oficial do agente nocivo.
- Tipo de avaliacao.
- Documento de avaliacao.
- Regras de EPC/EPI detalhadas.
- Conselho, registro e UF do responsavel tecnico.
- Compatibilidade com PGR/PCMSO e laudos.

## Impacto operacional

Este evento depende fortemente da qualidade dos dados de ambiente, funcao, obra, risco, agente nocivo e EPI. O sistema deve tratar ausencia de dado como pendencia, nao como regularidade.
