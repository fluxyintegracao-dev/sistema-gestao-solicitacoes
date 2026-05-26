# SST - Fase 2: Consolidacao operacional

Data: 2026-05-26

## Objetivo

Consolidar o modulo SST como camada operacional de conformidade da construtora.

Esta fase nao implementa transmissao real ao eSocial. A camada eSocial permanece preparada, versionada e bloqueada para envio oficial.

## Fluxos consolidados

### ASO

- Cadastro de ASO por colaborador do RH/DP.
- Tipo de exame.
- Aptidao/inaptidao.
- Validade.
- Medico, CRM e UF do CRM.
- Restricoes.
- Documento.
- Historico e eventos.

Eventos:

- `SST_ASO_CADASTRADO`
- `SST_ASO_VENCENDO`
- `SST_ASO_VENCIDO`
- `SST_COLABORADOR_INAPTO`

### Exames ocupacionais

- Vinculo opcional ao ASO.
- Tipo e nome do exame.
- Resultado.
- Validade.
- Documento.

Eventos:

- `SST_EXAME_VENCENDO`
- `SST_EXAME_VENCIDO`

### Treinamentos

- Codigo/NR.
- Validade.
- Instrutor.
- Carga horaria.
- Obrigatoriedade.
- Funcao alvo.

Eventos:

- `SST_TREINAMENTO_VENCENDO`
- `SST_TREINAMENTO_VENCIDO`
- `SST_COLABORADOR_SEM_NR`

### EPI

- Entrega.
- CA.
- Validade.
- Assinatura/comprovante.
- Obrigatoriedade.
- Funcao alvo.

Eventos:

- `SST_EPI_ENTREGUE`
- `SST_EPI_VENCENDO`
- `SST_EPI_VENCIDO`
- `SST_COLABORADOR_SEM_EPI`

### Acidentes

- Tipo e gravidade.
- Obra e local.
- Colaborador.
- Agente causador.
- Situacao geradora.
- Parte do corpo.
- CID.
- Afastamento.
- CAT.
- Fotos/anexos.
- Acoes corretivas.
- Responsavel.

Eventos:

- `SST_ACIDENTE_REGISTRADO`
- `SST_ACIDENTE_GRAVE`

### Exposicao ocupacional

- Ambiente de trabalho.
- Atividade.
- Agente nocivo.
- Intensidade.
- EPC/EPI.
- Eficacia.
- Periodo.
- Responsavel tecnico.

Objetivo futuro:

- preparar dominio para `S-2240`;
- alimentar mapa de risco e analytics.

## Motor de conformidade

Estrutura:

```text
backend/src/modules/sst/compliance/
```

O motor detecta:

- colaborador ativo sem ASO;
- colaborador inapto;
- ASO vencido;
- ASO vencendo;
- treinamento vencido;
- EPI vencido;
- documento vencido;
- risco critico;
- exposicao incompleta;
- treinamento obrigatorio ausente por regra;
- EPI obrigatorio ausente por regra.

## Regras configuraveis

Nova entidade:

- `SstRegraConformidade`

Tipos iniciais:

- `ASO_VALIDO`
- `TREINAMENTO_OBRIGATORIO`
- `EPI_OBRIGATORIO`
- `EXPOSICAO_COMPATIVEL`

## Analytics

Estrutura:

```text
backend/src/modules/sst/analytics/
```

Indicadores iniciais:

- acidentes por obra;
- riscos por obra;
- acidentes por gravidade;
- riscos por severidade;
- treinamentos por status.

## IA futura

Estrutura:

```text
backend/src/modules/sst/ai/
```

Casos preparados:

- OCR de ASO e certificados;
- classificacao automatica de documentos;
- deteccao de pendencias;
- previsao de risco;
- analise de reincidencia.

## Segurança

- RH/DP segue como fonte unica de colaboradores.
- Backend calcula conformidade.
- Frontend apenas exibe dados.
- Dados ausentes viram pendencia.
- Documentos seguem arquitetura S3/presigned URL.

## Pendencias futuras

- Criar jobs agendados para conformidade.
- Criar notificacoes automaticas por perfil.
- Evoluir relatorios executivos.
- Integrar custo SST ao financeiro.
- Homologar dados reais de SST com responsavel tecnico.
