import React, { useState, useEffect } from 'react';
import { Input, Button, Select } from '../../ui';
import Dialog from '../../ui/Dialog';
import { useApp } from '../../../context/AppContext';
import { assetService } from '../../../services/assetService/assetService';
import { Fuel, Zap, Package, Building2, Loader } from 'lucide-react';

const assetTypes = [
  { value: 'STORAGE_TANK', label: 'Storage Tank', icon: Fuel },
  { value: 'FUEL_PUMP', label: 'Fuel Pump', icon: Zap },
  { value: 'ISLAND', label: 'Island', icon: Package },
  { value: 'WAREHOUSE', label: 'Warehouse', icon: Building2 },
];

const CreateAssetModal = ({ isOpen, onClose, onAssetCreated }) => {
  const { state } = useApp();
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    warehouseName: '',
    code: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedType('');
      setFormData({
        name: '',
        capacity: '',
        warehouseName: '',
        code: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setFormData({
      name: '',
      capacity: '',
      warehouseName: '',
      code: '',
    });
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!selectedType) newErrors.type = 'Asset type is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';

    if (selectedType === 'STORAGE_TANK') {
      if (!formData.capacity) newErrors.capacity = 'Capacity is required';
    }

    if (selectedType === 'WAREHOUSE') {
      if (!formData.warehouseName) newErrors.warehouseName = 'Warehouse name is required';
    }

    if (selectedType === 'ISLAND') {
      if (!formData.code) newErrors.code = 'Island code is required';
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
        name: formData.name,
        type: selectedType,
      };

      // Add type-specific fields
      switch (selectedType) {
        case 'STORAGE_TANK':
          assetData.capacity = Number(formData.capacity);
          break;
        case 'WAREHOUSE':
          assetData.warehouseName = formData.warehouseName;
          break;
        case 'ISLAND':
          assetData.code = formData.code;
          break;
        default:
          break;
      }

      const newAsset = await assetService.createAsset(assetData);
      onAssetCreated(newAsset);
      onClose();
    } catch (error) {
      console.error('Failed to create asset:', error);
      setErrors({ general: error.response?.data?.message || 'Failed to create asset' });
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
            value={formData.capacity}
            onChange={(e) => handleInputChange('capacity', e.target.value)}
            error={errors.capacity}
            required
          />
        );
      case 'WAREHOUSE':
        return (
          <Input
            label="Warehouse Name"
            value={formData.warehouseName}
            onChange={(e) => handleInputChange('warehouseName', e.target.value)}
            error={errors.warehouseName}
            required
          />
        );
      case 'ISLAND':
        return (
          <Input
            label="Island Code"
            value={formData.code}
            onChange={(e) => handleInputChange('code', e.target.value)}
            error={errors.code}
            required
          />
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
      size="md"
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
            <Input
              label="Asset Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              required
            />

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
            disabled={isSubmitting || !selectedType}
          >
            Create Asset
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateAssetModal;