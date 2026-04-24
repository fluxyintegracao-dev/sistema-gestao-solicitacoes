# Prompt - Execucao do FLUXY Ops em Novo Chat

## Objetivo

Usar este arquivo como mensagem inicial em um novo chat com IA para iniciar o desenvolvimento do novo repositorio `fluxy-ops`.

## O que copiar para o novo repositorio local

Crie uma pasta nova, por exemplo:

- `C:\Projetos\fluxy_ops`

Nao copie `backend/` nem `frontend/` do FLUXY principal.

Copie apenas estes arquivos de contexto para dentro do novo repositorio:

### Raiz

- `README.md`
- `AGENTS.md`

### Pasta sugerida no novo repositorio

Criar:

- `docs/referencia_fluxy/`

Copiar para dentro dela:

- `docs/contexto/visao_geral.md`
- `docs/contexto/escopo_produto.md`
- `docs/contexto/historico_projeto.md`
- `docs/arquitetura/visao_geral.md`
- `docs/arquitetura/stack_e_componentes.md`
- `docs/arquitetura/painel_ops_e_instalacoes.md`
- `docs/arquitetura/fluxy_ops_backlog_implantacao.md`
- `docs/modulos/compras.md`
- `docs/modulos/financeiro.md`
- `docs/modulos/obras.md`
- `docs/modulos/solicitacoes.md`
- `docs/regras_negocio/compras.md`
- `docs/regras_negocio/financeiro.md`
- `docs/regras_negocio/parceiros.md`
- `docs/prompts_padrao/painel_ops_integracao_clientes.md`

## Comandos sugeridos no PowerShell

### 1. Criar a pasta do novo repositorio

```powershell
New-Item -ItemType Directory -Force C:\Projetos\fluxy_ops
Set-Location C:\Projetos\fluxy_ops
git init
New-Item -ItemType Directory -Force docs\referencia_fluxy
```

### 2. Copiar os arquivos minimos de contexto

```powershell
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\README.md .\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\AGENTS.md .\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\contexto\visao_geral.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\contexto\escopo_produto.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\contexto\historico_projeto.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\arquitetura\visao_geral.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\arquitetura\stack_e_componentes.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\arquitetura\painel_ops_e_instalacoes.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\arquitetura\fluxy_ops_backlog_implantacao.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\modulos\compras.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\modulos\financeiro.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\modulos\obras.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\modulos\solicitacoes.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\regras_negocio\compras.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\regras_negocio\financeiro.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\regras_negocio\parceiros.md docs\referencia_fluxy\
Copy-Item C:\Projetos\sistema_gestao_solicitacoes\docs\prompts_padrao\painel_ops_integracao_clientes.md docs\referencia_fluxy\
```

## Mensagem inicial para colar no novo chat

Cole exatamente esta mensagem:

```text
Este repositorio local e o novo sistema `fluxy-ops`.

Leia primeiro:
- AGENTS.md
- README.md
- docs/referencia_fluxy/painel_ops_integracao_clientes.md
- docs/referencia_fluxy/painel_ops_e_instalacoes.md
- docs/referencia_fluxy/fluxy_ops_backlog_implantacao.md

Depois leia os demais arquivos de `docs/referencia_fluxy` apenas na medida em que precisar de contexto.

Objetivo:
Quero que voce desenhe e implemente o `Painel Ops FLUXY` como um sistema separado do produto do cliente.

Regras:
- nao transformar o FLUXY principal em multi-tenant
- o Painel Ops e um control plane separado
- manter o produto do cliente single-tenant por instalacao
- cada cliente pode ter projeto proprio na Vercel, backend proprio e banco proprio
- nao criar repo por cliente por padrao
- construir primeiro a fundacao do repositorio, depois models, migrations, rotas, telemetria e dashboard

Sua primeira entrega neste chat deve ser:
1. validar a arquitetura escolhida
2. estruturar o repositorio novo
3. criar o backlog tecnico executavel por fases
4. iniciar a implementacao da Fase 0 e Fase 1

Sempre explique as alteracoes e nao faca mudancas destrutivas.
```

## Orientacao de execucao

No novo chat, a IA deve:

1. validar a arquitetura
2. definir a stack do `fluxy-ops`
3. criar a estrutura base do novo repositorio
4. criar `.env.example`
5. criar as primeiras migrations e models
6. documentar o que for construindo

## Observacao importante

Se a IA tentar copiar o sistema inteiro atual para dentro do `fluxy-ops`, interrompa.

O novo repositorio deve nascer limpo e separado.

Ele precisa apenas da documentacao de referencia do FLUXY principal, nao do codigo do produto principal.
