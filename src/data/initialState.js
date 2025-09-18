import mockData from './mockData';
import assets from './mockData/assets'; 

export const initialState = {
  // Authentication & User Management
  currentUser: null,
  isAuthenticated: false,
  
  // Multi-Company Structure
  companies: mockData.companies,
  currentCompany: null,
  
  // Service Stations
  serviceStations: [],
  
  // warehouses
  warehouses: mockData.warehouses,
  
  // Staff structure
  staff: {
    companyAdmins: mockData.staff.companyAdmins,
    stationManagers: mockData.staff.stationManagers,
    supervisors: mockData.staff.supervisors,
    attendants: mockData.staff.attendants
  },
  
  // Assets with proper structure
  assets: {
    tanks: assets.tanks,
    pumps: assets.pumps,
    // dispensers: [] // Add if needed
  },
  
  // Islands at root level
  islands: assets.islands,

  // Shifts with updated structure
  shifts: mockData.shifts,
  shiftFilters: {
    date: 'all',
    status: '',
    supervisor: ''
  },

    
  // Add offloads section
  offloads: mockData.offloads, // Add this line
  offloadFilters: {
    date: 'all',
    tank: '',
    supplier: ''
  },
  
  // Add suppliers section
  suppliers: [
    {
      id: 'SUP_001',
      name: 'Vivo Energy',
      type: 'energy',
      contact: {
        phone: '+254 700 123 456',
        email: 'info@vivoenergy.com'
      }
    },
    {
      id: 'SUP_002',
      name: 'Total Energies',
      type: 'energy',
      contact: {
        phone: '+254 700 789 012',
        email: 'info@totalenergies.com'
      }
    }
  ],
  
  fuelManagement: {},
  sales: {},
  reports: {},
  systemStatus: {
    uptime: '99.97%',
    lastUpdate: new Date(),
    version: '4.0.1',
    environment: 'production'
  }
};