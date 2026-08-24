import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export default function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <div>
            <span className="eyebrow">OneTime Menu</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}
