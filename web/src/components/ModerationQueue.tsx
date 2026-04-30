import { useState, useEffect, useCallback } from 'react';
import { API_BASE, JWT_KEY } from '../context/AuthContext';

interface Layer1Result {
  hard_block?: boolean;
  soft_flag?: boolean;
  review_flag?: boolean;
  scores?: Record<string, number>;
  error?: string;
}

interface Layer2Result {
  decision?: string;
  category?: string;
  confidence?: number;
  reasoning?: string;
  crisis_indicators?: boolean;
  malformed?: boolean;
}

interface ImageResult {
  action?: string;
  scores?: Record<string, string>;
  reasoning?: string;
}

interface QueueItem {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  content: string | null;
  context_type: string;
  content_id: string | null;
  final_action: string;
  layer1_result: Layer1Result | null;
  layer2_result: Layer2Result | null;
  image_url: string | null;
  image_result: ImageResult | null;
  status: string;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function ContextBadge({ type }: { type: string }) {
  if (type === 'post') {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-nave-accent/15 text-nave-accent">
        Post
      </span>
    );
  }
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-400">
      Group Message
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  if (action === 'block') {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-500/15 text-red-400">
        auto-blocked
      </span>
    );
  }
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-400">
      {action}
    </span>
  );
}

function AIAnalysis({ item }: { item: QueueItem }) {
  const [open, setOpen] = useState(false);
  const { layer1_result: l1, layer2_result: l2, image_result: img } = item;

  if (!l1 && !l2 && !img) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/55 transition-colors"
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        AI Analysis
      </button>

      {open && (
        <div className="mt-2 space-y-3 text-xs">
          {l1 && (
            <div className="border border-white/8 rounded-lg p-3 space-y-1">
              <p className="text-white/40 font-medium uppercase tracking-wide text-[10px] mb-2">Layer 1 — OpenAI</p>
              {l1.error ? (
                <p className="text-red-400/70">{l1.error}</p>
              ) : (
                <>
                  <div className="flex gap-3 flex-wrap">
                    {l1.hard_block && <span className="text-red-400">hard block</span>}
                    {l1.soft_flag && <span className="text-amber-400">soft flag</span>}
                    {l1.review_flag && <span className="text-amber-400">review flag</span>}
                  </div>
                  {l1.scores && Object.keys(l1.scores).length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {Object.entries(l1.scores)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([cat, score]) => (
                          <div key={cat} className="flex items-center gap-2">
                            <span className="text-white/40 w-32 truncate">{cat}</span>
                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500/60 rounded-full"
                                style={{ width: `${Math.min(score * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-white/35 w-10 text-right">{(score * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {l2 && (
            <div className="border border-white/8 rounded-lg p-3 space-y-1.5">
              <p className="text-white/40 font-medium uppercase tracking-wide text-[10px] mb-2">Layer 2 — Claude</p>
              <div className="flex gap-3 flex-wrap">
                {l2.decision && (
                  <span className={`font-medium ${l2.decision === 'allow' ? 'text-emerald-400' : l2.decision === 'reject' ? 'text-red-400' : 'text-amber-400'}`}>
                    {l2.decision}
                  </span>
                )}
                {l2.category && <span className="text-white/50">{l2.category}</span>}
                {l2.confidence !== undefined && (
                  <span className="text-white/35">{Math.round(l2.confidence * 100)}% confidence</span>
                )}
                {l2.crisis_indicators && <span className="text-red-400">crisis indicators</span>}
              </div>
              {l2.reasoning && (
                <p className="text-white/45 leading-relaxed mt-1">{l2.reasoning}</p>
              )}
            </div>
          )}

          {img && (
            <div className="border border-white/8 rounded-lg p-3 space-y-1.5">
              <p className="text-white/40 font-medium uppercase tracking-wide text-[10px] mb-2">Image — SafeSearch</p>
              {img.action && (
                <span className={`font-medium ${img.action === 'block' ? 'text-red-400' : 'text-amber-400'}`}>
                  {img.action}
                </span>
              )}
              {img.reasoning && <p className="text-white/45 mt-1">{img.reasoning}</p>}
              {img.scores && (
                <div className="mt-1.5 space-y-1">
                  {Object.entries(img.scores).map(([cat, val]) => (
                    <div key={cat} className="flex gap-2">
                      <span className="text-white/40 w-20">{cat}</span>
                      <span className="text-white/55">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QueueCard({
  item,
  onDecide,
  deciding,
  decided,
}: {
  item: QueueItem;
  onDecide: (id: string, decision: 'approved' | 'rejected') => void;
  deciding: 'approving' | 'rejecting' | undefined;
  decided: 'approved' | 'rejected' | undefined;
}) {
  return (
    <div className="border border-white/10 rounded-xl p-5 bg-white/5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <ContextBadge type={item.context_type} />
          <ActionBadge action={item.final_action} />
        </div>
        <span className="text-white/30 text-xs shrink-0">{formatDate(item.created_at)}</span>
      </div>

      {/* User */}
      <div>
        <span className="text-white/80 text-sm font-medium">{item.display_name}</span>
        <span className="text-white/35 text-xs ml-2">@{item.username}</span>
      </div>

      {/* Content text */}
      {item.content && (
        <blockquote className="border-l-2 border-white/15 pl-3 text-white/65 text-sm leading-relaxed">
          {item.content}
        </blockquote>
      )}

      {/* Image flag */}
      {item.image_url && (
        <div className="flex items-start gap-2">
          <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/15 text-purple-400 shrink-0">
            Image flagged
          </span>
          <span className="text-white/30 text-xs break-all">{item.image_url}</span>
        </div>
      )}

      {/* AI Analysis */}
      <AIAnalysis item={item} />

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        {decided ? (
          <span className={`text-sm font-medium ${decided === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
            {decided === 'approved' ? '✓ Approved' : '✗ Rejected'}
          </span>
        ) : (
          <>
            <button
              onClick={() => onDecide(item.id, 'approved')}
              disabled={!!deciding}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-500/50 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deciding === 'approving' ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : null}
              Approve
            </button>
            <button
              onClick={() => onDecide(item.id, 'rejected')}
              disabled={!!deciding}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deciding === 'rejecting' ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : null}
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type FinalActionFilter = 'pending' | 'blocked' | 'all';

const FILTER_LABELS: Record<FinalActionFilter, string> = {
  pending: 'Needs Review',
  blocked: 'Blocked',
  all: 'All',
};

function filterItems(items: QueueItem[], filter: FinalActionFilter): QueueItem[] {
  if (filter === 'pending') return items.filter(i => i.final_action !== 'block');
  if (filter === 'blocked') return items.filter(i => i.final_action === 'block');
  return items;
}

export function ModerationQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<Record<string, 'approving' | 'rejecting'>>({});
  const [decided, setDecided] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [filter, setFilter] = useState<FinalActionFilter>('pending');

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem(JWT_KEY);
      const res = await fetch(`${API_BASE}/admin/moderation/queue?limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 403) {
        setError('access_denied');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleDecide = async (id: string, decision: 'approved' | 'rejected') => {
    setDeciding(prev => ({ ...prev, [id]: decision === 'approved' ? 'approving' : 'rejecting' }));
    try {
      const token = localStorage.getItem(JWT_KEY);
      const res = await fetch(`${API_BASE}/admin/moderation/queue/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDecided(prev => ({ ...prev, [id]: decision }));
      setTimeout(() => {
        setItems(prev => prev.filter(item => item.id !== id));
        setDecided(prev => { const next = { ...prev }; delete next[id]; return next; });
      }, 1500);
    } catch {
      // leave item in place so admin can retry
    } finally {
      setDeciding(prev => { const next = { ...prev }; delete next[id]; return next; });
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

  const visibleItems = filterItems(items, filter);
  const blockedCount = items.filter(i => i.final_action === 'block').length;
  const pendingCount = items.filter(i => i.final_action !== 'block').length;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-white font-medium text-lg">Moderation Queue</h2>
          {!loading && !error && (
            <p className="text-white/35 text-sm mt-0.5">
              {visibleItems.length === 0
                ? 'No items'
                : `${visibleItems.length} item${visibleItems.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Final action filter */}
          {!loading && !error && (
            <div className="flex items-center gap-1 p-1 rounded-lg border border-white/10 bg-white/5">
              {(Object.keys(FILTER_LABELS) as FinalActionFilter[]).map(f => {
                const count = f === 'pending' ? pendingCount : f === 'blocked' ? blockedCount : items.length;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      filter === f
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {FILTER_LABELS[f]}
                    {count > 0 && (
                      <span className={`ml-1.5 ${filter === f ? 'text-white/50' : 'text-white/25'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-white/50 text-sm hover:text-white/70 hover:border-white/25 transition-colors disabled:opacity-40"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={loading ? 'animate-spin' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-white/35 text-sm py-8 justify-center">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Loading queue…
        </div>
      )}

      {/* Error (non-403) */}
      {!loading && error && error !== 'access_denied' && (
        <div className="border border-white/10 rounded-xl p-5 text-center">
          <p className="text-white/45 text-sm">Failed to load queue. <button onClick={fetchQueue} className="text-nave-accent hover:text-nave-accent-light underline">Try again</button></p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && visibleItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-nave-accent/20 font-serif select-none mb-4" style={{ fontSize: '4rem', lineHeight: 1 }} aria-hidden>✝</div>
          <p className="text-white/40 text-sm">
            {filter === 'blocked' ? 'No blocked items.' : filter === 'pending' ? 'Queue is clear.' : 'No items in the queue.'}
          </p>
        </div>
      )}

      {/* Queue items */}
      {!loading && !error && visibleItems.length > 0 && (
        <div className="space-y-4">
          {visibleItems.map(item => (
            <QueueCard
              key={item.id}
              item={item}
              onDecide={handleDecide}
              deciding={deciding[item.id]}
              decided={decided[item.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
