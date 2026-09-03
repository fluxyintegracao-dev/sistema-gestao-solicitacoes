/**
 * PROVA — posse da largura de coluna (ResizableTable).
 *
 * Por que existe: a largura de coluna tem DOIS donos disputando a mesma
 * propriedade (o cálculo do componente, que acompanha a janela, e o arrasto
 * do usuário, que deve ficar). Errar essa disputa não quebra o build, não
 * aparece no console e não muda nada visível até alguém redimensionar a
 * janela ou recarregar a página. Em 02 e 03/09 ela foi errada TRÊS vezes
 * seguidas, cada uma anunciada como corrigida:
 *   1. só preencher chave ausente     → a largura nova nunca chegava ao DOM;
 *   2. guarda em `useRef` por mount   → o arrasto sumia a cada recarga;
 *   3. gravar o mapa inteiro          → um arrasto congelava TODAS as colunas.
 *
 * Esta prova reproduz a lógica real do componente e cobra os três cenários.
 * Rode com `npm run provas`. Se ela quebrar, a regra de posse mudou — e é
 * para doer.
 */
const armazem = {};
const armazenamento = {
  getItem: (k) => armazem[k] ?? null,
  setItem: (k, v) => { armazem[k] = v; }
};

/* Espelha getInitialWidths de src/components/ResizableTable.jsx */
function larguraInicial(colunas, chaveArmazenamento) {
  const padroes = Object.fromEntries(colunas.map((c) => [c.id, Number(c.width || 140)]));
  if (!chaveArmazenamento) return { larguras: padroes, doUsuario: new Set() };
  const guardado = JSON.parse(armazenamento.getItem(chaveArmazenamento) || '{}');
  const doUsuario = new Set(
    colunas.map((c) => c.id).filter((k) => Number.isFinite(Number(guardado[k])))
  );
  const larguras = Object.fromEntries(colunas.map((c) => {
    const minimo = Number(c.minWidth || 72);
    const daMemoria = Number(guardado[c.id]);
    return [c.id, Math.max(minimo, Number.isFinite(daMemoria) ? daMemoria : padroes[c.id])];
  }));
  return { larguras, doUsuario };
}

function criarTabela(chaveArmazenamento) {
  const estado = { larguras: {}, doUsuario: new Set(), arrastou: false };
  return {
    montar(colunas) {
      const inicial = larguraInicial(colunas, chaveArmazenamento);
      estado.larguras = { ...inicial.larguras };
      estado.doUsuario = new Set(inicial.doUsuario);
      estado.arrastou = false;
    },
    /* o efeito de sincronia, quando a TabelaPadrao recalcula a distribuição */
    sincronizar(colunas) {
      colunas.forEach((c) => {
        if (estado.doUsuario.has(c.id)) return;
        const proposta = Number(c.width || 140);
        if (estado.larguras[c.id] !== proposta) estado.larguras[c.id] = proposta;
      });
    },
    arrastar(id, largura) {
      estado.doUsuario.add(id);
      estado.arrastou = true;
      estado.larguras[id] = largura;
      if (estado.arrastou) {
        armazenamento.setItem(chaveArmazenamento, JSON.stringify(
          Object.fromEntries(Object.entries(estado.larguras).filter(([k]) => estado.doUsuario.has(k)))
        ));
      }
    },
    larguras: () => ({ ...estado.larguras }),
    guardado: () => JSON.parse(armazenamento.getItem(chaveArmazenamento) || '{}')
  };
}

const EM_1920 = [{ id: 'nome', width: 813 }, { id: 'obra', width: 180 }, { id: 'status', width: 132 }];
const EM_1366 = [{ id: 'nome', width: 259 }, { id: 'obra', width: 180 }, { id: 'status', width: 132 }];

let falhas = 0;
const conferir = (nome, real, esperado) => {
  const bate = JSON.stringify(real) === JSON.stringify(esperado);
  if (!bate) falhas += 1;
  console.log(`${bate ? '  ok  ' : ' FALHA'} ${nome}`);
  if (!bate) console.log('        esperado:', esperado, '\n        real:    ', real);
};

const tabela = criarTabela('prova:larguras');

tabela.montar(EM_1920);
tabela.sincronizar(EM_1366);
conferir('encolher a janela sem recarregar redistribui a sobra', tabela.larguras(),
  { nome: 259, obra: 180, status: 132 });

tabela.montar(EM_1920);
tabela.arrastar('obra', 400);
conferir('grava SÓ a coluna arrastada (uma não congela as outras)', tabela.guardado(),
  { obra: 400 });

tabela.montar(EM_1920);
tabela.sincronizar(EM_1920);
conferir('o arrasto do usuário sobrevive à recarga', tabela.larguras(),
  { nome: 813, obra: 400, status: 132 });

tabela.sincronizar(EM_1366);
conferir('coluna arrastada fica; as outras acompanham a janela', tabela.larguras(),
  { nome: 259, obra: 400, status: 132 });

console.log(falhas ? `\n[provas] ${falhas} falha(s)` : '\n[provas] largura de coluna: ok');
process.exit(falhas ? 1 : 0);
