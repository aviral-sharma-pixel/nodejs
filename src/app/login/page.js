'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate inputs
      if (!formData.email || !formData.password) {
        throw new Error('Email and password are required');
      }

      // Test Jira connection with domain from env
      const testRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      if (!testRes.ok) {
        const data = await testRes.json();
        throw new Error(data.error || 'Failed to verify Jira credentials');
      }

      // Save credentials to localStorage
      localStorage.setItem('jira_config', JSON.stringify({
        email: formData.email,
        password: formData.password
      }));

      setSuccess(true);
      
      // Redirect after success
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0e27',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        backgroundColor: '#0f1729',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '2.5rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{
            backgroundColor: 'var(--primary)',
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
            marginBottom: '1rem'
          }}>
            <span style={{ fontSize: '1.75rem' }}>📋</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>Jira Assistant</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.6, fontSize: '0.875rem' }}>Manage, Track, Close, Done</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{
              padding: '0.875rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.875rem'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '0.875rem',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              color: '#86efac',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.875rem'
            }}>
              <CheckCircle2 size={18} />
              Login successful! Redirecting...
            </div>
          )}

          {/* Email */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: 'var(--foreground)'
            }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="your.email@company.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading || success}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(25, 28, 50, 0.6)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                transition: 'all 0.2s'
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: 'var(--foreground)'
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Your Jira password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading || success}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(25, 28, 50, 0.6)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                transition: 'all 0.2s'
              }}
            />
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', opacity: 0.5 }}>
              Your Jira password (stored only locally)
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            style={{
              padding: '0.875rem',
              marginTop: '0.5rem',
              backgroundColor: 'var(--primary)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: loading || success ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
              transition: 'all 0.2s',
              opacity: loading || success ? 0.7 : 1
            }}
          >
            {loading ? 'Verifying...' : success ? 'Logged In!' : 'Login to Jira'}
          </button>
        </form>

        {/* Info */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: '0.75rem',
          opacity: 0.6,
          lineHeight: '1.6'
        }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            ℹ️ Your Jira credentials are stored <strong>only in your browser</strong> (localStorage) and never sent to any server.
          </p>
          <p style={{ margin: 0 }}>
            🔐 Your credentials are used to authenticate with your Jira server for ticket management.
          </p>
        </div>
      </div>
    </div>
  );
}
