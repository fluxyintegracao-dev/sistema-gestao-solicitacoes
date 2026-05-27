# ADR - IA documental SST com provider desacoplado

## Decisao

A IA documental do SST usa providers desacoplados e configuraveis.

Providers suportados inicialmente:

- OpenAI;
- Anthropic/Claude;
- Google Gemini;
- HTTP generico/webhook para gateways internos ou providers futuros.

## Motivos

- Evitar dependencia direta de um fornecedor.
- Permitir trocar OpenAI, Anthropic, Gemini, Textract, Azure OCR ou outro provider.
- Permitir encapsular novos motores por HTTP sem alterar o dominio SST.
- Manter o backend como fonte da verdade: provider e credenciais sao resolvidos apenas por `.env`, sem escolha de provider pelo frontend.
- Manter rastreabilidade e aprovacao humana para dados sensiveis.
- Impedir atualizacao automatica de dados criticos sem revisao.

## Consequencias

- O pipeline retorna bloqueio controlado quando a flag, chave ou texto extraido nao existem.
- Divergencias geram pendencias operacionais.
- Sugestoes precisam de aprovacao ou rejeicao humana.
