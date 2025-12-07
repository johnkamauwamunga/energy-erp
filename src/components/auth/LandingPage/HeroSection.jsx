import React from 'react';
import { Flame, LogIn, Globe } from 'lucide-react';
import { Button } from '@/components/ui'; // Use your alias

const HeroSection = ({ onNavigate, currentFeature, features }) => {
  // Fix 1: Create a variable for the icon component
  const FeatureIcon = features[currentFeature].icon;
  
  // Fix 2: Map colors to Tailwind classes
  const colorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  };
  
  const currentColor = features[currentFeature].color || 'blue';
  const iconClass = `w-12 h-12 ${colorClasses[currentColor]}`;

  return (
    <div className="relative z-10 px-6 py-20">
      <div className="max-w-7xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-block cosmic-gradient p-4 rounded-2xl flame-animation mb-6">
            <Flame className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Energy Management
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-blue-300">
              Lynx  System
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
            Complete fuel station management solution with real-time operations, 
            advanced analytics, and professional reporting for energy companies.
          </p>
        </div>

        {/* Feature Showcase */}
        <div className="mb-12">
          <div className="glass-effect rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-4 mb-6">
              {/* Fixed icon rendering */}
              <FeatureIcon className={iconClass} />
              <div className="text-left">
                <h3 className="text-2xl font-bold text-white">
                  {features[currentFeature].title}
                </h3>
                <p className="text-blue-100">
                  {features[currentFeature].description}
                </p>
              </div>
            </div>
            
            {/* Feature Progress Dots */}
            <div className="flex justify-center space-x-2">
              {features.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentFeature ? 'bg-white scale-125' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Button 
            onClick={() => onNavigate('login')}
            variant="cosmic"
            size="xl"
            icon={LogIn}
            className="w-full sm:w-auto transform hover:scale-105 transition-transform"
          >
            Access System
          </Button>
          <Button 
            onClick={() => onNavigate('about')}
            variant="ghost"
            size="xl"
            icon={Globe}
            className="w-full sm:w-auto text-white border border-white hover:bg-white hover:text-blue-600"
          >
            Learn More
          </Button>
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">99.97%</div>
            <div className="text-blue-200">System Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">1.2M+</div>
            <div className="text-blue-200">Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">50+</div>
            <div className="text-blue-200">Stations</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">24/7</div>
            <div className="text-blue-200">Support</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;