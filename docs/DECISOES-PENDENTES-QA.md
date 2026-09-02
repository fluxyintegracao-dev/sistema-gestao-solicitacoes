# Decisões pendentes do cliente — Etapa A

Lista exigida pela Parte 7 do processo. Nada aqui foi feito por conta
própria; cada item aguarda o seu ok (Parte 5: remover ou reestruturar
exige aprovação).

## RESOLVIDO — migração de todas as tabelas (Opção A aprovada)

Você aprovou a Opção A: inventário concluído e **todas** as tabelas
migradas antes de qualquer outra coisa. Em execução por ondas de agentes
paralelos; o estado real de cada arquivo é recalculado por
`frontend/scripts/qa-preview/atualizarInventario.mjs` — a coluna "Situação"
do `docs/INVENTARIO-TABELAS.md` nunca é escrita à mão.

---

## 1. Tabelas que NÃO migram sem perder comportamento

O componente padrão (`TabelaPadrao`) não cobre estes casos. Migrar
significaria remover funcionalidade que hoje existe — por isso pararam
aqui em vez de virarem migração silenciosa com perda.

### 1.1 Confirmados durante a migração (motivo técnico verificado no código)

| Tabela | O que TabelaPadrao não cobre |
|---|---|
| **Títulos financeiros** (tabela principal, `FinanceiroTitulos.jsx`) | Colunas escolhidas pelo usuário e reordenáveis por botões `<`/`>` dentro do `<th>`; checkbox "selecionar todos" no cabeçalho; render que devolve `<td>` inteiros; classe por linha (selecionada/vencida); **três** estados de corpo vazio distintos (sem filtro aplicado × nada encontrado × carregando) |
| **Relatório analítico** (`FinanceiroRelatorioAnalitico.jsx`) | Colunas dinâmicas com **reordenação por arrastar** no próprio cabeçalho (`draggable` em cada `<th>`) — o cabeçalho do padrão é o botão de alinhamento |
| **Itens da solicitação de compra** (`SolicitacaoCompraDetalheView.jsx`) | `ItemCompraExpansivel` emite **duas `<tr>` por item**: a linha e uma linha de detalhe expansível com `colSpan` |
| **Contratos** (tabela principal, `GestaoContratos.jsx`) | Ordenação por clique no cabeçalho |

**Decida**: (a) manter estas quatro como estão, registradas como exceção no
manifesto (a matriz marca T2/T3 como N/A justificado); ou (b) eu estendo o
`TabelaPadrao` para cobrir os casos — ordenação, seleção no cabeçalho,
linha expansível e colunas escolhidas pelo usuário — e aí elas migram. A
opção (b) é trabalho de componente, não de tela, e afeta todas as tabelas
do sistema; prefiro fazê-la como leva própria, com a matriz cobrindo a
regressão.

### 1.2 Fora do escopo por natureza (não são decisão, só registro)

- `RevisarSolicitacaoCompra.jsx`: a `<table>` está dentro de uma **string
  HTML** do documento gerado para pré-visualização/PDF (`srcDoc` do
  iframe) — não é tabela React.
- Casos ainda não alcançados pelas ondas em curso (matriz de cotação com
  colunas por fornecedor, tela pública de cotação, preview de importação
  do RH/DP, conciliação espelhada, árvore de DRE, heatmap em grid,
  planejamento de custos e demais telas de edição inline pesada) serão
  reportados com motivo técnico ao fim da migração, no mesmo formato.

## 2. Adaptações de interface feitas na migração (reorganização, não remoção)

Preciso do seu aval sobre estas — nenhuma perdeu informação, mas mudaram
onde o controle aparece:

1. **"Selecionar todos" saiu do cabeçalho da tabela** em Pagamentos,
   Boletos e Solicitações de Compra. Motivo: no padrão, o `<th>` é o botão
   de alinhamento/redimensionamento (R14/R15) — checkbox ali brigaria com a
   affordance. Passou para logo acima da tabela, com rótulo visível e os
   mesmos handlers.
2. **Destaque de linha** que era cor de fundo (`bg-blue-50` de linha
   selecionada, âmbar de linha bloqueada, `opacity-50` de registro inativo)
   virou o mecanismo do componente: tarja lateral (`urgencia()`) ou realce
   na coluna de identificação. A informação de estado continua visível e
   também segue na coluna Status.
3. **Listas móveis duplicadas removidas** em 10 telas (Compras e
   Financeiro): existia um segundo markup `md:hidden` de cards repetindo os
   mesmos dados. O padrão gera os cards a partir das MESMAS colunas — um
   markup só (regra de COMPONENTES-PADRAO). Nenhum campo sumiu.

Se qualquer uma dessas três te desagradar, eu reverto — são reversíveis e
localizadas.

## 3. Código morto com tabela (5 arquivos) — aguarda ok para REMOVER

`pages/Cargos.jsx`, `pages/TiposMacroContrato.jsx`,
`solicitacao-compra/pages/SolicitacaoCompraDetalhe.jsx` (substituída pela
View), `components/ObraSearchModal.jsx`, `components/SolicitacaoTable.jsx` —
sem rota nem uso. Recomendo remover em vez de migrar; remover exige seu ok
explícito (Parte 5). Enquanto não decidir, ficam como estão e fora da
migração.

## 4. Pivô ObraTipoApropriacao

Único caso já registrado em `excecoes_tabela_crua`: colunas dinâmicas com
painel por célula. T2/T3 estão como N/A justificado na matriz. **Decida**:
manter a exceção ou redesenhar o pivô numa leva futura.

## 5. "Abrir solicitação" no detalhe do título financeiro

É link para registro relacionado na barra de ações. Com o check C6
corrigido (botão de ação nunca é navegação; só link para OUTRA rota
reprova), este caso é o único que ainda cai na regra. Está como N/A
registrado na matriz apontando para este item. **Decida**: fica como está
(e eu documento a exceção na R11), ou registros relacionados passam a
aparecer de outra forma.

## 6. Parceiros com painel acima da lista (não modal)

Decisão registrada em R9 (cadastro de uso frequente). O item R1 da DoD
está como N/A registrado para essa tela. **Confirme** que segue valendo.
