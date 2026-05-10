import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getComercialCategoriasContrato,
  salvarComercialCategoriasContrato
} from '../services/configuracoesSistema';

function toggleId(list, id, checked) {
  const current = new Set((list || []).map(Number));
  if (checked) {
    current.add(Number(id));
  } else {
    current.delete(Number(id));
  }
  return Array.from(current);
}

function toggleValue(list, value, checked) {
  const normalized = String(value || '').trim().toUpperCase();
  const current = new Set((list || []).map((item) => String(item || '').trim().toUpperCase()).filter(Boolean));
  if (checked) {
    current.add(normalized);
  } else {
    current.delete(normalized);
  }
  return Array.from(current);
}

function getActiveOptions(config, key) {
  return Array.isArray(config?.opcoes_pagamento?.[key]) ? config.opcoes_pagamento[key] : [];
}

function CategoriaChecklist({ title, description, categorias, selectedIds, onChange }) {
  const selected = new Set((selectedIds || []).map(Number));
  const allIds = (categorias || []).map((categoria) => Number(categoria.id)).filter(Number.isFinite);

  return (
    <section className="sol-surface-card rounded-2xl p-4 md:p-5">
      <div className="sol-filtros-head">
        <div>
          <p className="sol-filtros-title">{title}</p>
          <p className="sol-filtros-subtitle">{description}</p>
        </div>
        <span className="sol-filtros-meta">{selected.size} selecionada(s)</span>
      </div>

      {(categorias || []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange(allIds)}>
            Marcar todos
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange([])}>
            Desmarcar todos
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {(categorias || []).map((categoria) => (
          <label
            key={categoria.id}
            className="flex items-start gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 text-sm text-[var(--c-text)]"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.has(Number(categoria.id))}
              onChange={(event) => onChange(toggleId(selectedIds, categoria.id, event.target.checked))}
            />
            <span>
              <span className="block font-semibold">{categoria.nome}</span>
              <span className="block text-xs text-[var(--c-muted)]">{categoria.tipo}</span>
            </span>
          </label>
        ))}
      </div>

      {(categorias || []).length === 0 && (
        <div className="app-empty-card mt-4">Nenhuma categoria financeira compativel encontrada.</div>
      )}
    </section>
  );
}

function OpcaoChecklist({ title, description, itens, selectedValues, onChange }) {
  const selected = new Set((selectedValues || []).map((item) => String(item || '').trim().toUpperCase()).filter(Boolean));
  const allValues = (itens || []).map((item) => item.value);

  return (
    <section className="sol-surface-card rounded-2xl p-4 md:p-5">
      <div className="sol-filtros-head">
        <div>
          <p className="sol-filtros-title">{title}</p>
          <p className="sol-filtros-subtitle">{description}</p>
        </div>
        <span className="sol-filtros-meta">{selected.size} ativa(s)</span>
      </div>

      {(itens || []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange(allValues)}>
            Marcar todos
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange([])}>
            Desmarcar todos
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {(itens || []).map((item) => (
          <label
            key={item.value}
            className="flex items-start gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 text-sm text-[var(--c-text)]"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.has(String(item.value || '').trim().toUpperCase())}
              onChange={(event) => onChange(toggleValue(selectedValues, item.value, event.target.checked))}
            />
            <span>
              <span className="block font-semibold">{item.label || item.value}</span>
              {item.resumo && <span className="block text-xs text-[var(--c-muted)]">Resumo: {item.resumo}</span>}
              {Number.isFinite(item.intervalMonths) && (
                <span className="block text-xs text-[var(--c-muted)]">
                  Intervalo: {item.intervalMonths === 0 ? 'sem intervalo' : `${item.intervalMonths} mes(es)`}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default function ConfiguracoesComercialCategorias() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    contrato_venda_categoria_ids: [],
    comissao_categoria_ids: [],
    categorias_contrato: [],
    categorias_comissao: [],
    opcoes_pagamento: {}
  });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getComercialCategoriasContrato();
        if (active) setConfig(data || {});
      } catch (err) {
        if (active) setError(err?.message || 'Erro ao carregar configuracao comercial');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setError('');
      const data = await salvarComercialCategoriasContrato({
        contrato_venda_categoria_ids: config.contrato_venda_categoria_ids,
        comissao_categoria_ids: config.comissao_categoria_ids,
        opcoes_pagamento: {
          modos_ativos: getActiveOptions(config, 'modos_ativos'),
          tipos_parcela_ativos: getActiveOptions(config, 'tipos_parcela_ativos'),
          formas_recebimento_ativas: getActiveOptions(config, 'formas_recebimento_ativas'),
          reajustes_ativos: getActiveOptions(config, 'reajustes_ativos'),
          periodicidades_ativas: getActiveOptions(config, 'periodicidades_ativas')
        }
      });
      setConfig(data || config);
      alert('Categorias comerciais atualizadas com sucesso.');
    } catch (err) {
      setError(err?.message || 'Erro ao salvar configuracao comercial');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page solicitacoes-page">
        <div className="app-empty-card">Carregando categorias comerciais...</div>
      </div>
    );
  }

  return (
    <div className="page solicitacoes-page space-y-5 md:space-y-6">
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Categorias comerciais</h1>
            <p className="page-subtitle">
              Selecione categorias financeiras e opcoes exibidas na forma de pagamento do contrato de venda.
            </p>
          </div>
          <div className="app-page-actions">
            <Link className="btn btn-outline" to="/financeiro/cadastros">
              Abrir cadastros financeiros
            </Link>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar configuracao'}
            </button>
          </div>
        </div>
      </header>

      {error && <div className="app-alert app-alert--error">{error}</div>}

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Origem das configuracoes</p>
            <p className="sol-filtros-subtitle">
              Cadastre e mantenha as categorias no Financeiro. Aqui o Comercial escolhe quais categorias e quais opcoes aparecem no contrato.
            </p>
          </div>
        </div>
      </section>

      <CategoriaChecklist
        title="Contrato de venda"
        description="Categorias de contas a receber exibidas no campo Categoria financeira."
        categorias={config.categorias_contrato || []}
        selectedIds={config.contrato_venda_categoria_ids || []}
        onChange={(ids) => setConfig((current) => ({ ...current, contrato_venda_categoria_ids: ids }))}
      />

      <CategoriaChecklist
        title="Comissao"
        description="Categorias de contas a pagar exibidas no campo Categoria comissao."
        categorias={config.categorias_comissao || []}
        selectedIds={config.comissao_categoria_ids || []}
        onChange={(ids) => setConfig((current) => ({ ...current, comissao_categoria_ids: ids }))}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <OpcaoChecklist
          title="Modo"
          description="Controla os modos disponiveis para compor a forma de pagamento."
          itens={config.opcoes_pagamento?.modos || []}
          selectedValues={getActiveOptions(config, 'modos_ativos')}
          onChange={(values) => setConfig((current) => ({
            ...current,
            opcoes_pagamento: { ...(current.opcoes_pagamento || {}), modos_ativos: values }
          }))}
        />

        <OpcaoChecklist
          title="Tipo da parcela"
          description="Define os tipos de parcelas que podem ser usados nos blocos e linhas manuais."
          itens={config.opcoes_pagamento?.tipos_parcela || []}
          selectedValues={getActiveOptions(config, 'tipos_parcela_ativos')}
          onChange={(values) => setConfig((current) => ({
            ...current,
            opcoes_pagamento: { ...(current.opcoes_pagamento || {}), tipos_parcela_ativos: values }
          }))}
        />

        <OpcaoChecklist
          title="Forma prevista"
          description="Define as formas de recebimento previstas exibidas no contrato."
          itens={config.opcoes_pagamento?.formas_recebimento || []}
          selectedValues={getActiveOptions(config, 'formas_recebimento_ativas')}
          onChange={(values) => setConfig((current) => ({
            ...current,
            opcoes_pagamento: { ...(current.opcoes_pagamento || {}), formas_recebimento_ativas: values }
          }))}
        />

        <OpcaoChecklist
          title="Reajuste"
          description="Define se as parcelas podem ser fixas, reajustaveis ou ambas."
          itens={config.opcoes_pagamento?.reajustes || []}
          selectedValues={getActiveOptions(config, 'reajustes_ativos')}
          onChange={(values) => setConfig((current) => ({
            ...current,
            opcoes_pagamento: { ...(current.opcoes_pagamento || {}), reajustes_ativos: values }
          }))}
        />

        <OpcaoChecklist
          title="Periodicidade"
          description="Define as periodicidades que aparecem nas parcelas periodicas."
          itens={config.opcoes_pagamento?.periodicidades || []}
          selectedValues={getActiveOptions(config, 'periodicidades_ativas')}
          onChange={(values) => setConfig((current) => ({
            ...current,
            opcoes_pagamento: { ...(current.opcoes_pagamento || {}), periodicidades_ativas: values }
          }))}
        />
      </section>
    </div>
  );
}
