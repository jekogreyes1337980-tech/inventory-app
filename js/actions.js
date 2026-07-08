// ============================================================
// actions.js - All Workflow Action / Business Logic Functions
// ============================================================

const UNIT_RATES = {
  'Meters': 1,
  'Yards': 1.09361,
  'Feet': 3.28084,
  'Inches': 39.3701,
  'Centimeters': 100,
};

// --- Supply Orders (Stock In) ---

function adminCreateSupplyOrder(event) {
  event.preventDefault();
  const supplier = document.getElementById("supply-order-supplier").value;
  const products = DB.get("products") || [];

  const selectedItems = [];
  products.forEach(p => {
    const chk = document.getElementById(`chk-order-prod-${p.id}`);
    if (chk && chk.checked) {
      const qty = parseInt(document.getElementById(`qty-order-prod-${p.id}`).value);
      if (!isNaN(qty) && qty > 0) {
        selectedItems.push({ productId: p.id, productName: p.name, orderedQty: qty, receivedQty: null, rackLocation: null });
      }
    }
  });

  if (selectedItems.length === 0) {
    showToast("Please select at least one product with a valid quantity.", "warning");
    return;
  }

  const supplyOrders = DB.get("supplyOrders") || [];
  const orderId = "SO-" + (1000 + supplyOrders.length + 1);
  supplyOrders.unshift({ id: orderId, supplier, dateCreated: new Date().toISOString(), status: "Draft", items: selectedItems, handledBy: { draftedBy: currentUser.username } });
  DB.set("supplyOrders", supplyOrders);

  showToast(`Supply Order ${orderId} created as Draft!`, "success");
  renderStockInView();
  document.getElementById("supply-order-detail-select").value = orderId;
  onSupplyOrderSelected();
}

function adminForwardSupplyOrder(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  order.status = "For Staff Confirmation";
  DB.set("supplyOrders", orders);
  pushNotification("New Supply Delivery Expected", `Verify delivery contents for Supply Order ${orderId} from ${order.supplier}.`, "staff", { tab: "stock-in", supplyOrderId: orderId });
  onSupplyOrderSelected();
}

function staffSubmitDeliveries(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  for (const item of order.items) {
    const qtyInput = document.getElementById(`rec-qty-${item.productId}`);
    const rackSelect = document.getElementById(`rec-rack-${item.productId}`);
    if (qtyInput && rackSelect) {
      const recQty = parseInt(qtyInput.value);
      if (isNaN(recQty) || recQty < 0) {
        showToast("Please enter a valid received quantity.", "warning");
        return;
      }
      item.receivedQty = recQty;
      item.rackLocation = rackSelect.value;
    }
  }

  order.status = "Staff Checked";
  if (!order.handledBy) order.handledBy = {};
  order.handledBy.confirmedBy = currentUser.username;
  DB.set("supplyOrders", orders);
  pushNotification("Delivery Logs Ready for Check", `Verification required on received items for Supply Order ${orderId}.`, "admin", { tab: "stock-in", supplyOrderId: orderId });
  showToast(`Deliveries recorded by ${currentUser.username}. Forwarded to Admin.`, "success");
  onSupplyOrderSelected();
}

function adminOpenDiscrepancyReview(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  order.status = "Reviewed Discrepancy";
  DB.set("supplyOrders", orders);
  onSupplyOrderSelected();
}

function adminCloseSupplyOrder(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.status = "Closed";
  DB.set("supplyOrders", orders);
  _updateProductStockFromItems(order.items);
  showToast(`Supply Order ${orderId} closed. Inventory counts updated.`, "success");
  onSupplyOrderSelected();
}

function adminSettleRefund(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.status = "Closed (Refunded)";
  DB.set("supplyOrders", orders);
  _updateProductStockFromItems(order.items);
  showToast(`Order ${orderId} finalized. Discrepancy tagged as REFUNDED.`, "success");
  onSupplyOrderSelected();
}

function adminSettleCorrection(orderId) {
  const orders = DB.get("supplyOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.status = "Reviewed Discrepancy (Correction)";
  DB.set("supplyOrders", orders);
  pushNotification("Missing Shipment Incoming", `Supplier corrections for Supply Order ${orderId} will arrive next shipment. Re-verify deliveries.`, "staff", { tab: "stock-in", supplyOrderId: orderId });
  showToast("Correction flag set. Returned order to Stock Staff queue.", "success");
  onSupplyOrderSelected();
}

// Helper: add received quantities and rack locations to product records
function _updateProductStockFromItems(items) {
  const products = DB.get("products") || [];
  items.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (prod) {
      prod.stockRoomQty += item.receivedQty;
      if (item.rackLocation && !prod.racks.includes(item.rackLocation)) {
        prod.racks.push(item.rackLocation);
      }
    }
  });
  DB.set("products", products);
}

// --- Store Front Stock Movement ---

function requestRestockSF(prodId) {
  const prod = (DB.get("products") || []).find(p => p.id === prodId);
  if (!prod) return;
  const reqQty = prod.threshold * 2;
  const requests = DB.get("storefrontRequests") || [];
  const reqId = "SF-REQ-" + (100 + requests.length + 1);
  requests.unshift({ id: reqId, productId: prodId, productName: prod.name, quantity: reqQty, dateCreated: new Date().toISOString(), status: "Pending", requestedBy: currentUser.username });
  DB.set("storefrontRequests", requests);
  pushNotification("Storefront Stock Replenish Requested", `Bring out ${reqQty} units of ${prod.name} from Rack locations to storefront.`, "staff", { tab: "stock-out-sf" });
  renderStockOutSFView();
}

function adminSubmitSFRequest(event) {
  event.preventDefault();
  const prodId = document.getElementById("sf-movement-product").value;
  const qty = parseInt(document.getElementById("sf-movement-qty").value);
  if (!prodId || isNaN(qty) || qty <= 0) {
    showToast("Please enter a valid product and quantity.", "warning");
    return;
  }
  const prod = (DB.get("products") || []).find(p => p.id === prodId);
  if (!prod) return;
  const requests = DB.get("storefrontRequests") || [];
  const reqId = "SF-REQ-" + (100 + requests.length + 1);
  requests.unshift({ id: reqId, productId: prodId, productName: prod.name, quantity: qty, dateCreated: new Date().toISOString(), status: "Pending", requestedBy: currentUser.username });
  DB.set("storefrontRequests", requests);
  pushNotification("Fulfillment Requested", `Move ${qty} units of ${prod.name} from racks to storefront.`, "staff", { tab: "stock-out-sf" });
  showToast(`Request ${reqId} created.`, "success");
  document.getElementById("sf-movement-qty").value = "";
  renderStockOutSFView();
}

function submitSFMovementFulfillment() {
  const reqId = document.getElementById("sf-fulfillment-req-id").value;
  const selectedRackEl = document.querySelector('input[name="sf-fulfillment-rack"]:checked');
  if (!selectedRackEl) { showToast("Please select a rack source.", "warning"); return; }

  const requests = DB.get("storefrontRequests") || [];
  const req = requests.find(r => r.id === reqId);
  if (!req) return;

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
  req.rackSource = selectedRackEl.value;
  req.fulfilledBy = currentUser.username;
  DB.set("storefrontRequests", requests);
  pushNotification("Storefront Stock Filled", `Delivered ${req.quantity} of ${req.productName} from ${req.rackSource} to storefront shelves.`, "admin", { tab: "stock-out-sf" });
  closeSFMovementFulfillmentModal();
  renderStockOutSFView();
}

// --- Client Orders (Stock Out - Big Client) ---

function createClientOrder(event) {
  event.preventDefault();
  const clientName = document.getElementById("client-order-name").value;
  const products = DB.get("products") || [];

  const orderItems = [];
  products.forEach(p => {
    const chk = document.getElementById(`chk-client-prod-${p.id}`);
    if (chk && chk.checked) {
      const qty = parseInt(document.getElementById(`qty-client-prod-${p.id}`).value);
      if (!isNaN(qty) && qty > 0) {
        orderItems.push({ productId: p.id, productName: p.name, orderedQty: qty, collectedQty: null, rackSource: null });
      }
    }
  });

  if (!clientName || orderItems.length === 0) {
    showToast("Please enter client details and select products.", "warning");
    return;
  }

  const clientOrders = DB.get("clientOrders") || [];
  const orderId = "CO-" + (5000 + clientOrders.length + 1);
  clientOrders.unshift({ id: orderId, clientName, dateCreated: new Date().toISOString(), status: "Pending Staff Collection", items: orderItems, handledBy: { loggedBy: currentUser.username } });
  DB.set("clientOrders", clientOrders);
  pushNotification("New Big Client Order", `Retrieve and record ${orderItems.length} products for client ${clientName}.`, "staff", { tab: "stock-out-client", clientOrderId: orderId });
  showToast(`Client Order ${orderId} logged.`, "success");
  renderStockOutClientView();
  document.getElementById("client-order-detail-select").value = orderId;
  onClientOrderSelected();
}

function staffSubmitClientCollection(orderId) {
  const orders = DB.get("clientOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  for (const item of order.items) {
    const qtyInput = document.getElementById(`col-qty-${item.productId}`);
    const rackSelect = document.getElementById(`col-rack-${item.productId}`);
    if (qtyInput && rackSelect) {
      const colQty = parseInt(qtyInput.value);
      if (isNaN(colQty) || colQty < 0) {
        showToast("Please enter a valid collection count.", "warning");
        return;
      }
      item.collectedQty = colQty;
      item.rackSource = rackSelect.value;
    }
  }

  order.status = "Pending Store Front Check";
  if (!order.handledBy) order.handledBy = {};
  order.handledBy.collectedBy = currentUser.username;
  DB.set("clientOrders", orders);
  pushNotification("Client Order Set Aside", `Items for ${order.clientName} (Order ${orderId}) are set in front. Please verify.`, "storefront", { tab: "stock-out-client", clientOrderId: orderId });
  showToast(`Products collected by ${currentUser.username} and set aside.`, "success");
  onClientOrderSelected();
}

function storefrontVerifyClientOrder(orderId) {
  const orders = DB.get("clientOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  // Accountability guard: cannot verify if you were the one who collected
  if ((order.handledBy || {}).collectedBy === currentUser.username) {
    showToast("You collected this order — another staff member must verify it.", "warning");
    return;
  }
  order.status = "Ready for Delivery/Pick-up";
  if (!order.handledBy) order.handledBy = {};
  order.handledBy.verifiedBy = currentUser.username;
  DB.set("clientOrders", orders);
  pushNotification("Client Order Verification Cleared", `Order ${orderId} for ${order.clientName} verified by ${currentUser.username} and is ready for dispatch.`, "admin", { tab: "stock-out-client", clientOrderId: orderId });
  showToast(`Order verified by ${currentUser.username}. Ready for delivery.`, "success");
  onClientOrderSelected();
}

function completeClientDispatch(orderId) {
  const orders = DB.get("clientOrders") || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.status = "Closed";
  DB.set("clientOrders", orders);
  const products = DB.get("products") || [];
  order.items.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (prod) prod.stockRoomQty = Math.max(0, prod.stockRoomQty - item.collectedQty);
  });
  DB.set("products", products);
  showToast(`Client Order ${orderId} delivered. Inventory stock room counts updated.`, "success");
  onClientOrderSelected();
}

// --- Roll Conversion ---

function executeRollConversion(event) {
  event.preventDefault();
  const prodId = document.getElementById("conversion-product").value;
  const inputUnit = document.getElementById("conversion-input-unit").value;
  const inputAmount = parseFloat(document.getElementById("conversion-amount").value);
  const targetUnit = document.getElementById("conversion-target-unit").value;
  const cutLength = parseFloat(document.getElementById("conversion-cut-length").value);
  const actual = parseInt(document.getElementById("conversion-actual").value);
  const estimated = parseInt(document.getElementById("conversion-estimated").value);

  if (!prodId || isNaN(inputAmount) || inputAmount <= 0 || isNaN(cutLength) || cutLength <= 0 || isNaN(actual) || actual < 0) {
    showToast("Please fill all details with valid positive parameters.", "warning");
    return;
  }

  const products = DB.get("products") || [];
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  const deductedMeters = inputAmount / UNIT_RATES[inputUnit];

  if (prod.stockRoomQty < deductedMeters) {
    showToast(`Insufficient roll meters in stock room (${prod.stockRoomQty.toFixed(2)}m available).`, "danger");
    return;
  }

  const rate = estimated > 0 ? (actual / estimated) * 100 : 100;
  prod.stockRoomQty -= deductedMeters;
  prod.storefrontQty += actual;
  DB.set("products", products);

  const conversions = DB.get("conversions") || [];
  conversions.unshift({
    id: "CONV-" + (100 + conversions.length + 1),
    date: new Date().toISOString(),
    productId: prodId, productName: prod.name,
    inputAmount: inputAmount, inputUnit: inputUnit,
    targetUnit: targetUnit, cutLength: cutLength,
    metersDeducted: deductedMeters, estimatedRolls: estimated,
    actualRolls: actual, conversionRate: rate,
    operator: getRoleName(currentRole)
  });
  DB.set("conversions", conversions);
  showToast("Roll stock conversion completed successfully!", "success");
  renderConversionView();
}

// --- Stock Adjustments ---

function adminSubmitAdjustment(event) {
  event.preventDefault();
  const prodId = document.getElementById("adj-product").value;
  const type = document.getElementById("adj-type").value;
  const qty = parseInt(document.getElementById("adj-qty").value);
  if (!prodId || isNaN(qty) || qty <= 0) {
    showToast("Please enter a valid product and quantity.", "warning");
    return;
  }
  const prod = (DB.get("products") || []).find(p => p.id === prodId);
  if (!prod) return;

  const adjustments = DB.get("adjustments") || [];
  const adjId = "ADJ-" + (1000 + adjustments.length + 1);
  adjustments.unshift({ id: adjId, date: new Date().toISOString(), type, productId: prodId, productName: prod.name, quantity: qty, status: "Requested", requestedBy: currentUser.username });
  DB.set("adjustments", adjustments);
  pushNotification(`Inventory Adjustment ${type} Requested`, `Fulfill: ${type === "In" ? "Put in" : "Get out"} ${qty} units of ${prod.name} in Stock Room.`, "staff", { tab: "adjustment" });
  showToast(`Adjustment Request ${adjId} logged.`, "success");
  document.getElementById("adj-qty").value = "";
  renderAdjustmentView();
}

function fulfillAdjustment() {
  const adjId = document.getElementById("adj-fulfillment-id").value;
  const rackSelect = document.getElementById("adj-fulfillment-rack");
  if (!rackSelect) { showToast("No rack location selected.", "warning"); return; }

  const adjs = DB.get("adjustments") || [];
  const adj = adjs.find(a => a.id === adjId);
  if (!adj) return;

  const products = DB.get("products") || [];
  const prod = products.find(p => p.id === adj.productId);
  if (prod) {
    if (adj.type === "In") {
      prod.stockRoomQty += adj.quantity;
      if (!prod.racks.includes(rackSelect.value)) prod.racks.push(rackSelect.value);
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
  adj.rackFlipped = rackSelect.value;
  adj.fulfilledBy = currentUser.username;
  DB.set("adjustments", adjs);
  pushNotification("Adjustment Task Processed", `Completed ${adj.type === "In" ? "Store In" : "Stock Out"} of ${adj.quantity} ${adj.productName} via ${rackSelect.value} by ${currentUser.username}.`, "admin", { tab: "adjustment" });
  closeAdjFulfillmentModal();
  renderAdjustmentView();
}
