# Relatorio do Sistema de Solicitacoes

## 1. Visao Geral

Sistema web corporativo para gestao de solicitacoes entre obras e setores administrativos, com controle por perfil, setor, obra, status, contratos, anexos, comprovantes, comunicacao interna e historico auditavel.

Objetivos principais:
- Padronizar o fluxo de solicitacoes entre areas.
- Garantir rastreabilidade completa de status, responsaveis, anexos, comentarios e envios.
- Aumentar produtividade operacional com filtros, acoes em massa e parametrizacao por SUPERADMIN.
- Permitir expansao para multiplas obras sem perda de controle.

---

## 2. Arquitetura e Deploy

### 2.1 Componentes
- `frontend/`: aplicacao web React/Vite hospedada na Vercel.
- `backend/`: API Node.js/Express hospedada em EC2 com PM2.
- Banco de dados: MySQL em RDS.
- Arquivos: S3 com URLs assinadas geradas pelo backend.

### 2.2 Infra atual
- Backend exposto em `api.jrfluxy.com.br`.
- Frontend exposto em:
  - `jrfluxy.com.br`
  - `www.jrfluxy.com.br`
  - `csc.jrfluxy.com.br`
- Nginx faz proxy para `127.0.0.1:8000`.
- PM2 process: `backend-solicitacoes`.

### 2.3 Observacoes operacionais
- CORS controlado para dominios da empresa e previews Vercel.
- Upload maximo controlado por ambiente.
- Anexos privados usam `presign` no backend.

---

## 3. Perfis e Logica Geral

Perfis principais:
- `SUPERADMIN`
- `ADMIN`
- `USUARIO`

Permissoes efetivas dependem da combinacao de:
- perfil
- setor do usuario
- vinculo com obra
- historico de interacao na solicitacao
- configuracoes definidas pelo SUPERADMIN

---

## 4. Modulos e Funcionalidades

## 4.1 Autenticacao e Sessao
- Login com token.
- Logout manual.
- Logout automatico por inatividade.
- Timeout de inatividade configuravel no painel do SUPERADMIN.
- Tela de perfil e alteracao de senha.
- Mensagem orientando novo login quando token ou sessao expira.

---

## 4.2 Solicitacoes

### Funcionalidades principais
- Criar solicitacao.
- Listar solicitacoes.
- Visualizar detalhes.
- Alterar status.
- Assumir solicitacao.
- Atribuir responsavel.
- Enviar para outro setor.
- Arquivar e desarquivar.
- Selecionar multiplas solicitacoes.
- Arquivar em massa.
- Enviar em massa.
- Atribuir em massa, quando permitido pelas regras do setor e perfil.
- Exportar selecionadas em CSV.
- Selecionar colunas visiveis na tabela.

### Regras de visibilidade
- A solicitacao continua visivel para usuarios e setores envolvidos no historico, mesmo apos envio para outro setor.
- O arquivamento e individual por usuario.
- Uma solicitacao arquivada desaparece apenas da lista de quem arquivou.
- Ao desarquivar, a solicitacao volta para a lista normal daquele usuario.

### Historico
- Ordenacao do mais recente para o mais antigo.
- Registra:
  - alteracao de status
  - envio entre setores
  - atribuicao e assuncao de responsavel
  - comentarios
  - anexos
  - numero no SIENGE
- O envio entre setores registra origem e destino.

---

## 4.3 Nova Solicitacao

### Comportamento dinamico
- Primeiro seleciona a obra.
- Depois habilita area responsavel.
- Depois habilita tipo de solicitacao conforme setor selecionado.
- Contratos e referencias de contrato dependem da obra e do tipo.

### Campos principais
- Obra
- Area responsavel
- Tipo de solicitacao
- Valor
- Data de vencimento
- Contrato
- Ref. do contrato
- Subtipo
- Datas de medicao
- Itens de apropriacao
- Descricao
- Anexos multiplos

### Regras por tipo
- `MEDICAO`:
  - usa campos de contrato e ref. do contrato
  - usa datas de medicao
  - nao exige descricao
- `ADM LOCAL DE OBRA`:
  - usa subtipo
  - usa contrato e ref. do contrato
- `LOCACAO DE MAQ. EQ.`:
  - usa contrato e ref. do contrato
- `SOLICITACAO DE COMPRA`, `OUTROS ASSUNTOS` e `PEDIDO DE CONTRATACAO`:
  - nao exigem valor na abertura
- `ABERTURA DE CONTRATO`:
  - exige ref. do contrato em campo livre
  - exige itens de apropriacao

### Regras de validacao
- Todos os campos habilitados para preenchimento sao obrigatorios, exceto descricao.
- Data de vencimento nao pode ser menor que a data atual.
- Datas de medicao podem aceitar datas passadas.
- A obra precisa continuar preenchida; se for removida, os campos dependentes limpam e voltam a ser bloqueados.

### Regras de anexos
- Selecao multipla.
- Lista dos arquivos antes do envio.
- Remocao individual da lista antes do upload.
- Suporte a arquivo `.rar`.

---

## 4.4 Detalhes da Solicitacao

### Funcionalidades
- Cabecalho com dados principais.
- Alteracao de status.
- Comentarios.
- Upload de anexos.
- Historico completo.
- Numero no SIENGE, conforme regra de setor.

### Informacoes exibidas no cabecalho
- Obra
- Setor
- Valor
- Criado em
- Vencimento
- Inicio e fim de medicao
- Status
- Ref. do contrato
- Contrato
- Subtipo, quando a solicitacao for `ADM LOCAL DE OBRA`

### Regras recentes
- A lista de status exibida no detalhe segue o setor do usuario logado.
- A validacao backend da troca de status foi alinhada com esse mesmo criterio.
- `SUPERADMIN` permanece como excecao administrativa.
- Campo exibido como `Nº no SIENGE`.

### Permissoes relevantes
- Usuarios do setor `OBRA` podem comentar no detalhe.
- Remocao de anexo do historico:
  - permitida para `COMPRAS`
  - permitida para `SUPERADMIN`

---

## 4.5 Status por Setor e Cores

### Configuracao
- O SUPERADMIN define os status por setor.
- O SUPERADMIN define cores de status gerais e por setor.

### Regras
- Usuarios alteram status conforme os status permitidos para seu setor.
- A cor do status precisa refletir corretamente o setor que originou a alteracao mais recente.
- O sistema normaliza comparacao de status para evitar erro com maiusculas, minusculas, acentos e separadores.

---

## 4.6 Regras de Recebimento por Setor e por Tipo

### Configuracao do SUPERADMIN
- Comportamento por setor:
  - `ADMIN_PRIMEIRO`
  - `TODOS_VISIVEIS`
- Configuracao por tipo dentro do setor:
  - quais tipos pertencem ao setor
  - se o tipo cai para admin primeiro ou para todos

### Efeito no fluxo
- O recebimento da solicitacao respeita a configuracao de setor e tipo.
- A visibilidade por historico nao elimina as regras de recebimento; ela complementa o acompanhamento posterior.

---

## 4.7 Regras Especificas por Setor

### GEO
- `ADMIN GEO` possui gestao ampliada.
- Pode acessar a tela de Usuarios.
- Pode excluir solicitacoes.
- Pode excluir contratos.
- Pode editar numero no SIENGE.

### OBRA
- Usuarios do setor `OBRA` enxergam apenas solicitacoes:
  - criadas por eles
  - vinculadas as obras em que estao associados
- Podem comentar.
- Podem alterar status conforme os status do setor `OBRA`.
- Existem automacoes proprias de retorno para setor anterior e envio para Financeiro em determinados status.

### BRAPE e BRAPE-CSC
- Fluxo segregado para solicitacoes BRAPE.
- BRAPE-CSC tem comportamento controlado por vinculo com obras e historico.

### FINANCEIRO
- Todos os usuarios do setor podem acessar upload em massa de comprovantes e comprovantes pendentes.
- Tela de Solicitacoes exibe filtro de responsavel para esse setor.
- Status `PAGA` impacta calculos de contratos.

### DIRETORIA
- Dashboard do setor `DIRETORIA` pode visualizar dados globais do sistema, semelhante ao `SUPERADMIN`, sem alterar regras dos demais setores.

---

## 4.8 Gestao de Contratos

### Funcionalidades
- Cadastro e manutencao de contratos.
- Associacao por obra.
- Edicao das informacoes do contrato.
- Ref. do contrato.
- Itens de apropriacao.
- Anexos de contrato.
- Visualizacao e download de anexos.
- Exclusao de contrato por `SUPERADMIN` e `ADMIN GEO`.

### Regras de valor
- `Valor Solicitado` nao soma automaticamente novas solicitacoes.
- `Valor Pago` soma dinamicamente solicitacoes com status `PAGA`.
- Se a solicitacao deixa de estar `PAGA`, deixa de compor o valor pago.

### Importacao em massa
- Planilha modelo para contratos.
- Importacao por CSV.
- Validacao por obra e colunas.
- Campos textuais como descricao e itens de apropriacao podem ser aceitos vazios quando a regra permitir.

---

## 4.9 Usuarios

### Funcionalidades
- Cadastro manual.
- Edicao.
- Ativacao e desativacao.
- Vinculo com obras.
- Definicao de perfil.
- Importacao em massa.
- Planilha modelo para importacao.

### Regras de acesso
- Tela de Usuarios disponivel apenas para:
  - `SUPERADMIN`
  - `ADMIN` do setor `GEO`

### Regra critica
- Apenas `SUPERADMIN` pode criar ou promover usuario para perfil `SUPERADMIN`.

### Importacao em massa
- Colunas principais:
  - Nome
  - Email
  - Cargo
  - Setor
  - Obras
  - Senha
  - Perfil
- A senha em texto e convertida em hash no backend.

---

## 4.10 Upload de Comprovantes

### Funcionalidades
- Upload em massa de comprovantes.
- Vinculacao de comprovantes a solicitacoes.

### Regras
- Acesso para `FINANCEIRO` e `SUPERADMIN`.
- Uploads protegidos por CORS e limite de tamanho.
- Limite maximo configuravel por ambiente.

---

## 4.11 Anexos e S3

### Regras tecnicas
- Upload para S3.
- Acesso por URL assinada.
- Compatibilidade com anexos antigos e novos.
- Normalizacao de nome original para reduzir falhas com acentuacao e caracteres especiais.
- Suporte a `.rar` no uploader padrao.

---

## 4.12 Dashboard

### Comportamento
- `SUPERADMIN` ve consolidado global.
- `ADMIN` ve seu setor, salvo excecoes explicitas como `DIRETORIA`.
- Card `SLA Medio` removido.

---

## 4.13 Filtros e Tabela de Solicitacoes

### Filtros
- Obra com multisselecao.
- Setor.
- Tipo de Solicitacao com multisselecao.
- Status.
- Valor minimo e valor maximo.
- Data de registro.
- Data de vencimento.
- Responsavel, quando habilitado para o setor.

### Regras de persistencia
- Filtros ficam salvos por usuario no navegador ate limpeza manual.
- Colunas visiveis tambem ficam salvas por usuario no navegador.

### Recursos da tabela
- Ordenacao por data, vencimento e valor.
- Responsividade desktop, tablet e mobile.
- Barra de acoes contextual para uma ou multiplas solicitacoes selecionadas.

---

## 4.14 Comunicacao Interna

### Funcionalidades
- Caixa de Entrada.
- Caixa de Saida.
- Abertura de conversa.
- Resposta em formato de chat.
- Anexos na abertura e no decorrer da conversa.
- Adicao de participantes em conversa aberta.
- Envio em massa para usuarios.
- Envio em massa para setores.
- Arquivamento individual e em massa.
- Reabertura e conclusao de conversa.
- Preview e download de anexos.

### Regras
- O usuario ve apenas conversas em que participa.
- O criador pode editar mensagens por ate 5 minutos.
- O criador pode adicionar participantes apenas em conversa aberta.
- O botao voltar respeita a origem da navegacao.

### Alertas visuais
- Badge vermelho com contagem de itens novos em:
  - `Comunicacao`
  - `Caixa de Entrada`
  - `Caixa de Saida`

---

## 4.15 Arquivos Modelos

### Funcionalidades
- Modulo visivel no menu para todos os usuarios.
- Paginas por area.
- Upload por usuarios autorizados.
- Visualizacao em cards.
- Download e abertura de arquivos.

### Areas previstas
- Gerencia de Processos
- SESMT
- Departamento Pessoal
- Financeiro
- RH
- Juridico
- Compras
- Marketing

### Regras
- `SUPERADMIN` pode criar, ativar, desativar e configurar uploaders.
- `ADMIN` autorizado pode fazer upload e excluir dentro das paginas permitidas.
- `SUPERADMIN` pode excluir em qualquer pagina.

---

## 5. Automacoes de Fluxo

### Setor OBRA
- Se uma solicitacao estiver em ajuste para `OBRA` e for marcada como `ATENDIDO`, o sistema tenta retornar automaticamente ao setor anterior.
- Se `OBRA` marcar `MERCADORIA ENTREGUE`, o sistema envia automaticamente para `FINANCEIRO`.

---

## 6. Auditoria, Logs e Rastreabilidade

- Historico por solicitacao.
- Registro de acoes criticas.
- Log de exclusao de solicitacao.
- Rastreabilidade de anexos, comentarios, responsavel, status e envios.

---

## 7. Seguranca e Integridade

- CORS controlado por allowlist.
- Regras de perfil e setor validadas no backend.
- Upload e download mediados pelo backend.
- Confirmacoes de sucesso e erro no frontend.
- Validacoes criticas em frontend e backend.

---

## 8. Procedimento de Deploy

### Backend
1. `git pull`
2. `npm install`, se necessario
3. `pm2 restart backend-solicitacoes --update-env`
4. validar logs PM2

### Frontend
1. `git push`
2. redeploy na Vercel
3. preferir limpeza de cache quando houver alteracao estrutural forte

---

## 9. Limitacoes e Pontos de Atencao

- Preferencias visuais e filtros usam `localStorage`.
- A versao mobile e web responsiva, nao aplicativo nativo.
- Regras por setor e por tipo dependem de boa configuracao do SUPERADMIN.
- Historicos antigos podem refletir regras legadas anteriores a correcoes posteriores.

---

## 10. Valor do Sistema para a Empresa

### Problemas que resolve
- Solicitacoes dispersas em canais paralelos.
- Falta de historico confiavel.
- Retrabalho por perda de contexto.
- Baixa previsibilidade entre obra e setores administrativos.
- Dependencia de pessoas especificas para acompanhar andamento.

### Valor operacional
- Padronizacao de fluxo.
- Escalabilidade para varias obras e setores.
- Rastreabilidade ponta a ponta.
- Reducao de retrabalho.
- Ganho de velocidade com filtros, acoes em massa e centralizacao de anexos.

### Valor gerencial
- Mais transparencia.
- Mais governanca.
- Mais controle por perfil, setor, obra e configuracao.
- Base pronta para relatorios avancados e evolucoes futuras.

---

## 11. Recomendacao de Uso e Governanca

- Definir pontos focais por setor.
- Treinar usuarios por perfil.
- Revisar periodicamente:
  - status por setor
  - tipos por setor
  - comportamento de recebimento
  - vinculos de usuarios com obras
  - paginas e uploaders de Arquivos Modelos

---

## 12. Controle de Versao deste Documento

- Este documento deve ser atualizado sempre que houver:
  - nova regra de permissao
  - novo modulo
  - nova automacao de fluxo
  - alteracao relevante de UX
  - alteracao relevante em upload, anexos ou comunicacao interna
