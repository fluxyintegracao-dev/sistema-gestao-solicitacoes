import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import { getAllDestinations } from '../navigation/navigationConfig';
import {
  getAtalhosSetor,
  criarAtalhoSetor,
  atualizarAtalhoSetor,
  excluirAtalhoSetor
} from '../services/atalhos';

// =====================================================================
// ATALHOS POR SETOR — Configurações
// ---------------------------------------------------------------------
// O admin define os atalhos com que cada setor começa. Até 2 podem ser
// OBRIGATÓRIOS (cadeado — o usuário não remove); os demais são sugestões
// removíveis. O destino referencia a fonte única de navegação: rótulo,
// ícone, rota e permissão vêm de lá — usuário sem acesso ao destino
// simplesmente não vê o atalho.
// =====================================================================
export default function ConfiguracoesAtalhosSetor() {
  const [itens, setItens] = useState([]);
  const [setores, setSetores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ setor: '', destino_id: '', obrigatorio: false, posicao: 0 });

  const destinos = useMemo(() => (
    getAllDestinations().sort((a, b) => `${a.moduleId} ${a.label}`.localeCompare(`${b.moduleId} ${b.label}`))
  ), []);
  const rotuloDestino = useMemo(() => {
    const mapa = new Map(destinos.map((destino) => [destino.id, `${destino.label} (${destino.moduleId})`]));
    return (id) => mapa.get(id) || id;
  }, [destinos]);

  async function carregar() {
    try {
      setCarregando(true);
      const [lista, listaSetores] = await Promise.all([
        getAtalhosSetor(),
        getSetores().catch(() => [])
      ]);
      setItens(lista);
      setSetores(Array.isArray(listaSetores) ? listaSetores : []);
      setErro('');
    } catch (error) {
      setErro(error?.message || 'Erro ao carregar');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar() {
    if (!form.setor || !form.destino_id) {
      alert('Informe o setor e o destino.');
      return;
    }
    try {
      setSalvando(true);
      await criarAtalhoSetor(form);
      setForm({ setor: '', destino_id: '', obrigatorio: false, posicao: 0 });
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao criar atalho');
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(item, campo) {
    try {
      await atualizarAtalhoSetor(item.id, { [campo]: !item[campo] });
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao atualizar');
    }
  }

  async function excluir(item) {
    if (!window.confirm(`Remover o atalho "${rotuloDestino(item.destino_id)}" do setor ${item.setor}?`)) {
      return;
    }
    try {
      await excluirAtalhoSetor(item.id);
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao excluir');
    }
  }

  return (
    <div className="px-0 py-1 md:py-2 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">Atalhos por setor</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1 max-w-3xl">
          Atalhos com que cada setor começa. Até 2 por setor podem ser marcados como
          obrigatórios — aparecem com cadeado, à esquerda dos pessoais, e o usuário não
          remove. Os demais são sugestões que o usuário pode remover ou reordenar.
          Usuário sem permissão no destino não vê o atalho.
        </p>
      </div>

      {erro && <div className="app-alert app-alert--error" role="alert">{erro}</div>}

      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-[var(--c-text)]">Novo atalho padrão</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block text-sm text-[var(--c-muted)]">
            Setor
            <select
              className="input mt-1"
              value={form.setor}
              onChange={(event) => setForm((prev) => ({ ...prev, setor: event.target.value }))}
            >
              <option value="">Selecione…</option>
              {setores.map((setor) => (
                <option key={setor.id} value={setor.codigo || setor.nome}>
                  {setor.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[var(--c-muted)]">
            Destino
            <select
              className="input mt-1"
              value={form.destino_id}
              onChange={(event) => setForm((prev) => ({ ...prev, destino_id: event.target.value }))}
            >
              <option value="">Selecione…</option>
              {destinos.map((destino) => (
                <option key={destino.id} value={destino.id}>
                  {destino.label} ({destino.moduleId})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[var(--c-muted)]">
            Posição
            <input
              className="input mt-1"
              type="number"
              min="0"
              value={form.posicao}
              onChange={(event) => setForm((prev) => ({ ...prev, posicao: Number(event.target.value) }))}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-[var(--c-text)]">
            <input
              type="checkbox"
              checked={form.obrigatorio}
              onChange={(event) => setForm((prev) => ({ ...prev, obrigatorio: event.target.checked }))}
            />
            Obrigatório (máx. 2 por setor)
          </label>
        </div>
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={adicionar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Adicionar atalho'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-[var(--c-text)] mb-3">Atalhos configurados</h2>
        {carregando ? (
          <p className="text-sm text-[var(--c-muted)]">Carregando…</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-[var(--c-muted)]">
            Nenhum atalho configurado — cada setor recebe as sugestões padrão do sistema.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--c-muted)]">
                  <th className="py-2 pr-3">Setor</th>
                  <th className="py-2 pr-3">Destino</th>
                  <th className="py-2 pr-3">Posição</th>
                  <th className="py-2 pr-3">Obrigatório</th>
                  <th className="py-2 pr-3">Ativo</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--ui-border)]">
                    <td className="py-2 pr-3 font-semibold">{item.setor}</td>
                    <td className="py-2 pr-3">{rotuloDestino(item.destino_id)}</td>
                    <td className="py-2 pr-3">{item.posicao}</td>
                    <td className="py-2 pr-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(item.obrigatorio)}
                          onChange={() => alternar(item, 'obrigatorio')}
                        />
                        <span>{item.obrigatorio ? 'Sim' : 'Não'}</span>
                      </label>
                    </td>
                    <td className="py-2 pr-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(item.ativo)}
                          onChange={() => alternar(item, 'ativo')}
                        />
                        <span>{item.ativo ? 'Sim' : 'Não'}</span>
                      </label>
                    </td>
                    <td className="py-2 text-right">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => excluir(item)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
