# Fronteiras Core x Experience

## Principio

O FLUXY CORE e fonte da verdade oficial.

O FLUXY EXPERIENCE e camada comercial, relacional e visual.

## Pertence ao Core

- empresas do grupo oficiais;
- empreendimentos oficiais;
- unidades oficiais;
- status oficial da unidade;
- clientes oficiais;
- compradores oficiais;
- contratos oficiais;
- parcelas oficiais;
- boletos oficiais;
- pagamentos e baixas;
- documentos oficiais;
- auditoria;
- permissoes;
- integracoes bancarias;
- regras de negocio criticas;
- trilhas de LGPD;
- logs de acesso a dados sensiveis.

## Pertence ao Experience

- site institucional;
- landing pages;
- campanhas;
- leads;
- funil comercial;
- atividades comerciais;
- agenda de corretores;
- pre-reserva comercial;
- propostas comerciais nao oficiais;
- simulador;
- mapa visual;
- analytics de marketing;
- portal do cliente como visualizacao;
- experiencia 3D/VR.

## Sincroniza Core -> Experience

- empreendimentos publicaveis;
- unidades publicaveis;
- status comercial permitido para vitrine;
- imagens e metadados publicos;
- andamento resumido de obra;
- informacoes resumidas para portal do cliente;
- documentos por URL temporaria quando autorizados;
- eventos oficiais publicados pelo Core.

## Sincroniza Experience -> Core

Apenas eventos ou solicitacoes controladas:

- lead convertido;
- proposta enviada para analise;
- pre-reserva solicitada;
- chamado do cliente;
- solicitacao de segunda via;
- evento de analytics relevante, quando aprovado.

## Nunca sincronizar para Experience sem regra explicita

- senha;
- dados bancarios completos;
- documentos internos administrativos;
- dados financeiros completos;
- dados pessoais sem finalidade definida;
- auditoria interna completa;
- logs tecnicos sensiveis;
- contrato assinado integral sem autorizacao;
- informacao de terceiros nao vinculados ao cliente autenticado.

## Regra de status

O Experience pode exibir status comercial.

O Experience nao pode alterar status oficial final de unidade. Qualquer alteracao final deve ocorrer no Core, com auditoria.

## Regra financeira

O Experience pode exibir visao financeira resumida para cliente autenticado.

O Experience nao pode recalcular saldo oficial, gerar boleto oficial, baixar parcela ou alterar vencimento.

## Regra documental

Documentos oficiais devem ser entregues por URL temporaria gerada pelo Core.

O Experience nao deve armazenar copia permanente de documento sensivel do Core.

