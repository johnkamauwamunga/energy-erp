import mockData from './mockData';

export const initialState = {
  // Authentication & User Management
  currentUser: null,
  isAuthenticated: false,
  
  // Multi-Company Structure (Super Admin View)
  companies: mockData.companies,
  currentCompany: null,
  
  // Service Stations with Complete Setup
  serviceStations: mockData.serviceStations,
  
  // Staff structure with proper nesting
  staff: {
    companyAdmins: mockData.staff.companyAdmins,
    stationManagers: mockData.staff.stationManagers,
    supervisors: mockData.staff.supervisors,
    attendants: mockData.staff.attendants
  },
  
  // Other sections
  islands: {},
  assets: {},
  shifts: mockData.shifts,
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