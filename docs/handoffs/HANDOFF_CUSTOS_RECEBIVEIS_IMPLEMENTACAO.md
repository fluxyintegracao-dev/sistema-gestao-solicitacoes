# Handoff - Custos e Recebiveis

## Estado atual

- Branch: `dev-v2`.
- Fases concluidas no codigo: Fase 0 - fundacao e Fase 1 - leitura e planilha micro.
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
remoto:

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
- fases de planejamento mensal, comparativo, realizado, obrigacoes, exportacoes e
  configuracoes ainda nao iniciadas.

## Proximo passo exato

1. revisar o diff e criar o commit da Fase 1 na `dev-v2`;
2. o usuario envia a `dev-v2` e atualiza a EC2 de desenvolvimento;
3. antes de iniciar os testes, o usuario confirma separadamente a execucao da migration
   e a habilitacao de `CUSTOS_RECEBIVEIS` em dev;
4. homologar escopo, permissao, modelo, validacao, idempotencia, reimportacao,
   publicacao e responsividade;
5. manter a feature desabilitada em producao;
6. somente o usuario executa a migracao para `main` e as atualizacoes de EC2.
