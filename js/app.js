// ============================================================
// app.js - Application Entry Point & Navigation Router
// Modules: db.js → ui.js → views.js → actions.js
// ============================================================

// Global App State
let currentRole = typeof currentUser !== 'undefined' && currentUser ? currentUser.role : "admin"; // 'admin' | 'staff' | 'storefront'
let activeTab = "dashboard";

// --- Entry Point ---
document.addEventListener("DOMContentLoaded", () => {
  if (typeof currentUser === 'undefined' || !currentUser) return; // Prevent executing app logic if not logged in
  
  const userNameEl = document.getElementById('user-name-text');
  if (userNameEl) userNameEl.innerText = currentUser.username;

  DB.init();
  setupRoleDisplay();
  setupTabNavigation();
  setupFormHandlers();
  renderAllViews();
  updateNotificationIndicator();
  document.getElementById("supply-order-detail-card").style.display = "none";
  document.getElementById("client-order-detail-card").style.display = "none";
});

// --- Role Display ---
function setupRoleDisplay() {
  const badgeText = document.getElementById("user-role-text");
  const avatar = document.getElementById("user-avatar-initial");
  if (!badgeText || !avatar) return;
  
  const roleConfig = {
    admin:      { label: "Administrator",     initial: "A",  color: "var(--primary)" },
    staff:      { label: "Stock Room Staff",  initial: "SR", color: "var(--success)" },
    storefront: { label: "Store Front Staff", initial: "SF", color: "var(--info)" }
  };
  const cfg = roleConfig[currentRole] || roleConfig.admin;
  badgeText.innerText = cfg.label;
  avatar.innerText = cfg.initial;
  avatar.style.background = cfg.color;
  showToast(`Welcome back, ${currentUser.username}!`, "success");
}

// --- Tab Navigation ---
function setupTabNavigation() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
  });
}

function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll(".nav-item").forEach(item =>
    item.classList.toggle("active", item.getAttribute("data-tab") === tabName)
  );
  document.querySelectorAll(".tab-panel").forEach(panel =>
    panel.classList.toggle("active", panel.id === `${tabName}-tab`)
  );
  renderAllViews();
}

// --- Global Render Router ---
function renderAllViews() {
  updateRoleDynamicDisplay();
  const renderers = {
    "dashboard":       renderDashboardView,
    "inventory":       renderInventoryView,
    "stock-in":        renderStockInView,
    "stock-out-sf":    renderStockOutSFView,
    "stock-out-client":renderStockOutClientView,
    "conversion":      renderConversionView,
    "adjustment":      renderAdjustmentView
  };
  renderers[activeTab]?.();
}

// --- Role-Based Display Toggle ---
function updateRoleDynamicDisplay() {
  document.querySelectorAll("[data-role-only]").forEach(el => {
    const allowed = el.getAttribute("data-role-only").split(",");
    el.style.display = allowed.includes(currentRole) ? "" : "none";
  });
}

// --- Form Handlers (wires HTML form submissions to action functions) ---
function setupFormHandlers() {
  // All form submissions are already wired via onsubmit attributes in HTML.
  // This function is intentionally minimal — add programmatic listeners here if needed.
}

// --- Global Reset ---
window.resetSystemDatabase = () => {
  if (confirm("Are you sure you want to reset all inventory counts, orders, and logs?")) {
    DB.reset();
  }
};
