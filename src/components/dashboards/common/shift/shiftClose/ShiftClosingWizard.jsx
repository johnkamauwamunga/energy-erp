import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Alert,
  Steps,
  Space,
  Spin,
  Typography
} from 'antd';
import {
  CheckCircleOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  DollarCircleOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloseOutlined
} from '@ant-design/icons';

const { Title } = Typography;
const { Step } = Steps;

// Import steps
import PreClosingValidationStep from './PreClosingValidationStep';
import IslandPumpsStep from './IslandPumpsStep';
import TanksStep from './TanksStep';
import CollectionsStep from './CollectionsStep';
import DebtAllocationsStep from './DebtAllocationsStep';
import ClosingSummaryStep from './ClosingSummaryStep';

import { useApp } from '../../../../../context/AppContext';
import { useShiftAssets } from './hooks/useShiftAssets';

const ShiftClosingWizard = ({ shiftId, onSuccess, onCancel }) => {
  const { state } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debtAllocationComplete, setDebtAllocationComplete] = useState(false);

  const currentStation = state.currentStation?.id;
  const currentUser = state.currentUser;

  const {
    currentShift,
    pumpsWithIslandInfo,
    tanksWithReadings,
    expectedCollectionsByIsland,
    enhancedShiftOpeningCheck,
    loading: assetsLoading,
    error: assetsError,
    submitShiftClosing,
    getClosingPayloadSummary,
    validateShiftClosingPayload,
    buildShiftClosingPayload
  } = useShiftAssets(currentStation);

  // Initialize closing data
  const [closingData, setClosingData] = useState(() => ({
    shiftId: shiftId,
    recordedById: currentUser?.id,
    endTime: new Date().toISOString().slice(0, 16),
    pumpReadings: [],
    tankReadings: [],
    islandCollections: {},
    stationId: currentStation
  }));

  // Initialize with current shift data
  useEffect(() => {
    if (currentShift?.id && currentShift.meterReadings?.length > 0) {
      console.log("🔄 Initializing closing data with current shift");

      const openingPumpReadings = currentShift.meterReadings.map(reading => ({
        pumpId: reading.pumpId,
        openingElectric: reading.electricMeter,
        openingManual: reading.manualMeter,
        openingCash: reading.cashMeter,
        electricMeter: 0,
        manualMeter: 0,
        cashMeter: 0,
        litersDispensed: 0,
        salesValue: 0,
        unitPrice: 150.0
      }));

      const openingTankReadings = (currentShift.dipReadings || []).map(reading => ({
        tankId: reading.tankId,
        openingDip: reading.dipValue,
        openingVolume: reading.volume,
        dipValue: 0,
        volume: 0,
        temperature: 25.0,
        waterLevel: 0.0,
        density: 0.85
      }));

      setClosingData(prev => ({
        ...prev,
        pumpReadings: openingPumpReadings,
        tankReadings: openingTankReadings
      }));
    }
  }, [currentShift?.id]);

  // Calculate total collected debt
  const calculateTotalCollectedDebt = useCallback(() => {
    if (!closingData.islandCollections) return 0;
    return Object.values(closingData.islandCollections).reduce(
      (total, island) => total + (island.debtAmount || 0), 0
    );
  }, [closingData.islandCollections]);

  const totalCollectedDebt = calculateTotalCollectedDebt();
  const hasDebt = totalCollectedDebt > 0;
  const shouldShowDebtStep = hasDebt && !debtAllocationComplete;

  console.log("💰 Debt Calculation:", {
    totalCollectedDebt,
    hasDebt,
    debtAllocationComplete,
    shouldShowDebtStep
  });

  // Define steps - FIXED: Proper step calculation
  const steps = React.useMemo(() => {
    const baseSteps = [
      {
        title: 'Pre-Closing',
        icon: <FileTextOutlined />
      },
      {
        title: 'Island Pumps',
        icon: <ThunderboltOutlined />
      },
      {
        title: 'Tank Dips',
        icon: <DashboardOutlined />
      },
      {
        title: 'Collections',
        icon: <DollarCircleOutlined />
      }
    ];

    if (shouldShowDebtStep) {
      baseSteps.push({
        title: 'Debt Allocation',
        icon: <TeamOutlined />
      });
    }

    baseSteps.push({
      title: 'Review & Close',
      icon: <CheckCircleOutlined />
    });

    console.log("🎯 Steps calculated:", baseSteps.length, "steps, debt step:", shouldShowDebtStep);
    return baseSteps;
  }, [shouldShowDebtStep]);

  // Navigation handlers - FIXED: Better step logic
  const handleNext = useCallback(() => {
    setError(null);
    const totalSteps = steps.length;
    
    console.log("➡️ Moving next from step", currentStep, "to", currentStep + 1, "of", totalSteps);
    
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  const handleBack = useCallback(() => {
    console.log("⬅️ Moving back from step", currentStep, "to", currentStep - 1);
    
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Update closing data
  const updateClosingData = useCallback((updates) => {
    console.log('📝 Updating closing data:', updates);
    setClosingData(prev => ({ ...prev, ...updates }));
  }, []);

  // FIXED: Debt save complete handler - SIMPLIFIED VERSION
  const handleDebtSaveComplete = useCallback(() => {
    console.log("✅ Debt allocation completed, moving to summary step");
    setDebtAllocationComplete(true);
    
    // Simple approach: Always go to step 5 (summary) since that's the maximum
    // In your flow: 0=Pre, 1=Pumps, 2=Tanks, 3=Collections, 4=Debt, 5=Summary
    // setTimeout(() => {
    //   console.log("🎯 Moving to summary step (5)");
    //   setCurrentStep(5);
    // }, 100);
  }, []);

  const handleCloseShift = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Closing shift with data:', closingData);
      const result = await submitShiftClosing(closingData, currentUser);
      onSuccess?.(result);
    } catch (error) {
      console.error('❌ Failed to close shift:', error);
      setError(error.message || 'Failed to close shift');
    } finally {
      setIsLoading(false);
    }
  }, [closingData, currentUser, onSuccess, submitShiftClosing]);

  // Get payload for summary
  const { closingPayload, payloadSummary, validation } = React.useMemo(() => {
    const payload = buildShiftClosingPayload?.(closingData, currentUser);
    const summary = getClosingPayloadSummary?.(closingData, currentUser);
    const validationResult = validateShiftClosingPayload?.(payload) || { isValid: false, errors: [] };

    return {
      closingPayload: payload,
      payloadSummary: summary,
      validation: validationResult
    };
  }, [closingData, currentUser, buildShiftClosingPayload, getClosingPayloadSummary, validateShiftClosingPayload]);

  // FIXED: Step content rendering with proper step mapping
  const renderStepContent = React.useMemo(() => {
    if (assetsLoading) return <Spin size="large" />;

    console.log(`🎯 Rendering step ${currentStep} of ${steps.length} total steps`);

    // Define step mapping based on whether debt step is shown
    let stepComponent;
    
    if (shouldShowDebtStep) {
      // With debt step: 0=Pre, 1=Pumps, 2=Tanks, 3=Collections, 4=Debt, 5=Summary
      switch (currentStep) {
        case 0:
          stepComponent = (
            <PreClosingValidationStep 
              key="pre-closing"
              currentShift={currentShift}
              enhancedShiftOpeningCheck={enhancedShiftOpeningCheck}
              closingData={closingData}
            />
          );
          break;
        case 1:
          stepComponent = (
            <IslandPumpsStep 
              key="pumps"
              pumpsWithIslandInfo={pumpsWithIslandInfo}
              expectedCollectionsByIsland={expectedCollectionsByIsland}
              closingData={closingData}
              onChange={updateClosingData}
            />
          );
          break;
        case 2:
          stepComponent = (
            <TanksStep 
              key="tanks"
              tanksWithReadings={tanksWithReadings}
              closingData={closingData}
              onChange={updateClosingData}
            />
          );
          break;
        case 3:
          stepComponent = (
            <CollectionsStep 
              key="collections"
              closingData={closingData}
              onChange={updateClosingData}
            />
          );
          break;
        case 4:
          stepComponent = (
            <DebtAllocationsStep 
              key="debt"
              closingData={closingData}
              onSaveComplete={handleDebtSaveComplete}
            />
          );
          break;
        case 5:
          stepComponent = (
            <ClosingSummaryStep 
              key="summary"
              closingData={closingData}
              closingPayload={closingPayload}
              payloadSummary={payloadSummary}
              validation={validation}
            />
          );
          break;
        default:
          stepComponent = null;
      }
    } else {
      // Without debt step: 0=Pre, 1=Pumps, 2=Tanks, 3=Collections, 4=Summary
      switch (currentStep) {
        case 0:
          stepComponent = (
            <PreClosingValidationStep 
              key="pre-closing"
              currentShift={currentShift}
              enhancedShiftOpeningCheck={enhancedShiftOpeningCheck}
              closingData={closingData}
            />
          );
          break;
        case 1:
          stepComponent = (
            <IslandPumpsStep 
              key="pumps"
              pumpsWithIslandInfo={pumpsWithIslandInfo}
              expectedCollectionsByIsland={expectedCollectionsByIsland}
              closingData={closingData}
              onChange={updateClosingData}
            />
          );
          break;
        case 2:
          stepComponent = (
            <TanksStep 
              key="tanks"
              tanksWithReadings={tanksWithReadings}
              closingData={closingData}
              onChange={updateClosingData}
            />
          );
          break;
        case 3:
          stepComponent = (
            <CollectionsStep 
              key="collections"
              closingData={closingData}
              onChange={updateClosingData}
            />
          );
          break;
        case 4:
          stepComponent = (
            <ClosingSummaryStep 
              key="summary"
              closingData={closingData}
              closingPayload={closingPayload}
              payloadSummary={payloadSummary}
              validation={validation}
            />
          );
          break;
        default:
          stepComponent = (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Alert
                message="Invalid Step"
                description={`Step ${currentStep} is not available. Please go back.`}
                type="error"
                showIcon
              />
            </div>
          );
      }
    }

    console.log("✅ Rendered step component:", stepComponent ? stepComponent.key : 'null');
    return stepComponent;
  }, [
    assetsLoading,
    currentStep,
    steps.length,
    shouldShowDebtStep,
    currentShift,
    enhancedShiftOpeningCheck,
    closingData,
    pumpsWithIslandInfo,
    expectedCollectionsByIsland,
    tanksWithReadings,
    updateClosingData,
    handleDebtSaveComplete,
    closingPayload,
    payloadSummary,
    validation
  ]);

  // Loading state
  if (assetsLoading && !currentShift) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <Spin size="large" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Typography.Text type="secondary">Loading shift data...</Typography.Text>
        </div>
      </div>
    );
  }

  // Error state
  if (assetsError) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <Alert 
          message="Failed to load shift data" 
          description={assetsError}
          type="error" 
          showIcon 
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const isLastStep = currentStep === steps.length - 1;

  console.log("🧭 Navigation State:", {
    currentStep,
    totalSteps: steps.length,
    isLastStep,
    shouldShowDebtStep,
    debtAllocationComplete
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <Card 
        title={
          <Space>
            <CheckCircleOutlined />
            Close Shift #{currentShift?.shiftNumber || 'Loading...'}
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {/* Responsive Steps */}
        <div style={{ marginBottom: 32 }}>
          <Steps 
            current={currentStep} 
            responsive
            size="small"
          >
            {steps.map((step, index) => (
              <Step
                key={index}
                title={step.title}
                icon={step.icon}
              />
            ))}
          </Steps>
        </div>

        {error && (
          <Alert 
            message={error} 
            type="error" 
            showIcon 
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <div style={{ minHeight: 500 }}>
          {renderStepContent}
        </div>

        {/* Navigation Buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          paddingTop: 24, 
          borderTop: '1px solid #f0f0f0'
        }}>
          <div>
            {currentStep > 0 && (
              <Button 
                onClick={handleBack}
                icon={<ArrowLeftOutlined />}
                size="large"
              >
                Back
              </Button>
            )}
          </div>
          
          <Space>
            <Button 
              onClick={onCancel}
              icon={<CloseOutlined />}
              size="large"
            >
              Cancel
            </Button>
            
            {!isLastStep ? (
              <Button 
                type="primary"
                onClick={handleNext}
                icon={<ArrowRightOutlined />}
                size="large"
                disabled={currentStep === 4 && shouldShowDebtStep && !debtAllocationComplete}
              >
                {currentStep === 3 && !shouldShowDebtStep ? 'Review & Close' : 
                 currentStep === 4 && shouldShowDebtStep ? 'Complete Debt Allocation' : 
                 'Next'}
              </Button>
            ) : (
              <Button 
                type="primary"
                onClick={handleCloseShift}
                loading={isLoading}
                disabled={!validation.isValid}
                icon={<CheckCircleOutlined />}
                size="large"
              >
                Close Shift
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default ShiftClosingWizard;