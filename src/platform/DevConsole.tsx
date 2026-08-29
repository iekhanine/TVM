import { Link, Navigate } from 'react-router-dom';
import { Check, ExternalLink, RefreshCw, ShieldAlert, Wrench } from 'lucide-react';

import { useTvmPlatform, type TvmModuleCode } from './TvmPlatformContext';
import { PlatformLoginCard } from './PlatformAccess';

const moduleRows: Array<{ code: TvmModuleCode; name: string; route?: string }> = [
  { code: 'boards', name: 'TVM Boards', route: '/menu/admin' },
  { code: 'trivia', name: 'TVM Trivia', route: '/trivia' },
  { code: 'bingo', name: 'TVM Bingo' },
  { code: 'live', name: 'TVM Live' },
  { code: 'events', name: 'TVM Events' },
  { code: 'games', name: 'TVM Games' },
];

export default function DevConsole() {
  const platform = useTvmPlatform();
  const lastCode = window.localStorage.getItem('tvm_trivia_last_code') ?? '';

  if (!platform.devMode) return <Navigate to="/" replace />;
  if (!platform.user) return <PlatformLoginCard />;

  return (
    <div className="tvm-app-shell">
      <main className="tvm-main dev-console">
        <section className="launcher-heading">
          <div><span className="launcher-kicker"><Wrench size={13} /> LOCAL DEVELOPMENT ONLY</span><h1>TVM Test Console</h1><p>Local overrides live only in this browser on localhost. They never write a fake license to Supabase.</p></div>
          <button className="topbar-button" type="button" onClick={() => void platform.syncEntitlements()}><RefreshCw size={13} /> Sync real licenses</button>
        </section>

        <section className="dev-section">
          <div className="section-label-row"><div><span>ORGANIZATION</span><strong>{platform.workspace?.organizationName ?? 'TVM Organization'}</strong></div><small>{platform.workspace?.organizationId}</small></div>
          <div className="dev-module-list">
            {moduleRows.map((module) => {
              const entitlement = platform.getEntitlement(module.code);
              const realLicensed = entitlement?.status === 'active';
              const override = platform.hasDevOverride(module.code);
              return (
                <article className="dev-module-row" key={module.code}>
                  <div><strong>{module.name}</strong><span>{realLicensed ? 'Real license active' : entitlement?.status ?? 'No license record'}{override ? ' · Local override ON' : ''}</span></div>
                  <div className="dev-module-actions">
                    <button type="button" className={`dev-toggle ${override ? 'is-on' : ''}`} onClick={() => platform.setDevOverride(module.code, !override)}>{override ? <Check size={13} /> : <ShieldAlert size={13} />} Dev override</button>
                    {module.route && <Link className="topbar-button" to={module.route}>Open <ExternalLink size={12} /></Link>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dev-section">
          <div className="section-label-row"><div><span>TRIVIA TESTING</span><strong>Runtime surfaces</strong></div><small>{lastCode ? `Last game code: ${lastCode}` : 'Create a game from Host first.'}</small></div>
          <div className="dev-link-grid">
            <Link to="/trivia">Open Host</Link>
            <Link to={`/trivia/display${lastCode ? `?code=${lastCode}` : ''}`}>Open TV Display</Link>
            <Link to={`/trivia/play${lastCode ? `?code=${lastCode}` : ''}`}>Open Player Browser</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
