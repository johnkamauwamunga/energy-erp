import mockData from '../../data/mockData';

// Helper function to find user
const findUser = (email, password) => {
  // Combine all users from mockData
  const allUsers = [
    ...mockData.staff.companyAdmins,
    ...mockData.staff.stationManagers,
    ...mockData.staff.supervisors,
    ...mockData.staff.attendants
  ];
  
  // Add hardcoded super admin
  const superAdmin = {
    id: 'SUPER_001',
    email: 'superadmin@energyerp.com',
    password: 'admin123',
    role: 'super_admin',
    name: 'Super Administrator',
    companyId: null,
    stationId: null,
    permissions: ['ALL_SYSTEMS'],
    status: 'active'
  };
  
  return [superAdmin, ...allUsers].find(u => 
    u.email === email && u.password === password
  );
};

export const authService = {
  login: async (email, password) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = findUser(email, password);
    
    if (!user) {
      throw new Error('Invalid credentials. Please try again.');
    }
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId || null,
      stationId: user.stationId || null,
      permissions: user.permissions || [],
      phone: user.phone || null,
      status: user.status || 'active',
      token: 'dummy-token' // mock token
    };
  },
  
  logout: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
};
