'use client';
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';

const getPriorityColor = (priority) => {
  if (!priority) return '#9ca3af';
  const name = priority.toLowerCase();
  if (name === 'highest') return '#ef4444';
  if (name === 'high') return '#f97316';
  if (name === 'medium') return '#eab308';
  if (name === 'low') return '#22c55e';
  return '#9ca3af';
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
  if (name.includes('done')) return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', dot: '✓' };
  if (name.includes('progress')) return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', dot: '🔵' };
  if (name.includes('review')) return { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', dot: '🟣' };
  if (name.includes('test')) return { bg: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', dot: '🩷' };
  if (name.includes('block')) return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', dot: '🔴' };
  return { bg: 'rgba(159, 168, 218, 0.1)', color: '#a78bfa', dot: '⚪' };
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

  const handleClose = () => {
    // Check if this is a "Start" transition (CREATE TICKET → IN PROGRESS)
    const currentStatus = ticket.fields.status.name.toLowerCase();
    if (currentStatus.includes('create') || currentStatus.includes('to do') || currentStatus.includes('backlog')) {
      setShowEstimateDialog(true);
    } else {
      // For other transitions (IN PROGRESS → DONE), proceed directly
      executeTransition('1h');
    }
  };

  const executeTransition = async (estimateValue) => {
    setIsClosing(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.key}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estimate: estimateValue,
          jiraConfig: jiraConfig
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close');
      
      setShowEstimateDialog(false);
      const currentStatus = ticket.fields.status.name.toLowerCase();
      if (currentStatus.includes('progress') || currentStatus === 'in progress') {
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
      executeTransition(estimate);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
      {isStale && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#f97316' }} />
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ticket.key}</span>
          <h3 style={{ marginTop: '0.25rem', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>{ticket.fields.summary}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: isStale ? '#f97316' : 'var(--foreground)', opacity: isStale ? 1 : 0.6 }}>
          <Clock size={14} />
          <span>{updatedDate.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Priority and Status Badges */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{
          padding: '0.375rem 0.75rem',
          backgroundColor: `${getPriorityColor(ticket.fields.priority?.name)}20`,
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: getPriorityColor(ticket.fields.priority?.name),
          border: `1px solid ${getPriorityColor(ticket.fields.priority?.name)}40`
        }}>
          {getPriorityLabel(ticket.fields.priority?.name)}
        </div>
        <div style={{
          padding: '0.375rem 0.75rem',
          backgroundColor: statusColor.bg,
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: statusColor.color,
          border: `1px solid ${statusColor.color}40`
        }}>
          {statusColor.dot} {ticket.fields.status.name}
        </div>
        <div style={{
          padding: '0.375rem 0.75rem',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: '500',
          color: 'var(--foreground)',
          opacity: 0.7
        }}>
          {ticket.fields.issuetype.name}
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          <XCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
        {isRecentlyClosed ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px', color: '#22c55e', fontWeight: '600', fontSize: '0.875rem' }}>
            ✓ Completed
          </div>
        ) : showEstimateDialog ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--foreground)', opacity: 0.8 }}>
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
                  padding: '0.625rem',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'var(--foreground)',
                  boxSizing: 'border-box',
                  fontSize: '0.875rem',
                  marginBottom: '0.75rem'
                }}
              />
              <p style={{ fontSize: '0.65rem', opacity: 0.6, margin: '0.5rem 0 0 0' }}>
                Format: 1h, 2d, 30m, 1.5h
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={handleConfirmEstimate}
                disabled={isClosing || !estimate.trim()}
              >
                {isClosing ? 'Starting...' : 'Start'}
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--foreground)' }}
                onClick={() => setShowEstimateDialog(false)}
                disabled={isClosing}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            onClick={handleClose}
            disabled={isClosing}
          >
            {isClosing ? 'Progressing...' : (
              <>
                <CheckCircle2 size={18} />
                One-Click Close
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
