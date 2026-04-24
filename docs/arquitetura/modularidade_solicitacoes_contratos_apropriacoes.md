# Modularidade de Solicitacoes, Contratos e Apropriacoes

## Objetivo

Documentar a regra oficial de modularidade para evitar acoplamento artificial entre:

- `SOLICITACOES`
- `CONTRATOS`
- `OBRAS`
- `COMPRAS` (rotulo comercial: `Solicitacoes de Compra`)
- `FINANCEIRO`

Este documento serve como referencia de implantacao por instalacao e como base para evolucao do produto em outros clientes.

## Regra Central

As colunas do banco podem permanecer existentes, mas a interface e o backend devem respeitar os modulos habilitados na instalacao.

Isso significa:

- nao esconder uma coluna do banco por migration so porque um modulo nao foi contratado
- nao exigir campo em tela ou validacao backend se o modulo que sustenta aquele contexto nao estiver ativo
- nao criar dependencia comercial falsa apenas para contornar acoplamento tecnico

## Mapeamento Oficial

### Contratos

- dominio dono: `CONTRATOS`
- campos afetados em `SOLICITACOES`:
  - `contrato_id`
  - `codigo_contrato`
  - `ref_contrato`
  - `ref_contrato_abertura`
- regra:
  - se `CONTRATOS` estiver desligado, esses campos nao aparecem na UI e nao sao obrigatorios no backend

### Apropriacoes

- dominio dono: `OBRAS`
- entidade base: tabela `apropriacoes`
- gestao administrativa: tela `Gestao de Apropriacoes`
- consumo compartilhado por:
  - `SOLICITACOES`
  - `COMPRAS`
  - `FINANCEIRO`
  - `OBRAS`

Regra:

- apropriacao nao pertence conceitualmente ao modulo `COMPRAS`
- apropriacao e um cadastro estrutural da obra
- `COMPRAS` consome apropriacao
- `SOLICITACOES` gerais podem consumir apropriacao principal
- `FINANCEIRO` pode consumir apropriacao para classificacao do titulo

## Nome Tecnico x Nome Comercial

- chave tecnica: `COMPRAS`
- rotulo no produto: `Solicitacoes de Compra`

Quando a documentacao tecnica mencionar `COMPRAS`, isso corresponde ao modulo que o superadmin enxerga como `Solicitacoes de Compra`.

## API Oficial de Apropriacoes

### Leitura compartilhada

- `GET /apropriacoes`

Permitido quando ao menos um destes modulos estiver habilitado:

- `OBRAS`
- `SOLICITACOES`
- `COMPRAS`
- `FINANCEIRO`

### Gestao administrativa

- `POST /apropriacoes`
- `PUT /apropriacoes/:id`
- `DELETE /apropriacoes/:id`

Permitido somente quando:

- `OBRAS` estiver habilitado
- usuario tiver perfil administrativo compativel

## Matriz de Comportamento por Instalacao

### 1. Instalacao com apenas `SOLICITACOES`

- tela `Nova Solicitacao` funciona
- campos de contrato ficam ocultos
- campos de apropriacao ficam ocultos
- backend nao exige contrato nem apropriacao

### 2. Instalacao com `SOLICITACOES` + `CONTRATOS`

- tela `Nova Solicitacao` mostra bloco de contrato
- listagem de solicitacoes pode mostrar `Contrato` e `Ref. do Contrato`
- detalhe da solicitacao pode editar ref. de contrato
- backend valida regras ligadas ao comportamento do tipo e ao modulo `CONTRATOS`

### 3. Instalacao com `SOLICITACOES` + `OBRAS`

- tela `Nova Solicitacao` pode mostrar apropriacao principal
- detalhe da solicitacao pode exibir apropriacao
- backend valida apropriacao quando a regra do tipo exigir

### 4. Instalacao com `SOLICITACOES` + `CONTRATOS` + `OBRAS`

- fluxo completo de solicitacao geral
- contrato e apropriacao podem coexistir conforme o tipo

### 5. Instalacao com `COMPRAS` + `OBRAS`

- `Solicitacoes de Compra` usam apropriacao por item
- gestao administrativa de apropriacoes fica disponivel

### 6. Instalacao com `COMPRAS` sem `OBRAS`

- consumo de apropriacoes so deve ocorrer se a base ja existir e a regra comercial aceitar isso
- para novas implantacoes, o recomendado e habilitar `OBRAS` junto quando houver necessidade real de apropriacao
- a administracao do cadastro de apropriacoes nao fica disponivel sem `OBRAS`

## Regras de UI

### Nova Solicitacao

- parceiro selecionado permanece dentro do proprio campo
- campos dependentes de `CONTRATOS` nao aparecem sem o modulo
- campos dependentes de `OBRAS` nao aparecem sem o modulo

### Listagem de Solicitacoes

- colunas `Contrato` e `Ref. do Contrato` so aparecem quando `CONTRATOS` estiver habilitado
- exportacao CSV segue a mesma regra

### Detalhe da Solicitacao

- bloco de contrato respeita `CONTRATOS`
- bloco de apropriacao respeita `OBRAS`
- rota de atualizar ref. de contrato e bloqueada no backend se `CONTRATOS` estiver desligado

### Gestao de Apropriacoes

- tela administrativa pertence ao contexto de `OBRAS`
- nao deve ficar pendurada no menu de `COMPRAS`

## Decisao de Implantacao

Nao transformar `CONTRATOS` e `OBRAS` em obrigatorios por padrao so para manter `SOLICITACOES` funcionando.

O desenho correto e:

- `SOLICITACOES` funciona sozinha
- `CONTRATOS` adiciona contexto contratual
- `OBRAS` adiciona apropriacoes e gestao associada
- `COMPRAS` consome apropriacoes como modulo dependente de negocio, nao como dono tecnico do cadastro

## Recomendacao Comercial

Para outras empresas, usar esta leitura:

- pacote base operacional: `SOLICITACOES`
- pacote contratual: `CONTRATOS`
- pacote de gestao de obra: `OBRAS`
- pacote de compras: `COMPRAS`
- pacote financeiro: `FINANCEIRO`

Se a operacao do cliente exigir centro de custo/apropriacao por obra, a combinacao recomendada e `SOLICITACOES + OBRAS`, com `CONTRATOS` opcional conforme o fluxo.
