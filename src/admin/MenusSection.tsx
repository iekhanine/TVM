import { CheckCircle2, Clock3, Layers3, Monitor } from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { currentPeriod } from '../utils/time';

export default function MenusSection() {
  const { data } = useAppStore();
  const period = currentPeriod(data.schedules, data.manualPeriodOverride);
  const menus = [
    { name: 'Main Menu', description: 'Primary all-day food menu for counter displays.', items: data.menuItems.filter((item) => item.category !== 'Drinks').length, screens: 1, status: 'Published' },
    { name: 'Bar / Drinks', description: 'Condensed food selection plus drinks for the bar display.', items: data.menuItems.filter((item) => ['Appetizers', 'Burgers', 'Drinks'].includes(item.category)).length, screens: 1, status: 'Published' },
    { name: 'Breakfast', description: 'Daypart-ready menu structure for future breakfast-specific items.', items: 0, screens: 0, status: 'Scheduled' },
  ];

  return (
    <div>
      <div className="admin-page-heading"><div><span className="eyebrow">Menu library</span><h1>Menus</h1><p>Organize menu collections and assign them to screens or dayparts.</p></div><div className="period-chip"><Clock3 size={15} /> Current: {period}</div></div>
      <div className="menu-library-grid">
        {menus.map((menu) => <article className="admin-card menu-library-card" key={menu.name}>
          <div className="menu-library-card__icon"><Layers3 /></div>
          <span className={`status-pill ${menu.status === 'Published' ? 'green' : 'amber'}`}>{menu.status === 'Published' ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}{menu.status}</span>
          <h2>{menu.name}</h2><p>{menu.description}</p>
          <div className="menu-library-card__meta"><span>{menu.items} items</span><span><Monitor size={14} /> {menu.screens} screen{menu.screens === 1 ? '' : 's'}</span></div>
          <button className="button button--secondary button--full" type="button">Manage menu</button>
        </article>)}
      </div>
      <div className="info-callout"><strong>Prototype scope:</strong> Menu collections are represented in the UI, while item editing is centralized under Menu Items. In production, each menu would become a Supabase <code>menus</code> record with explicit category and screen assignments.</div>
    </div>
  );
}
