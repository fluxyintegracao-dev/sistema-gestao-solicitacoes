import { useEffect, useMemo, useState } from 'react';
import {
  atualizarParceiro,
  baixarModeloParceiros,
  buscarParceiros,
  criarParceiro,
  exportarParceiros,
  importarParceiros,
  listarCategoriasParceiro
} from '../services/parceiros';
import { isValidCpfCnpj, maskCep, maskCpfCnpj, maskCreci, maskPhone, maskRg, onlyDigits } from '../utils/formatters';

const PIX_TIPOS_CHAVE = ['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'];

function defaultParceiroForm() {
  return {
    id: null,
    cpf_cnpj: '',
    nome: '',
    telefone: '',
    email: '',
    rg: '',
    data_nascimento: '',
    nacionalidade: '',
    profissao: '',
    estado_civil: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: '',
    municipio: '',
    estado: '',
    conjuge_nome: '',
    regime_bens: '',
    creci: '',
    pix_chave_fixa_1_tipo: 'CPF',
    pix_chave_fixa_1: '',
    pix_chave_fixa_2_tipo: 'CNPJ',
    pix_chave_fixa_2: '',
    pix_chave_variavel_tipo: 'ALEATORIA',
    pix_chave_variavel: '',
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
    rg: parceiro.rg || '',
    data_nascimento: parceiro.data_nascimento || '',
    nacionalidade: parceiro.nacionalidade || '',
    profissao: parceiro.profissao || '',
    estado_civil: parceiro.estado_civil || '',
    endereco: parceiro.endereco || '',
    numero: parceiro.numero || '',
    complemento: parceiro.complemento || '',
    bairro: parceiro.bairro || '',
    cep: maskCep(parceiro.cep),
    municipio: parceiro.municipio || '',
    estado: parceiro.estado || '',
    conjuge_nome: parceiro.conjuge_nome || '',
    regime_bens: parceiro.regime_bens || '',
    creci: parceiro.creci || '',
    pix_chave_fixa_1_tipo: parceiro.pix_chave_fixa_1_tipo || 'CPF',
    pix_chave_fixa_1: parceiro.pix_chave_fixa_1 || '',
    pix_chave_fixa_2_tipo: parceiro.pix_chave_fixa_2_tipo || 'CNPJ',
    pix_chave_fixa_2: parceiro.pix_chave_fixa_2 || '',
    pix_chave_variavel_tipo: parceiro.pix_chave_variavel_tipo || 'ALEATORIA',
    pix_chave_variavel: parceiro.pix_chave_variavel || '',
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
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
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
      const pix = normalizeSearchText([
        parceiro.pix_chave_fixa_1,
        parceiro.pix_chave_fixa_2,
        parceiro.pix_chave_variavel
      ].filter(Boolean).join(' '));
      const categoriasParceiro = normalizeSearchText(
        Array.isArray(parceiro.categorias)
          ? parceiro.categorias.map((categoria) => categoria.nome).join(' ')
          : ''
      );

      return (
        nome.includes(search) ||
        documento.includes(search) ||
        telefone.includes(search) ||
        pix.includes(search) ||
        categoriasParceiro.includes(search)
      );
    });
  }, [filtro, parceiros]);

  async function handleSalvar(event) {
    event.preventDefault();
    if (!isValidCpfCnpj(parceiroForm.cpf_cnpj)) {
      setError('Informe um CPF/CNPJ valido.');
      return;
    }

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

  async function handleBaixarModelo() {
    try {
      setError('');
      await baixarModeloParceiros();
    } catch (err) {
      setError(err?.message || 'Erro ao baixar modelo de pessoas');
    }
  }

  async function handleExportar() {
    try {
      setError('');
      await exportarParceiros();
    } catch (err) {
      setError(err?.message || 'Erro ao exportar pessoas');
    }
  }

  async function handleImportarParceiros(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setImporting(true);
      setError('');
      setImportResult(null);
      const result = await importarParceiros(file);
      setImportResult(result);
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao importar pessoas');
    } finally {
      setImporting(false);
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
                  onBlur={() => {
                    if (parceiroForm.cpf_cnpj && !isValidCpfCnpj(parceiroForm.cpf_cnpj)) setError('Informe um CPF/CNPJ valido.');
                  }}
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

              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-3 space-y-3">
                <div>
                  <div className="text-sm font-medium text-[var(--c-text)]">Chaves PIX</div>
                  <div className="text-xs text-[var(--c-muted)]">
                    Cadastre ate duas chaves fixas e uma chave variavel para uso financeiro.
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
                  <select
                    className="input w-full"
                    value={parceiroForm.pix_chave_fixa_1_tipo}
                    onChange={(e) => setParceiroForm((current) => ({ ...current, pix_chave_fixa_1_tipo: e.target.value }))}
                  >
                    {PIX_TIPOS_CHAVE.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                  <input
                    className="input w-full"
                    placeholder="Chave PIX fixa 1"
                    value={parceiroForm.pix_chave_fixa_1}
                    onChange={(e) => setParceiroForm((current) => ({ ...current, pix_chave_fixa_1: e.target.value }))}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
                  <select
                    className="input w-full"
                    value={parceiroForm.pix_chave_fixa_2_tipo}
                    onChange={(e) => setParceiroForm((current) => ({ ...current, pix_chave_fixa_2_tipo: e.target.value }))}
                  >
                    {PIX_TIPOS_CHAVE.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                  <input
                    className="input w-full"
                    placeholder="Chave PIX fixa 2"
                    value={parceiroForm.pix_chave_fixa_2}
                    onChange={(e) => setParceiroForm((current) => ({ ...current, pix_chave_fixa_2: e.target.value }))}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
                  <select
                    className="input w-full"
                    value={parceiroForm.pix_chave_variavel_tipo}
                    onChange={(e) => setParceiroForm((current) => ({ ...current, pix_chave_variavel_tipo: e.target.value }))}
                  >
                    {PIX_TIPOS_CHAVE.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                  <input
                    className="input w-full"
                    placeholder="Chave PIX variavel"
                    value={parceiroForm.pix_chave_variavel}
                    onChange={(e) => setParceiroForm((current) => ({ ...current, pix_chave_variavel: e.target.value }))}
                  />
                </div>
              </div>

              <div className="text-sm font-medium text-[var(--c-text)]">Dados para contrato</div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="input w-full"
                  placeholder="RG"
                  value={parceiroForm.rg}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, rg: maskRg(e.target.value) }))}
                />
                <input
                  className="input w-full"
                  type="date"
                  placeholder="Nascimento"
                  value={parceiroForm.data_nascimento}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, data_nascimento: e.target.value }))}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="input w-full"
                  placeholder="Nacionalidade"
                  value={parceiroForm.nacionalidade}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, nacionalidade: e.target.value }))}
                />
                <input
                  className="input w-full"
                  placeholder="Profissao"
                  value={parceiroForm.profissao}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, profissao: e.target.value }))}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="input w-full"
                  placeholder="Estado civil"
                  value={parceiroForm.estado_civil}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, estado_civil: e.target.value }))}
                />
                <input
                  className="input w-full"
                  placeholder="CRECI"
                  value={parceiroForm.creci}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, creci: maskCreci(e.target.value) }))}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="input w-full"
                  placeholder="Conjuge"
                  value={parceiroForm.conjuge_nome}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, conjuge_nome: e.target.value }))}
                />
                <input
                  className="input w-full"
                  placeholder="Regime de bens"
                  value={parceiroForm.regime_bens}
                  onChange={(e) => setParceiroForm((current) => ({ ...current, regime_bens: e.target.value }))}
                />
              </div>

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

              <input
                className="input w-full"
                placeholder="Complemento"
                value={parceiroForm.complemento}
                onChange={(e) => setParceiroForm((current) => ({ ...current, complemento: e.target.value }))}
              />

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
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn btn-outline" onClick={handleBaixarModelo}>
                    Baixar modelo
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleExportar}>
                    Exportar
                  </button>
                  <label className={`btn btn-primary cursor-pointer ${importing ? 'opacity-70' : ''}`}>
                    {importing ? 'Importando...' : 'Importar'}
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls,.csv"
                      disabled={importing}
                      onChange={handleImportarParceiros}
                    />
                  </label>
                  <input
                    className="input w-[240px]"
                    placeholder="Buscar pessoa"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {importResult && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
                <div className="font-semibold">
                  Importacao concluida: {importResult.importados || 0} novo(s), {importResult.atualizados || 0} atualizado(s), {importResult.ignorados || 0} ignorado(s).
                </div>
                {Array.isArray(importResult.categorias_criadas) && importResult.categorias_criadas.length > 0 && (
                  <div className="mt-1">
                    Categorias criadas: {importResult.categorias_criadas.join(', ')}
                  </div>
                )}
                {Array.isArray(importResult.erros) && importResult.erros.length > 0 && (
                  <div className="mt-2 rounded-lg bg-white/70 p-3 text-red-700 dark:bg-slate-950/40 dark:text-red-300">
                    <div className="font-semibold">Linhas com erro:</div>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {importResult.erros.slice(0, 8).map((erro) => (
                        <li key={`${erro.linha}-${erro.erro}`}>
                          Linha {erro.linha}: {erro.erro}
                        </li>
                      ))}
                    </ul>
                    {importResult.erros.length > 8 && (
                      <div className="mt-1">Mais {importResult.erros.length - 8} erro(s) oculto(s).</div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                        {(parceiro.pix_chave_fixa_1 || parceiro.pix_chave_fixa_2 || parceiro.pix_chave_variavel) && (
                          <div className="text-sm text-[var(--c-muted)]">
                            PIX:{' '}
                            {[
                              parceiro.pix_chave_fixa_1 ? `${parceiro.pix_chave_fixa_1_tipo || 'PIX'} ${parceiro.pix_chave_fixa_1}` : '',
                              parceiro.pix_chave_fixa_2 ? `${parceiro.pix_chave_fixa_2_tipo || 'PIX'} ${parceiro.pix_chave_fixa_2}` : '',
                              parceiro.pix_chave_variavel ? `${parceiro.pix_chave_variavel_tipo || 'PIX'} ${parceiro.pix_chave_variavel}` : ''
                            ].filter(Boolean).join(' | ')}
                          </div>
                        )}
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
