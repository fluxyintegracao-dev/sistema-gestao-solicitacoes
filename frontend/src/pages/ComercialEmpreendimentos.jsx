import { useEffect, useMemo, useState } from 'react';
import { getMinhasObras } from '../services/obras';
import {
  atualizarEmpreendimentoComercial,
  criarEmpreendimentoComercial,
  getEmpreendimentosComerciais
} from '../services/comercial';
import { maskCep, onlyDigits } from '../utils/formatters';

function defaultForm() {
  return {
    id: null,
    obra_id: '',
    codigo: '',
    nome: '',
    descricao: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    ativo: true
  };
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function pickForm(item = {}) {
  return {
    id: item.id || null,
    obra_id: item.obra_id ? String(item.obra_id) : '',
    codigo: item.codigo || '',
    nome: item.nome || '',
    descricao: item.descricao || '',
    endereco: item.endereco || '',
    numero: item.numero || '',
    bairro: item.bairro || '',
    cidade: item.cidade || '',
    estado: item.estado || '',
    cep: maskCep(item.cep),
    ativo: item.ativo !== false
  };
}

export default function ComercialEmpreendimentos() {
  const [form, setForm] = useState(defaultForm());
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [obras, setObras] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const [empreendimentosData, obrasData] = await Promise.all([
        getEmpreendimentosComerciais(),
        getMinhasObras()
      ]);
      setEmpreendimentos(Array.isArray(empreendimentosData) ? empreendimentosData : []);
      setObras(Array.isArray(obrasData) ? obrasData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar empreendimentos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const listaFiltrada = useMemo(() => {
    const termo = normalizeSearch(busca);
    if (!termo) return empreendimentos;
    return empreendimentos.filter((item) => {
      const blob = normalizeSearch([
        item.nome,
        item.codigo,
        item.cidade,
        item.estado,
        item.obra?.nome
      ].filter(Boolean).join(' '));
      return blob.includes(termo);
    });
  }, [busca, empreendimentos]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');

      const nome = String(form.nome || '').trim();
      if (!nome) {
        setError('Informe o nome do empreendimento.');
        return;
      }

      const payload = {
        obra_id: form.obra_id ? Number(form.obra_id) : undefined,
        codigo: form.codigo,
        nome,
        descricao: form.descricao,
        endereco: form.endereco,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        cep: onlyDigits(form.cep),
        ativo: form.ativo
      };

      if (form.id) {
        await atualizarEmpreendimentoComercial(form.id, payload);
      } else {
        await criarEmpreendimentoComercial(payload);
      }

      setForm(defaultForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar empreendimento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page solicitacoes-page space-y-5 md:space-y-6">
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Empreendimentos</h1>
            <p className="page-subtitle">
              Base comercial para agrupar unidades, contratos de venda e carteira do cliente.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="app-alert app-alert--error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="app-empty-card">Carregando empreendimentos...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
          <section className="sol-surface-card rounded-2xl p-4 md:p-5">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">
              {form.id ? 'Editar empreendimento' : 'Novo empreendimento'}
            </h2>

            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Obra vinculada</span>
                <select
                  className="input w-full"
                  value={form.obra_id}
                  onChange={(event) => setForm((current) => ({ ...current, obra_id: event.target.value }))}
                >
                  <option value="">Sem vinculo operacional</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Codigo</span>
                  <input
                    className="input w-full"
                    value={form.codigo}
                    onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value }))}
                    placeholder="Ex.: EMP-001"
                  />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">UF</span>
                  <input
                    className="input w-full"
                    maxLength={2}
                    value={form.estado}
                    onChange={(event) => setForm((current) => ({ ...current, estado: event.target.value.toUpperCase() }))}
                    placeholder="UF"
                  />
                </label>
              </div>

              <label className="sol-filter-field">
                <span className="sol-filter-label">Nome</span>
                <input
                  className="input w-full"
                  value={form.nome}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  required
                  placeholder="Nome do empreendimento"
                />
              </label>

              <label className="sol-filter-field">
                <span className="sol-filter-label">Descricao</span>
                <textarea
                  className="input min-h-[96px] w-full"
                  value={form.descricao}
                  onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                  placeholder="Resumo comercial e operacional"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_96px]">
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Endereco</span>
                  <input
                    className="input w-full"
                    value={form.endereco}
                    onChange={(event) => setForm((current) => ({ ...current, endereco: event.target.value }))}
                    placeholder="Rua / avenida"
                  />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Numero</span>
                  <input
                    className="input w-full"
                    value={form.numero}
                    onChange={(event) => setForm((current) => ({ ...current, numero: event.target.value }))}
                    placeholder="Numero"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Bairro</span>
                  <input
                    className="input w-full"
                    value={form.bairro}
                    onChange={(event) => setForm((current) => ({ ...current, bairro: event.target.value }))}
                    placeholder="Bairro"
                  />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Cidade</span>
                  <input
                    className="input w-full"
                    value={form.cidade}
                    onChange={(event) => setForm((current) => ({ ...current, cidade: event.target.value }))}
                    placeholder="Cidade"
                  />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">CEP</span>
                  <input
                    className="input w-full"
                    value={form.cep}
                    onChange={(event) => setForm((current) => ({ ...current, cep: maskCep(event.target.value) }))}
                    placeholder="CEP"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-[var(--c-text)]">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
                />
                Empreendimento ativo
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : (form.id ? 'Salvar alteracoes' : 'Criar empreendimento')}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setForm(defaultForm())}>
                  Limpar
                </button>
              </div>
            </form>
          </section>

          <section className="sol-surface-card rounded-2xl p-4 md:p-5">
            <div className="sol-filtros-head">
              <div>
                <p className="sol-filtros-title">Empreendimentos cadastrados</p>
                <p className="sol-filtros-subtitle">
                  Estrutura comercial pronta para unidades, reservas e contratos.
                </p>
              </div>
              <div className="sol-filtros-meta">
                <span>Total listado {listaFiltrada.length}</span>
              </div>
            </div>

            <label className="sol-filter-field mt-4">
              <span className="sol-filter-label">Busca</span>
              <input
                className="input w-full"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Nome, codigo, cidade ou obra"
              />
            </label>

            <div className="mt-4 space-y-3">
              {listaFiltrada.length === 0 ? (
                <div className="app-empty-card">Nenhum empreendimento encontrado.</div>
              ) : (
                listaFiltrada.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-[var(--c-text)]">{item.nome}</h3>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {item.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div className="grid gap-2 text-sm text-[var(--c-muted)] md:grid-cols-2">
                          <span>Codigo: {item.codigo || '-'}</span>
                          <span>Obra: {item.obra?.nome || 'Sem vinculo'}</span>
                          <span>Cidade: {[item.cidade, item.estado].filter(Boolean).join(' / ') || '-'}</span>
                          <span>Endereco: {[item.endereco, item.numero].filter(Boolean).join(', ') || '-'}</span>
                        </div>
                        {item.descricao && (
                          <p className="text-sm text-[var(--c-muted)]">{item.descricao}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setForm(pickForm(item))}
                      >
                        Editar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
