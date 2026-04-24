# Guia Mestre de Implantacao, Operacao e Treinamento - FLUXY

## 1. Objetivo

Este documento passa a ser a referencia central para:

- implantar o FLUXY em uma nova empresa
- configurar a instalacao inicial sem depender de memoria operacional
- entender a governanca entre modulos, perfis e permissoes
- treinar administradores internos e usuarios finais
- preparar material de apresentacao com prints reais das telas
- padronizar o suporte de primeiro nivel dentro da empresa e de segundo nivel pelo provedor

Ele substitui o uso isolado do antigo guia de deploy e deve ser lido em conjunto com os documentos de modulo quando houver necessidade de aprofundamento.

## 2. Publicos deste documento

### Provedor do sistema

Responsavel por:

- preparar ambiente tecnico
- ativar modulos contratados
- validar seguranca, dominio, CORS e integracoes
- conduzir a implantacao inicial
- apoiar troubleshooting de segundo nivel

### SUPERADMIN do provedor

Responsavel por:

- habilitar ou desabilitar modulos por instalacao
- acessar `Configuracoes > Modulos e Planos`
- aplicar a camada contratual da instalacao

### ADMINISTRADOR da empresa cliente

Responsavel por:

- administrar usuarios
- configurar regras operacionais
- manter cadastros mestres
- distribuir permissoes por area
- servir como suporte interno para os demais usuarios

### Usuarios operacionais

Exemplos:

- solicitante
- responsavel de setor
- compras
- financeiro
- comercial
- RH/DP
- contabilidade

## 3. Modelo do produto na implantacao

O FLUXY atual opera no modelo:

- single-tenant por instalacao
- modulos habilitados por instalacao
- backend como fonte da verdade
- regras de acesso controladas por perfil, setor, obra e permissoes granulares
- `fluxy_ops` como control plane do provedor, sem tornar o `fluxy-core` dependente em tempo real para funcionar

Regra central:

- a contratacao do modulo acontece no nivel da instalacao
- a operacao do cliente acontece dentro dessa instalacao, podendo incluir varias empresas do grupo, varias obras e varios usuarios

## 4. Modulos e dominios atualmente cobertos

O documento deve considerar a implantacao e operacao dos seguintes dominios do produto:

- `SOLICITACOES`
- `COMUNICACAO_INTERNA`
- `BIBLIOTECA_MODELOS`
- `COMPRAS` (rotulo operacional: `Solicitacoes de Compra`)
- `COTACOES`
- `FINANCEIRO`
- `OBRAS`
- `CONTRATOS`
- `COMERCIAL`
- `PROVISOES`
- `RH_DP`
- `INTEGRACAO_SIENGE`

## 5. Arquitetura de ambiente recomendada

### Desenvolvimento

- backend local em `localhost:8000`
- frontend local via Vite
- MySQL local
- opcionalmente Redis e ClamAV locais para validar comportamento produtivo

### Producao

- backend Node.js em EC2 ou VPS Linux
- PM2 para gerenciamento do processo
- Nginx como proxy reverso para `127.0.0.1:8000`
- frontend publicado na Vercel
- MySQL dedicado por instalacao ou ambiente
- S3 para anexos novos
- URLs assinadas para abertura segura de arquivos

### Padrao atual conhecido

- API: `api.jrfluxy.com.br`
- Frontend: `jrfluxy.com.br`, `www.jrfluxy.com.br`, `csc.jrfluxy.com.br`

## 6. Checklist de levantamento antes da implantacao

Antes de subir uma nova instalacao, o provedor deve levantar:

- nome comercial da empresa
- razao social
- dominio do frontend
- dominio da API
- logo da empresa
- modulos contratados
- nome e email do administrador principal
- lista inicial de usuarios
- setores iniciais
- obras iniciais
- necessidade de apropriacao por obra
- necessidade de contratos operacionais
- necessidade de compras com cotacao
- necessidade de financeiro
- necessidade de comercial
- necessidade de provisoes
- necessidade de RH/DP
- necessidade de integracao SIENGE
- contas bancarias iniciais
- categorias financeiras iniciais
- estrutura de parceiros inicial
- necessidade de importacao historica

Sem esse checklist, a implantacao tende a travar na configuracao inicial e nao no deploy tecnico.

## 7. Sequencia tecnica de implantacao

## 7.1 Preparar banco de dados

Criar um banco dedicado por instalacao ou por ambiente.

Recomendacao minima:

- nao compartilhar banco entre cliente A e cliente B
- manter backup automatizado
- validar timezone, charset e collation do MySQL
- garantir credencial propria da aplicacao

## 7.2 Preparar `backend/.env`

Usar `backend/.env.example` como base.

### Variaveis obrigatorias

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `PORT`
- `CORS_ALLOWED_ORIGINS`

### Variaveis fortemente recomendadas

- `JWT_EXPIRES_IN`
- `AUTH_COOKIE_NAME`
- `CSRF_COOKIE_NAME`
- `CSRF_HEADER_NAME`
- `AUTH_COOKIE_SAME_SITE`
- `AUTH_COOKIE_SECURE`
- `AUTH_COOKIE_DOMAIN`
- `TRUST_PROXY`
- `REQUEST_BODY_LIMIT_MB`
- `UPLOAD_MAX_FILE_SIZE_MB`
- `SECURITY_LOG_RETENTION_DAYS`
- `PRODUCT_NAME`
- `COMPANY_NAME`
- `COMPANY_LEGAL_NAME`
- `COMPANY_LOGO_URL`
- `APP_DOMAIN`

### Variaveis de protecao operacional

- `LOGIN_RATE_LIMIT_WINDOW_MINUTES`
- `LOGIN_RATE_LIMIT_MAX_ATTEMPTS`
- `UPLOAD_RATE_LIMIT_WINDOW_MINUTES`
- `UPLOAD_RATE_LIMIT_MAX_ATTEMPTS`
- `CRITICAL_RATE_LIMIT_WINDOW_MINUTES`
- `CRITICAL_RATE_LIMIT_MAX_ATTEMPTS`
- `PASSWORD_RATE_LIMIT_WINDOW_MINUTES`
- `PASSWORD_RATE_LIMIT_MAX_ATTEMPTS`
- `CSV_IMPORT_MAX_ROWS`

### Variaveis opcionais de infraestrutura

- `REDIS_URL`
- `REDIS_REQUIRED`
- `REDIS_KEY_PREFIX`
- `CLAMAV_ENABLED`
- `CLAMAV_HOST`
- `CLAMAV_PORT`
- `CLAMAV_TIMEOUT_MS`
- `CLAMAV_FAIL_CLOSED`
- `CLAMAV_REQUIRED`

### Integracao com `fluxy_ops`

Preencher apenas quando a instalacao estiver integrada ao painel do provedor:

- `OPS_ENABLED`
- `OPS_BASE_URL`
- `OPS_CLIENT_ID`
- `OPS_API_KEY`
- `OPS_HEARTBEAT_INTERVAL_MINUTES`
- `OPS_METRICS_INTERVAL_MINUTES`

### Integracao SIENGE

Preencher apenas quando o cliente tiver contratado a integracao e o ambiente externo estiver pronto.

Opcoes de base:

- `SIENGE_API_BASE_URL`
- ou composicao por `SIENGE_API_HOST` + `SIENGE_API_SUBDOMAIN` + `SIENGE_API_BASE_PATH`

Endpoints e credenciais:

- `SIENGE_ENDPOINT_TITULOS`
- `SIENGE_ENDPOINT_CREDORES`
- `SIENGE_ENDPOINT_CREDOR_DETALHE`
- `SIENGE_ENDPOINT_CREDOR_BANK_INFORMATIONS`
- `SIENGE_ENDPOINT_CREDOR_PIX_INFORMATIONS`
- `SIENGE_USERNAME`
- `SIENGE_PASSWORD`
- `SIENGE_TOKEN`
- `SIENGE_REQUEST_TIMEOUT_MS`

Regra:

- nao preencher credenciais SIENGE em repositorio
- usar arquivo protegido por ambiente
- registrar separadamente qual cliente usa qual subdominio e qual estrategia de autenticacao

## 7.3 Preparar `frontend/.env`

Hoje o frontend usa:

- `VITE_API_URL`

Padrao local:

```bash
VITE_API_URL=/api
```

Em Vercel, apontar para a API correta da instalacao.

## 7.4 Deploy do backend

Sequencia base:

```bash
git pull
cd backend
npm install
pm2 restart backend-solicitacoes --update-env
```

Observacoes:

- o backend executa migrations na inicializacao
- se a API nao responder em `127.0.0.1:8000`, o Nginx retorna `502`
- validar logs do PM2 apos o restart
- validar conexao com banco antes de abrir o frontend

## 7.5 Deploy do frontend

Padrao atual:

- push para o repositorio
- redeploy da Vercel no projeto apontando para `frontend/`

Validar apos o deploy:

- login
- carregamento de menu
- chamada da API autenticada
- download e upload de anexos

## 7.6 Armazenamento de arquivos

Regra atual:

- anexos novos devem ir para S3 quando configurado
- leitura deve ocorrer por URL assinada
- arquivos legados em `/uploads` ainda podem existir

Na implantacao, validar:

- upload de anexo comum
- abertura do anexo
- download em usuario sem permissao
- comportamento de expiracao da URL assinada

## 7.7 Validacao tecnica pos-deploy

Antes de entregar ao cliente:

1. logar com usuario administrador
2. validar menu principal
3. validar `Configuracoes`
4. cadastrar ou abrir uma obra
5. cadastrar parceiro
6. criar solicitacao de teste
7. anexar arquivo de teste
8. se `FINANCEIRO` estiver habilitado, gerar titulo e registrar baixa de teste
9. se `PROVISOES` estiver habilitado, criar provisao de teste
10. se `RH_DP` estiver habilitado, cadastrar colaborador de teste
11. se `INTEGRACAO_SIENGE` estiver habilitado, abrir a tela e validar prontidao

## 8. Cuidados operacionais de seguranca

- nao versionar segredos
- separar banco por ambiente
- manter backup do banco
- revisar CORS e dominio ao trocar instalacao
- validar politica de cookie seguro em producao
- revisar rate limits apos primeiro uso real
- manter trilha de auditoria habilitada
- restringir acessos financeiros, RH/DP e SIENGE ao minimo necessario

## 9. Configuracao inicial apos o primeiro login

Esta e a parte mais importante da implantacao funcional.

Sequencia recomendada:

1. validar modulos contratados
2. cadastrar usuarios principais
3. cadastrar setores
4. configurar status e recebimento por setor
5. cadastrar obras
6. cadastrar parceiros
7. cadastrar tipos e subtipos operacionais
8. montar matriz de permissoes por usuario
9. configurar modulos especializados contratados
10. executar teste integrado de ponta a ponta

## 9.1 `Configuracoes > Modulos e Planos`

Responsavel:

- `SUPERADMIN`

Funcao:

- habilitar ou desabilitar modulos na instalacao

Regras importantes:

- modulo habilitado define o que existe na instalacao
- permissao de usuario so entra em vigor dentro de modulo habilitado
- nao usar esta tela para gerenciamento operacional do cliente

## 9.2 `Configuracoes > Cadastro de Usuarios`

Responsavel:

- `ADMINISTRADOR`
- `SUPERADMIN`

Passo a passo:

1. criar usuarios principais da empresa
2. vincular setor e perfil corretos
3. revisar escopo de obra quando aplicavel
4. orientar troca de senha no primeiro acesso

## 9.3 `Configuracoes > Setores`

Definir a estrutura real da empresa, por exemplo:

- administrativo
- compras
- financeiro
- engenharia
- obra
- comercial
- RH

## 9.4 `Configuracoes > Status por Setor`

Objetivo:

- definir os status operacionais que cada setor pode usar no fluxo de solicitacoes

Treinamento:

- explicar que status nao e enfeite visual
- status influencia leitura, prioridade e rastreabilidade

## 9.5 `Configuracoes > Permissoes por Setor`

Objetivo:

- definir se usuarios podem assumir e atribuir solicitacoes

Usar quando a empresa quer separar:

- quem ve
- quem assume
- quem redistribui

## 9.6 `Configuracoes > Areas Visiveis para OBRA`

Objetivo:

- controlar quais areas aparecem na `Nova Solicitacao` para o contexto da obra

## 9.7 `Configuracoes > Areas por Setor de Origem`

Objetivo:

- limitar para quais setores cada setor pode enviar uma solicitacao

## 9.8 `Configuracoes > Setores Visiveis por Usuario`

Objetivo:

- liberar visualizacao adicional sem mudar o setor principal do usuario

## 9.9 `Configuracoes > Recebimento por Setor`

Objetivo:

- definir se a solicitacao chega primeiro ao administrador ou fica visivel para todos do setor

## 9.10 `Configuracoes > Tipos por Setor (Recebimento)`

Objetivo:

- ligar tipos de solicitacao ao setor correto e ao modo de recebimento esperado

## 9.11 `Configuracoes > Criacao em Todas as Obras`

Objetivo:

- liberar setores que podem abrir solicitacao em qualquer obra

## 9.12 `Configuracoes > Acesso em Todas as Obras`

Objetivo:

- liberar setores que precisam enxergar recursos protegidos por obra sem vinculo manual

## 9.13 `Configuracoes > Acesso ao Financeiro`

Objetivo:

- definir quais usuarios podem operar o modulo financeiro de forma ampla

## 9.14 `Configuracoes > Permissoes RH/DP e SIENGE`

Objetivo:

- montar a matriz fina para equipe de RH e contabilidade

Ponto de treinamento:

- o modulo pode estar habilitado, mas a pessoa so deve ver o que realmente opera

## 9.15 `Configuracoes > Permissoes de Areas por Usuario`

Objetivo:

- controlar o acesso granular por modulo, area, aba e acao

Regra operacional:

- `SUPERADMIN` e `ADMINISTRADOR` seguem com bypass estrutural
- demais usuarios devem ser configurados conforme sua rotina real

## 9.16 `Configuracoes > Tempo de Inatividade`

Objetivo:

- definir logout automatico por inatividade

## 9.17 Cadastros mestre que normalmente entram no mesmo onboarding

- `Obras`
- `Tipos de Solicitacao`
- `Parceiros`
- `Categorias de Parceiro`
- `Subtipos de Contrato`
- `Gestao de Apropriacoes` quando `OBRAS` estiver habilitado
- `Cadastros Financeiros` quando `FINANCEIRO` estiver habilitado

## 9.18 Ajustes administrativos complementares

### `Configuracoes > Cores do Sistema`

Usar para:

- alinhar identidade visual
- padronizar leitura de botoes e status

### `Configuracoes > Configuracoes de Cotacao`

Usar quando `COMPRAS` estiver habilitado para:

- definir regras padrao de cotacao
- ajustar comportamento de encerramento

### `Configuracoes > Status dos Pedidos de Compra`

Usar quando `COMPRAS` estiver habilitado para:

- cadastrar status operacionais
- bloquear ou liberar edicao de pedido conforme etapa

### `Configuracoes > Arquivos Modelos`

Usar quando `BIBLIOTECA_MODELOS` estiver habilitado para:

- estruturar o acervo de modelos
- definir administradores com permissao de upload

## 10. Regra oficial de modularidade

### Diferenca entre modulo habilitado e permissao de usuario

Modulo habilitado:

- define o que existe na instalacao

Permissao por usuario:

- define o que cada pessoa pode operar dentro do que existe

Regra:

- nunca usar permissao de usuario para simular modulo desligado
- nunca obrigar modulo comercialmente so por causa de acoplamento tecnico antigo

### Matriz principal

#### `SOLICITACOES`

- funciona sozinha
- se `CONTRATOS` estiver desligado, campos contratuais somem
- se `OBRAS` estiver desligado, apropriacao principal some

#### `CONTRATOS`

- adiciona contexto contratual na solicitacao
- habilita gestao de contratos operacionais

#### `OBRAS`

- adiciona gestao de obras
- adiciona apropriacoes
- libera gestao administrativa desse cadastro

#### `COMPRAS`

- nome comercial: `Solicitacoes de Compra`
- consome apropriacoes por item
- recomendacao de implantacao: usar junto com `OBRAS` quando houver rateio por obra

#### `FINANCEIRO`

- e o motor central de titulos, baixas, estornos, movimentos e conciliacao
- modulos como `COMERCIAL` e `RH_DP` nao devem criar financeiros paralelos

#### `COMERCIAL`

- usa o financeiro como motor de recebiveis

#### `PROVISOES`

- organiza previsao de desembolso
- nao substitui o financeiro central

#### `RH_DP`

- cuida de colaboradores, documentos, importacoes, apuracao e fechamento
- o fechamento depende do `FINANCEIRO` habilitado

#### `INTEGRACAO_SIENGE`

- opcional por instalacao
- consome titulos do financeiro central
- nao deve ser presumido como automatico em clientes sem SIENGE

## 11. Guia operacional por modulo

Cada modulo abaixo foi escrito no formato:

- objetivo
- telas
- como operar
- pontos de treinamento
- prints sugeridos

## 11.1 Dashboard principal

### Objetivo

Dar leitura executiva do ambiente.

### Como operar

1. abrir o dashboard no inicio do dia
2. revisar vencidos, pendencias e indicadores
3. usar os cards como ponto de entrada para os modulos mais criticos

### Pontos de treinamento

- explicar que o dashboard e leitura, nao substitui a tela operacional detalhada
- validar quais cards importam para cada perfil

### Prints sugeridos

- dashboard com cards e filtros
- dashboard apos dados reais de obras e financeiro

## 11.2 Modulo `SOLICITACOES`

### Telas

- `Solicitacoes`
- `Solicitacoes Arquivadas`
- `Nova Solicitacao`
- `Detalhe da Solicitacao`

### Fluxo operacional recomendado

1. abrir `Nova Solicitacao`
2. selecionar obra e area responsavel
3. escolher tipo de solicitacao
4. informar parceiro quando aplicavel
5. informar apropriacao principal se `OBRAS` estiver habilitado
6. informar valor e vencimento quando o caso exigir
7. anexar arquivos
8. criar a solicitacao
9. acompanhar na listagem e no detalhe
10. quando necessario, gerar conta para o financeiro

### O que treinar em `Nova Solicitacao`

- busca de obra por codigo ou descricao
- area responsavel
- tipo de solicitacao
- parceiro com busca e cadastro rapido
- apropriacao quando aplicavel
- valor e data de vencimento
- descricao objetiva
- anexos

### O que treinar na listagem

- filtros por status, obra, setor e periodo
- leitura das colunas
- diferenca entre lista ativa e arquivada
- exportacao quando aplicavel

### O que treinar no detalhe

- timeline
- comentarios
- anexos
- historico de atribuicao
- bloco financeiro
- comportamento dos campos de contrato e apropriacao conforme modulo habilitado

### Prints sugeridos

- `Nova Solicitacao`
- busca e selecao de parceiro
- listagem de solicitacoes
- detalhe com timeline e card financeiro

## 11.3 Modulo `COMUNICACAO_INTERNA`

### Telas

- `Caixa de Entrada`
- `Caixa de Saida`
- `Detalhe da Conversa`

### Como operar

1. revisar a caixa de entrada diariamente
2. responder pelo detalhe da conversa
3. acompanhar a caixa de saida para confirmar encaminhamentos

### Pontos de treinamento

- diferenca entre conversa recebida e enviada
- uso dos badges de nao vistas
- cuidado com mensagens que exigem resposta operacional

### Prints sugeridos

- caixa de entrada
- caixa de saida
- detalhe da conversa

## 11.4 Modulo `BIBLIOTECA_MODELOS`

### Telas

- `Arquivos Modelos`
- `Arquivos Modelos` em `Configuracoes` para administracao do espaco

### Como operar

1. organizar modelos por pagina ou contexto
2. fazer upload apenas por administradores autorizados
3. orientar usuarios a sempre partir do modelo oficial

### Pontos de treinamento

- diferenca entre consulta da biblioteca e gestao do acervo
- governanca de quem pode subir arquivo

### Prints sugeridos

- tela publica da biblioteca
- tela administrativa da biblioteca

## 11.5 Modulo `COMPRAS` e `COTACOES`

### Telas

- `Solicitacoes de Compra`
- `Nova Solicitacao de Compra`
- `Revisar Solicitacao de Compra`
- `Detalhe da Solicitacao de Compra`
- `Pedidos de Compra`
- `Detalhe do Pedido`
- `Gestao de Insumos`
- `Gestao de Unidades`
- `Gestao de Categorias`
- `Nova Cotacao Avulsa`
- `Fornecedores`
- link publico de resposta de cotacao

### Fluxo operacional recomendado

1. criar a solicitacao de compra
2. adicionar itens
3. apropriar cada item
4. revisar a solicitacao
5. selecionar fornecedores
6. disparar cotacao por link
7. receber respostas
8. encerrar cotacao
9. gerar pedido de compra
10. acompanhar status do pedido

### Pontos de treinamento

- apropriacao por item deve fechar corretamente
- pedido nasce da cotacao, mas pode receber ajuste manual com auditoria
- minimo por item e por pedido pode impactar a escolha do fornecedor
- `COMPRAS` consome apropriacoes, mas nao e dono tecnico desse cadastro

### Prints sugeridos

- nova solicitacao de compra com itens
- rateio por apropriacao
- centro de cotacao
- comparativo de fornecedores
- pedido de compra

## 11.6 Modulo `FINANCEIRO`

### Telas

- `Titulos Financeiros`
- `Nova Conta`
- `Detalhe do Titulo`
- `Cadastros Financeiros`
- `Relatorios Financeiros`
- `Resultado de Obras`
- `Conciliacao OFX`
- `Upload Comprovantes`
- `Comprovantes Pendentes`

### Fluxo operacional recomendado

1. gerar titulo a partir da solicitacao ou criar conta manual
2. revisar parceiro, obra, vencimento e categoria
3. registrar baixa quando o pagamento ou recebimento ocorrer
4. importar OFX da conta correta
5. confirmar conciliacao
6. usar relatorios para leitura previsto x realizado

### O que treinar em `Titulos Financeiros`

- filtros por tipo, status, obra e parceiro
- leitura de saldo
- diferenca entre `ABERTO`, `PARCIAL`, `QUITADO`, `CANCELADO` e `ESTORNADO`

### O que treinar no `Detalhe do Titulo`

- resumo do titulo
- historico e auditoria
- registrar baixa
- estornar baixa
- operacao do gateway SIENGE quando habilitado

### O que treinar em `Cadastros Financeiros`

- contas bancarias
- categorias financeiras
- relacao entre conta do sistema e conta real do extrato

### O que treinar em `Upload Comprovantes` e `Comprovantes Pendentes`

- vinculo do comprovante ao titulo correto
- acompanhamento de pendencias documentais do financeiro
- uso dessas telas como apoio de auditoria e conferencia

### O que treinar em `Conciliacao OFX`

- OFX nao cria titulo
- OFX nao registra baixa sozinho
- primeiro registrar a baixa
- depois importar OFX
- conciliacao pode ser sugerida ou manual
- bloqueio contra reimportacao duplicada

### O que treinar em `Resultado de Obras`

- diferenca entre executado, recebido e falta receber
- leitura de orcamento por classificacao da obra

### Prints sugeridos

- listagem de titulos
- detalhe do titulo
- modal de baixa
- conciliacao OFX
- relatorios financeiros
- resultado de obras

Referencia complementar:

- `docs/MANUAL_FLUXO_OPERACIONAL_FINANCEIRO.md`

## 11.7 Modulo `OBRAS`

### Telas

- `Obras`
- `Detalhe da Obra`
- `Gestao de Apropriacoes`

### Abas principais do detalhe da obra

- dashboard
- orcamento
- custos
- parcelas
- pedidos
- arquivos
- relatorio final

### Como operar

1. cadastrar a obra
2. definir classificacao `PRIVADA` ou `PUBLICA`
3. preencher valor de referencia correto:
   - `VGV` para privada
   - `planilha geral` para publica
4. informar margem de custo esperada
5. revisar orcamento calculado
6. manter apropriacoes da obra
7. acompanhar custos, parcelas e pedidos vinculados

### Pontos de treinamento

- obra e o eixo de consolidacao operacional
- apropriacoes pertencem ao dominio de obras
- o financeiro consome a obra, mas nao substitui sua leitura gerencial

### Prints sugeridos

- listagem de obras
- modal de cadastro/edicao
- detalhe da obra em cada aba
- gestao de apropriacoes
- resultado de obras

## 11.8 Modulo `CONTRATOS`

### Telas

- `Gestao de Contratos`
- apoio contratual dentro de `Nova Solicitacao` e `Detalhe da Solicitacao` quando habilitado

### Como operar

1. manter contratos operacionais cadastrados
2. usar o contrato como contexto quando a solicitacao exigir
3. revisar referencia do contrato no detalhe da solicitacao

### Pontos de treinamento

- `CONTRATOS` adiciona contexto, mas `SOLICITACOES` continua funcionando sem ele
- nao usar contrato como campo obrigatorio em cliente que nao contratou o modulo

### Prints sugeridos

- gestao de contratos
- solicitacao com contexto contratual habilitado

## 11.9 Modulo `COMERCIAL`

### Telas

- `Empreendimentos`
- `Unidades`
- `Mapa de Unidades`
- `Tabelas de Preco`
- `Contratos de Venda`

### Fluxo operacional recomendado

1. cadastrar empreendimento vinculado a obra
2. cadastrar unidades
3. organizar disponibilidade no mapa
4. ativar tabela de preco quando aplicavel
5. registrar contrato de venda
6. gerar agenda financeira
7. acompanhar recebiveis no financeiro

### Pontos de treinamento

- cliente comprador usa `Parceiros`
- corretor tambem usa `Parceiros`, classificado como `CORRETOR`
- o comercial gera recebiveis no financeiro central
- nao ha financeiro paralelo no comercial
- emissao bancaria de boleto continua separada da regra central

### Prints sugeridos

- empreendimento
- unidade
- mapa de unidades
- tabela de preco
- contrato comercial com agenda financeira

## 11.10 Modulo `PROVISOES`

### Telas

- `Dashboard de Previsao`
- `Provisionamentos`
- `Nova Provisao`
- `Detalhe da Provisao`
- `Categorias Macro`

### Fluxo operacional recomendado

1. cadastrar categorias macro
2. abrir `Nova Provisao`
3. informar obra, data prevista, item macro, prioridade, descricao e valor
4. anexar arquivos na criacao quando necessario
5. acompanhar a provisao na lista
6. usar o detalhe para comentarios, historico e novos anexos
7. usar o dashboard para leitura gerencial por periodo, obra e categoria

### Pontos de treinamento

- provisao organiza o previsto, nao o realizado
- comentario fica no detalhe da provisao
- dashboard e leitura gerencial, nao tela de edicao

### Prints sugeridos

- dashboard de previsao
- listagem de provisoes
- nova provisao
- detalhe da provisao com historico e anexos
- categorias macro

## 11.11 Modulo `RH_DP`

### Telas

- `Visao do Modulo`
- `Empresas do Grupo`
- `Colaboradores`
- `Documentos`
- `Importacoes`
- `Apuracao`
- `Fechamentos`

### Fluxo operacional recomendado

1. cadastrar empresas do grupo
2. cadastrar ou importar colaboradores
3. preencher dados de pagamento
4. anexar documentos no detalhe do colaborador
5. usar a pagina `Documentos` para consulta, filtros e pendencias
6. importar jornadas, eventos e descontos
7. gerar apuracao por competencia
8. revisar itens, ajustes e pendencias
9. fechar a competencia
10. conferir titulos gerados no financeiro central

### O que treinar em `Empresas do Grupo`

- diferenca entre instalacao do cliente e empresas operacionais do grupo

### O que treinar em `Colaboradores`

- cadastro manual
- importacao em lote
- tipos de vinculo `CLT` e `NAO_CLT`
- dados bancarios
- detalhe do colaborador
- anexo de documentos concentrado nessa tela

### O que treinar em `Documentos`

- busca por colaborador
- filtros por empresa, obra, vinculo, tipo e validade
- consulta de pendencias
- abertura segura de arquivo
- substituicao de documento existente

### O que treinar em `Importacoes`

- uso do modelo CSV
- validacao por linha
- preview persistido
- confirmacao do lote

### O que treinar em `Apuracao`

- diferenca entre `CLT` e `NAO_CLT`
- uso apenas de lotes confirmados
- leitura do valor bruto, descontos e liquido
- ajustes manuais com log
- conferencia antes do fechamento

### O que treinar em `Fechamentos`

- dependencia do modulo `FINANCEIRO`
- congelamento da competencia
- rastreio entre apuracao e titulo financeiro gerado
- visibilidade do status SIENGE quando a integracao estiver habilitada

### Prints sugeridos

- dashboard RH/DP
- cadastro de colaborador
- detalhe do colaborador com documentos
- painel geral de documentos
- importacoes
- apuracao
- fechamento

## 11.12 Modulo `INTEGRACAO_SIENGE`

### Telas

- `Integracao SIENGE`
- operacao direta no detalhe do titulo financeiro
- operacao direta no detalhe do fechamento RH/DP

### Como operar

1. abrir a tela do modulo
2. validar prontidao tecnica
3. revisar base URL, endpoint e credenciais efetivas
4. revisar fila
5. abrir logs quando houver erro
6. pesquisar parceiro para vincular `creditorId` quando necessario
7. enviar ou reprocessar item elegivel

### Pontos de treinamento

- integracao e opcional por instalacao
- cadastro automatico de credor nao deve ser presumido como ativo
- a fila opera sempre sobre o `TituloFinanceiro` central
- erro de integracao nao apaga o titulo financeiro

### Prints sugeridos

- tela inicial da integracao
- leitura de prontidao
- fila de envio
- logs
- contexto e vinculacao de credor

## 11.13 Cadastros administrativos gerais

### Usuarios

- cadastrar
- editar
- revisar setor, perfil e escopo

### Setores

- montar cadeia operacional real

### Tipos de Solicitacao

- alinhar com fluxo real da empresa

### Parceiros

- central de clientes, fornecedores, credores, corretores e demais entidades externas

### Categorias de Parceiro

- organizar fornecedores e filtros de cotacao

### Subtipos de Contrato

- padronizar cadastros contratuais

### Prints sugeridos

- cada cadastro mestre em tela de lista e tela de criacao/edicao

## 12. Roteiro de treinamento por perfil

## 12.1 SUPERADMIN do provedor

Treinar:

- `Configuracoes > Modulos e Planos`
- leitura de modularidade
- diferenciacao entre contrato comercial e permissao operacional
- governanca de novas instalacoes

## 12.2 ADMINISTRADOR da empresa

Treinar:

- `Configuracoes`
- usuarios
- setores
- tipos
- obras
- parceiros
- permissao por area
- como diagnosticar modulo indisponivel versus falta de permissao

## 12.3 Usuario solicitante

Treinar:

- `Nova Solicitacao`
- listagem
- anexos
- acompanhamento do detalhe

## 12.4 Responsavel de setor

Treinar:

- fila de solicitacoes
- assumir
- atribuir
- responder comentarios
- manter status correto

## 12.5 Compras

Treinar:

- solicitacao de compra
- cotacao
- fornecedores
- pedido

## 12.6 Financeiro

Treinar:

- titulos
- baixa
- estorno
- relatorios
- OFX
- comprovantes
- gateway SIENGE quando contratado

## 12.7 Comercial

Treinar:

- empreendimentos
- unidades
- mapa
- contratos
- relacao com financeiro

## 12.8 RH e Contabilidade

Treinar:

- colaboradores
- documentos
- importacoes
- apuracao
- fechamentos
- leitura de status de integracao

## 13. Checklist de prints para montar apresentacao

Recomendacao:

- tirar os prints em ambiente de homologacao com dados consistentes
- padronizar navegador, zoom e resolucao
- usar exemplos reais, mas anonimizados

### Bloco institucional

- tela de login
- dashboard principal
- menu lateral com modulos habilitados

### Bloco de governanca

- `Configuracoes`
- `Modulos e Planos`
- `Permissoes de Areas por Usuario`
- `Permissoes RH/DP e SIENGE`

### Bloco operacional base

- `Nova Solicitacao`
- `Solicitacoes`
- `Detalhe da Solicitacao`
- `Parceiros`
- `Obras`

### Bloco de compras

- solicitacao de compra
- centro de cotacao
- pedido de compra

### Bloco financeiro

- listagem de titulos
- detalhe do titulo
- modal de baixa
- relatorios
- conciliacao OFX

### Bloco comercial

- empreendimentos
- unidades
- mapa
- contrato de venda

### Bloco provisoes

- dashboard
- lista
- nova provisao
- detalhe

### Bloco RH/DP

- empresas do grupo
- colaboradores
- detalhe do colaborador
- painel de documentos
- importacoes
- apuracao
- fechamentos

### Bloco SIENGE

- tela do gateway
- fila
- logs
- vinculacao de credor

## 14. Plano de implantacao funcional sugerido

## Fase 1 - Fundacao

- usuarios
- setores
- tipos
- obras
- parceiros
- solicitacoes

## Fase 2 - Financeiro e obra

- contas bancarias
- categorias financeiras
- geracao de titulo
- baixa
- OFX
- apropriacoes
- resultado de obras

## Fase 3 - Compras e cotacoes

- insumos
- categorias
- fornecedores
- solicitacao de compra
- cotacao
- pedido

## Fase 4 - Modulos especializados

- comercial
- provisoes
- RH/DP
- integracao SIENGE

## 15. Checklist de entrada em producao

Antes do go-live:

1. validar modulos contratados
2. validar usuarios principais
3. validar setores e tipos
4. validar obras
5. validar parceiros
6. validar contas bancarias e categorias financeiras quando houver `FINANCEIRO`
7. validar apropriacoes quando houver `OBRAS`
8. validar fornecedores e categorias quando houver `COMPRAS`
9. validar empreendimentos e unidades quando houver `COMERCIAL`
10. validar categorias macro quando houver `PROVISOES`
11. validar empresas do grupo e colaborador teste quando houver `RH_DP`
12. validar prontidao SIENGE quando houver `INTEGRACAO_SIENGE`
13. criar fluxos de teste ponta a ponta
14. revisar permissoes por usuario
15. salvar prints base do treinamento

## 16. Rotina de suporte recomendada

### Suporte interno da empresa

Responsavel:

- `ADMINISTRADOR`

Atua em:

- duvidas de uso
- cadastro
- permissao
- entendimento de fluxo
- triagem inicial de erro

### Suporte externo do provedor

Responsavel:

- provedor do sistema

Atua em:

- erro tecnico
- deploy
- migracao
- modulo nao habilitado corretamente
- falha de integracao
- analise de logs

### Informacoes minimas para abrir um chamado interno ou externo

- modulo
- tela
- usuario afetado
- obra afetada
- horario aproximado
- print da tela
- mensagem de erro
- passo a passo executado
- se o problema acontece com todos ou com um usuario especifico

## 17. Problemas comuns e leitura correta

### O usuario nao ve uma tela

Checar:

- modulo habilitado na instalacao
- permissao por usuario
- perfil do usuario

### O campo nao aparece na solicitacao

Checar:

- se o campo depende de `CONTRATOS`
- se o campo depende de `OBRAS`
- se o modulo correspondente esta habilitado

### O RH/DP nao fecha competencia

Checar:

- pendencias impeditivas
- lotes nao confirmados
- modulo `FINANCEIRO` habilitado
- permissao do usuario

### O SIENGE nao envia

Checar:

- prontidao tecnica da tela da integracao
- base URL efetiva
- endpoint efetivo
- credenciais no `backend/.env`
- fila e logs
- configuracao opcional de automacao de credor

### O OFX nao conciliou

Checar:

- conta bancaria da baixa
- conta bancaria do extrato
- existencia de movimento financeiro ativo
- valor e data compativeis

## 18. Referencias complementares

- `docs/README.md`
- `docs/MANUAL_FLUXO_OPERACIONAL_FINANCEIRO.md`
- `docs/arquitetura/modularidade_solicitacoes_contratos_apropriacoes.md`
- `docs/modulos/solicitacoes.md`
- `docs/modulos/compras.md`
- `docs/modulos/financeiro.md`
- `docs/modulos/obras.md`
- `docs/modulos/comercial.md`
- `docs/modulos/provisionamento_financeiro.md`
- `docs/modulos/rh_dp.md`
- `docs/modulos/integracao_sienge.md`

## 19. Regra final de manutencao deste guia

Toda vez que uma entrega mudar qualquer um dos pontos abaixo, este documento deve ser revisado:

- deploy
- variaveis de ambiente
- habilitacao de modulo
- governanca de permissao
- fluxo operacional
- inclusao de nova tela
- inclusao de nova aba
- novo passo de treinamento
- novo modulo

Se isso nao for mantido, o maior risco nao sera tecnico. Sera operacional: implantacao inconsistente, treinamento fraco e suporte reativo.
