# Etapa B — Levantamento do módulo FINANCEIRO (03/09)

Levantamento antes de qualquer código. Nada foi alterado.

**Tamanho:** 32 rotas, **30 telas distintas**, ~30.000 linhas. É o maior
módulo do sistema — quase quatro vezes o RH/DP (7.580 linhas).

**Telas compartilhadas que o Financeiro usa: ZERO.** Conferido na varredura
de `docs/TELAS-COMPARTILHADAS.md`: o Financeiro é o único módulo com
relatórios que **não** usa a `ModuloRelatorios` — tem hub próprio
(`FinanceiroRelatorios`) e 11 relatórios só dele. A contagem de 30 fecha
sem dívida com outra leva.

**Estado de cobertura hoje:** só **1** das 30 está no manifesto do harness
(`financeiro-titulo-detalhe`, que entrou na Etapa A). As outras 29 nunca
foram medidas contra a DoD.

---

## 1. As telas

### Núcleo de títulos (5 telas, 9.593 linhas)
| Tela | Rota | Linhas |
|---|---|---|
| FinanceiroTitulos | `/financeiro/titulos`, `/contas-a-receber`, `/contas-a-pagar` | **3.554** |
| FinanceiroTituloNovo | `/financeiro/titulos/novo` | 2.625 |
| FinanceiroTituloDetalhe | `/financeiro/titulos/:id` | 1.793 |
| FinanceiroTituloEditar | `/financeiro/titulos/:id/editar` | 1.621 |

### Operação (9 telas, 9.404 linhas)
Pagamentos (1.515), Conciliação OFX (**3.341**), Boletos (1.371), Bancos
Enterprise (729), Financiamentos (751), Caixas e Contas (541), Cheques de
Terceiros (598), Baixas Realizadas (483), Baixas Compostas (171), DDA (325),
Faturas de Cartão (311 + detalhe 333).

### Relatórios (12 telas, 5.913 linhas)
Hub próprio (1.497) + Grupo Consolidado, Fluxo Consolidado, DRE (816),
Diagnóstico do DRE, Intercompany, Endividamento, Analítico, Financeiro de
Obras (801), Resultado de Obras, Centros de Custo.

### Cadastros e comprovantes (3 telas, 2.143 linhas)
Cadastros Financeiros (1.725), Upload Comprovantes (148), Comprovantes
Pendentes (270).

---

## 2. O que está fora do padrão

| Sintoma | Quantas telas |
|---|---|
| **Não usam `PageHeader`** | **29 de 30** (só `FinanceiroTituloDetalhe` usa) |
| Copiam `.app-page-header` na mão | 12 |
| **Não usam `BarraFiltros`** | **30 de 30** |
| Cor `slate` fixa | 21 telas, **245 ocorrências** |
| Caixas do navegador (R19) | 50 chamadas em 15 arquivos |
| Tabela crua (`<table>`) | 1 — `FinanceiroDre` |

**Tabelas já estão majoritariamente no `TabelaPadrao`** (55 usos), herança
da Etapa A. Como no RH/DP, o trabalho é cabeçalho, filtros e blocos.

**Três padrões de campo convivem**: `input w-full` (325), `app-filter-field`
(133), `form-control` (15) e `input input-sm` (10). Nenhuma tela usa a
`BarraFiltros` — o módulo inteiro é grade crua de campos.

---

## 3. Repetição de informação

**a) O mesmo recorte redigitado em até 23 telas.**

| Filtro | Telas |
|---|---|
| status | **23** |
| obra | 13 |
| parceiro | 13 |
| competência | 10 |
| data inicial/final | 10 |

**b) Uma tela servindo três rotas com nomes de negócio diferentes.**
`FinanceiroTitulos` (3.554 linhas) atende `/financeiro/titulos`,
`/contas-a-receber` e `/contas-a-pagar`. São três itens de menu distintos
para o mesmo arquivo, discriminados por `useLocation`. Precisa de decisão:
são três telas na matriz (com recorte próprio) ou uma com três entradas?

**c) Doze relatórios, um hub, e o hub tem tabela própria.**
`FinanceiroRelatorios` (1.497 linhas) não é só um mural de cartões como o
`ModuloRelatorios` — tem três `TabelaPadrao` dentro. Ou seja, é hub **e**
relatório ao mesmo tempo.

**d) Quatro telas de resultado com recorte quase igual.**
Financeiro de Obras, Resultado de Obras, Resultado por Centros de Custo e
Analítico partem do mesmo par obra × período. Candidatas a um recorte
compartilhado — mas é decisão de negócio, não de layout.

---

## 4. Candidatos a recolhimento

1. **Filtros → `BarraFiltros`** nas 30. É o maior ganho isolado do módulo:
   hoje são centenas de campos em grade crua, nenhum com etiqueta do que
   está aplicado.
2. **`FinanceiroTituloNovo` (2.625) e `FinanceiroTituloEditar` (1.621)** são
   quase certamente o mesmo formulário em dois arquivos. Se forem, a leva
   pode unificá-los — mas confirmo antes de propor.
3. **`FinanceiroConciliacao` (3.341 linhas)** é a maior tela do sistema.
   Merece leitura própria antes de qualquer mexida.
4. **`FinanceiroBancos` com 7 tabelas e 42 cores fixas** e
   **`FinanceiroBoletos` com 49 cores fixas** são os dois piores casos de
   medida/cor à mão do módulo.

---

## 5. O que precisa de decisão sua

**D1 — Fatiar a leva.** 30 telas e 30 mil linhas não cabem numa leva só; o
RH/DP tinha 9 telas e levou cinco rodadas de revisão. Proponho **quatro
levas**: (a) núcleo de títulos, 5 telas; (b) operação, 9; (c) relatórios,
12; (d) cadastros e comprovantes, 3. Cada uma com matriz e revisor
próprios. Aprova esse corte, ou prefere outro?

**D2 — `FinanceiroTitulos` em três rotas.** Três itens de menu, um arquivo.
Vira uma tela com recorte declarado (como Pessoal virou porta única), ou
continuam três entradas iguais?

**D3 — Novo × Editar título.** Se forem o mesmo formulário em dois arquivos
(4.246 linhas somadas), unifico? É mudança estrutural, não de layout.

**D4 — Ordem.** O núcleo de títulos é o que o usuário mais vê, e também o
mais arriscado (dinheiro, baixa, conciliação). Começo por ele, ou pela
operação, que é mais isolada e serve de aquecimento para o padrão?

**Parado aguardando seu ok.** Nenhuma linha de código de tela foi escrita.
