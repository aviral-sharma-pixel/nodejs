'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TicketCard from '@/components/TicketCard';
import BulkCloseModal from '@/components/BulkCloseModal';
import { AlertCircle, RefreshCw, Search as SearchIcon, X, Sparkles, Hash, FileText } from 'lucide-react';

const RECENT_SUGGESTIONS = ['DEVOPS-', 'Agent Package', 'SentinelOne', 'Incident'];

export default function SearchPage() {
  const router = useRouter();
  const [tickets, setTickets]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [jiraConfig, setJiraConfig]   = useState(null);
  const [showBulkCloseModal, setShowBulkCloseModal] = useState(false);
  const [isDark, setIsDark]           = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    const config = typeof window !== 'undefined' ? localStorage.getItem('jira_config') : null;
    const savedSettings = typeof window !== 'undefined' ? localStorage.getItem('app_settings') : null;

    const timer = setTimeout(() => {
      if (config) {
        try { setJiraConfig(JSON.parse(config)); } catch { router.push('/login'); }
      } else { router.push('/login'); }

      if (savedSettings) {
        try {
          const p = JSON.parse(savedSettings);
          const dark = p.theme === 'dark';
          setIsDark(dark);
          document.documentElement.style.backgroundColor = dark ? '#0a0e27' : '#f5f5f7';
          document.body.style.backgroundColor           = dark ? '#0a0e27' : '#f5f5f7';
        } catch {}
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  const handleSearch = async (query = searchQuery) => {
    const q = (query || searchQuery).trim();
    if (!q || !jiraConfig) return;
    setSearchQuery(q);
    setLoading(true); setError(null); setHasSearched(true);
    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 8000);
      const res  = await fetch('/api/tickets', { signal: controller.signal, headers: { 'x-jira-config': JSON.stringify(jiraConfig) } });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tickets');
      const lower    = q.toLowerCase();
      const filtered = (data.issues || []).filter(t =>
        t.key.toLowerCase().includes(lower) || t.fields.summary.toLowerCase().includes(lower)
      );
      setTickets(filtered);
    } catch (err) {
      setError(err.name === 'AbortError' ? 'Request timed out. Please try again.' : err.message);
    } finally { setLoading(false); }
  };

  const handleClear = () => { setSearchQuery(''); setTickets([]); setHasSearched(false); setError(null); };

  const handleLogout = () => { localStorage.removeItem('jira_config'); router.push('/login'); };

  /* ── theme tokens ── */
  const pageBg      = isDark ? '#0f1729' : '#f5f5f7';
  const cardBg      = isDark ? 'rgba(25,28,50,0.8)' : 'rgba(255,255,255,0.7)';
  const border      = isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)';
  const textPrimary = isDark ? '#fff' : '#000';
  const textMuted   = isDark ? '#aaa' : '#666';
  const inputBg     = isDark ? 'rgba(25,28,50,0.6)' : 'rgba(255,255,255,0.9)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: pageBg }}>
      <Sidebar onBulkCloseClick={() => setShowBulkCloseModal(true)} onLogout={handleLogout} isDark={isDark} />

      <main style={{ marginLeft: '260px', flex: 1, padding: '2rem', overflow: 'auto', backgroundColor: pageBg }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem', animation: 'fadeIn 0.4s ease-out' }}>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '700', color: textPrimary }}>Search Tickets 🔍</h1>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.6, fontSize: '0.85rem', color: textMuted }}>Find any ticket by ID or summary keyword</p>
        </div>

        {/* ── Search bar ── */}
        <div style={{ marginBottom: '2rem', animation: 'slideInUp 0.4s ease-out' }}>
          <form onSubmit={e => { e.preventDefault(); handleSearch(); }} style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0',
              backgroundColor: cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: inputFocused ? '1px solid #007AFF' : `1px solid ${inputBorder}`,
              boxShadow: inputFocused ? '0 0 0 3px rgba(0,122,255,0.1), 0 8px 32px rgba(0,0,0,0.08)' : '0 4px 20px rgba(0,0,0,0.06)',
              transition: 'all 0.25s cubic-bezier(0.25,0.46,0.45,0.94)',
              overflow: 'hidden'
            }}>
              {/* Icon */}
              <div style={{ padding: '0 1rem 0 1.25rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {loading
                  ? <RefreshCw size={18} color="#007AFF" style={{ animation: 'spin 1s linear infinite' }} />
                  : <SearchIcon size={18} color={inputFocused ? '#007AFF' : textMuted} style={{ transition: 'color 0.2s' }} />
                }
              </div>

              {/* Input */}
              <input
                type="text"
                placeholder="Search by ticket ID (e.g. DEVOPS-123) or keyword…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  color: textPrimary, fontSize: '0.925rem', padding: '1rem 0',
                  fontFamily: 'inherit'
                }}
              />

              {/* Clear */}
              {searchQuery && (
                <button type="button" onClick={handleClear} style={{ padding: '0 0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: textMuted, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = textPrimary}
                  onMouseLeave={e => e.currentTarget.style.color = textMuted}
                >
                  <X size={16} />
                </button>
              )}

              {/* Search button */}
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                style={{ margin: '0.5rem', padding: '0.6rem 1.375rem', backgroundColor: searchQuery.trim() ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'), border: 'none', borderRadius: '12px', color: searchQuery.trim() ? '#fff' : textMuted, fontWeight: '600', fontSize: '0.85rem', cursor: searchQuery.trim() && !loading ? 'pointer' : 'not-allowed', transition: 'all 0.2s ease', flexShrink: 0, boxShadow: searchQuery.trim() ? '0 4px 12px rgba(0,122,255,0.3)' : 'none' }}
                onMouseEnter={e => { if (searchQuery.trim() && !loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,122,255,0.4)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = searchQuery.trim() ? '0 4px 12px rgba(0,122,255,0.3)' : 'none'; }}
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick suggestion chips */}
          {!hasSearched && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: textMuted, opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Sparkles size={11} /> Try:
              </span>
              {RECENT_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => handleSearch(s)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'}`,
                  backgroundColor: isDark ? 'rgba(25,28,50,0.5)' : 'rgba(255,255,255,0.8)',
                  color: textMuted, cursor: 'pointer', transition: 'all 0.15s ease', backdropFilter: 'blur(8px)'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#007AFF'; e.currentTarget.style.color = '#007AFF'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'; e.currentTarget.style.color = textMuted; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: '1rem 1.25rem', backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5', marginBottom: '1.5rem', borderRadius: '12px', fontSize: '0.875rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* ── States ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1rem' }}>
            <RefreshCw size={32} color="#007AFF" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: textMuted, fontSize: '0.85rem', margin: 0 }}>Searching your Jira tickets…</p>
          </div>

        ) : !hasSearched ? (
          /* Empty state — before any search */
          <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: cardBg, backdropFilter: 'blur(20px)', borderRadius: '16px', border, animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <SearchIcon size={30} color="#007AFF" />
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: '700', color: textPrimary }}>Search your tickets</h2>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto' }}>
              Type a ticket ID like <code style={{ fontSize: '0.8rem', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#007AFF' }}>DEVOPS-123</code> or any keyword from the summary.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem' }}>
              {[
                { icon: Hash, label: 'Search by ID', desc: 'e.g. DEVOPS-123' },
                { icon: FileText, label: 'Search by summary', desc: 'Any keyword' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem' }}>
                    <Icon size={18} color={textMuted} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: '600', color: textPrimary }}>{label}</p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: textMuted }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

        ) : !error && tickets.length === 0 ? (
          /* No results */
          <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: cardBg, backdropFilter: 'blur(20px)', borderRadius: '16px', border }}>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: textPrimary }}>No results found</h2>
            <p style={{ margin: 0, opacity: 0.6, color: textMuted, fontSize: '0.875rem' }}>
              No tickets matched <strong>&quot;{searchQuery}&quot;</strong>. Try a different ID or keyword.
            </p>
          </div>

        ) : tickets.length > 0 ? (
          /* Results */
          <div style={{ animation: 'slideInUp 0.35s ease-out' }}>
            <p style={{ opacity: 0.6, fontSize: '0.78rem', marginBottom: '1rem', fontWeight: '500', color: textMuted }}>
              Found <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{tickets.length}</span> ticket{tickets.length !== 1 ? 's' : ''} for <strong>&quot;{searchQuery}&quot;</strong>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
              {tickets.map(ticket => (
                <TicketCard key={ticket.key} ticket={ticket} onStatusChange={key => setTickets(t => t.filter(x => x.key !== key))} jiraConfig={jiraConfig} />
              ))}
            </div>
          </div>
        ) : null}
      </main>

      <BulkCloseModal
        isOpen={showBulkCloseModal}
        tickets={tickets}
        onClose={() => setShowBulkCloseModal(false)}
        onConfirm={keys => setTickets(t => t.filter(x => !keys.includes(x.key)))}
        jiraConfig={jiraConfig}
      />
    </div>
  );
}
