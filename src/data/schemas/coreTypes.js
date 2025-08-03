// Station type definition
export const StationType = {
  id: String,
  name: String,
  location: String,
  gps: { lat: Number, lng: Number },
  status: ['active', 'inactive', 'maintenance']
};

// User roles
export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  STATION_MANAGER: 'station_manager',
  SUPERVISOR: 'supervisor',
  ATTENDANT: 'attendant'
};
