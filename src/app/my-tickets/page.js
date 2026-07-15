'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TicketCard from '@/components/TicketCard';
import BulkCloseModal from '@/components/BulkCloseModal';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [jiraConfig, setJiraConfig] = useState(null);
  const [showBulkCloseModal, setShowBulkCloseModal] = useState(false);
  const [settings, setSettings] = useState(null);
  const [isDark, setIsDark] = useState(false);

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

    // Load settings and apply theme
    const savedSettings = typeof window !== 'undefined' ? localStorage.getItem('app_settings') : null;
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

  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const query = searchQuery.toLowerCase();
    return tickets.filter(t =>
      t.key.toLowerCase().includes(query) ||
      t.fields.summary.toLowerCase().includes(query)
    );
  }, [tickets, searchQuery]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: isDark ? '#0a0e27' : '#f5f5f7' }}>
      <Sidebar onBulkCloseClick={() => setShowBulkCloseModal(true)} onLogout={handleLogout} />
      <main style={{ marginLeft: '280px', flex: 1, padding: '2.5rem', overflow: 'auto', backgroundColor: isDark ? '#0f1729' : '#f5f5f7' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem', animation: 'fadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
          <h1 style={{ fontSize: '2.25rem', margin: 0, fontWeight: '700', color: isDark ? '#fff' : '#000' }}>My Tickets 📋</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.6, fontSize: '0.95rem', color: isDark ? '#aaa' : '#666' }}>All tickets assigned to you</p>
        </div>

        {error && (
          <div style={{ padding: '1.5rem', backgroundColor: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)', border: `1px solid ${isDark ? 'rgba(255, 59, 48, 0.4)' : 'rgba(255, 59, 48, 0.3)'}`, display: 'flex', alignItems: 'center', gap: '1rem', color: '#FF3B30', marginBottom: '2rem', borderRadius: '12px' }}>
            <AlertCircle size={24} />
            <div>
              <h3 style={{ margin: 0, color: isDark ? '#ff7b72' : '#FF3B30' }}>Error Loading Tickets</h3>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.825rem' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        {!loading && !error && tickets.length > 0 && (
          <div style={{ marginBottom: '2rem', marginTop: '2rem', animation: 'slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', color: isDark ? '#aaa' : '#666' }} />
              <input 
                type="text" 
                placeholder="Search by ticket ID or summary..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '0.875rem 1.25rem 0.875rem 3rem', 
                  borderRadius: '12px', 
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea'}`, 
                  backgroundColor: isDark ? 'rgba(25, 28, 50, 0.5)' : 'rgba(255,255,255,0.8)', 
                  color: isDark ? '#fff' : '#000', 
                  fontSize: '0.95rem', 
                  boxSizing: 'border-box', 
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#007AFF';
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(25, 28, 50, 0.8)' : 'rgba(255,255,255,0.95)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e5e5ea';
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(25, 28, 50, 0.5)' : 'rgba(255,255,255,0.8)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Tickets */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <RefreshCw size={40} color="#007AFF" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : !error && filteredTickets.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: isDark ? 'rgba(25, 28, 50, 0.4)' : 'rgba(255,255,255,0.7)', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e5ea', boxShadow: isDark ? 'none' : '0 2px 10px rgba(0, 0, 0, 0.04)' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: isDark ? '#fff' : '#000' }}>No tickets found</h2>
            <p style={{ margin: '0.75rem 0 0 0', opacity: 0.6, color: isDark ? '#aaa' : '#666' }}>{tickets.length === 0 ? 'You have no tickets assigned to you.' : 'Try adjusting your search'}</p>
          </div>
        ) : (
          <div>
            <p style={{ opacity: 0.6, fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: '500', color: isDark ? '#aaa' : '#666' }}>
              Showing <span style={{ color: '#007AFF', fontWeight: '600' }}>{filteredTickets.length}</span> of <span style={{ color: '#007AFF', fontWeight: '600' }}>{tickets.length}</span> tickets
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
