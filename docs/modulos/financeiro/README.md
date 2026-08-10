# Modulo FINANCEIRO

## Papel e propriedade

Financeiro e dono de titulos a pagar/receber, parcelas financeiras, movimentos, baixas, estornos, contas bancarias, categorias, conciliacao e calculos de previsto/realizado. Modulos de origem nao podem criar movimentos diretamente.

## Titulos

- tipo obrigatorio `PAGAR` ou `RECEBER`;
- origem pode ser solicitacao, compra, comercial, RH/DP ou lancamento manual;
- parceiro, empresa, categoria, vencimento e valor devem ser consistentes;
- referencia de origem deve impedir titulo duplicado;
- status e saldo derivam dos movimentos ativos;
- edicao de titulo movimentado possui restricoes e auditoria.

## Importacao em massa de contas a pagar

A importacao em massa esta implementada no repositorio e depende da migration `202607200001_financeiro_titulos_importacao.js` no ambiente de destino. O fluxo e exclusivo para `PAGAR`: o usuario exporta o modelo versionado em Contas a Pagar, envia o `.xlsx`, revisa o preview persistido e confirma a criacao atomica.

- permissao especifica `financeiro.titulos.importar`;
- `empresa_codigo` + `obra_codigo` identificam a obra pela referencia operacional conhecida pelo usuario; `apropriacao_codigo`, quando informado, identifica a apropriacao dentro dessa obra; o backend resolve os IDs internos e deriva da obra a empresa e a DRE do titulo;
- `credor_cpf_cnpj` identifica o parceiro pelo documento visivel na tela, com ou sem mascara, e `categoria_nome` usa o nome exibido no cadastro;
- o modelo de importacao nao expoe IDs internos de obra, credor, categoria ou apropriacao e bloqueia referencias inexistentes, ambiguas, inativas ou fora do escopo;
- o credor e global e pode representar colaborador cadastrado em outra empresa;
- em Contas a Pagar, o filtro de credor pesquisa todos os parceiros ativos do cadastro central, incluindo credores e fornecedores de Compras ja vinculados; a lupa abre a listagem completa com busca por nome ou CPF/CNPJ e rolagem responsiva;
- o modelo `1.4` separa as referencias em `EMPRESAS`, `OBRAS`, `APROPRIACOES`, `CREDORES`, `CATEGORIAS`, `FORMAS_PAGAMENTO` e `DOMINIOS`, todas com filtro e pesquisa do Excel; `CREDORES` informa se o favorecido bancario/PIX esta pronto;
- as listas suspensas usam essas abas, mas a planilha representa um retrato dos cadastros no momento da exportacao; para incluir referencias criadas depois, o usuario deve exportar um novo modelo;
- referencias sao revalidadas no preview e na confirmacao;
- parcelas, rateios e impostos usam abas relacionadas por `chave_importacao`;
- formulas, macros, linhas ocultas e colunas ocultas com dados sao rejeitadas;
- confirmacao exige `Idempotency-Key`, bloqueio transacional e rollback integral em erro;
- titulos recebem origem `IMPORTACAO` e nao criam baixas, movimentos, intents, faturas ou vinculos operacionais.

Detalhes tecnicos e cenarios de aceite estao em [`PLANO_IMPORTACAO_TITULOS_PAGAR.md`](./PLANO_IMPORTACAO_TITULOS_PAGAR.md).

## Baixa e estorno

- baixa pode ser parcial ou total;
- a baixa em massa lista somente formas ativas de `financeiro_formas_pagamento` e grava
  `forma_pagamento_id` no movimento, preservando `forma_recebimento` como classificacao
  tecnica retrocompativel;
- o tipo cadastrado dirige as regras existentes: `CARTAO_CREDITO` e `CARTAO_DEBITO`
  executam a regra `CARTAO`; formas como `FOPAG` podem permanecer distintas no cadastro
  e executar a regra `TRANSFERENCIA`;
- movimentos legados sem `forma_pagamento_id` continuam validos e as APIs antigas ainda
  podem enviar apenas a classificacao tecnica aceita;
- exige conta, data, valor base e ajustes de juros, multa ou desconto;
- transacao bloqueia pagamento acima do saldo;
- estorno marca o movimento como `ESTORNADO` e recalcula o titulo;
- estorno nunca remove a trilha;
- nova baixa depois do estorno e uma nova operacao auditada;
- comprovantes e conciliacoes vinculados precisam ser revistos.

## Cheques de terceiros e baixa com multiplas fontes

Cheques recebidos de terceiros sao controlados em carteira de custodia, sem simular uma conta bancaria. O financeiro pode registrar/importar saldo legado, transferir a custodia entre empresas, depositar em conta da mesma empresa ou utilizar o cheque integralmente como um componente de uma baixa composta.

A baixa composta permite combinar Pix, transferencia, dinheiro, cartao e cheque conforme as formas ativas cadastradas, distribuindo cada fonte entre titulos `PAGAR` do mesmo credor e empresa. Preview, confirmacao e estorno sao atomicos, idempotentes e auditados. A baixa simples e a baixa em massa anteriores continuam disponiveis.

Regras, endpoints, permissoes e limites: [`CARTEIRA_CHEQUES_BAIXA_COMPOSTA.md`](./CARTEIRA_CHEQUES_BAIXA_COMPOSTA.md). Matriz operacional: [`MATRIZ_SMOKE_CHEQUES_BAIXA_COMPOSTA.md`](./MATRIZ_SMOKE_CHEQUES_BAIXA_COMPOSTA.md).

## Relatorios

- previsto: titulos abertos ou parciais;
- realizado: movimentos ativos;
- movimentos estornados nao compoem realizado;
- DRE por competencia e fluxo de caixa por movimento nao podem usar a mesma data sem regra explicita;
- Resultado de Obras deve refletir estorno imediatamente;
- toda agregacao deve permitir rastrear o lancamento de origem.

## Conciliacao OFX

OFX serve para conferencia. Importacao bloqueia arquivo/transacao duplicada, sugere candidatos e exige confirmacao humana. Nao cria titulo nem baixa automaticamente.

## Dependencias e risco

Recebe dimensoes de Parceiros, Empresas, Obras e Apropriacoes; recebe origens de Solicitacoes, Compras, Comercial e RH/DP; alimenta Obras, Provisionamento, Boletos, relatorios e Governanca. Qualquer mudanca em saldo, status ou movimento exige reconciliacao de todos esses consumidores.

## Idempotencia

Geracao de titulo, baixa, estorno, importacao OFX e conciliacao sao transacionais e protegidos contra repeticao. O frontend bloqueia duplo clique e o backend garante unicidade e estado valido.
