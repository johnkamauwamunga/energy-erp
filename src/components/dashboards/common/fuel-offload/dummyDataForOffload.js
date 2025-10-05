// dummyDataForOffload.js
export const dummyData = {
  purchase: {
    id: 'purchase-123',
    purchaseNumber: 'PO-2024-001',
    supplier: { 
      id: 'supplier-1',
      name: 'XYZ Fuel Suppliers Ltd' 
    },
    totalAmount: 1500000,
    status: 'APPROVED',
    deliveryStatus: 'IN_TRANSIT',
    items: [
      {
        id: 'item-1',
        product: { 
          id: 'product-1', 
          name: 'Diesel', 
          fuelCode: 'AGO',
          density: 0.85,
          unit: 'LITER'
        },
        orderedQty: 10000,
        receivedQty: 0,
        unitCost: 150,
        totalCost: 1500000
      }
    ],
    station: {
      id: 'station-1',
      name: 'Main Station Nairobi'
    },
    createdAt: new Date().toISOString()
  },
  tanks: [
    {
      id: 'tank-1',
      name: 'Tank A - Diesel',
      capacity: 15000,
      currentVolume: 2500,
      maxCapacity: 15000,
      workingCapacity: 14500,
      deadStock: 500,
      product: { 
        id: 'product-1', 
        name: 'Diesel', 
        density: 0.85 
      },
      connectedPumps: [
        { 
          id: 'pump-1', 
          name: 'Pump A1', 
          island: 'Island 1',
          product: { name: 'Diesel', unitPrice: 150.5 }
        },
        { 
          id: 'pump-2', 
          name: 'Pump A2', 
          island: 'Island 1',
          product: { name: 'Diesel', unitPrice: 150.5 }
        }
      ]
    },
    {
      id: 'tank-2', 
      name: 'Tank B - Diesel',
      capacity: 12000,
      currentVolume: 1800,
      maxCapacity: 12000,
      workingCapacity: 11500,
      deadStock: 500,
      product: { 
        id: 'product-1', 
        name: 'Diesel', 
        density: 0.85 
      },
      connectedPumps: [
        { 
          id: 'pump-3', 
          name: 'Pump B1', 
          island: 'Island 2',
          product: { name: 'Diesel', unitPrice: 150.5 }
        },
        { 
          id: 'pump-4', 
          name: 'Pump B2', 
          island: 'Island 2',
          product: { name: 'Diesel', unitPrice: 150.5 }
        }
      ]
    }
  ],
  shift: {
    id: 'shift-123',
    shiftNumber: 1,
    stationId: 'station-1',
    status: 'OPEN'
  },
  station: {
    id: 'station-1',
    name: 'Main Station Nairobi',
    location: 'Nairobi CBD'
  }
};

// Initial offload data structure
export const initialOffloadData = {
  purchaseId: 'purchase-123',
  stationId: 'station-1',
  shiftId: 'shift-123',
  totalExpectedVolume: 10000,
  totalActualVolume: 0,
  notes: 'Fuel delivery from XYZ Suppliers - Regular diesel',
  tankOffloads: [],
  pumpSales: []
};

// Sample tank offloads for demonstration
export const sampleTankOffloads = [
  {
    tankId: 'tank-1',
    tankName: 'Tank A - Diesel',
    expectedVolume: 6000,
    actualVolume: 0,
    connectedPumps: dummyData.tanks[0].connectedPumps,
    dipBefore: {
      dipValue: 1.2,
      volume: 2500,
      temperature: 28.0,
      waterLevel: 0.0,
      density: 0.85
    },
    dipAfter: null,
    pumpReadingsBefore: [
      {
        pumpId: 'pump-1',
        pumpName: 'Pump A1',
        electricMeter: 12500.5,
        manualMeter: 12500.0,
        cashMeter: 12500.0,
        litersDispensed: 0,
        salesValue: 0,
        unitPrice: 150.5
      },
      {
        pumpId: 'pump-2',
        pumpName: 'Pump A2', 
        electricMeter: 8900.2,
        manualMeter: 8900.0,
        cashMeter: 8900.0,
        litersDispensed: 0,
        salesValue: 0,
        unitPrice: 150.5
      }
    ],
    pumpReadingsAfter: []
  },
  {
    tankId: 'tank-2',
    tankName: 'Tank B - Diesel', 
    expectedVolume: 4000,
    actualVolume: 0,
    connectedPumps: dummyData.tanks[1].connectedPumps,
    dipBefore: {
      dipValue: 0.8,
      volume: 1800,
      temperature: 27.5,
      waterLevel: 0.0,
      density: 0.85
    },
    dipAfter: null,
    pumpReadingsBefore: [
      {
        pumpId: 'pump-3',
        pumpName: 'Pump B1',
        electricMeter: 15600.3,
        manualMeter: 15600.0,
        cashMeter: 15600.0,
        litersDispensed: 0,
        salesValue: 0,
        unitPrice: 150.5
      },
      {
        pumpId: 'pump-4',
        pumpName: 'Pump B2',
        electricMeter: 11200.7,
        manualMeter: 11200.0,
        cashMeter: 11200.0,
        litersDispensed: 0,
        salesValue: 0,
        unitPrice: 150.5
      }
    ],
    pumpReadingsAfter: []
  }
];

// Mock service functions
export const mockOffloadServices = {
  purchaseService: {
    getPurchaseById: async (purchaseId) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(dummyData.purchase);
        }, 500);
      });
    }
  },
  stationService: {
    getTanksByStation: async (stationId) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(dummyData.tanks);
        }, 500);
      });
    }
  }
};

export default {
  dummyData,
  initialOffloadData,
  sampleTankOffloads,
  mockOffloadServices
};