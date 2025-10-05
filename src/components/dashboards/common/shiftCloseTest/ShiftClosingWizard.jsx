import React, { useState, useEffect } from 'react';
import { Card, Button, Stepper, Alert, LoadingSpinner } from '../../../ui';
import { CheckCircle, Clock, DollarSign, Package, Zap, Fuel, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
// Import from the corrected file
import { 
  dummyData, 
  mockServices, 
  dummyDataHelpers,
  closingCalculations,
  shiftOpening 
} from './dummyDataForClosing';

import PreClosingValidationStep from './PreClosingValidationStep';
import IslandPumpsStep from './IslandPumpsStep';
import TanksStep from './TanksStep';
import CollectionsStep from './CollectionsStep';
import ClosingSummaryStep from './ClosingSummaryStep';

const ShiftClosingWizard = ({ shiftId, onSuccess, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shiftData, setShiftData] = useState(null);
  
  // Closing form data state
  const [closingData, setClosingData] = useState({
    shiftId: shiftId,
    recordedById: '', // Will be set from user context
    endTime: new Date().toISOString().slice(0, 16),
    
    // Step 2: Island Pumps - END readings
    pumpReadings: [],
    
    // Step 3: Tanks - END dip readings  
    tankReadings: [],
    
    // Step 4: Collections
    islandCollections: [],
    
    // Step 5: Non-fuel (conditional)
    nonFuelStocks: []
  });

  const steps = [
    { number: 1, title: 'Pre-Closing Check', icon: FileText },
    { number: 2, title: 'Island Pumps', icon: Zap },
    { number: 3, title: 'Tank Dips', icon: Fuel },
    { number: 4, title: 'Collections', icon: DollarSign },
    { number: 5, title: 'Review & Close', icon: CheckCircle }
  ];

  // Fetch shift data and opening readings
  useEffect(() => {
    fetchShiftData();
  }, [shiftId]);

  const fetchShiftData = async () => {
    setIsLoading(true);
    try {
      // Get shift details with opening readings
      const shiftDetails = await mockServices.shiftService.getShiftDetails(shiftId);
      setShiftData(shiftDetails);
      
      // Pre-populate with opening data for calculations
      const openingPumpReadings = shiftDetails.meterReadings || [];
      const openingTankReadings = shiftDetails.dipReadings || [];
      const islandAssignments = shiftDetails.shiftIslandAttedant || [];
      
      // Initialize closing data structure
      setClosingData(prev => ({
        ...prev,
        // Pre-populate pump readings with opening data for reference
        pumpReadings: openingPumpReadings.map(reading => ({
          pumpId: reading.pumpId,
          openingElectric: reading.electricMeter,
          openingManual: reading.manualMeter,
          openingCash: reading.cashMeter,
          electricMeter: 0,
          manualMeter: 0,
          cashMeter: 0,
          litersDispensed: 0,
          salesValue: 0,
          unitPrice: 150.0 // Default diesel price
        })),
        // Pre-populate tank readings
        tankReadings: openingTankReadings.map(reading => ({
          tankId: reading.tankId,
          openingDip: reading.dipValue,
          openingVolume: reading.volume,
          dipValue: 0,
          volume: 0,
          temperature: 25.0,
          waterLevel: 0.0,
          density: 0.85
        })),
        // Pre-populate island collections
        islandCollections: islandAssignments.map(assignment => ({
          islandId: assignment.islandId,
          cashAmount: 0,
          mobileMoneyAmount: 0,
          visaAmount: 0,
          mastercardAmount: 0,
          debtAmount: 0,
          otherAmount: 0,
          expectedAmount: 0 // Will be calculated from pump sales
        }))
      }));

    } catch (error) {
      setError('Failed to load shift data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setError(null);
    
    // Validate current step before proceeding
    if (currentStep === 2) {
      const hasPumpReadings = closingData.pumpReadings.some(reading => 
        reading.electricMeter > 0 || reading.manualMeter > 0
      );
      if (!hasPumpReadings) {
        setError('Please enter meter readings for at least one pump');
        return;
      }
    }
    
    if (currentStep === 3) {
      const hasTankReadings = closingData.tankReadings.some(reading => 
        reading.dipValue > 0
      );
      if (!hasTankReadings) {
        setError('Please enter dip readings for at least one tank');
        return;
      }
    }
    
    if (currentStep === 4) {
      const hasCollections = closingData.islandCollections.some(collection => 
        collection.cashAmount > 0 || collection.mobileMoneyAmount > 0
      );
      if (!hasCollections) {
        setError('Please enter collection amounts for at least one island');
        return;
      }
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const updateClosingData = (updates) => {
    setClosingData(prev => ({ ...prev, ...updates }));
  };

  const handleCloseShift = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare payload for closing
      const closePayload = {
        shiftId: closingData.shiftId,
        recordedById: 'current-user-id', // From auth context
        endTime: new Date(closingData.endTime).toISOString(),
        pumpReadings: closingData.pumpReadings.map(reading => ({
          pumpId: reading.pumpId,
          electricMeter: reading.electricMeter,
          manualMeter: reading.manualMeter,
          cashMeter: reading.cashMeter,
          litersDispensed: reading.litersDispensed,
          salesValue: reading.salesValue,
          unitPrice: reading.unitPrice
        })),
        tankReadings: closingData.tankReadings.map(reading => ({
          tankId: reading.tankId,
          dipValue: reading.dipValue,
          volume: reading.volume,
          temperature: reading.temperature,
          waterLevel: reading.waterLevel,
          density: reading.density
        })),
        islandCollections: closingData.islandCollections.map(collection => ({
          islandId: collection.islandId,
          cashAmount: collection.cashAmount,
          mobileMoneyAmount: collection.mobileMoneyAmount,
          visaAmount: collection.visaAmount,
          mastercardAmount: collection.mastercardAmount,
          debtAmount: collection.debtAmount,
          otherAmount: collection.otherAmount
        })),
        nonFuelStocks: closingData.nonFuelStocks
      };

      const result = await mockServices.shiftService.closeShift(closePayload);
      onSuccess?.(result);

    } catch (error) {
      setError(error.message || 'Failed to close shift');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    if (!shiftData) return <LoadingSpinner />;

    switch (currentStep) {
      case 1:
        return (
          <PreClosingValidationStep 
            shiftData={shiftData}
            closingData={closingData}
          />
        );
      case 2:
        return (
          <IslandPumpsStep 
            shiftData={shiftData}
            closingData={closingData}
            onChange={updateClosingData}
          />
        );
      case 3:
        return (
          <TanksStep 
            shiftData={shiftData}
            closingData={closingData}
            onChange={updateClosingData}
          />
        );
      case 4:
        return (
          <CollectionsStep 
            shiftData={shiftData}
            closingData={closingData}
            onChange={updateClosingData}
          />
        );
      case 5:
        return (
          <ClosingSummaryStep 
            shiftData={shiftData}
            closingData={closingData}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading && !shiftData) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card title={`Close Shift #${shiftData?.shiftNumber}`} className="mb-6">
        {/* Stepper */}
        <div className="mb-8">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Step Content */}
        <div className="min-h-[500px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <div>
            {currentStep > 1 && (
              <Button 
                variant="secondary" 
                onClick={handleBack}
                icon={ArrowLeft}
              >
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            
            {currentStep < steps.length ? (
              <Button 
                variant="cosmic" 
                onClick={handleNext}
                icon={ArrowRight}
              >
                Next
              </Button>
            ) : (
              <Button 
                variant="cosmic" 
                onClick={handleCloseShift}
                loading={isLoading}
                icon={CheckCircle}
              >
                Close Shift
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ShiftClosingWizard;