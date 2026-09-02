# Componentes padrão da reforma das telas (Leva 0)

Base para reformar as ~189 telas restantes sem reescrevê-las uma a uma.
Vive em `frontend/src/components/padrao/` + `frontend/src/styles/componentes-padrao.css`.
Pilotos de referência: `pages/Usuarios.jsx` (listagem de cadastro),
`pages/Parceiros.jsx` (tela mista) e `pages/FinanceiroTituloDetalhe.jsx` (detalhe).

## As regras de organização (decididas pelo cliente, 02/09)

1. **Cada tela responde UMA pergunta central.** O que responde vem primeiro e
   com mais peso; contexto depois e menor; raro fica recolhido. Dado que gera
   ação primeiro; histórico e registros por último (recolhidos por padrão).
2. **Largura é decisão.** Bloco principal em largura total; apoio divide o
   espaço abaixo. Secundário nunca fica lado a lado com o principal.
3. **Informação aparece UMA vez.** Repetição sai — remoção só visual, o dado
   continua no sistema. Exceção: segunda aparição com função diferente
   (referência × campo editável) fica, visualmente secundária.
4. **Campo/bloco vazio some, com contador** ("Ver todos os campos (N vazios)").
5. **Modulável onde a estrutura permitir** (mecanismo do detalhe/Home); fixo
   onde não der, com proposta aprovada.
6. **Denso, sóbrio-moderno**: canvas `--ui-canvas` acinzentado, blocos brancos;
   um primário por tela com barra de cor à esquerda; secundários em
   `--ui-surface-2` (branco rebaixado, criado nesta leva). Botões TODOS
   visíveis, em três pesos; destrutivo em vermelho suave, sempre apartado;
   ações raras no menu "⋯". Só tokens — nenhuma cor à mão.
7. **Adoção antes de criação**: ListaAvancada, StatusBadge, ResizableTable,
   ModalPortal/OverlayModal, `useFecharAoSair`, classes `app-*` já existentes.

## Os componentes

| Componente | Para quê | Observações |
|---|---|---|
| `PageHeader` | Cabeçalho de página: título+subtítulo, UMA `acaoPrincipal` sólida, `secundarias` em contorno, `destrutiva` apartada, `mais` (MenuMais) | O `h1` é ocultado pelo CSS do shell (a topbar mostra o título da seção) — fica no DOM por acessibilidade. **Links para telas irmãs não entram** (menu e Ctrl+K resolvem; decisão de 02/09) |
| `MenuMais` | Menu "⋯" para ações raras | `itens=[{rotulo, onClick, perigosa, desabilitada, icone, title}]`; perigosas vão para o fim, com separador |
| `BlocoConteudo` | O card padrão | `variante="primario"` (barra de cor via `cor`, ex. `var(--module-financeiro)` ou `var(--sem-info)`) / `"secundario"` (`--ui-surface-2`); `recolhivel` + `recolhidoPadrao` para raros/históricos |
| `StatGrid` + `StatTile` | Ladrilho de dado único (unifica InfoItem, app-summary-card, StatsCard, hub-pendencia-cartao) | `tom` semântico, `span`, `full`, `vazio` |
| `CamposComVazios` | O grid de campos do detalhe com o alternador de vazios | `campos=[{label, valor, sub, tom, span, contexto}]` — a contagem sai da própria lista (nada de espelhar condição à mão); `contexto:false` = campo que não pertence a este registro (fora da tela E da contagem) |
| `TabelaPadrao` + `CelulaDupla` | Tabela para cadastros/apoio/mistas | Colunas com `render`, larguras persistidas (ResizableTable/localStorage), `urgencia(item)` → tarja na linha, `acoesLinha` (visíveis, numa linha só — dimensionar `larguraAcoes`), `aoClicarLinha`; **no mobile as MESMAS colunas viram cards** — nunca dois markups para o mesmo dado. `CelulaDupla` põe dois dados relacionados numa coluna só |
| `FormSecao` + `CampoForm` | Formulário disciplinado | fieldset+legend de verdade, grid único (`colunas` 2/3/4, `span`, `linha`), label/hint/erro pelas classes `.form-*` (que existiam com zero uso) |

**Quando usar ListaAvancada vs TabelaPadrao**: a listagem PRINCIPAL de um
módulo (visões, filtros salvos, busca, lote) usa `ListaAvancada`
(`docs/LISTA-AVANCADA.md`); ela deliberadamente NÃO tem ação por linha (clique
abre o registro). CRUD de cadastro e tabelas de apoio — onde convite/ativar/
editar na linha são o dia a dia — usam `TabelaPadrao`.

## Padrão de TELA MISTA (aprovado no piloto Parceiros)

Lista em largura total como bloco principal; o formulário abre como painel
ACIMA da lista quando acionado (Nova pessoa / Editar / clique na linha) e,
enquanto ativo, assume a barra de cor — a lista rebaixa para neutra (um
primário por tela; a hierarquia segue o foco). Campos raros do form em
`BlocoConteudo` recolhível que nasce aberto quando o registro já tem dado
(`recolhidoPadrao={!temDado}`, com `key` por registro para remontar). Mesma
rota, mesmos handlers — reorganização pura.

## Tokens e utilitários novos

- `--ui-surface-2` (`#f7f9fc` claro / `#182642` escuro): branco rebaixado de
  bloco secundário. `--ui-surface-soft` NÃO serve para isso (é igual ao canvas).
- `.tarja` + `.tarja--danger/--warning/--info/--success`: a barra lateral de
  4px que existia copiada em 3 lugares (ListaAvancada linha/card, cartão da
  Home) — para item novo, use o utilitário.
- `.btn-perigo-suave`: destrutivo visível em vermelho suave (com `.btn
  .btn-outline`); o `btn-danger` cheio fica para confirmações finais.
- `.app-celula-dupla`, `.app-actionbar` + `.app-actionbar-apartada`.

## Consertos da leva

- `ui/EmptyState.jsx` usava classes `-icon/-title/-message` que não batiam com
  o CSS (`__icon/__title/__description`) — o estilo nunca aplicava. Corrigido.
- Bloco morto de 65 linhas (`{false && ...}`) removido de `Parceiros.jsx`
  (aprovado 02/09 — código que não renderiza não é funcionalidade).

## Capturas desta leva

Geradas servindo o BUILD (`vite preview`) com a API interceptada no navegador
(dados de amostra — roteiro em `scratchpad` da sessão; sem backend, sem
credencial). No preview publicado o comportamento é o mesmo com dados reais.
