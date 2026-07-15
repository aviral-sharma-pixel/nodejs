'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BulkCloseModal from '@/components/BulkCloseModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function CalendarPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jiraConfig, setJiraConfig] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBulkCloseModal, setShowBulkCloseModal] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const config = typeof window !== 'undefined' ? localStorage.getItem('jira_config') : null;
    if (config) {
      try {
        setJiraConfig(JSON.parse(config));
      } catch (e) {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchTickets = async () => {
    if (!jiraConfig) return;
    
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/tickets', {
        signal: controller.signal,
        headers: {
          'x-jira-config': JSON.stringify(jiraConfig)
        }
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tickets');
      setTickets(data.issues || []);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jiraConfig) {
      fetchTickets();
    }
  }, [jiraConfig]);

  const handleLogout = () => {
    localStorage.removeItem('jira_config');
    router.push('/login');
  };

  const handleBulkCloseConfirm = (selectedKeys) => {
    setTickets(tickets.filter(t => !selectedKeys.includes(t.key)));
  };

  // Group tickets by date (using local timezone, not UTC)
  const ticketsByDate = useMemo(() => {
    const grouped = {};
    tickets.forEach(ticket => {
      const updatedDate = ticket.fields.updated;
      if (updatedDate) {
        // Convert UTC date to local date
        const date = new Date(updatedDate);
        const localDateKey = date.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format in local timezone
        if (!grouped[localDateKey]) {
          grouped[localDateKey] = [];
        }
        grouped[localDateKey].push(ticket);
      }
    });
    return grouped;
  }, [tickets]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getDateKey = (day) => {
    if (!day) return null;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    // Format as YYYY-MM-DD in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f7' }}>
      <Sidebar onBulkCloseClick={() => setShowBulkCloseModal(true)} onLogout={handleLogout} />
      <main style={{ marginLeft: '280px', flex: 1, padding: '2.5rem', overflow: 'auto', backgroundColor: '#f5f5f7' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem', animation: 'fadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
          <h1 style={{ fontSize: '2.25rem', margin: 0, fontWeight: '700', color: '#000' }}>Calendar 📅</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.6, fontSize: '0.95rem', color: '#666' }}>View tickets grouped by activity date</p>
        </div>

        {error && (
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', display: 'flex', alignItems: 'center', gap: '1rem', color: '#FF3B30', marginBottom: '2rem', borderRadius: '12px' }}>
            <AlertCircle size={24} />
            <div>
              <h3 style={{ margin: 0, color: '#FF3B30' }}>Error Loading Tickets</h3>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.825rem', color: '#FF3B30' }}>{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <RefreshCw size={40} color="#007AFF" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.5)', padding: '2rem', backdropFilter: 'blur(20px)', animation: 'slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
            {/* Month Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <button onClick={handlePrevMonth} style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(0, 122, 255, 0.1)', border: '1px solid #007AFF', borderRadius: '10px', color: '#007AFF', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                ← Previous
              </button>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#000' }}>{monthName}</h2>
              <button onClick={handleNextMonth} style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(0, 122, 255, 0.1)', border: '1px solid #007AFF', borderRadius: '10px', color: '#007AFF', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                Next →
              </button>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
              {/* Weekday headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{ textAlign: 'center', fontWeight: '600', color: '#007AFF', paddingBottom: '0.75rem', fontSize: '0.875rem' }}>
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {days.map((day, i) => {
                const dateKey = day ? getDateKey(day) : null;
                const dayTickets = day && ticketsByDate[dateKey] ? ticketsByDate[dateKey] : [];
                const isToday = day && dateKey === new Date().toLocaleDateString('en-CA');
                
                return (
                  <div
                    key={i}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: isToday ? 'rgba(0, 122, 255, 0.1)' : day ? 'rgba(0,0,0,0.02)' : 'transparent',
                      border: isToday ? '2px solid #007AFF' : day ? '1px solid rgba(0,0,0,0.08)' : 'none',
                      borderRadius: '12px',
                      minHeight: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      cursor: day ? 'pointer' : 'default'
                    }}
                    onMouseEnter={(e) => {
                      if (day) {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.05)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isToday ? 'rgba(0, 122, 255, 0.1)' : day ? 'rgba(0,0,0,0.02)' : 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {day && (
                      <>
                        <div style={{ fontWeight: isToday ? '700' : '600', marginBottom: '0.5rem', color: isToday ? '#007AFF' : '#000' }}>
                          {day} {isToday && '📍'}
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', fontSize: '0.75rem' }}>
                          {dayTickets.map((ticket, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '0.35rem 0.5rem',
                                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                                borderRadius: '4px',
                                marginBottom: '0.25rem',
                                color: '#007AFF',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title={ticket.key}
                            >
                              {ticket.key}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <p style={{ fontSize: '0.875rem', opacity: 0.7, color: '#000' }}>
                Total tickets with updates: <span style={{ color: '#007AFF', fontWeight: '600' }}>{Object.values(ticketsByDate).flat().length}</span>
              </p>
              <p style={{ fontSize: '0.75rem', opacity: 0.5, margin: '0.5rem 0 0 0', color: '#666' }}>
                📅 Tickets are grouped by their last updated date
              </p>
            </div>
          </div>
        )}
      </main>

      <BulkCloseModal
        isOpen={showBulkCloseModal}
        tickets={tickets}
        onClose={() => setShowBulkCloseModal(false)}
        onConfirm={handleBulkCloseConfirm}
        jiraConfig={jiraConfig}
      />
    </div>
  );
}
