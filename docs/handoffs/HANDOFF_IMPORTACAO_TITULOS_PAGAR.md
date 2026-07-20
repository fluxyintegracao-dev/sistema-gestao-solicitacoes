# Handoff - Importacao em massa de contas a pagar

## Objetivo

- Permitir que usuario autorizado exporte um modelo `.xlsx`, valide contas a pagar em preview e confirme a criacao atomica dos titulos.
- Preservar a regra de que a obra informada define obra, empresa, DRE e o conjunto de apropriacoes permitidas para o custo, mesmo quando o colaborador/credor estiver cadastrado em outra empresa.
- Impedir que uma planilha incompleta crie baixas, movimentos, intents de pagamento ou classificacoes inconsistentes.

## Estado da implementacao

- Implementacao inicial commitada em `14220d2` e aplicada no ambiente dev em 2026-07-20, inclusive a migration `202607200001_financeiro_titulos_importacao.js`.
- O modelo usa `empresa_codigo`, `obra_codigo`, `credor_cpf_cnpj`, `categoria_nome` e `apropriacao_codigo`, nao exige nova migration e passa a gerar o XLSX versao `1.4`.
- A versao `1.4` esta em desenvolvimento local, sem commit ou deploy, e substitui a aba consolidada `REFERENCIAS` por abas especializadas para pesquisa e filtro.
- Producao nao recebeu a migration nem o recurso nesta sessao.

## Regras implementadas

- O fluxo existe somente em Contas a Pagar.
- O usuario informa `empresa_codigo` + `obra_codigo`; o backend resolve uma unica obra e somente entao usa seu ID interno.
- O usuario informa `apropriacao_codigo` quando houver apropriacao principal ou rateio; o backend resolve o codigo dentro da obra ja validada e usa o ID somente no payload interno.
- O usuario informa `credor_cpf_cnpj` e `categoria_nome`, ambos visiveis nas telas; mascara do documento e diferencas de caixa/acentuacao do nome sao normalizadas.
- O modelo nao expoe IDs internos de obra, credor, categoria ou apropriacao; referencia inexistente, inativa, incompativel ou ambigua bloqueia a linha.
- O codigo da empresa desambigua o codigo da obra, mas `empresa_id` do titulo continua derivado de `obra.empresa_grupo_id`; a empresa do cadastro do colaborador nao substitui a empresa derivada da obra.
- Combinacao inexistente, fora do escopo, sem codigos cadastrados ou duplicada bloqueia a linha.
- O colaborador precisa possuir parceiro financeiro ativo marcado como fornecedor ou corretor; a importacao nao cria ou converte parceiros automaticamente.
- Credor sem favorecido bancario/PIX completo gera aviso confirmavel. O titulo pode ser criado, mas permanece inelegivel para lote bancario ate a regularizacao.
- Modelo possui abas operacionais `INSTRUCOES`, `TITULOS`, `PARCELAS`, `RATEIOS` e `IMPOSTOS`, alem das consultas `EMPRESAS`, `OBRAS`, `APROPRIACOES`, `CREDORES`, `CATEGORIAS`, `FORMAS_PAGAMENTO` e `DOMINIOS`.
- As abas de consulta sao protegidas, filtraveis e contêm apenas referencias atuais e permitidas ao usuario no momento da exportacao; as listas suspensas usam nomes definidos do Excel e o backend continua revalidando tudo.
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
- Modelo XLSX `1.4` gerado, reimportado, inspecionado e renderizado em todas as doze abas; nomes definidos e listas suspensas foram preservados, nenhuma formula com erro foi encontrada e o layout foi aprovado.

## Riscos e homologacao obrigatoria

- No ambiente dev a migration base ja foi aplicada; para o ajuste da versao `1.4`, atualizar o codigo e reiniciar somente `backend-dev`.
- Conceder `financeiro.titulos.importar` somente ao grupo piloto e validar que usuarios sem a permissao nao veem nem acessam os endpoints.
- Homologar com massa real de salarios, incluindo colaborador de empresa diferente da obra, parcelamento, impostos, rateio e favorecido bancario pendente.
- Confirmar em banco que os titulos importados aparecem em Contas a Pagar, DRE, fluxo previsto, Resultado de Obras e selecao de lote bancario, sem gerar movimentos ou pagamentos.
- Simular duplo clique, repeticao do mesmo arquivo, perda de resposta apos confirmacao e erro em uma linha para comprovar idempotencia e rollback.

## Proximo passo exato

1. Revisar o diff e criar commit dedicado sem incluir alteracoes documentais ou arquivos nao relacionados que ja estavam no worktree.
2. Atualizar o ambiente dev por `git pull --ff-only origin dev-v2`, executar `npm install` em `backend/` e reiniciar somente `backend-dev`; nao ha nova migration para a versao `1.3`.
3. Publicar o frontend se necessario e executar a matriz de homologacao acima antes de liberar a permissao aos usuarios finais.
