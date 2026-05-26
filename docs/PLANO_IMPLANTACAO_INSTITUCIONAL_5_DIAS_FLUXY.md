# Plano de Implantacao Institucional FLUXY - 5 Dias

## Status

Documento criado em 2026-05-25.

Objetivo: orientar a implantacao interna da versao completa e funcional do FLUXY na empresa em 5 dias uteis, alinhada ao reposicionamento estrategico registrado em `docs/REPOSICIONAMENTO_ESTRATEGICO_FLUXY.md`.

## Tese da Implantacao

A implantacao de 5 dias nao deve tentar "perfeccionar" todo o ecossistema. O objetivo e colocar o FLUXY para operar como infraestrutura institucional interna com:

- dados mestres minimos confiaveis;
- usuarios e permissoes revisados;
- modulos essenciais habilitados;
- fluxo operacional claro;
- treinamento por perfil;
- homologacao pratica;
- checklist de go-live;
- suporte assistido nos primeiros dias.

O sucesso da implantacao depende mais de governanca, disciplina operacional e padrao de uso do que de novas funcionalidades.

Antes do Dia 1 deve existir um Dia 0 tecnico e homologatorio. Esse Dia 0 serve para mapear testes, rodar smoke tests, gerar evidencias por screenshot e validar configuracoes amostrais. Ele evita que a implantacao comece com rotas, permissoes ou fluxos criticos sem verificacao minima.

## Escopo da Implantacao

### Incluido

- Configuracao institucional do ambiente.
- Cadastro/revisao de empresas do grupo.
- Cadastro/revisao de obras e centros de custo.
- Cadastro/revisao de usuarios, setores e permissoes.
- Parametrizacao dos modulos ativos.
- Revisao de visibilidade de dashboards e tabelas.
- Mapa de testes por modulo.
- Evidencias de smoke test.
- Validacao dos fluxos principais.
- Treinamento operacional por area.
- Homologacao com usuarios-chave.
- Go-live controlado.
- Plano de suporte inicial.

### Fora do Escopo dos 5 Dias

- Criacao de novos grandes modulos.
- Refactor estrutural profundo.
- Multi-tenant.
- IA operacional.
- Integracoes governamentais oficiais sem documentacao completa.
- Automatizacao total de processos ainda nao maduros.
- Migracao historica completa de anos anteriores.
- Implantacao de processos nao alinhados com a diretoria.

## Premissas

- O ambiente de desenvolvimento/homologacao esta acessivel.
- O backend na EC2 e o frontend na Vercel estao atualizaveis.
- A diretoria definiu quais modulos entram no go-live.
- Existe pelo menos um responsavel operacional por area.
- O sistema comeca com dados novos ou base controlada, sem necessidade de migrar todo historico.
- Financeiro comeca do zero ou com importacao inicial de titulos em aberto validada.
- Permissoes serao mais restritivas por padrao.
- Toda duvida operacional critica sera decidida por responsavel nomeado, nao por inferencia tecnica.
- Configuracoes feitas em `dev-v2` ou homologacao tem carater amostral e podem precisar ser refeitas no ambiente oficial apos a promocao para `main`.
- A configuracao completa da operacao deve ocorrer apenas no ambiente definitivo.

## Criterio de Sucesso

Ao final dos 5 dias, a empresa deve conseguir:

- abrir e acompanhar solicitacoes;
- registrar compras e cotacoes quando aplicavel;
- operar financeiro basico com titulos, baixas, contas e faturas;
- controlar obras/centros de custo;
- usar relatorios principais com dados consistentes;
- operar permissoes por usuario;
- localizar documentos e rastros operacionais;
- saber quem aciona suporte;
- saber como homologar e liberar novas mudancas.

## Indicadores de Go-Live

- Usuarios-chave do ambiente oficial cadastrados.
- Empresas do grupo do ambiente oficial cadastradas.
- Obras/centros de custo ativos do ambiente oficial revisados.
- Permissoes dos usuarios-chave do ambiente oficial revisadas.
- Modulos habilitados/desabilitados conforme decisao da diretoria.
- Pelo menos 1 fluxo de solicitacao homologado ponta a ponta.
- Pelo menos 1 fluxo financeiro homologado ponta a ponta.
- Pelo menos 1 fluxo de compra/cotacao homologado, se compras entrar no go-live.
- Checklist de deploy e rollback conhecido.
- Canal de suporte definido.

## Papeis Necessarios

### Fundador tecnico / Arquiteto do produto

- Conduzir decisoes tecnicas.
- Validar configuracoes criticas.
- Resolver bloqueios de implantacao.
- Aprovar mudancas emergenciais.

### Sponsor executivo

- Dar prioridade institucional.
- Resolver conflito entre areas.
- Validar escopo do go-live.
- Reforcar uso obrigatorio do sistema.

### Responsavel administrativo/financeiro

- Validar empresas, contas, categorias, centros de custo e titulos.
- Validar DRE, caixa, faturas e baixas.

### Responsavel de compras

- Validar solicitacoes de compra, cotacoes, fornecedores e pedidos.

### Responsavel de obras

- Validar obras, centros de custo, apropriacoes e rotinas de solicitacao.

### Responsavel RH/DP/SST

- Validar usuarios, colaboradores, documentos sensiveis e permissao de acesso.

### Usuarios-chave

- Testar fluxo real.
- Reportar bloqueios.
- Confirmar entendimento da rotina.

## Dia 0 - Mapa de Testes, Evidencias e Configuracao Amostral

### Objetivo

Preparar a implantacao antes do Dia 1, validando o sistema por smoke tests, capturas de tela e configuracoes amostrais.

### Atividades

1. Revisar scripts Playwright em `e2e/`.
2. Definir `BASE_URL` do ambiente que sera testado.
3. Criar mapa de testes por modulo.
4. Rodar smoke tests existentes.
5. Gerar relatorio HTML do Playwright.
6. Capturar evidencias visuais das rotas criticas.
7. Criar dados amostrais minimos para homologacao.
8. Configurar usuarios amostrais por perfil.
9. Configurar permissoes amostrais por perfil.
10. Definir quais screenshots entram no treinamento.
11. Registrar pendencias P0/P1 antes do Dia 1.

### Entregaveis

- Mapa de testes por modulo.
- Evidencias de smoke test.
- Lista de pendencias priorizadas.
- Configuracoes amostrais para homologacao.
- Base para treinamento operacional.

### Checklist de Aceite

- Login testado.
- Dashboard testado.
- Menus principais testados.
- Pelo menos um fluxo por modulo critico mapeado.
- Permissoes amostrais testadas.
- Evidencias salvas.
- Nenhum P0 conhecido antes do Dia 1.

## Plano Executivo de 5 Dias

## Dia 1 - Governanca, Ambiente e Dados Mestres Amostrais

### Objetivo

Preparar a base institucional amostral antes de treinar usuarios e antes de gerar movimento operacional. Em ambiente de desenvolvimento ou homologacao, nao cadastrar 100% da operacao. Cadastrar apenas o necessario para validar fluxos, permissoes e treinamento.

### Atividades

1. Confirmar ambiente ativo.
2. Atualizar versao implantada.
3. Rodar migrations pendentes.
4. Validar login, API, S3/anexos e permissao base.
5. Definir modulos habilitados para go-live.
6. Revisar empresas do grupo por amostra.
7. Definir holding e empresas vinculadas por amostra.
8. Revisar obras e centros de custo por amostra.
9. Revisar setores essenciais.
10. Revisar usuarios-chave amostrais.
11. Definir matriz de permissao inicial por perfil.
12. Definir visibilidade de dashboards/tabelas por amostra.
13. Registrar quais configuracoes deverao ser refeitas no ambiente oficial.

### Entregaveis

- Ambiente atualizado.
- Lista de modulos ativos.
- Empresas amostrais revisadas.
- Obras/centros de custo amostrais revisados.
- Usuarios-chave amostrais cadastrados.
- Permissoes iniciais amostrais configuradas.
- Lista de configuracoes oficiais que deverao ser replicadas apos promocao para `main`.

### Checklist de Aceite

- Usuario SUPERADMIN acessa configuracoes.
- Usuario comum acessa apenas areas autorizadas.
- Empresa holding e empresas operacionais amostrais estao cadastradas.
- Obras amostrais separadas de centros de custo administrativos.
- Menu nao mostra modulos desabilitados.

## Dia 2 - Solicitacoes, Obras, Compras e Fluxo Operacional

### Objetivo

Validar o fluxo operacional que movimenta a empresa no dia a dia.

### Atividades

1. Treinar abertura de solicitacao.
2. Validar selecao de obra/centro de custo.
3. Validar area responsavel.
4. Validar anexos.
5. Validar historico da solicitacao.
6. Validar status por setor.
7. Validar assumir/enviar solicitacao.
8. Treinar solicitacao de compra.
9. Validar itens, fornecedores e cotacao.
10. Validar geracao de pedido, se aplicavel.
11. Validar apropriacoes por obra/centro de custo.
12. Validar relatorios operacionais de solicitacoes/compras.

### Entregaveis

- Fluxo de solicitacao homologado.
- Fluxo de compra/cotacao homologado, se entrar no go-live.
- Usuarios de obra/compras treinados.
- Lista de ajustes operacionais priorizados.

### Checklist de Aceite

- Uma solicitacao real e criada.
- A solicitacao percorre pelo menos dois setores.
- Uma solicitacao de compra e criada.
- Uma cotacao ou pedido e simulado/homologado.
- Permissoes impedem acesso indevido.

## Dia 3 - Financeiro, DRE, Caixa, Faturas e Relatorios

### Objetivo

Validar o financeiro como fonte operacional e gerencial, sem inferencias indevidas.

### Atividades

1. Revisar categorias financeiras.
2. Revisar classificacao DRE.
3. Revisar empresas pagadoras/recebedoras.
4. Revisar contas bancarias.
5. Revisar cartoes de credito e debito.
6. Treinar criacao manual de titulo.
7. Treinar titulo gerado a partir de solicitacao.
8. Treinar baixa individual.
9. Treinar baixa em massa.
10. Validar regra de cartao de debito.
11. Validar regra de cartao de credito e fatura.
12. Validar faturas de cartao.
13. Validar DRE.
14. Validar fluxo de caixa.
15. Validar intercompany, se houver uso.
16. Validar relatorios financeiros principais.

### Entregaveis

- Fluxo financeiro basico homologado.
- Categorias financeiras revisadas.
- DRE com regra conhecida.
- Cartoes e faturas validados.
- Baixas testadas.

### Checklist de Aceite

- Titulo manual criado.
- Titulo editado antes da baixa.
- Baixa feita com PIX/transferencia.
- Baixa com cartao de debito movimenta conta vinculada.
- Baixa com cartao de credito vincula fatura.
- Relatorio DRE mostra dados quando categoria/empresa estao corretas.
- Falta de dado aparece como pendencia, nao como dado inferido.

## Dia 4 - RH/DP, SST, Fiscal, Contratos, Documentos e Seguranca

### Objetivo

Validar modulos sensiveis, acesso a documentos e controles de seguranca.

### Atividades

1. Revisar permissoes RH/DP.
2. Revisar permissoes SST.
3. Revisar documentos sensiveis.
4. Validar acesso a anexos via S3/presigned URL.
5. Validar modulo fiscal, se entrar no go-live.
6. Validar contratos vinculados a solicitacoes.
7. Validar dashboards/tabelas habilitados.
8. Validar auditoria/logs principais.
9. Revisar usuarios com acesso financeiro.
10. Revisar usuarios com acesso RH/SST.
11. Revisar usuarios com acesso fiscal.
12. Criar checklist de suporte operacional.

### Entregaveis

- Modulos sensiveis revisados.
- Permissoes criticas revisadas.
- Acesso a documentos validado.
- Checklist de suporte criado.

### Checklist de Aceite

- Usuario sem permissao nao acessa RH/DP, SST, fiscal ou financeiro.
- Usuario autorizado acessa apenas o necessario.
- Documento/anexo abre com URL assinada.
- Dashboard/tabela desabilitada nao aparece para usuario final.
- Auditoria basica esta acessivel para investigacao.

## Dia 5 - Homologacao Final, Go-Live e Suporte Assistido

### Objetivo

Concluir a implantacao com aceite formal, plano de suporte e governanca de continuidade.

### Atividades

1. Rodar checklist geral de homologacao.
2. Revisar pendencias dos dias anteriores.
3. Classificar pendencias em impeditivas e nao impeditivas.
4. Corrigir apenas bloqueios essenciais.
5. Validar fluxo completo com usuarios-chave.
6. Definir horario de go-live.
7. Definir canal de suporte.
8. Definir responsavel por triagem de chamados.
9. Definir rotina de backup/deploy.
10. Definir regra de novas demandas.
11. Registrar aceite operacional.
12. Publicar orientacao de uso para equipe.

### Entregaveis

- Go-live autorizado ou adiado com justificativa.
- Pendencias documentadas.
- Canal de suporte definido.
- Responsaveis definidos.
- Checklist final assinado/aceito.

### Checklist de Aceite

- Diretoria conhece escopo do go-live.
- Usuarios-chave conseguem operar os fluxos principais.
- Permissoes minimas estao corretas.
- Suporte sabe como agir.
- Deploy/rollback esta documentado.
- Pendencias nao impeditivas estao em backlog.

## Roteiro Diario Sugerido

### Manha

- Validacao tecnica.
- Configuracao.
- Correcao de bloqueios.
- Testes com usuario-chave.

### Tarde

- Treinamento por area.
- Homologacao assistida.
- Registro de duvidas.
- Ajustes de permissao/configuracao.

### Final do Dia

- Reuniao curta de fechamento.
- Lista de bloqueios.
- Lista de decisoes.
- Responsavel por cada pendencia.
- Go/no-go parcial.

## Matriz de Prioridade Durante os 5 Dias

### P0 - Impeditivo

Impede operacao real ou gera risco critico.

Exemplos:

- usuario nao consegue logar;
- permissao vaza dados sensiveis;
- baixa financeira gera movimento incorreto;
- solicitacao nao salva;
- documentos nao abrem;
- erro 500 em fluxo critico.

### P1 - Alto

Prejudica operacao, mas tem contorno temporario seguro.

Exemplos:

- campo visual ruim;
- relatorio secundario incompleto;
- filtro nao essencial falhando;
- texto confuso.

### P2 - Medio

Melhoria importante, mas nao bloqueia go-live.

Exemplos:

- refinamento de UX;
- exportacao adicional;
- ajuste de layout;
- automacao desejavel.

### P3 - Futuro

Nao entra na implantacao.

Exemplos:

- IA;
- WebXR;
- novas integracoes;
- novos modulos;
- multi-tenant.

## Checklist de Dados Mestres

### Empresas

- holding definida;
- empresas operacionais cadastradas;
- empresas administrativas cadastradas;
- CNPJ/razao social revisados;
- tipo gerencial definido;
- contas bancarias vinculadas corretamente.

### Obras e Centros de Custo

- obras reais marcadas como obra;
- centros administrativos marcados como centro de custo;
- empresa vinculada;
- apropriacoes revisadas;
- usuarios com acesso correto.

### Financeiro

- categorias financeiras revisadas;
- DRE classificada;
- contas bancarias cadastradas;
- cartoes cadastrados;
- cartao de debito com conta vinculada;
- cartao de credito com fechamento/vencimento;
- usuarios financeiros revisados.

### Usuarios

- usuarios ativos;
- setor correto;
- perfil correto;
- permissoes por area;
- visibilidade de dashboards/tabelas;
- MFA/politica de acesso quando aplicavel.

## Checklist de Homologacao por Modulo

### Solicitacoes

- criar solicitacao;
- anexar arquivo;
- assumir;
- enviar;
- alterar status;
- verificar historico;
- verificar permissao por setor.

### Compras

- criar solicitacao de compra;
- adicionar itens;
- fornecedores;
- cotacao;
- vencedor;
- pedido;
- relatorios.

### Financeiro

- criar titulo;
- editar titulo aberto;
- baixar titulo;
- baixa em massa;
- estornar baixa;
- fatura de cartao;
- DRE;
- fluxo de caixa;
- relatorio analitico.

### Obras/Centros de Custo

- cadastrar/revisar obra;
- definir tipo obra/centro;
- vincular empresa;
- consultar resultado;
- validar apropriacoes.

### RH/DP e SST

- validar permissao;
- cadastrar registro basico;
- anexar documento;
- consultar dashboard;
- consultar relatorio.

### Fiscal

- importar XML;
- visualizar detalhe;
- gerar/abrir DANFE;
- vincular documento;
- revisar erros.

## Riscos Principais

### Risco 1 - Tentar implantar tudo com profundidade total

Mitigacao: foco em fluxos principais, nao em todas as possibilidades.

### Risco 2 - Permissao muito aberta

Mitigacao: comecar restritivo e abrir conforme necessidade real.

### Risco 3 - Dados mestres ruins

Mitigacao: revisar empresas, obras, centros, categorias e usuarios antes dos movimentos.

### Risco 4 - Usuario operar sem treinamento

Mitigacao: treinamento curto por rotina e suporte assistido.

### Risco 5 - Corrigir demais durante implantacao

Mitigacao: separar P0/P1/P2/P3 e corrigir apenas bloqueios.

### Risco 6 - Diretoria esperar relatorio perfeito com base incompleta

Mitigacao: explicar que relatorio depende de dado operacional real, categoria correta, empresa correta e baixa correta.

## Regra de Ouro da Implantacao

O sistema deve refletir a operacao real.

Nao preencher dado por chute, nao usar fallback para informacao critica e nao mascarar ausencia de dado. Se um relatorio nao aparece, a primeira investigacao deve ser:

1. O titulo/movimento existe?
2. A empresa esta correta?
3. A categoria esta classificada?
4. A data/competencia esta correta?
5. A baixa foi feita?
6. O usuario tem permissao?
7. O modulo esta habilitado?

## Plano de Suporte Pos-Go-Live

### Primeiros 3 dias apos go-live

- suporte assistido diario;
- reuniao curta no fim do dia;
- registro de erros e duvidas;
- correcao apenas de bloqueios;
- ajuste de permissao conforme demanda real.

### Primeiras 2 semanas

- revisao semanal com liderancas;
- consolidacao de duvidas frequentes;
- atualizacao do guia de treinamento;
- classificacao do backlog.

### Primeiro mes

- revisao de dados mestres;
- revisao de permissoes;
- revisao de relatorios;
- decisao sobre novas melhorias;
- inicio formal da fase de estabilizacao tecnica.

## Go / No-Go

### Go

Liberar se:

- fluxos criticos estao funcionando;
- permissoes minimas estao seguras;
- usuarios-chave foram treinados;
- dados mestres minimos estao corretos;
- suporte esta definido;
- pendencias impeditivas foram resolvidas.

### No-Go

Adiar se:

- login ou API estao instaveis;
- permissao vaza dado sensivel;
- financeiro gera movimento incorreto;
- usuarios-chave nao conseguem operar;
- ambiente nao esta atualizavel;
- anexos/documentos criticos nao abrem.

## Resultado Esperado

Ao final dos 5 dias, o FLUXY deve estar implantado como sistema institucional interno em operacao controlada, com usuarios-chave treinados, dados mestres minimos revisados, governanca de permissao ativa e plano claro de suporte.

O foco da semana nao e esgotar o produto. O foco e iniciar a operacao real com seguranca, rastreabilidade e disciplina.
