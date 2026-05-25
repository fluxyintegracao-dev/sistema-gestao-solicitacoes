# Plano de Testes Smoke, Evidencias e Central de Treinamento FLUXY

## Status

Documento criado em 2026-05-25.

Objetivo: estruturar o mapa de testes previo a implantacao institucional, definir como gerar evidencias visuais com Playwright e planejar uma Central de Treinamento dentro do proprio FLUXY.

Atualizacao em 2026-05-25: primeira versao operacional da Central de Treinamento implementada no sistema.

Escopo entregue:

- modulo habilitavel `TREINAMENTO`;
- permissoes de area `treinamento.conteudos.visualizar`, `treinamento.conteudos.gerenciar`, `treinamento.conteudos.publicar` e `treinamento.relatorios.visualizar`;
- tabelas `treinamento_conteudos` e `treinamento_leituras_usuario`;
- cadastro de FAQ, video e guia;
- upload privado para S3 de videos e documentos;
- abertura de arquivos por URL assinada;
- menu lateral `Treinamento > Central de Treinamento`;
- pagina interna `/treinamento`;
- registro simples de visualizacao/conclusao por usuario.

## Decisao Operacional

Antes do Dia 1 da implantacao deve existir um Dia 0 de preparacao tecnica e homologatoria.

O Dia 0 nao e dia de cadastrar 100% da operacao. Ele existe para:

- mapear testes por modulo;
- validar rotas criticas;
- gerar evidencias de tela;
- confirmar permissoes por perfil;
- definir dados amostrais;
- orientar treinamento;
- reduzir risco de iniciar implantacao com fluxo quebrado.

## Configuracoes em Ambiente de Desenvolvimento

Enquanto o sistema estiver sendo validado em `dev-v2` ou ambiente de homologacao, configuracoes devem ser tratadas como amostrais.

Exemplos:

- 1 holding amostral;
- 1 ou 2 empresas operacionais;
- 1 obra real ou amostral;
- 1 centro de custo administrativo;
- usuarios-chave por perfil;
- permissoes por perfil em amostra;
- 1 conta bancaria;
- 1 cartao de credito;
- 1 cartao de debito;
- categorias financeiras essenciais;
- visibilidade de dashboards por amostra.

Configuracoes feitas em banco de homologacao podem nao acompanhar a promocao de branch `dev-v2` para `main`. Por isso, a parametrizacao definitiva deve ocorrer no ambiente oficial apos a promocao e validacao final.

## Estrutura E2E Existente

O repositorio ja possui uma base de testes Playwright em `e2e/`.

Scripts existentes:

- `npm test`
- `npm run test:smoke`
- `npm run test:auth`
- `npm run test:dashboard`
- `npm run test:solicitacoes`
- `npm run test:compras`
- `npm run test:financeiro`
- `npm run test:admin`
- `npm run test:report`

O Playwright ja esta configurado para:

- executar testes por projeto;
- usar `BASE_URL`;
- gerar relatorio HTML;
- capturar screenshot em falha;
- reter video em falha;
- usar timezone `America/Sao_Paulo`;
- reutilizar estado autenticado.

## Ajuste Recomendado para Evidencias

Para implantacao institucional, o ideal e criar um modo de evidencias de smoke.

Esse modo deve:

- capturar screenshot tambem em sucesso;
- salvar imagens por modulo e data;
- gerar relatorio HTML;
- gerar resumo executivo;
- permitir anexar as evidencias ao treinamento ou checklist de homologacao.

Estrutura sugerida:

```text
e2e/
  artifacts/
    smoke/
      2026-05-25/
        auth/
        dashboard/
        solicitacoes/
        compras/
        financeiro/
        fiscal/
        rh-dp/
        sst/
        configuracoes/
```

## Mapa de Testes por Modulo

### Autenticacao

Objetivo: confirmar acesso seguro.

Testes:

- tela de login carrega;
- login invalido falha;
- login valido entra;
- rota protegida redireciona usuario anonimo;
- logout encerra sessao.

Evidencias:

- login;
- dashboard apos login;
- estado apos logout.

### Dashboard e Navegacao

Objetivo: confirmar acesso inicial e menus.

Testes:

- dashboard abre;
- menu carrega;
- modo claro/escuro nao quebra leitura;
- suporte abre corretamente;
- modulos desabilitados nao aparecem.

Evidencias:

- dashboard;
- menu aberto;
- area de suporte.

### Solicitacoes

Objetivo: validar fluxo operacional base.

Testes:

- listar solicitacoes;
- criar solicitacao amostral;
- selecionar obra/centro de custo;
- anexar arquivo simples;
- abrir detalhes;
- alterar status permitido;
- assumir/enviar quando permitido;
- bloquear acao sem permissao.

Evidencias:

- nova solicitacao;
- detalhe da solicitacao;
- historico/status;
- permissao bloqueada.

### Compras e Cotacoes

Objetivo: validar fluxo de compra sem depender de todos os fornecedores reais.

Testes:

- listar solicitacoes de compra;
- criar solicitacao de compra amostral;
- adicionar item;
- remover ajuste em massa quando desabilitado;
- abrir detalhe;
- gerar cotacao amostral;
- visualizar comparativo;
- gerar PDF quando aplicavel.

Evidencias:

- lista;
- detalhe;
- cotacao;
- comparativo.

### Financeiro

Objetivo: validar registro financeiro sem inferencia de dado critico.

Testes:

- listar titulos;
- criar titulo manual;
- editar titulo aberto;
- bloquear edicao de titulo baixado;
- baixar titulo individual;
- baixar em massa;
- selecionar empresa pagadora;
- selecionar conta bancaria;
- selecionar forma de pagamento;
- validar cartao de credito/debito;
- visualizar faturas;
- abrir titulos de uma fatura;
- validar DRE com categoria, empresa e competencia.

Evidencias:

- titulo novo;
- detalhe do titulo;
- baixa;
- fatura;
- DRE;
- relatorio intercompany;
- relatorio de endividamento.

### Fiscal

Objetivo: confirmar caixa fiscal e documentos.

Testes:

- listar documentos fiscais;
- importar XML amostral;
- mostrar erro com nome do arquivo quando falhar;
- abrir detalhe;
- gerar/abrir DANFE;
- vincular documento a solicitacao ou titulo quando permitido.

Evidencias:

- lista fiscal;
- relatorio de importacao;
- detalhe;
- DANFE.

### Obras e Centros de Custo

Objetivo: validar separacao entre obra e centro de custo.

Testes:

- listar obras;
- criar ou editar obra amostral;
- marcar como obra ou centro de custo;
- filtrar relatorios apenas por obra quando aplicavel;
- usar obra/centro em solicitacao.

Evidencias:

- cadastro;
- filtro;
- uso na solicitacao.

### RH/DP

Objetivo: validar modulo sensivel com permissao restritiva.

Testes:

- listar colaboradores;
- abrir cadastro amostral;
- validar empresa vinculada;
- bloquear acesso sem permissao;
- conferir documentos/anexos quando aplicavel.

Evidencias:

- lista;
- detalhe;
- acesso negado.

### SST

Objetivo: validar base operacional do ultimo grande modulo estrutural.

Testes:

- dashboard SST;
- riscos;
- ASO;
- exames;
- EPI;
- treinamentos;
- acidentes;
- documentos;
- eventos eSocial preparados sem transmissao oficial.

Evidencias:

- dashboard;
- cadastro por area;
- documento anexado;
- alerta de vencimento.

### Configuracoes e Governanca

Objetivo: confirmar que o superadmin governa visibilidade e acesso.

Testes:

- habilitar/desabilitar modulo;
- configurar visibilidade de dashboard/tabela;
- configurar permissoes por usuario;
- validar acesso de usuario comum;
- configurar WhatsApp de suporte;
- revisar configuracoes de cotacao e financeiro.

Evidencias:

- tela de configuracoes;
- permissao por usuario;
- resultado no menu/rota.

## Central de Treinamento Dentro do FLUXY

E viavel criar uma area interna de treinamento no proprio FLUXY.

Nome sugerido:

- Central de Treinamento;
- Academia FLUXY;
- Base de Conhecimento FLUXY.

## Objetivo da Central de Treinamento

Permitir que o usuario aprenda dentro do sistema, com materiais controlados pelo superadmin.

Funcionalidades iniciais:

- perguntas e respostas;
- videos de treinamento;
- guias por modulo;
- trilhas por perfil;
- anexos/documentos;
- links para evidencias de homologacao;
- publicacao/despublicacao de conteudos.

## Abas Sugeridas

### Perguntas e Respostas

Campos:

- modulo;
- pergunta;
- resposta;
- publico-alvo;
- tags;
- ordem;
- status;
- publicado por;
- atualizado por.

### Videos de Treinamento

Campos:

- titulo;
- descricao;
- modulo;
- perfil indicado;
- URL ou arquivo S3;
- duracao;
- ordem;
- status;
- thumbnail;
- publicado por.

### Guias e Passo a Passo

Campos:

- modulo;
- rotina;
- objetivo;
- passo a passo;
- erros comuns;
- responsavel pela rotina;
- evidencias esperadas.

### Trilhas por Perfil

Exemplos:

- Presidencia;
- Diretoria;
- Superadmin;
- Obras;
- Compras;
- Financeiro;
- RH/DP;
- SST;
- Fiscal;
- Comercial;
- Contratos.

## Arquitetura Recomendada

Backend como fonte da verdade.

Entidades sugeridas:

```text
treinamento_conteudos
treinamento_faq
treinamento_videos
treinamento_trilhas
treinamento_trilha_itens
treinamento_anexos
treinamento_leituras_usuario
```

Permissoes sugeridas:

- `treinamento.visualizar`
- `treinamento.gerenciar`
- `treinamento.publicar`
- `treinamento.relatorio`

Storage:

- videos e anexos em S3 privado;
- acesso por URL assinada;
- metadados no banco;
- nao armazenar videos grandes no repositorio.

## Relacao com Smoke Tests

As capturas de smoke devem ser usadas como evidencia de homologacao e apoio para criacao dos treinamentos.

Elas nao devem ser publicadas automaticamente para todos os usuarios sem curadoria.

Fluxo recomendado:

1. Rodar smoke.
2. Gerar screenshots.
3. Revisar evidencias.
4. Selecionar imagens uteis.
5. Criar guia ou video.
6. Publicar na Central de Treinamento.

## Sequencia Recomendada

1. Atualizar plano de 5 dias incluindo Dia 0.
2. Ampliar mapa e2e para cobrir modulos ainda sem smoke.
3. Criar modo de captura de evidencias.
4. Criar Central de Treinamento como modulo interno.
5. Cadastrar conteudos amostrais.
6. Usar a central durante a implantacao assistida.

## Decisao de Produto

A Central de Treinamento deve ser tratada como parte da institucionalizacao do FLUXY, nao como recurso experimental.

Ela reduz dependencia do fundador tecnico, melhora onboarding e ajuda a manter o uso padronizado do sistema.
