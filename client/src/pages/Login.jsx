import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/db';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.login(username, password);
      if (data.success) {
        login(data.user);
        navigate('/dashboard');
      } else {
        Swal.fire({ icon: 'error', title: 'Login Failed', text: data.error || 'Invalid credentials', background: '#0f172a', color: '#f3f4f6', confirmButtonColor: '#6366f1' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err?.error || 'Please try again later.', background: '#0f172a', color: '#f3f4f6', confirmButtonColor: '#6366f1' });
    }
  };

  return (
    <div className="auth-container">
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-icon" style={{ margin: '0 auto 15px', width: 40, height: 40, background: 'rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h2>IMS Irene</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sign in to your account</p>
        </div>

        <form id="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Enter your username" />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" />
          </div>
          <button type="submit" className="auth-btn">Sign In</button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
}
