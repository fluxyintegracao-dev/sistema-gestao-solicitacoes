# Modulo Fiscal - Fase 6 Certificados

## Escopo entregue

- Cadastro administrativo de metadados de certificado A1.
- Listagem de certificados por empresa fiscal.
- Validacao administrativa basica do certificado.
- Criptografia de caminho local, chave S3 e senha com `FISCAL_CRYPTO_KEY`.
- Auditoria em `security_event_logs` para cadastro e validacao.

## Rotas adicionadas

- `GET /api/fiscal/certificates`
- `POST /api/fiscal/certificates`
- `POST /api/fiscal/certificates/:id/validate`

Todas exigem autenticacao e permissao de configuracao fiscal.

## Regras de seguranca

- A API comum nao retorna:
  - `certificate_path_encrypted`
  - `certificate_s3_key_encrypted`
  - `password_encrypted`
- O frontend nunca exibe caminho/senha apos salvar.
- O certificado A1 ainda nao e enviado pelo frontend.
- A validacao local apenas verifica existencia/leitura do caminho e metadados de validade.
- A leitura real do PFX e a integracao SEFAZ ficam para fase posterior.

## Variavel obrigatoria para usar certificados

```env
FISCAL_CRYPTO_KEY=uma-chave-forte-com-32-ou-mais-caracteres
```

Em producao, a chave deve ter ao menos 32 caracteres e deve ser tratada como segredo.

## Validacao local na EC2

Se o armazenamento for `local_secure_path`, o caminho deve ser absoluto, por exemplo:

```text
/opt/fluxy/certs/fiscal/certificado_empresa.pfx
```

Permissoes recomendadas:

```bash
sudo mkdir -p /opt/fluxy/certs/fiscal
sudo chown -R ubuntu:ubuntu /opt/fluxy/certs/fiscal
chmod 700 /opt/fluxy/certs/fiscal
chmod 600 /opt/fluxy/certs/fiscal/*.pfx
```

## Ainda pendente

- Interpretar o arquivo PFX para extrair validade, serial, emissor e titular automaticamente.
- Implementar upload seguro ou integraçao com AWS Secrets Manager.
- Usar certificado na comunicacao real com SEFAZ.
- Criar jobs de sincronizacao.
