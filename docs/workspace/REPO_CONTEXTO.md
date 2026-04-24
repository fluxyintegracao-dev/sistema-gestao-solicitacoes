# Repo Contexto - FLUXY Core

## Papel deste repositorio

Este repositorio e o produto principal do FLUXY que sera implantado para os clientes.

Ele contem:

- backend operacional do cliente
- frontend operacional do cliente
- modulos do produto
- regras de negocio
- documentacao funcional e tecnica

## Modelo de produto

- single-tenant por instalacao
- uma base de dados por cliente
- frontend por cliente
- backend por cliente

## Responsabilidades principais

- solicitacoes
- compras
- cotacoes
- pedidos de compra
- parceiros
- financeiro
- conciliacao OFX
- gestao de obras
- modulos habilitados por instalacao

## Integracao com outros repositorios

### `fluxy-ops`

Papel:

- painel interno do provedor
- control plane
- monitoramento de empresas
- planos
- modulos
- storage
- concorrencia

Contrato atual:

- `fluxy-core` envia telemetria para `fluxy-ops`
- integracao via push
- falha do `fluxy-ops` nao pode quebrar o `fluxy-core`

## Arquivos de alto risco neste repositorio

- `backend/server.js`
- `backend/src/app.js`
- `backend/src/routes.js`
- `frontend/src/layout/Layout.jsx`
- `frontend/src/contexts/AuthContext.jsx`
- `backend/src/controllers/SolicitacaoController.js`

## Regra local

Se a tarefa envolver `fluxy-core` e `fluxy-ops`, registrar sempre:

- ownership local
- contrato de integracao alterado
- handoff ao final
