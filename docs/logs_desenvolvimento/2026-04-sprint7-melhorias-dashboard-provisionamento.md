# 2026-04 - Sprint 7: Melhorias no Dashboard de Provisionamento Financeiro

## Escopo
- dashboard do módulo de provisionamento financeiro
- sem alterações de regras de negócio ou backend

## Objetivo
- melhorar usabilidade, legibilidade e navegabilidade do dashboard gerencial

## Entregas

### Correção de acentuação
- corrigidos todos os textos com acentos faltando no dashboard:
  - "Próximos", "Análise", "Não", "Crítica", "Críticos", "Atenção", etc.
  - "Exposição do período", "Distribuição", "Composição", "Concentração"
  - "Leituras para decisão", "Pressão", "Priorização", "Alocação"
  - "Participação", "Provisão(ões)", "Próximas", "Líder"

### Botões de atalho de período
- adicionados 4 botões de preset de data na seção de filtros:
  - "Este mês", "Próximos 30 dias", "Próximos 90 dias", "Este ano"
- aplicam automaticamente `data_inicial` e `data_final`

### Cards KPI com variante de cor semântica
- card "Próximos 7 dias" fica âmbar quando há itens críticos no curto prazo
- card "Vencidas não tratadas" fica vermelho quando há vencidas
- sem variante (neutro) quando não há alertas

### Botão de atualização manual
- adicionado botão "Atualizar" ao lado do chip de escopo no hero
- dispara novo carregamento do dashboard sem alterar filtros
- mostra "Atualizando..." e ícone animado durante o carregamento

### Percentual nas barras dos gráficos
- cada linha de BarPanel exibe "X% do total" abaixo do valor em BRL
- calculado sobre a soma do painel (não o total geral), mais relevante por contexto

### Badges de status e prioridade nos alertas
- substituído texto simples por badges coloridas nos cards de alerta:
  - Status: azul (previsto), âmbar (em análise), verde (aprovado/realizado), cinza (cancelado)
  - Prioridade: azul (baixa), âmbar (média), laranja (alta), vermelho (crítica)

### Cards de alerta clicáveis
- cada card de item de alerta (vencidas / críticas próximas) é clicável
- navega para o detalhe da provisão `/provisoes-financeiras/:id`
- hover com elevação visual e ícone de link no canto

### Botão "Ver listagem" nos painéis de alerta
- adicionado no cabeçalho de cada AlertPanel
- navega para `/provisoes-financeiras` (listagem principal)

## CSS adicionado em `frontend/src/index.css`
- `.btn-sm` — variante menor de botão
- `.dash-kpi-card--warning` / `.dash-kpi-card--danger` com dark mode
- `.dash-badge` + `.badge-blue`, `.badge-amber`, `.badge-green`, `.badge-red`, `.badge-orange`, `.badge-gray` com dark mode
- `.dash-alert-card--link` com hover e dark mode

## Arquivos
- `frontend/src/modules/provisionamento-financeiro/pages/DashboardProvisionamentoFinanceiro.jsx`
- `frontend/src/index.css`

## Validação
- `npm run build` em `frontend/` — build OK sem erros
