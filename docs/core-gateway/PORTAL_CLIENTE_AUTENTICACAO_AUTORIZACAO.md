# Portal Cliente - Autenticacao no Experience e Autorizacao no Core

## Decisao

O cliente final autentica no FLUXY Experience.

O FLUXY Core nao sera o provedor de login externo do cliente neste desenho inicial.

Mesmo assim, o Core continua sendo a fonte da verdade e deve autorizar todo acesso a dados oficiais:

- contratos;
- parcelas;
- boletos;
- documentos;
- andamento de obra vinculado ao contrato;
- chamados oficiais quando forem integrados.

## Fluxo

```text
Cliente faz login no Experience
        ->
Experience valida identidade e sessao no banco proprio
        ->
Experience chama Core Gateway com HMAC backend-to-backend
        ->
Experience envia identidade externa + vinculo Core conhecido
        ->
Core valida se o parceiro/contrato pertence ao cliente
        ->
Core retorna apenas a view autorizada
```

## Headers do Portal Cliente

As chamadas continuam usando HMAC do Core Gateway:

```text
X-Fluxy-Experience-Client-Id
X-Fluxy-Experience-Timestamp
X-Fluxy-Experience-Signature
```

Para rotas do portal, adicionar tambem:

```text
X-Fluxy-Portal-Client-Id
X-Fluxy-Portal-Client-Document-Hash
```

Observacoes:

- `X-Fluxy-Portal-Client-Id` e o id interno do cliente no banco do Experience.
- `X-Fluxy-Portal-Client-Document-Hash` deve ser hash do CPF/CNPJ normalizado, nunca documento cru.
- O Core pode usar o hash para conciliar com `Parceiro.cpf_cnpj` sem expor documento completo.

## Query Params Permitidos

Para endpoints vinculados a contrato:

```text
contrato_id
```

O Core deve validar:

- contrato existe;
- contrato esta vinculado ao parceiro correto;
- parceiro bate com o hash/documento esperado;
- `Parceiro.ativo = true`;
- `Parceiro.cliente = true`;
- status permite visualizacao;
- documento/parcela/boleto pertence ao contrato.

## Fonte Oficial De Cliente No Core

A fonte oficial para autorizar cliente no Portal e a tabela/model `Parceiro`.

Nao criar tabela paralela de clientes do portal no Core.

Regras:

- somente `Parceiro` ativo pode acessar dados;
- somente `Parceiro` marcado como `cliente = true` pode acessar o Portal Cliente;
- o hash enviado pelo Experience deve bater com o documento normalizado de `Parceiro.cpf_cnpj`;
- o parceiro pode estar vinculado ao contrato como comprador principal ou comprador adicional.

Vinculos validos:

```text
ContratoComercial.parceiro_id
ContratoComercialComprador.parceiro_id
```

Isso cobre contratos com mais de um comprador.

## Regra de Ouro

O Experience autentica.

O Core autoriza.

O Core nunca deve retornar dado sensivel apenas porque o Experience pediu.

## Dados Permitidos No Portal

### Dashboard

- contratos resumidos;
- unidade vinculada;
- empreendimento;
- status contrato publicavel;
- proximas parcelas resumidas;
- documentos liberados;
- andamento de obra resumido;
- chamados abertos.

### Financeiro

- saldo resumido;
- parcelas abertas;
- parcelas pagas;
- parcelas vencidas;
- proximo vencimento;
- valores apenas do contrato autorizado.

### Boletos

- segunda via apenas de parcela do contrato autorizado;
- URL temporaria ou instrucao segura;
- nunca expor dados internos de remessa, convenio ou banco completo.

### Documentos

- documentos vinculados ao contrato autorizado;
- URLs temporarias;
- logs de acesso obrigatorios;
- sem download permanente pelo Experience.

## Dados Proibidos

- documentos de outros compradores;
- documentos internos do Core;
- dados bancarios completos;
- logs internos;
- remessas bancarias;
- boletos de outros contratos;
- parcelas de contratos nao vinculados ao cliente;
- CPF/CNPJ completo quando nao for indispensavel;
- observacoes internas do contrato.

## Endpoints Planejados

```text
GET  /api/gateway/portal/dashboard
GET  /api/gateway/portal/financeiro
GET  /api/gateway/portal/parcelas
GET  /api/gateway/portal/boletos/:id
GET  /api/gateway/portal/documentos
GET  /api/gateway/portal/obra
GET  /api/gateway/portal/chamados
POST /api/gateway/portal/chamados
```

## Status

Em 2026-05-27:

- rotas do Portal Cliente existem no Core Gateway como `501 PLANNED`;
- Experience deve manter mocks para `/portal/*`;
- contrato de autenticacao/autorizacao foi definido;
- implementacao real deve ser feita em fase separada com testes de acesso negado.
