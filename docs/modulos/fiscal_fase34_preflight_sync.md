# Modulo Fiscal - Fase 34 - Preflight de sincronizacao

## Objetivo

Criar uma validacao administrativa antes da integracao real com a SEFAZ.

## Endpoint

- `POST /api/fiscal/sync/preflight`
- Protegido pela mesma permissao de execucao de sincronizacao fiscal.
- Body:

```json
{
  "company_id": 1,
  "document_type": "nfe"
}
```

`company_id` e opcional. Sem ele, valida todas as empresas fiscais ativas e habilitadas.

## O que valida

Checks globais:
- `FISCAL_MODULE_ENABLED`
- `FISCAL_SEFAZ_ENABLED`
- `FISCAL_S3_BUCKET` e `FISCAL_S3_REGION`
- `FISCAL_CRYPTO_KEY`

Checks por empresa:
- empresa ativa e habilitada;
- CNPJ;
- UF;
- certificado ativo;
- validade do certificado informada;
- status administrativo do certificado;
- estado de NSU;
- lock de sincronizacao;
- janela de sincronizacao.

## Regras de seguranca

- Nao consulta SEFAZ.
- Nao cria documentos fiscais.
- Nao altera NSU.
- Nao expõe senha, certificado ou caminho criptografado.
- Registra evento de seguranca `FISCAL_SYNC_PREFLIGHT`.

## Frontend

A tela `Fiscal > Logs de Sincronizacao` recebeu o botao `Executar preflight`, exibindo os checks gerais e por empresa.

## Correcao incluida

O service de logs fiscais agora importa explicitamente `FiscalDfeSyncState`, evitando erro em tempo de execucao ao listar estados de sincronizacao.
