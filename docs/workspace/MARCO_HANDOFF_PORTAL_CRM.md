# Marco De Handoff Para Portal Cliente E CRM

## Objetivo

Definir o ponto exato em que o agente principal deixa a fase de fundacao Core + Experience e entrega prompt especifico para o agente auxiliar construir Portal Cliente e CRM.

## Estado Atual

O trabalho ainda esta na fase preparatoria.

O agente principal esta responsavel por:

- contrato Core Gateway;
- integracao comercial real;
- seguranca HMAC;
- documentacao de deploy;
- banco Experience separado;
- API Experience em EC2;
- frontend Experience na Vercel;
- fronteira entre Core e Experience.

## Itens Que Precisam Estar Prontos Antes Do Handoff

- Comercial real validado visualmente no Experience.
- `GET /api/comercial/mapa-unidades` consumindo Core Gateway ou fallback controlado.
- `POST /api/comercial/simulacao` mantendo simulacao nao oficial.
- `POST /api/gateway/portal/autorizacao` validado como portao de seguranca, sem liberar dados operacionais.
- `experience.jrfluxy.com.br` documentado para Vercel.
- `experience-api.jrfluxy.com.br` documentado para EC2.
- Banco Experience separado definido no RDS.
- Variaveis de ambiente documentadas.
- Portal Cliente ainda sem dados oficiais reais.
- CRM ainda sem funil operacional real.

## Nao Fazer Antes Do Handoff

- Nao construir login real de cliente.
- Nao construir dashboard real do Portal Cliente.
- Nao construir funil CRM operacional.
- Nao criar proposta oficial no Experience.
- Nao criar reserva oficial no Experience.
- Nao expor financeiro oficial ao frontend sem autorizacao Core.
- Nao acessar banco do Core pelo Experience.

## Quando O Handoff Acontecer

O agente principal entregara ao agente auxiliar:

- escopo exato;
- arquivos que pode editar;
- endpoints liberados;
- payloads esperados;
- restricoes de seguranca;
- testes obrigatorios;
- criterio de aceite.

## Regra Final

Portal Cliente e CRM so comecam quando o Core Gateway e o ambiente Experience estiverem suficientemente estaveis para nao misturar prototipo com regra oficial.
