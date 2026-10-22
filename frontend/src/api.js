const API = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'token';

// The login token is shared by all tabs via localStorage, but each tab only
// ever sends the token it started with. Otherwise a tab still showing user A
// would act as user B right after B logged in in another tab.
let sessionToken = null;

const readStored = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const getSessionToken = () => sessionToken;

// Picks up an existing login (page load). Returns the token or null.
export function resumeSession() {
  sessionToken = readStored();
  return sessionToken;
}

// Login (token) or logout (null) - for this tab and, via localStorage, the others.
export function setSession(token) {
  sessionToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage blocked - this tab still works */ }
}

// Another tab logged in/out: reload so this tab shows who is really logged in.
export function watchSessionChanges() {
  const onStorage = e => {
    if ((e.key === TOKEN_KEY || e.key === null) && readStored() !== sessionToken) window.location.reload();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

export const SERVER_UNREACHABLE = 'Server nicht erreichbar – bitte später erneut versuchen.';

// Network failure or a non-JSON reply (e.g. the proxy's 502 page while the
// backend is down) becomes one plain message - no technical details for users.
export class ServerUnreachableError extends Error {
  constructor() { super(SERVER_UNREACHABLE); }
}

export async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
      }
    });
  } catch {
    throw new ServerUnreachableError();
  }
  if (res.status === 204) return null;
  let data;
  try {
    data = await res.json();
  } catch {
    throw new ServerUnreachableError();
  }
  if (!res.ok) throw Error(data?.error || 'Anfrage fehlgeschlagen');
  return data;
}
