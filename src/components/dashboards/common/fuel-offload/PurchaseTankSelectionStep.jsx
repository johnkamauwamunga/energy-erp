import React from 'react';
import { Card, Alert, Badge, Input, Button } from '../../../ui';
import { Package, Fuel, Plus, Minus, Building2, Zap } from 'lucide-react';
import { dummyData } from './dummyDataForOffload';

const PurchaseTankSelectionStep = ({ purchaseData, offloadData, onChange }) => {
  const availableTanks = dummyData.tanks;

  const handleTankToggle = (tank) => {
    const existingIndex = offloadData.tankOffloads.findIndex(t => t.tankId === tank.id);
    
    if (existingIndex >= 0) {
      const updatedTanks = offloadData.tankOffloads.filter(t => t.tankId !== tank.id);
      onChange({ tankOffloads: updatedTanks });
    } else {
      const newTankOffload = {
        tankId: tank.id,
        tankName: tank.name,
        expectedVolume: 0,
        actualVolume: 0,
        connectedPumps: tank.connectedPumps,
        dipBefore: null,
        dipAfter: null,
        pumpReadingsBefore: [],
        pumpReadingsAfter: []
      };
      
      onChange({ 
        tankOffloads: [...offloadData.tankOffloads, newTankOffload] 
      });
    }
  };

  const handleVolumeChange = (tankId, field, value) => {
    const updatedTanks = offloadData.tankOffloads.map(tank => 
      tank.tankId === tankId 
        ? { ...tank, [field]: parseFloat(value) || 0 }
        : tank
    );
    
    onChange({ tankOffloads: updatedTanks });
  };

  const isTankSelected = (tankId) => {
    return offloadData.tankOffloads.some(t => t.tankId === tankId);
  };

  const totalAllocatedVolume = offloadData.tankOffloads.reduce((sum, tank) => 
    sum + (tank.expectedVolume || 0), 0
  );

  const remainingVolume = purchaseData.items[0].orderedQty - totalAllocatedVolume;

  return (
    <div className="space-y-6">
      {/* Purchase Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-6 text-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Package className="w-6 h-6 text-blue-600" />
            <span className="font-semibold text-blue-900">Total Ordered</span>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-1">
            {purchaseData.items[0].orderedQty.toLocaleString()}L
          </p>
          <p className="text-sm text-blue-700">{purchaseData.items[0].product.name}</p>
        </Card>

        <Card className="p-6 text-center bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Fuel className="w-6 h-6 text-green-600" />
            <span className="font-semibold text-green-900">Allocated</span>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">
            {totalAllocatedVolume.toLocaleString()}L
          </p>
          <p className="text-sm text-green-700">To {offloadData.tankOffloads.length} tanks</p>
        </Card>

        <Card className={`p-6 text-center bg-gradient-to-br ${
          remainingVolume >= 0 
            ? 'from-gray-50 to-gray-100 border-gray-200' 
            : 'from-red-50 to-red-100 border-red-200'
        }`}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Building2 className="w-6 h-6 text-gray-600" />
            <span className="font-semibold text-gray-900">Remaining</span>
          </div>
          <p className={`text-3xl font-bold mb-1 ${
            remainingVolume >= 0 ? 'text-gray-600' : 'text-red-600'
          }`}>
            {remainingVolume.toLocaleString()}L
          </p>
          <p className="text-sm text-gray-600">To allocate</p>
        </Card>
      </div>

      {/* Available Tanks */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Fuel className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Available Tanks</h3>
              <p className="text-gray-600">Select tanks and allocate volumes for offloading</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {availableTanks.map(tank => {
              const isSelected = isTankSelected(tank.id);
              const tankOffload = offloadData.tankOffloads.find(t => t.tankId === tank.id);
              const availableCapacity = tank.capacity - tank.currentVolume;
              
              return (
                <Card key={tank.id} className={`p-6 transition-all duration-200 ${
                  isSelected 
                    ? 'border-2 border-blue-500 bg-blue-50 shadow-md' 
                    : 'border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg text-gray-900">{tank.name}</h4>
                        <Badge variant={isSelected ? "success" : "outline"}>
                          {isSelected ? "Selected" : "Available"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-600">Capacity:</span>
                          <p className="font-semibold">{tank.capacity.toLocaleString()}L</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Current:</span>
                          <p className="font-semibold">{tank.currentVolume.toLocaleString()}L</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Available:</span>
                          <p className="font-semibold text-green-600">{availableCapacity.toLocaleString()}L</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Product:</span>
                          <p className="font-semibold">{tank.product.name}</p>
                        </div>
                      </div>

                      {/* Connected Pumps */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-yellow-600" />
                          <span className="font-medium text-sm text-gray-700">Connected Pumps:</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {tank.connectedPumps.map(pump => (
                            <Badge key={pump.id} variant="outline" className="text-xs bg-white">
                              {pump.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant={isSelected ? "secondary" : "cosmic"}
                      onClick={() => handleTankToggle(tank)}
                      icon={isSelected ? Minus : Plus}
                      size="sm"
                    >
                      {isSelected ? 'Remove' : 'Add'}
                    </Button>
                  </div>

                  {/* Volume Allocation */}
                  {isSelected && (
                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                      <h5 className="font-semibold text-gray-900 mb-3">Volume Allocation</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Expected Volume (Liters)"
                          type="number"
                          value={tankOffload?.expectedVolume || ''}
                          onChange={(e) => handleVolumeChange(tank.id, 'expectedVolume', e.target.value)}
                          placeholder="Enter volume"
                          max={availableCapacity}
                          min="0"
                        />
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">Capacity After Offload:</p>
                          <p className="font-semibold text-lg">
                            {tank.currentVolume + (tankOffload?.expectedVolume || 0)} / {tank.capacity}L
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min(
                                  ((tank.currentVolume + (tankOffload?.expectedVolume || 0)) / tank.capacity) * 100, 
                                  100
                                )}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Selection Summary */}
      {offloadData.tankOffloads.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Ready to Proceed</h4>
                <p className="text-blue-700">
                  {offloadData.tankOffloads.length} tank(s) selected • {totalAllocatedVolume.toLocaleString()}L allocated
                </p>
              </div>
              <Badge variant="success" className="text-lg px-4 py-2">
                {remainingVolume === 0 ? 'Fully Allocated' : `${remainingVolume}L Remaining`}
              </Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PurchaseTankSelectionStep;