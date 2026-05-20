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
2. Deducoes da receita.
3. Receita liquida.
4. Custos diretos.
5. Lucro bruto.
6. Despesas operacionais.
7. Resultado operacional.
8. Resultado financeiro.
9. Resultado antes de impostos.
10. Impostos sobre resultado, quando aplicavel.
11. Lucro/prejuizo liquido gerencial.
12. Margem liquida.
13. EBITDA gerencial, se a classificacao permitir.

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

### Fase 4 - DRE Financeira

- Criar DRE por empresa.
- Criar DRE consolidada da Holding.
- Criar DRE por obra/centro de custo.
- Criar comparativo mensal e acumulado.
- Criar graficos de margem e resultado.

### Fase 5 - Relatorios prioritarios

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

### Fase 6 - Painel executivo

- Consolidar indicadores dos modulos.
- Criar visoes por perfil executivo.
- Exibir alertas e riscos.

### Fase 7 - Preparacao para IA

- Criar arquitetura de IA.
- Criar logs e permissoes.
- Definir recursos iniciais.
- Nao ativar automacoes ate validacao humana.

## Decisoes Pendentes

- Definir se a DRE sera apenas gerencial ou tambem reconciliavel com a contabilidade oficial.
- Definir plano de contas/categorias DRE da Holding.
- Definir regra de competencia por tipo de titulo.
- Definir tratamento de intercompany.
- Definir se obras e centros de custo terao empresa obrigatoria imediatamente ou por fase de saneamento.
- Definir se o sistema tera Balanco Gerencial e Patrimonio Liquido em fase futura.

