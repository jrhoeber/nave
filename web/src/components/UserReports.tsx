import { useState, useEffect, useCallback } from 'react';
import { API_BASE, JWT_KEY } from '../context/AuthContext';

interface Reporter {
  id: string;
  username: string;
  display_name: string;
}

interface ReportItem {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  notes: string | null;
  status: string;
  created_at: string;
  reporter: Reporter;
  content_snippet: string | null;
  content_exists: boolean;
  report_count: number;
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

const REASON_STYLES: Record<string, string> = {
  harassment: 'bg-red-500/15 text-red-400',
  hate_speech: 'bg-red-500/15 text-red-400',
  spam: 'bg-amber-500/15 text-amber-400',
  inappropriate: 'bg-amber-500/15 text-amber-400',
  misinformation: 'bg-orange-500/15 text-orange-400',
  other: 'bg-white/10 text-white/50',
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  hate_speech: 'Hate Speech',
  inappropriate: 'Inappropriate',
  misinformation: 'Misinformation',
  other: 'Other',
};

function ReasonBadge({ reason }: { reason: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REASON_STYLES[reason] ?? REASON_STYLES.other}`}>
      {REASON_LABELS[reason] ?? reason}
    </span>
  );
}

type DecidingState = 'reviewing' | 'dismissing' | 'removing' | undefined;
type DecidedState = 'reviewed' | 'dismissed' | 'removed' | undefined;

function ReportCard({
  item,
  onDecide,
  deciding,
  decided,
}: {
  item: ReportItem;
  onDecide: (id: string, decision: 'reviewed' | 'dismissed', removeContent?: boolean) => void;
  deciding: DecidingState;
  decided: DecidedState;
}) {
  return (
    <div className="border border-white/10 rounded-xl p-5 bg-white/5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <ContextBadge type={item.content_type} />
          <ReasonBadge reason={item.reason} />
          {item.report_count > 1 && (
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-500/15 text-red-400">
              {item.report_count} reports
            </span>
          )}
        </div>
        <span className="text-white/30 text-xs shrink-0">{formatDate(item.created_at)}</span>
      </div>

      {/* Reporter */}
      <div>
        <span className="text-white/40 text-xs">Reported by </span>
        <span className="text-white/80 text-sm font-medium">{item.reporter.display_name}</span>
        <span className="text-white/35 text-xs ml-2">@{item.reporter.username}</span>
      </div>

      {/* Reporter notes */}
      {item.notes && (
        <p className="text-white/50 text-sm italic">"{item.notes}"</p>
      )}

      {/* Content snippet */}
      {item.content_snippet ? (
        <blockquote className="border-l-2 border-white/15 pl-3 text-white/65 text-sm leading-relaxed">
          {item.content_snippet}
        </blockquote>
      ) : item.content_exists ? (
        <p className="text-white/25 text-sm italic">Image-only content</p>
      ) : (
        <p className="text-white/25 text-sm italic">Content deleted</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        {decided ? (
          <span className={`text-sm font-medium ${decided === 'removed' ? 'text-red-400' : decided === 'reviewed' ? 'text-emerald-400' : 'text-white/40'}`}>
            {decided === 'removed' ? '✓ Reviewed & Content Removed' : decided === 'reviewed' ? '✓ Reviewed' : '✗ Dismissed'}
          </span>
        ) : (
          <>
            <button
              onClick={() => onDecide(item.id, 'reviewed')}
              disabled={!!deciding}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-500/50 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deciding === 'reviewing' ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : null}
              Reviewed
            </button>
            {item.content_exists && (
              <button
                onClick={() => {
                  if (window.confirm('Remove this content? This cannot be undone.')) {
                    onDecide(item.id, 'reviewed', true);
                  }
                }}
                disabled={!!deciding}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deciding === 'removing' ? (
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : null}
                Remove Content
              </button>
            )}
            <button
              onClick={() => onDecide(item.id, 'dismissed')}
              disabled={!!deciding}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/15 text-white/40 text-sm font-medium hover:bg-white/5 hover:text-white/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deciding === 'dismissing' ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : null}
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function UserReports() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<Record<string, DecidingState>>({});
  const [decided, setDecided] = useState<Record<string, DecidedState>>({});

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem(JWT_KEY);
      const res = await fetch(`${API_BASE}/admin/reports/queue?status=pending&limit=100`, {
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
    fetchReports();
  }, [fetchReports]);

  const handleDecide = async (id: string, decision: 'reviewed' | 'dismissed', removeContent = false) => {
    const decidingState: DecidingState = removeContent ? 'removing' : decision === 'reviewed' ? 'reviewing' : 'dismissing';
    setDeciding(prev => ({ ...prev, [id]: decidingState }));
    try {
      const token = localStorage.getItem(JWT_KEY);
      const res = await fetch(`${API_BASE}/admin/reports/queue/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ decision, remove_content: removeContent }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const decidedState: DecidedState = removeContent ? 'removed' : decision;
      setDecided(prev => ({ ...prev, [id]: decidedState }));
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

  return (
    <div>
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-white font-medium text-lg">User Reports</h2>
          {!loading && !error && (
            <p className="text-white/35 text-sm mt-0.5">
              {items.length === 0
                ? 'No pending reports'
                : `${items.length} pending report${items.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <button
          onClick={fetchReports}
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-white/35 text-sm py-8 justify-center">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Loading reports…
        </div>
      )}

      {/* Error */}
      {!loading && error && error !== 'access_denied' && (
        <div className="border border-white/10 rounded-xl p-5 text-center">
          <p className="text-white/45 text-sm">Failed to load reports. <button onClick={fetchReports} className="text-nave-accent hover:text-nave-accent-light underline">Try again</button></p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-nave-accent/20 font-serif select-none mb-4" style={{ fontSize: '4rem', lineHeight: 1 }} aria-hidden>✝</div>
          <p className="text-white/40 text-sm">No pending reports.</p>
        </div>
      )}

      {/* Report items */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map(item => (
            <ReportCard
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
