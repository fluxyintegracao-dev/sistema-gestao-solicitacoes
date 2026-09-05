import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from 'react';
import { useAuth } from './AuthContext';
import {
  adotarPreferencias,
  getMinhasPreferencias,
  resetListaPreferenciaTipo,
  salvarListaPreferenciasTipo
} from '../services/listasPreferencias';

/* =====================================================================
   PREFERÊNCIAS DE TABELA POR USUÁRIO (05/09)
   ---------------------------------------------------------------------
   POR QUE CONTEXTO, E NÃO UMA BUSCA POR TABELA.

   Até hoje a `TabelaPadrao` lia o localStorage de forma SÍNCRONA dentro do
   `useState` inicial (`TabelaPadrao.jsx:562, 640, 915`): a tabela NASCE com
   a escolha do usuário, nunca com o padrão. Trocar isso por uma busca de
   rede por tabela custaria uma de duas coisas, e as duas são defeito:
     - a tela pisca do padrão para o salvo (as colunas pulam depois do
       primeiro desenho); ou
     - cada uma das 268 tabelas ganha estado de carregamento — 268 lugares
       para acertar, e uma tela de relatório com 5 tabelas faria 5
       requisições antes de desenhar qualquer coisa.

   O contexto evita as duas: UMA chamada a `GET /me/preferencias` na
   abertura do app, guardada em memória, e toda tabela lê dali — em
   render, sem rede, sem promessa.

   ---------------------------------------------------------------------
   POR QUE O localStorage CONTINUA SENDO ESCRITO (e não é redundância).

   Ele deixa de ser a VERDADE e passa a ser duas coisas:
     1. SEMENTE SÍNCRONA. A carga do servidor é assíncrona; entre o
        primeiro desenho e a resposta há uma janela. Semeando do
        localStorage a tabela nasce certa para quem já usou esta máquina —
        que é o caso da esmagadora maioria das aberturas. Sem a semente, a
        alternativa honesta seria segurar o app inteiro atrás de uma
        requisição, e preferência não pode derrubar (nem atrasar) tela.
     2. REDE DE ROLLBACK. A adoção NÃO apaga o localStorage (decisão de
        05/09). Se o deploy for revertido, o build anterior encontra a
        configuração do usuário exatamente onde sempre esteve — e por isso
        o espelho precisa continuar ATUALIZADO, no formato e nas chaves
        ANTIGAS. Espelho congelado no dia da adoção devolveria o usuário a
        uma configuração velha no rollback.

   Precedência: servidor > espelho local > padrão da tela.

   ---------------------------------------------------------------------
   O QUE NÃO ENTRA AQUI.
     - LARGURA DE COLUNA. Continua no localStorage, em pixel, por
       navegador — ver o comentário datado em `ResizableTable.jsx`. Pixel
       absoluto por USUÁRIO faz o monitor de 1920 estragar o notebook de
       1366, e a forma de guardar (faixa de janela · proporção · pixel com
       teto) é decisão do cliente, ainda em aberto.
     - A tela pública de cotação do fornecedor (`/cotacao/:token`): não tem
       usuário logado, não há onde indexar. Ela cai sozinha no caminho
       local — sem sessão, este contexto nunca carrega nem grava.
     - Rascunho de formulário: existe para sobreviver ao que o banco não
       sobrevive (aba fechada, queda de rede). Não é preferência.
   ===================================================================== */

/* Os dois tipos que esta migração usa, do conjunto fechado do backend
   (`colunas | larguras | filtros | blocos | visual | geral`).
   `larguras` está de fora de propósito — ver acima. */
export const TIPO_COLUNAS = 'colunas';
export const TIPO_VISUAL = 'visual';

/*
  700ms, o MESMO valor que a ListaAvancada já usa
  (`components/lista-avancada/ListaAvancada.jsx:158`). Arrastar uma coluna
  ou clicar três vezes no menu de alinhamento não pode virar uma requisição
  por evento; e inventar um segundo valor para o mesmo problema deixaria
  duas respostas diferentes para "quanto tempo o sistema espera".
*/
const ATRASO_GRAVACAO_MS = 700;

/*
  Espelho das regras do backend (`listaPreferenciasValidators.js`): 160
  caracteres, minúsculas, e `:` aceito. Elas são validadas AQUI antes de
  qualquer envio porque a adoção é tudo-ou-nada: uma entrada que o servidor
  recusa reprova o lote INTEIRO e nada é gravado. Chave que não passa aqui
  não vira erro na tela — a tabela simplesmente segue no localStorage, como
  hoje.
*/
const LISTA_MAX = 160;
const LISTA_PADRAO = /^[a-z0-9_:-]+$/;

/* Tetos do lote de adoção, também espelhados do backend: 100 itens e 1MB
   somados por chamada. O corte de bytes fica em 700KB para o erro nunca
   vir do servidor por uma diferença de contagem. */
const ADOCAO_MAX_ITENS = 100;
const ADOCAO_MAX_BYTES = 700 * 1024;

/* Marca de "já adotei", POR USUÁRIO: duas pessoas dividem o mesmo
   navegador em várias obras deste cliente, e uma marca global faria a
   segunda nunca adotar a própria configuração. */
function chaveDaMarcaDeAdocao(usuarioId) {
  return `fluxy:preferencias:adotado:v1:${usuarioId}`;
}

function lerJson(chave, padrao = null) {
  if (!chave || typeof window === 'undefined') return padrao;
  try {
    const cru = window.localStorage.getItem(chave);
    return cru ? JSON.parse(cru) : padrao;
  } catch {
    return padrao;
  }
}

function gravarJson(chave, valor) {
  if (!chave || typeof window === 'undefined') return;
  try { window.localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem storage */ }
}

function removerChave(chave) {
  if (!chave || typeof window === 'undefined') return;
  try { window.localStorage.removeItem(chave); } catch { /* sem storage */ }
}

function ehObjeto(valor) {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

/*
  ESPELHO LOCAL — o de/para entre os TIPOS do banco e as CHAVES ANTIGAS do
  navegador. Ele é o ponto que torna o rollback seguro, então mantém o
  formato exatamente como o build anterior grava e lê:

    tipo `colunas` -> `<storageKey>:colunas`     { ordem, visiveis, ocultas }
    tipo `visual`  -> `<storageKey>:alinhar`     { <colunaId>: 'left'|'center'|'right' }
                   +  `<storageKey>:modo-lista`  { numerada: boolean }

  `alinhar` e `modo-lista` viram UM registro `visual` no banco porque os
  dois respondem à mesma pergunta ("como esta tabela se parece para mim") e
  um registro por sufixo dobraria as linhas sem dobrar o significado.
*/
const ESPELHO = {
  [TIPO_COLUNAS]: {
    ler(base) {
      const valor = lerJson(`${base}:colunas`, null);
      return ehObjeto(valor) ? valor : null;
    },
    gravar(base, valor) {
      gravarJson(`${base}:colunas`, valor);
    },
    remover(base) {
      removerChave(`${base}:colunas`);
    }
  },
  [TIPO_VISUAL]: {
    ler(base) {
      const alinhamentos = lerJson(`${base}:alinhar`, null);
      const modo = lerJson(`${base}:modo-lista`, null);
      const temAlinhamentos = ehObjeto(alinhamentos) && Object.keys(alinhamentos).length > 0;
      const temModo = ehObjeto(modo) && typeof modo.numerada === 'boolean';
      if (!temAlinhamentos && !temModo) return null;
      return {
        ...(temAlinhamentos ? { alinhamentos } : {}),
        ...(temModo ? { numerada: Boolean(modo.numerada) } : {})
      };
    },
    gravar(base, valor) {
      // Só grava o sufixo que existe no valor: escrever `{}` em
      // `:alinhar` para uma tabela que só mudou o modo de lista criaria
      // ruído no navegador de todo mundo.
      if (ehObjeto(valor?.alinhamentos)) gravarJson(`${base}:alinhar`, valor.alinhamentos);
      if (typeof valor?.numerada === 'boolean') gravarJson(`${base}:modo-lista`, { numerada: valor.numerada });
    },
    remover(base) {
      removerChave(`${base}:alinhar`);
      removerChave(`${base}:modo-lista`);
    }
  }
};

const TIPOS_MIGRADOS = Object.keys(ESPELHO);

/*
  Identidade de uma tabela: a chave que a tela passa (`storageKey`) serve
  ao navegador como sempre serviu; a versão normalizada é a que o banco
  aceita. Quando a normalização falha (chave montada em tempo de execução
  com caractere fora do padrão, por exemplo), `lista` é `null` e aquela
  tabela fica SÓ no local — nenhuma capacidade se perde, e o servidor não
  leva 400 a cada arrasto.
*/
function identificar(storageKey) {
  const base = String(storageKey || '');
  if (!base) return null;
  const candidata = base.trim().toLowerCase();
  const lista = (candidata && candidata.length <= LISTA_MAX && LISTA_PADRAO.test(candidata))
    ? candidata
    : null;
  return { base, lista, id: lista || `local:${candidata}` };
}

/* =====================================================================
   O ARMAZÉM — memória única do processo.
   Fica FORA do React de propósito: a leitura precisa ser síncrona dentro
   do render (`useSyncExternalStore`), e um `useState` no provedor faria
   toda tabela do sistema re-renderizar a cada gravação de qualquer outra.
   ===================================================================== */
const armazem = {
  entradas: new Map(),   // `${id}|${tipo}` -> { base, lista, valor, doServidor }
  ouvintes: new Set(),
  timers: new Map(),
  carregado: false
};

function avisar() {
  armazem.ouvintes.forEach((ouvinte) => {
    try { ouvinte(); } catch { /* um ouvinte quebrado não derruba os outros */ }
  });
}

function registrar(storageKey, tipo) {
  const identidade = identificar(storageKey);
  if (!identidade || !ESPELHO[tipo]) return null;
  const chave = `${identidade.id}|${tipo}`;
  let entrada = armazem.entradas.get(chave);
  if (!entrada) {
    // Semeadura PREGUIÇOSA: só a tabela que de fato montou lê o
    // localStorage. Varrer as 273 chaves na abertura custaria trabalho
    // para telas que a pessoa não vai abrir.
    entrada = {
      base: identidade.base,
      lista: identidade.lista,
      valor: ESPELHO[tipo].ler(identidade.base),
      doServidor: false
    };
    armazem.entradas.set(chave, entrada);
  }
  return { chave, entrada };
}

function obter(storageKey, tipo) {
  const registro = registrar(storageKey, tipo);
  return registro ? registro.entrada.valor : null;
}

function agendarEnvio(chave) {
  if (armazem.timers.has(chave)) clearTimeout(armazem.timers.get(chave));
  armazem.timers.set(chave, setTimeout(() => {
    armazem.timers.delete(chave);
    enviar(chave, { keepalive: false });
  }, ATRASO_GRAVACAO_MS));
}

function enviar(chave, { keepalive }) {
  const entrada = armazem.entradas.get(chave);
  if (!entrada || !entrada.lista) return;
  const tipo = chave.slice(chave.lastIndexOf('|') + 1);
  /*
    Falha de rede aqui NÃO desfaz nada: o valor já está na memória (a tela
    continua certa) e no espelho local (sobrevive à recarga). O preço de um
    servidor fora é a preferência não viajar para outra máquina até a
    próxima gravação — não é a tela quebrar.
  */
  const promessa = entrada.valor === null
    ? resetListaPreferenciaTipo(entrada.lista, tipo)
    : salvarListaPreferenciasTipo(entrada.lista, tipo, entrada.valor, { keepalive });
  promessa.catch(() => {});
}

function gravar(storageKey, tipo, valor) {
  const registro = registrar(storageKey, tipo);
  if (!registro) return;
  const { chave, entrada } = registro;
  const proximo = valor === null || valor === undefined ? null : valor;
  entrada.valor = proximo;
  entrada.doServidor = false;
  if (proximo === null) ESPELHO[tipo].remover(entrada.base);
  else ESPELHO[tipo].gravar(entrada.base, proximo);
  avisar();
  agendarEnvio(chave);
}

/* Mescla parcial para o tipo `visual`, que tem DOIS donos no componente
   (o menu de alinhamento e o alternador de modo de lista). Sem a mescla,
   quem gravasse por último apagaria a escolha do outro. */
function gravarParcial(storageKey, tipo, remendo) {
  const atual = obter(storageKey, tipo);
  gravar(storageKey, tipo, { ...(ehObjeto(atual) ? atual : {}), ...remendo });
}

/* A carga única chegou: o servidor passa a mandar nas chaves que ele tem.
   As que ele NÃO tem ficam com o espelho local — é o caso de quem
   configurou nesta máquina e cuja adoção ainda não rodou (ou falhou). */
function aplicarDoServidor(listas) {
  Object.entries(listas || {}).forEach(([lista, porTipo]) => {
    if (!ehObjeto(porTipo)) return;
    TIPOS_MIGRADOS.forEach((tipo) => {
      const valor = porTipo[tipo];
      if (!ehObjeto(valor)) return;
      const chave = `${lista}|${tipo}`;
      const anterior = armazem.entradas.get(chave);
      armazem.entradas.set(chave, {
        base: anterior?.base || lista,
        lista,
        valor,
        doServidor: true
      });
      // O espelho local acompanha: é ele quem segura a próxima abertura
      // sem piscar, e é ele que o rollback vai encontrar.
      ESPELHO[tipo].gravar(anterior?.base || lista, valor);
    });
  });
  armazem.carregado = true;
  avisar();
}

/* Logout: nada do usuário anterior pode continuar em memória. As entradas
   são descartadas inteiras e voltam a nascer do espelho local — que é por
   navegador, exatamente como era antes desta mudança. */
function limpar() {
  armazem.timers.forEach((timer) => clearTimeout(timer));
  armazem.timers.clear();
  armazem.entradas.clear();
  armazem.carregado = false;
  avisar();
}

/* Descarga da página: manda AGORA o que ainda está na janela dos 700ms. */
function descarregarPendentes() {
  const chaves = Array.from(armazem.timers.keys());
  armazem.timers.forEach((timer) => clearTimeout(timer));
  armazem.timers.clear();
  chaves.forEach((chave) => enviar(chave, { keepalive: true }));
}

/* =====================================================================
   ADOÇÃO — uma vez, na primeira abertura depois do deploy.
   Três regras que este caminho não afrouxa:
     1. O BANCO SEMPRE VENCE: só sobe `(lista, tipo)` que o servidor ainda
        não tem. Quem configurou no desktop e abrir primeiro no notebook
        sobe o notebook — é o pedágio de uma vez, e está escrito no plano.
     2. NÃO APAGA o localStorage. Deploy revertido não pode custar a
        configuração do usuário.
     3. Só roda se a carga única DEU CERTO. Adotar sem saber o que o
        servidor tem seria adivinhar, e adivinhar aqui sobrescreve.
   ===================================================================== */
function varrerLocalStorage() {
  if (typeof window === 'undefined') return [];
  let chaves = [];
  try {
    chaves = Object.keys(window.localStorage);
  } catch {
    return [];
  }

  // Um registro `visual` por tabela, mesmo vindo de dois sufixos.
  const bases = new Map(); // base -> Set(tipo)
  const anotar = (base, tipo) => {
    if (!base) return;
    if (!bases.has(base)) bases.set(base, new Set());
    bases.get(base).add(tipo);
  };

  chaves.forEach((chave) => {
    if (chave.endsWith(':colunas')) anotar(chave.slice(0, -':colunas'.length), TIPO_COLUNAS);
    else if (chave.endsWith(':alinhar')) anotar(chave.slice(0, -':alinhar'.length), TIPO_VISUAL);
    else if (chave.endsWith(':modo-lista')) anotar(chave.slice(0, -':modo-lista'.length), TIPO_VISUAL);
  });

  const itens = [];
  bases.forEach((tipos, base) => {
    const identidade = identificar(base);
    // Chave que o backend recusaria não entra: o lote é tudo-ou-nada.
    if (!identidade?.lista) return;
    tipos.forEach((tipo) => {
      const valor = ESPELHO[tipo].ler(base);
      if (!ehObjeto(valor) || Object.keys(valor).length === 0) return;
      itens.push({ lista: identidade.lista, tipo, preferencias: valor });
    });
  });
  return itens;
}

async function adotarUmaVez(usuarioId) {
  if (!usuarioId || typeof window === 'undefined') return;
  const marca = chaveDaMarcaDeAdocao(usuarioId);
  if (lerJson(marca, null)) return;

  const candidatos = varrerLocalStorage().filter((item) => {
    const entrada = armazem.entradas.get(`${item.lista}|${item.tipo}`);
    // O banco sempre vence: o que já existe lá não é tocado.
    return !entrada?.doServidor;
  });

  if (candidatos.length === 0) {
    gravarJson(marca, { em: new Date().toISOString(), enviadas: 0 });
    return;
  }

  /*
    "Um lote" é a intenção, e é o que acontece na prática — mas o servidor
    trava em 100 itens e 1MB por chamada, e um usuário de longa data pode
    passar disso (o sistema tem 273 tabelas com chave). Então o envio é
    fatiado nesses mesmos limites, em ordem, e a marca de "adotado" só é
    escrita se TODAS as fatias passarem: adoção pela metade que se declara
    concluída perderia o resto para sempre.
  */
  const fatias = [];
  let fatia = [];
  let bytes = 0;
  candidatos.forEach((item) => {
    const custo = JSON.stringify(item).length;
    if (fatia.length >= ADOCAO_MAX_ITENS || (fatia.length > 0 && bytes + custo > ADOCAO_MAX_BYTES)) {
      fatias.push(fatia);
      fatia = [];
      bytes = 0;
    }
    fatia.push(item);
    bytes += custo;
  });
  if (fatia.length > 0) fatias.push(fatia);

  for (const lote of fatias) {
    // Sequencial de propósito: em paralelo, uma fatia reprovada deixaria as
    // outras gravadas e a marca não seria escrita — na abertura seguinte a
    // varredura repetiria tudo, agora contra um banco parcialmente cheio.
    // eslint-disable-next-line no-await-in-loop
    await adotarPreferencias(lote);
    lote.forEach((item) => {
      const chave = `${item.lista}|${item.tipo}`;
      const anterior = armazem.entradas.get(chave);
      armazem.entradas.set(chave, {
        base: anterior?.base || item.lista,
        lista: item.lista,
        valor: item.preferencias,
        doServidor: true
      });
    });
  }

  gravarJson(marca, { em: new Date().toISOString(), enviadas: candidatos.length });
  avisar();
}

/* =====================================================================
   O CONTEXTO
   ===================================================================== */
const PreferenciasContext = createContext({
  pronto: false,
  erro: null,
  total: 0
});

export function PreferenciasProvider({ children }) {
  const { authReady, isAuthenticated, user } = useAuth();
  const usuarioId = user?.id || null;
  // `pronto` significa "não há mais nada por vir", não "deu certo": a tela
  // abre igual nos dois casos, e nenhuma tabela espera por isto.
  const [estado, setEstado] = useState({ pronto: false, erro: null, total: 0 });

  useEffect(() => {
    if (!authReady) return undefined;
    if (!isAuthenticated || !usuarioId) {
      limpar();
      setEstado({ pronto: false, erro: null, total: 0 });
      return undefined;
    }

    let ativo = true;
    getMinhasPreferencias()
      .then(async (dados) => {
        if (!ativo) return;
        aplicarDoServidor(dados.listas);
        setEstado({ pronto: true, erro: null, total: dados.total });
        try {
          await adotarUmaVez(usuarioId);
        } catch {
          // Adoção que falha é adoção que tenta de novo na próxima
          // abertura: a marca só é escrita no sucesso, e nada foi perdido
          // porque o localStorage continua lá.
        }
      })
      .catch((erro) => {
        if (!ativo) return;
        /*
          DEGRADAÇÃO. Servidor fora, rede caída ou 500: a tela abre com o
          espelho local (ou com o padrão, se nem isso houver) e segue
          funcionando. Preferência é conforto — não pode derrubar tela.
        */
        setEstado({ pronto: true, erro: erro?.message || 'Falha ao carregar preferências', total: 0 });
      });

    return () => { ativo = false; };
  }, [authReady, isAuthenticated, usuarioId]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const aoSair = () => descarregarPendentes();
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') aoSair();
    };
    // `pagehide` cobre o que `beforeunload` não cobre no iOS/WebView, que é
    // onde este sistema também roda (Capacitor); `visibilitychange` cobre o
    // app mandado para segundo plano no celular, que nunca dispara nenhum
    // dos dois eventos de descarga.
    window.addEventListener('pagehide', aoSair);
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      window.removeEventListener('pagehide', aoSair);
      document.removeEventListener('visibilitychange', aoEsconder);
    };
  }, []);

  const valor = useMemo(() => estado, [estado]);
  return (
    <PreferenciasContext.Provider value={valor}>
      {children}
    </PreferenciasContext.Provider>
  );
}

export function usePreferencias() {
  return useContext(PreferenciasContext);
}

function assinar(ouvinte) {
  armazem.ouvintes.add(ouvinte);
  return () => armazem.ouvintes.delete(ouvinte);
}

/**
 * Leitura SÍNCRONA em render + gravação (memória, espelho local e servidor
 * com 700ms de atraso). É o substituto direto do par `lerJson`/`gravarJson`
 * que a TabelaPadrao usava: mesmo contrato, meio trocado.
 *
 * Devolve `[valor, gravar]`. `gravar(null)` é RESET explícito do usuário —
 * apaga no banco e no espelho. Não confundir com a limpeza de item que
 * sumiu do padrão da tela: essa se faz na LEITURA, filtrando, porque
 * filtrar é reversível e apagar não.
 */
export function usePreferenciaDeLista(storageKey, tipo) {
  const capturar = useCallback(() => obter(storageKey, tipo), [storageKey, tipo]);
  const valor = useSyncExternalStore(assinar, capturar, capturar);
  const definir = useCallback(
    (proximo) => gravar(storageKey, tipo, proximo),
    [storageKey, tipo]
  );
  const remendar = useCallback(
    (remendo) => gravarParcial(storageKey, tipo, remendo),
    [storageKey, tipo]
  );
  return [valor, definir, remendar];
}

export default PreferenciasContext;
