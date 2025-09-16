import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Card, Input, Table } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { Plus, X, Zap, Gauge, Fuel, Calendar, Clock } from 'lucide-react';
import clsx from 'clsx';

const CreateOffloadModal = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const [selectedTank, setSelectedTank] = useState(null);
  const [step, setStep] = useState('select-tank'); // 'select-tank', 'before-readings', 'after-readings'
  const [offloadData, setOffloadData] = useState({
    tankId: '',
    energyCompanyId: '',
    deliveryNoteNumber: '',
    driverName: '',
    vehiclePlate: '',
    expectedVolume: '',
    actualVolume: '',
    dipBefore: '',
    dipAfter: '',
    temperature: '',
    density: '',
    pumpsBefore: {},
    pumpsAfter: {},
    startTime: new Date().toISOString().slice(0, 16),
    endTime: ''
  });

  // Get current station
  const currentStation = state.currentStation?.id;
  
  // Filter tanks by current station
  const stationTanks = state.assets.tanks.filter(
    tank => tank.stationId === currentStation
  );

  // Filter energy companies
  const energyCompanies = state.suppliers.filter(
    supplier => supplier.type === 'energy'
  );

  // Get pumps connected to selected tank
  const tankPumps = selectedTank 
    ? state.assets.pumps.filter(pump => pump.tankId === selectedTank.id)
    : [];

  // Set default end time
  useEffect(() => {
    const endTime = new Date(new Date().setHours(new Date().getHours() + 2)).toISOString().slice(0, 16);
    setOffloadData(prev => ({ ...prev, endTime }));
  }, []);

  // Handle tank selection
  const handleSelectTank = (tankId) => {
    const tank = stationTanks.find(t => t.id === tankId);
    setSelectedTank(tank);
    setOffloadData(prev => ({ ...prev, tankId }));
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setOffloadData(prev => ({ ...prev, [field]: value }));
  };

  // Handle pump reading change (before offload)
  const handlePumpBeforeReadingChange = (pumpId, meterType, value) => {
    setOffloadData(prev => ({
      ...prev,
      pumpsBefore: {
        ...prev.pumpsBefore,
        [pumpId]: {
          ...prev.pumpsBefore[pumpId],
          [meterType]: parseFloat(value) || 0
        }
      }
    }));
  };

  // Handle pump reading change (after offload)
  const handlePumpAfterReadingChange = (pumpId, meterType, value) => {
    setOffloadData(prev => ({
      ...prev,
      pumpsAfter: {
        ...prev.pumpsAfter,
        [pumpId]: {
          ...prev.pumpsAfter[pumpId],
          [meterType]: parseFloat(value) || 0
        }
      }
    }));
  };

  // Calculate sales during offload for a pump
  const calculatePumpSales = (pumpId) => {
    const before = offloadData.pumpsBefore[pumpId] || {};
    const after = offloadData.pumpsAfter[pumpId] || {};
    
    const electricSales = (after.electric || 0) - (before.electric || 0);
    const cashSales = (after.cash || 0) - (before.cash || 0);
    const manualSales = (after.manual || 0) - (before.manual || 0);
    
    return { electricSales, cashSales, manualSales, totalSales: electricSales + cashSales + manualSales };
  };

  // Calculate total sales during offload
  const calculateTotalSales = () => {
    return tankPumps.reduce((total, pump) => {
      const sales = calculatePumpSales(pump.id);
      return total + sales.totalSales;
    }, 0);
  };

  // Create offload record
  const createOffload = () => {
    const offloadId = `OFFLOAD_${Date.now()}`;
    
    const offloadRecord = {
      id: offloadId,
      stationId: currentStation,
      tankId: offloadData.tankId,
      energyCompanyId: offloadData.energyCompanyId,
      deliveryNoteNumber: offloadData.deliveryNoteNumber,
      driverName: offloadData.driverName,
      vehiclePlate: offloadData.vehiclePlate,
      expectedVolume: parseFloat(offloadData.expectedVolume) || 0,
      actualVolume: parseFloat(offloadData.actualVolume) || 0,
      dipBefore: parseFloat(offloadData.dipBefore) || 0,
      dipAfter: parseFloat(offloadData.dipAfter) || 0,
      temperature: parseFloat(offloadData.temperature) || 0,
      density: parseFloat(offloadData.density) || 0,
      pumpsBefore: offloadData.pumpsBefore,
      pumpsAfter: offloadData.pumpsAfter,
      salesDuringOffload: calculateTotalSales(),
      startTime: offloadData.startTime,
      endTime: offloadData.endTime,
      status: 'completed'
    };
    
    dispatch({ type: 'ADD_OFFLOAD', payload: offloadRecord });
    
    // Update tank level
    dispatch({ 
      type: 'UPDATE_TANK_LEVEL', 
      payload: {
        tankId: offloadData.tankId,
        newLevel: offloadData.dipAfter
      }
    });
    
    onClose();
  };

  // Check if form is valid for current step
  const isStepValid = () => {
    switch(step) {
      case 'select-tank':
        return offloadData.tankId && offloadData.energyCompanyId;
      case 'before-readings':
        return offloadData.dipBefore !== '' && 
               Object.keys(offloadData.pumpsBefore).length === tankPumps.length;
      case 'after-readings':
        return offloadData.dipAfter !== '' && 
               offloadData.actualVolume !== '' &&
               Object.keys(offloadData.pumpsAfter).length === tankPumps.length;
      default:
        return false;
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Record Fuel Offload" size="2xl">
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center">
            {['select-tank', 'before-readings', 'after-readings'].map((s, index) => (
              <React.Fragment key={s}>
                <div 
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    step === s ? "bg-blue-600 text-white" : 
                    step > s ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                  )}
                >
                  {index + 1}
                </div>
                {index < 2 && (
                  <div 
                    className={clsx(
                      "w-16 h-1 mx-2",
                      step > s ? "bg-green-500" : "bg-gray-200"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {step === 'select-tank' && (
          <Card title="1. Select Tank & Delivery Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Select Tank"
                value={offloadData.tankId}
                onChange={(e) => handleSelectTank(e.target.value)}
                options={[
                  { value: '', label: 'Select a tank' },
                  ...stationTanks.map(tank => ({
                    value: tank.id,
                    label: `${tank.name} (${tank.fuelType}) - Current: ${tank.currentLevel}${tank.unit}`
                  }))
                ]}
                icon={Fuel}
              />
              
              <Select
                label="Energy Company"
                value={offloadData.energyCompanyId}
                onChange={(e) => handleInputChange('energyCompanyId', e.target.value)}
                options={[
                  { value: '', label: 'Select energy company' },
                  ...energyCompanies.map(company => ({
                    value: company.id,
                    label: company.name
                  }))
                ]}
                icon={Zap}
              />
              
              <Input
                label="Delivery Note Number"
                value={offloadData.deliveryNoteNumber}
                onChange={(e) => handleInputChange('deliveryNoteNumber', e.target.value)}
                placeholder="Enter delivery note number"
              />
              
              <Input
                label="Driver Name"
                value={offloadData.driverName}
                onChange={(e) => handleInputChange('driverName', e.target.value)}
                placeholder="Enter driver's name"
              />
              
              <Input
                label="Vehicle Plate Number"
                value={offloadData.vehiclePlate}
                onChange={(e) => handleInputChange('vehiclePlate', e.target.value)}
                placeholder="Enter vehicle plate number"
              />
              
              <Input
                label="Expected Volume"
                type="number"
                value={offloadData.expectedVolume}
                onChange={(e) => handleInputChange('expectedVolume', e.target.value)}
                placeholder="Expected volume"
                icon={Gauge}
              />
            </div>
          </Card>
        )}
        
        {step === 'before-readings' && selectedTank && (
          <Card title="2. Record Readings Before Offload">
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800">Tank: {selectedTank.name} ({selectedTank.fuelType})</h3>
              <p className="text-sm text-blue-600">Current Level: {selectedTank.currentLevel}{selectedTank.unit}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Tank Dip Reading</h3>
                <Input
                  label="Dip Before Offload"
                  type="number"
                  value={offloadData.dipBefore}
                  onChange={(e) => handleInputChange('dipBefore', e.target.value)}
                  placeholder="Enter dip reading"
                  icon={Gauge}
                />
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Environmental Conditions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Temperature (°C)"
                    type="number"
                    value={offloadData.temperature}
                    onChange={(e) => handleInputChange('temperature', e.target.value)}
                    placeholder="Temp"
                  />
                  
                  <Input
                    label="Density (kg/m³)"
                    type="number"
                    value={offloadData.density}
                    onChange={(e) => handleInputChange('density', e.target.value)}
                    placeholder="Density"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium mb-3">Pump Meter Readings (Before Offload)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pump</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Electric Meter</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash Meter</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manual Meter</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tankPumps.map(pump => (
                      <tr key={pump.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pump.code}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Input
                            type="number"
                            value={offloadData.pumpsBefore[pump.id]?.electric || ''}
                            onChange={(e) => handlePumpBeforeReadingChange(pump.id, 'electric', e.target.value)}
                            placeholder="0.00"
                            className="w-full"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Input
                            type="number"
                            value={offloadData.pumpsBefore[pump.id]?.cash || ''}
                            onChange={(e) => handlePumpBeforeReadingChange(pump.id, 'cash', e.target.value)}
                            placeholder="0.00"
                            className="w-full"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Input
                            type="number"
                            value={offloadData.pumpsBefore[pump.id]?.manual || ''}
                            onChange={(e) => handlePumpBeforeReadingChange(pump.id, 'manual', e.target.value)}
                            placeholder="0.00"
                            className="w-full"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}
        
        {step === 'after-readings' && selectedTank && (
          <Card title="3. Record Readings After Offload">
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800">Tank: {selectedTank.name} ({selectedTank.fuelType})</h3>
              <p className="text-sm text-green-600">Dip Before: {offloadData.dipBefore}{selectedTank.unit}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Tank Dip Reading</h3>
                <Input
                  label="Dip After Offload"
                  type="number"
                  value={offloadData.dipAfter}
                  onChange={(e) => handleInputChange('dipAfter', e.target.value)}
                  placeholder="Enter dip reading"
                  icon={Gauge}
                />
                
                <Input
                  label="Actual Delivered Volume"
                  type="number"
                  value={offloadData.actualVolume}
                  onChange={(e) => handleInputChange('actualVolume', e.target.value)}
                  placeholder="Actual volume"
                  className="mt-4"
                  icon={Gauge}
                />
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Offload Timing</h3>
                <Input
                  label="Start Time"
                  type="datetime-local"
                  value={offloadData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  icon={Clock}
                />
                
                <Input
                  label="End Time"
                  type="datetime-local"
                  value={offloadData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="mt-4"
                  icon={Clock}
                />
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium mb-3">Pump Meter Readings (After Offload)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pump</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Electric Meter</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash Meter</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manual Meter</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales During</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tankPumps.map(pump => {
                      const sales = calculatePumpSales(pump.id);
                      return (
                        <tr key={pump.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {pump.code}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Input
                              type="number"
                              value={offloadData.pumpsAfter[pump.id]?.electric || ''}
                              onChange={(e) => handlePumpAfterReadingChange(pump.id, 'electric', e.target.value)}
                              placeholder="0.00"
                              className="w-full"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Input
                              type="number"
                              value={offloadData.pumpsAfter[pump.id]?.cash || ''}
                              onChange={(e) => handlePumpAfterReadingChange(pump.id, 'cash', e.target.value)}
                              placeholder="0.00"
                              className="w-full"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Input
                              type="number"
                              value={offloadData.pumpsAfter[pump.id]?.manual || ''}
                              onChange={(e) => handlePumpAfterReadingChange(pump.id, 'manual', e.target.value)}
                              placeholder="0.00"
                              className="w-full"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                            {sales.totalSales.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Sales During Offload:</span>
                  <span className="text-xl font-bold text-blue-700">{calculateTotalSales().toFixed(2)} L</span>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button 
            variant="secondary" 
            onClick={step === 'select-tank' ? onClose : () => setStep(step === 'after-readings' ? 'before-readings' : 'select-tank')}
          >
            {step === 'select-tank' ? 'Cancel' : 'Back'}
          </Button>
          
          {step !== 'after-readings' ? (
            <Button 
              onClick={() => setStep(step === 'select-tank' ? 'before-readings' : 'after-readings')}
              disabled={!isStepValid()}
            >
              Continue
            </Button>
          ) : (
            <Button 
              onClick={createOffload}
              disabled={!isStepValid()}
            >
              Complete Offload
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CreateOffloadModal;