import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  action: 'activate' | 'sync';
  organizationId: string;
  moduleCode?: string;
  licenseKey?: string;
};

type LicensingReply = {
  ok: boolean;
  status: string;
  licenseId: string;
  licenseGuid: string;
  productId: string;
  productName: string;
  moduleKey: string;
  customerId: string;
  customerCode: string | null;
  customerName: string;
  expiresAt: string | null;
  error?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const licensingBridgeUrl = Deno.env.get('LICENSING_BRIDGE_URL');
  const bridgeSecret = Deno.env.get('TVM_LICENSE_BRIDGE_SECRET');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !licensingBridgeUrl || !bridgeSecret) {
    return json({ error: 'TVM licensing bridge environment is incomplete.' }, 500);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Authentication required.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'Invalid TVM session.' }, 401);

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const organizationId = body.organizationId?.trim();
  if (!organizationId) return json({ error: 'organizationId is required.' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: membership, error: membershipError } = await admin
    .from('tvm_memberships')
    .select('id, role, active')
    .eq('organization_id', organizationId)
    .eq('user_id', userData.user.id)
    .eq('active', true)
    .maybeSingle();

  if (membershipError) return json({ error: membershipError.message }, 500);
  if (!membership) return json({ error: 'You do not have access to this TVM organization.' }, 403);
  if (body.action === 'activate' && !['owner', 'admin'].includes(String(membership.role))) {
    return json({ error: 'Only organization owners or admins can activate TVM module licenses.' }, 403);
  }

  async function callLicensing(payload: Record<string, unknown>) {
    const response = await fetch(licensingBridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tvm-bridge-secret': bridgeSecret,
      },
      body: JSON.stringify(payload),
    });
    const reply = await response.json() as LicensingReply;
    return { response, reply };
  }

  async function cacheReply(moduleCode: string, reply: LicensingReply, syncError: string | null = null) {
    const status = ['active', 'suspended', 'expired', 'revoked'].includes(reply.status)
      ? reply.status
      : 'inactive';

    const { error } = await admin.from('tvm_entitlements').upsert({
      organization_id: organizationId,
      module_code: moduleCode,
      status,
      external_license_id: reply.licenseGuid ?? null,
      external_product_id: reply.productId ?? null,
      external_customer_id: reply.customerId ?? null,
      external_customer_code: reply.customerCode ?? null,
      external_customer_name: reply.customerName ?? null,
      license_source: 'licensing.onetimelabs.net',
      expires_at: reply.expiresAt ?? null,
      last_verified_at: new Date().toISOString(),
      last_sync_error: syncError,
      metadata: {
        product_name: reply.productName ?? null,
        licensing_license_id: reply.licenseId ?? null,
      },
    }, { onConflict: 'organization_id,module_code' });

    if (error) throw new Error(error.message);
  }

  if (body.action === 'activate') {
    const moduleCode = body.moduleCode?.trim().toLowerCase();
    const licenseKey = body.licenseKey?.trim();
    if (!moduleCode || !licenseKey) return json({ error: 'moduleCode and licenseKey are required.' }, 400);

    const { response, reply } = await callLicensing({
      action: 'activate',
      moduleKey: moduleCode,
      installationId: organizationId,
      licenseKey,
    });

    if (!response.ok) return json({ error: reply.error ?? 'License activation failed.', status: reply.status }, response.status);
    await cacheReply(moduleCode, reply);
    return json({ entitlement: reply });
  }

  const { data: rows, error: rowsError } = await admin
    .from('tvm_entitlements')
    .select('module_code, external_license_id')
    .eq('organization_id', organizationId)
    .not('external_license_id', 'is', null);
  if (rowsError) return json({ error: rowsError.message }, 500);

  const results: Array<{ moduleCode: string; status: string; error?: string }> = [];
  for (const row of rows ?? []) {
    const moduleCode = String(row.module_code);
    const { response, reply } = await callLicensing({
      action: 'status',
      moduleKey: moduleCode,
      installationId: organizationId,
      licenseGuid: String(row.external_license_id),
    });

    if (response.ok) {
      await cacheReply(moduleCode, reply);
      results.push({ moduleCode, status: reply.status });
    } else {
      const error = reply.error ?? 'License verification failed.';
      await admin.from('tvm_entitlements').update({
        status: reply.status && ['suspended', 'expired', 'revoked'].includes(reply.status) ? reply.status : 'inactive',
        last_verified_at: new Date().toISOString(),
        last_sync_error: error,
      }).eq('organization_id', organizationId).eq('module_code', moduleCode);
      results.push({ moduleCode, status: reply.status ?? 'inactive', error });
    }
  }

  return json({ results });
});
