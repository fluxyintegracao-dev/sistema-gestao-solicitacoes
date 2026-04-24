# Plano - Modulo Comercial para Construcao Civil

## Status Atual

Fase 1 ja implementada no codigo:

- chave de modulo `COMERCIAL`
- chave separada `BOLETOS`
- base de dados para empreendimentos, unidades, contratos e parcelas
- geracao de titulos financeiros a receber a partir do contrato
- telas web iniciais para empreendimentos, unidades e contratos
- extensao do financeiro para registrar multiplas formas de recebimento, inclusive permuta e bens

Este documento continua valendo como referencia para expansao do modulo nas proximas fases.

## Objetivo

Planejar a construcao de um modulo comercial no `sistema_gestao_solicitacoes` seguindo o mesmo padrao dos modulos atuais:

- separado dos outros fluxos
- habilitavel e desabilitavel por instalacao
- sem interferir em solicitacoes, compras, financeiro e obras quando estiver desligado
- integrado ao financeiro existente sem duplicar regra critica

O objetivo de produto e reforcar a evolucao do FLUXY como um ERP simples, intuitivo, de facil registro e controle para construtoras pequenas e medias.

## Padrao Arquitetural Esperado

O novo modulo deve seguir o mesmo desenho ja usado hoje no produto:

- chave propria no catalogo central de modulos de `backend/src/services/moduleConfigService.js`
- protecao de rotas no backend por `requireEnabledModule` em `backend/src/middlewares/moduleAccess.js`
- ocultacao de menu e telas no frontend conforme modulos habilitados
- configuracao centralizada por runtime config
- backend como fonte de verdade para regras comerciais e financeiras

Chaves recomendadas:

- `COMERCIAL` para o modulo principal
- `BOLETOS` para o submodulo bancario e de homologacao

O modulo `BOLETOS` deve ser independente porque homologacao bancaria, remessa, retorno e convenio podem variar por banco e por cliente.

## Escopo Funcional Minimo do Modulo Comercial

O primeiro escopo viavel deve cobrir:

- cadastro de empreendimentos
- cadastro de unidades
- cadastro de clientes compradores
- cadastro de contratos de venda
- geracao de agenda financeira do contrato
- geracao de titulos financeiros a receber
- acompanhamento da carteira do cliente
- registro de recebimentos
- historico e auditoria do contrato

## Recomendacao de Cadastro Mestre

Para evitar duplicidade de dados, o ideal e nao criar um cadastro de cliente totalmente separado do cadastro mestre existente.

Recomendacao:

- manter `Parceiros` como cadastro mestre
- adicionar categoria, perfil ou relacionamento para `CLIENTE_COMERCIAL`
- usar o modulo comercial para o contexto de venda, contrato, unidade e recebimentos

Isso reduz:

- duplicidade de nome, documento, telefone e endereco
- divergencia entre financeiro e comercial
- retrabalho de manutencao cadastral

## Entidades Recomendadas

Entidades principais recomendadas para o modulo:

- `empreendimentos`
- `unidades`
- `clientes_comerciais` ou relacionamento com `parceiros`
- `contratos_comerciais`
- `contrato_parcelas` ou `agenda_recebiveis`
- `recebimentos_contrato`
- `permutas`
- `reservas_unidade`
- `documentos_contrato`

Entidades do submodulo de boletos:

- `boletos`
- `boletos_remessas`
- `boletos_retorno`
- `boletos_ocorrencias`

## Fluxos Principais do Modulo

### 1. Estrutura Comercial

1. Cadastrar empreendimento.
2. Cadastrar unidades vinculadas ao empreendimento.
3. Definir situacao da unidade: disponivel, reservada, vendida, distratada, bloqueada.

### 2. Cliente e Contrato

1. Selecionar ou cadastrar cliente.
2. Vincular cliente a unidade.
3. Criar contrato comercial com condicoes financeiras.
4. Gerar agenda de recebiveis.
5. Enviar os recebiveis para o financeiro.

### 3. Recebimentos

1. Registrar pagamento total ou parcial.
2. Informar forma de recebimento.
3. Registrar comprovantes, observacoes e auditoria.
4. Refletir liquidacao no financeiro.

### 4. Boleto Bancario

1. Contrato gera titulo a receber.
2. Titulo elegivel pode gerar boleto.
3. Boleto depende de configuracao e homologacao do banco.
4. Baixa via retorno bancario deve ser tratada como fluxo proprio do submodulo.

## Formas de Recebimento Necessarias

O financeiro do modulo comercial deve suportar multiplas formas de recebimento, com trilha auditavel e flexibilidade para realidade da construcao civil.

Minimo recomendado:

- dinheiro
- PIX
- cartao
- transferencia
- boleto
- cheque
- permuta
- bens
- outros

### Regras para Permuta e Bens

Quando o recebimento nao for dinheiro puro, o sistema deve permitir registrar:

- tipo de recebimento
- tipo de permuta
- categoria do bem
- descricao detalhada do bem
- valor de referencia
- documentos comprobatorios
- observacoes
- data do recebimento ou da formalizacao

Categorias iniciais recomendadas para permuta e bens:

- veiculo
- imovel
- terreno
- servico
- material
- credito
- outros

Isso permite tratar casos como:

- entrada em dinheiro + permuta
- recebimento parcial em PIX + veiculo
- liquidacao com outro imovel
- troca de unidade com ajuste financeiro

## O Que Mais Recomendar para o Modulo

Para um modulo comercial realmente util no setor, eu recomendo incluir no planejamento:

- reservas de unidade antes do contrato
- controle de status da unidade
- tabela de preco e condicoes comerciais
- aprovacao de desconto fora da politica
- documentos do cliente e do contrato
- controle de inadimplencia
- historico de negociacao e observacoes comerciais
- distrato, cancelamento e troca de unidade
- reajuste de parcelas por indexador
- comissao de corretagem e parceiros de venda
- relatorios de carteira: a vencer, vencido, recebido, permutado, distratado

## Separacao de Responsabilidades com o Financeiro Atual

O modulo comercial nao deve recriar um financeiro paralelo.

Separacao recomendada:

- modulo comercial:
  - empreendimento
  - unidade
  - cliente
  - contrato
  - agenda comercial
  - regras de venda
  - contexto do recebivel

- modulo financeiro:
  - titulo financeiro
  - baixa
  - estorno
  - juros
  - multa
  - desconto
  - conciliacao
  - relatorios financeiros

- submodulo boletos:
  - emissao
  - remessa
  - retorno
  - homologacao bancaria

Esse desenho evita duplicidade de regra e mantem o backend atual como motor financeiro central.

## Regras de Produto

Para manter o produto comercializavel em multiplas construtoras:

- nao usar nome de empresa, banco, empreendimento ou processo especifico no codigo
- nao hardcodar tipos de contrato, status ou categorias de recebimento sem codigo tecnico
- usar codigos internos, slugs e configuracao sempre que houver variacao de cliente
- manter backend como autoridade de regra critica
- permitir que frontend e mobile apenas consumam comportamento definido pelo backend

## UX Recomendada

O modulo deve seguir a mesma filosofia do FLUXY:

- telas simples
- registro rapido
- contratos como centro da navegacao comercial
- listas objetivas
- leitura clara da situacao financeira do cliente
- poucos cliques para registrar recebimento

Telas minimas recomendadas:

- empreendimentos
- unidades
- clientes
- contratos
- detalhe do contrato
- carteira de recebimentos
- recebimentos
- configuracoes comerciais
- configuracoes de boletos

## Fases Sugeridas

### MVP

- empreendimentos
- unidades
- clientes
- contratos
- agenda de recebiveis
- geracao de titulos financeiros
- registro manual de recebimento
- controle de permuta e bens
- relatorios simples de carteira

### V1

- reservas de unidade
- tabela de preco
- reajuste por indexador
- distrato e troca de unidade
- documentos do contrato
- comissao de corretagem

### V2

- boletos homologados por banco
- remessa e retorno
- automacoes de cobranca
- assinatura e documentos digitais
- relatorios executivos mais profundos

## Decisao de Implementacao

Antes de codar, o modulo deve ser tratado como expansao oficial do produto e nao como customizacao de cliente.

Checklist de entrada:

- definir escopo MVP
- definir entidades oficiais
- definir chaves de modulo
- definir integracao exata com o financeiro atual
- definir regras configuraveis e o que nao pode ser hardcoded
- definir telas web e impacto futuro no mobile

## Resumo Executivo

O modulo comercial faz sentido estrategico para o FLUXY porque amplia o produto para a cadeia de venda e recebimento da construtora sem descaracterizar a proposta principal.

A recomendacao correta nao e construir um ERP pesado de incorporadora. A recomendacao correta e construir um modulo comercial enxuto, auditavel, integrado ao financeiro e preparado para crescer por etapas.
