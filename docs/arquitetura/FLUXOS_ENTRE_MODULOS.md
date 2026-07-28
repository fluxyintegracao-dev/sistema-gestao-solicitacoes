# Fluxos Entre Modulos

## Solicitacao para compras

1. Solicitacao valida obra, setor, tipo e permissao.
2. Fluxo de compra cria ou vincula a solicitacao de compra uma unica vez.
3. Itens recebem apropriacoes analiticas validas da mesma obra; a soma das quantidades apropriadas deve fechar a quantidade do item.
4. Compras passa a ser dona dos itens; a solicitacao original continua como origem auditavel.

Validar: idempotencia, status de origem, permissao, historico e notificacao.

## Compras para cotacao e pedido

1. Compra normal nasce liberada diretamente para Compras e fica apta a cotar sem aprovacao de diretoria ou etapa externa adicional.
2. Cada fornecedor recebe token individual e somente os itens marcados para ele.
3. O backend valida que os itens pertencem a mesma compra; rascunhos e respostas permanecem associados ao fornecedor e suas substituicoes preservam historico.
4. Comparativo considera respostas validas e cada rodada seleciona vencedor/quantidade por item.
5. Fechamento parcial acrescenta pedidos e alocacoes e preserva saldo; fechamento final consome o restante e finaliza as cotacoes nao canceladas.
6. A chave de idempotencia da rodada impede duplicidade sem bloquear rodadas posteriores legitimas.
7. Alteracoes posteriores em pedidos sao auditadas e respeitam bloqueios de status e efeitos financeiros/fiscais.

Validar: destino inicial, compatibilidade legada, escopo de itens por fornecedor, pertencimento do item, prazo, token, rascunho, minimo, vencedor, saldo, fechamento parcial/final, apropriacao, bloqueio de edicao, cancelamento e duplicidade.

## Origem operacional para financeiro

Solicitacoes, compras, comercial e RH/DP podem originar obrigacoes, mas Financeiro e sempre dono do titulo e da baixa. A origem deve enviar referencia idempotente; nao pode gravar movimento financeiro diretamente.

Validar: tipo PAGAR/RECEBER, parceiro, empresa, obra, categoria, vencimento, valor, chave de origem e permissao.

## Financeiro para obras e relatorios

Titulos em aberto representam previsto. Movimentos ativos representam realizado. Estornos deixam de compor o realizado sem apagar a trilha. Resultado de obras, DRE e fluxo de caixa devem usar a mesma regra financeira.

## Comercial para financeiro

Contrato de venda cria agenda de recebimentos. Cada parcela pode originar um titulo a receber com referencia unica. Alterar contrato nao pode duplicar parcelas ou recriar titulos ja movimentados.

## RH/DP para financeiro e referencias do SST

Apuracoes homologadas podem gerar obrigacoes financeiras. O SST pode referenciar o cadastro do colaborador, empresa e obra por IDs internos, sem sincronizacao automatica. Correcao de apuracao deve preservar a versao anterior e tratar titulos ja gerados de forma explicita.

## SST documental

O SST registra PCMSO, PGR, exames, ASO, entregas de EPI, treinamentos ocupacionais, LTCAT, avaliacoes quantitativas e anexos. Renovacoes preservam versoes anteriores. O modulo nao transmite dados para sistemas governamentais nem executa automacoes em RH/DP ou Obras.

## Fiscal com compras e financeiro

Documento fiscal pode ser vinculado a pedido, parceiro e titulo, mas nao cria vinculos por inferencia silenciosa. Sugestoes de matching exigem validacao humana quando houver ambiguidade.
