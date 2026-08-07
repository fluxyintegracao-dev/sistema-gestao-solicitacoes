# Carteira de cheques de terceiros e baixa com multiplas fontes

## Objetivo

Registrar cheques recebidos de terceiros como ativos sob custodia e permitir que um ou mais titulos a pagar do mesmo credor sejam quitados por uma composicao de operacoes financeiras, por exemplo Pix mais um ou mais cheques.

Cheque em carteira nao e conta bancaria e nao cria saldo financeiro ficticio. A conta bancaria somente e informada quando o cheque e depositado. Quando o cheque e entregue diretamente ao credor, ele e consumido como uma fonte da baixa composta.

## Regras de negocio

### Custodia do cheque

- todo cheque pertence a uma empresa do grupo;
- obra de origem e opcional para o saldo legado sem lastro conhecido;
- numero, titular, valor, vencimento e justificativa da origem sao obrigatorios;
- estados: `EM_CARTEIRA`, `UTILIZADO`, `DEPOSITADO`, `DEVOLVIDO` e `CANCELADO`; `RESERVADO` fica disponivel para evolucao futura;
- transferencia entre empresas altera a custodia e grava origem, destino, usuario e data;
- deposito exige conta bancaria ativa da mesma empresa;
- cheque utilizado em pagamento sai da carteira e fica ligado ao grupo, componente e movimentos da baixa;
- estorno integral da baixa devolve o cheque para `EM_CARTEIRA`, desde que nao exista movimentacao posterior;
- o estorno do recebimento que originou um cheque so e permitido enquanto ele ainda estiver em carteira.

### Saldo inicial legado e importacao

- o cadastro manual e a importacao representam saldo inicial sem lastro de obra identificado;
- a justificativa e obrigatoria e a origem tecnica e `SALDO_INICIAL_LEGADO`;
- a planilha aceita empresa, identificacao bancaria, titular, valor, datas, obra opcional e observacoes;
- preview e confirmacao sao separados;
- o preview permite corrigir, incluir e excluir linhas;
- a confirmacao revalida todo o lote, exige `Idempotency-Key` e usa uma unica transacao;
- uma linha invalida impede todo o lote;
- a identificacao de possivel duplicidade e validada pelo servico. A migration nao cria unicidade retroativa que possa falhar por duplicidades historicas.

### Baixa composta

- somente titulos `PAGAR`, abertos ou parciais;
- todos os titulos devem pertencer ao mesmo credor e a mesma empresa;
- cada componente usa uma forma de pagamento ativa cadastrada no sistema;
- cartao de debito pode compor o grupo; cartao de credito que gera fatura permanece na baixa simples, pois esse fluxo altera vencimento e vinculo da fatura;
- conta bancaria e cartao devem pertencer a empresa da baixa;
- cheque de terceiro deve estar `EM_CARTEIRA` e sob custodia da mesma empresa;
- o cheque e sempre usado pelo valor integral de face;
- cada componente deve ser integralmente distribuido entre os titulos;
- cada titulo nao pode receber valor superior ao saldo e o total das fontes deve ser igual ao total alocado;
- juros, multa e desconto continuam no fluxo de baixa simples. A baixa composta atual aceita somente principal para preservar a reconciliacao dos componentes;
- preview nao grava movimentos;
- confirmacao bloqueia os registros, usa uma unica transacao, exige idempotencia e impede duplo clique no frontend;
- falha em qualquer componente desfaz todo o grupo;
- estorno e sempre integral por grupo, preservando os movimentos como `ESTORNADO` e a trilha de auditoria.

## Estrutura tecnica

Migration: `202608070001_financeiro_carteira_cheques_baixa_composta.js`.

Tabelas novas:

- `baixas_financeiras_grupos`: cabecalho idempotente do pagamento;
- `baixas_financeiras_componentes`: fontes usadas no grupo;
- `baixas_financeiras_alocacoes`: distribuicao de cada fonte por titulo;
- `cheques_terceiros_movimentos`: historico imutavel de custodia.

Os movimentos financeiros recebem `baixa_grupo_id` e `baixa_componente_id`. Os cheques recebem empresa, obra opcional, entrada, saida, movimentos de origem/destino e chave de importacao.

## Endpoints

- `GET /api/financeiro/cheques-terceiros`
- `POST /api/financeiro/cheques-terceiros`
- `GET /api/financeiro/cheques-terceiros/:id`
- `POST /api/financeiro/cheques-terceiros/:id/movimentar`
- `GET /api/financeiro/cheques-terceiros/modelo.xlsx`
- `POST /api/financeiro/cheques-terceiros/importacoes/preview`
- `POST /api/financeiro/cheques-terceiros/importacoes/confirmar`
- `POST /api/financeiro/baixas-compostas/preview`
- `POST /api/financeiro/baixas-compostas/confirmar`
- `GET /api/financeiro/baixas-compostas`
- `GET /api/financeiro/baixas-compostas/:id`
- `POST /api/financeiro/baixas-compostas/:id/estornar`

## Permissoes

- `financeiro.cheques.visualizar`
- `financeiro.cheques.cadastrar`
- `financeiro.cheques.importar`
- `financeiro.cheques.depositar`
- `financeiro.cheques.devolver`
- `financeiro.cheques.cancelar`
- `financeiro.cheques.transferir`
- `financeiro.baixas_compostas.visualizar`
- `financeiro.baixas_compostas.criar`
- `financeiro.baixas_compostas.confirmar`
- `financeiro.baixas_compostas.estornar`

As permissoes devem ser concedidas no painel granular. Visualizar Contas a Pagar, isoladamente, nao libera as novas operacoes.

## Interfaces

- `Financeiro > Cheques de Terceiros`: carteira, filtros, indicadores, cadastro, importacao e historico;
- `Financeiro > Contas a Pagar`: acao `Baixa com multiplas fontes` para os titulos selecionados;
- `Financeiro > Baixas com Multiplas Fontes`: consulta da composicao e estorno integral do grupo;
- a baixa simples e a baixa em massa existentes permanecem inalteradas.

## Limites desta entrega

- nao existe fracionamento de um unico cheque entre datas diferentes: ele pode ser rateado entre titulos somente dentro do mesmo grupo atomico;
- nao existe compensacao bancaria automatica de cheque depositado;
- transferencia entre empresas registra custodia, nao contabilizacao intercompany;
- relatorios contabeis formais continuam dependendo da classificacao definida pela contabilidade.
