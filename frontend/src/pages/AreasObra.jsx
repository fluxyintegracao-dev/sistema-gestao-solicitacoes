import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import { getAreasObra, salvarAreasObra } from '../services/configuracoesSistema';
import { Pagina, PageHeader, BlocoConteudo } from '../components/padrao';

export default function AreasObra() {
  const [setores, setSetores] = useState([]);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function load() {
      const [listaSetores, cfg] = await Promise.all([
        getSetores(),
        getAreasObra()
      ]);
      const areas = Array.isArray(cfg?.areas) ? cfg.areas : [];
      setSelecionadas(new Set(areas.map(a => String(a).toUpperCase())));
      setSetores(Array.isArray(listaSetores) ? listaSetores : []);
    }
    load();
  }, []);

  const setoresOrdenados = useMemo(() => {
    return [...setores].sort((a, b) => {
      const nomeA = String(a?.nome || '').toUpperCase();
      const nomeB = String(b?.nome || '').toUpperCase();
      return nomeA.localeCompare(nomeB);
    });
  }, [setores]);

  const totalMarcadas = useMemo(() => (
    setoresOrdenados.filter(s => selecionadas.has(String(s.codigo || '').toUpperCase())).length
  ), [setoresOrdenados, selecionadas]);

  function alternar(codigo) {
    const key = String(codigo || '').toUpperCase();
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selecionarTodas() {
    setSelecionadas(new Set(setores.map(s => String(s.codigo || '').toUpperCase())));
  }

  function limparSelecao() {
    setSelecionadas(new Set());
  }

  async function salvar() {
    try {
      setSalvando(true);
      await salvarAreasObra({ areas: Array.from(selecionadas) });
      alert('Configuracao salva com sucesso');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configuracao');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Pagina>
      <PageHeader
        titulo="Areas visiveis para OBRA"
        subtitulo="Marque quais areas os usuarios do setor OBRA podem selecionar na tela de Nova Solicitacao."
        acaoPrincipal={{
          rotulo: salvando ? 'Salvando...' : 'Salvar',
          onClick: salvar,
          desabilitada: salvando
        }}
      />

      <BlocoConteudo
        titulo={`Areas selecionaveis (${totalMarcadas} de ${setoresOrdenados.length} selecionadas)`}
        variante="primario"
        cor="var(--c-primary)"
        acoes={(
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={selecionarTodas}>
              Selecionar todas
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={limparSelecao}>
              Limpar selecao
            </button>
          </>
        )}
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {setoresOrdenados.map(setor => {
            const codigo = String(setor.codigo || '').toUpperCase();
            const marcado = selecionadas.has(codigo);
            return (
              <label key={setor.id} className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternar(codigo)}
                />
                <span>
                  {setor.nome} ({codigo})
                </span>
              </label>
            );
          })}
        </div>
      </BlocoConteudo>
    </Pagina>
  );
}
