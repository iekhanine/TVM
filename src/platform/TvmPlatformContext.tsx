import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';

import { SUPABASE_ENABLED, supabase } from '../lib/supabase';

export type TvmModuleCode = 'boards' | 'trivia' | 'bingo' | 'live' | 'events' | 'games';
export type TvmLicenseStatus = 'inactive' | 'active' | 'suspended' | 'expired' | 'revoked';

export type TvmWorkspace = {
  organizationId: string;
  venueId: string;
  organizationName: string;
  venueName: string;
};

export type TvmEntitlement = {
  id: string;
  organizationId: string;
  moduleCode: TvmModuleCode;
  status: TvmLicenseStatus;
  externalLicenseId: string | null;
  externalCustomerName: string | null;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  lastSyncError: string | null;
};

type TvmPlatformValue = {
  enabled: boolean;
  loading: boolean;
  user: User | null;
  workspace: TvmWorkspace | null;
  entitlements: TvmEntitlement[];
  error: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  syncEntitlements: () => Promise<void>;
  activateModule: (moduleCode: TvmModuleCode, licenseKey: string) => Promise<void>;
  isLicensed: (moduleCode: TvmModuleCode) => boolean;
  getEntitlement: (moduleCode: TvmModuleCode) => TvmEntitlement | null;
  devMode: boolean;
  hasDevOverride: (moduleCode: TvmModuleCode) => boolean;
  setDevOverride: (moduleCode: TvmModuleCode, enabled: boolean) => void;
};

const TvmPlatformContext = createContext<TvmPlatformValue | null>(null);
const DEV_OVERRIDE_KEY = 'tvm_dev_module_overrides';

function isLocalDevHost() {
  if (!import.meta.env.DEV) return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function readDevOverrides(): TvmModuleCode[] {
  if (!isLocalDevHost()) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(DEV_OVERRIDE_KEY) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function normalizeWorkspace(data: unknown): TvmWorkspace {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') throw new Error('TVM workspace could not be loaded.');

  const value = row as Record<string, unknown>;

  return {
    organizationId: String(value.organizationId ?? value.organization_id),
    venueId: String(value.venueId ?? value.venue_id),
    organizationName: String(value.organizationName ?? value.organization_name ?? 'TVM Organization'),
    venueName: String(value.venueName ?? value.venue_name ?? 'Main Venue'),
  };
}

export function TvmPlatformProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<TvmWorkspace | null>(null);
  const [entitlements, setEntitlements] = useState<TvmEntitlement[]>([]);
  const [error, setError] = useState('');
  const [devOverrides, setDevOverrides] = useState<TvmModuleCode[]>(readDevOverrides);
  const devMode = isLocalDevHost();

  const loadEntitlements = useCallback(async (organizationId: string) => {
    if (!supabase) return;

    const { data, error: entitlementError } = await supabase
      .from('tvm_entitlements')
      .select('id, organization_id, module_code, status, external_license_id, external_customer_name, expires_at, last_verified_at, last_sync_error')
      .eq('organization_id', organizationId)
      .order('module_code');

    if (entitlementError) throw new Error(entitlementError.message);

    setEntitlements((data ?? []).map((row) => ({
      id: String(row.id),
      organizationId: String(row.organization_id),
      moduleCode: String(row.module_code) as TvmModuleCode,
      status: String(row.status) as TvmLicenseStatus,
      externalLicenseId: row.external_license_id ? String(row.external_license_id) : null,
      externalCustomerName: row.external_customer_name ? String(row.external_customer_name) : null,
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      lastVerifiedAt: row.last_verified_at ? String(row.last_verified_at) : null,
      lastSyncError: row.last_sync_error ? String(row.last_sync_error) : null,
    })));
  }, []);

  const refresh = useCallback(async () => {
    if (!SUPABASE_ENABLED || !supabase) {
      setLoading(false);
      setError('Supabase is not configured for TVM.');
      return;
    }

    try {
      setError('');

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);

      setUser(userData.user);

      if (!userData.user) {
        setWorkspace(null);
        setEntitlements([]);
        return;
      }

      const { data: workspaceData, error: workspaceError } = await supabase.rpc(
        'tvm_bootstrap_my_workspace',
        {
          p_organization_name: 'TVM Organization',
          p_venue_name: 'Main Venue',
        },
      );

      if (workspaceError) throw new Error(workspaceError.message);

      const nextWorkspace = normalizeWorkspace(workspaceData);
      setWorkspace(nextWorkspace);
      await loadEntitlements(nextWorkspace.organizationId);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'TVM platform could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [loadEntitlements]);

  useEffect(() => {
    void refresh();

    if (!supabase) return undefined;

    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => data.subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    const client = supabase;

    if (!client || !user || !workspace) return undefined;

    let cancelled = false;

    const sync = async () => {
      const { data, error: invokeError } = await client.functions.invoke(
        'module-entitlement',
        {
          body: {
            action: 'sync',
            organizationId: workspace.organizationId,
          },
        },
      );

      if (!cancelled && !invokeError && !data?.error) {
        await loadEntitlements(workspace.organizationId);
      }
    };

    void sync();

    const interval = window.setInterval(() => {
      void sync();
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadEntitlements, user?.id, workspace?.organizationId]);

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw new Error(authError.message);

    await refresh();
  }

  async function signUp(email: string, password: string) {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw new Error(authError.message);

    if (data.session) await refresh();

    return data.session
      ? 'Account created and signed in.'
      : 'Account created. Check your email if confirmation is enabled.';
  }

  async function signOut() {
    if (!supabase) return;

    const { error: authError } = await supabase.auth.signOut();

    if (authError && authError.message !== 'Auth session missing!') {
      throw new Error(authError.message);
    }

    setUser(null);
    setWorkspace(null);
    setEntitlements([]);
  }

  async function invokeEntitlement(body: Record<string, unknown>) {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data, error: invokeError } = await supabase.functions.invoke(
      'module-entitlement',
      { body },
    );

    if (invokeError) throw new Error(invokeError.message);
    if (data?.error) throw new Error(String(data.error));

    return data;
  }

  async function activateModule(
    moduleCode: TvmModuleCode,
    licenseKey: string,
  ) {
    if (!workspace) throw new Error('Sign in to a TVM organization first.');

    await invokeEntitlement({
      action: 'activate',
      organizationId: workspace.organizationId,
      moduleCode,
      licenseKey,
    });

    await loadEntitlements(workspace.organizationId);
  }

  async function syncEntitlements() {
    if (!workspace) return;

    await invokeEntitlement({
      action: 'sync',
      organizationId: workspace.organizationId,
    });

    await loadEntitlements(workspace.organizationId);
  }

  const entitlementMap = useMemo(
    () => new Map(
      entitlements.map((entitlement) => [
        entitlement.moduleCode,
        entitlement,
      ]),
    ),
    [entitlements],
  );

  function hasDevOverride(moduleCode: TvmModuleCode) {
    return devMode && devOverrides.includes(moduleCode);
  }

  function setDevOverride(
    moduleCode: TvmModuleCode,
    enabled: boolean,
  ) {
    if (!devMode) return;

    setDevOverrides((current) => {
      const next = enabled
        ? Array.from(new Set([...current, moduleCode]))
        : current.filter((code) => code !== moduleCode);

      window.localStorage.setItem(
        DEV_OVERRIDE_KEY,
        JSON.stringify(next),
      );

      return next;
    });
  }

  function getEntitlement(moduleCode: TvmModuleCode) {
    return entitlementMap.get(moduleCode) ?? null;
  }

  function isLicensed(moduleCode: TvmModuleCode) {
    if (hasDevOverride(moduleCode)) return true;

    const entitlement = getEntitlement(moduleCode);

    if (!entitlement) return false;
    if (entitlement.status !== 'active') return false;

    if (
      entitlement.expiresAt
      && new Date(entitlement.expiresAt).getTime() <= Date.now()
    ) {
      return false;
    }

    return true;
  }

  const value: TvmPlatformValue = {
    enabled: SUPABASE_ENABLED,
    loading,
    user,
    workspace,
    entitlements,
    error,
    signIn,
    signUp,
    signOut,
    refresh,
    syncEntitlements,
    activateModule,
    isLicensed,
    getEntitlement,
    devMode,
    hasDevOverride,
    setDevOverride,
  };

  return (
    <TvmPlatformContext.Provider value={value}>
      {children}
    </TvmPlatformContext.Provider>
  );
}

export function useTvmPlatform() {
  const context = useContext(TvmPlatformContext);

  if (!context) {
    throw new Error(
      'useTvmPlatform must be used inside TvmPlatformProvider.',
    );
  }

  return context;
}
