import { useEffect, useState } from 'react';
import { TabelaPadrao } from '../components/padrao';
import { getSetores } from '../services/setores';
import {
  CATALOGO_ACOES_PRINCIPAIS,
  getAcoesPrincipais,
  criarAcaoPrincipal,
  atualizarAcaoPrincipal,
  excluirAcaoPrincipal
} from '../services/acoesPrincipais';

// =====================================================================
// AÇÃO PRINCIPAL POR SETOR — Configurações
// ---------------------------------------------------------------------
// Mapeia setor + estado (status_global) → ação em destaque no topo do
// detalhe da solicitação. Estado vazio = qualquer estado (curinga); o
// match mais específico vence. Sem mapeamento, o detalhe mantém as ações
// genéricas atuais. O catálogo referencia SOMENTE ações que a tela de
// detalhe já executa — nada de regra nova.
// =====================================================================
export default function ConfiguracoesAcoesPrincipais() {
  const [itens, setItens] = useState([]);
  const [setores, setSetores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ setor: '', status_global: '', acao: '', rotulo: '' });

  async function carregar() {
    try {
      setCarregando(true);
      const [lista, listaSetores] = await Promise.all([
        getAcoesPrincipais(),
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
    if (!form.setor || !form.acao) {
      alert('Informe o setor e a ação.');
      return;
    }
    try {
      setSalvando(true);
      await criarAcaoPrincipal(form);
      setForm({ setor: '', status_global: '', acao: '', rotulo: '' });
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao criar mapeamento');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(item) {
    try {
      await atualizarAcaoPrincipal(item.id, { ativo: !item.ativo });
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao atualizar');
    }
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir o mapeamento de ${item.setor}${item.status_global ? ` + "${item.status_global}"` : ''}?`)) {
      return;
    }
    try {
      await excluirAcaoPrincipal(item.id);
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao excluir');
    }
  }

  const rotuloAcao = (valor) => (
    CATALOGO_ACOES_PRINCIPAIS.find((acao) => acao.valor === valor)?.rotulo || valor
  );

  return (
    <div className="px-0 py-1 md:py-2 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">Ação principal por setor</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1 max-w-3xl">
          Define qual ação aparece em destaque no topo da solicitação para cada setor e estado.
          Estado em branco vale para qualquer estado; o mapeamento mais específico vence.
          Sem mapeamento, a tela mantém as ações genéricas. A ação só é destacada para quem
          tem permissão de executá-la — as permissões atuais continuam valendo.
        </p>
      </div>

      {erro && <div className="app-alert app-alert--error" role="alert">{erro}</div>}

      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-[var(--c-text)]">Novo mapeamento</h2>
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
            Estado (status global)
            <input
              className="input mt-1"
              type="text"
              placeholder="Vazio = qualquer estado"
              value={form.status_global}
              onChange={(event) => setForm((prev) => ({ ...prev, status_global: event.target.value }))}
            />
          </label>
          <label className="block text-sm text-[var(--c-muted)]">
            Ação em destaque
            <select
              className="input mt-1"
              value={form.acao}
              onChange={(event) => setForm((prev) => ({ ...prev, acao: event.target.value }))}
            >
              <option value="">Selecione…</option>
              {CATALOGO_ACOES_PRINCIPAIS.map((acao) => (
                <option key={acao.valor} value={acao.valor}>{acao.rotulo}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[var(--c-muted)]">
            Rótulo do botão (opcional)
            <input
              className="input mt-1"
              type="text"
              placeholder="Ex.: Gerar conta"
              value={form.rotulo}
              onChange={(event) => setForm((prev) => ({ ...prev, rotulo: event.target.value }))}
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={adicionar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Adicionar mapeamento'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-[var(--c-text)] mb-3">Mapeamentos</h2>
        <TabelaPadrao
          colunas={[
            {
              id: 'setor',
              titulo: 'Setor',
              // R17: o setor é quem nomeia o mapeamento desta lista.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => item.setor
            },
            {
              id: 'status_global',
              titulo: 'Estado',
              tipo: 'texto',
              render: (item) => (
                item.status_global || <em className="text-[var(--c-muted)]">qualquer estado</em>
              )
            },
            {
              id: 'acao',
              titulo: 'Ação',
              tipo: 'texto',
              render: (item) => rotuloAcao(item.acao)
            },
            {
              id: 'rotulo',
              titulo: 'Rótulo',
              tipo: 'texto',
              render: (item) => item.rotulo || '-'
            },
            {
              id: 'ativo',
              titulo: 'Ativo',
              tipo: 'status',
              render: (item) => (
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(item.ativo)} onChange={() => alternarAtivo(item)} />
                  <span>{item.ativo ? 'Sim' : 'Não'}</span>
                </label>
              )
            }
          ]}
          itens={itens}
          getId={(item) => item.id}
          carregando={carregando}
          storageKey="tabela:configuracoes-acoes-principais"
          rotuloRolagem="Mapeamentos de ação principal"
          vazio="Nenhum mapeamento — o detalhe da solicitação segue com as ações genéricas."
          acoesLinha={(item) => (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => excluir(item)}>
              Excluir
            </button>
          )}
          larguraAcoes={120}
        />
      </div>
    </div>
  );
}
