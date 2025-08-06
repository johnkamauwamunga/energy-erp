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
  serviceStations: mockData.serviceStations,
  
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

  // Other sections
  shifts: mockData.shifts,
  shiftFilters: {
    date: 'all',
    status: '',
    supervisor: ''
  },
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