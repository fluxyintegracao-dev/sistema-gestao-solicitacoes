# Relatorio do Sistema de Solicitacoes

## 1. Objetivo do documento
Documento mestre do sistema. Consolida arquitetura, modulos, regras de negocio, fluxos operacionais, pontos de risco e criterios de manutencao.

## 2. Visao geral do sistema
Sistema web corporativo para gestao de solicitacoes entre obras e setores administrativos, com controle por perfil, setor, obra, status, contratos, anexos, comprovantes, comunicacao interna, auditoria e modulo de solicitacoes de compras.

Objetivos principais:
- padronizar o fluxo de solicitacoes entre areas
- garantir rastreabilidade completa de status, responsaveis, anexos, comentarios e envios
- reduzir retrabalho operacional com filtros, acoes em massa e configuracoes administrativas
- manter governanca por perfil, setor, obra e historico de interacao
- suportar o fluxo principal e o modulo de compras sem quebrar o sistema em producao

## 3. Arquitetura e deploy

### 3.1 Componentes
- `frontend/`: aplicacao React + Vite hospedada na Vercel
- `backend/`: API Node.js + Express hospedada em EC2 com PM2
- banco de dados: MySQL em RDS
- armazenamento de arquivos: S3 com suporte legado a `/uploads` para arquivos antigos
- modulo complementar: `python-service/` permanece no repositorio, mas nao e o entrypoint principal do sistema web React/Express

### 3.2 Entrypoints reais em runtime
Backend:
- `backend/server.js`
- `backend/src/app.js`
- `backend/src/routes.js`

Frontend:
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`

Observacao critica:
- arquivos antigos com sufixo `"(1)"` e `"(2)"` foram removidos do codigo e nao faziam parte do runtime ativo

### 3.3 Infra atual
- backend publicado em `api.jrfluxy.com.br`
- frontend publicado em:
  - `jrfluxy.com.br`
  - `www.jrfluxy.com.br`
  - `csc.jrfluxy.com.br`
- Nginx faz proxy para `127.0.0.1:8000`
- processo PM2: `backend-solicitacoes`
- frontend usa rewrite SPA via `frontend/vercel.json`

### 3.4 CORS e arquivos
- backend usa allowlist para dominios principais e previews da Vercel
- anexos e comprovantes podem usar S3 com URL assinada
- anexos antigos ainda podem existir em `/uploads`
- o frontend trata os dois cenarios: S3 assinado e caminho relativo legado

## 4. Perfis, acesso e escopo
Perfis principais:
- `SUPERADMIN`
- `ADMIN`
- `USUARIO`

Outros comportamentos relevantes dependem de:
- setor do usuario
- obra vinculada
- historico de interacao na solicitacao
- permissoes configuradas no sistema
- flag `pode_criar_solicitacao_compra`

Regras gerais:
- `SUPERADMIN` possui visao administrativa ampla
- gestao de usuarios e restrita a `SUPERADMIN` e `ADMIN` do escopo GEO
- regras de listagem, envio, atribuicao e troca de status dependem do setor atual do usuario e do setor atual da solicitacao
- o sistema registra visibilidade complementar por historico

## 5. Modulos do sistema

### 5.1 Autenticacao e sessao
Funcionalidades:
- login com token
- logout manual
- expiracao por sessao ou inatividade
- alteracao de senha
- carregamento de configuracao de timeout de inatividade

Regras:
- `GET /configuracoes/tema` e publico porque o frontend precisa carregar tema antes da autenticacao
- `PATCH /usuarios/me/senha` altera a senha do usuario autenticado

### 5.2 Dashboard
Funcionalidades:
- painel consolidado por perfil e setor
- totais por status
- visao executiva em `GET /dashboard/executivo`

Regras:
- `SUPERADMIN` tem visao global
- `ADMIN` tende a operar no proprio escopo setorial, com excecoes de negocio
- card `SLA Medio` foi removido

### 5.3 Solicitacoes do fluxo principal
Funcionalidades:
- criar solicitacao
- listar solicitacoes
- abrir detalhe
- alterar status
- assumir solicitacao
- atribuir responsavel
- enviar para outro setor
- atualizar numero do pedido
- atualizar ref. do contrato
- atualizar valor
- arquivar e desarquivar individualmente
- arquivar em massa
- enviar para setor em massa
- comentar
- anexar arquivos
- excluir quando permitido

Rotas principais:
- `POST /solicitacoes`
- `GET /solicitacoes`
- `GET /solicitacoes/:id`
- `PATCH /solicitacoes/:id/status`
- `POST /solicitacoes/:id/comentarios`
- `POST /solicitacoes/:id/enviar-setor`
- `POST /solicitacoes/:id/assumir`
- `POST /solicitacoes/:id/atribuir`
- `PATCH /solicitacoes/:id/arquivar`
- `PATCH /solicitacoes/:id/desarquivar`
- `PATCH /solicitacoes/arquivar-massa`
- `POST /solicitacoes/enviar-setor-massa`

Regras de visibilidade:
- a solicitacao segue visivel para usuarios e setores envolvidos no historico
- o arquivamento e individual por usuario
- ao desarquivar, a solicitacao volta para a lista daquele usuario
- usuarios de `OBRA` veem apenas o proprio escopo de criacao e obras vinculadas
- fluxos BRAPE e BRAPE-CSC dependem de vinculo com obras e historico

Regras de operacao:
- usuarios so podem assumir solicitacoes do setor atual da solicitacao
- usuarios so podem enviar solicitacoes do setor atual da solicitacao
- `SUPERADMIN` permanece como excecao administrativa
- `ADMIN GEO` e escopos equivalentes podem ter ampliacao conforme regra do backend
- numero do pedido permanece restrito a GEO
- remocao de anexo historico permanece restrita a `COMPRAS` e `SUPERADMIN`
- a listagem aceita filtro por `codigo` com busca parcial, inclusive por trechos numericos e buscas com zeros a esquerda
- a listagem aceita filtro por `numero_sienge` com busca parcial

### 5.4 Nova Solicitacao
Campos principais:
- obra
- area responsavel
- tipo de solicitacao
- valor
- data de vencimento
- contrato
- ref. do contrato
- subtipo
- datas de medicao
- itens de apropriacao
- descricao
- anexos

Regras principais:
- primeiro escolhe a obra
- depois habilita area responsavel
- depois habilita tipo de solicitacao
- contratos e referencias dependem da obra e do tipo
- todos os campos habilitados sao obrigatorios, exceto descricao
- data de vencimento nao pode ser menor que a data atual
- datas de medicao podem ser passadas
- suporte a multiplo upload e `.rar`

Regras por tipo importantes:
- `MEDICAO`: usa contrato, ref. do contrato e datas de medicao
- `ADM LOCAL DE OBRA`: usa subtipo, contrato e ref. do contrato
- `LOCACAO DE MAQ. EQ.`: usa contrato e ref. do contrato
- `SOLICITACAO DE COMPRA`, `OUTROS ASSUNTOS` e `PEDIDO DE CONTRATACAO`: nao exigem valor na abertura
- `ABERTURA DE CONTRATO`: exige ref. do contrato livre e itens de apropriacao

### 5.5 Detalhe da solicitacao
Funcionalidades:
- cabecalho com dados principais
- troca de status
- comentarios
- anexos
- historico
- pedido / numero no SIENGE
- comprovantes relacionados

Regras:
- lista de status exibida segue o setor do usuario logado
- validacao do backend segue o mesmo criterio
- `SUPERADMIN` e excecao administrativa
- usuarios `OBRA` podem comentar

### 5.6 Status, cores e configuracoes setoriais
Configuracoes principais:
- status por setor
- cores do sistema
- permissoes por setor
- areas visiveis para OBRA
- areas por setor de origem
- tipos por setor
- comportamento de recebimento por setor e tipo
- timeout de inatividade
- setores com criacao em todas as obras
- setores visiveis por usuario

Telas relacionadas no frontend:
- `StatusSetor`
- `CoresSistema`
- `PermissoesSetor`
- `AreasObra`
- `AreasPorSetorOrigem`
- `TiposSolicitacaoPorSetor`
- `ComportamentoRecebimentoSetor`
- `TimeoutInatividade`
- `SetoresCriacaoTodasObras`
- `SetoresVisiveisUsuario`

### 5.7 Contratos
Funcionalidades:
- cadastro e manutencao de contratos
- anexos de contrato
- importacao em massa por CSV
- resumo de valores
- associacao com obra e tipos contratuais

Regras de valor:
- `Valor Solicitado` nao soma automaticamente novas solicitacoes
- `Valor Pago` depende de solicitacoes com status `PAGA`
- se a solicitacao deixa de ser `PAGA`, deixa de compor o valor pago

### 5.8 Usuarios
Funcionalidades:
- cadastro manual
- edicao
- ativacao e desativacao
- vinculo com obras
- importacao em massa
- alteracao de senha do proprio usuario
- permissao para modulo compras

Regras:
- somente `SUPERADMIN` pode criar ou promover `SUPERADMIN`
- usuarios do escopo GEO administram usuarios sem abrir permissao global indevida
- `pode_criar_solicitacao_compra` participa do controle de acesso ao modulo compras

### 5.9 Comunicacao interna
Funcionalidades:
- caixa de entrada
- caixa de saida
- detalhe da conversa
- criacao de conversa
- resposta com anexos
- criacao em massa
- adicao de participantes
- arquivamento e desarquivamento em massa
- concluir e reabrir conversa
- edicao de mensagem
- badges no menu

Rotas principais:
- `GET /conversas-internas/entrada`
- `GET /conversas-internas/saida`
- `GET /conversas-internas/:id`
- `POST /conversas-internas`
- `POST /conversas-internas/massa`
- `POST /conversas-internas/:id/mensagens`
- `POST /conversas-internas/:id/participantes`
- `PATCH /conversas-internas/arquivar-massa`
- `PATCH /conversas-internas/desarquivar-massa`
- `PATCH /conversas-internas/:id/concluir`
- `PATCH /conversas-internas/:id/reabrir`
- `PATCH /conversas-internas/mensagens/:mensagemId`

### 5.10 Arquivos modelos
Funcionalidades:
- consulta de paginas por area
- download e abertura de arquivos
- configuracao de paginas e uploaders
- definicao de administradores por pagina

Rotas principais:
- `GET /arquivos-modelos/contexto`
- `GET /arquivos-modelos/admins`
- `GET /arquivos-modelos`
- `POST /arquivos-modelos/upload`
- `GET /arquivos-modelos/:id/link`
- `DELETE /arquivos-modelos/:id`
- `POST /arquivos-modelos/paginas`
- `PATCH /arquivos-modelos/paginas`
- `PATCH /arquivos-modelos/uploaders`

### 5.11 Upload de comprovantes
Funcionalidades:
- upload em massa
- listagem de pendentes
- vinculacao manual
- remocao de comprovante

Regra de acesso:
- `SUPERADMIN` e escopo `FINANCEIRO`

### 5.12 Modulo de solicitacoes de compras
Estado atual:
- modulo integrado ao backend e ao frontend
- rotas de compras publicadas
- menu de compras ativo conforme permissao do usuario
- telas administrativas e fluxo operacional implementados

Acesso:
- permitido para `SUPERADMIN`
- permitido para `ADMIN`
- permitido para usuario com `pode_criar_solicitacao_compra`
- backend tambem aceita escopos setoriais equivalentes de compras, GEO e Gerencia de Processos conforme validacao interna

Backend do modulo:
- estruturas criadas e ajustadas em `backend/src/app.js`
- modelos registrados em `backend/src/models/index.js`
- controlador principal em `backend/src/controllers/SolicitacaoCompraController.js`
- suporte a fornecedores e cotacoes publicas
- PDF da solicitacao de compra
- integracao com solicitacao principal do fluxo comum

Rotas principais do modulo:
- `GET /compras/unidades`
- `GET /compras/categorias`
- `GET /compras/insumos`
- `GET /compras/apropriacoes`
- `GET /compras/fornecedores`
- `POST /compras/anexos-temporarios`
- `GET /compras/solicitacoes`
- `GET /compras/solicitacoes/:id`
- `GET /compras/solicitacoes/:id/comparativo`
- `GET /compras/solicitacoes/:id/pdf`
- `POST /compras/solicitacoes`
- `PATCH /compras/solicitacoes/:id/integrar`
- `PATCH /compras/solicitacoes/:id/liberar`
- `POST /compras/solicitacoes/:id/enviar`
- `PATCH /compras/solicitacoes/:id/encerrar`
- `GET /cotacoes/:token`
- `POST /cotacoes/:token`

Frontend do modulo:
- `frontend/src/modules/solicitacao-compra/pages/`
- telas de gestao de unidades, categorias, insumos e apropriacoes
- fluxo de nova solicitacao de compra, revisao e finalizacao
- listagem e detalhe da solicitacao de compra
- detalhe completo de cotacao em `SolicitacaoCompraDetalheView`

Regra de negocio importante:
- o modulo compras gera e se relaciona com o fluxo principal, portanto alteracoes em `App.jsx`, `Layout.jsx`, `routes.js`, `models/index.js`, `User.js`, `AuthController.js` e `UsuarioController.js` impactam diretamente seu funcionamento

## 6. Usabilidade e comportamento de interface
- menu lateral responsivo, com recolhimento em desktop e drawer em mobile
- suporte a tema claro/escuro
- badges de conversas novas no menu
- persistencia de filtros e preferencias visuais em `localStorage`
- tabela principal com filtros, colunas configuraveis, acoes contextuais e responsividade
- fluxo de login com identidade visual CSC
- filtro de solicitacoes por codigo e `numero_sienge` com correspondencia parcial

## 7. Integridade, auditoria e seguranca
- validacoes criticas em frontend e backend
- autenticacao via middleware `auth`
- historico de acoes por solicitacao
- rastreabilidade de comentarios, anexos, envio, status e responsavel
- upload e download mediados pelo backend
- presign para anexos privados
- regra especial de permissao para usuarios e compras aplicada no backend

## 8. Operacao e deploy

### 8.1 Backend
1. `git pull`
2. `npm install` em `backend/`, se necessario
3. `pm2 restart backend-solicitacoes --update-env`
4. validar logs e resposta em `127.0.0.1:8000`

### 8.2 Frontend
1. `git push`
2. redeploy na Vercel
3. limpar cache se houver mudanca estrutural forte

### 8.3 Validacoes minimas apos deploy
- login
- listagem de solicitacoes
- detalhe de solicitacao
- dashboard
- upload/presign de anexos
- comunicacao interna
- arquivos modelos
- modulo compras

## 9. Riscos operacionais e pontos de atencao
- se o backend cair em `127.0.0.1:8000`, o Nginx retorna `502`
- anexos legados em `/uploads` ainda precisam ser preservados
- modulo compras depende de banco, models, rotas e permissao do usuario estarem alinhados
- filtros e preferencias em `localStorage` podem mascarar comportamento em testes
- remocoes de arquivos no repositorio devem evitar tocar dados operacionais em `backend/uploads/`

## 10. Diretrizes de manutencao
- considerar `backend/server.js`, `backend/src/app.js`, `backend/src/routes.js`, `frontend/src/main.jsx`, `frontend/src/App.jsx` e `frontend/src/layout/Layout.jsx` como pontos centrais de impacto
- ao mexer em compras, revisar tambem `AuthController`, `UsuarioController`, `User`, `models/index`, `services/compras.js` e telas do modulo
- antes de mudancas grandes, registrar contexto em `docs/` e atualizar `AGENTS.md`
- se duas pessoas ou dois agentes trabalharem juntos, seguir `docs/COLABORACAO_CODEX.md`

## 11. Valor do sistema
Problemas que resolve:
- solicitacoes espalhadas em canais paralelos
- perda de contexto e retrabalho
- baixa rastreabilidade
- baixa previsibilidade entre obra e setores administrativos

Valor entregue:
- governanca operacional
- rastreabilidade ponta a ponta
- centralizacao de documentos e comprovantes
- escalabilidade para multiplas obras e setores
- suporte a fluxo principal e fluxo de compras no mesmo ecossistema

## 12. Controle de versao deste documento
Atualizar este documento sempre que houver:
- nova regra de permissao
- novo modulo
- alteracao relevante de UX
- alteracao de deploy
- mudanca estrutural em compras, comunicacao, contratos, anexos ou filtros
