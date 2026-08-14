// Standalone API wrapper that replaces the generated Supabase client.
// It points at the backend bundled with this application.

const API_URL = import.meta.env.VITE_API_URL || '';
export const SUPABASE_FUNCTIONS_URL = `${API_URL}/api/functions`;

const AUTH_TOKEN_KEY = 'standalone_auth_token';
const AUTH_USER_KEY = 'standalone_auth_user';

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuth(token: string, user: any) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  notifyAuthChange('SIGNED_IN', { user, access_token: token } as any);
}

function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  notifyAuthChange('SIGNED_OUT', null);
}

function getStoredUser(): any {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
    return { data: { session: { access_token: token, user: getStoredUser() || {} } }, error: null };
  },

  async getUser() {
    const user = getStoredUser();
    if (!user) return { data: { user: null }, error: null };
    // Refresh against server to keep profile fields up to date.
    try {
      const res = await fetch(`${API_URL}/api/auth/user`, { headers: getHeaders() });
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
    if (json.data?.session) setAuth(json.data.session.access_token, json.data.session.user);
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
    if (json.data?.session) setAuth(json.data.session.access_token, json.data.session.user);
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
      single: this.singleValue,
      count: this.countValue,
    };
    const res = await fetch(`${API_URL}/api/rest/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({ data: null, error: { message: res.statusText }, count: null }));
    if (!res.ok && !json.error) {
      return { data: null, error: { message: res.statusText }, count: null };
    }
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

export const supabase = {
  auth,
  from: (table: string) => new QueryBuilder(table),
  functions: functionsClient,
  storage: storageClient,
};
