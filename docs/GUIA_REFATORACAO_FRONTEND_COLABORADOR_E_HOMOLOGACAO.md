# Guia da refatoracao do frontend: colaboracao, GitHub e homologacao isolada

## 1. Objetivo

Este documento define o fluxo oficial para o desenvolvedor que atuara na refatoracao do frontend do FLUXY.

O trabalho parte da branch `refactor/frontend`, criada a partir da `dev-v2`, e termina em um Pull Request com destino exclusivo para `dev-v2`.

Fluxo autorizado:

```text
refactor/frontend -> dev-v2 -> homologacao -> main
```

A branch `main` nao participa do desenvolvimento da refatoracao. Ela somente podera receber o resultado em uma promocao posterior, conduzida pelo responsavel do projeto depois da validacao na `dev-v2`.

Estado inicial registrado em 01/09/2026:

```text
origin/dev-v2             a4705f95755398cbeb21b6f26518ad0232dd68b5
origin/refactor/frontend  a4705f95755398cbeb21b6f26518ad0232dd68b5
```

As branches estavam identicas no momento da criacao.

## 2. Regras obrigatorias

- trabalhar somente em `refactor/frontend`;
- enviar commits somente para `origin/refactor/frontend`;
- abrir Pull Request com `base: dev-v2` e `compare: refactor/frontend`;
- nao fazer push, merge, rebase ou checkout operacional na `main`;
- nao fazer deploy na EC2, reiniciar PM2 ou executar migrations;
- nao alterar backend, permissoes, endpoints ou regras de negocio sem alinhamento previo;
- preservar o comportamento dos fluxos existentes durante a refatoracao visual;
- nunca colocar segredo, senha, token, credencial de banco, AWS ou chave de IA no frontend;
- nunca usar `git push --force` na branch compartilhada;
- executar o build e os testes de responsividade antes de cada push relevante.

## 3. Pre-requisitos da maquina local

Confirmar que Git, Node.js e npm estao instalados:

```powershell
git --version
node --version
npm --version
```

O desenvolvedor precisa ter acesso ao repositorio:

```text
https://github.com/jrvjunior93-dev/sistema-gestao-solicitacoes
```

Para fazer push diretamente em `refactor/frontend`, a conta dele precisa ter permissao de escrita no repositorio. Em repositorios privados, o clone HTTPS exige autenticacao valida no GitHub.

## 4. Clone direto da branch de refatoracao

No PowerShell:

```powershell
New-Item -ItemType Directory -Force C:\Projetos
cd C:\Projetos

git clone --branch refactor/frontend https://github.com/jrvjunior93-dev/sistema-gestao-solicitacoes.git Fluxy-refactor-frontend

cd C:\Projetos\Fluxy-refactor-frontend
```

O parametro `--branch refactor/frontend` faz o primeiro checkout diretamente na branch de refatoracao. O clone baixa o repositorio, mas nao transforma a `main` em branch de trabalho.

## 5. Conferencia inicial

```powershell
git branch --show-current
git status
git remote -v
```

A branch exibida deve ser:

```text
refactor/frontend
```

Configurar a identidade local do desenvolvedor:

```powershell
git config user.name "NOME DO DESENVOLVEDOR"
git config user.email "EMAIL CADASTRADO NO GITHUB"
```

Registrar `dev-v2` como base padrao de Pull Request para essa branch:

```powershell
git config branch.refactor/frontend.gh-merge-base dev-v2
```

Confirmar a origem da branch:

```powershell
git fetch origin
git rev-parse HEAD
git rev-parse origin/refactor/frontend
git rev-list --left-right --count origin/dev-v2...origin/refactor/frontend
```

Antes das primeiras alteracoes, o ultimo comando deve retornar:

```text
0    0
```

## 6. Leitura obrigatoria antes de editar

```powershell
Get-Content AGENTS.md
Get-Content README.md
Get-Content docs\README.md
Get-Content docs\arquitetura\frontend.md
Get-Content docs\COLABORACAO_CODEX.md
```

Os arquivos abaixo possuem risco maior de efeito cascata e exigem cuidado adicional:

- `frontend/src/App.jsx`;
- `frontend/src/layout/Layout.jsx`;
- `frontend/src/pages/NovaSolicitacao.jsx`;
- `frontend/src/pages/Solicitacoes/index.jsx`;
- `frontend/src/pages/SolicitacaoDetalhe/index.jsx`;
- `frontend/src/contexts/AuthContext.jsx`;
- `frontend/src/contexts/ThemeContext.jsx`.

Uma refatoracao nao autoriza mudar permissoes, endpoints, status, regras financeiras, regras de setor ou efeitos dos botoes.

## 7. Instalacao local

Instalar as dependencias do frontend:

```powershell
npm --prefix frontend install
```

Validar a instalacao:

```powershell
npm --prefix frontend run build
```

### 7.1 Uso da API de desenvolvimento no ambiente local

Criar manualmente o arquivo:

```text
frontend/.env.local
```

Conteudo:

```env
VITE_API_URL=/api
VITE_DEV_API_PROXY_TARGET=https://api-dev.jrfluxy.com.br
```

O arquivo `.env.local` e ignorado pelo Git. Ele nao deve ser adicionado manualmente nem enviado ao repositorio.

`VITE_DEV_API_PROXY_TARGET` e usado apenas pelo servidor local do Vite. Ele nao e necessario no build estatico publicado na Vercel.

Iniciar o frontend:

```powershell
npm --prefix frontend run dev
```

Endereco local padrao:

```text
http://localhost:5273
```

## 8. Rotina diaria de desenvolvimento

Antes de iniciar:

```powershell
cd C:\Projetos\Fluxy-refactor-frontend
git switch refactor/frontend
git pull --ff-only origin refactor/frontend
git status
```

Depois de editar os arquivos:

```powershell
git status --short
git diff
```

As alteracoes da refatoracao devem permanecer principalmente em:

```text
frontend/src/
frontend/public/
frontend/package.json
frontend/package-lock.json
```

Se surgir necessidade de alterar backend, migration, banco, permissao, endpoint ou configuracao operacional, o desenvolvedor deve interromper esse trecho e solicitar alinhamento.

## 9. Validacao antes do commit

```powershell
npm --prefix frontend run test:responsive
npm --prefix frontend run build
```

Os dois comandos precisam concluir sem erro.

Revisar novamente:

```powershell
git status --short
git diff
```

## 10. Commit

Adicionar somente o frontend:

```powershell
git add frontend
git diff --cached
```

Se houver documentacao relacionada, adicionar somente os arquivos documentais realmente alterados:

```powershell
git add docs\CAMINHO_DO_DOCUMENTO.md
git diff --cached
```

Criar o commit:

```powershell
git commit -m "refactor(frontend): descrever resumidamente a alteracao"
```

Exemplo:

```powershell
git commit -m "refactor(frontend): padronizar componentes e estrutura visual"
```

## 11. Sincronizacao e push

Antes do push:

```powershell
git pull --rebase origin refactor/frontend
```

Se houver conflito, parar, revisar os arquivos e resolver conscientemente. Nao usar `git push --force`.

Depois da sincronizacao, validar novamente:

```powershell
npm --prefix frontend run test:responsive
npm --prefix frontend run build
```

Enviar:

```powershell
git push origin refactor/frontend
```

Conferir:

```powershell
git status
git log -5 --oneline
```

## 12. Pull Request exclusivo para dev-v2

Abrir:

```text
https://github.com/jrvjunior93-dev/sistema-gestao-solicitacoes/compare/dev-v2...refactor/frontend?expand=1
```

No topo da pagina precisa aparecer exatamente:

```text
base: dev-v2 <- compare: refactor/frontend
```

Nunca aceitar `base: main` para esse Pull Request.

Titulo sugerido:

```text
refactor(frontend): reorganizar estrutura e componentes do frontend
```

Descricao sugerida:

```markdown
## Objetivo

Refatorar o frontend do Fluxy preservando os fluxos, permissoes, endpoints e regras de negocio existentes.

## Alteracoes

- Descrever os componentes modificados.
- Descrever os padroes reutilizaveis criados.
- Informar as telas afetadas.

## Validacoes

- [x] Build do frontend executado
- [x] Teste de responsividade executado
- [x] Permissoes existentes preservadas
- [x] Endpoints existentes preservados
- [x] Nenhuma migration adicionada
- [x] Nenhuma alteracao enviada para a main

## Destino

Este Pull Request deve ser integrado exclusivamente na dev-v2.
```

### 12.1 Pull Request pelo GitHub CLI

Se o GitHub CLI estiver instalado:

```powershell
gh auth login
cd C:\Projetos\Fluxy-refactor-frontend

gh pr create --repo jrvjunior93-dev/sistema-gestao-solicitacoes --base dev-v2 --head refactor/frontend --web
```

Conferir a base e a origem:

```powershell
gh pr view refactor/frontend --repo jrvjunior93-dev/sistema-gestao-solicitacoes --json url,baseRefName,headRefName,state
```

Resultado esperado:

```text
baseRefName: dev-v2
headRefName: refactor/frontend
```

## 13. Correcoes solicitadas durante a revisao

O mesmo Pull Request sera atualizado automaticamente com novos commits:

```powershell
cd C:\Projetos\Fluxy-refactor-frontend
git switch refactor/frontend
git pull --ff-only origin refactor/frontend
```

Depois das correcoes:

```powershell
npm --prefix frontend run test:responsive
npm --prefix frontend run build

git add frontend
git commit -m "fix(frontend): ajustar pontos identificados na revisao"
git push origin refactor/frontend
```

## 14. Homologacao isolada na Vercel

### 14.1 Resposta objetiva

E possivel testar `refactor/frontend` sem substituir o frontend da `dev-v2`.

Entretanto, a branch nao aponta diretamente para banco algum. A arquitetura correta e:

```text
Frontend refactor na Vercel
        |
        v
https://api-dev.jrfluxy.com.br
        |
        v
Banco de desenvolvimento usado pelo backend-dev
```

O frontend recebe somente a URL publica da API. Credenciais de MySQL, JWT, AWS, OpenAI, Gemini ou qualquer outro segredo permanecem fora da Vercel do frontend.

### 14.2 O que fica isolado e o que continua compartilhado

Fica isolado:

- dominio/URL do frontend;
- build da branch;
- arquivos estaticos publicados;
- ciclo de deploy;
- possibilidade de rollback do frontend da refatoracao.

Continua compartilhado com a `dev-v2`:

- API `api-dev.jrfluxy.com.br`;
- processo `backend-dev`;
- banco de desenvolvimento;
- anexos e integracoes do ambiente dev;
- dados criados ou alterados pelos testes.

Portanto, um segundo projeto Vercel evita conflito de codigo e publicacao, mas nao isola os dados. Para isolamento total seria necessario outro backend e outro banco, o que nao faz parte desta refatoracao.

### 14.3 Opcao recomendada: Preview da branch no projeto Vercel de desenvolvimento

A Vercel cria Preview Deployments para branches que nao sao a Production Branch. Assim, se o projeto de desenvolvimento usa `dev-v2` como Production Branch, cada push em `refactor/frontend` pode gerar uma URL separada sem substituir o frontend dev.

Configuracao:

1. manter `dev-v2` como Production Branch do projeto Vercel de desenvolvimento;
2. conectar o repositorio, caso ainda nao esteja conectado;
3. manter `frontend` como Root Directory;
4. configurar para Preview da branch `refactor/frontend`:
   - `VITE_API_URL=https://api-dev.jrfluxy.com.br`;
5. fazer novo deploy da branch;
6. usar a Branch URL estavel ou associar um dominio exclusivo a essa branch;
7. adicionar a origem exata desse dominio ao CORS da API dev;
8. proteger o Preview com Vercel Authentication sempre que possivel.

Vantagens:

- nao cria outro projeto para manter;
- `dev-v2` continua publicada normalmente;
- a branch recebe URL de Preview propria;
- a variavel pode ser configurada especificamente para `refactor/frontend`;
- o Pull Request pode exibir o deployment para revisao.

### 14.4 Opcao alternativa: novo projeto Vercel

Um projeto separado tambem funciona e oferece separacao mais visivel entre os frontends.

Configuracao sugerida no painel da Vercel:

| Campo | Valor |
| --- | --- |
| Git Repository | `jrvjunior93-dev/sistema-gestao-solicitacoes` |
| Project Name | `fluxy-refactor-frontend` |
| Framework Preset | `Vite` |
| Root Directory | `frontend` |
| Production Branch | `refactor/frontend` |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Variavel do projeto:

```text
Nome: VITE_API_URL
Valor: https://api-dev.jrfluxy.com.br
Ambientes: Production e Preview
```

Nao configurar no projeto do frontend:

```text
DATABASE_URL
DB_HOST
DB_USER
DB_PASSWORD
JWT_SECRET
AWS_SECRET_ACCESS_KEY
OPENAI_API_KEY
GEMINI_API_KEY
qualquer chave privada
```

Nao e necessario configurar `VITE_DEV_API_PROXY_TARGET` na Vercel. Essa variavel e exclusiva do servidor local do Vite.

Depois do primeiro deployment, copiar o dominio estavel, por exemplo:

```text
https://fluxy-refactor-frontend.vercel.app
```

O dominio real gerado pela Vercel deve ser utilizado; o exemplo acima nao deve ser presumido antes da criacao do projeto.

### 14.5 CORS obrigatorio na API de desenvolvimento

O backend aceita apenas origens cadastradas. O dominio estavel do frontend de refatoracao precisa ser incluido, sem wildcard, em:

```text
INSTALACAO_CONFIG.allowed_origins
```

Exemplo conceitual:

```json
{
  "allowed_origins": [
    "https://dev.jrfluxy.com.br",
    "https://DOMINIO-EXATO-DO-REFATOR.vercel.app"
  ]
}
```

A lista real ja possui outras origens. Antes de salvar, carregar a configuracao atual e preservar todos os valores existentes, acrescentando somente o novo dominio.

Os endpoints administrativos sao:

```text
GET   /api/instalacao
PATCH /api/instalacao
```

Eles exigem autenticacao de `SUPERADMIN`. O `PATCH` atualiza o cache de runtime, portanto, quando usado corretamente, nao exige restart apenas para recarregar a lista. Se a configuracao for alterada por outro meio, validar o runtime antes de considerar concluido.

Nao cadastrar:

```text
https://*.vercel.app
*
```

Utilizar somente a origem exata e estavel da homologacao.

### 14.6 Protecao do ambiente de homologacao

O frontend acessara dados do ambiente dev. Por isso:

- habilitar Vercel Authentication/Deployment Protection;
- limitar acesso aos participantes da homologacao;
- preferir uma URL de Preview protegida;
- nao usar dados reais desnecessarios nos testes;
- usar contas e registros identificados como teste;
- nao compartilhar publicamente URLs de bypass;
- conferir a limitacao do plano Vercel antes de tratar o dominio de producao de um segundo projeto como privado.

Em planos nos quais a protecao padrao nao cobre o dominio de producao, a opcao de Preview dentro do projeto dev tende a ser mais segura do que transformar `refactor/frontend` na Production Branch de outro projeto publico.

## 15. Checklist da Vercel

Antes de liberar o acesso:

- [ ] `refactor/frontend` e a branch publicada;
- [ ] `frontend` e o Root Directory;
- [ ] build usa `npm run build`;
- [ ] saida usa `dist`;
- [ ] existe apenas `VITE_API_URL=https://api-dev.jrfluxy.com.br` como configuracao operacional necessaria do frontend;
- [ ] nenhuma chave privada foi cadastrada;
- [ ] dominio exato foi adicionado ao CORS do backend dev;
- [ ] deployment esta protegido;
- [ ] login funciona;
- [ ] requisicoes autenticadas nao retornam erro de CORS;
- [ ] anexos abrem pelo ambiente dev;
- [ ] nenhum deploy da `dev-v2` foi substituido;
- [ ] nenhuma mudanca foi enviada para a `main`.

## 16. Teste de aceite do frontend publicado

Executar no dominio da refatoracao:

1. abrir a tela de login;
2. autenticar com usuario de teste;
3. renovar a pagina e confirmar que a sessao permanece valida;
4. abrir listagem e detalhe de solicitacao;
5. testar navegacao, menu, tema e responsividade;
6. abrir um anexo permitido;
7. conferir no DevTools se todas as chamadas vao para `api-dev.jrfluxy.com.br`;
8. confirmar ausencia de chamadas para `api.jrfluxy.com.br`;
9. confirmar ausencia de erro `CORS_BLOCKED` ou HTTP 403 por origem;
10. verificar que nenhuma credencial sensivel aparece no bundle ou nas variaveis `VITE_*`.

## 17. Promocao posterior

Depois da aprovacao do Pull Request:

```text
refactor/frontend -> dev-v2
```

A integracao deve ser feita pelo responsavel do projeto. O desenvolvedor da refatoracao nao atualiza EC2, Vercel oficial, `main` ou producao.

Somente depois da homologacao completa da `dev-v2` podera ser preparado outro processo controlado para:

```text
dev-v2 -> main
```

Esse segundo processo nao faz parte do Pull Request da refatoracao.

## 18. Comandos proibidos neste fluxo

Nao executar:

```text
git push origin main
git push origin dev-v2
git merge main
git switch main
git push --force
```

O desenvolvedor deve limitar-se a:

```text
editar refactor/frontend
        -> validar
        -> commitar
        -> push em origin/refactor/frontend
        -> Pull Request com base dev-v2
        -> aguardar revisao
```

## 19. Referencias externas

- GitHub, clonagem de repositorio: <https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository>
- GitHub CLI, criacao de Pull Request: <https://cli.github.com/manual/gh_pr_create>
- Vercel, deploy por Git e Production Branch: <https://vercel.com/docs/git>
- Vercel, variaveis por ambiente e branch: <https://vercel.com/docs/environment-variables>
- Vercel, dominio associado a branch: <https://vercel.com/docs/domains/working-with-domains/assign-domain-to-a-git-branch>
- Vercel, Deployment Protection: <https://vercel.com/docs/deployment-protection>
- Vercel, compartilhamento de Preview: <https://vercel.com/docs/deployments/sharing-deployments>

