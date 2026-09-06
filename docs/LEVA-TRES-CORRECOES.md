# As três correções do cliente (06/09) — diagnóstico medido antes de codar

Pedido em três itens, todos "valem para todo o sistema". Aqui está o que
**medi** antes de mexer, para nenhum agente começar por suposição.

Observação de método: as capturas do cliente não chegaram ao canal de
trabalho. Tudo abaixo foi medido no código; onde a medida depender do que
aparece na tela, está marcado como **a confirmar no preview**.

---

## Item 1 — Controles do bloco na mesma linha do título

**O que o cliente descreve:** na consulta, o arranjo virou quatro linhas —
título do bloco (com vazio à direita), "Carteira", campos, botões. Ele quer os
controles do bloco (Carteira, Mais filtros, Filtros visíveis, Limpar) **na
linha do título**, ocupando esse vazio; campos abaixo; "Consultar" à direita,
no fim.

**A regra que ele declarou, e que é maior que a tela:** espaço horizontal vago
ao lado do título deve ser usado pelos controles do bloco, em vez de empurrar
tudo para baixo.

**O que já sabemos por medição anterior (05/09):** o cabeçalho de bloco já
tinha sido medido com faixa vazia. Naquele levantamento, **77 dos 209
cabeçalhos do sistema não declaram ação nenhuma** — a barra de ações é
desenhada, mede 0px, e o `space-between` deixa o vazio à direita. É o mesmo
vazio que o cliente agora quer preenchido.

**A confirmar no preview:** quantos blocos hoje têm controles empilhados
abaixo do título tendo espaço livre ao lado dele.

---

## Item 2 — Painel que abre para fora da janela

**O que o cliente descreve:** a caixa "Mais filtros" abre para fora da lateral
esquerda e fica cortada; metade do conteúdo fica inalcançável.

**A regra:** todo painel, menu e lista suspensa se reposiciona para caber — se
não couber de um lado, abre para o outro; se não couber em lado nenhum, alinha
à borda e rola por dentro.

**O mecanismo já existe e está provado.** `usePosicaoFlutuante(ancoraRef,
menuRef, aberto, { ancorarADireita })`, em `TabelaPadrao.jsx`, foi escrito
nesta sessão exatamente para isso: mede o tamanho real do menu e o prende
dentro da janela. Ele já é usado pelo menu de alinhamento e pelo painel de
colunas — e nasceu de um defeito idêntico, que custou 4 células de matriz.

**Portanto o item 2 não é inventar: é generalizar o que já funciona.** Medido:
**35 pontos de chamada de `useFecharAoSair`** em 25 arquivos marcam onde estão
as camadas flutuantes do sistema. Cada uma precisa ser conferida contra o
`usePosicaoFlutuante`.

---

## Item 3 — Conteúdo passando por cima da barra do topo

**O que o cliente descreve:** ao rolar, botões e blocos passam POR CIMA da
barra do topo e do cabeçalho fixo.

**A causa, medida — e não é uma tela, são 131 lugares.**

A escala de camadas **já existe**, em `index.css`:

```
--z-sticky: 20     (barra do topo, faixa fixa)
--z-dropdown: 25
--z-sidebar: 30
--z-dropdown-portal: 90
--z-modal: 100
--z-toast: 120
```

E é contornada em **131 lugares**:

| onde | quantos | o que aparece |
|---|---|---|
| CSS (`z-index:` cru) | **72** | mais de 20 valores distintos: 1, 2, 3, 4, 6, 8, 12, 15, 20, 25, 30, 39, 40, 60, 79, 80, 130, 1000, 1100 |
| Tailwind (`z-*`) | **59** | `z-20` (21×), `z-50` (11×), `z-10` (7×), `z-[60]`, `z-[110]`, `z-[90]`, `z-[80]`, `z-40`, `z-[70]`, `z-[1]` |
| `style` inline (`zIndex:`) | **3** | 19, 20, 30 |

**Aqui está o defeito do cliente, em uma linha:** a barra fixa vale **20**, e
há **11 usos de `z-50`** e outros acima disso em conteúdo comum. Conteúdo em 50
passa por cima de barra em 20. Não é acaso de uma tela — é o que a escala
permite quando ninguém obriga a usá-la.

**O que o cliente pediu, e é o certo:** padronizar num único lugar, não tela a
tela, e acrescentar ao verificador. Sem a regra no portão, os 131 voltam.

**Cuidado que a correção exige:** `z-index` só compara dentro do mesmo
**contexto de empilhamento**. Um ancestral com `transform`, `filter`,
`opacity < 1`, `will-change` ou `contain` cria contexto novo, e ali o valor
maior do filho não vence a barra de fora. Trocar número por token sem conferir
isso conserta a metade fácil e deixa a difícil de pé.
