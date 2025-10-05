import React from 'react';
import { Card, Alert, Badge, Input, Button } from '../../../ui';
import { Package, Fuel, Plus, Minus } from 'lucide-react';
import { dummyData } from './dummyDataForOffload';

const PurchaseTankSelectionStep = ({ purchaseData, offloadData, onChange }) => {
  const availableTanks = dummyData.tanks;

  const handleTankToggle = (tank) => {
    const existingIndex = offloadData.tankOffloads.findIndex(t => t.tankId === tank.id);
    
    if (existingIndex >= 0) {
      // Remove tank
      const updatedTanks = offloadData.tankOffloads.filter(t => t.tankId !== tank.id);
      onChange({ tankOffloads: updatedTanks });
    } else {
      // Add tank with initial structure
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
      <Alert variant="info">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-1">Select Tanks for Offloading</h4>
            <p className="text-sm">
              Choose which tanks to offload fuel into and allocate volumes. 
              Total purchase: {purchaseData.items[0].orderedQty}L of {purchaseData.items[0].product.name}
            </p>
          </div>
        </div>
      </Alert>

      {/* Purchase Summary */}
      <Card title="Purchase Details" className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Purchase #</span>
            <p className="font-semibold">{purchaseData.purchaseNumber}</p>
          </div>
          <div>
            <span className="text-gray-600">Supplier</span>
            <p className="font-semibold">{purchaseData.supplier.name}</p>
          </div>
          <div>
            <span className="text-gray-600">Product</span>
            <p className="font-semibold">{purchaseData.items[0].product.name}</p>
          </div>
          <div>
            <span className="text-gray-600">Total Quantity</span>
            <p className="font-semibold">{purchaseData.items[0].orderedQty}L</p>
          </div>
        </div>
      </Card>

      {/* Volume Allocation Summary */}
      <Card title="Volume Allocation" className="p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{purchaseData.items[0].orderedQty}L</p>
            <p className="text-sm text-gray-600">Total Ordered</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{totalAllocatedVolume}L</p>
            <p className="text-sm text-gray-600">Allocated to Tanks</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${
              remainingVolume >= 0 ? 'text-gray-600' : 'text-red-600'
            }`}>
              {remainingVolume}L
            </p>
            <p className="text-sm text-gray-600">Remaining</p>
          </div>
        </div>
      </Card>

      {/* Available Tanks */}
      <Card title="Available Tanks" className="p-6">
        <div className="space-y-4">
          {availableTanks.map(tank => {
            const isSelected = isTankSelected(tank.id);
            const tankOffload = offloadData.tankOffloads.find(t => t.tankId === tank.id);
            
            return (
              <Card key={tank.id} className={`p-4 border-2 ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant={isSelected ? "cosmic" : "outline"}
                      onClick={() => handleTankToggle(tank)}
                      icon={isSelected ? Minus : Plus}
                      size="sm"
                    >
                      {isSelected ? 'Remove' : 'Add'}
                    </Button>
                    <div>
                      <h4 className="font-semibold">{tank.name}</h4>
                      <p className="text-sm text-gray-600">
                        Capacity: {tank.capacity}L • Current: {tank.currentVolume}L • 
                        Available: {tank.capacity - tank.currentVolume}L
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="success">{tank.connectedPumps.length} Pumps</Badge>
                        <Badge variant="outline">{tank.product.name}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Badge variant={isSelected ? "success" : "outline"}>
                    {isSelected ? "Selected" : "Available"}
                  </Badge>
                </div>

                {/* Connected Pumps */}
                <div className="mb-4">
                  <h5 className="font-medium text-sm mb-2">Connected Pumps:</h5>
                  <div className="flex gap-2 flex-wrap">
                    {tank.connectedPumps.map(pump => (
                      <Badge key={pump.id} variant="outline" className="text-xs">
                        {pump.name} ({pump.island})
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Volume Allocation (only if selected) */}
                {isSelected && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <Input
                      label="Expected Volume (L)"
                      type="number"
                      value={tankOffload?.expectedVolume || ''}
                      onChange={(e) => handleVolumeChange(tank.id, 'expectedVolume', e.target.value)}
                      placeholder="Enter volume"
                      max={tank.capacity - tank.currentVolume}
                    />
                    <div className="flex items-end">
                      <div className="text-sm">
                        <p className="text-gray-600">Tank capacity after offload:</p>
                        <p className="font-semibold">
                          {tank.currentVolume + (tankOffload?.expectedVolume || 0)} / {tank.capacity}L
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default PurchaseTankSelectionStep;