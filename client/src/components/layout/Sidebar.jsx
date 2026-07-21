import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/db';

const NAV_ITEMS = [
  { tab: 'dashboard', label: 'Overview', svg: '<rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect>' },
  { tab: 'inventory', label: 'Inventory & Racks', svg: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>' },
  { tab: 'stock-in', label: 'Stock In (Supplies)', svg: '<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>' },
  { tab: 'stock-out-sf', label: 'Stock Out (Storefront)', svg: '<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>' },
  { tab: 'stock-out-client', label: 'Stock Out (Client)', svg: '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>' },
  { tab: 'conversion', label: 'Stock Conversion', svg: '<circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="9.8" y1="8.2" x2="20" y2="18.4"></line><line x1="9.8" y1="15.8" x2="20" y2="5.6"></line>' },
  { tab: 'adjustment', label: 'Stock Adjustment', svg: '<line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><circle cx="4" cy="12" r="2"></circle><circle cx="12" cy="10" r="2"></circle><circle cx="20" cy="14" r="2"></circle>' },
  { tab: 'suppliers', label: 'Suppliers', svg: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line>' },
  { tab: 'users', label: 'User Accounts', adminOnly: true, svg: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>' },
];

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.replace('/', '') || 'dashboard';

  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your session.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Logout',
      cancelButtonText: 'Cancel',
      background: '#0f172a',
      color: '#f3f4f6',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#6b7280',
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        navigate('/login');
      }
    });
  };

  const handleReset = () => {
    Swal.fire({
      title: 'Reset Database?',
      text: 'This will delete all inventory counts, orders, and logs. This cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reset Everything',
      cancelButtonText: 'Cancel',
      background: '#0f172a',
      color: '#f3f4f6',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    }).then(async (result) => {
      if (result.isConfirmed) {
        await api.reset();
        Swal.fire({
          icon: 'success',
          title: 'Reset Complete',
          text: 'Database has been reset to default values.',
          background: '#0f172a',
          color: '#f3f4f6',
          confirmButtonColor: '#6366f1',
        }).then(() => location.reload());
      }
    });
  };

  const roleConfig = {
    admin: { label: 'Administrator', initial: 'A', color: 'var(--primary)' },
    staff: { label: 'Stock Room Staff', initial: 'SR', color: 'var(--success)' },
    storefront: { label: 'Store Front Staff', initial: 'SF', color: 'var(--info)' },
  };
  const cfg = roleConfig[role] || roleConfig.admin;

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </div>
        <span className="logo-text">IMS Irene</span>
      </div>

      <nav>
        <ul className="nav-menu">
          {NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin').map((item) => (
            <li key={item.tab} className={`nav-item ${activeTab === item.tab ? 'active' : ''}`}>
              <button onClick={() => navigate(`/${item.tab}`)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: item.svg }} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="btn btn-secondary w-full" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }} onClick={handleLogout}>
          Logout
        </button>
        <button className="btn btn-secondary w-full" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }} onClick={handleReset}>
          Reset Database
        </button>
        <div className="user-badge">
          <div className="user-avatar" style={{ background: cfg.color }}>{cfg.initial}</div>
          <div className="user-info">
            <span className="user-name">{user?.username || 'Ms. Irene'}</span>
            <span className="user-role-label">{cfg.label}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
