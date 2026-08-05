# Custos e Recebiveis

## Objetivo

Custos e Recebiveis e um modulo independente para planejamento mensal, acompanhamento
de custos realizados, previsao de recebiveis e governanca por obra.

O modulo usa Obras e Financeiro como fontes de leitura, mas grava exclusivamente em
tabelas com prefixo `cr_`. Ele nao substitui o Provisionamento, nao altera a planilha
orcamentaria macro de Obras e nao modifica registros dos modulos que consulta.

## Estado do runtime

A fundacao tecnica da Fase 0 e os fluxos funcionais das Fases 1, 2, 3 e 4 estao
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
- planejamento mensal com etapas adaptadas a classificacao publica ou privada;
- medicao consolidada exclusiva de obras publicas;
- recebiveis privados provenientes de contrato/titulo sem dupla contagem;
- competencia finalizada imutavel, com reabertura temporaria aprovada;
- dashboard e comparativo operacional com cinco estados;
- projetor idempotente do custo realizado, alimentado somente por baixas ativas;
- rateio resolvido por titulo, apropriacao e solicitacao, na ordem canonica;
- fila de valores nao mapeados, sem descarte do total financeiro;
- reconciliacao manual auditada por item micro;
- estornos neutralizados na projecao sem apagar o historico registrado;
- exportacoes CSV e XLSX limitadas ao mesmo escopo de obras;
- obrigacoes de custos e recebiveis calculadas a partir da competencia inicial do
  responsavel, sem cobranca retroativa anterior a esse marco;
- alertas D-7, D-3, D-1 e vencido calculados pelo horario do servidor;
- reabertura da competencia vencida ou finalizada e bypass temporario de usuario
  implementados como mecanismos distintos;
- bypass limitado a 30 dias, sem autoconcessao, sem ocultar ou cumprir a obrigacao;
- guard frontend e backend com kill-switch `CR_GUARD_MODE`, entregue em `observe`;
- pagina frontend responsiva em `/custos-recebiveis`, com as abas `Visao geral`,
  `Obras`, `Planejamento mensal`, `Comparativo`, `Custo realizado`,
  `Obrigacoes e prazos`, `Importacoes` e `Exportacoes`;
- item unico de menu, exibido somente quando a feature estiver habilitada e o usuario
  possuir a permissao explicita de acesso.

A migration foi executada com sucesso apenas no ambiente de desenvolvimento em
28/07/2026, pelo responsavel do ambiente. A feature permanece desabilitada e o modulo
ainda nao esta disponivel aos usuarios. `CR_GUARD_MODE` nao foi configurado; portanto,
o fallback continua em `observe` e nao bloqueia ou redireciona nenhum usuario.

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
GET  /custos-recebiveis/dashboard?competencia=AAAA-MM&obra_id=
GET  /custos-recebiveis/obras/:obraId/competencias
POST /custos-recebiveis/obras/:obraId/competencias
GET  /custos-recebiveis/obras/:obraId/plano/itens?competencia=AAAA-MM&q=&page=&limit=
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

- A entrada do planejamento e uma lista mensal por obra. Ela apresenta custo
  planejado, medicao apresentada, medicao aprovada, glosa, custo realizado e receita
  efetivamente recebida.
- `Novo mes` cria somente a competencia atual ou a seguinte, com
  `Idempotency-Key`, unicidade por obra/competencia e snapshot da versao publicada.
- Em obra publica, o assistente possui quatro etapas: custos planejados, medicao
  apresentada, medicao aprovada e revisao/finalizacao.
- Em obra privada, o assistente possui duas etapas: custos planejados e recebiveis do
  periodo. A finalizacao fica no rodape operacional da segunda etapa e nao existe
  etapa de medicao ou confirmacao manual dos recebiveis.
- O plano completo nao e materializado na tela. Itens folha sao pesquisados no
  backend por codigo, descricao ou etapa macro, com paginacao, e somente linhas
  selecionadas com valores relevantes ficam persistidas.
- Os seletores de itens em custos planejados e medicao apresentada usam autocomplete
  incremental com debounce; a lista e atualizada pelos caracteres digitados sem
  exigir clique no botao de busca. Custos planejados tambem exibem a quantidade
  orcada congelada do item para comparacao com a quantidade prevista.
- Custos e recebiveis publicos aceitam somente itens folha da versao micro publicada.
- O custo/valor por item e calculado no backend; o frontend apresenta o mesmo calculo
  apenas como retorno imediato ao usuario.
- Obra publica usa previsao e medicao por item micro.
- Em obra publica, `cr_previsoes_receita` representa a medicao apresentada pelo
  responsavel e `cr_medicoes_consolidadas` representa a medicao aprovada pelo orgao.
- A glosa e a diferenca positiva entre o valor apresentado e o aprovado. Glosa exige
  justificativa auditavel e o aprovado nao pode superar o apresentado.
- A medicao aprovada possui etapa propria, posterior a medicao apresentada, e pode ser
  registrada depois da finalizacao do planejamento, sem alterar o snapshot planejado.
- Receita recebida nao e digitada no modulo: vem exclusivamente de baixas ativas de
  titulos `RECEBER`, rateadas para a obra. Custo realizado continua vindo de baixas
  ativas de titulos `PAGAR`.
- Obra privada lista automaticamente parcelas contratuais e os respectivos titulos
  a receber com vencimento na competencia. Nao existe marcacao ou confirmacao manual:
  ao finalizar, as fontes oficiais do periodo sao sincronizadas no snapshot.
- Quando uma parcela privada possui `titulo_financeiro_id` de Contas a Receber, ela e
  apresentada e gravada como uma unica origem vinculada ao titulo; a parcela nao e
  somada novamente.
- Vencimento, inadimplencia, baixa e cobranca dos recebiveis privados continuam sendo
  regras do Financeiro; o modulo apenas consulta e consolida esses registros.
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

Na interface, a Visao Geral e executiva e sempre consolida todas as obras autorizadas
ao usuario na competencia escolhida. Abaixo do consolidado, cada obra aparece em um
card mensal proprio, com nome em destaque, custo planejado e realizado, desvio,
recebivel ou medicao prevista, valor reconhecido, recebido, saldo e glosa quando
aplicavel. Obras com alertas ficam primeiro para antecipar a tomada de decisao; o card
abre o planejamento da respectiva obra sem alterar qualquer regra de preenchimento.

Os filtros executivos atuam exclusivamente na secao `Decisao por obra`. O usuario pode
combinar uma obra, a classificacao publica ou privada e mais de uma das seis competencias
disponiveis; nesse recorte, a mesma obra aparece em um card para cada competencia
selecionada. A carteira consolidada, as tendencias e os pontos de atencao permanecem
calculados para todas as obras autorizadas na competencia de referencia, preservando a
leitura executiva global.

Tanto a lista do filtro quanto os cards aceitam apenas cadastros cujo
`tipo_centro_custo = OBRA`. Centros de custos nao participam desta tela. Se um cadastro
administrativo ainda aparecer como obra, o tipo do proprio cadastro deve ser corrigido;
o frontend nao infere o tipo pelo nome para evitar ocultar uma obra valida.

O endpoint continua aceitando `obra_id` para consumidores que precisem do recorte de
uma obra, incluindo a serie historica de seis competencias e o detalhamento somente
das macros com movimento. Sem `obra_id`, consolida todas as obras autorizadas e retorna
tambem `obras_resumo`, sem misturar as estruturas micro entre obras.

Na aba Planejamento mensal, as competencias sao apresentadas em cards responsivos com
os mesmos indicadores do resumo executivo. As acoes existentes de editar ou consultar
uma competencia permanecem inalteradas.

O antigo painel de status de todas as obras foi substituido por pontos de atencao
acionaveis: custo acima do planejado, glosa, movimento sem mapeamento, medicao
aguardando aprovacao, recebivel privado vencido, planejamento ausente e obrigacao
mensal vencida. Cada alerta direciona para a aba operacional correspondente.

Os indicadores sao adaptados a classificacao da obra. Obras publicas exibem medicao
apresentada, aprovada, glosa, receita recebida e saldo. Obras privadas exibem
recebivel previsto, recebido, saldo e quantidade de titulos vencidos. No consolidado,
o valor reconhecido combina medicao publica aprovada e recebiveis privados previstos,
sem somar a receita recebida ao reconhecimento.

O comparativo detalha item, macro, custo planejado, custo realizado, desvio,
percentual e estado. Acima do detalhamento, apresenta os quatro indicadores de
recebiveis sem somar medicao aprovada com entrada financeira.

## Fase 3 - custo realizado, reconciliacao e exportacoes

### Rotas

```text
GET  /custos-recebiveis/obras/:obraId/realizados?competencia=AAAA-MM
POST /custos-recebiveis/obras/:obraId/realizados/reprocessar
POST /custos-recebiveis/realizados/:id/reconciliar
GET  /custos-recebiveis/exportacoes/:tipo?competencia=AAAA-MM&obra_id=&formato=
```

As permissoes de visualizar, atualizar, reconciliar e exportar sao independentes.
Todas as rotas respeitam a feature, o acesso geral, a permissao da acao e o escopo da
obra. A exportacao sem `obra_id` percorre somente as obras devolvidas pela mesma policy
de escopo.

### Fonte oficial e idempotencia

- A aba `Custo realizado` usa exclusivamente titulos financeiros `PAGAR` como razao de
  custos alocados a obra. Ela nao consulta nem lista pedidos de compra ou solicitacoes.
- A visao principal lista todos os titulos da obra, independentemente do status, e
  permite alternar para os titulos com vencimento dentro da competencia selecionada.
- Cada titulo apresenta valor alocado a obra, valor pago, saldo, credor, categoria,
  apropriacao e status financeiro. Titulos rateados usam somente a parcela destinada
  a obra; os valores pago e saldo sao proporcionais ao rateio.
- Titulos cancelados ou estornados permanecem visiveis para rastreabilidade, mas nao
  compoem os totais ativos de custo.
- O resumo separa total alocado, saldo em aberto, valor pago e saldo ainda aberto dos
  titulos com vencimento na competencia selecionada. A competencia de contexto pode
  ser alterada por mes e ano e recalcula o card e o recorte da lista. Os filtros
  distinguem aberto, parcial, quitado, previsao e demais estados sem alterar o cadastro
  financeiro.
- A projecao `cr_realizados`, usada pelo dashboard, comparativo e exportacoes para
  representar caixa realizado, continua seguindo as regras de baixas abaixo.
- Somente `MovimentoFinanceiro` do tipo `BAIXA`, com `status = ATIVO`, vinculado a
  titulo `PAGAR`, entra no custo realizado.
- O valor usa `valor_quitacao`, com fallback para `valor`, e a competencia e o mes de
  `data_movimento`.
- O rateio do titulo e preferencial. Sem ele, o projetor tenta apropriacao do titulo,
  rateio da solicitacao e apropriacao direta da solicitacao, nessa ordem.
- A divisao proporcional preserva os centavos e a soma exata da baixa.
- A chave logica continua sendo `movimento_financeiro_id + plano_item_id`.
- Reprocessar sem mudanca nao grava novamente e retorna `idempotente: true`.

### Nao mapeados, reconciliacao e estorno

- Se nenhuma apropriacao resolver um unico item micro, o valor fica em
  `NAO_MAPEADO`, permanece visivel e continua compondo o total realizado.
- A reconciliacao exige item micro da obra e motivo. A decisao e registrada em
  `cr_auditoria` e reaplicada nos proximos reprocessamentos.
- Quando uma baixa deixa de estar ativa, a projecao e neutralizada com valor zero e um
  evento de correcao e anexado a auditoria. O registro historico nao e apagado.
- Consultas do dashboard e comparativo exigem movimento ainda ativo, evitando que um
  estorno continue no total antes do proximo reprocessamento.
- Nenhuma operacao da Fase 3 cria ou altera movimento, titulo, pedido, solicitacao ou
  apropriacao.

### Exportacoes

Os tipos disponiveis sao:

- `medicao-recebiveis`;
- `custos-previstos`;
- `comparativo`;
- `custo-realizado`;
- `solicitacoes-titulos`;
- `resumo-executivo`.

Cada tipo aceita `csv` ou `xlsx`. O CSV usa UTF-8 com BOM, separador por ponto e
virgula e protecao contra interpretacao de formulas. O XLSX reutiliza
`utils/excelWorkbook.js`.

## Fase 4 - obrigacoes, reabertura, bypass e guard

### Regras de obrigacao

- Somente responsaveis ou substitutos ativos, vinculados a obra ativa e com plano
  micro publicado, entram no calculo.
- O usuario precisa possuir acesso ao modulo. Cada obrigacao somente e gerada quando
  ele tambem possui a permissao da acao correspondente; configuracao incompleta de
  acesso nao pode prende-lo.
- O ponto de partida e `cr_responsaveis_obra.competencia_inicial`. Nenhum mes anterior
  gera pendencia.
- Em obras publicas, custos planejados e medicao apresentada geram obrigacoes
  separadas.
- Em obras privadas, somente custos planejados geram obrigacao manual. Os recebiveis
  contratuais sao sincronizados automaticamente com o Financeiro e nao geram
  pendencia de preenchimento.
- A medicao aprovada de obra publica pode ser registrada depois da finalizacao,
  quando o orgao responder, e nao integra a obrigacao mensal de preenchimento.
- Finalizar a competencia cumpre as obrigacoes aplicaveis ao tipo da obra. Reabrir
  torna essas obrigacoes visiveis novamente ate uma nova finalizacao.
- O prazo padrao e o ultimo dia util do mes, as 18h no horario do servidor. Sabados e
  domingos sao antecipados automaticamente. Feriados opcionais podem ser informados
  em `CR_FERIADOS`, como lista CSV de datas `AAAA-MM-DD`.

### Guard seguro

`CR_GUARD_MODE` aceita:

```text
observe  calcula e alerta, sem bloquear ou redirecionar
enforce  bloqueia chamadas e redireciona somente pendencias vencidas legitimas
```

Valor ausente ou invalido sempre resulta em `observe`. A avaliacao ocorre na ordem:
modo de observacao, `SUPERADMIN`, bypass vigente, rota liberada e, por ultimo,
pendencia vencida. Falha inesperada no calculo e fail-open para evitar indisponibilidade
geral.

O backend responde `403` com `MONTHLY_REQUIREMENT_PENDING` em chamadas diretas quando
o modo `enforce` estiver explicitamente ativo. O frontend usa o mesmo estado da sessao
para levar o usuario ao planejamento. Perfil, logout, ajuda/suporte e o proprio modulo
permanecem acessiveis.

### Reabertura e bypass

- Reabertura tem como alvo uma competencia da obra e libera qualquer usuario
  autorizado durante a janela aprovada.
- Mes vencido ainda sem registro pode criar sua competencia de forma idempotente ao
  solicitar reabertura.
- Bypass tem como alvo uma pessoa e, opcionalmente, uma obra.
- Bypass exige justificativa, expiracao futura, permissao administrativa e
  `Idempotency-Key`; e proibida a autoconcessao.
- Concessao e revogacao escrevem na auditoria append-only. A expiracao ja nasce
  registrada no evento de concessao e passa a valer automaticamente pelo horario do
  servidor.
- A pendencia continua listada e contada durante o bypass.

### Rotas

```text
GET    /custos-recebiveis/obrigacoes/minhas
GET    /custos-recebiveis/obrigacoes/bypass
POST   /custos-recebiveis/obrigacoes/bypass
DELETE /custos-recebiveis/obrigacoes/bypass/:id
POST   /custos-recebiveis/obras/:obraId/competencias/:competencia/reabertura
```

## Fechamento de prontidao operacional

Antes da ativacao controlada em dev foi concluido o fluxo que alimenta
`cr_responsaveis_obra`, fonte obrigatoria do motor de obrigacoes:

- configuracao por obra de um responsavel e de substitutos;
- somente usuarios ativos previamente vinculados em `usuarios_obras` sao elegiveis;
- competencia inicial igual ou posterior ao mes corrente, impedindo cobranca
  retroativa;
- somente um papel ativo por usuario e apenas um responsavel principal por obra;
- troca do responsavel encerra o vinculo anterior sem apagar o historico;
- encerramento manual exige justificativa;
- criacao e encerramento exigem `Idempotency-Key`, transacao e auditoria;
- consulta da auditoria append-only por obra, limitada ao mesmo escopo operacional.

Rotas:

```text
GET   /custos-recebiveis/obras/:obraId/responsaveis
POST  /custos-recebiveis/obras/:obraId/responsaveis
PATCH /custos-recebiveis/responsaveis/:id/encerrar
GET   /custos-recebiveis/obras/:obraId/auditoria
```

O frontend possui as abas `Configuracoes` e `Auditoria`, exibidas somente pelas
permissoes `custos_recebiveis.configuracoes.gerenciar` e
`custos_recebiveis.auditoria.visualizar`.

## Regras de evolucao

- Cada fase funcional deve ser entregue e aceita separadamente.
- Nao executar migrations em ambiente compartilhado sem confirmacao explicita.
- Nao habilitar a feature antes da homologacao.
- Nao criar fallback de permissao ou escopo legado.
- Nao alterar os calculos existentes de Provisionamento, Obras, DRE, Resultado de Obras,
  Compras ou Financeiro.
- Toda mutacao futura deve ser transacional, idempotente quando aplicavel e auditada.

## Validacao das Fases 0, 1, 2, 3 e 4

Executar:

```powershell
cd C:\Fluxy\backend
node src/modules/custosRecebiveis/tests/validarFase0.js
node src/modules/custosRecebiveis/tests/validarFase1.js
npm.cmd run test:custos-recebiveis-fase2
npm.cmd run test:custos-recebiveis-fase3
npm.cmd run test:custos-recebiveis-fase4
npm.cmd run test:custos-recebiveis-prontidao
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

Antes da homologacao visual em dev, a feature deve ser habilitada somente mediante
confirmacao explicita. A migration de desenvolvimento ja foi executada; nenhuma
migration foi executada em producao.
