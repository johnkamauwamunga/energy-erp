// Mock offload data
const offloads = [
  {
    id: 'OFFLOAD_001',
    stationId: 'JOSKA',
    companyId: 'COMP_001',
    tankId: 'TANK_003',
    energyCompanyId: 'SUP_001',
    deliveryNoteNumber: 'DN-2024-001',
    driverName: 'John Kamau',
    vehiclePlate: 'KAA 123A',
    expectedVolume: 15000,
    actualVolume: 14980,
    dipBefore: 5000,
    dipAfter: 19980,
    temperature: 25.5,
    density: 0.85,
    pumpsBefore: {
      'PUMP_003': {
        electric: 1250.50,
        cash: 980.25,
        manual: 320.75
      }
    },
    pumpsAfter: {
      'PUMP_003': {
        electric: 1280.75,
        cash: 1010.50,
        manual: 345.25
      }
    },
    salesDuringOffload: 85.00,
    startTime: '2024-05-15T08:30:00Z',
    endTime: '2024-05-15T10:15:00Z',
    status: 'completed'
  },
  {
    id: 'OFFLOAD_002',
    stationId: 'KITENGELA',
    companyId: 'COMP_001',
    tankId: 'TANK_004',
    energyCompanyId: 'SUP_002',
    deliveryNoteNumber: 'DN-2024-002',
    driverName: 'Mary Wanjiku',
    vehiclePlate: 'KBB 456B',
    expectedVolume: 20000,
    actualVolume: 19950,
    dipBefore: 8000,
    dipAfter: 27950,
    temperature: 26.2,
    density: 0.82,
    pumpsBefore: {
      'PUMP_004': {
        electric: 2150.25,
        cash: 1280.50,
        manual: 450.75
      },
      'PUMP_005': {
        electric: 1850.75,
        cash: 1120.25,
        manual: 380.50
      }
    },
    pumpsAfter: {
      'PUMP_004': {
        electric: 2200.50,
        cash: 1325.75,
        manual: 480.25
      },
      'PUMP_005': {
        electric: 1905.25,
        cash: 1175.50,
        manual: 405.75
      }
    },
    salesDuringOffload: 205.50,
    startTime: '2024-05-16T09:15:00Z',
    endTime: '2024-05-16T11:30:00Z',
    status: 'completed'
  },
  {
    id: 'OFFLOAD_003',
    stationId: 'NAIROBI_WEST',
    companyId: 'COMP_002',
    tankId: 'TANK_002',
    energyCompanyId: 'SUP_001',
    deliveryNoteNumber: 'DN-2024-003',
    driverName: 'Peter Otieno',
    vehiclePlate: 'KCC 789C',
    expectedVolume: 25000,
    actualVolume: 24920,
    dipBefore: 10000,
    dipAfter: 34920,
    temperature: 24.8,
    density: 0.83,
    pumpsBefore: {
      'PUMP_001': {
        electric: 3250.75,
        cash: 2150.25,
        manual: 750.50
      }
    },
    pumpsAfter: {
      'PUMP_001': {
        electric: 3325.25,
        cash: 2225.75,
        manual: 795.25
      }
    },
    salesDuringOffload: 195.75,
    startTime: '2024-05-17T10:00:00Z',
    endTime: '2024-05-17T12:45:00Z',
    status: 'completed'
  }
];

export default offloads;