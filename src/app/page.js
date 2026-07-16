'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TicketCard from '@/components/TicketCard';
import BulkCloseModal from '@/components/BulkCloseModal';
import { AlertCircle, RefreshCw, Search, Bell, User } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showBulkCloseModal, setShowBulkCloseModal] = useState(false);
  const [jiraConfig, setJiraConfig] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isDark, setIsDark] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const config = typeof window !== 'undefined' ? localStorage.getItem('jira_config') : null;
    const savedSettings = typeof window !== 'undefined' ? localStorage.getItem('app_settings') : null;

    const timer = setTimeout(() => {
      if (config) {
        try {
          setJiraConfig(JSON.parse(config));
        } catch (e) {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }

      // Load settings and apply theme
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings(parsedSettings);
          const dark = parsedSettings.theme === 'dark';
          setIsDark(dark);
          if (dark) {
            document.documentElement.style.backgroundColor = '#0a0e27';
            document.body.style.backgroundColor = '#0a0e27';
          } else {
            document.documentElement.style.backgroundColor = '#f5f5f7';
            document.body.style.backgroundColor = '#f5f5f7';
          }
        } catch (e) {
          console.log('Failed to load settings');
          setSettings({ theme: 'light', autoRefreshInterval: 30 });
        }
      } else {
        setSettings({ theme: 'light', autoRefreshInterval: 30 });
      }
    }, 0);

    return () => clearTimeout(timer);
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
        setError('Request timed out. Please check your VPN connection and try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jiraConfig) {
      const timer = setTimeout(() => {
        fetchTickets();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [jiraConfig]);

  // Auto-refresh effect
  useEffect(() => {
    if (!jiraConfig || !settings) return;

    const interval = setInterval(() => {
      fetchTickets();
    }, settings.autoRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [jiraConfig, settings?.autoRefreshInterval]);

  const handleTicketClosed = (key) => {
    setTickets(tickets.filter(t => t.key !== key));
  };

  const handleBulkCloseConfirm = (selectedKeys) => {
    setTickets(tickets.filter(t => !selectedKeys.includes(t.key)));
  };

  const handleLogout = () => {
    localStorage.removeItem('jira_config');
    router.push('/login');
  };

  const stats = useMemo(() => {
    // Only count open tickets (exclude done status)
    const openTickets = tickets.filter(t => !t.fields.status.name.toLowerCase().includes('done'));

    return {
      open: openTickets.length,
      highPriority: openTickets.filter(t => t.fields.priority?.name === 'Highest' || t.fields.priority?.name === 'High').length,
      inProgress: openTickets.filter(t => t.fields.status.name.toLowerCase().includes('progress')).length,
      blocked: openTickets.filter(t => t.fields.status.name.toLowerCase().includes('block')).length,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let filtered = tickets;
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(t => {
        const status = t.fields.status.name.toLowerCase();
        switch (selectedFilter) {
          case 'in-progress':
            return status.includes('progress');
          case 'to-do':
            return status.includes('to do') || status.includes('create ticket') || status === 'backlog';
          case 'done':
            return status === 'done';
          case 'blocked':
            return status.includes('block');
          case 'highest':
            return t.fields.priority?.name === 'Highest';
          default:
            return true;
        }
      });
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.key.toLowerCase().includes(query) ||
        t.fields.summary.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [tickets, selectedFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: isDark ? '#0a0e27' : '#f5f5f7' }}>
      <Sidebar onBulkCloseClick={() => setShowBulkCloseModal(true)} onLogout={handleLogout} isDark={isDark} />
      <main style={{ marginLeft: '260px', flex: 1, padding: '2rem', overflow: 'auto', backgroundColor: isDark ? '#0f1729' : '#f5f5f7' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', animation: 'fadeIn 0.4s ease-out' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '700', color: isDark ? '#fff' : '#000' }}>Jira Workspace 🚀👋</h1>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.6, fontSize: '0.85rem', color: isDark ? '#aaa' : '#666' }}>Here&apos;s what&apos;s happening close your tickets today</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={fetchTickets} disabled={loading} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)', opacity: loading ? 0.7 : 1 }} onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 122, 255, 0.4)';
              }
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 122, 255, 0.3)';
            }}>
              <RefreshCw size={18} className={loading ? "spin" : ""} />
              Refresh
            </button>
            <button style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.8)', border: '1px solid #e5e5ea', borderRadius: '12px', color: '#000', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)' }} onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <Bell size={20} />
            </button>
            <button style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.8)', border: '1px solid #e5e5ea', borderRadius: '12px', color: '#000', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)' }} onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <User size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '1.5rem', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`, display: 'flex', alignItems: 'center', gap: '1rem', color: isDark ? '#fca5a5' : '#fca5a5', marginBottom: '2rem', borderRadius: '12px' }}>
            <AlertCircle size={24} />
            <div>
              <h3 style={{ margin: 0, color: isDark ? '#fff' : '#000' }}>Error Loading Tickets</h3>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.825rem' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Open Tickets', value: stats.open, color: '#007AFF', note: '📈 2 new today' },
              { label: 'High Priority', value: stats.highPriority, color: '#FF3B30', note: '🔴 Requires action' },
              { label: 'In Progress', value: stats.inProgress, color: '#5856D6', note: '🔵 Being worked on' },
              { label: 'Blocked', value: stats.blocked, color: '#FF9500', note: '⚠️ Needs review' }
            ].map((card, i) => (
              <div key={i} style={{
                backgroundColor: isDark ? 'rgba(25, 28, 50, 0.8)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                padding: '1.25rem',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)',
                borderLeft: `4px solid ${card.color}`,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                animation: `slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 0.1}s backwards`,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 32px rgba(0, 0, 0, 0.08)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                }}>
                <p style={{ margin: 0, opacity: 0.7, fontSize: '0.8rem', fontWeight: '600', color: isDark ? '#aaa' : '#666' }}>{card.label}</p>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: '700', color: card.color }}>{card.value}</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.7rem', opacity: 0.5, color: isDark ? '#aaa' : '#666' }}>{card.note}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search Bar */}
        {!loading && !error && tickets.length > 0 && (
          <div style={{ marginBottom: '1.5rem', animation: 'slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', color: isDark ? '#aaa' : '#666' }} />
              <input type="text" placeholder="Search tickets by ID, summary..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem', borderRadius: '10px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'}`, backgroundColor: isDark ? 'rgba(25, 28, 50, 0.5)' : 'rgba(255,255,255,0.8)', color: isDark ? '#fff' : '#000', fontSize: '0.85rem', boxSizing: 'border-box', backdropFilter: 'blur(8px)', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} onFocus={(e) => {
                e.currentTarget.style.borderColor = '#007AFF';
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(25, 28, 50, 0.8)' : 'rgba(255,255,255,0.95)';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 122, 255, 0.1)';
              }} onBlur={(e) => {
                e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea';
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(25, 28, 50, 0.5)' : 'rgba(255,255,255,0.8)';
                e.currentTarget.style.boxShadow = 'none';
              }} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'to-do', label: 'To Do' },
                  { id: 'in-progress', label: 'In Progress' },
                  { id: 'done', label: 'Done' },
                  { id: 'blocked', label: 'Blocked' },
                  { id: 'highest', label: 'Highest Priority' }
                ].map(filter => (
                  <button key={filter.id} onClick={() => setSelectedFilter(filter.id)} style={{
                    padding: '0.5rem 0.875rem',
                    borderRadius: '10px',
                    border: selectedFilter === filter.id ? '1px solid #007AFF' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'}`,
                    backgroundColor: selectedFilter === filter.id ? 'rgba(0, 122, 255, 0.1)' : isDark ? 'rgba(25, 28, 50, 0.5)' : 'rgba(255,255,255,0.8)',
                    color: selectedFilter === filter.id ? '#007AFF' : isDark ? '#fff' : '#000',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: selectedFilter === filter.id ? '600' : '500',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}
                    onMouseEnter={(e) => {
                      if (selectedFilter !== filter.id) {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)';
                        e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : '#d0d0d5';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = selectedFilter === filter.id ? 'rgba(0, 122, 255, 0.1)' : isDark ? 'rgba(25, 28, 50, 0.5)' : 'rgba(255,255,255,0.8)';
                      e.currentTarget.style.borderColor = selectedFilter === filter.id ? '2px solid #007AFF' : isDark ? 'rgba(255,255,255,0.1)' : '1px solid #e5e5ea';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}>
                    {filter.label}
                  </button>
                ))}
              </div>
              {selectedFilter === 'in-progress' && (
                <button onClick={() => setShowBulkCloseModal(true)} style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: '10px',
                  border: '1px solid #007AFF',
                  backgroundColor: 'rgba(0, 122, 255, 0.15)',
                  color: '#007AFF',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  boxShadow: '0 2px 8px rgba(0, 122, 255, 0.1)',
                  whiteSpace: 'nowrap'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                  ✓ Select All
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tickets */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <RefreshCw size={40} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : !error && filteredTickets.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: isDark ? 'rgba(25, 28, 50, 0.4)' : 'rgba(25, 28, 50, 0.4)', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: isDark ? '#fff' : '#000' }}>{tickets.length === 0 ? 'All Caught Up! 🎉' : 'No tickets match your search'}</h2>
            <p style={{ margin: '0.75rem 0 0 0', opacity: 0.6, color: isDark ? '#aaa' : '#666' }}>{tickets.length === 0 ? 'You have no active tickets assigned to you.' : 'Try adjusting your search or filters'}</p>
          </div>
        ) : (
          <div>
            <p style={{ opacity: 0.6, fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: '500', color: isDark ? '#aaa' : '#666' }}>
              Showing <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{filteredTickets.length}</span> of <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{tickets.length}</span> tickets
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.75rem' }}>
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
        onConfirm={handleBulkCloseConfirm}
        jiraConfig={jiraConfig}
      />
    </div>
  );
}
