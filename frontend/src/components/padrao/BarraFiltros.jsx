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
 * `aoAlternar(dimensaoId, valor, opcoes)`. Conjunto vazio = sem filtro.
 *
 * ## `unico` na dimensão — quando o serviço só aceita UM valor (02/09)
 *
 * Achado na leva do RH/DP: telas mapeiam a dimensão para um parâmetro
 * único (`empresa_grupo_id=1`). Com marcação múltipla, marcar dois valores
 * fazia a tela mandar NENHUM — o usuário via duas etiquetas e a lista não
 * estreitava. Capacidade aparente sem efeito: a mesma família da R15.
 *
 * Então a dimensão declara `unico: true`, e aí: a marca é REDONDA (a forma
 * diz que só cabe uma), marcar outra substitui, e a etiqueta sempre reflete
 * o que está filtrando de verdade. `aoAlternar` recebe `{ unico }` no
 * terceiro argumento — repasse para `alternarValorFiltro`.
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
  campos = [],         // [{ id, rotulo, tipo, valor, aoMudar, min, max, step, placeholder, sugestoes }]
  filtros = [],        // [{ id, rotulo, unico?, opcoes: [{ valor, rotulo }] }]
  ativos = {},         // { [id]: Set<string> }
  aoAlternar,
  aoLimpar
}) {
  const etiquetas = [];
  filtros.forEach((dim) => {
    const selecionados = ativos[dim.id] || new Set();
    (dim.opcoes || []).forEach((opcao) => {
      if (selecionados.has(String(opcao.valor))) {
        etiquetas.push({
          dimensao: dim.id,
          dimensaoRotulo: dim.rotulo,
          unico: Boolean(dim.unico),
          obrigatorio: Boolean(dim.obrigatorio),
          valor: String(opcao.valor),
          rotulo: opcao.rotulo
        });
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
          {/*
              `placeholder`, `step` e `sugestoes` (05/09) — o componente estava
              engolindo capacidade das telas.

              Achado em duas migrações no mesmo dia: os filtros de Solicitações
              tinham um DATALIST de responsáveis que sumiu na migração, e os de
              Compras perderam `step="0.01"` nos campos de valor e os
              placeholders de exemplo ("Ex: SOL-12345"). Nada disso era enfeite
              — o datalist era a única sugestão que a pessoa tinha para um campo
              que aceita nome livre.

              Componente compartilhado que não repassa o que a tela precisa não
              padroniza: ele apaga. Quem migra fica entre perder a capacidade
              ou não usar o padrão, e as duas saídas são ruins.
          */}
          {campos.map((campo) => (
            <label key={campo.id} className="app-filtros-campo">
              <span className="app-filtros-campo-rotulo">{campo.rotulo}</span>
              <input
                type={campo.tipo || 'text'}
                value={campo.valor ?? ''}
                min={campo.min}
                max={campo.max}
                step={campo.step}
                placeholder={campo.placeholder}
                list={campo.sugestoes?.length ? `sugestoes-${campo.id}` : undefined}
                onChange={(event) => campo.aoMudar(event.target.value)}
              />
              {campo.sugestoes?.length ? (
                <datalist id={`sugestoes-${campo.id}`}>
                  {campo.sugestoes.map((sugestao) => (
                    <option key={String(sugestao)} value={String(sugestao)} />
                  ))}
                </datalist>
              ) : null}
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
              onToggle={(valor) => aoAlternar(dim.id, valor, { unico: Boolean(dim.unico) })}
            />
          ))}
        </div>
      )}

      {etiquetas.length > 0 && (
        <div className="la-etiquetas" aria-label="Filtros ativos">
          <span className="la-filtros-rotulo">Filtrando:</span>
          {etiquetas.map((etiqueta) => (
            <span
              key={`${etiqueta.dimensao}:${etiqueta.valor}`}
              className="la-etiqueta"
              data-obrigatorio={etiqueta.obrigatorio ? 'sim' : undefined}
            >
              <span className="la-etiqueta-dim">{etiqueta.dimensaoRotulo}:</span>
              {etiqueta.rotulo}
              {/*
                `obrigatorio`: dimensão que a tela NÃO consegue não ter (05/09).

                Achado na matriz do CRM: o período de um relatório é sempre
                algum período. A etiqueta trazia um "×" que, ao ser clicado,
                voltava ao padrão — e o padrão gera OUTRA etiqueta na hora.
                O botão prometia remover e trocava. Capacidade aparente sem
                efeito, que é a família da R15.

                Sem o "×", a etiqueta volta a ser o que é: o estado atual do
                recorte, mudado pelo menu de marcação, não removível.
              */}
              {etiqueta.obrigatorio ? null : (
                <button
                  type="button"
                  onClick={() => aoAlternar(etiqueta.dimensao, etiqueta.valor, { unico: Boolean(etiqueta.unico) })}
                  aria-label={`Remover filtro ${etiqueta.dimensaoRotulo} ${etiqueta.rotulo}`}
                >
                  <HiOutlineXMark aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
          {/* "Limpar tudo" só aparece se houver algo que de fato sai. Numa
              faixa só de recortes obrigatórios ele seria a mesma promessa
              vazia do "×" que voltava ao padrão. */}
          {aoLimpar && etiquetas.some((e) => !e.obrigatorio) ? (
            <button type="button" className="la-link" onClick={aoLimpar}>Limpar tudo</button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/*
 * Alterna um valor numa dimensão de filtro — utilitário para as telas.
 * `opcoes.unico`: dimensão de valor único (o serviço só aceita um) — marcar
 * outro SUBSTITUI em vez de somar, e marcar o mesmo desmarca. Sem isso a
 * tela mostrava duas etiquetas e mandava filtro nenhum.
 */
export function alternarValorFiltro(ativos, dimensao, valor, opcoes = {}) {
  const proximo = { ...ativos };
  const conjunto = new Set(proximo[dimensao] || []);
  const chave = String(valor);
  if (conjunto.has(chave)) {
    conjunto.delete(chave);
  } else if (opcoes.unico) {
    conjunto.clear();
    conjunto.add(chave);
  } else {
    conjunto.add(chave);
  }
  proximo[dimensao] = conjunto;
  return proximo;
}
