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
