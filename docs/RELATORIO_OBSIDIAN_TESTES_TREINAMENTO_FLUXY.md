# Relatorio Obsidian - Testes Smoke, Evidencias e Central de Treinamento FLUXY

Data: 2026-05-25

## Decisao

Antes do Dia 1 da implantacao institucional, o FLUXY precisa de um Dia 0.

Esse Dia 0 deve ser dedicado a:

- mapa de testes;
- smoke tests;
- evidencias por screenshot;
- validacao de permissoes;
- configuracoes amostrais;
- preparacao de treinamento.

## Por que isso e necessario

O Dia 1 do plano fala de configuracoes e cadastros. Mas, enquanto o ambiente estiver em desenvolvimento ou homologacao, nao faz sentido cadastrar 100% da operacao.

Ao migrar `dev-v2` para `main`, as configuracoes feitas em banco de desenvolvimento podem nao acompanhar a branch. Por isso, a configuracao completa deve acontecer no ambiente definitivo.

Na etapa atual, o ideal e fazer configuracao amostral:

- poucos usuarios por perfil;
- poucas empresas;
- poucas obras;
- poucos centros de custo;
- permissoes por amostra;
- fluxos reais simulados;
- evidencias registradas.

## Testes Smoke

O projeto ja possui Playwright em `e2e/`.

Existe script:

```bash
npm run test:smoke
```

Hoje o Playwright ja gera relatorio e captura evidencia em falhas.

O proximo passo recomendado e criar um modo de evidencia para capturar screenshots tambem quando o teste passa.

Isso permite ter uma pasta com imagens por modulo:

- Login;
- Dashboard;
- Solicitacoes;
- Compras;
- Financeiro;
- Fiscal;
- RH/DP;
- SST;
- Configuracoes.

## Mapa de Testes

O mapa de testes deve cobrir:

- autenticacao;
- navegacao;
- permissoes;
- solicitacoes;
- compras;
- financeiro;
- fiscal;
- obras e centros de custo;
- RH/DP;
- SST;
- configuracoes.

Cada modulo precisa ter:

- rotas criticas;
- fluxo principal;
- permissao de acesso;
- evidencia visual;
- criterio de aceite.

## Central de Treinamento

E viavel criar uma area de treinamento dentro do proprio FLUXY.

Nome sugerido:

- Central de Treinamento FLUXY.

Primeira versao implementada:

- rota interna `/treinamento`;
- menu lateral `Treinamento`;
- gestao de FAQ, videos e guias;
- uploads armazenados no S3 privado;
- abertura dos arquivos por URL assinada;
- permissoes separadas para visualizar, gerenciar e publicar;
- conteudos em rascunho/publicado/arquivado;
- registro de leitura e conclusao por usuario.

Abas iniciais:

- Perguntas e Respostas;
- Videos de Treinamento;
- Guias por Modulo;
- Trilhas por Perfil.

## Videos

Videos devem ficar em S3 privado, com acesso por URL assinada.

O banco deve guardar apenas:

- titulo;
- descricao;
- modulo;
- perfil indicado;
- ordem;
- status;
- chave S3;
- thumbnail;
- usuario responsavel.

## Perguntas e Respostas

A area de FAQ deve permitir:

- cadastrar pergunta;
- cadastrar resposta;
- associar modulo;
- associar perfil;
- publicar/despublicar;
- ordenar;
- pesquisar por palavra-chave.

## Governanca

A Central de Treinamento precisa respeitar permissoes.

Permissoes sugeridas:

- visualizar treinamento;
- gerenciar treinamento;
- publicar treinamento;
- ver relatorio de treinamento.

## Recomendacao

O plano de implantacao de 5 dias deve ser ajustado:

1. Dia 0: mapa de testes, smoke, evidencias e configuracao amostral.
2. Dia 1: configuracao institucional amostral e governanca.
3. Dia 2: solicitacoes, obras e compras.
4. Dia 3: financeiro.
5. Dia 4: RH/DP, SST, fiscal e contratos.
6. Dia 5: homologacao final e go-live.

## Conclusao

Sim, e possivel gerar capturas automatizadas de teste.

Sim, e possivel criar uma plataforma de treinamento dentro do FLUXY.

E as duas coisas se complementam: as evidencias dos testes ajudam a montar materiais de treinamento, e a Central de Treinamento ajuda a reduzir dependencia do fundador tecnico e padronizar a operacao.
