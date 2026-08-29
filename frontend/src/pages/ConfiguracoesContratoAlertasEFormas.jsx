import { useCallback, useEffect, useState } from 'react';
import { API_URL, authHeaders } from '../services/api';

/**
 * Duas configuracoes de contrato que so existiam pela API (24/08).
 *
 * 1. **Alerta de saldo do contrato** (item 21): os cortes e as cores dos tres niveis — Saudavel,
 *    Normal e Critico. O cliente pediu a tela junto com o alerta: *"os percentuais mudam com o
 *    tempo"*;
 * 2. **Formas de pagamento dos fluxos**: quais das formas cadastradas aparecem na Nova Solicitacao,
 *    no fluxo novo de contratos e nas medicoes. Uma unica selecao evita divergencia entre telas.
 *
 * As duas moram na mesma pagina porque sao a mesma natureza — configuracao do fluxo de contrato — e
 * separa-las criaria dois itens de menu para duas listas curtas.
 *
 * Nas duas, a regra que este projeto ja registrou: **configuracao CURA, nunca substitui o cadastro**.
 * As formas continuam vindo de `financeiro_formas_pagamento`; a configuracao so diz quais aparecem.
 * E lista vazia significa TODAS — sem isso o sistema nasceria travado, sem forma nenhuma para
 * escolher, ate alguem abrir esta tela.
 */

const NIVEIS = [
  { chave: 'cor_saudavel', rotulo: 'Saudavel', ajuda: 'Ha folga no contrato.' },
  { chave: 'cor_normal', rotulo: 'Normal', ajuda: 'Ainda ha saldo, mas ja pede atencao.' },
  { chave: 'cor_critico', rotulo: 'Critico', ajuda: 'O contrato esta no fim do saldo.' }
];

export default function ConfiguracoesContratoAlertasEFormas() {
  const [alerta, setAlerta] = useState(null);
  const [limiteContrato, setLimiteContrato] = useState(null);
  const [formas, setFormas] = useState([]);
  const [limitesDespesa, setLimitesDespesa] = useState(null);
  const [todasAsFormas, setTodasAsFormas] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState('');

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const [resAlerta, resLimiteContrato, resFormas, resLimitesDespesa] = await Promise.all([
        fetch(`${API_URL}/configuracoes/alerta-saldo-contrato`, { headers: authHeaders() }),
        fetch(`${API_URL}/configuracoes/contrato-limite-juridico`, { headers: authHeaders() }),
        fetch(`${API_URL}/configuracoes/formas-pagamento-medicao`, { headers: authHeaders() }),
        fetch(`${API_URL}/configuracoes/despesa-eventual-limites`, { headers: authHeaders() })
      ]);
      if (!resAlerta.ok || !resLimiteContrato.ok || !resFormas.ok || !resLimitesDespesa.ok) {
        throw new Error('Erro ao carregar as configuracoes.');
      }

      setAlerta(await resAlerta.json());
      setLimiteContrato(await resLimiteContrato.json());
      const dadosFormas = await resFormas.json();
      setFormas(Array.isArray(dadosFormas?.formas) ? dadosFormas.formas : []);
      setTodasAsFormas(dadosFormas?.todas !== false);
      setLimitesDespesa(await resLimitesDespesa.json());
    } catch (e) {
      setErro(e.message || 'Erro ao carregar as configuracoes.');
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function salvarLimiteContrato(event) {
    event.preventDefault();
    if (salvando) return;
    setErro('');
    setAviso('');
    setSalvando('limite-contrato');
    try {
      const res = await fetch(`${API_URL}/configuracoes/contrato-limite-juridico`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ limite: limiteContrato.limite })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Erro ao salvar o limite juridico do contrato.');
      setLimiteContrato(json);
      setAviso('Limite juridico dos contratos salvo.');
    } catch (e) {
      setErro(e.message || 'Erro ao salvar o limite juridico do contrato.');
    } finally {
      setSalvando('');
    }
  }

  async function salvarAlerta(event) {
    event.preventDefault();
    setErro('');
    setAviso('');
    setSalvando('alerta');
    try {
      const res = await fetch(`${API_URL}/configuracoes/alerta-saldo-contrato`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(alerta)
      });
      const json = await res.json().catch(() => ({}));
      // A recusa do backend e informativa ("o corte de Saudavel tem de ser maior..."): mostrar o
      // texto dele e melhor do que traduzir a regra numa segunda mensagem aqui.
      if (!res.ok) throw new Error(json?.error || 'Erro ao salvar o alerta.');
      setAlerta(json);
      setAviso('Alerta de saldo salvo.');
    } catch (e) {
      setErro(e.message || 'Erro ao salvar o alerta.');
    } finally {
      setSalvando('');
    }
  }

  async function salvarFormas() {
    setErro('');
    setAviso('');
    setSalvando('formas');
    try {
      // Lista dos LIBERADOS. Se todas estiverem marcadas, manda vazio de propósito: "vazio = todas"
      // e o padrao aberto, e gravar a lista inteira congelaria as formas que forem cadastradas
      // depois — elas nasceriam invisiveis na medicao.
      const marcadas = formas.filter((f) => f.liberada).map((f) => f.id);
      const todas = marcadas.length === formas.length;

      const res = await fetch(`${API_URL}/configuracoes/formas-pagamento-medicao`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ formas: todas ? [] : marcadas })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Erro ao salvar as formas.');

      setFormas(Array.isArray(json?.formas) ? json.formas : []);
      setTodasAsFormas(json?.todas !== false);
      setAviso(todas
        ? 'Todas as formas ativas voltam a aparecer nos fluxos — inclusive as cadastradas depois.'
        : 'Formas de pagamento da Nova Solicitacao salvas.');
    } catch (e) {
      setErro(e.message || 'Erro ao salvar as formas.');
    } finally {
      setSalvando('');
    }
  }

  async function salvarLimitesDespesa(event) {
    event.preventDefault();
    setErro('');
    setAviso('');
    setSalvando('despesa-eventual');
    try {
      const res = await fetch(`${API_URL}/configuracoes/despesa-eventual-limites`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          limite_solicitacao: limitesDespesa.limite_solicitacao,
          limite_obra: limitesDespesa.limite_obra
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Erro ao salvar os limites da Despesa Eventual.');
      setLimitesDespesa(json);
      setAviso('Limites da Despesa Eventual salvos.');
    } catch (e) {
      setErro(e.message || 'Erro ao salvar os limites da Despesa Eventual.');
    } finally {
      setSalvando('');
    }
  }

  function alterarAlerta(campo, valor) {
    setAlerta((atual) => ({ ...atual, [campo]: valor }));
    // MEXER NUM CAMPO APAGA A MENSAGEM ANTERIOR.
    //
    // Sem isto, a recusa de uma tentativa ficava na tela enquanto a pessoa corrigia os valores — e
    // pior: quando o proprio navegador barra o envio (os campos tem `max="100"`, e a validacao
    // nativa impede o submit), a mensagem exibida era a da tentativa ANTERIOR, dizendo uma coisa
    // enquanto a bolha do navegador dizia outra. Encontrado rodando a matriz de teste na tela.
    setErro('');
    setAviso('');
  }

  if (!alerta || !limiteContrato || !limitesDespesa) {
    return <div className="card"><p className="text-sm text-[var(--c-muted)]">Carregando configuracoes...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--c-text)]">Formas de pagamento da Nova Solicitacao</h1>
        <p className="text-sm text-[var(--c-muted)]">
          Selecione as formas que aparecem no fluxo novo de Contratos e nos demais tipos de
          solicitacao. A mesma lista tambem e usada nas medicoes de contrato.
        </p>
        <a className="btn btn-outline btn-sm mt-3" href="#formas-pagamento-solicitacao">
          Ir para formas de pagamento
        </a>
      </div>

      {erro && <div className="app-alert app-alert--error">{erro}</div>}
      {aviso && <div className="app-alert app-alert--success">{aviso}</div>}

      <form className="card space-y-4" onSubmit={salvarLimiteContrato} data-testid="config-limite-juridico">
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)]">Limite para análise jurídica</h2>
          <p className="text-sm text-[var(--c-muted)]">
            Contratos acima deste valor seguem da Gerência de Processos para o Jurídico. No valor
            exato ou abaixo dele, a aprovação permanece na Gerência.
          </p>
          {limiteContrato.padrao && (
            <p className="app-note mt-2">Ainda vale o limite padrão do sistema até o primeiro salvamento.</p>
          )}
        </div>

        <label className="grid max-w-md gap-1 text-sm">
          Limite jurídico (R$)
          <input
            className="input input-sm"
            type="number"
            min="0.01"
            step="0.01"
            value={limiteContrato.limite}
            onChange={(event) => {
              setLimiteContrato((atual) => ({ ...atual, limite: event.target.value }));
              setErro('');
              setAviso('');
            }}
            required
          />
        </label>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary btn-sm"
            disabled={Boolean(salvando)}>
            {salvando === 'limite-contrato' ? 'Salvando...' : 'Salvar limite jurídico'}
          </button>
        </div>
      </form>

      {/* ---------- ITEM 21 ---------- */}
      <form className="card space-y-4" onSubmit={salvarAlerta} data-testid="config-alerta-saldo">
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)]">Alerta de saldo do contrato</h2>
          <p className="text-sm text-[var(--c-muted)]">
            A cor do texto do saldo, no card de titulos do contrato. O percentual e do saldo sobre o
            valor do contrato, com os aditivos.
          </p>
          {alerta.padrao && (
            <p className="app-note mt-2" data-testid="alerta-no-padrao">
              Ainda nao ha configuracao gravada: valem os valores padrao abaixo.
            </p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Saudavel a partir de (%)
            <input
              className="input input-sm"
              type="number"
              min="0"
              max="100"
              step="0.1"
              name="saudavel_a_partir_de"
              value={alerta.saudavel_a_partir_de}
              onChange={(e) => alterarAlerta('saudavel_a_partir_de', e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Normal a partir de (%)
            <input
              className="input input-sm"
              type="number"
              min="0"
              max="100"
              step="0.1"
              name="normal_a_partir_de"
              value={alerta.normal_a_partir_de}
              onChange={(e) => alterarAlerta('normal_a_partir_de', e.target.value)}
            />
          </label>
        </div>
        <p className="app-note">
          Abaixo do corte de Normal, o saldo fica Critico. O corte de Saudavel tem de ser maior que o
          de Normal — do contrario uma das faixas nunca aconteceria.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          {NIVEIS.map((nivel) => (
            <label key={nivel.chave} className="grid gap-1 text-sm">
              Cor · {nivel.rotulo}
              <span className="flex items-center gap-2">
                <input
                  type="color"
                  name={nivel.chave}
                  value={alerta[nivel.chave]}
                  onChange={(e) => alterarAlerta(nivel.chave, e.target.value)}
                  style={{ width: 44, height: 32, padding: 0, border: '1px solid var(--c-border)', borderRadius: 6 }}
                />
                <strong style={{ color: alerta[nivel.chave] }}>R$ 12.345,67</strong>
              </span>
              <span className="text-xs text-[var(--c-muted)]">{nivel.ajuda}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary btn-sm" data-testid="salvar-alerta"
            disabled={salvando === 'alerta'}>
            {salvando === 'alerta' ? 'Salvando...' : 'Salvar alerta'}
          </button>
        </div>
      </form>

      <form className="card space-y-4" onSubmit={salvarLimitesDespesa} data-testid="config-despesa-eventual">
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)]">Limites da Despesa Eventual</h2>
          <p className="text-sm text-[var(--c-muted)]">
            Controle o teto de cada solicitação e o valor acumulado permitido em cada obra.
            Solicitações canceladas ou rejeitadas não comprometem o saldo.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Limite por solicitação (R$)
            <input
              className="input input-sm"
              type="number"
              min="0.01"
              step="0.01"
              value={limitesDespesa.limite_solicitacao}
              onChange={(event) => setLimitesDespesa((atual) => ({
                ...atual,
                limite_solicitacao: event.target.value
              }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Limite acumulado por obra (R$)
            <input
              className="input input-sm"
              type="number"
              min="0.01"
              step="0.01"
              value={limitesDespesa.limite_obra}
              onChange={(event) => setLimitesDespesa((atual) => ({
                ...atual,
                limite_obra: event.target.value
              }))}
              required
            />
          </label>
        </div>

        {(limitesDespesa.padrao_solicitacao || limitesDespesa.padrao_obra) && (
          <p className="app-note">Ainda valem os limites padrao do sistema ate o primeiro salvamento.</p>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary btn-sm" disabled={salvando === 'despesa-eventual'}>
            {salvando === 'despesa-eventual' ? 'Salvando...' : 'Salvar limites'}
          </button>
        </div>
      </form>

      <div
        id="formas-pagamento-solicitacao"
        className="card space-y-4 scroll-mt-4"
        data-testid="config-formas-medicao"
      >
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)]">Formas exibidas na Nova Solicitacao</h2>
          <p className="text-sm text-[var(--c-muted)]">
            Esta e uma configuracao unica para Contratos e para os demais tipos de solicitacao.
            As opcoes continuam vindo do cadastro do Financeiro; forma desativada nao aparece nem
            se estiver marcada aqui.
          </p>
          {todasAsFormas && (
            <p className="app-note mt-2" data-testid="formas-todas">
              Nenhuma escolha feita ainda: todas as formas ativas aparecem nos fluxos.
            </p>
          )}
        </div>

        <div className="grid gap-1 md:grid-cols-2">
          {formas.length === 0 && (
            <p className="text-sm text-[var(--c-muted)]">Nenhuma forma de pagamento cadastrada.</p>
          )}
          {formas.map((forma) => (
            <label key={forma.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                data-testid={`forma-${forma.id}`}
                checked={forma.liberada}
                onChange={(e) => setFormas((atual) => atual.map((f) => (
                  f.id === forma.id ? { ...f, liberada: e.target.checked } : f
                )))}
              />
              <span className={forma.ativo ? '' : 'text-[var(--c-muted)] line-through'}>
                {forma.nome}
                {!forma.ativo && ' (desativada no cadastro)'}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary btn-sm" data-testid="salvar-formas"
            disabled={salvando === 'formas'} onClick={salvarFormas}>
            {salvando === 'formas' ? 'Salvando...' : 'Salvar formas'}
          </button>
        </div>
      </div>
    </div>
  );
}
