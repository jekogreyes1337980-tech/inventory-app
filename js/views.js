// ============================================================
// views.js - All View Renderers (Dashboard, Inventory, Stock In/Out, Conversion, Adjustment)
// ============================================================

// --- 1. Dashboard ---
function renderDashboardView() {
  const products = DB.get("products") || [];
  const supplyOrders = DB.get("supplyOrders") || [];
  const conversions = DB.get("conversions") || [];

  const lowStocks = products.filter(p => p.storefrontQty < p.threshold);
  const activeSupplies = supplyOrders.filter(so => so.status !== "Closed" && so.status !== "Closed (Refunded)");

  document.getElementById("metric-low-stock").innerText = lowStocks.length;
  document.getElementById("metric-active-supplies").innerText = activeSupplies.length;
  document.getElementById("metric-conversions").innerText = conversions.length;

  _renderDashboardAlerts(lowStocks, supplyOrders, activeSupplies);
  _renderActiveSuppliesTable(activeSupplies);
}

function _renderDashboardAlerts(lowStocks, supplyOrders, activeSupplies) {
  const container = document.getElementById("dashboard-role-alerts");
  let html = "";

  if (currentRole === "admin") {
    const checkingCount = supplyOrders.filter(so => so.status === "Staff Checked").length;
    if (checkingCount > 0) {
      html += `
        <div class="glass-card discrepancy-card d-flex align-center justify-between">
          <div>
            <h4 style="color: var(--danger)">Verify Received Deliveries</h4>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              There are ${checkingCount} supply order deliveries marked completed by Stock Staff waiting for discrepancy checks.
            </p>
          </div>
          <button class="btn btn-danger btn-sm" onclick="switchTab('stock-in')">Go to Verify</button>
        </div>`;
    }
    if (lowStocks.length > 0) {
      html += `
        <div class="glass-card d-flex align-center justify-between" style="border-color: var(--warning-glow);">
          <div>
            <h4 style="color: var(--warning)">Low Store Front Stock Warning</h4>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              ${lowStocks.length} storefront items are running below threshold levels. Request Stock Room to bring stock out.
            </p>
          </div>
          <button class="btn btn-warning btn-sm" onclick="switchTab('stock-out-sf')">Request Restock</button>
        </div>`;
    }
  } else if (currentRole === "staff") {
    const confirmationCount = supplyOrders.filter(so =>
      so.status === "For Staff Confirmation" || so.status === "Reviewed Discrepancy (Correction)"
    ).length;
    if (confirmationCount > 0) {
      html += `
        <div class="glass-card d-flex align-center justify-between" style="border-color: var(--primary-glow)">
          <div>
            <h4 style="color: var(--primary)">Deliveries to Confirm</h4>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              You have ${confirmationCount} supply orders pending delivery verification and rack storage.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="switchTab('stock-in')">Log Deliveries</button>
        </div>`;
    }
    const pendingAdjustments = (DB.get("adjustments") || []).filter(a => a.status === "Requested");
    if (pendingAdjustments.length > 0) {
      html += `
        <div class="glass-card d-flex align-center justify-between" style="border-color: var(--info-glow)">
          <div>
            <h4 style="color: var(--info)">Inventory Adjustment Requests</h4>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              Admin has requested ${pendingAdjustments.length} stock collections / storages.
            </p>
          </div>
          <button class="btn btn-info btn-sm" onclick="switchTab('adjustment')">View Adjustments</button>
        </div>`;
    }
  } else if (currentRole === "storefront") {
    const clientOrders = DB.get("clientOrders") || [];
    const pendingChecks = clientOrders.filter(co => co.status === "Pending Store Front Check");
    if (pendingChecks.length > 0) {
      html += `
        <div class="glass-card d-flex align-center justify-between" style="border-color: var(--success-glow)">
          <div>
            <h4 style="color: var(--success)">Verification of Big Client Orders</h4>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              There are ${pendingChecks.length} orders set aside by Stock Room Staff waiting for final completeness verification.
            </p>
          </div>
          <button class="btn btn-success btn-sm" onclick="switchTab('stock-out-client')">Inspect Orders</button>
        </div>`;
    }
  }

  container.innerHTML = html || '<div class="no-data">No immediate actions required for your current role.</div>';
}

function _renderActiveSuppliesTable(activeSupplies) {
  const tbody = document.getElementById("active-supplies-table-body");
  if (activeSupplies.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="no-data">No active supply orders.</td></tr>';
    return;
  }
  tbody.innerHTML = activeSupplies.map(so => {
    let badgeClass = "badge-indigo";
    if (so.status === "For Staff Confirmation") badgeClass = "badge-warning";
    if (so.status === "Staff Checked") badgeClass = "badge-info";
    if (so.status.includes("Reviewed")) badgeClass = "badge-danger";
    const date = new Date(so.dateCreated).toLocaleDateString();
    return `
      <tr>
        <td><strong>${so.id}</strong></td>
        <td>${so.supplier}</td>
        <td>${date}</td>
        <td><span class="badge ${badgeClass}">${so.status}</span></td>
        <td><button class="btn btn-secondary btn-sm" onclick="viewSupplyOrderTimeline('${so.id}')">View Flow</button></td>
      </tr>`;
  }).join("");
}

function viewSupplyOrderTimeline(id) {
  switchTab("stock-in");
  setTimeout(() => {
    const select = document.getElementById("supply-order-detail-select");
    if (select) { select.value = id; select.dispatchEvent(new Event("change")); }
  }, 100);
}

// --- 2. Inventory View ---
function renderInventoryView() {
  const products = DB.get("products") || [];
  const tableBody = document.getElementById("inventory-table-body");

  tableBody.innerHTML = products.map(p => {
    const isLow = p.storefrontQty < p.threshold;
    const lowWarning = isLow
      ? `<span class="badge badge-danger">Low Stock</span>`
      : `<span class="badge badge-success">OK</span>`;
    const stockRoomUnit = p.unit === "rolls/meters" ? "meters" : "pcs";
    const storefrontUnit = p.unit === "rolls/meters" ? "pcs (pre-cut)" : "pcs";
    return `
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
        <td>${p.racks.map(r => `<span class="badge badge-indigo">${r}</span>`).join(" ")}</td>
        <td>₱${p.cost.toFixed(2)}</td>
        <td>₱${p.price.toFixed(2)}</td>
      </tr>`;
  }).join("");
}

// --- 3. Stock In View ---
function renderStockInView() {
  const products = DB.get("products") || [];
  const suppliers = DB.get("suppliers") || [];
  const supplyOrders = DB.get("supplyOrders") || [];

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

  const supplierSelect = document.getElementById("supply-order-supplier");
  supplierSelect.innerHTML = "";
  suppliers.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s; opt.text = s;
    supplierSelect.appendChild(opt);
  });

  const productsGrid = document.getElementById("supply-order-products-grid");
  productsGrid.innerHTML = products.map(p => {
    const unitText = p.unit === "rolls/meters" ? "meters" : "pcs";
    return `
      <div class="input-grid-item">
        <input type="checkbox" id="chk-order-prod-${p.id}" value="${p.id}" onchange="toggleOrderProductQtyInput('${p.id}')">
        <label for="chk-order-prod-${p.id}" class="input-grid-name">${p.name} (${unitText})</label>
        <input type="number" id="qty-order-prod-${p.id}" placeholder="Qty" min="1" disabled class="input-grid-qty">
      </div>`;
  }).join("");
}

function toggleOrderProductQtyInput(id) {
  const checkbox = document.getElementById(`chk-order-prod-${id}`);
  const qtyInput = document.getElementById(`qty-order-prod-${id}`);
  qtyInput.disabled = !checkbox.checked;
  if (checkbox.checked) { qtyInput.value = 10; qtyInput.focus(); }
  else { qtyInput.value = ""; }
}

function onSupplyOrderSelected() {
  const select = document.getElementById("supply-order-detail-select");
  const orderId = select.value;
  const card = document.getElementById("supply-order-detail-card");

  if (!orderId) { card.style.display = "none"; return; }
  card.style.display = "";

  const order = (DB.get("supplyOrders") || []).find(o => o.id === orderId);
  if (!order) return;

  // Timeline first (top)
  renderSupplyTimeline(order);

  document.getElementById("supply-order-items-tbody").innerHTML = order.items.map(item => {
    const recQty = item.receivedQty !== null ? item.receivedQty : "-";
    const rack = item.rackLocation || "-";
    let rowStyle = "", statusBadge = `<span class="badge badge-muted">Pending</span>`;
    if (order.status !== "Draft" && order.status !== "Ordered" && order.status !== "For Staff Confirmation") {
      if (item.receivedQty !== item.orderedQty) {
        rowStyle = "background-color: rgba(239, 68, 68, 0.05); color: #f87171;";
        statusBadge = `<span class="discrepancy-badge">Discrepancy</span>`;
      } else {
        statusBadge = `<span class="badge badge-success">Match</span>`;
      }
    }
    return `
      <tr style="${rowStyle}">
        <td><strong>${item.productName}</strong></td>
        <td>${item.orderedQty}</td>
        <td>${recQty}</td>
        <td><span class="badge badge-indigo">${rack}</span></td>
        <td>${statusBadge}</td>
      </tr>`;
  }).join("");

  renderSupplyRoleActions(order);
}

function renderSupplyTimeline(order) {
  const steps = [
    { title: "Order Drafted", desc: "Admin initialized the supply order.", handledKey: null },
    { title: "Forwarded to Staff", desc: "Order forwarded to confirm delivery.", handledKey: null },
    { title: "Delivered & Racked", desc: "Staff inputted quantities & rack positions.", handledKey: "confirmedBy" },
    { title: "Discrepancy Check", desc: "Admin verified counts vs ordered amounts.", handledKey: null },
    { title: "Process Closed", desc: "Inventory updated. Discrepancies resolved.", handledKey: null }
  ];

  let activeStepIdx = 0;
  if (order.status === "Draft") activeStepIdx = 0;
  else if (order.status === "Ordered" || order.status === "For Staff Confirmation" || order.status.includes("Correction")) activeStepIdx = 1;
  else if (order.status === "Staff Checked") activeStepIdx = 2;
  else if (order.status === "Reviewed Discrepancy") activeStepIdx = 3;
  else if (order.status.startsWith("Closed")) activeStepIdx = 4;

  const h = order.handledBy || {};
  document.getElementById("supply-timeline-stepper").innerHTML = steps.map((step, idx) => {
    let stateClass = idx < activeStepIdx ? "completed" : idx === activeStepIdx ? "active" : "";
    let desc = step.desc;
    if (idx === activeStepIdx && order.status.includes("Discrepancy")) stateClass = "discrepancy";
    if (idx === 4 && order.status === "Closed (Refunded)") { desc = "Discrepancies tagged as REFUNDED."; stateClass = "discrepancy"; }
    else if (idx === 4 && order.status === "Closed") desc = "Closed. Stock levels updated.";
    const handler = step.handledKey && h[step.handledKey] ? `<div class="timeline-meta"><span style="color:var(--success)">&#10003; ${h[step.handledKey]}</span></div>` : "";
    const isActive = idx === activeStepIdx;
    return `
      <div class="timeline-step ${stateClass}">
        <div class="timeline-bullet">${idx + 1}</div>
        <div class="timeline-content">
          <div class="timeline-title">
            <span>${step.title}</span>
            ${isActive ? `<span class="badge badge-indigo" style="font-size:0.65rem;">Active</span>` : ""}
          </div>
          <div class="timeline-desc">${desc}</div>
          ${handler}
        </div>
      </div>`;
  }).join("");
}

function renderSupplyRoleActions(order) {
  const panel = document.getElementById("supply-order-actions-panel");
  const WAITING_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>`;

  if (currentRole === "admin") {
    if (order.status === "Draft") {
      panel.innerHTML = `
        <h4>Admin Options</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Forward this order to the Stock Room Staff for product validation upon arrival.</p>
        <button class="btn btn-primary" onclick="adminForwardSupplyOrder('${order.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          Forward to Stock Room Staff
        </button>`;
    } else if (order.status === "Staff Checked") {
      const discrepancies = order.items.filter(item => item.orderedQty !== item.receivedQty);
      const hasDisc = discrepancies.length > 0;
      const checkAlert = hasDisc
        ? `<div class="glass-card discrepancy-card" style="margin-bottom:1rem; padding:1rem;">
            <h5 style="color:var(--danger); display:flex; align-items:center; gap:0.5rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Discrepancies Detected!
            </h5>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">Stock staff records show a mismatch on ${discrepancies.length} products.</p>
          </div>`
        : `<div class="glass-card" style="margin-bottom:1rem; padding:1rem; border-color:var(--success-glow); background:rgba(16,185,129,0.03);">
            <h5 style="color:var(--success); display:flex; align-items:center; gap:0.5rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Quantities Match Perfect
            </h5>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">All ordered units were successfully delivered and shelved.</p>
          </div>`;
      panel.innerHTML = `
        <h4>Verification Check (Administrator)</h4>
        ${checkAlert}
        <div class="d-flex gap-2">
          <button class="btn btn-success" onclick="adminCloseSupplyOrder('${order.id}')">Close Stock ${hasDisc ? "(Accept Anyway)" : "In"}</button>
          ${hasDisc ? `<button class="btn btn-danger" onclick="adminOpenDiscrepancyReview('${order.id}')">Resolve Discrepancy</button>` : ""}
        </div>`;
    } else if (order.status === "Reviewed Discrepancy") {
      panel.innerHTML = `
        <h4>Discrepancy Review Panel</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Select supplier settlement action:</p>
        <div class="d-flex gap-2">
          <button class="btn btn-warning" onclick="adminSettleRefund('${order.id}')">Supplier Refunded Order</button>
          <button class="btn btn-primary" onclick="adminSettleCorrection('${order.id}')">Supplier Corrects Next Shipment</button>
        </div>`;
    } else if (order.status.startsWith("Closed")) {
      panel.innerHTML = `<div class="d-flex align-center gap-1" style="color:var(--text-muted);">${WAITING_ICON}<span>This stock-in process is fully complete and closed.</span></div>`;
    } else {
      panel.innerHTML = `<div class="d-flex align-center gap-1" style="color:var(--text-muted);">${WAITING_ICON}<span>Awaiting confirmation inputs from Stock Room Staff...</span></div>`;
    }
  } else if (currentRole === "staff" || currentRole === "storefront") {
    // Both staff roles can confirm deliveries — with accountability tracking
    if (order.status === "For Staff Confirmation" || order.status === "Reviewed Discrepancy (Correction)") {
      const racks = DB.get("racks") || [];
      const roleLabel = currentRole === "staff" ? "Stock Room Staff" : "Store Front Staff";
      const inputRows = order.items.map(item => `
        <div class="input-grid-item">
          <span class="input-grid-name">${item.productName} <span style="font-size:0.75rem; color:var(--text-muted);">(Ordered: ${item.orderedQty})</span></span>
          <input type="number" id="rec-qty-${item.productId}" value="${item.orderedQty}" min="0" class="input-grid-qty" placeholder="Rec Qty">
          <select id="rec-rack-${item.productId}" class="input-grid-rack">
            ${racks.map(r => `<option value="${r}">${r}</option>`).join("")}
          </select>
        </div>`).join("");
      panel.innerHTML = `
        <h4>Record Delivered Stocks (${roleLabel})</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Input actual counts received and choose storage racks:</p>
        <div style="margin-bottom:1.25rem;">${inputRows}</div>
        <button class="btn btn-success" onclick="staffSubmitDeliveries('${order.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Forward to Admin for Checking
        </button>`;
    } else if (order.status === "Staff Checked") {
      const handler = (order.handledBy || {}).confirmedBy;
      panel.innerHTML = `<div class="d-flex align-center gap-1" style="color:var(--text-muted);">${WAITING_ICON}<span>Deliveries recorded${handler ? ` by <strong style="color:var(--success)">${handler}</strong>` : ""}. Awaiting administrator discrepancy check...</span></div>`;
    } else {
      panel.innerHTML = `<div class="d-flex align-center gap-1" style="color:var(--text-muted);">${WAITING_ICON}<span>This order does not currently require action.</span></div>`;
    }
  }
}

// --- 4. Stock Out - Store Front ---
function renderStockOutSFView() {
  const products = DB.get("products") || [];
  const requests = DB.get("storefrontRequests") || [];
  const lowProducts = products.filter(p => p.storefrontQty < p.threshold);

  const lowWarningContainer = document.getElementById("sf-low-stock-warnings");
  if (lowProducts.length === 0) {
    lowWarningContainer.innerHTML = '<div class="no-data">All storefront stock levels are healthy!</div>';
  } else {
    lowWarningContainer.innerHTML = lowProducts.map(p => {
      const unitText = p.unit === "rolls/meters" ? "pcs (pre-cut)" : "pcs";
      return `
        <div class="list-item" style="border-color: var(--danger-glow)">
          <div class="list-item-meta">
            <span class="list-item-title">${p.name}</span>
            <span class="list-item-subtitle" style="color: var(--danger)">Storefront Stock: ${p.storefrontQty} / Min: ${p.threshold} ${unitText}</span>
          </div>
          <button class="btn btn-warning btn-sm" onclick="requestRestockSF('${p.id}')">Request Restock</button>
        </div>`;
    }).join("");
  }

  const productSelect = document.getElementById("sf-movement-product");
  productSelect.innerHTML = "";
  products.forEach(p => {
    const unitText = p.unit === "rolls/meters" ? "pre-cut rolls" : "pcs";
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.text = `${p.name} (Stock Room: ${p.stockRoomQty} pcs/m, Storefront: ${p.storefrontQty} ${unitText})`;
    productSelect.appendChild(opt);
  });

  const requestsTbody = document.getElementById("sf-requests-tbody");
  if (requests.length === 0) {
    requestsTbody.innerHTML = '<tr><td colspan="6" class="no-data">No stock movement requests.</td></tr>';
    return;
  }
  requestsTbody.innerHTML = requests.map(r => {
    const date = new Date(r.dateCreated).toLocaleDateString();
    const statusBadge = r.status === "Pending"
      ? '<span class="badge badge-warning">Pending Fulfillment</span>'
      : `<span class="badge badge-success">Completed${r.fulfilledBy ? ` · ${r.fulfilledBy}` : ""}</span>`;
    // Both staff and storefront can fulfill — but the requester cannot self-fulfill
    const canFulfill = r.status === "Pending" && (currentRole === "staff" || currentRole === "storefront");
    const isSelfRequest = r.requestedBy && r.requestedBy === currentUser.username;
    let actionBtn;
    if (r.status === "Pending") {
      if (canFulfill && !isSelfRequest) {
        actionBtn = `<button class="btn btn-primary btn-sm" onclick="openSFMovementFulfillmentModal('${r.id}')">Fulfill Movement</button>`;
      } else if (isSelfRequest) {
        actionBtn = `<span style="font-size:0.8rem; color:var(--text-muted);">You created this request</span>`;
      } else {
        actionBtn = `<span style="font-size:0.8rem; color:var(--text-muted);">Awaiting Staff</span>`;
      }
    } else {
      actionBtn = "-";
    }
    return `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.productName}</td>
        <td>${r.quantity}</td>
        <td>${date}</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
      </tr>`;
  }).join("");
}

function openSFMovementFulfillmentModal(reqId) {
  const req = (DB.get("storefrontRequests") || []).find(r => r.id === reqId);
  if (!req) return;
  const prod = (DB.get("products") || []).find(p => p.id === req.productId);
  if (!prod) return;

  const modal = document.getElementById("sf-fulfillment-modal");
  document.getElementById("sf-fulfillment-req-id").value = reqId;
  document.getElementById("sf-fulfillment-product-name").innerText = req.productName;
  document.getElementById("sf-fulfillment-qty").innerText = req.quantity;

  const rackContainer = document.getElementById("sf-fulfillment-rack-selection");
  rackContainer.innerHTML = prod.racks.length === 0
    ? '<span class="badge badge-danger">No defined racks in database</span>'
    : prod.racks.map((rack, idx) => `
        <div style="margin-bottom:0.5rem;">
          <input type="radio" id="sf-rack-radio-${idx}" name="sf-fulfillment-rack" value="${rack}" ${idx === 0 ? "checked" : ""}>
          <label for="sf-rack-radio-${idx}" style="color:var(--text-main); font-weight:500; cursor:pointer;">${rack} (Stock Room Availability: ${prod.stockRoomQty})</label>
        </div>`).join("");

  modal.classList.add("active");
}

function closeSFMovementFulfillmentModal() {
  document.getElementById("sf-fulfillment-modal").classList.remove("active");
}

// --- 5. Stock Out - Big Client ---
function renderStockOutClientView() {
  const products = DB.get("products") || [];
  const clientOrders = DB.get("clientOrders") || [];

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

  const productsGrid = document.getElementById("client-order-products-grid");
  productsGrid.innerHTML = products.map(p => {
    const unitText = p.unit === "rolls/meters" ? "meters" : "pcs";
    return `
      <div class="input-grid-item">
        <input type="checkbox" id="chk-client-prod-${p.id}" value="${p.id}" onchange="toggleClientProductQtyInput('${p.id}')">
        <label for="chk-client-prod-${p.id}" class="input-grid-name">${p.name} (Stock Room: ${p.stockRoomQty})</label>
        <input type="number" id="qty-client-prod-${p.id}" placeholder="Qty" min="1" disabled class="input-grid-qty">
      </div>`;
  }).join("");
}

function toggleClientProductQtyInput(id) {
  const checkbox = document.getElementById(`chk-client-prod-${id}`);
  const qtyInput = document.getElementById(`qty-client-prod-${id}`);
  qtyInput.disabled = !checkbox.checked;
  if (checkbox.checked) { qtyInput.value = 5; qtyInput.focus(); }
  else { qtyInput.value = ""; }
}

function onClientOrderSelected() {
  const select = document.getElementById("client-order-detail-select");
  const orderId = select.value;
  const card = document.getElementById("client-order-detail-card");

  if (!orderId) { card.style.display = "none"; return; }
  card.style.display = "";

  const order = (DB.get("clientOrders") || []).find(o => o.id === orderId);
  if (!order) return;

  // Timeline first (top)
  renderClientTimeline(order);

  document.getElementById("client-order-items-tbody").innerHTML = order.items.map(item => `
    <tr>
      <td><strong>${item.productName}</strong></td>
      <td>${item.orderedQty}</td>
      <td>${item.collectedQty !== null ? item.collectedQty : "-"}</td>
      <td><span class="badge badge-indigo">${item.rackSource || "-"}</span></td>
    </tr>`).join("");

  renderClientRoleActions(order);
}

function renderClientTimeline(order) {
  const steps = [
    { title: "Order Logged", desc: "Order details recorded.", handledKey: "loggedBy" },
    { title: "Collected & Set Aside", desc: "Products retrieved from racks.", handledKey: "collectedBy" },
    { title: "Store Front Verified", desc: "Order accuracy confirmed.", handledKey: "verifiedBy" },
    { title: "Dispatched", desc: "Client picked up. Hand-off complete.", handledKey: null }
  ];

  let activeStepIdx = 0;
  if (order.status === "Pending Staff Collection") activeStepIdx = 0;
  else if (order.status === "Pending Store Front Check") activeStepIdx = 1;
  else if (order.status === "Ready for Delivery/Pick-up") activeStepIdx = 2;
  else if (order.status === "Closed") activeStepIdx = 3;

  const h = order.handledBy || {};
  document.getElementById("client-timeline-stepper").innerHTML = steps.map((step, idx) => {
    const stateClass = idx < activeStepIdx ? "completed" : idx === activeStepIdx ? "active" : "";
    const isActive = idx === activeStepIdx;
    const handler = step.handledKey && h[step.handledKey] ? `<div class="timeline-meta"><span style="color:var(--success)">&#10003; ${h[step.handledKey]}</span></div>` : "";
    return `
      <div class="timeline-step ${stateClass}">
        <div class="timeline-bullet">${idx + 1}</div>
        <div class="timeline-content">
          <div class="timeline-title">
            <span>${step.title}</span>
            ${isActive ? `<span class="badge badge-indigo" style="font-size:0.65rem;">Active</span>` : ""}
          </div>
          <div class="timeline-desc">${step.desc}</div>
          ${handler}
        </div>
      </div>`;
  }).join("");
}

function renderClientRoleActions(order) {
  const panel = document.getElementById("client-order-actions-panel");
  const WAITING_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>`;
  const h = order.handledBy || {};

  if (order.status === "Pending Staff Collection") {
    // Both staff and storefront can collect — but whoever logged the order cannot collect (accountability)
    const isNonAdmin = currentRole === "staff" || currentRole === "storefront";
    const isSameAsLogger = h.loggedBy && h.loggedBy === currentUser.username;
    if (isNonAdmin && !isSameAsLogger) {
      const roleLabel = currentRole === "staff" ? "Stock Room Staff" : "Store Front Staff";
      const products = DB.get("products") || [];
      const inputsHtml = order.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const racks = prod ? prod.racks : [];
        return `
          <div class="input-grid-item">
            <span class="input-grid-name">${item.productName} <span style="font-size:0.75rem; color:var(--text-muted);">(Ordered: ${item.orderedQty})</span></span>
            <input type="number" id="col-qty-${item.productId}" value="${item.orderedQty}" min="0" class="input-grid-qty" placeholder="Col Qty">
            <select id="col-rack-${item.productId}" class="input-grid-rack">
              ${racks.map(r => `<option value="${r}">${r}</option>`).join("")}
            </select>
          </div>`;
      }).join("");
      panel.innerHTML = `
        <h4>Collect Products (${roleLabel})</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Collect counts from racks and set them in front of the stock room:</p>
        <div style="margin-bottom:1.25rem;">${inputsHtml}</div>
        <button class="btn btn-primary" onclick="staffSubmitClientCollection('${order.id}')">Set Aside &amp; Notify Store Front</button>`;
    } else if (isSameAsLogger) {
      panel.innerHTML = `<div class="d-flex align-center gap-1" style="color:var(--warning);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg><span>You logged this order — another staff member must collect the items.</span></div>`;
    } else {
      panel.innerHTML = `<div class="d-flex align-center gap-1" style="color:var(--text-muted);">${WAITING_ICON}<span>Awaiting Staff to collect and set items aside...</span></div>`;
    }
  } else if (order.status === "Pending Store Front Check") {
    // Both staff and storefront can verify — but whoever collected cannot verify (accountability)
    const isNonAdmin = currentRole === "staff" || currentRole === "storefront";
    const isSameAsCollector = h.collectedBy && h.collectedBy === currentUser.username;
    if (isNonAdmin && !isSameAsCollector) {
      const roleLabel = currentRole === "storefront" ? "Store Front Staff" : "Stock Room Staff";
      const collectorNote = h.collectedBy ? `<p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Collected by: <strong style="color:var(--success)">${h.collectedBy}</strong></p>` : "";
      panel.innerHTML = `
        <h4>Verify Client Order (${roleLabel})</h4>
        ${collectorNote}
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Inspect items set aside. Confirm order is complete and correct.</p>
        <button class="btn btn-success" onclick="storefrontVerifyClientOrder('${order.id}')">Verify Complete &amp; Ready for Delivery</button>`;
    } else if (isSameAsCollector) {
      panel.innerHTML = `<div class="d-flex align-center gap-1" style="color:var(--warning);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg><span>You collected this order — another staff member must verify it.</span></div>`;
    } else {
      panel.innerHTML = `<div class="d-flex align-center gap-1" style="color:var(--text-muted);">${WAITING_ICON}<span>Awaiting Staff to inspect and verify the set-aside products...</span></div>`;
    }
  } else if (order.status === "Ready for Delivery/Pick-up") {
    if (currentRole === "admin" || currentRole === "staff" || currentRole === "storefront") {
      const verifierNote = h.verifiedBy ? `<p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Verified by: <strong style="color:var(--success)">${h.verifiedBy}</strong></p>` : "";
      panel.innerHTML = `
        <h4>Final Pick-up &amp; Dispatch</h4>
        ${verifierNote}
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Client has arrived to collect. Confirm delivery hand-off.</p>
        <button class="btn btn-success" onclick="completeClientDispatch('${order.id}')">Log Client Pick-up (Close Workflow)</button>`;
    }
  } else if (order.status === "Closed") {
    panel.innerHTML = `
      <div class="d-flex align-center gap-1" style="color:var(--success);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="22 4 12 14 9 11"></polyline></svg>
        <span>This client order is dispatched and closed.</span>
      </div>`;
  }
}

// --- 6. Conversion View ---
function renderConversionView() {
  const products = DB.get("products") || [];
  const conversions = DB.get("conversions") || [];
  const rollProducts = products.filter(p => p.unit === "rolls/meters");

  const prodSelect = document.getElementById("conversion-product");
  prodSelect.innerHTML = '<option value="">-- Select Roll Product --</option>';
  rollProducts.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.text = `${p.name} (Stock Room: ${p.stockRoomQty} meters)`;
    prodSelect.appendChild(opt);
  });

  document.getElementById("conversion-meters").value = "";
  document.getElementById("conversion-cut-length").value = "1.09361";
  document.getElementById("conversion-estimated").value = "0";
  document.getElementById("conversion-actual").value = "";

  const tbody = document.getElementById("conversions-tbody");
  if (conversions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-data">No roll conversions recorded.</td></tr>';
    return;
  }
  tbody.innerHTML = conversions.map(c => {
    const date = new Date(c.date).toLocaleDateString();
    return `
      <tr>
        <td>${date}</td>
        <td><strong>${c.productName}</strong></td>
        <td>${c.metersDeducted}m</td>
        <td>${c.estimatedRolls} rolls</td>
        <td>${c.actualRolls} rolls</td>
        <td><strong>${c.conversionRate.toFixed(1)}%</strong></td>
        <td>${c.operator}</td>
      </tr>`;
  }).join("");
}

function onConversionInputsChange() {
  const productId = document.getElementById("conversion-product").value;
  const meters = parseFloat(document.getElementById("conversion-meters").value);
  const cutLength = parseFloat(document.getElementById("conversion-cut-length").value);
  if (!productId || isNaN(meters) || meters <= 0 || isNaN(cutLength) || cutLength <= 0) {
    document.getElementById("conversion-estimated").value = "0";
    return;
  }
  const estimated = Math.floor((meters * 1.09361) / cutLength);
  document.getElementById("conversion-estimated").value = estimated;
}

// --- 7. Adjustment View ---
function renderAdjustmentView() {
  const products = DB.get("products") || [];
  const adjustments = DB.get("adjustments") || [];

  const prodSelect = document.getElementById("adj-product");
  prodSelect.innerHTML = "";
  products.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.text = `${p.name} (Stock Room: ${p.stockRoomQty}, Storefront: ${p.storefrontQty})`;
    prodSelect.appendChild(opt);
  });

  const tbody = document.getElementById("adjustments-tbody");
  if (adjustments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-data">No stock adjustments recorded.</td></tr>';
    return;
  }
  tbody.innerHTML = adjustments.map(a => {
    const date = new Date(a.date).toLocaleDateString();
    const typeBadge = a.type === "In" ? '<span class="badge badge-success">Stock In</span>' : '<span class="badge badge-danger">Stock Out</span>';
    const statusBadge = a.status === "Requested" ? '<span class="badge badge-warning">Awaiting Fulfillment</span>' : `<span class="badge badge-success">Done${a.fulfilledBy ? ` · ${a.fulfilledBy}` : ""}</span>`;
    // Both staff and storefront can fulfill adjustments
    const canFulfill = currentRole === "staff" || currentRole === "storefront";
    const actionCell = a.status === "Requested"
      ? (canFulfill
          ? `<button class="btn btn-primary btn-sm" onclick="openAdjustmentFulfillModal('${a.id}')">Process Action</button>`
          : `<span style="font-size:0.8rem; color:var(--text-muted);">Awaiting Staff</span>`)
      : "-";
    return `
      <tr>
        <td><strong>${a.id}</strong></td>
        <td>${date}</td>
        <td>${typeBadge}</td>
        <td>${a.productName}</td>
        <td>${a.quantity}</td>
        <td>${statusBadge}</td>
        <td>${actionCell}</td>
      </tr>`;
  }).join("");
}

function openAdjustmentFulfillModal(adjId) {
  const adj = (DB.get("adjustments") || []).find(a => a.id === adjId);
  if (!adj) return;
  const prod = (DB.get("products") || []).find(p => p.id === adj.productId);
  if (!prod) return;
  const racks = DB.get("racks") || [];

  document.getElementById("adj-fulfillment-id").value = adjId;
  document.getElementById("adj-fulfillment-product-name").innerText = adj.productName;
  document.getElementById("adj-fulfillment-qty").innerText = adj.quantity;
  document.getElementById("adj-fulfillment-type").innerText = adj.type === "In" ? "Stock In (Shelving)" : "Stock Out (Retrieval)";

  const selectContainer = document.getElementById("adj-fulfillment-rack-container");
  const rackList = adj.type === "In" ? racks : prod.racks;
  const label = adj.type === "In" ? "Choose Destination Rack:" : "Select Rack to Pull From:";
  selectContainer.innerHTML = `
    <label>${label}</label>
    <select id="adj-fulfillment-rack" class="mt-2">
      ${rackList.map(r => `<option value="${r}">${r}</option>`).join("")}
    </select>`;

  document.getElementById("adj-fulfillment-modal").classList.add("active");
}

function closeAdjFulfillmentModal() {
  document.getElementById("adj-fulfillment-modal").classList.remove("active");
}
