'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    theme: 'light',
    autoRefreshInterval: 30,
    notificationsEnabled: true,
    notifyHighPriority: true,
    notifyBlocked: true,
    notifyUpdates: true
  });
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const config = typeof window !== 'undefined' ? localStorage.getItem('jira_config') : null;
    if (!config) {
      router.push('/login');
      return;
    }

    const savedSettings = typeof window !== 'undefined' ? localStorage.getItem('app_settings') : null;
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.log('Failed to load settings');
      }
    }
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.style.backgroundColor = '#0a0e27';
      document.body.style.backgroundColor = '#0a0e27';
    } else {
      document.documentElement.style.backgroundColor = '#f5f5f7';
      document.body.style.backgroundColor = '#f5f5f7';
    }
  }, [settings.theme]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('jira_config');
    router.push('/login');
  };

  const isDark = settings.theme === 'dark';

  if (isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: isDark ? '#0a0e27' : '#f5f5f7' }}>
        <Sidebar onBulkCloseClick={() => {}} onLogout={handleLogout} />
        <main style={{ marginLeft: '280px', flex: 1, padding: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ animation: 'spin 1s linear infinite' }}>⟳</div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: isDark ? '#0a0e27' : '#f5f5f7', transition: 'background-color 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
      <Sidebar onBulkCloseClick={() => {}} onLogout={handleLogout} />
      <main style={{ marginLeft: '280px', flex: 1, padding: '2rem', overflow: 'auto', backgroundColor: isDark ? '#0f1729' : '#f5f5f7', transition: 'background-color 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem', animation: 'fadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
          <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: '700', color: isDark ? '#fff' : '#000' }}>⚙️ Settings</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.6, fontSize: '0.9rem', color: isDark ? '#aaa' : '#666' }}>Manage your preferences</p>
        </div>

        {/* Success Message */}
        {saved && (
          <div style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)',
            border: `1px solid ${isDark ? 'rgba(52, 199, 89, 0.4)' : 'rgba(52, 199, 89, 0.3)'}`,
            borderRadius: '12px',
            color: isDark ? '#86efac' : '#34C759',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            animation: 'slideInUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), slideOutDown 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 2.7s forwards'
          }}>
            ✓ Settings saved successfully
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>

          {/* Theme */}
          <div style={{
            backgroundColor: isDark ? 'rgba(25, 28, 50, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            borderRadius: '16px',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            padding: '1.5rem',
            backdropFilter: 'blur(20px)',
            animation: 'slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s backwards',
            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '700', color: isDark ? '#fff' : '#000' }}>🌙 Appearance</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['light', 'dark'].map(theme => (
                <button
                  key={theme}
                  onClick={() => handleSettingChange('theme', theme)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: settings.theme === theme ? '2px solid #007AFF' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    backgroundColor: settings.theme === theme ? 'rgba(0, 122, 255, 0.12)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                    color: isDark ? '#fff' : '#000',
                    fontWeight: settings.theme === theme ? '600' : '500',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    boxShadow: settings.theme === theme ? '0 4px 12px rgba(0, 122, 255, 0.15)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (settings.theme !== theme) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = settings.theme === theme ? '0 4px 12px rgba(0, 122, 255, 0.15)' : 'none';
                  }}
                >
                  {theme === 'light' ? '☀️ Light' : '🌙 Dark'}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Refresh */}
          <div style={{
            backgroundColor: isDark ? 'rgba(25, 28, 50, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            borderRadius: '16px',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            padding: '1.5rem',
            backdropFilter: 'blur(20px)',
            animation: 'slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s backwards',
            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '700', color: isDark ? '#fff' : '#000' }}>🔄 Auto-Refresh</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={settings.autoRefreshInterval}
                onChange={(e) => handleSettingChange('autoRefreshInterval', parseInt(e.target.value))}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  background: '#007AFF',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{
                padding: '0.5rem 0.875rem',
                backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
                borderRadius: '8px',
                color: '#007AFF',
                fontWeight: '600',
                fontSize: '0.85rem',
                minWidth: '55px',
                textAlign: 'center'
              }}>
                {settings.autoRefreshInterval}s
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div style={{
            backgroundColor: isDark ? 'rgba(25, 28, 50, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            borderRadius: '16px',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            padding: '1.5rem',
            backdropFilter: 'blur(20px)',
            animation: 'slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s backwards',
            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '700', color: isDark ? '#fff' : '#000' }}>🔔 Notifications</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { key: 'notificationsEnabled', label: '📢 All Notifications' },
                { key: 'notifyHighPriority', label: '🔴 High Priority' },
                { key: 'notifyBlocked', label: '🚫 Blocked' },
                { key: 'notifyUpdates', label: '📝 Updates' }
              ].map((notif) => (
                <label
                  key={notif.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '10px',
                    cursor: notif.key === 'notificationsEnabled' || settings.notificationsEnabled ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    opacity: notif.key !== 'notificationsEnabled' && !settings.notificationsEnabled ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (notif.key === 'notificationsEnabled' || settings.notificationsEnabled) {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: '500', color: isDark ? '#fff' : '#000' }}>{notif.label}</span>
                  <input
                    type="checkbox"
                    checked={settings[notif.key]}
                    onChange={(e) => handleSettingChange(notif.key, e.target.checked)}
                    disabled={notif.key !== 'notificationsEnabled' && !settings.notificationsEnabled}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: notif.key === 'notificationsEnabled' || settings.notificationsEnabled ? 'pointer' : 'not-allowed',
                      accentColor: '#007AFF'
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            style={{
              padding: '0.9rem 1.5rem',
              backgroundColor: '#007AFF',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              animation: 'slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s backwards'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 122, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.3)';
            }}
          >
            💾 Save Settings
          </button>
        </div>
      </main>
    </div>
  );
}
