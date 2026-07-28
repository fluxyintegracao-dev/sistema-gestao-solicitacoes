# Handoff - Custos e Recebiveis

## Estado atual

- Branch: `codex/custos-recebiveis-fase0`.
- Fase em execucao: Fase 0 - fundacao invisivel.
- Feature `CUSTOS_RECEBIVEIS`: cadastrada com `enabled: false`.
- Dependencias: `OBRAS` e `FINANCEIRO`.
- Nenhuma tela, item de menu ou rota frontend foi criado.
- Nenhuma migration foi executada em ambiente local compartilhado, dev ou producao.
- Nenhum arquivo de `apropriacoes` ou modelo legado protegido foi alterado.

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

Os cinco ultimos arquivos foram alterados depois de confirmacao explicita do usuario.

## Validacoes executadas

Passaram:

- `node src/modules/custosRecebiveis/tests/validarFase0.js`;
- sintaxe dos 24 arquivos envolvidos;
- carregamento de `backend/src/models/index.js`;
- carregamento de `backend/src/routes.js`;
- `git diff --check`;
- `npm.cmd run test:security-hardening`;
- `npm.cmd run test:importacao-titulos`;
- `npm.cmd run test:payments`;
- `npm.cmd run test:smoke-sst`;
- `npm.cmd run build` no frontend.

Depois da confirmacao, `test:compra-cotacao-envio` e `test:docs` tambem passaram. O
registro central ficou com 19 grupos, 89 areas e 299 permissoes.

## Pontos de parada mantidos

- migration ainda nao executada em ambiente compartilhado;
- feature ainda desabilitada;
- frontend ainda sem rota ou item de menu;
- Fase 1 ainda nao iniciada.

## Proximo passo exato

1. revisar e aceitar a Fase 0;
2. somente depois, iniciar a Fase 1 em entrega separada;
3. pedir nova confirmacao antes de executar a migration em qualquer ambiente compartilhado;
4. manter a feature desabilitada ate a homologacao das fases funcionais.
