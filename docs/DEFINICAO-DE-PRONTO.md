# DEFINIÇÃO DE PRONTO (DoD) — por tela, verificável, sem interpretação

Criada em 02/09 por decisão do cliente, depois que "pronto" reportado em
mock local chegou com defeito no preview publicado.

**"PRONTO" significa UMA coisa só:** verificado NO PREVIEW PUBLICADO
(https://refactor-dev.jrfluxy.com.br), com dados REAIS, em TODAS as telas do
escopo, contra os itens abaixo, com evidência por tela (captura + resultado
PASSOU/FALHOU por item). Qualquer outra coisa é "em andamento".

- "Implementado no componente" NÃO é pronto — é capacidade, não cobertura.
  Só verificação NA TELA muda o estado de um item.
- Quem verifica é o harness `frontend/scripts/qa-preview/` (Playwright contra
  o preview real, logado com o usuário de QA), que gera a
  `docs/MATRIZ-COBERTURA.md` automaticamente. Matriz não se edita à mão.
- Quando o cliente aponta um defeito que a DoD não cobre, o item entra AQUI
  ANTES da correção, e a matriz roda de novo em todas as telas.

## Como cada item é verificado

Cada item recebe **PASSOU / FALHOU / N/A** por tela. N/A só quando o item
não se aplica ao tipo da tela (ex.: C3 em listagem, X1 em tela sem tabela) —
e o motivo do N/A é registrado pelo harness. FALHOU vem com o seletor do
elemento e a medida que reprovou.

## CABEÇALHO

- **C1** Faixa fixa presente; ao rolar, gruda ENCOSTADA na topbar (top da
  faixa = base da topbar, sem folga), compacta sem sumir, e NENHUM conteúdo
  da lista fica visível entre a base da topbar e o topo da faixa (vão
  transparente é reprovação).
- **C2** Título em 22px; apoio (contagem + descrição) em UMA linha, sem
  quebra, na própria faixa; contagem junto do apoio.
- **C3** Seta de voltar à esquerda do cabeçalho — SÓ em tela de
  detalhe/registro (em listagem, N/A; seta presente em listagem também é
  defeito de R11).
- **C4** Em tela de detalhe: nome/identificação do registro com destaque
  (peso e escala de título). Número sem nome é defeito.
- **C5** Ações principais à direita: UM primário sólido, secundários em
  contorno, destrutiva apartada.
- **C6** Nenhum link de navegação disfarçado de ação (menu "⋯" e barra de
  ações sem navigate/Link de "ir para" — R11).

## TABELAS

- **T1** Título e conteúdo da coluna com o MESMO alinhamento (th × td).
- **T2** Menu de alinhamento no cabeçalho, com affordance VISÍVEL (cursor +
  ícone no hover + tooltip). Capacidade sem sinal não existe (R15).
- **T3** Redimensionamento arrastando muda SÓ a coluna arrastada e PERSISTE
  ao recarregar a página.
- **T4** Colunas proporcionais ao conteúdo — sem coluna sobrando enquanto
  outra espreme (a sobra vai para a coluna de conteúdo).
- **T5** Coluna de identificação exibida em MAIÚSCULAS; sublinha em caixa
  normal.
- **T6** O MAIOR nome real da base não corta feio (reticências no meio de
  palavra sem tooltip = FALHOU; truncar com title completo é aceitável para
  texto, nunca para valor).
- **T7** O MAIOR valor monetário real da base não vaza nem trunca — NUNCA.
  Largura da coluna de valor dimensionada pelo pior caso real.

## FILTROS E BUSCA

- **F1** UMA única caixa de busca no contexto, ocupando a largura da faixa
  (duas buscas no mesmo contexto = FALHOU — R16).
- **F2** Filtros marcáveis (checkbox, múltipla seleção); nenhum select de
  filtro (select de formulário e seletor de contexto seguem legítimos — R12).
- **F3** Etiquetas de filtro ativo visíveis e removíveis.
- **F4** Espaçamento entre a linha de filtros e a tabela vem da escala
  (16px), igual em toda tela — nem colado, nem sobrando.

## BLOCOS

- **B1** Fundo cinza-azulado (canvas) com blocos brancos flutuando.
- **B2** UM bloco principal com barra de cor; secundários neutros.
- **B3** Cada informação aparece UMA vez só na tela (mesma contagem/apoio na
  faixa E no bloco = FALHOU; segunda aparição com função diferente é
  exceção registrada).
- **B4** Campo vazio some, com contador "ver N campos vazios".
- **B5** Nenhum texto solto fora de bloco (todo texto tem superfície).

## MEDIDAS E CORES

- **M1** Alvo mínimo 32×32px desktop / 44×44px toque em todo botão e ícone
  clicável.
- **M2** Nenhuma medida fora da escala (4/8/12/16/24/32/48; tipo
  12/14/18/22) — exceção só com registro no manifesto.
- **M3** Contraste AA (4.5:1 corpo, 3:1 texto grande) em todo texto.
- **M4** Comparações: previsto AZUL × realizado VERMELHO, mesma cor da série
  no KPI, no gráfico e na tabela.

## FORMULÁRIOS

- **R1** Cadastro raro abre em MODAL, não inline na tela.
- **R2** Campos da mesma linha alinhados (mesma altura/baseline), largura
  por tipo de dado.

## MOBILE (390px)

- **X1** Tabela vira cards legíveis (mesmas colunas, um markup).
- **X2** Faixa fixa funciona (gruda, compacta, não some, sem vão).
- **X3** Nada estoura a largura da viewport (sem scroll horizontal da
  página; tabela rola dentro do próprio contêiner).

## Evidência exigida por entrega

1. `docs/MATRIZ-COBERTURA.md` completa (todas as telas entregues, não só as
   novas — regressão é obrigatória), com data da verificação e cada FALHOU
   justificado.
2. Capturas do preview real por tela em 1920 / 1366 / 390.
3. Relatório de falhas com item da DoD + seletor do elemento.
4. Lista de decisões pendentes do cliente.

Narrativa de "gate passou" sem matriz, captura de mock e "implementado no
componente" NÃO são evidência.
