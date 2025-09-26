import React, { useState, useEffect } from 'react';
import { Input, Button, Select } from '../../ui';
import Dialog from '../../ui/Dialog';
import { fuelService } from '../../../services/fuelService';
import { Fuel, Layers, Package } from 'lucide-react';

const CreateFuelModal = ({ isOpen, onClose, createType, onFuelCreated, companyId }) => {
  const [selectedType, setSelectedType] = useState(createType);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subTypes, setSubTypes] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubTypes, setLoadingSubTypes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedType(createType);
      resetForm();
      loadCategories();
    }
  }, [isOpen, createType]);

  useEffect(() => {
    if (selectedType === 'product' && formData.categoryId) {
      loadSubTypes(formData.categoryId);
    }
  }, [selectedType, formData.categoryId]);

  const resetForm = () => {
    setFormData({});
    setErrors({});
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fuelService.getFuelCategories();
      setCategories(Array.isArray(response) ? response : response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setErrors({ general: 'Failed to load categories' });
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadSubTypes = async (categoryId) => {
    try {
      setLoadingSubTypes(true);
      const response = await fuelService.getFuelSubTypes({ categoryId });
      setSubTypes(Array.isArray(response) ? response : response.data || []);
    } catch (error) {
      console.error('Failed to load sub types:', error);
      setErrors({ general: 'Failed to load sub types' });
    } finally {
      setLoadingSubTypes(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    resetForm();
    if (type === 'subtype' || type === 'product') {
      loadCategories();
    }
  };

  const validateForm = () => {
    const newErrors = {};

    switch (selectedType) {
      case 'category':
        if (!formData.name?.trim()) newErrors.name = 'Category name is required';
        if (!formData.code?.trim()) newErrors.code = 'Category code is required';
        break;

      case 'subtype':
        if (!formData.name?.trim()) newErrors.name = 'Sub type name is required';
        if (!formData.code?.trim()) newErrors.code = 'Sub type code is required';
        if (!formData.categoryId) newErrors.categoryId = 'Category is required';
        break;

      case 'product':
        if (!formData.name?.trim()) newErrors.name = 'Product name is required';
        if (!formData.fuelCode?.trim()) newErrors.fuelCode = 'Fuel code is required';
        if (!formData.fuelSubTypeId) newErrors.fuelSubTypeId = 'Fuel sub type is required';
        if (formData.density && formData.density <= 0) newErrors.density = 'Density must be positive';
        if (formData.octaneRating && (formData.octaneRating < 0 || formData.octaneRating > 100)) {
          newErrors.octaneRating = 'Octane rating must be between 0 and 100';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let response;
      const data = { ...formData, companyId };

      switch (selectedType) {
        case 'category':
          response = await fuelService.createFuelCategory(data);
          break;
        case 'subtype':
          response = await fuelService.createFuelSubType(data);
          break;
        case 'product':
          response = await fuelService.createFuelProduct(data);
          break;
      }

      onFuelCreated(response);
      onClose();
    } catch (error) {
      console.error('Failed to create:', error);
      setErrors({ general: error.message || `Failed to create ${selectedType}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormFields = () => {
    switch (selectedType) {
      case 'category':
        return (
          <>
            <Input
              label="Category Name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              required
            />
            <Input
              label="Category Code"
              value={formData.code || ''}
              onChange={(e) => handleInputChange('code', e.target.value)}
              error={errors.code}
              required
            />
            <Input
              label="Description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={errors.description}
              placeholder="Brief description of this fuel category"
            />
            <Input
              label="Default Color"
              type="color"
              value={formData.defaultColor || '#666666'}
              onChange={(e) => handleInputChange('defaultColor', e.target.value)}
              error={errors.defaultColor}
            />
            <Input
              label="Typical Density (kg/L)"
              type="number"
              step="0.01"
              min="0"
              value={formData.typicalDensity || ''}
              onChange={(e) => handleInputChange('typicalDensity', parseFloat(e.target.value))}
              error={errors.typicalDensity}
            />
            <Input
              label="Hazard Class"
              value={formData.hazardClass || ''}
              onChange={(e) => handleInputChange('hazardClass', e.target.value)}
              error={errors.hazardClass}
              placeholder="e.g., Class 3"
            />
          </>
        );

      case 'subtype':
        return (
          <>
            <Select
              label="Category"
              value={formData.categoryId || ''}
              onChange={(e) => handleInputChange('categoryId', e.target.value)}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              error={errors.categoryId}
              required
              loading={loadingCategories}
            />
            <Input
              label="Sub Type Name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              required
            />
            <Input
              label="Sub Type Code"
              value={formData.code || ''}
              onChange={(e) => handleInputChange('code', e.target.value)}
              error={errors.code}
              required
            />
            <Input
              label="Specification"
              value={formData.specification || ''}
              onChange={(e) => handleInputChange('specification', e.target.value)}
              error={errors.specification}
              placeholder="e.g., Euro 4, ULSD"
            />
            <Input
              label="Description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={errors.description}
            />
          </>
        );

      case 'product':
        return (
          <>
            <Select
              label="Category"
              value={formData.categoryId || ''}
              onChange={(e) => handleInputChange('categoryId', e.target.value)}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              error={errors.categoryId}
              loading={loadingCategories}
            />
            <Select
              label="Fuel Sub Type"
              value={formData.fuelSubTypeId || ''}
              onChange={(e) => handleInputChange('fuelSubTypeId', e.target.value)}
              options={subTypes.map(st => ({ value: st.id, label: st.name }))}
              error={errors.fuelSubTypeId}
              required
              loading={loadingSubTypes}
              disabled={!formData.categoryId}
            />
            <Input
              label="Product Name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              required
            />
            <Input
              label="Fuel Code"
              value={formData.fuelCode || ''}
              onChange={(e) => handleInputChange('fuelCode', e.target.value)}
              error={errors.fuelCode}
              required
              placeholder="e.g., PMS, AGO, DPK"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Octane Rating"
                type="number"
                min="0"
                max="100"
                value={formData.octaneRating || ''}
                onChange={(e) => handleInputChange('octaneRating', parseInt(e.target.value))}
                error={errors.octaneRating}
              />
              <Input
                label="Density (kg/L)"
                type="number"
                step="0.001"
                min="0"
                value={formData.density || ''}
                onChange={(e) => handleInputChange('density', parseFloat(e.target.value))}
                error={errors.density}
              />
            </div>
            <Input
              label="Color Code"
              type="color"
              value={formData.colorCode || '#666666'}
              onChange={(e) => handleInputChange('colorCode', e.target.value)}
              error={errors.colorCode}
            />
            <Input
              label="Flash Point (°C)"
              type="number"
              step="0.1"
              min="0"
              value={formData.flashPoint || ''}
              onChange={(e) => handleInputChange('flashPoint', parseFloat(e.target.value))}
              error={errors.flashPoint}
            />
            <Input
              label="Sulfur Content (ppm)"
              type="number"
              step="0.1"
              min="0"
              value={formData.sulfurContent || ''}
              onChange={(e) => handleInputChange('sulfurContent', parseFloat(e.target.value))}
              error={errors.sulfurContent}
            />
          </>
        );

      default:
        return null;
    }
  };

  const getTypeLabel = () => {
    switch (selectedType) {
      case 'category': return 'Category';
      case 'subtype': return 'Sub Type';
      case 'product': return 'Product';
      default: return 'Item';
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Create New Fuel ${getTypeLabel()}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 text-red-700 bg-red-100 rounded-md">
            {errors.general}
          </div>
        )}

        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Create Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className={`p-3 border rounded-md text-center ${
                selectedType === 'category'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTypeChange('category')}
            >
              <Layers className="w-5 h-5 mx-auto mb-1" />
              <div className="text-sm font-medium">Category</div>
            </button>
            <button
              type="button"
              className={`p-3 border rounded-md text-center ${
                selectedType === 'subtype'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTypeChange('subtype')}
            >
              <Package className="w-5 h-5 mx-auto mb-1" />
              <div className="text-sm font-medium">Sub Type</div>
            </button>
            <button
              type="button"
              className={`p-3 border rounded-md text-center ${
                selectedType === 'product'
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTypeChange('product')}
            >
              <Fuel className="w-5 h-5 mx-auto mb-1" />
              <div className="text-sm font-medium">Product</div>
            </button>
          </div>
        </div>

        {renderFormFields()}

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
            disabled={isSubmitting}
          >
            Create {getTypeLabel()}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateFuelModal;