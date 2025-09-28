import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Card, Input, Table, Alert } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { Plus, X, Zap, Gauge, Fuel, Calendar, Clock, Truck, User, FileText, DollarSign } from 'lucide-react';
import clsx from 'clsx';
import fuelOffloadService, { offloadValidators, offloadCalculations, offloadFormatters } from '../../../../services/fuelOffloadService';

const CreateOffloadModal = ({ onClose, refreshOffloads }) => {
  const { state, dispatch } = useApp();
  const [step, setStep] = useState('basic-info'); // 'basic-info', 'before-readings', 'after-readings'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTank, setSelectedTank] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [selectedPurchaseItem, setSelectedPurchaseItem] = useState(null);
  const [availablePurchases, setAvailablePurchases] = useState([]);

  // Get current station and user
  const currentStation = state.currentStation;
  const currentUser = state.user;
  
  // Main offload data structure matching backend - UPDATED
  const [offloadData, setOffloadData] = useState({
    // Core References - UPDATED: Added productId and stationId
    purchaseId: '',
    productId: '', // NEW: Required by backend
    stationId: currentStation?.id || '', // NEW: Required by backend
    tankId: '',
    shiftId: '',
    
    // Delivery Information
    transporterName: '',
    vehicleNumber: '',
    driverName: '',
    driverContact: '',
    waybillNumber: '',
    deliveryNoteNumber: '',
    documentRef: '',
    
    // Quantities
    expectedQuantity: '',
    
    // Quality Control
    density: '',
    temperature: '',
    waterContent: '',
    
    // Financials
    unitPrice: '',
    taxAmount: '',
    transportationCost: '',
    
    // Documentation
    supplierInvoice: '',
    
    // Before Readings
    beforeDipReading: {
      dipValue: '',
      volume: '',
      temperature: '',
      waterLevel: '',
      density: ''
    },
    
    beforePumpReadings: [],
    
    // After Readings (for completion)
    actualQuantity: '',
    afterDipReading: {
      dipValue: '',
      volume: '',
      temperature: '',
      waterLevel: '',
      density: ''
    },
    afterPumpReadings: [],
    
    // Timing
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(new Date().setHours(new Date().getHours() + 2)).toISOString().slice(0, 16),
    
    notes: '',
    driverSignature: ''
  });

  // Filter tanks by current station - UPDATED
  const stationTanks = state.assets?.tanks?.filter(
    tank => tank.stationId === currentStation?.id && tank.productId
  ) || [];

  // Get available shifts - UPDATED
  const availableShifts = state.shifts?.filter(
    shift => shift.stationId === currentStation?.id && shift.status === 'OPEN'
  ) || [];

  // Get pumps connected to selected tank
  const tankPumps = selectedTank 
    ? state.assets?.pumps?.filter(pump => pump.tankId === selectedTank.id) || []
    : [];

  // Fetch available purchases when tank is selected - UPDATED
  useEffect(() => {
    if (selectedTank?.productId && currentStation?.id) {
      const purchases = state.purchases?.filter(purchase => 
        purchase.status === 'APPROVED' && 
        purchase.items?.some(item => 
          item.productId === selectedTank.productId && 
          item.stationId === currentStation.id
        )
      ) || [];
      setAvailablePurchases(purchases);
    }
  }, [selectedTank, currentStation, state.purchases]);

  // Handle tank selection - UPDATED
  const handleSelectTank = (tankId) => {
    const tank = stationTanks.find(t => t.id === tankId);
    setSelectedTank(tank);
    
    if (tank) {
      setOffloadData(prev => ({ 
        ...prev, 
        tankId,
        productId: tank.productId, // NEW: Set productId from tank
        stationId: currentStation?.id || '', // NEW: Ensure stationId is set
        // Auto-set density from tank product if available
        density: tank?.product?.density || prev.density
      }));
    }
  };

  // Handle purchase selection - UPDATED
  const handleSelectPurchase = (purchaseId) => {
    const purchase = availablePurchases.find(p => p.id === purchaseId);
    setSelectedPurchase(purchase);
    
    if (purchase && selectedTank) {
      // Find the specific purchase item for this tank
      const purchaseItem = purchase.items?.find(item => 
        item.productId === selectedTank.productId && 
        item.stationId === currentStation?.id &&
        item.tankId === selectedTank.id
      );
      
      setSelectedPurchaseItem(purchaseItem);
      
      setOffloadData(prev => ({
        ...prev,
        purchaseId,
        unitPrice: purchaseItem?.unitCost || purchaseItem?.unitPrice || '',
        expectedQuantity: purchaseItem?.quantity || '',
        supplierId: purchase.supplierId
      }));
    }
  };

  // Handle basic input change
  const handleInputChange = (field, value) => {
    setOffloadData(prev => ({ ...prev, [field]: value }));
  };

  // Handle dip reading change
  const handleDipReadingChange = (readingType, field, value) => {
    setOffloadData(prev => ({
      ...prev,
      [readingType]: {
        ...prev[readingType],
        [field]: value
      }
    }));
  };

  // Handle pump reading change - UPDATED for better handling
  const handlePumpReadingChange = (readingType, pumpId, meterType, value) => {
    setOffloadData(prev => {
      const readings = [...prev[readingType]];
      const existingIndex = readings.findIndex(r => r.pumpId === pumpId);
      
      if (existingIndex >= 0) {
        readings[existingIndex] = {
          ...readings[existingIndex],
          [meterType]: value ? parseFloat(value) : null
        };
      } else {
        readings.push({
          pumpId,
          electricMeter: meterType === 'electricMeter' ? parseFloat(value) : null,
          manualMeter: meterType === 'manualMeter' ? parseFloat(value) : null,
          cashMeter: meterType === 'cashMeter' ? parseFloat(value) : null
        });
      }
      
      return { ...prev, [readingType]: readings };
    });
  };

  // Initialize pump readings when tank is selected - UPDATED
  useEffect(() => {
    if (tankPumps.length > 0 && offloadData.beforePumpReadings.length === 0) {
      const initialReadings = tankPumps.map(pump => ({
        pumpId: pump.id,
        electricMeter: null,
        manualMeter: null,
        cashMeter: null
      }));
      setOffloadData(prev => ({ ...prev, beforePumpReadings: initialReadings }));
    }
  }, [tankPumps]);

  // Calculate sales during offload
  const calculateSalesDuringOffload = () => {
    return offloadCalculations.calculateSalesDuringOffload(
      offloadData.beforePumpReadings,
      offloadData.afterPumpReadings
    );
  };

  // Calculate variance
  const calculateVariance = () => {
    const expected = parseFloat(offloadData.expectedQuantity) || 0;
    const actual = parseFloat(offloadData.actualQuantity) || 0;
    return offloadCalculations.calculateVariance(expected, actual);
  };

  // Start offload (Step 1-2) - UPDATED error handling
  const startOffload = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Validate required fields
      if (!offloadData.productId || !offloadData.stationId) {
        throw new Error('Product and station selection is required');
      }

      const submissionData = offloadFormatters.formatForSubmission(offloadData, false);
      const result = await fuelOffloadService.startOffload(submissionData);
      
      // Success - move to completion step
      setOffloadData(prev => ({ ...prev, id: result.id }));
      setStep('after-readings');
      
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { type: 'success', message: 'Offload started successfully' }
      });
      
    } catch (error) {
      setError(error.message);
      console.error('Start offload error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Complete offload (Step 3) - UPDATED error handling
  const completeOffload = async () => {
    setLoading(true);
    setError('');
    
    try {
      const completionData = offloadFormatters.formatForSubmission(offloadData, true);
      const result = await fuelOffloadService.completeOffload(offloadData.id, completionData);
      
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { type: 'success', message: 'Offload completed successfully' }
      });
      
      if (refreshOffloads) refreshOffloads();
      onClose();
      
    } catch (error) {
      setError(error.message);
      console.error('Complete offload error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if current step is valid - UPDATED
  const isStepValid = () => {
    switch(step) {
      case 'basic-info':
        return offloadData.purchaseId && 
               offloadData.tankId && 
               offloadData.productId && // NEW: Required
               offloadData.stationId && // NEW: Required
               offloadData.shiftId &&
               offloadData.deliveryNoteNumber &&
               offloadData.transporterName &&
               offloadData.vehicleNumber &&
               offloadData.driverName &&
               offloadData.expectedQuantity &&
               offloadData.unitPrice;

      case 'before-readings':
        return offloadData.beforeDipReading.dipValue &&
               offloadData.beforeDipReading.volume &&
               offloadData.beforePumpReadings.length > 0 &&
               offloadData.beforePumpReadings.every(r => r.electricMeter != null);

      case 'after-readings':
        return offloadData.actualQuantity &&
               offloadData.afterDipReading.dipValue &&
               offloadData.afterDipReading.volume &&
               offloadData.afterPumpReadings.length > 0 &&
               offloadData.afterPumpReadings.every(r => r.electricMeter != null);

      default:
        return false;
    }
  };

  // Get current pump reading for display
  const getPumpReading = (readingType, pumpId, meterType) => {
    const readings = offloadData[readingType];
    const reading = readings.find(r => r.pumpId === pumpId);
    return reading ? reading[meterType] || '' : '';
  };

  // Calculate volume from dip if tank capacity is available
  const calculateVolumeFromDip = (dipValue) => {
    if (!selectedTank?.capacity || !dipValue) return '';
    return offloadCalculations.calculateVolumeFromDip(parseFloat(dipValue), selectedTank.capacity);
  };

  // Render station and product info - NEW helper
  const renderStationProductInfo = () => {
    if (!currentStation || !selectedTank) return null;
    
    return (
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-medium">Station: </span>
            <span>{currentStation.name}</span>
          </div>
          <div>
            <span className="font-medium">Product: </span>
            <span>{selectedTank.product?.name || 'Unknown Product'}</span>
          </div>
          <div>
            <span className="font-medium">Tank: </span>
            <span>{selectedTank.asset?.name || selectedTank.name}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Fuel Offload Management" size="3xl">
      <div className="space-y-6">
        {error && (
          <Alert type="error" title="Error" message={error} onClose={() => setError('')} />
        )}

        {/* Progress indicator */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center">
            {['basic-info', 'before-readings', 'after-readings'].map((s, index) => (
              <React.Fragment key={s}>
                <div 
                  className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2",
                    step === s ? "bg-blue-600 text-white border-blue-600" : 
                    step > s ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-500 border-gray-300"
                  )}
                >
                  {index + 1}
                </div>
                {index < 2 && (
                  <div 
                    className={clsx(
                      "w-20 h-1 mx-2",
                      step > s ? "bg-green-500" : "bg-gray-200"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Station and Product Info */}
        {currentStation && renderStationProductInfo()}

        {/* Step 1: Basic Information */}
        {step === 'basic-info' && (
          <Card title="1. Basic Information & Purchase Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tank Selection */}
              <Select
                label="Select Tank *"
                value={offloadData.tankId}
                onChange={(e) => handleSelectTank(e.target.value)}
                options={[
                  { value: '', label: 'Select a tank' },
                  ...stationTanks.map(tank => ({
                    value: tank.id,
                    label: `${tank.asset?.name || tank.name} - ${tank.product?.name || 'No Product'}`
                  }))
                ]}
                icon={Fuel}
                required
              />
              
              {/* Purchase Selection */}
              <Select
                label="Purchase Order *"
                value={offloadData.purchaseId}
                onChange={(e) => handleSelectPurchase(e.target.value)}
                options={[
                  { value: '', label: 'Select purchase order' },
                  ...availablePurchases.map(purchase => ({
                    value: purchase.id,
                    label: `${purchase.purchaseNumber} - ${purchase.supplier?.name} - ${purchase.items?.find(item => item.productId === selectedTank?.productId)?.quantity || 0}L`
                  }))
                ]}
                icon={FileText}
                required
                disabled={!selectedTank}
              />
              
              {/* Shift Selection */}
              <Select
                label="Shift *"
                value={offloadData.shiftId}
                onChange={(e) => handleInputChange('shiftId', e.target.value)}
                options={[
                  { value: '', label: 'Select shift' },
                  ...availableShifts.map(shift => ({
                    value: shift.id,
                    label: `Shift ${new Date(shift.startTime).toLocaleDateString()} - ${shift.supervisor?.firstName}`
                  }))
                ]}
                icon={Clock}
                required
              />
              
              {/* Delivery Information */}
              <Input
                label="Delivery Note Number *"
                value={offloadData.deliveryNoteNumber}
                onChange={(e) => handleInputChange('deliveryNoteNumber', e.target.value)}
                placeholder="DN-2024-FUEL-001"
                icon={FileText}
                required
              />
              
              <Input
                label="Document Reference *"
                value={offloadData.documentRef}
                onChange={(e) => handleInputChange('documentRef', e.target.value)}
                placeholder="OFFLOAD-2024-001"
                icon={FileText}
                required
              />
              
              <Input
                label="Transporter Name *"
                value={offloadData.transporterName}
                onChange={(e) => handleInputChange('transporterName', e.target.value)}
                placeholder="Prime Fuels Transporter"
                icon={Truck}
                required
              />
              
              <Input
                label="Vehicle Number *"
                value={offloadData.vehicleNumber}
                onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                placeholder="KBP 123T"
                icon={Truck}
                required
              />
              
              <Input
                label="Driver Name *"
                value={offloadData.driverName}
                onChange={(e) => handleInputChange('driverName', e.target.value)}
                placeholder="John Kamau"
                icon={User}
                required
              />
              
              <Input
                label="Driver Contact"
                value={offloadData.driverContact}
                onChange={(e) => handleInputChange('driverContact', e.target.value)}
                placeholder="+254712345678"
                icon={User}
              />
              
              <Input
                label="Waybill Number"
                value={offloadData.waybillNumber}
                onChange={(e) => handleInputChange('waybillNumber', e.target.value)}
                placeholder="WB-2024-FUEL-001"
                icon={FileText}
              />
              
              {/* Quantities and Pricing */}
              <Input
                label="Expected Quantity (Liters) *"
                type="number"
                value={offloadData.expectedQuantity}
                onChange={(e) => handleInputChange('expectedQuantity', e.target.value)}
                placeholder="10000"
                icon={Gauge}
                required
              />
              
              <Input
                label="Unit Price (KES) *"
                type="number"
                value={offloadData.unitPrice}
                onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                placeholder="150.50"
                icon={DollarSign}
                required
              />
              
              <Input
                label="Tax Amount (KES)"
                type="number"
                value={offloadData.taxAmount}
                onChange={(e) => handleInputChange('taxAmount', e.target.value)}
                placeholder="1505.00"
                icon={DollarSign}
              />
              
              <Input
                label="Transportation Cost (KES)"
                type="number"
                value={offloadData.transportationCost}
                onChange={(e) => handleInputChange('transportationCost', e.target.value)}
                placeholder="5000.00"
                icon={DollarSign}
              />
              
              {/* Quality Control */}
              <Input
                label="Density (kg/m³)"
                type="number"
                value={offloadData.density}
                onChange={(e) => handleInputChange('density', e.target.value)}
                placeholder="0.84"
                step="0.01"
              />
              
              <Input
                label="Temperature (°C)"
                type="number"
                value={offloadData.temperature}
                onChange={(e) => handleInputChange('temperature', e.target.value)}
                placeholder="28.5"
                step="0.1"
              />
              
              <Input
                label="Water Content (%)"
                type="number"
                value={offloadData.waterContent}
                onChange={(e) => handleInputChange('waterContent', e.target.value)}
                placeholder="0.02"
                step="0.01"
                max="100"
              />
              
              <Input
                label="Supplier Invoice"
                value={offloadData.supplierInvoice}
                onChange={(e) => handleInputChange('supplierInvoice', e.target.value)}
                placeholder="INV-2024-FUEL-001"
                icon={FileText}
              />

              {/* Hidden fields for backend requirements */}
              <input type="hidden" value={offloadData.productId} />
              <input type="hidden" value={offloadData.stationId} />
            </div>
          </Card>
        )}
        
        {/* Step 2: Before Readings */}
        {step === 'before-readings' && selectedTank && (
          <Card title="2. Pre-Offload Readings">
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800">
                Tank: {selectedTank.asset?.name || selectedTank.name} 
                {selectedTank.product && ` - ${selectedTank.product.name}`}
              </h3>
              <p className="text-sm text-blue-600">
                Capacity: {selectedTank.capacity}L | Current Volume: {selectedTank.currentVolume}L
              </p>
              {selectedPurchaseItem && (
                <p className="text-sm text-blue-600">
                  Purchase: {selectedPurchase?.purchaseNumber} | 
                  Expected: {selectedPurchaseItem.quantity}L | 
                  Unit Price: KES {selectedPurchaseItem.unitCost}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Tank Dip Reading (Before)</h3>
                <Input
                  label="Dip Value *"
                  type="number"
                  value={offloadData.beforeDipReading.dipValue}
                  onChange={(e) => {
                    handleDipReadingChange('beforeDipReading', 'dipValue', e.target.value);
                    // Auto-calculate volume
                    const volume = calculateVolumeFromDip(e.target.value);
                    if (volume) handleDipReadingChange('beforeDipReading', 'volume', volume);
                  }}
                  placeholder="150.5"
                  step="0.1"
                  icon={Gauge}
                  required
                />
                
                <Input
                  label="Volume (Liters) *"
                  type="number"
                  value={offloadData.beforeDipReading.volume}
                  onChange={(e) => handleDipReadingChange('beforeDipReading', 'volume', e.target.value)}
                  placeholder="5000"
                  icon={Gauge}
                  required
                />
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Temperature (°C)"
                    type="number"
                    value={offloadData.beforeDipReading.temperature}
                    onChange={(e) => handleDipReadingChange('beforeDipReading', 'temperature', e.target.value)}
                    placeholder="28.0"
                    step="0.1"
                  />
                  
                  <Input
                    label="Water Level (cm)"
                    type="number"
                    value={offloadData.beforeDipReading.waterLevel}
                    onChange={(e) => handleDipReadingChange('beforeDipReading', 'waterLevel', e.target.value)}
                    placeholder="2.5"
                    step="0.1"
                  />
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Offload Timing</h3>
                <Input
                  label="Start Time *"
                  type="datetime-local"
                  value={offloadData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  icon={Clock}
                  required
                />
                
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium text-sm mb-2">Purchase Information</h4>
                  <p className="text-xs text-gray-600">
                    Purchase: {selectedPurchase?.purchaseNumber}<br/>
                    Supplier: {selectedPurchase?.supplier?.name}<br/>
                    Expected: {offloadData.expectedQuantity}L<br/>
                    Product: {selectedTank.product?.name}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Pump Readings Table */}
            <div className="mt-6">
              <h3 className="font-medium mb-3">Pump Meter Readings (Before Offload) *</h3>
              {tankPumps.length === 0 ? (
                <Alert type="warning" message="No pumps found for this tank. Please add pumps or continue without pump readings." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pump</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Electric Meter *</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash Meter</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manual Meter</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tankPumps.map(pump => (
                        <tr key={pump.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {pump.asset?.name || pump.code}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Input
                              type="number"
                              value={getPumpReading('beforePumpReadings', pump.id, 'electricMeter')}
                              onChange={(e) => handlePumpReadingChange('beforePumpReadings', pump.id, 'electricMeter', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              required
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Input
                              type="number"
                              value={getPumpReading('beforePumpReadings', pump.id, 'cashMeter')}
                              onChange={(e) => handlePumpReadingChange('beforePumpReadings', pump.id, 'cashMeter', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Input
                              type="number"
                              value={getPumpReading('beforePumpReadings', pump.id, 'manualMeter')}
                              onChange={(e) => handlePumpReadingChange('beforePumpReadings', pump.id, 'manualMeter', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Step 3: After Readings */}
        {step === 'after-readings' && selectedTank && (
          <Card title="3. Post-Offload Readings & Completion">
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800">
                Offload in Progress: {offloadData.deliveryNoteNumber}
              </h3>
              <p className="text-sm text-green-600">
                Tank: {selectedTank.asset?.name || selectedTank.name} | 
                Expected: {offloadData.expectedQuantity}L | 
                Dip Before: {offloadData.beforeDipReading.dipValue}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Tank Dip Reading (After) *</h3>
                <Input
                  label="Dip Value *"
                  type="number"
                  value={offloadData.afterDipReading.dipValue}
                  onChange={(e) => {
                    handleDipReadingChange('afterDipReading', 'dipValue', e.target.value);
                    const volume = calculateVolumeFromDip(e.target.value);
                    if (volume) handleDipReadingChange('afterDipReading', 'volume', volume);
                  }}
                  placeholder="248.5"
                  step="0.1"
                  icon={Gauge}
                  required
                />
                
                <Input
                  label="Volume (Liters) *"
                  type="number"
                  value={offloadData.afterDipReading.volume}
                  onChange={(e) => handleDipReadingChange('afterDipReading', 'volume', e.target.value)}
                  placeholder="14800"
                  icon={Gauge}
                  required
                />
                
                <Input
                  label="Actual Delivered Quantity (Liters) *"
                  type="number"
                  value={offloadData.actualQuantity}
                  onChange={(e) => handleInputChange('actualQuantity', e.target.value)}
                  placeholder="9800"
                  icon={Gauge}
                  required
                />
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Temperature (°C)"
                    type="number"
                    value={offloadData.afterDipReading.temperature}
                    onChange={(e) => handleDipReadingChange('afterDipReading', 'temperature', e.target.value)}
                    placeholder="28.2"
                    step="0.1"
                  />
                  
                  <Input
                    label="Water Level (cm)"
                    type="number"
                    value={offloadData.afterDipReading.waterLevel}
                    onChange={(e) => handleDipReadingChange('afterDipReading', 'waterLevel', e.target.value)}
                    placeholder="2.3"
                    step="0.1"
                  />
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Completion Details</h3>
                <Input
                  label="End Time *"
                  type="datetime-local"
                  value={offloadData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  icon={Clock}
                  required
                />
                
                <Input
                  label="Notes"
                  type="textarea"
                  value={offloadData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about the offload..."
                  className="mt-4"
                  rows={3}
                />
                
                {/* Variance Calculation */}
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <h4 className="font-medium text-sm mb-2">Variance Calculation</h4>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Expected:</span>
                      <span>{offloadData.expectedQuantity}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actual:</span>
                      <span>{offloadData.actualQuantity || 0}L</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Variance:</span>
                      <span className={calculateVariance() >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {calculateVariance()}L ({offloadCalculations.calculateVariancePercentage(
                          parseFloat(offloadData.expectedQuantity) || 0, 
                          parseFloat(offloadData.actualQuantity) || 0
                        ).toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* After Pump Readings Table */}
            <div className="mt-6">
              <h3 className="font-medium mb-3">Pump Meter Readings (After Offload) *</h3>
              {tankPumps.length === 0 ? (
                <Alert type="warning" message="No pumps found for this tank. Please complete without pump readings." />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pump</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Electric Meter *</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash Meter</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manual Meter</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales During</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tankPumps.map(pump => {
                          const beforeReading = offloadData.beforePumpReadings.find(r => r.pumpId === pump.id);
                          const afterReading = offloadData.afterPumpReadings.find(r => r.pumpId === pump.id);
                          const sales = afterReading && beforeReading ? 
                            (afterReading.electricMeter || 0) - (beforeReading.electricMeter || 0) : 0;
                          
                          return (
                            <tr key={pump.id}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {pump.asset?.name || pump.code}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Input
                                  type="number"
                                  value={getPumpReading('afterPumpReadings', pump.id, 'electricMeter')}
                                  onChange={(e) => handlePumpReadingChange('afterPumpReadings', pump.id, 'electricMeter', e.target.value)}
                                  placeholder="0.00"
                                  step="0.01"
                                  required
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Input
                                  type="number"
                                  value={getPumpReading('afterPumpReadings', pump.id, 'cashMeter')}
                                  onChange={(e) => handlePumpReadingChange('afterPumpReadings', pump.id, 'cashMeter', e.target.value)}
                                  placeholder="0.00"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Input
                                  type="number"
                                  value={getPumpReading('afterPumpReadings', pump.id, 'manualMeter')}
                                  onChange={(e) => handlePumpReadingChange('afterPumpReadings', pump.id, 'manualMeter', e.target.value)}
                                  placeholder="0.00"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                                {sales.toFixed(2)}L
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Sales During Offload:</span>
                      <span className="text-xl font-bold text-green-700">
                        {calculateSalesDuringOffload().toFixed(2)} L
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="secondary" 
            onClick={step === 'basic-info' ? onClose : () => setStep(step === 'after-readings' ? 'before-readings' : 'basic-info')}
            disabled={loading}
          >
            {step === 'basic-info' ? 'Cancel' : 'Back'}
          </Button>
          
          <div className="flex space-x-3">
            {step !== 'after-readings' ? (
              <Button 
                onClick={step === 'basic-info' ? () => setStep('before-readings') : startOffload}
                disabled={!isStepValid() || loading}
                loading={loading}
              >
                {step === 'basic-info' ? 'Continue to Readings' : 'Start Offload'}
              </Button>
            ) : (
              <Button 
                onClick={completeOffload}
                disabled={!isStepValid() || loading}
                loading={loading}
                variant="success"
              >
                Complete Offload
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateOffloadModal;