import { useEffect } from 'react';

// Todo menu/painel suspenso fecha ao clicar fora dele e com Esc.
// Nascido no menu "Colunas" do ListaAvancada; compartilhado com os
// painéis da Home ("Adicionar bloco", "Adicionar módulo") e da barra
// do topo — uma lógica só, nenhuma cópia.
export function useFecharAoSair(ref, aberto, fechar) {
  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicar = (event) => {
      if (ref.current && !ref.current.contains(event.target)) fechar();
    };
    const aoTeclar = (event) => {
      if (event.key === 'Escape') fechar();
    };
    document.addEventListener('mousedown', aoClicar);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicar);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [ref, aberto, fechar]);
}

export default useFecharAoSair;
