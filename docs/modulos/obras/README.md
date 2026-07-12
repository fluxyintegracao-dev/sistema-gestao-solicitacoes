# Modulo OBRAS

## Papel e propriedade

Obras e dono do cadastro da obra, classificacao, dimensoes financeiras da obra e apropriacoes. Apropriacao e uma estrutura de classificacao de custo compartilhada; nao pertence a Compras nem ao Financeiro.

## Regras

- obra deve estar vinculada a empresa e aos usuarios autorizados;
- classificacao publica/privada pode determinar diretoria de aprovacao;
- apropriacoes usadas por outros modulos nao podem ser removidas fisicamente;
- rateios precisam referenciar apropriacoes ativas e fechar 100% quando multiplos;
- orcamento nao pode ser calculado a partir de dados inferidos;
- custo realizado vem de movimentos financeiros ativos;
- previsto vem de titulos em aberto ou parciais;
- estornos financeiros devem refletir imediatamente no resultado da obra;
- pedidos representam compromisso operacional e nao substituem realizado financeiro.

## Consumidores

- Solicitacoes usa obra, classificacao e apropriacao principal;
- Compras usa apropriacao por item;
- Financeiro classifica titulos e movimentos;
- Provisionamento projeta desembolsos;
- Contratos vincula contexto operacional;
- RH/DP e SST usam lotacao/local de trabalho.

## Riscos de alteracao

Trocar IDs, regras de classificacao, margem, valor de referencia ou formula de orcamento afeta diretorias, rateios, relatorios, DRE e Resultado de Obras. Toda mudanca exige reconciliar valores antes/depois e testar registros sem apropriacao legados.

## Exclusao e auditoria

Obra ou apropriacao referenciada deve ser inativada. Ajustes de orcamento, margem, classificacao e importacoes de custo precisam registrar usuario, origem e valores anteriores.
