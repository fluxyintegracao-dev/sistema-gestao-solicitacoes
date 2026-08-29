import { useEffect, useMemo, useState } from 'react';
import {
  getContratoObraCategorias,
  salvarContratoObraCategorias
} from '../services/configuracoesSistema';

// O cadastro tem 160 categorias a pagar; quem filtra costuma digitar sem acento.
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Curadoria das categorias financeiras liberadas para o contrato de obra.
 *
 * Nao cadastra categoria: seleciona, sobre o cadastro existente, quais aparecem para o
 * solicitante. Sem isso a escolha seria feita numa lista de 160 itens.
 */
export default function ContratoObraCategorias() {
  const [disponiveis, setDisponiveis] = useState([]);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [invalidas, setInvalidas] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [somenteSelecionadas, setSomenteSelecionadas] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getContratoObraCategorias();
        setDisponiveis(Array.isArray(data?.categorias_disponiveis) ? data.categorias_disponiveis : []);
        setSelecionadas(new Set((data?.categoria_ids || []).map(Number)));
        setInvalidas(data?.categorias_invalidas || []);
      } catch {
        setErro('Nao foi possivel carregar as categorias.');
      } finally {
        setCarregando(false);
      }
    }
    load();
  }, []);

  const visiveis = useMemo(() => {
    const termo = normalizar(filtro);
    return disponiveis.filter((c) => {
      if (somenteSelecionadas && !selecionadas.has(Number(c.id))) return false;
      if (!termo) return true;
      return normalizar(`${c.nome} ${c.dre_grupo || ''}`).includes(termo);
    });
  }, [disponiveis, filtro, somenteSelecionadas, selecionadas]);

  // Agrupa por grupo da DRE: com 160 itens, a lista plana e dificil de percorrer.
  const porGrupo = useMemo(() => {
    const mapa = new Map();
    visiveis.forEach((c) => {
      const grupo = c.dre_grupo || 'Sem grupo na DRE';
      if (!mapa.has(grupo)) mapa.set(grupo, []);
      mapa.get(grupo).push(c);
    });
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visiveis]);

  function alternar(id) {
    setSelecionadas((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function marcarVisiveis(marcar) {
    setSelecionadas((prev) => {
      const proximo = new Set(prev);
      visiveis.forEach((c) => (marcar ? proximo.add(Number(c.id)) : proximo.delete(Number(c.id))));
      return proximo;
    });
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    setAviso('');
    try {
      const data = await salvarContratoObraCategorias([...selecionadas]);
      setSelecionadas(new Set((data?.categoria_ids || []).map(Number)));
      setInvalidas(data?.categorias_invalidas || []);
      setAviso('Categorias salvas.');
    } catch {
      setErro('Nao foi possivel salvar as categorias.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="page solicitacoes-page">
        <h1 className="page-title">Categorias do contrato de obra</h1>
        <div className="card">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="page solicitacoes-page">
      <div>
        <h1 className="page-title">Categorias do contrato de obra</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--c-muted)' }}>
          Marque quais categorias financeiras ficam disponiveis ao criar um contrato de obra.
          Somente categorias que aceitam titulo a pagar aparecem aqui.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            className="input"
            placeholder="Filtrar por nome ou grupo da DRE"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={{ minWidth: 280 }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={somenteSelecionadas}
              onChange={(e) => setSomenteSelecionadas(e.target.checked)}
            />
            <span>Somente marcadas</span>
          </label>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => marcarVisiveis(true)}>
            Marcar visiveis
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => marcarVisiveis(false)}>
            Desmarcar visiveis
          </button>
          <span className="text-sm" style={{ color: 'var(--c-muted)' }}>
            {selecionadas.size} de {disponiveis.length} marcadas
          </span>
        </div>

        {erro && <div className="app-alert app-alert--error">{erro}</div>}
        {aviso && <div className="app-alert app-alert--success">{aviso}</div>}

        {selecionadas.size === 0 && (
          <div className="app-alert app-alert--error">
            Nenhuma categoria marcada — o contrato de obra ficara sem opcao de categoria.
          </div>
        )}

        {invalidas.length > 0 && (
          <div className="app-alert app-alert--error">
            {invalidas.length} categoria(s) marcada(s) foram inativadas no cadastro. Revise a selecao.
          </div>
        )}

        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {porGrupo.map(([grupo, itens]) => (
            <div key={grupo} style={{ marginBottom: 16 }}>
              <div
                className="text-xs"
                style={{ fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-muted)', marginBottom: 6 }}
              >
                {grupo} ({itens.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {itens.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selecionadas.has(Number(c.id))}
                      onChange={() => alternar(Number(c.id))}
                    />
                    <span>{c.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {porGrupo.length === 0 && (
            <div className="text-sm" style={{ color: 'var(--c-muted)' }}>
              Nenhuma categoria encontrada com os filtros atuais.
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
