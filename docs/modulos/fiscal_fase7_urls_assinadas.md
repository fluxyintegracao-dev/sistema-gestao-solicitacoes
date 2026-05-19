# Modulo Fiscal - Fase 7 URLs assinadas

## Escopo entregue

- Rotas protegidas para gerar URLs assinadas curtas de arquivos fiscais ja armazenados.
- Suporte inicial para XML e PDF/DANFE.
- Auditoria em `security_event_logs` sempre que uma URL assinada e gerada.
- Botoes na caixa de documentos fiscais para abrir XML/PDF quando houver chave de storage.

## Rotas adicionadas

- `GET /api/fiscal/documents/:id/xml-url`
- `GET /api/fiscal/documents/:id/pdf-url`

As rotas exigem autenticacao, modulo Fiscal habilitado e permissao de visualizacao de documentos fiscais.

## Regras de seguranca

- O bucket permanece privado.
- O frontend recebe apenas URL temporaria.
- A expiracao usa `FISCAL_S3_PRESIGNED_EXPIRES_SECONDS`, limitada entre 60 e 900 segundos.
- A rota retorna `404` amigavel quando o documento nao possui arquivo daquele tipo.
- O acesso e registrado sem expor conteudo XML/PDF em log.

## Ainda nao implementado

- Upload manual de XML/PDF.
- Sincronizacao SEFAZ real.
- Geracao de DANFE.
- Proxy interno de arquivo; nesta etapa usa presigned URL.
