// src/components/ui/Modal.jsx
import { useEffect } from 'react';

export default function Modal({ title, onClose, children, footer }) {
  // Fecha ao pressionar Escape
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <span className="modal-handle" />
        {title && <h2 className="modal-title">{title}</h2>}
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
