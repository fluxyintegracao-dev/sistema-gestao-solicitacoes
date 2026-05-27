# Certificado digital eSocial

## Formato

O FLUXY prepara uso de certificado A1 em arquivo PFX/P12.

## Variaveis

- `ESOCIAL_CERT_PATH`
- `ESOCIAL_CERT_PASSWORD`
- `ESOCIAL_CERT_TYPE`

## Seguranca

- A senha nao e salva em banco.
- O caminho nao e exposto no frontend.
- Logs armazenam hash do caminho e metadados seguros.
- O arquivo deve ficar fora do repositorio, em diretorio privado da EC2.

## Pendencia

A assinatura XMLDSig real deve ser homologada com certificado real antes de habilitar `ESOCIAL_XML_SIGN_ENABLED=true`.
