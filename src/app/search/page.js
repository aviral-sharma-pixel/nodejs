'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TicketCard from '@/components/TicketCard';
import BulkCloseModal from '@/components/BulkCloseModal';
import { AlertCircle, RefreshCw, Search as SearchIcon } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !jiraConfig) return;

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
      
      // Filter based on search query
      const query = searchQuery.toLowerCase();
      const filtered = (data.issues || []).filter(t =>
        t.key.toLowerCase().includes(query) ||
        t.fields.summary.toLowerCase().includes(query)
      );
      setTickets(filtered);
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f7' }}>
      <Sidebar onBulkCloseClick={() => setShowBulkCloseModal(true)} onLogout={handleLogout} />
      <main style={{ marginLeft: '280px', flex: 1, padding: '2.5rem', overflow: 'auto', backgroundColor: '#f5f5f7' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem', animation: 'fadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
          <h1 style={{ fontSize: '2.25rem', margin: 0, fontWeight: '700', color: '#000' }}>Search Tickets 🔍</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.6, fontSize: '0.95rem', color: '#666' }}>Find tickets by ID or summary</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} style={{ marginBottom: '2rem', animation: 'slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
          <div style={{ position: 'relative', display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <SearchIcon size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', color: '#666' }} />
              <input 
                type="text" 
                placeholder="Search by ticket ID (e.g., DEVOPS-123) or summary..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '0.875rem 1.25rem 0.875rem 3rem', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e5ea', 
                  backgroundColor: 'rgba(255,255,255,0.8)', 
                  color: '#000', 
                  fontSize: '0.95rem', 
                  boxSizing: 'border-box', 
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#007AFF';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e5ea';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              style={{
                padding: '0.875rem 1.75rem',
                backgroundColor: searchQuery.trim() ? '#007AFF' : 'rgba(0, 122, 255, 0.5)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontWeight: '600',
                cursor: searchQuery.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: searchQuery.trim() ? '0 4px 15px rgba(0, 122, 255, 0.3)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (searchQuery.trim() && !loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 122, 255, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 122, 255, 0.3)';
              }}
            >
              {loading ? (
                <>
                  <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', display: 'flex', alignItems: 'center', gap: '1rem', color: '#FF3B30', marginBottom: '2rem', borderRadius: '12px' }}>
            <AlertCircle size={24} />
            <div>
              <h3 style={{ margin: 0, color: '#FF3B30' }}>Error</h3>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.825rem', color: '#FF3B30' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {searchQuery && !loading && !error && tickets.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '12px', border: '1px solid #e5e5ea', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#000' }}>No results found</h2>
            <p style={{ margin: '0.75rem 0 0 0', opacity: 0.6, color: '#666' }}>Try a different search term</p>
          </div>
        ) : searchQuery && tickets.length > 0 ? (
          <div>
            <p style={{ opacity: 0.6, fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: '500', color: '#666' }}>
              Found <span style={{ color: '#007AFF', fontWeight: '600' }}>{tickets.length}</span> ticket{tickets.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.75rem' }}>
              {tickets.map(ticket => (
                <TicketCard key={ticket.key} ticket={ticket} onStatusChange={handleTicketClosed} jiraConfig={jiraConfig} />
              ))}
            </div>
          </div>
        ) : !searchQuery ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '12px', border: '1px solid #e5e5ea', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#000' }}>Start searching</h2>
            <p style={{ margin: '0.75rem 0 0 0', opacity: 0.6, color: '#666' }}>Enter a ticket ID or summary above to search</p>
          </div>
        ) : null}
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
