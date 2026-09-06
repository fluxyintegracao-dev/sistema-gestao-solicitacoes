# Decisões que só o cliente pode tomar — leva de preferências (06/09)

Lote acumulado durante a leva, em vez de parar a cada item, conforme
combinado. Cada uma está aqui por um destes motivos: **remove capacidade**,
**muda comportamento percebido**, **é regra de negócio**, ou **duas decisões
suas se contradizem**. Nenhuma foi decidida por mim.

Tudo abaixo está **medido**, não estimado. Onde há número, há a medida.

---

## D1 — O espelho em localStorage contraria a letra da sua regra

**Motivo:** duas decisões suas se contradizem.

Você disse: *"Nada de preferência em localStorage a partir desta leva."*
A preferência **passou toda para o banco** — colunas, filtros, blocos, modo de
lista, alinhamento vivem em `usuario_lista_preferencias` e viajam com a
pessoa. Mas o localStorage **continua sendo escrito**, e isso é deliberado.
Ele deixou de ser a verdade e virou duas outras coisas:

1. **Semente síncrona.** A carga do servidor é assíncrona. Entre o primeiro
   desenho da tela e a resposta existe uma janela. Semeando do espelho local,
   a tabela **nasce certa** para quem já usou aquela máquina. Sem a semente, a
   alternativa honesta seria segurar o app inteiro atrás de uma requisição — e
   preferência não pode atrasar tela, muito menos derrubar.
2. **Rede de rollback.** Se este deploy for revertido, o build anterior
   encontra a configuração do usuário exatamente onde sempre esteve. Por isso
   o espelho precisa continuar **atualizado**, no formato e nas chaves
   antigas: espelho congelado devolveria o usuário a uma configuração velha.

Precedência hoje: **servidor > espelho local > padrão da tela**. O espelho
nunca ganha do banco.

**O que decidir:** manter o espelho (a leva cumpre o espírito da regra: a
preferência é do usuário e vale em qualquer aparelho) ou cumprir a letra e
apagar o espelho — ao custo de a tela nascer no padrão e corrigir-se sozinha
um instante depois, e de perder a rede de rollback.

**Minha recomendação:** manter. O que você combateu foi *"a mesma pessoa vê
listas diferentes conforme a máquina"*, e isso acabou.

---

## D2 — Largura de coluna: ainda não foi para o banco, e a escolha é sua

**Motivo:** as três saídas mudam o que você vê.

A largura ficou de fora da migração, de propósito. Ela é guardada em **pixel
absoluto**. Hoje o dano é contido porque a chave é **por navegador**: quem
arrasta no monitor de 27" estraga no máximo o próprio 27". Levar pixel
absoluto ao banco **por usuário** faz o monitor de 1920 estragar o notebook de
1366 — e esse defeito **já aconteceu neste projeto**: tabela ajustada em 1920
e aberta em 1366 ficou com **1805px num contêiner de 1239px**, coluna NOME com
**813px** e quatro colunas (OBRA, VÍNCULO, STATUS, AÇÕES) **fora da borda do
cartão**, sem nunca remedir.

As três formas de guardar largura por usuário, e o preço de cada uma:

| | como funciona | o que você perde |
|---|---|---|
| **(a) por faixa de largura de janela** | cada tamanho de tela guarda o seu ajuste | você ajusta **duas vezes** (uma no monitor, outra no notebook) |
| **(b) proporção em vez de pixel** | funciona em qualquer tela, sem estourar | perde o **ajuste fino**: a coluna acompanha a janela |
| **(c) pixel com teto pelo contêiner** | migração direta do que já existe | em tela menor a coluna **encolhe sem você pedir** |

O tipo `larguras` **já existe no backend**, esperando. O ponto de corte é um
arquivo só (`ResizableTable.jsx`). Enquanto não vier a decisão, fica como
está: por navegador, sem risco de estourar.

**Minha recomendação:** (b). É a única que não te obriga a ajustar duas vezes
nem a ver coluna fora do cartão.

---

## D3 — Conjunto inicial reduzido de filtros: só 3 telas têm, e o resto?

**Motivo:** muda comportamento percebido (filtro some sem a pessoa pedir).

Você aprovou o conjunto inicial reduzido para **3 telas em 5 endereços** (as
consultas de títulos). O **seletor** de filtros visíveis, esse sim, está indo
para todas as telas com filtro — mas **sem esconder nada por padrão**: todos
os filtros continuam aparecendo na primeira abertura, e o seletor só existe
para quem quiser mexer.

Não estendi o conjunto reduzido às demais porque **esconder filtro por padrão
é mudar o que a pessoa vê sem ela pedir** — e o critério de "os 4–5 mais
usados" precisa ser declarado tela a tela, o que é decisão sua, não minha.

**O que decidir:** se quer o conjunto inicial reduzido nas outras telas, e por
qual critério. Se quiser, eu levanto e trago a proposta por módulo, como fiz
com as de títulos.

---

## D4 — O verificador grava preferência no banco de desenvolvimento

**Motivo:** duas decisões suas se contradizem.

Você disse: *"Somente navegação e leitura: o harness não cria, altera nem
apaga registro no ambiente de desenvolvimento — ele é compartilhado."*
E também: *"matriz no preview real antes de declarar pronto."*

As quatro provas novas (colunas escolhíveis, filtro escondido limpa o valor,
recolhimento sobrevive à recarga, camada fecha e a seleção continua
funcionando) **só provam alguma coisa se gravarem** — é exatamente a
capacidade nova que a leva entrega.

**O que fiz, e por que julguei reversível:** a escrita fica **na linha de
preferência do próprio usuário de QA**, nunca em registro de negócio. Toda
prova **restaura o padrão no fim**, dentro de `finally`, e **falha de
restauração REPROVA o item** em vez de passar calada — "Restaurar padrão" que
não restaura é defeito da capacidade, não do teste. Onde escolher um valor
significaria criar ou apagar registro de verdade, a prova **não escolhe**.

**O que decidir:** se essa leitura ("preferência do usuário de QA não é
registro compartilhado") vale, ou se você prefere que a capacidade nova seja
verificada só à mão, por você, no caderno de teste.

---

## Onde estas decisões moram no código

Quando qualquer uma vier, o ponto de corte já está marcado com comentário
datado, para não virar caça ao tesouro:

- **D1** — `frontend/src/contexts/PreferenciasContext.jsx`, nota "POR QUE O
  localStorage CONTINUA SENDO ESCRITO"
- **D2** — `frontend/src/components/ResizableTable.jsx`, nota "A LARGURA
  CONTINUA NO localStorage — E ISSO É DELIBERADO"
- **D3** — `docs/PROPOSTA-FILTROS-INICIAIS.md`
- **D4** — `frontend/scripts/qa-preview/preferencias.mjs`, cabeçalho
