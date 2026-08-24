import { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  CalendarClock,
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  Monitor,
  Paintbrush,
  Plus,
  Settings,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { useAppStore } from '../hooks/useAppStore';
import DashboardSection from './DashboardSection';
import MenuItemsSection from './MenuItemsSection';
import ScreensSection from './ScreensSection';
import SchedulingSection from './SchedulingSection';
import SpecialsSection from './SpecialsSection';
import AppearanceSection from './AppearanceSection';
import SettingsSection from './SettingsSection';
import MenusSection from './MenusSection';

type AdminSection = 'dashboard' | 'menus' | 'items' | 'screens' | 'scheduling' | 'specials' | 'appearance' | 'settings';

const navItems: Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'menus', label: 'Menus', icon: ClipboardList },
  { id: 'items', label: 'Manage Menu', icon: Utensils },
  { id: 'screens', label: 'Screens', icon: Monitor },
  { id: 'scheduling', label: 'Scheduling', icon: CalendarClock },
  { id: 'specials', label: 'Specials', icon: BadgeDollarSign },
  { id: 'appearance', label: 'Appearance', icon: Paintbrush },
  { id: 'settings', label: 'Restaurant Settings', icon: Settings },
];

export default function AdminPage() {
  const { data } = useAppStore();
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [selectedMenuId, setSelectedMenuId] = useState(() => data.menus[0]?.id ?? '');
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!data.menus.some((menu) => menu.id === selectedMenuId)) setSelectedMenuId(data.menus[0]?.id ?? '');
  }, [data.menus, selectedMenuId]);

  const sectionTitle = useMemo(() => navItems.find((item) => item.id === section)?.label ?? 'Dashboard', [section]);

  const manageMenu = (menuId: string) => {
    setSelectedMenuId(menuId);
    setSection('items');
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="admin-sidebar__brand"><BrandMark /></div>
        <div className="restaurant-chip"><div className="restaurant-chip__logo">{data.restaurant.logoText || 'CF'}</div><div><strong>{data.restaurant.name}</strong><span>Demo Location</span></div></div>
        <nav className="admin-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => { setSection(id); setMobileNav(false); }}><Icon size={17} /><span>{label}</span></button>)}</nav>
        <div className="admin-sidebar__bottom"><div className="prototype-badge"><Sparkles size={15} /><div><b>Prototype Mode</b><span>Supabase + local cache</span></div></div><Link to="/" className="sidebar-back"><ChevronLeft size={16} /> Product site</Link></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button className="mobile-menu-button" type="button" onClick={() => setMobileNav((value) => !value)}><LayoutDashboard size={18} /></button>
          <div><span className="admin-topbar__crumb">The Copper Fork /</span><strong>{sectionTitle}</strong></div>
          <div className="admin-topbar__actions"><a className="button button--small button--secondary" href="/display/main" target="_blank" rel="noreferrer"><Monitor size={15} /> Preview Display</a><button className="button button--small button--primary" type="button" onClick={() => setSection('items')}><Plus size={15} /> Add Menu Item</button></div>
        </header>

        <div className="admin-content">
          {section === 'dashboard' && <DashboardSection onNavigate={setSection} />}
          {section === 'menus' && <MenusSection onManageMenu={manageMenu} />}
          {section === 'items' && <MenuItemsSection selectedMenuId={selectedMenuId} onSelectMenu={setSelectedMenuId} onBackToMenus={() => setSection('menus')} />}
          {section === 'screens' && <ScreensSection />}
          {section === 'scheduling' && <SchedulingSection />}
          {section === 'specials' && <SpecialsSection />}
          {section === 'appearance' && <AppearanceSection />}
          {section === 'settings' && <SettingsSection />}
        </div>
      </main>
    </div>
  );
}
