'use client';
import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BulkCloseModal({ isOpen, tickets, onClose, onConfirm, jiraConfig }) {
  const [selectedTickets, setSelectedTickets] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTickets({});
      setError(null);
    }
  }, [isOpen]);

  const handleSelectAll = (checked) => {
    const newSelected = {};
    if (checked) {
      tickets.forEach(ticket => {
        newSelected[ticket.key] = true;
      });
    }
    setSelectedTickets(newSelected);
  };

  const handleSelectTicket = (key, checked) => {
    const newSelected = { ...selectedTickets };
    if (checked) {
      newSelected[key] = true;
    } else {
      delete newSelected[key];
    }
    setSelectedTickets(newSelected);
  };

  const handleConfirm = async () => {
    if (Object.keys(selectedTickets).length === 0) {
      setError('Please select at least one ticket');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const selectedKeys = Object.keys(selectedTickets);
      // Only process open tickets (filter out already closed ones)
      const openTicketsToClose = selectedKeys.filter(key => {
        const ticket = tickets.find(t => t.key === key);
        return ticket && !ticket.fields.status.name.toLowerCase().includes('done');
      });

      let successCount = 0;
      let failCount = 0;
      const errors = [];

      // Process tickets sequentially with a small delay between each
      for (const key of openTicketsToClose) {
        try {
          // For bulk close, we need to make multiple transitions to reach Done
          // Keep trying transitions until ticket reaches Done status
          let ticketDone = false;
          let maxAttempts = 5; // Max transitions to prevent infinite loops
          
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const res = await fetch(`/api/tickets/${key}/transition`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                estimate: '1h',
                isBulkClose: true,
                jiraConfig: jiraConfig
              })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
              // If error, stop trying and count as failure
              errors.push(`${key}: ${data.error || 'Unknown error'}`);
              break;
            }
            
            // Give Jira a moment to process the transition
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // For Done status, we're done with this ticket
            if (data.isDone === true) {
              ticketDone = true;
              successCount++;
              break;
            }
            
            // If no error but also no isDone flag and this is the last attempt
            if (attempt === maxAttempts - 1) {
              successCount++;
              break;
            }
          }
          
          if (!ticketDone && maxAttempts > 0) {
            // Ticket might still be done, assume success if we made transitions
            // (the endpoint will indicate if ticket is done)
          }
        } catch (err) {
          failCount++;
          errors.push(`${key}: ${err.message}`);
        }
        
        // Small delay between tickets
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (onConfirm) {
        onConfirm(openTicketsToClose);
      }

      if (errors.length > 0) {
        setError(`✓ Closed: ${successCount} | ✗ Failed: ${failCount}\n${errors.slice(0, 3).join('\n')}`);
      } else if (successCount > 0) {
        setError(`✓ Successfully closed ${successCount} ticket${successCount > 1 ? 's' : ''}`);
      }

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const selectedCount = Object.keys(selectedTickets).length;
  const openTickets = tickets.filter(t => !t.fields.status.name.toLowerCase().includes('done'));
  const openTicketCount = openTickets.length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: '#0f1729',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Bulk Close Tickets</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer', opacity: 0.7 }} onMouseEnter={(e) => e.target.style.opacity = '1'} onMouseLeave={(e) => e.target.style.opacity = '0.7'}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {error && (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Select All */}
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={(e) => handleSelectAll(e.target.checked !== false && !e.target.checked)}>
            <input
              type="checkbox"
              checked={selectedCount === openTicketCount && openTicketCount > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <label style={{ cursor: 'pointer', flex: 1, margin: 0, fontWeight: '600', fontSize: '0.875rem' }}>
              Select All ({selectedCount}/{openTicketCount})
            </label>
          </div>

          {/* Tickets List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tickets.filter(t => !t.fields.status.name.toLowerCase().includes('done')).map(ticket => (
              <div
                key={ticket.key}
                style={{
                  padding: '1rem',
                  backgroundColor: selectedTickets[ticket.key] ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedTickets[ticket.key] ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleSelectTicket(ticket.key, !selectedTickets[ticket.key])}
              >
                <input
                  type="checkbox"
                  checked={selectedTickets[ticket.key] || false}
                  onChange={(e) => handleSelectTicket(ticket.key, e.target.checked)}
                  style={{ marginTop: '0.25rem', cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: 'var(--primary)' }}>{ticket.key}</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>{ticket.fields.summary}</p>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', fontSize: '0.75rem', opacity: 0.6 }}>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                      {ticket.fields.status.name}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'var(--foreground)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || selectedCount === 0}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: selectedCount > 0 ? 'var(--primary)' : 'rgba(99, 102, 241, 0.5)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              cursor: selectedCount > 0 && !isProcessing ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: selectedCount > 0 ? '0 4px 14px 0 rgba(99, 102, 241, 0.39)' : 'none',
              transition: 'all 0.2s',
              opacity: isProcessing ? 0.7 : 1
            }}
          >
            {isProcessing ? (
              <>
                <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Close ({selectedCount})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
