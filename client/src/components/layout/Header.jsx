import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  dashboard: 'Inventory Dashboard',
  inventory: 'Current Product Inventory & Rack Positions',
  'stock-in': 'Stock In - Supply Orders',
  'stock-out-sf': 'Stock Out - Store Front',
  'stock-out-client': 'Stock Out - Big Client',
  conversion: 'Stock Conversion',
  adjustment: 'Stock Adjustments',
  suppliers: 'Supplier Management',
  users: 'User Account Management',
};

export default function Header({ unreadCount, onBellClick }) {
  const location = useLocation();
  const tab = location.pathname.replace('/', '') || 'dashboard';
  const title = PAGE_TITLES[tab] || 'Inventory Dashboard';

  return (
    <header className="header-nav">
      <div className="page-title-container">
        <h1 id="header-page-title">{title}</h1>
      </div>
      <div className="header-controls">
        <button className="notification-bell-btn" onClick={onBellClick} aria-label="Toggle notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {unreadCount > 0 && <span className="notification-dot active"></span>}
        </button>
      </div>
    </header>
  );
}
