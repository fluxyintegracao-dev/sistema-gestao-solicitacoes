# Modulo Fiscal - Fase 28 - Fixture de evento DFe

## Objetivo

Validar o mapeamento de eventos fiscais normalizados antes de conectar manifestacao, cancelamento ou eventos reais da SEFAZ.

## Entrega

- Funcao pura `buildFiscalEventPayload`.
- Script `validarFiscalDfeProcessor.js` cobrindo evento de autorizacao.

## Comportamento validado

- Vinculo do evento ao documento fiscal.
- Tipo do evento.
- Sequencia.
- Protocolo.
- Data do evento.
- Descricao.
- Preservacao do payload bruto em `raw_event_json`.

## Regras mantidas

- Nenhuma chamada externa.
- Nenhuma escrita no banco.
- Nenhum XML bruto em log.

## Como validar

```bash
cd backend
npm run test:fiscal-dfe-processor
```

## Proxima etapa sugerida

Criar o job manual interno que usa o contrato SEFAZ stub e o processor, ainda retornando `blocked/skipped`, para deixar a orquestracao pronta antes do SOAP real.
