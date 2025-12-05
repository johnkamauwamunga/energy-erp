// components/ShiftManagement/shiftClose/CloseWizard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Steps, Card, Button, Modal, message } from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  CloseOutlined,
  FileTextOutlined,
  DollarOutlined 
} from '@ant-design/icons';
import ReadingsStep from './ReadingsStep';
import IslandSalesStep from './IslandSalesStep';

const { Step } = Steps;

const CloseWizard = ({ 
  onClose, 
  onSuccess, 
  shift, 
  stationId, 
  currentUser,
  visible = true 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [readingsData, setReadingsData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State preservation for going back
  const [preservedPumps, setPreservedPumps] = useState([]);
  const [preservedTanks, setPreservedTanks] = useState([]);
  const [preservedMeterType, setPreservedMeterType] = useState('electric');
  const [hasPreservedData, setHasPreservedData] = useState(false);

  // Steps configuration
  const steps = [
    {
      key: 'readings',
      title: 'Readings Collection',
      // description: 'Enter pump & tank closing readings',
      icon: <FileTextOutlined />
    },
    {
      key: 'islandSales',
      title: 'Island Sales & Collections',
      // description: 'Record sales and cash collections',
      icon: <DollarOutlined />
    }
  ];

  // Helper function to extract pump readings from data
  const extractPumpReadings = useCallback((data) => {
    if (!data) return [];
    
    // Check different possible data structures
    if (data.pumpReadings && Array.isArray(data.pumpReadings)) {
      return data.pumpReadings.map(pump => ({
        id: pump.pumpId,
        pumpId: pump.pumpId,
        name: `Pump ${pump.pumpId?.slice(0, 8) || 'Unknown'}`,
        product: { name: 'Fuel' },
        openingElectricMeter: 0, // These should come from your actual data
        closingElectricMeter: pump.electricMeter?.toString() || '',
        openingManualMeter: 0,
        closingManualMeter: pump.manualMeter?.toString() || '',
        openingCashMeter: 0,
        closingCashMeter: pump.cashMeter?.toString() || '',
        unitPrice: pump.unitPrice || 0,
        islandId: null,
        islandName: 'Unassigned'
      }));
    }
    
    // If data comes from islands structure
    if (data.islands && Array.isArray(data.islands)) {
      const allPumps = [];
      data.islands.forEach(island => {
        if (island.pumps && Array.isArray(island.pumps)) {
          island.pumps.forEach(pump => {
            allPumps.push({
              id: pump.pumpId,
              pumpId: pump.pumpId,
              pumpName: pump.pumpName,
              name: pump.pumpName || `Pump ${pump.pumpId?.slice(0, 8) || 'Unknown'}`,
              product: pump.product || { name: 'Fuel' },
              openingElectricMeter: pump.openingElectricMeter || 0,
              closingElectricMeter: pump.closingElectricMeter?.toString() || '',
              openingManualMeter: pump.openingManualMeter || 0,
              closingManualMeter: pump.closingManualMeter?.toString() || '',
              openingCashMeter: pump.openingCashMeter || 0,
              closingCashMeter: pump.closingCashMeter?.toString() || '',
              unitPrice: pump.unitPrice || 0,
              islandId: island.islandId,
              islandName: island.islandName || 'Unassigned'
            });
          });
        }
      });
      return allPumps;
    }
    
    return [];
  }, []);

  // Helper function to extract tank readings from data
  const extractTankReadings = useCallback((data) => {
    if (!data) return [];
    
    if (data.tankReadings && Array.isArray(data.tankReadings)) {
      return data.tankReadings.map(tank => ({
        id: tank.tankId,
        tankId: tank.tankId,
        name: `Tank ${tank.tankId?.slice(0, 8) || 'Unknown'}`,
        product: { name: 'Fuel' },
        capacity: 10000,
        openingVolume: 0,
        openingDipValue: 0,
        openingCurrentVolume: 0,
        closingVolume: tank.volume?.toString() || '',
        closingDipValue: tank.dipValue?.toString() || '2.5',
        closingCurrentVolume: tank.currentVolume?.toString() || ''
      }));
    }
    
    return [];
  }, []);

  // Handle draft saving
  const saveDraft = useCallback(() => {
    if (preservedPumps.length > 0 || preservedTanks.length > 0) {
      const draft = {
        pumps: preservedPumps,
        tanks: preservedTanks,
        meterType: preservedMeterType,
        step: currentStep,
        shiftId: shift?.id,
        stationId,
        timestamp: Date.now(),
        readingsData: readingsData // Save complete data too
      };
      
      localStorage.setItem(`shift_close_draft_${stationId}`, JSON.stringify(draft));
      message.success('Draft saved successfully');
      return true;
    }
    return false;
  }, [preservedPumps, preservedTanks, preservedMeterType, currentStep, shift?.id, stationId, readingsData]);

  // Load draft on component mount
  useEffect(() => {
    if (stationId) {
      const draftKey = `shift_close_draft_${stationId}`;
      const savedDraft = localStorage.getItem(draftKey);
      
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          const twoHours = 2 * 60 * 60 * 1000;
          
          // Check if draft is recent (less than 2 hours old)
          if (Date.now() - draft.timestamp < twoHours) {
            console.log('📂 Loading saved draft:', draft);
            
            setPreservedPumps(draft.pumps || []);
            setPreservedTanks(draft.tanks || []);
            setPreservedMeterType(draft.meterType || 'electric');
            setReadingsData(draft.readingsData || null);
            setCurrentStep(draft.step || 0);
            setHasPreservedData(true);
            
            message.info('Loaded saved draft from previous session');
          } else {
            // Clear expired draft
            localStorage.removeItem(draftKey);
            console.log('🗑️ Cleared expired draft');
          }
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      }
    }
  }, [stationId]);

  // Handle proceeding from readings to island sales
  const handleProceedToIslandSales = useCallback((data) => {
    console.log('📊 Moving to Island Sales with data:', data);
    
    if (!data) {
      message.error('No data received from readings step');
      return;
    }
    
    // Save the complete readings data
    setReadingsData(data);
    
    // Extract and preserve pump readings
    const pumps = extractPumpReadings(data);
    console.log('💾 Preserving pump readings:', pumps.length);
    setPreservedPumps(pumps);
    
    // Extract and preserve tank readings
    const tanks = extractTankReadings(data);
    console.log('💾 Preserving tank readings:', tanks.length);
    setPreservedTanks(tanks);
    
    // Preserve meter type
    const meterType = data.meterTypeUsed || data.summary?.meterTypeUsed || 'electric';
    console.log('💾 Preserving meter type:', meterType);
    setPreservedMeterType(meterType);
    
    // Save immediately to localStorage for safety
    const draft = {
      pumps: pumps,
      tanks: tanks,
      meterType: meterType,
      step: 1,
      shiftId: shift?.id,
      stationId,
      timestamp: Date.now(),
      readingsData: data
    };
    
    localStorage.setItem(`shift_close_draft_${stationId}`, JSON.stringify(draft));
    
    setHasPreservedData(true);
    setCurrentStep(1);
    
    message.success('Readings saved, proceeding to Island Sales');
  }, [extractPumpReadings, extractTankReadings, shift?.id, stationId]);

  // Handle going back to readings
  const handleBackToReadings = useCallback(() => {
    console.log('⬅️ Returning to Readings step');
    console.log('📋 Preserved pumps:', preservedPumps.length);
    console.log('📋 Preserved tanks:', preservedTanks.length);
    console.log('📋 Preserved meter type:', preservedMeterType);
    
    if (preservedPumps.length === 0 && preservedTanks.length === 0) {
      message.warning('No readings data preserved. Starting fresh.');
    }
    
    setCurrentStep(0);
  }, [preservedPumps, preservedTanks, preservedMeterType]);

  // Handle final shift closing
  const handleFinalClose = useCallback(async (finalData) => {
    setIsSubmitting(true);
    
    try {
      console.log('✅ Final closing data:', finalData);
      
      // Prepare the complete payload
      const closePayload = {
        ...readingsData,
        islandSales: finalData,
        closedAt: new Date().toISOString(),
        closedById: currentUser?.id,
        shiftId: shift?.id,
        stationId: stationId,
        status: 'closed',
        preservedData: {
          pumps: preservedPumps,
          tanks: preservedTanks,
          meterType: preservedMeterType
        }
      };
      
      // Here you would call your API to close the shift
      // Example:
      // const response = await shiftService.closeShift(closePayload);
      
      console.log('📦 Final payload for API:', closePayload);
      
      // Clear saved draft on successful close
      localStorage.removeItem(`shift_close_draft_${stationId}`);
      
      // Reset preserved data
      setPreservedPumps([]);
      setPreservedTanks([]);
      setPreservedMeterType('electric');
      setReadingsData(null);
      setHasPreservedData(false);
      
      // Call success callback
      onSuccess?.(closePayload);
      
      message.success('Shift closed successfully!');
      
    } catch (error) {
      console.error('❌ Error closing shift:', error);
      message.error('Failed to close shift. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [readingsData, currentUser?.id, shift?.id, stationId, preservedPumps, preservedTanks, preservedMeterType, onSuccess]);

  // Handle wizard close with confirmation
  const handleWizardClose = useCallback(() => {
    if (hasPreservedData || preservedPumps.length > 0 || preservedTanks.length > 0) {
      Modal.confirm({
        title: 'Unsaved Changes',
        content: 'You have unsaved changes. Do you want to save as draft before closing?',
        okText: 'Save Draft & Close',
        cancelText: 'Discard & Close',
        onOk: () => {
          saveDraft();
          onClose?.();
        },
        onCancel: () => {
          localStorage.removeItem(`shift_close_draft_${stationId}`);
          onClose?.();
        }
      });
    } else {
      onClose?.();
    }
  }, [hasPreservedData, preservedPumps, preservedTanks, saveDraft, onClose, stationId]);

  // Auto-save draft when data changes
  useEffect(() => {
    if (preservedPumps.length > 0 || preservedTanks.length > 0) {
      const autoSaveTimer = setTimeout(() => {
        saveDraft();
      }, 30000); // Auto-save every 30 seconds
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [preservedPumps, preservedTanks, saveDraft]);

  // Render current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <ReadingsStep
            stationId={stationId}
            shiftInfo={shift}
            onProceedToIslandSales={handleProceedToIslandSales}
            onClose={handleWizardClose}
            // Pass preserved data for going back
            initialPumps={preservedPumps}
            initialTanks={preservedTanks}
            initialMeterType={preservedMeterType}
            // Callback to update preserved data in real-time
            onDataPreserve={(pumps, tanks, meterType) => {
              console.log('💾 Updating preserved data in real-time');
              setPreservedPumps(pumps || []);
              setPreservedTanks(tanks || []);
              setPreservedMeterType(meterType || 'electric');
              setHasPreservedData(true);
            }}
          />
        );
        
      case 1:
        return (
          <IslandSalesStep
            readingsData={readingsData}
            onBackToReadings={handleBackToReadings}
            onCloseShift={handleFinalClose}
            onClose={handleWizardClose}
            shiftInfo={shift}
            stationId={stationId}
            currentUser={currentUser}
            isSubmitting={isSubmitting}
            // Pass preserved data so island sales can access it if needed
            preservedPumps={preservedPumps}
            preservedTanks={preservedTanks}
          />
        );
        
      default:
        return null;
    }
  };

  // Wizard header with steps and actions
  const renderWizardHeader = () => (
    <Card 
      size="small" 
      style={{ 
        marginBottom: 16,
        borderBottom: '1px solid #f0f0f0'
      }}
      bodyStyle={{ padding: '12px 24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Steps 
            current={currentStep} 
            size="small"
            style={{ maxWidth: 400 }}
          >
            {steps.map(step => (
              <Step
                key={step.key}
                title={step.title}
                description={step.description}
                icon={step.icon}
              />
            ))}
          </Steps>
        </div>
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasPreservedData && (
            <>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                marginRight: 8 
              }}>
                {preservedPumps.length} pumps, {preservedTanks.length} tanks
              </div>
              <Button
                icon={<SaveOutlined />}
                onClick={saveDraft}
                size="small"
                type="dashed"
              >
                Save Draft
              </Button>
            </>
          )}
          
          <Button
            icon={<CloseOutlined />}
            onClick={handleWizardClose}
            size="small"
            danger
          >
            Close
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{ 
      minHeight: '100%',
      backgroundColor: '#fff',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      {renderWizardHeader()}
      
      <div style={{ padding: '0 24px 24px' }}>
        {renderStepContent()}
      </div>
      
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          bottom: 10, 
          right: 10, 
          backgroundColor: 'rgba(0,0,0,0.7)', 
          color: 'white', 
          padding: 8, 
          fontSize: 10,
          borderRadius: 4,
          zIndex: 1000 
        }}>
          Debug: Step {currentStep + 1} | 
          Pumps: {preservedPumps.length} | 
          Tanks: {preservedTanks.length} | 
          Meter: {preservedMeterType}
        </div>
      )}
      
      {/* Global loading overlay */}
      {isSubmitting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{ textAlign: 'center' }}>
            <h3>Closing Shift...</h3>
            <p>Please wait while we process your shift closure</p>
          </Card>
        </div>
      )}
    </div>
  );
};

// Default props
CloseWizard.defaultProps = {
  shift: {},
  currentUser: {},
  onClose: () => {},
  onSuccess: () => {}
};

export default CloseWizard;