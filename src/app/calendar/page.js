'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { RefreshCw, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';

export default function CalendarPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [date, setDate] = useState(new Date());
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jiraConfig, setJiraConfig] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const config = localStorage.getItem('jira_config');
    if (!config) { router.push('/login'); return; }

    const saved = localStorage.getItem('app_settings');
    const timer = setTimeout(() => {
      try { setJiraConfig(JSON.parse(config)); } catch { router.push('/login'); }
      if (saved) {
        try {
          const { theme } = JSON.parse(saved);
          const dark = theme === 'dark';
          setIsDark(dark);
          document.documentElement.style.backgroundColor = dark ? '#0a0e27' : '#f5f5f7';
          document.body.style.backgroundColor = dark ? '#0a0e27' : '#f5f5f7';
        } catch (_) {}
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  const fetchTickets = async () => {
    if (!jiraConfig) return;
    setLoading(true); setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/tickets', { signal: controller.signal, headers: { 'x-jira-config': JSON.stringify(jiraConfig) } });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tickets');
      setTickets(data.issues || []);
    } catch (err) {
      setError(err.name === 'AbortError' ? 'Request timed out.' : err.message);
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

  // Group tickets by date (using created date as fallback, duedate if available)
  const ticketsByDate = useMemo(() => {
    const map = {};
    tickets.forEach(t => {
      const targetDate = t.fields.duedate ? new Date(t.fields.duedate) : new Date(t.fields.created);
      const key = `${targetDate.getFullYear()}-${targetDate.getMonth()}-${targetDate.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tickets]);

  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const startDay = startOfMonth.getDay(); // 0=Sun

  const weeks = [];
  let currentDay = 1 - startDay;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (currentDay > 0 && currentDay <= daysInMonth) {
        week.push(currentDay);
      } else {
        week.push(null);
      }
      currentDay++;
    }
    weeks.push(week);
  }

  const monthNames = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];

  const handleLogout = () => { localStorage.removeItem('jira_config'); router.push('/login'); };

  const getStatusColor = (statusName) => {
    if (!statusName) return '#FF3B30'; // red for open by default
    const name = statusName.toLowerCase();
    if (name.includes('done') || name.includes('closed') || name.includes('resolved')) {
      return '#34C759'; // green for done
    }
    return '#FF3B30'; // red for anything else
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: isDark ? '#0a0e27' : '#f5f5f7' }}>
      <Sidebar onLogout={handleLogout} isDark={isDark} />
      <main style={{ marginLeft: '260px', flex: 1, padding: '2rem', overflow: 'auto', backgroundColor: isDark ? '#0f1729' : '#f5f5f7' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', animation: 'fadeIn 0.4s' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '700', color: isDark ? '#fff' : '#000' }}>Calendar 📅</h1>
            <p style={{ marginTop: '0.25rem', opacity: 0.6, fontSize: '0.85rem', color: isDark ? '#aaa' : '#666' }}>{monthNames[date.getMonth()]} {date.getFullYear()} — Your upcoming events & due dates</p>
          </div>
          <button
            onClick={fetchTickets}
            disabled={loading}
            style={{ padding: '0.625rem 1.25rem', backgroundColor: 'var(--primary)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '600', fontSize: '0.85rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(0,122,255,0.3)', transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)', opacity: loading ? 0.7 : 1 }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,122,255,0.4)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,122,255,0.3)'; }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: '1rem 1.25rem', backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5', marginBottom: '1.5rem', borderRadius: '12px', fontSize: '0.875rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.5rem', padding: '1.25rem', background: isDark ? 'rgba(25,28,50,0.8)' : 'rgba(255,255,255,0.7)', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)', borderRadius: '16px', backdropFilter: 'blur(20px)', boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.04)', animation: 'slideInUp 0.4s' }}>
          {/* Weekday Headers */}
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.8rem', color: isDark ? '#aaa' : '#666', paddingBottom: '0.5rem', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`, marginBottom: '0.5rem' }}>
              {d}
            </div>
          ))}

          {/* Calendar Grid */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              const isToday = day === new Date().getDate() && date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();
              const dateKey = `${date.getFullYear()}-${date.getMonth()}-${day}`;
              const dayTickets = day ? (ticketsByDate[dateKey] || []) : [];

              return (
                <div key={`${wi}-${di}`} style={{ 
                  minHeight: '110px', 
                  borderRadius: '12px', 
                  padding: '0.5rem',
                  display: 'flex', 
                  flexDirection: 'column',
                  background: day ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent', 
                  border: isToday ? '1px solid #007AFF' : `1px solid ${day ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') : 'transparent'}`,
                  transition: 'background 0.2s',
                }}>
                  {day && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: isToday ? '700' : '600', color: isToday ? '#007AFF' : (isDark ? '#fff' : '#000'), width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: isToday ? 'rgba(0,122,255,0.1)' : 'transparent' }}>
                        {day}
                      </span>
                    </div>
                  )}

                  {/* Tickets for this day */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', flex: 1 }}>
                    {dayTickets.map(t => {
                      const statusColor = getStatusColor(t.fields.status?.name);
                      return (
                        <div key={t.key} title={`${t.fields.summary} (${t.fields.status?.name})`} style={{
                          padding: '0.25rem 0.4rem',
                          borderRadius: '6px',
                          backgroundColor: `${statusColor}15`,
                          border: `1px solid ${statusColor}30`,
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: isDark ? '#e2e8f0' : '#334155',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${statusColor}25`; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${statusColor}15`; }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }} />
                          {t.key}
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
