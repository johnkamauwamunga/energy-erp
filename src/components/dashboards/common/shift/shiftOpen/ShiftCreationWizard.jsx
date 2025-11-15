import React, { useState, useEffect, useCallback } from 'react';
import { Card, Steps, Button, Space, Alert, Row, Col, Typography, notification } from 'antd';
import { ArrowLeft, ArrowRight, CheckCircle, Users, Gauge, FileText, Play } from 'lucide-react';
import PersonnelStep from './PersonnelStep';
import ReadingsStep from './ReadingsStep';
import SummaryStep from './SummaryStep';
import { useShift } from '../../../../../hooks/useShift';

const { Step } = Steps;
const { Title } = Typography;

const ShiftCreationWizard = ({ stationId, onSuccess, onCancel }) => {
  const { 
    loading, 
    error, 
    createShift, 
    openShift,
    clearError,
    checkActiveShift
  } = useShift(stationId);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardLoading, setWizardLoading] = useState(false);

  // CENTRALIZED STATE - All data lives here
  const [wizardData, setWizardData] = useState({
    // Step 1: Personnel & Basic Info
    personnel: {
      supervisorId: null,
      attendants: [],
      islandAssignments: [],
      topologyIslands: []
    },
    
    // Step 2: Readings
    readings: {
      pumpReadings: [],
      tankReadings: [],
      allPumps: [],
      allTanks: []
    },
    
    // Shared/System Data
    shiftInfo: {
      shiftId: null,
      stationId: stationId,
      shiftNumber: null,
      status: 'PENDING'
    }
  });

  // Unified update function
  const updateWizardData = useCallback((updates) => {
    setWizardData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Step-specific update functions
  const updatePersonnel = useCallback((personnelUpdates) => {
    updateWizardData({
      personnel: { ...wizardData.personnel, ...personnelUpdates }
    });
  }, [wizardData.personnel, updateWizardData]);

  const updateReadings = useCallback((readingsUpdates) => {
    updateWizardData({
      readings: { ...wizardData.readings, ...readingsUpdates }
    });
  }, [wizardData.readings, updateWizardData]);

  const updateShiftInfo = useCallback((infoUpdates) => {
    updateWizardData({
      shiftInfo: { ...wizardData.shiftInfo, ...infoUpdates }
    });
  }, [wizardData.shiftInfo, updateWizardData]);

  // ✅ FIXED: Handle shift creation - accept payload from child
  const handleCreateShift = useCallback(async (shiftPayload) => {
    try {
      console.log("📥 Parent received shift payload:", shiftPayload);

      // Use the payload from the child component
      const result = await createShift(shiftPayload);

      console.log("Shift create result:", result);
      
      if (result?.id) {
        updateShiftInfo({
          shiftId: result.id,
          shiftNumber: result.shiftNumber,
          status: result.status
        });

        // ✅ IMPORTANT: Also update the supervisor in personnel data
        updatePersonnel({
          supervisorId: shiftPayload.supervisorId
        });
        
        notification.success({
          message: 'Shift Created',
          description: `Shift ${result.data.shift.shiftNumber} created successfully`
        });
      }
    } catch (err) {
      console.error('Failed to create shift:', err);
    }
  }, [createShift, updateShiftInfo, updatePersonnel]);

  // Handle final shift opening
// In your ShiftCreationWizard component, update the handleOpenShift function:

const handleOpenShift = useCallback(async () => {
  try {
    console.log('🚀 Opening shift with centralized data:', wizardData);

    // Validate all required data
    if (!isShiftDataComplete(wizardData)) {
      throw new Error('Please complete all steps before starting shift');
    }

    // Harmonize all data into the final payload
    const openShiftPayload = {
      shiftId: wizardData.shiftInfo.shiftId,
      recordedById: wizardData.personnel.supervisorId,
      
      // Personnel data
      islandAssignments: wizardData.personnel.islandAssignments.map(assignment => ({
        attendantId: assignment.attendantId,
        islandId: assignment.islandId,
        assignmentType: assignment.assignmentType || 'PRIMARY'
      })),
      
      // Pump readings data
      pumpReadings: wizardData.readings.pumpReadings.map(reading => ({
        pumpId: reading.pumpId,
        electricMeter: parseFloat(reading.electricMeter) || 0,
        manualMeter: parseFloat(reading.manualMeter) || 0,
        cashMeter: parseFloat(reading.cashMeter) || 0,
        unitPrice: parseFloat(reading.unitPrice) || 0,
        readingType: 'OPENING',
        source: reading.source || 'MANUAL_ENTRY'
      })),
      
      // Tank readings data
      tankReadings: wizardData.readings.tankReadings.map(reading => ({
        tankId: reading.tankId,
        volume: parseFloat(reading.volume) || 0,
        temperature: parseFloat(reading.temperature) || 25,
        waterLevel: parseFloat(reading.waterLevel) || 0,
        dipValue: parseFloat(reading.dipValue) || 0,
        readingType: 'OPENING',
        source: reading.source || 'MANUAL_ENTRY'
      }))
    };

    console.log('📤 Final harmonized payload for shift opening:', openShiftPayload);

    const result = await openShift(openShiftPayload);
    
    notification.success({
      message: 'Shift Started',
      description: `Shift ${wizardData.shiftInfo.shiftNumber} opened successfully`
    });

    onSuccess?.(result);
    
  } catch (error) {
    console.error('❌ Failed to open shift:', error);
    notification.error({
      message: 'Failed to Start Shift',
      description: error.message
    });
  }
}, [wizardData, openShift, onSuccess]);

  // Validation helper
  const isShiftDataComplete = useCallback((data) => {
    return (
      data.shiftInfo.shiftId &&
      data.personnel.supervisorId &&
      data.personnel.attendants.length > 0 &&
      data.personnel.islandAssignments.length > 0 &&
      data.readings.pumpReadings.length > 0 &&
      data.readings.tankReadings.length > 0
    );
  }, []);

  // Check if we can proceed to next step
  const canProceedToNextStep = useCallback(() => {
    switch (currentStep) {
      case 0: // Personnel step
        return !!wizardData.shiftInfo.shiftId && 
               wizardData.personnel.islandAssignments.length > 0 && 
               wizardData.personnel.attendants.length > 0;

      case 1: // Readings step
        const allPumpsHaveReadings = wizardData.readings.allPumps?.length === wizardData.readings.pumpReadings?.length;
        const allTanksHaveReadings = wizardData.readings.allTanks?.length === wizardData.readings.tankReadings?.length;
        return allPumpsHaveReadings && allTanksHaveReadings;

      default:
        return true;
    }
  }, [currentStep, wizardData]);

  // Auto-check for existing open shift
  useEffect(() => {
    const initialize = async () => {
      if (stationId) {
        setWizardLoading(true);
        try {
          console.log('🔍 Wizard: Checking for existing open shift...');
          const activeShift = await checkActiveShift();
          
          if (activeShift) {
            // Pre-populate with existing shift data
            updateShiftInfo({
              shiftId: activeShift.id,
              shiftNumber: activeShift.shiftNumber,
              status: activeShift.status
            });
            
            if (activeShift.supervisor) {
              updatePersonnel({
                supervisorId: activeShift.supervisor.id
              });
            }
            
            if (activeShift.shiftIslandAttendant?.length > 0) {
              const existingAssignments = activeShift.shiftIslandAttendant.map(assignment => ({
                attendantId: assignment.attendantId,
                islandId: assignment.islandId,
                assignmentType: assignment.assignmentType || 'PRIMARY'
              }));
              
              updatePersonnel({
                islandAssignments: existingAssignments
              });
            }
          }
        } catch (err) {
          console.error('Wizard initialization error:', err);
        } finally {
          setWizardLoading(false);
        }
      }
    };
    
    initialize();
  }, [stationId, checkActiveShift, updateShiftInfo, updatePersonnel]);

  const steps = [
    {
      title: 'Personnel',
      icon: <Users size={16} />,
      description: 'Assign supervisor & attendants',
      content: (
        <PersonnelStep 
          stationId={stationId}
          personnelData={wizardData.personnel}
          shiftInfo={wizardData.shiftInfo}
          loading={loading || wizardLoading}
          error={error}
          onCreateShift={handleCreateShift}
          onUpdatePersonnel={updatePersonnel}
          onUpdateShiftInfo={updateShiftInfo}
          onClearError={clearError}
          onCheckActiveShift={checkActiveShift}
        />
      )
    },
    {
      title: 'Readings',
      icon: <Gauge size={16} />,
      description: 'Record opening readings',
      content: (
        <ReadingsStep 
          stationId={stationId}
          readingsData={wizardData.readings}
          shiftInfo={wizardData.shiftInfo}
          onUpdateReadings={updateReadings}
        />
      )
    },
    {
      title: 'Summary',
      icon: <FileText size={16} />,
      description: 'Review & start shift',
      content: (
        <SummaryStep 
          wizardData={wizardData}
          onOpenShift={handleOpenShift}
          onPrevStep={() => prev()}
          loading={loading}
          canOpenShift={isShiftDataComplete(wizardData)}
        />
      )
    }
  ];

  const next = () => {
    clearError();
    
    if (!canProceedToNextStep()) {
      console.log('❌ Cannot proceed to next step - validation failed');
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const prev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleCancel = () => {
    setWizardData({
      personnel: { supervisorId: null, attendants: [], islandAssignments: [], topologyIslands: [] },
      readings: { pumpReadings: [], tankReadings: [], allPumps: [], allTanks: [] },
      shiftInfo: { shiftId: null, stationId: stationId, shiftNumber: null, status: 'PENDING' }
    });
    onCancel?.();
  };

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return 'finish';
    if (stepIndex === currentStep) return 'process';
    return 'wait';
  };

  return (
    <Card 
      title={
        <Space>
          <Play size={20} />
          <Title level={4} style={{ margin: 0 }}>Shift Creation Wizard</Title>
        </Space>
      } 
      style={{ maxWidth: 1200, margin: '0 auto', minHeight: 600 }}
      extra={
        wizardData.shiftInfo.shiftId && (
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>Shift:</span>
            <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 3 }}>
              {wizardData.shiftInfo.shiftNumber || wizardData.shiftInfo.shiftId}
            </code>
            <span style={{ 
              fontSize: 11, 
              padding: '2px 8px', 
              borderRadius: 10, 
              backgroundColor: wizardData.shiftInfo.status === 'OPEN' ? '#f6ffed' : '#fff7e6',
              color: wizardData.shiftInfo.status === 'OPEN' ? '#52c41a' : '#fa8c16',
              border: `1px solid ${wizardData.shiftInfo.status === 'OPEN' ? '#b7eb8f' : '#ffd591'}`
            }}>
              {wizardData.shiftInfo.status}
            </span>
          </Space>
        )
      }
    >
      {error && (
        <Alert 
          message={error} 
          type="error" 
          showIcon 
          style={{ marginBottom: 16 }}
          closable
          onClose={clearError}
        />
      )}

      {/* Progress Steps */}
      <Steps 
        current={currentStep} 
        style={{ marginBottom: 32 }}
        status={error ? 'error' : 'process'}
      >
        {steps.map((item, index) => (
          <Step 
            key={item.title}
            title={item.title}
            description={item.description}
            icon={item.icon}
            status={getStepStatus(index)}
          />
        ))}
      </Steps>

      {/* Step Content */}
      <div style={{ minHeight: 400, padding: '0 8px' }}>
        {steps[currentStep].content}
      </div>

      {/* Navigation Footer */}
      <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            {currentStep > 0 && (
              <Button 
                icon={<ArrowLeft size={16} />} 
                onClick={prev}
                size="large"
                disabled={loading}
              >
                Previous
              </Button>
            )}
          </Col>
          <Col>
            <Space>
              <Button 
                onClick={handleCancel} 
                size="large"
                disabled={loading}
              >
                Cancel
              </Button>
              
              {currentStep < steps.length - 1 && (
                <Button 
                  type="primary" 
                  onClick={next}
                  icon={<ArrowRight size={16} />}
                  size="large"
                  disabled={!canProceedToNextStep() || loading}
                  loading={loading}
                >
                  Next
                </Button>
              )}
              
              {currentStep === steps.length - 1 && (
                <Button 
                  type="primary" 
                  icon={<CheckCircle size={16} />}
                  size="large"
                  loading={loading}
                  onClick={handleOpenShift}
                  disabled={!isShiftDataComplete(wizardData)}
                >
                  Start Shift
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* Step Progress Indicator */}
        <div style={{ 
          marginTop: 12, 
          textAlign: 'center',
          fontSize: 12,
          color: '#666'
        }}>
          Step {currentStep + 1} of {steps.length}
          {currentStep === 0 && ' - Assign personnel to islands'}
          {currentStep === 1 && ' - Record opening readings'}
          {currentStep === 2 && ' - Review and start shift'}
        </div>
      </div>

      {/* Debug Info - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <details style={{ marginTop: 16, fontSize: 12 }}>
          <summary>🔍 Debug Info</summary>
          <div style={{ 
            background: '#f5f5f5', 
            padding: 8, 
            borderRadius: 4,
            marginTop: 8,
            fontFamily: 'monospace'
          }}>
            <div><strong>Current Step:</strong> {currentStep}</div>
            <div><strong>Can Proceed:</strong> {canProceedToNextStep().toString()}</div>
            <div><strong>Shift ID:</strong> {wizardData.shiftInfo.shiftId || 'None'}</div>
            <div><strong>Supervisor:</strong> {wizardData.personnel.supervisorId || 'None'}</div>
            <div><strong>Attendants:</strong> {wizardData.personnel.attendants.length}</div>
            <div><strong>Island Assignments:</strong> {wizardData.personnel.islandAssignments.length}</div>
            <div><strong>Pump Readings:</strong> {wizardData.readings.pumpReadings.length}</div>
            <div><strong>Tank Readings:</strong> {wizardData.readings.tankReadings.length}</div>
            <div><strong>All Pumps:</strong> {wizardData.readings.allPumps.length}</div>
            <div><strong>All Tanks:</strong> {wizardData.readings.allTanks.length}</div>
          </div>
        </details>
      )}
    </Card>
  );
};

export default ShiftCreationWizard;