# Handoff - Usuarios na Delegacao de Compras

## Objetivo

Restringir a selecao de responsaveis da pagina Delegacao de Compras a usuarios ativos realmente vinculados ao setor de Compras.

## Regra implementada

- elegibilidade baseada na capacidade `setores.eh_setor_compras`, nunca em nome, codigo ou ID fixo;
- considerados o setor principal (`users.setor_id`) e setores adicionais (`usuario_setores`);
- somente setores e usuarios ativos;
- `SUPERADMIN` permanece fora da lista operacional;
- atribuicao vazia continua permitida;
- atribuicoes antigas fora da regra sao preservadas e sinalizadas, mas precisam ser trocadas ou removidas para salvar uma edicao gerencial.

## Arquivos da alteracao

- `backend/src/services/comprasDelegacaoService.js`
- `backend/src/services/pedidoCompraService.js`
- `backend/src/controllers/PedidoCompraController.js`
- `backend/src/routes.js`
- `backend/scripts/validarComprasDelegacao.js`
- `backend/scripts/validarCompraCotacaoEnvio.js` (somente metrica atual de permissoes)
- `frontend/src/services/compras.js`
- `frontend/src/modules/solicitacao-compra/pages/ComprasDelegacao.jsx`
- `AGENTS.md` (somente metrica atual de permissoes)
- `docs/modulos/compras/README.md`
- `docs/regras_negocio/compras.md`
- `docs/seguranca/autenticacao_autorizacao.md` (somente metrica atual de permissoes)

## Contratos e seguranca

- novo endpoint: `GET /compras/delegacao/usuarios`;
- middleware: `allowComprasDelegacaoManage`;
- o endpoint generico `/usuarios-lista` nao foi alterado;
- o `PATCH /compras/solicitacoes/:id/delegar` revalida o responsavel dentro da transacao antes de atualizar a solicitacao e pedidos;
- nenhuma migration e necessaria.

## Validacao prevista

- `node backend/scripts/validarComprasDelegacao.js`;
- `npm.cmd run test:compra-cotacao-envio` em `backend/`;
- `npm.cmd run test:docs` em `backend/`;
- build do frontend;
- verificacao sintatica dos arquivos backend alterados;
- `git diff --check`.

## Validacoes executadas

- `node scripts/validarComprasDelegacao.js`: passou;
- `npm.cmd run test:compra-cotacao-envio`: passou;
- `npm.cmd run test:docs`: passou, com 190 Markdown e 18 documentos canonicos;
- `node -e "require('./src/routes')"`: passou;
- `npm.cmd run build` no frontend: passou;
- verificacoes `node --check` dos arquivos backend alterados: passaram;
- `git diff --check`: passou; houve apenas aviso local de permissao ao arquivo global de ignore do Git.

## Teste manual recomendado em dev

1. abrir Delegacao de Compras com usuario que possa gerenciar;
2. confirmar que aparecem usuarios com setor principal Compras;
3. confirmar que aparecem usuarios com Compras como setor adicional;
4. confirmar que usuarios de outros setores, inativos e `SUPERADMIN` nao aparecem;
5. delegar, remover responsavel e recarregar a pagina;
6. testar um registro historico atribuido fora de Compras: ele deve continuar visivel com aviso e somente permitir salvar apos troca ou remocao;
7. testar usuario que somente registra motivo de atraso e confirmar que a lista de candidatos nao e consultada.

## Riscos residuais

- cadastros de setor incorretamente marcados com `eh_setor_compras` alteram diretamente a elegibilidade e devem ser corrigidos na administracao de setores;
- registros historicos fora da regra nao sao migrados automaticamente para evitar troca silenciosa de responsabilidade.

## Ajuste de consistencia encontrado na validacao

O commit anterior de simplificacao de SST elevou o registro central para 18 grupos, 81 areas e 275 permissoes. Foram alinhados `AGENTS.md`, `docs/seguranca/autenticacao_autorizacao.md` e a assercao de contagem em `backend/scripts/validarCompraCotacaoEnvio.js`; nenhuma permissao foi criada ou removida nesta implantacao.
