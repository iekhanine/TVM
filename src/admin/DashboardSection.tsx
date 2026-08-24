import { BadgeDollarSign, ChevronRight, Clock3, Monitor, PackageCheck, Utensils } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useAppStore } from '../hooks/useAppStore';
import { currentSchedule, formatActivity } from '../utils/time';

type Section = 'dashboard' | 'menus' | 'items' | 'screens' | 'scheduling' | 'specials' | 'appearance' | 'settings';

export default function DashboardSection({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const { data } = useAppStore();
  const schedule = currentSchedule(data.schedules);
  const currentMenuId = data.manualMenuOverride || schedule?.menuId || data.screens.find((screen) => screen.id === 'screen-main')?.assignedMenuId;
  const currentMenu = data.menus.find((menu) => menu.id === currentMenuId);
  const soldOut = data.menuItems.filter((item) => item.soldOut).length;
  const activeSpecials = data.specials.filter((special) => special.enabled).length;
  const mainItems = data.menuItems.filter((item) => item.menuId === currentMenu?.id && item.enabled).slice(0, 4);

  return (
    <div>
      <div className="admin-page-heading">
        <div><span className="eyebrow">Restaurant overview</span><h1>Good afternoon, Copper Fork.</h1><p>Your digital menu network is online and the main display is using <strong>{currentMenu?.name ?? 'its assigned menu'}</strong>.</p></div>
        <div className="live-status"><span></span> All systems operational</div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Monitor} label="Active Screens" value={`${data.screens.filter((screen) => screen.status === 'Online').length}/${data.screens.length}`} note="All displays connected" />
        <StatCard icon={Utensils} label="Menu Items" value={data.menuItems.length} note={`${data.menus.length} menu collections`} />
        <StatCard icon={Clock3} label="Current Menu" value={currentMenu?.name ?? 'Assigned'} note={data.manualMenuOverride ? 'Manual override active' : schedule ? `${schedule.name} schedule` : 'Screen assignment'} />
        <StatCard icon={BadgeDollarSign} label="Today's Specials" value={activeSpecials} note={`${soldOut} items sold out`} />
      </div>

      <div className="dashboard-grid">
        <section className="admin-card dashboard-preview-card">
          <div className="admin-card__header"><div><span className="eyebrow">Live screen</span><h2>Main Counter Menu</h2></div><a href="/display/main" target="_blank" rel="noreferrer">Open display <ChevronRight size={15} /></a></div>
          <div className="dashboard-screen-preview">
            <div className="dashboard-screen-preview__top"><b>CF</b><span>THE COPPER FORK</span><small>{currentMenu?.name.toUpperCase() ?? 'MENU'}</small></div>
            <div className="dashboard-screen-preview__banner">MONDAY SMASH & DRAFT <strong>$18</strong></div>
            <div className="dashboard-screen-preview__columns">
              <div><b>{currentMenu?.categories[0] ?? 'MENU'}</b>{mainItems.slice(0, 2).map((item) => <span key={item.id}>{item.name} · ${item.price.toFixed(item.price % 1 ? 2 : 0)}</span>)}</div>
              <div><b>{currentMenu?.categories[1] ?? 'FEATURED'}</b>{mainItems.slice(2, 4).map((item) => <span key={item.id}>{item.name} · ${item.price.toFixed(item.price % 1 ? 2 : 0)}</span>)}</div>
            </div>
          </div>
        </section>

        <section className="admin-card"><div className="admin-card__header"><div><span className="eyebrow">Recent activity</span><h2>Live changes</h2></div></div><div className="activity-list">{data.activities.slice(0, 6).map((activity) => <div key={activity.id}><span className="activity-dot"></span><div><strong>{activity.message}</strong><small>{formatActivity(activity.at)}</small></div></div>)}</div></section>
      </div>

      <section className="admin-card quick-actions-card">
        <div className="admin-card__header"><div><span className="eyebrow">Quick actions</span><h2>Common restaurant tasks</h2></div></div>
        <div className="quick-actions">
          <button onClick={() => onNavigate('menus')}><Utensils /><span><b>Manage menus</b><small>Main, breakfast, bar, late night</small></span><ChevronRight /></button>
          <button onClick={() => onNavigate('specials')}><BadgeDollarSign /><span><b>Publish a special</b><small>Daily deals and promotions</small></span><ChevronRight /></button>
          <button onClick={() => onNavigate('screens')}><Monitor /><span><b>Manage screens</b><small>Assign menus and preview displays</small></span><ChevronRight /></button>
          <button onClick={() => onNavigate('scheduling')}><PackageCheck /><span><b>Change daypart</b><small>Schedule which menu appears</small></span><ChevronRight /></button>
        </div>
      </section>
    </div>
  );
}
