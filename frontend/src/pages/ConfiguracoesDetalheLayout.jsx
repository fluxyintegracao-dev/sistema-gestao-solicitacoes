import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import { BLOCOS_DETALHE, ORDEM_PADRAO, rotuloBloco } from './SolicitacaoDetalhe/blocosDetalhe';
import { BLOCOS_HOME, ORDEM_PADRAO_HOME, rotuloBlocoHome } from '../navigation/blocosHome';
import { getDetalheLayouts, salvarDetalheLayout, excluirDetalheLayout } from '../services/detalheLayout';

// Catálogo por tela — o MESMO motor serve o detalhe da solicitação e a
// Home; o admin escolhe a tela e configura o padrão do setor.
const TELAS = [
  { id: 'detalhe-solicitacao', rotulo: 'Detalhe da solicitação', blocos: BLOCOS_DETALHE, ordemPadrao: ORDEM_PADRAO, rotuloBloco },
  { id: 'home', rotulo: 'Início (Home)', blocos: BLOCOS_HOME, ordemPadrao: ORDEM_PADRAO_HOME, rotuloBloco: rotuloBlocoHome }
];

// =====================================================================
// LAYOUT DO DETALHE POR SETOR — Configurações
// ---------------------------------------------------------------------
// O admin define, por setor, a ORDEM dos blocos do detalhe e QUAIS
// aparecem. O usuário pode personalizar por cima (arrastar/recolher no
// próprio detalhe) e restaurar o padrão do setor. Sem configuração,
// vale o layout atual da tela. O catálogo de blocos é fixo: só se
// ordena/oculta o que a tela já tem, e as permissões continuam valendo.
// =====================================================================
export default function ConfiguracoesDetalheLayout() {
  const [setores, setSetores] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [telaSelecionada, setTelaSelecionada] = useState('detalhe-solicitacao');
  const [setorSelecionado, setSetorSelecionado] = useState('');
  const [linhas, setLinhas] = useState([]); // [{bloco, visivel}] na ordem
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      setCarregando(true);
      const [listaSetores, listaLayouts] = await Promise.all([
        getSetores().catch(() => []),
        getDetalheLayouts(null, telaSelecionada)
      ]);
      setSetores(Array.isArray(listaSetores) ? listaSetores : []);
      setLayouts(listaLayouts);
      setErro('');
    } catch (error) {
      setErro(error?.message || 'Erro ao carregar');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telaSelecionada]);

  const telaAtiva = TELAS.find((tela) => tela.id === telaSelecionada) || TELAS[0];
  const ordemPadraoTela = telaAtiva.ordemPadrao;
  const rotuloBlocoTela = telaAtiva.rotuloBloco;

  const layoutDoSetor = useMemo(() => (
    layouts.find((layout) => layout.setor === setorSelecionado) || null
  ), [layouts, setorSelecionado]);

  // Ao trocar de setor, monta as linhas: config salva ou padrão atual.
  useEffect(() => {
    if (!setorSelecionado) {
      setLinhas([]);
      return;
    }
    if (layoutDoSetor) {
      const daConfig = layoutDoSetor.config
        .slice()
        .sort((a, b) => (a.posicao ?? 0) - (b.posicao ?? 0))
        .map((item) => ({ bloco: item.bloco, visivel: item.visivel !== false }));
      const listados = new Set(daConfig.map((item) => item.bloco));
      setLinhas([
        ...daConfig,
        ...ordemPadraoTela.filter((id) => !listados.has(id)).map((id) => ({ bloco: id, visivel: true }))
      ]);
    } else {
      setLinhas(ordemPadraoTela.map((id) => ({ bloco: id, visivel: true })));
    }
  }, [setorSelecionado, layoutDoSetor, ordemPadraoTela]);

  function mover(indice, delta) {
    setLinhas((atuais) => {
      const alvo = indice + delta;
      if (alvo < 0 || alvo >= atuais.length) return atuais;
      const novas = atuais.slice();
      const [linha] = novas.splice(indice, 1);
      novas.splice(alvo, 0, linha);
      return novas;
    });
  }

  function alternarVisivel(indice) {
    setLinhas((atuais) => atuais.map((linha, i) => (
      i === indice ? { ...linha, visivel: !linha.visivel } : linha
    )));
  }

  async function salvar() {
    if (!setorSelecionado) return;
    try {
      setSalvando(true);
      const config = linhas.map((linha, indice) => ({
        bloco: linha.bloco,
        visivel: linha.visivel,
        posicao: indice
      }));
      await salvarDetalheLayout(setorSelecionado, config, telaSelecionada);
      await carregar();
      alert('Layout salvo.');
    } catch (error) {
      alert(error?.message || 'Erro ao salvar layout');
    } finally {
      setSalvando(false);
    }
  }

  async function restaurarPadrao() {
    if (!setorSelecionado || !layoutDoSetor) return;
    if (!window.confirm(`Excluir o layout do setor ${setorSelecionado} e voltar ao padrão do sistema?`)) {
      return;
    }
    try {
      await excluirDetalheLayout(setorSelecionado, telaSelecionada);
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao excluir layout');
    }
  }

  return (
    <div className="px-0 py-1 md:py-2 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">Layout por setor</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1 max-w-3xl">
          Define, por setor, a ordem dos blocos de uma tela e quais aparecem — o detalhe
          da solicitação e a Home usam o mesmo motor.
          O usuário pode personalizar por cima e restaurar o padrão do setor quando quiser.
          Sem configuração, vale o layout atual — as permissões e as condições de cada bloco
          continuam decidindo se ele pode aparecer.
        </p>
      </div>

      {erro && <div className="app-alert app-alert--error" role="alert">{erro}</div>}

      <div className="card space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm text-[var(--c-muted)]">
            Tela
            <select
              className="input mt-1"
              value={telaSelecionada}
              onChange={(event) => setTelaSelecionada(event.target.value)}
            >
              {TELAS.map((tela) => (
                <option key={tela.id} value={tela.id}>{tela.rotulo}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[var(--c-muted)]">
            Setor
            <select
              className="input mt-1"
              value={setorSelecionado}
              onChange={(event) => setSetorSelecionado(String(event.target.value).toUpperCase())}
            >
              <option value="">Selecione…</option>
              {setores.map((setor) => (
                <option key={setor.id} value={String(setor.codigo || setor.nome).toUpperCase()}>
                  {setor.nome}
                </option>
              ))}
            </select>
          </label>
          {setorSelecionado && (
            <p className="self-end text-sm text-[var(--c-muted)]">
              {layoutDoSetor
                ? 'Este setor tem layout próprio salvo.'
                : 'Este setor ainda usa o layout padrão do sistema.'}
            </p>
          )}
        </div>

        {carregando && <p className="text-sm text-[var(--c-muted)]">Carregando…</p>}

        {!carregando && setorSelecionado && (
          <>
            <ul className="space-y-1" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {linhas.map((linha, indice) => (
                <li
                  key={linha.bloco}
                  className="flex items-center gap-3 rounded-lg border border-[var(--ui-border)] px-3 py-2"
                >
                  <span className="text-xs font-bold text-[var(--c-muted)] w-6 text-right">
                    {indice + 1}.
                  </span>
                  <span className={`flex-1 text-sm font-semibold ${linha.visivel ? '' : 'line-through text-[var(--c-muted)]'}`}>
                    {rotuloBlocoTela(linha.bloco)}
                  </span>
                  <label className="inline-flex items-center gap-2 text-sm text-[var(--c-muted)]">
                    <input
                      type="checkbox"
                      checked={linha.visivel}
                      onChange={() => alternarVisivel(indice)}
                    />
                    visível
                  </label>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => mover(indice, -1)}
                    disabled={indice === 0}
                    aria-label={`Subir ${rotuloBlocoTela(linha.bloco)}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => mover(indice, 1)}
                    disabled={indice === linhas.length - 1}
                    aria-label={`Descer ${rotuloBlocoTela(linha.bloco)}`}
                  >
                    ↓
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-between gap-3">
              <button
                type="button"
                className="btn btn-outline"
                onClick={restaurarPadrao}
                disabled={!layoutDoSetor}
              >
                Excluir layout do setor
              </button>
              <button type="button" className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar layout do setor'}
              </button>
            </div>
          </>
        )}

        {!carregando && !setorSelecionado && (
          <p className="text-sm text-[var(--c-muted)]">
            Selecione um setor para configurar. Blocos do catálogo: {telaAtiva.blocos.map((b) => b.rotulo).join(' · ')}.
          </p>
        )}
      </div>
    </div>
  );
}
