const shifts=[
        {
            id: 'SHIFT_001',
            stationId: 'JOSKA',
            supervisorId: 'SUP_001',
            date: '2024-01-25',
            startTime: '06:00',
            endTime: '14:00',
            status: 'completed',
            attendants: ['ATT_001', 'ATT_002', 'ATT_003'],
            openingReadings: {
                tanks: {
                    'TANK_JOSKA_1': 42580,
                    'TANK_JOSKA_2': 35720,
                    'TANK_JOSKA_3': 38000
                }
            },
            closingReadings: {
                tanks: {
                    'TANK_JOSKA_1': 40125,
                    'TANK_JOSKA_2': 33850,
                    'TANK_JOSKA_3': 36200
                }
            },
            sales: {
                fuelSales: 89450.00,
                nonFuelSales: 12250.00,
                totalSales: 101700.00
            }
        },
        {
            id: 'SHIFT_002',
            stationId: 'KITENGELA',
            supervisorId: 'SUP_002',
            date: '2024-01-25',
            startTime: '06:00',
            endTime: '14:00',
            status: 'completed',
            attendants: ['ATT_004', 'ATT_005', 'ATT_006'],
            openingReadings: {
                tanks: {
                    'TANK_KITENGELA_1': 48000,
                    'TANK_KITENGELA_2': 42000,
                    'TANK_KITENGELA_3': 45000
                }
            },
            closingReadings: {
                tanks: {
                    'TANK_KITENGELA_1': 45500,
                    'TANK_KITENGELA_2': 39800,
                    'TANK_KITENGELA_3': 42800
                }
            },
            sales: {
                fuelSales: 82450.00,
                nonFuelSales: 11230.00,
                totalSales: 93680.00
            }
        }
    ]

export default shifts
