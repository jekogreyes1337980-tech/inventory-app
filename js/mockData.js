const DEFAULT_PRODUCTS = [
  {
    id: "prod-1",
    name: "Cartolina Roll (Red)",
    category: "Paper Rolls",
    unit: "rolls/meters",
    stockRoomQty: 25, // in meters
    storefrontQty: 5,  // in pieces/rolls (once pre-cut)
    threshold: 10,
    racks: ["Rack A-1"],
    cost: 15.00,
    price: 25.00,
    rollLengthMeters: 10
  },
  {
    id: "prod-2",
    name: "Foil Wrap (Silver)",
    category: "Foil Rolls",
    unit: "rolls/meters",
    stockRoomQty: 40, // in meters
    storefrontQty: 2,  // in pieces/rolls (once pre-cut)
    threshold: 8,
    racks: ["Rack A-2"],
    cost: 30.00,
    price: 50.00,
    rollLengthMeters: 20
  },
  {
    id: "prod-3",
    name: "A4 Copy Paper (Ream)",
    category: "Office Supplies",
    unit: "pcs",
    stockRoomQty: 100,
    storefrontQty: 15,
    threshold: 20,
    racks: ["Rack B-1", "Rack B-2"],
    cost: 120.00,
    price: 180.00,
    rollLengthMeters: 0
  },
  {
    id: "prod-4",
    name: "Pilot G2 Gel Pen (Black)",
    category: "Writing Instruments",
    unit: "pcs",
    stockRoomQty: 200,
    storefrontQty: 30,
    threshold: 40,
    racks: ["Rack C-1"],
    cost: 45.00,
    price: 65.00,
    rollLengthMeters: 0
  },
  {
    id: "prod-5",
    name: "Double Sided Tape 1-inch",
    category: "Adhesives",
    unit: "pcs",
    stockRoomQty: 50,
    storefrontQty: 8,
    threshold: 12,
    racks: ["Rack C-2"],
    cost: 20.00,
    price: 35.00,
    rollLengthMeters: 0
  }
];

const DEFAULT_RACKS = [
  "Rack A-1",
  "Rack A-2",
  "Rack B-1",
  "Rack B-2",
  "Rack C-1",
  "Rack C-2"
];

const DEFAULT_SUPPLIERS = [
  "PaperCo Distributors",
  "Foil & Wrap Supplies Inc.",
  "OfficeMart Wholesalers",
  "Pen & Ink Stationery Corp."
];

// Export to window object for access in SPA without ES module configuration issues
window.DEFAULT_INVENTORY_DATA = {
  products: DEFAULT_PRODUCTS,
  racks: DEFAULT_RACKS,
  suppliers: DEFAULT_SUPPLIERS
};
