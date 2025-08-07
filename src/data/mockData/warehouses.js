// src/data/mockData/warehouses.js
const warehouses = [
  {
    id: 'WH_001',
    stationId: 'JOSKA',
    name: 'Joska Main Warehouse',
    location: 'Back of station, Building A',
    manager: 'Peter Mwangi',
    capacity: '1000 sqm',
    nonFuelItems: [
      {
        itemId: 'HELIX_500G',
        name: 'Helix Ultra 500g',
        buyingPrice: 3800,   // Cost price per unit
        sellingPrice: 4500,  // Retail price per unit
        currentStock: 150,   // Current inventory count
        minStockLevel: 20,   // Reorder threshold
        category: 'engine-oil'
      },
      {
        itemId: 'QUARTZ_1L',
        name: 'Total Quartz 1L',
        buyingPrice: 2800,
        sellingPrice: 3500,
        currentStock: 200,
        minStockLevel: 30,
        category: 'engine-oil'
      },
      {
        itemId: 'COOLANT_5L',
        name: 'Shell Coolant 5L',
        buyingPrice: 1800,
        sellingPrice: 2500,
        currentStock: 75,
        minStockLevel: 10,
        category: 'coolants'
      }
    ]
  },
  {
    id: 'WH_002',
    stationId: 'KITENGELA',
    name: 'Kitengela Storage',
    location: 'Side building, Room 3',
    manager: 'Grace Wanjiku',
    capacity: '800 sqm',
    nonFuelItems: [
      {
        itemId: 'HELIX_500G',
        name: 'Helix Ultra 500g',
        buyingPrice: 3800,
        sellingPrice: 4500,
        currentStock: 120,
        minStockLevel: 20,
        category: 'engine-oil'
      },
      {
        itemId: 'WIPER_BOSCH',
        name: 'Bosch Wiper Blades',
        buyingPrice: 1200,
        sellingPrice: 1800,
        currentStock: 50,
        minStockLevel: 15,
        category: 'car-accessories'
      }
    ]
  },
  {
    id: 'WH_003',
    stationId: 'NAIROBI_WEST',
    name: 'Nairobi West Depot',
    location: 'Main storage complex',
    manager: 'David Omondi',
    capacity: '1500 sqm',
    nonFuelItems: [
      {
        itemId: 'QUARTZ_1L',
        name: 'Total Quartz 1L',
        buyingPrice: 2800,
        sellingPrice: 3500,
        currentStock: 180,
        minStockLevel: 30,
        category: 'engine-oil'
      },
      {
        itemId: 'AIR_FRESH',
        name: 'Air Freshener',
        buyingPrice: 200,
        sellingPrice: 500,
        currentStock: 300,
        minStockLevel: 50,
        category: 'car-accessories'
      }
    ]
  },
  {
    id: 'WH_004',
    stationId: 'THIKA',
    name: 'Thika Central Storage',
    location: 'Station annex building',
    manager: 'Susan Kariuki',
    capacity: '900 sqm',
    nonFuelItems: [
      {
        itemId: 'COOLANT_5L',
        name: 'Shell Coolant 5L',
        buyingPrice: 1800,
        sellingPrice: 2500,
        currentStock: 60,
        minStockLevel: 10,
        category: 'coolants'
      },
      {
        itemId: 'TYRE_GOODYEAR',
        name: 'Goodyear Tyre 185/65R15',
        buyingPrice: 8500,
        sellingPrice: 12000,
        currentStock: 25,
        minStockLevel: 5,
        category: 'tyres'
      }
    ]
  }
];

export default warehouses;