import { useRef, useState } from 'react';
import { useFecharAoSair } from '../../hooks/useFecharAoSair';

/**
 * MENU "⋯" — o destino das ações raras. A regra do padrão: todo botão é
 * visível, mas ação avançada/eventual não disputa a barra com a ação do
 * dia a dia; ela mora aqui, sempre no mesmo lugar em toda tela.
 * Item perigoso fica apartado no fim, com separador (nunca colado no resto).
 */
export default function MenuMais({ itens = [], rotulo = 'Mais ações' }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useFecharAoSair(ref, aberto, () => setAberto(false));

  const visiveis = itens.filter(Boolean);
  if (visiveis.length === 0) return null;
  const comuns = visiveis.filter((item) => !item.perigosa);
  const perigosas = visiveis.filter((item) => item.perigosa);

  return (
    <div className="app-mais-wrap" ref={ref}>
      <button
        type="button"
        className="btn btn-outline"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={rotulo}
        title={rotulo}
        onClick={() => setAberto((atual) => !atual)}
      >
        ⋯
      </button>
      {aberto && (
        <div className="app-mais-menu" role="menu">
          {[...comuns, ...perigosas].map((item) => (
            <button
              key={item.rotulo}
              type="button"
              role="menuitem"
              className={`app-mais-item${item.perigosa ? ' app-mais-item--perigosa' : ''}`}
              disabled={item.desabilitada}
              title={item.title}
              onClick={() => {
                setAberto(false);
                item.onClick?.();
              }}
            >
              {item.icone}
              {item.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
