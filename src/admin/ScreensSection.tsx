import { CheckCircle2, Clipboard, ExternalLink, Monitor, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import Toggle from '../components/Toggle';
import { useAppStore } from '../hooks/useAppStore';

export default function ScreensSection() {
  const { data, refreshScreen, updateScreen } = useAppStore();
  const [copied, setCopied] = useState('');

  const copy = async (route: string, id: string) => {
    const url = `${window.location.origin}${route}`;
    try { await navigator.clipboard.writeText(url); }
    catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(id);
    window.setTimeout(() => setCopied(''), 1600);
  };

  return (
    <div>
      <div className="admin-page-heading"><div><span className="eyebrow">Display network</span><h1>Screens</h1><p>Assign each display a fixed menu or let it follow the restaurant schedule.</p></div><a className="button button--primary" href="/display/main" target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open Main Display</a></div>

      <div className="screen-grid">
        {data.screens.map((screen) => {
          const assignedMenu = data.menus.find((menu) => menu.id === screen.assignedMenuId);
          return <article className="admin-card screen-card" key={screen.id}>
            <div className="screen-card__preview"><Monitor size={42} /><span>{screen.resolution}</span><div className="screen-card__online"><i></i>{screen.status}</div></div>
            <div className="screen-card__body">
              <div className="screen-card__title"><div><h2>{screen.name}</h2><span className="status-pill green"><CheckCircle2 size={13} /> {screen.status}</span></div></div>
              <div className="screen-assignment-grid">
                <label><span>Assigned menu</span><select value={screen.assignedMenuId} onChange={(event) => updateScreen(screen.id, { assignedMenuId: event.target.value })}>{data.menus.map((menu) => <option value={menu.id} key={menu.id}>{menu.name}</option>)}</select></label>
                <div className="screen-follow-schedule"><Toggle label="Follow schedule" checked={screen.useSchedule} onChange={(value) => updateScreen(screen.id, { useSchedule: value })} /><small>{screen.useSchedule ? 'Automatically switches by daypart.' : `Always shows ${assignedMenu?.name ?? 'assigned menu'}.`}</small></div>
              </div>
              <dl><div><dt>Mode</dt><dd>{screen.useSchedule ? 'Scheduled' : 'Fixed menu'}</dd></div><div><dt>Resolution</dt><dd>{screen.resolution}</dd></div><div><dt>Last refresh</dt><dd>{screen.lastRefresh}</dd></div></dl>
              <label className="display-url"><span>Display URL</span><div><code>{screen.route}</code><button type="button" onClick={() => copy(screen.route, screen.id)}>{copied === screen.id ? <CheckCircle2 size={15} /> : <Clipboard size={15} />}</button></div></label>
              <div className="screen-card__actions"><a className="button button--secondary" href={screen.route} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Preview Screen</a><button className="button button--secondary" type="button" onClick={() => refreshScreen(screen.id)}><RefreshCw size={15} /> Refresh Screen</button></div>
            </div>
          </article>;
        })}
      </div>

      <section className="admin-card signage-howto"><div><span className="eyebrow">Deploy without a player box</span><h2>Put a menu on a television in under a minute.</h2></div><ol><li><span>1</span><div><b>Open the display URL</b><p>Use Chrome, Edge, Firefox, Safari, or a modern browser on the connected device.</p></div></li><li><span>2</span><div><b>Enter fullscreen</b><p>Press F11 on Windows or use the device/browser fullscreen control.</p></div></li><li><span>3</span><div><b>Leave the display open</b><p>Supabase Realtime pushes menu changes to connected displays; LocalStorage remains the fallback cache.</p></div></li></ol></section>
    </div>
  );
}
