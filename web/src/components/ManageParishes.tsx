import { useState, useEffect, useCallback } from 'react';
import { API_BASE, JWT_KEY } from '../context/AuthContext';

interface Parish {
  id: string;
  name: string;
  street_address: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  diocese: string;
  established: number | null;
  website: string | null;
  mass_schedule: string | null;
  member_count: number;
  created_at: string;
}

interface ParishAdmin {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  granted_at: string;
}

type View = 'list' | 'create' | 'edit' | 'admins';

const EMPTY_FORM = {
  name: '',
  city: '',
  state: '',
  diocese: '',
  street_address: '',
  postal_code: '',
  established: '',
  website: '',
  mass_schedule: '',
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(JWT_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...authHeaders() };
}

// ── Parish form ─────────────────────────────────────────────────────────────

function ParishForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
}: {
  initial: typeof EMPTY_FORM;
  onSubmit: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  submitLabel: string;
  submitting: boolean;
}) {
  const [form, setForm] = useState(initial);

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const fields: { key: string; label: string; required?: boolean; placeholder?: string }[] = [
    { key: 'name', label: 'Name', required: true, placeholder: 'St. Joseph' },
    { key: 'street_address', label: 'Street Address', placeholder: '123 Main St' },
    { key: 'city', label: 'City', required: true },
    { key: 'state', label: 'State', required: true, placeholder: 'NY' },
    { key: 'postal_code', label: 'ZIP Code', placeholder: '14201' },
    { key: 'diocese', label: 'Diocese', required: true, placeholder: 'Diocese of Buffalo' },
    { key: 'established', label: 'Year Established', placeholder: '1850' },
    { key: 'website', label: 'Website', placeholder: 'https://...' },
    { key: 'mass_schedule', label: 'Mass Schedule' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-white/50 text-xs font-medium mb-1.5">
            {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          {f.key === 'mass_schedule' ? (
            <textarea
              value={form[f.key as keyof typeof form]}
              onChange={e => set(f.key, e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none"
              placeholder={f.placeholder}
            />
          ) : (
            <input
              type="text"
              value={form[f.key as keyof typeof form]}
              onChange={e => set(f.key, e.target.value)}
              required={f.required}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
              placeholder={f.placeholder}
            />
          )}
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/15 text-white/60 text-sm hover:text-white/80 hover:border-white/25 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-nave-accent/80 hover:bg-nave-accent text-white text-sm font-medium transition-colors disabled:opacity-40"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ── Parish admin panel ──────────────────────────────────────────────────────

function ParishAdminsPanel({
  parish,
  onBack,
}: {
  parish: Parish;
  onBack: () => void;
}) {
  const [admins, setAdmins] = useState<ParishAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; display_name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/parishes/${parish.id}/admins`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [parish.id]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `${API_BASE}/users/search?q=${encodeURIComponent(searchQuery.trim())}&limit=10`,
        { headers: authHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users ?? []);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (userId: string) => {
    setAdding(userId);
    try {
      const res = await fetch(`${API_BASE}/admin/parishes/${parish.id}/admins`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        await fetchAdmins();
        setSearchResults([]);
        setSearchQuery('');
      }
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      const res = await fetch(`${API_BASE}/admin/parishes/${parish.id}/admins/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        setAdmins(prev => prev.filter(a => a.user_id !== userId));
      }
    } finally {
      setRemoving(null);
    }
  };

  const adminUserIds = new Set(admins.map(a => a.user_id));

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-white/40 text-sm hover:text-white/60 transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to parishes
      </button>

      <h2 className="text-white font-medium text-lg mb-1">Parish Admins</h2>
      <p className="text-white/40 text-sm mb-6">{parish.name} &mdash; {parish.city}, {parish.state}</p>

      {/* Add admin search */}
      <div className="mb-6">
        <label className="block text-white/50 text-xs font-medium mb-1.5">Add Admin</label>
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            placeholder="Search users by name or username..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-3 py-2 rounded-lg border border-white/15 text-white/50 text-sm hover:text-white/70 hover:border-white/25 transition-colors disabled:opacity-40"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 border border-white/10 rounded-lg overflow-hidden max-w-md">
            {searchResults.map(u => (
              <div key={u.id} className="flex items-center justify-between px-3 py-2 border-b border-white/5 last:border-b-0">
                <div>
                  <span className="text-white/80 text-sm">{u.display_name}</span>
                  <span className="text-white/35 text-xs ml-2">@{u.username}</span>
                </div>
                {adminUserIds.has(u.id) ? (
                  <span className="text-white/25 text-xs">Already admin</span>
                ) : (
                  <button
                    onClick={() => handleAdd(u.id)}
                    disabled={adding === u.id}
                    className="text-xs text-nave-accent hover:text-nave-accent-light transition-colors disabled:opacity-40"
                  >
                    {adding === u.id ? 'Adding...' : 'Add'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current admins */}
      <h3 className="text-white/50 text-xs font-medium uppercase tracking-wide mb-3">
        Current Admins {!loading && `(${admins.length})`}
      </h3>

      {loading ? (
        <p className="text-white/35 text-sm">Loading...</p>
      ) : admins.length === 0 ? (
        <p className="text-white/35 text-sm">No parish admins assigned.</p>
      ) : (
        <div className="space-y-2 max-w-md">
          {admins.map(a => (
            <div key={a.user_id} className="flex items-center justify-between border border-white/10 rounded-lg px-3 py-2.5 bg-white/5">
              <div>
                <span className="text-white/80 text-sm">{a.display_name}</span>
                <span className="text-white/35 text-xs ml-2">@{a.username}</span>
              </div>
              <button
                onClick={() => handleRemove(a.user_id)}
                disabled={removing === a.user_id}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                {removing === a.user_id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Delete confirmation ─────────────────────────────────────────────────────

function DeleteConfirm({
  parish,
  onConfirm,
  onCancel,
  deleting,
}: {
  parish: Parish;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="border border-red-500/20 rounded-xl p-5 bg-red-500/5 max-w-md">
      <p className="text-red-400/90 text-sm font-medium mb-1">Delete "{parish.name}"?</p>
      <p className="text-white/40 text-xs mb-4">
        This will permanently delete the parish. Members will have their parish unset. Posts and related data will be removed.
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

// ── Main component ──────────────────────────────────────────────────────────

export function ManageParishes() {
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('list');
  const [editParish, setEditParish] = useState<Parish | null>(null);
  const [adminsParish, setAdminsParish] = useState<Parish | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Parish | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchParishes = useCallback(async (q = '') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (q) params.set('q', q);
      const res = await fetch(`${API_BASE}/admin/parishes?${params}`, { headers: authHeaders() });
      if (res.status === 403) { setError('access_denied'); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setParishes(data.parishes ?? []);
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchParishes(); }, [fetchParishes]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchParishes(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchParishes]);

  const handleCreate = async (form: typeof EMPTY_FORM) => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        city: form.city,
        state: form.state,
        diocese: form.diocese,
      };
      if (form.street_address) body.street_address = form.street_address;
      if (form.postal_code) body.postal_code = form.postal_code;
      if (form.established) body.established = parseInt(form.established, 10) || null;
      if (form.website) body.website = form.website;
      if (form.mass_schedule) body.mass_schedule = form.mass_schedule;

      const res = await fetch(`${API_BASE}/admin/parishes`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setView('list');
      fetchParishes(search);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (form: typeof EMPTY_FORM) => {
    if (!editParish) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (form.name) body.name = form.name;
      if (form.city) body.city = form.city;
      if (form.state) body.state = form.state;
      if (form.diocese) body.diocese = form.diocese;
      if (form.street_address !== undefined) body.street_address = form.street_address || null;
      if (form.postal_code !== undefined) body.postal_code = form.postal_code || null;
      if (form.established) body.established = parseInt(form.established, 10) || null;
      if (form.website !== undefined) body.website = form.website || null;
      if (form.mass_schedule !== undefined) body.mass_schedule = form.mass_schedule || null;

      const res = await fetch(`${API_BASE}/admin/parishes/${editParish.id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setView('list');
      setEditParish(null);
      fetchParishes(search);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/parishes/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        setDeleteTarget(null);
        fetchParishes(search);
      }
    } finally {
      setDeleting(false);
    }
  };

  // Access denied
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

  // Create form
  if (view === 'create') {
    return (
      <div>
        <h2 className="text-white font-medium text-lg mb-6">Add Parish</h2>
        <ParishForm
          initial={EMPTY_FORM}
          onSubmit={handleCreate}
          onCancel={() => setView('list')}
          submitLabel="Create Parish"
          submitting={submitting}
        />
      </div>
    );
  }

  // Edit form
  if (view === 'edit' && editParish) {
    return (
      <div>
        <h2 className="text-white font-medium text-lg mb-6">Edit Parish</h2>
        <ParishForm
          initial={{
            name: editParish.name,
            city: editParish.city,
            state: editParish.state,
            diocese: editParish.diocese,
            street_address: editParish.street_address ?? '',
            postal_code: editParish.postal_code ?? '',
            established: editParish.established?.toString() ?? '',
            website: editParish.website ?? '',
            mass_schedule: editParish.mass_schedule ?? '',
          }}
          onSubmit={handleUpdate}
          onCancel={() => { setView('list'); setEditParish(null); }}
          submitLabel="Save Changes"
          submitting={submitting}
        />
      </div>
    );
  }

  // Parish admins panel
  if (view === 'admins' && adminsParish) {
    return (
      <ParishAdminsPanel
        parish={adminsParish}
        onBack={() => { setView('list'); setAdminsParish(null); }}
      />
    );
  }

  // List view
  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-white font-medium text-lg">Parishes</h2>
          {!loading && !error && (
            <p className="text-white/35 text-sm mt-0.5">
              {parishes.length} parish{parishes.length !== 1 ? 'es' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => setView('create')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-nave-accent/80 hover:bg-nave-accent text-white text-sm font-medium transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Parish
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search parishes..."
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
        />
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="mb-5">
          <DeleteConfirm
            parish={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-white/35 text-sm py-8 justify-center">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Loading parishes...
        </div>
      )}

      {/* Error */}
      {!loading && error && error !== 'access_denied' && (
        <div className="border border-white/10 rounded-xl p-5 text-center">
          <p className="text-white/45 text-sm">Failed to load parishes. <button onClick={() => fetchParishes(search)} className="text-nave-accent hover:text-nave-accent-light underline">Try again</button></p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && parishes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-white/40 text-sm">{search ? 'No parishes match your search.' : 'No parishes yet.'}</p>
        </div>
      )}

      {/* Parish list */}
      {!loading && !error && parishes.length > 0 && (
        <div className="space-y-3">
          {parishes.map(p => (
            <div key={p.id} className="border border-white/10 rounded-xl p-4 bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-white font-medium text-sm truncate">{p.name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    {p.city}, {p.state} &mdash; {p.diocese}
                    {p.established ? ` (est. ${p.established})` : ''}
                  </p>
                  <p className="text-white/25 text-xs mt-1">
                    {p.member_count} member{p.member_count !== 1 ? 's' : ''}
                    {p.street_address ? ` · ${p.street_address}` : ''}
                    {p.postal_code ? ` ${p.postal_code}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditParish(p); setView('edit'); }}
                    title="Edit"
                    className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { setAdminsParish(p); setView('admins'); }}
                    title="Manage Admins"
                    className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    title="Delete"
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
