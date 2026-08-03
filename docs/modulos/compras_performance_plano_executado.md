# Compras - desempenho, rascunhos e atualizacao em tempo real

## Objetivo

Reduzir tempo de carregamento e perda de preenchimento no modulo de Compras sem alterar regras de permissao, fechamento, cotacao, pedido, apropriacao, auditoria ou financeiro.

## Compatibilidade preservada

- Rotas de lista sem `visao` continuam entregando o contrato completo anterior.
- As telas de lista usam explicitamente `visao=resumo` ou `visao=delegacao`.
- Todas as rotas de escrita, validadores de negocio e permissoes permanecem os mesmos.
- A nova rota de workspace de cotacao usa as mesmas protecoes de leitura e escopo do comparativo.
- Atualizacoes em tempo real apenas invalidam listas; telas com formulario operacional aberto nao sao recarregadas automaticamente.
- A observabilidade continua desabilitada por padrao.

## Entregas

### Listas leves

- Solicitacoes de Compra: relacionamento profundo substituido, na visao resumida, por contagens agrupadas de itens e fornecedores.
- Delegacao: carrega somente obra, solicitante, comprador e status dos pedidos necessarios para a regra visual existente.
- Pedidos: itens completos foram substituidos por `itens_ativos_count` na listagem.
- Fornecedores e insumos: o backend passa a respeitar `limit`, com teto defensivo.
- Cotacoes: busca por fornecedor ou titulo executada no banco, sem filtrar todo o resultado em memoria.

### Cotacao e pedido

- `GET /api/compras/solicitacoes/:id/workspace-cotacao` devolve solicitacao e comparativo a partir de uma unica carga.
- Buscas de fornecedores cancelam requisicoes anteriores e ignoram respostas obsoletas.
- Edicoes de item e frete do pedido reutilizam o detalhe atualizado devolvido pelo backend, evitando uma segunda requisicao identica.
- A validacao de escopo anterior a uma mutacao de pedido usa somente pedido e solicitacao minimos; o detalhe completo continua sendo devolvido depois da operacao.

### Rascunhos locais

- Nova solicitacao e compra direta salvam automaticamente apos 800 ms de inatividade.
- Chave isolada por usuario e tipo de fluxo.
- Expiracao em sete dias.
- O rascunho e removido depois da criacao ou pelo botao `Limpar rascunho`.
- Sair da pagina sem enviar mantem o preenchimento.

### Tempo real

- O stream autenticado passou a assinar `solicitacoes,compras` na mesma conexao SSE.
- Eventos de Compras sao direcionados ao solicitante, comprador responsavel, usuarios ativos do setor de Compras e SUPERADMIN.
- A lista e atualizada para criacao, delegacao, resposta de cotacao e principais mudancas de pedido.
- Eventos sao agrupados por 350 ms e destinatarios operacionais ficam em cache por 30 segundos.
- Se o SSE estiver indisponivel, as listas fazem atualizacao de seguranca a cada 60 segundos.

### Banco

A migration `202608030001_compras_performance_indexes.js` cria somente indices, de forma idempotente, para os filtros e relacionamentos mais usados. O `down` e intencionalmente nao destrutivo.

## Matriz de smoke test

| ID | Fluxo | Resultado esperado |
|---|---|---|
| C01 | Abrir Solicitacoes de Compra | Mesmos registros, contagens de itens/fornecedores corretas e menor payload |
| C02 | Filtrar por obra, status e texto | Resultado funcionalmente igual ao anterior |
| C03 | Selecionar e encaminhar/inativar em massa | Mesmas confirmacoes, permissoes e resultado |
| C04 | Abrir Delegacao | Apenas registros do escopo; pedidos fechados continuam ocultos conforme regra atual |
| C05 | Delegar em duas sessoes | A segunda sessao atualiza a lista sem recarregar o navegador |
| C06 | Criar solicitacao em uma sessao | A fila de Compras aberta em outra sessao recebe o novo registro |
| C07 | Sair da Nova Solicitacao e voltar | Campos e itens retornam somente para o mesmo usuario |
| C08 | Clicar Limpar rascunho | Dados locais sao removidos e nao retornam |
| C09 | Revisar e criar solicitacao | Criacao unica; rascunho removido depois do sucesso |
| C10 | Abrir gerenciamento de cotacao | Solicitacao e comparativo carregam normalmente em uma requisicao de workspace |
| C11 | Digitar rapidamente na busca de fornecedor | Apenas o resultado do ultimo texto aparece |
| C12 | Fornecedor responder cotacao | Lista de cotacoes de usuario autorizado atualiza automaticamente |
| C13 | Abrir Pedidos de Compra | Valores, status e quantidade de itens ativos permanecem corretos |
| C14 | Editar/adicionar/remover item do pedido | Tela usa a resposta atualizada, sem recarga duplicada |
| C15 | Registrar/editar/cancelar frete | Regra financeira e auditoria permanecem; detalhe atualizado uma vez |
| C16 | Reabrir, remanejar e fechar pedido | Regras e auditoria existentes permanecem |
| C17 | Usuario fora do escopo abrir listas/detalhes | Continua recebendo lista filtrada ou 403 conforme permissao |
| C18 | SSE indisponivel | Lista continua operacional e atualiza pelo fallback periodico |
| C19 | Observabilidade desabilitada | Nenhuma linha `[COMPRAS_PERF]` e comportamento anterior preservado |
| C20 | Aplicar migration duas vezes | Segunda execucao nao recria indices nem altera dados |

## Validacao local

```bash
cd backend
npm run test:compras-performance
npm run test:compras-performance-fases
npm run test:compra-cotacao-envio
npm run test:compra-remanejamento
npm run test:docs

cd ../frontend
npm run build
```
