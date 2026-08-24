import { useMemo, useState, type FormEvent } from 'react';
import { Edit3, Flame, Leaf, Plus, Search, Star, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import { useAppStore } from '../hooks/useAppStore';
import type { MenuItem } from '../types/menu';

const emptyItem = (category: string): MenuItem => ({
  id: `item-${Date.now()}`,
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

export default function MenuItemsSection() {
  const { data, addMenuItem, updateMenuItem, deleteMenuItem } = useAppStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  const filtered = useMemo(() => data.menuItems.filter((item) => {
    const categoryMatch = category === 'All' || item.category === category;
    const queryMatch = `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatch && queryMatch;
  }), [category, data.menuItems, query]);

  const openNew = () => {
    setIsNew(true);
    setEditing(emptyItem(data.categories[0]));
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
    setEditing(null);
  };

  return (
    <div>
      <div className="admin-page-heading">
        <div><span className="eyebrow">Catalog</span><h1>Menu Items</h1><p>Edit pricing and availability here. Open a display in another tab to see live LocalStorage synchronization.</p></div>
        <button className="button button--primary" type="button" onClick={openNew}><Plus size={16} /> Add Menu Item</button>
      </div>

      <div className="filter-bar">
        <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu items..." /></label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{data.categories.map((item) => <option key={item}>{item}</option>)}</select>
        <span>{filtered.length} items</span>
      </div>

      <div className="items-table-wrap admin-card">
        <table className="items-table">
          <thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Status</th><th>Flags</th><th>Live</th><th></th></tr></thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className={!item.enabled ? 'is-disabled' : ''}>
                <td><div className="item-name-cell"><div className="item-avatar">{item.name.slice(0, 1)}</div><div><strong>{item.name}</strong><small>{item.description}</small></div></div></td>
                <td><span className="category-pill">{item.category}</span></td>
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

      {editing && (
        <Modal title={isNew ? 'Add Menu Item' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form className="modal-form" onSubmit={save}>
            <div className="form-grid form-grid--2">
              <label><span>Name</span><input required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="Menu item name" /></label>
              <label><span>Price</span><input required min="0" step="0.01" type="number" value={editing.price} onChange={(event) => setEditing({ ...editing, price: Number(event.target.value) })} /></label>
            </div>
            <label><span>Description</span><textarea rows={3} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="Short, readable description" /></label>
            <label><span>Category</span><select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>{data.categories.map((item) => <option key={item}>{item}</option>)}</select></label>
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
