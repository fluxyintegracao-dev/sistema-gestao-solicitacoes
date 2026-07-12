# Modulo CRM

## Papel

CRM organiza leads, origem, responsavel, funil, atividades, oportunidades e acompanhamento. O modulo nao oficializa contrato de venda, unidade, titulo ou recebimento.

## Regras

- lead deve ter identificacao minima e origem rastreavel;
- duplicidade por telefone, email ou documento deve ser sinalizada;
- atribuicao respeita equipe e permissao;
- mudanca de etapa registra usuario, data e etapa anterior;
- atividades possuem responsavel, prazo e conclusao;
- automacoes so executam quando habilitadas e devem ser idempotentes;
- conversao cria ou vincula Parceiro sem duplicar cadastro;
- conversao para venda chama o modulo Comercial por contrato explicito;
- exclusao de lead com historico e logica.

## Integracoes

Parceiros e a fonte de clientes convertidos. Comercial e a fonte de empreendimentos, unidades e contratos oficiais. Comunicacao pode registrar contatos quando houver consentimento e regra. Governanca recebe indicadores agregados, nao avaliacao individual opaca.

## Permissoes

Visualizacao, distribuicao, movimentacao, configuracao e relatorios sao capacidades distintas. O backend filtra equipe/responsavel; o frontend nao pode ampliar o universo por filtros.

## Mudanca segura

Validar deduplicacao, funil, atribuicao, atividades, automacoes, conversao, Comercial desabilitado, permissao e relatorios. Os arquivos `CRM_FASE*_ENTREGUE.md` sao historicos.
