# Handoff - Disponibilidade apos fechamento de cotacao

## Objetivo

Permitir nova compra quando uma edicao interna da resposta criar disponibilidade real para o mesmo fornecedor ou quando outro fornecedor possuir saldo para o item, inclusive depois de a quantidade originalmente solicitada ter sido totalmente consumida.

## Regra implantada

- `quantidade_disponivel` e a capacidade total vigente do fornecedor para o item;
- o saldo do fornecedor e `quantidade_disponivel - alocacoes ATIVAS do mesmo fornecedor e item`;
- a apuracao usa fornecedor e referencia estavel do item, sem depender do ID da resposta, que muda a cada edicao;
- alocacoes canceladas nao consomem disponibilidade;
- outro fornecedor possui saldo independente para o mesmo item;
- uma solicitacao `ENCERRADO` so e reaberta pela edicao interna final quando a alteracao aumenta efetivamente a disponibilidade;
- a reabertura muda o status para `FECHAMENTO_PARCIAL`, limpa `encerrado_em` e registra auditoria detalhada;
- o fornecedor publico nao pode editar resposta encerrada;
- compra acima do saldo originalmente solicitado continua exigindo confirmacao e justificativa auditavel;
- nenhuma compra pode ultrapassar o saldo atual do fornecedor.

## Arquivos do fluxo

- `backend/src/services/comprasDisponibilidadeService.js`
- `backend/src/services/pedidoCompraService.js`
- `backend/src/controllers/SolicitacaoCompraController.js`
- `backend/src/controllers/CotacaoFornecedorController.js`
- `backend/scripts/validarCompraCotacaoEnvio.js`
- `frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx`
- `docs/regras_negocio/compras.md`
- `docs/modulos/compras/README.md`

## Validacoes esperadas

1. fornecedor A ofereceu 10 e ja vendeu 10: saldo zero;
2. resposta de A alterada para 20: saldo liberado 10;
3. fornecedor B oferece 8 e ainda nao vendeu: saldo 8;
4. solicitacao encerrada e resposta sem aumento: backend rejeita a reabertura;
5. solicitacao encerrada e resposta com aumento: volta para `FECHAMENTO_PARCIAL`;
6. saldo original do item igual a zero: nova selecao aparece, mas todo o valor e tratado como excedente e exige justificativa;
7. tentativa acima do saldo do fornecedor: backend rejeita;
8. repeticao da mesma chave de idempotencia: nao duplica pedido nem alocacao.

## Migracao

Nao ha migration. O fluxo reutiliza as alocacoes historicas existentes e os campos atuais de resposta e solicitacao.

## Validacoes executadas

- `npm.cmd run test:compra-cotacao-envio` no backend: aprovado;
- `npm.cmd run test:docs` no backend: aprovado;
- `npm.cmd run build` no frontend: aprovado;
- carga dos controllers e services alterados via Node: aprovada;
- `node --check` nos arquivos JavaScript alterados do backend: aprovado;
- `git diff --check`: aprovado.
