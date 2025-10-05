import React, { useState, useEffect } from 'react';
import { Card, Button, Stepper, Alert, LoadingSpinner } from '../../../ui';
import { CheckCircle, Clock, Fuel, Zap, Package, ArrowLeft, ArrowRight, Truck, Calculator } from 'lucide-react';

// Import steps
import PurchaseTankSelectionStep from './PurchaseTankSelectionStep';
import BeforeOffloadStep from './BeforeOffloadStep';
import AfterOffloadStep from './AfterOffloadStep';
import OffloadSummaryStep from './OffloadSummaryStep';

// Import dummy data
import { 
  dummyData, 
  initialOffloadData, 
  sampleTankOffloads,
  mockOffloadServices 
} from './dummyDataForOffload';

const FuelOffloadWizard = ({ purchaseId, onSuccess, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [purchaseData, setPurchaseData] = useState(null);
  
  // Offload form data state
  const [offloadData, setOffloadData] = useState(initialOffloadData);

  const steps = [
    { number: 1, title: 'Purchase & Tanks', icon: Package },
    { number: 2, title: 'Before Offload', icon: Clock },
    { number: 3, title: 'After Offload', icon: CheckCircle },
    { number: 4, title: 'Summary', icon: Fuel }
  ];

  // Initialize with dummy data
  useEffect(() => {
    initializeData();
  }, [purchaseId]);

  const initializeData = async () => {
    setIsLoading(true);
    try {
      const purchase = await mockOffloadServices.purchaseService.getPurchaseById(purchaseId);
      setPurchaseData(purchase);
      
      setOffloadData(prev => ({
        ...prev,
        purchaseId: purchaseId || 'purchase-123',
        tankOffloads: sampleTankOffloads
      }));

    } catch (error) {
      setError('Failed to initialize data');
      console.error('Error initializing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setError(null);
    
    // Validate current step
    if (currentStep === 1) {
      const hasTanks = offloadData.tankOffloads.length > 0;
      if (!hasTanks) {
        setError('Please select at least one tank for offloading');
        return;
      }
    }
    
    if (currentStep === 2) {
      const allTanksHaveReadings = offloadData.tankOffloads.every(tank => 
        tank.dipBefore && tank.pumpReadingsBefore.length > 0
      );
      if (!allTanksHaveReadings) {
        setError('Please complete before offload readings for all selected tanks');
        return;
      }
    }
    
    if (currentStep === 3) {
      const allTanksComplete = offloadData.tankOffloads.every(tank => 
        tank.dipAfter && tank.pumpReadingsAfter.length > 0 && tank.actualVolume > 0
      );
      if (!allTanksComplete) {
        setError('Please complete after offload readings for all tanks');
        return;
      }
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const updateOffloadData = (updates) => {
    setOffloadData(prev => ({ ...prev, ...updates }));
  };

  const handleCompleteOffload = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const totalActualVolume = offloadData.tankOffloads.reduce((sum, tank) => 
        sum + (tank.actualVolume || 0), 0
      );
      
      const finalData = {
        ...offloadData,
        totalActualVolume,
        variance: totalActualVolume - offloadData.totalExpectedVolume
      };

      console.log('Offload completed:', finalData);
      onSuccess?.(finalData);

    } catch (error) {
      setError(error.message || 'Failed to complete offload');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    if (!purchaseData) return <LoadingSpinner />;

    switch (currentStep) {
      case 1:
        return (
          <PurchaseTankSelectionStep 
            purchaseData={purchaseData}
            offloadData={offloadData}
            onChange={updateOffloadData}
          />
        );
      case 2:
        return (
          <BeforeOffloadStep 
            purchaseData={purchaseData}
            offloadData={offloadData}
            onChange={updateOffloadData}
          />
        );
      case 3:
        return (
          <AfterOffloadStep 
            purchaseData={purchaseData}
            offloadData={offloadData}
            onChange={updateOffloadData}
          />
        );
      case 4:
        return (
          <OffloadSummaryStep 
            purchaseData={purchaseData}
            offloadData={offloadData}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading && !purchaseData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Truck className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Fuel Offload</h1>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 mb-1">
              Purchase: <span className="font-semibold text-gray-900">{purchaseData?.purchaseNumber}</span>
            </p>
            <p className="text-sm text-gray-500">
              Supplier: {purchaseData?.supplier.name} • Product: {purchaseData?.items[0]?.product.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-blue-600">
              {purchaseData?.items[0]?.orderedQty.toLocaleString()}L
            </p>
            <p className="text-sm text-gray-500">Total Quantity</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <Card className="mb-8">
        <div className="p-6">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Step Content */}
      <div className="mb-6">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <Card>
        <div className="p-6 border-t">
          <div className="flex justify-between items-center">
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
                  onClick={handleCompleteOffload}
                  loading={isLoading}
                  icon={CheckCircle}
                >
                  Complete Offload
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FuelOffloadWizard;