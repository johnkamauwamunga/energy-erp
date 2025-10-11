// Self-contained dummy data for shift closing - No external dependencies

// Base dummy data structure
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
    }
  ],

  // Price Lists
  priceLists: [
    {
      id: "11651bc5-c287-4702-9c64-efe4db4a3e03",
      name: "Standard Pricing - Jan 2024",
      effectiveDate: "2024-01-01",
      isActive: true
    }
  ],

  // Shift Numbers (for auto-generation simulation)
  existingShiftNumbers: [24001, 24002, 24003, 24005, 24007]
};

// Shift opening data (what we recorded when shift was opened)
export const shiftOpening = {
  id: "shift-12345",
  shiftNumber: 24001,
  startTime: "2025-10-04T06:00:00.000Z",
  status: "OPEN",
  stationId: "bcbd0ff7-0d74-4b26-a419-c11ead677561",
  supervisorId: "supervisor-1",
  
  // Opening readings (START readings)
  meterReadings: [
    {
      pumpId: "e5ff6bc5-e682-4029-9cef-f07618f6668b",
      readingType: "START",
      electricMeter: 12000.0,
      manualMeter: 11980.5,
      cashMeter: 1800000.0,
      unitPrice: 150.0,
      pump: {
        id: "e5ff6bc5-e682-4029-9cef-f07618f6668b",
        asset: { name: "PMP001" },
        product: { name: "ULSD Premium Diesel" },
        islandId: "d0caad8c-5d29-4323-90d5-7620c2e7b143"
      }
    },
    {
      pumpId: "2e519f0f-d1f7-484d-8a5f-c49ff98ac153", 
      readingType: "START",
      electricMeter: 8500.0,
      manualMeter: 8480.0,
      cashMeter: 1272000.0,
      unitPrice: 150.0,
      pump: {
        id: "2e519f0f-d1f7-484d-8a5f-c49ff98ac153",
        asset: { name: "PMP002" },
        product: { name: "ULSD Premium Diesel" },
        islandId: "d0caad8c-5d29-4323-90d5-7620c2e7b143"
      }
    }
  ],
  
  // Opening tank dips (START readings)
  dipReadings: [
    {
      tankId: "5e47c64f-7f9c-461e-8836-65bc2a81a62d",
      readingType: "START", 
      dipValue: 1.8,
      volume: 7500,
      temperature: 24.5,
      waterLevel: 0.1,
      density: 0.85,
      tank: {
        id: "5e47c64f-7f9c-461e-8836-65bc2a81a62d",
        asset: { name: "TK001" },
        product: { name: "ULSD Premium Diesel" },
        capacity: 100000,
        currentVolume: 7500
      }
    }
  ],
  
  // Island assignments from opening
  shiftIslandAttedant: [
    {
      islandId: "d0caad8c-5d29-4323-90d5-7620c2e7b143",
      attendantId: "attendant-1",
      assignmentType: "PRIMARY",
      island: {
        id: "d0caad8c-5d29-4323-90d5-7620c2e7b143",
        name: "Island 1",
        code: "ISL001"
      },
      attendant: {
        id: "attendant-1", 
        firstName: "Peter",
        lastName: "Mwangi"
      }
    }
  ],
  
  // Opening check record
  shiftOpeningCheck: {
    checksPassed: true,
    hasInitialMeterReadings: true,
    hasInitialDipReadings: true,
    hasAttendantsAssigned: true,
    hasNoOpenShifts: true,
    hasValidPricing: true,
    hasAssetsConnected: true
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
    return shiftOpening.shiftIslandAttedant.find(assignment => assignment.islandId === islandId)?.island;
  }
};

// Helper functions for closing calculations
export const closingCalculations = {
  // Calculate liters dispensed from meter differences
  calculateLitersDispensed: (startReading, endReading, useManual = false) => {
    const startMeter = useManual ? startReading.manualMeter : startReading.electricMeter;
    const endMeter = useManual ? endReading.manualMeter : endReading.electricMeter;
    return endMeter - startMeter;
  },
  
  // Calculate sales value
  calculateSalesValue: (litersDispensed, unitPrice) => {
    return litersDispensed * unitPrice;
  },
  
  // Calculate expected collection for an island
  calculateExpectedCollection: (islandId, pumpReadings, nonFuelStocks = []) => {
    const islandPumps = pumpReadings.filter(reading => {
      // Find which island this pump belongs to
      const pumpData = shiftOpening.meterReadings.find(
        mr => mr.pumpId === reading.pumpId
      );
      return pumpData?.pump?.islandId === islandId;
    });
    
    const fuelSales = islandPumps.reduce((total, pump) => 
      total + (pump.salesValue || 0), 0
    );
    
    const islandNonFuel = nonFuelStocks.filter(stock => 
      stock.islandId === islandId
    );
    
    const nonFuelSales = islandNonFuel.reduce((total, stock) => 
      total + (stock.salesValue || 0), 0
    );
    
    return fuelSales + nonFuelSales;
  },
  
  // Calculate total collected for an island
  calculateTotalCollected: (collection) => {
    return collection.cashAmount + 
           collection.mobileMoneyAmount + 
           collection.visaAmount + 
           collection.mastercardAmount + 
           collection.debtAmount + 
           collection.otherAmount;
  },
  
  // Calculate variance percentage
  calculateVariance: (expected, actual) => {
    if (expected === 0) return 0;
    return ((actual - expected) / expected) * 100;
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
          resolve({
            stationId: stationId,
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
                    productId: "diesel-product-1",
                    productName: "ULSD Premium Diesel",
                    connectionType: "ASSET_CONNECTION",
                    tank: {
                      tankId: "5e47c64f-7f9c-461e-8836-65bc2a81a62d",
                      tankName: "TK001",
                      productId: "diesel-product-1",
                      productName: "ULSD Premium Diesel",
                      capacity: 100000,
                      currentVolume: 5980
                    }
                  },
                  {
                    pumpId: "2e519f0f-d1f7-484d-8a5f-c49ff98ac153",
                    pumpName: "PMP002", 
                    productId: "diesel-product-1",
                    productName: "ULSD Premium Diesel",
                    connectionType: "ASSET_CONNECTION",
                    tank: {
                      tankId: "5e47c64f-7f9c-461e-8836-65bc2a81a62d",
                      tankName: "TK001",
                      productId: "diesel-product-1",
                      productName: "ULSD Premium Diesel", 
                      capacity: 100000,
                      currentVolume: 5980
                    }
                  }
                ]
              }
            ]
          });
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
    },

    getShiftDetails: async (shiftId) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(shiftOpening);
        }, 800);
      });
    },
    
    closeShift: async (payload) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          // Calculate summary data
          const totalCollections = payload.islandCollections.reduce(
            (sum, col) => sum + closingCalculations.calculateTotalCollected(col), 0
          );
          
          const totalSales = payload.pumpReadings.reduce(
            (sum, reading) => sum + (reading.salesValue || 0), 0
          );
          
          resolve({
            success: true,
            data: {
              shift: {
                id: payload.shiftId,
                status: 'CLOSED',
                endTime: payload.endTime
              },
              collections: {
                totalCollected: totalCollections,
                islands: payload.islandCollections.length
              },
              sales: {
                totalRevenue: totalSales,
                pumps: payload.pumpReadings.length
              },
              variance: {
                cashVariance: totalCollections - totalSales,
                variancePercentage: closingCalculations.calculateVariance(totalSales, totalCollections)
              }
            }
          });
        }, 1500);
      });
    }
  }
};

// Default export
export default {
  dummyData,
  shiftOpening,
  dummyDataHelpers,
  closingCalculations,
  mockServices
};