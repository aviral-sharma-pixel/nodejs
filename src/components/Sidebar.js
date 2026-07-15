'use client';
import { LayoutDashboard, CheckSquare, Search, Calendar, Settings, LogOut } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Sidebar({ onBulkCloseClick, onLogout }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: CheckSquare, label: 'My Tickets', href: '/my-tickets' },
    { icon: Search, label: 'Search', href: '/search' },
    { icon: Calendar, label: 'Calendar', href: '/calendar' }
  ];

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };
  return (
    <div style={{
      width: '280px',
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      borderRight: '1px solid var(--card-border)',
      padding: '2rem 0',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      overflowY: 'auto'
    }}>
      {/* Logo */}
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <div style={{ backgroundColor: 'var(--primary)', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={20} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700' }}>Jira</h2>
            <p style={{ margin: 0, fontSize: '0.65rem', opacity: 0.6 }}>Assistant</p>
          </div>
        </div>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', opacity: 0.6 }}>Manage, Track, Close, Done</p>
      </div>

      {/* Main Navigation */}
      <nav style={{ marginBottom: '2rem' }}>
        {navItems.map((item, i) => {
          const active = isActive(item.href);
          return (
            <a
              key={i}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.875rem 1.5rem',
                backgroundColor: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                border: 'none',
                color: active ? 'var(--primary)' : 'var(--foreground)',
                opacity: active ? 1 : 0.7,
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: active ? '600' : '500',
                transition: 'all 0.2s',
                borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = active ? 'rgba(99, 102, 241, 0.15)' : 'transparent';
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Quick Actions */}
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: '600', opacity: 0.5, margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Quick Actions
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={() => onBulkCloseClick?.()} style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#fca5a5', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}>
            <CheckSquare size={16} /> Bulk Close
          </button>
        </div>
      </div>

      {/* Settings */}
      <div style={{ padding: '0 1.5rem', marginTop: 'auto', borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
        <button
          style={{
            width: '100%',
            padding: '0.75rem 0',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--foreground)',
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '0.75rem 0',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--foreground)',
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
