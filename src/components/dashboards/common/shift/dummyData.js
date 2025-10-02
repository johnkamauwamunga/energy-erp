// dummyShiftData.js
export const dummyShiftData = {
  // Current station
  currentStation: {
    id: "station-123",
    name: "Main Fuel Station",
    address: "123 Main Street, Cityville"
  },

  // Islands with pumps
  islands: [
    {
      id: "island-A",
      name: "Island A - Premium",
      stationId: "station-123",
      code: "ISL-A",
      status: "active",
      pumps: [
        {
          id: "pump-A1",
          code: "PMP-A1",
          name: "Pump A1 - Diesel",
          fuelType: "diesel",
          currentMeter: {
            electric: 12500.75,
            cash: 12480.25,
            manual: 12490.50
          }
        },
        {
          id: "pump-A2", 
          code: "PMP-A2",
          name: "Pump A2 - Super",
          fuelType: "super",
          currentMeter: {
            electric: 8900.25,
            cash: 8880.75,
            manual: 8890.00
          }
        },
        {
          id: "pump-A3",
          code: "PMP-A3", 
          name: "Pump A3 - Premium",
          fuelType: "premium",
          currentMeter: {
            electric: 15200.50,
            cash: 15180.25,
            manual: 15190.75
          }
        }
      ]
    },
    {
      id: "island-B",
      name: "Island B - Regular", 
      stationId: "station-123",
      code: "ISL-B",
      status: "active",
      pumps: [
        {
          id: "pump-B1",
          code: "PMP-B1",
          name: "Pump B1 - Regular",
          fuelType: "regular",
          currentMeter: {
            electric: 21000.25,
            cash: 20980.50,
            manual: 20990.00
          }
        },
        {
          id: "pump-B2",
          code: "PMP-B2",
          name: "Pump B2 - Regular", 
          fuelType: "regular",
          currentMeter: {
            electric: 19800.75,
            cash: 19780.25,
            manual: 19790.50
          }
        }
      ]
    },
    {
      id: "island-C",
      name: "Island C - Mixed",
      stationId: "station-123", 
      code: "ISL-C",
      status: "active",
      pumps: [
        {
          id: "pump-C1",
          code: "PMP-C1",
          name: "Pump C1 - Diesel",
          fuelType: "diesel",
          currentMeter: {
            electric: 17500.25,
            cash: 17480.75,
            manual: 17490.00
          }
        },
        {
          id: "pump-C2",
          code: "PMP-C2",
          name: "Pump C2 - Super",
          fuelType: "super", 
          currentMeter: {
            electric: 11200.50,
            cash: 11180.25,
            manual: 11190.75
          }
        },
        {
          id: "pump-C3",
          code: "PMP-C3",
          name: "Pump C3 - Premium",
          fuelType: "premium",
          currentMeter: {
            electric: 9600.25,
            cash: 9580.50,
            manual: 9590.00
          }
        }
      ]
    }
  ],

  // Tanks with connections to pumps
  tanks: [
    {
      id: "tank-1",
      name: "Diesel Tank 1",
      capacity: 30000,
      currentLevel: 15000,
      fuelType: "diesel",
      connectedPumps: ["pump-A1", "pump-C1"]
    },
    {
      id: "tank-2", 
      name: "Super Tank 1",
      capacity: 25000,
      currentLevel: 12000,
      fuelType: "super",
      connectedPumps: ["pump-A2", "pump-C2"]
    },
    {
      id: "tank-3",
      name: "Premium Tank 1", 
      capacity: 20000,
      currentLevel: 8000,
      fuelType: "premium",
      connectedPumps: ["pump-A3", "pump-C3"]
    },
    {
      id: "tank-4",
      name: "Regular Tank 1",
      capacity: 35000, 
      currentLevel: 20000,
      fuelType: "regular",
      connectedPumps: ["pump-B1", "pump-B2"]
    }
  ],

  // Asset connections (pump-to-island relationships)
  assetConnections: [
    // Island A connections
    { id: "conn-A1", type: "PUMP_TO_ISLAND", assetA: { id: "pump-A1" }, assetB: { id: "island-A" } },
    { id: "conn-A2", type: "PUMP_TO_ISLAND", assetA: { id: "pump-A2" }, assetB: { id: "island-A" } },
    { id: "conn-A3", type: "PUMP_TO_ISLAND", assetA: { id: "pump-A3" }, assetB: { id: "island-A" } },
    
    // Island B connections  
    { id: "conn-B1", type: "PUMP_TO_ISLAND", assetA: { id: "pump-B1" }, assetB: { id: "island-B" } },
    { id: "conn-B2", type: "PUMP_TO_ISLAND", assetA: { id: "pump-B2" }, assetB: { id: "island-B" } },
    
    // Island C connections
    { id: "conn-C1", type: "PUMP_TO_ISLAND", assetA: { id: "pump-C1" }, assetB: { id: "island-C" } },
    { id: "conn-C2", type: "PUMP_TO_ISLAND", assetA: { id: "pump-C2" }, assetB: { id: "island-C" } },
    { id: "conn-C3", type: "PUMP_TO_ISLAND", assetA: { id: "pump-C3" }, assetB: { id: "island-C" } },

    // Pump to Tank connections
    { id: "conn-T1", type: "PUMP_TO_TANK", assetA: { id: "pump-A1" }, assetB: { id: "tank-1" } },
    { id: "conn-T2", type: "PUMP_TO_TANK", assetA: { id: "pump-C1" }, assetB: { id: "tank-1" } },
    { id: "conn-T3", type: "PUMP_TO_TANK", assetA: { id: "pump-A2" }, assetB: { id: "tank-2" } },
    { id: "conn-T4", type: "PUMP_TO_TANK", assetA: { id: "pump-C2" }, assetB: { id: "tank-2" } },
    { id: "conn-T5", type: "PUMP_TO_TANK", assetA: { id: "pump-A3" }, assetB: { id: "tank-3" } },
    { id: "conn-T6", type: "PUMP_TO_TANK", assetA: { id: "pump-C3" }, assetB: { id: "tank-3" } },
    { id: "conn-T7", type: "PUMP_TO_TANK", assetA: { id: "pump-B1" }, assetB: { id: "tank-4" } },
    { id: "conn-T8", type: "PUMP_TO_TANK", assetA: { id: "pump-B2" }, assetB: { id: "tank-4" } }
  ],

  // Staff data
  attendants: [
    {
      id: "user-john-123",
      name: "John Smith",
      email: "john.smith@station.com",
      role: "attendant",
      status: "active",
      stationId: "station-123"
    },
    {
      id: "user-mary-456", 
      name: "Mary Johnson",
      email: "mary.johnson@station.com",
      role: "attendant",
      status: "active",
      stationId: "station-123"
    },
    {
      id: "user-david-789",
      name: "David Brown",
      email: "david.brown@station.com", 
      role: "attendant",
      status: "active",
      stationId: "station-123"
    },
    {
      id: "user-sarah-101",
      name: "Sarah Wilson",
      email: "sarah.wilson@station.com",
      role: "attendant", 
      status: "active",
      stationId: "station-123"
    },
    {
      id: "user-mike-112",
      name: "Mike Davis",
      email: "mike.davis@station.com",
      role: "attendant",
      status: "active", 
      stationId: "station-123"
    }
  ],

  supervisors: [
    {
      id: "user-super-001",
      name: "Robert Taylor", 
      email: "robert.taylor@station.com",
      role: "supervisor",
      status: "active",
      stationId: "station-123"
    },
    {
      id: "user-super-002",
      name: "Lisa Anderson",
      email: "lisa.anderson@station.com", 
      role: "supervisor",
      status: "active",
      stationId: "station-123"
    }
  ],

  // Warehouse and non-fuel items
  warehouses: [
    {
      id: "warehouse-1",
      stationId: "station-123",
      name: "Main Station Warehouse",
      nonFuelItems: [
        {
          id: "helix-100",
          name: "Helix Engine Oil 1L",
          unit: "bottle",
          currentStock: 50,
          minStock: 10,
          category: "lubricants"
        },
        {
          id: "coolant-200", 
          name: "Premium Coolant 500ml",
          unit: "bottle",
          currentStock: 30,
          minStock: 5,
          category: "coolants"
        },
        {
          id: "wiper-300",
          name: "Windshield Wiper Fluid", 
          unit: "bottle",
          currentStock: 25,
          minStock: 8,
          category: "cleaners"
        },
        {
          id: "tire-400",
          name: "Tire Repair Kit",
          unit: "kit", 
          currentStock: 15,
          minStock: 3,
          category: "accessories"
        },
        {
          id: "air-500",
          name: "Air Freshener",
          unit: "piece",
          currentStock: 40, 
          minStock: 12,
          category: "accessories"
        }
      ]
    }
  ],

  // Sample shift creation payload
  sampleShiftPayload: {
    startTime: "2024-01-15T08:00:00Z",
    stationId: "station-123",
    supervisorId: "user-super-001",
    islands: [
      {
        islandId: "island-A",
        pumps: [
          {
            pumpId: "pump-A1",
            electricMeter: 12500.75,
            manualMeter: 12490.50,
            cashMeter: 12480.25
          },
          {
            pumpId: "pump-A2", 
            electricMeter: 8900.25,
            manualMeter: 8890.00,
            cashMeter: 8880.75
          },
          {
            pumpId: "pump-A3",
            electricMeter: 15200.50, 
            manualMeter: 15190.75,
            cashMeter: 15180.25
          }
        ],
        attendants: ["user-john-123", "user-mary-456"],
        nonFuelProducts: [
          {
            productId: "helix-100",
            openingStock: 20
          },
          {
            productId: "coolant-200",
            openingStock: 10
          }
        ]
      },
      {
        islandId: "island-B",
        pumps: [
          {
            pumpId: "pump-B1",
            electricMeter: 21000.25,
            manualMeter: 20990.00,
            cashMeter: 20980.50
          },
          {
            pumpId: "pump-B2",
            electricMeter: 19800.75, 
            manualMeter: 19790.50,
            cashMeter: 19780.25
          }
        ],
        attendants: ["user-david-789"],
        nonFuelProducts: [
          {
            productId: "wiper-300",
            openingStock: 8
          }
        ]
      }
    ]
  },

  // Test scenarios
  testScenarios: {
    // Scenario 1: Complete flow with all islands
    completeFlow: {
      selectedIslands: ["island-A", "island-B", "island-C"],
      supervisor: "user-super-001",
      attendantAssignments: {
        "island-A": ["user-john-123", "user-mary-456"],
        "island-B": ["user-david-789"], 
        "island-C": ["user-sarah-101", "user-mike-112"]
      },
      nonFuelAssignments: {
        "island-A": [
          { productId: "helix-100", openingStock: 20 },
          { productId: "coolant-200", openingStock: 10 }
        ],
        "island-B": [
          { productId: "wiper-300", openingStock: 8 }
        ],
        "island-C": [
          { productId: "tire-400", openingStock: 5 },
          { productId: "air-500", openingStock: 15 }
        ]
      }
    },

    // Scenario 2: Minimal flow - skip non-fuel items
    minimalFlow: {
      selectedIslands: ["island-A"],
      supervisor: "user-super-002", 
      attendantAssignments: {
        "island-A": ["user-john-123"]
      },
      nonFuelAssignments: {}
    },

    // Scenario 3: Partial pump meter entry (skip some meters)
    partialMeters: {
      selectedIslands: ["island-B"],
      supervisor: "user-super-001",
      attendantAssignments: {
        "island-B": ["user-mary-456", "user-david-789"]
      },
      pumpReadings: {
        "island-B": {
          "pump-B1": {
            electricMeter: 21000.25,
            cashMeter: 20980.50
            // manualMeter skipped
          }
          // pump-B2 readings skipped entirely
        }
      }
    }
  },

  // Mock service responses
  mockServiceResponses: {
    getStationTopology: {
      connections: [
        // ... (same as assetConnections above)
      ],
      assets: {
        islands: [
          // ... (island data)
        ],
        pumps: [
          // ... (pump data) 
        ],
        tanks: [
          // ... (tank data)
        ]
      }
    },

    getStationAttendants: [
      // ... (attendants data)
    ],

    getStationSupervisors: [
      // ... (supervisors data)
    ]
  }
};

// Helper functions for testing
export const createTestShiftJourney = (scenario = "completeFlow") => {
  const testData = dummyShiftData.testScenarios[scenario];
  
  return {
    // Step 1: Date/Time and Island Selection
    step1: {
      startDate: "2024-01-15",
      startTime: "08:00",
      selectedIslands: testData.selectedIslands.map(islandId => 
        dummyShiftData.islands.find(island => island.id === islandId)
      )
    },

    // Step 2: Pump Meter Readings
    step2: {
      pumpReadings: testData.pumpReadings || generatePumpReadings(testData.selectedIslands)
    },

    // Step 3: Staff Assignment  
    step3: {
      supervisorId: dummyShiftData.supervisors.find(s => s.name.includes(testData.supervisor))?.id,
      attendantAssignments: testData.attendantAssignments
    },

    // Step 4: Non-Fuel Items (Optional)
    step4: {
      nonFuelAssignments: testData.nonFuelAssignments
    },

    // Final payload
    getFinalPayload: () => ({
      startTime: new Date("2024-01-15T08:00:00Z").toISOString(),
      stationId: dummyShiftData.currentStation.id,
      supervisorId: dummyShiftData.supervisors.find(s => s.name.includes(testData.supervisor))?.id,
      islands: testData.selectedIslands.map(islandId => ({
        islandId,
        pumps: (testData.pumpReadings?.[islandId] ? 
          Object.entries(testData.pumpReadings[islandId]).map(([pumpId, readings]) => ({
            pumpId,
            ...readings
          })) : 
          generateIslandPumpReadings(islandId)
        ),
        attendants: testData.attendantAssignments[islandId] || [],
        nonFuelProducts: Object.entries(testData.nonFuelAssignments)
          .filter(([assignIslandId]) => assignIslandId === islandId)
          .flatMap(([_, items]) => items)
      }))
    })
  };
};

// Generate realistic pump readings based on current meters
const generatePumpReadings = (islandIds) => {
  const readings = {};
  
  islandIds.forEach(islandId => {
    const island = dummyShiftData.islands.find(i => i.id === islandId);
    if (island) {
      readings[islandId] = {};
      island.pumps.forEach(pump => {
        // Add small variation to current meters for realistic opening readings
        readings[islandId][pump.id] = {
          electricMeter: pump.currentMeter.electric + (Math.random() * 10),
          cashMeter: pump.currentMeter.cash + (Math.random() * 10),
          manualMeter: pump.currentMeter.manual + (Math.random() * 10)
        };
      });
    }
  });
  
  return readings;
};

const generateIslandPumpReadings = (islandId) => {
  const island = dummyShiftData.islands.find(i => i.id === islandId);
  if (!island) return [];
  
  return island.pumps.map(pump => ({
    pumpId: pump.id,
    electricMeter: pump.currentMeter.electric + (Math.random() * 10),
    cashMeter: pump.currentMeter.cash + (Math.random() * 10),
    manualMeter: pump.currentMeter.manual + (Math.random() * 10)
  }));
};

export default dummyShiftData;