# Plano Modulo SST - Saude e Seguranca do Trabalho

> Status: Em execucao - Fases 0 e 1 implementadas em ambiente de desenvolvimento
> Modulo: `SST`
> Produto: FLUXY Core (`sistema_gestao_solicitacoes`)
> Arquitetura: modular, multiempresa, multiobra, configuravel, rastreavel e preparada para IA

> Marco estrategico: o SST passa a ser tratado como o ultimo grande modulo estrutural da fase de expansao. Apos sua implantacao, o foco principal do FLUXY deve migrar para consolidacao operacional, testes, governanca, seguranca, documentacao, observabilidade e reducao de divida tecnica. Ver `docs/REPOSICIONAMENTO_ESTRATEGICO_FLUXY.md`.

---

## 1. Objetivo

Construir o modulo de Saude e Seguranca do Trabalho do FLUXY como uma camada operacional inteligente para construtoras.

O objetivo nao e criar apenas um emissor de eventos do eSocial. O objetivo e criar uma base operacional, documental, analitica e rastreavel para reduzir riscos trabalhistas, juridicos, financeiros e operacionais.

O modulo SST deve centralizar:

- riscos ocupacionais;
- agentes nocivos;
- PGR;
- PCMSO;
- ASO;
- exames ocupacionais;
- entregas de EPI;
- treinamentos obrigatorios;
- acidentes e incidentes;
- documentos SST;
- eventos operacionais;
- estrutura futura para eSocial;
- dashboard e analytics;
- base futura para IA.

---

## 2. Principios obrigatorios

### 2.1 Backend como fonte da verdade

Toda regra critica deve existir no backend:

- permissao;
- escopo por empresa;
- escopo por obra;
- validade de documento;
- vencimento de ASO;
- vencimento de treinamento;
- vencimento de EPI;
- classificacao de risco;
- status operacional;
- regra de evento;
- bloqueios futuros.

O frontend pode melhorar a experiencia, mas nao pode ser a fonte de verdade.

### 2.2 Modularidade real

O modulo deve nascer como modulo independente `SST`, habilitavel/desabilitavel em `MODULOS_HABILITADOS`.

Regras:

- se `SST` estiver desabilitado, menus e rotas nao devem aparecer;
- APIs protegidas devem recusar acesso ao modulo desabilitado;
- superadmin deve conseguir habilitar/desabilitar pelo painel de modulos;
- permissao de area deve controlar acesso por usuario;
- visibilidade de dashboards e tabelas deve controlar apresentacao, nao seguranca.

### 2.3 Sem hardcode operacional

Devem ser configuraveis:

- tipos de risco;
- categorias de risco;
- severidade;
- probabilidade;
- tipos de agente nocivo;
- tipos de exame;
- tipos de ASO;
- tipos de EPI;
- tipos de treinamento;
- NRs;
- status;
- regras de validade;
- eventos operacionais;
- parametros do dashboard.

### 2.4 Multiempresa e multiobra

Toda entidade operacional SST deve permitir vinculo a:

- `empresa_id`;
- `obra_id`;
- `setor_id`, quando aplicavel;
- `funcao_id` ou cargo/funcao do RH/DP, quando aplicavel;
- `colaborador_id`, quando aplicavel.

O objetivo e permitir:

- leitura consolidada do grupo;
- leitura por empresa;
- leitura por obra;
- leitura por centro de custo quando fizer sentido;
- isolamento futuro por permissao.

### 2.5 Rastreabilidade

Toda acao relevante precisa registrar:

- usuario criador;
- usuario atualizador;
- timestamps;
- historico;
- status anterior e novo quando houver mudanca;
- documento origem quando houver;
- evento operacional gerado.

### 2.6 Preparacao para IA

O desenho deve facilitar IA futura:

- entidades semanticas;
- eventos estruturados;
- documentos classificados;
- status claros;
- origem dos dados rastreavel;
- campos textuais separados de campos classificatorios;
- trilha de decisao auditavel.

---

## 3. Estrutura tecnica proposta

### 3.1 Backend

Criar estrutura:

```text
backend/src/modules/sst/
  constants/
  controllers/
  events/
  hooks/
  integrations/
  jobs/
  middlewares/
  models/
  routes/
  services/
  utils/
  validators/
```

Regras:

- modelos importados no `backend/src/models/index.js` ou no padrao modular adotado no projeto;
- rotas agrupadas em arquivo proprio e registradas no roteador principal;
- validadores usando o mesmo padrao atual do backend;
- servicos com regras de negocio;
- controllers sem regra pesada;
- permissao sempre no backend;
- storage via S3 para documentos.

### 3.2 Frontend

Criar estrutura:

```text
frontend/src/modules/sst/
  components/
  hooks/
  pages/
  services/
  utils/
```

Rotas previstas:

```text
/sst
/sst/relatorios
/sst/riscos
/sst/agentes
/sst/pgr
/sst/pcmso
/sst/aso
/sst/exames
/sst/epi
/sst/treinamentos
/sst/acidentes
/sst/documentos
/sst/esocial
/sst/eventos
/sst/configuracoes
```

As rotas devem respeitar:

- modulo `SST` habilitado;
- permissao de area por usuario;
- visibilidade de dashboards/tabelas quando for componente de tela;
- escopo de empresa/obra quando implementado.

---

## 4. Modulo no catalogo FLUXY

Adicionar `SST` ao catalogo de modulos:

```js
{
  key: 'SST',
  label: 'SST',
  packageKey: 'SST',
  packageLabel: 'Pacote SST',
  description: 'Saude e seguranca do trabalho, conformidade, documentos, riscos, exames, EPI, treinamentos e acidentes.',
  enabled: false,
  locked: false,
  recommendedWith: ['RH_DP', 'OBRAS']
}
```

Decisao:

- `SST` deve ser independente;
- `RH_DP` e `OBRAS` sao recomendados, mas nao devem ser dependencia obrigatoria na fase inicial;
- quando houver colaborador, empresa ou obra, o sistema usa cadastros existentes;
- caso uma instalacao nao use RH/DP, o modulo pode futuramente permitir cadastro auxiliar controlado.

---

## 5. Permissoes por usuario

Adicionar grupo `SST` na configuracao de permissoes de areas por usuario.

Permissoes iniciais sugeridas:

```text
sst.dashboard.visualizar
sst.riscos.visualizar
sst.riscos.gerenciar
sst.agentes.visualizar
sst.agentes.gerenciar
sst.pgr.visualizar
sst.pgr.gerenciar
sst.pcmso.visualizar
sst.pcmso.gerenciar
sst.aso.visualizar
sst.aso.gerenciar
sst.exames.visualizar
sst.exames.gerenciar
sst.epi.visualizar
sst.epi.gerenciar
sst.treinamentos.visualizar
sst.treinamentos.gerenciar
sst.acidentes.visualizar
sst.acidentes.gerenciar
sst.documentos.visualizar
sst.documentos.gerenciar
sst.esocial.visualizar
sst.esocial.preparar
sst.analytics.visualizar
sst.analytics.gerenciar
sst.configuracoes.gerenciar
```

Regras:

- `visualizar` permite leitura;
- `gerenciar` permite criar, editar, inativar e anexar quando fizer sentido;
- `esocial.preparar` nao envia eSocial nesta fase, apenas prepara/gera registros internos;
- `configuracoes.gerenciar` deve ficar restrita a superadmin ou gestores autorizados.

---

## 6. Visibilidade de dashboards e tabelas

Adicionar SST ao registro de visibilidade de dashboards/tabelas.

Componentes iniciais:

```text
relatorios.hub.sst
relatorios.sst.operacional
sst.dashboard.cards_conformidade
sst.dashboard.riscos_criticos
sst.dashboard.exames_vencendo
sst.dashboard.treinamentos_vencendo
sst.dashboard.epi_vencendo
sst.dashboard.acidentes_por_obra
sst.dashboard.compliance_score
sst.tabelas.riscos
sst.tabelas.aso
sst.tabelas.exames
sst.tabelas.epi
sst.tabelas.treinamentos
sst.tabelas.acidentes
sst.tabelas.documentos
sst.tabelas.eventos_esocial
```

Importante:

- visibilidade nao substitui permissao;
- se o usuario nao tem permissao, a rota/API deve bloquear;
- se o usuario tem permissao mas a visao esta oculta, o componente nao aparece.

---

## 7. Entidades principais

### 7.1 `sst_riscos`

Responsabilidade: catalogar e controlar riscos ocupacionais por empresa, obra, setor e funcao.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `setor_id`;
- `funcao_id`;
- `nome`;
- `categoria`;
- `severidade`;
- `probabilidade`;
- `nivel_risco`;
- `descricao`;
- `ativo`;
- `criado_por`;
- `atualizado_por`;
- timestamps.

### 7.2 `sst_agentes_nocivos`

Responsabilidade: registrar agentes nocivos ligados a riscos, funcoes ou ambientes.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `risco_id`;
- `tipo_agente`;
- `intensidade`;
- `unidade`;
- `tecnica_avaliacao`;
- `limite_tolerancia`;
- `descricao`;
- `ativo`;
- auditoria.

### 7.3 `sst_pgr`

Responsabilidade: controlar Programa de Gerenciamento de Riscos.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `responsavel`;
- `vigencia_inicio`;
- `vigencia_fim`;
- `status`;
- `documento_id`;
- auditoria.

### 7.4 `sst_pcmso`

Responsabilidade: controlar Programa de Controle Medico de Saude Ocupacional.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `medico_responsavel`;
- `crm`;
- `vigencia_inicio`;
- `vigencia_fim`;
- `observacoes`;
- `documento_id`;
- `status`;
- auditoria.

### 7.5 `sst_aso`

Responsabilidade: controlar ASO por colaborador.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `colaborador_id`;
- `tipo_exame`;
- `apto`;
- `restricoes`;
- `data_exame`;
- `validade`;
- `medico`;
- `crm`;
- `documento_id`;
- `status`;
- auditoria.

### 7.6 `sst_exames`

Responsabilidade: controlar exames ocupacionais.

Tipos iniciais configuraveis:

- admissional;
- periodico;
- retorno ao trabalho;
- mudanca de funcao;
- demissional.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `colaborador_id`;
- `tipo_exame`;
- `data_exame`;
- `validade`;
- `resultado`;
- `status`;
- `documento_id`;
- auditoria.

### 7.7 `sst_epi_entregas`

Responsabilidade: controlar entregas de EPI.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `colaborador_id`;
- `epi_id`;
- `quantidade`;
- `entrega_em`;
- `validade`;
- `assinatura_documento_id`;
- `comprovante_documento_id`;
- `status`;
- auditoria.

### 7.8 `sst_treinamentos`

Responsabilidade: controlar treinamentos obrigatorios.

Exemplos:

- NR10;
- NR18;
- NR35;
- NR33.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `colaborador_id`;
- `codigo_treinamento`;
- `nome`;
- `validade`;
- `instrutor`;
- `carga_horaria`;
- `certificado_documento_id`;
- `status`;
- auditoria.

### 7.9 `sst_acidentes`

Responsabilidade: controlar acidentes e incidentes.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `tipo`;
- `gravidade`;
- `local`;
- `descricao`;
- `colaborador_id`;
- `afastamento`;
- `cat_emitida`;
- `data_ocorrencia`;
- `status`;
- auditoria.

### 7.10 `sst_documentos`

Responsabilidade: central documental SST.

Tipos:

- ASO;
- CAT;
- PGR;
- PCMSO;
- certificado;
- laudo;
- treinamento;
- outro.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `colaborador_id`;
- `tipo`;
- `nome`;
- `descricao`;
- `s3_key`;
- `mime_type`;
- `tamanho`;
- `validade`;
- `status`;
- `criado_por`;
- auditoria.

### 7.11 `sst_eventos_esocial`

Responsabilidade: preparar estrutura futura para eSocial, sem transmissao na fase inicial.

Eventos futuros:

- S-2210;
- S-2220;
- S-2240.

Campos planejados:

- `id`;
- `empresa_id`;
- `obra_id`;
- `colaborador_id`;
- `tipo_evento`;
- `status`;
- `xml_original`;
- `xml_assinado`;
- `protocolo`;
- `recibo`;
- `retorno`;
- `enviado_em`;
- auditoria.

---

## 8. Eventos operacionais SST

Criar camada de eventos operacionais preparada para notificacoes, automacoes, dashboards e IA.

Eventos obrigatorios:

```text
SST_ASO_VENCENDO
SST_COLABORADOR_INAPTO
SST_EPI_VENCENDO
SST_TREINAMENTO_VENCENDO
SST_ACIDENTE_REGISTRADO
SST_RISCO_CRITICO_IDENTIFICADO
SST_EVENTO_ESOCIAL_REJEITADO
SST_DOCUMENTO_EXPIRADO
SST_COLABORADOR_SEM_NR
```

Tabela/event log sugerido:

- `sst_eventos_operacionais`;
- tipo;
- empresa;
- obra;
- colaborador;
- entidade_origem_tipo;
- entidade_origem_id;
- severidade;
- mensagem;
- payload_json;
- status;
- criado_por;
- timestamps.

---

## 9. Dashboard SST

Dashboard inicial:

- colaboradores aptos;
- colaboradores inaptos;
- ASOs vencidos;
- ASOs vencendo;
- exames vencidos;
- exames vencendo;
- treinamentos vencidos;
- treinamentos vencendo;
- EPIs vencendo;
- acidentes por obra;
- riscos criticos;
- conformidade por empresa;
- conformidade por obra;
- compliance score.

Regras:

- calculos no backend;
- frontend apenas apresenta;
- toda metrica deve ser rastreavel ao registro origem;
- nao usar inferencias ocultas;
- quando faltar cadastro, o dashboard deve exibir pendencia de cadastro, nao simular resultado.

---

## 10. Integracoes internas

### 10.1 RH/DP

Integracao obrigatoria:

- colaboradores;
- empresas;
- obras/centros;
- cargos/funcoes quando existentes;
- admissoes;
- desligamentos;
- mudancas de funcao.

Mudanca de funcao deve futuramente disparar validacao SST:

- ASO necessario;
- treinamento necessario;
- EPI necessario;
- risco associado a funcao.

### 10.2 Obras

Usar obras/centros de custo existentes para:

- leitura por obra;
- risco por obra;
- documentos por obra;
- acidentes por obra;
- dashboard por obra.

### 10.3 Compras

Integracao futura:

- estoque de EPI;
- fornecedores;
- pedidos;
- consumo por obra;
- validade de EPI.

Nao implementar na fase 1, apenas preparar modelagem para vinculo futuro.

### 10.4 Financeiro

Integracao futura:

- custo de acidente;
- afastamentos;
- impacto financeiro;
- indicadores de risco.

Nao implementar na fase 1.

### 10.5 eSocial

Preparar estrutura para:

- gerar XML;
- armazenar XML;
- assinar digitalmente;
- enviar webservice;
- consultar processamento;
- armazenar recibos;
- registrar logs.

Nao implementar transmissao nesta fase.

---

## 11. Seguranca

Obrigatorio:

- modulo `SST` habilitavel;
- permissao granular por usuario;
- rotas frontend protegidas;
- APIs backend protegidas;
- documentos via S3 privado e presigned URL;
- logs auditaveis;
- isolamento por empresa e obra;
- validacao de escopo no backend;
- nao expor documentos sensiveis sem permissao.

Observacao importante:

Dados SST podem conter informacao medica e trabalhista sensivel. A permissao precisa ser mais restritiva do que uma permissao operacional comum.

---

## 12. Fases de execucao

### Fase 0 - Fundacao modular e governanca

Objetivo: deixar o modulo registrado, mas sem grandes fluxos operacionais.

Entregas:

- adicionar `SST` ao catalogo de modulos;
- adicionar permissoes SST ao registro central;
- adicionar visibilidade SST ao registro de dashboards/tabelas;
- criar estrutura `backend/src/modules/sst`;
- criar estrutura `frontend/src/modules/sst`;
- criar rotas protegidas basicas;
- criar hub de relatórios SST;
- documentar no guia operacional.

Resultado esperado:

- superadmin consegue habilitar/desabilitar SST;
- superadmin consegue configurar permissao por usuario;
- superadmin consegue configurar visibilidade dos blocos;
- menu aparece somente quando habilitado e permitido.

### Fase 1 - Cadastros e registros operacionais MVP

Objetivo: criar base operacional minima.

Entregas:

- migrations principais;
- modelos principais;
- CRUD de riscos;
- CRUD de ASO;
- CRUD de exames;
- CRUD de treinamentos;
- CRUD de entregas de EPI;
- CRUD de acidentes;
- central de documentos SST com S3;
- dashboard basico.

Resultado esperado:

- empresa consegue registrar e consultar a base SST real;
- dashboard exibe conformidade basica;
- documentos ficam centralizados e rastreaveis.

### Fase 2 - Eventos, alertas e analytics

Objetivo: transformar cadastros em inteligencia operacional.

Entregas:

- eventos operacionais SST;
- vencimentos;
- alertas;
- compliance score;
- relatorio operacional SST;
- filtros por empresa, obra, colaborador e periodo;
- analiticos.

Resultado esperado:

- diretoria e liderancas enxergam risco real;
- obra enxerga pendencias praticas;
- RH/DP e SST trabalham sobre mesma base.

### Fase 3 - Integracoes internas

Objetivo: conectar SST com RH/DP, Obras, Compras e Financeiro.

Entregas:

- validacao por mudanca de funcao;
- leitura de colaborador e obra;
- base futura de EPI com compras;
- base futura de custo de acidente no financeiro.

Resultado esperado:

- SST deixa de ser cadastro isolado;
- eventos do negocio disparam necessidade de SST.

### Fase 4 - eSocial preparado

Objetivo: preparar fluxo tecnico sem ativar transmissao.

Entregas:

- tabela de eventos eSocial;
- status;
- XML original;
- XML assinado;
- retorno;
- recibo;
- logs.

Resultado esperado:

- sistema fica pronto para futura integracao S-2210, S-2220 e S-2240.

### Fase 5 - IA e automacoes

Objetivo: usar dados estruturados para inteligencia.

Possibilidades:

- OCR de ASO;
- leitura automatica de certificado;
- deteccao de colaborador sem NR;
- predicao de risco por obra;
- alertas inteligentes;
- priorizacao de pendencias;
- recomendacao de acao preventiva.

---

## 13. Ordem recomendada para primeira implementacao

1. Registrar modulo `SST` no catalogo.
2. Registrar permissoes SST.
3. Registrar visibilidade SST.
4. Criar skeleton backend `backend/src/modules/sst`.
5. Criar skeleton frontend `frontend/src/modules/sst`.
6. Criar dashboard inicial vazio/controlado por backend.
7. Criar hub de relatorios SST.
8. Criar configuracoes SST iniciais.
9. Criar migrations do MVP.
10. Implementar CRUDs por dominio.
11. Implementar documentos via S3.
12. Implementar eventos operacionais.
13. Implementar analytics basico.
14. Atualizar guia de treinamento.

---

## 14. Registro de execucao

Este quadro deve ser atualizado a cada etapa implementada.

| Etapa | Status | Data | Resumo | Arquivos principais |
|---|---|---:|---|---|
| Planejamento SST | Concluido | 2026-05-23 | Plano do modulo SST registrado com arquitetura, fases, entidades, permissoes e governanca. | `docs/PLANO_MODULO_SST.md` |
| Fase 0 - Fundacao modular | Concluido | 2026-05-23 | Modulo `SST` registrado no catalogo modular, permissoes granulares registradas, visibilidade de dashboards/tabelas registrada, rotas base protegidas e menu/hub de relatorios criados. | `backend/src/services/moduleConfigService.js`, `backend/src/constants/moduloPermissoes.js`, `backend/src/constants/uiVisibilityRegistry.js`, `backend/src/routes.js`, `frontend/src/App.jsx`, `frontend/src/layout/Layout.jsx`, `frontend/src/pages/ModuloRelatorios.jsx` |
| Fase 1 - MVP operacional | Concluido no escopo inicial | 2026-05-23 | Estrutura backend e frontend criada com entidades, migrations, CRUD generico, seletores reais de empresa/obra/colaborador, filtros operacionais, upload de documentos via S3, dashboard basico e configuracoes parametrizaveis. | `backend/migrations/202605230001_sst_base.js`, `backend/src/modules/sst/`, `frontend/src/modules/sst/`, `backend/src/models/index.js` |
| Fase 2 - Eventos e analytics | Em andamento | 2026-05-23 | Eventos operacionais basicos disparados por risco critico, colaborador inapto e acidente registrado; dashboard usa o prazo parametrizado nas configuracoes SST; tela de eventos foi exposta com permissao propria de analytics; rotina manual idempotente gera eventos de vencimento sem duplicar alertas abertos. | `backend/src/modules/sst/services/sstEventService.js`, `backend/src/modules/sst/services/sstService.js`, `frontend/src/modules/sst/pages/SstCrudPage.jsx` |
| Fase 2 - Auditoria e relatorio operacional | Concluido no escopo atual | 2026-05-23 | Adicionada tabela de historico SST para registrar criacao/alteracao, relatorio operacional com eventos abertos, riscos criticos, acidentes recentes, pendencias documentais e bloco de prontidao eSocial sem transmissao. | `backend/migrations/202605230002_sst_historico_relatorio_operacional.js`, `backend/src/modules/sst/models/SstHistorico.js`, `backend/src/modules/sst/services/sstService.js`, `frontend/src/modules/sst/pages/SstRelatorioOperacional.jsx` |
| Fase 3 - Integracoes internas | Pendente | - | RH/DP, Obras, Compras e Financeiro. | - |
| Fase 4 - eSocial preparado | Parcial | 2026-05-23 | Estrutura de evento eSocial e configuracoes de bloqueio tecnico preparadas. A transmissao oficial permanece bloqueada ate chegada dos leiautes/XSDs oficiais dos eventos SST. | `backend/src/modules/sst/models/SstEventoEsocial.js`, `backend/src/modules/sst/constants/sstConstants.js`, `frontend/src/modules/sst/pages/SstConfiguracoes.jsx` |
| Fase 5 - IA e automacoes | Pendente | - | Camada futura de inteligencia. | - |

---

## 15. Decisoes de arquitetura

- `SST` sera modulo independente, recomendado com `RH_DP` e `OBRAS`, mas nao dependente de ambos na fase inicial.
- eSocial nao sera transmitido agora.
- A estrutura de eSocial foi criada apenas como base de preparacao. Transmissao oficial exige documentacao tecnica vigente, certificado digital e validacao no ambiente correto.
- documentos SST devem usar S3 privado.
- permissao de area controla acesso real.
- visibilidade controla apenas apresentacao.
- configuracoes SST parametrizam listas operacionais para reduzir hardcodes.
- backend calcula dashboard e relatorios.
- frontend nao decide conformidade.
- dados medicos/trabalhistas devem ter permissao restritiva.
- IA futura depende de dados estruturados e documentos classificados desde o inicio.

---

## 16. Documentacao tecnica necessaria para transmissao ao governo

Para transmitir arquivos ao governo, a implementacao precisa usar a documentacao oficial vigente do eSocial, e nao apenas a modelagem interna do FLUXY.

Quando a empresa decidir ativar transmissao real, sera necessario obter e anexar ao projeto:

1. Manual de Orientacao do eSocial vigente.
2. Leiautes oficiais vigentes do eSocial, especialmente eventos SST:
   - `S-2210` - Comunicacao de Acidente de Trabalho;
   - `S-2220` - Monitoramento da Saude do Trabalhador;
   - `S-2240` - Condicoes Ambientais do Trabalho.
3. Esquemas XSD oficiais dos eventos.
4. Documentacao de webservices do eSocial.
5. Endpoints de producao restrita e producao.
6. Regras de assinatura XML exigidas pelo eSocial.
7. Certificado digital da empresa:
   - preferencialmente A1 para automacao em servidor, se a politica da empresa permitir;
   - A3 se a empresa exigir operacao manual/dispositivo fisico.
8. Politica interna de autorizacao para envio, retificacao, exclusao e consulta de eventos.

Fonte recomendada:

- Portal oficial do eSocial do Governo Federal;
- area de Documentacao Tecnica;
- pacotes oficiais de leiautes e XSD;
- manuais de orientacao atualizados.

Regra de produto:

- Antes de transmitir, o FLUXY deve validar XML, assinatura, certificado, ambiente e permissao do usuario.
- Nenhum envio oficial deve ocorrer por inferencia.
- O usuario deve saber se esta em producao restrita ou producao.
- Todo recibo, protocolo, erro e retorno deve ficar auditavel.

---

## 17. Pontos de atencao antes de evoluir regras de negocio

1. Confirmar se a empresa quer usar colaboradores do RH/DP como unica origem de pessoas no SST.
2. Confirmar se obra sera obrigatoria para todo registro SST ou apenas quando aplicavel.
3. Confirmar se empresa do grupo sera obrigatoria para todos os documentos e eventos.
4. Definir se ASO/exames podem ser cadastrados sem documento anexo na fase inicial.
5. Definir se acidente exige colaborador ou tambem permite terceiro/visitante.
6. Definir quais tipos de treinamento devem nascer como seed inicial.
7. Definir quem pode visualizar informacao medica sensivel.
8. Definir se o dashboard inicial deve ser executivo, operacional ou ambos.

---

## 18. Proxima acao sugerida

Avancar a Fase 2:

- criar relatorio operacional SST com visao analitica por empresa, obra, colaborador e tipo de pendencia;
- ampliar eventos automaticos para vencimento de ASO, EPI, treinamento e documentos;
- criar job/rotina de varredura de vencimentos sem gerar duplicidade;
- registrar historico detalhado de alteracoes em campos sensiveis;
- ampliar dashboard com filtros executivos por empresa e obra;
- preparar mapa de risco e heatmap operacional;
- manter eSocial apenas como preparacao tecnica ate receber documentacao oficial vigente.

---

## 19. Arquivos tecnicos eSocial recebidos em 2026-05-23

Pasta analisada:

```text
SST ARQUIVOS/
  998566-mensagensdosistema-v2-5.pdf
  entes-federados-responsaveis.csv
  manualorientacaodesenvolvedoresocialv1-15.pdf
  pacote-de-comunicacao-esocial-v1-6.zip
```

Leitura tecnica:

- o pacote de comunicacao contem WSDLs e XSDs de envio/consulta de lotes, retorno de processamento e download de eventos;
- os arquivos ajudam a estruturar a camada de comunicacao futura;
- nao foram identificados, nesta pasta, os XSDs/leiautes especificos dos eventos `S-2210`, `S-2220` e `S-2240`;
- por isso, a geracao XML oficial e a transmissao ao governo seguem bloqueadas por produto.

Decisao implementada:

- criar configuracoes explicitas:
  - `esocial_ambiente`;
  - `esocial_documentacao_oficial_validada`;
  - `esocial_transmissao_habilitada`;
  - `esocial_observacoes_tecnicas`;
- exibir no relatorio operacional se a transmissao esta bloqueada;
- manter eventos eSocial apenas como registros internos preparados;
- nao inferir leiaute, assinatura, regra de transmissao ou validacao sem documento oficial.

---

## 20. Atualizacao tecnica eSocial S-1.3 em 2026-05-26

Nova pasta oficial analisada:

```text
SST ARQUIVOS/2026-04-27_esquemas_xsd_v_s_01_03_00
```

Esta pasta contem os XSDs especificos dos eventos SST prioritarios:

- `evtCAT.xsd` - base do `S-2210`;
- `evtMonit.xsd` - base do `S-2220`;
- `evtExpRisco.xsd` - base do `S-2240`;
- `tipos.xsd` - tipos compartilhados;
- `xmldsig-core-schema.xsd` - assinatura XML futura;
- `evtTabEstab.xsd`, `evtTabLotacao.xsd`, `evtAdmissao.xsd`, `evtTSVInicio.xsd` - dependencias auxiliares.

Decisao arquitetural registrada:

- o dominio SST do FLUXY nao replica XML do governo;
- RH/DP segue como fonte unica de colaboradores;
- `backend/src/modules/sst/` concentra a operacao real;
- `backend/src/modules/esocial/` concentra a integracao tecnica;
- mapeamentos sao versionados por layout em `mappings/s1_3`;
- metadados de layout ficam em `layouts/s1_3` e `layouts/s1_4`;
- transmissao real continua bloqueada nesta fase.

Entregas desta fase:

- ADR criada em `docs/adr/ADR-SST-ESOCIAL-DOMINIO-VS-XML.md`;
- documentacao eSocial criada em `docs/esocial/`;
- modelagem de dominio atualizada em `docs/sst/modelagem-dominio.md`;
- mappers skeleton criados para `S-2210`, `S-2220` e `S-2240`;
- modelos tecnicos eSocial criados para layout, lote, evento e retorno;
- entidades complementares SST criadas para ambiente de trabalho e exposicao.

Plano por fases executado:

1. Inventariar XSDs oficiais e identificar eventos prioritarios.
2. Registrar ADR e documentacao tecnica interna.
3. Criar estrutura modular `modules/esocial` separada do dominio SST.
4. Criar camada de mapeamento versionada `S-1.3`.
5. Criar base de modelos/migration para eventos eSocial sem transmissao.
6. Validar sintaxe dos novos arquivos e build do frontend.

Regra de produto mantida:

- sem SOAP;
- sem assinatura digital;
- sem certificado;
- sem transmissao real;
- sem producao restrita;
- sem geracao XML oficial ate existir fase propria de homologacao eSocial.

---

## 21. Fase 2 - Consolidacao operacional SST em 2026-05-26

Objetivo:

- transformar o SST em camada operacional de conformidade da construtora;
- manter RH/DP como fonte unica de colaboradores;
- manter backend como fonte da verdade;
- manter transmissao eSocial bloqueada;
- preparar eventos, analytics, IA futura e automacoes.

Implementado:

- campos complementares para ASO, exames, treinamentos, EPI e acidentes;
- entidade `SstRegraConformidade`;
- motor de conformidade em `backend/src/modules/sst/compliance/`;
- catalogo de eventos em `backend/src/modules/sst/events/`;
- analytics base em `backend/src/modules/sst/analytics/`;
- readiness de IA em `backend/src/modules/sst/ai/`;
- dashboard SST com indicadores de pendencia e conformidade;
- relatorio operacional com pendencias de conformidade;
- frontend com fluxos de ambientes, exposicoes e regras.

Documentos criados:

- `docs/sst/fase-2-consolidacao-operacional.md`;
- `docs/sst/RELATORIO_FASE_2_CONSOLIDACAO_OPERACIONAL.md`.

Testes executados:

- validacao de sintaxe dos novos arquivos backend;
- validacao de sintaxe dos services/controllers/routes SST;
- build do frontend via Vite.

---

## 22. Fase 3 - Inteligencia operacional e automacoes SST em 2026-05-26

Objetivo:

- transformar o SST em camada operacional inteligente;
- criar workflows, bloqueios, notificacoes, timeline, heatmap e score;
- manter RH/DP como fonte unica de colaboradores;
- manter backend como fonte da verdade;
- manter transmissao real ao eSocial bloqueada.

Implementado:

- modelos `SstPoliticaBloqueio`, `SstBloqueioOperacional`, `SstNotificacao`, `SstPendenciaOperacional`, `SstComplianceScore` e `SstCriticidade`;
- migration `202605260003_sst_inteligencia_operacional_fase3.js`;
- motor de bloqueios em `backend/src/modules/sst/blocking/`;
- workflows em `backend/src/modules/sst/workflows/`;
- central de notificacoes em `backend/src/modules/sst/notifications/`;
- timeline SST em `backend/src/modules/sst/timeline/`;
- analytics executivo e heatmap em `backend/src/modules/sst/analytics/`;
- readiness preditivo em `backend/src/modules/sst/prediction/`;
- pipeline IA documental em `backend/src/modules/sst/ai/`;
- paginas frontend `SstExecutivo`, `SstHeatmap` e `SstTimeline`;
- permissoes e visibilidade ampliadas para novas visoes SST.

Documentos criados:

- `docs/sst/fase-3-inteligencia-operacional.md`;
- `docs/sst/RELATORIO_FASE_3_INTELIGENCIA_OPERACIONAL.md`.

Testes executados:

- validacao de sintaxe dos modelos, migration, services, controller e rotas;
- require runtime de `sstService`;
- build do frontend via Vite.

Regra mantida:

- sem SOAP;
- sem certificado;
- sem assinatura XML;
- sem transmissao real ao governo;
- sem duplicidade de colaboradores fora do RH/DP.

---

## 24. Fase 5 - Homologacao operacional e integracao controlada SST em 2026-05-26

Objetivo:

- estabilizar o dominio SST para uso operacional;
- criar feature flags para integracoes e automacoes criticas;
- controlar integracao com RH/DP e Obras;
- criar logs operacionais;
- criar observabilidade SST;
- criar checklist de homologacao e go-live;
- manter transmissao real ao eSocial bloqueada.

Implementado:

- modelos `SstWorkflowLog`, `SstAutomationLog`, `SstBlockingLog` e `SstIntegrationLog`;
- migration `202605260005_sst_homologacao_operacional_fase5.js`;
- feature flags em `backend/src/modules/sst/feature-flags/`;
- logs em `backend/src/modules/sst/logs/`;
- integracao controlada RH/DP em `backend/src/modules/sst/integrations/rhdp/`;
- integracao controlada Obras em `backend/src/modules/sst/integrations/obras/`;
- homologacao dry-run em `backend/src/modules/sst/homologation/`;
- observabilidade em `backend/src/modules/sst/observability/`;
- pagina frontend `SstObservabilidade`;
- endpoints de checklist, simulacao, flags e logs;
- permissoes e visibilidade de UI para observabilidade e logs.

Documentos criados:

- `docs/sst/fase-5-homologacao-operacional-integracao-controlada.md`;
- `docs/sst/checklists/CHECKLIST_GO_LIVE_SST.md`;
- `docs/sst/RELATORIO_FASE_5_HOMOLOGACAO_OPERACIONAL.md`.

Testes executados:

- validacao de sintaxe dos novos services, migration, controller e rotas;
- require runtime de `backend/src/models`;
- require runtime de `sstService`;
- build completo do frontend via Vite.

Regra mantida:

- sem SOAP;
- sem certificado;
- sem assinatura XML;
- sem transmissao real ao governo;
- sem duplicidade de colaboradores fora do RH/DP;
- integracoes criticas desativadas por padrao ate homologacao formal.

---

## 23. Fase 4 - Orquestracao operacional e IA aplicada SST em 2026-05-26

Objetivo:

- consolidar workflow engine SST;
- estruturar automacoes orientadas a eventos;
- criar recomendacoes operacionais;
- evoluir score corporativo, por empresa, obra e colaborador;
- preparar IA documental por provider;
- criar centro operacional corporativo SST;
- manter transmissao real ao eSocial bloqueada.

Implementado:

- modelos `SstWorkflow`, `SstWorkflowExecucao`, `SstWorkflowAcao`, `SstWorkflowEvento`, `SstRecomendacaoOperacional` e `SstDocumentoAnaliseIa`;
- migration `202605260004_sst_orquestracao_operacional_fase4.js`;
- workflow engine em `backend/src/modules/sst/workflow-engine/`;
- engine de automacoes em `backend/src/modules/sst/automation/`;
- integracoes preparadas com RH/DP e Obras;
- IA documental por contrato/provider em `backend/src/modules/sst/ai/document-analysis/`;
- inteligencia operacional em `backend/src/modules/sst/ai/operational-intelligence/`;
- recomendacoes em `backend/src/modules/sst/recommendations/`;
- score evoluido em `backend/src/modules/sst/scoring/`;
- centro operacional corporativo em `backend/src/modules/sst/analytics/sstCorporateCenterService.js`;
- pagina frontend `SstCentroOperacional`;
- permissoes, menu e visibilidade ampliados.

Documentos criados:

- `docs/sst/fase-4-orquestracao-operacional-ia-aplicada.md`;
- `docs/sst/RELATORIO_FASE_4_ORQUESTRACAO_OPERACIONAL_IA.md`.

Regra mantida:

- sem SOAP;
- sem certificado;
- sem assinatura XML;
- sem transmissao real ao governo;
- sem duplicidade de colaboradores fora do RH/DP.
