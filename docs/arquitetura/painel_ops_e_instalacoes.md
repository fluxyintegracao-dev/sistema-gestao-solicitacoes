# Painel Ops e Instalacoes de Clientes

## Resumo Executivo

O FLUXY deve continuar operando como produto `single-tenant por instalacao`.

Cada empresa cliente usa:

- frontend proprio
- backend proprio
- banco proprio
- configuracao propria
- dominio proprio

O `Painel Ops FLUXY` nao deve ficar dentro de uma instalacao de cliente. Ele deve ser um sistema separado, usado pela operacao da plataforma para acompanhar:

- empresas ativas
- modulos habilitados
- plano contratado
- usuarios cadastrados
- usuarios simultaneos
- uso de storage
- custo estimado
- alertas de upgrade

## Decisao Sobre GitHub

### Recomendacao principal

Manter:

- `1 repositorio principal do produto`: FLUXY
- `1 repositorio separado do Painel Ops`

Nao criar um repositorio por cliente por padrao.

### Quando evitar repo por cliente

Evitar repo por cliente quando a diferenca entre instalacoes puder ser resolvida por:

- `.env`
- dominio
- modulos habilitados
- configuracao da instalacao
- banco separado

### Quando considerar repo separado por cliente

So considerar repo separado, fork ou branch fixa por cliente quando houver:

- customizacao de codigo exclusiva
- stack diferente
- SLA e ciclo de release diferente
- exigencia contratual

## Decisao Sobre Vercel

### Recomendacao principal

Usar **um projeto Vercel por cliente**.

Isso permite:

- dominio isolado
- variaveis de ambiente isoladas
- deploy e rollback isolados
- observabilidade por instalacao

### Importante

`Um projeto Vercel por cliente` nao significa `um repositorio GitHub por cliente`.

O mesmo repo pode alimentar varios projetos Vercel.

## Decisao Sobre Backend

Cada cliente deve ter:

- backend proprio
- `.env` proprio
- banco proprio
- endpoint proprio

Isso pode ser:

- processo PM2 separado
- container separado
- service separado

## Decisao Sobre Banco

Padrao:

- uma base por cliente

Isso simplifica:

- isolamento
- backup
- restauracao
- estimativa de uso
- eventual migracao futura

## Decisao Sobre Storage

Padrao recomendado:

- bucket por cliente

Alternativa aceitavel no inicio:

- prefixo por cliente no mesmo bucket

Em ambos os casos, manter identificacao clara por empresa para permitir rateio de custo.

## Desenho da Operacao

### FLUXY do cliente

Responsavel por:

- operacao diaria da empresa
- solicitacoes
- compras
- financeiro
- obras
- parceiros
- configuracoes operacionais

### Painel Ops

Responsavel por:

- controle de empresas
- planos
- modulos
- concorrencia
- storage
- custo
- saude de instalacao
- telemetria
- observacoes comerciais

## O que deve ser automatico no Painel Ops

- usuarios cadastrados
- usuarios ativos
- usuarios simultaneos
- pico do mes
- storage banco
- storage anexos
- total de registros operacionais
- ultima atividade
- versao instalada
- modulos habilitados

## O que pode ser manual no Painel Ops

- observacao comercial
- status de cobranca
- excecao contratual
- negociacao de upgrade
- responsavel de conta

## Regra Comercial Sugerida

Nao cobrar por usuario cadastrado.

Cobrar por:

- plano base
- modulos habilitados
- simultaneidade
- eventualmente storage

## Proxima Etapa Recomendada

Construir o `fluxy-ops` como novo sistema e integrar cada instalacao do FLUXY via telemetria `push`.
