# Implantacao do Financeiro Limpo com SIENGE

## Contexto

Esta versao passa a operar o Financeiro do Fluxy a partir de uma base limpa. A producao atual segue usando principalmente Solicitacoes, Contratos vinculados, uploads/vinculos de arquivos em massa e Comunicacao Interna. Portanto, a entrada do Financeiro deve ser planejada como corte operacional, sem tentar migrar movimentos antigos desnecessarios.

O caminho recomendado e importar primeiro os cadastros e os titulos em aberto do SIENGE:

- Credores e fornecedores.
- Clientes.
- Contas a pagar em aberto.
- Contas a receber em aberto.

Depois da carga inicial, o Fluxy passa a ser o sistema operacional principal para os novos titulos, baixas, DRE, fluxo de caixa, relatorios por empresa, obra e centro de custo.

## Decisao de arquitetura

A primeira entrega usa importacao CSV controlada na tela de Integracao SIENGE. A API automatica do SIENGE deve vir depois, quando os cadastros do Fluxy ja estiverem saneados e quando estiver claro quais endpoints/licencas estao liberados para leitura de titulos, credores e clientes.

Essa abordagem evita:

- Criar titulos duplicados.
- Misturar historico antigo com operacao nova.
- Alimentar DRE sem empresa, obra ou centro de custo.
- Depender de detalhes da API antes de validar o processo real com a equipe financeira.

## Ordem operacional recomendada

1. Cadastrar a Holding em Empresas do Grupo.
2. Cadastrar cada empresa operacional em Empresas do Grupo e vincular sua Holding controladora.
3. Cadastrar ou revisar Obras/Centros de Custo.
4. Vincular cada Obra/Centro de Custo a uma empresa operacional.
5. Cadastrar categorias financeiras e preencher classificacao DRE.
6. Exportar do SIENGE os titulos em aberto de contas a pagar e contas a receber.
7. Exportar do SIENGE os credores, fornecedores e clientes, ou garantir que o arquivo de titulos traga CPF/CNPJ e nome do parceiro.
8. Baixar o modelo CSV em Integracao SIENGE > Carga inicial financeira.
9. Montar a planilha com os campos do modelo.
10. Importar o CSV no Fluxy.
11. Corrigir os erros retornados pelo relatorio da importacao.
12. Reimportar o mesmo CSV corrigido. O sistema atualiza registros ja reconhecidos por identificador externo ou documento composto.
13. Conferir DRE, fluxo de caixa, contas a pagar e contas a receber.
14. Definir a data de corte: a partir dela, novos titulos devem nascer no Fluxy.

## Campos importantes do CSV

Campos obrigatorios:

- `tipo`: `PAGAR` ou `RECEBER`.
- `cpf_cnpj`: CPF/CNPJ valido do credor, fornecedor ou cliente.
- `nome`: nome ou razao social do parceiro.
- `valor`: valor aberto do titulo.
- `data_vencimento`: vencimento do titulo.
- `obra_id` ou `obra_codigo`: obra/centro de custo do titulo.

Campos recomendados:

- `identificador_externo`: id do titulo no SIENGE. E o melhor campo para evitar duplicidade.
- `external_creditor_id`: id do credor/cliente no SIENGE.
- `numero_documento`: numero de nota, documento ou parcela.
- `data_emissao`.
- `competencia_data`: competencia economica da DRE. Obrigatoria quando `considera_dre = sim`.
- `categoria_id` ou `categoria_nome`: obrigatoria quando `considera_dre = sim`; a categoria precisa estar marcada para DRE e possuir grupo DRE classificado.
- `intercompany`: `sim` quando a contraparte for outra empresa do grupo.
- `empresa_contraparte_id` ou `empresa_contraparte_codigo`: obrigatorio quando `intercompany = sim`.
- `considera_dre`: por padrao `sim`.

## Regras de consistencia

- Todo titulo precisa de obra/centro de custo.
- A obra/centro de custo precisa estar vinculada a uma empresa operacional.
- A empresa operacional precisa estar vinculada a Holding quando fizer parte do grupo.
- Titulo intercompany deve informar a contraparte para permitir consolidacao correta.
- Categorias financeiras devem ser classificadas em grupo/subgrupo DRE para que o relatorio executivo fique util.
- Titulo considerado na DRE precisa trazer competencia real no CSV; o sistema nao usa emissao nem vencimento como substituto automatico.
- Titulo considerado na DRE precisa trazer categoria financeira compativel com PAGAR/RECEBER, marcada para DRE e com grupo DRE preenchido.
- Titulos importados ficam com origem `SIENGE_IMPORT`.
- O sistema grava mapeamento SIENGE de parceiros e titulos quando os ids externos forem informados.

## Como definir Holding e empresas

Em Empresas do Grupo:

- Cadastre a Holding com `tipo_empresa = HOLDING`.
- Cadastre cada empresa operacional com `tipo_empresa = OPERACIONAL`.
- Em cada operacional, informe `holding_id` apontando para a Holding.

Exemplo:

- Holding: `CSC HOLDING`.
- Operacional: `CONSTRUTORA SUL CAPIXABA LTDA`, holding `CSC HOLDING`.
- Operacional: `CONSTRUTORA TALISMA LTDA`, holding `CSC HOLDING`.

## Como operar para manter relatorios confiaveis

- Sempre vincular titulos a uma obra/centro de custo.
- Evitar lancar titulo direto em "Administrativo" quando houver centro de custo mais preciso.
- Usar categorias financeiras padronizadas e classificadas na DRE.
- Conferir se contas a pagar e receber intercompany estao marcadas como intercompany.
- Nao baixar no Fluxy titulo que continua sendo baixado no SIENGE depois da data de corte.
- Definir claramente a data de corte com a equipe financeira.
- Usar o SIENGE como fonte de carga inicial, nao como sistema paralelo permanente para os mesmos titulos.

## Proxima evolucao

Depois da primeira carga real, a proxima fase deve avaliar API SIENGE para:

- Sincronizar credores/clientes.
- Consultar titulos abertos periodicamente.
- Comparar saldo SIENGE x Fluxy durante a transicao.
- Bloquear duplicidade por id externo.
- Gerar painel de divergencias da integracao.
