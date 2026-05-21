# Plano de Relatorios, DRE e IA

## Objetivo

Organizar as paginas de relatorios por modulo e criar uma base gerencial confiavel para tomada de decisao da Holding, empresas do grupo, diretorias, obras, centros de custo e liderancas setoriais.

Este plano tambem prepara o sistema para uma futura camada de IA aplicada a relatorios e rotinas operacionais. A IA nao sera executada nesta fase; o objetivo agora e deixar a arquitetura preparada.

## Principios

- Cada modulo deve ter uma pagina unica de Relatorios.
- Cada pagina de Relatorios deve funcionar como hub, com cards que levam aos relatorios especificos.
- Relatorios devem ter visao sintetica, analitica e grafica sempre que fizer sentido.
- Relatorios devem respeitar permissoes e escopos ja existentes.
- Dados executivos precisam ser rastreaveis ate o lancamento/documento origem.
- DRE deve ser gerencial, por competencia, separada da visao de caixa.
- A Holding deve enxergar resultado consolidado e resultado isolado por empresa.
- Empresas, obras, centros de custo, titulos, compras, fiscal e provisionamentos precisam compartilhar dimensoes comuns.

## Implementacao Inicial Entregue

Base multiempresa e DRE gerencial:

- Cadastro de Empresas do Grupo passou a distinguir Holding e Empresa operacional.
- Empresa operacional pode ser vinculada a uma Holding controladora.
- Obras e Centros de Custo passam a ter vinculo com Empresa do Grupo.
- Titulos financeiros passam a ter competencia, empresa do grupo, contraparte intercompany e flag de consideracao na DRE.
- Categorias financeiras passam a ter classificacao gerencial de DRE.
- Financeiro > Relatorios ganhou acesso a DRE Gerencial.
- A DRE permite filtrar por periodo, Holding, empresa, obra/centro de custo e excluir intercompany.
- O resultado consolidado da Holding e o resultado isolado por empresa ficam disponiveis na mesma resposta gerencial.
- Integracao SIENGE ganhou uma carga inicial financeira por CSV para importar credores/clientes e titulos em aberto em uma base limpa.
- Navegacao inicial dos hubs de relatorios foi criada por modulo.
- A aba Cotacoes foi incorporada dentro de Compras.
- A auditoria de compras passou a ser acessada por Compras > Relatorios, mantendo a rota antiga apenas como compatibilidade.
- Os hubs de Solicitacoes, Compras, Fiscal, CRM, Comercial, Provisionamento, RH/DP e Contratos ja agrupam relatorios existentes e visoes planejadas.
- Financeiro ganhou Diagnostico da DRE para apontar cadastros e titulos que impedem uma DRE confiavel.
- O filtro por obra da DRE foi ajustado para aplicar o escopo no titulo financeiro, preservando o include da obra apenas como dimensao.
- A classificacao inicial da DRE passou a ser derivada das categorias financeiras ja cadastradas pelo plano SIENGE; categorias redutoras invertem o sinal na DRE e categorias patrimoniais/financeiras que nao representam resultado ficam fora da DRE.
- A DRE passou a apresentar linhas por grupo e subgrupo gerencial da categoria financeira, evitando consolidar categorias diferentes em uma unica linha ampla demais.
- A DRE passou a ter demonstrativo estruturado com Receita Liquida, Lucro Bruto, EBITDA, EBIT, Resultado Financeiro, Resultado antes de IRPJ/CSLL e Lucro/Prejuizo Liquido.
- A DRE passou a ter comparativo mensal/acumulado (`/financeiro/relatorios/dre/comparativo`), calculado por competencia real e pelas mesmas regras da DRE gerencial.
- As categorias financeiras SIENGE foram reavaliadas para separar tributos sobre faturamento, encargos trabalhistas, tributos operacionais, resultado financeiro e IRPJ/CSLL.
- A visao por empresa da DRE passou a usar as mesmas metricas economicas do consolidado: Receita Liquida, EBITDA, Lucro/Prejuizo Liquido e Margem Liquida.
- A primeira camada operacional de Intercompany foi adicionada ao Financeiro, com origem, destino, tipo, motivo e regra explicita de eliminacao no consolidado.
- Financeiro > Relatorios ganhou Relatorio Intercompany para analisar fluxos entre empresas, tipos de intercompany, valores previstos, valores realizados e titulos analiticos.
- A DRE passou a combinar filtro de periodo e exclusao de intercompany sem sobrescrever uma regra pela outra.
- Financeiro > Relatorios ganhou Fluxo de Caixa Consolidado para analisar previsto x realizado por Holding, empresa e obra/centro de custo, eliminando intercompany quando solicitado.
- No Fluxo de Caixa Consolidado, o previsto usa a empresa do titulo e o realizado usa a empresa informada na baixa, sem deduzir empresa por fallback operacional.
- A baixa financeira passou a permitir empresa pagadora/recebedora diferente da empresa do titulo apenas quando o usuario marca a baixa como intercompany e informa o tipo, mantendo a relacao interna rastreavel.
- Transferencias financeiras e conciliacao bancaria passaram a classificar explicitamente transferencia interna e transferencia intercompany, exigindo tipo e motivo quando as contas pertencem a empresas diferentes.
- O Relatorio Intercompany passou a combinar titulos intercompany com transferencias financeiras intercompany, separando previsto, realizado por baixa e transferencias efetivas entre contas do grupo.
- As telas de titulo manual e geracao de conta pela solicitacao passaram a exibir uma previa de impacto gerencial antes de salvar, mostrando efeito na DRE, no fluxo de caixa previsto e no consolidado/intercompany.
- O Diagnostico da DRE passou a apontar tambem baixas sem empresa, baixas com empresa divergente sem intercompany completo, transferencias intercompany incompletas e transferencias internas inconsistentes.
- Categorias financeiras passaram a ter `classificacao_gerencial` explicita para separar operacional, endividamento, investimento, patrimonial, intercompany, transferencia interna, imposto, folha e outros.
- Financeiro > Relatorios ganhou Endividamento Gerencial, usando somente titulos a pagar em aberto cuja categoria esteja marcada como `ENDIVIDAMENTO`, sem inferir divida pelo nome do fornecedor, descricao ou texto da categoria.
- Grupo Consolidado passou a exibir Endividamento Aberto como indicador executivo derivado do relatorio de endividamento.
- Grupo Consolidado passou a consumir um endpoint executivo proprio (`/financeiro/relatorios/grupo-consolidado`), que centraliza DRE, fluxo consolidado, intercompany, endividamento e diagnostico de consistencia. A tela deixa de montar a leitura executiva apenas no frontend e passa a exibir riscos calculados no backend com base em dados reais.
- O cadastro operacional de categorias financeiras deixou de preencher grupo DRE automaticamente; categoria marcada para DRE agora exige grupo DRE explicito.
- Atalhos de tarifas bancarias passaram a aceitar somente categorias de saida classificadas para DRE e bloqueiam categorias de endividamento, investimento, patrimonio, intercompany ou transferencia interna.
- A carga inicial SIENGE deixou de usar emissao ou vencimento como fallback de competencia DRE; titulos considerados na DRE agora exigem competencia real e categoria financeira classificada.
- O cadastro de conta pagadora do pagamento em massa passou a exigir empresa pagadora igual a empresa da conta bancaria interna, evitando lote com caixa de empresa divergente.
- A tela de pagamentos em massa passou a buscar titulos elegiveis pela empresa da conta pagadora selecionada e a exibir a empresa do titulo na conferencia do lote.
- O lote de pagamento passou a ter validacao de integridade antes de submeter, aprovar ou enviar, reconferindo titulo, saldo, empresa, favorecido, conta pagadora, quantidade de itens e total.
- A confirmacao de baixa de pagamento em massa passou a exigir confirmacao bancaria registrada e a reaproveitar reconciliacao tecnica existente, evitando duplicidade na baixa/reconciliacao.
- As aprovacoes de lote de pagamento passaram a gravar hash de integridade do conteudo aprovado, e envio/reprocessamento conferem esse hash para impedir que um lote alterado siga com aprovacao antiga.
- O cancelamento de lote de pagamento pendente de aprovacao ou aprovado passou a exigir MFA step-up, mantendo rascunho/revisao cancelaveis apenas com justificativa.
- O retorno bancario mockado passou a exigir MFA step-up e justificativa, preservando rastreabilidade mesmo no ambiente de desenvolvimento.
- O webhook real do Banco do Brasil passou a exigir segredo compartilhado configurado no ambiente, recusar payload sem identificador do evento, registrar auditoria de seguranca e tratar notificacoes repetidas como idempotentes pelo identificador do evento do provedor.
- A auditoria de pagamentos passou a ter consulta backend para eventos tecnicos por status, tipo, lote, intencao, identificador do provedor e periodo.

Documentacao operacional complementar:

- `docs/IMPLANTACAO_FINANCEIRO_LIMPO_SIENGE.md`

## Ajuste de Navegacao

### Compras

Mover as paginas atualmente agrupadas em Cotacoes para dentro da aba Compras:

- Cotacoes.
- Nova Cotacao Avulsa.
- Fornecedores.
- Configuracoes de Cotacao, mantendo tambem atalho em Configuracoes se necessario.

Remover o grupo isolado "Cotacoes" do menu principal.

### Relatorios por modulo

Cada modulo deve ter uma entrada unica de Relatorios:

- Solicitacoes > Relatorios.
- Compras > Relatorios.
- Financeiro > Relatorios.
- Fiscal > Relatorios.
- CRM > Relatorios.
- Comercial > Relatorios.
- Provisionamento > Relatorios.
- RH/DP > Relatorios.
- Contratos > Relatorios.

O menu global deve manter apenas Painel/Dashboard executivo. Relatorios soltos devem ser movidos para os hubs dos seus respectivos modulos.

## Estrutura Padrao de uma Pagina de Relatorios

Cada hub de relatorios deve conter:

- Cards de acesso aos relatorios do modulo.
- Indicadores principais do modulo.
- Indicacao de relatorios em construcao, quando a rota ainda nao existir.
- Controle de permissao por card.
- Padrao visual unico para todos os modulos.

Cada relatorio especifico deve conter:

- Filtros no topo.
- Cards sinteticos.
- Graficos.
- Tabela analitica.
- Exportacao CSV/Excel.
- Futuramente exportacao PDF.
- Link para origem dos dados sempre que possivel.

Filtros padrao:

- Periodo.
- Empresa do grupo.
- Obra.
- Centro de custo.
- Setor.
- Usuario/responsavel.
- Status.
- Categoria.
- Fornecedor/cliente, quando aplicavel.

## Relatorios por Modulo

### Solicitacoes

Objetivo: medir fluxo operacional, gargalos, SLA e produtividade.

Relatorios:

- Sintetico geral de solicitacoes.
- Solicitacoes por status.
- Solicitacoes por setor atual.
- Solicitacoes por area responsavel.
- Solicitacoes por obra/centro de custo.
- Tempo medio por etapa.
- Solicitacoes paradas acima do SLA.
- Ranking de setores com maior volume.
- Ranking de usuarios responsaveis.
- Solicitacoes por tipo macro/subtipo.
- Funil: criada, assumida, enviada, aprovada, concluida.
- Relatorio analitico de solicitacoes.

Graficos:

- Evolucao mensal.
- Aging por status.
- Heatmap setor x status.
- Volume por obra/centro de custo.
- SLA por setor.

### Compras

Objetivo: controlar demanda, pedidos, fornecedores, cotacoes e eficiencia de compra.

Relatorios:

- Solicitacoes de compra por status.
- Pedidos de compra por status.
- Compras por fornecedor.
- Compras por obra/centro de custo.
- Compras por categoria/insumo.
- Economia obtida em cotacoes.
- Cotacoes sem minimo de fornecedores.
- Cotacoes vencidas ou sem resposta.
- Tempo medio entre solicitacao, cotacao, aprovacao e pedido.
- Auditoria de itens de pedido.
- Fornecedores mais acionados.
- Fornecedores com melhor preco medio.
- Fornecedores com menor taxa de resposta.

Graficos:

- Curva mensal de compras.
- Ranking de fornecedores.
- Compras por categoria.
- Economia por cotacao.
- Ciclo medio de compras.

### Financeiro

Objetivo: dar visao de caixa, obrigacoes, recebimentos, inadimplencia, resultado e geracao/destruicao de patrimonio.

Relatorios:

- Fluxo de caixa.
- Analitico financeiro.
- DRE gerencial.
- Contas a pagar em aberto.
- Contas a receber em aberto.
- Vencidos a pagar.
- Vencidos a receber.
- Baixas realizadas.
- Inadimplencia.
- Resultado por obra.
- Resultado por centro de custo.
- Resultado por empresa do grupo.
- Categorias financeiras.
- Conciliacao OFX.
- Boletos emitidos, pagos, vencidos e retornos.
- Remessas CNAB e homologacao Caixa.

Graficos:

- Pagar x receber por mes.
- Saldo projetado.
- Aging de vencidos.
- Resultado por obra.
- Resultado por centro de custo.
- Recebimento por forma de pagamento.
- Inadimplencia por cliente.
- Evolucao de lucro/prejuizo por empresa.

### Fiscal

Objetivo: controlar entrada fiscal, divergencias, XMLs, eventos, escrituração e riscos.

Relatorios:

- Documentos fiscais importados.
- Documentos por empresa fiscal.
- Documentos por fornecedor.
- Documentos vinculados e nao vinculados.
- Divergencias fiscais abertas.
- Divergencias por tipo.
- XMLs importados manualmente x SEFAZ.
- Logs de sincronizacao.
- Eventos fiscais.
- Exportacoes contabeis.
- Documentos sem centro de custo/obra/apropriacao.
- Documentos com divergencia entre XML, compras e financeiro.

Graficos:

- Documentos por mes.
- Divergencias por severidade.
- Documentos sem vinculo.
- Ranking de fornecedores com divergencia.
- Evolucao da regularidade fiscal.

### CRM

Objetivo: medir geracao, atendimento, conversao e qualidade comercial.

Relatorios:

- Funil de leads.
- Leads por origem.
- Leads por canal.
- Leads por responsavel.
- Conversao por etapa.
- Tempo medio de atendimento.
- SLA de atendimento.
- Distribuicao de leads.
- Carteira por corretor/responsavel.
- Tarefas vencidas.
- Tarefas concluidas.
- Contratos gerados a partir de leads.

Graficos:

- Funil de conversao.
- Leads por canal.
- SLA por responsavel.
- Curva de novos leads.
- Produtividade comercial.

### Comercial

Objetivo: acompanhar vendas, contratos, unidades, tabelas e carteira comercial.

Relatorios:

- Contratos de venda.
- Contratos por status.
- Vendas por empreendimento.
- Vendas por unidade.
- VGV vendido.
- VGV disponivel.
- Estoque de unidades.
- Tabela de preco ativa.
- Descontos concedidos.
- Comissoes.
- Contratos pendentes de documento.
- Contratos com pendencia financeira.

Graficos:

- VGV vendido por mes.
- Unidades vendidas x disponiveis.
- Ranking de empreendimentos.
- Contratos por status.
- Descontos medios.

### Provisionamento

Objetivo: prever desembolso, antecipar pressao de caixa e comparar previsao x realizado.

Relatorios:

- Provisionamentos por periodo.
- Provisionamentos por obra.
- Provisionamentos por centro de custo.
- Provisionamentos por categoria macro.
- Vencidos nao tratados.
- Proximos 7/15/30 dias.
- Previsao x titulo financeiro gerado.
- Previsao x realizado.
- Itens criticos.
- Concentracao por obra ou fornecedor.

Graficos:

- Curva semanal/mensal de previsao.
- Previsao por obra.
- Previsao por categoria.
- Aging de provisionamentos.
- Pressao de caixa futura.

### RH/DP

Objetivo: controlar colaboradores, documentos, obrigacoes, fechamentos e riscos trabalhistas.

Relatorios:

- Colaboradores ativos/inativos.
- Colaboradores por empresa.
- Colaboradores por obra/centro de custo.
- Documentos pendentes.
- Documentos vencidos.
- Obrigacoes por periodo.
- Apuracao mensal.
- Fechamentos.
- Custos de RH/DP por centro de custo.
- Alertas de vencimento.

Graficos:

- Headcount por mes.
- Documentos vencidos por tipo.
- Obrigacoes por status.
- Colaboradores por obra.
- Evolucao de custo de pessoal.

### Contratos

Objetivo: controlar contratos operacionais, vencimentos, valores e riscos.

Relatorios:

- Contratos ativos.
- Contratos por status.
- Contratos por fornecedor/cliente.
- Contratos por obra/centro de custo.
- Contratos proximos do vencimento.
- Contratos vencidos.
- Contratos sem anexo/documento.
- Valores contratados.
- Saldo contratual.
- Contratos vinculados a solicitacoes, compras e financeiro.

Graficos:

- Contratos por status.
- Vencimentos nos proximos meses.
- Valor contratado por fornecedor.
- Contratos por obra.
- Saldo contratual.

## DRE Gerencial da Holding

### Objetivo da DRE

A DRE deve responder se a operacao esta gerando patrimonio ou destruindo patrimonio. Para isso, ela deve apresentar resultado economico por competencia e nao apenas movimentacao de caixa.

Observacao importante: DRE mostra lucro ou prejuizo do periodo. Para concluir geracao de patrimonio com maior precisao, o ideal e complementar a DRE com evolucao de patrimonio liquido, endividamento, caixa e ativos/passivos relevantes. A primeira fase pode entregar uma DRE gerencial forte; fases futuras podem evoluir para Balanco Gerencial e Fluxo de Caixa Indireto.

### Visoes obrigatorias

- DRE consolidada da Holding.
- DRE isolada por empresa do grupo.
- DRE comparativa entre empresas.
- DRE por obra.
- DRE por centro de custo.
- DRE por periodo mensal.
- DRE acumulada no ano.
- DRE real x orcado, quando houver orcamento confiavel.

### Estrutura sugerida da DRE

1. Receita operacional bruta.
2. Deducoes da receita bruta.
3. Receita liquida.
4. Custos diretos e operacionais.
5. Lucro bruto.
6. Despesas operacionais.
7. Outras receitas e despesas operacionais.
8. EBITDA.
9. Depreciacao e amortizacao, quando houver categoria propria.
10. Resultado operacional (EBIT).
11. Resultado financeiro.
12. Resultado antes de IRPJ/CSLL.
13. IRPJ e CSLL.
14. Lucro/prejuizo liquido gerencial.
15. Margem EBITDA e margem liquida.

### Consolidacao da Holding

Para uma Holding com varias empresas abaixo, a DRE precisa separar:

- Resultado individual de cada empresa.
- Resultado consolidado da Holding.
- Transacoes entre empresas do grupo.
- Possiveis eliminacoes gerenciais de receitas/despesas intercompany.

Exemplo:

- Empresa A paga despesa para Empresa B do mesmo grupo.
- Na visao individual, isso pode aparecer como despesa em A e receita em B.
- Na visao consolidada, pode ser necessario eliminar essa operacao para nao inflar receita/despesa da Holding.

### Camadas analiticas do financeiro do grupo

O financeiro do FLUXY deve ser estruturado em quatro camadas analiticas. Essas camadas precisam conversar diretamente com a operacao: criacao de titulos na solicitacao, titulo manual, baixa, conciliacao bancaria, transferencias, registros financeiros, categorias, centros de custo, obras e empresas.

#### 1. Visao consolidada do grupo

Esta deve ser a tela principal da Diretoria. O foco nao e "Empresa A" ou "Empresa B" isoladamente, mas sim:

```txt
GRUPO CONSOLIDADO
```

Nesta visao, por padrao:

- Eliminar intercompany.
- Eliminar transferencias internas.
- Eliminar aportes entre empresas.
- Eliminar movimentacoes espelho.
- Manter apenas receitas e despesas que representam geracao ou consumo real de riqueza fora do grupo.

Objetivo:

- Medir a saude economica e financeira real do grupo.
- Evitar que circulacao interna de caixa pareca receita nova.
- Evitar que uma empresa operacional pareca deficitária apenas porque concentra folha, impostos ou pagamentos administrativos.

O que deve aparecer:

- Resultado operacional consolidado.
- Receita real externa.
- Custo de obras.
- Despesas administrativas.
- Despesas financeiras.
- EBITDA.
- Lucro/prejuizo liquido.
- Geracao operacional de caixa.
- Necessidade futura de caixa.

Indicadores principais:

- Caixa consolidado.
- Geracao operacional de caixa.
- Burn rate administrativo.
- Resultado por obra.
- Resultado por incorporacao.
- Inadimplencia.
- Endividamento.
- Compromissos futuros.
- Necessidade futura de caixa.

#### 2. Visao por empresa

A visao por empresa continua sendo necessaria, mas nao deve ser apresentada como ranking simples de lucro/prejuizo.

Ela deve mostrar:

| Indicador | Explicacao |
| --- | --- |
| Resultado operacional proprio | Resultado sem intercompany. |
| Intercompany liquido | Quanto a empresa recebeu ou enviou para empresas do grupo. |
| Resultado final | Resultado apos transferencias internas. |
| Dependencia do grupo | Percentual do caixa vindo de outras empresas do grupo. |
| Consumo operacional | Quanto a empresa consome para operar. |
| Geracao operacional | Quanto a empresa gera com receitas externas. |

Essa separacao e essencial porque algumas empresas podem ter folha, impostos, despesas administrativas ou funcoes operacionais sem receita recorrente externa. Isso nao significa necessariamente problema; pode significar que a empresa existe para uma funcao especifica dentro do grupo.

Exemplo:

```txt
Empresa RH/Folha
Receita externa: R$ 0
Despesa: R$ 400 mil
Lucro isolado: negativo
Interpretacao correta: centro operacional de folha, nao empresa comercial deficitária.
```

#### Tipo gerencial da empresa

Adicionar no cadastro de Empresas do Grupo um `tipo_gerencial`, separado do tipo societario simples.

Tipos recomendados:

- Holding.
- Tesouraria.
- SPE.
- Administrativa.
- Operacional.
- Patrimonial.
- Comercial.
- RH/Folha.
- Investimentos.

Esse campo muda a interpretacao do resultado. Uma empresa "RH/Folha" pode ter resultado individual negativo e ainda assim estar correta; uma empresa "Operacional" ou "Comercial" precisa ser analisada por capacidade de gerar receita externa; uma empresa "Tesouraria" precisa ser analisada por concentracao, disponibilidade, transferencias e risco de caixa.

#### 3. Relatorio intercompany

Esse relatorio deve se tornar uma das principais visoes de controle do grupo.

Ele deve responder:

- Quem financia quem.
- Qual empresa depende de outra.
- Onde existe drenagem de caixa.
- Onde existe concentracao financeira.
- Quais empresas sao superavitarias.
- Quais empresas consomem caixa de forma recorrente.
- Quais movimentacoes internas sao excessivas.
- Onde existe risco de caixa oculto.

Estrutura recomendada:

| Origem | Destino | Tipo | Motivo | Valor | Competencia |
| --- | --- | --- | --- | --- | --- |
| Empresa A | Empresa B | Emprestimo | Folha | 100k | Mai/26 |

Tipos de intercompany:

- Aporte.
- Emprestimo.
- Reembolso.
- Rateio.
- Cobertura de caixa.
- Folha.
- Administrativo.
- Imposto.
- Transferencia operacional.

O relatorio deve permitir filtrar por empresa origem, empresa destino, tipo, motivo, periodo, competencia, conta bancaria, titulo financeiro e movimento financeiro.

#### 4. Fluxo de caixa futuro consolidado

Esta e uma das visoes com maior potencial estrategico do FLUXY.

O problema central de grupos de construcao muitas vezes nao e apenas lucro contábil ou gerencial. E:

- Descasamento de caixa.
- Concentracao de pagamento.
- Obra consumindo caixa antes da receita.
- Atraso de cliente.
- Financiamento.
- Intercompany escondendo problema real.
- Receita em uma empresa e pagamentos em outra.

O fluxo projetado consolidado deve considerar:

- Contas a pagar.
- Contas a receber.
- Provisoes.
- Pedidos.
- Contratos.
- Medicoes.
- Folha.
- Impostos.
- Intercompany previsto.
- Inadimplencia projetada.

Niveis obrigatorios:

1. Caixa individual por empresa.
2. Caixa consolidado do grupo.
3. Caixa consolidado eliminando intercompany.

Essa visao deve mostrar se o grupo gera caixa, se precisa de caixa futuro, onde ocorre o pico de necessidade e qual empresa operacional ou tesouraria precisara suportar as demais.

### Revisao da estrutura financeira atual

Estrutura atual identificada:

- `empresas_grupo` ja diferencia Holding e empresa operacional por `tipo_empresa`, possui `holding_id` e passa a registrar classificacao gerencial para consolidacao executiva.
- `contas_bancarias` ja possui `empresa_id`.
- `titulos_financeiros` ja possui `empresa_id`, `empresa_contraparte_id`, `intercompany`, `competencia_data`, `considera_dre`, `obra_id`, `apropriacao_id` e `categoria_financeira_id`.
- `movimentos_financeiros` ja possui `empresa_id`, `conta_bancaria_id`, `titulo_financeiro_id`, valores de baixa e data do movimento.
- Categorias financeiras ja possuem classificacao DRE (`dre_grupo`, `dre_subgrupo`, `dre_ordem`, `considera_dre`).
- A baixa de titulo ja exige empresa pagadora explicita.
- A DRE ja usa competencia e categoria financeira como base gerencial.

Conclusao:

- A base atual esta no caminho correto e nao precisa ser destruida.
- O proximo passo nao e trocar a estrutura, mas adicionar dimensoes gerenciais e regras de consolidacao.
- O sistema deve evitar deducoes silenciosas ou "fallbacks" operacionais para informacoes essenciais. Empresa, categoria, centro de custo, competencia e intercompany precisam ser informados ou herdados por regra clara e visivel.

### Reorganizacao recomendada sem quebrar a operacao

#### Empresas do Grupo

Campos implementados como primeira etapa da consolidacao gerencial:

- `tipo_gerencial`.
- `empresa_caixa` boolean.
- `empresa_operacional` boolean.
- `consolidar_no_grupo` boolean.
- `elimina_intercompany` boolean.

Uso:

- `tipo_empresa` continua representando classificacao basica como Holding ou Operacional.
- `tipo_gerencial` passa a orientar dashboards, interpretacao executiva e alertas.
- `empresa_caixa` identifica empresa que concentra entradas/saidas de capital.
- `consolidar_no_grupo` define se entra nos relatorios consolidados.
- `elimina_intercompany` define se suas operacoes internas devem ser eliminadas no consolidado.

#### Titulos financeiros

Manter a estrutura atual, mas evoluir a intercompany:

- `intercompany_group_id` para agrupar movimentacoes espelho.
- `empresa_origem_id`.
- `empresa_destino_id`.
- `tipo_intercompany`.
- `motivo_intercompany`.
- `elimina_consolidado`.
- `transferencia_interna`.

Regras operacionais:

- Titulo comum exige empresa, obra/centro, categoria e competencia.
- Titulo intercompany exige empresa origem, empresa destino, tipo e motivo.
- Titulo intercompany nao deve afetar DRE consolidada principal quando `elimina_consolidado = true`.
- Titulo intercompany pode afetar visao individual por empresa e relatorio intercompany.
- Quando houver lancamento espelho, o sistema deve vincular ambos pelo mesmo `intercompany_group_id`.

#### Movimentos financeiros e baixas

Adicionar ou padronizar:

- `intercompany_group_id`.
- `empresa_origem_id`.
- `empresa_destino_id`.
- `tipo_intercompany`.
- `elimina_consolidado`.
- `transferencia_interna`.

Regras operacionais:

- Toda baixa deve informar empresa pagadora/recebedora explicitamente.
- Conta bancaria precisa pertencer a empresa informada.
- Em transferencia entre contas da mesma empresa: classificar como transferencia interna de caixa, fora da DRE.
- Em transferencia entre empresas: classificar como intercompany, com origem, destino, tipo e motivo.
- A conciliacao bancaria deve sugerir classificacao intercompany quando identificar transferencia entre contas do grupo, mas a confirmacao deve ser humana.

#### Criacao de titulo na tela de detalhes da solicitacao

Ao criar titulo a partir da solicitacao:

- Herdar obra/centro de custo da solicitacao.
- Herdar empresa da obra/centro de custo.
- Exigir categoria financeira.
- Exigir competencia.
- Permitir marcar intercompany apenas quando fizer sentido operacional.
- Se intercompany for marcado, exigir contraparte, tipo e motivo.
- Exibir claramente se o titulo entrara ou nao na DRE consolidada.

#### Titulo manual

Ao criar titulo manual:

- Exigir empresa.
- Exigir obra/centro de custo.
- Exigir categoria financeira.
- Exigir competencia.
- Exigir classificacao intercompany quando houver contraparte do grupo.
- Mostrar uma pre-visualizacao simples: "Impacto na DRE", "Impacto no Caixa" e "Eliminado no Consolidado".

#### Conciliacao bancaria

Ao conciliar:

- Conta bancaria define empresa do movimento.
- Se a contrapartida for outra conta do grupo, sugerir transferencia interna ou intercompany.
- Se a conciliacao criar titulo automaticamente, aplicar as mesmas regras do titulo manual.
- Nao criar titulo sem empresa, categoria e competencia quando esse titulo for usado em DRE.

#### Categorias financeiras

Nao tentar resolver tudo apenas por plano de contas. Esse e o erro classico.

Separar:

- Plano de contas/categorias financeiras.
- Estrutura societaria.
- Classificacao gerencial da empresa.
- Engine de consolidacao.
- Engine intercompany.
- Engine analitica.

Categorias continuam definindo linha DRE, mas nao devem sozinhas decidir se uma operacao e intercompany, eliminavel, transferencia interna ou movimento patrimonial.

### Modelo de dados recomendado

O sistema ja possui `empresa_id` em titulos financeiros e usa `obra_id` em solicitacoes, compras, contratos, financeiro e provisionamento. Para a DRE ser real, recomenda-se padronizar as dimensoes:

#### Empresas do grupo

Fonte principal:

- `empresas_grupo`.

Usos:

- Titulos financeiros.
- Contas bancarias.
- Boletos.
- Fiscal companies.
- RH/DP.
- Futuramente obras/centros de custo.

#### Obras e centros de custo

Recomendacao:

- Adicionar vinculo obrigatorio ou fortemente recomendado entre `Obras` e `empresas_grupo`.
- Campo sugerido: `empresa_grupo_id` em `Obras`.
- Como a tabela `Obras` tambem representa centro de custo, esse vinculo servira para obras e centros administrativos.

Regra:

- Toda obra deve pertencer a uma empresa do grupo.
- Todo centro de custo deve pertencer a uma empresa do grupo.
- Solicitacoes, compras, fiscal e provisionamento podem herdar empresa a partir da obra/centro de custo.

#### Titulos financeiros

Recomendacao:

- Manter `empresa_id` em `titulos_financeiros`.
- Garantir que todo titulo tenha `empresa_id`.
- Quando o titulo nascer de solicitacao, compra, fiscal ou provisao, preencher `empresa_id` automaticamente a partir do centro de custo/obra.
- Quando o titulo for lancado manualmente, exigir empresa.

Campos adicionais recomendados para DRE:

- `competencia_data` ou `competencia_mes`.
- `dre_categoria_id` ou classificacao DRE via categoria financeira.
- `intercompany` boolean.
- `empresa_contraparte_id` para transacoes entre empresas do grupo.
- `considera_dre` boolean.
- `regime_reconhecimento`: competencia, caixa, provisionado, manual.

#### Categorias financeiras

Recomendacao:

Adicionar classificacao gerencial de DRE na categoria financeira:

- `dre_grupo`.
- `dre_subgrupo`.
- `dre_ordem`.
- `dre_natureza`: receita, deducao, custo, despesa, resultado_financeiro, imposto, ajuste.
- `considera_dre`.
- `sinal_dre`: positivo ou negativo.
- `ebitda_incluir`.

Isso evita montar DRE com texto livre ou regras soltas no codigo.

#### Apropriacoes

Apropriacoes continuam classificando o custo/orcamento dentro da obra.

Na DRE:

- Apropriacao pode detalhar custo direto da obra.
- Centro de custo pode detalhar despesas administrativas.
- Categoria financeira define a linha da DRE.

### Hierarquia recomendada para relatorios

```txt
Holding
  Empresa do grupo
    Obra ou Centro de Custo
      Apropriacao, quando for obra
      Categoria financeira
        Titulo financeiro / documento / compra / provisao
```

### Regras para confiabilidade da DRE

- Nao misturar caixa com competencia.
- Nao usar apenas data de pagamento para DRE.
- Todo titulo precisa ter empresa.
- Todo titulo precisa ter categoria financeira classificada para DRE.
- Todo centro de custo/obra deve pertencer a uma empresa.
- Transacoes entre empresas precisam ser identificadas.
- Baixas e conciliacoes ajudam o caixa, mas a DRE deve usar competencia.
- Documentos fiscais e compras devem ajudar na conferencia, mas a fonte gerencial inicial pode ser o titulo financeiro classificado.

## Painel Executivo

Criar um painel consolidado para Presidente, CEO e Diretoria Executiva.

Indicadores:

- Receita liquida.
- Lucro/prejuizo gerencial.
- Margem liquida.
- Resultado por empresa.
- Resultado por obra.
- Resultado por centro de custo.
- Caixa atual.
- Caixa projetado.
- Contas a receber vencidas.
- Contas a pagar vencidas.
- Compras em aberto.
- Fiscal com divergencias.
- Contratos vencendo.
- RH/DP com obrigacoes/documentos vencidos.

## Perfis de Decisao

### Presidente / CEO

- DRE consolidada.
- Resultado por empresa.
- Resultado por obra.
- Caixa projetado.
- Riscos financeiros, fiscais, comerciais e trabalhistas.
- Indicadores de patrimonio: lucro acumulado, margem, caixa, endividamento e evolucao patrimonial futura.

### Diretoria Executiva

- Consolidado por modulo.
- Gargalos operacionais.
- SLA por setor.
- Compras criticas.
- Contratos relevantes.
- Pendencias fiscais.

### Diretoria Administrativa

- Financeiro.
- DRE.
- Fiscal.
- RH/DP.
- Contratos.
- Compliance operacional.

### Diretorias de Obras

- Resultado por obra.
- Apropriacoes.
- Compras por obra.
- Provisionamentos.
- Fiscal vinculado a obra.
- Contratos por obra.

### Liderancas de Setores

- Fila do setor.
- SLA.
- Produtividade.
- Pendencias sob responsabilidade.
- Itens parados ou vencidos.

## Fundacao Tecnica dos Relatorios

### Componentes frontend

Criar componentes reutilizaveis:

- `ReportsHub`.
- `ReportCard`.
- `ReportFilters`.
- `KpiCard`.
- `ChartPanel`.
- `ReportTable`.
- `ExportActions`.

### Backend

Criar padrao de services de relatorio:

- Um controller por modulo ou por dominio.
- Services de agregacao isolados.
- Validadores de query por relatorio.
- Filtros padronizados.
- Permissoes por modulo.
- Cache leve para consultas pesadas.
- Auditoria de exportacao.

### Permissoes

Novas permissoes sugeridas:

- `solicitacoes.relatorios.visualizar`.
- `compras.relatorios.visualizar`.
- `financeiro.relatorios.visualizar`.
- `financeiro.relatorios.dre`.
- `fiscal.relatorios.visualizar`.
- `crm.relatorios.visualizar`.
- `comercial.relatorios.visualizar`.
- `provisoes.relatorios.visualizar`.
- `rh_dp.relatorios.visualizar`.
- `contratos.relatorios.visualizar`.

## Planejamento de IA

### IA em relatorios

Futuras capacidades:

- Resumo automatico do relatorio.
- Explicacao de variacoes.
- Deteccao de anomalias.
- Perguntas em linguagem natural.
- Sugestoes de acao.
- Alertas executivos.

Exemplos:

- "Quais empresas destruiram resultado este mes?"
- "Quais obras mais consumiram caixa?"
- "Quais fornecedores concentraram gastos?"
- "Quais centros de custo cresceram acima da media?"
- "Por que a margem da empresa caiu?"

### IA operacional

Futuras capacidades:

- Sugerir classificacao de solicitacao.
- Sugerir setor responsavel.
- Sugerir apropriacao.
- Sugerir categoria financeira/DRE.
- Ler XML fiscal e sugerir vinculo.
- Detectar divergencias entre XML, compra e financeiro.
- Resumir contratos.
- Priorizar pendencias.

### Fundacao de IA

Criar futuramente:

- Pasta backend `src/modules/ai`.
- Tabela de logs de prompts e respostas.
- Tabela de configuracao de recursos de IA.
- Permissoes especificas de IA.
- Registro da origem dos dados analisados.
- Mascara de dados sensiveis quando aplicavel.
- Modo analise antes de qualquer acao automatica.

### Cuidados

- IA nao deve substituir aprovacao humana.
- IA deve explicar origem dos dados.
- IA deve registrar logs para auditoria.
- IA nao deve expor dados sensiveis sem permissao.
- IA deve respeitar escopo de empresa, obra, centro de custo e setor.

## Ordem Recomendada de Execucao

### Fase 1 - Organizacao de menu

- Mover Cotacoes para Compras.
- Criar entrada Relatorios em cada modulo.
- Remover relatorios soltos do menu.

### Fase 2 - Hubs de relatorios

- Criar paginas hub de relatorios por modulo.
- Reaproveitar relatorios existentes.
- Cards podem apontar para rotas ja existentes ou marcar "em construcao".

### Fase 3 - Fundacao DRE

- Classificar categorias financeiras para DRE.
- Adicionar empresa em obras/centros de custo.
- Garantir empresa em titulos financeiros.
- Definir competencia dos titulos.
- Identificar transacoes intercompany.
- Usar Financeiro > Relatorios > Diagnostico DRE antes de fechar a virada operacional do financeiro.
- Revisar a classificacao gerada em Financeiro > Cadastros > Categorias financeiras, principalmente categorias especificas criadas manualmente depois da carga inicial.

### Fase 4 - DRE Financeira

- Criar DRE por empresa.
- Criar DRE consolidada da Holding.
- Criar DRE por obra/centro de custo.
- Criar comparativo mensal e acumulado.
- Criar graficos de margem e resultado.

### Fase 5 - Consolidacao gerencial e intercompany

- Adicionar tipo gerencial da empresa.
- Marcar empresas caixa, operacionais, administrativas, RH/Folha, SPE, patrimoniais e investimentos.
- Criar campos de intercompany em titulos e movimentos.
- Criar agrupamento de operacoes espelho por `intercompany_group_id`.
- Criar tipos e motivos de intercompany.
- Criar relatorio intercompany.
- Atualizar criacao de titulo por solicitacao para exigir dimensoes gerenciais completas.
- Atualizar titulo manual para mostrar impacto na DRE, caixa e consolidado.
- Atualizar baixa/conciliacao para tratar transferencias internas e intercompany explicitamente.
- Criar diagnostico de operacoes financeiras sem classificacao gerencial completa.

### Fase 6 - Fluxo de caixa futuro consolidado

- Criar caixa individual por empresa.
- Criar caixa consolidado do grupo.
- Criar caixa consolidado eliminando intercompany.
- Incluir contas a pagar, contas a receber, provisoes, pedidos, contratos, medicoes, folha, impostos, inadimplencia projetada e intercompany previsto.
- Criar alertas de necessidade futura de caixa.
- Criar indicadores de descasamento de caixa por obra, empresa e grupo.

### Fase 7 - Relatorios prioritarios

Prioridade sugerida:

1. Financeiro e DRE.
2. Compras.
3. Solicitacoes.
4. Fiscal.
5. Provisionamento.
6. CRM.
7. Comercial.
8. RH/DP.
9. Contratos.

### Fase 8 - Painel executivo

- Consolidar indicadores dos modulos.
- Criar visoes por perfil executivo.
- Exibir alertas e riscos.
- Criar tela principal do diretor com Grupo Consolidado, Caixa Consolidado, EBITDA, Lucro Liquido, Necessidade Futura de Caixa, Intercompany Liquido, Resultado por Obra e Endividamento.
  - Status inicial implementado no Financeiro: `Financeiro > Relatorios > Grupo Consolidado`.
  - A primeira versao cruza DRE gerencial, Fluxo Consolidado, Intercompany e Resultado de Obras sem duplicar regra de calculo.
  - A segunda versao centraliza a leitura executiva no backend, retornando resumo, fontes e riscos/acoes recomendadas para evitar interpretacao espalhada no frontend.
  - Endividamento consolidado iniciado com classificacao gerencial explicita nas categorias financeiras e relatorio proprio em `Financeiro > Relatorios > Endividamento`.
  - A regra atual e conservadora: so entra no endividamento o titulo a pagar em aberto vinculado a categoria marcada como `ENDIVIDAMENTO`.

### Fase 9 - Preparacao para IA

- Criar arquitetura de IA.
- Criar logs e permissoes.
- Definir recursos iniciais.
- Nao ativar automacoes ate validacao humana.

## Decisoes Pendentes

- Definir se a DRE sera apenas gerencial ou tambem reconciliavel com a contabilidade oficial.
- Definir plano de contas/categorias DRE da Holding.
- Definir regra de competencia por tipo de titulo.
- Definir tratamento de intercompany.
- Definir os tipos gerenciais oficiais das empresas do grupo.
- Definir quais empresas funcionam como tesouraria/concentradoras de caixa.
- Definir tipos e motivos oficiais de intercompany.
- Definir quando uma operacao intercompany deve gerar lancamento espelho automatico.
- Definir regras de eliminacao no consolidado por tipo de operacao.
- Definir se obras e centros de custo terao empresa obrigatoria imediatamente ou por fase de saneamento.
- Definir se o sistema tera Balanco Gerencial e Patrimonio Liquido em fase futura.
