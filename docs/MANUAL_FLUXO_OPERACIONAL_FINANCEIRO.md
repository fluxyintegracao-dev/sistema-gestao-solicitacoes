# Manual do Fluxo Operacional Financeiro - FLUXY

## 1. Objetivo

Este manual descreve o fluxo operacional do financeiro no FLUXY, desde a criacao da solicitacao ate a conciliacao bancaria por OFX.

O principio da V1 e simples:

- a solicitacao e o ponto de origem
- o financeiro nasce a partir da solicitacao
- a baixa financeira registra o que foi pago ou recebido
- a conciliacao OFX apenas confere o banco contra o que ja foi registrado

O sistema nao cria titulos automaticamente na abertura da solicitacao e nao cria baixas automaticamente a partir do OFX.

---

## 2. Visao geral do fluxo

Fluxo resumido:

1. O usuario cria a solicitacao.
2. A solicitacao recebe parceiro e apropriacao.
3. No detalhe da solicitacao, o usuario usa `Gerar conta`.
4. O sistema cria um titulo financeiro `PAGAR` ou `RECEBER`.
5. Quando o pagamento ou recebimento acontecer, o usuario registra a baixa no titulo.
6. Depois, o usuario importa o OFX da mesma conta bancaria.
7. O sistema sugere o match entre lancamento bancario e movimento financeiro.
8. O usuario confirma manualmente a conciliacao.

---

## 3. Cadastros e preparacao minima

Antes da operacao financeira, o ambiente deve ter pelo menos:

- contas bancarias cadastradas em `Financeiro > Cadastros Financeiros`
- categorias financeiras cadastradas em `Financeiro > Cadastros Financeiros`
- parceiros cadastrados ou com possibilidade de cadastro rapido na solicitacao
- apropriacoes da obra cadastradas para uso no custo

### 3.1 Exemplos de categorias financeiras para cadastro

Para a V1, a recomendacao e começar com poucas categorias, bem objetivas, e expandir depois conforme a operacao pedir.

Exemplos de categorias do tipo `PAGAR`:

- Material de obra
- Servicos de terceiros
- Empreiteiros
- Locacao de maquinas e equipamentos
- Fretes e transportes
- Combustivel
- Despesas administrativas
- Impostos e taxas
- Adiantamento a fornecedor
- Manutencao

Exemplos de categorias do tipo `RECEBER`:

- Medicao de cliente
- Reembolso
- Recebimento contratual
- Recuperacao de despesa
- Venda eventual
- Credito operacional

Exemplos de categorias do tipo `AMBOS`:

- Ajuste financeiro
- Acerto operacional
- Transferencia interna

Padrao sugerido para começar:

- cadastrar primeiro entre 8 e 15 categorias
- evitar categorias muito especificas na V1
- usar nomes simples, que qualquer operador entenda rapido

Exemplo de estrutura inicial recomendada para construtora:

- `PAGAR > Material de obra`
- `PAGAR > Servicos de terceiros`
- `PAGAR > Locacao de equipamentos`
- `PAGAR > Fretes`
- `PAGAR > Impostos e taxas`
- `RECEBER > Medicao de cliente`
- `RECEBER > Reembolso`
- `AMBOS > Ajuste financeiro`

Base atual carregada no ambiente local:

- foi importada uma base de `204` categorias financeiras a partir do plano de contas operacional
- contas `1.*` de resultado foram classificadas como `RECEBER`
- contas `2.*` de resultado foram classificadas como `PAGAR`
- descricoes duplicadas receberam o codigo contábil no nome para evitar ambiguidade no cadastro

Observacoes importantes:

- cada conta bancaria do sistema deve representar uma conta real que gera OFX
- o OFX deve ser importado sempre na mesma conta bancaria correspondente ao extrato
- o sistema bloqueia reimportacao da mesma remessa para evitar duplicidade

---

## 4. Etapa 1 - Criacao da solicitacao

Tela:

- `Nova Solicitacao`

Campos operacionais relevantes para o financeiro:

- obra
- area responsavel
- tipo de solicitacao
- parceiro
- apropriacao principal
- valor
- data de vencimento
- descricao
- anexos

### 4.1 Parceiro

Na propria tela de nova solicitacao existe busca por:

- nome
- CPF/CNPJ

Fluxo:

1. O usuario digita o nome ou CPF/CNPJ.
2. Se o parceiro existir, ele seleciona.
3. Se nao existir, usa o botao `Cadastrar`.
4. O modal rapido permite cadastrar:
   - CPF/CNPJ
   - nome
   - telefone
   - email
   - endereco
   - numero
   - bairro
   - CEP
   - municipio
   - estado

Campos obrigatorios no cadastro rapido:

- CPF/CNPJ
- nome
- telefone

Depois de salvar, o parceiro ja fica vinculado a solicitacao.

### 4.2 Apropriacao de custo

Regra operacional da V1:

- solicitacoes gerais usam 1 apropriacao principal
- solicitacao de compra usa apropriacao por item

Na solicitacao geral:

- a apropriacao e selecionada na criacao

Na solicitacao de compra:

- cada item pode ter uma ou varias apropriacoes
- o rateio precisa fechar 100 por cento
- a distribuicao serve para custo, dashboard e relatorio
- o titulo financeiro continua unico, mesmo se os itens tiverem multiplas apropriacoes

### 4.3 Valor e vencimento

Quando o tipo exigir valor:

- o valor deve ser informado na solicitacao
- a data de vencimento tambem deve ser informada

Esses campos alimentam a sugestao inicial do titulo financeiro depois.

---

## 5. Etapa 2 - Geracao do titulo financeiro

Tela:

- `Solicitacao > Detalhe > Card Financeiro`

Botao:

- `Gerar conta`

O card financeiro da solicitacao mostra:

- quantidade de titulos gerados
- total financeiro vinculado
- parceiro da solicitacao
- valor sugerido

### 5.1 Como funciona

Ao clicar em `Gerar conta`, o sistema abre um modal com sugestoes baseadas na solicitacao:

- tipo
- parceiro
- valor
- vencimento
- obra

Regra de sugestao de tipo:

- se a solicitacao for de compra ou estiver no fluxo de compras, a sugestao tende a ser `PAGAR`
- nos demais casos, a sugestao tende a ser `RECEBER`

### 5.2 O que o usuario confirma

No modal, o usuario revisa:

- tipo `PAGAR` ou `RECEBER`
- valor
- vencimento
- parceiro

O parceiro pode ser trocado nessa etapa por busca rapida, sem sair da tela.

### 5.3 Resultado

Depois da confirmacao:

- o titulo financeiro e criado
- ele fica vinculado a solicitacao de origem
- ele passa a aparecer no card financeiro da solicitacao
- ele tambem passa a aparecer em `Financeiro > Titulos Financeiros`

Importante:

- a criacao do titulo e manual
- a solicitacao nao vira titulo automaticamente

---

## 6. Etapa 3 - Gestao do titulo financeiro

Tela:

- `Financeiro > Titulos Financeiros`

Essa tela permite:

- listar titulos
- filtrar por tipo
- filtrar por status
- filtrar por obra
- abrir o detalhe do titulo

Campos mais relevantes da listagem:

- tipo
- descricao do titulo
- status
- parceiro
- obra
- solicitacao de origem
- vencimento
- valor original
- saldo

### 6.1 Status operacionais do titulo

Os principais status hoje sao:

- `ABERTO`
- `PARCIAL`
- `QUITADO`
- `CANCELADO`
- `ESTORNADO`

Na operacao normal da V1, os mais usados sao:

- `ABERTO`
- `PARCIAL`
- `QUITADO`

---

## 7. Etapa 4 - Registro da baixa financeira

Tela:

- `Financeiro > Titulos Financeiros > Detalhe do titulo`

Botao:

- `Registrar baixa`

### 7.1 O que e a baixa

A baixa representa o pagamento ou recebimento efetivo do titulo.

Sem baixa:

- o titulo continua em aberto
- nao existe movimento financeiro para conciliacao

Com baixa:

- o sistema cria um movimento financeiro
- o saldo do titulo e recalculado
- o status muda para `PARCIAL` ou `QUITADO`

### 7.2 Campos da baixa

No modal de baixa, o usuario informa:

- conta bancaria
- data do movimento
- valor base
- juros
- desconto
- observacoes

### 7.3 Regras

- a baixa pode ser parcial
- a baixa pode ser total
- o valor da baixa nao pode ser maior que o saldo do titulo
- o backend recalcula o status do titulo

### 7.4 Escolha da conta bancaria

Este ponto e critico:

- a conta bancaria escolhida na baixa deve ser a conta real onde o dinheiro entrou ou saiu
- a mesma conta deve ser usada depois na importacao do OFX

Se a baixa for registrada em uma conta diferente da conta do extrato:

- a sugestao de conciliacao nao vai encaixar corretamente

---

## 8. Etapa 5 - Estorno de baixa

Tela:

- `Financeiro > Titulos Financeiros > Detalhe do titulo`

Botao:

- `Estornar`

O estorno existe para corrigir baixa registrada indevidamente.

Quando o usuario estorna:

- o movimento financeiro muda para `ESTORNADO`
- o valor baixado do titulo e recalculado
- o saldo volta
- o status do titulo pode voltar para `ABERTO` ou `PARCIAL`

Importante:

- o estorno nao apaga historico
- a trilha continua registrada na auditoria do titulo

---

## 9. Etapa 6 - Relatorios e visao de caixa

Telas:

- `Financeiro > Relatorios Financeiros`
- `Dashboard`

### 9.1 Relatorio de fluxo de caixa

A tela de relatorios financeiros mostra:

- entradas previstas
- saidas previstas
- saldo projetado
- entradas realizadas
- saidas realizadas
- saldo realizado
- variacao entre realizado e previsto

Filtros disponiveis:

- periodo predefinido
- periodo personalizado
- obra

Essa visao usa:

- titulos em aberto e parcial para o previsto
- movimentos ativos para o realizado

### 9.2 Dashboard

O dashboard consolidado mostra:

- contas a pagar em aberto
- contas a receber em aberto
- vencidos
- movimentacao do mes
- custo por obra
- posicao por parceiro
- conciliacao pendente

---

## 10. Etapa 7 - Importacao do OFX

Tela:

- `Financeiro > Conciliacao OFX`

### 10.1 O que o OFX faz na V1

O OFX nao cria titulos e nao cria baixas.

Ele serve para:

- trazer os lancamentos do banco
- gerar pendencias de conciliacao
- permitir conferencia manual contra os movimentos financeiros ja registrados

### 10.2 Como importar

Na tela de conciliacao:

1. selecionar a conta bancaria
2. escolher o arquivo OFX
3. clicar em `Importar OFX`

### 10.3 Regra da conta bancaria

O OFX deve ser importado na mesma conta bancaria correspondente ao extrato.

Exemplo:

- OFX do Bradesco deve ser importado na conta Bradesco cadastrada no sistema
- OFX do Banco do Brasil deve ser importado na conta Banco do Brasil cadastrada no sistema

### 10.4 Protecao contra duplicidade

O backend protege contra duplicidade em dois niveis:

- por lancamento individual
- por remessa ou arquivo importado

Se o mesmo arquivo ou a mesma remessa forem enviados novamente para a mesma conta:

- o sistema bloqueia a importacao

### 10.5 Historico de importacoes

A tela de conciliacao mostra:

- historico das ultimas importacoes OFX
- conta bancaria usada
- usuario que importou
- data e hora
- quantidade lida
- quantidade importada
- quantidade ignorada

Isso ajuda a evitar reprocessamento e facilita auditoria.

---

## 11. Etapa 8 - Pendencia de conciliacao

Depois que o OFX e importado:

- cada lancamento vira uma pendencia de conciliacao

Cada pendencia mostra:

- conta bancaria
- data do movimento
- documento
- descricao do banco
- valor
- status

Status principais:

- `PENDENTE`
- `CONCILIADO`
- `IGNORADO`

---

## 12. Etapa 9 - Sugestao de match

Na pendencia de conciliacao, o sistema tenta sugerir o match com movimentos financeiros ativos.

Criticos para a sugestao:

- mesma conta bancaria
- valor absoluto exatamente igual, considerando os centavos
- mesma data do lancamento bancario

Documento e parceiro identificado no texto servem apenas para ordenar ou desempatar candidatos que
ja atendam aos requisitos exatos de valor e data. Um movimento com valor ou data divergente nao e
exibido como opcao de match automatico.

Importante:

- a conciliacao compara o OFX com movimentos financeiros
- por isso, o normal e registrar a baixa antes da conciliacao

Se o OFX for importado antes da baixa:

- o lancamento pode ficar pendente
- depois que a baixa for registrada, a sugestao passa a ficar disponivel

### 12.1 O que aparece na tela

Na tela de conciliacao, cada pendencia pode mostrar:

- sugestoes de match ranqueadas por score
- selo `Pronto para lote` quando existe uma sugestao segura para conciliacao em lote
- selo `Associacao manual recomendada` quando existe ambiguidade relevante

Importante:

- o sistema nao concilia automaticamente no momento da importacao
- ele apenas calcula e apresenta sugestoes

---

## 13. Etapa 10 - Confirmacao manual da conciliacao

Tela:

- `Financeiro > Conciliacao OFX`

Acao:

- `Confirmar match`

Quando o usuario confirma:

- o lancamento bancario fica vinculado ao movimento financeiro
- o titulo vinculado ao movimento tambem fica associado
- a pendencia muda para `CONCILIADO`
- fica registrado quem confirmou e quando confirmou

Antes de confirmar, o backend valida novamente valor e data. Assim, uma sugestao antiga carregada na
tela ou uma chamada direta nao consegue conciliar movimentos divergentes. Na associacao de varios
movimentos, todos devem possuir a mesma data do extrato e a soma deve fechar exatamente o valor
bancario em centavos.

Essa confirmacao e manual de proposito, para manter simplicidade e controle.

O sistema nao faz conciliacao automatica total na V1.

### 13.1 Conciliacao em lote por sugestao

Quando o filtro atual possui lancamentos com sugestao segura, a tela libera o botao:

- `Conciliar sugeridos do filtro`

Esse botao:

- analisa apenas pendencias do filtro atual
- concilia somente os casos com valor e data exatamente correspondentes
- nao força conciliacao em casos ambiguos
- deixa para conferencia manual os casos sem sugestao ou com mais de uma opcao forte

Resultado esperado:

- parte dos lancamentos vai para `CONCILIADO`
- os demais continuam pendentes para revisao individual

---

## 14. Etapa 11 - Ignorar pendencia

Se um lancamento bancario nao tiver relacao com o financeiro operado no FLUXY, o usuario pode usar:

- `Marcar como ignorado`

Casos comuns:

- movimentacao bancaria fora do escopo operacional controlado no sistema
- tarifa, ajuste ou evento que nao precisa ser conciliado com titulo

Resultado:

- a pendencia muda para `IGNORADO`
- continua rastreavel
- nao some da trilha historica

### 14.1 Associacao manual com chave

Nos casos em que existem dois ou mais movimentos com mesmo valor e mesma data, a tela destaca o lancamento com a acao de chave:

- `Associar manualmente`

Ao abrir:

- o usuario ve os candidatos do sistema para aquela conta bancaria
- pode filtrar por periodo
- pode filtrar por documento ou numero do documento
- pode ajustar a faixa de valor
- pode clicar em `Associar` no movimento correto

Esse fluxo existe para evitar conciliacao errada em casos de valores repetidos.

---

## 15. Auditoria e rastreabilidade

O detalhe do titulo financeiro mostra a trilha operacional do backend.

Eventos auditados mais importantes:

- criacao do titulo
- baixa registrada
- baixa estornada

Cada evento mostra:

- acao
- status
- usuario
- data e hora
- dados relevantes da operacao

Na conciliacao OFX tambem existe trilha de:

- importacao de arquivo
- confirmacao de conciliacao
- marcacao como ignorado

---

## 16. Regras operacionais importantes

### 16.1 O backend e a autoridade

O sistema nao confia no frontend para:

- valor financeiro final
- permissao
- escopo de obra
- tipo da operacao
- validacoes criticas

### 16.2 O titulo e unico

Mesmo quando a solicitacao de compra tem varios itens e multiplas apropriacoes:

- o titulo financeiro continua unico

As apropriacoes por item servem para:

- custo por obra
- dashboards
- relatorios

Nao servem para quebrar o titulo em varios pedacos financeiros.

### 16.3 O OFX nao substitui a baixa

Na V1:

- primeiro registra a baixa
- depois usa o OFX para conciliar

O OFX e uma camada de conferencia, nao de geracao automatica de movimento.

---

## 17. Fluxos operacionais recomendados

### 17.1 Fluxo de contas a pagar

1. Criar a solicitacao.
2. Vincular parceiro e apropriacao.
3. Gerar conta do tipo `PAGAR`.
4. Acompanhar o titulo ate o vencimento.
5. Quando pagar, registrar a baixa na conta bancaria correta.
6. Importar o OFX da mesma conta.
7. Confirmar o match sugerido.

### 17.2 Fluxo de contas a receber

1. Criar a solicitacao.
2. Vincular parceiro e apropriacao.
3. Gerar conta do tipo `RECEBER`.
4. Acompanhar o titulo ate o recebimento.
5. Quando receber, registrar a baixa na conta bancaria correta.
6. Importar o OFX da mesma conta.
7. Confirmar o match sugerido.

---

## 18. Boas praticas para operacao

- sempre vincular parceiro na solicitacao antes de gerar a conta
- sempre usar a apropriacao correta na abertura da solicitacao
- sempre registrar a baixa na conta bancaria real do pagamento ou recebimento
- nao importar OFX em conta bancaria errada
- revisar pendencias de conciliacao diariamente ou por fechamento de periodo
- usar o relatorio de fluxo de caixa para acompanhar previsto x realizado
- usar o dashboard para acompanhar vencidos e conciliacao pendente

---

## 19. Erros operacionais mais comuns

### Problema
Titulo nao aparece na conciliacao

Causa comum:

- a baixa ainda nao foi registrada

### Problema
Nao aparece sugestao de match

Causa comum:

- conta bancaria da baixa diferente da conta do OFX
- valor diferente
- data muito distante
- documento sem correspondencia
- ainda nao existe movimento financeiro ativo compativel no sistema

### Problema
O sistema nao conciliou em lote

Causa comum:

- nao havia sugestao segura
- havia mais de um movimento forte para o mesmo valor e data
- o caso foi mantido para associacao manual por seguranca

### Problema
Arquivo OFX nao importa de novo

Causa comum:

- a mesma remessa ja foi importada antes e o bloqueio de duplicidade foi acionado

### Problema
Conciliacao ficou errada

Causa comum:

- baixa registrada na conta errada
- match confirmado no movimento incorreto

Nesses casos, o correto e revisar a baixa, estornar se necessario e refazer a operacao.

---

## 20. Conclusao

O fluxo financeiro do FLUXY foi desenhado para manter simplicidade operacional:

- a solicitacao origina o processo
- o titulo organiza o compromisso financeiro
- a baixa registra o fato financeiro
- o OFX valida o que passou no banco

Essa estrutura permite controle financeiro com baixo atrito, sem transformar o sistema em um ERP complexo.
