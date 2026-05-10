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

function getOptionGroup(config, key) {
  return Array.isArray(config?.opcoes_pagamento?.[key]) ? config.opcoes_pagamento[key] : [];
}

function createOptionTemplate(groupKey) {
  const base = { value: '', label: '', ativo: true };
  if (groupKey === 'reajustes') return { ...base, resumo: '' };
  if (groupKey === 'periodicidades') return { ...base, intervalMonths: '' };
  return base;
}

function updateOptionGroup(config, groupKey, updater) {
  const currentItems = getOptionGroup(config, groupKey);
  const nextItems = typeof updater === 'function' ? updater(currentItems) : updater;
  return {
    ...config,
    opcoes_pagamento: {
      ...(config.opcoes_pagamento || {}),
      [groupKey]: nextItems
    }
  };
}

function getOptionPayload(config) {
  return {
    modos: getOptionGroup(config, 'modos'),
    tipos_parcela: getOptionGroup(config, 'tipos_parcela'),
    formas_recebimento: getOptionGroup(config, 'formas_recebimento'),
    reajustes: getOptionGroup(config, 'reajustes'),
    periodicidades: getOptionGroup(config, 'periodicidades')
  };
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

function OpcoesCrud({ title, description, groupKey, itens, onChange }) {
  const showResumo = groupKey === 'reajustes';
  const showInterval = groupKey === 'periodicidades';
  const ativos = (itens || []).filter((item) => item.ativo !== false).length;

  function updateItem(index, patch) {
    onChange((itens || []).map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  }

  function addItem() {
    onChange([...(itens || []), createOptionTemplate(groupKey)]);
  }

  function removeItem(index) {
    onChange((itens || []).filter((_, itemIndex) => itemIndex !== index));
  }

  function markAll(ativo) {
    onChange((itens || []).map((item) => ({ ...item, ativo })));
  }

  return (
    <section className="sol-surface-card rounded-2xl p-4 md:p-5">
      <div className="sol-filtros-head">
        <div>
          <p className="sol-filtros-title">{title}</p>
          <p className="sol-filtros-subtitle">{description}</p>
        </div>
        <span className="sol-filtros-meta">{ativos} ativa(s)</span>
      </div>

      {(itens || []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => markAll(true)}>
            Marcar todos
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => markAll(false)}>
            Desmarcar todos
          </button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {(itens || []).map((item, index) => (
          <div
            key={`${groupKey}-${index}`}
            className="grid gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 text-sm text-[var(--c-text)] md:grid-cols-[auto_minmax(110px,0.75fr)_minmax(160px,1fr)_auto]"
          >
            <label className="flex items-center gap-2 font-semibold text-[var(--c-text)]">
              <input
                type="checkbox"
                checked={item.ativo !== false}
                onChange={(event) => updateItem(index, { ativo: event.target.checked })}
              />
              Ativo
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Codigo</span>
              <input
                className="input w-full uppercase"
                value={item.value || ''}
                onChange={(event) => updateItem(index, { value: event.target.value })}
                placeholder="Ex.: MENSAL"
              />
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Nome exibido</span>
              <input
                className="input w-full"
                value={item.label || ''}
                onChange={(event) => updateItem(index, { label: event.target.value })}
                placeholder="Ex.: Mensal"
              />
            </label>
            <div className="flex items-end">
              <button type="button" className="btn btn-outline w-full border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => removeItem(index)}>
                Excluir
              </button>
            </div>

            {(showResumo || showInterval) && (
              <div className="md:col-start-2 md:col-span-2">
                {showResumo && (
                  <label className="sol-filter-field max-w-[220px]">
                    <span className="sol-filter-label">Resumo no contrato</span>
                    <input
                      className="input w-full uppercase"
                      value={item.resumo || ''}
                      onChange={(event) => updateItem(index, { resumo: event.target.value })}
                      placeholder="F ou R"
                    />
                  </label>
                )}
                {showInterval && (
                  <label className="sol-filter-field max-w-[220px]">
                    <span className="sol-filter-label">Intervalo em meses</span>
                    <input
                      className="input w-full"
                      type="number"
                      min="0"
                      value={item.intervalMonths ?? ''}
                      onChange={(event) => updateItem(index, { intervalMonths: event.target.value })}
                      placeholder="Ex.: 1"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button type="button" className="btn btn-outline" onClick={addItem}>
          Adicionar opcao
        </button>
      </div>

      {(itens || []).length === 0 && (
        <div className="app-empty-card mt-4">Nenhuma opcao cadastrada.</div>
      )}
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
        opcoes_pagamento: getOptionPayload(config)
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
        <OpcoesCrud
          title="Modo"
          description="Controla os modos disponiveis para compor a forma de pagamento."
          groupKey="modos"
          itens={config.opcoes_pagamento?.modos || []}
          onChange={(values) => setConfig((current) => updateOptionGroup(current, 'modos', values))}
        />

        <OpcoesCrud
          title="Tipo da parcela"
          description="Define os tipos de parcelas que podem ser usados nos blocos e linhas manuais."
          groupKey="tipos_parcela"
          itens={config.opcoes_pagamento?.tipos_parcela || []}
          onChange={(values) => setConfig((current) => updateOptionGroup(current, 'tipos_parcela', values))}
        />

        <OpcoesCrud
          title="Forma prevista"
          description="Define as formas de recebimento previstas exibidas no contrato."
          groupKey="formas_recebimento"
          itens={config.opcoes_pagamento?.formas_recebimento || []}
          onChange={(values) => setConfig((current) => updateOptionGroup(current, 'formas_recebimento', values))}
        />

        <OpcoesCrud
          title="Reajuste"
          description="Define se as parcelas podem ser fixas, reajustaveis ou ambas."
          groupKey="reajustes"
          itens={config.opcoes_pagamento?.reajustes || []}
          onChange={(values) => setConfig((current) => updateOptionGroup(current, 'reajustes', values))}
        />

        <OpcoesCrud
          title="Periodicidade"
          description="Define as periodicidades que aparecem nas parcelas periodicas."
          groupKey="periodicidades"
          itens={config.opcoes_pagamento?.periodicidades || []}
          onChange={(values) => setConfig((current) => updateOptionGroup(current, 'periodicidades', values))}
        />
      </section>
    </div>
  );
}
