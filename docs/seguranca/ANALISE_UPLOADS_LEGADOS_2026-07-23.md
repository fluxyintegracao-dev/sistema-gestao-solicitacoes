# Analise da rota legada `/uploads`

Data: 2026-07-23

## Decisao desta entrega

A rota `/uploads` permanece inalterada nesta entrega. Remover a rota ou exigir JWT agora pode causar regressao em anexos antigos e em links publicos de cotacao. A mudanca so pode ocorrer depois do inventario de banco e disco nos ambientes `dev-v2` e `main`.

## Evidencias encontradas no codigo

- `backend/src/app.js` publica `backend/uploads` por `express.static`.
- `backend/src/services/s3.js` usa armazenamento local apenas quando `NODE_ENV !== production` e o S3 nao esta configurado ou usa credenciais locais.
- Em producao, `uploadToS3` envia os novos arquivos ao bucket configurado.
- `getPresignedUrl` devolve caminhos `/uploads/...` sem assinatura para manter compatibilidade com arquivos locais antigos.
- solicitacoes de compra e documentos comerciais ainda possuem leitores explicitos de caminhos `/uploads/...`.
- a cotacao de fornecedor possui paginas publicas. Proteger todos os caminhos locais somente com a sessao interna pode impedir o fornecedor de abrir um anexo legado.
- o frontend converte caminhos relativos `/uploads/...` para a origem da API.
- no workspace atual, `backend/uploads` nao existe e o inventario local encontrou zero arquivos.
- documentacao historica afirma que artefatos antigos podem existir no servidor. Essa afirmacao precisa ser validada no disco e no banco de cada ambiente; o repositorio local nao comprova o estado das EC2.

## Ferramenta de inventario

Foi adicionado o comando somente leitura:

```bash
cd backend
npm run audit:legacy-uploads
```

O comando acima inventaria apenas o disco local e informa se o fallback local e possivel.

Para consultar referencias no banco, usar:

```bash
cd backend
npm run audit:legacy-uploads -- --scan-db
```

A varredura de banco:

- usa somente `SELECT`;
- procura `/uploads/` em colunas textuais candidatas relacionadas a arquivos, anexos, documentos, caminhos e URLs;
- informa somente tabela, coluna e contagem;
- nao imprime nomes de arquivo armazenados no banco;
- nao altera registros.

Para a verificacao final, existe ainda o modo abrangente:

```bash
cd backend
npm run audit:legacy-uploads -- --scan-db-all-text
```

Esse modo consulta todas as colunas textuais/JSON e reduz o risco de uma referencia estar em um campo com nome generico. Como pode varrer tabelas grandes, executar fora do horario de maior carga e acompanhar CPU/IO do banco. O modo `--scan-db` e o primeiro passo de menor impacto.

Executar primeiro no banco de desenvolvimento e depois no de producao, fora do horario de maior carga. Os bancos conhecidos sao:

- desenvolvimento: `backend-dev`;
- producao: `backend-solicitacoes`.

## Criterio para a proxima decisao

### Cenario A — zero arquivos e zero referencias em ambos os ambientes

Pode-se preparar uma entrega separada para:

1. remover o `express.static('/uploads')`;
2. remover o fallback local do runtime implantado;
3. manter fallback somente para testes locais, se ainda for util;
4. executar a matriz de anexos e cotacoes publicas.

### Cenario B — existem arquivos ou referencias

Antes de proteger/remover a rota:

1. copiar cada arquivo local para o bucket privado com chave controlada;
2. validar tamanho e hash do objeto enviado;
3. atualizar a referencia no banco em transacao e manter mapa de reversao;
4. testar download autenticado e acesso do fornecedor por token;
5. manter a rota antiga durante uma janela de compatibilidade;
6. medir acessos restantes a `/uploads`;
7. remover a rota apenas quando nao houver referencias nem acessos validos.

### Cenario C — ha arquivos sem referencia no banco

Nao excluir automaticamente. Mover para quarentena privada com inventario, hash, data e origem; definir retencao com responsavel pelo dado.

## Risco de proteger a rota diretamente

Adicionar o middleware JWT global a `/uploads` resolveria a exposicao direta, mas quebraria consumidores publicos e links antigos. Uma eventual protecao deve ser orientada ao recurso:

- usuarios internos: autorizacao pelo registro vinculado e URL assinada curta;
- fornecedores: token da cotacao e verificacao do anexo pertencente aquela cotacao;
- contratos/documentos: permissao do modulo e vinculo ao contrato;
- nenhum consumidor deve receber caminho fisico ou chave arbitraria.

## Estado final desta entrega

- rota `/uploads`: preservada;
- novos uploads produtivos: continuam no S3;
- inventario local: zero arquivos;
- inventario das EC2/bancos: pendente de execucao operacional;
- remocao/protecao: bloqueada ate as evidencias dos dois ambientes.
