/*
 * FIXTURE VIVA DA BARRA DO TOPO — o `Layout` REAL, com o CSS real, na rota
 * que a prova pedir.
 * ============================================================================
 *
 * POR QUE O `Layout` INTEIRO e não uma cópia da barra. O defeito medido é de
 * GEOMETRIA DE FLEXBOX entre irmãos (`.fx-topbar-nav` × `.fx-topbar-tray`) e
 * entre netos (`.fx-atalhos-area` e os seus botões). Uma reprodução do DOM
 * carregaria as classes e perderia justamente o que decide: quantos filhos
 * a barra tem naquela rota, se o `.compras-responsive-scope` está no
 * `.layout-content-shell` (13 prefixos de rota no `Layout.jsx`), e o que o
 * `AtalhosTopbar` renderiza depois do `ResizeObserver`.
 *
 * O QUE A FIXTURE SUBSTITUI, e só isto: o `AuthProvider` (que faz sessão por
 * rede) por um `AuthContext.Provider` com um usuário fixo. Todo o resto é o
 * componente de produção — inclusive o `AtalhosProvider`, que tenta a rede,
 * falha contra `127.0.0.1:1` e cai nas SUGESTOES_PADRAO, exatamente como
 * cairia num usuário novo.
 *
 * `?rota=` escolhe a rota (é ela que liga ou não o escopo de Compras).
 * `?d=` planta um defeito conhecido — `antesDaCorrecao` devolve as quatro
 * declarações de antes de 06/09, e `soAreaDeAtalhos` devolve só as duas da
 * área de atalhos. Prova que não reprova o defeito conhecido não está
 * medindo nada.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../../src/contexts/AuthContext';
import Layout from '../../src/layout/Layout';

const PARAMS = new URLSearchParams(window.location.search);
const ROTA = PARAMS.get('rota') || '/';
const D = PARAMS.get('d') || '';

/*
  O USUÁRIO. SUPERADMIN para que a trilha resolva em qualquer rota do
  sistema (a trilha lê a mesma fonte única dos hubs, e ela filtra por
  permissão); setor COMPRAS porque é o setor das 28 telas reprovadas e
  porque é ele que decide as SUGESTOES_PADRAO da fileira de atalhos — quem
  tem atalho tem o botão "»", que é um dos que se atravessam.
*/
const USUARIO = {
  id: 1,
  nome: 'Ana Paula Figueiredo',
  perfil: 'SUPERADMIN',
  area: 'COMPRAS',
  setor: { codigo: 'COMPRAS', nome: 'Compras' },
  tela_inicial: null
};

const AUTH = {
  user: USUARIO,
  token: 'fixture',
  isAuthenticated: true,
  authReady: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  refreshSession: () => {}
};

/*
  OS DEFEITOS PLANTADOS — dois, porque a correção tem duas metades.

  `antesDaCorrecao`: base ZERO na navegação (`flex: 1 1 0%`). Com base
  zero, o tamanho da navegação NÃO entra na decisão de quebra da barra:
  ela nunca quebra por causa da navegação, dá a ela só a sobra da bandeja,
  e os filhos (que não encolhem) transbordam — por cima da bandeja quando
  a bandeja cabe na mesma fileira (as 28 telas de Compras, onde a folha do
  módulo encolhe os botões da bandeja), ou para fora da janela quando ela
  não cabe (as outras 165, onde o `overflow-x: clip` do shell come os três
  botões de tela).

  `soAreaDeAtalhos`: a outra metade, sozinha.
*/
const CSS_DEFEITOS = {
  /* A folha EXATA de antes de 06/09, nas quatro declarações que mudaram. */
  antesDaCorrecao: `
    .fx-topbar-nav { flex: 1 1 0% !important; min-width: 0 !important; }
    .fx-atalhos-area { flex: 1 1 0% !important; }
    .fx-atalhos-fileira { flex: 0 1 auto !important; }
    .fx-topbar-tray { flex-wrap: nowrap !important; }
  `,
  /* Só a metade da correção que mora na ÁREA DE ATALHOS. A barra continua
     quebrando certo (a navegação tem base `auto`), mas a área volta a ter
     base zero: os três botões de tela deixam de ter espaço reservado e
     saem para fora. Serve para provar que a segunda declaração também é
     carregada — meia correção medida como inteira é o jeito de a outra
     metade voltar sozinha na próxima leva. */
  soAreaDeAtalhos: `
    .fx-atalhos-area { flex: 1 1 0% !important; }
    .fx-atalhos-fileira { flex: 0 1 auto !important; }
  `
};

function Corpo() {
  return <div className="prova-corpo" style={{ height: '1400px' }} />;
}

function App() {
  return (
    <AuthContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={[ROTA]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="*" element={<Corpo />} />
          </Route>
        </Routes>
        {CSS_DEFEITOS[D] && <style>{CSS_DEFEITOS[D]}</style>}
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
