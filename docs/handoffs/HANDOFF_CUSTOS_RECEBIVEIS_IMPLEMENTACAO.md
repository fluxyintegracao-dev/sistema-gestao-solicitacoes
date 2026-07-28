# Handoff - Custos e Recebiveis

## Estado atual

- Branch: `dev-v2`.
- Fases concluidas no codigo: Fase 0 - fundacao, Fase 1 - leitura e planilha micro,
  Fase 2 - planejamento, medicao, dashboard, comparativo e reabertura e Fase 3 -
  realizado, reconciliacao e exportacoes.
- Feature `CUSTOS_RECEBIVEIS`: cadastrada com `enabled: false`.
- Dependencias: `OBRAS` e `FINANCEIRO`.
- Frontend implementado, mas oculto enquanto a feature estiver desabilitada.
- Nenhuma migration foi executada em ambiente local compartilhado, dev ou producao.
- Nenhum arquivo de `apropriacoes` ou modelo legado protegido foi alterado.
- Nenhum acesso a EC2 foi realizado.
- Migracao para `main` e atualizacoes de EC2 sao responsabilidade exclusiva do usuario.

## Implementado

- grupo de permissoes `CUSTOS_RECEBIVEIS`, com 8 areas e 24 permissoes;
- migration aditiva com 14 tabelas exclusivas `cr_*` e `down` em ordem segura;
- 14 models Sequelize registrados no agregador central;
- associacoes somente de leitura para os modelos legados consumidos;
- esqueleto backend em `backend/src/modules/custosRecebiveis/`;
- endpoint tecnico `GET /custos-recebiveis/status`;
- feature flag aplicada ao prefixo inteiro, sem bypass de SUPERADMIN quando desligada;
- permissao de acesso estritamente explicita, mantendo apenas o bypass previsto para SUPERADMIN;
- policy propria de escopo:
  1. SUPERADMIN;
  2. `custos_recebiveis.escopo.todas_obras`;
  3. vinculos de `usuarios_obras`;
- acesso direto fora do escopo preparado para retornar 403 e registrar evento de seguranca;
- model `CrAuditoria` protegido contra UPDATE e DELETE pelo ORM.

## Fase 1 implementada

- listagem das obras limitada pela policy propria de escopo;
- consulta do workspace micro, versoes, itens, apropriacoes macro somente leitura e
  historico das ultimas importacoes;
- geracao do modelo XLSX com as abas `ESTRUTURA_MICRO`, `MACRO_REFERENCIA` e
  `INSTRUCOES`;
- validacao previa sem escrita, com limite de 10 MB e 10.000 linhas;
- validacao do cabecalho, numeros nao negativos, duplicidades, pais, ciclos e vinculos
  macro;
- importacao transacional somente em tabelas `cr_*`;
- versionamento por obra e motivo obrigatorio a partir da segunda versao;
- idempotencia pelo par `obra_id + arquivo_hash`;
- publicacao atomica, substituindo a versao publica anterior;
- justificativa obrigatoria quando a divergencia absoluta micro x macro superar 5%;
- auditoria dos eventos `PLANO_MICRO_IMPORTADO` e `PLANO_MICRO_PUBLICADO`;
- rota frontend unica `/custos-recebiveis`;
- abas `Obras` e `Importacoes`, com contexto preservado na query string;
- layout compacto e responsivo para notebook, tablet e smartphone;
- menu, rota e APIs protegidos pela feature flag e por permissoes explicitas;
- ordem backend: feature do prefixo -> acesso geral do modulo -> permissao da acao ->
  escopo da obra -> processamento do upload.

## Fase 2 implementada

- dashboard consolidado por competencia, com previsto x realizado por macro e estado
  operacional das obras do escopo;
- assistente mensal em tres etapas para recebiveis, custos e revisao/finalizacao;
- obra publica com previsao e medicao consolidada por item micro;
- obra privada com recebiveis originados em parcelas contratuais;
- parcela vinculada a titulo de Contas a Receber aparece uma unica vez como titulo,
  sem somar parcela e titulo;
- obra privada nao exibe medicao e o backend rejeita consolidacao por chamada direta;
- custos, recebiveis e medicoes limitados aos itens folha da versao micro publicada;
- calculos financeiros repetidos no backend, sem confiar no total enviado pelo
  frontend;
- competencia finalizada imutavel;
- finalizacao exige `Idempotency-Key`, usa bloqueio e retorna idempotencia quando ja
  concluida;
- snapshot da versao micro, totais, usuario e data gravados na competencia;
- reabertura por solicitacao e decisao separadas, com motivo, prazo futuro e auditoria;
- edicao de competencia reaberta permitida somente enquanto a aprovacao estiver
  vigente;
- comparativo com `NEUTRO`, `SEM_PREVISAO`, `A_REALIZAR`, `DENTRO` e `ESTOURO`;
- todas as novas rotas mantem feature -> acesso geral -> permissao da acao -> escopo;
- todas as mutacoes escrevem somente em `cr_*`.

## Fase 3 implementada

- projetor do realizado alimentado exclusivamente por movimentos `BAIXA` ativos de
  titulos `PAGAR`;
- competencia determinada por `data_movimento`;
- rateio proporcional pelo titulo, com fallback para apropriacao do titulo, rateio da
  solicitacao e apropriacao direta da solicitacao;
- filtro antecipado de titulos candidatos por obra e rateio, evitando varrer todas as
  baixas do sistema;
- vinculo automatico a item micro somente quando a apropriacao resolve um unico item;
- fila `NAO_MAPEADO` com valor preservado no total;
- reconciliacao manual com motivo e trilha append-only;
- reconciliacao reaplicada pelo projetor em reprocessamentos futuros;
- reprocessamento idempotente, sem nova escrita quando a projecao ja esta atualizada;
- estorno e mudanca de origem neutralizam a projecao sem apagar o registro;
- dashboard e comparativo somam somente projecoes com movimento ainda ativo;
- cadeia solicitacao, pedido, titulo e baixa exibida para rastreabilidade, sem transformar
  os tres primeiros em realizado;
- exportacoes `csv` e `xlsx` para medicao/recebiveis, custos previstos, comparativo,
  realizado, solicitacoes/titulos e resumo executivo;
- exportacoes usam a mesma policy de escopo do modulo;
- CSV protegido contra formula injection;
- abas responsivas `Custo realizado` e `Exportacoes`, com acoes condicionadas as
  permissoes explicitas;
- nenhuma escrita adicionada em Financeiro, Compras, Solicitacoes, Obras ou
  `apropriacoes`.

## Arquivos alterados fora do modulo

- `backend/src/services/moduleConfigService.js`: registra a feature desabilitada e suas dependencias.
- `backend/src/constants/moduloPermissoes.js`: registra as permissoes data-driven.
- `backend/src/models/index.js`: registra models e associacoes.
- `backend/src/routes.js`: monta o esqueleto backend sob a feature flag.
- `backend/migrations/202607280002_custos_recebiveis_fundacao.js`: cria somente tabelas `cr_*`.
- `backend/scripts/validarCompraCotacaoEnvio.js`: remove dependencia indevida da contagem
  global e preserva a verificacao da permissao funcional de Compras.
- `backend/scripts/validarDocumentacao.js`: mapeia o novo modulo ao documento canonico.
- `AGENTS.md`: atualiza as metricas do registro central.
- `docs/seguranca/autenticacao_autorizacao.md`: atualiza metricas e documenta a excecao
  segura ao fallback legado.
- `docs/modulos/custos-recebiveis/README.md`: registra fronteiras e estado real da Fase 0.

Na Fase 1, os unicos arquivos funcionais fora da pasta propria do modulo foram:

- `frontend/src/App.jsx`: registra a rota protegida;
- `frontend/src/layout/Layout.jsx`: registra o item unico de menu e delimita o ajuste
  responsivo do shell somente para a rota do modulo;
- `frontend/src/index.css`: retira o menu lateral oculto do fluxo somente nessa rota
  em smartphones, evitando que ele reserve 304 px fora da tela.

As atualizacoes documentais deste README e deste handoff registram o estado real da
entrega.

## Validacoes executadas

Passaram:

- `node src/modules/custosRecebiveis/tests/validarFase0.js`;
- `node src/modules/custosRecebiveis/tests/validarFase1.js`;
- `npm.cmd run test:custos-recebiveis-fase2`;
- `npm.cmd run test:custos-recebiveis-fase3`;
- `npm.cmd run test:security-hardening`;
- `npm.cmd run test:importacao-titulos`;
- `npm.cmd run test:payments`;
- `npm.cmd run test:smoke-sst`;
- `npm.cmd run test:compra-cotacao-envio`;
- `npm.cmd run test:compra-remanejamento`;
- `npm.cmd run test:docs`;
- `npm.cmd run build` no frontend.

O registro central permanece com 19 grupos, 89 areas e 299 permissoes.

Tambem passou a verificacao visual local com APIs simuladas, sem banco e sem ambiente
remoto. Na Fase 2 foram validados:

- dashboard com os dois blocos operacionais e progresso por macro;
- navegacao das tres etapas do planejamento publico;
- obra privada finalizada sem painel de medicao;
- titulo e parcela contratual apresentados como origens exclusivas;
- painel de solicitacao e decisao de reabertura;
- comparativo com os estados de execucao e destaque dos desvios;

Na Fase 3, a validacao automatizada sem banco confirmou:

- rateio com preservacao do valor e dos centavos;
- baixa inativa neutralizada uma unica vez;
- pedido, solicitacao e titulo impedidos de entrar no realizado;
- valor nao mapeado preservado;
- contratos das rotas, permissoes, abas e exportacoes da Fase 3;
- nenhuma chamada a banco, migration ou ambiente remoto durante o QA.

Na Fase 1 ja haviam sido validados:

- notebook em 1366 x 768, sem overflow horizontal;
- tablet em 768 x 1024, com tabelas convertidas em registros empilhados;
- smartphone em 390 x 844, usando toda a largura do viewport;
- abas `Obras` e `Importacoes` navegaveis pela query string;
- botoes de importacao bloqueados enquanto nenhum arquivo esta selecionado;
- nenhum erro ou aviso registrado no console do navegador.

## Pontos de parada mantidos

- migration ainda nao executada em ambiente compartilhado;
- feature ainda desabilitada;
- nenhuma atualizacao realizada na EC2;
- nenhuma migracao realizada para `main`;
- homologacao visual com dados reais pendente porque depende da migration e da
  habilitacao controlada da feature em dev;
- Fase 4 (obrigacoes e bloqueio) ainda nao iniciada.

## Proximo passo exato

1. revisar o diff e criar o commit da Fase 3 na `dev-v2`;
2. o usuario envia a `dev-v2` e atualiza a EC2 de desenvolvimento;
3. antes de iniciar os testes integrados, o usuario confirma separadamente a execucao da migration
   e a habilitacao de `CUSTOS_RECEBIVEIS` em dev;
4. homologar escopo, permissoes, realizado, rateios, nao mapeados, reconciliacao,
   estornos, exportacoes e responsividade;
5. manter a feature desabilitada em producao;
6. apos aceite da Fase 3, iniciar a Fase 4 sem habilitar a feature em producao;
7. somente o usuario executa a migracao para `main` e as atualizacoes de EC2.
