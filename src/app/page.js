'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TicketCard from '@/components/TicketCard';
import BulkCloseModal from '@/components/BulkCloseModal';
import { AlertCircle, RefreshCw, Search, Bell, User, LogOut } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showBulkCloseModal, setShowBulkCloseModal] = useState(false);
  const [jiraConfig, setJiraConfig] = useState(null);

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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0e27' }}>
      <Sidebar onBulkCloseClick={() => setShowBulkCloseModal(true)} onLogout={handleLogout} />
      <main style={{ marginLeft: '280px', flex: 1, padding: '2.5rem', overflow: 'auto', backgroundColor: '#0f1729' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', margin: 0, fontWeight: '700', background: 'linear-gradient(to right, #fff, #a5f3fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Good Morning, Aviral! 👋</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.6, fontSize: '0.95rem' }}>Here's what's happening with your tickets today</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={fetchTickets} disabled={loading} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)' }}>
              <RefreshCw size={18} className={loading ? "spin" : ""} />
              Refresh
            </button>
            <button style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--foreground)', cursor: 'pointer' }}>
              <Bell size={20} />
            </button>
            <button style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--foreground)', cursor: 'pointer' }}>
              <User size={20} />
            </button>
          </div>
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

        {/* Summary Cards */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {[
              { label: 'Open Tickets', value: stats.open, color: 'var(--primary)', note: '📈 2 new today' },
              { label: 'High Priority', value: stats.highPriority, color: '#ef4444', note: '🔴 Requires action' },
              { label: 'In Progress', value: stats.inProgress, color: '#3b82f6', note: '🔵 Being worked on' },
              { label: 'Blocked', value: stats.blocked, color: '#f97316', note: '⚠️ Needs review' }
            ].map((card, i) => (
              <div key={i} style={{
                backgroundColor: 'rgba(25, 28, 50, 0.8)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                padding: '1.5rem',
                border: `1px solid rgba(255,255,255,0.08)`,
                borderLeft: `4px solid ${card.color}`,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}>
                <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem', fontWeight: '500' }}>{card.label}</p>
                <h3 style={{ margin: '0.75rem 0 0 0', fontSize: '2.75rem', fontWeight: '700', color: card.color }}>{card.value}</h3>
                <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.75rem', opacity: 0.5 }}>{card.note}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search Bar */}
        {!loading && !error && tickets.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input type="text" placeholder="Search tickets by ID, summary, assignee, labels..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '1rem 1.25rem 1rem 3rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(25, 28, 50, 0.6)', color: 'var(--foreground)', fontSize: '0.95rem', boxSizing: 'border-box', backdropFilter: 'blur(8px)' }} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'to-do', label: 'To Do' },
                { id: 'in-progress', label: 'In Progress' },
                { id: 'done', label: 'Done' },
                { id: 'blocked', label: 'Blocked' },
                { id: 'highest', label: 'Highest Priority' }
              ].map(filter => (
                <button key={filter.id} onClick={() => setSelectedFilter(filter.id)} style={{
                  padding: '0.625rem 1.125rem',
                  borderRadius: '8px',
                  border: selectedFilter === filter.id ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: selectedFilter === filter.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(25, 28, 50, 0.6)',
                  color: selectedFilter === filter.id ? 'var(--primary)' : 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: selectedFilter === filter.id ? '600' : '500',
                  transition: 'all 0.2s'
                }}>
                  {filter.label}
                </button>
              ))}
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
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{tickets.length === 0 ? 'All Caught Up! 🎉' : 'No tickets match your search'}</h2>
            <p style={{ margin: '0.75rem 0 0 0', opacity: 0.6 }}>{tickets.length === 0 ? 'You have no active tickets assigned to you.' : 'Try adjusting your search or filters'}</p>
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
