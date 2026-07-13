# Propriedade dos Dados

Cada dado compartilhado possui um dominio proprietario. Consumidores podem referenciar ou projetar o dado, mas nao devem duplicar sua regra central.

| Dado | Proprietario | Consumidores principais |
|---|---|---|
| usuario, perfil e sessao | Autenticacao/Usuarios | todos os modulos |
| setor, tipo e status de solicitacao | Solicitacoes/Configuracoes | diretorias, compras, financeiro, relatorios |
| parceiro, cliente, fornecedor e credor | Parceiros | solicitacoes, compras, financeiro, contratos, comercial e fiscal |
| empresa do grupo | Configuracoes institucionais | obras, financeiro, RH/DP, comercial e relatorios |
| obra | Obras | solicitacoes, compras, financeiro, contratos, RH/DP e SST |
| apropriacao | Obras | solicitacoes, compras, financeiro e provisionamento |
| contrato operacional | Contratos | solicitacoes, obras e arquivos |
| solicitacao de compra e itens | Compras | cotacoes, pedidos, fiscal e relatorios |
| cotacao e resposta do fornecedor | Cotacoes | pedidos e relatorios de compras |
| escopo de itens enviado a cada fornecedor | Cotacoes | link publico, resposta, comparativo e encerramento |
| pedido de compra | Cotacoes e Pedidos | fiscal, financeiro, obras e relatorios |
| titulo financeiro | Financeiro | comercial, RH/DP, obras, conciliacao e relatorios |
| movimento/baixa | Financeiro | conciliacao, resultado de obras, DRE e governanca |
| conta bancaria | Financeiro | baixas, conciliacao, boletos e pagamentos |
| empreendimento, unidade e contrato de venda | Comercial | financeiro e CRM |
| colaborador e apuracao | RH/DP | financeiro e SST |
| PCMSO, PGR, exame, ASO, EPI, treinamento SST, LTCAT e avaliacao quantitativa | SST | documentos e relatorios autorizados |
| documento fiscal | Fiscal | compras, financeiro e contabilidade operacional |
| arquivo fisico | Servico de arquivos/S3 | todos os dominios autorizados |

## Regras

- IDs externos nao substituem a chave interna do proprietario.
- Snapshots sao permitidos para auditoria, mas nao podem virar fonte concorrente de verdade.
- Exclusao no proprietario deve considerar vinculos ativos nos consumidores.
- Alteracao de enum, status ou nulabilidade exige busca de todos os consumidores.
- Relatorios devem apontar para a origem, nao recalcular regras divergentes.
