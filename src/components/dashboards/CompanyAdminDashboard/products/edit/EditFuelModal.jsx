import React, { useState, useEffect } from 'react';
import { Input, Button, Select } from '../../ui';
import Dialog from '../../ui/Dialog';
import { fuelService } from '../../../services/fuelService';
import { Fuel, Layers, Package, Save, AlertCircle } from 'lucide-react';

const EditFuelModal = ({ 
  isOpen, 
  onClose, 
  editType, 
  item, 
  onFuelUpdated,
  companyId 
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subTypes, setSubTypes] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubTypes, setLoadingSubTypes] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      resetForm();
      loadCategories();
      initializeFormData();
    }
  }, [isOpen, item, editType]);

  useEffect(() => {
    if (editType === 'product' && formData.categoryId) {
      loadSubTypes(formData.categoryId);
    }
  }, [editType, formData.categoryId]);

  const resetForm = () => {
    setFormData({});
    setErrors({});
  };

  const initializeFormData = () => {
    if (!item) return;

    switch (editType) {
      case 'category':
        setFormData({
          id: item.id,
          name: item.name || '',
          code: item.code || '',
          description: item.description || '',
          defaultColor: item.defaultColor || '#666666',
          typicalDensity: item.typicalDensity || '',
          hazardClass: item.hazardClass || ''
        });
        break;

      case 'subtype':
        setFormData({
          id: item.id,
          name: item.name || '',
          code: item.code || '',
          categoryId: item.categoryId || item.category?.id || '',
          specification: item.specification || '',
          description: item.description || '',
          minQualityStandards: item.minQualityStandards || {}
        });
        break;

      case 'product':
        setFormData({
          id: item.id,
          name: item.name || '',
          description: item.description || '',
          unit: item.unit || 'LITER',
          fuelSubTypeId: item.fuelSubTypeId || item.fuelSubType?.id || '',
          categoryId: item.fuelSubType?.categoryId || item.fuelCategoryId || '',
          fuelCode: item.fuelCode || '',
          octaneRating: item.octaneRating || '',
          sulfurContent: item.sulfurContent || '',
          colorCode: item.colorCode || '#666666',
          density: item.density || '',
          flashPoint: item.flashPoint || '',
          sku: item.sku || '',
          barcode: item.barcode || '',
          brand: item.brand || '',
          modelNumber: item.modelNumber || '',
          packSize: item.packSize || '',
          isBatchTracked: item.isBatchTracked || false,
          isSerialTracked: item.isSerialTracked || false,
          baseCostPrice: item.baseCostPrice || '',
          minSellingPrice: item.minSellingPrice || '',
          maxSellingPrice: item.maxSellingPrice || ''
        });
        break;

      default:
        break;
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fuelService.getFuelCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadSubTypes = async (categoryId) => {
    try {
      setLoadingSubTypes(true);
      const response = await fuelService.getFuelSubTypes({ categoryId });
      setSubTypes(response.data || []);
    } catch (error) {
      console.error('Failed to load sub types:', error);
    } finally {
      setLoadingSubTypes(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Handle checkboxes separately
    if (field === 'isBatchTracked' || field === 'isSerialTracked') {
      setFormData(prev => ({ ...prev, [field]: value.target ? value.target.checked : value }));
    } else {
      // Handle number fields
      let processedValue = value;
      if (value && value.target) {
        processedValue = value.target.value;
      }
      
      // Convert numeric fields
      const numericFields = [
        'typicalDensity', 'octaneRating', 'sulfurContent', 'density', 
        'flashPoint', 'baseCostPrice', 'minSellingPrice', 'maxSellingPrice'
      ];
      
      if (numericFields.includes(field) && processedValue !== '') {
        processedValue = field === 'octaneRating' ? 
          parseInt(processedValue) : parseFloat(processedValue);
      }
      
      setFormData(prev => ({ ...prev, [field]: processedValue }));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    switch (editType) {
      case 'category':
        if (!formData.name?.trim()) newErrors.name = 'Category name is required';
        if (!formData.code?.trim()) newErrors.code = 'Category code is required';
        if (formData.typicalDensity && formData.typicalDensity <= 0) {
          newErrors.typicalDensity = 'Density must be positive';
        }
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
        if (formData.sulfurContent && formData.sulfurContent < 0) {
          newErrors.sulfurContent = 'Sulfur content cannot be negative';
        }
        if (formData.minSellingPrice && formData.maxSellingPrice) {
          if (formData.minSellingPrice > formData.maxSellingPrice) {
            newErrors.minSellingPrice = 'Minimum price cannot be greater than maximum price';
          }
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
      
      switch (editType) {
        case 'category':
          response = await fuelService.updateFuelCategory(formData);
          break;
        case 'subtype':
          response = await fuelService.updateFuelSubType(formData);
          break;
        case 'product':
          response = await fuelService.updateFuelProduct(formData);
          break;
        default:
          throw new Error('Invalid edit type');
      }

      onFuelUpdated(response);
      onClose();
    } catch (error) {
      console.error('Failed to update:', error);
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ 
          general: error.response?.data?.message || `Failed to update ${editType}` 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormFields = () => {
    switch (editType) {
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
              step="0.001"
              min="0"
              value={formData.typicalDensity || ''}
              onChange={(e) => handleInputChange('typicalDensity', e.target.value)}
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
            <div className="p-3 bg-gray-50 rounded-md">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Quality Standards (JSON)
              </label>
              <textarea
                value={JSON.stringify(formData.minQualityStandards || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const standards = JSON.parse(e.target.value);
                    handleInputChange('minQualityStandards', standards);
                  } catch (error) {
                    // Invalid JSON, we'll keep the string but not update the object
                  }
                }}
                className="w-full h-32 p-2 border border-gray-300 rounded-md text-sm font-mono"
                placeholder='{"sulfurContent": 10, "flashPoint": 60}'
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter quality standards in JSON format
              </p>
            </div>
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
            <Input
              label="Description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={errors.description}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Octane Rating"
                type="number"
                min="0"
                max="100"
                value={formData.octaneRating || ''}
                onChange={(e) => handleInputChange('octaneRating', e.target.value)}
                error={errors.octaneRating}
              />
              <Input
                label="Density (kg/L)"
                type="number"
                step="0.001"
                min="0"
                value={formData.density || ''}
                onChange={(e) => handleInputChange('density', e.target.value)}
                error={errors.density}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Sulfur Content (ppm)"
                type="number"
                step="0.1"
                min="0"
                value={formData.sulfurContent || ''}
                onChange={(e) => handleInputChange('sulfurContent', e.target.value)}
                error={errors.sulfurContent}
              />
              <Input
                label="Flash Point (°C)"
                type="number"
                step="0.1"
                min="0"
                value={formData.flashPoint || ''}
                onChange={(e) => handleInputChange('flashPoint', e.target.value)}
                error={errors.flashPoint}
              />
            </div>

            <Input
              label="Color Code"
              type="color"
              value={formData.colorCode || '#666666'}
              onChange={(e) => handleInputChange('colorCode', e.target.value)}
              error={errors.colorCode}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="SKU"
                value={formData.sku || ''}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                error={errors.sku}
              />
              <Input
                label="Barcode"
                value={formData.barcode || ''}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                error={errors.barcode}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Brand"
                value={formData.brand || ''}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                error={errors.brand}
              />
              <Input
                label="Model Number"
                value={formData.modelNumber || ''}
                onChange={(e) => handleInputChange('modelNumber', e.target.value)}
                error={errors.modelNumber}
              />
            </div>

            <Input
              label="Pack Size"
              value={formData.packSize || ''}
              onChange={(e) => handleInputChange('packSize', e.target.value)}
              error={errors.packSize}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isBatchTracked"
                  checked={formData.isBatchTracked || false}
                  onChange={(e) => handleInputChange('isBatchTracked', e)}
                  className="mr-2"
                />
                <label htmlFor="isBatchTracked" className="text-sm text-gray-700">
                  Batch Tracked
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isSerialTracked"
                  checked={formData.isSerialTracked || false}
                  onChange={(e) => handleInputChange('isSerialTracked', e)}
                  className="mr-2"
                />
                <label htmlFor="isSerialTracked" className="text-sm text-gray-700">
                  Serial Tracked
                </label>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Pricing</h4>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Base Cost Price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.baseCostPrice || ''}
                  onChange={(e) => handleInputChange('baseCostPrice', e.target.value)}
                  error={errors.baseCostPrice}
                />
                <Input
                  label="Min Selling Price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minSellingPrice || ''}
                  onChange={(e) => handleInputChange('minSellingPrice', e.target.value)}
                  error={errors.minSellingPrice}
                />
                <Input
                  label="Max Selling Price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxSellingPrice || ''}
                  onChange={(e) => handleInputChange('maxSellingPrice', e.target.value)}
                  error={errors.maxSellingPrice}
                />
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const getTypeIcon = () => {
    switch (editType) {
      case 'category': return <Layers className="w-5 h-5" />;
      case 'subtype': return <Package className="w-5 h-5" />;
      case 'product': return <Fuel className="w-5 h-5" />;
      default: return <Layers className="w-5 h-5" />;
    }
  };

  const getTypeLabel = () => {
    switch (editType) {
      case 'category': return 'Category';
      case 'subtype': return 'Sub Type';
      case 'product': return 'Product';
      default: return 'Item';
    }
  };

  if (!item) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Fuel ${getTypeLabel()}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
        {errors.general && (
          <div className="p-3 text-red-700 bg-red-100 rounded-md flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {errors.general}
          </div>
        )}

        {renderFormFields()}

        <div className="flex justify-end space-x-3 pt-4 border-t">
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
            <Save className="w-4 h-4 mr-1" />
            Update {getTypeLabel()}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default EditFuelModal;