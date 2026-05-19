# Modulo Fiscal - Fase 45 - Preflight e controle da primeira chamada SEFAZ

## Objetivo

Preparar a sincronizacao real NFeDistribuicaoDFe para execucao manual controlada em DEV, sem ativar scheduler e sem alterar fluxos de compras, pedidos ou financeiro.

## Alteracoes

- A chamada real SEFAZ agora exige certificado fiscal ativo com `validation_status = pfx_valid`.
- Certificados vencidos sao bloqueados antes da chamada externa.
- Retorno SEFAZ `137` sem documentos agenda uma nova janela por `FISCAL_SEFAZ_EMPTY_RESULT_WAIT_MINUTES`.
- Retorno SEFAZ `656` consumo indevido bloqueia temporariamente por `FISCAL_SEFAZ_CONSUMO_INDEVIDO_WAIT_MINUTES`.
- A tela de Diagnostico Fiscal ganhou preflight administrativo para validar empresa, certificado, storage, endpoint e SOAP local.

## Novas variaveis

```env
FISCAL_SEFAZ_EMPTY_RESULT_WAIT_MINUTES=60
FISCAL_SEFAZ_CONSUMO_INDEVIDO_WAIT_MINUTES=60
```

## Regras operacionais

- Manter `FISCAL_SEFAZ_ENABLED=false` ate o endpoint SEFAZ estar configurado e o preflight retornar sem erros.
- A primeira chamada real deve ser manual, por empresa, em DEV.
- Scheduler automatico continua fora do escopo desta fase.
- Raw request/response segue armazenado apenas no S3 fiscal privado.

## Checklist antes da primeira chamada real

1. `FISCAL_MODULE_ENABLED=true`.
2. `FISCAL_S3_BUCKET` e `FISCAL_S3_REGION` configurados.
3. `FISCAL_CRYPTO_KEY` configurado.
4. Empresa fiscal ativa e com `Monitorar` habilitado.
5. Certificado A1 cadastrado e validado como `pfx_valid`.
6. `FISCAL_SEFAZ_DFE_DISTRIBUTION_URL` preenchido com HTTPS.
7. Preflight fiscal sem checks `ERROR`.
8. Só então avaliar `FISCAL_SEFAZ_ENABLED=true` em DEV.

