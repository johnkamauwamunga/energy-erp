const shifts=[
        // {
        //     id: 'SHIFT_001',
        //     stationId: 'JOSKA',
        //     supervisorId: 'SUP_001',
        //     date: '2024-01-25',
        //     startTime: '06:00',
        //     endTime: '14:00',
        //     status: 'completed',
        //     attendants: ['ATT_001', 'ATT_002', 'ATT_003'],
        //     openingReadings: {
        //         tanks: {
        //             'TANK_JOSKA_1': 42580,
        //             'TANK_JOSKA_2': 35720,
        //             'TANK_JOSKA_3': 38000
        //         }
        //     },
        //     closingReadings: {
        //         tanks: {
        //             'TANK_JOSKA_1': 40125,
        //             'TANK_JOSKA_2': 33850,
        //             'TANK_JOSKA_3': 36200
        //         }
        //     },
        //     sales: {
        //         fuelSales: 89450.00,
        //         nonFuelSales: 12250.00,
        //         totalSales: 101700.00
        //     }
        // },
        // {
        //     id: 'SHIFT_002',
        //     stationId: 'KITENGELA',
        //     supervisorId: 'SUP_002',
        //     date: '2024-01-25',
        //     startTime: '06:00',
        //     endTime: '14:00',
        //     status: 'completed',
        //     attendants: ['ATT_004', 'ATT_005', 'ATT_006'],
        //     openingReadings: {
        //         tanks: {
        //             'TANK_KITENGELA_1': 48000,
        //             'TANK_KITENGELA_2': 42000,
        //             'TANK_KITENGELA_3': 45000
        //         }
        //     },
        //     closingReadings: {
        //         tanks: {
        //             'TANK_KITENGELA_1': 45500,
        //             'TANK_KITENGELA_2': 39800,
        //             'TANK_KITENGELA_3': 42800
        //         }
        //     },
        //     sales: {
        //         fuelSales: 82450.00,
        //         nonFuelSales: 11230.00,
        //         totalSales: 93680.00
        //     }
        // },
        {
         id: 'SHIFT_004',
    stationId: 'JOSKA',
    islandId: 'ISL_001',
    startTime: '2024-03-15T08:00:00Z',
    endTime: '2024-03-15T16:00:00Z',
    status: 'closed',
    supervisorId: 'SUP_001',
    attendants: [
      { id: 'ATT_001', posting: 'Dispenser 1', totalSales: 8500 },
      { id: 'ATT_002', posting: 'Dispenser 2', totalSales: 9200 },
      { id: 'ATT_003', posting: 'Dispenser 3', totalSales: 7800 }
    ]
  },
  {
    id: 'SHIFT_002',
    stationId: 'KITENGELA',
    islandId: 'ISL_001',
    startTime: '2024-03-15T08:00:00Z',
    endTime: '2024-03-15T16:00:00Z',
    status: 'closed',
    supervisorId: 'SUP_002',
    attendants: [
      { id: 'ATT_004', posting: 'Dispenser 1', totalSales: 10500 },
      { id: 'ATT_005', posting: 'Dispenser 2', totalSales: 8800 },
      { id: 'ATT_006', posting: 'Dispenser 3', totalSales: 9200 }
    ]
  },
  {
    id: 'SHIFT_003',
    stationId: 'JOSKA',
    islandId: 'ISL_001',
    startTime: '2024-03-15T16:00:00Z',
    endTime: '2024-03-16T00:00:00Z',
    status: 'active',
    supervisorId: 'SUP_001',
    attendants: [
      { id: 'ATT_007', posting: 'Dispenser 1', totalSales: 4200 },
      { id: 'ATT_008', posting: 'Dispenser 2', totalSales: 3800 },
      { id: 'ATT_009', posting: 'Dispenser 3', totalSales: 4500 }
    ]
  }
    ]

export default shifts
