// components/shifts/ShiftClosingFlow.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Input, Select, Badge, Alert, Tabs, Progress } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { shiftService } from '../../../../services/shiftService/shiftService';
import { 
  Droplets, Zap, CreditCard, Package, CheckCircle, AlertCircle,
  Save, Calculator, TrendingUp, Clock, User, DollarSign,
  PlayCircle, PauseCircle, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';

/**
 * COMPLETE SHIFT CLOSING FLOW
 * 
 * This component handles the entire shift closing process:
 * 1. Validation → 2. Pump Readings → 3. Tank Dips → 
 * 4. Collections → 5. Non-Fuel → 6. Review & Close
 * 
 * Includes variance calculations and reconciliation checks
 */
const ShiftClosingFlow = ({ shift, isOpen, onClose, onShiftClosed }) => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('validation');
  const [loading, setLoading] = useState(false);
  const [closingData, setClosingData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [calculations, setCalculations] = useState({});
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState([]);

  const tabs = [
    { id: 'validation', label: 'Validation', icon: CheckCircle, required: true },
    { id: 'pumps', label: 'Pump Readings', icon: Zap, required: true },
    { id: 'tanks', label: 'Tank Dips', icon: Droplets, required: true },
    { id: 'collections', label: 'Collections', icon: CreditCard, required: true },
    { id: 'nonfuel', label: 'Non-Fuel', icon: Package, required: false },
    { id: 'review', label: 'Review & Close', icon: Save, required: false }
  ];

  // ============================================================================
  // INITIALIZATION & DATA LOADING
  // ============================================================================

  /** Initialize when modal opens */
  useEffect(() => {
    if (isOpen && shift) {
      initializeClosingFlow();
    }
  }, [isOpen, shift]);

  /** Initialize closing data and validation */
  const initializeClosingFlow = async () => {
    setLoading(true);
    try {
      // Step 1: Validate shift can be closed
      const validationResult = await shiftService.validateShiftClosing(shift.id);
      setValidation(validationResult);

      // Step 2: Load shift details for closing
      const shiftDetails = await shiftService.getShiftById(shift.id);
      
      // Step 3: Initialize closing data structure
      const initialClosingData = shiftService.createClosingDataTemplate(shift.id, user.id);
      
      // Populate with opening readings for reference
      initialClosingData.pumpReadings = shiftDetails.pumpMeterReadings
        .filter(r => r.readingType === 'START')
        .map(reading => ({
          pumpId: reading.pumpId,
          electricMeter: 0, // Will be filled by user
          manualMeter: 0,
          cashMeter: 0,
          unitPrice: reading.unitPrice,
          openingElectric: reading.electricMeter,
          openingManual: reading.manualMeter,
          openingCash: reading.cashMeter
        }));

      initialClosingData.tankReadings = shiftDetails.tankDipReadings
        .filter(r => r.readingType === 'START')
        .map(reading => ({
          tankId: reading.tankId,
          dipValue: 0, // Will be filled by user
          volume: 0,
          temperature: reading.temperature,
          waterLevel: reading.waterLevel,
          density: reading.density,
          openingDip: reading.dipValue,
          openingVolume: reading.volume
        }));

      // Initialize island collections
      initialClosingData.islandCollections = shiftDetails.shiftIslandAttedant.map(assignment => ({
        islandId: assignment.islandId,
        attendantId: assignment.attendantId,
        cashAmount: 0,
        mobileMoneyAmount: 0,
        visaAmount: 0,
        mastercardAmount: 0,
        debtAmount: 0,
        otherAmount: 0
      }));

      // Initialize station collection
      initialClosingData.stationCollection = {
        cashAmount: 0,
        mobileMoneyAmount: 0,
        visaAmount: 0,
        mastercardAmount: 0,
        debtAmount: 0,
        otherAmount: 0
      };

      setClosingData(initialClosingData);

      // Step 4: Pre-calculate expected values
      calculateExpectedValues(initialClosingData, shiftDetails);

    } catch (error) {
      console.error('Failed to initialize closing flow:', error);
      setErrors({ initialization: error.message });
    } finally {
      setLoading(false);
    }
  };

  /** Calculate expected sales and collections */
  const calculateExpectedValues = (closingData, shiftDetails) => {
    // Calculate expected pump sales
    const expectedPumpSales = closingData.pumpReadings.reduce((total, reading) => {
      const unitPrice = reading.unitPrice || 150;
      const estimatedSales = unitPrice * 100; // Placeholder calculation
      return total + estimatedSales;
    }, 0);

    // Calculate expected tank usage
    const expectedTankUsage = closingData.tankReadings.reduce((total, reading) => {
      return total + (reading.openingVolume - 1000); // Placeholder
    }, 0);

    // Calculate shift duration
    const shiftDuration = shiftService.calculateShiftDuration(shift.startTime, new Date().toISOString());

    setCalculations({
      expectedPumpSales,
      expectedTankUsage,
      shiftDuration
    });
  };

  // ============================================================================
  // VALIDATION TAB
  // ============================================================================

  const ValidationTab = () => {
    if (!validation) return null;

    return (
      <Card title="Shift Closing Validation">
        <div className="space-y-6">
          <Alert variant="info">
            Before closing the shift, please verify that all required data is complete and accurate.
          </Alert>

          {/* Shift Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Shift Details" className="p-4">
              <div className="space-y-3 text-sm">
                <InfoRow label="Shift Number" value={shift.shiftNumber} />
                <InfoRow label="Supervisor" value={shift.supervisor?.firstName + ' ' + shift.supervisor?.lastName} />
                <InfoRow label="Start Time" value={new Date(shift.startTime).toLocaleString()} />
                <InfoRow label="Duration" value={`${calculations.shiftDuration?.hours || 0}h ${calculations.shiftDuration?.minutes || 0}m`} />
              </div>
            </Card>

            <Card title="Validation Status" className="p-4">
              <div className="space-y-3">
                <ValidationItem
                  label="Shift Status"
                  isValid={validation.requirements.isOpen}
                  message={validation.requirements.isOpen ? 'Shift is open' : 'Shift is not open'}
                />
                <ValidationItem
                  label="Opening Readings"
                  isValid={validation.requirements.hasOpeningReadings}
                  message={validation.requirements.hasOpeningReadings ? 'Opening readings present' : 'No opening readings'}
                />
                <ValidationItem
                  label="Minimum Duration"
                  isValid={validation.requirements.hasMinimumDuration}
                  message={validation.requirements.hasMinimumDuration ? 'Minimum duration met' : 'Shift too short'}
                />
                <ValidationItem
                  label="Attendants Assigned"
                  isValid={shift.shiftIslandAttedant?.length > 0}
                  message={shift.shiftIslandAttedant?.length > 0 ? 'Attendants assigned' : 'No attendants assigned'}
                />
              </div>
            </Card>
          </div>

          {/* Asset Summary */}
          <Card title="Assets Summary" className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{shift.shiftIslandAttedant?.length || 0}</div>
                <div className="text-blue-700 text-sm">Islands</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {shift.pumpMeterReadings?.filter(r => r.readingType === 'START').length || 0}
                </div>
                <div className="text-green-700 text-sm">Pumps</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {shift.tankDipReadings?.filter(r => r.readingType === 'START').length || 0}
                </div>
                <div className="text-purple-700 text-sm">Tanks</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {shift.shiftIslandAttedant?.length || 0}
                </div>
                <div className="text-orange-700 text-sm">Attendants</div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => setActiveTab('pumps')}
              disabled={!validation.isValid}
              icon={ChevronRight}
            >
              Continue to Pump Readings
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // ============================================================================
  // PUMP READINGS TAB
  // ============================================================================

  const PumpReadingsTab = () => {
    if (!closingData) return null;

    /** Update pump reading value */
    const updatePumpReading = (pumpId, field, value) => {
      setClosingData(prev => ({
        ...prev,
        pumpReadings: prev.pumpReadings.map(reading =>
          reading.pumpId === pumpId 
            ? { ...reading, [field]: parseFloat(value) || 0 }
            : reading
        )
      }));
    };

    /** Calculate pump sales and variance */
    const calculatePumpMetrics = (reading) => {
      const salesVolume = (reading.electricMeter || 0) - (reading.openingElectric || 0);
      const salesValue = salesVolume * (reading.unitPrice || 0);
      
      return {
        salesVolume: Math.max(0, salesVolume),
        salesValue: Math.max(0, salesValue),
        variance: salesVolume // Placeholder for actual variance calculation
      };
    };

    return (
      <Card title="Closing Pump Meter Readings">
        <div className="space-y-6">
          <Alert variant="info">
            Record closing meter readings for all pumps. Compare with opening readings to calculate shift sales.
          </Alert>

          {/* Pump Readings Grid */}
          <div className="space-y-4">
            {closingData.pumpReadings.map((reading, index) => {
              const metrics = calculatePumpMetrics(reading);
              const isComplete = reading.electricMeter > 0 && reading.cashMeter > 0;

              return (
                <Card key={reading.pumpId} className={`p-4 ${isComplete ? 'border-green-200 bg-green-50' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-medium">Pump {index + 1}</h4>
                      <p className="text-sm text-gray-600">
                        Opening: {reading.openingElectric} • Unit Price: ${reading.unitPrice}
                      </p>
                    </div>
                    <Badge variant={isComplete ? "green" : "yellow"}>
                      {isComplete ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>

                  {/* Reading Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Input
                      label="Electric Meter *"
                      type="number"
                      step="0.001"
                      value={reading.electricMeter}
                      onChange={e => updatePumpReading(reading.pumpId, 'electricMeter', e.target.value)}
                      min={reading.openingElectric}
                      error={!reading.electricMeter ? 'Required' : undefined}
                    />
                    
                    <Input
                      label="Cash Meter *"
                      type="number"
                      step="0.001"
                      value={reading.cashMeter}
                      onChange={e => updatePumpReading(reading.pumpId, 'cashMeter', e.target.value)}
                      min={reading.openingCash}
                      error={!reading.cashMeter ? 'Required' : undefined}
                    />
                    
                    <Input
                      label="Manual Meter"
                      type="number"
                      step="0.001"
                      value={reading.manualMeter}
                      onChange={e => updatePumpReading(reading.pumpId, 'manualMeter', e.target.value)}
                      min={reading.openingManual}
                    />
                  </div>

                  {/* Calculated Metrics */}
                  {reading.electricMeter > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                      <MetricItem label="Sales Volume" value={metrics.salesVolume.toFixed(2)} unit="L" />
                      <MetricItem label="Sales Value" value={metrics.salesValue.toFixed(2)} unit="$" />
                      <MetricItem label="Price/L" value={reading.unitPrice.toFixed(2)} unit="$" />
                      <MetricItem 
                        label="Status" 
                        value={metrics.salesVolume > 0 ? "Active" : "No Sales"} 
                        variant={metrics.salesVolume > 0 ? "success" : "warning"}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Progress Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-blue-700">Progress</span>
              <span className="text-blue-600">
                {closingData.pumpReadings.filter(r => r.electricMeter > 0 && r.cashMeter > 0).length}
                /{closingData.pumpReadings.length} complete
              </span>
            </div>
            <Progress 
              value={(closingData.pumpReadings.filter(r => r.electricMeter > 0 && r.cashMeter > 0).length / closingData.pumpReadings.length) * 100} 
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="secondary" 
              onClick={() => setActiveTab('validation')}
              icon={ChevronLeft}
            >
              Back to Validation
            </Button>
            <Button
              onClick={() => setActiveTab('tanks')}
              icon={ChevronRight}
            >
              Continue to Tank Dips
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // ============================================================================
  // TANK DIPS TAB
  // ============================================================================

  const TankDipsTab = () => {
    if (!closingData) return null;

    /** Update tank reading value */
    const updateTankReading = (tankId, field, value) => {
      setClosingData(prev => ({
        ...prev,
        tankReadings: prev.tankReadings.map(reading =>
          reading.tankId === tankId 
            ? { ...reading, [field]: parseFloat(value) || 0 }
            : reading
        )
      }));
    };

    /** Calculate tank usage and variance */
    const calculateTankMetrics = (reading) => {
      const usage = (reading.openingVolume || 0) - (reading.volume || 0);
      const variance = usage; // Placeholder for actual variance calculation
      
      return {
        usage: Math.max(0, usage),
        variance: variance,
        status: usage >= 0 ? 'Normal' : 'Check Required'
      };
    };

    return (
      <Card title="Closing Tank Dip Readings">
        <div className="space-y-6">
          <Alert variant="info">
            Record closing dip readings for all tanks. These will be used for fuel reconciliation.
          </Alert>

          {/* Tank Readings Grid */}
          <div className="space-y-4">
            {closingData.tankReadings.map((reading, index) => {
              const metrics = calculateTankMetrics(reading);
              const isComplete = reading.dipValue > 0 && reading.volume > 0;

              return (
                <Card key={reading.tankId} className={`p-4 ${isComplete ? 'border-green-200 bg-green-50' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-medium">Tank {index + 1}</h4>
                      <p className="text-sm text-gray-600">
                        Opening: {reading.openingVolume}L • Dip: {reading.openingDip}
                      </p>
                    </div>
                    <Badge variant={isComplete ? "green" : "yellow"}>
                      {isComplete ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>

                  {/* Reading Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <Input
                      label="Dip Value *"
                      type="number"
                      step="0.01"
                      value={reading.dipValue}
                      onChange={e => updateTankReading(reading.tankId, 'dipValue', e.target.value)}
                      min="0"
                      error={!reading.dipValue ? 'Required' : undefined}
                    />
                    
                    <Input
                      label="Volume (L) *"
                      type="number"
                      step="0.01"
                      value={reading.volume}
                      onChange={e => updateTankReading(reading.tankId, 'volume', e.target.value)}
                      min="0"
                      max={reading.openingVolume}
                      error={!reading.volume ? 'Required' : undefined}
                    />
                    
                    <Input
                      label="Temperature (°C)"
                      type="number"
                      step="0.1"
                      value={reading.temperature}
                      onChange={e => updateTankReading(reading.tankId, 'temperature', e.target.value)}
                    />
                    
                    <Input
                      label="Water Level"
                      type="number"
                      step="0.01"
                      value={reading.waterLevel}
                      onChange={e => updateTankReading(reading.tankId, 'waterLevel', e.target.value)}
                      min="0"
                      max="1"
                    />
                    
                    <Input
                      label="Density"
                      type="number"
                      step="0.001"
                      value={reading.density}
                      onChange={e => updateTankReading(reading.tankId, 'density', e.target.value)}
                      min="0.7"
                      max="1.2"
                    />
                  </div>

                  {/* Calculated Metrics */}
                  {reading.volume > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                      <MetricItem label="Fuel Usage" value={metrics.usage.toFixed(2)} unit="L" />
                      <MetricItem label="Remaining" value={reading.volume.toFixed(2)} unit="L" />
                      <MetricItem label="Variance" value={metrics.variance.toFixed(2)} unit="L" />
                      <MetricItem 
                        label="Status" 
                        value={metrics.status} 
                        variant={metrics.usage >= 0 ? "success" : "warning"}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Progress Summary */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-purple-700">Progress</span>
              <span className="text-purple-600">
                {closingData.tankReadings.filter(r => r.dipValue > 0 && r.volume > 0).length}
                /{closingData.tankReadings.length} complete
              </span>
            </div>
            <Progress 
              value={(closingData.tankReadings.filter(r => r.dipValue > 0 && r.volume > 0).length / closingData.tankReadings.length) * 100} 
              color="purple"
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="secondary" 
              onClick={() => setActiveTab('pumps')}
              icon={ChevronLeft}
            >
              Back to Pumps
            </Button>
            <Button
              onClick={() => setActiveTab('collections')}
              icon={ChevronRight}
            >
              Continue to Collections
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // ============================================================================
  // COLLECTIONS TAB
  // ============================================================================

  const CollectionsTab = () => {
    if (!closingData) return null;

    /** Update island collection value */
    const updateIslandCollection = (islandId, field, value) => {
      setClosingData(prev => ({
        ...prev,
        islandCollections: prev.islandCollections.map(collection =>
          collection.islandId === islandId
            ? { ...collection, [field]: parseFloat(value) || 0 }
            : collection
        )
      }));
    };

    /** Update station collection value */
    const updateStationCollection = (field, value) => {
      setClosingData(prev => ({
        ...prev,
        stationCollection: {
          ...prev.stationCollection,
          [field]: parseFloat(value) || 0
        }
      }));
    };

    /** Calculate collection totals and variances */
    const calculateCollectionMetrics = (collection) => {
      const total = Object.keys(collection).reduce((sum, key) => {
        if (key.includes('Amount') && key !== 'expectedAmount') {
          return sum + (collection[key] || 0);
        }
        return sum;
      }, 0);

      const expected = calculations.expectedPumpSales / (closingData.islandCollections.length || 1); // Simple split
      const variance = total - expected;
      const variancePercentage = expected > 0 ? (variance / expected) * 100 : 0;

      return {
        total,
        expected,
        variance,
        variancePercentage,
        status: Math.abs(variancePercentage) < 5 ? 'Good' : 'Review Needed'
      };
    };

    return (
      <Card title="Shift Collections">
        <div className="space-y-6">
          <Alert variant="info">
            Record actual collections for each island and provide station-level summary. 
            Compare with expected sales to identify variances.
          </Alert>

          {/* Island Collections */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Island Collections</h3>
            
            {closingData.islandCollections.map((collection, index) => {
              const metrics = calculateCollectionMetrics(collection);

              return (
                <Card key={collection.islandId} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium">Island {index + 1}</h4>
                    <Badge variant={Math.abs(metrics.variancePercentage) < 5 ? "green" : "yellow"}>
                      Variance: {metrics.variancePercentage.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Input
                      label="Cash"
                      type="number"
                      value={collection.cashAmount}
                      onChange={e => updateIslandCollection(collection.islandId, 'cashAmount', e.target.value)}
                      min="0"
                    />
                    
                    <Input
                      label="Mobile Money"
                      type="number"
                      value={collection.mobileMoneyAmount}
                      onChange={e => updateIslandCollection(collection.islandId, 'mobileMoneyAmount', e.target.value)}
                      min="0"
                    />
                    
                    <Input
                      label="Visa"
                      type="number"
                      value={collection.visaAmount}
                      onChange={e => updateIslandCollection(collection.islandId, 'visaAmount', e.target.value)}
                      min="0"
                    />
                    
                    <Input
                      label="Mastercard"
                      type="number"
                      value={collection.mastercardAmount}
                      onChange={e => updateIslandCollection(collection.islandId, 'mastercardAmount', e.target.value)}
                      min="0"
                    />
                    
                    <Input
                      label="Debt"
                      type="number"
                      value={collection.debtAmount}
                      onChange={e => updateIslandCollection(collection.islandId, 'debtAmount', e.target.value)}
                      min="0"
                    />
                    
                    <Input
                      label="Other"
                      type="number"
                      value={collection.otherAmount}
                      onChange={e => updateIslandCollection(collection.islandId, 'otherAmount', e.target.value)}
                      min="0"
                    />
                  </div>

                  {/* Collection Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-3 bg-gray-50 rounded-lg">
                    <MetricItem label="Total" value={metrics.total.toFixed(2)} unit="$" />
                    <MetricItem label="Expected" value={metrics.expected.toFixed(2)} unit="$" />
                    <MetricItem 
                      label="Variance" 
                      value={metrics.variance.toFixed(2)} 
                      unit="$"
                      variant={metrics.variance >= 0 ? "success" : "warning"}
                    />
                    <MetricItem label="Status" value={metrics.status} />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Station Collection Summary */}
          <Card title="Station Collection Summary" className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <Input
                label="Total Cash"
                type="number"
                value={closingData.stationCollection.cashAmount}
                onChange={e => updateStationCollection('cashAmount', e.target.value)}
                min="0"
              />
              
              <Input
                label="Total Mobile Money"
                type="number"
                value={closingData.stationCollection.mobileMoneyAmount}
                onChange={e => updateStationCollection('mobileMoneyAmount', e.target.value)}
                min="0"
              />
              
              <Input
                label="Total Card Payments"
                type="number"
                value={closingData.stationCollection.visaAmount + closingData.stationCollection.mastercardAmount}
                disabled
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input
                label="Total Debt"
                type="number"
                value={closingData.stationCollection.debtAmount}
                onChange={e => updateStationCollection('debtAmount', e.target.value)}
                min="0"
              />
              
              <Input
                label="Total Other"
                type="number"
                value={closingData.stationCollection.otherAmount}
                onChange={e => updateStationCollection('otherAmount', e.target.value)}
                min="0"
              />
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600">Total Collected</div>
                <div className="text-lg font-bold text-blue-700">
                  ${Object.keys(closingData.stationCollection).reduce((total, key) => {
                    if (key.includes('Amount') && key !== 'expectedAmount') {
                      return total + (closingData.stationCollection[key] || 0);
                    }
                    return total;
                  }, 0).toFixed(2)}
                </div>
              </div>
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="secondary" 
              onClick={() => setActiveTab('tanks')}
              icon={ChevronLeft}
            >
              Back to Tanks
            </Button>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => setActiveTab('review')}
                icon={ChevronRight}
              >
                Skip to Review
              </Button>
              <Button
                onClick={() => setActiveTab('nonfuel')}
                icon={ChevronRight}
              >
                Continue to Non-Fuel
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // ============================================================================
  // NON-FUEL TAB (Simplified)
  // ============================================================================

  const NonFuelTab = () => {
    if (!closingData) return null;

    return (
      <Card title="Non-Fuel Sales & Expenses">
        <div className="space-y-6">
          <Alert variant="info">
            Record non-fuel sales and any shift expenses or adjustments.
          </Alert>

          {/* Non-Fuel Sales */}
          <Card title="Non-Fuel Sales" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Shop Sales"
                type="number"
                value={closingData.nonFuelSales?.shopSales || 0}
                onChange={e => setClosingData(prev => ({
                  ...prev,
                  nonFuelSales: { ...prev.nonFuelSales, shopSales: parseFloat(e.target.value) || 0 }
                }))}
                min="0"
              />
              
              <Input
                label="Car Wash"
                type="number"
                value={closingData.nonFuelSales?.carWash || 0}
                onChange={e => setClosingData(prev => ({
                  ...prev,
                  nonFuelSales: { ...prev.nonFuelSales, carWash: parseFloat(e.target.value) || 0 }
                }))}
                min="0"
              />
              
              <Input
                label="Other Services"
                type="number"
                value={closingData.nonFuelSales?.otherServices || 0}
                onChange={e => setClosingData(prev => ({
                  ...prev,
                  nonFuelSales: { ...prev.nonFuelSales, otherServices: parseFloat(e.target.value) || 0 }
                }))}
                min="0"
              />
            </div>
          </Card>

          {/* Expenses */}
          <Card title="Shift Expenses" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Cash Shortage"
                type="number"
                value={closingData.expenses?.cashShortage || 0}
                onChange={e => setClosingData(prev => ({
                  ...prev,
                  expenses: { ...prev.expenses, cashShortage: parseFloat(e.target.value) || 0 }
                }))}
                min="0"
              />
              
              <Input
                label="Other Expenses"
                type="number"
                value={closingData.expenses?.otherExpenses || 0}
                onChange={e => setClosingData(prev => ({
                  ...prev,
                  expenses: { ...prev.expenses, otherExpenses: parseFloat(e.target.value) || 0 }
                }))}
                min="0"
              />
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="secondary" 
              onClick={() => setActiveTab('collections')}
              icon={ChevronLeft}
            >
              Back to Collections
            </Button>
            <Button
              onClick={() => setActiveTab('review')}
              icon={ChevronRight}
            >
              Continue to Review
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // ============================================================================
  // REVIEW & CLOSE TAB
  // ============================================================================

  const ReviewTab = () => {
    const [closing, setClosing] = useState(false);

    /** Calculate final reconciliation */
    const calculateFinalReconciliation = () => {
      if (!closingData) return {};

      const totalPumpSales = closingData.pumpReadings.reduce((total, reading) => {
        const salesVolume = (reading.electricMeter || 0) - (reading.openingElectric || 0);
        return total + (salesVolume * (reading.unitPrice || 0));
      }, 0);

      const totalCollections = closingData.islandCollections.reduce((total, collection) => {
        return total + Object.keys(collection).reduce((sum, key) => {
          if (key.includes('Amount') && key !== 'expectedAmount') {
            return sum + (collection[key] || 0);
          }
          return sum;
        }, 0);
      }, 0);

      const totalTankUsage = closingData.tankReadings.reduce((total, reading) => {
        return total + ((reading.openingVolume || 0) - (reading.volume || 0));
      }, 0);

      return {
        totalPumpSales,
        totalCollections,
        totalTankUsage,
        cashVariance: totalCollections - totalPumpSales,
        fuelVariance: totalTankUsage - (totalPumpSales / 150) // Simple conversion
      };
    };

    /** Handle final shift closing */
    const handleCloseShift = async () => {
      setClosing(true);
      try {
        // Validate closing data
        const validation = shiftService.validateShiftClosing(closingData);
        if (!validation.isValid) {
          setErrors({ validation: validation.errors.join(', ') });
          return;
        }

        // Close the shift
        const result = await shiftService.closeShift(shift.id, closingData);
        
        // Success
        onShiftClosed(result);
        onClose();

      } catch (error) {
        console.error('Failed to close shift:', error);
        setErrors({ closing: error.message });
      } finally {
        setClosing(false);
      }
    };

    if (!closingData) return null;

    const reconciliation = calculateFinalReconciliation();

    return (
      <Card title="Review & Close Shift">
        <div className="space-y-6">
          {/* Final Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Financial Summary" className="p-4">
              <div className="space-y-3 text-sm">
                <InfoRow label="Total Pump Sales" value={`$${reconciliation.totalPumpSales.toFixed(2)}`} />
                <InfoRow label="Total Collections" value={`$${reconciliation.totalCollections.toFixed(2)}`} />
                <InfoRow 
                  label="Cash Variance" 
                  value={`$${reconciliation.cashVariance.toFixed(2)}`}
                  status={Math.abs(reconciliation.cashVariance) < (reconciliation.totalPumpSales * 0.05) ? 'complete' : 'incomplete'}
                />
                <InfoRow label="Variance Percentage" value={`${((reconciliation.cashVariance / reconciliation.totalPumpSales) * 100).toFixed(1)}%`} />
              </div>
            </Card>

            <Card title="Fuel Reconciliation" className="p-4">
              <div className="space-y-3 text-sm">
                <InfoRow label="Total Tank Usage" value={`${reconciliation.totalTankUsage.toFixed(2)}L`} />
                <InfoRow label="Expected Usage" value={`${(reconciliation.totalPumpSales / 150).toFixed(2)}L`} />
                <InfoRow 
                  label="Fuel Variance" 
                  value={`${reconciliation.fuelVariance.toFixed(2)}L`}
                  status={Math.abs(reconciliation.fuelVariance) < 100 ? 'complete' : 'incomplete'}
                />
                <InfoRow label="Reconciliation Status" value={Math.abs(reconciliation.fuelVariance) < 100 ? 'Good' : 'Review Needed'} />
              </div>
            </Card>
          </div>

          {/* Closing Notes */}
          <Card title="Closing Information" className="p-4">
            <div className="space-y-4">
              <Input
                label="Closing Notes"
                type="textarea"
                value={closingData.closingNotes}
                onChange={e => setClosingData(prev => ({ ...prev, closingNotes: e.target.value }))}
                placeholder="Any notes about the shift, issues encountered, or special circumstances..."
                rows={3}
              />
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={closingData.hasIssues}
                  onChange={e => setClosingData(prev => ({ ...prev, hasIssues: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label className="text-sm font-medium">Shift had issues that need attention</label>
              </div>

              {closingData.hasIssues && (
                <Input
                  label="Issue Description"
                  type="textarea"
                  value={closingData.issuesDescription}
                  onChange={e => setClosingData(prev => ({ ...prev, issuesDescription: e.target.value }))}
                  placeholder="Describe any issues encountered during the shift..."
                  rows={2}
                />
              )}
            </div>
          </Card>

          {/* Final Validation */}
          <Card title="Final Validation" className="p-4">
            <div className="space-y-2">
              <ValidationItem
                label="All pump readings completed"
                isValid={closingData.pumpReadings.every(r => r.electricMeter > 0 && r.cashMeter > 0)}
              />
              <ValidationItem
                label="All tank readings completed"
                isValid={closingData.tankReadings.every(r => r.dipValue > 0 && r.volume > 0)}
              />
              <ValidationItem
                label="Collections recorded"
                isValid={closingData.islandCollections.every(c => c.cashAmount >= 0)}
              />
              <ValidationItem
                label="Station collection summary provided"
                isValid={closingData.stationCollection.cashAmount >= 0}
              />
              <ValidationItem
                label="Cash variance within acceptable range"
                isValid={Math.abs(reconciliation.cashVariance) < (reconciliation.totalPumpSales * 0.05)} // 5% threshold
              />
            </div>
          </Card>

          {/* Error Display */}
          {errors.closing && (
            <Alert variant="error">
              {errors.closing}
            </Alert>
          )}

          {errors.validation && (
            <Alert variant="error">
              Validation failed: {errors.validation}
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="secondary" 
              onClick={() => setActiveTab('nonfuel')}
              icon={ChevronLeft}
            >
              Back to Non-Fuel
            </Button>
            <Button 
              onClick={handleCloseShift}
              loading={closing}
              disabled={closing}
              icon={Save}
              variant="danger"
            >
              Close Shift
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // ============================================================================
  // MAIN COMPONENT RENDER
  // ============================================================================

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={`Close Shift - ${shift?.shiftNumber}`}
      size="4xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Supervisor</div>
              <div className="font-medium">{shift?.supervisor?.firstName} {shift?.supervisor?.lastName}</div>
            </div>
            <div>
              <div className="text-gray-600">Start Time</div>
              <div className="font-medium">{new Date(shift?.startTime).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Duration</div>
              <div className="font-medium">
                {calculations.shiftDuration?.hours || 0}h {calculations.shiftDuration?.minutes || 0}m
              </div>
            </div>
            <div>
              <div className="text-gray-600">Status</div>
              <Badge variant="success">Open - Ready to Close</Badge>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading shift data...</p>
          </div>
        )}

        {/* Error State */}
        {errors.initialization && (
          <Alert variant="error">
            {errors.initialization}
          </Alert>
        )}

        {/* Tab Content */}
        {!loading && closingData && (
          <div className="min-h-96">
            {activeTab === 'validation' && <ValidationTab />}
            {activeTab === 'pumps' && <PumpReadingsTab />}
            {activeTab === 'tanks' && <TankDipsTab />}
            {activeTab === 'collections' && <CollectionsTab />}
            {activeTab === 'nonfuel' && <NonFuelTab />}
            {activeTab === 'review' && <ReviewTab />}
          </div>
        )}
      </div>
    </Modal>
  );
};

// ============================================================================
// SUPPORTING COMPONENTS
// ============================================================================

/** Validation item for checklists */
const ValidationItem = ({ label, isValid, message }) => (
  <div className="flex items-center">
    {isValid ? (
      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
    ) : (
      <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
    )}
    <span className={isValid ? "text-gray-700" : "text-gray-400"}>
      {label}
      {message && <span className="text-gray-500 text-sm ml-1">({message})</span>}
    </span>
  </div>
);

/** Metric item for displaying calculated values */
const MetricItem = ({ label, value, unit, variant = "normal" }) => {
  const variantClasses = {
    normal: "text-gray-700",
    success: "text-green-700",
    warning: "text-yellow-700",
    error: "text-red-700"
  };

  return (
    <div className="text-center">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`font-medium ${variantClasses[variant]}`}>
        {value} {unit && <span className="text-sm">{unit}</span>}
      </div>
    </div>
  );
};

/** Info row for display purposes */
const InfoRow = ({ label, value, status = 'normal' }) => {
  const statusIcon = {
    complete: <CheckCircle className="w-4 h-4 text-green-500" />,
    incomplete: <AlertCircle className="w-4 h-4 text-yellow-500" />,
    normal: null
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center space-x-2">
        <span className="font-medium">{value}</span>
        {statusIcon[status]}
      </div>
    </div>
  );
};

export default ShiftClosingFlow;