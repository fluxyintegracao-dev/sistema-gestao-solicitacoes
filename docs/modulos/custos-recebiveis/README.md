# Custos e Recebiveis

## Objetivo

Custos e Recebiveis e um modulo independente para planejamento mensal, acompanhamento
de custos realizados, previsao de recebiveis e governanca por obra.

O modulo usa Obras e Financeiro como fontes de leitura, mas grava exclusivamente em
tabelas com prefixo `cr_`. Ele nao substitui o Provisionamento, nao altera a planilha
orcamentaria macro de Obras e nao modifica registros dos modulos que consulta.

## Estado do runtime

A fundacao tecnica da Fase 0 e os fluxos funcionais das Fases 1 e 2 estao
implementados no codigo:

- entrada `CUSTOS_RECEBIVEIS` no catalogo de modulos;
- feature desabilitada por padrao;
- dependencia obrigatoria de `OBRAS` e `FINANCEIRO`;
- 14 tabelas proprias `cr_*`;
- models Sequelize e associacoes de leitura;
- permissoes granulares;
- policy propria de escopo por obra;
- listagem das obras do escopo do usuario;
- workspace de consulta da estrutura micro e de suas versoes;
- modelo XLSX por obra, com referencias macro somente para consulta;
- validacao previa da planilha sem gravacao;
- importacao transacional, versionada, idempotente e auditada;
- publicacao de uma versao e substituicao atomica da versao anteriormente publicada;
- planejamento mensal em tres etapas, separado para obras publicas e privadas;
- medicao consolidada exclusiva de obras publicas;
- recebiveis privados provenientes de contrato/titulo sem dupla contagem;
- competencia finalizada imutavel, com reabertura temporaria aprovada;
- dashboard e comparativo operacional com cinco estados;
- pagina frontend responsiva em `/custos-recebiveis`, com as abas `Visao geral`,
  `Obras`, `Planejamento mensal`, `Comparativo` e `Importacoes`;
- item unico de menu, exibido somente quando a feature estiver habilitada e o usuario
  possuir a permissao explicita de acesso.

A migration ainda nao foi executada em ambiente compartilhado e a feature permanece
desabilitada. Portanto, o modulo ainda nao esta disponivel aos usuarios. Realizado,
obrigacoes, bloqueio, exportacoes e configuracoes serao entregues nas fases
posteriores.

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

## Fase 1 - leitura e planilha micro

### Rotas

Todas as rotas abaixo passam, nesta ordem, pela feature flag do prefixo, pela permissao
geral `custos_recebiveis.modulo.acessar`, pela permissao da acao e, quando existe obra
em contexto, pela policy de escopo:

```text
GET  /custos-recebiveis/obras
GET  /custos-recebiveis/obras/:obraId/plano
GET  /custos-recebiveis/obras/:obraId/plano/modelo
POST /custos-recebiveis/obras/:obraId/plano/importar/validar
POST /custos-recebiveis/obras/:obraId/plano/importar
POST /custos-recebiveis/planos/:planoId/publicar
```

O upload somente e processado depois das validacoes de permissao e escopo.

### Contrato da planilha

A aba `ESTRUTURA_MICRO` possui exatamente estas colunas:

```text
codigo
descricao
unidade
quantidade
custo_unitario
etapa_macro_codigo
codigo_pai
```

O modelo tambem contem as abas `MACRO_REFERENCIA`, alimentada em modo somente leitura
com as apropriacoes ativas da obra, e `INSTRUCOES`.

A validacao rejeita cabecalho incompleto, codigos duplicados, valores negativos,
referencias a pais inexistentes, ciclos hierarquicos e codigo macro inexistente ou
inativo. O limite atual e de 10 MB e 10.000 linhas.

### Versionamento, idempotencia e publicacao

- Validar um arquivo nao grava dados.
- A primeira importacao cria a versao 1 em `RASCUNHO`.
- Uma reimportacao diferente exige motivo e cria nova versao; nunca sobrescreve a
  anterior.
- O mesmo hash SHA-256 para a mesma obra retorna a importacao existente e nao duplica
  plano, itens ou auditoria.
- A importacao grava somente `cr_planos_obra`, `cr_plano_itens`,
  `cr_plano_macro_vinculos`, `cr_importacoes` e `cr_auditoria`.
- A publicacao exige vinculo macro em todos os itens de custo.
- Divergencia absoluta superior a 5% entre micro e macro exige justificativa.
- Ao publicar, a versao publica anterior passa para `SUBSTITUIDA` e a nova passa para
  `PUBLICADA` dentro da mesma transacao.
- Nenhum fluxo cria, edita ou remove registros em `apropriacoes`.

### Frontend

- Rota unica `/custos-recebiveis`.
- Contexto preservado na URL pelos parametros `aba`, `obra`, `plano`, `competencia` e
  `sub`.
- Tabelas compactas em desktop/notebook e registros empilhados em tablet/mobile.
- Acoes de validacao, importacao e publicacao ficam bloqueadas enquanto a requisicao
  esta em andamento.
- A interface mostra apenas as abas e acoes autorizadas pelas permissoes granulares.

## Fase 2 - planejamento, medicao, dashboard e comparativo

### Rotas

```text
GET  /custos-recebiveis/dashboard?competencia=AAAA-MM
GET  /custos-recebiveis/obras/:obraId/competencias/:competencia
PUT  /custos-recebiveis/obras/:obraId/competencias/:competencia/custos
PUT  /custos-recebiveis/obras/:obraId/competencias/:competencia/receitas
POST /custos-recebiveis/obras/:obraId/competencias/:competencia/finalizar
POST /custos-recebiveis/obras/:obraId/competencias/:competencia/medicao
GET  /custos-recebiveis/obras/:obraId/comparativo?competencia=AAAA-MM
POST /custos-recebiveis/competencias/:competenciaId/reabertura
POST /custos-recebiveis/reaberturas/:reaberturaId/aprovar
```

Todas seguem a ordem feature flag, acesso geral, permissao da acao e escopo da obra.
As mutacoes usam transacao, bloqueio pessimista quando aplicavel e gravam
`cr_auditoria`.

### Planejamento publico e privado

- O assistente possui tres etapas: recebiveis, custos e revisao/finalizacao.
- Custos e recebiveis publicos aceitam somente itens folha da versao micro publicada.
- O custo/valor por item e calculado no backend; o frontend apresenta o mesmo calculo
  apenas como retorno imediato ao usuario.
- Obra publica usa previsao e medicao por item micro.
- Obra privada lista parcelas contratuais com vencimento na competencia.
- Quando uma parcela privada possui `titulo_financeiro_id` de Contas a Receber, ela e
  apresentada e gravada como uma unica origem vinculada ao titulo; a parcela nao e
  somada novamente.
- Obra privada nao recebe interface nem endpoint funcional de medicao.
- O planejamento mensal nao cria itens dentro do plano publicado e nunca altera
  `apropriacoes`.

### Finalizacao e reabertura

- `Idempotency-Key` e obrigatoria ao finalizar.
- A primeira finalizacao grava o snapshot da versao publicada, totais, usuario e data.
- Repetir a finalizacao retorna o estado existente e nao cria auditoria ou registro
  adicional.
- Uma competencia `FINALIZADA` rejeita alteracao de custos e recebiveis.
- Reabertura exige motivo, decisao por permissao separada e `expira_em` futuro.
- Ao aprovar, a competencia passa a `REABERTA`; qualquer usuario autorizado da obra
  pode editar durante a janela.
- Expirada a janela, novas mutacoes sao rejeitadas mesmo que o estado continue
  `REABERTA`.
- Uma nova finalizacao preserva o snapshot original da competencia.

### Comparativo

Os cinco estados sao determinados no backend:

```text
NEUTRO        previsto = 0 e realizado = 0
SEM_PREVISAO  previsto = 0 e realizado > 0
A_REALIZAR    previsto > 0 e realizado = 0
DENTRO        realizado <= previsto
ESTOURO       realizado > previsto
```

O dashboard consolida previsto e realizado por macro e apresenta o estado das obras
do escopo. O comparativo detalha item, macro, previsto, realizado, desvio, percentual
e estado. Nesta fase, `cr_realizados` pode estar vazio; sua projecao oficial e
reconciliacao pertencem a Fase 3.

## Regras de evolucao

- Cada fase funcional deve ser entregue e aceita separadamente.
- Nao executar migrations em ambiente compartilhado sem confirmacao explicita.
- Nao habilitar a feature antes da homologacao.
- Nao criar fallback de permissao ou escopo legado.
- Nao alterar os calculos existentes de Provisionamento, Obras, DRE, Resultado de Obras,
  Compras ou Financeiro.
- Toda mutacao futura deve ser transacional, idempotente quando aplicavel e auditada.

## Validacao das Fases 0, 1 e 2

Executar:

```powershell
cd C:\Fluxy\backend
node src/modules/custosRecebiveis/tests/validarFase0.js
node src/modules/custosRecebiveis/tests/validarFase1.js
npm.cmd run test:custos-recebiveis-fase2
npm.cmd run test:docs
npm.cmd run test:compra-cotacao-envio
npm.cmd run test:compra-remanejamento
npm.cmd run test:security-hardening
npm.cmd run test:importacao-titulos
npm.cmd run test:payments
npm.cmd run test:smoke-sst

cd C:\Fluxy\frontend
npm.cmd run build
```

Antes da homologacao visual em dev, a migration deve ser executada pelo responsavel do
ambiente e a feature deve ser habilitada somente mediante confirmacao explicita.
