import React, { useState, useEffect } from 'react';
import { Input, Select, DatePicker, Alert, Button } from '../../../ui';
import { Calendar, Clock, Hash, CheckCircle, XCircle, Save, ArrowRight } from 'lucide-react';
import { dummyData, mockServices, dummyDataHelpers } from './dummyData';
import { shiftService } from "../../../../services/shiftService/shiftService";
import { connectedAssetService } from "../../../../services/connectedAssetsService/connectedAssetsService";
import { userService } from '../../../../services/userService/userService';
import { pricingService } from '../../../../services/priceService/priceService';
import { useApp } from '../../../../context/AppContext';

const ShiftBasicsStep = ({ data, onChange, onShiftCreated, onNext }) => {
  const { state } = useApp();

  const { shiftNumber, startTime, priceListId, supervisorId } = data;
  const [shiftNumberValid, setShiftNumberValid] = useState(null);
  const [checkingShiftNumber, setCheckingShiftNumber] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [priceList, setPriceLists] = useState([]);
  const [creatingShift, setCreatingShift] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createdShiftId, setCreatedShiftId] = useState(null);
  const [hasExistingShift, setHasExistingShift] = useState(false);
  
  const [pagination, setPagination] = useState({
    limit: 10,
    page: 1,
    pages: 1,
    total: 0
  });

  const currentStation = state.currentStation?.id;

  // Check for existing shift on component mount
  useEffect(() => {
    const checkExistingShift = () => {
      const storedShiftId = localStorage.getItem('currentShiftId');
      const storedShiftNumber = localStorage.getItem('currentShiftNumber');
      const storedStartTime = localStorage.getItem('currentShiftStartTime');
      
      if (storedShiftId && storedShiftNumber && storedStartTime) {
        console.log('🔄 Found existing shift:', storedShiftId);
        setCreatedShiftId(storedShiftId);
        setHasExistingShift(true);
        
        // Update form with stored data
        onChange({ 
          shiftNumber: storedShiftNumber,
          startTime: storedStartTime
        });
        
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
        setSupervisors(response);
      } catch (e) {
        console.log("error on getting supervisor ", e);
      }
    };

    const loadMorePriceLists = async () => {
      try {
        const response = await pricingService.getPriceLists();
        console.log("pricelist response ", response);
        
        setPriceLists(response?.priceLists || []);
        setPagination(response?.pagination || {
          limit: 10,
          page: 1,
          pages: 1,
          total: 0
        });
      } catch (e) {
        console.log("load more error ", e);
      }
    };
    
    fetchSupervisor();
    loadMorePriceLists();
  }, [currentStation]);

  // Auto-check shift number when it changes
  useEffect(() => {
    const checkShiftNumber = async () => {
      if (shiftNumber && shiftNumber !== dummyDataHelpers.getNextShiftNumber().toString()) {
        setCheckingShiftNumber(true);
        try {
          const result = await mockServices.shiftService.checkShiftNumber(shiftNumber);
          setShiftNumberValid(!result.exists);
        } catch (error) {
          setShiftNumberValid(false);
        } finally {
          setCheckingShiftNumber(false);
        }
      } else {
        setShiftNumberValid(null);
      }
    };
    const timeoutId = setTimeout(checkShiftNumber, 500);
    return () => clearTimeout(timeoutId);
  }, [shiftNumber]);

  useEffect(() => {
    const fetchAssets = async () => {
      let theStation = 'bcbd0ff7-0d74-4b26-a419-c11ead677561';
      try {
        const result = await connectedAssetService.getStationAssetsSimplified(theStation);
        console.log('connected assets ', result);
      } catch (e) {
        console.log("failed to get assets", e);
      }
    };
    fetchAssets();
  }, []);

  const handleDateChange = (date) => {
    if (date) {
      // Format the date to match backend expectations
      const formattedDate = new Date(date);
      const isoString = formattedDate.toISOString();
      
      // Remove milliseconds and ensure Z timezone
      const cleanISOString = isoString.split('.')[0] + 'Z';
      
      console.log('📅 Formatted startTime:', cleanISOString);
      onChange({ startTime: cleanISOString });
    } else {
      onChange({ startTime: null });
    }
  };

  const handleSupervisorSelect = (event) => {
    const supervisorId = event.target.value;
    console.log("selected supervisor id is ", supervisorId);
    onChange({ supervisorId });
  };

  const handlePriceListSelect = (priceListId) => {
    onChange({ priceListId });
  };

  const handleCreateShift = async () => {
    // Validate required fields
    if (!shiftNumber || !startTime || !supervisorId || !priceListId || !currentStation) {
      setCreateError('Please fill all required fields');
      return;
    }

    if (shiftNumberValid === false) {
      setCreateError('Shift number is not valid');
      return;
    }

    setCreatingShift(true);
    setCreateError(null);
    setCreateSuccess(false);
    setCreatedShiftId(null);
    setHasExistingShift(false);

    try {
      // Create a clean, serializable payload
      const shiftData = {
        stationId: currentStation,
        supervisorId: supervisorId,
        shiftNumber: parseInt(shiftNumber, 10),
        startTime: startTime,
        priceListId: priceListId
      };

      console.log('🔄 Creating shift with endpoint: POST /shifts');
      console.log('📦 Shift payload:', shiftData);
      
      const result = await shiftService.createShift(shiftData);
      console.log('✅ Shift created successfully:', result);
      
      // Extract shift ID from response
      const shiftId = result.shift?.id || result.data?.shift?.id;
      console.log('🎯 Created shift ID:', shiftId);
      
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
      shiftNumber: dummyDataHelpers.getNextShiftNumber().toString(),
      startTime: new Date().toISOString().slice(0, 16),
      supervisorId: '',
      priceListId: ''
    });
  };

  const isFormValid = 
    shiftNumber && 
    startTime && 
    supervisorId && 
    priceListId && 
    currentStation && 
    shiftNumberValid !== false;

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Shift Number */}
        <div>
          <Input
            label="Shift Number"
            value={shiftNumber}
            onChange={(e) => onChange({ shiftNumber: e.target.value })}
            icon={Hash}
            required
            type="number"
            placeholder="Enter shift number..."
            size="sm"
            disabled={hasExistingShift}
          />
          {shiftNumberValid !== null && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              shiftNumberValid ? 'text-green-600' : 'text-red-600'
            }`}>
              {checkingShiftNumber ? (
                <>Checking...</>
              ) : shiftNumberValid ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Available
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3" />
                  Already exists
                </>
              )}
            </div>
          )}
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-gray-400 mr-2" />
            <DatePicker
              value={startTime}
              onChange={handleDateChange}
              placeholderText="Select date & time..."
              required
              className="w-full text-sm"
              disabled={hasExistingShift}
            />
          </div>
          {startTime && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(startTime).toLocaleString()}
            </p>
          )}
        </div>

        {/* Supervisor */}
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

        {/* Price List */}
        <div>
          <Select
            value={priceListId}
            onChange={handlePriceListSelect}
            options={priceList.map(list => ({
              value: list.id,
              label: `${list.name}`
            }))}
            placeholder="Select Pricelist..."
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
              Create a new shift by selecting shift number, start time, and price list.
              Shift will be pending until setup is complete.
            </p>
          </div>
        </div>
      </Alert>

      {/* Compact Quick Actions */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="flex items-center gap-1 mb-1">
            <Hash className="w-3 h-3 text-blue-600" />
            <span className="font-semibold text-blue-900 text-xs">Next Shift</span>
          </div>
          <p className="text-lg font-bold text-blue-700">
            {dummyDataHelpers.getNextShiftNumber()}
          </p>
        </div>
        
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
        
        <div className="bg-purple-50 p-3 rounded border border-purple-200">
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle className="w-3 h-3 text-purple-600" />
            <span className="font-semibold text-purple-900 text-xs">Price List</span>
          </div>
          <p className="text-sm text-purple-700 truncate">
            {dummyData.station.activePriceList?.name || 'None'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShiftBasicsStep;