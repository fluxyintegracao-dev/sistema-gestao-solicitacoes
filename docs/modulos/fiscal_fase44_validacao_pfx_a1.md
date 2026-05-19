# Modulo Fiscal - Fase 44 Validacao PFX A1

## Objetivo

Reforcar a validacao administrativa do certificado A1 antes de ativar qualquer consulta real a SEFAZ.

## Alteracoes

- A validacao de certificado local agora verifica:
  - validade informada nos metadados;
  - existencia/leitura do arquivo local;
  - se o arquivo PFX pode ser carregado com a senha cadastrada.
- O backend usa `tls.createSecureContext` nativo do Node para abrir o PFX.
- A senha descriptografada permanece apenas em memoria durante a validacao.
- A tela de empresas fiscais passa a exibir os checks retornados pela validacao.
- O preflight de sincronizacao passa a considerar `pfx_valid` como status valido de certificado.

## Caminho local recomendado

```text
/opt/fluxy/certs/fiscal/certificado_empresa.pfx
```

Permissoes recomendadas na EC2:

```bash
sudo mkdir -p /opt/fluxy/certs/fiscal
sudo chown -R ubuntu:ubuntu /opt/fluxy/certs/fiscal
chmod 700 /opt/fluxy/certs/fiscal
chmod 600 /opt/fluxy/certs/fiscal/*.pfx
```

## Seguranca

- O certificado nao e enviado ao frontend.
- Caminho, chave S3 e senha permanecem criptografados no banco.
- A API comum nao retorna segredos.
- O backend nao registra senha, caminho ou conteudo do certificado em logs.

## Ainda pendente

- Extrair automaticamente serial, emissor, titular e validade do PFX.
- Conectar a chamada real SEFAZ somente depois de validacao manual do certificado e endpoint.

