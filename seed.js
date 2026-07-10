const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DEFAULT_PRODUCTS = [
  { id: "prod-1", name: "Cartolina Roll (Red)", category: "Paper Rolls", unit: "rolls/meters", stockRoomQty: 25, storefrontQty: 5, threshold: 10, racks: ["Rack A-1"], cost: 15.00, price: 25.00, rollLengthMeters: 10, convertedStock: 0 },
  { id: "prod-2", name: "Foil Wrap (Silver)", category: "Foil Rolls", unit: "rolls/meters", stockRoomQty: 40, storefrontQty: 2, threshold: 8, racks: ["Rack A-2"], cost: 30.00, price: 50.00, rollLengthMeters: 20, convertedStock: 0 },
  { id: "prod-3", name: "A4 Copy Paper (Ream)", category: "Office Supplies", unit: "pcs", stockRoomQty: 100, storefrontQty: 15, threshold: 20, racks: ["Rack B-1", "Rack B-2"], cost: 120.00, price: 180.00, rollLengthMeters: 0, convertedStock: 0 },
  { id: "prod-4", name: "Pilot G2 Gel Pen (Black)", category: "Writing Instruments", unit: "pcs", stockRoomQty: 200, storefrontQty: 30, threshold: 40, racks: ["Rack C-1"], cost: 45.00, price: 65.00, rollLengthMeters: 0, convertedStock: 0 },
  { id: "prod-5", name: "Double Sided Tape 1-inch", category: "Adhesives", unit: "pcs", stockRoomQty: 50, storefrontQty: 8, threshold: 12, racks: ["Rack C-2"], cost: 20.00, price: 35.00, rollLengthMeters: 0, convertedStock: 0 }
];
const DEFAULT_RACKS = ["Rack A-1", "Rack A-2", "Rack B-1", "Rack B-2", "Rack C-1", "Rack C-2"];
const DEFAULT_SUPPLIERS = ["PaperCo Distributors", "Foil & Wrap Supplies Inc.", "OfficeMart Wholesalers", "Pen & Ink Stationery Corp."];

const MOCK_DATA = {
  products: DEFAULT_PRODUCTS,
  racks: DEFAULT_RACKS,
  suppliers: DEFAULT_SUPPLIERS,
  supplyOrders: [],
  storefrontRequests: [],
  clientOrders: [],
  conversions: [],
  adjustments: [],
  notifications: [
    {
      id: "notif-1",
      title: "System Initialized",
      message: "Welcome to Ms. Irene's Inventory Management Simulator. Switch roles to simulate workflows.",
      timestamp: new Date().toISOString(),
      role: "admin",
      read: false
    }
  ]
};

async function seed() {
  const db = await open({
    filename: './data.db',
    driver: sqlite3.Database
  });

  await db.exec(`CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)`);

  for (const [key, value] of Object.entries(MOCK_DATA)) {
    await db.run(`
      INSERT INTO store (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, key, JSON.stringify(value));
  }

  console.log('Database successfully seeded with mock data!');
}

seed().catch(console.error);
