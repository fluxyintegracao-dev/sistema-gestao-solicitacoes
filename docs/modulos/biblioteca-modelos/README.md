# Modulo BIBLIOTECA_MODELOS

## Papel

Biblioteca de Modelos organiza arquivos padrao usados pela operacao, como planilhas, formularios e documentos de referencia. Ela e dona do cadastro do modelo; o armazenamento fisico permanece no servico de arquivos.

## Regras

- modelo possui nome, categoria, versao, status e arquivo;
- substituicao de arquivo nao deve invalidar referencias historicas sem controle de versao;
- exclusao deve ser logica quando houver uso conhecido;
- upload valida extensao, MIME, tamanho e permissao;
- download usa URL assinada de curta duracao;
- permissao de administrar e diferente de permissao de visualizar;
- arquivos nao podem conter segredos ou credenciais operacionais.

## Integracoes

Treinamento pode referenciar um modelo. Outros modulos podem oferecer atalhos, mas nao devem duplicar o arquivo nem ignorar a autorizacao da biblioteca.

## Mudanca segura

Testar upload, versao, inativacao, download, expiracao da URL, permissao e referencias existentes.
