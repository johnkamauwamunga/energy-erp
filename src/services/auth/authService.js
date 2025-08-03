import mockData from '../../data/mockData';

// Helper function to find user
const findUser = (email, password) => {
  // Combine all users
  const allUsers = [
    ...mockData.staff.companyAdmins,
    ...mockData.staff.stationManagers,
    ...mockData.staff.supervisors,
    ...mockData.staff.attendants
  ];
  
  // Add super admin
  const superAdmin = {
    email: 'superadmin@energyerp.com',
    password: 'admin123',
    role: 'super_admin',
    name: 'Super Administrator',
    permissions: ['ALL_COMPANIES', 'CREATE_COMPANIES']
  };
  
  return [superAdmin, ...allUsers].find(u => 
    u.email === email && 
    u.password === password
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
    
    return user;
  },
  
  logout: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
};