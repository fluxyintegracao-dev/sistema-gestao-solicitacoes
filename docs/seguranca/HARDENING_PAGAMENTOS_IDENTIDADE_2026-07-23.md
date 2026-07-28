# Hardening de pagamentos, identidade e webhooks

Data: 2026-07-23

## Controles implantados

### Pagamentos BB

- removida do runtime e do exemplo de ambiente a opcao `BB_AUTO_LIBERAR_LOTE`;
- removidos escopo, endpoint e job que poderiam liberar pagamentos automaticamente;
- somente o usuario que criou o lote pode envia-lo ou reprocessa-lo;
- o aprovador nao pode preparar/enviar lotes;
- `SUPERADMIN` e perfis administrativos nao recebem bypass para preparar, aprovar ou enviar;
- envio exige MFA, aprovacao valida e hash de integridade atual;
- conta pagadora e provider sao congelados em snapshots no lote;
- alteracoes criticas da conta ficam bloqueadas enquanto ha lote ativo;
- job de envio possui chave unica de deduplicacao;
- o lote recebe `provider_request_id` estavel antes da chamada externa;
- timeout, erro 5xx ou falha de rede durante envio real resultam em `ENVIO_INDETERMINADO`;
- lote indeterminado deve ser sincronizado, nunca reenviado cegamente;
- reprocessamento integral fica restrito a falha comprovada/rejeicao elegivel e nao inclui lote parcialmente confirmado;
- baixa permanece manual depois da confirmacao bancaria.

### Identidade

- segredo TOTP e segredo temporario passam a ser criptografados com AES-256-GCM;
- `MFA_ENCRYPTION_KEY` e obrigatoria em producao;
- listagens administrativas usam allowlist de campos e nao retornam segredo MFA, senha ou hash de reset;
- JWT inclui `token_version`;
- logout, troca/reset de senha, mudanca de status do usuario e alteracao de MFA revogam tokens anteriores;
- desafios MFA tambem sao vinculados a versao da credencial.

### Webhooks e origens

- Google, Meta e D4Sign falham fechados quando o segredo nao esta configurado;
- logs do controller Meta nao imprimem headers e body completos;
- webhook BB exige secret, id do evento, rate limit e confirmacao mTLS do proxy quando habilitada;
- evento BB possui chave unica de deduplicacao;
- wildcard legado de preview Vercel foi removido da lista padrao de CORS;
- previews necessarios devem ser cadastrados por origem exata.

## Migracoes

- `202607230001_payment_security_hardening.js`
- `202607230002_identity_security_hardening.js`

As migrations sao aditivas. A primeira tambem cancela jobs pendentes do tipo historico `BB_RELEASE_BATCH`; ela nao exclui o historico.

Antes de executar a migration de identidade, configurar a mesma `MFA_ENCRYPTION_KEY` persistente em todas as instancias do ambiente. Trocar ou perder essa chave torna os segredos TOTP existentes ilegíveis.

Geracao sugerida, executada pelo operador no servidor seguro:

```bash
openssl rand -hex 32
```

Nao registrar a chave em commit, log, ticket ou documento.

## Configuracao obrigatoria do proxy para webhook BB

Quando `BB_WEBHOOK_REQUIRE_MTLS=true`, o Nginx deve:

1. validar o certificado cliente contra a CA esperada;
2. remover qualquer header de confirmacao enviado pelo cliente;
3. inserir `x-fluxy-client-cert-verified: SUCCESS` somente quando a verificacao for bem-sucedida;
4. manter o backend inacessivel diretamente pela internet.

Sem esse contrato de proxy, manter `BB_WEBHOOK_ENABLED=false`.

## Uploads

Nenhuma mudanca foi aplicada a `/uploads`. A analise e os gates estao em `docs/seguranca/ANALISE_UPLOADS_LEGADOS_2026-07-23.md`.

## Validacao

A matriz completa esta em `docs/seguranca/MATRIZ_SMOKE_HARDENING_2026-07-23.md`.
