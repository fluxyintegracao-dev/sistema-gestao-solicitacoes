# Convenção de migrations — enquanto `dev-v2` e `Fluxy-V4` coexistem

Decidido em 20/08/2026, quando o cliente definiu que **`Fluxy-V4` passa a ser a fonte de verdade** e
o que estiver em `dev-v2` precisa vir para cá.

---

## O fato que determina tudo

**`schema_migrations` registra pelo NOME DO ARQUIVO.**

```sql
SELECT name FROM schema_migrations;  -- '202608160001_financeiro_dda_base.js'
```

Renomear uma migration faz o runner não encontrar o registro dela e **executá-la de novo**. Numa
migration não idempotente, isso é um erro de schema em produção.

Disso saem as duas regras.

## Regra 1 — migration que veio do `dev-v2` **nunca** é renomeada

`dev-v2` anda junto com a `main`. Uma migration de lá pode **já ter rodado em produção**. O nome
dela é a identidade no `schema_migrations` de produção, e mudá-lo faria a migration rodar outra vez
no deploy.

**Ao trazer do `dev-v2`: copiar com o nome exato. Sempre.**

## Regra 2 — na colisão, quem cede é a migration criada no V4

Migration criada aqui **nunca rodou fora deste ambiente**. Renomeá-la só afeta o banco local — e,
como todas são idempotentes, o pior caso é rodar de novo e não fazer nada.

> Conferido em 20/08: as 17 migrations criadas no V4 têm guarda
> (`columnExists` / `tableExists` / `indexExists`). Nenhuma quebra se reexecutar.

## Regra 3 — faixa reservada: V4 usa sequência **0050 em diante**

O nome é `YYYYMMDD` + 4 dígitos de sequência. Enquanto os dois repositórios recebem trabalho:

| Origem | Sequência | Exemplo |
|---|---|---|
| `dev-v2` / `main` | `0001`–`0049` | `202608160001_financeiro_dda_base.js` |
| Criada no **V4** | **`0050`+** | `202608160050_obra_tipo_apropriacao_padrao.js` |

Por que funciona: `dev-v2` nunca passou de `0015` em uma data. A faixa dá folga de sobra e faz as
duas frentes poderem criar migration **no mesmo dia** sem se atropelarem.

E a ordem de execução continua certa: o runner ordena por nome, então uma migration do V4 (`0050`)
roda **depois** de qualquer migration do `dev-v2` da mesma data (`00NN`). É o que se quer — o
trabalho do V4 assume o schema base como pronto.

## Regra 4 — toda migration é idempotente, sem exceção

```js
if (await columnExists(sequelize, 'tabela', 'coluna')) return;
```

Não é preciosismo: é o que torna a Regra 2 segura, e o que permite reexecutar um deploy
interrompido no meio.

## Regra 5 — migration altera ESTRUTURA, nunca DADOS

**Decisão do cliente, 24/08/2026.** É a regra mais importante deste arquivo para quem for migrar.

Migration pode criar e alterar **tabela, coluna e índice**. Não pode `UPDATE`, `INSERT` nem `DELETE`
de dados — nem para "só preencher a coluna nova".

### Por quê

`server.js` roda as migrations **antes de abrir a porta**. Uma migration que corrige dados executaria
**sozinha no deploy**, contra os dados reais de produção: sem contagem antes, sem conferência depois,
sem janela escolhida por ninguém.

E aqui é ambiente de desenvolvimento e teste — o banco é uma cópia de produção com dados de teste por
cima. O que é seguro rodar aqui não é, por isso, seguro rodar lá.

### Onde o preenchimento vai morar

`backend/scripts/dados/`, fora da cadeia de migrations. Cada script:

- é **idempotente** (filtra por `IS NULL` ou equivalente);
- tem modo `--conferir`, que **conta sem escrever** — é como se mede o tamanho do serviço em produção
  antes de decidir rodá-lo;
- imprime o antes e o depois;
- está listado em `MIGRACAO-PARA-PRODUCAO.md`, com o que exige.

Ver `backend/scripts/dados/LEIA-ANTES-DE-RODAR.md`.

### Consequência que precisa estar clara

Depois do deploy, a coluna nova existe e pode permanecer **vazia** nos registros antigos. O dado
passa a ser gravado nas operações futuras confirmadas pela interface; o deploy não executa
backfill.

### Aplicado retroativamente em 24/08

Três migrations da faixa V4 gravavam dados e foram limpas. As colunas continuam sendo criadas por
elas; o `UPDATE` saiu:

| Migration | O que gravava | Regra atual |
|---|---|---|
| `202608180050` | `contrato_parcelas.valor_previsto` | registros antigos permanecem nulos |
| `202608180052` | `contratos.favorecido_id` | registros antigos permanecem nulos |
| `202608210050` | `contrato_aditivos.tipo` | registros antigos permanecem nulos |

> **As migrations do `dev-v2` (faixa abaixo de 0050) NÃO foram tocadas.** Muitas gravam dados, e são
> a base do sistema em produção — já rodaram lá. Mexer nelas agora é que seria arriscado. A regra
> vale para o que o V4 cria daqui em diante.

---

## Regra 6 — FK com nome explícito em tabela de nome longo

O identificador do MySQL tem limite de **64 caracteres**, e `references` dentro de `addColumn` gera
`<tabela>_<coluna>_foreign_idx`. Em 20/08 isso estourou (65 caracteres) e **derrubou o boot do
backend** — `server.js` roda as migrations antes de abrir a porta, então a aplicação inteira ficou
fora do ar.

```js
await queryInterface.addColumn(tabela, 'coluna', { type: DataTypes.INTEGER, allowNull: true });
await queryInterface.addConstraint(tabela, {
  fields: ['coluna'], type: 'foreign key', name: 'nome_curto_fk',
  references: { table: 'destino', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL'
});
```

---

## Renumeração aplicada em 20/08

As 17 migrations criadas no V4 foram movidas para a faixa `0050+`. O `schema_migrations` local foi
atualizado **junto**, com o nome novo — assim nada reexecuta e o registro não fica com linha órfã
apontando para um arquivo que não existe mais.

| Antes | Depois |
|---|---|
| `202608160001_obra_tipo_apropriacao_padrao.js` | `202608160050_...` |
| `202608160002_contrato_fluxo_novo.js` | `202608160051_...` |
| `202608160003_contratos_codigo_obra_unico.js` | `202608160052_...` |
| `202608160004_contrato_parcelas.js` | `202608160053_...` |
| `202608170001_contrato_categoria_financeira.js` | `202608170050_...` |
| `202608170002_medicao_parcelas.js` | `202608170051_...` |
| `202608180001_contrato_parcelas_valor_previsto.js` | `202608180050_...` |
| `202608180002_medicao_parcelas_devolucao.js` | `202608180051_...` |
| `202608180003_contrato_favorecido.js` | `202608180052_...` |
| `202608180004_contrato_justificativa.js` | `202608180053_...` |
| `202608180005_contrato_aditivos.js` | `202608180054_...` |
| `202608190001_contrato_solicitacao.js` | `202608190050_...` |
| `202608190002_contrato_medicoes.js` | `202608190051_...` |
| `202608190003_anexo_historico_medicao.js` | `202608190052_...` |
| `202608200001_contrato_anexo_tipo.js` | `202608200050_...` |
| `202608200002_catalogacao_itens_manuais.js` | `202608200051_...` |
| `202608200003_contrato_link_assinatura.js` | `202608200052_...` |

> `202608200051_catalogacao_itens_manuais.js` é do **módulo de Compras**, do outro agente. Foi
> renumerada junto porque a convenção só funciona se valer para todas — e porque ela também nunca
> rodou fora daqui. Nada do conteúdo mudou.

Com isso, `202608160001` volta a estar livre para a migration do DDA que vem do `dev-v2`, com o nome
original dela.

## Regra 6 — dois agentes no mesmo dia: quem chegou depois renumera

**Acrescentada em 26/08/2026, depois de acontecer.**

Dois trabalhos correram em paralelo no repositório e criaram, sem saber um do outro:

```
202608260052_rh_importacao_origem.js      (módulo DP)
202608260052_solicitacao_chave_pix.js     (fluxo de solicitação)
```

A faixa `0050+` da Regra 3 resolve a colisão entre **`dev-v2` e V4**. Não resolve a colisão entre
**dois trabalhos dentro do V4** — que é o caso quando mais de um agente edita o mesmo repositório.

### Por que não quebrou

`schema_migrations` tem o **nome completo** como chave, não o número. As duas aplicaram, na ordem
alfabética do sufixo (`r` antes de `s`) — por acaso, não por decisão.

### Por que ainda assim precisa ser arrumado

Duas migrations com o mesmo número **não têm ordem definida por quem as escreveu**. Enquanto forem
independentes, tanto faz. No dia em que uma precisar rodar antes da outra, a ordem vai depender da
primeira letra do nome — e ninguém vai procurar ali.

Arrumar **antes do deploy** é grátis: em produção nenhuma das duas rodou ainda.

### A regra

1. **Quem renumera é quem chegou depois** — a migration com `executed_at` mais recente no banco
   local, ou, se nenhuma rodou, a criada depois;
2. **nunca renumere a migration de outro trabalho em andamento.** Ela pode estar referenciada em
   código que você não está vendo;
3. depois de renomear o arquivo, **acerte o registro local**:
   ```sql
   UPDATE schema_migrations SET name = '<novo>' WHERE name = '<antigo>';
   ```
   Alternativa: apagar a linha e deixar o runner reaplicar — funciona porque a Regra 4 garante
   idempotência, mas deixa a antiga como linha órfã. O `UPDATE` mantém um registro só e verdadeiro;
4. **procure referências ao número no código e nos documentos.** Comentário que aponta para uma
   migration que mudou de nome vira pista falsa.

> Aplicado em 26/08: `202608260052_rh_importacao_origem.js` virou `202608260054`, o registro local
> foi acertado e o comentário em `RhImportacao.js` foi atualizado. A migration do outro trabalho não
> foi tocada.
