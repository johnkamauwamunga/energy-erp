// Define islands
const islands = [
  // Joska Station Islands
  {
    id: 'ISL_001',
    name: 'Island A',
    stationId: 'JOSKA',
    companyId: 'COMP_001',
    createdAt: '2024-04-01'
  },
  {
    id: 'ISL_002',
    name: 'Island B',
    stationId: 'JOSKA',
    companyId: 'COMP_001',
    createdAt: '2024-04-02'
  },
  // Kitengela Station Island
  {
    id: 'ISL_003',
    name: 'Island C',
    stationId: 'KITENGELA',
    companyId: 'COMP_001',
    createdAt: '2024-04-03'
  },
  // Nairobi West Station Island
  {
    id: 'ISL_004',
    name: 'Island D',
    stationId: 'NAIROBI_WEST',
    companyId: 'COMP_002',
    createdAt: '2024-04-04'
  }
];

// Define tanks
const tanks = [
  // Company-level tanks (unassigned)
  {
    id: 'TANK_001',
    code: 'T-001',
    companyId: 'COMP_001',
    stationId: null,
    islandId: null,
    capacity: 30000,
    productType: 'Diesel',
    createdAt: '2024-05-01'
  },
  {
    id: 'TANK_002',
    code: 'T-002',
    companyId: 'COMP_002',
    stationId: null,
    islandId: null,
    capacity: 40000,
    productType: 'Petrol',
    createdAt: '2024-05-02'
  },
  // Assigned to Joska but NOT attached to an island
  {
    id: 'TANK_003',
    code: 'T-003',
    companyId: 'COMP_001',
    stationId: 'JOSKA',
    islandId: null,
    capacity: 20000,
    productType: 'Diesel',
    createdAt: '2024-05-03'
  },
  // Fully attached tank (Kitengela)
  {
    id: 'TANK_004',
    code: 'T-004',
    companyId: 'COMP_001',
    stationId: 'KITENGELA',
    islandId: 'ISL_003',
    capacity: 25000,
    productType: 'Petrol',
    createdAt: '2024-05-04'
  }
];

// Define pumps
const pumps = [
  // Company-level pump (unassigned)
  {
    id: 'PUMP_001',
    code: 'P-001',
    companyId: 'COMP_001',
    stationId: null,
    tankId: null,
    islandId: null,
    createdAt: '2024-05-05'
  },
  // Pump assigned to Joska but NOT attached
  {
    id: 'PUMP_002',
    code: 'P-002',
    companyId: 'COMP_001',
    stationId: 'JOSKA',
    tankId: null,
    islandId: null,
    createdAt: '2024-05-06'
  },
  // Pump attached to a tank but NOT an island (Joska)
  {
    id: 'PUMP_003',
    code: 'P-003',
    companyId: 'COMP_001',
    stationId: 'JOSKA',
    tankId: 'TANK_003',
    islandId: null,
    createdAt: '2024-05-07'
  },
  // Fully attached pump (Kitengela)
  {
    id: 'PUMP_004',
    code: 'P-004',
    companyId: 'COMP_001',
    stationId: 'KITENGELA',
    tankId: 'TANK_004',
    islandId: 'ISL_003',
    createdAt: '2024-05-08'
  },
  // Another fully attached pump (Kitengela)
  {
    id: 'PUMP_005',
    code: 'P-005',
    companyId: 'COMP_001',
    stationId: 'KITENGELA',
    tankId: 'TANK_004',
    islandId: 'ISL_003',
    createdAt: '2024-05-09'
  }
];

// Export as a single assets object
const assets = {
  tanks,
  pumps,
  islands
};

export default assets;