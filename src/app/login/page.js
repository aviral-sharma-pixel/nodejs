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
      backgroundColor: '#f5f5f7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'linear-gradient(135deg, #f5f5f7 0%, #ffffff 100%)',
      animation: 'fadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.5)',
        padding: '2.5rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(20px)',
        animation: 'slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '2rem', textAlign: 'center', animation: 'slideInDown 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
          <div style={{
            backgroundColor: '#007AFF',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)',
            marginBottom: '1rem',
            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 122, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 122, 255, 0.3)';
          }}>
            <span style={{ fontSize: '1.75rem' }}>📋</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#000' }}>Jira Assistant</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.6, fontSize: '0.875rem', color: '#666' }}>Manage, Track, Close, Done</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{
              padding: '0.875rem',
              backgroundColor: 'rgba(255, 59, 48, 0.1)',
              border: '1px solid rgba(255, 59, 48, 0.3)',
              borderRadius: '12px',
              color: '#FF3B30',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.875rem',
              animation: 'slideInUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '0.875rem',
              backgroundColor: 'rgba(52, 199, 89, 0.1)',
              border: '1px solid rgba(52, 199, 89, 0.3)',
              borderRadius: '12px',
              color: '#34C759',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.875rem',
              animation: 'slideInUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}>
              <CheckCircle2 size={18} />
              Login successful! Redirecting...
            </div>
          )}

          {/* Email */}
          <div style={{ animation: 'slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s backwards' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#000'
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
                borderRadius: '12px',
                border: '1px solid #e5e5ea',
                backgroundColor: 'rgba(255,255,255,0.8)',
                color: '#000',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                cursor: loading || success ? 'not-allowed' : 'text',
                opacity: loading || success ? 0.6 : 1
              }}
              onFocus={(e) => {
                if (!loading && !success) {
                  e.currentTarget.style.borderColor = '#007AFF';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e5ea';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password */}
          <div style={{ animation: 'slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s backwards' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#000'
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
                borderRadius: '12px',
                border: '1px solid #e5e5ea',
                backgroundColor: 'rgba(255,255,255,0.8)',
                color: '#000',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                cursor: loading || success ? 'not-allowed' : 'text',
                opacity: loading || success ? 0.6 : 1
              }}
              onFocus={(e) => {
                if (!loading && !success) {
                  e.currentTarget.style.borderColor = '#007AFF';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e5ea';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', opacity: 0.6, color: '#666' }}>
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
              backgroundColor: '#007AFF',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: loading || success ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)',
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              opacity: loading || success ? 0.7 : 1,
              animation: 'slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s backwards'
            }}
            onMouseEnter={(e) => {
              if (!loading && !success) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 122, 255, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 122, 255, 0.3)';
            }}
          >
            {loading ? 'Verifying...' : success ? 'Logged In!' : 'Login to Jira'}
          </button>
        </form>

        {/* Info */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          fontSize: '0.75rem',
          opacity: 0.6,
          lineHeight: '1.6',
          color: '#666',
          animation: 'fadeIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s backwards'
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
