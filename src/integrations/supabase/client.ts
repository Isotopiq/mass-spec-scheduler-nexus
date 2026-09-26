// Standalone API wrapper that replaces the generated Supabase client.
// It points at the backend bundled with this application.

const API_URL = import.meta.env.VITE_API_URL || '';
export const SUPABASE_FUNCTIONS_URL = `${API_URL}/api/functions`;

const AUTH_TOKEN_KEY = 'standalone_auth_token';
const AUTH_USER_KEY = 'standalone_auth_user';
const AUTH_EXPIRES_KEY = 'standalone_auth_expires_at';

let expiryTimer: ReturnType<typeof setTimeout> | null = null;

export function getSessionExpiresAt(): number | null {
  const raw = localStorage.getItem(AUTH_EXPIRES_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

function scheduleExpiry() {
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = null;
  const expiresAt = getSessionExpiresAt();
  if (!expiresAt || !getToken()) return;
  const delay = expiresAt - Date.now();
  if (delay <= 0) {
    clearAuth('SESSION_EXPIRED');
    return;
  }
  // setTimeout overflows above ~24.8 days; re-check periodically instead
  expiryTimer = setTimeout(scheduleExpiry, Math.min(delay, 12 * 60 * 60 * 1000));
}

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuth(token: string, user: any, expiresAt?: number) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  if (expiresAt) localStorage.setItem(AUTH_EXPIRES_KEY, String(expiresAt));
  else localStorage.removeItem(AUTH_EXPIRES_KEY);
  scheduleExpiry();
  notifyAuthChange('SIGNED_IN', { user, access_token: token, expires_at: expiresAt } as any);
}

function clearAuth(event: 'SIGNED_OUT' | 'SESSION_EXPIRED' = 'SIGNED_OUT') {
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = null;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_EXPIRES_KEY);
  notifyAuthChange(event, null);
}

function getStoredUser(): any {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function handleUnauthorized(res: Response) {
  if (res.status === 401 && getToken()) {
    clearAuth('SESSION_EXPIRED');
  }
}

function setAuthFromSession(session: any) {
  if (!session?.access_token) return;
  setAuth(session.access_token, session.user, session.expires_at ? Number(session.expires_at) : undefined);
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiPost(path: string, body?: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!path.startsWith('/api/auth/signin')) handleUnauthorized(res);
  const json = await res.json().catch(() => ({}));
  if (!res.ok && !json.error) {
    return { data: null, error: { message: res.statusText } };
  }
  return json;
}

const authCallbacks = new Set<(event: string, session: any) => void>();

function notifyAuthChange(event: string, session: any) {
  authCallbacks.forEach((cb) => {
    try { cb(event, session); } catch (e) { /* ignore */ }
  });
}

const auth = {
  async getSession() {
    const token = getToken();
    if (!token) return { data: { session: null }, error: null };
    return { data: { session: { access_token: token, user: getStoredUser() || {}, expires_at: getSessionExpiresAt() } }, error: null };
  },

  async getUser() {
    const user = getStoredUser();
    if (!user) return { data: { user: null }, error: null };
    // Refresh against server to keep profile fields up to date.
    try {
      const res = await fetch(`${API_URL}/api/auth/user`, { headers: getHeaders() });
      if (res.status === 401) {
        clearAuth('SESSION_EXPIRED');
        return { data: { user: null }, error: null };
      }
      const json = await res.json();
      if (json.data?.user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(json.data.user));
        return { data: { user: json.data.user }, error: null };
      }
    } catch {
      // fall through to cached user
    }
    return { data: { user }, error: null };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    authCallbacks.add(callback);
    return { data: { subscription: { unsubscribe: () => authCallbacks.delete(callback) } } };
  },

  async signInWithPassword({ email, password, rememberMe }: { email: string; password: string; rememberMe?: boolean }) {
    const json = await apiPost('/api/auth/signin', { email, password, rememberMe });
    if (json.error) return { data: null, error: json.error };
    if (json.data?.needs2FA) {
      return {
        data: {
          user: json.data.user,
          needs2FA: true,
          tempToken: json.data.tempToken,
          rememberMe: json.data.rememberMe,
        },
        error: null,
      };
    }
    setAuthFromSession(json.data?.session);
    return { data: { session: json.data?.session, user: json.data?.user }, error: null };
  },

  async verify2FA({ email, tempToken, code, rememberMe }: { email: string; tempToken: string; code: string; rememberMe?: boolean }) {
    const json = await apiPost('/api/auth/2fa/verify', { email, tempToken, code, rememberMe });
    if (json.error) return { data: null, error: json.error };
    setAuthFromSession(json.data?.session);
    return { data: { session: json.data?.session, user: json.data?.user }, error: null };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { name?: string; department?: string } } }) {
    const json = await apiPost('/api/auth/signup', {
      email,
      password,
      name: options?.data?.name || email,
      department: options?.data?.department,
    });
    if (json.error) return { data: { user: null, session: null }, error: json.error };
    setAuthFromSession(json.data?.session);
    return { data: { user: json.data?.user, session: json.data?.session }, error: null };
  },

  async signOut() {
    clearAuth();
    return { error: null };
  },

  async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
    const json = await apiPost('/api/auth/reset-password', { email, redirectTo: options?.redirectTo });
    return { data: json.data, error: json.error };
  },

  async updatePassword({ password }: { password: string }) {
    const json = await apiPost('/api/auth/update-password', { password });
    return { data: json.data, error: json.error };
  },

  async updateUser(attrs: any) {
    // Not used directly, updates go through profiles table.
    return { data: { user: getStoredUser() }, error: null };
  }
};

class QueryBuilder {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private columns: any = '*';
  private values: any = null;
  private filters: any[] = [];
  private orderClause: { column: string; ascending: boolean } | null = null;
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private singleValue: boolean | 'maybe' | null = null;
  private countValue: 'exact' | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: any = '*') {
    if (this.action === 'insert' || this.action === 'update') {
      this.columns = columns;
    } else {
      this.action = 'select';
      this.columns = columns;
    }
    return this;
  }

  insert(values: any) {
    this.action = 'insert';
    this.values = values;
    return this;
  }

  update(values: any) {
    this.action = 'update';
    this.values = values;
    return this;
  }

  delete(options?: { count?: 'exact' }) {
    this.action = 'delete';
    if (options?.count) this.countValue = options.count;
    return this;
  }

  eq(column: string, value: any) { this.filters.push({ op: 'eq', column, value }); return this; }
  neq(column: string, value: any) { this.filters.push({ op: 'neq', column, value }); return this; }
  gt(column: string, value: any) { this.filters.push({ op: 'gt', column, value }); return this; }
  gte(column: string, value: any) { this.filters.push({ op: 'gte', column, value }); return this; }
  lt(column: string, value: any) { this.filters.push({ op: 'lt', column, value }); return this; }
  lte(column: string, value: any) { this.filters.push({ op: 'lte', column, value }); return this; }
  is(column: string, value: null) { this.filters.push({ op: 'is', column, value }); return this; }
  in(column: string, values: any[]) { this.filters.push({ op: 'in', column, value: values }); return this; }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderClause = { column, ascending: opts?.ascending !== false };
    return this;
  }

  limit(n: number) { this.limitValue = n; return this; }
  offset(n: number) { this.offsetValue = n; return this; }
  range(from: number, to: number) { this.offsetValue = from; this.limitValue = to - from + 1; return this; }
  single() { this.singleValue = true; return this; }
  maybeSingle() { this.singleValue = 'maybe'; return this; }
  csv() { return this; }

  private async execute() {
    const body = {
      table: this.table,
      action: this.action,
      columns: this.columns,
      values: this.values,
      filters: this.filters,
      order: this.orderClause,
      limit: this.limitValue,
      offset: this.offsetValue,
      single: this.singleValue,
      count: this.countValue,
    };
    const res = await fetch(`${API_URL}/api/rest/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    handleUnauthorized(res);
    const json = await res.json().catch(() => ({ data: null, error: { message: res.statusText }, count: null }));
    if (!res.ok && !json.error) {
      return { data: null, error: { message: res.statusText, status: res.status }, count: null };
    }
    if (json.error && !res.ok) json.error.status = res.status;
    return json;
  }

  then(onfulfilled?: any, onrejected?: any) {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch(onrejected: any) {
    return this.execute().catch(onrejected);
  }
}

const functionsClient = {
  async invoke(name: string, { body }: { body?: any } = {}) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/${name}`, {
      method: 'POST',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok && !json.error) {
      return { data: null, error: { message: res.statusText } };
    }
    return json;
  }
};

const storageClient = {
  from(bucket: string) {
    return {
      async upload(path: string, file: File, options?: { upsert?: boolean }) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        formData.append('path', path);
        if (options?.upsert) formData.append('upsert', 'true');
        const res = await fetch(`${API_URL}/api/storage/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken() || ''}` },
          body: formData,
        });
        const json = await res.json().catch(() => ({}));
        return json;
      },
      getPublicUrl(path: string) {
        return { data: { publicUrl: `/uploads/${bucket}/${path}` } };
      }
    };
  }
};

if (typeof window !== 'undefined') scheduleExpiry();

export const supabase = {
  auth,
  from: (table: string) => new QueryBuilder(table),
  functions: functionsClient,
  storage: storageClient,
};
