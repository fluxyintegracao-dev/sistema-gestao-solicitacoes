import { useEffect, useMemo, useState } from 'react';
import {
  criarModeloContratoComercial,
  getEmpreendimentosComerciais,
  getModelosContratoComercial
} from '../services/comercial';

const TIPOS_DOCUMENTO_MODELO = [
  { value: 'CONTRATO', label: 'Contrato padrao' },
  { value: 'QUADRO_RESUMO', label: 'Quadro resumo' }
];

function defaultModeloForm() {
  return {
    empreendimento_id: '',
    tipo_documento: 'CONTRATO',
    nome: '',
    descricao: '',
    file: null
  };
}

function documentoTipoLabel(tipo) {
  return TIPOS_DOCUMENTO_MODELO.find((item) => item.value === String(tipo || '').toUpperCase())?.label || tipo || '-';
}

export default function ComercialModelosContrato() {
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [form, setForm] = useState(defaultModeloForm());
  const [filtroEmpreendimento, setFiltroEmpreendimento] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const [empreData, modelosData] = await Promise.all([
        getEmpreendimentosComerciais({ ativo: 1 }),
        getModelosContratoComercial()
      ]);
      setEmpreendimentos(Array.isArray(empreData) ? empreData : []);
      setModelos(Array.isArray(modelosData) ? modelosData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar modelos de contrato');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const modelosFiltrados = useMemo(() => modelos.filter((modelo) => {
    if (filtroEmpreendimento && Number(modelo.empreendimento_id) !== Number(filtroEmpreendimento)) return false;
    if (filtroTipo && String(modelo.tipo_documento || '').toUpperCase() !== filtroTipo) return false;
    return true;
  }), [filtroEmpreendimento, filtroTipo, modelos]);

  async function handleSalvarModelo(event) {
    event.preventDefault();
    if (!form.file) {
      setError('Selecione um arquivo DOCX para o modelo.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await criarModeloContratoComercial(form);
      setForm(defaultModeloForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar modelo de contrato');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page solicitacoes-page"><div className="app-empty-card">Carregando modelos de contrato...</div></div>;
  }

  return (
    <div className="page solicitacoes-page space-y-5 md:space-y-6">
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Modelos de contrato</h1>
            <p className="page-subtitle">
              Modelos DOCX por empreendimento para gerar contrato e quadro resumo com o papel timbrado correto.
            </p>
          </div>
        </div>
      </header>

      {error && <div className="app-alert app-alert--error">{error}</div>}

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Novo modelo</p>
            <p className="sol-filtros-subtitle">
              Envie DOCX com variaveis no formato {'{{cliente.nome}}'}; o sistema usa o empreendimento e tipo selecionados na geracao.
            </p>
          </div>
        </div>

        <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={handleSalvarModelo}>
          <label className="sol-filter-field md:col-span-2">
            <span className="sol-filter-label">Empreendimento</span>
            <select
              className="input w-full"
              value={form.empreendimento_id}
              onChange={(event) => setForm((current) => ({ ...current, empreendimento_id: event.target.value }))}
              required
            >
              <option value="">Selecione</option>
              {empreendimentos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </label>
          <label className="sol-filter-field">
            <span className="sol-filter-label">Tipo</span>
            <select
              className="input w-full"
              value={form.tipo_documento}
              onChange={(event) => setForm((current) => ({ ...current, tipo_documento: event.target.value }))}
            >
              {TIPOS_DOCUMENTO_MODELO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="sol-filter-field">
            <span className="sol-filter-label">Nome interno</span>
            <input
              className="input w-full"
              value={form.nome}
              onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
              placeholder="Ex.: Contrato Costa do Mar"
            />
          </label>
          <label className="sol-filter-field">
            <span className="sol-filter-label">Arquivo DOCX</span>
            <input
              className="input w-full"
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
              required
            />
          </label>
          <label className="sol-filter-field md:col-span-4">
            <span className="sol-filter-label">Descricao</span>
            <input
              className="input w-full"
              value={form.descricao}
              onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
              placeholder="Observacao para identificar quando usar este modelo"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
              {saving ? 'Enviando...' : 'Salvar modelo'}
            </button>
          </div>
        </form>
      </section>

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Modelos cadastrados</p>
            <p className="sol-filtros-subtitle">Revise quais arquivos ficam disponiveis para cada empreendimento.</p>
          </div>
          <div className="sol-filtros-meta">
            <span>{modelosFiltrados.length} de {modelos.length}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="sol-filter-field">
            <span className="sol-filter-label">Empreendimento</span>
            <select className="input w-full" value={filtroEmpreendimento} onChange={(event) => setFiltroEmpreendimento(event.target.value)}>
              <option value="">Todos</option>
              {empreendimentos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </label>
          <label className="sol-filter-field">
            <span className="sol-filter-label">Tipo</span>
            <select className="input w-full" value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)}>
              <option value="">Todos</option>
              {TIPOS_DOCUMENTO_MODELO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>

        {modelosFiltrados.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {modelosFiltrados.map((modelo) => (
              <article key={modelo.id} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">{documentoTipoLabel(modelo.tipo_documento)}</div>
                <div className="mt-2 text-sm font-semibold text-[var(--c-text)]">{modelo.nome}</div>
                <div className="mt-1 text-xs text-[var(--c-muted)]">{modelo.empreendimento?.nome || 'Empreendimento nao informado'}</div>
                {modelo.descricao && <div className="mt-3 text-xs text-[var(--c-muted)]">{modelo.descricao}</div>}
              </article>
            ))}
          </div>
        ) : (
          <div className="app-empty-card mt-4">Nenhum modelo encontrado.</div>
        )}
      </section>
    </div>
  );
}
