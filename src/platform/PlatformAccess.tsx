import { useState, type ReactNode } from 'react';
import { ArrowLeft, KeyRound, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useTvmPlatform, type TvmModuleCode } from './TvmPlatformContext';

export function PlatformLoginCard() {
  const platform = useTvmPlatform();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'signin') await platform.signIn(email, password);
      else setMessage(await platform.signUp(email, password));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="platform-access-page">
      <section className="platform-access-card">
        <span className="platform-access-icon"><ShieldCheck size={22} /></span>
        <span className="launcher-kicker">TVM PLATFORM ACCESS</span>
        <h1>{mode === 'signin' ? 'Sign in to TVM.' : 'Create your TVM account.'}</h1>
        <p>Venue administrators sign in once, then TVM unlocks the modules licensed to their organization.</p>
        <label><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {message && <div className="platform-access-message">{message}</div>}
        <button className="module-action module-action--primary platform-access-submit" type="button" disabled={busy || !email || password.length < 6} onClick={() => void submit()}>
          {busy ? <RefreshCw className="spin" size={14} /> : <ShieldCheck size={14} />}
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
        <button className="platform-text-button" type="button" onClick={() => setMode((current) => current === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Need an account? Create one.' : 'Already have an account? Sign in.'}
        </button>
        <Link className="platform-back-link" to="/"><ArrowLeft size={13} /> Back to TVM</Link>
      </section>
    </div>
  );
}

export function LicenseRequiredCard({ moduleCode, moduleName }: { moduleCode: TvmModuleCode; moduleName: string }) {
  const platform = useTvmPlatform();
  const [licenseKey, setLicenseKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function activate() {
    setBusy(true);
    setMessage('');
    try {
      await platform.activateModule(moduleCode, licenseKey);
      setMessage(`${moduleName} activated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'License activation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="platform-access-page">
      <section className="platform-access-card">
        <span className="platform-access-icon"><LockKeyhole size={22} /></span>
        <span className="launcher-kicker">MODULE LICENSE REQUIRED</span>
        <h1>{moduleName} is locked.</h1>
        <p>TVM is the platform. Each module is licensed independently through OneTime Labs Licensing.</p>
        <label><span>{moduleName} license key</span><input value={licenseKey} onChange={(event) => setLicenseKey(event.target.value.toUpperCase())} placeholder="OTL-TVM-..." /></label>
        {message && <div className="platform-access-message">{message}</div>}
        <button className="module-action module-action--primary platform-access-submit" type="button" disabled={busy || licenseKey.trim().length < 8} onClick={() => void activate()}>
          {busy ? <RefreshCw className="spin" size={14} /> : <KeyRound size={14} />} Activate Module
        </button>
        {platform.devMode && (
          <button className="platform-text-button" type="button" onClick={() => platform.setDevOverride(moduleCode, true)}>
            Enable local development override
          </button>
        )}
        <Link className="platform-back-link" to="/"><ArrowLeft size={13} /> Back to TVM modules</Link>
      </section>
    </div>
  );
}

export function ModuleGate({ moduleCode, moduleName, children }: { moduleCode: TvmModuleCode; moduleName: string; children: ReactNode }) {
  const platform = useTvmPlatform();

  if (platform.loading) return <div className="platform-loading"><RefreshCw className="spin" size={20} /> Loading TVM access…</div>;
  if (!platform.user) return <PlatformLoginCard />;
  if (!platform.isLicensed(moduleCode)) return <LicenseRequiredCard moduleCode={moduleCode} moduleName={moduleName} />;
  return <>{children}</>;
}
