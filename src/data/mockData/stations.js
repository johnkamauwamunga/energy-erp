const serviceStations = [
  {
    id: 'JOSKA',
    companyId: 'COMP_001',
    name: 'Joska Service Station',
    location: 'Joska, Machakos Road',
    gps: { lat: -1.2345, lng: 36.8956 },
    type: 'highway',
    operatingHours: '24/7',
    manager: 'Peter Mwangi',
    managerEmail: 'peter@joskaenergy.co.ke',
    phone: '+254 722 123 456',
    status: 'active',
    dailyTarget: 400000,
    monthlyTarget: 12000000,
    establishedDate: '2024-01-15'
  },
  {
    id: 'KITENGELA',
    companyId: 'COMP_001', 
    name: 'Kitengela Service Station',
    location: 'Kitengela, Namanga Road',
    gps: { lat: -1.4567, lng: 36.9123 },
    type: 'urban',
    operatingHours: '24/7',
    manager: 'Grace Wanjiku',
    managerEmail: 'grace@joskaenergy.co.ke',
    phone: '+254 733 234 567',
    status: 'active',
    dailyTarget: 350000,
    monthlyTarget: 10500000,
    establishedDate: '2024-02-01'
  },
  {
    id: 'NAIROBI_WEST',
    companyId: 'COMP_002',
    name: 'Nairobi West Service Station',
    location: 'Nairobi West, Mombasa Road',
    gps: { lat: -1.3200, lng: 36.8200 },
    type: 'urban',
    operatingHours: '24/7',
    manager: 'David Omondi',
    managerEmail: 'david@kenolkobil.co.ke',
    phone: '+254 722 345 678',
    status: 'active',
    dailyTarget: 450000,
    monthlyTarget: 13500000,
    establishedDate: '2024-02-10'
  },
  {
    id: 'THIKA',
    companyId: 'COMP_002',
    name: 'Thika Service Station',
    location: 'Thika, Garissa Road',
    gps: { lat: -1.0500, lng: 37.0800 },
    type: 'highway',
    operatingHours: '24/7',
    manager: 'Susan Kariuki',
    managerEmail: 'susan@kenolkobil.co.ke',
    phone: '+254 733 456 789',
    status: 'active',
    dailyTarget: 380000,
    monthlyTarget: 11400000,
    establishedDate: '2024-02-15'
  }
];

export default serviceStations;