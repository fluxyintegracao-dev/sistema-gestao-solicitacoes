# Contratos API - Core Gateway para Experience

## Base

Prefixo proposto:

```text
/api/gateway
```

Modulo backend proposto:

```text
backend/src/modules/coreGateway
```

## Autenticacao entre sistemas

Headers oficiais:

```text
X-Fluxy-Experience-Client-Id
X-Fluxy-Experience-Signature
X-Fluxy-Experience-Timestamp
```

Variaveis sugeridas no Core:

```env
CORE_GATEWAY_ENABLED=false
CORE_GATEWAY_CLIENT_ID=
CORE_GATEWAY_CLIENT_SECRET=
CORE_GATEWAY_ALLOWED_ORIGINS=
CORE_GATEWAY_RATE_LIMIT_WINDOW_MS=60000
CORE_GATEWAY_RATE_LIMIT_MAX=120
CORE_GATEWAY_SIGNATURE_TOLERANCE_MS=300000
```

### Assinatura HMAC

O Experience deve assinar cada requisicao protegida com HMAC SHA256.

Payload assinado:

```text
{timestamp}.{METHOD}.{originalUrl}
```

Exemplo:

```text
1760000000000.GET./api/gateway/comercial/empreendimentos
```

Header:

```text
X-Fluxy-Experience-Signature: hmac_sha256_hex(payload, CORE_GATEWAY_CLIENT_SECRET)
```

Regras:

- `timestamp` deve ser Unix epoch em milissegundos;
- `METHOD` deve ser enviado em uppercase;
- `originalUrl` deve incluir path e querystring exatamente como enviada;
- `originalUrl` inclui o prefixo `/api/gateway`;
- o Core nao usa `nonce` nesta versao;
- o Core rejeita assinatura fora da janela `CORE_GATEWAY_SIGNATURE_TOLERANCE_MS`;
- segredos nunca trafegam no frontend.

Nota para o Experience:

- Se o client tiver sido criado com headers `X-Gateway-*`, substituir pelas chaves oficiais acima.
- O segredo deve ficar apenas no backend/API do Experience.

## Status de implementacao

Estado atual no Core:

- `GET /api/gateway/health` implementado sem autenticacao para monitoramento;
- endpoints comerciais implementados com dados publicaveis;
- endpoints de portal reservados no backend;
- endpoints reservados exigem HMAC + feature flag;
- endpoints de portal retornam `501` com `status: PLANNED` ate a implementacao real das views seguras;
- todas as tentativas autenticadas/negadas geram log de seguranca.

## Padrao de resposta

Sucesso:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "version": "v1",
    "request_id": "uuid"
  }
}
```

Erro:

```json
{
  "success": false,
  "error": {
    "code": "CORE_GATEWAY_FORBIDDEN",
    "message": "Acesso nao autorizado."
  },
  "meta": {
    "version": "v1",
    "request_id": "uuid"
  }
}
```

## APIs comerciais

### GET `/api/gateway/comercial/empreendimentos`

Objetivo: listar empreendimentos publicaveis para o Experience.

Dados permitidos:

- id publico;
- core_id;
- slug;
- nome;
- descricao comercial;
- cidade/UF;
- status comercial publicavel;
- resumo de tipologias.

Resposta atual:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id_publico": "1",
        "core_id": 1,
        "codigo": "EMP-001",
        "slug": "emp-001",
        "nome": "Empreendimento Modelo",
        "descricao": "Descricao publica",
        "cidade": "Goiania",
        "estado": "GO",
        "bairro": "Setor",
        "endereco_publico": "Setor, Goiania, GO",
        "status_comercial": "PUBLICAVEL",
        "obra_id": 1,
        "unidades_total": 10,
        "unidades_disponiveis": 8,
        "preco_min": 100000,
        "preco_max": 200000,
        "area_privativa_min": 50,
        "area_privativa_max": 80,
        "tipologias": ["2 quartos"],
        "synced_at": "2026-05-27T00:00:00.000Z"
      }
    ],
    "total": 1
  },
  "meta": {
    "version": "v1",
    "request_id": "uuid"
  }
}
```

Dados proibidos:

- margem;
- dados financeiros internos;
- documentos internos;
- logs;
- informacoes fiscais.

### GET `/api/gateway/comercial/unidades`

Objetivo: listar unidades publicaveis.

Filtros:

- empreendimento_id;
- status_comercial;
- tipologia;
- faixa_preco, se aprovado.

Dados permitidos:

- id publico;
- core_id;
- codigo publico;
- empreendimento;
- tipologia;
- area;
- status comercial publicavel;
- valor a partir de, quando aprovado.

Dados explicitamente nao enviados:

- `parceiro_reserva_id`;
- dados do cliente/reserva;
- observacoes internas;
- fracao ideal;
- contratos;
- dados financeiros internos.

### GET `/api/gateway/comercial/mapa-unidades`

Objetivo: alimentar mapa visual de unidades.

Dados permitidos:

- identificador visual;
- torre/bloco/pavimento/unidade;
- status comercial publicavel;
- metadados de exibicao.

Resposta atual:

```json
{
  "success": true,
  "data": {
    "grupos": [],
    "torres": [],
    "unidades": [],
    "total": 0,
    "total_unidades": 0
  },
  "meta": {
    "version": "v1",
    "request_id": "uuid"
  }
}
```

Observacao:

- `grupos` e o formato original do Core por empreendimento/torre.
- `torres` e formato de compatibilidade para visualizacao agrupada no Experience.
- `unidades` e formato flat para telas que preferem lista simples.

### POST `/api/gateway/comercial/simulacao`

Objetivo: validar parametros basicos de simulacao.

Importante: simulacao nao e proposta oficial, nao aprova credito e nao gera contrato.
O retorno atual e uma simulacao simples, sem juros, marcada como `nao_oficial`.
Tambem retorna `restricoes`, mas enquanto nao houver politica comercial oficial configurada no Core os campos ficam `null` e `disponiveis=false`.

Payload:

```json
{
  "unidade_id": "public-id",
  "valor_entrada": 0,
  "prazo_meses": 0,
  "tipo": "PRICE"
}
```

Resposta parcial:

```json
{
  "success": true,
  "data": {
    "nao_oficial": true,
    "gera_proposta": false,
    "aprova_credito": false,
    "valor_referencia": 0,
    "valor_entrada": 0,
    "prazo_meses": 0,
    "saldo_simulado": 0,
    "parcela_base_sem_juros": 0,
    "restricoes": {
      "entrada_minima_percentual": null,
      "prazo_maximo_meses": null,
      "taxa_referencia_anual": null,
      "disponiveis": false
    }
  }
}
```

## APIs portal cliente

Todas exigem cliente autenticado no Experience e autorizacao oficial no Core.

Referencia arquitetural:

```text
docs/core-gateway/PORTAL_CLIENTE_AUTENTICACAO_AUTORIZACAO.md
```

Headers adicionais planejados para rotas do portal:

```text
X-Fluxy-Portal-Client-Id
X-Fluxy-Portal-Client-Document-Hash
```

O Experience autentica o cliente. O Core valida se o cliente tem vinculo oficial com o contrato/parcela/documento solicitado.

Fonte oficial de cliente no Core:

```text
Parceiro.ativo = true
Parceiro.cliente = true
ContratoComercial.parceiro_id
ContratoComercialComprador.parceiro_id
```

Nao sera criada tabela paralela de clientes no Core para o portal.

### GET `/api/gateway/portal/dashboard`

Retorna:

- contratos resumidos;
- proximas parcelas;
- chamados abertos;
- andamento de obra resumido;
- comunicados.

Query planejada:

```text
contrato_id opcional
```

### GET `/api/gateway/portal/financeiro`

Retorna resumo financeiro do cliente autenticado.

Nao retorna dados internos do Core.

Dados permitidos:

- valor contrato;
- total pago;
- saldo em aberto;
- parcelas abertas;
- parcelas vencidas;
- proximo vencimento.

Dados proibidos:

- dados bancarios internos;
- remessas;
- conciliacoes;
- movimentos de outros clientes;
- observacoes internas.

### GET `/api/gateway/portal/parcelas`

Retorna parcelas do cliente autenticado.

Cada parcela deve pertencer ao contrato autorizado.

### GET `/api/gateway/portal/boletos/:id`

Retorna URL temporaria ou instrucao de segunda via para parcela do cliente autenticado.

O Core deve validar que o boleto pertence a parcela autorizada antes de gerar qualquer URL.

### GET `/api/gateway/portal/documentos`

Retorna lista de documentos autorizados.

Documentos devem ser entregues por URL temporaria e auditada.

### GET `/api/gateway/portal/obra`

Retorna andamento resumido de obra vinculada ao cliente.

### GET `/api/gateway/portal/chamados`

Retorna chamados do cliente.

### POST `/api/gateway/portal/chamados`

Cria chamado do cliente para triagem no Core.

## Auditoria obrigatoria

Registrar:

- client_id;
- usuario/cliente quando aplicavel;
- endpoint;
- metodo;
- ip;
- user-agent;
- status;
- request_id;
- tempo de resposta;
- entidade acessada quando houver documento/financeiro.
