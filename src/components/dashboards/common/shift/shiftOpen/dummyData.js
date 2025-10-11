// Dummy Data for Shift Creation Demo
export const dummyData = {
  // Station Information
  station: {
    id: "bcbd0ff7-0d74-4b26-a419-c11ead677561",
    name: "Joska Service station",
    location: "Joska",
    activePriceList: {
      id: "11651bc5-c287-4702-9c64-efe4db4a3e03",
      name: "Standard Pricing - Jan 2024"
    }
  },

  // Users (Attendants & Supervisors)
  users: [
    // Supervisors
    {
      id: "supervisor-1",
      firstName: "John",
      lastName: "Kamau",
      email: "john.kamau@station.com",
      role: "SUPERVISOR",
      status: "ACTIVE",
      phone: "+254712345678"
    },
    {
      id: "supervisor-2", 
      firstName: "Mary",
      lastName: "Wanjiku",
      email: "mary.wanjiku@station.com",
      role: "SUPERVISOR",
      status: "ACTIVE",
      phone: "+254712345679"
    },

    // Attendants
    {
      id: "attendant-1",
      firstName: "Peter",
      lastName: "Mwangi",
      email: "peter.mwangi@station.com",
      role: "ATTENDANT",
      status: "ACTIVE",
      phone: "+254712345680"
    },
    {
      id: "attendant-2",
      firstName: "Grace",
      lastName: "Akinyi", 
      email: "grace.akinyi@station.com",
      role: "ATTENDANT",
      status: "ACTIVE",
      phone: "+254712345681"
    },
    {
      id: "attendant-3",
      firstName: "David",
      lastName: "Ochieng",
      email: "david.ochieng@station.com",
      role: "ATTENDANT", 
      status: "ACTIVE",
      phone: "+254712345682"
    },
    {
      id: "attendant-4",
      firstName: "Sarah",
      lastName: "Nyambura",
      email: "sarah.nyambura@station.com",
      role: "ATTENDANT",
      status: "ACTIVE", 
      phone: "+254712345683"
    }
  ],

  // Price Lists
  priceLists: [
    {
      id: "11651bc5-c287-4702-9c64-efe4db4a3e03",
      name: "Standard Pricing - Jan 2024",
      effectiveDate: "2024-01-01",
      isActive: true
    },
    {
      id: "22651bc5-c287-4702-9c64-efe4db4a3e04", 
      name: "Premium Pricing - Jan 2024",
      effectiveDate: "2024-01-01",
      isActive: false
    }
  ],

  // Station Assets Structure (mirroring your API response)
  stationAssets: {
    stationId: "bcbd0ff7-0d74-4b26-a419-c11ead677561",
    stationName: "Joska Service station",
    assets: [
      {
        islandId: "d0caad8c-5d29-4323-90d5-7620c2e7b143",
        islandName: "Island 1",
        islandCode: "ISL001",
        pumps: [
          {
            pumpId: "e5ff6bc5-e682-4029-9cef-f07618f6668b",
            pumpName: "PMP001",
            productId: "cb48446e-99fe-45fd-b7d8-a768e65c38e1",
            productName: "ULSD Premium Diesel",
            connectionType: "ASSET_CONNECTION",
            tank: {
              tankId: "5e47c64f-7f9c-461e-8836-65bc2a81a62d",
              tankName: "TK001",
              productId: "cb48446e-99fe-45fd-b7d8-a768e65c38e1",
              productName: "ULSD Premium Diesel",
              capacity: 100000,
              currentVolume: 5980
            }
          },
          {
            pumpId: "2e519f0f-d1f7-484d-8a5f-c49ff98ac153",
            pumpName: "PMP002", 
            productId: "cb48446e-99fe-45fd-b7d8-a768e65c38e1",
            productName: "ULSD Premium Diesel",
            connectionType: "ASSET_CONNECTION",
            tank: {
              tankId: "5e47c64f-7f9c-461e-8836-65bc2a81a62d",
              tankName: "TK001",
              productId: "cb48446e-99fe-45fd-b7d8-a768e65c38e1",
              productName: "ULSD Premium Diesel", 
              capacity: 100000,
              currentVolume: 5980
            }
          }
        ]
      },
      {
        islandId: "702a9ef6-f491-4467-be5f-76092f361985",
        islandName: "Island 2",
        islandCode: "ISL002",
        pumps: [
          {
            pumpId: "pump-island2-1",
            pumpName: "PMP003",
            productId: "product-petrol-1",
            productName: "Premium Petrol 95",
            connectionType: "ASSET_CONNECTION", 
            tank: {
              tankId: "tank-petrol-1",
              tankName: "TK002",
              productId: "product-petrol-1",
              productName: "Premium Petrol 95",
              capacity: 80000,
              currentVolume: 4500
            }
          },
          {
            pumpId: "pump-island2-2",
            pumpName: "PMP004",
            productId: "product-petrol-1", 
            productName: "Premium Petrol 95",
            connectionType: "ASSET_CONNECTION",
            tank: {
              tankId: "tank-petrol-1",
              tankName: "TK002",
              productId: "product-petrol-1",
              productName: "Premium Petrol 95",
              capacity: 80000,
              currentVolume: 4500
            }
          }
        ]
      }
    ]
  },

  // All Tanks (for tank readings step - no duplicates)
  uniqueTanks: [
    {
      tankId: "5e47c64f-7f9c-461e-8836-65bc2a81a62d",
      tankName: "TK001",
      productId: "cb48446e-99fe-45fd-b7d8-a768e65c38e1",
      productName: "ULSD Premium Diesel",
      capacity: 100000,
      currentVolume: 5980,
      lastDipValue: 1.8
    },
    {
      tankId: "tank-petrol-1",
      tankName: "TK002", 
      productId: "product-petrol-1",
      productName: "Premium Petrol 95",
      capacity: 80000,
      currentVolume: 4500,
      lastDipValue: 2.1
    }
  ],

  // Products
  products: [
    {
      id: "cb48446e-99fe-45fd-b7d8-a768e65c38e1",
      name: "ULSD Premium Diesel",
      type: "FUEL",
      unit: "LITER",
      currentPrice: 150.0
    },
    {
      id: "product-petrol-1",
      name: "Premium Petrol 95", 
      type: "FUEL",
      unit: "LITER",
      currentPrice: 180.0
    }
  ],

  // Shift Numbers (for auto-generation simulation)
  existingShiftNumbers: [24001, 24002, 24003, 24005, 24007],

  // Sample meter readings from previous shift (for validation)
  previousShiftReadings: {
    pumpReadings: [
      {
        pumpId: "e5ff6bc5-e682-4029-9cef-f07618f6668b",
        electricMeter: 12000.0,
        manualMeter: 11980.5,
        cashMeter: 1800000.0
      },
      {
        pumpId: "2e519f0f-d1f7-484d-8a5f-c49ff98ac153",
        electricMeter: 8500.0,
        manualMeter: 8480.0, 
        cashMeter: 1272000.0
      }
    ],
    tankReadings: [
      {
        tankId: "5e47c64f-7f9c-461e-8836-65bc2a81a62d",
        dipValue: 1.5,
        volume: 6000
      }
    ]
  }
};

// Helper functions for dummy data operations
export const dummyDataHelpers = {
  // Get next available shift number
  getNextShiftNumber: () => {
    const existing = dummyData.existingShiftNumbers;
    return existing.length > 0 ? Math.max(...existing) + 1 : 24001;
  },

  // Check if shift number exists
  isShiftNumberExists: (shiftNumber) => {
    return dummyData.existingShiftNumbers.includes(parseInt(shiftNumber));
  },

  // Get supervisors only
  getSupervisors: () => {
    return dummyData.users.filter(user => user.role === 'SUPERVISOR' && user.status === 'ACTIVE');
  },

  // Get attendants only  
  getAttendants: () => {
    return dummyData.users.filter(user => user.role === 'ATTENDANT' && user.status === 'ACTIVE');
  },

  // Get user by ID
  getUserById: (userId) => {
    return dummyData.users.find(user => user.id === userId);
  },

  // Get island by ID
  getIslandById: (islandId) => {
    const allIslands = dummyData.stationAssets.assets;
    return allIslands.find(island => island.islandId === islandId);
  },

  // Get pump by ID
  getPumpById: (pumpId) => {
    const allIslands = dummyData.stationAssets.assets;
    for (let island of allIslands) {
      const pump = island.pumps.find(p => p.pumpId === pumpId);
      if (pump) return pump;
    }
    return null;
  },

  // Get tank by ID
  getTankById: (tankId) => {
    return dummyData.uniqueTanks.find(tank => tank.tankId === tankId);
  },

  // Get previous reading for pump
  getPreviousPumpReading: (pumpId) => {
    return dummyData.previousShiftReadings.pumpReadings.find(reading => reading.pumpId === pumpId);
  },

  // Get previous reading for tank
  getPreviousTankReading: (tankId) => {
    return dummyData.previousShiftReadings.tankReadings.find(reading => reading.tankId === tankId);
  }
};

// Mock API service functions
export const mockServices = {
  // Mock station service
  stationService: {
    getStation: async (stationId) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(dummyData.station);
        }, 500);
      });
    },

    getStationAssets: async (stationId) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(dummyData.stationAssets);
        }, 800);
      });
    }
  },

  // Mock user service
  userService: {
    getStationUsers: async (stationId) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(dummyData.users);
        }, 600);
      });
    }
  },

  // Mock shift service
  shiftService: {
    createShift: async (payload) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const shiftId = `shift-${Date.now()}`;
          resolve({
            success: true,
            data: {
              shift: {
                id: shiftId,
                ...payload,
                status: 'PENDING',
                createdAt: new Date().toISOString()
              }
            }
          });
        }, 1000);
      });
    },

    openShift: async (payload) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: {
              shift: {
                id: payload.shiftId,
                status: 'OPEN',
                openedAt: new Date().toISOString()
              }
            }
          });
        }, 1200);
      });
    },

    checkShiftNumber: async (shiftNumber) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const exists = dummyDataHelpers.isShiftNumberExists(shiftNumber);
          resolve({
            exists,
            message: exists ? 'Shift number already exists' : 'Shift number available'
          });
        }, 300);
      });
    }
  }
};

export default dummyData;