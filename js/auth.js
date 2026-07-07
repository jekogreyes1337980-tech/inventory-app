// Handle login and register forms
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('login-error');
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        
        if (data.success) {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          window.location.href = 'index.html';
        } else {
          errorDiv.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <span>${data.error || 'Login failed'}</span>`;
          errorDiv.style.display = 'flex';
        }
      } catch (err) {
        errorDiv.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <span>Network error. Please try again later.</span>`;
        errorDiv.style.display = 'flex';
      }
    });
  }
  
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const role = document.getElementById('role').value;
      const errorDiv = document.getElementById('register-error');
      
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role })
        });
        const data = await response.json();
        
        if (data.success) {
          // Auto-login or redirect to login
          window.location.href = 'login.html';
        } else {
          errorDiv.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <span>${data.error || 'Registration failed'}</span>`;
          errorDiv.style.display = 'flex';
        }
      } catch (err) {
        errorDiv.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <span>Network error. Please try again later.</span>`;
        errorDiv.style.display = 'flex';
      }
    });
  }
});

// Protect index.html
function checkAuth() {
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    const user = localStorage.getItem('currentUser');
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return JSON.parse(user);
  }
  return null;
}

function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

const currentUser = checkAuth();
