# Mapa do Sistema Fluxy — páginas e módulos reais

Levantado do código em `frontend/src` para servir de referência ao detalhar as alterações:
ao explicar uma mudança, dá para apontar a tela pelo nome que ela tem no sistema.

**Números:** 194 rotas declaradas · 120 páginas na raiz + 65 dentro de módulos = **185 arquivos de página**

---

## Módulos com estrutura própria (`frontend/src/modules/`)

| Módulo | Páginas | Habilitado hoje |
|---|---|---|
| `solicitacao-compra` | 19 | Sim |
| `crm` | 15 | **Não** |
| `sst` | 12 | **Não** |
| `fiscal` | 9 | **Não** |
| `provisionamento-financeiro` | 7 | **Não** |
| `governanca` | 2 | Sim |
| `custosRecebiveis` | 1 | **Não** |

> Os módulos desligados continuam com as rotas no menu — o bloqueio é só no acesso.
> Achado A4 do escopo consolidado.

---

## Rotas por área

### Solicitações — 14 rotas + criação

```
/                             Dashboard
nova-solicitacao              Criação (tela central do escopo)
nova-solicitacao-campos       Configuração de campos por tipo
nova-solicitacao-automacao-destino
solicitacoes                  Lista
solicitacoes/:id              Detalhe
solicitacoes-arquivadas
solicitacoes/relatorios       + /operacional
solicitacoes-sla-setor
aprovacao-diretoria
prioridades-diretoria
```

### Compras — 13 rotas + 19 páginas de módulo

```
solicitacoes-compra           Lista, /nova, /:id, /revisar, /finalizada/:id
solicitacoes-compra/:id/cotacao
solicitacoes-compra-direta/nova, /revisar
pedidos-compra                Lista e /:id
cotacoes                      + /cotacao/:token (acesso externo do fornecedor)
compras/delegacao
compras/relatorios            11 relatórios: ciclo, evolução, fornecedores,
                              preços-insumos, economia-cotações, compras-diretas,
                              categorias-insumos, demanda-pedidos, auditoria,
                              pendências-cotações, compras-fornecedor
```

### Financeiro — 29 rotas (a maior área)

```
financeiro/contas-a-pagar          financeiro/contas-a-receber
financeiro/baixas                  financeiro/baixas-compostas
financeiro/conciliacao             financeiro/caixas
financeiro/bancos                  financeiro/cheques-terceiros
financeiro/boletos                 financeiro/cadastros
financeiro/faturas-cartao          + detalhe
financeiro/dre                     + diagnóstico
financeiro/endividamento           financeiro/executivo-grupo
comprovantes/pendentes             comprovantes/upload
```

### Contratos

```
gestao-contratos              Cadastro
contratos/relatorios          + /operacional
```

> Apenas 2 rotas. Confirma o diagnóstico do escopo: o módulo de contratos previsto
> é praticamente construção nova.

### Obras e cadastros

```
gestao-apropriacoes    gestao-insumos      gestao-categorias
gestao-fornecedores    gestao-unidades     areas-obra
parceiros              parceiros-categorias
empresas-grupo         custos-recebiveis
```

### RH / DP — 9 rotas

```
rh/colaboradores      rh/apuracoes        rh/fechamentos
rh/importacoes        rh/documentos       rh/relatorios
cargos                usuarios-permissoes-rh-dp
```

### Comercial — 8 rotas

```
comercial/empreendimentos     comercial/unidades
comercial/mapa-unidades       comercial/tabelas-preco
comercial/contratos           comercial/modelos-contrato
comercial/relatorios          + /operacional
```

### Comunicação e conteúdo

```
comunicacao-interna       conversas/:id
arquivos-modelos          arquivos-modelos-config
treinamento
```

### Configuração e permissões — ~30 rotas

```
configuracoes                        configuracoes-modulos
configuracoes-visibilidade-ui        cores-sistema
configuracoes-notificacoes-sistema   configuracoes-suporte
configuracoes-cotacao                configuracoes-status-pedidos-compra
configuracoes-provisionamento-fluxo  configuracoes-comercial-categorias

tipos-solicitacao          tipos-solicitacao-por-setor
tipos-sub-contrato         tipos-compartilhados-setor
status-setor               etapas-setor
automacao-status-setor     comportamento-recebimento-setor
areas-por-setor-origem     permissoes-areas, -padroes
permissoes-setor           setores-visiveis-usuario
setores-acesso-todas-obras setores-criacao-todas-obras
usuarios                   usuarios/:id, /editar, /novo
usuarios-acesso-financeiro usuarios-envio-qualquer-setor
usuarios-acesso-prioridade-diretoria
timeout-inatividade        governanca, /auditoria-operacional
```

> `cores-sistema` e `configuracoes-visibilidade-ui` são as telas que a reforma visual
> mais afeta. Ligadas ao achado A1: `TEMA_SISTEMA` tem 10 linhas duplicadas no banco.

### Autenticação

```
/login    /recuperar-senha    /definir-senha    perfil
```

---

## Telas mais citadas no escopo

Pelo cruzamento com o `ESCOPO-CONSOLIDADO.md`, concentram a maior parte das mudanças:

| Tela | Por quê |
|---|---|
| `nova-solicitacao` | Divisão em dados/pagamento, favorecido múltiplo, balões de orientação, saldo de contrato, tipos por obra e setor |
| `solicitacoes/:id` | Card expansível de itens, anexos por título, botão NEC. REEMBOLSO, dados de contrato de venda |
| `gestao-contratos` | Novo fluxo, saldo, aditivos, status, rescisão |
| `financeiro/contas-a-pagar` | Título manual, favorecido, anexo por título |
| `financeiro/baixas` | Informações do cheque |
| `nova-solicitacao-campos` | Configuração de campos por tipo — evita código em várias mudanças |
| `rh/colaboradores` | Botões de ação, modal de solicitações, movimentações |
| `comercial/contratos` | Fluxo D4Sign, geração de títulos |
| `gestao-insumos` | Cadastro de item novo, média de compras |
| `cores-sistema` | Reforma visual |
