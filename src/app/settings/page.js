'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { RefreshCw, Moon, Sun, Save, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(30);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('app_settings') : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const timer = setTimeout(() => {
          setIsDark(parsed.theme === 'dark');
          setAutoRefresh(parsed.autoRefreshInterval || 30);
        }, 0);
        // Apply theme immediately
        document.documentElement.style.backgroundColor = parsed.theme === 'dark' ? '#0a0e27' : '#f5f5f7';
        document.body.style.backgroundColor = parsed.theme === 'dark' ? '#0a0e27' : '#f5f5f7';
        return () => clearTimeout(timer);
      } catch { /* ignore */ }
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    setError(null);
    try {
      const newSettings = {
        theme: isDark ? 'dark' : 'light',
        autoRefreshInterval: Number(autoRefresh) || 30,
      };
      localStorage.setItem('app_settings', JSON.stringify(newSettings));
      // Apply theme instantly
      const dark = newSettings.theme === 'dark';
      document.documentElement.style.backgroundColor = dark ? '#0a0e27' : '#f5f5f7';
      document.body.style.backgroundColor = dark ? '#0a0e27' : '#f5f5f7';
    } catch (e) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleTheme = () => setIsDark(prev => !prev);

  // theme tokens for consistency with rest of app
  const pageBg = isDark ? '#0f1729' : '#f5f5f7';
  const cardBg = isDark ? 'rgba(25,28,50,0.8)' : 'rgba(255,255,255,0.7)';
  const border = isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)';
  const textPrimary = isDark ? '#fff' : '#000';
  const textMuted = isDark ? '#aaa' : '#666';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: pageBg }}>
      <Sidebar onLogout={() => { localStorage.removeItem('jira_config'); router.push('/login'); }} isDark={isDark} />

      <main style={{ marginLeft: '260px', flex: 1, padding: '2rem', overflow: 'auto', backgroundColor: pageBg }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', animation: 'fadeIn 0.4s' }}>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '700', color: textPrimary }}>Settings ⚙️</h1>
          <p style={{ marginTop: '0.25rem', opacity: 0.6, fontSize: '0.85rem', color: textMuted }}>Customize your Jira Assistant experience</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '1rem 1.25rem', backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5', marginBottom: '1.5rem', borderRadius: '12px', fontSize: '0.875rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Settings Card */}
        <div style={{ backgroundColor: cardBg, backdropFilter: 'blur(20px)', borderRadius: '16px', padding: '2rem', border, maxWidth: '480px', animation: 'slideInUp 0.4s' }}>
          {/* Theme toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isDark ? <Moon size={20} color={textPrimary} /> : <Sun size={20} color={textPrimary} />}
              <span style={{ fontSize: '1rem', fontWeight: '600', color: textPrimary }}>Theme</span>
            </div>
            <button onClick={toggleTheme} style={{ padding: '0.45rem 1rem', backgroundColor: isDark ? '#007AFF' : '#0f1729', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}>
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Auto‑refresh interval */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.95rem', fontWeight: '600', color: textPrimary }}>Auto‑Refresh Interval (seconds)</label>
            <input
              type="number"
              min="5"
              value={autoRefresh}
              onChange={e => setAutoRefresh(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : '#e5e5ea'}`, backgroundColor: isDark ? 'rgba(25,28,50,0.5)' : 'rgba(255,255,255,0.8)', color: textPrimary, fontSize: '0.9rem' }}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '0.6rem 1.5rem', backgroundColor: '#007AFF', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '600', fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,122,255,0.3)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </main>
    </div>
  );
}
