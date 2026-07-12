# Idempotencia, Concorrencia e Transacoes

## Operacoes criticas

- criacao de solicitacao e solicitacao de compra;
- envio entre setores e aprovacao;
- liberacao para cotacao;
- resposta de fornecedor;
- encerramento de cotacao e geracao de pedido;
- geracao de titulo;
- baixa e estorno;
- geracao de parcelas comerciais;
- fechamento de RH/DP;
- upload e vinculacao de documentos;
- sincronizacoes fiscais e renovacoes/importacoes documentais do SST.

## Protecoes esperadas

1. frontend bloqueia o comando enquanto a requisicao estiver em andamento;
2. backend revalida o estado atual, sem confiar no botao oculto;
3. operacao usa chave de idempotencia ou chave natural unica quando puder ser repetida;
4. leituras e gravacoes relacionadas usam transacao;
5. geracoes em lote usam lock ou marcador de processamento;
6. retries retornam o resultado existente quando a operacao ja foi concluida;
7. auditoria registra tentativa, sucesso, falha e usuario;
8. efeitos externos sao confirmados antes de marcar o estado interno como concluido.

## Regras financeiras

- um mesmo registro de origem nao pode gerar dois titulos equivalentes;
- uma baixa nao pode ultrapassar o saldo disponivel;
- estorno cria compensacao logica, nunca apaga movimento;
- conciliacao nao cria baixa automaticamente;
- rollback de uma etapa nao pode deixar pedido, titulo ou movimento orfao.

## Checklist de implementacao

- existe indice unico aplicavel?
- a transacao cobre todas as tabelas alteradas?
- chamadas externas ocorrem antes ou depois do commit de forma recuperavel?
- duas requisicoes simultaneas produzem um unico resultado?
- o usuario recebe resposta segura ao repetir a acao?
- os modulos consumidores observam apenas estados concluidos?
