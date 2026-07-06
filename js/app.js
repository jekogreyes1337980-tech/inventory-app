// State Management - LocalStorage Database Wrapper
const DB = {
  get(key) {
    try {
      const data = localStorage.getItem(`inv_sys_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Error reading localStorage key: " + key, e);
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`inv_sys_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error("Error writing localStorage key: " + key, e);
    }
  },
  init() {
    if (!this.get("products")) {
      this.set("products", window.DEFAULT_INVENTORY_DATA.products);
      this.set("racks", window.DEFAULT_INVENTORY_DATA.racks);
      this.set("suppliers", window.DEFAULT_INVENTORY_DATA.suppliers);
      this.set("supplyOrders", []);
      this.set("storefrontRequests", []);
      this.set("clientOrders", []);
      this.set("conversions", []);
      this.set("adjustments", []);
      this.set("notifications", [
        {
          id: "notif-1",
          title: "System Initialized",
          message: "Welcome to Ms. Irene's Inventory Management Simulator. Switch roles to simulate workflows.",
          timestamp: new Date().toISOString(),
          role: "admin",
          read: false
        }
      ]);
    }
  },
  reset() {
    localStorage.clear();
    this.init();
    showToast("Database has been reset to default mock values.", "info");
    location.reload();
  }
};

// Global App State Variables
let currentRole = "admin"; // 'admin', 'staff' (Stock Room Staff), 'storefront' (Store Front Staff)
let activeTab = "dashboard";

// DOMContentLoaded Entry Point
document.addEventListener("DOMContentLoaded", () => {
  DB.init();
  setupRoleSwitcher();
  setupTabNavigation();
  setupFormHandlers();
  
  // Initial renders
  renderAllViews();
  updateNotificationIndicator();
  
  // Set default timeline state display
  document.getElementById("supply-order-detail-card").style.display = "none";
  document.getElementById("client-order-detail-card").style.display = "none";
});

// Toast notification helper
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  // Icon based on type
  let icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  if (type === "success") {
    icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  } else if (type === "warning" || type === "danger") {
    icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
  }
  
  toast.innerHTML = `
    <div class="d-flex align-center gap-1">
      ${icon}
      <div class="toast-message">${message}</div>
    </div>
  `;
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add("active"), 10);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove("active");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Notification triggers
function pushNotification(title, message, role, linkData = null) {
  const notifs = DB.get("notifications") || [];
  const newNotif = {
    id: "notif-" + Date.now(),
    title,
    message,
    timestamp: new Date().toISOString(),
    role,
    read: false,
    linkData
  };
  notifs.unshift(newNotif);
  DB.set("notifications", notifs);
  updateNotificationIndicator();
  showToast(`${title} - Sent to ${getRoleName(role)}`, "info");
}

function getRoleName(role) {
  if (role === "admin") return "Administrator";
  if (role === "staff") return "Stock Room Staff";
  if (role === "storefront") return "Store Front Staff";
  return role;
}

// Handle notification indicators
function updateNotificationIndicator() {
  const notifs = DB.get("notifications") || [];
  const unreadCount = notifs.filter(n => n.role === currentRole && !n.read).length;
  const dot = document.getElementById("notification-dot");
  if (unreadCount > 0) {
    dot.classList.add("active");
  } else {
    dot.classList.remove("active");
  }
}

// Open / Close notification inbox modal
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
  
  let html = "";
  roleNotifs.forEach(n => {
    const isUnread = !n.read ? "unread" : "";
    const dateStr = new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    html += `
      <div class="inbox-item ${isUnread}" onclick="markNotifRead('${n.id}')">
        <div class="inbox-item-header">
          <span class="inbox-item-title">${n.title}</span>
          <span class="inbox-item-time">${dateStr}</span>
        </div>
        <div class="inbox-item-body">${n.message}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function markNotifRead(id) {
  const notifs = DB.get("notifications") || [];
  const updated = notifs.map(n => {
    if (n.id === id) {
      n.read = true;
      // Handle navigation shortcuts from linkData if present
      if (n.linkData) {
        if (n.linkData.tab) {
          switchTab(n.linkData.tab);
        }
        if (n.linkData.supplyOrderId) {
          setTimeout(() => {
            const selectEl = document.getElementById("supply-order-detail-select");
            if (selectEl) {
              selectEl.value = n.linkData.supplyOrderId;
              selectEl.dispatchEvent(new Event("change"));
            }
          }, 100);
        }
        if (n.linkData.clientOrderId) {
          setTimeout(() => {
            const selectEl = document.getElementById("client-order-detail-select");
            if (selectEl) {
              selectEl.value = n.linkData.clientOrderId;
              selectEl.dispatchEvent(new Event("change"));
            }
          }, 100);
        }
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

// Role Toggler setup
function setupRoleSwitcher() {
  const selector = document.getElementById("role-selector");
  selector.addEventListener("change", (e) => {
    currentRole = e.target.value;
    
    // Update user badge
    const badgeText = document.getElementById("user-role-text");
    const avatar = document.getElementById("user-avatar-initial");
    
    if (currentRole === "admin") {
      badgeText.innerText = "Administrator";
      avatar.innerText = "A";
      avatar.style.background = "var(--primary)";
    } else if (currentRole === "staff") {
      badgeText.innerText = "Stock Room Staff";
      avatar.innerText = "SR";
      avatar.style.background = "var(--success)";
    } else if (currentRole === "storefront") {
      badgeText.innerText = "Store Front Staff";
      avatar.innerText = "SF";
      avatar.style.background = "var(--info)";
    }
    
    showToast(`Switched view to: ${getRoleName(currentRole)}`, "success");
    updateNotificationIndicator();
    renderAllViews();
  });
}

// Tabs setup
function setupTabNavigation() {
  const navButtons = document.querySelectorAll(".nav-item");
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  activeTab = tabName;
  
  // Toggle sidebar items active state
  document.querySelectorAll(".nav-item").forEach(item => {
    if (item.getAttribute("data-tab") === tabName) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Toggle tab panel visibility
  document.querySelectorAll(".tab-panel").forEach(panel => {
    if (panel.id === `${tabName}-tab`) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });

  renderAllViews();
}

// Global render router
function renderAllViews() {
  updateRoleDynamicDisplay();
  
  switch (activeTab) {
    case "dashboard":
      renderDashboardView();
      break;
    case "inventory":
      renderInventoryView();
      break;
    case "stock-in":
      renderStockInView();
      break;
    case "stock-out-sf":
      renderStockOutSFView();
      break;
    case "stock-out-client":
      renderStockOutClientView();
      break;
    case "conversion":
      renderConversionView();
      break;
    case "adjustment":
      renderAdjustmentView();
      break;
  }
}

// Toggles visual sections based on current role permissions
function updateRoleDynamicDisplay() {
  document.querySelectorAll("[data-role-only]").forEach(el => {
    const rolesAllowed = el.getAttribute("data-role-only").split(",");
    if (rolesAllowed.includes(currentRole)) {
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });
}

/* ==========================================================================
   VIEW RENDERERS
   ========================================================================== */

// 1. Dashboard View
function renderDashboardView() {
  const products = DB.get("products") || [];
  const supplyOrders = DB.get("supplyOrders") || [];
  const storefrontRequests = DB.get("storefrontRequests") || [];
  const conversions = DB.get("conversions") || [];

  // Metrics
  // Low stocks
  const lowStocks = products.filter(p => {
    // If it's a roll, we check storefront piece qty, if it's pcs we check combined storefrontQty
    return p.storefrontQty < p.threshold;
  });
  
  document.getElementById("metric-low-stock").innerText = lowStocks.length;
  
  // Active Supply Orders (Not closed, not refunded)
  const activeSupplies = supplyOrders.filter(so => so.status !== "Closed" && so.status !== "Closed (Refunded)");
  document.getElementById("metric-active-supplies").innerText = activeSupplies.length;

  // Total Stock Conversions logged
  document.getElementById("metric-conversions").innerText = conversions.length;

  // Role Alert box render
  const alertsContainer = document.getElementById("dashboard-role-alerts");
  let alertsHtml = "";
  
  if (currentRole === "admin") {
    // Admin alerts: orders requiring checking, pending requests
    const checkingCount = supplyOrders.filter(so => so.status === "Staff Checked").length;
    if (checkingCount > 0) {
      alertsHtml += `
        <div class="glass-card discrepancy-card d-flex align-center justify-between">
          <div>
            <h4 style="color: var(--danger)">Verify Received Deliveries</h4>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              There are ${checkingCount} supply order deliveries marked completed by Stock Staff waiting for discrepancy checks.
            </p>
          </div>
          <button class="btn btn-danger btn-sm" onclick="switchTab('stock-in')">Go to Verify</button>
        </div>
      `;
    }
    
    // Low storefront stocks
    if (lowStocks.length > 0) {
      alertsHtml += `
        <div class="glass-card d-flex align-center justify-between" style="border-color: var(--warning-glow);">
          <div>
            <h4 style="color: var(--warning)">Low Store Front Stock Warning</h4>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              ${lowStocks.length} storefront items are running below threshold levels. Request Stock Room to bring stock out.
            </p>
          </div>
          <button class="btn btn-warning btn-sm" onclick="switchTab('stock-out-sf')">Request Restock</button>
        </div>
      `;
    }
  } else if (currentRole === "staff") {
    // Stock Staff Alerts: Supply orders pending confirmations
    const confirmationCount = supplyOrders.filter(so => so.status === "For Staff Confirmation" || so.status === "Reviewed Discrepancy (Correction)").length;
    if (confirmationCount > 0) {
      alertsHtml += `
        <div class="glass-card d-flex align-center justify-between" style="border-color: var(--primary-glow)">
          <div>
            <h4 style="color: var(--primary)">Deliveries to Confirm</h4>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              You have ${confirmationCount} supply orders pending delivery verification and rack storage.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="switchTab('stock-in')">Log Deliveries</button>
        </div>
      `;
    }

    const pendingAdjustments = (DB.get("adjustments") || []).filter(a => a.status === "Requested");
    if (pendingAdjustments.length > 0) {
      alertsHtml += `
        <div class="glass-card d-flex align-center justify-between" style="border-color: var(--info-glow)">
          <div>
            <h4 style="color: var(--info)">Inventory Adjustment Requests</h4>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              Admin has requested ${pendingAdjustments.length} stock collections / storages.
            </p>
          </div>
          <button class="btn btn-info btn-sm" onclick="switchTab('adjustment')">View Adjustments</button>
        </div>
      `;
    }
  } else if (currentRole === "storefront") {
    // Storefront alerts: Client order check
    const clientOrders = DB.get("clientOrders") || [];
    const pendingChecks = clientOrders.filter(co => co.status === "Pending Store Front Check");
    if (pendingChecks.length > 0) {
      alertsHtml += `
        <div class="glass-card d-flex align-center justify-between" style="border-color: var(--success-glow)">
          <div>
            <h4 style="color: var(--success)">Verification of Big Client Orders</h4>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              There are ${pendingChecks.length} orders set aside by Stock Room Staff waiting for final completeness verification.
            </p>
          </div>
          <button class="btn btn-success btn-sm" onclick="switchTab('stock-out-client')">Inspect Orders</button>
        </div>
      `;
    }
  }
  
  if (alertsHtml === "") {
    alertsHtml = '<div class="no-data">No immediate actions required for your current role.</div>';
  }
  alertsContainer.innerHTML = alertsHtml;

  // Active supply orders summary table
  const activeSupplyTableBody = document.getElementById("active-supplies-table-body");
  if (activeSupplies.length === 0) {
    activeSupplyTableBody.innerHTML = '<tr><td colspan="5" class="no-data">No active supply orders.</td></tr>';
  } else {
    let trs = "";
    activeSupplies.forEach(so => {
      let badgeClass = "badge-indigo";
      if (so.status === "For Staff Confirmation") badgeClass = "badge-warning";
      if (so.status === "Staff Checked") badgeClass = "badge-info";
      if (so.status.includes("Reviewed")) badgeClass = "badge-danger";
      
      const date = new Date(so.dateCreated).toLocaleDateString();
      trs += `
        <tr>
          <td><strong>${so.id}</strong></td>
          <td>${so.supplier}</td>
          <td>${date}</td>
          <td><span class="badge ${badgeClass}">${so.status}</span></td>
          <td><button class="btn btn-secondary btn-sm" onclick="viewSupplyOrderTimeline('${so.id}')">View Flow</button></td>
        </tr>
      `;
    });
    activeSupplyTableBody.innerHTML = trs;
  }
}

function viewSupplyOrderTimeline(id) {
  switchTab("stock-in");
  setTimeout(() => {
    const select = document.getElementById("supply-order-detail-select");
    if (select) {
      select.value = id;
      select.dispatchEvent(new Event("change"));
    }
  }, 100);
}

// 2. Inventory / Racks View
function renderInventoryView() {
  const products = DB.get("products") || [];
  const tableBody = document.getElementById("inventory-table-body");
  
  let rows = "";
  products.forEach(p => {
    const isLow = p.storefrontQty < p.threshold;
    const lowWarning = isLow ? `<span class="badge badge-danger">Low Stock</span>` : `<span class="badge badge-success">OK</span>`;
    
    // Display unit strings clearly
    const stockRoomUnit = p.unit === "rolls/meters" ? "meters" : "pcs";
    const storefrontUnit = p.unit === "rolls/meters" ? "pcs (pre-cut)" : "pcs";
    
    rows += `
      <tr>
        <td>
          <div style="font-weight: 600;">${p.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${p.category}</div>
        </td>
        <td><strong>${p.stockRoomQty}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">${stockRoomUnit}</span></td>
        <td>
          <strong>${p.storefrontQty}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">${storefrontUnit}</span>
          <div style="margin-top:0.25rem;">${lowWarning}</div>
        </td>
        <td>
          ${p.racks.map(r => `<span class="badge badge-indigo">${r}</span>`).join(" ")}
        </td>
        <td>₱${p.cost.toFixed(2)}</td>
        <td>₱${p.price.toFixed(2)}</td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = rows;
}

// 3. Stock In View (Supply Orders & Handoffs)
function renderStockInView() {
  const products = DB.get("products") || [];
  const suppliers = DB.get("suppliers") || [];
  const supplyOrders = DB.get("supplyOrders") || [];

  // Dropdown list update (Select supply order to view details/timeline)
  const orderSelect = document.getElementById("supply-order-detail-select");
  const previousVal = orderSelect.value;
  orderSelect.innerHTML = '<option value="">-- Choose a Supply Order --</option>';
  
  supplyOrders.forEach(so => {
    const opt = document.createElement("option");
    opt.value = so.id;
    opt.text = `${so.id} [${so.supplier}] - Status: ${so.status}`;
    orderSelect.appendChild(opt);
  });
  
  if (previousVal && Array.from(orderSelect.options).some(o => o.value === previousVal)) {
    orderSelect.value = previousVal;
  }

  // Populate supplier select in Admin creation form
  const supplierSelect = document.getElementById("supply-order-supplier");
  supplierSelect.innerHTML = "";
  suppliers.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.text = s;
    supplierSelect.appendChild(opt);
  });

  // Populate products checklist in Admin creation form
  const productsGrid = document.getElementById("supply-order-products-grid");
  productsGrid.innerHTML = "";
  products.forEach(p => {
    const unitText = p.unit === "rolls/meters" ? "meters" : "pcs";
    productsGrid.innerHTML += `
      <div class="input-grid-item">
        <input type="checkbox" id="chk-order-prod-${p.id}" value="${p.id}" onchange="toggleOrderProductQtyInput('${p.id}')">
        <label for="chk-order-prod-${p.id}" class="input-grid-name">${p.name} (${unitText})</label>
        <input type="number" id="qty-order-prod-${p.id}" placeholder="Qty" min="1" disabled class="input-grid-qty">
      </div>
    `;
  });
}

function toggleOrderProductQtyInput(id) {
  const checkbox = document.getElementById(`chk-order-prod-${id}`);
  const qtyInput = document.getElementById(`qty-order-prod-${id}`);
  qtyInput.disabled = !checkbox.checked;
  if (checkbox.checked) {
    qtyInput.value = 10; // default value
    qtyInput.focus();
  } else {
    qtyInput.value = "";
  }
}

// Render selected supply order details (Timeline + Action Cards)
function onSupplyOrderSelected() {
  const select = document.getElementById("supply-order-detail-select");
  const orderId = select.value;
  const card = document.getElementById("supply-order-detail-card");
  
  if (!orderId) {
    card.style.display = "none";
    return;
  }
  
  card.style.display = "";
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  // 1. Render Table Details
  const itemsTbody = document.getElementById("supply-order-items-tbody");
  let itemsRows = "";
  order.items.forEach(item => {
    const recQty = item.receivedQty !== null ? item.receivedQty : "-";
    const rack = item.rackLocation ? item.rackLocation : "-";
    
    // Highlight discrepancy
    let rowStyle = "";
    let statusBadge = `<span class="badge badge-muted">Pending</span>`;
    
    if (order.status !== "Draft" && order.status !== "Ordered" && order.status !== "For Staff Confirmation") {
      if (item.receivedQty !== item.orderedQty) {
        rowStyle = "background-color: rgba(239, 68, 68, 0.05); color: #f87171;";
        statusBadge = `<span class="discrepancy-badge">Discrepancy</span>`;
      } else {
        statusBadge = `<span class="badge badge-success">Match</span>`;
      }
    }
    
    itemsRows += `
      <tr style="${rowStyle}">
        <td><strong>${item.productName}</strong></td>
        <td>${item.orderedQty}</td>
        <td>${recQty}</td>
        <td><span class="badge badge-indigo">${rack}</span></td>
        <td>${statusBadge}</td>
      </tr>
    `;
  });
  itemsTbody.innerHTML = itemsRows;

  // 2. Render Custom Workflow Timeline
  renderSupplyTimeline(order);

  // 3. Render Role Actions
  renderSupplyRoleActions(order);
}

function renderSupplyTimeline(order) {
  const steps = [
    { key: "created", title: "Supply Order Drafted", desc: "Admin initialized the supply order." },
    { key: "ordered", title: "Forwarded to Staff", desc: "Order forwarded to Stock Staff to confirm delivery." },
    { key: "staffChecked", title: "Deliveries Received & Racked", desc: "Stock Staff inputted delivery quantities & rack positions." },
    { key: "checked", title: "Discrepancies Checked", desc: "Admin verified matching counts vs ordered amounts." },
    { key: "closed", title: "Stock Process Closed", desc: "Inventory updated. Discrepancies resolved or archived." }
  ];

  const container = document.getElementById("supply-timeline-stepper");
  container.innerHTML = "";

  // Map state status to timeline step numbers
  let activeStepIdx = 0;
  if (order.status === "Draft") activeStepIdx = 0;
  else if (order.status === "Ordered" || order.status === "For Staff Confirmation" || order.status.includes("Correction")) activeStepIdx = 1;
  else if (order.status === "Staff Checked") activeStepIdx = 2;
  else if (order.status === "Reviewed Discrepancy") activeStepIdx = 3;
  else if (order.status.startsWith("Closed")) activeStepIdx = 4;

  steps.forEach((step, idx) => {
    let stateClass = ""; // active, completed, discrepancy
    if (idx < activeStepIdx) {
      stateClass = "completed";
    } else if (idx === activeStepIdx) {
      stateClass = "active";
      if (order.status.includes("Discrepancy")) {
        stateClass = "discrepancy";
      }
    }
    
    // Custom timeline desc based on actions
    let stepDesc = step.desc;
    if (idx === 4 && order.status === "Closed (Refunded)") {
      stepDesc = "Order completed with discrepancies tagged as REFUNDED.";
      stateClass = "discrepancy";
    } else if (idx === 4 && order.status === "Closed") {
      stepDesc = "Order closed successfully. Stock levels updated.";
    }

    container.innerHTML += `
      <div class="timeline-step ${stateClass}">
        <div class="timeline-bullet">${idx + 1}</div>
        <div class="timeline-content">
          <div class="timeline-title">
            <span>${step.title}</span>
            ${idx === activeStepIdx ? `<span class="badge badge-indigo">Active</span>` : ""}
          </div>
          <div class="timeline-desc">${stepDesc}</div>
        </div>
      </div>
    `;
  });
}

function renderSupplyRoleActions(order) {
  const panel = document.getElementById("supply-order-actions-panel");
  panel.innerHTML = "";

  // 1. ADMIN ACTIONS
  if (currentRole === "admin") {
    if (order.status === "Draft") {
      panel.innerHTML = `
        <h4>Admin Options</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Forward this order to the Stock Room Staff for product validation upon arrival.</p>
        <button class="btn btn-primary" onclick="adminForwardSupplyOrder('${order.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          Forward to Stock Room Staff
        </button>
      `;
    } else if (order.status === "Staff Checked") {
      // Discrepancy checking interface
      const discrepancies = order.items.filter(item => item.orderedQty !== item.receivedQty);
      const discCount = discrepancies.length;
      
      let checkAlert = "";
      if (discCount > 0) {
        checkAlert = `
          <div class="glass-card discrepancy-card" style="margin-bottom:1rem; padding: 1rem;">
            <h5 style="color:var(--danger); display:flex; align-items:center; gap:0.5rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Discrepancies Detected!
            </h5>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">
              Stock staff records show a mismatch on ${discCount} products.
            </p>
          </div>
        `;
      } else {
        checkAlert = `
          <div class="glass-card" style="margin-bottom:1rem; padding: 1rem; border-color: var(--success-glow); background: rgba(16, 185, 129, 0.03);">
            <h5 style="color:var(--success); display:flex; align-items:center; gap:0.5rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Quantities Match Perfect
            </h5>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">
              All ordered units were successfully delivered and shelved.
            </p>
          </div>
        `;
      }

      panel.innerHTML = `
        <h4>Verification Check (Administrator)</h4>
        ${checkAlert}
        <div class="d-flex gap-2">
          ${discCount === 0 
            ? `<button class="btn btn-success" onclick="adminCloseSupplyOrder('${order.id}')">Close Stock In</button>`
            : `
              <button class="btn btn-success" onclick="adminCloseSupplyOrder('${order.id}')">Close Stock (Accept Anyway)</button>
              <button class="btn btn-danger" onclick="adminOpenDiscrepancyReview('${order.id}')">Resolve Discrepancy</button>
            `
          }
        </div>
      `;
    } else if (order.status === "Reviewed Discrepancy") {
      panel.innerHTML = `
        <h4>Discrepancy Review Panel</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Select supplier settlement action:</p>
        <div class="d-flex gap-2">
          <button class="btn btn-warning" onclick="adminSettleRefund('${order.id}')">Supplier Refunded Order</button>
          <button class="btn btn-primary" onclick="adminSettleCorrection('${order.id}')">Supplier Corrects Next Shipment</button>
        </div>
      `;
    } else if (order.status.startsWith("Closed")) {
      panel.innerHTML = `
        <div class="d-flex align-center gap-1" style="color: var(--text-muted);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          <span>This stock-in process is fully complete and closed.</span>
        </div>
      `;
    } else {
      panel.innerHTML = `
        <div class="d-flex align-center gap-1" style="color: var(--text-muted);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          <span>Awaiting confirmation inputs from Stock Room Staff...</span>
        </div>
      `;
    }
  } 
  
  // 2. STAFF ACTIONS (Stock Room Staff)
  else if (currentRole === "staff") {
    if (order.status === "For Staff Confirmation" || order.status === "Reviewed Discrepancy (Correction)") {
      // Inputs for received quantities and racks
      const racks = DB.get("racks") || [];
      let inputRows = "";
      
      order.items.forEach(item => {
        inputRows += `
          <div class="input-grid-item">
            <span class="input-grid-name">${item.productName} <span style="font-size:0.75rem; color:var(--text-muted);">(Ordered: ${item.orderedQty})</span></span>
            <input type="number" id="rec-qty-${item.productId}" value="${item.orderedQty}" min="0" class="input-grid-qty" placeholder="Rec Qty">
            <select id="rec-rack-${item.productId}" class="input-grid-rack">
              ${racks.map(r => `<option value="${r}">${r}</option>`).join("")}
            </select>
          </div>
        `;
      });

      panel.innerHTML = `
        <h4>Record Delivered Stocks (Stock Room Staff)</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Input actual counts received and choose storage racks:</p>
        <div style="margin-bottom: 1.25rem;">
          ${inputRows}
        </div>
        <button class="btn btn-success" onclick="staffSubmitDeliveries('${order.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Forward to Admin for Checking
        </button>
      `;
    } else if (order.status === "Staff Checked") {
      panel.innerHTML = `
        <div class="d-flex align-center gap-1" style="color: var(--text-muted);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          <span>Deliveries recorded. Awaiting administrator discrepancies checks...</span>
        </div>
      `;
    } else {
      panel.innerHTML = `
        <div class="d-flex align-center gap-1" style="color: var(--text-muted);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          <span>This order is not currently requiring Stock Staff action.</span>
        </div>
      `;
    }
  }
  
  // 3. STORE FRONT ACTIONS
  else {
    panel.innerHTML = `
      <div class="d-flex align-center gap-1" style="color: var(--text-muted);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>Stock In workflow is managed exclusively by Admins and Stock Room Staff.</span>
      </div>
    `;
  }
}

// 4. Stock Out (Store Front) View
function renderStockOutSFView() {
  const products = DB.get("products") || [];
  const requests = DB.get("storefrontRequests") || [];
  
  // Populate storefront low warning list
  const lowWarningContainer = document.getElementById("sf-low-stock-warnings");
  const lowProducts = products.filter(p => p.storefrontQty < p.threshold);
  
  if (lowProducts.length === 0) {
    lowWarningContainer.innerHTML = '<div class="no-data">All storefront stock levels are healthy!</div>';
  } else {
    let itemsHtml = "";
    lowProducts.forEach(p => {
      const unitText = p.unit === "rolls/meters" ? "pcs (pre-cut)" : "pcs";
      itemsHtml += `
        <div class="list-item" style="border-color: var(--danger-glow)">
          <div class="list-item-meta">
            <span class="list-item-title">${p.name}</span>
            <span class="list-item-subtitle" style="color: var(--danger)">Storefront Stock: ${p.storefrontQty} / Min: ${p.threshold} ${unitText}</span>
          </div>
          <button class="btn btn-warning btn-sm" onclick="requestRestockSF('${p.id}')">Request Restock</button>
        </div>
      `;
    });
    lowWarningContainer.innerHTML = itemsHtml;
  }

  // Populate products select in movement request form
  const productSelect = document.getElementById("sf-movement-product");
  productSelect.innerHTML = "";
  products.forEach(p => {
    const unitText = p.unit === "rolls/meters" ? "pre-cut rolls" : "pcs";
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.text = `${p.name} (Stock Room: ${p.stockRoomQty} pcs/m, Storefront: ${p.storefrontQty} ${unitText})`;
    productSelect.appendChild(opt);
  });

  // Render movement requests table
  const requestsTbody = document.getElementById("sf-requests-tbody");
  if (requests.length === 0) {
    requestsTbody.innerHTML = '<tr><td colspan="6" class="no-data">No stock movement requests.</td></tr>';
  } else {
    let rows = "";
    requests.forEach(r => {
      const date = new Date(r.dateCreated).toLocaleDateString();
      const statusBadge = r.status === "Pending" ? '<span class="badge badge-warning">Pending Fulfillment</span>' : '<span class="badge badge-success">Completed</span>';
      
      let actionBtn = "-";
      if (r.status === "Pending") {
        if (currentRole === "staff") {
          actionBtn = `<button class="btn btn-primary btn-sm" onclick="openSFMovementFulfillmentModal('${r.id}')">Fulfill Movement</button>`;
        } else {
          actionBtn = `<span style="font-size:0.8rem; color:var(--text-muted);">Awaiting Stock Room Staff</span>`;
        }
      }

      rows += `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${r.productName}</td>
          <td>${r.quantity}</td>
          <td>${date}</td>
          <td>${statusBadge}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    });
    requestsTbody.innerHTML = rows;
  }
}

// Fulfill movement modal logic
function openSFMovementFulfillmentModal(reqId) {
  const requests = DB.get("storefrontRequests") || [];
  const req = requests.find(r => r.id === reqId);
  if (!req) return;

  const products = DB.get("products") || [];
  const prod = products.find(p => p.id === req.productId);
  if (!prod) return;

  const modal = document.getElementById("sf-fulfillment-modal");
  document.getElementById("sf-fulfillment-req-id").value = reqId;
  document.getElementById("sf-fulfillment-product-name").innerText = req.productName;
  document.getElementById("sf-fulfillment-qty").innerText = req.quantity;

  // Display stock room racks where it can come from
  const rackContainer = document.getElementById("sf-fulfillment-rack-selection");
  rackContainer.innerHTML = "";
  
  if (prod.racks.length === 0) {
    rackContainer.innerHTML = '<span class="badge badge-danger">No defined racks in database</span>';
  } else {
    prod.racks.forEach((rack, idx) => {
      rackContainer.innerHTML += `
        <div style="margin-bottom:0.5rem;">
          <input type="radio" id="sf-rack-radio-${idx}" name="sf-fulfillment-rack" value="${rack}" ${idx === 0 ? "checked" : ""}>
          <label for="sf-rack-radio-${idx}" style="color:var(--text-main); font-weight:500; cursor:pointer;">${rack} (Stock Room Availability: ${prod.stockRoomQty})</label>
        </div>
      `;
    });
  }

  modal.classList.add("active");
}

function closeSFMovementFulfillmentModal() {
  document.getElementById("sf-fulfillment-modal").classList.remove("active");
}

// 5. Stock Out (Big Client) View
function renderStockOutClientView() {
  const products = DB.get("products") || [];
  const clientOrders = DB.get("clientOrders") || [];

  // Populate detail selector dropdown
  const orderSelect = document.getElementById("client-order-detail-select");
  const previousVal = orderSelect.value;
  orderSelect.innerHTML = '<option value="">-- Choose a Client Order --</option>';
  
  clientOrders.forEach(co => {
    const opt = document.createElement("option");
    opt.value = co.id;
    opt.text = `${co.id} [${co.clientName}] - Status: ${co.status}`;
    orderSelect.appendChild(opt);
  });
  
  if (previousVal && Array.from(orderSelect.options).some(o => o.value === previousVal)) {
    orderSelect.value = previousVal;
  }

  // Populate creation form products grid
  const productsGrid = document.getElementById("client-order-products-grid");
  productsGrid.innerHTML = "";
  products.forEach(p => {
    const unitText = p.unit === "rolls/meters" ? "meters" : "pcs";
    productsGrid.innerHTML += `
      <div class="input-grid-item">
        <input type="checkbox" id="chk-client-prod-${p.id}" value="${p.id}" onchange="toggleClientProductQtyInput('${p.id}')">
        <label for="chk-client-prod-${p.id}" class="input-grid-name">${p.name} (Stock Room: ${p.stockRoomQty})</label>
        <input type="number" id="qty-client-prod-${p.id}" placeholder="Qty" min="1" disabled class="input-grid-qty">
      </div>
    `;
  });
}

function toggleClientProductQtyInput(id) {
  const checkbox = document.getElementById(`chk-client-prod-${id}`);
  const qtyInput = document.getElementById(`qty-client-prod-${id}`);
  qtyInput.disabled = !checkbox.checked;
  if (checkbox.checked) {
    qtyInput.value = 5;
    qtyInput.focus();
  } else {
    qtyInput.value = "";
  }
}

function onClientOrderSelected() {
  const select = document.getElementById("client-order-detail-select");
  const orderId = select.value;
  const card = document.getElementById("client-order-detail-card");
  
  if (!orderId) {
    card.style.display = "none";
    return;
  }
  
  card.style.display = "";
  const orders = DB.get("clientOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  // 1. Details Table
  const itemsTbody = document.getElementById("client-order-items-tbody");
  let rowsHtml = "";
  order.items.forEach(item => {
    const colQty = item.collectedQty !== null ? item.collectedQty : "-";
    const rack = item.rackSource ? item.rackSource : "-";
    
    rowsHtml += `
      <tr>
        <td><strong>${item.productName}</strong></td>
        <td>${item.orderedQty}</td>
        <td>${colQty}</td>
        <td><span class="badge badge-indigo">${rack}</span></td>
      </tr>
    `;
  });
  itemsTbody.innerHTML = rowsHtml;

  // 2. Timeline Step Render
  renderClientTimeline(order);

  // 3. Actions Panel Render
  renderClientRoleActions(order);
}

function renderClientTimeline(order) {
  const steps = [
    { key: "created", title: "Order Logged", desc: "Order details recorded by Admin / Staff." },
    { key: "collected", title: "Collected & Set Aside", desc: "Stock room staff retrieved products and set them in front of the stock room." },
    { key: "checked", title: "Store Front Verified", desc: "Store front staff checked accuracy of order products." },
    { key: "delivered", title: "Completed & Dispatched", desc: "Client picked up the order. Hand-off complete." }
  ];

  const container = document.getElementById("client-timeline-stepper");
  container.innerHTML = "";

  let activeStepIdx = 0;
  if (order.status === "Pending Staff Collection") activeStepIdx = 0;
  else if (order.status === "Pending Store Front Check") activeStepIdx = 1;
  else if (order.status === "Ready for Delivery/Pick-up") activeStepIdx = 2;
  else if (order.status === "Closed") activeStepIdx = 3;

  steps.forEach((step, idx) => {
    let stateClass = "";
    if (idx < activeStepIdx) {
      stateClass = "completed";
    } else if (idx === activeStepIdx) {
      stateClass = "active";
    }

    container.innerHTML += `
      <div class="timeline-step ${stateClass}">
        <div class="timeline-bullet">${idx + 1}</div>
        <div class="timeline-content">
          <div class="timeline-title">
            <span>${step.title}</span>
            ${idx === activeStepIdx ? `<span class="badge badge-indigo">Active</span>` : ""}
          </div>
          <div class="timeline-desc">${step.desc}</div>
        </div>
      </div>
    `;
  });
}

function renderClientRoleActions(order) {
  const panel = document.getElementById("client-order-actions-panel");
  panel.innerHTML = "";

  if (order.status === "Pending Staff Collection") {
    if (currentRole === "staff") {
      // Stock Room Staff collection form
      const products = DB.get("products") || [];
      let inputsHtml = "";
      
      order.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const racks = prod ? prod.racks : [];
        
        inputsHtml += `
          <div class="input-grid-item">
            <span class="input-grid-name">${item.productName} <span style="font-size:0.75rem; color:var(--text-muted);">(Ordered: ${item.orderedQty})</span></span>
            <input type="number" id="col-qty-${item.productId}" value="${item.orderedQty}" min="0" class="input-grid-qty" placeholder="Col Qty">
            <select id="col-rack-${item.productId}" class="input-grid-rack">
              ${racks.map(r => `<option value="${r}">${r}</option>`).join("")}
            </select>
          </div>
        `;
      });

      panel.innerHTML = `
        <h4>Collect Products (Stock Room Staff)</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Collect counts from racks and set them in front of the stock room:</p>
        <div style="margin-bottom:1.25rem;">
          ${inputsHtml}
        </div>
        <button class="btn btn-primary" onclick="staffSubmitClientCollection('${order.id}')">
          Set Aside & Notify Store Front
        </button>
      `;
    } else {
      panel.innerHTML = `
        <div class="d-flex align-center gap-1" style="color: var(--text-muted);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          <span>Awaiting Stock Room Staff to collect and set items aside...</span>
        </div>
      `;
    }
  } else if (order.status === "Pending Store Front Check") {
    if (currentRole === "storefront") {
      panel.innerHTML = `
        <h4>Verify Client Order (Store Front Staff)</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Inspect order layout. Confirm items set aside are complete and correct.</p>
        <button class="btn btn-success" onclick="storefrontVerifyClientOrder('${order.id}')">
          Verify Complete & Ready for Delivery
        </button>
      `;
    } else {
      panel.innerHTML = `
        <div class="d-flex align-center gap-1" style="color: var(--text-muted);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          <span>Awaiting Store Front Staff to inspect and verify set aside products...</span>
        </div>
      `;
    }
  } else if (order.status === "Ready for Delivery/Pick-up") {
    if (currentRole === "admin" || currentRole === "staff") {
      panel.innerHTML = `
        <h4>Final Pick-up & Dispatch</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Client has arrived to collect. Confirm delivery hand-off.</p>
        <button class="btn btn-success" onclick="completeClientDispatch('${order.id}')">
          Log Client Pick-up (Close Workflow)
        </button>
      `;
    } else {
      panel.innerHTML = `
        <div class="d-flex align-center gap-1" style="color: var(--text-muted);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          <span>Ready for Pick-up. Client hand-off must be completed by Admin/Stock Staff.</span>
        </div>
      `;
    }
  } else if (order.status === "Closed") {
    panel.innerHTML = `
      <div class="d-flex align-center gap-1" style="color: var(--success);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="22 4 12 14 9 11"></polyline></svg>
        <span>This client order is dispatched and closed.</span>
      </div>
    `;
  }
}

// 6. Stock Conversion View
function renderConversionView() {
  const products = DB.get("products") || [];
  const conversions = DB.get("conversions") || [];

  // Filter products for roll meters only
  const rollProducts = products.filter(p => p.unit === "rolls/meters");
  
  // Populate select dropdown
  const prodSelect = document.getElementById("conversion-product");
  prodSelect.innerHTML = '<option value="">-- Select Roll Product --</option>';
  rollProducts.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.text = `${p.name} (Stock Room: ${p.stockRoomQty} meters)`;
    prodSelect.appendChild(opt);
  });

  // Reset conversion helper inputs
  document.getElementById("conversion-meters").value = "";
  document.getElementById("conversion-cut-length").value = "1.09361"; // 1 yard default
  document.getElementById("conversion-estimated").value = "0";
  document.getElementById("conversion-actual").value = "";

  // Render conversion logs table
  const tbody = document.getElementById("conversions-tbody");
  if (conversions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-data">No roll conversions recorded.</td></tr>';
  } else {
    let rows = "";
    conversions.forEach(c => {
      const date = new Date(c.date).toLocaleDateString();
      rows += `
        <tr>
          <td>${date}</td>
          <td><strong>${c.productName}</strong></td>
          <td>${c.metersDeducted}m</td>
          <td>${c.estimatedRolls} rolls</td>
          <td>${c.actualRolls} rolls</td>
          <td><strong>${c.conversionRate.toFixed(1)}%</strong></td>
          <td>${c.operator}</td>
        </tr>
      `;
    });
    tbody.innerHTML = rows;
  }
}

// Dynamic conversion estimations
function onConversionInputsChange() {
  const productId = document.getElementById("conversion-product").value;
  const metersInput = parseFloat(document.getElementById("conversion-meters").value);
  const cutLengthYards = parseFloat(document.getElementById("conversion-cut-length").value);
  
  if (!productId || isNaN(metersInput) || metersInput <= 0 || isNaN(cutLengthYards) || cutLengthYards <= 0) {
    document.getElementById("conversion-estimated").value = "0";
    return;
  }

  // 1 meter = 1.09361 yards
  const totalYards = metersInput * 1.09361;
  const estimatedRolls = Math.floor(totalYards / cutLengthYards);
  
  document.getElementById("conversion-estimated").value = estimatedRolls;
}

// 7. Stock Adjustment View
function renderAdjustmentView() {
  const products = DB.get("products") || [];
  const adjustments = DB.get("adjustments") || [];

  // Populate Admin adjustments products select
  const prodSelect = document.getElementById("adj-product");
  prodSelect.innerHTML = "";
  products.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.text = `${p.name} (Stock Room: ${p.stockRoomQty}, Storefront: ${p.storefrontQty})`;
    prodSelect.appendChild(opt);
  });

  // Render adjustments history table
  const tbody = document.getElementById("adjustments-tbody");
  if (adjustments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-data">No stock adjustments recorded.</td></tr>';
  } else {
    let rows = "";
    adjustments.forEach(a => {
      const date = new Date(a.date).toLocaleDateString();
      const typeBadge = a.type === "In" ? '<span class="badge badge-success">Stock In</span>' : '<span class="badge badge-danger">Stock Out</span>';
      const statusBadge = a.status === "Requested" ? '<span class="badge badge-warning">Awaiting Storage</span>' : '<span class="badge badge-success">Completed</span>';
      
      let actionCell = "-";
      if (a.status === "Requested") {
        if (currentRole === "staff") {
          actionCell = `<button class="btn btn-primary btn-sm" onclick="openAdjustmentFulfillModal('${a.id}')">Process Action</button>`;
        } else {
          actionCell = `<span style="font-size:0.8rem; color:var(--text-muted);">Awaiting Stock Room</span>`;
        }
      }

      rows += `
        <tr>
          <td><strong>${a.id}</strong></td>
          <td>${date}</td>
          <td>${typeBadge}</td>
          <td>${a.productName}</td>
          <td>${a.quantity}</td>
          <td>${statusBadge}</td>
          <td>${actionCell}</td>
        </tr>
      `;
    });
    tbody.innerHTML = rows;
  }
}

// Fulfill Adjustment Modal
function openAdjustmentFulfillModal(adjId) {
  const adjs = DB.get("adjustments") || [];
  const adj = adjs.find(a => a.id === adjId);
  if (!adj) return;

  const products = DB.get("products") || [];
  const prod = products.find(p => p.id === adj.productId);
  if (!prod) return;

  const racks = DB.get("racks") || [];

  const modal = document.getElementById("adj-fulfillment-modal");
  document.getElementById("adj-fulfillment-id").value = adjId;
  document.getElementById("adj-fulfillment-product-name").innerText = adj.productName;
  document.getElementById("adj-fulfillment-qty").innerText = adj.quantity;
  document.getElementById("adj-fulfillment-type").innerText = adj.type === "In" ? "Stock In (Shelving)" : "Stock Out (Retrieval)";

  const selectContainer = document.getElementById("adj-fulfillment-rack-container");
  
  if (adj.type === "In") {
    // Stock In: select any stock room rack to put item
    selectContainer.innerHTML = `
      <label>Choose Destination Rack:</label>
      <select id="adj-fulfillment-rack" class="mt-2">
        ${racks.map(r => `<option value="${r}">${r}</option>`).join("")}
      </select>
    `;
  } else {
    // Stock Out: select rack to pull from
    selectContainer.innerHTML = `
      <label>Select Rack to Pull From:</label>
      <select id="adj-fulfillment-rack" class="mt-2">
        ${prod.racks.map(r => `<option value="${r}">${r}</option>`).join("")}
      </select>
    `;
  }

  modal.classList.add("active");
}

function closeAdjFulfillmentModal() {
  document.getElementById("adj-fulfillment-modal").classList.remove("active");
}


/* ==========================================================================
   WORKFLOW ACTIONS LOGIC
   ========================================================================== */

// 1. Admin creates a supply order
function adminCreateSupplyOrder(event) {
  event.preventDefault();
  
  const supplier = document.getElementById("supply-order-supplier").value;
  const products = DB.get("products") || [];
  
  // Find selected products
  const selectedItems = [];
  products.forEach(p => {
    const chk = document.getElementById(`chk-order-prod-${p.id}`);
    if (chk && chk.checked) {
      const qtyInput = document.getElementById(`qty-order-prod-${p.id}`);
      const qty = parseInt(qtyInput.value);
      if (!isNaN(qty) && qty > 0) {
        selectedItems.push({
          productId: p.id,
          productName: p.name,
          orderedQty: qty,
          receivedQty: null,
          rackLocation: null
        });
      }
    }
  });

  if (selectedItems.length === 0) {
    showToast("Please select at least one product with a valid quantity.", "warning");
    return;
  }

  const supplyOrders = DB.get("supplyOrders") || [];
  const orderId = "SO-" + (1000 + supplyOrders.length + 1);
  const newOrder = {
    id: orderId,
    supplier,
    dateCreated: new Date().toISOString(),
    status: "Draft", // Step 1 Admin Drafts
    items: selectedItems
  };

  supplyOrders.unshift(newOrder);
  DB.set("supplyOrders", supplyOrders);

  showToast(`Supply Order ${orderId} created as Draft!`, "success");
  
  // Auto select created order in dropdown view
  renderStockInView();
  document.getElementById("supply-order-detail-select").value = orderId;
  onSupplyOrderSelected();
}

// Admin forwards supply order to Stock room staff
function adminForwardSupplyOrder(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const updated = orders.map(o => {
    if (o.id === orderId) {
      o.status = "For Staff Confirmation"; // Step 3 handoff
    }
    return o;
  });
  DB.set("supplyOrders", updated);
  
  pushNotification(
    "New Supply Delivery Expected", 
    `Verify delivery contents for Supply Order ${orderId} from ${orders.find(o => o.id === orderId).supplier}.`, 
    "staff", 
    { tab: "stock-in", supplyOrderId: orderId }
  );

  onSupplyOrderSelected();
}

// Staff inputs received quantities and racks
function staffSubmitDeliveries(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const items = order.items;
  let validationPassed = true;

  items.forEach(item => {
    const qtyInput = document.getElementById(`rec-qty-${item.productId}`);
    const rackSelect = document.getElementById(`rec-rack-${item.productId}`);
    
    if (qtyInput && rackSelect) {
      const recQty = parseInt(qtyInput.value);
      if (isNaN(recQty) || recQty < 0) {
        showToast("Please enter a valid received quantity.", "warning");
        validationPassed = false;
        return;
      }
      item.receivedQty = recQty;
      item.rackLocation = rackSelect.value;
    }
  });

  if (!validationPassed) return;

  order.status = "Staff Checked"; // Step 5 Handoff back
  DB.set("supplyOrders", orders);

  pushNotification(
    "Delivery Logs Ready for Check", 
    `Verification required on received items for Supply Order ${orderId}.`, 
    "admin", 
    { tab: "stock-in", supplyOrderId: orderId }
  );

  showToast("Deliveries recorded. Forwarded to Admin.", "success");
  onSupplyOrderSelected();
}

// Admin opens discrepancy resolution prompt modal
function adminOpenDiscrepancyReview(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const updated = orders.map(o => {
    if (o.id === orderId) {
      o.status = "Reviewed Discrepancy";
    }
    return o;
  });
  DB.set("supplyOrders", updated);
  onSupplyOrderSelected();
}

// Admin closes supply order with matching items (or Accept Anyway)
function adminCloseSupplyOrder(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = "Closed";
  DB.set("supplyOrders", orders);

  // Update product inventory levels
  const products = DB.get("products") || [];
  order.items.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (prod) {
      // Add receivedQty to Stock room qty
      prod.stockRoomQty += item.receivedQty;
      
      // Associate rack to product racks array if not present
      if (item.rackLocation && !prod.racks.includes(item.rackLocation)) {
        prod.racks.push(item.rackLocation);
      }
    }
  });
  DB.set("products", products);

  showToast(`Supply Order ${orderId} closed. Inventory counts updated.`, "success");
  onSupplyOrderSelected();
}

// Admin Tag discrepancy as Supplier Refunded
function adminSettleRefund(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = "Closed (Refunded)";
  DB.set("supplyOrders", orders);

  // Still update product stock rooms using actual received amounts!
  const products = DB.get("products") || [];
  order.items.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (prod) {
      prod.stockRoomQty += item.receivedQty;
      if (item.rackLocation && !prod.racks.includes(item.rackLocation)) {
        prod.racks.push(item.rackLocation);
      }
    }
  });
  DB.set("products", products);

  showToast(`Order ${orderId} finalized. Discrepancy tagged as REFUNDED.`, "success");
  onSupplyOrderSelected();
}

// Admin sets discrepancy as correction on next shipment (Loop back to 3)
function adminSettleCorrection(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  // We loop back to 'For Staff Confirmation', but suffix to denote Correction
  order.status = "Reviewed Discrepancy (Correction)";
  DB.set("supplyOrders", orders);

  // Increment already received ones to inventory? No, usually in loop back 
  // they verify again. But to be clean we will save the current received quantities 
  // as the base, and wait for Stock Room Staff to re-verify incoming correction shipment.
  pushNotification(
    "Missing Shipment Incoming", 
    `Supplier corrections for Supply Order ${orderId} will arrive next shipment. Re-verify deliveries.`, 
    "staff", 
    { tab: "stock-in", supplyOrderId: orderId }
  );

  showToast("Correction flag set. Returned order to Stock Staff queue.", "success");
  onSupplyOrderSelected();
}

// 2. Stock Out - Store Front Restock Request
function requestRestockSF(prodId) {
  const products = DB.get("products") || [];
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  const reqQty = prod.threshold * 2; // request twice threshold to bring healthy level
  
  const requests = DB.get("storefrontRequests") || [];
  const reqId = "SF-REQ-" + (100 + requests.length + 1);
  const newReq = {
    id: reqId,
    productId: prodId,
    productName: prod.name,
    quantity: reqQty,
    dateCreated: new Date().toISOString(),
    status: "Pending"
  };

  requests.unshift(newReq);
  DB.set("storefrontRequests", requests);

  pushNotification(
    "Storefront Stock Replenish Requested",
    `Bring out ${reqQty} units of ${prod.name} from Rack locations to storefront.`,
    "staff",
    { tab: "stock-out-sf" }
  );

  renderStockOutSFView();
}

// Admin manually submits a movement request
function adminSubmitSFRequest(event) {
  event.preventDefault();
  const prodId = document.getElementById("sf-movement-product").value;
  const qty = parseInt(document.getElementById("sf-movement-qty").value);

  if (!prodId || isNaN(qty) || qty <= 0) {
    showToast("Please enter a valid product and quantity.", "warning");
    return;
  }

  const products = DB.get("products") || [];
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  const requests = DB.get("storefrontRequests") || [];
  const reqId = "SF-REQ-" + (100 + requests.length + 1);
  const newReq = {
    id: reqId,
    productId: prodId,
    productName: prod.name,
    quantity: qty,
    dateCreated: new Date().toISOString(),
    status: "Pending"
  };

  requests.unshift(newReq);
  DB.set("storefrontRequests", requests);

  pushNotification(
    "Fulfillment Requested",
    `Move ${qty} units of ${prod.name} from racks to storefront.`,
    "staff",
    { tab: "stock-out-sf" }
  );

  showToast(`Request ${reqId} created.`, "success");
  document.getElementById("sf-movement-qty").value = "";
  renderStockOutSFView();
}

// Staff completes storefront movement fulfillment
function submitSFMovementFulfillment() {
  const reqId = document.getElementById("sf-fulfillment-req-id").value;
  const selectedRackEl = document.querySelector('input[name="sf-fulfillment-rack"]:checked');

  if (!selectedRackEl) {
    showToast("Please select a rack source.", "warning");
    return;
  }

  const sourceRack = selectedRackEl.value;
  const requests = DB.get("storefrontRequests") || [];
  const req = requests.find(r => r.id === reqId);
  if (!req) return;

  // Deduct from stock room, add to storefront
  const products = DB.get("products") || [];
  const prod = products.find(p => p.id === req.productId);
  
  if (prod) {
    if (prod.stockRoomQty < req.quantity) {
      showToast(`Warning: Insufficient stock room quantity. Moving remaining ${prod.stockRoomQty} items instead.`, "warning");
      req.quantity = prod.stockRoomQty;
    }
    
    prod.stockRoomQty -= req.quantity;
    prod.storefrontQty += req.quantity;
    DB.set("products", products);
  }

  req.status = "Completed";
  req.rackSource = sourceRack;
  DB.set("storefrontRequests", requests);

  pushNotification(
    "Storefront Stock Filled",
    `Delivered ${req.quantity} of ${req.productName} from ${sourceRack} to storefront shelves.`,
    "admin",
    { tab: "stock-out-sf" }
  );

  closeSFMovementFulfillmentModal();
  renderStockOutSFView();
}

// 3. Stock Out - Big Client Orders
function createClientOrder(event) {
  event.preventDefault();
  const clientName = document.getElementById("client-order-name").value;
  const products = DB.get("products") || [];

  const orderItems = [];
  products.forEach(p => {
    const chk = document.getElementById(`chk-client-prod-${p.id}`);
    if (chk && chk.checked) {
      const qtyInput = document.getElementById(`qty-client-prod-${p.id}`);
      const qty = parseInt(qtyInput.value);
      if (!isNaN(qty) && qty > 0) {
        orderItems.push({
          productId: p.id,
          productName: p.name,
          orderedQty: qty,
          collectedQty: null,
          rackSource: null
        });
      }
    }
  });

  if (!clientName || orderItems.length === 0) {
    showToast("Please enter client details and select products.", "warning");
    return;
  }

  const clientOrders = DB.get("clientOrders") || [];
  const orderId = "CO-" + (5000 + clientOrders.length + 1);
  const newOrder = {
    id: orderId,
    clientName,
    dateCreated: new Date().toISOString(),
    status: "Pending Staff Collection", // Step 2
    items: orderItems
  };

  clientOrders.unshift(newOrder);
  DB.set("clientOrders", clientOrders);

  pushNotification(
    "New Big Client Order",
    `Retrieve and record ${orderItems.length} products for client ${clientName}.`,
    "staff",
    { tab: "stock-out-client", clientOrderId: orderId }
  );

  showToast(`Client Order ${orderId} logged.`, "success");
  
  renderStockOutClientView();
  document.getElementById("client-order-detail-select").value = orderId;
  onClientOrderSelected();
}

// Staff completes collecting client items
function staffSubmitClientCollection(orderId) {
  const orders = DB.get("clientOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  let validationPassed = true;
  order.items.forEach(item => {
    const qtyInput = document.getElementById(`col-qty-${item.productId}`);
    const rackSelect = document.getElementById(`col-rack-${item.productId}`);
    
    if (qtyInput && rackSelect) {
      const colQty = parseInt(qtyInput.value);
      if (isNaN(colQty) || colQty < 0) {
        showToast("Please enter a valid collection count.", "warning");
        validationPassed = false;
        return;
      }
      item.collectedQty = colQty;
      item.rackSource = rackSelect.value;
    }
  });

  if (!validationPassed) return;

  order.status = "Pending Store Front Check"; // Step 4 Set Aside
  DB.set("clientOrders", orders);

  pushNotification(
    "Client Order Set Aside",
    `Items for ${order.clientName} (Order ${orderId}) are set in front. Store Staff please verify.`,
    "storefront",
    { tab: "stock-out-client", clientOrderId: orderId }
  );

  showToast("Products collected and set aside in front of Stock Room.", "success");
  onClientOrderSelected();
}

// Store Front Staff verifies items are correct and complete
function storefrontVerifyClientOrder(orderId) {
  const orders = DB.get("clientOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = "Ready for Delivery/Pick-up"; // Step 5 Verify Complete
  DB.set("clientOrders", orders);

  pushNotification(
    "Client Order Verification Cleared",
    `Order ${orderId} for ${order.clientName} has been verified complete and is ready for dispatch.`,
    "admin",
    { tab: "stock-out-client", clientOrderId: orderId }
  );

  showToast("Store front verification completed. Ready for delivery.", "success");
  onClientOrderSelected();
}

// Final dispatch closing the client order workflow
function completeClientDispatch(orderId) {
  const orders = DB.get("clientOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = "Closed";
  DB.set("clientOrders", orders);

  // Update Inventory levels (Deduct from stock room)
  const products = DB.get("products") || [];
  order.items.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (prod) {
      prod.stockRoomQty = Math.max(0, prod.stockRoomQty - item.collectedQty);
    }
  });
  DB.set("products", products);

  showToast(`Client Order ${orderId} delivered. Inventory stock room counts updated.`, "success");
  onClientOrderSelected();
}

// 4. Stock Conversion - execute roll conversions
function executeRollConversion(event) {
  event.preventDefault();
  const prodId = document.getElementById("conversion-product").value;
  const metersInput = parseFloat(document.getElementById("conversion-meters").value);
  const cutLengthYards = parseFloat(document.getElementById("conversion-cut-length").value);
  const actualInput = parseInt(document.getElementById("conversion-actual").value);
  const estimatedInput = parseInt(document.getElementById("conversion-estimated").value);

  if (!prodId || isNaN(metersInput) || metersInput <= 0 || isNaN(cutLengthYards) || cutLengthYards <= 0 || isNaN(actualInput) || actualInput < 0) {
    showToast("Please fill all details with valid positive parameters.", "warning");
    return;
  }

  const products = DB.get("products") || [];
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  if (prod.stockRoomQty < metersInput) {
    showToast(`Insufficient roll meters in stock room (${prod.stockRoomQty}m available).`, "danger");
    return;
  }

  // Calculate rate
  const rate = estimatedInput > 0 ? (actualInput / estimatedInput) * 100 : 100;

  // Execute
  prod.stockRoomQty -= metersInput;
  prod.storefrontQty += actualInput; // add cut pieces directly to storefront ready for sale
  DB.set("products", products);

  // Log conversion
  const conversions = DB.get("conversions") || [];
  conversions.unshift({
    id: "CONV-" + (100 + conversions.length + 1),
    date: new Date().toISOString(),
    productId: prodId,
    productName: prod.name,
    metersDeducted: metersInput,
    estimatedRolls: estimatedInput,
    actualRolls: actualInput,
    conversionRate: rate,
    operator: getRoleName(currentRole)
  });
  DB.set("conversions", conversions);

  showToast("Roll stock conversion completed successfully!", "success");
  renderConversionView();
}

// 5. Stock Adjustments Actions
function adminSubmitAdjustment(event) {
  event.preventDefault();
  const prodId = document.getElementById("adj-product").value;
  const type = document.getElementById("adj-type").value;
  const qty = parseInt(document.getElementById("adj-qty").value);

  if (!prodId || isNaN(qty) || qty <= 0) {
    showToast("Please enter a valid product and quantity.", "warning");
    return;
  }

  const products = DB.get("products") || [];
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  const adjustments = DB.get("adjustments") || [];
  const adjId = "ADJ-" + (1000 + adjustments.length + 1);

  const newAdj = {
    id: adjId,
    date: new Date().toISOString(),
    type, // 'In' or 'Out'
    productId: prodId,
    productName: prod.name,
    quantity: qty,
    status: "Requested"
  };

  adjustments.unshift(newAdj);
  DB.set("adjustments", adjustments);

  pushNotification(
    `Inventory Adjustment ${type} Requested`,
    `Fulfill: ${type === "In" ? "Put in" : "Get out"} ${qty} units of ${prod.name} in Stock Room.`,
    "staff",
    { tab: "adjustment" }
  );

  showToast(`Adjustment Request ${adjId} logged.`, "success");
  document.getElementById("adj-qty").value = "";
  renderAdjustmentView();
}

// Staff fulfills adjustment (Stock Room Staff shelves / retrieves)
function fulfillAdjustment() {
  const adjId = document.getElementById("adj-fulfillment-id").value;
  const rackSelect = document.getElementById("adj-fulfillment-rack");
  
  if (!rackSelect) {
    showToast("No rack location selected.", "warning");
    return;
  }

  const selectedRack = rackSelect.value;
  const adjs = DB.get("adjustments") || [];
  const adj = adjs.find(a => a.id === adjId);
  if (!adj) return;

  const products = DB.get("products") || [];
  const prod = products.find(p => p.id === adj.productId);

  if (prod) {
    if (adj.type === "In") {
      prod.stockRoomQty += adj.quantity;
      if (!prod.racks.includes(selectedRack)) {
        prod.racks.push(selectedRack);
      }
    } else {
      if (prod.stockRoomQty < adj.quantity) {
        showToast(`Warning: Insufficient stock room quantity. Adjusting using remaining ${prod.stockRoomQty} items.`, "warning");
        adj.quantity = prod.stockRoomQty;
      }
      prod.stockRoomQty -= adj.quantity;
    }
    DB.set("products", products);
  }

  adj.status = "Completed";
  adj.rackFlipped = selectedRack;
  DB.set("adjustments", adjs);

  pushNotification(
    "Adjustment Task Processed",
    `Completed ${adj.type === "In" ? "Store In" : "Stock Out"} of ${adj.quantity} ${adj.productName} via ${selectedRack}.`,
    "admin",
    { tab: "adjustment" }
  );

  closeAdjFulfillmentModal();
  renderAdjustmentView();
}


// Export reset functionality globally for easy buttons
window.resetSystemDatabase = () => {
  if (confirm("Are you sure you want to reset all inventory counts, orders, and logs?")) {
    DB.reset();
  }
};
