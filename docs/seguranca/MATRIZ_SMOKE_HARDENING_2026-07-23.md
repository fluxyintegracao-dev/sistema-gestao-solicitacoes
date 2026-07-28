# Matriz de smoke test — hardening de seguranca

Data: 2026-07-23

Esta matriz valida a implantacao sem autorizar envio real ao Banco do Brasil. Primeiro executar em `dev-v2`; em producao, repetir os testes nao destrutivos e usar um lote controlado somente dentro da janela aprovada.

## Pre-flight e migracoes

| ID | Cenario | Execucao | Resultado esperado | Evidencia |
|---|---|---|---|---|
| PRE-01 | Segredos fora do Git | procurar `.env`, certificados e chaves no diff | nenhum segredo versionado | `git diff --check` e revisao |
| PRE-02 | Chave de MFA configurada | configurar `MFA_ENCRYPTION_KEY` com 32 bytes antes da migration | backend valida configuracao | health/startup sem erro |
| PRE-03 | Migration de pagamentos | executar migrations uma vez | colunas e indices criados, jobs antigos de liberacao cancelados | log da migration e schema |
| PRE-04 | Migration idempotente | executar migrations novamente | nenhuma alteracao duplicada ou falha | segundo log |
| PRE-05 | Criptografia MFA | usuario com MFA existente faz login | codigo TOTP continua valido apos migration | login concluido |
| PRE-06 | Build e testes | executar comandos do checklist | todos concluem com codigo zero | logs anexados |

## Autenticacao e sessao

| ID | Cenario | Passos | Resultado esperado |
|---|---|---|---|
| AUTH-01 | Login sem MFA | entrar com usuario comum | sessao criada normalmente |
| AUTH-02 | Login com MFA | senha correta e TOTP correto | sessao criada somente apos MFA |
| AUTH-03 | MFA incorreto | informar codigo invalido repetidamente | 401 e rate limit conforme configuracao |
| AUTH-04 | Logout | autenticar, sair e reutilizar o token anterior | token anterior retorna 401 |
| AUTH-05 | Troca de senha | manter duas sessoes, trocar senha em uma | ambas as sessoes antigas retornam 401 |
| AUTH-06 | Reset por link | redefinir senha e reutilizar token anterior | sessoes anteriores revogadas |
| AUTH-07 | Ativar/desativar MFA | alterar configuracao de MFA | tokens anteriores revogados; novo login exigido quando aplicavel |
| AUTH-08 | Listagem de usuarios | consultar endpoints administrativos | resposta nao contem segredo MFA nem hash de reset/senha |

## Pagamentos — permissoes e segregacao

Perfis de teste:

- `OPERADOR_A`: preparar + enviar, sem aprovar;
- `APROVADOR_B`: aprovar, sem preparar/enviar;
- `OPERADOR_C`: preparar + enviar, sem aprovar;
- `AUDITOR_D`: visualizar/auditar, sem executar.

| ID | Cenario | Passos | Resultado esperado |
|---|---|---|---|
| PAY-01 | Permissoes incompatíveis | tentar salvar aprovar + preparar/enviar no mesmo usuario | UI/backend removem preparar e enviar |
| PAY-02 | Criacao | `OPERADOR_A` cria lote | lote registra `created_by=A` e snapshots |
| PAY-03 | Autoaprovacao | `OPERADOR_A` tenta aprovar | 403 |
| PAY-04 | Aprovacao por segundo usuario | `APROVADOR_B` aprova com MFA | lote fica `APROVADO` com hash |
| PAY-05 | Aprovador envia | `APROVADOR_B` tenta enviar | botao ausente e API retorna 403 |
| PAY-06 | Outro operador envia | `OPERADOR_C` tenta enviar lote de A | botao ausente e API retorna 403 |
| PAY-07 | Criador envia | `OPERADOR_A` envia lote aprovado | cria um job e muda para `ENFILEIRADO` |
| PAY-08 | Duplo clique | disparar dois envios simultaneos | somente um job; segunda chamada reaproveita/recusa sem novo envio |
| PAY-09 | Job simultaneo | dois workers tentam processar o mesmo job | somente um faz claim e chama o provider |
| PAY-10 | Snapshot alterado | alterar conta/provider depois de criar lote | alteracao critica e bloqueada enquanto lote ativo |
| PAY-11 | Integridade alterada | modificar dado congelado antes do envio | envio bloqueado; exige novo lote/aprovacao |
| PAY-12 | Baixa | provider confirma pagamento | titulo fica aguardando confirmacao; nao baixa automaticamente |
| PAY-13 | Confirmar baixa duas vezes | acionar confirmacao simultanea | um movimento; segunda tentativa nao duplica |

## Banco do Brasil e falhas de rede

| ID | Cenario | Configuracao/acao | Resultado esperado |
|---|---|---|---|
| BB-01 | Provider desabilitado | `BB_PAYMENTS_ENABLED=false` | nenhuma chamada real |
| BB-02 | Modo mock | `BB_PROVIDER_MODE=mock` | chamada real bloqueada |
| BB-03 | Flag real desabilitada | `BB_REAL_PROVIDER_ENABLED=false` | chamada real bloqueada |
| BB-04 | TLS relaxado | `BB_TLS_REJECT_UNAUTHORIZED=false` | chamada real bloqueada |
| BB-05 | URL nao oficial | alterar base URL/OAuth | chamada real bloqueada |
| BB-06 | Ambiente divergente | conta/provider homologacao com runtime producao | chamada bloqueada |
| BB-07 | Liberacao automatica removida | procurar flag, job, escopo e endpoint | nenhum caminho executavel de liberacao |
| BB-08 | Timeout antes de resposta | simular timeout/erro de rede durante POST | `ENVIO_INDETERMINADO`; nao reenvia cegamente |
| BB-09 | Timeout apos aceite | simular aceite remoto sem resposta local | mesmo `provider_request_id`; operador deve sincronizar |
| BB-10 | Reprocessamento | tentar reprocessar `ENVIO_INDETERMINADO` | bloqueado; somente sincronizacao |
| BB-11 | Falha comprovada | reprocessar `FALHA_INTEGRACAO` elegivel pelo criador | um novo job, sem duplicar itens ja confirmados |

## Webhooks e CORS

| ID | Cenario | Passos | Resultado esperado |
|---|---|---|---|
| WH-01 | BB desabilitado | chamar webhook | 404 |
| WH-02 | BB sem segredo | habilitar sem secret e chamar | 500/indisponivel, nenhum evento |
| WH-03 | BB segredo invalido | chamar com header incorreto | 403 e auditoria |
| WH-04 | BB sem confirmacao mTLS | secret correto sem header confiavel do proxy | 403 |
| WH-05 | BB valido | proxy confirma mTLS + secret + event id | 202 e um evento |
| WH-06 | BB duplicado simultaneo | repetir mesmo event id | um registro pela `dedupe_key` |
| WH-07 | Google sem secret | remover configuracao e chamar | 503, nenhum processamento |
| WH-08 | D4Sign sem secret | remover secret e chamar | 401, nenhum processamento |
| WH-09 | Meta sem secret | remover configuracao e chamar | 503, nenhum processamento |
| WH-10 | Dados sensiveis em log | chamar webhook Meta | headers/body completos nao aparecem nos logs |
| CORS-01 | Dominio oficial | abrir frontend dev/producao | chamadas aceitas com cookie/CSRF |
| CORS-02 | Origem desconhecida | chamar API com `Origin` nao cadastrado | 403 |
| CORS-03 | Preview Vercel aleatorio | usar dominio nao cadastrado | 403; cadastrar origem exata se necessario |

## Uploads e regressao de anexos

Nesta entrega `/uploads` nao muda. Estes testes comprovam que o hardening nao afetou anexos.

| ID | Cenario | Passos | Resultado esperado |
|---|---|---|---|
| UPL-01 | Inventario local | `npm run audit:legacy-uploads` | relatorio sem mutacao |
| UPL-02 | Inventario de banco dev | executar com `--scan-db` em `backend-dev` | contagens registradas |
| UPL-03 | Inventario de banco prod | executar com `--scan-db` em `backend-solicitacoes` | contagens registradas |
| UPL-04 | Upload interno novo | anexar arquivo em solicitacao | objeto no S3 e preview/download por presign |
| UPL-05 | Comprovante | anexar e abrir comprovante | upload/download funcionais |
| UPL-06 | Cotacao publica | fornecedor abre e envia anexo | pagina/token continuam funcionais |
| UPL-07 | Caminho local legado | abrir amostra `/uploads/...` existente, se houver | comportamento igual ao anterior |
| UPL-08 | Arquivo perigoso | abrir HTML/SVG legado | download forcado, sem execucao inline |

## Regressao funcional minima

| ID | Area | Cenario |
|---|---|---|
| REG-01 | Financeiro | criar, editar e consultar titulo sem pagamento em massa |
| REG-02 | Compras | abrir solicitacao, cotacao, gerar/reabrir/remanejar pedido |
| REG-03 | Solicitacoes | criar, anexar, encaminhar e consultar |
| REG-04 | Permissoes | salvar permissoes por setor/perfil e por usuario |
| REG-05 | CRM | receber webhook assinado e consultar lead gerado |
| REG-06 | Contratos | enviar documento e receber webhook D4Sign assinado |
| REG-07 | UI | build, login, menu e rotas principais em notebook/mobile |

## Comandos automatizados

```bash
cd backend
npm run test:payments
npm run test:security-hardening
npm run audit:legacy-uploads

cd ../frontend
npm run build
```

Executar tambem os testes de compras existentes:

```bash
cd backend
npm run test:compra-cotacao-envio
npm run test:compra-remanejamento
```

## Criterio de aprovacao e rollback

A implantacao so avanca quando todos os testes `PRE`, `AUTH`, `PAY`, `BB`, `WH`, `CORS` e `UPL` aplicaveis estiverem verdes. Qualquer duplicidade de job, chamada real fora do gate, baixa automatica, acesso a lote de outro criador ou perda de anexo bloqueia a promocao.

Se houver falha:

1. impedir novos envios BB (`BB_PAYMENTS_ENABLED=false`);
2. preservar lotes, jobs, transacoes e eventos para auditoria;
3. nao apagar ou editar manualmente um lote `ENVIO_INDETERMINADO`;
4. restaurar a versao anterior da aplicacao sem reverter migrations destrutivamente;
5. corrigir e reaplicar; as migrations desta entrega sao aditivas.
