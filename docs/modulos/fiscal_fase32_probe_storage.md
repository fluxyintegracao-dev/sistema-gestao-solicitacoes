# Modulo Fiscal - Fase 32 - Probe manual de storage S3

## Objetivo

Adicionar uma verificacao manual e restrita para confirmar se o backend consegue gravar no bucket fiscal configurado.

## Implementacao

- Novo endpoint protegido:
  - `POST /api/fiscal/diagnostics/storage-probe`
- Acesso restrito as permissoes de configuracao fiscal.
- A acao cria um arquivo pequeno `text/plain`, sem dados fiscais, no prefixo:
  - `{FISCAL_S3_PREFIX}/diagnostics/{ano}/{mes}/storage-probe-{timestamp}.txt`
- O retorno informa apenas:
  - chave criada;
  - hash SHA-256;
  - content type;
  - bucket mascarado;
  - data de criacao.
- A execucao registra evento de seguranca `FISCAL_STORAGE_PROBE`.

## Regras de seguranca

- Nao executa automaticamente.
- Nao consulta SEFAZ.
- Nao grava XML, PDF, certificado, senha ou dado fiscal sensivel.
- Nao expõe bucket completo quando retorna para o frontend.
- Depende de `FISCAL_S3_BUCKET` e `FISCAL_S3_REGION` configurados.

## Validacao manual

1. Acessar `Fiscal > Diagnostico`.
2. Confirmar que o storage aparece como configurado.
3. Clicar em `Testar storage`.
4. Verificar sucesso na tela e, se necessario, confirmar a chave criada no S3.

## Observacao operacional

O arquivo de probe fica no bucket para auditoria simples de validacao do ambiente. Ele nao deve ser usado para validar conteudo fiscal real.
