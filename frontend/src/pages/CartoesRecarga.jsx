import { useEffect, useMemo, useState } from 'react';
import { buscarParceiros } from '../services/parceiros';
import { listarCartoesRecargaAdmin, salvarCartaoRecarga } from '../services/recargasCartao';

const FORM_VAZIO = {
  nome: '',
  identificador: '',
  ultimos_quatro: '',
  parceiro_id: '',
  parceiro_nome: '',
  usuario_ids: [],
  observacoes: '',
  ativo: true
};

function normalizarLista(data) {
  if (Array.isArray(data)) return data;
  return data?.items || data?.rows || data?.data || [];
}

export default function CartoesRecarga() {
  const [dados, setDados] = useState({ cartoes: [], usuarios: [] });
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [fornecedores, setFornecedores] = useState([]);
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      setDados(await listarCartoesRecargaAdmin());
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  useEffect(() => {
    const termo = buscaFornecedor.trim();
    if (!termo || form.parceiro_id) {
      setFornecedores([]);
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      buscarParceiros({ q: termo, fornecedor: 1, ativo: 1, limit: 10 })
        .then((resultado) => setFornecedores(normalizarLista(resultado)))
        .catch(() => setFornecedores([]));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [buscaFornecedor, form.parceiro_id]);

  const usuariosFiltrados = useMemo(() => {
    const termo = buscaUsuario.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return dados.usuarios || [];
    return (dados.usuarios || []).filter((usuario) => `${usuario.nome} ${usuario.email}`.toLocaleLowerCase('pt-BR').includes(termo));
  }, [dados.usuarios, buscaUsuario]);

  function novo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setBuscaFornecedor('');
    setBuscaUsuario('');
    setErro('');
    setSucesso('');
  }

  function editar(cartao) {
    setEditandoId(cartao.id);
    setForm({
      nome: cartao.nome || '',
      identificador: cartao.identificador || '',
      ultimos_quatro: cartao.ultimos_quatro || '',
      parceiro_id: cartao.parceiro_id || cartao.parceiro?.id || '',
      parceiro_nome: cartao.parceiro?.nome || '',
      usuario_ids: (cartao.vinculosUsuarios || []).filter((item) => item.ativo !== false).map((item) => Number(item.user_id || item.usuario?.id)),
      observacoes: cartao.observacoes || '',
      ativo: cartao.ativo !== false
    });
    setBuscaFornecedor(cartao.parceiro?.nome || '');
    setBuscaUsuario('');
    setErro('');
    setSucesso('');
  }

  function alternarUsuario(usuarioId) {
    setForm((atual) => {
      const ids = new Set(atual.usuario_ids.map(Number));
      if (ids.has(Number(usuarioId))) ids.delete(Number(usuarioId));
      else ids.add(Number(usuarioId));
      return { ...atual, usuario_ids: [...ids] };
    });
  }

  async function salvar(event) {
    event.preventDefault();
    if (salvando) return;
    setSalvando(true);
    setErro('');
    setSucesso('');
    try {
      const estavaEditando = Boolean(editandoId);
      await salvarCartaoRecarga({ ...form, ultimos_quatro: String(form.ultimos_quatro).replace(/\D/g, '') }, editandoId);
      await carregar();
      novo();
      setSucesso(estavaEditando ? 'Alterações do cartão salvas.' : 'Cartão cadastrado.');
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--c-border)] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--c-text)]">Cartões de recarga</h1>
          <p className="text-sm text-[var(--c-muted)]">Cadastre os cartões Flash e defina quais usuários podem solicitá-los.</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={novo}>Novo cartão</button>
      </header>

      {erro ? <div className="app-alert app-alert--error">{erro}</div> : null}
      {sucesso ? <div className="app-alert app-alert--success" role="status">{sucesso}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]">
        <section className="overflow-x-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-card)]">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-[var(--c-surface-alt)] text-left text-xs uppercase text-[var(--c-muted)]">
              <tr><th className="px-3 py-2">Cartão</th><th className="px-3 py-2">Usuários</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Ação</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {carregando ? <tr><td colSpan="4" className="px-3 py-4 text-[var(--c-muted)]">Carregando...</td></tr> : null}
              {!carregando && !(dados.cartoes || []).length ? <tr><td colSpan="4" className="px-3 py-4 text-[var(--c-muted)]">Nenhum cartão cadastrado.</td></tr> : null}
              {(dados.cartoes || []).map((cartao) => (
                <tr key={cartao.id} className={Number(editandoId) === Number(cartao.id) ? 'bg-[var(--c-surface-alt)]' : ''}>
                  <td className="px-3 py-2"><strong className="block">{cartao.nome}</strong><span className="text-xs text-[var(--c-muted)]">{cartao.identificador} · final {cartao.ultimos_quatro}</span></td>
                  <td className="px-3 py-2 tabular-nums">{(cartao.vinculosUsuarios || []).filter((item) => item.ativo !== false).length}</td>
                  <td className="px-3 py-2">{cartao.ativo !== false ? 'Ativo' : 'Inativo'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => editar(cartao)}
                      aria-label={`Editar cartão ${cartao.nome}`}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <form className="card space-y-4" onSubmit={salvar}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--c-border)] pb-3">
            <h2 className="text-base font-semibold">{editandoId ? 'Editar cartão' : 'Novo cartão'}</h2>
            {editandoId ? <span className="text-xs font-medium text-[var(--c-muted)]">Cadastro #{editandoId}</span> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">Nome de identificação *<input className="input input-sm" value={form.nome} onChange={(e) => setForm((v) => ({ ...v, nome: e.target.value }))} required /></label>
            <label className="grid gap-1 text-sm">Identificador interno *<input className="input input-sm" value={form.identificador} onChange={(e) => setForm((v) => ({ ...v, identificador: e.target.value }))} placeholder="Ex.: FLASH-GEO-01" required /></label>
            <label className="grid gap-1 text-sm">Últimos quatro dígitos *<input className="input input-sm" value={form.ultimos_quatro} onChange={(e) => setForm((v) => ({ ...v, ultimos_quatro: e.target.value.replace(/\D/g, '').slice(0, 4) }))} inputMode="numeric" maxLength="4" required /></label>
            <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm((v) => ({ ...v, ativo: e.target.checked }))} /> Cartão ativo</label>
          </div>

          <label className="relative grid gap-1 text-sm">Fornecedor do cartão *
            <input className="input input-sm" value={buscaFornecedor} onChange={(e) => { setBuscaFornecedor(e.target.value); setForm((v) => ({ ...v, parceiro_id: '', parceiro_nome: '' })); }} placeholder="Buscar fornecedor" autoComplete="off" />
            {fornecedores.length ? <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--c-border)] bg-[var(--c-card)] p-1 shadow-lg">{fornecedores.map((item) => <button key={item.id} type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--c-surface-alt)]" onMouseDown={(e) => { e.preventDefault(); setForm((v) => ({ ...v, parceiro_id: item.id, parceiro_nome: item.nome })); setBuscaFornecedor(item.nome); setFornecedores([]); }}>{item.nome}<span className="block text-xs text-[var(--c-muted)]">{item.cpf_cnpj || ''}</span></button>)}</div> : null}
          </label>

          <fieldset className="space-y-2 border-y border-[var(--c-border)] py-3">
            <legend className="sr-only">Usuários vinculados</legend>
            <div className="flex items-center justify-between gap-3"><strong className="text-sm">Usuários vinculados *</strong><input className="input input-sm max-w-64" value={buscaUsuario} onChange={(e) => setBuscaUsuario(e.target.value)} placeholder="Filtrar usuários" /></div>
            <div className="grid max-h-56 gap-x-4 gap-y-1 overflow-y-auto md:grid-cols-2">
              {usuariosFiltrados.map((usuario) => <label key={usuario.id} className="flex items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--c-surface-alt)]"><input className="mt-1" type="checkbox" checked={form.usuario_ids.map(Number).includes(Number(usuario.id))} onChange={() => alternarUsuario(usuario.id)} /><span>{usuario.nome}<small className="block text-[var(--c-muted)]">{usuario.email}</small></span></label>)}
            </div>
          </fieldset>

          <label className="grid gap-1 text-sm">Observações<textarea className="input min-h-[72px]" value={form.observacoes} onChange={(e) => setForm((v) => ({ ...v, observacoes: e.target.value }))} /></label>
          <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline btn-sm" onClick={novo}>{editandoId ? 'Cancelar edição' : 'Limpar'}</button><button type="submit" className="btn btn-primary btn-sm" disabled={salvando}>{salvando ? 'Salvando...' : (editandoId ? 'Salvar alterações' : 'Cadastrar cartão')}</button></div>
        </form>
      </div>
    </div>
  );
}
