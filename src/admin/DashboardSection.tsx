import { BadgeDollarSign, ChevronRight, Clock3, Monitor, PackageCheck, Utensils } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useAppStore } from '../hooks/useAppStore';
import { currentPeriod, formatActivity } from '../utils/time';

type Section = 'dashboard' | 'menus' | 'items' | 'screens' | 'scheduling' | 'specials' | 'appearance' | 'settings';

export default function DashboardSection({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const { data } = useAppStore();
  const period = currentPeriod(data.schedules, data.manualPeriodOverride);
  const soldOut = data.menuItems.filter((item) => item.soldOut).length;
  const activeSpecials = data.specials.filter((special) => special.enabled).length;

  return (
    <div>
      <div className="admin-page-heading">
        <div><span className="eyebrow">Restaurant overview</span><h1>Good afternoon, Copper Fork.</h1><p>Your digital menu network is online and using the <strong>{period}</strong> daypart.</p></div>
        <div className="live-status"><span></span> All systems operational</div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Monitor} label="Active Screens" value={`${data.screens.filter((screen) => screen.status === 'Online').length}/${data.screens.length}`} note="All displays connected" />
        <StatCard icon={Utensils} label="Menu Items" value={data.menuItems.length} note={`${soldOut} marked sold out`} />
        <StatCard icon={Clock3} label="Current Menu" value={period} note={data.manualPeriodOverride ? 'Manual override active' : 'Selected automatically'} />
        <StatCard icon={BadgeDollarSign} label="Today's Specials" value={activeSpecials} note="Published and enabled" />
      </div>

      <div className="dashboard-grid">
        <section className="admin-card dashboard-preview-card">
          <div className="admin-card__header"><div><span className="eyebrow">Live screen</span><h2>Main Counter Menu</h2></div><a href="/display/main" target="_blank" rel="noreferrer">Open display <ChevronRight size={15} /></a></div>
          <div className="dashboard-screen-preview">
            <div className="dashboard-screen-preview__top"><b>CF</b><span>THE COPPER FORK</span><small>{period.toUpperCase()}</small></div>
            <div className="dashboard-screen-preview__banner">MONDAY SMASH & DRAFT <strong>$18</strong></div>
            <div className="dashboard-screen-preview__columns"><div><b>BURGERS</b><span>The Copper Burger · $16.50</span><span>Firehouse Burger · $17</span></div><div><b>ENTREES</b><span>Lake Perch Plate · $21</span><span>Braised Short Rib · $26</span></div></div>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card__header"><div><span className="eyebrow">Recent activity</span><h2>Live changes</h2></div></div>
          <div className="activity-list">
            {data.activities.slice(0, 6).map((activity) => <div key={activity.id}><span className="activity-dot"></span><div><strong>{activity.message}</strong><small>{formatActivity(activity.at)}</small></div></div>)}
          </div>
        </section>
      </div>

      <section className="admin-card quick-actions-card">
        <div className="admin-card__header"><div><span className="eyebrow">Quick actions</span><h2>Common restaurant tasks</h2></div></div>
        <div className="quick-actions">
          <button onClick={() => onNavigate('items')}><Utensils /><span><b>Edit menu items</b><small>Prices, availability, categories</small></span><ChevronRight /></button>
          <button onClick={() => onNavigate('specials')}><BadgeDollarSign /><span><b>Publish a special</b><small>Daily deals and promotions</small></span><ChevronRight /></button>
          <button onClick={() => onNavigate('screens')}><Monitor /><span><b>Manage screens</b><small>Preview and refresh displays</small></span><ChevronRight /></button>
          <button onClick={() => onNavigate('scheduling')}><PackageCheck /><span><b>Change daypart</b><small>Automatic or manual override</small></span><ChevronRight /></button>
        </div>
      </section>
    </div>
  );
}
