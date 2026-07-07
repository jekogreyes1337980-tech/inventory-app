import { api } from '../../api/db';
import Modal from '../shared/Modal';

export default function NotificationInbox({ isOpen, onClose, notifications, currentRole, onRefresh }) {
  const handleMarkRead = async (id) => {
    const notifs = await api.get('notifications');
    const updated = (notifs || []).map((n) => {
      if (n.id === id) n.read = true;
      return n;
    });
    await api.set('notifications', updated);
    onRefresh();
  };

  const handleClearAll = async () => {
    const notifs = await api.get('notifications');
    const cleared = (notifs || []).map((n) => {
      if (n.role === currentRole) n.read = true;
      return n;
    });
    await api.set('notifications', cleared);
    onRefresh();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Handoff Notifications Inbox"
      footer={
        <>
          <button className="btn btn-secondary" onClick={handleClearAll}>Mark All Checked</button>
          <button className="btn btn-primary" onClick={onClose}>Close Inbox</button>
        </>
      }
    >
      <div className="inbox-list">
        {notifications.length === 0 ? (
          <div className="no-data">Your inbox is empty.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`inbox-item ${!n.read ? 'unread' : ''}`}
              onClick={() => handleMarkRead(n.id)}
            >
              <div className="inbox-item-header">
                <span className="inbox-item-title">{n.title}</span>
                <span className="inbox-item-time">
                  {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="inbox-item-body">{n.message}</div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
