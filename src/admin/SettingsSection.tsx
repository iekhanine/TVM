import { Building2, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import type { RestaurantSettings } from '../types/menu';

export default function SettingsSection() {
  const { data, updateRestaurant, resetDemo } = useAppStore();
  const [form, setForm] = useState<RestaurantSettings>(data.restaurant);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(data.restaurant), [data.restaurant]);

  const save = (event: FormEvent) => {
    event.preventDefault();
    updateRestaurant(form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div>
      <div className="admin-page-heading"><div><span className="eyebrow">Location profile</span><h1>Restaurant Settings</h1><p>Core business information used by menus, display headers, and future location management.</p></div></div>
      <div className="settings-columns settings-columns--wide">
        <form className="admin-card settings-form" onSubmit={save}>
          <div className="admin-card__header"><div><span className="eyebrow">Business details</span><h2>The Copper Fork</h2></div><Building2 size={20} /></div>
          <div className="form-grid form-grid--2"><label><span>Restaurant name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span>Logo placeholder</span><input maxLength={4} value={form.logoText} onChange={(event) => setForm({ ...form, logoText: event.target.value.toUpperCase() })} /></label></div>
          <label><span>Address</span><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <div className="form-grid form-grid--2"><label><span>Phone</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label><span>Website</span><input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label></div>
          <div className="form-grid form-grid--2"><label><span>Currency</span><select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}><option value="USD">USD - US Dollar</option><option value="CAD">CAD - Canadian Dollar</option><option value="EUR">EUR - Euro</option><option value="GBP">GBP - British Pound</option></select></label><label><span>Operating hours</span><input value={form.operatingHours} onChange={(event) => setForm({ ...form, operatingHours: event.target.value })} /></label></div>
          <div className="modal-form__actions"><span className={`saved-note ${saved ? 'show' : ''}`}><ShieldCheck size={15} /> Saved</span><button className="button button--primary" type="submit"><Save size={16} /> Save Settings</button></div>
        </form>
        <aside className="admin-card demo-reset-card"><span className="eyebrow">Prototype tools</span><h2>Reset demo data</h2><p>Restore The Copper Fork, sample menu items, screens, schedules, specials, and appearance settings to their original state.</p><button className="button button--secondary" type="button" onClick={() => { if (window.confirm('Reset all OneTime Menu demo data?')) resetDemo(); }}><RotateCcw size={16} /> Reset LocalStorage Demo</button><small>This only affects the browser running this prototype.</small></aside>
      </div>
    </div>
  );
}
