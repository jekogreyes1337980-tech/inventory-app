// ============================================================
// ui.js - Toast Notifications & Shared UI Utilities
// ============================================================

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const ICONS = {
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    danger: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
  };

  const icon = ICONS[type] || ICONS.info;
  toast.innerHTML = `<div class="d-flex align-center gap-1">${icon}<div class="toast-message">${message}</div></div>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add("active"), 10);
  setTimeout(() => {
    toast.classList.remove("active");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function getRoleName(role) {
  const names = { admin: "Administrator", staff: "Stock Room Staff", storefront: "Store Front Staff" };
  return names[role] || role;
}

// ============================================================
// notifications.js - Notification Inbox Logic
// ============================================================

function pushNotification(title, message, role, linkData = null) {
  const notifs = DB.get("notifications") || [];
  notifs.unshift({
    id: "notif-" + Date.now(),
    title,
    message,
    timestamp: new Date().toISOString(),
    role,
    read: false,
    linkData
  });
  DB.set("notifications", notifs);
  updateNotificationIndicator();
  showToast(`${title} - Sent to ${getRoleName(role)}`, "info");
}

function updateNotificationIndicator() {
  const notifs = DB.get("notifications") || [];
  const unreadCount = notifs.filter(n => n.role === currentRole && !n.read).length;
  const dot = document.getElementById("notification-dot");
  dot.classList.toggle("active", unreadCount > 0);
}

function toggleNotificationInbox() {
  const backdrop = document.getElementById("notification-modal");
  const isActive = backdrop.classList.contains("active");
  if (!isActive) {
    backdrop.classList.add("active");
    renderNotificationInbox();
  } else {
    backdrop.classList.remove("active");
  }
}

function renderNotificationInbox() {
  const notifs = DB.get("notifications") || [];
  const roleNotifs = notifs.filter(n => n.role === currentRole);
  const container = document.getElementById("inbox-list-container");

  if (roleNotifs.length === 0) {
    container.innerHTML = '<div class="no-data">Your inbox is empty.</div>';
    return;
  }

  container.innerHTML = roleNotifs.map(n => {
    const isUnread = !n.read ? "unread" : "";
    const dateStr = new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="inbox-item ${isUnread}" onclick="markNotifRead('${n.id}')">
        <div class="inbox-item-header">
          <span class="inbox-item-title">${n.title}</span>
          <span class="inbox-item-time">${dateStr}</span>
        </div>
        <div class="inbox-item-body">${n.message}</div>
      </div>`;
  }).join("");
}

function markNotifRead(id) {
  const notifs = DB.get("notifications") || [];
  const updated = notifs.map(n => {
    if (n.id !== id) return n;
    n.read = true;
    if (n.linkData) {
      if (n.linkData.tab) switchTab(n.linkData.tab);
      if (n.linkData.supplyOrderId) {
        setTimeout(() => {
          const el = document.getElementById("supply-order-detail-select");
          if (el) { el.value = n.linkData.supplyOrderId; el.dispatchEvent(new Event("change")); }
        }, 100);
      }
      if (n.linkData.clientOrderId) {
        setTimeout(() => {
          const el = document.getElementById("client-order-detail-select");
          if (el) { el.value = n.linkData.clientOrderId; el.dispatchEvent(new Event("change")); }
        }, 100);
      }
    }
    return n;
  });
  DB.set("notifications", updated);
  updateNotificationIndicator();
  renderNotificationInbox();
}

function clearAllNotifications() {
  const notifs = DB.get("notifications") || [];
  const cleared = notifs.map(n => {
    if (n.role === currentRole) n.read = true;
    return n;
  });
  DB.set("notifications", cleared);
  updateNotificationIndicator();
  renderNotificationInbox();
}
