import { useEffect, useMemo, useState } from 'react';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import {
  getProvisionamentoFluxoConfig,
  salvarProvisionamentoFluxoConfig
} from '../services/configuracoesSistema';

const DEFAULT_CONFIG = {
  modo_operacional: 'INFORMATIVO',
  aprovacao_ativa: false,
  controle_vencimento_ativo: false,
  integracao_solicitacoes_ativa: false,
  exigir_provisao_na_solicitacao: false,
  bloquear_solicitacao_sem_provisao: false,
  validar_saldo_provisao: false,
  somente_provisoes_aprovadas: false,
  permitir_multiplas_provisoes_por_solicitacao: true,
  tipos_solicitacao_exigem_provisao: []
};

const MODOS = [
  {
    value: 'INFORMATIVO',
    title: 'Informativo',
    description: 'Cadastro e leitura gerencial das provisoes, sem aprovar, bloquear ou exigir vinculos.'
  },
  {
    value: 'CONTROLADO',
    title: 'Controlado',
    description: 'Habilita regras de aprovacao e vencimento sem obrigar provisao na solicitacao.'
  },
  {
    value: 'INTEGRADO',
    title: 'Integrado',
    description: 'Prepara a exigencia de provisao em tipos de solicitacao definidos pelo SUPERADMIN.'
  }
];

function normalizarConfig(data) {
  return {
    ...DEFAULT_CONFIG,
    ...(data && typeof data === 'object' ? data : {}),
    tipos_solicitacao_exigem_provisao: Array.isArray(data?.tipos_solicitacao_exigem_provisao)
      ? data.tipos_solicitacao_exigem_provisao.map(Number).filter(Number.isFinite)
      : []
  };
}

export default function ConfiguracoesProvisionamentoFluxo() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [configData, tiposData] = await Promise.all([
          getProvisionamentoFluxoConfig(),
          getTiposSolicitacao()
        ]);
        if (!active) return;
        setConfig(normalizarConfig(configData));
        setTipos(Array.isArray(tiposData) ? tiposData.filter((tipo) => tipo?.ativo !== false) : []);
      } catch (error) {
        console.error(error);
        if (active) {
          alert(error.message || 'Erro ao carregar configuracao do provisionamento.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const modoSelecionado = useMemo(
    () => MODOS.find((modo) => modo.value === config.modo_operacional) || MODOS[0],
    [config.modo_operacional]
  );

  const modoInformativo = config.modo_operacional === 'INFORMATIVO';
  const modoControlado = config.modo_operacional === 'CONTROLADO';
  const modoIntegrado = config.modo_operacional === 'INTEGRADO';

  function updateConfig(field, value) {
    setConfig((current) => {
      const next = { ...current, [field]: value };

      if (field === 'modo_operacional') {
        if (value === 'INFORMATIVO') {
          return {
            ...next,
            aprovacao_ativa: false,
            controle_vencimento_ativo: false,
            integracao_solicitacoes_ativa: false,
            exigir_provisao_na_solicitacao: false,
            bloquear_solicitacao_sem_provisao: false,
            validar_saldo_provisao: false,
            somente_provisoes_aprovadas: false
          };
        }

        if (value === 'CONTROLADO') {
          return {
            ...next,
            integracao_solicitacoes_ativa: false,
            exigir_provisao_na_solicitacao: false,
            bloquear_solicitacao_sem_provisao: false
          };
        }
      }

      if (field === 'integracao_solicitacoes_ativa' && value === false) {
        next.exigir_provisao_na_solicitacao = false;
        next.bloquear_solicitacao_sem_provisao = false;
      }

      return next;
    });
  }

  function toggleTipo(tipoId) {
    const id = Number(tipoId);
    if (!Number.isInteger(id) || id <= 0) return;

    setConfig((current) => {
      const atual = new Set(current.tipos_solicitacao_exigem_provisao || []);
      if (atual.has(id)) {
        atual.delete(id);
      } else {
        atual.add(id);
      }

      return {
        ...current,
        tipos_solicitacao_exigem_provisao: Array.from(atual)
      };
    });
  }

  async function salvar() {
    try {
      setSaving(true);
      const data = await salvarProvisionamentoFluxoConfig(config);
      setConfig(normalizarConfig(data));
      alert('Configuracao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar configuracao.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card">Carregando configuracao do provisionamento...</div>;
  }

  return (
    <div className="config-page solicitacoes-page space-y-5 md:space-y-6">
      <header className="config-page-header">
        <div className="config-page-header-row">
          <div>
            <h1 className="config-page-title">Fluxo do Provisionamento</h1>
            <p className="config-page-subtitle">
              Controle quando o provisionamento deve ser apenas informativo e quando passa a orientar solicitacoes.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={salvar}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar configuracao'}
          </button>
        </div>
      </header>

      <section className="config-summary-card">
        <div>
          <p className="config-summary-kicker">Modo atual</p>
          <h2 className="config-summary-title">{modoSelecionado.title}</h2>
          <p className="config-summary-copy">{modoSelecionado.description}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {MODOS.map((modo) => (
          <button
            key={modo.value}
            type="button"
            className={`rounded-2xl border p-4 text-left transition ${
              config.modo_operacional === modo.value
                ? 'border-blue-300 bg-blue-50 text-blue-950'
                : 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text)] hover:border-blue-200'
            }`}
            onClick={() => updateConfig('modo_operacional', modo.value)}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
              Modo operacional
            </span>
            <strong className="mt-2 block text-base">{modo.title}</strong>
            <span className="mt-2 block text-sm text-[var(--c-muted)]">{modo.description}</span>
          </button>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="card space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
              Regras de controle
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--c-text)]">Aprovacao, vencimento e bloqueios</h2>
          </div>

          <ConfigToggle
            title="Aprovacao ativa"
            description="Libera o uso gerencial dos estados de analise e aprovacao."
            checked={config.aprovacao_ativa}
            disabled={modoInformativo}
            onChange={(checked) => updateConfig('aprovacao_ativa', checked)}
          />
          <ConfigToggle
            title="Controle de vencimento ativo"
            description="Prepara alertas e acoes obrigatorias por data prevista."
            checked={config.controle_vencimento_ativo}
            disabled={modoInformativo}
            onChange={(checked) => updateConfig('controle_vencimento_ativo', checked)}
          />
          <ConfigToggle
            title="Integrar com solicitacoes"
            description="Permite que solicitacoes sejam vinculadas a provisoes por registro estruturado."
            checked={config.integracao_solicitacoes_ativa}
            disabled={!modoIntegrado}
            onChange={(checked) => updateConfig('integracao_solicitacoes_ativa', checked)}
          />
          <ConfigToggle
            title="Exigir provisao na solicitacao"
            description="Torna a selecao de provisao obrigatoria para os tipos marcados."
            checked={config.exigir_provisao_na_solicitacao}
            disabled={!modoIntegrado || !config.integracao_solicitacoes_ativa}
            onChange={(checked) => updateConfig('exigir_provisao_na_solicitacao', checked)}
          />
          <ConfigToggle
            title="Bloquear solicitacao sem provisao"
            description="Impede o envio de solicitacoes de tipos marcados quando o vinculo nao existir."
            checked={config.bloquear_solicitacao_sem_provisao}
            disabled={!modoIntegrado || !config.integracao_solicitacoes_ativa || !config.exigir_provisao_na_solicitacao}
            onChange={(checked) => updateConfig('bloquear_solicitacao_sem_provisao', checked)}
          />
          <ConfigToggle
            title="Validar saldo da provisao"
            description="Reserva validacao futura para comparar valor solicitado com saldo disponivel."
            checked={config.validar_saldo_provisao}
            disabled={!modoIntegrado || !config.integracao_solicitacoes_ativa}
            onChange={(checked) => updateConfig('validar_saldo_provisao', checked)}
          />
          <ConfigToggle
            title="Somente provisoes aprovadas"
            description="Restringe o vinculo a provisoes aprovadas quando o fluxo de aprovacao estiver ativo."
            checked={config.somente_provisoes_aprovadas}
            disabled={!modoIntegrado || !config.integracao_solicitacoes_ativa || !config.aprovacao_ativa}
            onChange={(checked) => updateConfig('somente_provisoes_aprovadas', checked)}
          />
          <ConfigToggle
            title="Permitir multiplas provisoes por solicitacao"
            description="Mantem a arquitetura aberta para uma solicitacao consumir mais de uma provisao."
            checked={config.permitir_multiplas_provisoes_por_solicitacao}
            disabled={!modoIntegrado || !config.integracao_solicitacoes_ativa}
            onChange={(checked) => updateConfig('permitir_multiplas_provisoes_por_solicitacao', checked)}
          />

          {modoControlado ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              O modo controlado prepara aprovacao e vencimento sem exigir provisao nas solicitacoes.
            </div>
          ) : null}
        </div>

        <aside className="card space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
              Tipos integrados
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--c-text)]">Solicitacoes que exigem provisao</h2>
            <p className="mt-1 text-sm text-[var(--c-muted)]">
              A lista so tem efeito quando o modo integrado e a exigencia estiverem ativos.
            </p>
          </div>

          <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
            {tipos.map((tipo) => {
              const checked = config.tipos_solicitacao_exigem_provisao.includes(Number(tipo.id));
              return (
                <label
                  key={tipo.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm ${
                    checked
                      ? 'border-blue-200 bg-blue-50 text-blue-950'
                      : 'border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)]'
                  } ${!modoIntegrado ? 'opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    disabled={!modoIntegrado}
                    onChange={() => toggleTipo(tipo.id)}
                  />
                  <span>
                    <strong className="block">{tipo.nome}</strong>
                    <span className="text-xs text-[var(--c-muted)]">
                      ID {tipo.id}
                    </span>
                  </span>
                </label>
              );
            })}

            {!tipos.length ? (
              <p className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-3 text-sm text-[var(--c-muted)]">
                Nenhum tipo de solicitacao ativo encontrado.
              </p>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}

function ConfigToggle({ title, description, checked, disabled, onChange }) {
  return (
    <label className={`flex items-start justify-between gap-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-3 ${disabled ? 'opacity-60' : ''}`}>
      <span>
        <strong className="block text-sm text-[var(--c-text)]">{title}</strong>
        <span className="mt-1 block text-xs text-[var(--c-muted)]">{description}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
