# Fiscal - Fase 38 - Construtor SOAP NFeDistribuicaoDFe

## Objetivo

Preparar a montagem local das requisicoes SOAP/XML do servico `NFeDistribuicaoDFe`, sem executar chamada real para a SEFAZ.

Esta fase ainda nao usa certificado A1, nao abre conexao HTTPS/mTLS e nao ativa jobs automaticos.

## Entregue

- Criado `backend/src/modules/fiscal/services/sefaz/sefazDfeSoapBuilderService.js`.
- Montagem de envelope SOAP 1.2 para:
  - `distNSU`
  - `consNSU`
  - `consChNFe`
- Validacoes locais de:
  - CNPJ com 14 digitos
  - UF autorizadora por codigo IBGE
  - ambiente SEFAZ (`homologacao` ou `producao`)
  - NSU com padding para 15 digitos
  - chave de acesso NF-e com 44 digitos
- Reexport dos builders em `sefazDfeDistributionService.js` para uso futuro no cliente real.
- Ampliado `backend/scripts/validarFiscalDfeProcessor.js` para validar o XML gerado.

## Fora do escopo

- Envio real para SEFAZ.
- Assinatura digital.
- Leitura do certificado A1.
- HTTPS com certificado cliente.
- Scheduler automatico.
- Alteracao em financeiro, pedidos ou compras.

## Proxima etapa sugerida

Implementar o adaptador HTTPS/mTLS em modo controlado, ainda atras de `FISCAL_SEFAZ_ENABLED`, reutilizando o SOAP gerado nesta fase e salvando request/response brutos no storage fiscal privado.

## Validacao

```bash
cd backend
npm run test:fiscal-dfe-processor
```
