import { useEffect, useRef } from 'react';

/**
 * PÁGINA PADRÃO — o ritmo vertical da tela mora aqui, não na tela.
 * A tela declara os blocos na ordem; o vão entre eles (um degrau da escala,
 * styles/escala.css) e o tamanho do título são decisão deste componente.
 * Nada de space-y nem gap à mão na raiz das telas reformadas.
 *
 * R13 (02/09): publica --pos-cabecalho-fixo (altura real da topbar + vão)
 * para o cabeçalho fixo da tela grudar logo abaixo da topbar na rolagem —
 * vale para o PageHeader e para cabeçalhos custom com .app-page-header.
 */
export default function Pagina({ className = '', children, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const medir = () => {
      const topbar = document.querySelector('.topbar-shell');
      if (!topbar || !ref.current) return;
      const base = topbar.getBoundingClientRect().height + 16 + 8; /* top:1rem + vão */
      ref.current.style.setProperty('--pos-cabecalho-fixo', `${Math.round(base)}px`);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const classes = ['page', 'solicitacoes-page', 'app-pagina', className]
    .filter(Boolean).join(' ');
  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
}
