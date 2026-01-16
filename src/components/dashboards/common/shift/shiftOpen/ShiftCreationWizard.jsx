import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Steps, Button, Space, Alert, Row, Col, Typography, notification, Tag, Input } from 'antd';
import { ArrowLeft, ArrowRight, CheckCircle, Users, Gauge, FileText, Play } from 'lucide-react';
import PersonnelStep from './PersonnelStep';
import ReadingsStep from './ReadingsStep';
import SummaryStep from './SummaryStep';
import { useShift } from '../../../../../hooks/useShift';

const { Step } = Steps;
const { Title, Text } = Typography;

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
  const [infoAlert, setInfoAlert] = useState('');
  const alertTimeoutRef = useRef(null);

  // CENTRALIZED STATE - All data lives here
  const [wizardData, setWizardData] = useState({
    personnel: {
      supervisorId: null,
      attendants: [],
      islandAssignments: [],
      topologyIslands: []
    },
    readings: {
      pumpReadings: [],
      tankReadings: [],
      allPumps: [],
      allTanks: []
    },
    shiftInfo: {
      shiftId: null,
      stationId: stationId,
      shiftNumber: null,
      status: 'PENDING'
    }
  });

  // Show info alert for 3 minutes
  const showInfoAlert = useCallback((message) => {
    setInfoAlert(message);
    
    // Clear any existing timeout
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    
    // Set timeout for 3 minutes (180000ms)
    alertTimeoutRef.current = setTimeout(() => {
      setInfoAlert('');
    }, 180000);
  }, []);

  // Clear alert on unmount
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  // Show alert when shift is created or supervisor is selected
  useEffect(() => {
    if (wizardData.shiftInfo.shiftId && wizardData.personnel.supervisorId) {
      showInfoAlert(`Shift ${wizardData.shiftInfo.shiftNumber} created. Supervisor assigned. Complete attendant assignments to proceed.`);
    }
  }, [wizardData.shiftInfo.shiftId, wizardData.personnel.supervisorId, showInfoAlert]);

  // Show alert when attendants are assigned
  useEffect(() => {
    if (wizardData.personnel.attendants.length > 0) {
      showInfoAlert(`${wizardData.personnel.attendants.length} attendant(s) assigned to islands. Proceed to next step.`);
    }
  }, [wizardData.personnel.attendants.length, showInfoAlert]);

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

  const handleCreateShift = useCallback(async (shiftPayload) => {
    try {
      console.log("📥 Parent received shift payload:", shiftPayload);
      const result = await createShift(shiftPayload);
      
      console.log("Shift create result:", result);
      
      if (result?.id) {
        updateShiftInfo({
          shiftId: result.id,
          shiftNumber: result.shiftNumber,
          status: result.status
        });

        updatePersonnel({
          supervisorId: shiftPayload.supervisorId
        });
        
        notification.success({
          message: 'Shift Created',
          description: `Shift ${result.shiftNumber} created successfully`
        });

        showInfoAlert(`Shift ${result.shiftNumber} created. Please assign attendants.`);
      }
    } catch (err) {
      console.error('Failed to create shift:', err);
    }
  }, [createShift, updateShiftInfo, updatePersonnel, showInfoAlert]);

  const handleOpenShift = useCallback(async () => {
    try {
      console.log('🚀 Opening shift with centralized data:', wizardData);

      if (!isShiftDataComplete(wizardData)) {
        throw new Error('Please complete all steps before starting shift');
      }

      const openShiftPayload = {
        shiftId: wizardData.shiftInfo.shiftId,
        recordedById: wizardData.personnel.supervisorId,
        islandAssignments: wizardData.personnel.islandAssignments.map(assignment => ({
          attendantId: assignment.attendantId,
          islandId: assignment.islandId,
          assignmentType: assignment.assignmentType || 'PRIMARY'
        })),
        pumpReadings: wizardData.readings.pumpReadings.map(reading => ({
          pumpId: reading.pumpId,
          electricMeter: parseFloat(reading.electricMeter) || 0,
          manualMeter: parseFloat(reading.manualMeter) || 0,
          cashMeter: parseFloat(reading.cashMeter) || 0,
          unitPrice: parseFloat(reading.unitPrice) || 0,
          readingType: 'OPENING',
          source: reading.source || 'MANUAL_ENTRY'
        })),
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

  const canProceedToNextStep = useCallback(() => {
    switch (currentStep) {
      case 0:
        return !!wizardData.shiftInfo.shiftId && 
               wizardData.personnel.islandAssignments.length > 0 && 
               wizardData.personnel.attendants.length > 0;
      case 1:
        const allPumpsHaveReadings = wizardData.readings.allPumps?.length === wizardData.readings.pumpReadings?.length;
        const allTanksHaveReadings = wizardData.readings.allTanks?.length === wizardData.readings.tankReadings?.length;
        return allPumpsHaveReadings && allTanksHaveReadings;
      default:
        return true;
    }
  }, [currentStep, wizardData]);

  useEffect(() => {
    const initialize = async () => {
      if (stationId) {
        setWizardLoading(true);
        try {
          console.log('🔍 Wizard: Checking for existing open shift...');
          const activeShift = await checkActiveShift();
          
          if (activeShift) {
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

            showInfoAlert(`Existing shift ${activeShift.shiftNumber} found. You can modify assignments.`);
          }
        } catch (err) {
          console.error('Wizard initialization error:', err);
        } finally {
          setWizardLoading(false);
        }
      }
    };
    
    initialize();
  }, [stationId, checkActiveShift, updateShiftInfo, updatePersonnel, showInfoAlert]);

  const steps = [
    {
      title: 'Personnel',
      icon: <Users size={16} />,
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
          compactLayout={true} // Add this prop
        />
      )
    },
    {
      title: 'Readings',
      icon: <Gauge size={16} />,
      content: (
        <ReadingsStep 
          stationId={stationId}
          shiftId={wizardData.shiftInfo.shiftId}
          shiftInfo={wizardData.shiftInfo}
          readingsData={wizardData.readings}
          personnelData={wizardData.personnel}
          onUpdateReadings={updateReadings}
          readingType="START"
        />
      )
    },
    {
      title: 'Summary',
      icon: <FileText size={16} />,
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
            <Text type="secondary" style={{ fontSize: 12 }}>Shift:</Text>
            <Tag color="blue" style={{ fontSize: 12 }}>
              {wizardData.shiftInfo.shiftNumber || wizardData.shiftInfo.shiftId}
            </Tag>
            <Tag 
              color={wizardData.shiftInfo.status === 'OPEN' ? 'green' : 'orange'}
              style={{ fontSize: 11 }}
            >
              {wizardData.shiftInfo.status}
            </Tag>
          </Space>
        )
      }
    >
      {/* Info Alert - Always at the top */}
      {infoAlert && (
        <Alert 
          message="Information"
          description={infoAlert}
          type="info"
          showIcon
          closable
          onClose={() => setInfoAlert('')}
          style={{ 
            marginBottom: 16,
            borderLeft: '4px solid #1890ff'
          }}
        />
      )}

      {/* Error Alert */}
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
        size="small"
      >
        {steps.map((item, index) => (
          <Step 
            key={item.title}
            title={item.title}
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
      <div style={{ 
        marginTop: 24, 
        borderTop: '1px solid #f0f0f0', 
        paddingTop: 16,
        paddingBottom: 8 
      }}>
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
    </Card>
  );
};

export default ShiftCreationWizard;