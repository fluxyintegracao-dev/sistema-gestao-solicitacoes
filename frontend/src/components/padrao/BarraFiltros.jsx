import { HiOutlineMagnifyingGlass, HiOutlineXMark } from 'react-icons/hi2';
import { FiltroRapido } from '../lista-avancada/ListaAvancada';

/**
 * BARRA DE FILTROS PADRÃO — o padrão das Solicitações para QUALQUER tela
 * (regra do cliente, 02/09): nada de select de escolha única para filtrar.
 * - Busca única em cima, ocupando a largura da faixa;
 * - abaixo, a linha de filtros por MARCAÇÃO (botão + menu de checkbox,
 *   múltipla seleção) — o FiltroRapido da ListaAvancada, reaproveitado;
 * - valores escolhidos visíveis como etiquetas removíveis + "Limpar tudo".
 * Motivo: com select o usuário não vê o que está filtrado sem abrir cada
 * um; com marcação o estado do filtro é legível de imediato e combinável.
 *
 * A tela guarda o estado: `ativos` = { dimensaoId: Set(valores) } e trata
 * `aoAlternar(dimensaoId, valor)`. Conjunto vazio = sem filtro (todas).
 *
 * ## `campos` — o recorte que NÃO é enumerável (R16b, 02/09)
 *
 * Marcação pressupõe lista fechada de opções. Competência (`month`) e
 * período (`date` inicial/final) não têm lista: são contínuos. Na leva do
 * RH/DP seis telas precisavam disso, e sem lugar no componente elas
 * voltariam à grade crua de `select`/`input` — vinte exceções não é regra
 * (R16b: o padrão cresce, a exceção não se acumula).
 *
 * Então `campos` é um espaço declarado, na MESMA faixa, antes da linha de
 * marcação: `[{ id, rotulo, tipo: 'month'|'date'|'number', valor, aoMudar }]`.
 * NÃO use para recorte enumerável — status, obra, vínculo e empresa são
 * `filtros`, com marcação e etiqueta removível. Campo aqui é exceção
 * declarada, não porta dos fundos.
 */
export default function BarraFiltros({
  busca,               // { valor, aoMudar, placeholder }
  campos = [],         // [{ id, rotulo, tipo, valor, aoMudar, min, max }]
  filtros = [],        // [{ id, rotulo, opcoes: [{ valor, rotulo }] }]
  ativos = {},         // { [id]: Set<string> }
  aoAlternar,
  aoLimpar
}) {
  const etiquetas = [];
  filtros.forEach((dim) => {
    const selecionados = ativos[dim.id] || new Set();
    (dim.opcoes || []).forEach((opcao) => {
      if (selecionados.has(String(opcao.valor))) {
        etiquetas.push({ dimensao: dim.id, dimensaoRotulo: dim.rotulo, valor: String(opcao.valor), rotulo: opcao.rotulo });
      }
    });
  });

  return (
    <div className="app-filtros">
      {busca ? (
        <div className="la-busca app-filtros-busca">
          <HiOutlineMagnifyingGlass aria-hidden="true" />
          <input
            type="text"
            value={busca.valor}
            onChange={(event) => busca.aoMudar(event.target.value)}
            placeholder={busca.placeholder || 'Buscar…'}
            aria-label={busca.placeholder || 'Buscar na lista'}
          />
          {busca.valor && (
            <button type="button" onClick={() => busca.aoMudar('')} aria-label="Limpar busca">
              <HiOutlineXMark aria-hidden="true" />
            </button>
          )}
        </div>
      ) : null}

      {campos.length > 0 && (
        <div className="app-filtros-campos">
          {campos.map((campo) => (
            <label key={campo.id} className="app-filtros-campo">
              <span className="app-filtros-campo-rotulo">{campo.rotulo}</span>
              <input
                type={campo.tipo || 'text'}
                value={campo.valor ?? ''}
                min={campo.min}
                max={campo.max}
                onChange={(event) => campo.aoMudar(event.target.value)}
              />
            </label>
          ))}
        </div>
      )}

      {filtros.length > 0 && (
        <div className="la-filtros-linha">
          <span className="la-filtros-rotulo">Filtrar:</span>
          {filtros.map((dim) => (
            <FiltroRapido
              key={dim.id}
              dim={dim}
              selecionados={ativos[dim.id] || new Set()}
              onToggle={(valor) => aoAlternar(dim.id, valor)}
            />
          ))}
        </div>
      )}

      {etiquetas.length > 0 && (
        <div className="la-etiquetas" aria-label="Filtros ativos">
          <span className="la-filtros-rotulo">Filtrando:</span>
          {etiquetas.map((etiqueta) => (
            <span key={`${etiqueta.dimensao}:${etiqueta.valor}`} className="la-etiqueta">
              <span className="la-etiqueta-dim">{etiqueta.dimensaoRotulo}:</span>
              {etiqueta.rotulo}
              <button
                type="button"
                onClick={() => aoAlternar(etiqueta.dimensao, etiqueta.valor)}
                aria-label={`Remover filtro ${etiqueta.dimensaoRotulo} ${etiqueta.rotulo}`}
              >
                <HiOutlineXMark aria-hidden="true" />
              </button>
            </span>
          ))}
          {aoLimpar ? (
            <button type="button" className="la-link" onClick={aoLimpar}>Limpar tudo</button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* Alterna um valor numa dimensão de filtro — utilitário para as telas. */
export function alternarValorFiltro(ativos, dimensao, valor) {
  const proximo = { ...ativos };
  const conjunto = new Set(proximo[dimensao] || []);
  const chave = String(valor);
  if (conjunto.has(chave)) conjunto.delete(chave); else conjunto.add(chave);
  proximo[dimensao] = conjunto;
  return proximo;
}
