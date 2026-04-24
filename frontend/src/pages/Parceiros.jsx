import { useEffect, useMemo, useState } from 'react';
import {
  atualizarParceiro,
  buscarParceiros,
  criarParceiro,
  listarCategoriasParceiro
} from '../services/parceiros';
import { maskCep, maskCpfCnpj, maskPhone, onlyDigits } from '../utils/formatters';

function defaultParceiroForm() {
  return {
    id: null,
    cpf_cnpj: '',
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
    numero: '',
    bairro: '',
    cep: '',
    municipio: '',
    estado: '',
    cliente: true,
    fornecedor: true,
    corretor: false,
    ativo: true,
    categoria_ids: []
  };
}

function normalizeDocumento(value) {
  return onlyDigits(value);
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function statusClass(ativo) {
  return ativo
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function pickParceiroFormData(parceiro = {}) {
  return {
    id: parceiro.id || null,
    cpf_cnpj: maskCpfCnpj(parceiro.cpf_cnpj),
    nome: parceiro.nome || '',
    telefone: maskPhone(parceiro.telefone),
    email: parceiro.email || '',
    endereco: parceiro.endereco || '',
    numero: parceiro.numero || '',
    bairro: parceiro.bairro || '',
    cep: maskCep(parceiro.cep),
    municipio: parceiro.municipio || '',
    estado: parceiro.estado || '',
    cliente: parceiro.cliente !== false,
    fornecedor: parceiro.fornecedor !== false,
    corretor: parceiro.corretor === true,
    ativo: parceiro.ativo !== false,
    categoria_ids: Array.isArray(parceiro.categorias)
      ? parceiro.categorias.map((categoria) => categoria.id)
      : []
  };
}

export default function Parceiros() {
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [parceiroForm, setParceiroForm] = useState(defaultParceiroForm());
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const [parceirosData, categoriasData] = await Promise.all([
        buscarParceiros({ ativo: 0, limit: 200, incluir_categorias: 1 }),
        listarCategoriasParceiro()
      ]);

      setParceiros(Array.isArray(parceirosData) ? parceirosData : []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar parceiros');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const parceirosFiltrados = useMemo(() => {
    const search = normalizeSearchText(filtro);
    if (!search) {
      return parceiros;
    }

    return parceiros.filter((parceiro) => {
      const nome = normalizeSearchText(parceiro.nome);
      const documento = normalizeSearchText(parceiro.cpf_cnpj);
      const telefone = normalizeSearchText(parceiro.telefone);
      const categoriasParceiro = normalizeSearchText(
        Array.isArray(parceiro.categorias)
          ? parceiro.categorias.map((categoria) => categoria.nome).join(' ')
          : ''
      );

      return (
        nome.includes(search) ||
        documento.includes(search) ||
        telefone.includes(search) ||
        categoriasParceiro.includes(search)
      );
    });
  }, [filtro, parceiros]);

  async function handleSalvar(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      const payload = {
        ...parceiroForm,
        cpf_cnpj: normalizeDocumento(parceiroForm.cpf_cnpj),
        telefone: onlyDigits(parceiroForm.telefone),
        cep: onlyDigits(parceiroForm.cep)
      };

      if (parceiroForm.id) {
        await atualizarParceiro(parceiroForm.id, payload);
      } else {
        await criarParceiro(payload);
      }

      setParceiroForm(defaultParceiroForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar parceiro');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header">
        <h1 className="text-xl font-semibold md:text-2xl">Cadastro de Pessoas</h1>
        <p className="page-subtitle">
          Cadastro mestre de clientes, credores, fornecedores e corretores usado nas solicitacoes, financeiro, comercial e cotacoes.
        </p>
      </div>

      {error && (
        <div className="app-alert app-alert--error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="app-empty-card">
          Carregando parceiros...
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="card sol-surface-card">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">
              {parceiroForm.id ? 'Editar pessoa' : 'Nova pessoa'}
            </h2>

            <form className="mt-4 space-y-3" onSubmit={handleSalvar}>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="input w-full"
                  placeholder="CPF/CNPJ"
                  value={parceiroForm.cpf_cnpj}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, cpf_cnpj: maskCpfCnpj(e.target.value) }))}
                  required
                />
                <input
                  className="input w-full"
                  placeholder="Telefone"
                  value={parceiroForm.telefone}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, telefone: maskPhone(e.target.value) }))}
                  required
                />
              </div>

              <input
                className="input w-full"
                placeholder="Nome"
                value={parceiroForm.nome}
                onChange={(e) => setParceiroForm((current) => ({ ...current, nome: e.target.value }))}
                required
              />

              <input
                className="input w-full"
                placeholder="E-mail"
                value={parceiroForm.email}
                onChange={(e) => setParceiroForm((current) => ({ ...current, email: e.target.value }))}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="input w-full"
                  placeholder="Endereco"
                  value={parceiroForm.endereco}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, endereco: e.target.value }))}
                />
                <input
                  className="input w-full"
                  placeholder="Numero"
                  value={parceiroForm.numero}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, numero: e.target.value }))}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="input w-full"
                  placeholder="Bairro"
                  value={parceiroForm.bairro}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, bairro: e.target.value }))}
                />
                <input
                  className="input w-full"
                  placeholder="CEP"
                  value={parceiroForm.cep}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, cep: maskCep(e.target.value) }))}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_96px]">
                <input
                  className="input w-full"
                  placeholder="Municipio"
                  value={parceiroForm.municipio}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, municipio: e.target.value }))}
                />
                <input
                  className="input w-full"
                  placeholder="UF"
                  maxLength={2}
                  value={parceiroForm.estado}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, estado: e.target.value.toUpperCase() }))}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-[var(--c-text)]">Vinculos da pessoa</div>
                <div className="flex flex-wrap gap-4 text-sm text-[var(--c-text)]">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={parceiroForm.cliente}
                      onChange={(e) => setParceiroForm((current) => ({ ...current, cliente: e.target.checked }))}
                    />
                    Cliente
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={parceiroForm.fornecedor}
                      onChange={(e) => setParceiroForm((current) => ({ ...current, fornecedor: e.target.checked }))}
                    />
                    Credor / Fornecedor
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={parceiroForm.corretor}
                      onChange={(e) => setParceiroForm((current) => ({ ...current, corretor: e.target.checked }))}
                    />
                    Corretor
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={parceiroForm.ativo}
                      onChange={(e) => setParceiroForm((current) => ({ ...current, ativo: e.target.checked }))}
                    />
                    Ativo
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-[var(--c-text)]">Categorias</div>
                {categorias.length === 0 ? (
                  <div className="text-sm text-[var(--c-muted)]">Nenhuma categoria de parceiro cadastrada.</div>
                ) : (
                  <div className="app-checkbox-grid max-h-[180px] overflow-y-auto rounded-xl border border-[var(--c-border)] p-3 md:grid-cols-2">
                    {categorias.map((categoria) => (
                      <label key={categoria.id} className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                        <input
                          type="checkbox"
                          checked={parceiroForm.categoria_ids.includes(categoria.id)}
                          onChange={(e) => {
                            setParceiroForm((current) => {
                              const currentIds = new Set(current.categoria_ids);
                              if (e.target.checked) {
                                currentIds.add(categoria.id);
                              } else {
                                currentIds.delete(categoria.id);
                              }
                              return { ...current, categoria_ids: Array.from(currentIds) };
                            });
                          }}
                        />
                        <span>{categoria.nome}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : parceiroForm.id ? 'Salvar alteracoes' : 'Criar pessoa'}
                </button>
                {parceiroForm.id && (
                  <button type="button" className="btn btn-outline" onClick={() => setParceiroForm(defaultParceiroForm())}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <div className="sol-surface-card solicitacoes-toolbar rounded-xl p-3 md:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Pessoas cadastradas</h2>
                <input
                  className="input w-[240px]"
                  placeholder="Buscar pessoa"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>
            </div>

            {parceirosFiltrados.length === 0 ? (
              <div className="app-empty-card">
                Nenhuma pessoa encontrada.
              </div>
            ) : (
              <div className="app-list-stack">
                {parceirosFiltrados.map((parceiro) => (
                  <div key={parceiro.id} className="app-list-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium text-[var(--c-text)]">{parceiro.nome}</div>
                        <div className="text-sm text-[var(--c-muted)]">
                          {parceiro.cpf_cnpj || '-'} · {parceiro.telefone || '-'}
                        </div>
                        <div className="text-sm text-[var(--c-muted)]">
                          {parceiro.email || 'Sem email'}{parceiro.municipio ? ` · ${parceiro.municipio}` : ''}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(parceiro.ativo)}`}>
                            {parceiro.ativo ? 'ATIVO' : 'INATIVO'}
                          </span>
                          {parceiro.cliente && (
                            <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                              CLIENTE
                            </span>
                          )}
                          {parceiro.fornecedor && (
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              CREDOR
                            </span>
                          )}
                          {parceiro.corretor && (
                            <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                              CORRETOR
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--c-muted)]">
                          Categorias:{' '}
                          {Array.isArray(parceiro.categorias) && parceiro.categorias.length > 0
                            ? parceiro.categorias.map((categoria) => categoria.nome).join(', ')
                            : 'Sem categoria'}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setParceiroForm(pickParceiroFormData(parceiro))}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
