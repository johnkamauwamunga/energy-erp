import React, { useState, useEffect } from 'react';
import { Card, Button, Stepper, Alert, LoadingSpinner } from '../../../../ui';
import { Calendar, Users, Zap, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { dummyData, mockServices, dummyDataHelpers } from './dummyData';
import ShiftBasicsStep from './ShiftBasicsStep';
import PersonnelStep from './PersonnelStep';
import AssetsConfigurationStep from './AssetsConfigurationStep';
import SummaryStep from './SummaryStep';
import {shiftService} from '../../../../../services/shiftService/shiftService'

const ShiftCreationWizard = ({ stationId, onSuccess, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdShiftId, setCreatedShiftId] = useState(null); // Add this state
  
  // Form data state
  const [shiftData, setShiftData] = useState({
    // Step 1: Basic Info
    stationId: stationId,
    shiftNumber: dummyDataHelpers.getNextShiftNumber().toString(),
    startTime: new Date().toISOString().slice(0, 16),
    priceListId: dummyData.station.activePriceList?.id || '',
    
    // Step 2: Personnel
    supervisorId: '',
    attendants: [],
    
    // Step 3: Islands & Pumps
    islandAssignments: [],
    pumpReadings: [],
    tankReadings: []
  });

  const steps = [
    { number: 1, title: 'Shift Basics', icon: Calendar },
    { number: 2, title: 'Assign Personnel', icon: Users },
    { number: 3, title: 'Configure Assets', icon: Zap },
    { number: 4, title: 'Review & Create', icon: CheckCircle }
  ];

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, [stationId]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // Use mock service to simulate API call
      const stationDetails = await mockServices.stationService.getStation(stationId);
      
      // Set default price list if available
      if (stationDetails.activePriceList) {
        setShiftData(prev => ({
          ...prev,
          priceListId: stationDetails.activePriceList.id
        }));
      }
    } catch (error) {
      setError('Failed to load initial data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setError(null);
    
    // Validate current step before proceeding
    if (currentStep === 1 && !createdShiftId) { // Check if shift is created
      setError('Please create the shift first before proceeding');
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const updateShiftData = (updates) => {
    setShiftData(prev => ({ ...prev, ...updates }));
  };

  // Handle shift creation from Step 1
  const handleShiftCreated = (shiftId, shiftResult) => {
    console.log('🎯 Shift created in wizard:', shiftId);
    setCreatedShiftId(shiftId);
    
    // Store in localStorage for persistence
    localStorage.setItem('currentShiftId', shiftId);
    localStorage.setItem('currentShiftNumber', shiftData.shiftNumber);
    localStorage.setItem('currentShiftStartTime', shiftData.startTime);
  };

  const handleCreateShift = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Create basic shift using mock service
      const currentShift=localStorage.getItem("currentShiftId");

      const createPayload = {
        stationId: shiftData.stationId,
        supervisorId: shiftData.supervisorId,
        shiftNumber: parseInt(shiftData.shiftNumber),
        startTime: new Date(shiftData.startTime).toISOString(),
        priceListId: shiftData.priceListId || undefined
      };

      const shiftResult = await mockServices.shiftService.createShift(createPayload);
      const newShiftId = shiftResult.data.shift.id;

      // Step 2: Open shift with readings and assignments
      const openPayload = {
        shiftId: currentShift,
        recordedById: shiftData.supervisorId,
        islandAssignments: shiftData.islandAssignments,
        pumpReadings: shiftData.pumpReadings,
        tankReadings: shiftData.tankReadings
      };

      // await mockServices.shiftService.openShift(openPayload);
      
      await shiftService.openShift(openPayload);

      onSuccess?.(newShiftId);
     
      clearCache();
    
    } catch (error) {
      setError(error.message || 'Failed to create shift');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = () => {
    // Clear localStorage after successful creation
    setTimeout(() => {
      localStorage.removeItem('currentShiftId');
      localStorage.removeItem('currentShiftAttendants');
      localStorage.removeItem('currentShiftNumber');
      localStorage.removeItem('currentShiftStartTime');
      localStorage.removeItem('currentShiftStation');
      localStorage.removeItem('shiftConfigurationData');
    }, 2000);

    console.log(`storage cleaned`);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ShiftBasicsStep 
            data={shiftData}
            onChange={updateShiftData}
            onShiftCreated={handleShiftCreated} // Pass the callback
          />
        );
      case 2:
        return (
          <PersonnelStep 
            data={shiftData}
            onChange={updateShiftData}
            stationId={stationId}
            shiftId={createdShiftId} // Pass the shift ID to personnel step
          />
        );
      case 3:
        return (
          <AssetsConfigurationStep 
            data={shiftData}
            onChange={updateShiftData}
            stationId={stationId}
            shiftId={createdShiftId} // Also pass to assets step
          />
        );
      case 4:
        return (
          <SummaryStep 
            data={shiftData}
            shiftId={createdShiftId} // And to summary step
          />
        );
      default:
        return null;
    }
  };

  if (isLoading && currentStep === 1) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card title="Create New Shift" className="mb-6">
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

        {/* Shift ID Display */}
        {createdShiftId && (
          <Alert variant="info" className="mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Shift Created: </span>
              <code className="text-xs bg-blue-100 px-2 py-1 rounded">
                {createdShiftId}
              </code>
            </div>
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
                disabled={currentStep === 1 && !createdShiftId} // Disable if shift not created
                icon={ArrowRight}
              >
                Next
              </Button>
            ) : (
              <Button 
                variant="cosmic" 
                onClick={handleCreateShift}
                loading={isLoading}
                icon={CheckCircle}
              >
                Create Shift
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ShiftCreationWizard;