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
- `empresa_codigo` + `obra_codigo` identificam a obra pela referencia operacional conhecida pelo usuario; o backend resolve o ID interno e deriva da obra a empresa, a DRE e a apropriacao principal do titulo;
- o credor e global e pode representar colaborador cadastrado em outra empresa;
- a aba de referencias informa se o credor possui favorecido bancario/PIX pronto; a ausencia gera aviso no preview, sem impedir o titulo, mas bloqueia seu uso em lote bancario ate a regularizacao;
- referencias sao revalidadas no preview e na confirmacao;
- parcelas, rateios e impostos usam abas relacionadas por `chave_importacao`;
- formulas, macros, linhas ocultas e colunas ocultas com dados sao rejeitadas;
- confirmacao exige `Idempotency-Key`, bloqueio transacional e rollback integral em erro;
- titulos recebem origem `IMPORTACAO` e nao criam baixas, movimentos, intents, faturas ou vinculos operacionais.

Detalhes tecnicos e cenarios de aceite estao em [`PLANO_IMPORTACAO_TITULOS_PAGAR.md`](./PLANO_IMPORTACAO_TITULOS_PAGAR.md).

## Baixa e estorno

- baixa pode ser parcial ou total;
- exige conta, data, valor base e ajustes de juros, multa ou desconto;
- transacao bloqueia pagamento acima do saldo;
- estorno marca o movimento como `ESTORNADO` e recalcula o titulo;
- estorno nunca remove a trilha;
- nova baixa depois do estorno e uma nova operacao auditada;
- comprovantes e conciliacoes vinculados precisam ser revistos.

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
