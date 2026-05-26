# Mapeamento S-2210 - CAT

Arquivo oficial: `evtCAT.xsd`

Versao: `S-1.3`, schema `v_s_01_03_00`

## Objetivo

Preparar a Comunicacao de Acidente de Trabalho a partir do dominio operacional do FLUXY.

## Entidades internas

- `SstAcidente`
- `RhColaborador`
- `EmpresaGrupo`
- `Obra`
- `SstDocumento`
- `EsocialEvento`

## Campos criticos do XSD

- `ideEvento`
- `ideEmpregador`
- `ideVinculo`
- `cat`
- `dtAcid`
- `tpAcid`
- `hrAcid`
- `tpCat`
- `indCatObito`
- `codSitGeradora`
- `localAcidente`
- `parteAtingida`
- `agenteCausador`
- `atestado`
- `codCID`
- `houveAfast`

## Mapeamento operacional inicial

| eSocial | FLUXY |
|---|---|
| `ideEmpregador` | `EmpresaGrupo` |
| `ideVinculo` | `RhColaborador.cpf` + `RhColaborador.matricula` |
| `dtAcid` | `SstAcidente.data_ocorrencia` |
| `tpAcid` | `SstAcidente.tipo` com normalizacao futura |
| `localAcidente` | `SstAcidente.local` + obra quando aplicavel |
| `obsCAT` | `SstAcidente.descricao` |
| `houveAfast` | `SstAcidente.afastamento` |
| anexos | `SstDocumento` ou `cat_url` |

## Pendencias para transmissao real

- Tabelas oficiais para situacao geradora.
- Tabelas oficiais para agente causador.
- Tabelas oficiais para parte do corpo atingida.
- CID.
- Dados completos de atestado.
- Regra de retificacao/exclusao.
- Validacao XSD e regras do MOS vigente.

## Risco de acoplamento

Nao criar colunas uma-a-uma para cada tag XML se elas nao representam a operacao real. Campos estritamente oficiais devem ficar na camada de mapeamento ou em payload tecnico versionado.
