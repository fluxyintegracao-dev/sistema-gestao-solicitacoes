# Modulo - Financeiro

## Objetivo

Controlar contas a pagar e a receber de forma simples, auditavel e integrada ao fluxo operacional.

## O que o modulo entrega hoje

- geracao de titulo a partir da solicitacao
- criacao manual de conta sem solicitacao
- contas a pagar e a receber em titulo unico
- camada intermediaria para cobranca externa em contas a receber, com dados do boleto gerado no banco
- categorias financeiras por tipo
- baixa parcial ou total
- estorno de baixa
- correcao de conta bancaria, data, juros, multa e desconto
- historico e auditoria por titulo
- relatorios financeiros
- fluxo de caixa previsto x realizado
- conciliacao OFX

## Fontes de Dados do Relatorio

- previsto
  Titulos `ABERTO` e `PARCIAL`, usando saldo e vencimento.

- realizado
  Movimentos financeiros ativos, usando valor quitado e data do movimento.

## Telas Principais

- titulos financeiros
- nova conta manual
- detalhe do titulo
- cadastros financeiros
- relatorios financeiros
- resultado de obras
- conciliacao OFX

## Evolucoes Planejadas

### Consulta de titulos baixados e correcao de baixa

Criar uma tela dedicada para consultar titulos baixados e seus movimentos financeiros.

Objetivo operacional:

- localizar baixas realizadas por periodo, tipo, parceiro, obra, categoria, conta bancaria, valor e usuario
- visualizar o titulo, a baixa, juros, multa, desconto, conta utilizada e data do movimento
- permitir a acao de excluir baixa na interface, implementada internamente como estorno auditavel do movimento
- permitir que o titulo volte a ficar disponivel para nova baixa quando ainda houver saldo
- permitir nova baixa em outra conta bancaria ou com valores corrigidos de juros, multa e desconto

Regras esperadas:

- nenhuma baixa deve ser apagada fisicamente do banco
- o movimento original deve ser marcado como `ESTORNADO`
- o sistema deve recalcular `valor_baixado`, `valor_saldo`, `data_quitacao` e `status` do titulo
- relatorios devem considerar somente movimentos ativos no realizado
- fluxo de caixa, resultado de obras, relatorios financeiros e conciliacao devem refletir o estorno
- toda correcao de baixa deve gerar auditoria com usuario, data/hora, IP, user agent, valores anteriores e justificativa quando aplicavel

### Limpeza de filtros entre abas Pagar e Receber

Na tela de titulos financeiros, ao alternar entre as abas `PAGAR` e `RECEBER`, o sistema deve limpar os filtros/lista da aba anterior.

Objetivo:

- evitar que filtros de contas a receber contaminem a consulta de contas a pagar, e vice-versa
- reduzir risco de o usuario interpretar uma lista filtrada como se fosse resultado da outra aba
- manter a navegacao mais previsivel para financeiro e auditoria

### Relatorios analiticos financeiros

Adicionar uma pagina dedicada dentro de Relatorios Financeiros para relatorios analiticos.

Funcionalidades planejadas:

- filtros por periodo, tipo, status, parceiro, obra, categoria, conta bancaria e centro/apropriacao quando disponivel
- colunas configuraveis pelo usuario
- reordenacao de colunas por arrastar e soltar para esquerda ou direita
- persistencia da preferencia de colunas por usuario
- exportacao respeitando ordem e visibilidade das colunas selecionadas
- separacao clara entre campos de titulo, movimento, baixa, conciliacao e pagamento bancario

Colunas iniciais sugeridas:

- tipo
- status do titulo
- codigo do titulo
- parceiro
- CPF/CNPJ
- obra
- categoria
- numero do documento
- data de emissao
- data de vencimento
- data do movimento
- conta bancaria
- valor original
- valor saldo
- valor baixado
- juros
- multa
- desconto
- valor quitacao
- usuario da baixa
- status do movimento
- origem

## Regras-Chave

- categoria financeira exibida conforme o tipo do titulo
- OFX nao cria titulo e nao baixa automaticamente
- quando a venda nasce no modulo comercial, o titulo financeiro ja existe antes da emissao do boleto no banco
- os dados do boleto devem complementar o titulo existente, e nao criar um novo titulo paralelo
- a cobranca externa pode registrar forma, status, banco, nosso numero, linha digitavel, codigo de barras e identificador externo
- backend valida valor, parceiro, obra, vencimento e escopo
- contratos e recebiveis de futuros modulos, como o comercial, devem usar o financeiro como motor central de titulos e movimentos
- integracoes bancarias especificas, como boleto, devem ficar desacopladas da regra central de titulos quando dependerem de homologacao externa
