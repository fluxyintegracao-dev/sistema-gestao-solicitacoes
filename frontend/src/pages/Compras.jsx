import { useEffect, useMemo, useState } from 'react';
import {
  listarObras,
  listarCategorias,
  listarUnidades,
  listarInsumos,
  listarApropriacoes,
  criarRequisicao,
  listarRequisicoes,
  criarObra,
  criarCategoria,
  criarUnidade,
  criarInsumo,
  criarApropriacao,
  importarApropriacoes,
  exportarRequisicaoPdf
} from '../services/pyCompras';
import { useAuth } from '../contexts/AuthContext';

const LEAD_RULES = [
  { maxItems: 10, days: 7 },
  { maxItems: 30, days: 14 },
  { maxItems: 50, days: 18 },
  { maxItems: 999, days: 21 }
];
const LEAD_FALLBACK = 21;

function getLeadDays(total) {
  const regras = LEAD_RULES.find(r => total <= r.maxItems);
  return (regras?.days || LEAD_FALLBACK);
}

function addDays(base, days) {
  const dt = new Date(base);
  dt.setDate(dt.getDate() + days);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function toISODate(dt) {
  return dt.toISOString().slice(0, 10);
}

const emptyItem = () => ({
  insumo_id: '',
  insumo_custom: '',
  unidade: '',
  quantidade: '',
  especificacao: '',
  apropriacao: '',
  necessario_em: '',
  link_produto: ''
});

export default function Compras() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'SUPERADMIN' || user?.perfil === 'ADMIN';
  const [catalogo, setCatalogo] = useState({
    obras: [],
    categorias: [],
    unidades: [],
    insumos: [],
    apropriacoes: []
  });
  const [requisicoes, setRequisicoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [tab, setTab] = useState('solicitar');

  const [obraId, setObraId] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [necessarioEm, setNecessarioEm] = useState('');
  const [itens, setItens] = useState([emptyItem()]);
  const [apropriacaoForm, setApropriacaoForm] = useState({ numero: '', nome: '' });
  const [apropriacaoLista, setApropriacaoLista] = useState('');
  const [apropriacaoBusca, setApropriacaoBusca] = useState('');

  const minNecessario = useMemo(() => {
    const dias = getLeadDays(itens.length || 1);
    return toISODate(addDays(new Date(), dias));
  }, [itens.length]);
  const apropListId = obraId ? `apropriacoes-${obraId}` : 'apropriacoes';

  useEffect(() => {
    async function bootstrap() {
      try {
      const [
        obras,
        categorias,
        unidades,
        insumos,
        apropriacoes,
        reqs
      ] = await Promise.all([
        listarObras(),
        listarCategorias(),
        listarUnidades(),
        listarInsumos(),
        listarApropriacoes(),
        listarRequisicoes()
      ]);
        setCatalogo({ obras, categorias, unidades, insumos, apropriacoes });
        setRequisicoes(reqs);
        setNecessarioEm(minNecessario);
        if (!obraId && obras.length) setObraId(String(obras[0].id));
      } catch (err) {
        setErro(err.message || 'Falha ao carregar catálogos');
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [minNecessario]);

  function atualizarItem(idx, key, value) {
    setItens(prev => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
  }

  function adicionarItem() {
    setItens(prev => [...prev, emptyItem()]);
  }

  function removerItem(idx) {
    setItens(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  const apropriacoesDaObra = useMemo(() => {
    if (!obraId) return [];
    let lista = catalogo.apropriacoes.filter(a => String(a.obra_id) === String(obraId));
    if (apropriacaoBusca) {
      const q = apropriacaoBusca.toLowerCase();
      lista = lista.filter(
        ap =>
          String(ap.numero || '').toLowerCase().includes(q) ||
          String(ap.nome || '').toLowerCase().includes(q)
      );
    }
    return lista;
  }, [catalogo.apropriacoes, obraId, apropriacaoBusca]);

  async function handleCriarRequisicao(e) {
    e.preventDefault();
    setErro('');
    setOk('');
    setSaving(true);
    try {
      const payload = {
        obra_id: obraId || null,
        solicitante,
        necessario_em: necessarioEm,
        itens
      };
      const criada = await criarRequisicao(payload);
      setOk(`Requisição #${criada.id} criada com sucesso`);
      setItens([emptyItem()]);
      setRequisicoes(await listarRequisicoes());
      setNecessarioEm(minNecessario);
    } catch (err) {
      setErro(err.message || 'Falha ao criar requisição');
    } finally {
      setSaving(false);
    }
  }

  async function handleCriarApropriacao(e) {
    e.preventDefault();
    setErro('');
    setOk('');
    if (!obraId) {
      setErro('Selecione uma obra para vincular a apropriação.');
      return;
    }
    try {
      await criarApropriacao({
        obra_id: obraId,
        numero: apropriacaoForm.numero,
        nome: apropriacaoForm.nome
      });
      const apropAtualizada = await listarApropriacoes();
      setCatalogo(prev => ({ ...prev, apropriacoes: apropAtualizada }));
      setApropriacaoForm({ numero: '', nome: '' });
      setOk('Apropriação cadastrada.');
    } catch (err) {
      setErro(err.message || 'Falha ao salvar apropriação');
    }
  }

  async function handleImportarApropriacoes(e) {
    e.preventDefault();
    setErro('');
    setOk('');
    if (!obraId) {
      setErro('Selecione uma obra para importar apropriações.');
      return;
    }
    if (!apropriacaoLista.trim()) {
      setErro('Cole uma lista de apropriações (ex.: 1.2|Fundação).');
      return;
    }
    try {
      const resp = await importarApropriacoes({
        obra_id: obraId,
        lista: apropriacaoLista
      });
      const apropAtualizada = await listarApropriacoes();
      setCatalogo(prev => ({ ...prev, apropriacoes: apropAtualizada }));
      setApropriacaoLista('');
      setOk(resp.mensagem || 'Importação concluída');
    } catch (err) {
      setErro(err.message || 'Falha ao importar apropriações');
    }
  }

  async function handleExportar(id) {
    try {
      const blob = await exportarRequisicaoPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `requisicao-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErro(err.message || 'Erro ao exportar PDF');
    }
  }

  async function handleCriarBasico(kind, value) {
    const nome = (value || '').trim();
    if (!nome) return;
    try {
      if (kind === 'obra') await criarObra({ nome });
      if (kind === 'categoria') await criarCategoria({ nome });
      if (kind === 'unidade') await criarUnidade({ nome });
      if (kind === 'insumo') await criarInsumo({ nome, is_custom: false });
      const [obras, categorias, unidades, insumos] = await Promise.all([
        listarObras(),
        listarCategorias(),
        listarUnidades(),
        listarInsumos()
      ]);
      setCatalogo(prev => ({
        ...prev,
        obras,
        categorias,
        unidades,
        insumos
      }));
    } catch (err) {
      setErro(err.message || 'Falha ao salvar dado');
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-600">
        Carregando catálogos...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.08em] text-slate-500 font-semibold">
          Compras
        </p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-xl font-semibold text-slate-900">Requisições de Compras</h1>
          <span className="text-xs text-slate-500">
            (lógica migrada do app Flask, agora nativa em React/Node)
          </span>
        </div>
      </header>

      {(erro || ok) && (
        <div className={`${erro ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} border rounded-lg px-3 py-2 text-sm`}>
          {erro || ok}
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <form
          onSubmit={handleCriarRequisicao}
          className="lg:col-span-3 bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Nova requisição</h2>
            <div className="text-xs text-slate-500">
              Data mínima: {minNecessario}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Obra</span>
              <select
                value={obraId}
                onChange={e => setObraId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Selecione</option>
                {catalogo.obras.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Solicitante</span>
              <input
                value={solicitante}
                onChange={e => setSolicitante(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Nome"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Necessário em</span>
              <input
                type="date"
                min={minNecessario}
                value={necessarioEm}
                onChange={e => setNecessarioEm(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Itens</h3>
              <button
                type="button"
                onClick={adicionarItem}
                className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white hover:bg-slate-800"
              >
                + Adicionar item
              </button>
            </div>

            <div className="space-y-3">
              {itens.map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Item #{idx + 1}</span>
                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerItem(idx)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        remover
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="space-y-1 text-sm">
                      <span className="text-slate-600">Insumo</span>
                      <select
                        value={item.insumo_id}
                        onChange={e => atualizarItem(idx, 'insumo_id', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">(usar personalizado)</option>
                        {catalogo.insumos.map(ins => (
                          <option key={ins.id} value={ins.id}>{ins.nome}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-slate-600">Insumo customizado</span>
                      <input
                        value={item.insumo_custom}
                        onChange={e => atualizarItem(idx, 'insumo_custom', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="Digite o nome se não selecionou acima"
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-slate-600">Unidade</span>
                      <input
                        value={item.unidade}
                        onChange={e => atualizarItem(idx, 'unidade', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="ex.: kg, un, m²"
                        required
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-slate-600">Quantidade</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantidade}
                        onChange={e => atualizarItem(idx, 'quantidade', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        required
                      />
                    </label>

                    <label className="space-y-1 text-sm sm:col-span-2">
                      <span className="text-slate-600">Especificação</span>
                      <textarea
                        value={item.especificacao}
                        onChange={e => atualizarItem(idx, 'especificacao', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        rows={2}
                        required
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-slate-600">Apropriação</span>
                      <input
                        value={item.apropriacao}
                        onChange={e => atualizarItem(idx, 'apropriacao', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="código ou nome"
                        list={obraId ? `apropriacoes-${obraId}` : undefined}
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-slate-600">Necessário em (item)</span>
                      <input
                        type="date"
                        min={minNecessario}
                        value={item.necessario_em}
                        onChange={e => atualizarItem(idx, 'necessario_em', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="space-y-1 text-sm sm:col-span-2">
                      <span className="text-slate-600">Link do produto (opcional)</span>
                      <input
                        value={item.link_produto}
                        onChange={e => atualizarItem(idx, 'link_produto', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="https://..."
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {obraId && (
              <datalist id={apropListId}>
                {apropriacoesDaObra.map(ap => (
                  <option
                    key={ap.id}
                    value={ap.numero}
                    label={ap.nome ? `${ap.numero} | ${ap.nome}` : ap.numero}
                  />
                ))}
              </datalist>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Enviar requisição'}
            </button>
          </div>
        </form>

        <aside className="lg:col-span-2 space-y-4">
          {isAdmin && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Apropriações da obra</h3>
                <span className="text-xs text-slate-500">
                  {obraId ? `Obra #${obraId}` : 'Selecione uma obra'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={apropriacaoBusca}
                  onChange={e => setApropriacaoBusca(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  placeholder="Buscar por código ou nome"
                />
              </div>

              <form className="space-y-2" onSubmit={handleCriarApropriacao}>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600">Código (apenas números e pontos)</span>
                  <input
                    value={apropriacaoForm.numero}
                    onChange={e => setApropriacaoForm(prev => ({ ...prev, numero: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="ex.: 1.2.3"
                    required
                    pattern="\\d+(\\.\\d+)*"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600">Nome / descrição</span>
                  <input
                    value={apropriacaoForm.nome}
                    onChange={e => setApropriacaoForm(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Opcional, ajuda na busca"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={!obraId}
                >
                  Salvar apropriação
                </button>
              </form>

              <form className="space-y-2" onSubmit={handleImportarApropriacoes}>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600">Importação em massa</span>
                  <textarea
                    value={apropriacaoLista}
                    onChange={e => setApropriacaoLista(e.target.value)}
                    rows={4}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Uma por linha. Ex.: 1.2|Fundação"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={!obraId}
                >
                  Importar lista
                </button>
              </form>

              <div className="max-h-48 overflow-auto border border-slate-100 rounded-lg divide-y">
                {apropriacoesDaObra.map(ap => (
                  <div key={ap.id} className="px-3 py-2 text-xs text-slate-700 flex justify-between gap-2">
                    <span className="font-semibold text-slate-900">{ap.numero}</span>
                    <span className="text-slate-600 flex-1 text-right">{ap.nome}</span>
                  </div>
                ))}
                {apropriacoesDaObra.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-500">Nenhuma apropriação cadastrada para a obra.</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Catálogos rápidos</h3>
            <p className="text-xs text-slate-500">
              Crie opções básicas sem sair da tela.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <QuickAdd placeholder="Nova obra" onAdd={v => handleCriarBasico('obra', v)} />
              <QuickAdd placeholder="Nova categoria" onAdd={v => handleCriarBasico('categoria', v)} />
              <QuickAdd placeholder="Nova unidade" onAdd={v => handleCriarBasico('unidade', v)} />
              <QuickAdd placeholder="Novo insumo" onAdd={v => handleCriarBasico('insumo', v)} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Requisições</h3>
              <span className="text-xs text-slate-500">{requisicoes.length} registro(s)</span>
            </div>
            <div className="divide-y">
              {requisicoes.map(req => (
                <div key={req.id} className="py-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">#{req.id} • {req.obra_py?.nome || 'Obra'}</p>
                      <p className="text-xs text-slate-500">
                        Necessário em {req.necessario_em || '-'} · {req.itens?.length || 0} itens
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportar(req.id)}
                      className="text-xs px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50"
                    >
                      PDF
                    </button>
                  </div>
                  {req.itens?.length > 0 && (
                    <div className="text-xs text-slate-600">
                      {req.itens.slice(0, 3).map((it, i) => (
                        <span key={i} className="inline-block mr-2">
                          {it.insumo?.nome || 'Insumo'} ({it.quantidade} {it.unidade})
                        </span>
                      ))}
                      {req.itens.length > 3 && <span>...</span>}
                    </div>
                  )}
                </div>
              ))}
              {requisicoes.length === 0 && (
                <p className="text-xs text-slate-500">Nenhuma requisição criada ainda.</p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function QuickAdd({ placeholder, onAdd }) {
  const [valor, setValor] = useState('');
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={e => {
        e.preventDefault();
        onAdd(valor);
        setValor('');
      }}
    >
      <input
        value={valor}
        onChange={e => setValor(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border rounded-lg px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="text-xs px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
      >
        Salvar
      </button>
    </form>
  );
}
