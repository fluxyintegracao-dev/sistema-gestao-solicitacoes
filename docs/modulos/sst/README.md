# Modulo SST

## Status da documentacao

Este documento define o novo escopo aprovado do modulo. O codigo atual ainda contem estruturas antigas e nao deve ser considerado alinhado ate a execucao do plano em `docs/sst/PLANO_SIMPLIFICACAO_SEGURA.md`.

Nenhuma tabela, rota ou model legado deve ser removido apenas com base neste documento. A simplificacao exige inventario de dados, migracao, validacao e rollback.

## Objetivo

O SST passa a ser um modulo simples para registrar, anexar e acompanhar documentos e informacoes de:

- PCMSO;
- PGR;
- exames ocupacionais;
- ASO;
- entregas de EPI;
- treinamentos de SST;
- LTCAT;
- avaliacoes quantitativas vinculadas ao LTCAT.

O foco e cadastro, vigencia, validade, anexos, consulta e acompanhamento de pendencias. O modulo nao executara transmissao governamental, inteligencia artificial, previsao, scoring ou orquestracao complexa.

## Fora do escopo

- qualquer conexao ou transmissao para eSocial;
- geracao de XML, SOAP, assinatura ou consulta de lote;
- certificado digital para transmissao governamental;
- CAT e gestao de acidentes;
- eventos tecnicos ou operacionais complexos;
- IA documental e reconciliacao automatica;
- workflows configuraveis e motor de automacao;
- compliance score, predicao e recomendacao automatica;
- bloqueios operacionais automaticos;
- filas, workers, rollout e telemetria especificos do SST;
- centro corporativo, heatmap e observabilidade avancada;
- integracoes automaticas com RH/DP ou Obras.

RH/DP, Obras, Empresas e Usuarios podem fornecer referencias cadastrais por IDs internos, mas nao existe sincronizacao automatica nem transferencia de propriedade.

## Regras transversais

- todo registro pertence a uma empresa;
- obra, setor, colaborador ou funcao sao opcionais quando fizerem sentido ao tipo;
- datas de emissao, inicio de vigencia, validade e vencimento devem ser coerentes;
- registros vencidos permanecem consultaveis;
- renovacao cria nova versao ou novo registro e nao sobrescreve evidencia historica;
- exclusao de registro com anexo ou historico deve ser logica;
- criacao, renovacao, inativacao e exclusao registram usuario e data;
- dados de saude e documentos pessoais exigem menor privilegio;
- frontend oculta acoes, mas o backend valida permissao e escopo;
- uploads validam MIME, extensao, tamanho e autorizacao;
- downloads usam URL assinada e de curta duracao;
- anexos nao podem ser acessados apenas pelo conhecimento da chave S3.

## PCMSO

### Dados minimos

- empresa;
- titulo/identificacao;
- responsavel tecnico;
- registro profissional quando aplicavel;
- data de emissao;
- inicio e fim de vigencia;
- status: vigente, vencido ou inativo;
- observacoes;
- anexos.

### Regras

- somente uma versao deve ser marcada como vigente para o mesmo escopo e periodo;
- renovacao preserva o PCMSO anterior;
- vencimento pode gerar indicador de pendencia, sem workflow automatico;
- anexos permanecem vinculados a versao correta.

## PGR

### Dados minimos

- empresa e, quando aplicavel, obra/unidade;
- titulo/identificacao;
- responsavel tecnico;
- data de emissao;
- vigencia;
- revisao/versao;
- status;
- observacoes;
- anexos.

### Regras

- revisao nao sobrescreve documento anterior;
- obra vinculada precisa pertencer a empresa informada;
- riscos descritos no documento podem ser registrados como observacao ou estrutura simples, sem reativar o antigo motor de riscos e exposicoes;
- anexos devem indicar a revisao a que pertencem.

## Exames ocupacionais

### Dados minimos

- colaborador;
- empresa;
- tipo do exame;
- data de realizacao;
- validade ou proxima data quando aplicavel;
- prestador/profissional;
- status de acompanhamento;
- observacoes restritas;
- anexos.

### Regras

- resultado clinico detalhado nao deve aparecer em listagens amplas ou logs;
- colaborador deve pertencer a empresa no periodo do exame;
- novo exame nao apaga o anterior;
- vencimento e acompanhamento nao alteram automaticamente o cadastro funcional.

## ASO

### Dados minimos

- colaborador e empresa;
- tipo: admissional, periodico, retorno, mudanca de funcao ou demissional;
- data de emissao;
- aptidao conforme valores autorizados;
- medico responsavel e registro profissional;
- validade quando aplicavel;
- observacoes restritas;
- anexos.

### Regras

- ASO permanece historico por colaborador;
- alteracao de aptidao exige auditoria;
- acesso e exportacao devem respeitar sensibilidade do dado;
- o modulo apenas registra e acompanha; nao dispara evento externo.

## EPI

### Dados minimos

- colaborador;
- empresa e obra quando aplicavel;
- EPI entregue;
- CA e validade do CA quando informados;
- quantidade;
- data da entrega;
- validade, troca ou devolucao quando aplicavel;
- responsavel pela entrega;
- observacoes;
- anexos, incluindo termo ou comprovante.

### Regras

- uma entrega e um evento historico e nao deve ser sobrescrita por outra;
- correcao registra motivo e valores anteriores;
- devolucao ou substituicao nao apaga a entrega original;
- anexos permanecem vinculados ao evento de entrega.

## Treinamentos de SST

### Dados minimos

- titulo e tipo do treinamento;
- norma/referencia quando aplicavel;
- empresa e obra/unidade;
- instrutor e qualificacao;
- data e carga horaria;
- validade;
- participantes;
- status;
- anexos gerais e certificados/listas quando aplicavel.

### Regras

- participacao deve ser vinculada individualmente ao colaborador;
- renovacao cria nova realizacao;
- certificado pode ser anexo geral ou individual, mas a associacao precisa ser explicita;
- validade vencida gera acompanhamento, sem bloqueio automatico.

Este dominio nao se confunde com o modulo institucional `TREINAMENTO`, que organiza materiais educacionais do sistema. O SST registra treinamentos ocupacionais realizados.

## LTCAT

### Dados minimos

- empresa;
- obra, unidade ou ambiente quando aplicavel;
- titulo/identificacao;
- responsavel tecnico;
- registro profissional;
- data de emissao;
- vigencia e revisao;
- status;
- conclusao geral;
- observacoes;
- anexos do LTCAT.

### Avaliacoes quantitativas

Cada LTCAT pode possuir varias avaliacoes quantitativas com:

- agente avaliado;
- ambiente, setor, funcao ou grupo exposto;
- data da avaliacao;
- metodologia e equipamento;
- unidade de medida;
- resultado medido;
- limite ou referencia utilizada;
- tempo/condicao de exposicao quando aplicavel;
- conclusao;
- responsavel;
- observacoes;
- anexos da avaliacao, como laudo, planilha, fotografia ou certificado de calibracao.

### Regras

- avaliacao pertence obrigatoriamente a um LTCAT;
- unidade, metodo, resultado e referencia devem ser armazenados separadamente para evitar texto impossivel de comparar;
- revisao do LTCAT preserva avaliacoes da versao anterior;
- exclusao do LTCAT com avaliacoes deve ser bloqueada ou logica;
- anexos gerais do LTCAT e anexos de cada avaliacao precisam ser diferenciados.

## Anexos

PCMSO, PGR, exame, ASO, entrega de EPI, treinamento, LTCAT e avaliacao quantitativa aceitam multiplos anexos.

Cada anexo precisa registrar:

- tipo da entidade e ID;
- nome original;
- chave privada no storage;
- MIME e tamanho;
- categoria opcional;
- usuario e data do upload;
- status ativo/inativo;
- motivo de inativacao quando aplicavel.

## Permissoes esperadas

- visualizar registros SST;
- criar e editar registros;
- inativar registros;
- visualizar anexos sensiveis;
- enviar/inativar anexos;
- visualizar relatorios simples;
- administrar cadastros auxiliares.

Permissoes antigas de eSocial, IA, workflows, rollout, compliance e observabilidade devem ser removidas somente junto com o codigo correspondente.

## Relatorios permitidos

- documentos vigentes e vencidos;
- exames e ASOs por validade;
- entregas de EPI por colaborador, obra e periodo;
- treinamentos realizados, pendentes e vencidos;
- PCMSO, PGR e LTCAT por empresa/obra e vigencia;
- avaliacoes quantitativas por LTCAT, agente e ambiente;
- registros sem anexo obrigatorio quando houver essa configuracao.

Os relatorios devem ser simples, rastreaveis e exportaveis conforme permissao. Nao devem calcular score, predicao ou recomendacao automatica.

## Mudanca segura

Antes de alterar o modulo, consultar `docs/sst/PLANO_SIMPLIFICACAO_SEGURA.md`. Nenhuma remocao fisica de tabela ou coluna pode ocorrer antes de confirmar uso, volume, vinculos, retencao legal, backup e estrategia de migracao.
