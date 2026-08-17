import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

let modaisAbertos = 0;
let overflowAnterior = '';
let paddingDireitoAnterior = '';

function bloquearRolagemDocumento() {
  if (modaisAbertos === 0) {
    overflowAnterior = document.body.style.overflow;
    paddingDireitoAnterior = document.body.style.paddingRight;
    const larguraBarra = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.body.style.overflow = 'hidden';
    if (larguraBarra > 0) {
      document.body.style.paddingRight = `${larguraBarra}px`;
    }
  }
  modaisAbertos += 1;
}

function liberarRolagemDocumento() {
  modaisAbertos = Math.max(0, modaisAbertos - 1);
  if (modaisAbertos === 0) {
    document.body.style.overflow = overflowAnterior;
    document.body.style.paddingRight = paddingDireitoAnterior;
  }
}

export default function ModalPortal({ children, onClose, closeOnEscape = true }) {
  const focoAnterior = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    focoAnterior.current = document.activeElement;
    bloquearRolagemDocumento();

    function handleKeyDown(event) {
      if (event.key === 'Escape' && closeOnEscape && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      liberarRolagemDocumento();
      if (focoAnterior.current instanceof HTMLElement && document.contains(focoAnterior.current)) {
        focoAnterior.current.focus({ preventScroll: true });
      }
    };
  }, [closeOnEscape]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="app-modal-portal">{children}</div>,
    document.body
  );
}
