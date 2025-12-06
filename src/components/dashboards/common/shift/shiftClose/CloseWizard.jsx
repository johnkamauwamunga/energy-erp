// components/ShiftManagement/shiftClose/CloseWizard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Steps, Card, Button, Modal, message } from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  CloseOutlined,
  FileTextOutlined,
  DollarOutlined,
  ClearOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import ReadingsStep from './ReadingsStep';
import IslandSalesStep from './IslandSalesStep';
import SummaryModal from './SummaryModal';

const { Step } = Steps;

// Cache utility functions
const getCacheKey = (stationId, shiftId) => {
  if (!stationId || !shiftId) return null;
  return `shift_close_draft_${stationId}_${shiftId}`;
};

const getLegacyCacheKey = (stationId) => {
  if (!stationId) return null;
  return `shift_close_draft_${stationId}`;
};

const clearShiftCache = (stationId, shiftId) => {
  if (!stationId || !shiftId) {
    console.warn('Cannot clear cache: Missing stationId or shiftId');
    return;
  }

  console.log('🧹 Clearing cache for:', { stationId, shiftId });
  
  const keysToRemove = [];
  
  // Check localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // Remove if it's for this specific shift
      if (key === getCacheKey(stationId, shiftId)) {
        keysToRemove.push(key);
      }
      // Remove legacy key
      else if (key === getLegacyCacheKey(stationId)) {
        keysToRemove.push(key);
      }
      // Remove any other cache for this shift
      else if (key.includes(shiftId) && key.includes(stationId)) {
        keysToRemove.push(key);
      }
      // Clean up old drafts for this station
      else if (key.startsWith(`shift_close_draft_${stationId}`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          // Remove if it's for a different shift
          if (data && data.shiftId && data.shiftId !== shiftId) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // If we can't parse it, remove it
          keysToRemove.push(key);
        }
      }
    }
  }
  
  // Remove all identified keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('🗑️ Removed cache key:', key);
  });
  
  // Also clear sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes(shiftId) || key.includes(`shift_${shiftId}`))) {
      sessionStorage.removeItem(key);
      console.log('🗑️ Removed session key:', key);
    }
  }
  
  return keysToRemove.length;
};

const validateCacheOnLoad = (stationId, currentShiftId) => {
  const keysToRemove = [];
  const currentTime = Date.now();
  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`shift_close_draft_${stationId}`)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data) {
          // Check if data is too old
          const isExpired = currentTime - (data.timestamp || 0) > FOUR_HOURS;
          // Check if it's for a different shift
          const isDifferentShift = data.shiftId && data.shiftId !== currentShiftId;
          
          if (isExpired || isDifferentShift) {
            keysToRemove.push(key);
          }
        }
      } catch (e) {
        // Corrupted data, remove it
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('🧹 Cleaned old cache:', key);
  });
  
  return keysToRemove.length;
};

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
  const [summaryData, setSummaryData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State preservation for going back
  const [preservedPumps, setPreservedPumps] = useState([]);
  const [preservedTanks, setPreservedTanks] = useState([]);
  const [preservedMeterType, setPreservedMeterType] = useState('electric');
  const [hasPreservedData, setHasPreservedData] = useState(false);

  // Steps configuration - NOW WITH 3 STEPS
  const steps = [
    {
      key: 'readings',
      title: 'Readings Collection',
      icon: <FileTextOutlined />
    },
    {
      key: 'islandSales',
      title: 'Island Sales & Collections',
      icon: <DollarOutlined />
    },
    {
      key: 'summary',
      title: 'Review & Submit',
      icon: <CheckCircleOutlined />
    }
  ];

  // Memoized cache key
  const currentCacheKey = React.useMemo(() => 
    getCacheKey(stationId, shift?.id), 
    [stationId, shift?.id]
  );

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
        openingElectricMeter: 0,
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
    if (!currentCacheKey || (preservedPumps.length === 0 && preservedTanks.length === 0)) {
      message.warning('No data to save as draft');
      return false;
    }
    
    const draft = {
      pumps: preservedPumps,
      tanks: preservedTanks,
      meterType: preservedMeterType,
      step: currentStep,
      shiftId: shift?.id,
      stationId,
      timestamp: Date.now(),
      readingsData: readingsData,
      summaryData: summaryData,
      version: '1.0'
    };
    
    try {
      localStorage.setItem(currentCacheKey, JSON.stringify(draft));
      message.success('Draft saved successfully');
      console.log('💾 Saved draft to:', currentCacheKey);
      return true;
    } catch (error) {
      console.error('Error saving draft:', error);
      message.error('Failed to save draft');
      return false;
    }
  }, [currentCacheKey, preservedPumps, preservedTanks, preservedMeterType, currentStep, shift?.id, stationId, readingsData, summaryData]);

  // Clear all cache for this shift
  const clearAllCache = useCallback(() => {
    if (!stationId || !shift?.id) return;
    
    clearShiftCache(stationId, shift.id);
    
    // Reset state
    setPreservedPumps([]);
    setPreservedTanks([]);
    setPreservedMeterType('electric');
    setReadingsData(null);
    setSummaryData(null);
    setHasPreservedData(false);
    setCurrentStep(0);
    
    message.success('Cache cleared successfully');
    console.log('🔄 All cache cleared for shift:', shift.id);
  }, [stationId, shift?.id]);

  // Load draft on component mount
  useEffect(() => {
    if (!stationId || !shift?.id) return;
    
    // Clean up old cache before loading
    const cleanedCount = validateCacheOnLoad(stationId, shift.id);
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} old cache entries`);
    }
    
    if (currentCacheKey) {
      const savedDraft = localStorage.getItem(currentCacheKey);
      
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          const TWO_HOURS = 2 * 60 * 60 * 1000;
          const currentTime = Date.now();
          
          // Verify draft is for current shift and not expired
          if (draft.shiftId === shift.id && currentTime - draft.timestamp < TWO_HOURS) {
            console.log('📂 Loading draft for current shift:', draft.shiftId);
            
            setPreservedPumps(draft.pumps || []);
            setPreservedTanks(draft.tanks || []);
            setPreservedMeterType(draft.meterType || 'electric');
            setReadingsData(draft.readingsData || null);
            setSummaryData(draft.summaryData || null);
            setCurrentStep(draft.step || 0);
            setHasPreservedData(true);
            
            message.info('Loaded saved draft from previous session');
          } else {
            // Clear expired or mismatched draft
            localStorage.removeItem(currentCacheKey);
            console.log('🗑️ Cleared expired/mismatched draft');
          }
        } catch (error) {
          console.error('Error loading draft:', error);
          localStorage.removeItem(currentCacheKey);
        }
      }
    }
  }, [stationId, shift?.id, currentCacheKey]);

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
    
    // Save immediately to localStorage
    if (currentCacheKey) {
      const draft = {
        pumps: pumps,
        tanks: tanks,
        meterType: meterType,
        step: 1, // Moving to step 1
        shiftId: shift?.id,
        stationId,
        timestamp: Date.now(),
        readingsData: data,
        summaryData: summaryData,
        version: '1.0'
      };
      
      try {
        localStorage.setItem(currentCacheKey, JSON.stringify(draft));
        console.log('💾 Auto-saved draft after proceeding to step 1');
      } catch (error) {
        console.error('Error auto-saving draft:', error);
      }
    }
    
    setHasPreservedData(true);
    setCurrentStep(1);
    
    message.success('Readings saved, proceeding to Island Sales');
  }, [extractPumpReadings, extractTankReadings, shift?.id, stationId, currentCacheKey, summaryData]);

  // Handle proceeding from island sales to summary
  const handleProceedToSummary = useCallback((data) => {
    console.log('📋 Moving to Summary with data:', data);
    
    if (!data) {
      message.error('No data received from island sales step');
      return;
    }
    
    // Save the summary data
    setSummaryData(data);
    
    // Save immediately to localStorage
    if (currentCacheKey) {
      const draft = {
        pumps: preservedPumps,
        tanks: preservedTanks,
        meterType: preservedMeterType,
        step: 2, // Moving to step 2
        shiftId: shift?.id,
        stationId,
        timestamp: Date.now(),
        readingsData: readingsData,
        summaryData: data,
        version: '1.0'
      };
      
      try {
        localStorage.setItem(currentCacheKey, JSON.stringify(draft));
        console.log('💾 Auto-saved draft after proceeding to step 2');
      } catch (error) {
        console.error('Error auto-saving draft:', error);
      }
    }
    
    setCurrentStep(2);
    
    message.success('Proceeding to Review & Submit');
  }, [currentCacheKey, preservedPumps, preservedTanks, preservedMeterType, shift?.id, stationId, readingsData]);

  // Handle going back to previous steps
  const handleBackToPreviousStep = useCallback(() => {
    console.log('⬅️ Going back to previous step');
    
    // Save current state before going back
    if (currentCacheKey) {
      const draft = {
        pumps: preservedPumps,
        tanks: preservedTanks,
        meterType: preservedMeterType,
        step: currentStep - 1, // Going back one step
        shiftId: shift?.id,
        stationId,
        timestamp: Date.now(),
        readingsData: readingsData,
        summaryData: summaryData,
        version: '1.0'
      };
      
      try {
        localStorage.setItem(currentCacheKey, JSON.stringify(draft));
      } catch (error) {
        console.error('Error saving draft on back:', error);
      }
    }
    
    setCurrentStep(prev => prev - 1);
  }, [currentCacheKey, preservedPumps, preservedTanks, preservedMeterType, currentStep, shift?.id, stationId, readingsData, summaryData]);

  // Handle final shift closing from summary
  const handleFinalClose = useCallback(async (finalData) => {
    setIsSubmitting(true);
    
    try {
      console.log('✅ Final closing data:', finalData);
      
      // Prepare the complete payload
      const closePayload = {
        ...readingsData,
        ...finalData,
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
      
      console.log('📦 Final payload for API:', closePayload);
      
      // Here you would call your API to close the shift
      // Example:
      // const response = await shiftService.closeShift(closePayload);
      
      // COMPREHENSIVE CACHE CLEANUP
      clearAllCache();
      
      // Reset all state
      setPreservedPumps([]);
      setPreservedTanks([]);
      setPreservedMeterType('electric');
      setReadingsData(null);
      setSummaryData(null);
      setHasPreservedData(false);
      setCurrentStep(0);
      
      // Call success callback
      onSuccess?.(closePayload);
      
      message.success('Shift closed successfully!');
      
    } catch (error) {
      console.error('❌ Error closing shift:', error);
      message.error('Failed to close shift. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [readingsData, currentUser?.id, shift?.id, stationId, preservedPumps, preservedTanks, preservedMeterType, onSuccess, clearAllCache]);

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
          clearAllCache();
          onClose?.();
        }
      });
    } else {
      onClose?.();
    }
  }, [hasPreservedData, preservedPumps, preservedTanks, saveDraft, clearAllCache, onClose]);

  // Auto-save draft when data changes
  useEffect(() => {
    if (preservedPumps.length > 0 || preservedTanks.length > 0) {
      const autoSaveTimer = setTimeout(() => {
        saveDraft();
      }, 30000); // Auto-save every 30 seconds
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [preservedPumps, preservedTanks, saveDraft]);

  // Clear cache when component unmounts (if shift is closed)
  useEffect(() => {
    return () => {
      if (shift?.status === 'closed') {
        clearAllCache();
      }
    };
  }, [shift?.status, clearAllCache]);

  // Debug function to show cache status
  const showCacheStatus = () => {
    console.log('📊 Current Cache Status:');
    console.log('Shift ID:', shift?.id);
    console.log('Station ID:', stationId);
    console.log('Cache Key:', currentCacheKey);
    console.log('Has Draft:', !!localStorage.getItem(currentCacheKey));
    console.log('Current Step:', currentStep);
    console.log('Preserved Pumps:', preservedPumps.length);
    console.log('Preserved Tanks:', preservedTanks.length);
    console.log('Has Preserved Data:', hasPreservedData);
    console.log('Has Readings Data:', !!readingsData);
    console.log('Has Summary Data:', !!summaryData);
  };

  // Render current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Readings Collection
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
        
      case 1: // Island Sales & Collections
        return (
          <IslandSalesStep
            readingsData={readingsData}
            onBackToReadings={() => setCurrentStep(0)}
            onProceedToSummary={handleProceedToSummary}
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
        
      case 2: // Review & Submit
        return (
          <SummaryModal
            visible={true}
            onClose={() => setCurrentStep(1)} // Go back to island sales
            onSubmitShift={handleFinalClose}
            islandSalesData={summaryData}
            loading={isSubmitting}
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
            style={{ maxWidth: 600 }}
          >
            {steps.map(step => (
              <Step
                key={step.key}
                title={step.title}
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
                Step {currentStep + 1}/{steps.length}
              </div>
              {currentStep > 0 && (
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBackToPreviousStep}
                  size="small"
                  type="default"
                >
                  Back
                </Button>
              )}
              <Button
                icon={<ClearOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: 'Clear Cache',
                    content: 'Are you sure you want to clear all cached data for this shift?',
                    okText: 'Yes, Clear',
                    cancelText: 'Cancel',
                    onOk: clearAllCache
                  });
                }}
                size="small"
                type="dashed"
                danger
              >
                Clear Cache
              </Button>
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
          zIndex: 1000,
          cursor: 'pointer'
        }}
        onClick={showCacheStatus}
        title="Click to show cache status in console"
        >
          Debug: Step {currentStep + 1} | 
          Pumps: {preservedPumps.length} | 
          Tanks: {preservedTanks.length}
          {currentCacheKey && localStorage.getItem(currentCacheKey) && ' | 💾'}
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