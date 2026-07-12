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

Os modulos sao controlados por `MODULOS_HABILITADOS`. Dependencias declaradas devem ser aplicadas tanto no frontend quanto no backend. Desabilitar um modulo nao remove suas colunas nem transfere a propriedade de seus dados para outro dominio.

## Regra de mudanca

Antes de alterar uma tabela, status, endpoint ou permissao, consulte o mapa de modulos, a propriedade dos dados e o documento canonico do dominio. Mudancas transversais exigem teste em todos os consumidores identificados.
