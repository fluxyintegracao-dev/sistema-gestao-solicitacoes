# Plano - Importacao em Massa de Titulos a Pagar

## Estado e objetivo

Este documento registra o desenho implementado no repositorio. A liberacao em cada ambiente depende da migration `202607200001_financeiro_titulos_importacao.js`, deploy de backend/frontend e concessao da permissao `financeiro.titulos.importar`.

O objetivo e permitir que um usuario autorizado importe contas a pagar por planilha sem criar titulos incompletos, duplicados ou classificados fora do escopo correto. A importacao deve produzir o mesmo estado valido da criacao manual e preservar DRE, previsao de caixa, Obras, pagamentos bancarios, conciliacao, Fiscal, auditoria e governanca.

## Decisoes da primeira versao

- escopo exclusivo de `PAGAR`;
- origem gravada como `IMPORTACAO`, sem simular origem em Solicitacoes, Compras, Comercial ou RH/DP;
- `solicitacao_id` e outros vinculos operacionais ficam nulos;
- somente status inicial `ABERTO` ou `PREVISAO`;
- nenhuma baixa, movimento financeiro, conciliacao, intent de pagamento ou emissao de boleto e criada na importacao;
- cartoes, baixa automatica, faturas de cartao, intercompany, transferencia interna, cheques e multiplas formas de pagamento ficam fora da primeira versao;
- uma forma de pagamento ativa e obrigatoria por titulo logico;
- `empresa_codigo` + `obra_codigo` identificam de forma operacional uma unica obra; `apropriacao_codigo` identifica a apropriacao dentro dessa obra; IDs internos de obra e apropriacao nunca sao exigidos do usuario;
- a obra resolvida define a empresa e o contexto permitido para a apropriacao principal do titulo, inclusive quando o credor for um colaborador cadastrado em outra empresa do grupo;
- o vinculo empresarial do colaborador nao restringe a importacao: para o Financeiro ele participa como parceiro/credor global;
- parcelas, rateios e impostos podem ser informados em abas proprias;
- importacao com erro nao permite confirmacao;
- confirmacao e atomica: todas as linhas validas sao criadas ou toda a operacao sofre rollback;
- nao existe opcao de confirmar apenas as linhas sem erro na primeira versao.

Essas restricoes evitam que uma planilha gere movimentos bancarios, efeitos entre empresas ou faturas sem a revisao existente na tela individual. Funcionalidades excluidas podem ser adicionadas depois de testes especificos.

## Impactos obrigatorios

| Dominio consumidor | Campo/regra que nao pode faltar | Risco se importado incorretamente |
|---|---|---|
| Empresas e Obras | combinacao unica e ativa de `empresa_codigo` + `obra_codigo`; empresa do titulo derivada de `obra.empresa_grupo_id` | consolidacao e escopo por empresa incorretos |
| Parceiros e colaboradores | credor ativo marcado como fornecedor ou corretor; colaborador pode pertencer a empresa diferente da obra, desde que possua parceiro/credor financeiro valido | cadastro de RH sem correspondente financeiro bloqueia; favorecido bancario incompleto gera aviso e deixa o titulo inelegivel para lote ate regularizacao |
| Categorias e DRE | categoria ativa, compativel com `PAGAR`; `competencia_data`; `considera_dre` e `dre_grupo` coerentes | DRE ausente ou classificada na linha errada |
| Apropriacoes e rateios | `apropriacao_codigo` unico dentro da obra, analitico e ativo; rateio fecha 100% ou o valor total informado e e escalado para o liquido calculado | custo atribuido a centro errado |
| Fluxo de caixa | vencimento, status e saldo inicial corretos | previsao de caixa incorreta |
| Impostos | natureza, base, aliquota e valor; liquido recalculado pelo backend | saldo e pagamento divergentes do documento |
| Pagamentos bancarios | titulo `PAGAR`, aberto, com credor e forma valida; nenhuma intent criada na importacao | lote inelegivel ou duplicidade de pagamento |
| Boletos/Guias a pagar | linha digitavel e codigo de barras opcionais, sem emissao automatica | pagamento apontando para documento errado |
| Fiscal | numero do documento, credor, empresa, valor e datas consistentes | matching ambiguo ou vinculo manual incorreto |
| Relatorios e Governanca | origem, importacao, usuario, arquivo e linha rastreaveis | impossibilidade de explicar o lancamento |
| Legados desabilitados | nao enfileirar integracao nem marcar registro como integrado | reativacao acidental de fluxo descontinuado |

## Modelo XLSX

O modelo deve ser gerado pelo backend para o usuario logado. Nao deve ser um arquivo estatico, porque as referencias e o escopo de obras mudam.

### Aba `INSTRUCOES`

- versao do modelo;
- formatos de data e moeda;
- limites de linhas e tamanho;
- campos obrigatorios e opcionais;
- exemplos sem dados reais sensiveis;
- aviso de que a planilha cria previsoes/contas, nunca baixas;
- explicacao das abas relacionais e da `chave_importacao`.

### Aba `TITULOS`

Uma linha representa um titulo logico antes do desdobramento em parcelas.

| Coluna | Obrigatoria | Regra |
|---|---|---|
| `chave_importacao` | sim | identificador unico dentro do arquivo, sem reutilizacao |
| `empresa_codigo` | sim | codigo operacional da empresa listado em `REFERENCIAS`; usado com `obra_codigo` para desambiguar a obra |
| `obra_codigo` | sim | codigo informado no cadastro da obra e listado em `REFERENCIAS`; nunca recebe o ID do banco |
| `credor_id` | sim | ID listado em `REFERENCIAS`; parceiro ativo e elegivel para `PAGAR` |
| `categoria_id` | sim | ID listado em `REFERENCIAS`; categoria ativa e compativel com `PAGAR` |
| `forma_pagamento_codigo` | sim | forma ativa, sem cartao na primeira versao |
| `status` | nao | `ABERTO` por padrao; aceita `PREVISAO` |
| `descricao` | sim | ate 255 caracteres |
| `numero_documento` | nao | referencia do documento do credor |
| `valor_total` | sim | maior que zero; deve fechar parcelas e ajustes |
| `data_emissao` | nao | data valida; usa a data atual quando vazia |
| `data_vencimento` | sim | vencimento base ou da parcela unica |
| `competencia_data` | sim | competencia economica usada pela DRE |
| `considera_dre` | nao | `SIM` por padrao; exige categoria classificada na DRE |
| `apropriacao_codigo` | nao | codigo operacional listado em `REFERENCIAS`, resolvido dentro da obra informada; nao usar junto com rateios multiplos |
| `observacoes` | nao | ate 4.000 caracteres |
| `forma_cobranca` | nao | `BOLETO`, `PIX` ou `OUTROS` |
| `banco_cobranca` | nao | codigo bancario quando conhecido |
| `linha_digitavel` | nao | armazenada para pagamento, sem executar baixa |
| `codigo_barras` | nao | armazenado para pagamento, sem executar baixa |

Nomes, CPF/CNPJ e descricoes aparecem na aba `REFERENCIAS`. A obra e resolvida pela combinacao normalizada de `empresa_codigo` + `obra_codigo`, pois `obra.codigo` isolado nao e unico no schema atual. Se essa combinacao estiver duplicada no cadastro, a linha e bloqueada para regularizacao. Depois da resolucao, o backend usa o ID interno da obra e deriva `empresa_id` de `obra.empresa_grupo_id`; o codigo da empresa nao permite forcar uma empresa diferente da vinculada a obra. Quando informada, a apropriacao e resolvida pela combinacao da obra ja validada com `apropriacao_codigo`. Codigo ausente, duplicado dentro da obra, somador, inativo ou pertencente a outra obra bloqueia a linha. Credor e categoria continuam sendo resolvidos pelos IDs selecionaveis da aba de referencias, e a forma de pagamento pelo codigo funcional.

Em importacoes de salarios, o colaborador pode estar cadastrado em empresa diferente da empresa da obra. Essa divergencia nao gera erro: a obra continua definindo `obra_id`, `empresa_id`, DRE e quais apropriacoes podem receber o custo, enquanto o parceiro vinculado ao colaborador e apenas o credor/favorecido. A importacao nao deve alterar `empresa_grupo_id` ou `obra_id` do cadastro de RH. Se o colaborador ainda nao possuir parceiro financeiro ativo e elegivel para `PAGAR`, a linha deve ser bloqueada para regularizacao cadastral, sem criar ou converter parceiros silenciosamente durante a importacao.

A baixa permanece separada da importacao. A empresa pagadora informada na baixa deve corresponder a empresa vinculada a conta bancaria escolhida. Quando essa empresa for a mesma empresa do titulo, a baixa segue o fluxo normal. Se uma conta de outra empresa do grupo pagar o titulo, o fluxo atual exige marcar e classificar a baixa como `intercompany`; a conta bancaria, sozinha, nao dispensa essa classificacao.

### Aba `PARCELAS`

Usada somente quando um titulo logico possui mais de uma parcela.

| Coluna | Regra |
|---|---|
| `chave_importacao` | referencia uma linha de `TITULOS` |
| `numero_parcela` | sequencial de 1 ate o total |
| `valor` | maior que zero; soma igual a `valor_total` |
| `data_vencimento` | obrigatoria e valida |
| `numero_documento` | opcional por parcela |
| `linha_digitavel` | opcional por parcela |
| `codigo_barras` | opcional por parcela |
| `observacoes` | opcional |

Numeros repetidos, lacunas ou soma divergente bloqueiam a importacao. O backend gera `grupo_parcelamento_id`, codigos `TIT-*`, saldos e descricoes das parcelas.

### Aba `RATEIOS`

| Coluna | Regra |
|---|---|
| `chave_importacao` | referencia uma linha de `TITULOS` |
| `empresa_codigo` | codigo operacional da empresa da obra |
| `obra_codigo` | codigo informado no cadastro da obra |
| `apropriacao_codigo` | codigo operacional de apropriacao analitica, ativa e pertencente a obra informada |
| `tipo_rateio` | `PERCENTUAL` ou `VALOR` |
| `percentual` | obrigatorio no rateio percentual |
| `valor_rateio` | obrigatorio no rateio por valor |
| `observacoes` | opcional |

Todas as linhas do mesmo titulo usam o mesmo tipo. A soma deve fechar 100% ou o valor liquido do titulo. Se esta aba possuir linhas para uma chave, `apropriacao_codigo` da aba `TITULOS` deve ficar vazio.

### Aba `IMPOSTOS`

| Coluna | Regra |
|---|---|
| `chave_importacao` | referencia uma linha de `TITULOS` |
| `tipo_imposto` | classificacao textual obrigatoria |
| `descricao` | opcional |
| `natureza` | `RETENCAO` ou `ACRESCIMO` |
| `base_calculo` | opcional; backend valida moeda |
| `aliquota` | opcional |
| `valor` | maior que zero |
| `observacoes` | opcional |

O backend recalcula `valor_bruto`, `valor_impostos` e `valor_liquido`; valores calculados nao sao aceitos como verdade apenas porque vieram da planilha.

### Aba `REFERENCIAS`

Gerada para o usuario e protegida contra edicao acidental, contendo somente:

- obras dentro do escopo financeiro do usuario, com `empresa_codigo`, nome da empresa, `obra_codigo` e nome da obra; obras sem os dois codigos nao ficam elegiveis para a importacao;
- credores ativos elegiveis para contas a pagar, com ID, nome, CPF/CNPJ e indicador `favorecido_bancario` (`PRONTO` ou `PENDENTE`);
- categorias ativas compativeis com `PAGAR`, com ID, nome, indicador e grupo DRE;
- formas de pagamento ativas permitidas pela primeira versao, excluindo as que exigem cartao ou cheque;
- apropriacoes analiticas ativas das obras visiveis, com `apropriacao_empresa_codigo`, `apropriacao_obra_codigo`, `apropriacao_codigo` e descricao; o ID interno da apropriacao nao e exportado.

Listas suspensas podem usar essa aba, mas o backend sempre revalida as referencias na confirmacao.

## Fluxo tecnico

### 1. Geracao do modelo

`GET /financeiro/titulos/importacoes/modelo`

- exige modulo Financeiro e permissao de importacao;
- gera `.xlsx` com ExcelJS;
- inclui `template_version`, data de geracao e referencias do escopo atual;
- nao inclui segredos, dados bancarios sensiveis ou cadastros fora do escopo.

### 2. Preview persistido

`POST /financeiro/titulos/importacoes/preview`

- recebe somente `.xlsx` via upload seguro em memoria;
- valida assinatura binaria, MIME, tamanho, quantidade de abas, colunas e linhas;
- rejeita macros, formulas como fonte de valores, celulas ocultas usadas como payload e versao desconhecida;
- normaliza datas, CPF/CNPJ, codigos e moeda sem depender da localidade do Excel;
- calcula hash SHA-256 do arquivo e fingerprint por titulo logico;
- resolve todas as referencias e aplica as mesmas regras da criacao manual;
- persiste importacao, linhas, payload normalizado, erros e avisos;
- nao cria titulos nem qualquer efeito financeiro.

O preview retorna totais logicos e derivados: titulos, parcelas que serao geradas, valor bruto, impostos, valor liquido, rateios, erros e avisos.

### 3. Revisao

`GET /financeiro/titulos/importacoes/:id`

- mostra erros por aba, linha, coluna e `chave_importacao`;
- destaca possiveis duplicidades;
- permite baixar relatorio de erros;
- nao permite confirmar enquanto houver erro;
- exige confirmacao explicita dos avisos nao bloqueantes.

### 4. Confirmacao atomica

`POST /financeiro/titulos/importacoes/:id/confirmar`

- exige `Idempotency-Key` e bloqueia multiplos cliques no frontend;
- bloqueia a importacao no banco com `SELECT ... FOR UPDATE`;
- revalida permissao, escopo, referencias, status e fingerprints;
- rejeita preview expirado ou alterado por mudanca cadastral relevante;
- usa uma unica transacao para todos os titulos e complementos;
- reutiliza funcoes de dominio extraidas de `tituloFinanceiroService`, com transacao externa;
- usa o gerador sequencial atual de codigo `TIT-*` dentro da mesma transacao;
- grava auditoria da importacao e os IDs de todos os titulos resultantes;
- em qualquer erro, executa rollback integral e marca a tentativa como falha sem deixar titulo parcial.

Controllers nao devem chamar controllers nem simular requisicoes HTTP internas. A criacao manual e a importacao devem compartilhar um servico de dominio que receba payload normalizado, usuario e transacao.

## Persistencia proposta

### `financeiro_titulo_importacoes`

- `id`, `codigo`, `template_version`;
- `arquivo_nome`, `arquivo_hash`;
- `idempotency_key` unica;
- `status`: `PREVIEW`, `VALIDADO`, `PROCESSANDO`, `CONFIRMADO`, `FALHA`, `CANCELADO`, `EXPIRADO`;
- totais de linhas, titulos derivados, erros, avisos e valores;
- `criado_por`, `confirmado_por`, timestamps e metadados de falha.

### `financeiro_titulo_importacao_linhas`

- importacao, aba, numero da linha e `chave_importacao`;
- fingerprint e payload normalizado;
- status, erros e avisos estruturados;
- restricao unica por importacao e chave na aba `TITULOS`.

### `financeiro_titulo_importacao_resultados`

- importacao, linha logica e titulo financeiro criado;
- numero da parcela e valor resultante;
- restricao unica para impedir vinculo duplicado.

Nao e recomendado adicionar apenas `importacao_id` ao titulo, porque uma linha logica pode gerar varias parcelas. A tabela de resultados preserva a cardinalidade e a auditoria.

## Idempotencia e duplicidade

Tres camadas devem ser usadas:

1. `Idempotency-Key` impede duas confirmacoes concorrentes da mesma operacao.
2. Hash do arquivo impede confirmar novamente o mesmo arquivo sem decisao explicita.
3. Fingerprint funcional identifica possivel duplicidade por empresa derivada, credor, numero do documento, vencimento, valor e parcela.

O fingerprint funcional gera erro quando houver correspondencia exata com titulo ativo importado pela mesma chave. Correspondencias provaveis com titulos manuais ou de outra origem aparecem como aviso bloqueante que exige revisao e justificativa. Duplicidade legitima nunca deve ser liberada silenciosamente.

## Permissoes

A implementacao adiciona `financeiro.titulos.importar` ao registro central e aos guards de frontend/backend. As rotas usam guard especifico e nao dependem somente de `allowFinanceiro`, pois possuir qualquer permissao financeira nao equivale a poder importar contas.

Regras:

- `SUPERADMIN` e `ADMINISTRADOR` preservam o bypass administrativo vigente;
- com matriz configurada, importar exige `financeiro.titulos.importar`;
- sem matriz configurada, o fallback deve ser decidido antes da entrega; recomendacao: somente setor/capacidade Financeiro;
- cada obra e apropriacao e revalidada contra o escopo do usuario no preview e na confirmacao;
- gerar o modelo, visualizar importacao, confirmar e cancelar geram eventos de seguranca.

A mesma entrega deve avaliar se a rota individual `POST /financeiro/titulos` passara a exigir explicitamente `financeiro.titulos.criar`, pois hoje o middleware amplo do modulo aceita qualquer usuario com acesso financeiro.

## Limites e seguranca do arquivo

- aceitar somente `.xlsx`; CSV nao representa com seguranca as relacoes entre titulo, parcelas, rateios e impostos;
- tamanho e quantidade maxima devem ser configuraveis por ambiente;
- recomendacao inicial para homologacao: ate 500 titulos logicos e 5.000 linhas somando abas filhas;
- ajustar limites somente depois de medir tempo de preview e transacao;
- nunca executar formula, macro, hyperlink ou conteudo incorporado;
- proteger contra ZIP bomb e validar a estrutura OpenXML;
- aplicar `uploadRateLimit`, `criticalRateLimit` na confirmacao e limite de uma confirmacao ativa por importacao;
- mascarar CPF/CNPJ e dados de cobranca nos logs tecnicos quando nao forem necessarios.

## Fases implementadas

1. Servico de criacao manual adaptado para aceitar transacao externa e origem controlada.
2. Migration, models e constraints da importacao criados.
3. Gerador versionado do modelo XLSX e aba de referencias por escopo criados.
4. Parser, normalizacao, preview persistido e erros por linha implementados.
5. Confirmacao atomica, idempotencia, nova verificacao de duplicidade e auditoria implementadas.
6. Permissao e guards especificos adicionados.
7. Painel compacto em Contas a Pagar implementado com exportacao, upload, preview e confirmacao.
8. Teste automatizado do modelo/parser, renderizacao visual e build de frontend executados. A homologacao com massa real continua obrigatoria antes da liberacao em producao.

## Cenarios minimos de aceite

- modelo contem apenas referencias acessiveis ao usuario;
- `empresa_codigo` + `obra_codigo` validos resolvem uma unica obra sem exigir ID de banco do usuario;
- combinacao inexistente, fora do escopo ou duplicada bloqueia a linha;
- `apropriacao_codigo` valido resolve uma unica apropriacao dentro da obra sem expor seu ID interno;
- `apropriacao_codigo` inexistente, de outra obra ou duplicado dentro da mesma obra bloqueia a linha;
- titulo simples valido e criado com empresa derivada da obra;
- `PREVISAO` e `ABERTO` alimentam corretamente a previsao financeira;
- categoria incompativel, inativa ou sem grupo DRE bloqueia quando aplicavel;
- credor inexistente/inativo ou nao fornecedor/corretor bloqueia;
- colaborador de outra empresa, mas com parceiro financeiro valido, pode ser credor sem alterar a empresa derivada da obra;
- colaborador sem parceiro/credor financeiro elegivel bloqueia a linha e nao e cadastrado automaticamente;
- credor sem favorecido bancario/PIX completo gera aviso confirmavel: o titulo e criado, mas permanece inelegivel para lote bancario ate a regularizacao cadastral;
- obra fora do escopo ou sem empresa bloqueia;
- apropriacao somadora, inativa ou de outra obra bloqueia;
- parcelas sem sequencia ou cuja soma nao fecha bloqueiam;
- rateio que nao fecha 100% ou o valor liquido bloqueia;
- impostos recalculam bruto, retencoes, acrescimos e liquido;
- arquivo repetido e confirmacao concorrente nao duplicam titulos;
- uma linha invalida provoca rollback de toda a confirmacao;
- importacao nao cria movimentos, baixas, faturas, conciliacoes, intents ou filas legadas;
- titulos aparecem corretamente em Contas a Pagar, DRE, fluxo previsto, Financeiro por Obras e matching fiscal;
- exclusao logica posterior respeita movimentos, pagamentos e auditoria;
- build do frontend, teste documental e testes de dominio financeiro passam.

## Decisoes operacionais e evolucoes futuras

- preview expira em 24 horas;
- limite inicial de 500 titulos e 5.000 linhas somando as abas;
- avisos de duplicidade e de favorecido bancario pendente exigem confirmacao explicita no frontend;
- sem matriz granular, o fallback e restrito ao setor/perfil Financeiro e aos administradores de negocio;
- periodo inicial de homologacao e usuarios autorizados devem ser definidos no deploy;
- cartao, intercompany no nascimento do titulo, cheques e multiplas formas de pagamento permanecem fora da primeira versao.
