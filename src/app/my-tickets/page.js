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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0e27' }}>
      <Sidebar onBulkCloseClick={() => setShowBulkCloseModal(true)} onLogout={handleLogout} />
      <main style={{ marginLeft: '280px', flex: 1, padding: '2.5rem', overflow: 'auto', backgroundColor: '#0f1729' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', margin: 0, fontWeight: '700', background: 'linear-gradient(to right, #fff, #a5f3fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>My Tickets 📋</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.6, fontSize: '0.95rem' }}>All tickets assigned to you</p>
        </div>

        {error && (
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '1rem', color: '#fca5a5', marginBottom: '2rem', borderRadius: '12px' }}>
            <AlertCircle size={24} />
            <div>
              <h3 style={{ margin: 0 }}>Error Loading Tickets</h3>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.825rem' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        {!loading && !error && tickets.length > 0 && (
          <div style={{ marginBottom: '2rem', marginTop: '2rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input 
                type="text" 
                placeholder="Search by ticket ID or summary..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '1rem 1.25rem 1rem 3rem', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  backgroundColor: 'rgba(25, 28, 50, 0.6)', 
                  color: 'var(--foreground)', 
                  fontSize: '0.95rem', 
                  boxSizing: 'border-box', 
                  backdropFilter: 'blur(8px)' 
                }} 
              />
            </div>
          </div>
        )}

        {/* Tickets */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <RefreshCw size={40} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : !error && filteredTickets.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: 'rgba(25, 28, 50, 0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>No tickets found</h2>
            <p style={{ margin: '0.75rem 0 0 0', opacity: 0.6 }}>{tickets.length === 0 ? 'You have no tickets assigned to you.' : 'Try adjusting your search'}</p>
          </div>
        ) : (
          <div>
            <p style={{ opacity: 0.6, fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: '500' }}>
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
