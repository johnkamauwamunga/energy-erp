import React, { useState, useEffect } from 'react';
import { Input, Select, DatePicker, Alert, Button } from '../../../../ui';
import { Calendar, Clock, Hash, CheckCircle, XCircle, Save, ArrowRight } from 'lucide-react';
import { dummyData, mockServices, dummyDataHelpers } from './dummyData';
import { shiftService } from "../../../../../services/shiftService/shiftService";
import { connectedAssetService } from "../../../../../services/connectedAssetsService/connectedAssetsService";
import { userService } from '../../../../../services/userService/userService';
import { pricingService } from '../../../../../services/priceService/priceService';
import { useApp } from '../../../../../context/AppContext';

const ShiftBasicsStep = ({ data, onChange, onShiftCreated, onNext }) => {
  const { state } = useApp();

  const { supervisorId } = data; // Only supervisorId remains
  const [supervisors, setSupervisors] = useState([]);
  const [creatingShift, setCreatingShift] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createdShiftId, setCreatedShiftId] = useState(null);
  const [hasExistingShift, setHasExistingShift] = useState(false);
  
  const currentStation = state.currentStation?.id;

  console.log("current station id ", currentStation);

  // Check for existing shift on component mount
  useEffect(() => {
    const checkExistingShift = () => {
      const storedShiftId = localStorage.getItem('currentShiftId');
      
      if (storedShiftId) {
        console.log('🔄 Found existing shift:', storedShiftId);
        setCreatedShiftId(storedShiftId);
        setHasExistingShift(true);
        
        // Notify parent about existing shift
        if (onShiftCreated) {
          onShiftCreated(storedShiftId, { 
            shift: { id: storedShiftId },
            exists: true 
          });
        }
      }
    };

    checkExistingShift();
  }, []);

  // Timeout management for messages
  useEffect(() => {
    let successTimer;
    if (createSuccess) {
      successTimer = setTimeout(() => {
        setCreateSuccess(false);
      }, 3000);
    }
    return () => clearTimeout(successTimer);
  }, [createSuccess]);

  useEffect(() => {
    let errorTimer;
    if (createError) {
      errorTimer = setTimeout(() => {
        setCreateError(null);
      }, 5000);
    }
    return () => clearTimeout(errorTimer);
  }, [createError]);

  useEffect(() => {
    const fetchSupervisor = async () => {
      try {
        const response = await userService.getStationSupervisors(currentStation);
        console.log('station supervisor ', response);
        setSupervisors(response);
      } catch (e) {
        console.log("error on getting supervisor ", e);
      }
    };
    
    fetchSupervisor();
  }, [currentStation]);

  useEffect(() => {
    const fetchAssets = async () => {
      let theStation = currentStation;
      try {
        const result = await connectedAssetService.getStationAssetsSimplified(theStation);
        console.log('connected assets ', result);
      } catch (e) {
        console.log("failed to get assets", e);
      }
    };
    fetchAssets();
  }, []);

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

  const handleSupervisorSelect = (event) => {
    const supervisorId = event.target.value;
    console.log("selected supervisor id is ", supervisorId);
    onChange({ supervisorId });
  };

  const handleCreateShift = async () => {
    // Validate required fields - now only supervisor and station
    if (!supervisorId || !currentStation) {
      setCreateError('Please select a supervisor');
      return;
    }

    setCreatingShift(true);
    setCreateError(null);
    setCreateSuccess(false);
    setCreatedShiftId(null);
    setHasExistingShift(false);

    try {
      // Create a clean, simplified payload
      const shiftData = {
        stationId: currentStation,
        supervisorId: supervisorId
        // shiftNumber, startTime, and priceListId are now auto-generated/auto-set
      };

      console.log('🔄 Creating shift with simplified payload');
      console.log('📦 Shift payload:', shiftData);
      
      const result = await shiftService.createShift(shiftData);
      console.log('✅ Shift created successfully:', result);
      
      // Extract shift ID from response
      const shiftId = result.shift?.id || result.data?.shift?.id;
      const shiftNumber = result.shift?.shiftNumber || result.data?.shift?.shiftNumber;
      const startTime = result.shift?.startTime || result.data?.shift?.startTime;
      
      console.log('🎯 Created shift ID:', shiftId);
      console.log('🎯 Auto-generated shift number:', shiftNumber);
      console.log('🎯 Auto-set start time:', startTime);
      
      if (shiftId) {
        setCreatedShiftId(shiftId);
        
        // Store in localStorage for persistence
        localStorage.setItem('currentShiftId', shiftId);
        localStorage.setItem('currentShiftNumber', shiftNumber);
        localStorage.setItem('currentShiftStartTime', startTime);
        localStorage.setItem('currentShiftStation', currentStation);
        
        // Notify parent component about the created shift
        if (onShiftCreated) {
          onShiftCreated(shiftId, result);
        }
      }
      
      setCreateSuccess(true);
      
    } catch (error) {
      console.error('❌ Failed to create shift:', error);
      setCreateError(error.message || 'Failed to create shift');
    } finally {
      setCreatingShift(false);
    }
  };

  // Clear existing shift and start over
  const handleClearShift = () => {
    localStorage.removeItem('currentShiftId');
    localStorage.removeItem('currentShiftNumber');
    localStorage.removeItem('currentShiftStartTime');
    localStorage.removeItem('currentShiftStation');
    
    setCreatedShiftId(null);
    setHasExistingShift(false);
    setCreateSuccess(false);
    
    // Reset form
    onChange({ 
      supervisorId: ''
    });
  };

  const isFormValid = supervisorId && currentStation;

  const canProceed = createdShiftId || hasExistingShift;

  return (
    <div className="space-y-4">
      {/* Existing Shift Alert */}
      {hasExistingShift && (
        <Alert variant="warning" className="text-sm">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Existing Shift Found</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearShift}
              >
                Create New Shift
              </Button>
            </div>
            <p>You have an existing shift in progress. You can continue with this shift or create a new one.</p>
            <div className="flex justify-end mt-2">
              <Button
                onClick={onNext}
                icon={ArrowRight}
                size="sm"
              >
                Continue to Next Step
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* Simplified Form - Only Supervisor Selection */}
      <div className="grid grid-cols-1 gap-4">
        {/* Supervisor - Only Required Field */}
        <div>
          <Select
            value={supervisorId}
            onChange={handleSupervisorSelect}
            options={supervisors.map(sup => ({
              value: sup.id,
              label: `${sup.firstName} ${sup.lastName}`
            }))}
            placeholder="Select supervisor..."
            required
            size="sm"
            disabled={hasExistingShift}
          />
        </div>
      </div>

      {/* Status Messages */}
      {createError && (
        <Alert variant="error" className="text-sm" size="sm">
          {createError}
        </Alert>
      )}
      
      {createSuccess && (
        <Alert variant="success" className="text-sm" size="sm">
          <div className="flex flex-col gap-1">
            <span className="font-semibold">✓ Shift created successfully!</span>
            {createdShiftId && (
              <span className="text-xs opacity-80">
                Shift ID: {createdShiftId}
              </span>
            )}
          </div>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <div>
          {canProceed && (
            <Button
              onClick={onNext}
              icon={ArrowRight}
              size="md"
            >
              Continue to Personnel
            </Button>
          )}
        </div>
        
        <div className="flex gap-3">
          {hasExistingShift && (
            <Button
              variant="outline"
              onClick={handleClearShift}
              size="md"
            >
              Create New Shift
            </Button>
          )}

          <Button
            onClick={clearCache}
            loading={creatingShift}
            icon={Save}
            size="md"
          >
            Clear Cache
          </Button>
          
          {!hasExistingShift && (
            <Button
              onClick={handleCreateShift}
              disabled={!isFormValid || creatingShift}
              loading={creatingShift}
              icon={Save}
              size="md"
            >
              {creatingShift ? 'Creating Shift...' : 'Create Shift'}
            </Button>
          )}
        </div>
      </div>

      {/* Compact Alert */}
      <Alert variant="info" className="text-sm" size="sm">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="font-medium">Shift Information</p>
            <p className="mt-1">
              Create a new shift by selecting a supervisor. Shift number and start time will be automatically generated.
            </p>
          </div>
        </div>
      </Alert>

      {/* Compact Quick Actions - Updated */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-green-600" />
            <span className="font-semibold text-green-900 text-xs">Today</span>
          </div>
          <p className="text-sm text-green-700">
            {new Date().toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
        
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-blue-600" />
            <span className="font-semibold text-blue-900 text-xs">Auto-Generated</span>
          </div>
          <p className="text-sm text-blue-700">
            Shift # & Time
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShiftBasicsStep;