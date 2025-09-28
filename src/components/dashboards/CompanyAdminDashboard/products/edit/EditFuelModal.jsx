import React, { useState, useEffect } from 'react';
import { Input, Button, Select } from '../../../components/ui';
import Dialog from '../../../components/ui/Dialog';
import { fuelService } from '../../../services/fuelService';
import { Fuel, Package, Layers, Save } from 'lucide-react';

const EditFuelModal = ({ isOpen, onClose, item, onFuelUpdated }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subTypes, setSubTypes] = useState([]);

  useEffect(() => {
    if (isOpen && item) {
      setFormData(item);
      setErrors({});
      loadCategories();
      
      if (item.fuelSubTypeId || item.categoryId) {
        loadSubTypes(item.categoryId || item.fuelSubType?.categoryId);
      }
    }
  }, [isOpen, item]);

  const loadCategories = async () => {
    try {
      const response = await fuelService.getFuelCategories();
      setCategories(response?.data || response || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadSubTypes = async (categoryId) => {
    try {
      const response = await fuelService.getFuelSubTypes({ categoryId });
      setSubTypes(response?.data || response || []);
    } catch (error) {
      console.error('Failed to load sub types:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getItemType = () => {
    if (item.fuelCode) return 'product';
    if (item.categoryId || item.category) return 'subtype';
    return 'category';
  };

  const validateForm = () => {
    const newErrors = {};
    const type = getItemType();

    switch (type) {
      case 'category':
        if (!formData.name?.trim()) newErrors.name = 'Category name is required';
        if (!formData.code?.trim()) newErrors.code = 'Category code is required';
        break;
      case 'subtype':
        if (!formData.name?.trim()) newErrors.name = 'Sub type name is required';
        if (!formData.code?.trim()) newErrors.code = 'Sub type code is required';
        break;
      case 'product':
        if (!formData.name?.trim()) newErrors.name = 'Product name is required';
        if (!formData.fuelCode?.trim()) newErrors.fuelCode = 'Fuel code is required';
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
      const type = getItemType();

      switch (type) {
        case 'category':
          response = await fuelService.updateFuelCategory(formData);
          break;
        case 'subtype':
          response = await fuelService.updateFuelSubType(formData);
          break;
        case 'product':
          response = await fuelService.updateFuelProduct(formData);
          break;
      }

      onFuelUpdated(response);
    } catch (error) {
      console.error('Failed to update:', error);
      setErrors({ general: error.message || 'Failed to update item' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormFields = () => {
    const type = getItemType();

    switch (type) {
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
            />
            <Input
              label="Default Color"
              type="color"
              value={formData.defaultColor || '#666666'}
              onChange={(e) => handleInputChange('defaultColor', e.target.value)}
            />
            <Input
              label="Typical Density (kg/L)"
              type="number"
              step="0.01"
              value={formData.typicalDensity || ''}
              onChange={(e) => handleInputChange('typicalDensity', parseFloat(e.target.value))}
            />
          </>
        );

      case 'subtype':
        return (
          <>
            <Select
              label="Category"
              value={formData.categoryId || ''}
              onChange={(value) => handleInputChange('categoryId', value)}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              error={errors.categoryId}
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
            />
          </>
        );

      case 'product':
        return (
          <>
            <Select
              label="Category"
              value={formData.categoryId || formData.fuelSubType?.categoryId || ''}
              onChange={(value) => {
                handleInputChange('categoryId', value);
                loadSubTypes(value);
              }}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
            />
            <Select
              label="Fuel Sub Type"
              value={formData.fuelSubTypeId || ''}
              onChange={(value) => handleInputChange('fuelSubTypeId', value)}
              options={subTypes.map(st => ({ value: st.id, label: st.name }))}
              error={errors.fuelSubTypeId}
              required
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
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Octane Rating"
                type="number"
                value={formData.octaneRating || ''}
                onChange={(e) => handleInputChange('octaneRating', parseInt(e.target.value))}
              />
              <Input
                label="Density (kg/L)"
                type="number"
                step="0.001"
                value={formData.density || ''}
                onChange={(e) => handleInputChange('density', parseFloat(e.target.value))}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const getTypeLabel = () => {
    const type = getItemType();
    switch (type) {
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 text-red-700 bg-red-100 rounded-md">
            {errors.general}
          </div>
        )}

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
            icon={Save}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default EditFuelModal;