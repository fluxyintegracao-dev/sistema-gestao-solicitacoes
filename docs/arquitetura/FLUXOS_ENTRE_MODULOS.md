# Fluxos Entre Modulos

## Solicitacao para compras

1. Solicitacao valida obra, setor, tipo e permissao.
2. Fluxo de compra cria ou vincula a solicitacao de compra uma unica vez.
3. Itens recebem apropriacoes validas cuja soma deve fechar 100%.
4. Compras passa a ser dona dos itens; a solicitacao original continua como origem auditavel.

Validar: idempotencia, status de origem, permissao, historico e notificacao.

## Compras para cotacao e pedido

1. Compra e liberada para cotacao.
2. Fornecedores recebem tokens individuais.
3. Respostas sao imutavelmente associadas ao fornecedor e a cotacao.
4. Encerramento seleciona vencedor por item.
5. Pedidos sao gerados uma unica vez e alteracoes posteriores sao auditadas.

Validar: prazo, token, minimo, vencedor, total, apropriacao, bloqueio de edicao e duplicidade.

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
