# 2026-04 - Tipos compartilhados e automacao por status

## Escopo
- fase E: tipos compartilhados entre setores configuraveis pelo `SUPERADMIN`
- fase F: automacao de envio por status + tipo, configuravel pelo `SUPERADMIN`

## Backend
- `backend/src/services/solicitacao/configuracoesVisibilidadeAutomacao.js`
  - novo service para normalizar e ler:
    - `TIPOS_COMPARTILHADOS_ENTRE_SETORES`
    - `AUTOMACAO_STATUS_SETOR`
- `backend/src/controllers/ConfiguracaoSistemaController.js`
  - novos endpoints de leitura/escrita para as duas configuracoes
  - validacao de tipos e setores antes de persistir
- `backend/src/controllers/SolicitacaoController.js`
  - listagem passa a incluir visibilidade por tipos compartilhados
  - detalhe considera tipos compartilhados para setores administrativos e GEO quando configurado
  - alteracao de status passa a executar automacao configurada por tipo + status
  - historico registra `ENVIO_AUTOMATICO_SETOR`
- `backend/src/routes.js`
  - novas rotas:
    - `GET/PATCH /configuracoes/tipos-compartilhados-setor`
    - `GET/PATCH /configuracoes/automacao-status-setor`

## Frontend
- `frontend/src/pages/TiposCompartilhadosSetor.jsx`
  - nova tela para configurar setores extras por tipo
- `frontend/src/pages/AutomacaoStatusSetor.jsx`
  - nova tela para configurar automacoes por tipo + status
- `frontend/src/services/configuracoesSistema.js`
  - novos clients para essas configuracoes
- `frontend/src/pages/Configuracoes.jsx`
  - novos cards na area de configuracoes
- `frontend/src/App.jsx`
  - novas rotas protegidas por `SuperadminRoute`

## Regras finais
- tipos compartilhados agora sao configurados por `setor de origem + tipo_solicitacao`
- tipos compartilhados nao alteram ownership da solicitacao
- automacao de status envia automaticamente para o setor configurado, mas so apos a mudanca de status ser aceita
- configuracao fica toda centralizada no frontend de configuracoes para o `SUPERADMIN`

## Validacao executada
- `node --check backend/src/controllers/SolicitacaoController.js`
- `node --check backend/src/controllers/ConfiguracaoSistemaController.js`
- `node --check backend/src/services/solicitacao/configuracoesVisibilidadeAutomacao.js`
- `node --check backend/src/routes.js`
- `npm run build` em `frontend/`
