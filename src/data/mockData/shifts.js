// src/data/mockData/shifts.js
const shifts = [
  {
    id: 'SHIFT_004',
    stationId: 'JOSKA',
    supervisorId: 'SUP_001',
    status: 'closed',
    startTime: '2024-03-15T08:00:00Z',
    endTime: '2024-03-15T16:00:00Z',
    priceListId: 'PRICE_LIST_001',
    
    // Tank dip readings
    tankReadings: [
      {
        tankId: 'TANK_003',
        readingType: 'START',
        value: 12500, // Opening dip in liters
        temperature: 25.5,
        recordedById: 'SUP_001'
      },
      {
        tankId: 'TANK_003',
        readingType: 'END',
        value: 9800, // Closing dip in liters
        temperature: 26.2,
        recordedById: 'SUP_001'
      }
    ],
    
    // Pump meter readings
    pumpReadings: [
      {
        pumpId: 'PUMP_003',
        readingType: 'START',
        meterType: 'ELECTRIC',
        value: 1250.50,
        recordedById: 'SUP_001'
      },
      {
        pumpId: 'PUMP_003',
        readingType: 'START',
        meterType: 'CASH',
        value: 980.25,
        recordedById: 'SUP_001'
      },
      {
        pumpId: 'PUMP_003',
        readingType: 'START',
        meterType: 'MANUAL',
        value: 320.75,
        recordedById: 'SUP_001'
      },
      {
        pumpId: 'PUMP_003',
        readingType: 'END',
        meterType: 'ELECTRIC',
        value: 1280.75,
        recordedById: 'SUP_001'
      },
      {
        pumpId: 'PUMP_003',
        readingType: 'END',
        meterType: 'CASH',
        value: 1010.50,
        recordedById: 'SUP_001'
      },
      {
        pumpId: 'PUMP_003',
        readingType: 'END',
        meterType: 'MANUAL',
        value: 345.25,
        recordedById: 'SUP_001'
      }
    ],
    
    // Non-fuel inventory
    nonFuelStocks: [
      {
        productId: 'HELIX_500G',
        islandId: 'ISL_001',
        openingStock: 50,
        closingStock: 45,
        soldQuantity: 5,
        recordedById: 'SUP_001'
      }
    ],
    
    // Attendants
    attendants: [
      { id: 'ATT_001', islandId: 'ISL_001', posting: 'Dispenser 1', totalSales: 8500 },
      { id: 'ATT_002', islandId: 'ISL_001', posting: 'Dispenser 2', totalSales: 9200 },
      { id: 'ATT_003', islandId: 'ISL_001', posting: 'Dispenser 3', totalSales: 7800 }
    ],
    
    // Sales data
    sales: [
      {
        productId: 'DIESEL',
        quantity: 2500,
        unitPrice: 180.50,
        total: 451250,
        pumpId: 'PUMP_003'
      }
    ],
    
    // Financials
    collections: {
      cash: 350000,
      credit: 101250,
      other: 0
    },
    
    // Reconciliation
    reconciliation: {
      status: 'completed',
      variance: -1250,
      variancePct: -0.28
    }
  }
];

export default shifts;