# FLUXY - Roadmap Estrategico De Longo Prazo

Versao: 1.1
Status: Documento de referencia estrategica principal
Objetivo: orientar a evolucao do FLUXY como plataforma corporativa principal da construtora.

Este documento deve ser tratado como uma das principais referencias do projeto. Ele orienta decisoes de arquitetura, priorizacao de modulos, desenho de integracoes, governanca de dados e evolucao do produto no longo prazo.

## 1. Visao De Longo Prazo

### Proposito

O FLUXY deve se tornar a principal plataforma tecnologica da empresa, centralizando processos, dados, governanca, auditoria e inteligencia operacional.

A visao nao e apenas substituir sistemas isolados.

A visao e construir um ecossistema integrado capaz de suportar:

- Operacao diaria da construtora
- Crescimento organizacional
- Governanca corporativa
- Auditorias internas e externas
- Compliance
- Due diligence
- Captacao de investimentos
- Fundos de investimento
- Bancos
- Investidores nacionais
- Investidores internacionais
- Eventual preparacao para abertura de capital

### Camada De Inteligencia Corporativa

O objetivo de longo prazo e que, a partir dos registros operacionais, financeiros, fiscais, contratuais, patrimoniais, comerciais e de obra, o FLUXY se torne uma camada de inteligencia para a empresa.

Isso significa que cada registro criado no sistema deve fortalecer a capacidade da empresa de:

- Entender sua operacao em tempo real
- Medir custo, prazo, produtividade, risco e resultado
- Identificar desvios operacionais e financeiros
- Apoiar decisoes executivas
- Produzir indicadores confiaveis
- Alimentar analises, automacoes e recursos futuros de IA
- Reduzir dependencia de controles paralelos, planilhas e memoria operacional

O sistema deve evoluir de um registrador de processos para uma base institucional de conhecimento e inteligencia empresarial.

### Uso Mobile E Publicacao Em Lojas

O FLUXY deve ser projetado considerando uso recorrente via mobile, especialmente para rotinas operacionais de obra, aprovacao, anexos, comprovantes, comunicacao, diario de obra, fotos, estoque, patrimonio e acompanhamento executivo.

A estrategia mobile deve considerar publicacao oficial nas lojas:

- Apple App Store
- Google Play Store

O uso mobile e prioritario principalmente para usuarios de campo, gestores, aprovadores e rotinas que dependem de registros no momento em que o fato operacional acontece.

## 2. Principios Arquiteturais

Todo novo modulo devera seguir os seguintes principios.

### Modularidade

Cada modulo deve possuir:

- Backend proprio
- Frontend proprio
- Rotas proprias
- Services proprios
- Permissoes proprias
- Auditoria propria
- Testes e validacoes proprias
- Documentacao propria

### Baixo Acoplamento

Modulos nao devem depender diretamente de tabelas internas de outros modulos.

Integracoes devem ocorrer atraves de:

- Services
- Adapters
- APIs internas
- Eventos internos, quando aplicavel
- Contratos bem definidos

### Auditoria

Toda operacao relevante deve registrar:

- Quem realizou
- Quando realizou
- O que foi alterado
- Valor anterior
- Valor novo
- Origem da alteracao
- Entidade afetada
- Contexto operacional da decisao

### Multiempresa

Todo modulo deve nascer preparado para:

- Holding
- Empresas do grupo
- Filiais
- SPEs
- Consolidacao e visao por empresa

### Multiobra

Todo modulo deve suportar:

- Obras simultaneas
- Obras publicas
- Obras privadas
- Centros de custo independentes
- Controle por obra, centro de custo e apropriacao

### Escalabilidade

Projetar para:

- Centenas de usuarios
- Milhoes de registros
- Decadas de historico
- Crescimento modular sem reescrever o core
- Consultas analiticas e operacionais em bases grandes

### Contratos Entre Sistemas

Quando um dominio for separado fisicamente do FLUXY Core, a comunicacao deve ocorrer por contratos versionados e auditaveis.

Isso inclui:

- APIs
- Payloads documentados
- Eventos
- Chaves de correlacao
- Logs de integracao
- Estrategia de retry
- Idempotencia
- Regras claras de autoridade de dados

## 3. Dominios Estrategicos Do FLUXY

Estrutura conceitual futura.

### FLUXY Core

Responsavel pelos dados mestres e pela autoridade central da plataforma.

Componentes:

- Usuarios
- Empresas
- Obras
- Setores
- Permissoes
- Parceiros
- Fornecedores
- Clientes
- Contratos
- Configuracoes
- Auditoria
- Integracoes
- Governanca de dados

### FLUXY Operacoes

Responsavel pela execucao operacional.

Componentes:

- Solicitacoes
- Compras
- Estoque
- Patrimonio
- Diario de Obra
- Cronograma
- Producao
- Apropriacoes
- Consumo por obra

### FLUXY Financeiro

Responsavel pela gestao financeira.

Componentes:

- Contas a pagar
- Contas a receber
- Fluxo de caixa
- Conciliacao
- Bancos
- PIX
- CNAB
- Boletos
- Cartoes
- Provisionamento
- Pagamentos em massa
- Relatorios executivos

### FLUXY Fiscal

Responsavel pelo dominio tributario e documental.

Componentes:

- NF-e
- NFS-e
- CT-e
- MDF-e
- Manifestacao
- Apuracao
- Retencoes
- Creditos fiscais
- Obrigacoes fiscais
- Conferencia fiscal
- Auditoria fiscal

### FLUXY RH

Componentes:

- RH
- DP
- SST
- SST documental simplificado
- Colaboradores
- Documentos
- Apuracoes
- Fechamentos

### FLUXY Experience

Componentes:

- CRM
- Portal do Cliente
- Portal do Corretor
- Sites
- Marketing
- Atendimento
- Jornadas digitais externas

O FLUXY Experience deve ser registrado como um sistema literalmente separado do projeto FLUXY Core. Ele possui fronteira propria de produto, runtime, experiencia de usuario e evolucao.

A comunicacao entre FLUXY Core e FLUXY Experience deve acontecer por contratos formais para receber e enviar informacoes, sem compartilhamento livre de tabelas internas.

Diretrizes para essa fronteira:

- O Core permanece autoridade para dados institucionais, operacionais, financeiros, fiscais, permissoes e governanca.
- O Experience pode operar jornadas externas, portais, campanhas, atendimento e captacao.
- A integracao deve ocorrer por APIs, eventos e contratos versionados.
- Todo trafego relevante deve ter logs, correlacao e rastreabilidade.
- Dados sensiveis devem respeitar LGPD e regras de minimo necessario.
- Mudancas em contratos devem ser planejadas para nao quebrar nenhum dos lados.

### FLUXY Analytics

Componentes:

- BI
- DRE
- Fluxo de caixa
- Indicadores
- Custos
- Paineis executivos
- Analises preditivas
- Alertas gerenciais
- Inteligencia operacional

## 4. Modulo De Estoque

### Objetivo

Controlar materiais desde a compra ate o consumo em obra.

### Estrutura Principal

#### Estoque Central

Responsavel pelo recebimento principal.

#### Estoque De Obra

Responsavel pelo consumo operacional.

### Funcionalidades

#### Cadastro De Materiais

- Codigo
- Descricao
- Categoria
- Unidade
- Fabricante
- Fornecedor padrao

#### Locais De Estoque

- Central
- Almoxarifado
- Depositos
- Obras

#### Entradas

Origens:

- Compras
- NF-e
- Transferencias
- Ajustes

#### Saidas

Motivos:

- Consumo
- Transferencia
- Perda
- Baixa

#### Transferencias

- Central para obra
- Obra para central
- Obra para obra

#### Inventario

- Contagem fisica
- Ajustes
- Divergencias

#### Requisicoes

- Solicitacao de material
- Aprovacao
- Separacao
- Entrega

#### Integracoes

Compras:

- Entrada automatica.

Fiscal:

- Recebimento por NF-e.

Financeiro:

- Custos.

Diario de Obra:

- Consumo diario.

Cronograma:

- Comparacao planejado x realizado.

### Diretriz Complementar

O estoque deve nascer com trilha de movimentacao imutavel. Saldo atual pode ser materializado para performance, mas a verdade operacional deve estar no historico de movimentos.

## 5. Modulo Patrimonial

### Objetivo

Controlar bens permanentes da empresa.

### Funcionalidades

#### Cadastro Patrimonial

- Tombamento
- Categoria
- Valor
- Data de aquisicao
- Documento fiscal de origem
- Estado de conservacao
- Status operacional

#### Alocacao

- Empresa
- Obra
- Setor
- Responsavel

#### Movimentacoes

- Transferencia
- Emprestimo
- Retorno
- Alocacao temporaria

#### Manutencoes

- Preventivas
- Corretivas
- Historico de manutencao
- Custos associados

#### Baixas

- Venda
- Perda
- Descarte
- Roubo/furto
- Sucata

#### Integracoes

- Fiscal
- Financeiro
- Contratos
- Compras
- Estoque, quando um item comprado ou estocado se tornar bem patrimonial

### Diretriz Complementar

Patrimonio deve ser separado de estoque. Estoque controla materiais e itens consumiveis; patrimonio controla bens individualizados e rastreaveis.

## 6. Modulo Diario De Obra

### Objetivo

Registrar a execucao diaria da obra.

### Funcionalidades

#### Diario Digital

- Data
- Responsavel
- Equipe
- Obra
- Frente de servico

#### Atividades

- Servicos executados
- Quantidades
- Localizacao
- Evidencias

#### Mao De Obra

- Equipes
- Produtividade
- Presenca
- Ocorrencias

#### Equipamentos

- Utilizacao
- Horas
- Paradas
- Responsavel

#### Materiais

Integracao direta com estoque.

#### Ocorrencias

- Chuvas
- Paralisacoes
- Acidentes
- Interferencias
- Impedimentos

#### Fotos

- Registro fotografico
- Geolocalizacao
- Linha do tempo
- Vinculo com frente de servico

### Diretriz Mobile

O Diario de Obra e um dos principais casos de uso mobile. Ele deve funcionar bem em campo, com captura rapida, fotos, anexos e operacao simples.

## 7. Modulo Cronograma Fisico-Financeiro

### Objetivo

Comparar planejamento e execucao.

### Componentes

#### Planejamento

- Estrutura EAP
- Etapas
- Servicos
- Marcos
- Baseline

#### Fisico

- Percentual executado
- Medicoes
- Avanco por etapa
- Desvios de prazo

#### Financeiro

- Previsto
- Comprometido
- Pago
- Realizado
- Projetado

#### Integracoes

- Estoque
- Diario de Obra
- Financeiro
- Compras
- Fiscal
- Contratos

## 8. Evolucao De Obra Por Imagens

### Objetivo

Monitorar avanco fisico atraves de imagens.

### Funcionalidades

#### Captura

- Diario de obra
- Aplicativo mobile
- Fotos por frente de servico

#### Organizacao

- Data
- Local
- Frente de servico
- Obra
- Usuario responsavel

#### Comparacao

- Linha do tempo
- Antes e depois
- Evidencia por etapa

#### IA

- Reconhecimento visual
- Estimativa de avanco
- Identificacao de atrasos
- Alertas de divergencia

## 9. Modulo Fiscal Completo

### Objetivo

Transformar o FLUXY em plataforma fiscal corporativa.

### Fase 1 - Caixa Fiscal

NF-e:

- Recepcao
- Download XML

Manifestacao:

- Ciencia
- Confirmacao

### Fase 2 - Documentos Fiscais

NFS-e:

- Recepcao
- Consulta

CT-e:

- Recepcao

MDF-e:

- Recepcao

### Fase 3 - Conferencia Tributaria

Validacao de:

- ICMS
- ISS
- PIS
- COFINS
- IRRF
- CSLL
- INSS

### Fase 4 - Apuracao

Impostos:

- A recolher
- A recuperar

Creditos:

- Credito fiscal
- Recuperacao

### Fase 5 - Auditoria Fiscal

Cruzamentos:

- Compra
- Financeiro
- Estoque
- Patrimonio

IA tributaria:

- Divergencias
- Alertas
- Oportunidades de credito

## 10. Roadmap De Execucao

### Prioridade 1

- Financeiro
- Fiscal
- Estoque
- Patrimonio

### Prioridade 2

- Diario de Obra
- Cronograma Fisico-Financeiro

### Prioridade 3

- Evolucao por imagens
- BI Executivo
- IA Operacional

### Prioridade Permanente

- Mobile app e publicacao nas lojas
- Governanca de dados
- Auditoria
- Seguranca
- Observabilidade
- Contratos entre Core e Experience
- Preparacao para analytics e inteligencia corporativa

## 11. Objetivo Final

Ao final da jornada o FLUXY devera ser capaz de responder:

- Onde o dinheiro foi gasto?
- Quem aprovou?
- Qual obra consumiu?
- Qual material foi utilizado?
- Qual patrimonio esta em uso?
- Qual imposto foi recolhido?
- Qual imposto pode ser recuperado?
- Qual o avanco real da obra?
- Qual o custo real da obra?
- Qual o resultado consolidado do grupo?
- Qual processo esta gerando gargalo?
- Qual risco operacional precisa de atencao?
- Qual decisao foi tomada com base em qual registro?

Com rastreabilidade completa, auditoria completa e governanca suficiente para suportar auditorias externas, processos de due diligence e captacao de investimentos.

## 12. Regras De Uso Deste Documento

- Este roadmap deve orientar novas decisoes estruturais do projeto.
- Todo novo modulo relevante deve ser comparado contra os principios deste documento.
- Decisoes que contrariem este roadmap devem ser registradas como decisao tecnica ou estrategica.
- O FLUXY Core deve continuar sendo protegido contra acoplamentos indevidos.
- O FLUXY Experience deve evoluir como sistema separado, comunicado por contratos.
- A estrategia mobile deve ser considerada parte central da plataforma, nao apenas um complemento.
- A inteligencia corporativa deve ser tratada como consequencia direta da qualidade dos registros.
