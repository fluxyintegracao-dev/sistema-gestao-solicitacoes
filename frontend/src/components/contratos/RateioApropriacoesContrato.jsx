import { useEffect, useMemo, useRef } from 'react';
import { HiPlus, HiTrash } from 'react-icons/hi2';
import ApropriacaoAutocomplete from '../ui/ApropriacaoAutocomplete';

/**
 * Rateio do contrato entre VARIAS apropriacoes da obra (pedido do cliente, 19/08).
 *
 * As duas unidades convivem na mesma linha: **Rateio %** e **Rateio R$**, e digitar em uma
 * recalcula a outra. Nao ha mais seletor de criterio — ter que escolher "por % ou por R$" antes de
 * digitar era um passo a mais para dizer a mesma coisa de dois jeitos.
 *
 * O que fica gravado e o PERCENTUAL. Quem digita R$ esta descrevendo uma proporcao do total do
 * contrato: um rateio em reais E um rateio percentual. E cada PARCELA precisa ser dividida
 * proporcionalmente, nao pelo valor absoluto digitado — senao a soma das parcelas nao fecharia
 * com o contrato.
 *
 * A aritmetica delicada ja existe e esta auditada no backend (`montarRateios`): ele divide cada
 * parcela em centavos inteiros e joga a sobra na ultima apropriacao, entao a soma fecha exata por
 * construcao. Aqui nao se recalcula nada disso — so se informa a proporcao.
 */

const formatarMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2
});

// "1.234,56" e "1234.56" chegam os dois, dependendo de como a pessoa digita.
export function numeroDoCampo(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  const normalizado = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

const comVirgula = (n, casas) => n.toFixed(casas).replace('.', ',');

export default function RateioApropriacoesContrato({
  linhas,
  apropriacoes,
  valorTotal,
  onChange,
  desabilitado = false
}) {
  const total = numeroDoCampo(valorTotal) || 0;

  // O Valor do contrato e digitado DEPOIS do rateio (ele fica abaixo, na tela). Sem isto a coluna
  // R$ ficaria vazia mostrando so o placeholder enquanto o percentual ja diz 100% — duas colunas
  // que deveriam dizer a mesma coisa, discordando.
  const totalAnterior = useRef(null);
  useEffect(() => {
    if (totalAnterior.current === total) return;
    totalAnterior.current = total;
    if (!total) return;
    const recalculado = linhas.map((l) => {
      const pct = numeroDoCampo(l.percentual);
      if (pct === null) return l;
      const novo = comVirgula((total * pct) / 100, 2);
      return l.valor === novo ? l : { ...l, valor: novo };
    });
    if (recalculado.some((l, i) => l !== linhas[i])) onChange(recalculado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, linhas]);

  const soma = useMemo(
    () => linhas.reduce((acc, l) => acc + (numeroDoCampo(l.percentual) || 0), 0),
    [linhas]
  );
  // Tolerancia de 0,0001 porque digitacao decimal nao fecha exata (33,3333 x 3 = 99,9999).
  // A conta que vale e a do backend, que divide em centavos com sobra na ultima.
  const fechado = Math.abs(soma - 100) < 0.001;

  // Digitar em uma unidade reescreve a outra. Sem isso, as duas colunas discordariam na tela.
  const alterar = (indice, campo, texto) => {
    onChange(linhas.map((l, i) => {
      if (i !== indice) return l;
      if (campo === 'apropriacao_id') return { ...l, apropriacao_id: texto };

      if (campo === 'percentual') {
        const pct = numeroDoCampo(texto);
        return {
          ...l,
          percentual: texto,
          valor: pct === null || !total ? '' : comVirgula((total * pct) / 100, 2)
        };
      }

      const val = numeroDoCampo(texto);
      return {
        ...l,
        valor: texto,
        percentual: val === null || !total ? '' : comVirgula((val / total) * 100, 4)
      };
    }));
  };

  return (
    <div className="space-y-2" data-testid="rateio-apropriacoes">
      <div className="overflow-visible">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--c-border)] text-left text-xs uppercase tracking-[0.06em] text-[var(--c-muted)]">
              <th className="px-2 py-2" style={{ minWidth: 240 }}>Apropriacao</th>
              <th className="px-2 py-2" style={{ width: 140 }}>Rateio %</th>
              <th className="px-2 py-2" style={{ width: 160 }}>Rateio R$</th>
              <th className="px-2 py-2" style={{ width: 96 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  data-testid="add-apropriacao"
                  title="Acrescentar apropriacao"
                  aria-label="Acrescentar apropriacao"
                  disabled={desabilitado}
                  onClick={() => onChange([...linhas, { apropriacao_id: '', percentual: '', valor: '' }])}
                >
                  <HiPlus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => (
              <tr key={`rateio-${i}`} className="border-b border-[var(--c-border)] last:border-0">
                <td className="px-2 py-2 align-top">
                  <ApropriacaoAutocomplete
                    value={linha.apropriacao_id}
                    options={apropriacoes}
                    onChange={(id) => alterar(i, 'apropriacao_id', id)}
                    disabled={desabilitado}
                    inputClassName="input input-sm w-full"
                    disabledPlaceholder="Selecione a obra primeiro"
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <input
                    className="input input-sm"
                    name={`rateio_percentual_${i}`}
                    inputMode="decimal"
                    placeholder="0,0000"
                    value={linha.percentual ?? ''}
                    onChange={(e) => alterar(i, 'percentual', e.target.value)}
                    disabled={desabilitado}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  {/* Moeda brasileira por DIGITOS, igual ao campo Valor e as parcelas. */}
                  <input
                    className="input input-sm"
                    name={`rateio_valor_${i}`}
                    inputMode="numeric"
                    // Placeholder proprio: "R$ 0,00" e o do campo Valor da solicitacao, e dois
                    // campos com o mesmo placeholder viram um seletor ambiguo (foi o que quebrou
                    // a suite 01 — o valor do contrato foi digitado nesta coluna).
                    placeholder="Rateio em R$"
                    value={linha.valor === '' || linha.valor === null || linha.valor === undefined
                      ? ''
                      : formatarMoeda(numeroDoCampo(linha.valor) || 0)}
                    onChange={(e) => {
                      const digitos = String(e.target.value).replace(/\D/g, '');
                      alterar(i, 'valor', digitos ? comVirgula(Number(digitos) / 100, 2) : '');
                    }}
                    disabled={desabilitado || !total}
                  />
                </td>
                <td className="px-2 py-2 align-top text-right">
                  {linhas.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      title="Remover apropriacao"
                      aria-label="Remover apropriacao"
                      onClick={() => onChange(linhas.filter((_, x) => x !== i))}
                      disabled={desabilitado}
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs" style={{ color: fechado ? 'var(--c-muted)' : 'var(--c-danger, #b91c1c)' }}>
        Soma: {comVirgula(soma, 4)}% de 100%
        {total > 0 && ` · ${formatarMoeda((total * soma) / 100)} de ${formatarMoeda(total)}`}
        {!fechado && ' — o rateio precisa fechar para enviar.'}
        {!total && ' · informe o Valor do contrato para ratear em R$.'}
      </p>
    </div>
  );
}
