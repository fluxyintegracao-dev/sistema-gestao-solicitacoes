# Handoff — Custos e Recebíveis: subitens mensais

## Estado

A base de subitens mensais, pesquisa direta e rascunho local já foram implantados na `dev-v2`. A alteração atual adiciona modelos XLSX e prévia editável de importação nas três etapas e ainda está sem commit.

## Alterações

- Nova migration `202608030002_custos_recebiveis_subitens_mensais.js`.
- Custos planejados agora são subitens livres agrupados pelas etapas macro do plano publicado.
- Medição Prevista de obra pública pesquisa, sob demanda, os itens analíticos da planilha publicada dentro da etapa macro aberta e recebe somente a quantidade medida prevista.
- A consulta é paginada e filtrada no backend pela etapa macro, evitando carregar a planilha inteira no frontend.
- Medição Aprovada repete a pesquisa independente dos itens da planilha. O item aprovado não precisa ter sido incluído na Medição Prevista.
- Quantidades previstas e aprovadas respeitam separadamente o saldo orçado acumulado do item.
- Na Medição Prevista, o campo limita imediatamente a quantidade ao saldo orçado disponível e a coluna usa o rótulo `Qtd. orçada`; o backend mantém a validação definitiva.
- A diferença positiva entre o total previsto e o total aprovado é registrada como glosa e exige justificativa geral auditável.
- Obras privadas mantêm recebíveis automáticos do Financeiro.
- Rótulo operacional alterado de Medição apresentada para Medição Prevista.
- Contratos legados por `plano_item_id` foram preservados para compatibilidade.
- Custos, Medição Prevista e Medição Aprovada possuem rascunhos locais separados por usuário, obra, competência e versão do plano, com validade de sete dias.
- A restauração ocorre após recarga ou retorno à tela; navegação e `pagehide` forçam a gravação dos últimos dados digitados.
- Cada salvamento confirmado remove somente o rascunho daquela etapa, e a tela permite descartar todos os rascunhos do período manualmente.
- Cada etapa possui modelo XLSX isolado por obra, competência e snapshot do plano.
- Custos permanecem livres no arquivo; as duas medições liberam somente a coluna de quantidade e protegem as referências do orçamento.
- A importação é bifásica: upload e prévia sem escrita, seguida de revalidação obrigatória após editar, excluir ou adicionar itens.
- Linhas zeradas são ignoradas, fórmulas e cabeçalhos adulterados são rejeitados e o saldo acumulado é recalculado no backend.
- Metadados ocultos impedem reutilizar o modelo em outra obra, competência, etapa ou versão do plano.
- Confirmar aplica a prévia ao rascunho da etapa; o botão de salvamento existente continua sendo a única escrita oficial.

## Arquivos

- `backend/migrations/202608030002_custos_recebiveis_subitens_mensais.js`
- `backend/src/models/index.js`
- `backend/src/modules/custosRecebiveis/models/CrPrevisaoCusto.js`
- `backend/src/modules/custosRecebiveis/models/CrPrevisaoReceita.js`
- `backend/src/modules/custosRecebiveis/models/CrMedicaoConsolidada.js`
- `backend/src/modules/custosRecebiveis/services/planejamentoService.js`
- `backend/src/modules/custosRecebiveis/services/planejamentoPlanilhaService.js`
- `backend/src/modules/custosRecebiveis/controllers/CustosRecebiveisController.js`
- `backend/src/modules/custosRecebiveis/routes/index.js`
- `backend/src/modules/custosRecebiveis/services/exportacaoService.js`
- `backend/src/modules/custosRecebiveis/tests/validarFase2.js`
- `frontend/src/modules/custosRecebiveis/services/custosRecebiveis.js`
- `frontend/src/modules/custosRecebiveis/components/CrPlanningImportModal.jsx`
- `frontend/src/modules/custosRecebiveis/utils/planningDraftStorage.js`
- componentes e estilos em `frontend/src/modules/custosRecebiveis/`
- `docs/modulos/custos_recebiveis_planejamento_mensal.md`

## Validações executadas

- `node --check` nos modelos, serviço e migration.
- `npm run test:custos-recebiveis-fase2`.
- `npm run test:custos-recebiveis-fase3`.
- `npm run test:custos-recebiveis-fase4`.
- `npm run test:custos-recebiveis-prontidao`.
- `npm run build` no frontend.
- `git diff --check`.
- Geração real dos três workbooks em memória, releitura com ExcelJS e conferência das células bloqueadas/desbloqueadas.
- Casos automatizados de linha zerada, dado protegido adulterado, custo livre e quantidade acima do saldo.

## Próximo passo

Commitar os modelos e a importação na `dev-v2`, atualizar o ambiente de desenvolvimento e executar o smoke test das três planilhas: download, proteção no Excel, descarte de linhas zeradas, bloqueio por saldo, edição da prévia, revalidação, aplicação ao rascunho e salvamento oficial. Não há migration. Não acessar a EC2 diretamente; o deploy é feito pelo usuário.
