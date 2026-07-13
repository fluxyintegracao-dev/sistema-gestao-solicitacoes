# Arquitetura - Visao Geral

## Topologia

- React/Vite no frontend web;
- Expo/React Native no aplicativo mobile;
- API REST Node.js/Express;
- Sequelize e MySQL;
- S3 para arquivos privados;
- EC2, PM2 e Nginx no backend;
- Vercel no frontend.

## Responsabilidades

O frontend cuida de navegacao, formularios e apresentacao. O backend cuida de autenticacao, autorizacao, validacao, regras de negocio, transacoes, auditoria, persistencia e integracoes.

O banco persiste o estado oficial. Relatorios e dashboards devem derivar de dados rastreaveis e mostrar inconsistencias em vez de inventar valores.

## Inicializacao

`backend/server.js` valida o ambiente, executa `runMigrations()`, carrega configuracoes e inicia a API. O bootstrap legado com `sequelize.sync()` so pode ocorrer mediante flag excepcional e nao faz parte do runtime normal.

## Modularidade

Os modulos sao controlados pela chave `MODULOS_HABILITADOS` de `ConfiguracaoSistema`. O catalogo, os valores padrao e as dependencias ficam em `backend/src/services/moduleConfigService.js`; o backend aplica `requireEnabledModule` nas rotas e o frontend recebe `modulos_habilitados` na sessao.

Dependencias declaradas devem ser aplicadas tanto no frontend quanto no backend. Desabilitar um modulo nao remove suas colunas, rotas ou tabelas e nao transfere a propriedade de seus dados para outro dominio.

Por compatibilidade, uma chave de modulo desconhecida e considerada habilitada no backend. O frontend tambem considera habilitado quando a sessao nao contem lista de modulos ou quando a chave nao existe nela. Portanto, todo novo modulo precisa ser incluido no catalogo, exposto na sessao, protegido no backend e frontend e coberto pela validacao documental. Esse comportamento de compatibilidade nao deve ser usado como mecanismo de habilitacao.

O inventario do runtime e os componentes descontinuados ainda presentes no codigo estao em `ESTADO_RUNTIME_E_LEGADOS.md`.

## Regra de mudanca

Antes de alterar uma tabela, status, endpoint ou permissao, consulte o mapa de modulos, a propriedade dos dados e o documento canonico do dominio. Mudancas transversais exigem teste em todos os consumidores identificados.
