/**
 * SERVIDOR DA FIXTURE VIVA DAS CAMADAS — empacota `fixtureCamadas.jsx` com o
 * esbuild que já vem no projeto e serve com o CSS REAL do sistema.
 *
 * Mesmo desenho do `provas/fixtures/paginaRunner.mjs`, e de propósito: um
 * segundo jeito de montar componente real numa página local seria a
 * terceira maneira de fazer a mesma coisa neste repositório. O que muda é
 * só a entrada e o punhado de regras de POSIÇÃO DAS ÂNCORAS, que existem
 * para encostar o botão nas bordas da janela — é onde a camada vaza.
 *
 * O CSS vai por `<link>`, na MESMA ORDEM de `src/main.jsx`: cascata é
 * ordem, e trocá-la inventa medida errada (nota longa em
 * `provas/itensDaDoDMordem.mjs`).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_FRONT = path.resolve(AQUI, '..', '..');

const CSS = [
  'src/index.css',
  'src/styles/design-tokens.css',
  'src/components/lista-avancada/lista-avancada.css',
  'src/styles/escala.css',
  'src/styles/componentes-padrao.css',
  'src/modules/solicitacao-compra/compras-responsive.css',
  'src/styles/responsive-system.css'
];

/*
  AS ÂNCORAS. `--esq` encosta o botão na borda esquerda, `--dir` na direita.
  É a única geometria que esta fixture acrescenta, e ela é o instrumento:
  camada ancorada pela direita só vaza com o botão à esquerda, e vice-versa.
  `.prova-vazio` dá página rolável, para o clique-fora do harness ter onde
  cair sem tocar em nada acionável.
*/
const CSS_FIXTURE = `
  body { margin: 0; }
  .prova-pagina { padding: 24px 0; min-height: 100vh; }
  .prova-linha { display: flex; flex-direction: column; gap: 40px; margin-bottom: 40px; }
  .prova-ancora { display: flex; }
  .prova-ancora--esq { justify-content: flex-start; padding-left: 0; }
  .prova-ancora--dir { justify-content: flex-end; padding-right: 0; }
  /* EIXO VERTICAL: os dois grupos ficam à esquerda, e o que separa um do
     outro é uma janela inteira de vão — o grupo de baixo nasce fora da
     dobra e o clique do Playwright rola o mínimo para trazê-lo, deixando o
     botão encostado na borda DE BAIXO. É a posição das 39 telas. */
  .prova-ancora--topo, .prova-ancora--rodape { justify-content: flex-start; }
  .prova-vao { height: 100vh; }
  .prova-vazio { height: 900px; }
`;

const HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fixture das camadas flutuantes</title>
<link rel="stylesheet" href="/prova-estilos.css">
</head><body><div id="root"></div>
<script>globalThis.__ENV_FIXTURE__ = {};</script>
<script src="/prova-bundle.js"></script>
</body></html>`;

/*
  UM SERVIDOR, VÁRIAS FIXTURES (06/09).

  A prova da largura de coluna precisa da mesma coisa que esta: componentes
  REAIS numa página local, com o CSS real e na ordem real da cascata. Um
  segundo servidor idêntico seria a terceira maneira de fazer a mesma coisa
  no repositório — o que este arquivo já dizia, no topo, para evitar.

  Então o que muda entre uma fixture e outra é o que sempre foi: a ENTRADA e
  o punhado de regras de layout que só aquela prova precisa. O resto (a
  lista de CSS, a ordem, o esbuild, o `define` do ambiente) é comum.
*/
export async function criarServidorDeFixture({ entrada, cssExtra = '', caminho = 'fixture' }) {
  const pacote = await esbuild.build({
    entryPoints: [path.join(AQUI, entrada)],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'chrome110',
    jsx: 'automatic',
    loader: { '.js': 'jsx', '.jsx': 'jsx' },
    absWorkingDir: RAIZ_FRONT,
    logLevel: 'silent',
    define: {
      'process.env.NODE_ENV': '"production"',
      // A fixture NÃO fala com API nenhuma; o módulo de serviços só é
      // arrastado pelo grafo de imports da ListaAvancada.
      'import.meta.env.VITE_API_URL': '"http://127.0.0.1:1/api"',
      'import.meta.env': 'globalThis.__ENV_FIXTURE__'
    }
  });
  const js = pacote.outputFiles[0].text;
  const css = CSS.map((rel) => fs.readFileSync(path.join(RAIZ_FRONT, rel), 'utf8')).join('\n\n')
    + '\n\n' + cssExtra;

  const servidor = http.createServer((req, res) => {
    const rota = req.url.split('?')[0];
    if (rota === '/prova-bundle.js') {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
      res.end(js);
      return;
    }
    if (rota === '/prova-estilos.css') {
      res.writeHead(200, { 'content-type': 'text/css; charset=utf-8' });
      res.end(css);
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(HTML);
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  const porta = servidor.address().port;

  return {
    rota: (busca = '') => {
      const cru = String(busca || '');
      if (!cru) return `http://127.0.0.1:${porta}/${caminho}`;
      /* Compatibilidade com quem chama passando só o nome do defeito
         (`rota('semPosicao')`), que é como a prova das camadas chama. */
      const query = cru.startsWith('?') ? cru : `?d=${cru}`;
      return `http://127.0.0.1:${porta}/${caminho}${query}`;
    },
    fechar: () => servidor.close()
  };
}

export function criarServidorDeCamadas() {
  return criarServidorDeFixture({
    entrada: 'fixtureCamadas.jsx',
    cssExtra: CSS_FIXTURE,
    caminho: 'camadas'
  });
}
