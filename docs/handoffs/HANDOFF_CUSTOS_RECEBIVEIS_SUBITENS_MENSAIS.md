# Handoff — Custos e Recebíveis: subitens mensais

## Estado

Implementação concluída localmente e ainda sem commit. O módulo não possui registros operacionais, portanto não foi necessária conversão de dados existentes.

## Alterações

- Nova migration `202608030002_custos_recebiveis_subitens_mensais.js`.
- Custos planejados agora são subitens livres agrupados pelas etapas macro do plano publicado.
- Medição Prevista de obra pública seleciona os subitens de custo salvos e recebe somente a quantidade medida prevista.
- Medição Aprovada referencia o mesmo subitem e preserva justificativa de glosa.
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
- `backend/src/modules/custosRecebiveis/tests/validarFase2.js`
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

Revisar o diff final, commitar na `dev-v2`, aplicar a migration em desenvolvimento e executar o smoke test do Novo Mês em uma obra pública e uma privada. Não acessar a EC2 diretamente; o deploy é feito pelo usuário.

