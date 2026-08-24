import { useState, type FormEvent } from 'react';
import { CalendarRange, Edit3, Plus, Tag, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import { useAppStore } from '../hooks/useAppStore';
import type { Special } from '../types/menu';

const emptySpecial = (): Special => ({
  id: `special-${Date.now()}`,
  type: 'Daily Special',
  title: '',
  description: '',
  price: undefined,
  start: new Date().toISOString().slice(0, 16),
  end: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  enabled: true,
});

export default function SpecialsSection() {
  const { data, addSpecial, updateSpecial, deleteSpecial } = useAppStore();
  const [editing, setEditing] = useState<Special | null>(null);
  const [isNew, setIsNew] = useState(false);

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editing?.title.trim()) return;
    if (isNew) addSpecial({ ...editing, id: `special-${Date.now()}` });
    else updateSpecial(editing.id, editing);
    setEditing(null);
  };

  return (
    <div>
      <div className="admin-page-heading"><div><span className="eyebrow">Promotions</span><h1>Specials</h1><p>Publish daily deals, happy hour promotions, limited-time items, and events to the display banner.</p></div><button className="button button--primary" type="button" onClick={() => { setIsNew(true); setEditing(emptySpecial()); }}><Plus size={16} /> Create Special</button></div>
      <div className="specials-grid">
        {data.specials.map((special) => <article className={`admin-card special-card ${!special.enabled ? 'is-disabled' : ''}`} key={special.id}>
          <div className="special-card__top"><span className="special-type"><Tag size={14} />{special.type}</span><Toggle checked={special.enabled} onChange={(value) => updateSpecial(special.id, { enabled: value })} /></div>
          <h2>{special.title}</h2><p>{special.description}</p>
          {special.price !== undefined && <strong className="special-price">${special.price.toFixed(2)}</strong>}
          <div className="special-dates"><CalendarRange size={15} /><span>{new Date(special.start).toLocaleDateString()} - {new Date(special.end).toLocaleDateString()}</span></div>
          <div className="special-card__actions"><button className="button button--secondary" type="button" onClick={() => { setIsNew(false); setEditing({ ...special }); }}><Edit3 size={15} /> Edit</button><button className="icon-button danger" type="button" onClick={() => { if (window.confirm(`Delete ${special.title}?`)) deleteSpecial(special.id); }}><Trash2 size={16} /></button></div>
        </article>)}
      </div>
      {data.specials.length === 0 && <div className="empty-state"><Tag /><h2>No specials yet</h2><p>Create a promotion and it can appear instantly on enabled displays.</p></div>}

      {editing && <Modal title={isNew ? 'Create Special' : `Edit ${editing.title}`} onClose={() => setEditing(null)}>
        <form className="modal-form" onSubmit={save}>
          <div className="form-grid form-grid--2">
            <label><span>Type</span><select value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value as Special['type'] })}><option>Daily Special</option><option>Happy Hour</option><option>Limited Time Item</option><option>Event Promotion</option></select></label>
            <label><span>Price (optional)</span><input type="number" min="0" step="0.01" value={editing.price ?? ''} onChange={(event) => setEditing({ ...editing, price: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
          </div>
          <label><span>Title</span><input required value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></label>
          <label><span>Description</span><textarea rows={3} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label>
          <div className="form-grid form-grid--2"><label><span>Start</span><input type="datetime-local" value={editing.start} onChange={(event) => setEditing({ ...editing, start: event.target.value })} /></label><label><span>End</span><input type="datetime-local" value={editing.end} onChange={(event) => setEditing({ ...editing, end: event.target.value })} /></label></div>
          <Toggle label="Enabled" checked={editing.enabled} onChange={(value) => setEditing({ ...editing, enabled: value })} />
          <div className="modal-form__actions"><button className="button button--secondary" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="button button--primary" type="submit">{isNew ? 'Publish Special' : 'Save Changes'}</button></div>
        </form>
      </Modal>}
    </div>
  );
}
