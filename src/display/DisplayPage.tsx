import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Flame, Leaf, Star } from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import type { MenuItem } from '../types/menu';
import { currentSchedule } from '../utils/time';

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export default function DisplayPage({ screenId }: { screenId: string }) {
  const { data } = useAppStore();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const screen = data.screens.find((entry) => entry.id === screenId);
  const activeSchedule = currentSchedule(data.schedules, now);

  const effectiveMenuId = screen
    ? (screen.useSchedule
        ? (data.manualMenuOverride || activeSchedule?.menuId || screen.assignedMenuId)
        : screen.assignedMenuId)
    : '';

  const menu = data.menus.find((entry) => entry.id === effectiveMenuId) ?? data.menus.find((entry) => entry.id === screen?.assignedMenuId) ?? data.menus[0];
  const isBar = screenId === 'screen-bar';

  const visibleItems = useMemo(() => data.menuItems.filter((item) => item.menuId === menu?.id && item.enabled), [data.menuItems, menu?.id]);
  const visibleCategories = useMemo(() => (menu?.categories ?? []).filter((category) => visibleItems.some((item) => item.category === category)), [menu?.categories, visibleItems]);
  const grouped = useMemo(() => visibleCategories.map((category) => ({ category, items: visibleItems.filter((item) => item.category === category) })), [visibleCategories, visibleItems]);
  const displayColumns = Math.max(2, Math.min(4, data.appearance.columns));
  const columnGroups = useMemo(() => {
    const columns = Array.from({ length: displayColumns }, () => [] as typeof grouped);
    grouped.forEach((group, index) => columns[index % displayColumns].push(group));
    return columns;
  }, [displayColumns, grouped]);

  const activeSpecials = useMemo(() => data.specials.filter((special) => {
    if (!special.enabled) return false;
    const start = new Date(special.start).getTime();
    const end = new Date(special.end).getTime();
    const current = now.getTime();
    return (Number.isNaN(start) || current >= start) && (Number.isNaN(end) || current <= end);
  }), [data.specials, now]);
  const special = activeSpecials[0];

  const displayLabel = screen?.useSchedule
    ? (data.manualMenuOverride ? `MANUAL • ${menu?.name ?? 'MENU'}` : `${activeSchedule?.name ?? 'ALL DAY'} • ${menu?.name ?? 'MENU'}`)
    : (menu?.name ?? 'MENU');

  const style = {
    '--menu-accent': data.appearance.accentColor,
    '--menu-background': data.appearance.background,
    '--menu-font-scale': String(data.appearance.fontScale),
    '--menu-columns': String(displayColumns),
  } as CSSProperties;

  if (!screen) {
    return <main className="display-fallback"><strong>OneTime Menu</strong><h1>Display not configured</h1><p>This screen route does not have a matching configuration.</p></main>;
  }

  if (!menu) {
    return <main className="display-fallback"><strong>OneTime Menu</strong><h1>No menu assigned</h1><p>Assign a menu to this screen in the admin dashboard.</p></main>;
  }

  return (
    <main className={`menu-display menu-display--${data.appearance.theme} ${isBar ? 'menu-display--bar' : ''}`} style={style}>
      <header className="menu-display__header">
        <div className="menu-display__brand">
          {data.appearance.showLogo && <div className="display-logo">{data.restaurant.logoText || 'CF'}</div>}
          <div><span className="display-kicker">{isBar ? 'BAR • DRINKS • GOOD COMPANY' : 'KITCHEN • BAR • GOOD COMPANY'}</span><h1>{data.restaurant.name}</h1></div>
        </div>
        <div className="menu-display__period"><span>{displayLabel}</span><small>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>
      </header>

      {data.appearance.showSpecialsBanner && special && (
        <section className="display-special"><span>{special.type}</span><strong>{special.title}</strong><p>{special.description}</p>{special.price !== undefined && <b>{money(special.price, data.restaurant.currency)}</b>}</section>
      )}

      <section className="menu-display__content">
        {visibleItems.length === 0 ? (
          <div className="display-empty-menu"><span>{menu.name}</span><h2>No items are currently enabled.</h2><p>Update this menu from the OneTime Menu admin dashboard.</p></div>
        ) : (
          <div className="menu-display__grid">
            {columnGroups.map((column, columnIndex) => (
              <div className="display-column" key={`column-${columnIndex}`}>
                {column.map(({ category, items }) => (
                  <section className="display-category" key={category}>
                    {data.appearance.showCategoryHeaders && <div className="display-category__heading"><h2>{category}</h2><span></span></div>}
                    <div className="display-category__items">{items.map((item) => <DisplayItem key={item.id} item={item} currency={data.restaurant.currency} showDescription={data.appearance.showDescriptions} />)}</div>
                  </section>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="menu-display__footer"><div><strong>{data.restaurant.phone}</strong><span>{data.restaurant.address}</span></div><div className="display-powered"><span>Powered by</span><strong>OneTime Labs</strong></div></footer>
    </main>
  );
}

function DisplayItem({ item, currency, showDescription }: { item: MenuItem; currency: string; showDescription: boolean }) {
  return (
    <article className={`display-item ${item.soldOut ? 'is-sold-out' : ''} ${item.featured ? 'is-featured' : ''}`}>
      <div className="display-item__line"><div className="display-item__name"><h3>{item.name}</h3><span className="display-flags">{item.featured && <Star aria-label="Featured" />}{item.vegetarian && <Leaf aria-label="Vegetarian" />}{item.spicy && <Flame aria-label="Spicy" />}</span></div><strong className="display-item__price">{money(item.price, currency)}</strong></div>
      {showDescription && item.description && <p>{item.description}</p>}
      {item.soldOut && <span className="sold-out-stamp">SOLD OUT</span>}
    </article>
  );
}
