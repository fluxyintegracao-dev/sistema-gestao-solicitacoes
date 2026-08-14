# Auditoria operacional

## Objetivo

A tela **Administracao > Auditoria Operacional** oferece uma trilha objetiva do uso do Fluxy por usuario, setor, modulo e periodo. Ela permite verificar paginas acessadas, operacoes executadas, resultados e horarios sem transformar a ferramenta em monitoramento invasivo do conteudo digitado.

A trilha passa a existir a partir da aplicacao da migration `202608120003_governanca_auditoria_operacional.js`. Nao existe reconstrucao artificial de atividades anteriores.

## O que e registrado

- acesso autenticado a paginas do frontend;
- operacoes autenticadas que alteram estado no backend (`POST`, `PUT`, `PATCH` e `DELETE`);
- usuario, setor e perfil existentes no momento do evento;
- modulo, rota normalizada, tipo da operacao, resultado e horario;
- identificador tecnico do recurso quando ele estiver presente na URL;
- identificador e codigo tecnico devolvidos pela API ao criar um registro, quando disponiveis;
- falha ou bloqueio retornado pela API;
- identificador de sessao gerado pelo navegador para correlacao operacional.
- nomes tecnicos nao sensiveis dos campos informados ou alterados, sem seus valores;

As operacoes sao classificadas, quando aplicavel, como criacao, alteracao, exclusao, mudanca de status, aprovacao, recusa, delegacao, comentario, importacao, exportacao, conciliacao ou estorno.

## O que nao e registrado

- senhas, tokens, cookies ou cabecalhos de autenticacao;
- CPF/CNPJ, chaves Pix, contas, agencias ou dados bancarios;
- conteudo de formularios, mensagens, anexos ou documentos;
- texto digitado, movimentos de mouse, tempo de teclado ou capturas de tela;
- corpo completo das requisicoes.

Os nomes de campos passam por uma lista conservadora de bloqueio. Campos relacionados a credenciais, documentos pessoais, dados bancarios, Pix, anexos e conteudo nao sao exibidos nem mesmo pelo nome.

O endereco IP e armazenado somente como hash. A auditoria nao deve ser apresentada como medidor automatico de produtividade: quantidade de eventos nao representa qualidade, complexidade ou tempo efetivamente trabalhado.

## Permissoes

| Chave | Alcance |
| --- | --- |
| `governanca.operacional.visualizar_resumo` | Indicadores agregados e acesso a tela |
| `governanca.operacional.visualizar_usuarios` | Comparativo de atividades por usuario |
| `governanca.operacional.visualizar_detalhes` | Linha do tempo detalhada |
| `governanca.operacional.exportar` | Exportacao CSV conforme filtros |

SUPERADMIN e administradores de negocio continuam com o bypass administrativo existente. A permissao de detalhes nao e inferida a partir da permissao de resumo.

## Interface e filtros

A rota do frontend e `/governanca/auditoria-operacional`. O recorte padrao e o dia atual. Os filtros disponiveis sao periodo, usuario, setor, modulo, categoria, evento e resultado. O backend aceita no maximo 90 dias por consulta e a exportacao e limitada a 10.000 eventos por arquivo.

A leitura do recorte tambem apresenta:

- distribuicao das operacoes pelos modulos mais movimentados;
- ritmo diario de operacoes e usuarios observados no periodo;
- comparativo de acessos e operacoes por usuario;
- falhas e bloqueios destacados para investigacao.

O ritmo diario representa somente eventos registrados. Ele nao calcula jornada, tempo produtivo ou qualidade do trabalho.

A linha do tempo agrupa eventos consecutivos pela sessao observada no navegador. A interface recebe apenas uma referencia abreviada gerada por hash; o identificador bruto da sessao continua oculto. O contador por usuario representa sessoes com eventos registrados e nao equivale a login, jornada, permanencia ou horas trabalhadas.

Ao navegar entre registros numericos diferentes de uma mesma pagina, cada acesso e registrado separadamente com o identificador tecnico do recurso. Tokens publicos e outros identificadores potencialmente sensiveis nao sao armazenados como recurso de navegacao.

Nas operacoes de criacao, o middleware observa somente os campos tecnicos `id` e `codigo` da resposta ja produzida pela API. O corpo da resposta nao e persistido nem alterado, e tokens ou campos pessoais nao sao usados para identificar o recurso.

Quando o tipo de recurso e reconhecido e existe uma rota interna segura, a linha do tempo oferece **Abrir registro**. O link respeita as permissoes normais do modulo de destino; a Auditoria Operacional nao concede acesso adicional. Recursos sem mapeamento inequivoco permanecem sem link. A rota HTTP normalizada e o metodo tambem ficam visiveis para apoiar a investigacao.

## APIs

- `POST /api/governanca/auditoria-operacional/navegacao` registra uma navegacao autenticada;
- `GET /api/governanca/auditoria-operacional/resumo` retorna indicadores agregados;
- `GET /api/governanca/auditoria-operacional/usuarios` agrega por usuario;
- `GET /api/governanca/auditoria-operacional/opcoes` fornece opcoes dos filtros;
- `GET /api/governanca/auditoria-operacional/eventos` retorna a linha do tempo paginada;
- `GET /api/governanca/auditoria-operacional/export` gera CSV.

## Persistencia e seguranca

A tabela `governanca_eventos_operacionais` e append-only para a aplicacao: nao ha endpoint para editar ou excluir eventos. Falha ao gravar a auditoria nao interrompe a operacao de negocio, mas e registrada no log do backend para diagnostico.

A manutencao de retencao existe somente como comando administrativo no servidor. Ela usa 365 dias por padrao, aceita de 90 a 3.650 dias e sempre deve ser simulada antes da aplicacao:

```bash
# somente contabiliza os eventos anteriores ao corte
npm run auditoria-operacional:retencao:simular

# aplica o mesmo corte depois da revisao do resultado
npm run auditoria-operacional:retencao:aplicar
```

Para outra politica aprovada, informe `AUDITORIA_OPERACIONAL_RETENCAO_DIAS` no ambiente ou execute `node scripts/limparAuditoriaOperacional.js --days=730` para simular. A exclusao exige adicionalmente `--confirm`. Nao existe endpoint, botao ou job automatico que descarte a trilha.

Recomendacao operacional:

- manter inicialmente 365 dias, sujeito a politica formal de retencao da empresa;
- restringir detalhes e exportacao ao menor grupo necessario;
- nunca usar a exportacao como copia permanente fora dos controles de acesso;
- revisar volume e indices depois dos primeiros 30 dias de uso real.

Os indices cobrem data, usuario, setor, modulo, tipo, recurso e resultado. O limite de 90 dias por consulta e o teto de 10.000 linhas por exportacao protegem o uso operacional; o volume e o tempo das consultas devem ser revisados depois dos primeiros 30 dias de uso real.

## Implantacao

1. Executar as migrations do backend.
2. Reiniciar somente o processo PM2 do ambiente atualizado.
3. Publicar o frontend.
4. Liberar as permissoes granulares para os usuarios autorizados.
5. Executar `npm run test:auditoria-operacional` no backend.

## Matriz de smoke test

| Cenario | Resultado esperado |
| --- | --- |
| Usuario abre duas paginas autenticadas | Duas navegacoes aparecem com usuario, modulo e horario |
| Usuario abre dois registros na mesma pagina | Os dois acessos aparecem com seus respectivos IDs tecnicos |
| URL contem token publico | O token nao e armazenado como identificador do recurso |
| Usuario cria ou altera um registro | Operacao aparece com tipo, rota normalizada, recurso e sucesso |
| Alteracao possui campos comuns e sensiveis | Somente os nomes dos campos comuns aparecem; nenhum valor e persistido |
| Criacao retorna `id` e `codigo` | Linha do tempo identifica o novo registro sem armazenar o restante da resposta |
| API rejeita acao por permissao | Evento aparece como bloqueado, sem conteudo da requisicao |
| Usuario sem permissao abre URL diretamente | Rota protegida impede o acesso |
| Usuario possui apenas resumo | Ve indicadores, mas nao ve usuarios nem linha do tempo |
| Usuario possui detalhes | Ve a linha do tempo conforme os filtros |
| Evento possui recurso reconhecido | **Abrir registro** leva ao modulo de origem, que reaplica suas permissoes |
| Evento nao possui recurso inequivoco | Nenhum link contextual e exibido |
| Usuario possui eventos em duas sessoes | Linha do tempo separa as sessoes por referencias protegidas, sem exibir o identificador bruto |
| Exportacao sem permissao | API retorna acesso negado |
| Filtro acima de 90 dias | API rejeita o periodo |
| Formulario contem dado sensivel | Auditoria nao armazena o corpo nem o dado sensivel |
| Duplo envio do mesmo evento de navegacao | UUID unico evita duplicidade |
| Retencao executada sem `--confirm` | Apenas informa corte e candidatos, sem excluir eventos |
| Retencao executada com prazo menor que 90 dias | Comando rejeita a configuracao |
| Usuario sem permissao de exportacao chama a API | API nega a exportacao mesmo que ele visualize o resumo |

## Homologacao por perfil

| Perfil de teste | Validacao minima |
| --- | --- |
| Somente resumo | Consulta indicadores, sem usuarios, detalhes ou exportacao |
| Resumo + usuarios | Consulta comparativo por usuario, sem linha do tempo |
| Resumo + detalhes | Consulta eventos e links contextuais, sem exportar |
| Exportador | Exporta somente o recorte permitido pelos filtros |
| SUPERADMIN | Executa todos os cenarios e confirma que os modulos de destino continuam aplicando suas proprias permissoes |

## Relacao com auditorias existentes

Esta trilha complementa, sem substituir:

- auditorias financeiras e historicos dos titulos;
- historicos das solicitacoes e compras;
- `SecurityEventLog`, usado para eventos de autenticacao e seguranca;
- logs tecnicos do backend.

Para investigar uma alteracao, a auditoria operacional localiza usuario, horario, modulo e recurso. O detalhe de negocio continua sendo consultado na auditoria do modulo de origem.
