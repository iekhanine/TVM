import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  note: string;
};

export default function StatCard({ icon: Icon, label, value, note }: Props) {
  return (
    <article className="stat-card">
      <div className="stat-card__icon"><Icon size={19} /></div>
      <div>
        <span className="stat-card__label">{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}
