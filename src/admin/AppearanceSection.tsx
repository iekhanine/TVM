import { Check, Monitor, Paintbrush, Type } from 'lucide-react';
import Toggle from '../components/Toggle';
import { useAppStore } from '../hooks/useAppStore';

export default function AppearanceSection() {
  const { data, updateAppearance } = useAppStore();
  const appearance = data.appearance;

  return (
    <div>
      <div className="admin-page-heading"><div><span className="eyebrow">Display design</span><h1>Appearance</h1><p>Choose a television-first template and control what information is visible from across the room.</p></div><a className="button button--primary" href="/display/main" target="_blank" rel="noreferrer"><Monitor size={16} /> Preview Live Display</a></div>

      <section className="admin-card appearance-card">
        <div className="admin-card__header"><div><span className="eyebrow">Templates</span><h2>Display theme</h2></div></div>
        <div className="theme-picker">
          <button type="button" className={appearance.theme === 'dark' ? 'selected' : ''} onClick={() => updateAppearance({ theme: 'dark', background: '#11110f', accentColor: '#d99a42' })}>
            <div className="theme-preview theme-preview--dark"><div><b>THE COPPER FORK</b><small>DINNER</small></div><span></span><div className="theme-preview__cols"><i></i><i></i><i></i></div></div>
            <span><b>Modern Dark</b><small>High-contrast restaurant board</small></span>{appearance.theme === 'dark' && <i className="selected-check"><Check size={14} /></i>}
          </button>
          <button type="button" className={appearance.theme === 'bright' ? 'selected' : ''} onClick={() => updateAppearance({ theme: 'bright', background: '#f7f1e7', accentColor: '#c65132' })}>
            <div className="theme-preview theme-preview--bright"><div><b>THE COPPER FORK</b><small>LUNCH</small></div><span></span><div className="theme-preview__cols"><i></i><i></i><i></i></div></div>
            <span><b>Bright Casual</b><small>Cafe and quick-service style</small></span>{appearance.theme === 'bright' && <i className="selected-check"><Check size={14} /></i>}
          </button>
        </div>
      </section>

      <div className="settings-columns">
        <section className="admin-card appearance-card">
          <div className="admin-card__header"><div><span className="eyebrow">Visual system</span><h2>Colors & scale</h2></div><Paintbrush size={19} /></div>
          <label className="color-field"><span>Background</span><div><input type="color" value={appearance.background} onChange={(event) => updateAppearance({ background: event.target.value })} /><code>{appearance.background}</code></div></label>
          <label className="color-field"><span>Accent color</span><div><input type="color" value={appearance.accentColor} onChange={(event) => updateAppearance({ accentColor: event.target.value })} /><code>{appearance.accentColor}</code></div></label>
          <label className="range-field"><span><b>Font scale</b><small>{Math.round(appearance.fontScale * 100)}%</small></span><input type="range" min="0.8" max="1.3" step="0.05" value={appearance.fontScale} onChange={(event) => updateAppearance({ fontScale: Number(event.target.value) })} /></label>
          <label><span>Number of columns</span><select value={appearance.columns} onChange={(event) => updateAppearance({ columns: Number(event.target.value) })}><option value={2}>2 columns</option><option value={3}>3 columns</option><option value={4}>4 columns</option></select></label>
        </section>

        <section className="admin-card appearance-card">
          <div className="admin-card__header"><div><span className="eyebrow">Content density</span><h2>Display options</h2></div><Type size={19} /></div>
          <div className="settings-toggle-list">
            <Toggle label="Show menu descriptions" checked={appearance.showDescriptions} onChange={(value) => updateAppearance({ showDescriptions: value })} />
            <Toggle label="Show category headers" checked={appearance.showCategoryHeaders} onChange={(value) => updateAppearance({ showCategoryHeaders: value })} />
            <Toggle label="Show restaurant logo" checked={appearance.showLogo} onChange={(value) => updateAppearance({ showLogo: value })} />
            <Toggle label="Show specials banner" checked={appearance.showSpecialsBanner} onChange={(value) => updateAppearance({ showSpecialsBanner: value })} />
          </div>
        </section>
      </div>
    </div>
  );
}
