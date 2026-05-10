import { useState, useEffect, useCallback } from 'react';
import { API_BASE, JWT_KEY } from '../context/AuthContext';

interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  parish_id: string | null;
  parish_name: string | null;
  is_app_admin: boolean;
  created_at: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(JWT_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function DeleteConfirm({
  user,
  onConfirm,
  onCancel,
  deleting,
}: {
  user: AdminUser;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="border border-red-500/20 rounded-xl p-5 bg-red-500/5 max-w-md">
      <p className="text-red-400/90 text-sm font-medium mb-1">
        Delete "{user.display_name}" (@{user.username})?
      </p>
      <p className="text-white/40 text-xs mb-4">
        This permanently deletes the user account. Posts, messages, friendships, and reactions
        will be removed. Groups they admin will be reassigned to the next-oldest member, or
        deleted if no members remain.
        {user.is_app_admin && (
          <span className="block mt-2 text-amber-400/80">
            Warning: this user is an app admin.
          </span>
        )}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-white/15 text-white/60 text-xs hover:text-white/80 hover:border-white/25 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium transition-colors disabled:opacity-40"
        >
          {deleting ? 'Deleting...' : 'Yes, Delete'}
        </button>
      </div>
    </div>
  );
}

export function ManageUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async (q = '') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (q) params.set('q', q);
      const res = await fetch(`${API_BASE}/admin/users?${params}`, { headers: authHeaders() });
      if (res.status === 403) { setError('access_denied'); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!loading && error === 'access_denied') {
    return (
      <div className="border border-red-500/20 rounded-xl p-6 bg-red-500/5 flex items-center gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <p className="text-red-400 font-medium text-sm">Access Denied</p>
          <p className="text-white/35 text-xs mt-0.5">Your account does not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-white font-medium text-lg">Users</h2>
          {!loading && !error && (
            <p className="text-white/35 text-sm mt-0.5">
              {users.length} user{users.length !== 1 ? 's' : ''}
              {search ? ' matching search' : ' (most recent first)'}
            </p>
          )}
        </div>
      </div>

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or username..."
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
        />
      </div>

      {deleteTarget && (
        <div className="mb-5">
          <DeleteConfirm
            user={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-white/35 text-sm py-8 justify-center">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Loading users...
        </div>
      )}

      {!loading && error && error !== 'access_denied' && (
        <div className="border border-white/10 rounded-xl p-5 text-center">
          <p className="text-white/45 text-sm">
            Failed to load users.{' '}
            <button onClick={() => fetchUsers(search)} className="text-nave-accent hover:text-nave-accent-light underline">
              Try again
            </button>
          </p>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-white/40 text-sm">{search ? 'No users match your search.' : 'No users found.'}</p>
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="border border-white/10 rounded-xl p-4 bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 text-xs font-medium shrink-0">
                      {u.display_name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-medium text-sm truncate">{u.display_name}</h3>
                      <span className="text-white/35 text-xs">@{u.username}</span>
                      {u.is_app_admin && (
                        <span className="text-amber-400/80 text-[10px] uppercase tracking-wide border border-amber-400/30 rounded px-1.5 py-0.5">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">
                      {u.parish_name ?? 'No parish'}
                      <span className="text-white/25"> · joined {new Date(u.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setDeleteTarget(u)}
                    title="Delete user"
                    className="p-1.5 rounded-md text-white/30 hover:text-red-400/70 hover:bg-white/5 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
