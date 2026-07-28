# Custos e Recebiveis

## Objetivo

Custos e Recebiveis e um modulo independente para planejamento mensal, acompanhamento
de custos realizados, previsao de recebiveis e governanca por obra.

O modulo usa Obras e Financeiro como fontes de leitura, mas grava exclusivamente em
tabelas com prefixo `cr_`. Ele nao substitui o Provisionamento, nao altera a planilha
orcamentaria macro de Obras e nao modifica registros dos modulos que consulta.

## Estado do runtime

A Fase 0 fornece somente a fundacao tecnica:

- entrada `CUSTOS_RECEBIVEIS` no catalogo de modulos;
- feature desabilitada por padrao;
- dependencia obrigatoria de `OBRAS` e `FINANCEIRO`;
- 14 tabelas proprias `cr_*`;
- models Sequelize e associacoes de leitura;
- permissoes granulares;
- policy propria de escopo por obra;
- esqueleto de rotas backend.

Ainda nao existem pagina, item de menu ou fluxo operacional disponivel ao usuario. A
feature nao deve ser habilitada antes da conclusao e homologacao das fases funcionais.

## Fronteiras de dados

O modulo pode ler:

- `Obra.classificacao` e os demais dados cadastrais da obra;
- `apropriacoes`, apenas para vinculo logico com a etapa macro;
- contratos e parcelas comerciais, apenas como origem de recebiveis privados;
- titulos e movimentos financeiros, apenas como fontes financeiras oficiais;
- parceiros e usuarios, apenas como referencias.

O modulo nao pode:

- criar ou editar obras;
- alterar `apropriacoes`;
- alterar contratos, parcelas, titulos ou movimentos financeiros;
- gravar em tabelas sem o prefixo `cr_`;
- ampliar o escopo de obra por setor, cargo ou acesso financeiro.

## Modelo de dados

Estrutura micro:

- `cr_planos_obra`;
- `cr_plano_itens`;
- `cr_plano_macro_vinculos`;
- `cr_importacoes`.

Ciclo mensal:

- `cr_competencias`;
- `cr_previsoes_custo`;
- `cr_previsoes_receita`;
- `cr_medicoes_consolidadas`;
- `cr_realizados`.

Governanca:

- `cr_responsaveis_obra`;
- `cr_obrigacoes_usuario`;
- `cr_reaberturas`;
- `cr_guard_bypass`;
- `cr_auditoria`.

`cr_auditoria` e append-only no ORM. Importacoes usam o hash do arquivo por obra como
base de idempotencia. Competencias sao unicas por obra e mes.

## Permissoes e escopo

O acesso ao modulo exige `custos_recebiveis.modulo.acessar` de forma explicita, exceto
para `SUPERADMIN`.

O escopo de obras segue somente esta precedencia:

1. `SUPERADMIN` acessa todas as obras;
2. `custos_recebiveis.escopo.todas_obras` acessa todas as obras;
3. os demais usuarios acessam apenas obras presentes em `usuarios_obras`.

Lista vazia de permissoes nao concede acesso implicito ao modulo novo. Obra fora do
escopo nao deve aparecer em listas, totais ou exportacoes. Acesso direto deve retornar
403 e registrar evento de seguranca.

As demais permissoes separam visualizacao, importacao e publicacao da estrutura micro,
planejamento, medicao, realizados, reabertura, bypass, configuracao e exportacao.

## Feature flag e rota tecnica

A feature nasce com:

```text
enabled: false
requiresAll: OBRAS, FINANCEIRO
```

O prefixo `/custos-recebiveis` usa a validacao central de modulos sem bypass quando a
feature esta desligada. O endpoint tecnico da fundacao e:

```text
GET /custos-recebiveis/status
```

Com a feature desligada, a resposta deve ser 403 inclusive para `SUPERADMIN`.

## Regras de evolucao

- Cada fase funcional deve ser entregue e aceita separadamente.
- Nao executar migrations em ambiente compartilhado sem confirmacao explicita.
- Nao habilitar a feature antes da homologacao.
- Nao criar fallback de permissao ou escopo legado.
- Nao alterar os calculos existentes de Provisionamento, Obras, DRE, Resultado de Obras,
  Compras ou Financeiro.
- Toda mutacao futura deve ser transacional, idempotente quando aplicavel e auditada.

## Validacao da Fase 0

Executar:

```powershell
cd C:\Fluxy\backend
node src/modules/custosRecebiveis/tests/validarFase0.js
npm.cmd run test:docs
npm.cmd run test:compra-cotacao-envio
npm.cmd run test:security-hardening
npm.cmd run test:importacao-titulos
npm.cmd run test:payments
npm.cmd run test:smoke-sst
```

O build do frontend tambem deve permanecer valido, embora a Fase 0 nao altere a
interface.

