import React, { useState, useEffect } from 'react';
import { Card, Button, Stepper, Alert, LoadingSpinner } from '../../../ui';
import { CheckCircle, Clock, Fuel, Package, ArrowLeft, ArrowRight, Truck } from 'lucide-react';

// Import steps
import PurchaseTankSelectionStep from './PurchaseTankSelectionStep';
import BeforeOffloadStep from './BeforeOffloadStep';
import AfterOffloadStep from './AfterOffloadStep';
import OffloadSummaryStep from './OffloadSummaryStep';

// Import dummy data
import { mockOffloadServices } from './dummyDataForOffload';
import { connectedAssetService } from '../../../../services/connectedAssetsService/connectedAssetsService';

const FuelOffloadWizard = ({ purchaseId, onSuccess, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [purchaseData, setPurchaseData] = useState(null);
  const [connectedAssets, setConnectedAssets] = useState(null);

  // Offload form data state
  const [offloadData, setOffloadData] = useState({
    purchaseId: purchaseId || '',
    tankOffloads: [],
    totalExpectedVolume: 0,
    totalActualVolume: 0,
    variance: 0
  });

  const steps = [
    { number: 1, title: 'Tank Selection', icon: Package },
    { number: 2, title: 'Before Offload', icon: Clock },
    { number: 3, title: 'After Offload', icon: CheckCircle },
    { number: 4, title: 'Summary', icon: Fuel }
  ];

  // Fetch data on component mount
  useEffect(() => {
    initializeData();
  }, [purchaseId]);

  const initializeData = async () => {
    setIsLoading(true);
    try {
      const stationId = 'bcbd0ff7-0d74-4b26-a419-c11ead677561';
      
      // Fetch connected assets
      const assets = await connectedAssetService.getStationAssetsSimplified(stationId);
      setConnectedAssets(assets);

      // Fetch purchase data
      const purchase = await mockOffloadServices.purchaseService.getPurchaseById(purchaseId);
      setPurchaseData(purchase);

      setOffloadData(prev => ({
        ...prev,
        purchaseId: purchaseId || 'purchase-123'
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
      console.log("hi johnyy tanks are ",offloadData)
      if (!hasTanks) {
        setError('Please select at least one tank for offloading');
        return;
      }
    }
    
    if (currentStep === 2) {
      const allTanksHaveReadings = offloadData.tankOffloads.every(tank => 
        tank.dipBefore && tank.pumpReadingsBefore?.length > 0
      );
      if (!allTanksHaveReadings) {
        setError('Please complete before offload readings for all selected tanks');
        return;
      }
    }
    
    if (currentStep === 3) {
      const allTanksComplete = offloadData.tankOffloads.every(tank => 
        tank.dipAfter && tank.pumpReadingsAfter?.length > 0 && tank.actualVolume > 0
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
    if (!purchaseData || !connectedAssets) {
      return (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    const stepProps = {
      purchaseData,
      offloadData,
      onChange: updateOffloadData,
      connectedAssets
    };

    switch (currentStep) {
      case 1:
        return <PurchaseTankSelectionStep {...stepProps} />;
      case 2:
        return <BeforeOffloadStep {...stepProps} />;
      case 3:
        return <AfterOffloadStep {...stepProps} />;
      case 4:
        return <OffloadSummaryStep {...stepProps} />;
      default:
        return null;
    }
  };

  // Step titles for mobile
  const getStepTitle = () => {
    return steps.find(step => step.number === currentStep)?.title || 'Fuel Offload';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              icon={ArrowLeft}
            />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{getStepTitle()}</h1>
              <p className="text-xs text-gray-500">Step {currentStep} of {steps.length}</p>
            </div>
          </div>
          {purchaseData && (
            <div className="text-right">
              <p className="text-sm font-medium text-blue-600">
                {purchaseData.items?.[0]?.orderedQty?.toLocaleString()}L
              </p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Fuel Offload</h1>
                <p className="text-sm text-gray-600">
                  Purchase: <span className="font-medium">{purchaseData?.purchaseNumber}</span>
                  {purchaseData?.supplier?.name && ` • ${purchaseData.supplier.name}`}
                </p>
              </div>
            </div>
            {purchaseData && (
              <div className="text-right">
                <p className="text-lg font-semibold text-blue-600">
                  {purchaseData.items?.[0]?.orderedQty?.toLocaleString()}L
                </p>
                <p className="text-sm text-gray-500">Total Quantity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        {/* Stepper - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block mb-6">
          <Card className="mb-6">
            <div className="p-4">
              <Stepper steps={steps} currentStep={currentStep} />
            </div>
          </Card>
        </div>

        {/* Mobile Step Indicator */}
        <div className="lg:hidden mb-4">
          <div className="flex justify-center space-x-1">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`w-2 h-2 rounded-full ${
                  step.number === currentStep
                    ? 'bg-blue-600'
                    : step.number < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error" className="mb-4 text-sm">
            {error}
          </Alert>
        )}

        {/* Step Content */}
        <Card className="mb-4">
          <div className="p-4 lg:p-6">
            {renderStepContent()}
          </div>
        </Card>

        {/* Navigation Buttons - Fixed to match the first version */}
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

        {/* Progress Info - Mobile */}
        <div className="lg:hidden mt-4 text-center">
          <p className="text-xs text-gray-500">
            Step {currentStep} of {steps.length} • {steps.find(s => s.number === currentStep)?.title}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FuelOffloadWizard;