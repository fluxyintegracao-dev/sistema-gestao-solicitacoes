import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import {
  getSetoresAlteracaoStatusLivre,
  salvarSetoresAlteracaoStatusLivre
} from '../services/configuracoesSistema';

function normalizarTokenSetor(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

export default function SetoresAlteracaoStatusLivre() {
  const [setores, setSetores] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [listaSetores, cfg] = await Promise.all([
          getSetores({ incluirInativos: true }),
          getSetoresAlteracaoStatusLivre()
        ]);

        setSetores(Array.isArray(listaSetores) ? listaSetores : []);
        const listaCfg = Array.isArray(cfg?.setores) ? cfg.setores : [];
        setSelecionados(new Set(listaCfg.map(normalizarTokenSetor)));
      } catch (error) {
        console.error(error);
        alert('Erro ao carregar configuracao.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const setoresOrdenados = useMemo(() => {
    return [...setores].sort((a, b) =>
      String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' })
    );
  }, [setores]);

  function alternarSetor(setor) {
    const token = normalizarTokenSetor(setor?.codigo || setor?.nome);
    if (!token) return;

    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(token)) {
        next.delete(token);
      } else {
        next.add(token);
      }
      return next;
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      await salvarSetoresAlteracaoStatusLivre({ setores: Array.from(selecionados) });
      alert('Configuracao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar configuracao.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <p>Carregando configuracao...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Setores com alteracao livre de status</h1>
        <p className="text-sm text-gray-600 mt-1">
          Setores marcados podem alterar o status de solicitacoes mesmo quando elas estiverem em outro setor.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {setoresOrdenados.map(setor => {
            const token = normalizarTokenSetor(setor?.codigo || setor?.nome);
            const marcado = selecionados.has(token);
            return (
              <label key={setor.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternarSetor(setor)}
                />
                <span>
                  {setor.nome} ({setor.codigo || '-'})
                  {setor.ativo === false ? ' - Inativo' : ''}
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
            {salvando ? 'Salvando...' : 'Salvar configuracao'}
          </button>
        </div>
      </div>
    </div>
  );
}
