'use client';
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';

const getPriorityColor = (priority) => {
  if (!priority) return '#8E8E93';
  const name = priority.toLowerCase();
  if (name === 'highest') return '#FF3B30';
  if (name === 'high') return '#FF9500';
  if (name === 'medium') return '#FFCC00';
  if (name === 'low') return '#34C759';
  return '#8E8E93';
};

const getPriorityLabel = (priority) => {
  if (!priority) return 'No Priority';
  if (priority.toLowerCase() === 'highest') return '🔴 Highest';
  if (priority.toLowerCase() === 'high') return '🟠 High';
  if (priority.toLowerCase() === 'medium') return '🟡 Medium';
  if (priority.toLowerCase() === 'low') return '🟢 Low';
  return priority;
};

const getStatusColor = (status) => {
  const name = status.toLowerCase();
  if (name.includes('done')) return { bg: 'rgba(52, 199, 89, 0.1)', color: '#34C759', dot: '✓' };
  if (name.includes('progress')) return { bg: 'rgba(0, 122, 255, 0.1)', color: '#007AFF', dot: '🔵' };
  if (name.includes('review')) return { bg: 'rgba(88, 86, 214, 0.1)', color: '#5856D6', dot: '🟣' };
  if (name.includes('test')) return { bg: 'rgba(255, 45, 85, 0.1)', color: '#FF2D55', dot: '🩷' };
  if (name.includes('block')) return { bg: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', dot: '🔴' };
  return { bg: 'rgba(142, 142, 147, 0.1)', color: '#8E8E93', dot: '⚪' };
};

export default function TicketCard({ ticket, onStatusChange, jiraConfig }) {
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState(null);
  const [showEstimateDialog, setShowEstimateDialog] = useState(false);
  const [estimate, setEstimate] = useState('1h');

  const updatedDate = new Date(ticket.fields.updated);
  const isStale = (new Date() - updatedDate) > 7 * 24 * 60 * 60 * 1000;
  const isRecentlyClosed = ticket.fields.status.name.toLowerCase().includes('done');
  const statusColor = getStatusColor(ticket.fields.status.name);

  const handleClose = async () => {
    const currentStatus = ticket.fields.status.name.toLowerCase();
    
    // If already in progress, go straight to Done
    if (currentStatus.includes('progress')) {
      executeTransition('1h', true);
      return;
    }
    
    // If in CREATE/TO DO/BACKLOG, need estimate for Start transition
    if (currentStatus.includes('create') || currentStatus.includes('to do') || currentStatus.includes('backlog')) {
      setShowEstimateDialog(true);
    } else {
      // For any other status, try to transition to Done
      executeTransition('1h', true);
    }
  };

  const executeTransition = async (estimateValue, skipDialog = false) => {
    setIsClosing(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.key}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estimate: estimateValue,
          jiraConfig: jiraConfig,
          isBulkClose: skipDialog // Use full close workflow if skipDialog is true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close');
      
      setShowEstimateDialog(false);
      
      // Check if ticket is done
      if (data.isDone) {
        // Ticket is fully closed, trigger parent update
        setTimeout(() => {
          onStatusChange(ticket.key);
        }, 500);
      } else {
        // Ticket is now In Progress, trigger update to show new status
        setTimeout(() => {
          onStatusChange(ticket.key);
        }, 500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsClosing(false);
    }
  };

  const handleConfirmEstimate = () => {
    if (estimate.trim()) {
      executeTransition(estimate, true); // true = full close workflow after start
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)', animation: 'fadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)' }} onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'rgba(0, 122, 255, 0.3)';
      e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 122, 255, 0.1)';
      e.currentTarget.style.transform = 'translateY(-4px)';
    }} onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.04)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}>
      {isStale && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#FF9500' }} />
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.65rem', color: '#007AFF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ticket.key}</span>
          <h3 style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: '600', margin: 0, color: '#000' }}>{ticket.fields.summary}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: isStale ? '#FF9500' : '#666', opacity: isStale ? 1 : 0.6 }}>
          <Clock size={12} />
          <span>{updatedDate.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Priority and Status Badges */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <div style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: `${getPriorityColor(ticket.fields.priority?.name)}20`,
          borderRadius: '4px',
          fontSize: '0.65rem',
          fontWeight: '600',
          color: getPriorityColor(ticket.fields.priority?.name),
          border: `1px solid ${getPriorityColor(ticket.fields.priority?.name)}40`
        }}>
          {getPriorityLabel(ticket.fields.priority?.name)}
        </div>
        <div style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: statusColor.bg,
          borderRadius: '4px',
          fontSize: '0.65rem',
          fontWeight: '600',
          color: statusColor.color,
          border: `1px solid ${statusColor.color}40`
        }}>
          {statusColor.dot} {ticket.fields.status.name}
        </div>
        <div style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          fontSize: '0.65rem',
          fontWeight: '500',
          color: 'var(--foreground)',
          opacity: 0.7
        }}>
          {ticket.fields.issuetype.name}
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          <XCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--card-border)' }}>
        {isRecentlyClosed ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px', color: '#22c55e', fontWeight: '600', fontSize: '0.75rem' }}>
            ✓ Completed
          </div>
        ) : showEstimateDialog ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', marginBottom: '0.25rem', color: '#000', opacity: 0.8 }}>
                Original Estimate
              </label>
              <input
                type="text"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="e.g., 1h, 2d, 30m"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e5ea',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  color: '#000',
                  boxSizing: 'border-box',
                  fontSize: '0.8rem',
                  marginBottom: '0.5rem',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#007AFF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e5ea';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <p style={{ fontSize: '0.6rem', opacity: 0.6, margin: '0', color: '#666' }}>
                Format: 1h, 2d, 30m, 1.5h
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                onClick={handleConfirmEstimate}
                disabled={isClosing || !estimate.trim()}
                onMouseEnter={(e) => {
                  if (!isClosing && estimate.trim()) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isClosing ? 'Starting...' : 'Start'}
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.8)', color: '#000', border: '1px solid #e5e5ea', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                onClick={() => setShowEstimateDialog(false)}
                disabled={isClosing}
                onMouseEnter={(e) => {
                  if (!isClosing) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
            onClick={handleClose}
            disabled={isClosing}
            onMouseEnter={(e) => {
              if (!isClosing) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isClosing ? 'Closing...' : (
              <>
                <CheckCircle2 size={16} />
                One-Click Close
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
