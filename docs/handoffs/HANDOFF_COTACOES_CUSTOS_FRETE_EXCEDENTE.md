# Handoff - Cotacoes: disponibilidade, custos, frete e excedente

## Estado

Implementacao concluida localmente na `dev-v2`, ainda sem commit e sem migracao executada em banco.

## Regra implementada

- resposta usa quantidade disponivel por item; vazio ou zero exclui a oferta do comparativo;
- prazo de entrega e geral, em dias corridos ou uteis;
- IPI, ICMS e ST sao valores em reais por item para a quantidade disponivel informada;
- DIFAL e valor em reais no cabecalho, rateado proporcionalmente pelo valor das mercadorias compradas;
- frete pode ser sem frete, embutido ou pago a terceiro;
- frete de terceiro exige valor e vencimento; transportador e CPF/CNPJ sao opcionais;
- frete de terceiro gera pendencia idempotente no Financeiro; o credor pode ser definido ao gerar o titulo;
- fechamento acima do solicitado e permitido ate a disponibilidade do fornecedor, com confirmacao e justificativa auditavel obrigatorias;
- o bloco de ranking dos melhores fornecedores foi removido;
- rotas e permissoes existentes foram preservadas.

## Arquivos da implementacao

- `backend/migrations/202607210001_cotacao_custos_disponibilidade.js`
- `backend/scripts/validarCompraCotacaoEnvio.js`
- `backend/src/controllers/CotacaoFornecedorController.js`
- `backend/src/controllers/SolicitacaoCompraController.js`
- `backend/src/models/PedidoCompra.js`
- `backend/src/models/PedidoCompraFrete.js`
- `backend/src/models/PedidoCompraItem.js`
- `backend/src/models/SolicitacaoCompraAlocacao.js`
- `backend/src/models/SolicitacaoCompraFechamento.js`
- `backend/src/models/SolicitacaoCompraFornecedor.js`
- `backend/src/models/SolicitacaoCompraRespostaItem.js`
- `backend/src/services/comprasCotacao.js`
- `backend/src/services/pedidoCompraFreteService.js`
- `backend/src/services/pedidoCompraPdf.js`
- `backend/src/services/pedidoCompraPdfHtmlTemplate.js`
- `backend/src/services/pedidoCompraService.js`
- `backend/src/validators/operationalValidators.js`
- `frontend/src/modules/solicitacao-compra/pages/CotacaoFornecedorPublica.jsx`
- `frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx`
- `frontend/src/modules/solicitacao-compra/pages/PedidoCompraDetalhe.jsx`
- `frontend/src/pages/FinanceiroTitulos.jsx`
- `docs/modulos/compras/README.md`
- `docs/modulos/cotacoes-pedidos/README.md`
- `docs/regras_negocio/compras.md`

Existem outras alteracoes documentais e arquivos nao rastreados anteriores no worktree; eles nao pertencem necessariamente a esta entrega e nao devem ser incluidos automaticamente em um commit.

## Validacoes executadas

- `npm run test:compra-cotacao-envio` no backend: aprovado;
- `npm run test:docs` no backend: aprovado, 185 Markdown e 18 documentos canonicos;
- `node --check` nos controllers, services, validators, PDFs e migration alterados: aprovado;
- `npm run build` no frontend: aprovado;
- `git diff --check`: aprovado.

## Validacao manual recomendada em dev

1. aplicar a migration `202607210001_cotacao_custos_disponibilidade.js`;
2. responder cotacao publica e interna com quantidade zero e confirmar ausencia da oferta no mapa;
3. responder com quantidade, IPI/ICMS/ST, DIFAL e frete embutido e conferir totais;
4. responder com frete de terceiro sem credor, fechar a cotacao e confirmar a pendencia em Contas a Pagar;
5. gerar o titulo escolhendo o credor no Financeiro;
6. fechar quantidade acima da solicitada, validar justificativa e consultar pedido/log;
7. tentar exceder a disponibilidade do fornecedor e confirmar bloqueio;
8. repetir o fechamento com a mesma chave e confirmar ausencia de duplicidade;
9. cancelar e refazer um pedido com frete da cotacao para confirmar reativacao sem duplicar;
10. validar notebook, tablet e smartphone nas duas telas de resposta, comparativo e detalhe do pedido.

## Proximo passo exato

Revisar o escopo do commit com `git status` e `git diff`, separar os arquivos anteriores que nao pertencem a esta entrega, criar o commit na `dev-v2`, enviar para `origin/dev-v2` e somente depois aplicar a migration e testar em dev.
