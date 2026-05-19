# Modulo Fiscal - Fase 24 - Contrato do cliente SEFAZ

## Objetivo

Criar o ponto unico de entrada para a futura integracao real com a SEFAZ, sem executar chamadas externas nesta fase.

## Entrega

- Service `backend/src/modules/fiscal/services/sefaz/sefazDfeDistributionService.js`.
- Funcoes preparadas:
  - `consultarDistNsu`
  - `consultarPorNsu`
  - `consultarPorChave`
  - `enviarManifestacao`
  - `getSefazRuntimeConfig`
  - `normalizeCompanyContext`

## Comportamento atual

- Se `FISCAL_SEFAZ_ENABLED=false`, retorna erro claro de integracao desabilitada.
- Se `FISCAL_SEFAZ_ENABLED=true`, retorna erro 501 informando que o cliente real ainda nao foi implementado.
- Nenhuma chamada SOAP real e feita.
- Nenhum certificado A1 e carregado.
- Nenhum XML sensivel e logado.

## Motivo da etapa

Evitar que a futura integracao SEFAZ seja espalhada por controllers, jobs ou services de processamento. O proximo passo deve preencher este contrato com:

- carregamento seguro do certificado A1;
- montagem SOAP do NFeDistribuicaoDFe;
- envio HTTPS com certificado;
- tratamento de cStat;
- descompactacao/base64/gzip dos documentos retornados;
- retorno normalizado para o processor fiscal.

## Proxima etapa sugerida

Implementar testes unitarios do contrato e, depois, o processor do retorno SEFAZ com fixtures locais antes da primeira chamada real.
