import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/db';
import { socket } from '../../api/socket';
import { ToastProvider } from '../shared/Toast';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationInbox from '../modals/NotificationInbox';

export default function ProtectedLayout() {
  const { user, loading, logout } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const verifiedRef = useRef(false);

  const currentRole = user?.role || 'admin';

  const loadNotifications = useCallback(async () => {
    const notifs = await api.get('notifications');
    setNotifications(notifs || []);
  }, []);

  useEffect(() => {
    if (!user || verifiedRef.current) { setVerifying(false); return; }
    verifiedRef.current = true;
    api.verify(user.username).then((data) => {
      if (!data.valid) logout();
      setVerifying(false);
    }).catch(() => {
      setVerifying(false);
    });
  }, [user, logout]);

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const handleDataUpdate = (key) => {
      if (key === 'notifications') loadNotifications();
    };
    
    const handleReset = () => {
      loadNotifications();
    };

    socket.on('data_updated', handleDataUpdate);
    socket.on('data_reset', handleReset);
    return () => {
      socket.off('data_updated', handleDataUpdate);
      socket.off('data_reset', handleReset);
    };
  }, [user, loadNotifications]);

  if (loading || verifying) return null;
  if (!user) return <Navigate to="/login" replace />;

  const roleNotifs = notifications.filter((n) => n.role === currentRole);
  const unreadCount = roleNotifs.filter((n) => !n.read).length;

  return (
    <ToastProvider>
      <div className="app-container">
        {/* Glow orbs */}
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>

        <Sidebar />
        <main className="main-content">
          <Header unreadCount={unreadCount} onBellClick={() => setShowInbox(true)} />
          <div className="workspace">
            <Outlet context={{ role: currentRole, user, notifications, loadNotifications }} />
          </div>
        </main>

        <NotificationInbox
          isOpen={showInbox}
          onClose={() => setShowInbox(false)}
          notifications={roleNotifs}
          currentRole={currentRole}
          onRefresh={loadNotifications}
        />
      </div>
    </ToastProvider>
  );
}
