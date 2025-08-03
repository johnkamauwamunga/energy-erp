import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, BarChart, Users, Settings } from 'lucide-react';

const AboutPage = () => {
  const features = [
    {
      icon: Flame,
      title: "Fuel Management",
      description: "Track inventory, manage orders, and monitor fuel consumption in real-time"
    },
    {
      icon: BarChart,
      title: "Sales Analytics",
      description: "Get actionable insights from your sales data with advanced reporting"
    },
    {
      icon: Users,
      title: "Staff Management",
      description: "Manage shifts, roles, and permissions across all stations"
    },
    {
      icon: Settings,
      title: "Asset Tracking",
      description: "Monitor equipment health and schedule maintenance proactively"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="cosmic-gradient py-32 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">About EnergyERP</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Revolutionizing fuel station management with cutting-edge technology
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="prose prose-xl max-w-none">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Mission</h2>
          <p className="text-gray-600 mb-8">
            EnergyERP was founded in 2023 with a simple mission: to empower energy businesses 
            with technology that simplifies complex operations and drives profitability through 
            data-driven decisions. We believe that managing fuel stations shouldn't be complicated, 
            and that technology should work for you, not against you.
          </p>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Solution</h2>
          <p className="text-gray-600 mb-8">
            EnergyERP is a comprehensive fuel station management solution designed to streamline 
            operations, improve efficiency, and provide actionable insights for energy companies 
            of all sizes. Our platform integrates all aspects of fuel station management into a 
            single, easy-to-use interface.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 my-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Team</h2>
          <p className="text-gray-600 mb-8">
            Our team consists of energy industry veterans and technology experts who understand 
            the unique challenges of fuel station management. With decades of combined experience 
            in both energy operations and software development, we've built a solution that 
            addresses real-world problems with practical, effective solutions.
          </p>
          
          <div className="bg-blue-50 p-6 rounded-xl my-12">
            <h3 className="text-2xl font-bold text-blue-800 mb-4">Ready to get started?</h3>
            <p className="text-blue-700 mb-6">
              Join hundreds of energy companies that are already transforming their operations with EnergyERP.
            </p>
            <Link 
              to="/contact" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all inline-flex items-center"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;