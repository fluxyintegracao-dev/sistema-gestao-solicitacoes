/**
 * PÁGINA PADRÃO — o ritmo vertical da tela mora aqui, não na tela.
 * A tela declara os blocos na ordem; o vão entre eles (um degrau da escala,
 * styles/escala.css) e o tamanho do título são decisão deste componente.
 * Nada de space-y nem gap à mão na raiz das telas reformadas.
 */
export default function Pagina({ className = '', children, ...props }) {
  const classes = ['page', 'solicitacoes-page', 'app-pagina', className]
    .filter(Boolean).join(' ');
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
