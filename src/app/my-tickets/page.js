'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TicketCard from '@/components/TicketCard';
import BulkCloseModal from '@/components/BulkCloseModal';
import { AlertCircle, RefreshCw, Search, X, Layers } from 'lucide-react';

const STATUS_FILTERS = [
  { id: 'all',         label: 'All' },
  { id: 'to-do',      label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done',       label: 'Done' },
  { id: 'blocked',    label: 'Blocked' },
];

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jiraConfig, setJiraConfig]     = useState(null);
  const [showBulkCloseModal, setShowBulkCloseModal] = useState(false);
  const [settings, setSettings]         = useState(null);
  const [isDark, setIsDark]             = useState(false);

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
          setSettings(p);
          const dark = p.theme === 'dark';
          setIsDark(dark);
          document.documentElement.style.backgroundColor = dark ? '#0a0e27' : '#f5f5f7';
          document.body.style.backgroundColor           = dark ? '#0a0e27' : '#f5f5f7';
        } catch { setSettings({ theme: 'light', autoRefreshInterval: 30 }); }
      } else { setSettings({ theme: 'light', autoRefreshInterval: 30 }); }
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  const fetchTickets = async () => {
    if (!jiraConfig) return;
    setLoading(true); setError(null);
    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 8000);
      const res  = await fetch('/api/tickets', { signal: controller.signal, headers: { 'x-jira-config': JSON.stringify(jiraConfig) } });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tickets');
      setTickets(data.issues || []);
    } catch (err) {
      setError(err.name === 'AbortError' ? 'Request timed out. Please check your connection.' : err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (jiraConfig) {
      const timer = setTimeout(() => {
        fetchTickets();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [jiraConfig]);
  useEffect(() => {
    if (!jiraConfig || !settings) return;
    const interval = setInterval(fetchTickets, settings.autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [jiraConfig, settings?.autoRefreshInterval]);

  const handleTicketClosed   = (key)          => setTickets(t => t.filter(x => x.key !== key));
  const handleBulkConfirm    = (selectedKeys) => setTickets(t => t.filter(x => !selectedKeys.includes(x.key)));
  const handleLogout         = ()             => { localStorage.removeItem('jira_config'); router.push('/login'); };

  const stats = useMemo(() => {
    const open = tickets.filter(t => !t.fields.status.name.toLowerCase().includes('done'));
    return {
      total:      tickets.length,
      open:       open.length,
      inProgress: open.filter(t => t.fields.status.name.toLowerCase().includes('progress')).length,
      done:       tickets.filter(t => t.fields.status.name.toLowerCase().includes('done')).length,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let f = tickets;
    if (statusFilter !== 'all') {
      f = f.filter(t => {
        const s = t.fields.status.name.toLowerCase();
        if (statusFilter === 'in-progress') return s.includes('progress');
        if (statusFilter === 'to-do')       return s.includes('to do') || s.includes('backlog') || s.includes('create ticket');
        if (statusFilter === 'done')        return s.includes('done');
        if (statusFilter === 'blocked')     return s.includes('block');
        return true;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(t => t.key.toLowerCase().includes(q) || t.fields.summary.toLowerCase().includes(q));
    }
    return f;
  }, [tickets, statusFilter, searchQuery]);

  /* ── theme tokens ── */
  const pageBg      = isDark ? '#0f1729' : '#f5f5f7';
  const cardBg      = isDark ? 'rgba(25,28,50,0.8)' : 'rgba(255,255,255,0.7)';
  const border      = isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)';
  const textPrimary = isDark ? '#fff' : '#000';
  const textMuted   = isDark ? '#aaa' : '#666';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: pageBg }}>
      <Sidebar onBulkCloseClick={() => setShowBulkCloseModal(true)} onLogout={handleLogout} isDark={isDark} />

      <main style={{ marginLeft: '260px', flex: 1, padding: '2rem', overflow: 'auto', backgroundColor: pageBg }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', animation: 'fadeIn 0.4s ease-out' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '700', color: textPrimary }}>My Tickets 📋</h1>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.6, fontSize: '0.85rem', color: textMuted }}>All tickets currently assigned to you</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {statusFilter === 'in-progress' && (
              <button
                onClick={() => setShowBulkCloseModal(true)}
                style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(0,122,255,0.1)', border: '1px solid #007AFF', borderRadius: '10px', color: '#007AFF', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,122,255,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(0,122,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Layers size={14} /> Bulk Close
              </button>
            )}
            <button
              onClick={fetchTickets} disabled={loading}
              style={{ padding: '0.5rem 1.1rem', backgroundColor: 'var(--primary)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '600', fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 15px rgba(0,122,255,0.3)', transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)', opacity: loading ? 0.7 : 1 }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,122,255,0.4)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,122,255,0.3)'; }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Stat mini-row ── */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
            {[
              { label: 'Total',       value: stats.total,      color: '#007AFF' },
              { label: 'Open',        value: stats.open,       color: '#FF9500' },
              { label: 'In Progress', value: stats.inProgress, color: '#5856D6' },
              { label: 'Done',        value: stats.done,       color: '#34C759' },
            ].map((s, i) => (
              <div key={i}
                style={{ backgroundColor: cardBg, backdropFilter: 'blur(20px)', borderRadius: '14px', padding: '1rem 1.25rem', border, borderLeft: `4px solid ${s.color}`, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)', animation: `slideInUp 0.4s ease ${i * 0.08}s backwards` }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)'; }}
              >
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '1.75rem', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: '1rem 1.25rem', backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5', marginBottom: '1.5rem', borderRadius: '12px', fontSize: '0.875rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* ── Search + Filters ── */}
        {!loading && !error && tickets.length > 0 && (
          <div style={{ marginBottom: '1.5rem', animation: 'slideInUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none', color: textMuted }} />
              <input
                type="text"
                placeholder="Search by ticket ID or summary…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.625rem 2.5rem', borderRadius: '10px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'}`, backgroundColor: isDark ? 'rgba(25,28,50,0.5)' : 'rgba(255,255,255,0.8)', color: textPrimary, fontSize: '0.85rem', boxSizing: 'border-box', backdropFilter: 'blur(8px)', transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#007AFF'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,122,255,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: textMuted, display: 'flex', padding: 0 }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {STATUS_FILTERS.map(f => {
                const active = statusFilter === f.id;
                return (
                  <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
                    padding: '0.45rem 0.875rem', borderRadius: '10px',
                    border:          active ? '1px solid #007AFF' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'}`,
                    backgroundColor: active ? 'rgba(0,122,255,0.1)' : isDark ? 'rgba(25,28,50,0.5)' : 'rgba(255,255,255,0.8)',
                    color:           active ? '#007AFF' : isDark ? '#fff' : '#000',
                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: active ? '600' : '500',
                    transition: 'all 0.2s ease', backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = active ? 'rgba(0,122,255,0.1)' : isDark ? 'rgba(25,28,50,0.5)' : 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tickets ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1rem' }}>
            <RefreshCw size={32} color="#007AFF" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: textMuted, fontSize: '0.85rem', margin: 0 }}>Fetching your tickets…</p>
          </div>
        ) : !error && filteredTickets.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: cardBg, backdropFilter: 'blur(20px)', borderRadius: '16px', border, animation: 'fadeIn 0.4s ease-out' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: textPrimary }}>
              {tickets.length === 0 ? 'All Caught Up! 🎉' : 'No tickets match your search'}
            </h2>
            <p style={{ margin: '0.75rem 0 0 0', opacity: 0.6, color: textMuted, fontSize: '0.875rem' }}>
              {tickets.length === 0 ? 'You have no tickets assigned to you.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div>
            <p style={{ opacity: 0.6, fontSize: '0.78rem', marginBottom: '1rem', fontWeight: '500', color: textMuted }}>
              Showing <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{filteredTickets.length}</span> of{' '}
              <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{tickets.length}</span> tickets
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
              {filteredTickets.map(ticket => (
                <TicketCard key={ticket.key} ticket={ticket} onStatusChange={handleTicketClosed} jiraConfig={jiraConfig} />
              ))}
            </div>
          </div>
        )}
      </main>

      <BulkCloseModal
        isOpen={showBulkCloseModal}
        tickets={tickets}
        onClose={() => setShowBulkCloseModal(false)}
        onConfirm={handleBulkConfirm}
        jiraConfig={jiraConfig}
      />
    </div>
  );
}
