# Regras de Negocio - Parceiros

## Entidade Mestre

- cliente e fornecedor vivem na mesma entidade `parceiros`
- flags definem se o registro atua como cliente, fornecedor ou ambos

## Campos Obrigatorios

- CPF/CNPJ
- nome
- telefone

## Categorias de Parceiro

- parceiro pode receber categorias para classificacao operacional
- categorias sao usadas, entre outros pontos, na selecao de fornecedores para cotacao

## Uso na Solicitacao

- busca por nome ou CPF/CNPJ
- se nao existir, cadastro rapido no modal
- apos salvar, o parceiro ja pode ser vinculado a solicitacao

## Uso em Compras

- cotacao pode selecionar parceiros marcados como fornecedor
- telefone do parceiro pode alimentar o atalho de WhatsApp para envio da cotacao
- compra direta exige um parceiro ativo marcado como fornecedor para atuar como credor
- o fluxo de compra direta permite busca/autocomplete e cadastro rapido do credor
- cadastro rapido da compra direta exige nome, CPF/CNPJ e telefone, aceita email e cria o registro como fornecedor ativo
- criar o credor por Compras nao transfere a propriedade do cadastro: Parceiros continua como fonte unica e validacoes de duplicidade continuam centralizadas
