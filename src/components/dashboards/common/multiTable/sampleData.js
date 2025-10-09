// sampleData.js
export const generateShiftData = (count = 50) => {
  const locations = ['Downtown', 'Mall', 'Airport', 'Suburban', 'City Center'];
  const statuses = ['completed', 'active', 'scheduled', 'cancelled'];
  const roles = ['Cashier', 'Supervisor', 'Manager', 'Attendant', 'Security'];
  const names = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Chris', 'Emily'];
  
  return Array.from({ length: count }, (_, index) => {
    const shiftDate = new Date();
    shiftDate.setDate(shiftDate.getDate() - Math.floor(Math.random() * 30));
    
    const attendantsCount = Math.floor(Math.random() * 8) + 2;
    const attendants = Array.from({ length: attendantsCount }, (_, i) => ({
      id: `${index}-${i}`,
      name: `${names[Math.floor(Math.random() * names.length)]} ${names[Math.floor(Math.random() * names.length)]}`,
      role: roles[Math.floor(Math.random() * roles.length)],
      hours: Math.floor(Math.random() * 8) + 4,
      status: Math.random() > 0.2 ? 'active' : 'break'
    }));
    
    const totalSales = Math.floor(Math.random() * 10000) + 1000;
    const transactions = Math.floor(Math.random() * 200) + 50;
    
    return {
      id: `shift-${index + 1}`,
      shift: {
        name: `Shift ${String(index + 1).padStart(3, '0')}`,
        type: ['Morning', 'Evening', 'Night'][Math.floor(Math.random() * 3)],
        duration: Math.floor(Math.random() * 8) + 4,
        location: locations[Math.floor(Math.random() * locations.length)],
        efficiency: Math.floor(Math.random() * 30) + 70,
        notes: `Regular shift with ${attendantsCount} team members. ${Math.random() > 0.5 ? 'Busy period with high customer traffic.' : 'Steady pace throughout.'}`
      },
      date: shiftDate.toISOString().split('T')[0],
      time: `${Math.floor(Math.random() * 12) + 6}:00 - ${Math.floor(Math.random() * 12) + 18}:00`,
      sales: {
        total: totalSales,
        transactions: transactions,
        average: Math.round(totalSales / transactions),
        breakdown: [
          { category: 'Fuel', amount: Math.floor(totalSales * 0.6) },
          { category: 'Convenience', amount: Math.floor(totalSales * 0.25) },
          { category: 'Food', amount: Math.floor(totalSales * 0.10) },
          { category: 'Other', amount: Math.floor(totalSales * 0.05) }
        ]
      },
      attendants: attendants,
      inventory: {
        start: Math.floor(Math.random() * 1000) + 500,
        end: Math.floor(Math.random() * 1000) + 200,
        variance: Math.floor(Math.random() * 50) - 25
      },
      incidents: Math.floor(Math.random() * 3),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      manager: `${names[Math.floor(Math.random() * names.length)]} ${names[Math.floor(Math.random() * names.length)]}`,
      rating: Math.floor(Math.random() * 3) + 3
    };
  });
};