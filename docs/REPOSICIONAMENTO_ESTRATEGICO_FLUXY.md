# Reposicionamento Estrategico do FLUXY

## Status

Documento oficial de direcionamento do projeto a partir de 2026-05-25.

Este documento redefine o FLUXY como infraestrutura operacional institucional da empresa. Ele deve orientar arquitetura, roadmap, priorizacao tecnica, governanca, documentacao, homologacao e manutencao.

## Resumo Executivo

O FLUXY evoluiu rapidamente de um sistema de solicitacoes para uma plataforma operacional ampla, com modulos de compras, financeiro, obras, contratos, fiscal, RH/DP, provisionamento, CRM, comercial, comunicacao interna e SST.

Essa velocidade gerou valor operacional, mas tambem aumentou:

- complexidade tecnica;
- quantidade de regras implicitas;
- dependencia do fundador tecnico;
- risco de regressao;
- necessidade de governanca formal;
- necessidade de testes e homologacao estruturada.

A partir deste marco, o projeto deixa de ser tratado prioritariamente como um SaaS em expansao acelerada ou laboratorio continuo de funcionalidades. O FLUXY passa a ser tratado como infraestrutura operacional institucional da empresa.

O novo foco e estabilidade, sustentabilidade, governanca, rastreabilidade, seguranca, continuidade operacional, documentacao e reducao gradual da dependencia do fundador tecnico.

## Novo Posicionamento

O FLUXY deve ser entendido como:

> Plataforma operacional institucional interna para sustentar rotinas criticas da empresa, com arquitetura modular, backend como fonte da verdade, governanca de acesso, trilhas de auditoria e base preparada para expansao futura controlada.

Nesta fase, o objetivo principal nao e aumentar rapidamente o numero de funcionalidades. O objetivo e transformar o sistema em algo:

- sustentavel;
- confiavel;
- auditavel;
- transferivel;
- governavel;
- seguro;
- operacionalmente maduro;
- menos dependente de conhecimento implicito.

## Encerramento da Fase de Expansao Estrutural

O modulo SST deve ser tratado como o ultimo grande modulo estrutural desta fase.

Apos a implantacao do SST:

- novas grandes frentes funcionais nao devem ser iniciadas simultaneamente;
- melhorias novas devem passar por triagem de risco e impacto;
- o foco principal passa a ser consolidacao operacional;
- refactors estruturais devem priorizar seguranca, testes e manutencao;
- funcionalidades experimentais devem ficar fora do core operacional.

## Fase Atual do Projeto

Nome oficial:

> Fase de Consolidacao Operacional e Institucionalizacao

Prioridades desta fase:

1. Finalizar SST no escopo institucional.
2. Estruturar testes automatizados.
3. Formalizar homologacao por modulo.
4. Implantar CI/CD.
5. Formalizar deploy e rollback.
6. Revisar seguranca e permissoes.
7. Modularizar rotas e services criticos.
8. Reduzir arquivos gigantes.
9. Estruturar observabilidade.
10. Criar governanca arquitetural.
11. Documentar regras implicitas.
12. Preparar onboarding tecnico futuro.

## Separacao Oficial: Core Operacional e Lab

### Core Operacional

O core operacional e a parte critica da empresa. Mudancas nessa camada devem ser controladas, testadas, homologadas e auditaveis.

Fazem parte do core:

- Solicitacoes;
- Compras;
- Financeiro;
- Obras;
- Contratos;
- Apropriacoes;
- RH/DP;
- SST;
- Fiscal quando usado em rotina operacional;
- Integracoes criticas;
- Seguranca;
- Auditoria;
- Permissoes;
- Deploy e runtime.

Caracteristicas obrigatorias:

- backend como fonte da verdade;
- nenhuma regra critica apenas no frontend;
- permissoes revisadas antes de liberar;
- migrations controladas;
- testes obrigatorios para mudancas relevantes;
- homologacao formal antes de deploy;
- plano de rollback quando houver risco;
- logs suficientes para diagnostico.

### Camada Experimental / Lab

A camada experimental existe para inovacao, mas nao deve comprometer estabilidade do core.

Podem entrar no Lab:

- IA;
- Fluxy Experience;
- WebXR;
- 3D;
- automacoes avancadas;
- novas integracoes ainda nao maduras;
- prototipos de analise preditiva;
- experimentos de UX que nao alterem fluxo critico.

Caracteristicas:

- desacoplamento do core;
- menor prioridade operacional;
- risco controlado;
- feature flags ou modulos desabilitaveis;
- dados sensiveis protegidos;
- sem obrigatoriedade de impacto em rotinas criticas.

## Posicionamento Comercial Futuro

O FLUXY nao deve ser tratado agora como SaaS multi-tenant amplo, plataforma horizontal pronta ou produto massificado.

O foco atual e consolidar a plataforma institucional interna.

A expansao comercial futura so deve ser considerada depois de maturidade em:

- estabilidade operacional;
- governanca;
- documentacao;
- testes;
- equipe;
- caixa;
- processos;
- sustentacao tecnica;
- seguranca;
- capacidade de implantacao.

## Modelo Comercial Futuro Recomendado

Quando a expansao comercial for retomada, o primeiro modelo recomendado e:

> Single tenant por cliente.

Cada cliente deve ter:

- ambiente isolado;
- banco isolado;
- infraestrutura isolada;
- configuracoes isoladas;
- deploy controlado;
- controle operacional individual.

Mesmo no modelo single tenant, o sistema continua suportando multiempresa dentro do mesmo cliente:

- holdings;
- empresas do grupo;
- intercompany;
- obras;
- centros de custo;
- unidades de negocio;
- segregacao financeira;
- segregacao operacional.

Importante:

> Single tenant por cliente nao significa monoempresa.

## Multi-Tenant

O modelo multi-tenant com base compartilhada nao deve ser implementado no repositorio atual.

Se futuramente fizer sentido, deve ser tratado como nova geracao arquitetural, em novo repositorio ou plataforma, baseada em:

- experiencia operacional real acumulada;
- regras de negocio estabilizadas;
- dores reais identificadas;
- maturidade de seguranca;
- padroes de deploy e suporte ja testados;
- capacidade tecnica de manter isolamento forte.

Isso evita:

- acoplamento prematuro;
- complexidade excessiva;
- abstracoes artificiais;
- divida tecnica estrutural;
- perda de estabilidade do ambiente institucional.

## Atualizacao da Visao Arquitetural

### Principios Mantidos

- backend como fonte da verdade;
- validacao critica no backend;
- modularidade por configuracao;
- migrations controladas;
- auditoria e rastreabilidade;
- anexos/documentos em storage privado;
- permissoes granulares;
- multiempresa dentro da instalacao.

### Principios Reforcados

- nenhuma nova frente estrutural sem plano de estabilizacao;
- nenhuma regra financeira, fiscal, SST ou permissao apenas no frontend;
- evitar fallback, inferencia ou simulacao em dado operacional critico;
- todo dado gerencial deve ser rastreavel ate o fato operacional;
- relatorios devem expor ausencia/inconsistencia de dado, nao preencher lacuna por suposicao;
- novas integracoes criticas precisam de feature flag, log, idempotencia e rollback.

### Direcao Tecnica

O repositorio atual deve priorizar:

- quebrar controllers e services muito grandes;
- criar services menores por dominio;
- reduzir duplicidade de regra entre telas;
- criar suites de teste por modulo critico;
- padronizar validadores;
- padronizar logs de erro;
- documentar contratos internos;
- criar checklist de deploy e rollback;
- revisar permissoes e segregacao por setor;
- mapear pontos com risco de efeito colateral.

## Roadmap Tecnico Atualizado

### Fase 1 - Finalizacao Controlada do SST

Objetivo: concluir o ultimo grande modulo estrutural, sem abrir novas frentes paralelas.

Entregas:

- revisar escopo SST ja implementado;
- validar permissoes SST;
- revisar seguranca de documentos SST;
- manter eSocial como estrutura preparada, sem transmissao oficial ate chegada de documentacao tecnica completa;
- criar checklist de homologacao SST;
- registrar pendencias tecnicas e operacionais.

### Fase 2 - Testes e Homologacao

Objetivo: criar base minima de confianca para mudancas futuras.

Entregas:

- mapa de fluxos criticos;
- testes backend para financeiro, solicitacoes, compras, permissoes e SST;
- testes frontend/e2e para rotinas prioritarias;
- checklist de homologacao por modulo;
- massa de dados controlada para desenvolvimento;
- padrao de evidencia de teste antes de deploy.

### Fase 3 - CI/CD e Deploy Seguro

Objetivo: reduzir risco de deploy manual.

Entregas:

- pipeline de build frontend;
- pipeline de validacao backend;
- validacao de migrations;
- checklist de rollback;
- padrao de tag/release;
- separacao clara entre dev, staging e producao;
- registro de versoes implantadas.

### Fase 4 - Observabilidade e Operacao

Objetivo: saber rapidamente quando algo falhou, onde falhou e qual impacto.

Entregas:

- padrao de logs estruturados;
- monitoramento de API;
- monitoramento de PM2;
- monitoramento de erros frontend;
- alertas de erro 500;
- registro de jobs e integracoes;
- painel de saude operacional.

### Fase 5 - Seguranca e Governanca

Objetivo: proteger dados entre usuarios, setores, empresas e modulos.

Entregas:

- revisao de permissoes por usuario;
- revisao de visibilidade de dashboards/tabelas;
- revisao de dados sensiveis RH/DP, SST, financeiro e fiscal;
- revisao de anexos e URLs assinadas;
- politica de acesso por modulo;
- trilhas de auditoria revisadas;
- matriz de responsabilidade operacional.

### Fase 6 - Reducao de Divida Tecnica

Objetivo: tornar o sistema mais sustentavel para manutencao por outras pessoas.

Entregas:

- quebrar services e controllers monoliticos;
- separar rotas por modulo;
- padronizar respostas de erro;
- reduzir duplicacao de regras;
- criar camada de dominio para regras financeiras criticas;
- padronizar componentes frontend;
- organizar documentacao tecnica por fluxo.

### Fase 7 - Institucionalizacao e Onboarding

Objetivo: reduzir dependencia do fundador tecnico.

Entregas:

- guia tecnico de onboarding;
- manual de deploy e rollback;
- manual de suporte operacional;
- mapa de arquitetura;
- mapa de dados sensiveis;
- matriz de permissoes;
- guia de troubleshooting;
- processo formal de abertura, desenvolvimento, teste e release.

### Fase 8 - Expansao Comercial Controlada

Objetivo: preparar comercializacao sem comprometer o core institucional.

Premissas antes de executar:

- testes minimos funcionando;
- deploy e rollback confiaveis;
- documentacao operacional madura;
- suporte tecnico definido;
- ambientes isolados por cliente;
- onboarding implantador documentado;
- escopo comercial limitado e honesto.

## Impactos Positivos

- menor risco de quebra operacional;
- mais confianca para diretoria e setores;
- reducao de dependencia do fundador tecnico;
- maior seguranca de dados sensiveis;
- melhor rastreabilidade de decisoes;
- maior capacidade de treinar operadores;
- melhor base para auditoria;
- caminho mais solido para futura comercializacao;
- reducao de retrabalho;
- melhor manutencao por equipe futura.

## Impactos Negativos / Trade-offs

- menor velocidade de criacao de novas funcionalidades;
- mais tempo gasto em teste, revisao e documentacao;
- necessidade de disciplina operacional;
- aumento inicial de trabalho invisivel para o usuario final;
- possivel frustracao por postergar ideias de produto;
- necessidade de priorizacao mais dura;
- refactors podem consumir tempo sem criar telas novas;
- exigencia de padrao tecnico mais rigoroso.

## Recomendacoes Praticas

### Estabilizacao

- congelar novas grandes frentes apos SST;
- manter backlog separado entre core e lab;
- criar checklist por deploy;
- mapear fluxos criticos por modulo;
- rodar homologacao antes de cada deploy relevante;
- validar migrations antes de atualizar EC2;
- documentar toda regra alterada.

### Institucionalizacao

- transformar conhecimento implicito em documento;
- criar manual por modulo;
- registrar decisoes arquiteturais;
- padronizar treinamento operacional;
- definir quem pode operar cada rotina;
- criar matriz de acesso por setor;
- revisar periodicamente permissoes.

### Reducao de Divida Tecnica

- priorizar arquivos gigantes;
- separar services por responsabilidade;
- quebrar `routes.js` por modulo;
- criar testes antes de refactors de risco;
- padronizar validadores;
- remover fallback em dado critico;
- documentar contratos entre modulos.

### Preparacao Comercial Futura

- manter o modelo single tenant por cliente;
- documentar escopo minimo de implantacao;
- criar checklist de ativacao por cliente;
- evitar multi-tenant no repositorio atual;
- preparar templates de ambiente;
- definir suporte e SLA antes de vender;
- vender primeiro para clientes com operacao parecida com a origem do FLUXY.

## Regras de Governanca para Novas Demandas

Toda nova demanda deve ser classificada em uma das categorias:

1. Correcao critica.
2. Ajuste operacional do core.
3. Estabilizacao/institucionalizacao.
4. Refactor tecnico.
5. Melhoria de UX.
6. Funcionalidade nova no core.
7. Experimento/lab.

Demandas do tipo 6 e 7 devem ter justificativa explicita e avaliacao de risco.

## Criterios de Aceite para Mudancas no Core

Uma mudanca no core so deve ser considerada pronta quando:

- regra de negocio estiver clara;
- backend validar a regra critica;
- permissoes estiverem revisadas;
- migration for idempotente ou controlada;
- build/teste aplicavel passar;
- documentacao relevante for atualizada;
- houver orientacao de deploy e rollback quando necessario.

## Decisao Oficial

A decisao oficial e:

> O FLUXY entra em fase de consolidacao operacional e institucionalizacao. A expansao funcional acelerada deve ser encerrada apos SST, e o foco principal passa a ser estabilidade, seguranca, governanca, documentacao, testes, continuidade operacional e reducao de dependencia do fundador tecnico.

