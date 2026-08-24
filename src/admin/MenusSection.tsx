import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Edit3, Layers3, Monitor, Plus, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import { useAppStore } from '../hooks/useAppStore';
import type { MenuDefinition } from '../types/menu';

const newMenu = (): MenuDefinition => ({
  id: `menu-${Date.now()}`,
  name: '',
  description: '',
  categories: ['Entrees', 'Sides', 'Drinks'],
  enabled: true,
});

export default function MenusSection({ onManageMenu }: { onManageMenu: (menuId: string) => void }) {
  const { data, addMenu, updateMenu, deleteMenu } = useAppStore();
  const [editing, setEditing] = useState<MenuDefinition | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [categoryText, setCategoryText] = useState('');

  const itemCounts = useMemo(() => data.menuItems.reduce<Record<string, number>>((result, item) => {
    result[item.menuId] = (result[item.menuId] ?? 0) + 1;
    return result;
  }, {}), [data.menuItems]);

  const screenCounts = useMemo(() => data.screens.reduce<Record<string, number>>((result, screen) => {
    result[screen.assignedMenuId] = (result[screen.assignedMenuId] ?? 0) + 1;
    return result;
  }, {}), [data.screens]);

  const openNew = () => {
    const next = newMenu();
    setIsNew(true);
    setEditing(next);
    setCategoryText(next.categories.join(', '));
  };

  const openEdit = (menu: MenuDefinition) => {
    setIsNew(false);
    setEditing({ ...menu });
    setCategoryText(menu.categories.join(', '));
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editing || !editing.name.trim()) return;

    const categories = Array.from(new Set(categoryText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)));

    const next = {
      ...editing,
      name: editing.name.trim(),
      description: editing.description.trim(),
      categories: categories.length ? categories : ['Entrees'],
    };

    if (isNew) addMenu({ ...next, id: `menu-${Date.now()}` });
    else updateMenu(editing.id, next);

    setEditing(null);
  };

  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">Menu library</span>
          <h1>Menus</h1>
          <p>Create separate menu collections, then assign them to screens or scheduled dayparts.</p>
        </div>
        <button className="button button--primary" type="button" onClick={openNew}><Plus size={16} /> Create Menu</button>
      </div>

      <div className="menu-library-grid">
        {data.menus.map((menu) => (
          <article className="admin-card menu-library-card" key={menu.id}>
            <div className="menu-library-card__icon"><Layers3 /></div>
            <span className={`status-pill ${menu.enabled ? 'green' : 'amber'}`}><CheckCircle2 size={13} />{menu.enabled ? 'Published' : 'Hidden'}</span>
            <h2>{menu.name}</h2>
            <p>{menu.description || 'Restaurant menu collection.'}</p>
            <div className="menu-library-card__categories">
              {menu.categories.slice(0, 5).map((category) => <span key={category}>{category}</span>)}
              {menu.categories.length > 5 && <span>+{menu.categories.length - 5}</span>}
            </div>
            <div className="menu-library-card__meta">
              <span>{itemCounts[menu.id] ?? 0} items</span>
              <span><Monitor size={14} /> {screenCounts[menu.id] ?? 0} assigned</span>
            </div>
            <div className="menu-library-card__actions">
              <button className="button button--primary" type="button" onClick={() => onManageMenu(menu.id)}>Manage Menu</button>
              <button className="icon-button" type="button" title="Edit menu" onClick={() => openEdit(menu)}><Edit3 size={15} /></button>
              <button
                className="icon-button danger"
                type="button"
                title="Delete menu"
                disabled={data.menus.length <= 1}
                onClick={() => {
                  if (window.confirm(`Delete ${menu.name} and all items inside it?`)) deleteMenu(menu.id);
                }}
              ><Trash2 size={15} /></button>
            </div>
          </article>
        ))}
      </div>

      <div className="info-callout"><strong>How this works:</strong> Categories belong to a menu. A screen can stay assigned to one menu, or follow Scheduling and automatically switch menus by time of day.</div>

      {editing && (
        <Modal title={isNew ? 'Create Menu' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form className="modal-form" onSubmit={save}>
            <label><span>Menu name</span><input required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="Dinner Menu" /></label>
            <label><span>Description</span><textarea rows={3} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="What this menu is used for" /></label>
            <label><span>Categories</span><input value={categoryText} onChange={(event) => setCategoryText(event.target.value)} placeholder="Appetizers, Entrees, Sides, Drinks" /><small>Separate categories with commas.</small></label>
            <Toggle label="Published" checked={editing.enabled} onChange={(value) => setEditing({ ...editing, enabled: value })} />
            <div className="modal-form__actions">
              <button className="button button--secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
              <button className="button button--primary" type="submit">{isNew ? 'Create Menu' : 'Save Menu'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
