import { UtensilsCrossed } from 'lucide-react';

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark">
      <span className="brand-mark__icon"><UtensilsCrossed size={compact ? 16 : 20} /></span>
      <span className="brand-mark__copy">
        <strong>OneTime Menu</strong>
        {!compact && <small>by OneTime Labs</small>}
      </span>
    </div>
  );
}
