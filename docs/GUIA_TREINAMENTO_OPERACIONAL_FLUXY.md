# Guia de Treinamento Operacional e Educacional - FLUXY

## 1. Objetivo do documento

Este documento foi criado para apoiar a implantacao, o treinamento e a operacao diaria do FLUXY.

O foco nao e tecnico. O foco e educacional e operacional.

Ele deve ajudar uma pessoa leiga em sistemas a entender:

- para que o FLUXY existe;
- como navegar no sistema;
- quais cadastros precisam estar corretos antes da operacao;
- como cada modulo deve ser usado;
- quais informacoes sao obrigatorias para gerar relatorios confiaveis;
- como a operacao diaria impacta os relatorios do Presidente, Vice Presidente e Diretorias;
- quais erros de cadastro ou lancamento podem distorcer os indicadores executivos;
- como treinar novos usuarios por modulo.

O objetivo final e simples:

> Se a operacao registrar os dados corretos no lugar correto, o FLUXY entrega informacoes confiaveis para tomada de decisao.

---

## 2. Publico alvo deste guia

Este guia deve ser usado por:

- Presidente;
- Vice Presidente;
- Diretoria Executiva;
- Diretoria Administrativa;
- Diretorias de Obras;
- Liderancas de setores;
- equipe financeira;
- equipe fiscal;
- equipe de compras;
- equipe de RH/DP;
- equipe comercial;
- usuarios solicitantes;
- usuarios de obra;
- administradores internos do sistema;
- responsaveis por treinamento e implantacao.

---

## 3. Como usar este guia nos treinamentos

Use este documento em tres formatos.

### 3.1 Treinamento executivo

Publico:

- Presidente;
- Vice Presidente;
- Diretoria;
- Conselho ou socios, quando aplicavel.

Objetivo:

- explicar o que o sistema entrega para gestao;
- mostrar quais relatorios dependem da qualidade da operacao;
- demonstrar como a informacao nasce na solicitacao, passa por compras, financeiro, fiscal e termina nos relatorios.

Duracao sugerida:

- 45 a 90 minutos.

Foco:

- indicadores;
- DRE;
- fluxo de caixa;
- resultado por obra;
- resultado por centro de custo;
- intercompany;
- riscos de dados incorretos.

### 3.2 Treinamento de gestores e liderancas

Publico:

- gerentes;
- coordenadores;
- lideres de setor;
- responsaveis por aprovacao.

Objetivo:

- ensinar a acompanhar solicitacoes;
- orientar como validar informacoes antes de aprovar;
- mostrar impactos de obra, centro de custo, apropriacao, parceiro, categoria e empresa pagadora.

Duracao sugerida:

- 1h30 a 2h.

Foco:

- rotina diaria;
- responsabilidade por dados;
- filtros;
- acompanhamento;
- aprovacao;
- cobranca de pendencias.

### 3.3 Treinamento operacional

Publico:

- usuarios que criam solicitacoes;
- compras;
- financeiro;
- fiscal;
- RH/DP;
- comercial;
- setor administrativo.

Objetivo:

- ensinar passo a passo o uso das telas;
- evitar erros de preenchimento;
- explicar o motivo de cada campo importante.

Duracao sugerida:

- 45 a 90 minutos por modulo.

Foco:

- operacao pratica;
- campos obrigatorios;
- erros comuns;
- rotina de conferencia.

---

## 4. Principio central do FLUXY

O FLUXY deve ser entendido como uma plataforma de operacao e gestao.

Ele nao deve ser usado apenas como um lugar para "abrir chamados".

O sistema conecta:

- solicitacoes;
- compras;
- cotacoes;
- contratos;
- financeiro;
- fiscal;
- obras;
- centros de custo;
- empresas do grupo;
- RH/DP;
- comercial;
- relatorios executivos.

Cada acao operacional alimenta uma visao gerencial.

Exemplo:

1. Um usuario cria uma solicitacao.
2. A solicitacao informa Obra/Centro de Custo.
3. O setor responsavel trata a solicitacao.
4. Compras pode transformar a necessidade em solicitacao de compra.
5. Cotacoes podem comparar fornecedores.
6. Financeiro pode gerar um titulo a pagar ou a receber.
7. A baixa financeira informa a empresa pagadora ou recebedora.
8. Fiscal pode importar XML e vincular documentos.
9. Relatorios mostram custo, receita, caixa, DRE e desempenho.

Se um campo for preenchido errado no inicio, o relatorio final tambem ficara errado.

---

## 5. Estrutura geral do projeto

### 5.1 Estrutura tecnica simplificada

O projeto e dividido em:

- `frontend/`: interface web usada pelos usuarios;
- `backend/`: API, regras de negocio, validacoes e integracoes;
- `backend/migrations/`: alteracoes de banco de dados;
- `docs/`: documentacao de implantacao, operacao, planejamento e treinamento;
- `frontend/src/pages/`: paginas principais do sistema;
- `frontend/src/modules/`: modulos especializados;
- `backend/src/controllers/`: entrada das rotas da API;
- `backend/src/services/`: regras de negocio;
- `backend/src/models/`: modelos das tabelas;
- `backend/src/validators/`: validacoes de dados recebidos.

Essa estrutura tecnica e importante para a equipe de implantacao e suporte, mas nao precisa ser explicada em profundidade para usuarios finais.

### 5.2 Estrutura operacional do menu

Os principais grupos do sistema sao:

- Painel;
- Solicitacoes;
- Compras;
- Financeiro;
- Fiscal;
- CRM;
- Comercial;
- Provisionamento;
- RH/DP;
- Contratos;
- Configuracoes.

Cada grupo possui telas operacionais e, quando aplicavel, uma pagina unica de Relatorios.

---

## 6. Conceitos que todos precisam entender

### 6.1 Empresa do grupo

Empresa do grupo e uma empresa juridica ou gerencial cadastrada no FLUXY.

Ela pode ser:

- Holding;
- Tesouraria;
- SPE;
- Administrativa;
- Operacional;
- Patrimonial;
- Comercial;
- RH/Folha;
- Investimentos.

Para relatorios consistentes, cada empresa precisa estar corretamente classificada.

Uso pratico:

- vincular obras e centros de custo;
- vincular contas bancarias;
- vincular titulos financeiros;
- analisar DRE por empresa;
- analisar consolidado do grupo;
- separar intercompany de receita externa real.

### 6.2 Holding

Holding e a empresa controladora do grupo.

Ela pode nao movimentar caixa diretamente, mas representa a visao consolidada do negocio.

Na pratica:

- o sistema deve saber qual empresa e a holding;
- as empresas operacionais devem estar vinculadas a ela quando fizer sentido;
- a DRE consolidada deve olhar o grupo, nao apenas uma empresa isolada.

### 6.3 Obra

Obra e um projeto operacional de construcao, incorporacao, execucao ou contrato.

Ela deve ser usada quando existe uma obra real a controlar.

Cada obra deve ter:

- nome claro;
- empresa do grupo vinculada;
- classificacao adequada;
- situacao ativa ou inativa;
- dados de orcamento quando aplicavel.

### 6.4 Centro de custo

Centro de custo e uma unidade de controle gerencial.

Toda obra e um centro de custo, mas nem todo centro de custo e uma obra.

Exemplos de centro de custo que podem nao ser obra:

- Administrativo;
- Diretoria;
- Comercial;
- RH;
- Almoxarifado;
- Equipamentos;
- Matriz;
- Manutencao;
- Tecnologia;
- Marketing.

Uso correto:

- solicitacoes administrativas devem ir para centro de custo administrativo;
- custos de obra devem ir para a obra correta;
- despesas gerais nao devem ser lancadas em uma obra apenas por falta de opcao.

### 6.5 Apropriacao

Apropriacao classifica o custo dentro da obra ou centro de custo.

Ela responde a pergunta:

> Dentro desta obra ou centro de custo, onde exatamente este gasto deve entrar?

Exemplos:

- fundacao;
- estrutura;
- acabamento;
- eletrica;
- hidraulica;
- mao de obra;
- equipamento;
- administracao local;
- custo indireto.

Importante:

- Obra/Centro de Custo define onde o custo pertence.
- Apropriacao define como esse custo sera classificado dentro desse local.

### 6.6 Parceiro

Parceiro pode ser:

- fornecedor;
- cliente;
- credor;
- prestador de servico;
- pessoa fisica;
- empresa vinculada.

Uso correto:

- toda solicitacao financeira deve ter parceiro quando houver compromisso com terceiro;
- titulos a pagar precisam indicar quem recebera;
- titulos a receber precisam indicar quem pagara;
- XML fiscal deve ser conferido com fornecedor/parceiro.

### 6.7 Categoria financeira

Categoria financeira classifica o titulo para relatorios financeiros e DRE.

Ela responde a pergunta:

> Este valor representa que tipo de receita, custo, despesa, imposto ou resultado?

Exemplos:

- receita de obra;
- receita de venda;
- material de construcao;
- servico de terceiro;
- folha;
- encargos;
- despesa administrativa;
- despesa financeira;
- imposto;
- transferencia interna.

Para DRE confiavel, a categoria precisa estar correta.

### 6.8 Intercompany

Intercompany e uma movimentacao entre empresas do mesmo grupo.

Ela nao representa riqueza nova para o grupo.

Exemplos:

- aporte;
- emprestimo entre empresas;
- reembolso;
- rateio;
- cobertura de caixa;
- transferencia operacional;
- pagamento de folha em outra empresa;
- pagamento de imposto por outra empresa.

Regra essencial:

- intercompany deve ser marcado de forma explicita;
- deve informar empresa origem;
- deve informar empresa destino;
- deve informar tipo;
- deve informar motivo quando possivel;
- a DRE consolidada deve eliminar o que for movimentacao interna.

---

## 7. Fluxo ideal de implantacao

Antes de liberar o sistema para uso amplo, siga esta ordem.

### 7.1 Etapa 1 - Definir governanca

Responsavel:

- Presidencia;
- Diretoria;
- administrador do sistema.

Passo a passo:

1. Definir quem sera SUPERADMIN.
2. Definir quem podera configurar usuarios e permissoes.
3. Definir quais modulos estarao ativos.
4. Definir quem responde por cada modulo.
5. Definir quem valida qualidade dos dados.
6. Definir rotina de conferencia semanal.

Resultado esperado:

- todos sabem quem pode configurar e quem pode operar.

### 7.2 Etapa 2 - Cadastrar empresas do grupo

Tela:

- `Empresas do Grupo`.

Passo a passo:

1. Cadastrar a holding.
2. Marcar o tipo gerencial como `Holding`.
3. Cadastrar as empresas operacionais.
4. Vincular cada empresa a holding quando aplicavel.
5. Definir se a empresa consolida no grupo.
6. Definir se a empresa opera caixa.
7. Definir se a empresa tem operacao propria.
8. Salvar e revisar a lista.

Cuidados:

- nao cadastrar a mesma empresa duas vezes;
- usar nomes padronizados;
- manter CNPJ correto quando disponivel;
- nao confundir empresa juridica com centro de custo.

### 7.3 Etapa 3 - Cadastrar obras e centros de custo

Tela:

- `Obras`.

Passo a passo:

1. Cadastrar obras reais.
2. Marcar como obra quando for obra.
3. Cadastrar centros de custo administrativos.
4. Marcar como centro de custo quando nao for obra.
5. Vincular cada obra ou centro de custo a empresa do grupo correta.
6. Inativar cadastros que nao devem mais receber lancamentos.

Cuidados:

- nao usar obra como deposito de despesas administrativas;
- nao criar nomes genericos demais;
- separar obra de centro de custo;
- revisar cadastros antigos que foram criados como obra apenas para uso administrativo.

### 7.4 Etapa 4 - Cadastrar apropriacoes

Tela:

- `Gestao de Apropriacoes`.

Passo a passo:

1. Selecionar a obra ou centro de custo.
2. Cadastrar as apropriacoes que representam o orcamento ou classificacao interna.
3. Usar nomes claros.
4. Evitar duplicidades.
5. Revisar se a equipe entende quando usar cada apropriacao.

Cuidados:

- apropriacao nao substitui categoria financeira;
- apropriacao nao substitui centro de custo;
- apropriacao deve refletir a estrutura de custo da obra.

### 7.5 Etapa 5 - Cadastrar parceiros

Tela:

- `Parceiros`.

Passo a passo:

1. Cadastrar fornecedores principais.
2. Cadastrar clientes principais.
3. Conferir CPF/CNPJ.
4. Definir categoria quando aplicavel.
5. Evitar nomes duplicados.

Cuidados:

- parceiro duplicado prejudica relatorios;
- CNPJ incorreto dificulta vinculo fiscal;
- parceiro generico prejudica rastreabilidade.

### 7.6 Etapa 6 - Cadastrar categorias financeiras

Tela:

- `Financeiro > Cadastros`.

Passo a passo:

1. Revisar categorias atuais.
2. Definir se cada categoria e PAGAR, RECEBER ou AMBOS.
3. Classificar a categoria para DRE.
4. Identificar categorias que nao entram na DRE.
5. Separar receita, custo, despesa, resultado financeiro, imposto e patrimonio.
6. Definir a classificacao gerencial da categoria.

Como classificar endividamento:

- o sistema nao deve tentar descobrir endividamento pelo nome da categoria, pelo nome do fornecedor ou pela descricao do titulo;
- somente categorias marcadas com `Classificacao gerencial = Endividamento` entram no relatorio de Endividamento;
- essa regra evita que juros bancarios, tarifas, despesas financeiras comuns ou transferencias internas sejam tratadas como principal de divida;
- a trilha correta deve ser sempre: `Relatorio de Endividamento -> Titulo financeiro -> Categoria financeira -> Classificacao gerencial = Endividamento`.

Exemplos:

- `Principal de financiamento bancario`: classificacao gerencial `Endividamento`;
- `Principal de emprestimo`: classificacao gerencial `Endividamento`;
- `Antecipacao de recebiveis`: classificacao gerencial `Endividamento`, quando a empresa tratar como divida financeira;
- `Juros sobre financiamento`: manter como categoria de resultado financeiro da DRE, nao como principal de endividamento;
- `Tarifa bancaria`: manter como despesa financeira, nao como endividamento;
- `Transferencia entre empresas do grupo`: tratar como intercompany quando aplicavel, nao como divida externa consolidada.

Atalhos de tarifa bancaria:

- todo atalho de tarifa usado na conciliacao precisa ter uma categoria financeira explicita;
- use categoria do tipo `PAGAR` ou `AMBOS`;
- normalmente a categoria deve ficar no grupo DRE `Resultado financeiro`, salvo decisao gerencial diferente;
- sem categoria, o sistema bloqueia o uso do atalho porque a tarifa ficaria sem leitura gerencial;
- a tarifa conciliada pelo atalho entra como movimento financeiro avulso, com empresa real da conta bancaria e categoria real configurada;
- nao usar atalho de tarifa para fornecedor, compra, imposto, folha ou qualquer despesa que precise de titulo, parceiro, obra ou centro de custo.

Cuidados:

- categoria errada distorce a DRE;
- categoria de endividamento errada distorce o passivo gerencial;
- categorias muito genericas atrapalham analise;
- categorias duplicadas confundem operadores.

### 7.7 Etapa 7 - Cadastrar contas bancarias

Tela:

- `Financeiro > Cadastros`.

Passo a passo:

1. Cadastrar cada conta bancaria real.
2. Vincular a conta bancaria a empresa do grupo correta.
3. Informar banco, agencia e conta.
4. Validar se a conta gera OFX.
5. Usar nomes claros, como `CSCB - Banco X - Conta Y`.

Cuidados:

- toda baixa deve indicar a empresa pagadora ou recebedora de forma explicita;
- a conta bancaria ajuda a conferencia, mas nao deve ser usada como unica inferencia gerencial;
- contas usadas em abertura/fechamento de caixa precisam ter empresa do grupo vinculada;
- nao abrir caixa em conta sem empresa, porque isso cria saldo realizado sem dono gerencial;
- OFX deve ser importado na conta correta.

### 7.8 Etapa 8 - Treinar usuarios por perfil

Passo a passo:

1. Treinar solicitantes.
2. Treinar usuarios de obra.
3. Treinar compras.
4. Treinar financeiro.
5. Treinar fiscal.
6. Treinar diretoria.
7. Treinar administradores.

Cuidados:

- nao liberar modulo sem treinamento minimo;
- operadores precisam entender impacto dos campos;
- gestores precisam cobrar preenchimento correto.

---

## 8. Modulo Painel

### 8.1 Objetivo

O Painel e a entrada principal do sistema.

Ele deve mostrar ao usuario:

- contexto geral;
- atalhos;
- suporte;
- acesso rapido aos modulos;
- informacoes relevantes conforme permissao.

### 8.2 Passo a passo para uso

1. Acessar o sistema.
2. Fazer login.
3. Conferir se o nome do usuario aparece corretamente.
4. Conferir se o menu lateral mostra os modulos permitidos.
5. Usar o botao de suporte quando precisar de ajuda.

### 8.3 Cuidados no treinamento

Explique que cada usuario pode ver menus diferentes.

Isso ocorre por:

- perfil;
- setor;
- permissoes;
- modulos ativos.

Se uma pessoa nao encontrar uma tela, o primeiro passo e verificar permissao.

---

## 9. Modulo Solicitacoes

### 9.1 Objetivo

O modulo de solicitacoes e a base operacional do FLUXY.

Ele registra necessidades, pedidos, demandas, comunicacoes formais e fluxos entre setores.

### 9.2 Quando criar uma solicitacao

Criar uma solicitacao quando houver:

- necessidade de compra;
- necessidade de contrato;
- pedido para outro setor;
- demanda de obra;
- demanda administrativa;
- necessidade de analise;
- registro que precisa ficar rastreavel.

### 9.3 Passo a passo para criar solicitacao

Tela:

- `Nova Solicitacao`.

Passo a passo:

1. Selecionar Obra/Centro de Custo.
2. Selecionar area responsavel.
3. Selecionar tipo de solicitacao.
4. Preencher descricao clara.
5. Informar valor quando houver impacto financeiro.
6. Informar vencimento quando houver prazo financeiro ou operacional.
7. Informar parceiro quando houver fornecedor, cliente ou terceiro envolvido.
8. Informar apropriacao quando a solicitacao tiver custo ou receita relacionado.
9. Anexar documentos quando necessario.
10. Revisar todos os campos.
11. Enviar a solicitacao.

### 9.4 Como escrever uma boa descricao

A descricao deve responder:

- o que esta sendo solicitado;
- por que e necessario;
- para qual obra ou centro de custo;
- qual prazo esperado;
- qual fornecedor ou parceiro, se ja houver;
- quais anexos comprovam a necessidade.

Exemplo ruim:

- `Comprar material`.

Exemplo bom:

- `Solicito compra de 50 sacos de cimento CP-II para a Obra X, apropriacao Estrutura, uso previsto na concretagem da laje do bloco B na proxima semana.`

### 9.5 Acompanhamento da solicitacao

Tela:

- `Solicitacoes`;
- detalhe da solicitacao.

Passo a passo:

1. Abrir a lista de solicitacoes.
2. Usar filtros por status, setor, obra ou responsavel.
3. Abrir a solicitacao desejada.
4. Ler historico antes de agir.
5. Verificar anexos.
6. Conferir responsavel atual.
7. Alterar status somente quando a etapa realmente mudou.
8. Comentar sempre que a decisao precisar de contexto.
9. Enviar para outro setor quando a responsabilidade mudar.

### 9.6 Regras importantes

- Toda acao fica registrada no historico.
- A solicitacao deve estar no setor correto antes de ser tratada.
- Usuarios devem assumir ou receber responsabilidade conforme regra interna.
- Enviar para setor errado atrasa a operacao.
- Arquivar nao exclui a solicitacao; apenas tira da visao do usuario.

### 9.7 Impacto nos relatorios

As solicitacoes alimentam:

- volume de demandas por setor;
- tempo de atendimento;
- gargalos;
- custos por obra;
- origem de compras;
- contratos vinculados;
- titulos financeiros gerados.

Se a solicitacao for aberta com obra errada, o resultado por obra ficara errado.

---

## 10. Modulo Compras

### 10.1 Objetivo

O modulo de compras organiza pedidos, solicitacoes de compra, cotacoes, fornecedores, insumos e comparativos.

### 10.2 Fluxo recomendado

Fluxo ideal:

1. Nasce uma necessidade em solicitacao.
2. A necessidade vira solicitacao de compra.
3. Compras revisa itens, quantidades e especificacoes.
4. Compras envia cotacao para fornecedores.
5. Fornecedores respondem pelo link publico ou arquivo.
6. O sistema monta comparativo.
7. Compras escolhe vencedor conforme regra.
8. Pedido de compra e gerado ou atualizado.
9. Financeiro e fiscal usam as informacoes quando necessario.

### 10.3 Solicitacao de compra

Tela:

- `Compras > Solicitacoes de Compra`.

Passo a passo:

1. Abrir a solicitacao de compra.
2. Conferir obra ou centro de custo.
3. Conferir apropriacao.
4. Conferir itens.
5. Conferir unidade de medida.
6. Conferir quantidade.
7. Conferir prazo desejado.
8. Conferir anexos.
9. Corrigir informacoes antes de cotar.

### 10.4 Cotacoes

Tela:

- `Compras > Cotacoes`.

Passo a passo:

1. Selecionar solicitacao de compra.
2. Selecionar fornecedores.
3. Definir prazo de resposta.
4. Gerar links de cotacao.
5. Enviar por WhatsApp ou outro canal.
6. Acompanhar respostas.
7. Conferir valores e condicoes.
8. Comparar menor preco, prazo, condicao e qualidade.
9. Justificar quando nao escolher o menor preco, se a regra exigir.
10. Encerrar cotacao.

### 10.5 Fornecedores

Tela:

- `Gestao de Fornecedores`.

Passo a passo:

1. Cadastrar fornecedor com nome claro.
2. Informar contato.
3. Informar WhatsApp ou e-mail.
4. Revisar dados antes de enviar cotacao.

### 10.6 Cadastros de compras

Cadastros importantes:

- insumos;
- unidades;
- categorias;
- fornecedores;
- apropriacoes.

Cuidados:

- unidade errada gera cotacao errada;
- quantidade errada gera decisao errada;
- fornecedor duplicado dificulta historico;
- item mal descrito gera resposta ruim.

### 10.7 Impacto nos relatorios

Compras alimenta:

- economia por cotacao;
- fornecedores mais usados;
- tempo de resposta;
- itens mais comprados;
- compras por obra;
- aderencia a regra de cotacao;
- risco de compra sem comparativo.

---

## 11. Modulo Financeiro

### 11.1 Objetivo

O modulo financeiro controla:

- contas a pagar;
- contas a receber;
- baixas;
- contas bancarias;
- conciliacao;
- DRE;
- resultado por obra;
- resultado por centro de custo;
- fluxo previsto x realizado;
- movimentos intercompany.

### 11.2 Principio operacional do financeiro

O financeiro deve registrar fatos reais.

Regras essenciais:

- nao inferir empresa pagadora;
- nao criar baixa sem evento real;
- nao classificar titulo em categoria generica sem necessidade;
- nao usar centro de custo incorreto para "fechar lancamento";
- nao misturar transferencia interna com receita real;
- nao misturar aporte com faturamento.

### 11.3 Criar titulo financeiro manual

Tela:

- `Financeiro > Titulos Financeiros > Novo`.

Passo a passo:

1. Escolher tipo: PAGAR ou RECEBER.
2. Informar parceiro.
3. Informar empresa do grupo.
4. Informar obra ou centro de custo.
5. Informar apropriacao, se aplicavel.
6. Informar categoria financeira.
7. Informar competencia.
8. Informar vencimento.
9. Informar valor.
10. Marcar se considera na DRE.
11. Marcar intercompany somente se for movimentacao entre empresas do grupo.
12. Se for intercompany, informar origem, destino, tipo e motivo.
13. Conferir a previa de impacto gerencial.
14. Revisar.
15. Salvar.

Na previa de impacto gerencial, confira:

- se o titulo entra ou nao na DRE;
- se a categoria financeira esta classificada para DRE;
- se o valor aparece como entrada ou saida prevista no caixa;
- se uma operacao intercompany sera eliminada ou mantida no consolidado;
- se origem e destino estao coerentes quando houver intercompany.

Regra de consistencia:

- a empresa do titulo deve ser informada na tela antes de salvar;
- o sistema nao deve herdar silenciosamente a empresa da obra, da baixa ou da conta bancaria;
- se a obra/centro de custo estiver vinculado a uma empresa, a empresa do titulo precisa coincidir com esse cadastro;
- se a empresa estiver incorreta, corrija o cadastro operacional antes de gerar o titulo.

### 11.4 Criar titulo a partir da solicitacao

Tela:

- detalhe da solicitacao;
- card financeiro;
- acao `Gerar conta`.

Passo a passo:

1. Abrir a solicitacao.
2. Conferir se a solicitacao esta correta.
3. Conferir obra ou centro de custo.
4. Conferir parceiro.
5. Conferir apropriacao.
6. Clicar em `Gerar conta`.
7. Informar tipo: pagar ou receber.
8. Informar empresa do grupo.
9. Informar categoria financeira.
10. Informar competencia.
11. Informar vencimento.
12. Informar valor.
13. Informar intercompany se for o caso.
14. Conferir a previa de impacto gerencial.
15. Salvar.

Cuidados:

- se o titulo nasce de solicitacao errada, corrija a solicitacao antes;
- nao gerar titulo duplicado;
- conferir se ja existe titulo relacionado.
- a empresa do titulo precisa ser conferida no modal de geracao;
- o sistema nao deve criar titulo sem empresa do grupo informada.
- nao salvar quando a previa apontar DRE pendente de categoria, salvo em caso conscientemente fora da DRE.

### 11.5 Registrar baixa de titulo

Tela:

- detalhe do titulo financeiro.

Passo a passo:

1. Abrir o titulo.
2. Conferir parceiro.
3. Conferir tipo: PAGAR ou RECEBER.
4. Conferir valor em aberto.
5. Conferir vencimento.
6. Clicar em baixa.
7. Informar data real da baixa.
8. Informar empresa pagadora ou recebedora.
9. Informar conta bancaria.
10. Informar forma de pagamento ou recebimento.
11. Informar valor pago ou recebido.
12. Informar juros, multa ou desconto se houver.
13. Se a empresa da baixa for diferente da empresa do titulo, marcar baixa intercompany.
14. Informar o tipo intercompany e o motivo.
15. Anexar comprovante quando aplicavel.
16. Salvar.

Regra fundamental:

- a empresa pagadora ou recebedora deve ser informada explicitamente.
- empresa diferente da empresa do titulo so deve ser usada quando houver relacao intercompany real.
- a baixa nao preenche nem corrige a empresa do titulo; se o titulo estiver sem empresa, corrija o titulo antes da baixa.
- a conta bancaria selecionada precisa estar vinculada a mesma empresa informada na baixa.

Nao usar deducao automatica para substituir dado real.

Exemplo:

- titulo de despesa pertence a Empresa A;
- a conta bancaria usada na baixa pertence a Empresa B;
- nesse caso, marque baixa intercompany, escolha o tipo correto e registre o motivo;
- o caixa realizado ficara na Empresa B e o titulo continuara mostrando a responsabilidade economica da Empresa A.

### 11.5.1 Baixa automatica por retorno de boleto

Quando o banco retorna liquidacao de boleto, o sistema pode aplicar a baixa automaticamente somente se os cadastros estiverem consistentes.

Antes de importar retorno de boleto, conferir:

1. O titulo a receber possui empresa do grupo informada.
2. O convenio bancario possui empresa do grupo informada.
3. A conta bancaria do convenio possui empresa vinculada.
4. A empresa da conta bancaria e a mesma empresa do convenio.
5. A empresa do titulo e a mesma empresa da conta bancaria que recebeu o dinheiro.

Se a conta bancaria do retorno pertencer a empresa diferente da empresa do titulo:

- nao aplicar baixa automatica;
- revisar se existe uma operacao intercompany real;
- registrar a baixa manual como intercompany, informando origem, destino, tipo e motivo;
- nao ajustar o titulo ou o retorno apenas para "passar" no processamento.

Motivo:

- retorno bancario confirma recebimento real na conta;
- DRE e caixa consolidado dependem da empresa correta no titulo e na baixa;
- recebimento por empresa diferente sem intercompany distorce resultado por empresa e consolidado.

### 11.5.2 Geracao de boleto Caixa

Antes de gerar boleto:

1. Conferir se o titulo e `RECEBER`.
2. Conferir se o titulo esta `ABERTO` ou `PARCIAL`.
3. Conferir se o titulo possui empresa do grupo informada.
4. Conferir se o pagador possui nome e CPF/CNPJ.
5. Conferir se o convenio Caixa, quando tiver empresa informada, pertence a mesma empresa do titulo.

Regras:

- boleto nao deve nascer sem empresa do titulo;
- a empresa do boleto vem do titulo financeiro, nao da conta futura do retorno;
- se o convenio Caixa estiver vinculado a uma empresa diferente, corrigir o convenio ou o titulo antes de emitir;
- a baixa pelo retorno bancario continua validando conta, convenio e titulo separadamente.

### 11.5.3 Remessa e retorno Caixa

Antes de gerar remessa Caixa:

1. Conferir se o convenio Caixa possui empresa do grupo.
2. Conferir se o convenio Caixa possui conta bancaria.
3. Conferir se a conta bancaria do convenio possui a mesma empresa do convenio.
4. Conferir se todos os boletos selecionados possuem empresa.
5. Conferir se a empresa de cada boleto e a mesma empresa do respectivo titulo.
6. Conferir se todos os boletos da remessa pertencem a empresa do convenio.

Antes de importar retorno Caixa:

1. Selecionar o convenio correto.
2. Conferir se o convenio possui empresa do grupo.
3. Conferir se o convenio possui conta bancaria.
4. Conferir se a conta bancaria pertence a mesma empresa do convenio.

Regras:

- remessa nao deve ser gerada com convenio sem empresa;
- remessa nao deve misturar boletos de empresas diferentes da empresa do convenio;
- retorno nao deve ser importado em convenio sem empresa ou sem conta bancaria;
- a baixa automatica so ocorre quando titulo, boleto, convenio e conta bancaria estao coerentes;
- divergencia de empresa no retorno deve ser tratada como revisao operacional ou baixa intercompany manual, nunca como ajuste por deducao.

### 11.6 Corrigir baixa

Quando usar:

- valor errado;
- data errada;
- conta errada;
- empresa errada;
- forma de pagamento errada.

Passo a passo:

1. Abrir titulo.
2. Localizar baixa.
3. Clicar em corrigir baixa.
4. Ajustar campos.
5. Salvar.
6. Registrar observacao quando necessario.

### 11.7 Estornar baixa

Quando usar:

- baixa registrada indevidamente;
- pagamento nao ocorreu;
- recebimento foi cancelado;
- erro operacional grave.

Passo a passo:

1. Abrir titulo.
2. Localizar baixa.
3. Clicar em estornar.
4. Confirmar apenas se tiver certeza.
5. Registrar novamente se necessario.

### 11.8 Conciliacao bancaria

Tela:

- `Financeiro > Conciliacao`.

Passo a passo:

1. Selecionar conta bancaria.
2. Importar OFX da conta correta.
3. Aguardar leitura dos lancamentos.
4. Conferir sugestoes de conciliacao.
5. Comparar data, valor e historico.
6. Confirmar conciliacao quando o movimento bater.
7. Quando o lancamento for transferencia entre contas, selecionar a conta contraparte.
8. Se as contas forem de empresas diferentes, selecionar o tipo intercompany e informar o motivo.
9. Manter `Eliminar do consolidado do grupo` marcado quando a transferencia nao representar riqueza externa.
10. Resolver divergencias manualmente.

Cuidados:

- a conta bancaria escolhida para importar OFX precisa estar vinculada a empresa do grupo;
- o lancamento bancario importado carrega a empresa da conta bancaria, sem fallback por titulo, parceiro ou descricao;
- ao conciliar como transferencia, a empresa do lancamento OFX precisa continuar igual a empresa da conta importada;
- ao confirmar conciliacao, o movimento financeiro precisa ser da mesma conta e da mesma empresa do lancamento bancario;
- tarifa bancaria conciliada usa a empresa do lancamento bancario e exige que essa empresa seja a mesma da conta;
- tarifa bancaria conciliada pelo atalho exige categoria financeira configurada em `Financeiro > Cadastros`;
- a categoria da tarifa define onde o valor entra na DRE;
- OFX nao deve criar baixa automaticamente sem conferencia;
- OFX da conta errada distorce conciliacao;
- baixa precisa existir para ser conciliada;
- conciliacao e conferencia, nao substitui operacao financeira;
- transferencia entre contas da mesma empresa e transferencia interna de caixa;
- transferencia entre contas de empresas diferentes deve ter tipo e motivo intercompany.

### 11.8.1 Conciliar fatura de cartao

Quando usar:

- quando o lancamento bancario representa o pagamento de uma fatura de cartao inteira;
- quando os titulos da fatura ja foram criados e vinculados ao cartao correto.

Regras:

- a baixa da fatura exige conta bancaria informada de forma explicita;
- a conta bancaria usada na baixa precisa estar vinculada a empresa real que pagou a fatura;
- todos os titulos da fatura precisam estar vinculados a mesma empresa da conta bancaria;
- se uma empresa pagar fatura/titulo de outra empresa, nao conciliar como fatura comum antes de modelar a operacao intercompany real.

Cuidados:

- nao usar a conta do cartao como substituto automatico da empresa pagadora;
- se a fatura tiver titulos de empresas diferentes, revisar os titulos antes de baixar;
- uma fatura conciliada baixa os titulos individualmente e afeta DRE, caixa realizado e relatorios por empresa.

### 11.8.2 Pagamentos em Massa

Tela:

- `Financeiro > Pagamentos em Massa`.

Objetivo:

- preparar lotes de pagamento a partir de titulos a pagar elegiveis;
- manter separacao entre aprovacao, envio bancario e baixa financeira;
- registrar rastreabilidade operacional antes de qualquer baixa.

Leitura inicial da tela:

- `Conta pagadora`: mostra quantas contas pagadoras ativas existem para preparar lotes;
- `Aguardando aprovacao`: mostra lotes que ainda dependem de conferencia e aprovacao;
- `Banco / retorno`: mostra lotes enviados, em processamento ou com falha tecnica;
- `Baixa pendente`: mostra pagamentos confirmados pelo banco que ainda aguardam confirmacao de baixa financeira.

Fluxo correto:

1. Abrir `Financeiro > Pagamentos em Massa`.
2. Conferir se existe conta pagadora cadastrada, ativa e vinculada a empresa pagadora real.
3. Entrar em `Titulos elegiveis`.
4. Filtrar vencimento, parceiro, obra ou centro de custo quando necessario.
5. Clicar em `Buscar elegiveis`.
6. Conferir credor, favorecido PIX, vencimento e saldo de cada titulo.
7. Selecionar apenas os titulos que realmente devem ser pagos.
8. Conferir conta pagadora e data programada.
9. Clicar em `Gerar lote`.
10. Entrar em `Lotes`.
11. Selecionar o lote criado.
12. Clicar em `Submeter`.
13. Aprovadores conferem valor, itens, conta pagadora e favorecidos.
14. Cada aprovador informa MFA e clica em `Aprovar`.
15. Depois das aprovacoes exigidas, enviar ao banco ou ao ambiente mock/sandbox.
16. Aguardar confirmacao bancaria.
17. Entrar em `Confirmar baixa`.
18. Confirmar a baixa somente dos pagamentos efetivamente confirmados pelo banco.

Regra de rejeicao:

- rejeitar lote exige justificativa real;
- a justificativa deve explicar o problema encontrado;
- nao usar textos genericos como "rejeitado pela operacao";
- exemplos validos: favorecido incorreto, conta pagadora incorreta, data programada errada, titulo incluido indevidamente, valor divergente.

Cuidados:

- baixa financeira nao deve ocorrer no momento da geracao do lote;
- lote aprovado ainda nao significa pagamento realizado;
- pagamento realizado depende de confirmacao bancaria;
- se o banco rejeitar ou falhar, corrigir a causa antes de reprocessar;
- se um lote for cancelado ou rejeitado, os titulos devem ser revisados antes de entrar em novo lote;
- conta pagadora precisa representar a empresa real que vai movimentar o caixa;
- nao usar conta pagadora sem empresa vinculada para "resolver depois";
- se a conta pagadora aparecer como incompleta, corrigir o cadastro antes de gerar lote;
- a empresa pagadora nao deve ser deduzida pela conta bancaria ou pelo nome do banco: ela precisa estar preenchida explicitamente.
- a baixa gerada apos confirmacao bancaria usa a empresa da conta pagadora do lote; se a conta bancaria interna estiver sem empresa ou com empresa diferente, o cadastro deve ser corrigido antes da baixa.

### 11.9 Grupo Consolidado

Tela:

- `Financeiro > Relatorios > Grupo Consolidado`.

Objetivo:

- ser a primeira leitura executiva do financeiro;
- reunir DRE, caixa, intercompany e obras em uma visao unica;
- indicar rapidamente se o grupo esta gerando patrimonio, consumindo caixa ou dependendo de movimentacoes internas.

Passo a passo para analisar:

1. Selecionar o periodo.
2. Selecionar a Holding quando a analise for de um grupo especifico.
3. Manter `Eliminar intercompany no consolidado` marcado para a leitura principal.
4. Conferir `Caixa consolidado realizado`.
5. Conferir `EBITDA`.
6. Conferir `Lucro/Prejuizo liquido`.
7. Conferir `Necessidade futura de caixa`.
8. Conferir o volume de `Intercompany eliminado`.
9. Conferir `Endividamento aberto`.
10. Abrir DRE, Fluxo Consolidado, Intercompany ou Endividamento quando algum indicador precisar de detalhe.

Como interpretar:

- Caixa consolidado realizado vem das baixas financeiras registradas.
- EBITDA e Lucro/Prejuizo Liquido vem da DRE gerencial.
- Necessidade futura de caixa vem do menor saldo previsto dentro do periodo analisado.
- Intercompany eliminado mostra movimentacoes internas retiradas da leitura consolidada.
- Endividamento aberto vem somente de categorias financeiras marcadas explicitamente como `Endividamento`.
- Resultado por empresa mostra onde o resultado liquido esta concentrado.
- Obras por caixa compara recebido menos executado na base atual de obras.

Cuidados:

- esta tela nao substitui a conferencia analitica;
- se algum numero parecer errado, abrir primeiro o Diagnostico DRE;
- empresa, baixa e intercompany precisam estar preenchidos corretamente para a leitura executiva ficar confiavel.
- se endividamento estiver zerado indevidamente, revisar primeiro o cadastro da categoria financeira do titulo.

### 11.10 DRE Gerencial

Tela:

- `Financeiro > Relatorios > DRE`.

Objetivo:

- mostrar se o grupo e as empresas estao gerando ou destruindo patrimonio.

A DRE deve separar:

- Receita Bruta;
- Deducoes;
- Receita Liquida;
- Custos;
- Lucro Bruto;
- Despesas Operacionais;
- EBITDA;
- Depreciacao/Amortizacao, quando existir;
- EBIT;
- Resultado Financeiro;
- Resultado antes de IRPJ/CSLL;
- IRPJ/CSLL;
- Lucro ou Prejuizo Liquido.

Passo a passo para analisar:

1. Selecionar periodo.
2. Escolher visao consolidada ou empresa especifica.
3. Conferir se intercompany esta eliminado no consolidado.
4. Conferir Receita Liquida.
5. Conferir Custo.
6. Conferir EBITDA.
7. Conferir Resultado Financeiro.
8. Conferir Lucro/Prejuizo Liquido.
9. Abrir diagnostico se algum numero parecer inconsistente.

### 11.11 Diagnostico da DRE

Tela:

- `Financeiro > Relatorios > Diagnostico DRE`.

Objetivo:

- mostrar titulos e cadastros que impedem uma DRE confiavel.

O diagnostico deve ser usado para encontrar:

- titulo sem empresa;
- titulo sem categoria;
- titulo sem competencia;
- titulo sem classificacao DRE;
- intercompany sem origem;
- intercompany sem destino;
- intercompany sem tipo;
- obra sem empresa;
- centro de custo sem empresa;
- baixa sem empresa pagadora ou recebedora;
- baixa com empresa diferente do titulo sem intercompany completo;
- transferencia entre empresas sem tipo ou motivo intercompany;
- transferencia interna entre contas da mesma empresa marcada como intercompany.

Rotina recomendada:

- financeiro revisa semanalmente;
- administrador corrige cadastros;
- diretoria acompanha pendencias criticas.

### 11.12 Endividamento Gerencial

Tela:

- `Financeiro > Relatorios > Endividamento`.

Objetivo:

- mostrar dividas e compromissos financeiros abertos do grupo sem inferencia por texto;
- separar principal de divida de juros, tarifas e despesas financeiras da DRE;
- permitir leitura por Holding, empresa, obra/centro de custo e vencimento.

Regra mais importante:

- o titulo so entra no relatorio de endividamento quando sua categoria financeira estiver com `Classificacao gerencial = Endividamento`.

Passo a passo para preparar as categorias:

1. Abrir `Financeiro > Cadastros`.
2. Ir em `Categorias financeiras`.
3. Editar a categoria usada para emprestimos, financiamentos, antecipacoes, parcelamentos ou principal de divida.
4. Selecionar `Classificacao gerencial = Endividamento`.
5. Salvar.
6. Manter juros, multas, tarifas bancarias e despesas financeiras comuns como categorias de resultado financeiro da DRE, nao como principal de endividamento.

Passo a passo para analisar:

1. Abrir `Financeiro > Relatorios > Endividamento`.
2. Selecionar periodo.
3. Filtrar por Holding, empresa ou obra/centro de custo quando necessario.
4. Manter `Eliminar intercompany no consolidado` marcado na leitura principal.
5. Conferir `Endividamento aberto`.
6. Conferir `Saldo vencido`.
7. Conferir `Vence no periodo` e `Vence em 30 dias`.
8. Abrir a lista de titulos classificados quando houver divergencia.

Cuidados:

- nao classificar uma despesa comum como endividamento apenas para aparecer no relatorio;
- nao deixar categoria de emprestimo como operacional;
- endividamento e uma classificacao gerencial da categoria financeira, nao uma deducao automatica pelo nome do fornecedor ou descricao do titulo;
- juros e tarifas devem aparecer no resultado financeiro da DRE quando forem despesa do periodo;
- amortizacao/principal de divida deve aparecer no endividamento e no fluxo de caixa, mas nao deve inflar despesa operacional da DRE.

### 11.13 Resultado de Obras

Tela:

- `Financeiro > Relatorios > Resultado de Obras`.

Objetivo:

- mostrar resultado apenas do que esta marcado como obra.

Passo a passo:

1. Selecionar periodo.
2. Conferir obra.
3. Comparar previsto, executado e recebido.
4. Identificar obras consumindo caixa.
5. Abrir detalhes quando houver divergencia.

### 11.14 Centros de Custo

Tela:

- `Financeiro > Relatorios > Centros de Custo`.

Objetivo:

- analisar despesas e resultados de centros que nao sao necessariamente obras.

Exemplos:

- Administrativo;
- Comercial;
- RH;
- Diretoria;
- Matriz.

### 11.15 Intercompany

Quando marcar intercompany:

- aporte;
- emprestimo;
- cobertura de caixa;
- reembolso entre empresas;
- rateio;
- folha paga por outra empresa;
- imposto pago por outra empresa.

Transferencia entre contas da mesma empresa nao deve ser tratada como receita ou despesa. Ela e apenas transferencia interna de caixa e deve ficar fora da DRE.

Campos obrigatorios:

- empresa origem;
- empresa destino;
- tipo;
- motivo recomendado;
- eliminar no consolidado quando nao gerar riqueza externa.

Cuidados:

- receber dinheiro de outra empresa do grupo nao e receita real do grupo;
- pagar despesa de outra empresa precisa ficar rastreavel;
- empresa com prejuizo isolado pode ser normal se ela for centro operacional, RH/Folha ou administrativa;
- analise consolidada deve eliminar espelhos internos.

### 11.15 Relatorio Intercompany

Tela:

- `Financeiro > Relatorios > Intercompany`.

Objetivo:

- mostrar quem transfere, financia, reembolsa ou cobre caixa de quem dentro do grupo.

Passo a passo:

1. Selecionar periodo.
2. Filtrar por holding, se necessario.
3. Filtrar por empresa, se a analise for individual.
4. Filtrar por tipo de intercompany quando a duvida for especifica.
5. Conferir valor previsto.
6. Conferir valor realizado por baixas ativas.
7. Conferir transferencias financeiras intercompany registradas no caixa ou conciliacao.
8. Conferir relacoes entre empresas.
9. Abrir titulos analiticos quando algum valor precisar de explicacao.

Como interpretar:

- valor previsto mostra os titulos intercompany registrados;
- valor realizado mostra o que ja foi baixado no periodo e as transferencias financeiras intercompany efetivas;
- origem indica a empresa que enviou, financiou ou suportou o recurso;
- destino indica a empresa beneficiada;
- valores marcados como eliminados nao devem gerar riqueza no consolidado do grupo.

Cuidados:

- se origem ou destino estiver vazio, o lancamento precisa ser corrigido;
- se o tipo estiver errado, a leitura gerencial ficara errada;
- se um aporte for registrado como receita comum, a DRE consolidada sera distorcida;
- se uma transferencia interna nao for marcada como intercompany, o grupo pode parecer maior ou mais lucrativo do que realmente e.

### 11.16 Fluxo de Caixa Consolidado

Tela:

- `Financeiro > Relatorios > Fluxo Consolidado`.

Objetivo:

- enxergar o caixa previsto e realizado do grupo por Holding, empresa e obra/centro de custo;
- comparar entradas e saidas previstas com baixas efetivamente registradas;
- eliminar intercompany quando a analise for consolidada do grupo;
- identificar empresas que geram caixa, consomem caixa ou dependem de movimentacoes internas.

Passo a passo:

1. Selecionar o periodo.
2. Filtrar por Holding quando quiser analisar apenas um grupo societario.
3. Filtrar por empresa quando quiser analisar uma empresa especifica.
4. Filtrar por obra/centro de custo quando a analise for operacional.
5. Manter `Eliminar intercompany no consolidado` marcado para a visao executiva principal.
6. Clicar em `Atualizar fluxo`.
7. Conferir os cards de entradas, saidas e saldo.
8. Conferir a tabela `Resumo por empresa`.
9. Conferir a serie consolidada para enxergar concentracao por periodo.

Como interpretar:

- entradas previstas sao titulos a receber em aberto ou parciais;
- saidas previstas sao titulos a pagar em aberto ou parciais;
- saldo previsto e entradas previstas menos saidas previstas;
- entradas realizadas sao baixas de titulos a receber;
- saidas realizadas sao baixas de titulos a pagar;
- saldo realizado e entradas realizadas menos saidas realizadas;
- intercompany eliminado mostra valores internos retirados da visao consolidada.

Regra operacional importante:

- o previsto usa a empresa informada no titulo financeiro;
- o realizado usa a empresa informada na baixa do titulo;
- a baixa deve ter empresa pagadora/recebedora correta e essa empresa deve ser validada contra a conta bancaria usada;
- se a baixa ficar sem empresa, ela aparece separada e precisa ser corrigida.

Cuidados:

- nao usar transferencia interna como receita real do grupo;
- nao deixar titulo sem empresa;
- nao deixar baixa sem conta bancaria ou empresa;
- conferir se aportes, emprestimos, reembolsos e coberturas de caixa estao marcados como intercompany;
- usar este relatorio junto com a DRE: DRE mostra resultado por competencia, Fluxo Consolidado mostra caixa.

---

## 12. Modulo Fiscal

### 12.1 Objetivo

O modulo fiscal controla documentos fiscais, XMLs, DANFE, vinculos e divergencias.

### 12.2 Importar XML ou ZIP

Tela:

- `Fiscal > Documentos`.

Passo a passo:

1. Selecionar empresa fiscal.
2. Selecionar XML individual ou ZIP.
3. Clicar em importar.
4. Aguardar processamento.
5. Conferir relatorio de importacao.
6. Observar arquivos com erro.
7. Corrigir origem do arquivo quando necessario.

Cuidados:

- ZIP pode conter XMLs ja importados;
- arquivos duplicados devem ser reimportados como atualizacao, nao duplicados;
- erros devem mostrar nome do arquivo para localizacao;
- XML valido pode falhar se bytes forem alterados antes do upload;
- assinatura de XML depende dos bytes originais.

### 12.3 Abrir documento fiscal

Passo a passo:

1. Entrar em `Fiscal > Documentos`.
2. Filtrar documento.
3. Clicar em detalhes.
4. Conferir emitente.
5. Conferir destinatario.
6. Conferir chave.
7. Conferir itens.
8. Conferir totais.
9. Conferir vinculos.

### 12.4 Gerar ou abrir DANFE

Passo a passo:

1. Abrir listagem ou detalhe do documento.
2. Usar `Gerar DANFE` quando nao existir PDF.
3. Usar `Abrir DANFE` quando ja existir.
4. Usar `Regenerar DANFE` quando o PDF precisar ser recriado.
5. Conferir itens, totais, chave e codigo de barras.

Cuidados:

- DANFE precisa listar itens do XML;
- codigo de barras deve representar a chave de acesso;
- se o XML estiver incompleto, o DANFE tambem ficara incompleto.

### 12.5 Vincular documento fiscal

Passo a passo:

1. Abrir documento fiscal.
2. Buscar solicitacao, compra, titulo ou outro vinculo.
3. Selecionar o vinculo correto.
4. Conferir se a caixa de opcoes fechou.
5. Salvar ou revisar vinculos existentes.

Impacto:

- melhora rastreabilidade entre fiscal, compras e financeiro;
- facilita auditoria;
- reduz documentos sem origem.

---

## 13. Modulo Contratos

### 13.1 Objetivo

Controlar contratos vinculados a solicitacoes, modelos, gestao e acompanhamento.

### 13.2 Passo a passo basico

1. Criar ou localizar solicitacao relacionada.
2. Informar dados do contrato.
3. Vincular parceiro.
4. Vincular obra ou centro de custo.
5. Anexar contrato.
6. Acompanhar status.
7. Registrar historico de alteracoes.

### 13.3 Cuidados

- contrato sem solicitacao perde rastreabilidade;
- contrato sem parceiro dificulta financeiro;
- contrato sem obra ou centro de custo prejudica resultado;
- anexos precisam estar legiveis.

---

## 14. Modulo CRM

### 14.1 Objetivo

Organizar leads, atendimento, tarefas, carteira, canais e dashboards comerciais.

### 14.2 Fluxo basico

1. Lead entra no sistema.
2. Atendimento registra origem e canal.
3. Responsavel assume contato.
4. Tarefas sao criadas.
5. Lead avanca no funil.
6. Comercial acompanha carteira e dashboards.

### 14.3 Cuidados

- nao deixar lead sem responsavel;
- registrar canal de origem;
- manter etapa atualizada;
- registrar contatos importantes.

---

## 15. Modulo Comercial

### 15.1 Objetivo

Controlar empreendimentos, unidades, tabelas de preco, mapa de unidades e contratos de venda.

### 15.2 Passo a passo operacional

1. Cadastrar empreendimento.
2. Cadastrar unidades.
3. Configurar tabela de preco.
4. Acompanhar mapa de unidades.
5. Gerar ou acompanhar contrato de venda.
6. Alimentar relatorios comerciais.

### 15.2.1 Titulos financeiros do contrato comercial

Quando um contrato comercial gera parcelas a receber ou comissao a pagar, os titulos financeiros precisam nascer com a empresa correta.

Regra operacional:

- a empresa dos titulos do contrato vem da obra vinculada ao contrato comercial;
- a obra do contrato precisa estar vinculada a uma empresa do grupo;
- se trocar a unidade para obra de outra empresa, os novos titulos e comissoes passam a usar a empresa da nova obra;
- titulos ja baixados nao devem ter empresa, corretor, categoria ou valor alterados para ajustar cadastro posterior;
- se a empresa da obra estiver errada, corrija o cadastro da obra antes de gerar ou alterar contrato.

Cuidados:

- contrato comercial sem obra com empresa vinculada nao deve gerar titulo financeiro;
- parcela de venda e comissao precisam alimentar DRE, caixa previsto e relatorios por empresa corretamente;
- nao usar empresa da conta bancaria futura para definir empresa do contrato; a conta aparece somente na baixa/recebimento.

### 15.3 Impacto gerencial

O modulo comercial apoia:

- velocidade de venda;
- estoque de unidades;
- receita prevista;
- inadimplencia futura;
- resultado por incorporacao.

---

## 16. Modulo Provisionamento

### 16.1 Objetivo

Controlar previsoes financeiras futuras antes de virarem titulo financeiro definitivo.

### 16.2 Quando usar

Usar provisionamento para:

- despesas previstas;
- compromissos recorrentes;
- custos esperados;
- valores ainda sem documento final;
- compromissos futuros de caixa.

### 16.3 Passo a passo

1. Criar provisao.
2. Informar empresa.
3. Informar obra ou centro de custo.
4. Informar categoria macro.
5. Informar valor previsto.
6. Informar data prevista.
7. Atualizar conforme novas informacoes.
8. Converter ou relacionar com titulo quando virar obrigacao real.

### 16.4 Cuidados

- provisao nao e baixa;
- provisao nao substitui titulo financeiro;
- provisao ajuda fluxo futuro, mas precisa ser revisada.

---

## 17. Modulo RH/DP

### 17.1 Objetivo

Controlar empresas, colaboradores, documentos, importacoes, apuracoes e fechamentos de RH/DP.

### 17.2 Cadastros basicos

Passo a passo:

1. Cadastrar empresas.
2. Cadastrar colaboradores.
3. Informar vinculo correto.
4. Manter documentos atualizados.
5. Realizar importacoes quando aplicavel.
6. Conferir apuracoes.
7. Gerar fechamentos.

### 17.3 Cuidados

- empresa errada em colaborador distorce custo de folha;
- fechamento sem conferencia prejudica financeiro;
- documentos incompletos aumentam risco trabalhista.

### 17.4 Fechamento RH/DP e titulos financeiros

Quando a apuracao RH/DP e fechada, o sistema gera titulos a pagar para os favorecidos.

Regras:

- a apuracao precisa estar vinculada a uma empresa do grupo;
- se a apuracao tambem tiver obra/centro de custo, essa obra precisa estar vinculada a mesma empresa da apuracao;
- os titulos de folha nascem com a empresa da apuracao RH/DP;
- a baixa futura deve informar a empresa pagadora real e a conta bancaria correspondente;
- se uma empresa pagar folha de outra empresa, a baixa deve ser tratada como intercompany, nao como ajuste manual de empresa no titulo.

Cuidados:

- nao fechar apuracao com empresa incorreta;
- nao usar empresa do colaborador para corrigir uma apuracao criada errada;
- conferir categoria financeira da folha antes do fechamento para manter DRE e endividamento corretos.

---

## 18. Comunicacao interna

### 18.1 Objetivo

Registrar conversas e comunicacoes internas vinculadas ao trabalho.

### 18.2 Boas praticas

- usar comunicacao interna para assuntos relevantes;
- evitar decisoes importantes apenas fora do sistema;
- anexar documentos quando necessario;
- manter linguagem clara.

---

## 19. Configuracoes

### 19.1 Objetivo

Configurar comportamento do sistema, permissoes, modulos e regras.

### 19.2 Areas comuns de configuracao

- usuarios;
- setores;
- permissoes;
- areas por setor;
- tipos de solicitacao;
- status por setor;
- modulos ativos;
- cotacoes;
- suporte;
- fiscal;
- RH/DP;
- compras;
- acessos financeiros.

### 19.3 Cuidados

- alteracoes de configuracao afetam muitos usuarios;
- testar antes de liberar;
- registrar motivo da mudanca;
- evitar permissao ampla sem necessidade;
- revisar acessos periodicamente.

---

## 20. Relatorios por modulo

### 20.1 Principio

Cada modulo deve ter uma pagina unica de Relatorios.

Essa pagina funciona como hub.

Ela deve reunir:

- relatorios analiticos;
- relatorios sinteticos;
- graficos;
- indicadores;
- alertas;
- links para detalhes.

### 20.2 Relatorios de Solicitacoes

Devem responder:

- quantas solicitacoes foram abertas;
- quais setores estao com mais demanda;
- quais setores atrasam;
- quais obras demandam mais;
- quais tipos de solicitacao sao mais frequentes;
- qual tempo medio de atendimento.

### 20.3 Relatorios de Compras

Devem responder:

- quanto foi cotado;
- quanto foi comprado;
- economia gerada;
- fornecedores mais usados;
- compras sem cotacao suficiente;
- tempo medio de resposta de fornecedor.

### 20.4 Relatorios Financeiros

Devem responder:

- contas a pagar;
- contas a receber;
- fluxo previsto;
- fluxo realizado;
- baixas;
- conciliacao;
- DRE;
- resultado por obra;
- resultado por centro de custo;
- consolidado do grupo;
- resultado por empresa;
- intercompany.

### 20.5 Relatorios Fiscais

Devem responder:

- XMLs importados;
- documentos sem vinculo;
- divergencias;
- documentos por empresa;
- logs de importacao;
- exportacoes contabeis.

### 20.6 Relatorios CRM

Devem responder:

- leads por origem;
- conversao;
- atendimento;
- SLA;
- carteira;
- funil;
- produtividade comercial.

### 20.7 Relatorios Comerciais

Devem responder:

- unidades disponiveis;
- unidades vendidas;
- contratos;
- receita esperada;
- desempenho por empreendimento.

### 20.8 Relatorios de Provisionamento

Devem responder:

- provisoes futuras;
- compromissos por data;
- necessidade futura de caixa;
- provisoes vencidas ou nao revisadas.

### 20.9 Relatorios RH/DP

Devem responder:

- colaboradores por empresa;
- documentos pendentes;
- fechamentos;
- custos de folha;
- apuracoes.

### 20.10 Relatorios de Contratos

Devem responder:

- contratos ativos;
- contratos vencendo;
- contratos por obra;
- contratos por parceiro;
- pendencias de assinatura;
- valores contratados.

---

## 21. Qualidade dos dados

### 21.1 Campos que mais impactam relatorios

Os campos mais criticos sao:

- empresa do grupo;
- holding;
- obra ou centro de custo;
- apropriacao;
- parceiro;
- categoria financeira;
- competencia;
- vencimento;
- data de baixa;
- empresa pagadora ou recebedora;
- conta bancaria;
- intercompany;
- origem e destino do intercompany;
- tipo de intercompany.

### 21.2 Erros comuns

Erros que prejudicam a gestao:

- usar obra errada;
- deixar centro de custo vazio;
- cadastrar empresa duplicada;
- cadastrar parceiro duplicado;
- usar categoria generica;
- informar competencia errada;
- registrar baixa na conta errada;
- nao marcar intercompany;
- marcar intercompany sem origem e destino;
- tratar transferencia interna como receita;
- tratar aporte como faturamento;
- nao vincular XML a solicitacao, compra ou titulo.

### 21.3 Rotina semanal de saneamento

Responsavel sugerido:

- administrativo financeiro;
- controlador interno;
- administrador do sistema.

Passo a passo:

1. Rodar diagnostico da DRE.
2. Revisar titulos sem empresa.
3. Revisar titulos sem categoria.
4. Revisar titulos sem competencia.
5. Revisar intercompany incompleto.
6. Revisar documentos fiscais sem vinculo.
7. Revisar solicitacoes paradas.
8. Revisar compras sem cotacao encerrada.
9. Revisar baixas sem comprovante quando aplicavel.
10. Reportar pendencias aos responsaveis.

---

## 22. Rotina diaria recomendada por perfil

### 22.1 Solicitante

Todos os dias:

1. Abrir solicitacoes.
2. Criar novas demandas com dados completos.
3. Acompanhar retornos.
4. Responder comentarios.
5. Anexar documentos solicitados.

### 22.2 Lider de setor

Todos os dias:

1. Ver solicitacoes do setor.
2. Priorizar demandas.
3. Atribuir responsaveis.
4. Cobrar solicitacoes paradas.
5. Enviar para outro setor quando necessario.

### 22.3 Compras

Todos os dias:

1. Revisar solicitacoes de compra.
2. Conferir itens.
3. Enviar cotacoes.
4. Acompanhar fornecedores.
5. Encerrar comparativos.
6. Atualizar pedidos.

### 22.4 Financeiro

Todos os dias:

1. Revisar titulos vencendo.
2. Registrar baixas reais.
3. Conferir empresas pagadoras e recebedoras.
4. Importar OFX quando aplicavel.
5. Conciliar movimentos.
6. Corrigir pendencias do diagnostico.

### 22.5 Fiscal

Todos os dias:

1. Importar XMLs.
2. Conferir erros.
3. Vincular documentos.
4. Gerar DANFE quando necessario.
5. Conferir divergencias.

### 22.6 Diretoria

Semanalmente:

1. Abrir relatorios financeiros.
2. Conferir DRE consolidada.
3. Conferir resultado por empresa.
4. Conferir resultado por obra.
5. Conferir fluxo previsto x realizado.
6. Conferir pendencias de dados.
7. Solicitar correcao quando houver informacao inconsistente.

---

## 23. Roteiro de treinamento para usuarios leigos

### 23.1 Primeiro encontro

Objetivo:

- reduzir medo do sistema;
- explicar a logica basica.

Conteudo:

1. Como acessar.
2. Como trocar senha.
3. Como abrir menu.
4. Como localizar telas.
5. Como criar solicitacao simples.
6. Como acompanhar solicitacao.
7. Como comentar.
8. Como anexar arquivo.

### 23.2 Segundo encontro

Objetivo:

- ensinar operacao real do setor.

Conteudo:

1. Fluxo do setor.
2. Status usados.
3. Quem pode aprovar.
4. Quando enviar para outro setor.
5. Quando gerar compra.
6. Quando gerar financeiro.

### 23.3 Terceiro encontro

Objetivo:

- mostrar impacto gerencial.

Conteudo:

1. Como um erro de obra afeta relatorio.
2. Como categoria errada afeta DRE.
3. Como baixa errada afeta caixa.
4. Como XML sem vinculo afeta auditoria.
5. Como intercompany errado distorce consolidado.

---

## 24. Perguntas para validar aprendizado

Use estas perguntas ao final do treinamento:

1. Quando devo criar uma solicitacao?
2. Qual a diferenca entre obra e centro de custo?
3. Para que serve apropriacao?
4. O que acontece se eu escolher a obra errada?
5. Quando uma movimentacao e intercompany?
6. Por que intercompany nao deve virar receita do grupo?
7. Qual a diferenca entre titulo e baixa?
8. O que a conciliacao OFX confere?
9. Por que a categoria financeira e importante?
10. O que fazer quando um XML da erro na importacao?
11. Quem deve corrigir um dado errado?
12. O que a diretoria enxerga quando os dados estao corretos?

---

## 25. Checklist de liberacao de modulo

Antes de liberar qualquer modulo, confirmar:

- usuarios treinados;
- permissoes configuradas;
- cadastros-base revisados;
- responsavel pelo modulo definido;
- rotina diaria definida;
- rotina semanal de saneamento definida;
- relatorios principais testados;
- exemplos reais validados;
- canal de suporte conhecido.

---

## 26. Checklist de dados para relatorios executivos

Para Presidente, Vice Presidente e Diretorias receberem informacoes corretas, validar:

- todas as empresas do grupo cadastradas;
- holding definida;
- empresas operacionais vinculadas corretamente;
- obras marcadas como obra;
- centros de custo separados das obras;
- contas bancarias vinculadas a empresas;
- titulos com empresa;
- titulos com categoria financeira;
- titulos com competencia;
- titulos com obra ou centro de custo quando aplicavel;
- baixas com empresa pagadora ou recebedora;
- intercompany com origem, destino e tipo;
- XMLs fiscais importados e vinculados;
- solicitacoes com dados completos;
- compras com fornecedores e cotacoes rastreaveis.

---

## 27. Indicadores que dependem diretamente da operacao correta

### 27.1 Para Presidencia e Vice Presidencia

- DRE consolidada;
- lucro ou prejuizo liquido;
- EBITDA;
- geracao de caixa;
- necessidade futura de caixa;
- resultado por empresa;
- resultado por obra;
- endividamento;
- inadimplencia;
- intercompany liquido.

### 27.2 Para Diretoria Administrativa

- despesas administrativas;
- burn rate;
- centros de custo;
- folha;
- contratos;
- compromissos futuros;
- pendencias de cadastro.

### 27.3 Para Diretoria de Obras

- custo por obra;
- apropriacoes;
- compras por obra;
- contratos por obra;
- XMLs relacionados;
- pagamentos por obra;
- previsto x realizado.

### 27.4 Para Liderancas de Setores

- solicitacoes abertas;
- solicitacoes atrasadas;
- tempo medio de atendimento;
- gargalos;
- demandas por tipo;
- responsaveis com maior carga.

---

## 28. Regra de ouro para sucesso do FLUXY

O FLUXY nao depende apenas de tecnologia.

Ele depende de disciplina operacional.

Para o sistema entregar valor:

- cada usuario precisa preencher o que sabe;
- cada setor precisa revisar o que recebe;
- cada gestor precisa cobrar qualidade;
- financeiro precisa registrar fatos reais;
- fiscal precisa vincular documentos;
- compras precisa manter comparativos;
- administradores precisam manter cadastros limpos;
- diretoria precisa usar os relatorios e cobrar correcao de origem.

Quando a operacao e consistente, os relatorios deixam de ser apenas telas e passam a ser instrumentos reais de gestao.
