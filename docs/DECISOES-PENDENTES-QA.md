# Decisões pendentes do cliente — rodada de 02/09 (Etapa A)

Lista exigida pela Parte 7 do processo: nada daqui foi feito por conta
própria; cada item aguarda o seu ok (Parte 5: remover/reestruturar exige
aprovação).

## 1. Migração das tabelas fora das 22 telas entregues

O inventário completo está em `docs/INVENTARIO-TABELAS.md`: **135 arquivos
com tabela**, dos quais 12 já no padrão (as 22 telas, incl. as 5 tabelas do
ObraGestao migradas nesta rodada) e **117 a migrar** (28 só sem o menu de
alinhamento; 81 com `<table>` crua; 8 mistos).

Você pediu "migre todas". O conflito: migrar as ~117 agora tocaria telas de
levas futuras SEM a verificação por tela no preview (a matriz cobre as 22) —
exatamente o processo que esta rodada veio corrigir. **Proposta**: cada leva
da Etapa B migra as suas tabelas e a matriz da leva prova; o inventário é o
backlog. **Decida**: (a) migração por leva com verificação (proposta), ou
(b) mutirão único agora, aceitando entrega sem matriz por tela.

## 2. Casos técnicos de tabela que não migram direto (12)

Justificativas no inventário; os principais:
- Matriz de cotação com colunas por fornecedor (GerenciarCotacaoSolicitacao)
- Tela pública de cotação do fornecedor (CotacaoFornecedorPublica — sem login)
- Preview de importação com colunas vindas do arquivo (RhDpImportacoes)
- Conciliação com tabelas espelhadas lado a lado (FinanceiroConciliacao)
- Árvore de DRE com sub-tabelas (FinanceiroDre)
- Heatmap em grid (SolicitacoesRelatorioOperacional)
- Tabela principal de Solicitações com redimensionamento próprio (TabelaSolicitacoes)
- 5 telas de edição inline pesada (CrPlanejamentoView, NovaSolicitacaoCompra,
  ComercialContratos, RhDpJornada, FinanceiroChequesTerceiros)

## 3. Código morto com tabela (5 arquivos)

`pages/Cargos.jsx`, `pages/TiposMacroContrato.jsx`,
`solicitacao-compra/pages/SolicitacaoCompraDetalhe.jsx` (substituída pela
View), `components/ObraSearchModal.jsx`, `components/SolicitacaoTable.jsx` —
sem rota/uso. Recomendo REMOVER em vez de migrar. Remover exige seu ok.

## 4. Pivô ObraTipoApropriacao

Único caso restante em `excecoes_tabela_crua`: colunas dinâmicas com painel
por célula. T2/T3 estão como N/A registrado na matriz. **Decida**: manter a
exceção, ou redesenhar o pivô para o componente padrão numa leva futura.

## 5. "Abrir solicitação" como ação no detalhe do título financeiro

É um botão de navegação para registro RELACIONADO na barra de ações. A R11
proíbe navegação em menu de ação, mas o rótulo é claro e o atalho é útil.
Mantive (com a distinção documentada na R11) — **confirme** se fica ou se
prefere que registros relacionados apareçam de outra forma.

## 6. Parceiros com painel acima da lista (não modal)

Decisão registrada em R9 (cadastro de uso frequente). O item R1 da DoD está
como N/A registrado para essa tela. **Confirme** que segue valendo.
