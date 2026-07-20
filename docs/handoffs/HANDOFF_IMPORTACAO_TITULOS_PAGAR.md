# Handoff - Importacao em massa de contas a pagar

## Objetivo

- Permitir que usuario autorizado exporte um modelo `.xlsx`, valide contas a pagar em preview e confirme a criacao atomica dos titulos.
- Preservar a regra de que a obra informada define obra, empresa, DRE e o conjunto de apropriacoes permitidas para o custo, mesmo quando o colaborador/credor estiver cadastrado em outra empresa.
- Impedir que uma planilha incompleta crie baixas, movimentos, intents de pagamento ou classificacoes inconsistentes.

## Estado da implementacao

- Implementacao inicial commitada em `14220d2` e aplicada no ambiente dev em 2026-07-20, inclusive a migration `202607200001_financeiro_titulos_importacao.js`.
- Ajuste do modelo para `empresa_codigo` + `obra_codigo` + `apropriacao_codigo` esta em desenvolvimento local, sem commit ou deploy.
- O ajuste de codigos operacionais nao exige nova migration; depende de novo deploy do backend e da geracao de um modelo XLSX versao `1.2`.
- Producao nao recebeu a migration nem o recurso nesta sessao.

## Regras implementadas

- O fluxo existe somente em Contas a Pagar.
- O usuario informa `empresa_codigo` + `obra_codigo`; o backend resolve uma unica obra e somente entao usa seu ID interno.
- O usuario informa `apropriacao_codigo` quando houver apropriacao principal ou rateio; o backend resolve o codigo dentro da obra ja validada e usa o ID somente no payload interno.
- O modelo nao expoe IDs internos de obra ou apropriacao; apropriacao inexistente, inativa, somadora, de outra obra ou com codigo duplicado na mesma obra bloqueia a linha.
- O codigo da empresa desambigua o codigo da obra, mas `empresa_id` do titulo continua derivado de `obra.empresa_grupo_id`; a empresa do cadastro do colaborador nao substitui a empresa derivada da obra.
- Combinacao inexistente, fora do escopo, sem codigos cadastrados ou duplicada bloqueia a linha.
- O colaborador precisa possuir parceiro financeiro ativo marcado como fornecedor ou corretor; a importacao nao cria ou converte parceiros automaticamente.
- Credor sem favorecido bancario/PIX completo gera aviso confirmavel. O titulo pode ser criado, mas permanece inelegivel para lote bancario ate a regularizacao.
- Modelo possui abas `INSTRUCOES`, `TITULOS`, `PARCELAS`, `RATEIOS`, `IMPOSTOS` e `REFERENCIAS`.
- Preview reusa as validacoes do cadastro manual dentro de transacao revertida e persiste erros/avisos por linha.
- Confirmacao revalida estado e duplicidade, usa `Idempotency-Key`, bloqueio transacional e rollback integral.
- Formulas, macros, ZIP64, expansao ZIP desproporcional, paths internos inseguros, linhas ocultas e colunas ocultas com dados sao rejeitados.
- Limites: 10 MB, 500 titulos e 5.000 linhas de dados.
- Titulos criados recebem `origem_titulo = IMPORTACAO` e nenhuma baixa, movimento, conciliacao, fatura ou intent e criada.

## Arquivos da implementacao

### Backend

- `backend/migrations/202607200001_financeiro_titulos_importacao.js`
- `backend/scripts/validarImportacaoTitulos.js`
- `backend/src/constants/moduloPermissoes.js`
- `backend/src/controllers/TituloFinanceiroImportacaoController.js`
- `backend/src/models/FinanceiroTituloImportacao.js`
- `backend/src/models/FinanceiroTituloImportacaoLinha.js`
- `backend/src/models/FinanceiroTituloImportacaoResultado.js`
- `backend/src/models/index.js`
- `backend/src/routes.js`
- `backend/src/services/authorizationService.js`
- `backend/src/services/tituloFinanceiroImportacaoService.js`
- `backend/src/services/tituloFinanceiroService.js`
- `backend/package.json`

### Frontend

- `frontend/src/components/financeiro/FinanceiroTitulosImportacaoPanel.jsx`
- `frontend/src/pages/FinanceiroTitulos.jsx`
- `frontend/src/services/financeiro.js`
- `frontend/src/utils/acessoProduto.js`

### Documentacao relacionada

- `docs/modulos/financeiro/README.md`
- `docs/modulos/financeiro/PLANO_IMPORTACAO_TITULOS_PAGAR.md`
- `docs/logs_desenvolvimento/changelog.md`
- `docs/seguranca/autenticacao_autorizacao.md`
- `AGENTS.md`

## Validacoes executadas

- `npm run test:importacao-titulos` no backend: aprovado.
- `npm run test:payments` no backend: aprovado.
- `npm run test:docs` no backend: aprovado.
- `npm run build` no frontend: aprovado.
- `node --check` nos novos servicos, controller e migration: aprovado.
- Carga completa de models e rotas: aprovada.
- Modelo XLSX importado, inspecionado e renderizado com as seis abas; nenhuma formula com erro encontrada e layout aprovado.

## Riscos e homologacao obrigatoria

- No ambiente dev a migration ja foi aplicada; para o ajuste da versao `1.2`, atualizar o codigo e reiniciar somente `backend-dev`.
- Conceder `financeiro.titulos.importar` somente ao grupo piloto e validar que usuarios sem a permissao nao veem nem acessam os endpoints.
- Homologar com massa real de salarios, incluindo colaborador de empresa diferente da obra, parcelamento, impostos, rateio e favorecido bancario pendente.
- Confirmar em banco que os titulos importados aparecem em Contas a Pagar, DRE, fluxo previsto, Resultado de Obras e selecao de lote bancario, sem gerar movimentos ou pagamentos.
- Simular duplo clique, repeticao do mesmo arquivo, perda de resposta apos confirmacao e erro em uma linha para comprovar idempotencia e rollback.

## Proximo passo exato

1. Revisar o diff e criar commit dedicado sem incluir alteracoes documentais ou arquivos nao relacionados que ja estavam no worktree.
2. Atualizar o ambiente dev por `git pull --ff-only origin dev-v2`, executar `npm install` em `backend/` e reiniciar somente `backend-dev`; nao ha nova migration para a versao `1.2`.
3. Publicar o frontend se necessario e executar a matriz de homologacao acima antes de liberar a permissao aos usuarios finais.
