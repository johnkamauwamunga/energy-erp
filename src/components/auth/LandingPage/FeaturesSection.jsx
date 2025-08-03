import React from 'react';
import { 
  FileCheck, Truck, TrendingUp, FileText, Shield, Zap 
} from 'lucide-react';

const FeaturesSection = () => (
  <div id="features" className="relative z-10 px-6 py-20 bg-black bg-opacity-20">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-white mb-4">Comprehensive Features</h2>
        <p className="text-xl text-blue-100">Everything you need to manage your energy business</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          {
            icon: FileCheck,
            title: "Document Matching",
            description: "Three-way matching with automatic variance detection",
            color: "blue"
          },
          {
            icon: Truck,
            title: "Centralized Offloads", 
            description: "Real-time monitoring across all stations",
            color: "green"
          },
          {
            icon: TrendingUp,
            title: "Sales Aggregation",
            description: "Multi-level sales consolidation and analytics",
            color: "purple"
          },
          {
            icon: FileText,
            title: "Professional Reports",
            description: "Branded reports in PDF and Excel formats",
            color: "orange"
          },
          {
            icon: Shield,
            title: "Complete Audit Trail",
            description: "Every transaction traceable from source to sale",
            color: "red"
          },
          {
            icon: Zap,
            title: "Real-Time Operations",
            description: "Live monitoring with instant notifications",
            color: "yellow"
          }
        ].map((feature, index) => (
          <div key={index} className="glass-effect rounded-xl p-6 hover:scale-105 transition-transform duration-300">
            <feature.icon className={`w-12 h-12 text-${feature.color}-400 mb-4`} />
            <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
            <p className="text-blue-100">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default FeaturesSection;