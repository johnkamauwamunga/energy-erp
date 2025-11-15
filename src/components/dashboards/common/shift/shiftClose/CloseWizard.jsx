// components/ShiftManagement/shiftClose/CloseWizard.jsx
import React, { useState } from 'react';
import ReadingsStep from './ReadingsStep';
import IslandSalesStep from './IslandSalesStep';

const CloseWizard = ({ 
  onClose, 
  onSuccess, 
  shift, 
  stationId, 
  currentUser 
}) => {
  const [currentStep, setCurrentStep] = useState('readings');
  const [readingsData, setReadingsData] = useState(null);
  const [islandSalesData, setIslandSalesData] = useState(null);

  // Handle proceeding from readings to island sales
  const handleProceedToIslandSales = (data) => {
    console.log('📥 Moving to Island Sales with data:', data);
    setReadingsData(data);
    setCurrentStep('islandSales');
  };

  // Handle final shift closing from island sales
  const handleFinalClose = (finalData) => {
    console.log('✅ Final closing data:', finalData);
    
    // Combine readings and island sales data for the final close
    const closePayload = {
      readings: readingsData,
      islandSales: finalData || islandSalesData,
      closedAt: new Date().toISOString(),
      shiftId: shift?.id,
      stationId: stationId
    };
    
    onSuccess?.(closePayload);
  };

  // Handle going back
  const handleBack = () => {
    if (currentStep === 'islandSales') {
      setCurrentStep('readings');
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 'readings':
        return (
          <ReadingsStep
            stationId={stationId}
            shiftInfo={shift}
            onProceedToIslandSales={handleProceedToIslandSales}
            onClose={onClose}
          />
        );
      case 'islandSales':
        return (
          <IslandSalesStep
            stationId={stationId}
            readingsData={readingsData}
            shiftInfo={shift}
            onUpdateIslandSales={setIslandSalesData}
            onBack={handleBack}
            onCloseShift={handleFinalClose} // Direct close from island sales
            onClose={onClose}
          />
        );
      default:
        return <ReadingsStep />;
    }
  };

  // Step indicator - only 2 steps now
  const steps = [
    { key: 'readings', title: 'Readings', description: 'Collect pump & tank readings' },
    { key: 'islandSales', title: 'Island Sales', description: 'Review island sales and close shift' }
  ];

  return (
    <div>
      {/* Step Progress Indicator */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fafafa', 
        borderBottom: '1px solid #e8e8e8' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          maxWidth: '600px', 
          margin: '0 auto',
          gap: '100px' // Add space between the two steps
        }}>
          {steps.map((step, index) => {
            const isActive = step.key === currentStep;
            const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
            
            return (
              <div key={step.key} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                minWidth: '150px'
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? '#52c41a' : isActive ? '#1890ff' : '#d9d9d9',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div style={{ 
                  fontWeight: isActive ? 'bold' : 'normal',
                  color: isActive ? '#1890ff' : isCompleted ? '#52c41a' : '#666',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  {step.title}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#999', 
                  textAlign: 'center',
                  marginTop: '4px'
                }}>
                  {step.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Content */}
      {renderStep()}
    </div>
  );
};

export default CloseWizard;