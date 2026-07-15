'use client';
import { LayoutDashboard, CheckSquare, Search, Calendar, Settings, LogOut } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Sidebar({ onBulkCloseClick, onLogout }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/', emoji: '📊' },
    { icon: CheckSquare, label: 'My Tickets', href: '/my-tickets', emoji: '✅' },
    { icon: Search, label: 'Search', href: '/search', emoji: '🔍' },
    { icon: Calendar, label: 'Calendar', href: '/calendar', emoji: '📅' }
  ];

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };
  return (
    <div style={{
      width: '280px',
      backgroundColor: 'rgba(255,255,255,0.7)',
      borderRight: '1px solid #e5e5ea',
      padding: '2rem 0',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      overflowY: 'auto',
      backdropFilter: 'blur(20px)'
    }}>
      {/* Logo */}
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <div style={{ backgroundColor: '#007AFF', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)' }}>
            <CheckSquare size={20} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700', color: '#000' }}>Jira</h2>
            <p style={{ margin: 0, fontSize: '0.65rem', opacity: 0.6, color: '#666' }}>Assistant</p>
          </div>
        </div>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', opacity: 0.6, color: '#666' }}>Manage, Track, Close, Done</p>
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
                backgroundColor: active ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
                border: 'none',
                color: active ? '#007AFF' : '#000',
                opacity: active ? 1 : 0.7,
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: active ? '600' : '500',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderLeft: active ? '3px solid #007AFF' : '3px solid transparent',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = active ? 'rgba(0, 122, 255, 0.1)' : 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{item.emoji}</span>
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
          <button onClick={() => onBulkCloseClick?.()} style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', borderRadius: '10px', color: '#FF3B30', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }} onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(255, 59, 48, 0.5)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 59, 48, 0.2)';
          }} onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 59, 48, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
          }}>
            <span style={{ fontSize: '1rem' }}>🚀</span>
            <CheckSquare size={16} /> Bulk Close
          </button>
        </div>
      </div>

      {/* Settings */}
      <div style={{ padding: '0 1.5rem', marginTop: 'auto', borderTop: '1px solid #e5e5ea', paddingTop: '1.5rem' }}>
        <button
          style={{
            width: '100%',
            padding: '0.75rem 0',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#000',
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          <span style={{ fontSize: '1rem' }}>⚙️</span>
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
            color: '#000',
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          <span style={{ fontSize: '1rem' }}>👋</span>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
