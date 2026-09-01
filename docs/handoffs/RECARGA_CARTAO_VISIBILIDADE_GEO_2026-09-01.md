# Recarga de Cartao — visibilidade GEO / Gerencia de Processos

## Sintoma

A solicitacao `SOL-1980`, do tipo Recarga de Cartao, estava persistida no setor `GEO`, mas nao
aparecia na lista do usuario Kauan Dutra, cujo setor cadastrado e `GERENCIA DE PROCESSOS`, mesmo
com a permissao granular `solicitacoes.lista.visualizar_setor` ativa.

O detalhe continuava acessivel ao criador da solicitacao pelo escopo de solicitacoes proprias.

## Causa

O sistema considera `GEO`, `GERENCIA DE PROCESSOS` e `GERENCIA_PROCESSOS` aliases do mesmo setor
operacional em regras de roteamento, acesso ao detalhe e historico. Na listagem de solicitacoes,
entretanto, o ramo de usuario comum montava a condicao do setor apenas com os valores literais do
cadastro do usuario. Assim, `GERENCIA DE PROCESSOS` nao correspondia ao valor persistido `GEO`.

## Correcao

Em `backend/src/controllers/SolicitacaoController.js`, a condicao direta de visibilidade do setor
passou a usar `setorTokens`, conjunto que ja contem id, codigo, nome e os aliases GEO/Gerencia de
Processos. A alteracao fica limitada ao escopo da permissao "Ver solicitacoes do setor" e nao
inclui nenhum outro setor.

## Impacto

- usuarios de GEO enxergam solicitacoes atuais da Gerencia de Processos;
- usuarios da Gerencia de Processos enxergam solicitacoes atuais persistidas como GEO;
- continuam valendo as permissoes granulares e os vinculos de obra;
- usuarios sem `solicitacoes.lista.visualizar_setor` nao recebem essa ampliacao;
- nao ha migration nem alteracao de dados.

## Validacao recomendada em dev

1. entrar como Kauan Dutra;
2. manter ativas "Ver suas proprias solicitacoes" e "Ver solicitacoes do setor";
3. abrir Minhas Solicitacoes sem filtro e confirmar a presenca da `SOL-1980`;
4. desmarcar temporariamente "Ver solicitacoes do setor" e confirmar que uma solicitacao de outro
   usuario deixa de aparecer; reativar a permissao ao final;
5. confirmar que solicitacoes de setores sem relacao com GEO/Gerencia continuam invisiveis.
