# Checklist de Implantacao por Cliente - FLUXY

## 1. Objetivo

Este checklist existe para padronizar a implantacao de cada nova empresa no FLUXY.

Ele deve ser usado pelo provedor e pode ser reaproveitado em cada nova instalacao, evitando:

- esquecimento de etapas
- abertura antecipada do sistema sem configuracao base
- treinamento incompleto
- falhas de permissao
- ativacao de modulo sem preparo operacional

## 2. Identificacao da implantacao

- cliente:
- razao social:
- responsavel principal no cliente:
- email principal:
- responsavel do provedor:
- data prevista de implantacao:
- data prevista de treinamento:
- data prevista de go-live:

## 3. Levantamento comercial e escopo

Marcar `OK`, `Pendente` ou `Nao se aplica`.

- modulo `SOLICITACOES` contratado:
- modulo `COMUNICACAO_INTERNA` contratado:
- modulo `BIBLIOTECA_MODELOS` contratado:
- modulo `COMPRAS` contratado:
- modulo `COTACOES` contratado:
- modulo `FINANCEIRO` contratado:
- modulo `OBRAS` contratado:
- modulo `CONTRATOS` contratado:
- modulo `COMERCIAL` contratado:
- modulo `PROVISOES` contratado:
- modulo `RH_DP` contratado:
- modulo `INTEGRACAO_SIENGE` contratado:

Observacoes do contrato:

-

## 4. Dados iniciais da empresa

- nome comercial confirmado:
- razao social confirmada:
- logo recebido:
- dominio do frontend definido:
- dominio da API definido:
- dados institucionais para branding recebidos:

## 5. Preparacao tecnica do ambiente

## 5.1 Banco

- banco criado:
- credencial de aplicacao criada:
- backup automatizado configurado:
- validacao de charset/collation concluida:

## 5.2 Backend

- `backend/.env` criado:
- `DB_HOST` preenchido:
- `DB_PORT` preenchido:
- `DB_USER` preenchido:
- `DB_PASSWORD` preenchido:
- `DB_NAME` preenchido:
- `JWT_SECRET` preenchido:
- `CORS_ALLOWED_ORIGINS` preenchido:
- `PRODUCT_NAME` preenchido:
- `COMPANY_NAME` preenchido:
- `COMPANY_LOGO_URL` preenchido:
- `APP_DOMAIN` preenchido:

## 5.3 Frontend

- `frontend/.env` criado:
- `VITE_API_URL` apontando para a API correta:
- projeto da Vercel revisado:

## 5.4 Infraestrutura complementar

- PM2 configurado:
- Nginx configurado:
- HTTPS validado:
- S3 configurado:
- Redis configurado quando necessario:
- ClamAV configurado quando necessario:

## 5.5 Integracao com `fluxy_ops`

- `OPS_ENABLED` revisado:
- instalacao registrada no painel ops:
- heartbeat validado:
- telemetria validada:

## 5.6 Integracao SIENGE

Preencher apenas quando aplicavel.

- `SIENGE_API_BASE_URL` ou composicao equivalente definida:
- subdominio do cliente confirmado:
- endpoint de titulos revisado:
- endpoint de credores revisado:
- credenciais armazenadas com seguranca:
- timeout revisado:
- tela de prontidao validada:

## 6. Publicacao e validacao tecnica

- backend publicado:
- frontend publicado:
- login validado:
- menu principal validado:
- download de anexo validado:
- upload de anexo validado:
- logs sem erro critico apos subida:

## 7. Habilitacao de modulos por instalacao

Executado por:

- `SUPERADMIN`

Checklist:

- `SOLICITACOES` habilitado conforme contrato:
- `COMUNICACAO_INTERNA` habilitado conforme contrato:
- `BIBLIOTECA_MODELOS` habilitado conforme contrato:
- `COMPRAS` habilitado conforme contrato:
- `COTACOES` habilitado conforme contrato:
- `FINANCEIRO` habilitado conforme contrato:
- `OBRAS` habilitado conforme contrato:
- `CONTRATOS` habilitado conforme contrato:
- `COMERCIAL` habilitado conforme contrato:
- `PROVISOES` habilitado conforme contrato:
- `RH_DP` habilitado conforme contrato:
- `INTEGRACAO_SIENGE` habilitado conforme contrato:

## 8. Configuracao administrativa inicial

## 8.1 Usuarios

- usuario administrador principal criado:
- usuarios-chave criados:
- perfis revisados:
- setores revisados:
- escopo de obra revisado:

## 8.2 Setores e fluxo

- setores cadastrados:
- status por setor cadastrados:
- permissoes por setor revisadas:
- areas visiveis por obra revisadas:
- areas por setor de origem revisadas:
- comportamento de recebimento por setor revisado:
- tipos por setor revisados:
- setores com criacao em todas as obras revisados:
- setores com acesso em todas as obras revisados:

## 8.3 Cadastros mestre

- tipos de solicitacao cadastrados:
- subtipos de contrato cadastrados:
- parceiros iniciais cadastrados ou importados:
- categorias de parceiro cadastradas:
- obras iniciais cadastradas:
- apropriacoes cadastradas quando aplicavel:

## 8.4 Permissoes

- `Permissoes de Areas por Usuario` revisadas:
- `Permissoes RH/DP e SIENGE` revisadas quando aplicavel:
- `Usuarios com acesso ao Financeiro` revisados quando aplicavel:
- `Tempo de Inatividade` revisado:

## 8.5 Identidade e apoio

- cores do sistema revisadas:
- biblioteca de modelos configurada quando aplicavel:

## 9. Configuracao por modulo

## 9.1 Solicitacoes

- `Nova Solicitacao` validada:
- campos obrigatorios conferidos:
- anexos validados:
- detalhe da solicitacao validado:

## 9.2 Obras

- cadastro de obra validado:
- classificacao publica/privada validada:
- valor de referencia validado:
- margem de custo validada:
- detalhe da obra validado:
- gestao de apropriacoes validada:

## 9.3 Compras e cotacoes

- categorias cadastradas:
- insumos cadastrados:
- unidades cadastradas:
- fornecedores validados:
- configuracoes de cotacao revisadas:
- status de pedido revisados:
- fluxo completo de solicitacao de compra validado:
- fluxo de cotacao validado:
- fluxo de pedido validado:

## 9.4 Financeiro

- contas bancarias cadastradas:
- categorias financeiras cadastradas:
- titulo manual validado:
- geracao de conta via solicitacao validada:
- baixa validada:
- estorno validado:
- relatorios validados:
- conciliacao OFX validada:
- upload de comprovante validado:

## 9.5 Contratos

- modulo habilitado quando contratado:
- gestao de contratos validada:
- comportamento contratual na solicitacao validado:

## 9.6 Comercial

- empreendimentos cadastrados:
- unidades cadastradas:
- mapa de unidades validado:
- tabela de preco validada:
- contrato comercial validado:
- geracao de recebiveis no financeiro validada:

## 9.7 Provisoes

- categorias macro cadastradas:
- nova provisao validada:
- anexos na criacao validados:
- detalhe com comentarios validado:
- dashboard validado:

## 9.8 RH/DP

- empresas do grupo cadastradas:
- colaborador de teste cadastrado:
- dados de pagamento validados:
- anexo de documento no colaborador validado:
- painel de documentos validado:
- importacao de teste validada:
- apuracao de teste validada:
- fechamento de teste validado:
- geracao de titulo financeiro validada:

## 9.9 Integracao SIENGE

- tela inicial acessivel:
- prontidao tecnica validada:
- fila validada:
- logs validados:
- contexto de credor validado:
- vinculacao manual de `creditorId` validada quando aplicavel:
- envio de teste validado quando liberado:

## 10. Testes integrados obrigatorios

## 10.1 Fluxo base

- criar solicitacao:
- anexar arquivo:
- comentar no detalhe:
- gerar conta no financeiro:
- registrar baixa:
- conciliar OFX:

## 10.2 Fluxo compras

Quando aplicavel:

- criar solicitacao de compra:
- apropriar itens:
- revisar:
- cotar:
- gerar pedido:

## 10.3 Fluxo comercial

Quando aplicavel:

- cadastrar empreendimento:
- cadastrar unidade:
- criar contrato:
- validar recebiveis no financeiro:

## 10.4 Fluxo provisoes

Quando aplicavel:

- criar provisao:
- anexar:
- comentar:
- validar dashboard:

## 10.5 Fluxo RH/DP

Quando aplicavel:

- cadastrar colaborador:
- anexar documento:
- importar lote:
- apurar:
- fechar competencia:
- validar titulo financeiro:

## 10.6 Fluxo SIENGE

Quando aplicavel:

- validar endpoint:
- validar autenticacao:
- validar fila:
- validar envio:
- validar log:

## 11. Material de treinamento

- guia mestre revisado com o cliente:
- roteiro de apresentacao preparado:
- prints capturados:
- base de homologacao organizada:
- lista de participantes do treinamento definida:

## 12. Treinamento realizado

## 12.1 Administrador

- treinamento realizado:
- data:
- participantes:
- pendencias abertas:

## 12.2 Equipe operacional

- solicitantes treinados:
- setores treinados:
- compras treinado:
- financeiro treinado:
- comercial treinado:
- RH treinado:

## 12.3 Materiais entregues

- guia de implantacao entregue:
- roteiro de treinamento entregue:
- apresentacao entregue:
- canal de suporte informado:

## 13. Go-live

- data final de entrada em producao:
- responsavel pela virada:
- base inicial revisada:
- usuario administrador apto:
- equipe interna ciente:
- plano de contingencia definido:

## 14. Acompanhamento pos-go-live

Primeira semana:

- check-in diario realizado:
- erros criticos:
- erros operacionais:
- ajustes de permissao:
- ajustes de cadastro:

Primeiro mes:

- rotina estabilizada:
- necessidade de modulo extra identificada:
- necessidade de evolucao identificada:

## 15. Criticos de aceite

A implantacao nao deve ser dada como concluida sem:

- login validado
- modulos contratados corretos
- usuario administrador funcional
- pelo menos um fluxo ponta a ponta validado por modulo contratado
- treinamento administrativo concluido
- suporte interno definido

## 16. Assinaturas de encerramento

### Provedor

- nome:
- data:
- observacoes:

### Cliente

- nome:
- cargo:
- data:
- observacoes:

## 17. Referencias

- `docs/arquitetura/deploy_ambientes.md`
- `docs/ROTEIRO_APRESENTACAO_TREINAMENTO_FLUXY.md`
- `docs/MANUAL_FLUXO_OPERACIONAL_FINANCEIRO.md`
