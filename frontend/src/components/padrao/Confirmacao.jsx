import { useCallback, useEffect, useRef, useState } from 'react';
import OverlayModal from '../ui/OverlayModal';

/**
 * CONFIRMAÇÃO DO SISTEMA (item **R3** da DoD, 02/09) — substitui
 * `window.confirm()`.
 *
 * O `confirm()` do navegador não sabe o que está sendo confirmado: dá
 * "OK/Cancelar" para apagar um lote e para arquivar um rascunho com o mesmo
 * peso. Aqui a ação destrutiva vem em vermelho suave e APARTADA, com o
 * rótulo dizendo o que vai acontecer ("Estornar fechamento", não "OK") —
 * mesma linguagem de botão do `PageHeader`.
 *
 * Devolve Promise<boolean>, então o `if (!confirm(...)) return;` vira
 * `if (!await confirmar({...})) return;` sem reescrever o fluxo.
 *
 * Uso:
 *   const { confirmar, elementoConfirmacao } = useConfirmacao();
 *   async function excluir() {
 *     const ok = await confirmar({
 *       titulo: 'Excluir colaborador',
 *       mensagem: `Excluir ${nome}? Esta ação não pode ser desfeita.`,
 *       rotuloConfirmar: 'Excluir',
 *       destrutiva: true
 *     });
 *     if (!ok) return;
 *     ...
 *   }
 *   return (<>... {elementoConfirmacao}</>);
 */
export function useConfirmacao() {
  const [pedido, setPedido] = useState(null);
  const resolver = useRef(null);

  const responder = useCallback((resposta) => {
    setPedido(null);
    if (resolver.current) {
      resolver.current(resposta);
      resolver.current = null;
    }
  }, []);

  // Promessa pendente ao desmontar resolve como "não" — senão o `await`
  // do chamador fica preso para sempre se a tela sair no meio.
  useEffect(() => () => {
    if (resolver.current) {
      resolver.current(false);
      resolver.current = null;
    }
  }, []);

  const confirmar = useCallback((opcoes = {}) => new Promise((resolve) => {
    // Uma confirmação por vez: a anterior é respondida como "não".
    if (resolver.current) resolver.current(false);
    resolver.current = resolve;
    setPedido({
      titulo: opcoes.titulo || 'Confirmar',
      mensagem: opcoes.mensagem || '',
      rotuloConfirmar: opcoes.rotuloConfirmar || 'Confirmar',
      rotuloCancelar: opcoes.rotuloCancelar || 'Cancelar',
      destrutiva: Boolean(opcoes.destrutiva)
    });
  }), []);

  const elementoConfirmacao = pedido ? (
    <OverlayModal
      rotulo={pedido.titulo}
      largura="var(--modal-max-w-sm, 480px)"
      onFechar={() => responder(false)}
    >
      <div className="app-confirmacao">
        <h2 className="app-confirmacao-titulo">{pedido.titulo}</h2>
        {pedido.mensagem ? <p className="app-confirmacao-texto">{pedido.mensagem}</p> : null}
        <div className="app-confirmacao-acoes">
          <button type="button" className="btn btn-outline" onClick={() => responder(false)}>
            {pedido.rotuloCancelar}
          </button>
          <button
            type="button"
            className={pedido.destrutiva ? 'btn btn-outline btn-perigo-suave' : 'btn btn-primary'}
            onClick={() => responder(true)}
            autoFocus
          >
            {pedido.rotuloConfirmar}
          </button>
        </div>
      </div>
    </OverlayModal>
  ) : null;

  return { confirmar, elementoConfirmacao };
}

export default useConfirmacao;
