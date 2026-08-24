import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronLeft, Edit3, Flame, Leaf, Plus, Search, Star, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import { useAppStore } from '../hooks/useAppStore';
import type { MenuItem } from '../types/menu';

const emptyItem = (menuId: string, category: string): MenuItem => ({
  id: `item-${Date.now()}`,
  menuId,
  name: '',
  description: '',
  price: 0,
  category,
  enabled: true,
  soldOut: false,
  featured: false,
  vegetarian: false,
  spicy: false,
});

export default function MenuItemsSection({
  selectedMenuId,
  onSelectMenu,
  onBackToMenus,
}: {
  selectedMenuId: string;
  onSelectMenu: (menuId: string) => void;
  onBackToMenus: () => void;
}) {
  const { data, addMenuItem, updateMenuItem, deleteMenuItem } = useAppStore();
  const selectedMenu = data.menus.find((menu) => menu.id === selectedMenuId) ?? data.menus[0];
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(() => selectedMenu?.categories[0] ?? 'Entrees');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (!selectedMenu) return;
    if (!selectedMenu.categories.includes(activeCategory)) {
      setActiveCategory(selectedMenu.categories[0] ?? 'Entrees');
    }
    setQuery('');
  }, [activeCategory, selectedMenu]);

  const menuItems = useMemo(() => data.menuItems.filter((item) => item.menuId === selectedMenu?.id), [data.menuItems, selectedMenu?.id]);

  const categoryCounts = useMemo(() => menuItems.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, {}), [menuItems]);

  const filtered = useMemo(() => menuItems.filter((item) => {
    const categoryMatch = item.category === activeCategory;
    const queryMatch = `${item.name} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase());
    return categoryMatch && queryMatch;
  }), [activeCategory, menuItems, query]);

  if (!selectedMenu) {
    return <div className="admin-card empty-state"><h2>No menus configured</h2><p>Create a menu first.</p><button className="button button--primary" onClick={onBackToMenus}>Go to Menus</button></div>;
  }

  const openNew = () => {
    setIsNew(true);
    setEditing(emptyItem(selectedMenu.id, activeCategory || selectedMenu.categories[0] || 'Entrees'));
  };

  const openEdit = (item: MenuItem) => {
    setIsNew(false);
    setEditing({ ...item });
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editing || !editing.name.trim()) return;

    if (isNew) addMenuItem({ ...editing, id: `item-${Date.now()}` });
    else updateMenuItem(editing.id, editing);

    onSelectMenu(editing.menuId);
    setActiveCategory(editing.category);
    setEditing(null);
  };

  const changeEditingMenu = (menuId: string) => {
    if (!editing) return;
    const targetMenu = data.menus.find((menu) => menu.id === menuId);
    if (!targetMenu) return;
    const nextCategory = targetMenu.categories.includes(editing.category) ? editing.category : targetMenu.categories[0] ?? 'Entrees';
    setEditing({ ...editing, menuId, category: nextCategory });
  };

  const editingMenu = editing ? data.menus.find((menu) => menu.id === editing.menuId) : null;

  return (
    <div>
      <div className="manage-menu-context">
        <button type="button" onClick={onBackToMenus}><ChevronLeft size={14} /> All Menus</button>
        <span>/</span>
        <select value={selectedMenu.id} onChange={(event) => onSelectMenu(event.target.value)}>
          {data.menus.map((menu) => <option value={menu.id} key={menu.id}>{menu.name}</option>)}
        </select>
      </div>

      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">Manage Menu</span>
          <h1>{selectedMenu.name}</h1>
          <p>{selectedMenu.description} Edit one category at a time.</p>
        </div>
        <button className="button button--primary" type="button" onClick={openNew}><Plus size={16} /> Add Item</button>
      </div>

      <div className="menu-category-tabs" role="tablist" aria-label={`${selectedMenu.name} categories`}>
        {selectedMenu.categories.map((category) => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={activeCategory === category}
            className={activeCategory === category ? 'is-active' : ''}
            onClick={() => { setActiveCategory(category); setQuery(''); }}
          >
            <span>{category}</span><b>{categoryCounts[category] ?? 0}</b>
          </button>
        ))}
      </div>

      <div className="menu-category-panel admin-card" role="tabpanel">
        <div className="menu-category-panel__header">
          <div><span className="eyebrow">{selectedMenu.name}</span><h2>{activeCategory}</h2></div>
          <span>{categoryCounts[activeCategory] ?? 0} total</span>
        </div>

        <div className="filter-bar filter-bar--inside-card">
          <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeCategory.toLowerCase()}...`} /></label>
          <span>{filtered.length} shown</span>
        </div>

        <div className="items-table-wrap">
          <table className="items-table">
            <thead><tr><th>Item</th><th>Price</th><th>Status</th><th>Flags</th><th>Live</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><div className="menu-category-empty"><strong>No {activeCategory.toLowerCase()} found.</strong><span>{query ? 'Try a different search.' : `Add the first item to ${activeCategory}.`}</span>{!query && <button className="button button--secondary" type="button" onClick={openNew}><Plus size={14} /> Add Item</button>}</div></td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id} className={!item.enabled ? 'is-disabled' : ''}>
                  <td><div className="item-name-cell"><div className="item-avatar">{item.name.slice(0, 1)}</div><div><strong>{item.name}</strong><small>{item.description}</small></div></div></td>
                  <td><strong>${item.price.toFixed(2)}</strong></td>
                  <td>{item.soldOut ? <span className="status-pill red">SOLD OUT</span> : <span className="status-pill green">Available</span>}</td>
                  <td><div className="flag-row">{item.featured && <span title="Featured"><Star size={14} /></span>}{item.vegetarian && <span title="Vegetarian"><Leaf size={14} /></span>}{item.spicy && <span title="Spicy"><Flame size={14} /></span>}</div></td>
                  <td><Toggle checked={item.enabled} onChange={(value) => updateMenuItem(item.id, { enabled: value })} /></td>
                  <td><div className="row-actions"><button type="button" title="Edit" onClick={() => openEdit(item)}><Edit3 size={15} /></button><button className="danger" type="button" title="Delete" onClick={() => { if (window.confirm(`Delete ${item.name}?`)) deleteMenuItem(item.id); }}><Trash2 size={15} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title={isNew ? `Add Item to ${selectedMenu.name}` : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form className="modal-form" onSubmit={save}>
            <div className="form-grid form-grid--2">
              <label><span>Name</span><input required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="Menu item name" /></label>
              <label><span>Price</span><input required min="0" step="0.01" type="number" value={editing.price} onChange={(event) => setEditing({ ...editing, price: Number(event.target.value) })} /></label>
            </div>
            <label><span>Description</span><textarea rows={3} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="Short, readable description" /></label>
            <div className="form-grid form-grid--2">
              <label><span>Menu</span><select value={editing.menuId} onChange={(event) => changeEditingMenu(event.target.value)}>{data.menus.map((menu) => <option value={menu.id} key={menu.id}>{menu.name}</option>)}</select></label>
              <label><span>Category</span><select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>{editingMenu?.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            </div>
            <div className="toggle-grid">
              <Toggle label="Enabled" checked={editing.enabled} onChange={(value) => setEditing({ ...editing, enabled: value })} />
              <Toggle label="Sold out" checked={editing.soldOut} onChange={(value) => setEditing({ ...editing, soldOut: value })} />
              <Toggle label="Featured" checked={editing.featured} onChange={(value) => setEditing({ ...editing, featured: value })} />
              <Toggle label="Vegetarian" checked={editing.vegetarian} onChange={(value) => setEditing({ ...editing, vegetarian: value })} />
              <Toggle label="Spicy" checked={editing.spicy} onChange={(value) => setEditing({ ...editing, spicy: value })} />
            </div>
            <div className="modal-form__actions"><button className="button button--secondary" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="button button--primary" type="submit">{isNew ? 'Add Item' : 'Save Changes'}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
