# Fase 8 - IA documental real e eSocial controlado

## Objetivo

Implantar a base real e controlada para:

- analise documental SST com provider configuravel;
- conciliacao humana de dados extraidos;
- geracao XML eSocial S-2210, S-2220 e S-2240;
- validacao estrutural com XSD oficial disponivel;
- certificado A1/PFX preparado;
- assinatura XML e SOAP bloqueados por flags;
- producao oficial bloqueada por regra de backend.

## Principios aplicados

- O dominio SST continua desacoplado do XML.
- O XML eSocial e gerado por builders versionados.
- Nenhuma atualizacao critica extraida por IA e aplicada sem aprovacao humana.
- Segredos ficam apenas no `.env`.
- Producao oficial permanece bloqueada nesta fase.

## Fluxo IA documental

```text
Documento SST
-> texto extraido ou informado
-> provider configurado
-> JSON estruturado
-> conciliacao com RH/DP
-> divergencias/pendencias
-> aprovacao ou rejeicao humana
```

Providers suportados nesta camada:

- `openai` usando `OPENAI_API_KEY`;
- `anthropic` ou `claude` usando `ANTHROPIC_API_KEY`;
- `gemini` ou `google` usando `GOOGLE_AI_API_KEY`;
- `http` ou `generic` usando endpoint proprio via `SST_IA_DOCUMENTAL_HTTP_ENDPOINT`.

O provider HTTP generico permite integrar motores internos, gateways privados, AWS Textract/Azure OCR encapsulados por servico proprio ou novos providers sem alterar o dominio SST.

O provider ativo e definido exclusivamente no backend por `.env`. O frontend nao recebe chaves, nao envia chaves e nao escolhe provider por request.

## Fluxo eSocial restrito

```text
Evento eSocial interno
-> builder S-1.3
-> XML
-> validacao estrutural/XSD
-> assinatura controlada
-> lote restrito
-> SOAP restrito controlado por flag
-> retorno/recibo/rejeicao
```

## Bloqueios obrigatorios

- `ESOCIAL_AMBIENTE=producao` e bloqueado.
- SOAP restrito exige `ESOCIAL_INTEGRACAO_ENABLED=true`, `ESOCIAL_TRANSMISSAO_RESTRITA_ENABLED=true` e `ESOCIAL_SOAP_ENABLED=true`.
- Assinatura exige `ESOCIAL_XML_SIGN_ENABLED=true`, certificado configurado e dependencia XMLDSig homologada.
- IA exige `SST_IA_DOCUMENTAL_ENABLED=true`, `SST_IA_DOCUMENTAL_PROVIDER` com provider suportado e credencial do provider escolhido.

## Pendencias futuras

- Homologar assinatura XMLDSig real com certificado A1.
- Configurar URLs oficiais de producao restrita.
- Adicionar extrator OCR binario para PDF/imagem quando o provider escolhido exigir upload.
- Homologar schemas contra validador XSD completo em ambiente Linux.
