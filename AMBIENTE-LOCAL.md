# Fluxy V4 — Ambiente 100% Local

Cópia isolada do sistema Fluxy para reelaboração do frontend.
**Sem GitHub, sem AWS/EC2, sem API de produção, sem API de desenvolvimento remoto.**

> Para levar este trabalho a produção, ver [MIGRACAO-PARA-PRODUCAO.md](MIGRACAO-PARA-PRODUCAO.md).
> Toda variável de ambiente nova é registrada lá antes de qualquer deploy.

---

## Como subir

Backend (porta **8100**):

```bash
cd C:/Users/Ricardo/Documents/Fluxy-V4/backend && node server.js
```

Frontend (porta **5273**):

```bash
cd C:/Users/Ricardo/Documents/Fluxy-V4/frontend && npx vite
```

Acesse: <http://127.0.0.1:5273>

### Acesso

| Campo | Valor |
|---|---|
| E-mail | `<EMAIL_SUPERADMIN_LOCAL>` |
| Senha | `<SENHA_SUPERADMIN_LOCAL>` |
| Perfil | SUPERADMIN |

Senha redefinida **apenas no banco local** (usuário id 1), com MFA desligado nesse registro.
A senha de produção desse usuário não foi consultada nem alterada — o hash local foi
simplesmente sobrescrito. Os outros 71 usuários ficaram intactos.

### Portas — por que não são as padrão

O projeto original em `C:\Fluxy` roda em **5173/8000**. O V4 usa **5273/8100** de propósito.
Antes dessa separação os dois frontends disputavam a porta 5173 (um em IPv4, outro em IPv6)
e `localhost:5173` podia abrir qualquer um dos dois. `strictPort: true` no Vite garante que o
V4 falhe em vez de subir silenciosamente em outra porta.

---

## Banco de dados

| Item | Valor |
|---|---|
| Servidor | MySQL 8.0.45 local (serviço `MySQL80`) |
| Banco | `fluxy_main_copia` |
| Host | `localhost:3306` |
| Usuário | `admin` / `7695` |

O usuário `admin` foi criado com privilégios **apenas** em `fluxy_main_copia`. Ele não
enxerga os outros bancos da instância (`solicitacoes`, `experience_db`, `fluxy_motor_engenharia`
etc.), então o app local não consegue tocá-los.

Backup pré-migrations: `backups/fluxy_main_copia_pre_migrations.sql` (70 MB).

Restaurar:

```bash
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" -h 127.0.0.1 -u root -p fluxy_main_copia < backups/fluxy_main_copia_pre_migrations.sql
```

---

## Integrações desativadas

Configuradas em `backend/.env`. Endpoints externos apontam para `127.0.0.1:9`
(porta *discard*) como trava física: se algum código tentar sair para a internet, falha na hora.

| Área | Estado | Como |
|---|---|---|
| Pagamentos Banco do Brasil | desativado | `BB_PAYMENTS_ENABLED=false`, `BB_PROVIDER_MODE=mock` |
| Webhook BB | desativado | `BB_WEBHOOK_ENABLED=false` |
| Boletos Caixa | desativado | `CAIXA_BOLETO_HOMOLOGADO=false`, ambiente `TESTE` |
| E-mail / SMTP | desativado | SMTP vazio — o código bloqueia envio sem configuração |
| Notificações externas / OPS | desativado | `OPS_ENABLED=false` |
| Automação CRM (job) | desativado | `CRM_AUTOMATION_ENABLED=false` |
| Snapshot governança (job) | desativado | `GOVERNANCA_SNAPSHOT_JOB_ENABLED=false` |
| Core Gateway / Experience | desativado | `CORE_GATEWAY_ENABLED=false`, chaves vazias |
| Módulo Fiscal / SEFAZ | desativado | `FISCAL_MODULE_ENABLED=false`, `FISCAL_SEFAZ_ENABLED=false` |
| e-Social | desativado | `ESOCIAL_INTEGRACAO_ENABLED=false` |
| ERP Sienge | desativado | credenciais vazias, host `127.0.0.1:9` |
| D4Sign (assinatura) | desativado | token vazio |
| Meta / Google Ads | desativado | tokens vazios |
| AWS S3 | desativado | credenciais vazias — uploads vão para `backend/uploads/` |
| Redis / Valkey | desativado | `REDIS_URL` vazio — rate limit em memória |
| ClamAV | desativado | `CLAMAV_ENABLED=false` |
| IA (Anthropic/OpenAI/Google) | desativado | `SST_IA_DOCUMENTAL_ENABLED=false`, chaves vazias |
| MFA obrigatório | desativado | `MFA_POLICY_ENABLED=false` (padrão do código é exigir) |

Os jobs de retenção usam `36500` dias para **não apagar** dados da cópia local.

---

## Alterações de código para o modo offline

Duas, ambas com o comportamento de produção preservado como padrão.

### 1. Política de MFA — `backend/src/services/mfaPolicyService.js`

Perfis ADMIN/SUPERADMIN eram obrigados a configurar TOTP antes de usar o sistema, o que
travava o dashboard local. Foi adicionada a chave `MFA_POLICY_ENABLED`. O padrão continua
sendo **exigir** MFA: a política só cai com `MFA_POLICY_ENABLED=false` explícito, que está
setado apenas neste `.env` local.

> Se um token JWT antigo ainda estiver no navegador, o bloqueio persiste até o próximo
> login — o flag `mfa_setup_pending` viaja dentro do token. Basta sair e entrar de novo.

### 2. Storage S3 — `backend/src/services/s3.js`

O `S3Client` era instanciado no import e derrubava o boot
sem `AWS_REGION`. Agora:

1. O client é criado sob demanda (*lazy*), não no import.
2. `isStorageOfflineMode()` detecta ausência de credenciais AWS.
3. Em modo offline, `getPresignedUrl()` devolve o valor original em vez de assinar.

O item 3 importa: os anexos herdados da cópia do banco apontam para os buckets S3 de
produção. Sem essa trava, o frontend receberia URLs assinadas para produção.
Uploads novos caem em `backend/uploads/` (fallback local que já existia no código).

---

## GitHub

O diretório raiz não tem `.git`. Havia um repositório residual em `legal-pages/` cujo
remote embutia um **Personal Access Token do GitHub em texto claro**. O remote foi removido.

> O token exposto era `ghp_H5qR…` (conta `jrvjunior93-dev`, repo `fluxy-legal-pages`).
> Ele continua válido no GitHub e presente na cópia original em `C:\Fluxy\legal-pages`.
> **Recomendação: revogar esse token** em GitHub → Settings → Developer settings → Tokens.
