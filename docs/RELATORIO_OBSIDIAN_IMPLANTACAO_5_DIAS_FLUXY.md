# Relatorio Obsidian - Plano de Implantacao FLUXY em 5 Dias

Data: 2026-05-25

## Objetivo

Implantar a versao completa e funcional do FLUXY na empresa em 5 dias uteis, agora com o novo posicionamento de infraestrutura operacional institucional.

O objetivo nao e criar novas funcionalidades durante a semana. O objetivo e colocar o sistema para operar de forma controlada, com dados mestres revisados, permissoes corretas, usuarios treinados, fluxos principais homologados e suporte assistido.

## Premissa Principal

O sucesso da implantacao depende mais de governanca e disciplina operacional do que de codigo novo.

O sistema precisa refletir a operacao real:

- empresa correta;
- obra/centro correto;
- categoria correta;
- usuario correto;
- permissao correta;
- baixa correta;
- documento correto.

Nao usar inferencia ou fallback para dado critico.

Antes do Dia 1 deve existir um Dia 0 de preparacao tecnica e homologatoria.

Esse Dia 0 deve validar smoke tests, capturar evidencias de tela e criar apenas configuracoes amostrais. Configuracoes feitas em ambiente `dev-v2` ou homologacao podem nao acompanhar a promocao para `main`, porque muitas delas vivem no banco do ambiente, nao na branch. Por isso, a parametrizacao completa deve ser feita no ambiente oficial.

## Estrutura dos 5 Dias

### Dia 0 - Testes, Evidencias e Configuracao Amostral

Foco:

- mapear testes por modulo;
- rodar smoke tests;
- gerar screenshots das rotas criticas;
- validar permissoes amostrais;
- criar poucos dados por perfil;
- identificar P0/P1 antes da implantacao;
- separar o que e treinamento do que e configuracao oficial.

Resultado esperado:

- ambiente validado antes do Dia 1.

### Dia 1 - Governanca, Ambiente e Dados Mestres Amostrais

Foco:

- atualizar ambiente;
- validar backend/frontend;
- confirmar modulos habilitados;
- revisar empresas amostrais;
- revisar holding e empresas do grupo por amostra;
- revisar obras e centros de custo por amostra;
- cadastrar usuarios-chave amostrais;
- configurar permissoes amostrais;
- configurar visibilidade de dashboards e tabelas por amostra;
- registrar quais configuracoes serao refeitas no ambiente oficial.

Resultado esperado:

- base institucional amostral pronta para homologar e treinar.

### Dia 2 - Solicitacoes, Obras e Compras

Foco:

- treinar abertura de solicitacao;
- validar fluxo entre setores;
- validar anexos e historico;
- validar solicitacao de compra;
- validar itens, fornecedores, cotacao e pedido;
- validar apropriacoes;
- validar relatorios operacionais.

Resultado esperado:

- fluxo operacional homologado.

### Dia 3 - Financeiro, DRE, Caixa e Cartoes

Foco:

- revisar categorias financeiras;
- revisar classificacao DRE;
- revisar contas bancarias;
- revisar cartoes de credito e debito;
- criar titulo manual;
- editar titulo aberto;
- baixar titulo;
- baixar em massa;
- validar fatura de cartao;
- validar DRE;
- validar fluxo de caixa.

Resultado esperado:

- financeiro basico homologado com dados reais.

### Dia 4 - RH/DP, SST, Fiscal, Contratos e Seguranca

Foco:

- revisar permissoes sensiveis;
- validar documentos e anexos;
- validar RH/DP;
- validar SST;
- validar fiscal se entrar no go-live;
- validar contratos vinculados;
- revisar auditoria/logs;
- revisar acesso por usuario.

Resultado esperado:

- modulos sensiveis liberados com seguranca minima.

### Dia 5 - Homologacao Final e Go-Live

Foco:

- rodar checklist geral;
- corrigir apenas bloqueios;
- classificar pendencias;
- validar fluxos com usuarios-chave;
- definir canal de suporte;
- definir responsaveis;
- definir rotina de deploy/rollback;
- registrar aceite operacional.

Resultado esperado:

- go-live autorizado ou adiado com justificativa clara.

## Classificacao de Pendencias

### P0 - Impeditivo

Bloqueia operacao ou gera risco critico.

Exemplos:

- login falha;
- financeiro movimenta errado;
- permissao vaza dado sensivel;
- solicitacao nao salva;
- documento critico nao abre.

### P1 - Alto

Prejudica operacao, mas tem contorno seguro.

### P2 - Medio

Melhoria importante, mas nao bloqueia go-live.

### P3 - Futuro

Nao entra na semana de implantacao.

Exemplos:

- IA;
- WebXR;
- novas integracoes;
- multi-tenant;
- novos modulos.

## Criterios de Go-Live

Liberar se:

- usuarios-chave foram treinados;
- empresas foram revisadas;
- obras/centros foram revisados;
- permissoes minimas estao seguras;
- solicitacoes funcionam;
- financeiro basico funciona;
- documentos/anexos abrem;
- suporte esta definido;
- pendencias P0 foram resolvidas.

Adiar se:

- API ou login instavel;
- permissao insegura;
- baixa financeira incorreta;
- dados mestres confusos;
- usuarios-chave nao conseguem operar;
- ambiente nao esta confiavel.

## Riscos

1. Tentar implantar tudo com profundidade total.
2. Liberar permissao demais.
3. Comecar com dados mestres ruins.
4. Operar sem treinamento.
5. Corrigir melhoria P2 como se fosse bloqueio P0.
6. Esperar relatorio perfeito antes de ter dado real consistente.

## Recomendacao Final

O plano de 5 dias e viavel se for tratado como implantacao assistida e controlada, nao como sprint de desenvolvimento.

A semana deve priorizar:

- governanca;
- dados mestres;
- permissoes;
- treinamento;
- homologacao;
- suporte;
- uso real disciplinado.

O objetivo e iniciar a operacao real com seguranca e criar base para a fase seguinte: consolidacao, testes, CI/CD, observabilidade e reducao de divida tecnica.

## Central de Treinamento

Tambem e recomendado criar uma Central de Treinamento dentro do proprio FLUXY.

Abas sugeridas:

- Perguntas e Respostas;
- Videos de Treinamento;
- Guias por Modulo;
- Trilhas por Perfil.

Os videos e anexos devem ficar em S3 privado, com acesso por URL assinada. O sistema deve guardar metadados, permissoes e status de publicacao.

A Central de Treinamento deve reduzir dependencia do fundador tecnico, padronizar a operacao e transformar as evidencias dos smoke tests em materiais de treinamento curados.
