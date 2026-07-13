# Arquitetura - Banco de Dados

## Modelo Geral

- uma base institucional para o ambiente, com suporte a multiempresa
- MySQL como banco principal
- migrations registradas em `schema_migrations`
- ajustes legados idempotentes ainda executados no bootstrap do backend

## Dominios Principais

### Identidade e acesso

- `users`
- `setores`
- `usuario_obra`
- `setor_permissoes`
- `security_event_logs`

### Solicitacoes

- `solicitacoes`
- `historicos`
- `anexos`
- `comprovantes`
- `status_areas`

### Parceiros

- `parceiros`
- `parceiro_categorias`
- `parceiro_categoria_itens`

### Compras

- `solicitacao_compras`
- `solicitacao_compra_itens`
- `solicitacao_compra_itens_manuais`
- `solicitacao_compra_item_apropriacoes`
- `solicitacao_compra_item_manual_apropriacoes`
- `solicitacao_compra_fornecedores`
- `solicitacao_compra_fornecedor_itens`
- `solicitacao_compra_resposta_itens`
- `solicitacao_compra_alocacoes`
- `solicitacao_compra_logs`
- `pedidos_compra`
- `pedido_compra_itens`
- `pedido_compra_item_logs`
- `pedido_compra_fretes`
- `pedido_compra_frete_rateios`

### Obras e apropriacoes

- `obras`
- `apropriacoes`
- `unidades`
- `categorias`
- `insumos`

### Financeiro

- `contas_bancarias`
- `categorias_financeiras`
- `titulos_financeiros`
- `movimentos_financeiros`
- `conciliacoes_bancarias`
- `conciliacao_bancaria_importacoes`

## Regras Estruturais Importantes

- titulo financeiro continua unico, mesmo quando a compra tem rateio multiplo por item
- movimentos financeiros guardam juros, multa e desconto
- importacoes OFX guardam historico e hash/remessa para bloquear duplicidade
- parceiros sao a entidade mestre para cliente e fornecedor
