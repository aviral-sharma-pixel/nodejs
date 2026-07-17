'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { AlertCircle, RefreshCw, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

function calculateDurationMinutes(timestamp) {
  try {
    return Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  } catch { return 0; }
}

const getStatusColor  = (status) => status === 'ok' ? '#34C759' : '#FF3B30';
const getAlertTypeColor = (alertType) => {
  if (alertType === 'url_alert')  return '#FF9500';
  if (alertType === 'port_alert') return '#5856D6';
  return '#007AFF';
};
const getAlertIcon = (alertType) => {
  if (alertType === 'url_alert' || alertType === 'port_alert') return '🌐';
  if (alertType === '5xx') return '⚠️';
  return '📧';
};

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [settings, setSettings]           = useState(null);
  const [isDark, setIsDark]               = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const config = localStorage.getItem('jira_config');
    if (!config) { router.push('/login'); return; }

    const savedSettings = localStorage.getItem('app_settings');
    const timer = setTimeout(() => {
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(parsed);
          const dark = parsed.theme === 'dark';
          setIsDark(dark);
          document.documentElement.style.backgroundColor = dark ? '#0a0e27' : '#f5f5f7';
          document.body.style.backgroundColor           = dark ? '#0a0e27' : '#f5f5f7';
        } catch { setSettings({ theme: 'light', autoRefreshInterval: 30 }); }
      } else {
        setSettings({ theme: 'light', autoRefreshInterval: 30 });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  const fetchAlerts = async () => {
    setLoading(true); setError(null);
    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 8000);
      const res  = await fetch('/api/alerts', { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch alerts');
      setAlerts(data.alerts || []);
    } catch (err) {
      setError(err.name === 'AbortError' ? 'Request timed out. Please try again.' : err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlerts();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // WebSocket for real-time Grafana alerts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const wsUrl = backendUrl.replace('http', 'ws') + '/ws/alerts';
    try {
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // On any backend push, just re-fetch from the Next.js API to get correctly processed data
        if (data.type === 'new_alerts' || data.type === 'new_alert') {
          fetchAlerts();
        }
        // Ignore 'initial' type — REST fetch on mount covers this
      };
      ws.onerror  = () => {};
      ws.onclose  = () => {};
      return () => ws.close();
    } catch {}
  }, []);

  useEffect(() => {
    if (!settings) return;
    const interval = setInterval(fetchAlerts, settings.autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [settings?.autoRefreshInterval]);

  const handleLogout = () => { localStorage.removeItem('jira_config'); router.push('/login'); };

  const acknowledgeAlert = async (id, e) => {
    e.stopPropagation();
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      await fetch(`${backendUrl}/api/alerts/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' });
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  };

  const stats = useMemo(() => ({
    total:   alerts.length,
    firing:  alerts.filter(a => a.status === 'firing').length,
    ok:      alerts.filter(a => a.status === 'ok').length,
    overdue: alerts.filter(a => {
      const cat = (a.alertType || '').toLowerCase();
      const threshold = ['cpu', 'memory', 'disk', 'port', 'db'].includes(cat) ? 5 : 90;
      return a.status === 'firing' && a.durationMinutes >= threshold;
    }).length,
  }), [alerts]);

  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    if (selectedFilter === 'firing')  filtered = filtered.filter(a => a.status === 'firing');
    if (selectedFilter === 'ok')      filtered = filtered.filter(a => a.status === 'ok');
    if (selectedFilter === 'overdue') filtered = filtered.filter(a => {
      const cat = (a.alertType || '').toLowerCase();
      const t = ['cpu', 'memory', 'disk', 'port', 'db'].includes(cat) ? 5 : 90;
      return a.status === 'firing' && a.durationMinutes >= t;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.alertType?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [alerts, selectedFilter, searchQuery]);

  /* theme tokens — mirrors dashboard exactly */
  const pageBg      = isDark ? '#0f1729' : '#f5f5f7';
  const cardBg      = isDark ? 'rgba(25,28,50,0.8)' : 'rgba(255,255,255,0.7)';
  const border      = isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)';
  const textPrimary = isDark ? '#fff' : '#000';
  const textMuted   = isDark ? '#aaa' : '#666';

  const statCards = [
    { label: 'Total Alerts', value: stats.total,   color: '#007AFF', note: '📊 All alerts' },
    { label: 'Firing',       value: stats.firing,  color: '#FF3B30', note: '🔴 Active now' },
    { label: 'Healthy',      value: stats.ok,       color: '#34C759', note: '✅ All good' },
    { label: 'Overdue',      value: stats.overdue, color: '#FF9500', note: '⚠️ Action needed' },
  ];

  const filterOptions = [
    { id: 'all',     label: 'All' },
    { id: 'firing',  label: 'Firing' },
    { id: 'ok',      label: 'Healthy' },
    { id: 'overdue', label: 'Overdue' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: pageBg }}>
      <Sidebar onLogout={handleLogout} isDark={isDark} />

      <main style={{ marginLeft: '260px', flex: 1, padding: '2rem', overflow: 'auto', backgroundColor: pageBg }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', animation: 'fadeIn 0.4s ease-out' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '700', color: textPrimary }}>Grafana Alerts 🚨</h1>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.6, fontSize: '0.85rem', color: textMuted }}>Monitor and track your Grafana alerts in real-time</p>
          </div>
          <button
            onClick={fetchAlerts} disabled={loading}
            style={{ padding: '0.625rem 1.25rem', backgroundColor: 'var(--primary)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '600', fontSize: '0.85rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(0,122,255,0.3)', transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)', opacity: loading ? 0.7 : 1 }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,122,255,0.4)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,122,255,0.3)'; }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '1rem 1.25rem', backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5', marginBottom: '1.5rem', borderRadius: '12px', fontSize: '0.875rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Stat Cards */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {statCards.map((card, i) => (
              <div key={i}
                style={{ backgroundColor: cardBg, backdropFilter: 'blur(20px)', borderRadius: '16px', padding: '1.25rem', border, borderLeft: `4px solid ${card.color}`, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)', animation: `slideInUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 0.1}s backwards`, cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)'; }}
              >
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600', color: textMuted, opacity: 0.7 }}>{card.label}</p>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: '700', color: card.color }}>{card.value}</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.7rem', opacity: 0.5, color: textMuted }}>{card.note}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filters */}
        {!loading && !error && alerts.length > 0 && (
          <div style={{ marginBottom: '1.5rem', animation: 'slideInUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Search alerts by name, server, type…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.625rem 1rem', borderRadius: '10px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'}`, backgroundColor: isDark ? 'rgba(25,28,50,0.5)' : 'rgba(255,255,255,0.8)', color: textPrimary, fontSize: '0.85rem', boxSizing: 'border-box', backdropFilter: 'blur(8px)', transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#007AFF'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,122,255,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {filterOptions.map(f => {
                const active = selectedFilter === f.id;
                return (
                  <button key={f.id} onClick={() => setSelectedFilter(f.id)} style={{
                    padding: '0.5rem 0.875rem', borderRadius: '10px',
                    border:          active ? '1px solid #007AFF' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'}`,
                    backgroundColor: active ? 'rgba(0,122,255,0.1)' : isDark ? 'rgba(25,28,50,0.5)' : 'rgba(255,255,255,0.8)',
                    color:           active ? '#007AFF' : isDark ? '#fff' : '#000',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? '600' : '500',
                    transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)', backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = active ? 'rgba(0,122,255,0.1)' : isDark ? 'rgba(25,28,50,0.5)' : 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Alerts Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <RefreshCw size={36} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : !error && filteredAlerts.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: cardBg, backdropFilter: 'blur(20px)', borderRadius: '16px', border }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: textPrimary }}>
              {alerts.length === 0 ? 'No Alerts 🎉' : 'No alerts match your search'}
            </h2>
            <p style={{ margin: '0.75rem 0 0 0', opacity: 0.6, color: textMuted, fontSize: '0.875rem' }}>
              {alerts.length === 0 ? 'All Grafana systems are healthy!' : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div>
            <p style={{ opacity: 0.6, fontSize: '0.8rem', marginBottom: '1rem', fontWeight: '500', color: textMuted }}>
              Showing <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{filteredAlerts.length}</span> of{' '}
              <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{alerts.length}</span> alerts
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
              {filteredAlerts.map((alert, idx) => {
                const cat = (alert.alertType || '').toLowerCase();
                const threshold = ['cpu', 'memory', 'disk', 'port', 'db'].includes(cat) ? 5 : 90;
                const isOverdue = alert.status === 'firing' && alert.durationMinutes >= threshold;
                const accentColor = isOverdue ? '#FF3B30' : getAlertTypeColor(alert.alertType);

                return (
                  <div key={idx}
                    style={{ backgroundColor: cardBg, backdropFilter: 'blur(20px)', borderRadius: '16px', cursor: 'pointer', padding: '1.25rem', border, borderLeft: `4px solid ${accentColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)', animation: `slideInUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94) ${idx * 0.05}s backwards`, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)'; }}
                    onClick={() => {
                      if (alert.emailMessageId) {
                        const url = `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(alert.emailMessageId)}`;
                        window.open(url, '_blank');
                      }
                    }}
                  >
                  
                    {/* Overdue badge */}
                    {isOverdue && (
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.2rem 0.6rem', backgroundColor: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.4)', borderRadius: '6px', fontSize: '0.62rem', fontWeight: '700', color: '#FF3B30', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Overdue
                      </div>
                    )}

                    {/* Top: icon + name */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '2px' }}>{getAlertIcon(alert.alertType)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: '0.925rem', fontWeight: '600', color: textPrimary, wordBreak: 'break-word' }}>{alert.name || 'Unknown Alert'}</h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', opacity: 0.6, color: textMuted, wordBreak: 'break-word' }}>{alert.email || 'No server info'}</p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', backgroundColor: `${getStatusColor(alert.status)}18`, border: `1px solid ${getStatusColor(alert.status)}40`, borderRadius: '8px', fontSize: '0.72rem', fontWeight: '600', color: getStatusColor(alert.status) }}>
                        {alert.status === 'ok' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        {alert.status.toUpperCase()}
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.625rem', backgroundColor: `${getAlertTypeColor(alert.alertType)}18`, border: `1px solid ${getAlertTypeColor(alert.alertType)}40`, borderRadius: '8px', fontSize: '0.72rem', fontWeight: '600', color: getAlertTypeColor(alert.alertType), textTransform: 'uppercase' }}>
                        {alert.alertType?.replace('_', ' ')}
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: textMuted, paddingTop: '0.5rem', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`, justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Clock size={13} />
                          <span>{alert.durationMinutes} min</span>
                        </div>
                        <div style={{ opacity: 0.5 }}>
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'N/A'}
                        </div>
                      </div>
                      {alert.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); acknowledgeAlert(alert.id, e); }}
                          style={{ padding: '0.25rem 0.625rem', backgroundColor: 'rgba(0,122,255,0.1)', border: '1px solid rgba(0,122,255,0.3)', borderRadius: '6px', color: '#007AFF', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,122,255,0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(0,122,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                          title="Acknowledge and dismiss this alert"
                        >
                          ✓ Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
