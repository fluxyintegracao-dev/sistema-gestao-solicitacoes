# Roteiro de Apresentacao e Treinamento - FLUXY

## 1. Objetivo

Este documento converte o guia mestre de implantacao em um roteiro pratico para:

- demonstracao comercial
- treinamento de administradores
- treinamento por equipe operacional
- montagem de apresentacoes com prints

O foco aqui nao e explicar a arquitetura tecnica. O foco e explicar como apresentar o produto com clareza, em ordem correta e sem pular dependencias operacionais.

## 2. Como usar este roteiro

Use este material em tres formatos:

### Demonstracao executiva

Publico:

- diretoria
- dono da empresa
- gestor principal

Objetivo:

- mostrar valor
- mostrar modulos contratados
- mostrar ganho de controle e rastreabilidade

Duracao sugerida:

- 30 a 45 minutos

### Treinamento administrativo

Publico:

- administrador interno
- equipe de implantacao do cliente

Objetivo:

- ensinar configuracao inicial
- ensinar governanca de acesso
- ensinar como apoiar usuarios

Duracao sugerida:

- 1h30 a 2h30

### Treinamento operacional por equipe

Publico:

- solicitantes
- setores
- compras
- financeiro
- RH
- comercial

Objetivo:

- ensinar o fluxo do dia a dia

Duracao sugerida:

- 45 a 90 minutos por equipe

## 3. Regra geral da apresentacao

Apresente sempre nesta ordem:

1. visao geral do produto
2. logica de modulos contratados
3. governanca de usuarios e permissoes
4. fluxo operacional base
5. modulos especializados
6. suporte e rotina de uso

Nao comece por modulo especializado antes de mostrar:

- menu
- dashboard
- solicitacoes
- configuracoes

Sem isso, o cliente perde a leitura do produto como plataforma.

## 4. Estrutura sugerida de slides

## Slide 1 - Capa

Titulo sugerido:

- `FLUXY - Implantacao, Operacao e Treinamento`

Subtitulo sugerido:

- nome da empresa cliente
- data
- responsavel pela apresentacao

Print sugerido:

- tela de login ou dashboard

## Slide 2 - O que o FLUXY resolve

Mensagem principal:

- centraliza solicitacoes, compras, financeiro e modulos complementares em uma operacao unica, rastreavel e modular

Pontos para falar:

- fim de controles dispersos
- rastreabilidade por obra, parceiro e usuario
- menos dependencia de planilhas soltas
- base modular por contrato

## Slide 3 - Modelo da instalacao

Mensagem principal:

- a instalacao e unica por cliente, com modulos habilitados conforme contrato

Pontos para falar:

- single-tenant por instalacao
- modulos habilitados por instalacao
- administrador interno opera o dia a dia
- provedor apoia fora da empresa

Print sugerido:

- `Configuracoes > Modulos e Planos`

## Slide 4 - Navegacao principal

Mensagem principal:

- o menu muda conforme modulos habilitados e permissoes do usuario

Pontos para falar:

- menu condicional
- telas liberadas por perfil e permissao
- exemplo de leitura para administrador e usuario comum

Print sugerido:

- menu lateral aberto

## Slide 5 - Governanca de acesso

Mensagem principal:

- acesso depende de duas camadas: modulo habilitado e permissao do usuario

Pontos para falar:

- modulo habilitado define o que existe
- permissao define quem opera
- `SUPERADMIN` trata habilitacao estrutural
- `ADMINISTRADOR` trata uso interno

Prints sugeridos:

- `Configuracoes > Permissoes de Areas por Usuario`
- `Configuracoes > Permissoes RH/DP e SIENGE`

## Slide 6 - Cadastros que sustentam a operacao

Mensagem principal:

- antes da operacao, a empresa precisa manter seus cadastros base atualizados

Cadastros para citar:

- usuarios
- setores
- obras
- parceiros
- tipos de solicitacao
- categorias financeiras
- apropriacoes

## Slide 7 - Fluxo operacional base

Mensagem principal:

- o FLUXY nasce no fluxo base de solicitacoes

Sequencia visual:

1. nova solicitacao
2. detalhe da solicitacao
3. geracao de conta
4. titulo financeiro
5. baixa e conciliacao

## 5. Roteiro de demonstracao do modulo base

## 5.1 Dashboard

Tela:

- `Dashboard`

Falar:

- visao executiva
- leitura de pendencias
- ponto de entrada para operacao

Mostrar:

- cards
- filtros
- indicadores principais

## 5.2 Nova Solicitacao

Tela:

- `Nova Solicitacao`

Falar:

- obra
- area responsavel
- tipo
- parceiro
- valor
- vencimento
- anexos

Demonstracao sugerida:

1. buscar obra
2. selecionar area
3. selecionar tipo
4. buscar parceiro
5. informar valor
6. anexar arquivo
7. criar solicitacao

## 5.3 Listagem de Solicitacoes

Tela:

- `Solicitacoes`

Falar:

- filtros
- leitura das colunas
- diferenca entre fila ativa e arquivada

Mostrar:

- busca por obra
- busca por status
- abertura do detalhe

## 5.4 Detalhe da Solicitacao

Tela:

- `Solicitacoes > Detalhe`

Falar:

- timeline
- comentarios
- anexos
- historico
- bloco financeiro

Demonstracao sugerida:

1. abrir uma solicitacao
2. mostrar comentario
3. mostrar anexo
4. mostrar historico
5. mostrar card financeiro

## 6. Roteiro do modulo financeiro

## 6.1 Geracao de conta

Origem:

- detalhe da solicitacao

Falar:

- o financeiro pode nascer da solicitacao
- o sistema nao cria conta automaticamente no momento da abertura

## 6.2 Titulos Financeiros

Tela:

- `Financeiro > Titulos Financeiros`

Falar:

- contas a pagar
- contas a receber
- status
- saldo

Mostrar:

- filtros
- detalhe do titulo

## 6.3 Detalhe do titulo

Tela:

- `Financeiro > Titulos > Detalhe`

Falar:

- dados do titulo
- status
- historico
- baixa
- integracao SIENGE quando houver

## 6.4 Baixa financeira

Mostrar:

- conta bancaria
- data
- valor
- juros/desconto

Mensagem principal:

- a baixa registra o fato financeiro

## 6.5 Conciliacao OFX

Tela:

- `Financeiro > Conciliacao OFX`

Mensagem principal:

- OFX nao cria titulo e nao baixa automaticamente

Fluxo para explicar:

1. registrar baixa
2. importar OFX
3. conciliar

## 6.6 Resultado de Obras

Tela:

- `Financeiro > Relatorios > Resultado de Obras`

Mensagem principal:

- leitura consolidada de executado, recebido e falta receber por obra

## 7. Roteiro do modulo obras

## 7.1 Listagem de Obras

Falar:

- cadastro da obra
- classificacao publica ou privada
- leitura dos cards

## 7.2 Detalhe da obra

Mostrar abas:

- dashboard
- orcamento
- custos
- parcelas
- pedidos
- arquivos
- relatorio final

Mensagem principal:

- a obra consolida a leitura operacional e financeira do projeto

## 7.3 Gestao de Apropriacoes

Mensagem principal:

- apropriacao e dominio de obras, consumido por solicitacoes, compras e financeiro

## 8. Roteiro do modulo compras

## 8.1 Solicitacao de Compra

Falar:

- itens
- apropriacao por item
- revisao

## 8.2 Cotacao

Falar:

- fornecedores
- comparativo
- link publico

## 8.3 Pedido de Compra

Falar:

- origem na cotacao
- ajustes auditados
- status operacional

## 9. Roteiro do modulo comercial

## 9.1 Empreendimentos e unidades

Mensagem principal:

- organizam o produto imobiliario da empresa

## 9.2 Mapa de unidades

Mensagem principal:

- leitura visual da ocupacao e disponibilidade

## 9.3 Contratos de venda

Mensagem principal:

- geram recebiveis no financeiro central

Explicar:

- cliente em parceiros
- corretor em parceiros
- agenda financeira
- integracao com contas a receber

## 10. Roteiro do modulo provisoes

## 10.1 Dashboard de Previsao

Mensagem principal:

- leitura gerencial de desembolso previsto

## 10.2 Provisionamentos

Mensagem principal:

- lista operacional do que esta previsto por obra e categoria

## 10.3 Nova Provisao e detalhe

Explicar:

- criacao
- anexos
- comentarios no detalhe
- historico

## 11. Roteiro do modulo RH/DP

## 11.1 Empresas do Grupo

Mensagem principal:

- uma instalacao pode operar varias empresas do grupo

## 11.2 Colaboradores

Mensagem principal:

- cadastro centralizado
- dados de pagamento
- documentos no detalhe

## 11.3 Documentos

Mensagem principal:

- painel de busca e pendencias documentais

## 11.4 Importacoes

Mensagem principal:

- a empresa pode iniciar com planilhas controladas dentro do sistema

## 11.5 Apuracao

Mensagem principal:

- separacao entre CLT e NAO_CLT
- conferencia antes do fechamento

## 11.6 Fechamentos

Mensagem principal:

- o fechamento gera titulos no financeiro central

## 12. Roteiro do modulo Integracao SIENGE

## 12.1 Tela inicial

Explicar:

- prontidao tecnica
- configuracao da instalacao
- fila
- logs

## 12.2 Mensagem obrigatoria

Sempre deixar claro:

- integracao SIENGE e opcional
- o gateway trabalha sobre o titulo financeiro central
- cadastro automatico de credor so existe quando a instalacao habilitar esse comportamento

## 13. Roteiro especifico para treinamento do administrador

Ordem recomendada:

1. menu e modulos
2. usuarios
3. setores
4. tipos
5. obras
6. parceiros
7. regras de recebimento
8. permissoes por usuario
9. cadastros especificos dos modulos contratados
10. rotina de suporte interno

Mensagem principal:

- o administrador nao precisa saber tudo de deploy
- ele precisa saber operar, configurar e triar

## 14. Roteiro especifico para treinamento do usuario final

Treinar por rotina e nao por arquitetura.

Exemplo:

### Solicitante

- abrir solicitacao
- anexar
- acompanhar status

### Setor responsavel

- receber
- assumir
- comentar
- encaminhar

### Compras

- revisar solicitacao de compra
- cotar
- gerar pedido

### Financeiro

- criar conta
- baixar
- conciliar

### RH

- cadastrar colaborador
- anexar documento
- importar
- apurar

## 15. Estrutura pronta para apresentacao em slides

Sequencia sugerida de 15 slides:

1. capa
2. problema que o FLUXY resolve
3. modelo da plataforma e modulos contratados
4. navegacao principal
5. governanca de acesso
6. cadastros base
7. solicitacoes
8. financeiro
9. obras
10. compras
11. comercial
12. provisoes
13. RH/DP
14. integracao SIENGE
15. suporte, proximos passos e go-live

## 16. Checklist de prints por slide

## Slide 1

- login ou dashboard institucional

## Slide 2

- opcionalmente sem print; usar layout conceitual

## Slide 3

- `Configuracoes > Modulos e Planos`

## Slide 4

- menu lateral completo

## Slide 5

- `Permissoes de Areas por Usuario`

## Slide 6

- tela `Configuracoes`

## Slide 7

- `Nova Solicitacao`
- `Detalhe da Solicitacao`

## Slide 8

- `Titulos Financeiros`
- `Detalhe do Titulo`
- `Conciliacao OFX`

## Slide 9

- `Obras`
- `Detalhe da Obra`

## Slide 10

- `Solicitacoes de Compra`
- `Pedido de Compra`

## Slide 11

- `Contratos de Venda`

## Slide 12

- `Dashboard de Previsao`

## Slide 13

- `Colaboradores`
- `Apuracao`

## Slide 14

- `Integracao SIENGE`

## Slide 15

- opcionalmente sem print; usar quadro de suporte e proximos passos

## 17. Script curto para abertura da apresentacao

Texto-base:

`O FLUXY foi implantado para centralizar a operacao da empresa em uma plataforma unica, modular e rastreavel. A logica do sistema parte do fluxo operacional base de solicitacoes e se expande para compras, financeiro, obras, comercial, provisoes, RH/DP e integracoes conforme o contrato da instalacao. Nesta apresentacao vamos mostrar como a empresa deve operar, como o administrador deve configurar o ambiente e como cada equipe pode usar apenas o que precisa no dia a dia.`

## 18. Script curto para encerramento

Texto-base:

`A implantacao fica sustentada por tres camadas: configuracao correta, treinamento correto e rotina correta. O administrador interno sera o primeiro ponto de apoio da empresa, enquanto o provedor permanece como suporte externo para evolucoes, correcoes e duvidas mais tecnicas.`

## 19. Regra final

Se a apresentacao ficar longa demais, nao corte o fluxo base.

O minimo obrigatorio para qualquer demo ou treinamento e:

- menu
- governanca
- solicitacoes
- financeiro
- suporte

Os modulos especializados entram depois, conforme o publico e o contrato.
