# Compras - Fase 1 de desempenho e contratos

## Objetivo

Estabelecer uma linha de base reproduzivel antes de otimizar consultas do modulo de Compras. Esta fase nao altera respostas, permissoes, status, calculos ou regras operacionais.

## Instrumentacao

A instrumentacao e opt-in e permanece desligada por padrao.

```env
COMPRAS_PERFORMANCE_ENABLED=false
COMPRAS_PERFORMANCE_SAMPLE_RATE=1
COMPRAS_PERFORMANCE_SLOW_QUERY_MS=250
```

Quando habilitada, cada requisicao do modulo gera uma linha com o marcador `[COMPRAS_PERF]` contendo:

- metodo e rota parametrizada;
- status HTTP e indicacao de conexao abortada;
- duracao total;
- tamanho da resposta, quando informado pelo Express;
- nomes dos filtros recebidos, sem seus valores;
- quantidade e duracao agregada das consultas;
- quantidade de consultas acima do limite configurado;
- distribuicao por tipo de instrucao SQL.

Nao sao registrados SQL, bind parameters, token publico de cotacao, corpo da requisicao, documentos, nomes ou dados financeiros.

## Escopo monitorado

- `/api/compras/*`;
- `/api/cotacoes/*`, incluindo a resposta publica do fornecedor;
- `/api/configuracoes/cotacoes`.

Rotas de outros modulos nao recebem a instrumentacao.

## Contratos congelados

As fases seguintes devem preservar:

1. Os mesmos middlewares de permissao e escopo das rotas atuais.
2. Os mesmos criterios de visibilidade por usuario, setor e obra.
3. Os mesmos status, calculos, totais e regras de ordenacao.
4. Fechamento parcial, saldo remanescente e encerramento sem pedido.
5. Compra acima do solicitado somente com justificativa.
6. Disponibilidade do fornecedor, reabertura e remanejamento de pedido.
7. Condicao de pagamento, frete, rateios e integracao financeira.
8. Auditoria, exclusao logica, idempotencia e protecao contra multiplos envios.
9. O formato legado das respostas enquanto os consumidores nao forem migrados.

Cache e eventos em tempo real nunca substituem validacao de permissao ou releitura transacional no backend.

## Cenarios da linha de base em dev

Executar cada cenario ao menos cinco vezes, descartando o primeiro acesso para reduzir o efeito de aquecimento:

| Codigo | Tela/acao | Rota principal esperada |
| --- | --- | --- |
| B01 | Listar solicitacoes sem filtro | `GET /api/compras/solicitacoes` |
| B02 | Buscar solicitacao por texto/status | `GET /api/compras/solicitacoes` |
| B03 | Abrir fila de delegacao | `GET /api/compras/solicitacoes?contexto=delegacao` |
| B04 | Abrir detalhe de solicitacao | `GET /api/compras/solicitacoes/:id` |
| B05 | Abrir gerenciamento/comparativo de cotacao | detalhe + comparativo |
| B06 | Abrir e pesquisar cotacoes | `GET /api/compras/cotacoes` |
| B07 | Abrir e pesquisar fornecedores | `GET /api/compras/fornecedores` |
| B08 | Abrir Nova Solicitacao e pesquisar insumo | `GET /api/compras/insumos` |
| B09 | Abrir e filtrar pedidos | `GET /api/compras/pedidos` |
| B10 | Abrir detalhe de pedido completo | `GET /api/compras/pedidos/:id` |
| B11 | Abrir frete/remanejamento no pedido | detalhe e dados auxiliares |
| B12 | Abrir cada relatorio de Compras | `GET /api/compras/relatorios/*` |
| B13 | Abrir e salvar rascunho publico de cotacao | `GET/POST /api/cotacoes/:token/*` |

Usar solicitacoes e pedidos representativos: um pequeno, um medio e um com muitos itens, fornecedores, rateios e logs.

## Geracao do resumo

Depois dos cenarios, resumir o log do processo de desenvolvimento:

```bash
cd ~/sistema-gestao-solicitacoes-dev/backend
npm run perf:compras:resumo -- /home/ubuntu/.pm2/logs/backend-dev-out.log
```

Para salvar um formato estruturado:

```bash
npm run perf:compras:resumo -- /home/ubuntu/.pm2/logs/backend-dev-out.log --json
```

O resumo apresenta p50, p95, maximo, quantidade de consultas, tempo de banco e tamanho de resposta por rota.

## Metas para as proximas fases

As metas serao comparadas com esta linha de base:

- nenhuma divergencia de registros, totais ou permissoes;
- quantidade fixa de consultas por pagina, sem crescimento por linha retornada;
- reducao minima de 50% no p95 das telas priorizadas;
- reducao minima de 60% no payload das listagens pesadas;
- no maximo um recarregamento completo apos cada mutacao;
- pesquisas cancelaveis e com limite de resultados;
- nenhuma atualizacao em tempo real sobrescrevendo formulario em edicao.

Essas metas podem ser ajustadas apos observar volume, latencia da rede e plano de execucao real do banco de desenvolvimento.

## Validacao local

```bash
cd backend
npm run test:compras-performance
npm run test:compra-cotacao-envio
npm run test:compra-remanejamento
```

O primeiro teste valida isolamento de rotas, sanitizacao, contagem de consultas e consolidacao das metricas. Os demais protegem regras operacionais ja existentes.
