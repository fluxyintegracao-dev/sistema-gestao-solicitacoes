import { useEffect, useState } from 'react';
import {
  getComercialCategoriasContrato,
  salvarComercialCategoriasContrato
} from '../services/configuracoesSistema';
import { Pagina, PageHeader, Avisos, useAvisos } from '../components/padrao';

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
    <section className="sol-surface-card rounded-2xl p-4">
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

function CategoriaSelect({ title, description, categorias, value, onChange }) {
  const selected = Number(value || 0);

  return (
    <section className="sol-surface-card rounded-2xl p-4">
      <div className="sol-filtros-head">
        <div>
          <p className="sol-filtros-title">{title}</p>
          <p className="sol-filtros-subtitle">{description}</p>
        </div>
      </div>

      <div className="mt-4">
        <label className="sol-filter-field">
          <span className="sol-filter-label">Categoria financeira</span>
          <select
            className="input w-full"
            value={selected ? String(selected) : ''}
            onChange={(event) => onChange(event.target.value ? Number(event.target.value) : '')}
          >
            <option value="">Selecione uma categoria para comissão</option>
            {(categorias || []).map((categoria) => (
              <option key={categoria.id} value={Number(categoria.id)}>
                {categoria.nome}{categoria.tipo ? ` - ${categoria.tipo}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(categorias || []).length === 0 && (
        <div className="app-empty-card mt-4">Nenhuma categoria financeira compatível encontrada.</div>
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
    <section className="sol-surface-card rounded-2xl p-4">
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
              <button type="button" className="btn btn-outline btn-perigo-suave w-full" onClick={() => removeItem(index)}>
                Excluir
              </button>
            </div>

            {(showResumo || showInterval) && (
              <div className="md:col-start-2 md:col-span-2">
                {showResumo && (
                  <label className="sol-filter-field">
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
                  <label className="sol-filter-field">
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
  // R3: o erro era um <div className="app-alert app-alert--error"> montado à
  // mão e o sucesso era um alert() do navegador. Os dois passam a ser aviso
  // do sistema — mesmo tom semântico, mensurável pelo harness, fechável.
  const { avisos, avisar, fechar } = useAvisos();
  const [config, setConfig] = useState({
    contrato_venda_categoria_ids: [],
    comissao_categoria_id: '',
    categorias_contrato: [],
    categorias_comissao: [],
    opcoes_pagamento: {}
  });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getComercialCategoriasContrato();
        if (!active) return;
        const nextConfig = data || {};
        setConfig({
          contrato_venda_categoria_ids: Array.isArray(nextConfig.contrato_venda_categoria_ids)
            ? nextConfig.contrato_venda_categoria_ids
            : [],
          comissao_categoria_id: nextConfig.comissao_categoria_id || '',
          categorias_contrato: nextConfig.categorias_contrato || [],
          categorias_comissao: nextConfig.categorias_comissao || [],
          opcoes_pagamento: nextConfig.opcoes_pagamento || {}
        });
      } catch (err) {
        if (active) avisar.erro(err?.message || 'Erro ao carregar configuracao comercial');
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
      const data = await salvarComercialCategoriasContrato({
        contrato_venda_categoria_ids: config.contrato_venda_categoria_ids,
        comissao_categoria_id: config.comissao_categoria_id,
        opcoes_pagamento: getOptionPayload(config)
      });
      if (data) {
        setConfig((current) => ({
          ...current,
          contrato_venda_categoria_ids: Array.isArray(data.contrato_venda_categoria_ids)
            ? data.contrato_venda_categoria_ids
            : current.contrato_venda_categoria_ids,
          comissao_categoria_id: data.comissao_categoria_id || ''
        }));
      }
      avisar.sucesso('Categorias comerciais atualizadas com sucesso.');
    } catch (err) {
      avisar.erro(err?.message || 'Erro ao salvar configuracao comercial');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Pagina>
        <div className="app-empty-card">Carregando categorias comerciais...</div>
      </Pagina>
    );
  }

  return (
    // C1: a tela usava .app-page-header SEM o Pagina. Essa classe é sticky em
    // --pos-cabecalho-fixo, e quem mede a topbar e publica essa variável é só
    // o Pagina — sem ele a faixa grudava no fallback de 96px, que é a origem
    // do vão transparente. C2/R10: o título vem do PageHeader (22px), não de
    // um text-xl escrito aqui; M2/R10: o ritmo vertical é do Pagina.
    <Pagina>
      <PageHeader
        titulo="Categorias comerciais"
        descricao="Selecione categorias financeiras e opcoes exibidas na forma de pagamento do contrato de venda."
        acaoPrincipal={{
          rotulo: saving ? 'Salvando...' : 'Salvar configuracao',
          onClick: handleSave,
          desabilitada: saving
        }}
      />
      {/* C6/R11 (decisão do cliente, 04/09): o "Abrir cadastros financeiros"
          saiu da barra de ações — ela é para ações SOBRE ESTA TELA, e caminho
          para outra tela mora no hub/breadcrumb/Ctrl+K. O destino já tem porta
          no menu (navigationConfig, item fin-cadastros), então remover não
          cria porta ausente; e o bloco "Origem das configuracoes" abaixo
          continua dizendo, em texto, que o cadastro é no Financeiro. */}

      <Avisos avisos={avisos} aoFechar={fechar} />

      <section className="sol-surface-card rounded-2xl p-4">
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

      <CategoriaSelect
        title="Comissao (global)"
        description="Categoria única usada em todos os contratos com corretor. Não é exibida na tela de contratos."
        categorias={config.categorias_comissao || []}
        value={config.comissao_categoria_id || ''}
        onChange={(value) => setConfig((current) => ({ ...current, comissao_categoria_id: value }))}
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
    </Pagina>
  );
}
