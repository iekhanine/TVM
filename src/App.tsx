import {
  ArrowRight,
  CircleHelp,
  Grid2X2,
  Monitor,
  Radio,
  RefreshCw,
  Gamepad2,
  CalendarDays,
  Tv,
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
   APP 001 - CUSTOMER-FACING TVM MODULE MODEL
   TVM is the umbrella. Customers only see modules that their
   organization is actively entitled to use.
   ========================================================== */

type ReleaseStatus = 'available' | 'beta' | 'planned';

type TvmModule = {
  id: TvmModuleCode;
  name: string;
  shortName: string;
  description: string;
  icon: typeof Tv;
  releaseStatus: ReleaseStatus;
  primaryTo?: string;
};

const modules: TvmModule[] = [
  {
    id: 'boards',
    name: 'TVM Boards',
    shortName: 'Boards',
    description: 'Digital menus and venue display boards.',
    icon: Monitor,
    releaseStatus: 'available',
    primaryTo: '/menu/admin',
  },
  {
    id: 'trivia',
    name: 'TVM Trivia',
    shortName: 'Trivia',
    description: 'Host-led live trivia for your venue.',
    icon: CircleHelp,
    releaseStatus: 'beta',
    primaryTo: '/trivia',
  },
  {
    id: 'bingo',
    name: 'TVM Bingo',
    shortName: 'Bingo',
    description: 'Venue bingo and music bingo.',
    icon: Grid2X2,
    releaseStatus: 'planned',
  },
  {
    id: 'live',
    name: 'TVM Live',
    shortName: 'Live',
    description: 'Audience interaction and live venue games.',
    icon: Radio,
    releaseStatus: 'planned',
  },
  {
    id: 'events',
    name: 'TVM Events',
    shortName: 'Events',
    description: 'Venue events and scheduled promotions.',
    icon: CalendarDays,
    releaseStatus: 'planned',
  },
  {
    id: 'games',
    name: 'TVM Games',
    shortName: 'Games',
    description: 'Additional television-first venue games.',
    icon: Gamepad2,
    releaseStatus: 'planned',
  },
];

/* ==========================================================
   APP 002 - LICENSED MODULE LAUNCHER
   Unlicensed modules are not rendered at all. This is a venue
   portal, not a OneTime Labs product catalog.
   ========================================================== */

function TvmHomePage() {
  const platform = useTvmPlatform();

  if (platform.loading) {
    return (
      <div className="licensed-portal-state">
        <RefreshCw className="spin" size={18} />
        <span>Loading TVM…</span>
      </div>
    );
  }

  if (!platform.user) {
    return <Navigate to="/access" replace />;
  }

  const licensedModules = modules.filter((module) => platform.isLicensed(module.id));
  const launchableModules = licensedModules.filter((module) => module.primaryTo && module.releaseStatus !== 'planned');

  // A single licensed product should feel like the product itself, not a
  // reduced version of a larger suite. Go directly into it.
  if (licensedModules.length === 1 && launchableModules.length === 1) {
    return <Navigate to={launchableModules[0].primaryTo!} replace />;
  }

  return (
    <div className="licensed-portal-shell">
      <header className="licensed-portal-header">
        <div className="licensed-portal-brand">
          <span>TVM</span>
          <div>
            <strong>{platform.workspace?.venueName ?? 'Television Venue Media'}</strong>
            <small>{platform.workspace?.organizationName ?? 'OneTime Labs'}</small>
          </div>
        </div>

        <button type="button" onClick={() => void platform.signOut()}>Sign Out</button>
      </header>

      <main className="licensed-portal-main">
        {platform.error && <div className="platform-banner platform-banner--error">{platform.error}</div>}

        {licensedModules.length === 0 ? (
          <section className="licensed-portal-empty">
            <span>TVM</span>
            <h1>No venue modules are currently available.</h1>
            <p>Contact your venue administrator if you believe this is incorrect.</p>
          </section>
        ) : (
          <section className="licensed-module-picker" aria-label="Licensed TVM modules">
            <div className="licensed-module-picker__heading">
              <span>TVM</span>
              <h1>Choose a module.</h1>
              <p>Only products licensed to this venue are shown here.</p>
            </div>

            <div className="licensed-module-list">
              {licensedModules.map((module) => {
                const Icon = module.icon;
                const available = Boolean(module.primaryTo && module.releaseStatus !== 'planned');

                return available ? (
                  <Link className="licensed-module-row" to={module.primaryTo!} key={module.id}>
                    <span className="licensed-module-row__icon"><Icon size={18} /></span>
                    <span className="licensed-module-row__copy">
                      <strong>{module.shortName}</strong>
                      <small>{module.description}</small>
                    </span>
                    <ArrowRight size={15} />
                  </Link>
                ) : (
                  <div className="licensed-module-row licensed-module-row--pending" key={module.id}>
                    <span className="licensed-module-row__icon"><Icon size={18} /></span>
                    <span className="licensed-module-row__copy">
                      <strong>{module.shortName}</strong>
                      <small>{module.description}</small>
                    </span>
                    <span className="licensed-module-row__status">Coming soon</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="licensed-portal-footer">TVM · OneTime Labs</footer>
    </div>
  );
}

function AccessRoute() {
  const platform = useTvmPlatform();
  if (platform.loading) {
    return <div className="platform-loading"><RefreshCw className="spin" size={20} /> Loading TVM…</div>;
  }
  if (platform.user) return <Navigate to="/" replace />;
  return <PlatformLoginCard />;
}

/* ==========================================================
   APP 003 - ROUTING / ENFORCEMENT
   Player/display routes remain public. Host/admin routes are
   protected by the individual module entitlement.
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
