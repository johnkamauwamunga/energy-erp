import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, Select, LoadingSpinner } from '../../ui';
import Dialog from '../../ui/Dialog';
import { useApp } from '../../../context/AppContext';
import { assetService } from '../../../services/assetService/assetService';
import { stationService } from '../../../services/stationService/stationService';
import { Fuel, Zap, Package, Building2 } from 'lucide-react';
import { debounce } from 'lodash';

const assetTypes = [
  { value: 'STORAGE_TANK', label: 'Storage Tank', icon: Fuel },
  { value: 'FUEL_PUMP', label: 'Fuel Pump', icon: Zap },
  { value: 'ISLAND', label: 'Island', icon: Package },
  { value: 'WAREHOUSE', label: 'Warehouse', icon: Building2 },
];

const CreateAssetModal = ({ isOpen, onClose, assetType, onAssetCreated }) => {
  const { state } = useApp();
  const [selectedType, setSelectedType] = useState(assetType || '');
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    warehouseName: '',
    code: '',
    stationId: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationError, setStationError] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeExists, setCodeExists] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedType(assetType || '');
      setFormData({
        name: '',
        capacity: '',
        warehouseName: '',
        code: '',
        stationId: ''
      });
      setErrors({});
      setCodeExists(false);
      
      // Load available stations
      loadStations();
    }
  }, [isOpen, assetType]);

  // Debounced function to check if asset code exists
  const checkAssetCode = useCallback(
    debounce(async (code, type) => {
      if (!code || code.length < 2) {
        setCodeExists(false);
        return;
      }
      
      setCheckingCode(true);
      try {
        // Get all assets to check if code exists
        const assets = state.assets || [];
        
        // Check if code exists for the same type
        const exists = assets.some(asset => 
          asset.name === code && asset.type === type
        );
        
        setCodeExists(exists);
      } catch (error) {
        console.error('Error checking asset code:', error);
      } finally {
        setCheckingCode(false);
      }
    }, 500),
    [state.assets]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      checkAssetCode.cancel();
    };
  }, [checkAssetCode]);

  const loadStations = async () => {
    try {
      setLoadingStations(true);
      setStationError('');

      // Fetch stations for the company
      const response = await stationService.getCompanyStations();
//console.log("stations assets, ",response)
      if (response) {
        setStations(response);
      } else {
        setStationError('Failed to load stations');
      }
    } catch (err) {
      console.error('❌ Failed to fetch stations:', err);
      setStationError(err.message || 'Failed to fetch stations');
    } finally {
      setLoadingStations(false);
    }
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setFormData({
      name: '',
      capacity: '',
      warehouseName: '',
      code: '',
      stationId: ''
    });
    setErrors({});
    setCodeExists(false);
  };

  const handleInputChange = (field, value) => {
    // Extract value from event if it's an event object
    const actualValue = value && value.target ? value.target.value : value;
    
    setFormData(prev => ({ ...prev, [field]: actualValue }));
    
    // Clear any existing errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Check if asset code exists when name changes
    if (field === 'name' && selectedType !== 'WAREHOUSE' && selectedType !== 'ISLAND') {
      checkAssetCode(actualValue, selectedType);
    }
    
    // Check if warehouse name exists when it changes
    if (field === 'warehouseName' && selectedType === 'WAREHOUSE') {
      checkAssetCode(actualValue, selectedType);
    }
    
    // Check if island code exists when it changes
    if (field === 'code' && selectedType === 'ISLAND') {
      checkAssetCode(actualValue, selectedType);
    }
  };

  // // Special handler for station selection to handle event objects
  // const handleStationChange = (value) => {
  //   // Extract value from event if it's an event object
  //   console.log("selected station id ",value)
  //   const stationId = value && value.target ? value.target.value : value;
  //   handleInputChange('stationId', stationId);
  // };

  const handleStationChange = (e) => {
  const stationId = e?.target?.value ?? e; // handle both event or direct value
 // console.log("selected station id:", stationId);
  handleInputChange('stationId', stationId);
};

  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedType) newErrors.type = 'Asset type is required';
    
    // Name validation for all types except warehouse and island
    if (selectedType !== 'WAREHOUSE' && selectedType !== 'ISLAND' && !formData.name.trim()) {
      newErrors.name = 'Asset code is required';
    }

    if (selectedType === 'STORAGE_TANK') {
      if (!formData.capacity) newErrors.capacity = 'Capacity is required';
      if (formData.capacity && parseFloat(formData.capacity) < 0) newErrors.capacity = 'Capacity must be non-negative';
    }

    if (selectedType === 'WAREHOUSE' && !formData.warehouseName) {
      newErrors.warehouseName = 'Warehouse code is required';
    }

    if (selectedType === 'ISLAND' && !formData.code) {
      newErrors.code = 'Island code is required';
    }

    // Check if asset code already exists
    if (codeExists) {
      if (selectedType === 'WAREHOUSE') {
        newErrors.warehouseName = 'Warehouse code already exists';
      } else if (selectedType === 'ISLAND') {
        newErrors.code = 'Island code already exists';
      } else {
        newErrors.name = 'Asset code already exists';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let assetData = {
        type: selectedType,
      };

      // Add name based on asset type
      if (selectedType === 'WAREHOUSE') {
        assetData.name = formData.warehouseName;
      } else if (selectedType === 'ISLAND') {
        assetData.name = formData.name || formData.code;
        assetData.code = formData.code;
      } else {
        assetData.name = formData.name;
      }

      // Add station ID if selected
      if (formData.stationId) {
        assetData.stationId = formData.stationId;
      }

      // Add type-specific fields
      if (selectedType === 'STORAGE_TANK') {
        assetData.capacity = parseFloat(formData.capacity);
      }

      const response = await assetService.createAsset(assetData);
      onAssetCreated(response);
      onClose();
    } catch (error) {
      console.error('Failed to create asset:', error);
      if (error.response?.data?.errors) {
        // Handle Zod validation errors from backend
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: error.response?.data?.message || 'Failed to create asset' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormFields = () => {
    switch (selectedType) {
      case 'STORAGE_TANK':
        return (
          <Input
            label="Capacity (Liters)"
            type="number"
            min="0"
            step="0.01"
            value={formData.capacity}
            onChange={(e) => handleInputChange('capacity', e.target.value)}
            error={errors.capacity}
            required
          />
        );
      case 'WAREHOUSE':
        return (
          <div>
            <Input
              label="Warehouse Code"
              value={formData.warehouseName}
              onChange={(e) => handleInputChange('warehouseName', e.target.value)}
              error={errors.warehouseName}
              required
            />
            {checkingCode && (
              <div className="mt-1 text-sm text-gray-500">Checking code availability...</div>
            )}
            {codeExists && !checkingCode && (
              <div className="mt-1 text-sm text-red-600">Warehouse code already exists</div>
            )}
          </div>
        );
      case 'ISLAND':
        return (
          <>
            <div>
              <Input
                label="Island Code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                error={errors.code}
                required
              />
              {checkingCode && (
                <div className="mt-1 text-sm text-gray-500">Checking code availability...</div>
              )}
              {codeExists && !checkingCode && (
                <div className="mt-1 text-sm text-red-600">Island code already exists</div>
              )}
            </div>
            <Input
              label="Island Name (Optional)"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Asset"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 text-red-700 bg-red-100 rounded-md">
            {errors.general}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asset Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {assetTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`p-3 border rounded-md text-center ${
                  selectedType === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleTypeChange(type.value)}
              >
                <type.icon className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">{type.label}</div>
              </button>
            ))}
          </div>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type}</p>
          )}
        </div>

        {selectedType && (
          <>
            {/* Asset Code (for all types except warehouse and island) */}
            {selectedType !== 'WAREHOUSE' && selectedType !== 'ISLAND' && (
              <div>
                <Input
                  label="Asset Code"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={errors.name}
                  required
                />
                {checkingCode && (
                  <div className="mt-1 text-sm text-gray-500">Checking code availability...</div>
                )}
                {codeExists && !checkingCode && (
                  <div className="mt-1 text-sm text-red-600">Asset code already exists</div>
                )}
              </div>
            )}

            {/* Station Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Station (Optional)
              </label>
              <Select
                value={formData.stationId}
                onChange={handleStationChange}
                options={stations.map(s => ({
                  value: s.id,
                  label: s.name
                }))}
                error={errors.stationId}
                placeholder="Select a station (optional)"
                disabled={loadingStations}
              />
              {loadingStations && (
                <div className="mt-2 flex items-center">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-gray-500">Loading stations...</span>
                </div>
              )}
              {stationError && (
                <p className="mt-1 text-sm text-red-600">{stationError}</p>
              )}
            </div>

            {renderFormFields()}
          </>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="cosmic"
            loading={isSubmitting}
            disabled={isSubmitting || !selectedType || codeExists}
          >
            Create Asset
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateAssetModal;