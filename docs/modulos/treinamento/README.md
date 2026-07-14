# Modulo TREINAMENTO

## Papel

Treinamento centraliza FAQ, guias, videos, documentos e trilhas internas, registrando leitura ou conclusao por usuario.

## Regras

- conteudo possui modulo, tipo, titulo, corpo/arquivo, ordem e estado de publicacao;
- rascunho e visivel apenas para quem gerencia;
- publicacao exige permissao especifica;
- leitura/conclusao e idempotente por usuario e conteudo;
- atualizar uma versao relevante pode exigir nova conclusao sem apagar a anterior;
- videos e documentos privados usam S3 e URL assinada;
- relatorios mostram adocao agregada e nao substituem avaliacao formal de competencia.

## Integracoes

Usuarios fornece identidade e progresso. Biblioteca pode fornecer modelos. Cada modulo pode possuir conteudos associados, sem transferir suas regras de negocio para o material educacional.

## Mudanca segura

Testar rascunho, publicacao, permissao, arquivo, leitura repetida, nova versao, filtros por modulo e relatorios.
