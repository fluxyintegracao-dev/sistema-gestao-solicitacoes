# Handoff — Custos e Recebíveis: subitens mensais

## Estado

A base de subitens mensais já foi implantada na `dev-v2`. A correção atual — pesquisa direta da planilha nas medições prevista e aprovada — está concluída localmente e ainda sem commit. O módulo não possui registros operacionais, portanto não foi necessária conversão de dados existentes.

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

## Arquivos

- `backend/migrations/202608030002_custos_recebiveis_subitens_mensais.js`
- `backend/src/models/index.js`
- `backend/src/modules/custosRecebiveis/models/CrPrevisaoCusto.js`
- `backend/src/modules/custosRecebiveis/models/CrPrevisaoReceita.js`
- `backend/src/modules/custosRecebiveis/models/CrMedicaoConsolidada.js`
- `backend/src/modules/custosRecebiveis/services/planejamentoService.js`
- `backend/src/modules/custosRecebiveis/services/exportacaoService.js`
- `backend/src/modules/custosRecebiveis/tests/validarFase2.js`
- `frontend/src/modules/custosRecebiveis/services/custosRecebiveis.js`
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

## Próximo passo

Commitar a correção na `dev-v2`, atualizar backend e frontend de desenvolvimento e executar o smoke test das duas pesquisas independentes em uma obra pública. Esta correção não cria migration adicional. Não acessar a EC2 diretamente; o deploy é feito pelo usuário.
