import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import {
  getSetoresCriacaoTodasObras,
  salvarSetoresCriacaoTodasObras
} from '../services/configuracoesSistema';

export default function SetoresCriacaoTodasObras() {
  const [setores, setSetores] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function load() {
      const [listaSetores, cfg] = await Promise.all([
        getSetores(),
        getSetoresCriacaoTodasObras()
      ]);

      const ativos = Array.isArray(listaSetores)
        ? listaSetores.filter(item => item?.ativo !== false)
        : [];
      setSetores(ativos);

      const listaCfg = Array.isArray(cfg?.setores) ? cfg.setores : [];
      setSelecionados(new Set(listaCfg.map(item => String(item || '').toUpperCase())));
    }
    load();
  }, []);

  const setoresOrdenados = useMemo(() => {
    return [...setores].sort((a, b) =>
      String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' })
    );
  }, [setores]);

  function alternarSetor(codigo) {
    const key = String(codigo || '').toUpperCase();
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      await salvarSetoresCriacaoTodasObras({ setores: Array.from(selecionados) });
      alert('Configuração salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configuração.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Setores com criação em todas as obras</h1>
        <p className="text-sm text-gray-600 mt-1">
          Setores marcados podem criar solicitação em qualquer obra na tela de Nova Solicitação.
          A visibilidade das solicitações continua seguindo as regras atuais.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {setoresOrdenados.map(setor => {
            const codigo = String(setor?.codigo || '').toUpperCase();
            const marcado = selecionados.has(codigo);
            return (
              <label key={setor.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternarSetor(codigo)}
                />
                <span>
                  {setor.nome} ({codigo})
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

