# Modulo Fiscal - checkpoint de retomada

## Status atual

O plano fiscal foi pausado temporariamente para corrigir/validar o fluxo financeiro de atalhos de tarifas bancarias.

## Ultima etapa fiscal concluida

- Fase 2: fundacao do modulo Fiscal.
- Fase 3: complemento de tabelas fiscais.
- Fase 4: base de storage S3 fiscal privado.
- Fase 5: criptografia fiscal com `FISCAL_CRYPTO_KEY`.
- Fase 6: cadastro administrativo seguro de certificados A1.

## Ponto exato de retomada

Retomar a partir da preparacao da proxima fase, antes de qualquer integracao real com SEFAZ:

1. Revisar configuracao do bucket S3 fiscal DEV e permissoes IAM.
2. Preparar service de leitura segura do certificado A1.
3. Avaliar dependencia para interpretar PFX e extrair validade/serial/emissor/titular.
4. Planejar `sefazDfeDistributionService` ainda sem scheduler automatico.
5. Manter `FISCAL_SEFAZ_ENABLED=false` ate validacao manual em DEV.

## Regras mantidas

- Nao consultar SEFAZ real ainda.
- Nao ativar jobs.
- Nao integrar automaticamente com financeiro, pedidos ou compras.
- Nao expor certificado/senha no frontend.
- Nao registrar XML ou segredo em logs.
