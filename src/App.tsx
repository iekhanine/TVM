import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleHelp,
  Construction,
  Gamepad2,
  Grid2X2,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Monitor,
  Radio,
  RefreshCw,
  Settings,
  Sparkles,
  Tv,
  Users,
  Wrench,
} from 'lucide-react';
import {
  Link,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import AdminPage from './admin/AdminPage';
import DisplayPage from './display/DisplayPage';
import TriviaPrototype from './trivia/TriviaPrototype';
import DevConsole from './platform/DevConsole';
import { ModuleGate, PlatformLoginCard } from './platform/PlatformAccess';
import {
  TvmPlatformProvider,
  useTvmPlatform,
  type TvmModuleCode,
} from './platform/TvmPlatformContext';

import './App.css';

/* ==========================================================
   APP 001 - TVM MODULE MODEL
   TVM is the umbrella. Each module is independently licensed.
   ========================================================== */

type ReleaseStatus = 'available' | 'beta' | 'planned';

type TvmModule = {
  id: TvmModuleCode;
  name: string;
  category: string;
  description: string;
  icon: typeof Tv;
  releaseStatus: ReleaseStatus;
  primaryLabel?: string;
  primaryTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
};

const modules: TvmModule[] = [
  {
    id: 'boards',
    name: 'TVM Boards',
    category: 'Menus & Digital Displays',
    description: 'Create and manage browser-based menu boards, pricing, specials, layouts, and venue display screens.',
    icon: Monitor,
    releaseStatus: 'available',
    primaryLabel: 'Open Boards',
    primaryTo: '/menu/admin',
    secondaryLabel: 'View Display',
    secondaryTo: '/menu/display/main',
  },
  {
    id: 'trivia',
    name: 'TVM Trivia',
    category: 'Live Venue Trivia',
    description: 'Run host-controlled trivia sessions with shared TV questions, four-digit join codes, teams, mobile answers, and live scoring.',
    icon: CircleHelp,
    releaseStatus: 'beta',
    primaryLabel: 'Open Trivia',
    primaryTo: '/trivia',
  },
  {
    id: 'bingo',
    name: 'TVM Bingo',
    category: 'Interactive Games',
    description: 'Traditional bingo, music bingo, venue-hosted rounds, and browser-based player cards.',
    icon: Grid2X2,
    releaseStatus: 'planned',
  },
  {
    id: 'live',
    name: 'TVM Live',
    category: 'Audience Interaction',
    description: 'Live polls, voting, song guessing, crowd games, contests, and other real-time audience experiences.',
    icon: Radio,
    releaseStatus: 'planned',
  },
  {
    id: 'events',
    name: 'TVM Events',
    category: 'Venue Promotions',
    description: 'Schedule event slides, promotions, announcements, recurring venue content, and time-based campaigns.',
    icon: CalendarDays,
    releaseStatus: 'planned',
  },
  {
    id: 'games',
    name: 'TVM Games',
    category: 'Future Module',
    description: 'Reserved for additional television-first venue games and interactive experiences built on the TVM platform.',
    icon: Gamepad2,
    releaseStatus: 'planned',
  },
];

/* ==========================================================
   APP 002 - MODULE LICENSE / RELEASE BADGE
   ========================================================== */

function ModuleStatusBadge({ module }: { module: TvmModule }) {
  const platform = useTvmPlatform();
  const licensed = platform.isLicensed(module.id);
  const entitlement = platform.getEntitlement(module.id);

  if (module.releaseStatus === 'planned') {
    return <span className="module-status module-status--planned"><Construction size={13} /> Planned</span>;
  }

  if (licensed) {
    return <span className="module-status module-status--active"><BadgeCheck size={13} /> Licensed</span>;
  }

  if (entitlement?.status && entitlement.status !== 'inactive') {
    return <span className="module-status module-status--warning"><LockKeyhole size={13} /> {entitlement.status}</span>;
  }

  return <span className="module-status module-status--locked"><KeyRound size={13} /> License Required</span>;
}

/* ==========================================================
   APP 003 - MODULE TILE
   ========================================================== */

function ModuleTile({ module }: { module: TvmModule }) {
  const platform = useTvmPlatform();
  const Icon = module.icon;
  const licensed = platform.isLicensed(module.id);
  const usable = module.releaseStatus !== 'planned';

  return (
    <article className={`module-tile ${!licensed && usable ? 'module-tile--locked' : ''} ${module.releaseStatus === 'planned' ? 'module-tile--planned' : ''}`}>
      <div className="module-tile__header">
        <div className="module-tile__icon"><Icon size={23} /></div>
        <ModuleStatusBadge module={module} />
      </div>

      <div className="module-tile__body">
        <span className="module-tile__category">{module.category}</span>
        <h2>{module.name}</h2>
        <p>{module.description}</p>
      </div>

      <div className="module-tile__footer">
        {usable && module.primaryTo && module.primaryLabel ? (
          <Link className={`module-action ${licensed ? 'module-action--primary' : 'module-action--locked'}`} to={module.primaryTo}>
            {licensed ? module.primaryLabel : 'License / Activate'}
            {licensed ? <ArrowRight size={15} /> : <KeyRound size={14} />}
          </Link>
        ) : (
          <span className="module-action module-action--disabled">Not yet available</span>
        )}

        {licensed && module.secondaryTo && module.secondaryLabel && (
          <Link className="module-action module-action--secondary" to={module.secondaryTo}>{module.secondaryLabel}</Link>
        )}
      </div>
    </article>
  );
}

/* ==========================================================
   APP 004 - TVM MAIN MODULE LAUNCHER
   ========================================================== */

function TvmHomePage() {
  const platform = useTvmPlatform();
  const licensedCount = modules.filter((module) => platform.isLicensed(module.id)).length;
  const availableCount = modules.filter((module) => module.releaseStatus !== 'planned').length;

  return (
    <div className="tvm-app-shell">
      <header className="tvm-topbar">
        <Link className="tvm-logo" to="/" aria-label="TVM home">
          <span className="tvm-logo__mark">TVM</span>
          <span className="tvm-logo__text"><strong>Television Venue Media</strong><small>OneTime Labs</small></span>
        </Link>

        <div className="tvm-topbar__actions">
          {platform.loading ? (
            <span className="topbar-status"><RefreshCw className="spin" size={12} /> Loading</span>
          ) : platform.user ? (
            <>
              <span className="topbar-status"><Users size={12} /> {platform.workspace?.organizationName ?? platform.user.email}</span>
              <button className="topbar-button" type="button" onClick={() => void platform.syncEntitlements()}><RefreshCw size={13} /> Sync Licenses</button>
              <button className="topbar-button" type="button" onClick={() => void platform.signOut()}>Sign Out</button>
            </>
          ) : (
            <Link className="topbar-button" to="/access"><KeyRound size={14} /> Sign In</Link>
          )}
          {platform.devMode && <Link className="topbar-button" to="/dev"><Wrench size={13} /> Dev</Link>}
          <a className="topbar-button" href="https://licensing.onetimelabs.net" target="_blank" rel="noreferrer"><KeyRound size={14} /> Licensing</a>
          <button className="topbar-icon-button" type="button" aria-label="TVM settings"><Settings size={16} /></button>
        </div>
      </header>

      <main className="tvm-main">
        {platform.error && <div className="platform-banner platform-banner--error">{platform.error}</div>}

        <section className="launcher-heading">
          <div>
            <span className="launcher-kicker"><LayoutDashboard size={14} /> TVM Module Console</span>
            <h1>Choose a module.</h1>
            <p>TVM is the shared venue platform. Boards, Trivia, Bingo, Live, Events, and future products are licensed independently while sharing one organization, venue, identity, display, and database foundation.</p>
          </div>

          <div className="platform-summary" aria-label="TVM platform summary">
            <div><strong>{modules.length}</strong><span>Modules</span></div>
            <div><strong>{licensedCount}</strong><span>Licensed</span></div>
            <div><strong>{availableCount}</strong><span>Available / Beta</span></div>
          </div>
        </section>

        {!platform.user && (
          <section className="platform-banner">
            <div><strong>Sign in to load your organization licenses.</strong><span>The TVM shell is always available. Modules unlock independently based on OneTime Labs Licensing.</span></div>
            <Link className="module-action module-action--primary" to="/access">Sign In <ArrowRight size={14} /></Link>
          </section>
        )}

        <section className="module-section" aria-labelledby="module-heading">
          <div className="section-label-row"><div><span>TVM PRODUCTS</span><strong id="module-heading">Modules</strong></div><small>Licensing authority: OneTime Labs Licensing</small></div>
          <div className="module-grid">{modules.map((module) => <ModuleTile key={module.id} module={module} />)}</div>
        </section>

        <section className="foundation-bar">
          <div className="foundation-bar__title"><Sparkles size={15} /><div><strong>Shared TVM Platform</strong><span>One backend. Multiple independently licensed venue products.</span></div></div>
          <div className="foundation-bar__items"><span><Users size={14} /> Organizations & Venues</span><span><Tv size={14} /> Registered Displays</span><span><KeyRound size={14} /> Per-Module Licensing</span></div>
        </section>
      </main>

      <footer className="tvm-footer"><span>TVM · Television Venue Media</span><span>Built by OneTime Labs</span></footer>
    </div>
  );
}

function AccessRoute() {
  const platform = useTvmPlatform();
  if (platform.loading) return <div className="platform-loading"><RefreshCw className="spin" size={20} /> Loading TVM…</div>;
  if (platform.user) return <Navigate to="/" replace />;
  return <PlatformLoginCard />;
}

/* ==========================================================
   APP 005 - ROUTING / ENFORCEMENT
   Public player/display surfaces remain anonymous.
   Host/admin surfaces require the individual module license.
   ========================================================== */

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TvmHomePage />} />
      <Route path="/access" element={<AccessRoute />} />
      <Route path="/dev" element={<DevConsole />} />

      <Route path="/menu/admin" element={<ModuleGate moduleCode="boards" moduleName="TVM Boards"><AdminPage /></ModuleGate>} />
      <Route path="/menu/display/main" element={<DisplayPage screenId="screen-main" />} />
      <Route path="/menu/display/bar" element={<DisplayPage screenId="screen-bar" />} />

      <Route path="/trivia" element={<ModuleGate moduleCode="trivia" moduleName="TVM Trivia"><TriviaPrototype view="host" /></ModuleGate>} />
      <Route path="/trivia/display" element={<TriviaPrototype view="display" />} />
      <Route path="/trivia/play" element={<TriviaPrototype view="player" />} />

      <Route path="/admin" element={<Navigate to="/menu/admin" replace />} />
      <Route path="/display/main" element={<Navigate to="/menu/display/main" replace />} />
      <Route path="/display/bar" element={<Navigate to="/menu/display/bar" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <TvmPlatformProvider><AppRoutes /></TvmPlatformProvider>;
}
