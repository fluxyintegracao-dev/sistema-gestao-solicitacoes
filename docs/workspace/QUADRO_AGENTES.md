# Quadro de Agentes

## Objetivo

Painel operacional para coordenar trabalhos simultaneos de agentes neste repositorio.

Todo agente deve atualizar este arquivo ao iniciar, pausar, finalizar ou transferir uma tarefa.

## Status Atual

- Nenhum trabalho ativo registrado.

## Sessoes Ativas

| Sessao | Responsavel | Escopo | Status | Inicio | Observacoes |
| --- | --- | --- | --- | --- | --- |
| - | - | - | - | - | - |

## Ownership Ativo

| Arquivo | Sessao | Responsavel | Escopo | Status |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |

## Trabalhos em Andamento

```md
## Trabalho em andamento

- id:
  sessao:
  responsavel:
  status:
  escopo:
  arquivos:
    - 
  feito:
    - 
  pendencias:
    - 
  validacao:
    - 
  observacoes:
    - 
```


## Trabalhos Finalizados

```md
## Trabalho finalizado

- id:
  sessao:
  responsavel:
  finalizado_em:
  escopo concluido:
    - 
  arquivos alterados:
    - 
  validacao executada:
    - 
  pendencias deixadas:
    - 
  commit:
    - 
```

## Trabalho finalizado

- id: contrato-comercial-variaveis-docx-pdf
  sessao: codex-contrato-comercial-variaveis-2026-05-06
  responsavel: Codex
  finalizado_em: 2026-05-06
  escopo concluido:
    - Identificador do contrato no cabecalho/papel timbrado passa a ser substituido pelo numero do contrato atual.
    - Item III do Quadro Resumo passa a substituir dados fixos de unidade por torre, unidade, area, fracao ideal e garagem do contrato.
    - Item VI passa a trocar linhas fixas de pagamento por linhas agrupadas das parcelas reais, com F/R, vencimentos e totais.
    - Preco total da unidade e valor de leilao passam a entrar formatados em moeda e por extenso.
    - Item XII passa a substituir bloco fixo de assinaturas por incorporadora, comprador, conjuge e corretor conforme dados do contrato/modelo.
  arquivos alterados:
    - backend/src/services/comercialContratoDocumentoService.js
    - docs/workspace/QUADRO_AGENTES.md
    - docs/workspace/OWNERSHIP_ATIVO.md
  validacao executada:
    - node --check backend/src/services/comercialContratoDocumentoService.js
    - git diff --check
    - Teste local em memoria renderizando "Contratos/Quadro Resumo Piemonte.docx" com dados fake: confirmou remocao de XX/XX/XXXX e R$ XXXXXX, entrada de parcelas reais, preco, unidade, assinaturas e identificador no header.
  pendencias deixadas:
    - Validar visualmente em homologacao/EC2 com os modelos cadastrados no banco para Piemonte, Areia Preta, Pedra Menina e Costa do Mar.
    - Se for necessario manter CNPJ/representante completo da incorporadora no item XII, preencher `assinaturas.vendedora_dados` nas variaveis do modelo ou criar campos estruturados no cadastro do empreendimento em uma tarefa futura.
  commit:
    - Pendente.

## Bloqueios e Pendencias Globais

| Data | Responsavel | Bloqueio/Pendencia | Impacto | Proximo passo |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |

## Como Usar

1. Ao iniciar uma tarefa, substitua o status atual e registre a sessao.
2. Adicione os arquivos em `Ownership Ativo`.
3. Registre o trabalho em `Trabalhos em Andamento`.
4. Durante a tarefa, atualize `feito`, `pendencias` e `validacao`.
5. Ao finalizar, mova o item para `Trabalhos Finalizados`.
6. Libere os arquivos em `Ownership Ativo`.
7. Atualize tambem:
   - `docs/workspace/OWNERSHIP_ATIVO.md`
   - `docs/workspace/HANDOFF_GLOBAL.md`
   - `docs/workspace/SESSOES_ATIVAS.md`
