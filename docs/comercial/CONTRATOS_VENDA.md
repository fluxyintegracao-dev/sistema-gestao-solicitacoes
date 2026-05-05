# Contratos de venda comercial

## Fluxo oficial

1. Cadastre ou atualize o cliente, incluindo conjuge quando houver.
2. Cadastre o empreendimento com a obra vinculada.
3. Cadastre a unidade com metragem privativa, fracao ideal e situacao disponivel.
4. Cadastre os modelos do empreendimento:
   - Contrato padrao
   - Quadro Resumo
5. Crie o contrato de venda.
6. Gere o PDF completo em `Comercial > Contratos`.
7. Envie para D4Sign somente depois de conferir o PDF.

O PDF oficial e sempre gerado com o Quadro Resumo primeiro e o Contrato Padrao na sequencia.

## Campos automaticos do Quadro Resumo

- Comprador: dados do parceiro cliente.
- Conjuge: dados do parceiro vinculado ao cliente.
- Unidade: codigo, nome, torre, pavimento, metragem privativa e fracao ideal.
- Garagem: quantidade e posicao, quando informadas no contrato.
- Preco: valor total, entrada, desconto e indice de reajuste.
- Parcelas: agrupadas por elemento e tipo de reajuste, com `F` para fixa e `R` para reajustavel.
- Corretor: parceiro corretor vinculado ao contrato.
- Item XI: local e data de assinatura preenchidos pelo contrato.
- Item XII: variaveis de assinatura ficam disponiveis em `assinaturas.*`.

## Regras finais antes de producao

- Contrato assinado digitalmente nao deve ser gerado novamente.
- Contrato nao assinado pode gerar novo PDF completo.
- O sistema valida que o PDF final contem paginas do Quadro Resumo e do Contrato Padrao.
- A tela exibe somente PDF completo, Abrir PDF e Enviar D4Sign para evitar confusao com documentos parciais.

## Checklist por empreendimento

Para cada empreendimento, testar:

- Piemonte
- Areia Preta
- Pedra Menina
- Residencial Costa do Mar

Conferir no PDF:

- Quadro Resumo vem antes do Contrato Padrao.
- Papel/modelo corresponde ao empreendimento.
- Item III exibe unidade, area privativa, fracao ideal e vagas.
- Item VI agrupa corretamente as parcelas.
- Item XI exibe local e data corretos.
- Item XII possui dados de assinatura esperados.
