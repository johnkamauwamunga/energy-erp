import React, { useState, useEffect } from 'react';
import { 
  Database, Activity, BarChart3, Building2, 
  FileCheck, Truck, TrendingUp, FileText, Shield, Zap,
  Flame, LogIn, Globe, Home
} from 'lucide-react';
import { Button } from '../../../components/ui';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';

const LandingPage = ({ onNavigate }) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  
  const features = [
    {
      title: "Complete ERP Solution",
      description: "End-to-end management from fuel procurement to customer receipt",
      icon: Database,
      color: "blue"
    },
    {
      title: "Real-Time Operations", 
      description: "Live monitoring across all stations with instant updates",
      icon: Activity,
      color: "green"
    },
    {
      title: "Advanced Analytics",
      description: "Professional reporting with company branding and insights",
      icon: BarChart3,
      color: "purple"
    },
    {
      title: "Multi-Station Management",
      description: "Centralized control of unlimited service stations",
      icon: Building2,
      color: "orange"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen cosmic-gradient relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-purple-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-cyan-400 rounded-full opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Navigation Header */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="cosmic-gradient p-2 rounded-xl flame-animation">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Energy ERP</h1>
              <p className="text-xs text-blue-100">Complete Solution</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-8 text-white">
            <a href="#features" className="hover:text-blue-200 transition-colors">Features</a>
            <a href="#about" className="hover:text-blue-200 transition-colors">About</a>
            <a href="#contact" className="hover:text-blue-200 transition-colors">Contact</a>
              <a href="/login" className="hover:text-blue-200 transition-colors">Login</a>
          </div>
        </div>
      </nav>

      <HeroSection 
        onNavigate={onNavigate} 
        currentFeature={currentFeature} 
        features={features} 
      />
      
      <FeaturesSection />
    </div>
  );
};

export default LandingPage;