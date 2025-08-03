import React from 'react';
import { MapPin, User, Phone, Eye, Edit } from 'lucide-react';
import { Button } from '../../../ui';

const StationCard = ({ station, islandCount }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-[1.02]">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">{station.name}</h4>
          <span className={`px-2 py-1 text-xs rounded-full ${
            station.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {station.status}
          </span>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            {station.location}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-2" />
            {station.manager}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-4 h-4 mr-2" />
            {station.phone}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              KSH {(station.dailyTarget / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-gray-500">Daily Target</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {islandCount}
            </div>
            <div className="text-xs text-gray-500">Islands</div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button size="sm" variant="secondary" icon={Eye} className="flex-1">
            View Details
          </Button>
          <Button size="sm" variant="secondary" icon={Edit}>
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StationCard;