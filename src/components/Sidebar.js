'use client';
import { Settings, LogOut, CheckSquare, LayoutDashboard, Ticket, Search, Calendar, Bell, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Sidebar({ onBulkCloseClick, onLogout, isDark }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const alertCount = 3; 

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'My Tickets', href: '/my-tickets', icon: Ticket },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Alerts', href: '/alerts', icon: Bell, badge: alertCount }
  ];

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const bg = isDark ? '#0b0f19' : 'rgba(255, 255, 255, 0.95)';
  const textMuted = isDark ? 'rgba(255,255,255,0.6)' : '#666';
  const textActive = isDark ? '#fff' : '#000';
  const activeBg = isDark ? 'rgba(88, 86, 214, 0.15)' : 'rgba(0, 122, 255, 0.1)';
  const activeBorder = isDark ? '#5e5ce6' : '#007AFF';
  const gradient = 'linear-gradient(135deg, #FF2D55 0%, #5856D6 100%)';

  const springTransition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  const smoothTransition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  return (
    <>
      <style>{`
        @keyframes sidebarSlideIn {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes navItemFadeUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 15px rgba(255,255,255,0.4), inset 0 0 8px rgba(255,255,255,0.2); }
          50% { box-shadow: 0 0 25px rgba(255,255,255,0.6), inset 0 0 12px rgba(255,255,255,0.4); }
          100% { box-shadow: 0 0 15px rgba(255,255,255,0.4), inset 0 0 8px rgba(255,255,255,0.2); }
        }
      `}</style>
      
      <div style={{
        width: '220px',
        backgroundColor: bg,
        border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e5e5ea',
        borderRadius: '24px',
        margin: '1rem',
        height: 'calc(100vh - 2rem)',
        position: 'fixed',
        left: 0,
        top: 0,
        overflowY: 'auto',
        backdropFilter: 'blur(20px)',
        boxShadow: isDark ? '0 10px 40px rgba(0, 0, 0, 0.5)' : '0 10px 40px rgba(0, 0, 0, 0.05)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, sans-serif',
        opacity: mounted ? 1 : 0,
        animation: mounted ? 'sidebarSlideIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'none'
      }}>
        {/* ── Top Header with vibrant gradient ── */}
        <div style={{
          flexShrink: 0,
          background: 'linear-gradient(135deg, #FF007A 0%, #0044FF 100%)',
          padding: '1.5rem 1rem 1rem 1rem',
          marginBottom: '0.75rem',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
            {/* Logo icon box with subtle pulse animation */}
            <div style={{ 
              width: '36px', height: '36px',
              borderRadius: '10px', 
              background: 'transparent',
              border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulseGlow 3s infinite ease-in-out'
            }}>
              <CheckSquare size={18} color="#fff" strokeWidth={2.5} />
            </div>
            <div style={{ 
              opacity: 0,
              animation: mounted ? 'navItemFadeUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'none',
              animationDelay: '0.2s'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#fff', letterSpacing: '0.5px', lineHeight: 1.1 }}>
                Jira
              </h2>
              <p style={{ margin: 0, fontSize: '0.55rem', color: 'rgba(255,255,255,0.85)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
                Assistant
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Navigation ── */}
        <nav style={{ padding: '0 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item, i) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <a
                key={i}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '10px',
                  backgroundColor: active ? activeBg : 'transparent',
                  border: 'none',
                  color: active ? textActive : textMuted,
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: active ? '600' : '500',
                  transition: springTransition,
                  cursor: 'pointer',
                  position: 'relative',
                  opacity: 0,
                  animation: mounted ? 'navItemFadeUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'none',
                  animationDelay: `${0.3 + (i * 0.08)}s`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(6px)';
                  if (!active) {
                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.color = textActive;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.backgroundColor = active ? activeBg : 'transparent';
                  e.currentTarget.style.color = active ? textActive : textMuted;
                }}
              >
                {/* Active Left Border Glow */}
                {active && (
                  <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', backgroundColor: activeBorder, borderRadius: '0 4px 4px 0', boxShadow: isDark ? `0 0 10px ${activeBorder}` : 'none', transition: smoothTransition }} />
                )}
                
                <Icon size={16} color={active ? (isDark ? activeBorder : '#007AFF') : 'currentColor'} style={{ transition: smoothTransition }} />
                
                <span style={{ flex: 1, transition: smoothTransition }}>{item.label}</span>

                {/* Notification Badge */}
                {item.badge > 0 && (
                  <div style={{ backgroundColor: '#FF2D55', color: '#fff', fontSize: '0.6rem', fontWeight: '700', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(255,45,85,0.4)' }}>
                    {item.badge}
                  </div>
                )}
              </a>
            );
          })}
        </nav>

        {/* ── Quick Actions ── */}
        <div style={{ 
          padding: '0.75rem 1rem', 
          borderTop: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)', 
          marginTop: '0.5rem',
          opacity: 0,
          animation: mounted ? 'navItemFadeUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'none',
          animationDelay: '0.7s'
        }}>
          <p style={{ fontSize: '0.55rem', fontWeight: '700', color: isDark ? '#5e5ce6' : '#007AFF', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Quick Actions
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {onBulkCloseClick && (
              <button onClick={() => onBulkCloseClick?.()} style={{ 
                padding: '0.6rem', 
                background: gradient,
                border: 'none', 
                borderRadius: '10px', 
                color: '#fff', 
                fontWeight: '600', 
                fontSize: '0.8rem', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '0.4rem', 
                transition: springTransition, 
                boxShadow: isDark ? '0 4px 15px rgba(255, 45, 85, 0.3)' : '0 4px 10px rgba(255, 45, 85, 0.2)'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = isDark ? '0 8px 25px rgba(255, 45, 85, 0.5)' : '0 6px 15px rgba(255, 45, 85, 0.3)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = isDark ? '0 4px 15px rgba(255, 45, 85, 0.3)' : '0 4px 10px rgba(255, 45, 85, 0.2)';
              }} onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
              }}>
                <CheckSquare size={16} /> Bulk Close
              </button>
            )}
          </div>
        </div>

        {/* ── Settings / Logout ── */}
        <div style={{ 
          padding: '0 0.75rem', 
          marginTop: 'auto',
          opacity: 0,
          animation: mounted ? 'navItemFadeUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'none',
          animationDelay: '0.8s'
        }}>
          <a href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', color: textMuted, textDecoration: 'none', fontSize: '0.8rem', fontWeight: '500', transition: smoothTransition }}
            onMouseEnter={(e) => { e.currentTarget.style.color = textActive; e.currentTarget.style.transform = 'translateX(4px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = textMuted; e.currentTarget.style.transform = 'translateX(0)'; }}
          >
            <Settings size={16} /> <span>Settings</span>
          </a>
          <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', backgroundColor: 'transparent', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500', transition: smoothTransition, marginBottom: '0.5rem' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FF2D55'; e.currentTarget.style.transform = 'translateX(4px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = textMuted; e.currentTarget.style.transform = 'translateX(0)'; }}
          >
            <LogOut size={16} /> <span>Logout</span>
          </button>
        </div>

        {/* ── User Profile Block ── */}
        <div style={{ 
          padding: '0 0.75rem 0.75rem 0.75rem',
          opacity: 0,
          animation: mounted ? 'navItemFadeUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'none',
          animationDelay: '0.9s'
        }}>
          <div style={{ 
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', 
            border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
            borderRadius: '12px', 
            padding: '0.6rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            cursor: 'pointer',
            transition: springTransition
          }}
          onMouseEnter={(e) => { 
            e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 16px rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => { 
            e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(1px)'; }}
          >
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '0.8rem', transition: smoothTransition }}>
                AS
              </div>
              {/* Online dot */}
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#34C759', border: `2px solid ${isDark ? '#141824' : '#fff'}` }} />
            </div>
            {/* User Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: textActive, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Aviral Sharma</p>
              <p style={{ margin: 0, fontSize: '0.55rem', color: textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>aviral.sharma@girnarsoft.com</p>
            </div>
            <ChevronDown size={14} color={textMuted} />
          </div>
        </div>
      </div>
    </>
  );
}
