// ============================================================
// db.js - API Wrapper (replaces localStorage)
// ============================================================
const DB = {
  get(key) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `/api/data/${key}`, false);
      xhr.send(null);
      if (xhr.status === 200) {
        return JSON.parse(xhr.responseText);
      }
      return null;
    } catch (e) {
      console.error("Error reading from API key: " + key, e);
      return null;
    }
  },

  set(key, value) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/data/${key}`, false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(value));
    } catch (e) {
      console.error("Error writing to API key: " + key, e);
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
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/reset`, false);
      xhr.send(null);
    } catch (e) {
      console.error("Error resetting API", e);
    }
    this.init();
    showToast("Database has been reset to default mock values.", "info");
    location.reload();
  }
};
