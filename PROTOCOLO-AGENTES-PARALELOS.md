# Protocolo: dois agentes trabalhando no mesmo repositório

Decidido em 20/08/2026: **trabalho em paralelo, dividido por módulo.**

| Agente | Módulos | Não mexe em |
|---|---|---|
| A | Contratos, Solicitações, Medição, Financeiro (títulos de contrato) | Compras |
| B | Compras (catalogação de itens manuais, insumos, pedidos) | Contratos, Solicitações |

Este documento existe porque, no primeiro dia de trabalho em paralelo, três coisas colidiram — e uma
delas derrubou o ambiente inteiro.

---

## 0. Leia isto primeiro: o que mudou em 20/08

Duas decisões do cliente mudaram as regras do jogo. Se você só ler uma seção deste documento, leia
esta.

### 0.1 `Fluxy-V4` é a fonte de verdade

A `dev-v2` **não** é mais o tronco. O que muda lá precisa vir para cá; daqui é que sai o que vai para
produção, depois de aprovado.

Consequência para você: **pare de considerar a `C:\Fluxy` como destino do seu trabalho.** O módulo
de Compras que você está construindo já está aqui, e é aqui que ele continua.

### 0.2 A consolidação já foi feita — e ela tocou arquivos do seu módulo

Em 20/08 trouxe 30 commits da `dev-v2` (26 arquivos copiados inteiros, 13 novos, 12 resolvidos por
patch). **Quatro deles são território de Compras.** Confira antes de continuar de onde parou:

| Arquivo | O que aconteceu |
|---|---|
| `backend/src/services/liveUpdatesBroker.js` | **substituído** pela versão da `dev-v2` (commit `95b7f4ae`, estabiliza atualizações) |
| `backend/src/services/pedidoCompraService.js` | **substituído** (commit `82ce9663`, frete global rateado acima da base dos itens) |
| `frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx` | **substituído** (usa `ModalPortal`, ver 0.4) |
| `backend/src/controllers/SolicitacaoCompraController.js` | **patch aplicado** por cima do seu trabalho (live updates). Suas alterações de catalogação continuam lá |

**Intactos** (nada foi tocado): `insumoManualCatalogacaoService.js`,
`InsumoManualCatalogacaoController.js`, `InsumoAlias.js`, `compras-responsive.css`,
`SolicitacaoCompraDetalheView.jsx`, `ItemCompraExpansivel.jsx`, `TratamentoItemManual.jsx`.

Se você tinha alteração **não salva** em algum dos quatro substituídos, ela se perdeu — confira e me
diga que eu reponho.

### 0.3 Sua migration foi renumerada — e o motivo importa

`202608200002_catalogacao_itens_manuais.js` → **`202608200051_catalogacao_itens_manuais.js`**

O conteúdo não mudou (além da correção de FK de mais cedo, ver 0.5). O `schema_migrations` foi
atualizado junto, então ela **não vai rodar de novo**.

Por quê: `schema_migrations` identifica migration pelo **nome do arquivo**. Uma migration que veio da
`dev-v2` pode já ter rodado na `main` — renomeá-la faria rodar outra vez em produção. Então quem cede
na colisão é sempre a migration criada aqui, que nunca rodou fora deste ambiente.

**A regra que você precisa seguir a partir de agora:**

| Origem | Faixa de sequência |
|---|---|
| Vinda da `dev-v2` / `main` | `0001`–`0049` — **copiar com o nome exato, nunca renomear** |
| Criada aqui no V4 | **`0050`+** |

Exemplo: migration nova hoje seria `202608200053_seu_nome_aqui.js`. Antes de escolher o número,
rodar `ls backend/migrations/` — eu também crio migrations e a data pode coincidir.

Detalhes completos em **`CONVENCAO-MIGRATIONS.md`**.

### 0.4 Modais: `ModalPortal` é a base, `OverlayModal` é a casca

A `GerenciarCotacaoSolicitacao.jsx` que veio da `dev-v2` usa `ModalPortal` em 5 lugares — continua
funcionando, não mexa.

Existiam **duas** soluções para o mesmo problema (o `ModalPortal` de lá e o `OverlayModal` que criei
aqui). Foram consolidadas: `OverlayModal` agora **usa** o `ModalPortal` por dentro.

> Por que isso importa para você: a trava de rolagem conta modais abertos numa variável de módulo.
> Se alguém duplicar essa lógica, viram **dois contadores** — e com um modal de Compras e um de
> contrato abertos ao mesmo tempo, o primeiro a fechar destrava a rolagem com o outro ainda aberto.
> **Não copie a trava de rolagem para lugar nenhum**: use `ModalPortal` (ou `OverlayModal`, se
> quiser a casca pronta com centralização e largura).

### 0.5 O boot do backend já caiu por causa de uma migration

`202608200002` (agora `...0051`) criava a FK com `references` dentro do `addColumn`. O Sequelize gera
o nome concatenando tabela + coluna, e deu
`solicitacao_compra_itens_manuais_insumo_catalogado_id_foreign_idx` — **65 caracteres**, contra o
limite de 64 do MySQL. `ER_TOO_LONG_IDENT`.

Como `server.js` roda as migrations **antes** de abrir a porta, o backend inteiro ficou fora do ar —
para você, para mim e para o cliente. Corrigi com o mínimo: coluna sem `references`, FK em seguida
via `addConstraint` com nome curto (`sc_itens_manuais_insumo_catalogado_fk`). Mesmo comportamento.

`solicitacao_compra_itens_manuais` tem 32 caracteres — **qualquer FK inline nessa tabela com nome de
coluna médio estoura o limite.** Em tabela de nome longo, sempre `addConstraint` com `name` curto.

---

## 1. O banco é um só, e é cópia da produção

**É o risco mais sério.** Não existe banco por agente: as suítes de um escrevem no banco que o outro
(e o cliente) está usando. Em 20/08 isso causou dois estragos reais — a sequência de código de
contrato e as permissões de 26 usuários. Ver `QA-ESTADO-COMPARTILHADO.md`.

**Regra:** antes de rodar qualquer suíte de QA, avisar. Elas escrevem em tabelas compartilhadas
(`configuracoes_sistema`, sequências, cadastros), e o cliente pode estar com a tela aberta.

**Regra:** limpeza devolve o estado, nunca impõe. Usar `qa/lib/sequenciaContrato.js` e
`qa/lib/permissoesConfig.js`. Limpeza que falha reprova a suíte.

## 2. O backend é um só, na porta 8100

Reiniciar derruba a sessão do outro agente e a do cliente no meio do que estiver fazendo.

**Regra:** avisar antes de reiniciar. Quem subiu por último confere que subiu (`/api/auth/me`
respondendo, ainda que 401) — não basta o processo ter começado.

**Regra:** `server.js` roda as **migrations antes de abrir a porta**. Migration quebrada = backend
fora do ar para todo mundo, não só para quem escreveu. Testar a migration antes de deixá-la no
diretório.

> Foi exatamente o que aconteceu: `202608200002_catalogacao_itens_manuais.js` gerava um nome de FK
> com 65 caracteres (o limite do MySQL é 64) e o backend parou de subir. Ver a armadilha no
> `LEIA-PRIMEIRO.md`.

## 3. Arquivos que os dois módulos tocam

- `backend/src/routes.js`
- `backend/src/models/index.js`
- `backend/src/constants/moduloPermissoes.js`
- `backend/migrations/` (o prefixo de data colide)
- `LEIA-PRIMEIRO.md`, `MIGRACAO-PARA-PRODUCAO.md`, `POLITICA-INTERNA-CSC.md`

**Regra:** nesses arquivos, **só acrescentar** — não reordenar, não reformatar, não "limpar de
passagem". Cada um escreve no seu trecho.

**Regra:** migration nova usa o prefixo do dia com sequência **conferida** contra o que já existe no
diretório (`ls backend/migrations/`), para dois agentes não criarem `2026082000NN` iguais.

## 4. Mexer no arquivo do outro

Acontece — e aconteceu: a migration de Compras estava impedindo o backend de subir, e o agente de
Contratos corrigiu para destravar o ambiente.

**Regra:** pode, quando **bloqueia o ambiente**. Nesse caso:

1. corrigir o **mínimo** que destrava, sem redesenhar nada;
2. explicar no relato: qual arquivo, o que estava errado, o que exatamente mudou;
3. registrar no documento do módulo afetado, para o dono revisar.

Fora de bloqueio de ambiente: avisar e deixar para o dono.

## 5. Frontend

`npm run build` na pasta `frontend` afeta os dois. Não é destrutivo, mas o cliente pode precisar
recarregar a página. Dizer isso no relato quando houver mudança de tela.

---

## 6. Os outros documentos que valem para você

| Arquivo | Quando ler |
|---|---|
| **`CONVENCAO-MIGRATIONS.md`** | **Antes de criar qualquer migration.** A faixa `0050+`, a idempotência e a regra da FK com nome curto. |
| **`QA-ESTADO-COMPARTILHADO.md`** | Antes de escrever ou rodar suíte. O que já quebrou por limpeza que impõe estado em vez de devolver. |
| **`MAPA-BANCO-E-INTEGRACOES.md`** | **Antes de ligar um campo de seleção a uma fonte.** O checklist de 4 passos e as tabelas canônicas. Compras não está mapeado ali — se você mapear os campos do seu módulo, acrescente na seção 5. |
| **`AUDITORIA-FLUXY-VS-V4.md`** | Para entender o que veio da `dev-v2`, o que ficou e o que não foi auditado. |

## 7. Três coisas que custaram caro em 20/08

Não são teoria — as três aconteceram, no mesmo dia, e as três têm a mesma forma: **um caminho de
falha silencioso que se disfarça de resultado.**

1. **Permissão escolhida pelo que a rota FAZ, e não por quem PRECISA usá-la.** Errei três vezes
   seguidas, sempre barrando o usuário da obra. Antes de escolher a guarda, perguntar: *quem vai
   clicar nisto?*
2. **Limpeza de QA que impõe estado.** Uma suíte zerou a sequência de código de contrato (500 na
   tela do cliente) e outra apagou as permissões granulares de **26 usuários**. Limpeza devolve o
   que havia; nunca `SET x = 0` nem `DELETE ... WHERE NOT (<uma linha>)`.
3. **Suíte que monta o payload no lugar da tela.** Cinco suítes mandavam um campo que já tinha saído
   do formulário — nenhuma pegou que a regra antiga bloqueava toda criação. Prefira o caminho pela
   tela.

E o corolário de todas: **`catch` mudo esconde 403.** Quatro defeitos chegaram ao cliente como
"campo vazio, sem explicação" porque um `.catch(() => [])` transformou erro em lista vazia.

## Resumo em uma linha

Banco, backend e alguns arquivos são compartilhados: **avisar antes de rodar suíte ou reiniciar, só
acrescentar nos arquivos comuns, migration criada aqui usa a faixa `0050+`, e limpeza de QA sempre
devolve o estado.**

---

## 8. Pendência aberta para Compras (23/08)

O cadastro de credor passou a exigir, em **pessoa jurídica**, `nome_fantasia` e representante legal
(`representante_nome` + `representante_cpf` válido). Colunas novas em `parceiros`, migration
`202608230050_parceiro_fantasia_representante.js`.

A exigência está **desligada** na sua rota — `POST /parceiros/credor-compra-direta`, via
`criarParceiro(..., { exigirCadastroCompleto: false })` — porque o formulário de compra direta ainda
não tem esses campos, e ligar sem eles derrubaria o cadastro rápido de fornecedor.

**O que falta do seu lado:** acrescentar Nome fantasia, Nome e CPF do representante ao formulário de
compra direta e tirar o `exigirCadastroCompleto: false` do controller. A suíte
`qa/medicao/40-cadastro-credor-pf-pj.js` já tem a prova que garante que a sua rota não quebrou; ela
vai precisar mudar quando você ligar a exigência.

A importação por XLSX **não** passa por `criarParceiro` e segue aceitando planilha antiga — de
propósito: exigir nome fantasia em milhares de linhas históricas travaria a carga inteira.
