# Fiscal - Fase 42 - Fixture DFe DEV

## Objetivo

Permitir um ensaio ponta a ponta do processamento fiscal sem consultar a SEFAZ real.

## Entregue

- Nova rota protegida:

```http
POST /api/fiscal/sync/run-fixture
```

- A rota:
  - funciona apenas fora de producao;
  - exige permissao de execucao fiscal;
  - usa empresa fiscal ativa e monitorada;
  - monta SOAP `distNSU` local;
  - salva request e response brutos no S3 fiscal;
  - processa fixture local de `retDistDFeInt`;
  - cria/atualiza documentos fiscais;
  - atualiza estado de NSU e log fiscal;
  - registra evento de seguranca.

- A tela `Diagnostico fiscal` ganhou o bloco `Ensaio local de DFe`.

## Por que isso existe

Antes de usar certificado A1 e endpoint real, o time consegue validar:

- bucket fiscal privado;
- permissao de escrita S3;
- parser `docZip`;
- persistencia de XML;
- criacao de documentos;
- logs de request/response;
- visualizacao na Caixa de Entrada Fiscal.

## Bloqueios de seguranca

- Bloqueado quando `NODE_ENV=production`.
- Bloqueado quando `FISCAL_ENV=prod` ou `FISCAL_ENV=production`.
- Nao chama rede externa.
- Nao usa certificado real.

## Validacao manual

1. Configure uma empresa fiscal ativa e monitorada.
2. Configure S3 fiscal DEV.
3. Acesse `Fiscal > Diagnostico fiscal`.
4. Execute `Testar storage`.
5. Execute `Processar fixture DFe`.
6. Confira `Fiscal > Documentos fiscais`.
7. Confira `Fiscal > Logs de sincronizacao`.
