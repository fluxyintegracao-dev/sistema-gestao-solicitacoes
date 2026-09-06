import { useEffect, useRef } from 'react';

// Todo menu/painel suspenso fecha ao clicar fora dele e com Esc.
// Nascido no menu "Colunas" do ListaAvancada; compartilhado com os
// painéis da Home ("Adicionar bloco", "Adicionar módulo") e da barra
// do topo — uma lógica só, nenhuma cópia.
//
// DUAS CAPACIDADES ACRESCENTADAS EM 05/09, cada uma fechando um defeito
// medido — nenhuma delas muda o que os chamadores antigos já faziam:
//
// 1) MAIS DE UM REF. O primeiro parâmetro aceita um ref OU uma lista de
//    refs, e o clique só é "fora" quando está fora de TODOS. O defeito:
//    quando o menu sai do fluxo por `createPortal` (TabelaPadrao) ou
//    quando botão e painel não moram no mesmo elemento, o painel deixa de
//    ser descendente do ref do botão — `contains` dá falso PARA O PRÓPRIO
//    PAINEL e o clique na opção fecha o menu ANTES do `onClick` dela: a
//    camada fecha e a seleção some. A `TabelaPadrao` contornava isso com
//    um ref sintético escrito à mão (`{ contains: alvo => a||b }`); esse
//    padrão vira capacidade daqui, e a cópia sai de lá.
//
// 2) TOQUE. O fechamento ouvia só `mousedown`. No celular, um toque fora
//    não dispara `mousedown` antes do `click`, então a camada continuava
//    aberta — corrigir só no desktop seria trocar o defeito de lugar. O
//    sino de notificações (`NotificacoesBell`) já ouvia `touchstart`; a
//    regra passa a valer para todo painel que usa este hook.
//
// 3) SÓ O ESC (06/09, decisão do cliente). Terceiro parâmetro de opções:
//    `{ apenasEsc: true }` liga o Esc e NÃO liga o clique fora.
//
//    Existe para três listas de resultado EM FLUXO — favorecidos da
//    medição, subitens do planejamento, credores do contrato. Elas não
//    cobrem nada: empurram o formulário para baixo em vez de flutuar sobre
//    ele, então não "prendem" a tela como uma camada prende. Medido o
//    preço de convertê-las por inteiro: clicar em OUTRO CAMPO DO MESMO
//    FORMULÁRIO passaria a sumir com a lista — e no caso dos credores essa
//    lista é o ÚNICO caminho para vincular um credor ao contrato. Fechar
//    por engano no meio do preenchimento é pior que ficar aberta.
//
//    Palavras do cliente: "fechar ao clicar fora quebraria o vínculo de
//    credor, que é o caminho único; o Esc dá saída sem esse risco."
//
//    Sem `apenasEsc`, nada muda para os 35 chamadores existentes. E a
//    opção mora AQUI em vez de virar três `keydown` escritos à mão nas
//    telas: são três jeitos de posicionar camada que acabaram de virar um,
//    e não vou abrir um quarto jeito de fechá-las.
//
// Nota de implementação: os refs e o `fechar` são lidos por referência
// viva, então o efeito depende só de `aberto`. Chamador que passe um
// array literal (`[botaoRef, painelRef]`) ou uma arrow inline como
// `fechar` NÃO reassina o listener a cada render — e continua sempre
// enxergando o valor mais novo.
export function useFecharAoSair(refOuRefs, aberto, fechar, opcoes) {
  const apenasEsc = Boolean(opcoes && opcoes.apenasEsc);
  const refsVivos = useRef(refOuRefs);
  refsVivos.current = refOuRefs;
  const fecharVivo = useRef(fechar);
  fecharVivo.current = fechar;

  useEffect(() => {
    if (!aberto) return undefined;

    const dentroDeAlgum = (alvo) => {
      const atual = refsVivos.current;
      const lista = Array.isArray(atual) ? atual : [atual];
      return lista.some((item) => Boolean(item?.current?.contains?.(alvo)));
    };

    const aoApontar = (event) => {
      if (!dentroDeAlgum(event.target)) fecharVivo.current();
    };
    const aoTeclar = (event) => {
      if (event.key === 'Escape') fecharVivo.current();
    };

    if (!apenasEsc) {
      document.addEventListener('mousedown', aoApontar);
      document.addEventListener('touchstart', aoApontar);
    }
    document.addEventListener('keydown', aoTeclar);
    return () => {
      if (!apenasEsc) {
        document.removeEventListener('mousedown', aoApontar);
        document.removeEventListener('touchstart', aoApontar);
      }
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, apenasEsc]);
}

export default useFecharAoSair;
