import React, { useState, useEffect } from 'react';
import { Input, Button, Select1 as Select, Alert, Stepper,Dialog } from '../../../../ui';
import { fuelService } from '../../../../../services/fuelService/fuelService';
import { Fuel, Package, Layers, Plus, Check, ArrowRight, ArrowLeft } from 'lucide-react';

const CreateFuelModal = ({ isOpen, onClose, onFuelCreated, companyId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subTypes, setSubTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const steps = [
    { key: 'type', label: 'Select Type', icon: Layers },
    { key: 'form', label: 'Enter Details', icon: Plus },
    { key: 'review', label: 'Review', icon: Check }
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadCategories();
    }
  }, [isOpen]);

  // Load subtypes when category is selected for products
  useEffect(() => {
    if (selectedType === 'product' && formData.categoryId) {
      loadSubTypes(formData.categoryId);
    }
  }, [selectedType, formData.categoryId]);

  const resetForm = () => {
    setCurrentStep(0);
    setSelectedType('');
    setFormData({});
    setErrors({});
    setSubTypes([]);
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fuelService.getFuelCategories();
      setCategories(response || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setErrors({ general: 'Failed to load categories' });
    } finally {
      setLoading(false);
    }
  };

  const loadSubTypes = async (categoryId) => {
    try {
      const response = await fuelService.getFuelSubTypes({ categoryId });
      setSubTypes(response || []);
    } catch (error) {
      console.error('Failed to load sub types:', error);
      setErrors({ general: 'Failed to load sub types' });
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setCurrentStep(1);
  };

  const handleInputChange = (field, value) => {
    // Handle both direct values and event objects from Select
    const actualValue = value && value.target ? value.target.value : value;
    
    setFormData(prev => ({ ...prev, [field]: actualValue }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      // If we're on form step, go back to type selection
      setCurrentStep(0);
      setSelectedType('');
      setFormData({});
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = () => {
    const newErrors = {};

    if (currentStep === 1) {
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
          if (!formData.categoryId) newErrors.categoryId = 'Category is required';
          if (!formData.fuelSubTypeId) newErrors.fuelSubTypeId = 'Sub type is required';
          
          if (formData.density && (formData.density <= 0 || formData.density > 1.5)) {
            newErrors.density = 'Density must be between 0.1 and 1.5 kg/L';
          }
          
          if (formData.octaneRating && (formData.octaneRating < 0 || formData.octaneRating > 100)) {
            newErrors.octaneRating = 'Octane rating must be between 0 and 100';
          }
          break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);

    try {
      const data = { 
        ...formData, 
        companyId,
        // Ensure numeric fields are properly formatted
        density: formData.density ? parseFloat(formData.density) : undefined,
        octaneRating: formData.octaneRating ? parseInt(formData.octaneRating) : undefined,
        sulfurContent: formData.sulfurContent ? parseFloat(formData.sulfurContent) : undefined,
        baseCostPrice: formData.baseCostPrice ? parseFloat(formData.baseCostPrice) : undefined,
        minSellingPrice: formData.minSellingPrice ? parseFloat(formData.minSellingPrice) : undefined,
        maxSellingPrice: formData.maxSellingPrice ? parseFloat(formData.maxSellingPrice) : undefined
      };
      
      let response;

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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <TypeSelectionStep onTypeSelect={handleTypeSelect} />;
      case 1:
        return (
          <FormStep 
            selectedType={selectedType}
            formData={formData}
            errors={errors}
            categories={categories}
            subTypes={subTypes}
            onInputChange={handleInputChange}
            loading={loading}
          />
        );
      case 2:
        return (
          <ReviewStep 
            selectedType={selectedType}
            formData={formData}
            categories={categories}
            subTypes={subTypes}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    if (currentStep === 0) return 'Create Fuel Item';
    if (currentStep === 2) return `Review ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
    return `Create ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
  };

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={getStepTitle()}
      size="lg"
    >
      <div className="space-y-6">
        {/* Stepper */}
        {currentStep > 0 && (
          <Stepper 
            steps={steps} 
            currentStep={currentStep}
            className="mb-6"
          />
        )}

        {/* Error Display */}
        {errors.general && (
          <Alert type="error">
            {errors.general}
          </Alert>
        )}

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={isFirstStep ? onClose : handleBack}
            disabled={isSubmitting}
            icon={isFirstStep ? null : ArrowLeft}
          >
            {isFirstStep ? 'Cancel' : 'Back'}
          </Button>
          
          <div className="flex space-x-3">
            {!isLastStep ? (
              <Button
                variant="cosmic"
                onClick={handleNext}
                icon={ArrowRight}
                disabled={isSubmitting}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="cosmic"
                onClick={handleSubmit}
                loading={isSubmitting}
                icon={Check}
                disabled={isSubmitting}
              >
                Create {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

// Step 1: Type Selection
const TypeSelectionStep = ({ onTypeSelect }) => (
  <div className="space-y-6">
    <div>
      <h4 className="text-lg font-medium text-gray-900 mb-2">What would you like to create?</h4>
      <p className="text-gray-600">Choose the type of fuel item you want to create.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { 
          key: 'category', 
          label: 'Category', 
          icon: Layers, 
          description: 'Broad fuel classification (e.g., Diesel, Petrol)',
          color: 'blue'
        },
        { 
          key: 'subtype', 
          label: 'Sub Type', 
          icon: Package, 
          description: 'Specific grade or specification (e.g., Euro 4, Premium)',
          color: 'green'
        },
        { 
          key: 'product', 
          label: 'Product', 
          icon: Fuel, 
          description: 'Actual fuel product with specific properties',
          color: 'orange'
        }
      ].map(({ key, label, icon: Icon, description, color }) => (
        <button
          key={key}
          className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md border-${color}-500 bg-${color}-50 text-${color}-700 hover:border-${color}-600`}
          onClick={() => onTypeSelect(key)}
        >
          <div className="flex items-center mb-2">
            <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600 mr-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="font-semibold">{label}</span>
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </button>
      ))}
    </div>
  </div>
);

// Step 2: Form Entry
const FormStep = ({ 
  selectedType, 
  formData, 
  errors, 
  categories, 
  subTypes, 
  onInputChange,
  loading 
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CATEGORY FORM */}
        {selectedType === 'category' && (
          <>
            <div className="md:col-span-2">
              <Input
                label="Category Name"
                value={formData.name || ''}
                onChange={(e) => onInputChange('name', e.target.value)}
                error={errors.name}
                placeholder="e.g., Diesel, Petrol, Kerosene"
                required
                autoFocus
              />
            </div>

            <Input
              label="Category Code"
              value={formData.code || ''}
              onChange={(e) => onInputChange('code', e.target.value.toUpperCase())}
              error={errors.code}
              placeholder="e.g., DSL, PTL, KERO"
              required
              maxLength={10}
            />

            <Input
              label="Default Color"
              type="color"
              value={formData.defaultColor || '#666666'}
              onChange={(e) => onInputChange('defaultColor', e.target.value)}
              error={errors.defaultColor}
            />

            <div className="md:col-span-2">
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(e) => onInputChange('description', e.target.value)}
                error={errors.description}
                placeholder="Brief description of this fuel category"
                multiline
                rows={3}
              />
            </div>
          </>
        )}

        {/* SUBTYPE FORM */}
        {selectedType === 'subtype' && (
          <>
            <div className="md:col-span-2">
              <Select
                label="Parent Category"
                value={formData.categoryId || ''}
                onChange={(event) => onInputChange('categoryId', event)}
                options={[
                  { value: '', label: 'Select a category', disabled: true },
                  ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                ]}
                error={errors.categoryId}
                required
                loading={loading}
                icon={Package}
              />
            </div>

            <Input
              label="Sub Type Name"
              value={formData.name || ''}
              onChange={(e) => onInputChange('name', e.target.value)}
              error={errors.name}
              placeholder="e.g., Euro 4, Ultra Low Sulfur, Premium"
              required
              autoFocus
            />

            <Input
              label="Sub Type Code"
              value={formData.code || ''}
              onChange={(e) => onInputChange('code', e.target.value.toUpperCase())}
              error={errors.code}
              placeholder="e.g., E4, ULS, PREM"
              required
              maxLength={10}
            />

            <div className="md:col-span-2">
              <Input
                label="Specification"
                value={formData.specification || ''}
                onChange={(e) => onInputChange('specification', e.target.value)}
                error={errors.specification}
                placeholder="e.g., Euro 4 Standard, ULSD Specification"
                multiline
                rows={3}
              />
            </div>
          </>
        )}

        {/* PRODUCT FORM */}
        {selectedType === 'product' && (
          <>
            <div className="md:col-span-2">
              <Select
                label="Category"
                value={formData.categoryId || ''}
                onChange={(event) => onInputChange('categoryId', event)}
                options={[
                  { value: '', label: 'Select a category', disabled: true },
                  ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                ]}
                error={errors.categoryId}
                required
                loading={loading}
                icon={Layers}
              />
            </div>

            <div className="md:col-span-2">
              <Select
                label="Sub Type"
                value={formData.fuelSubTypeId || ''}
                onChange={(event) => onInputChange('fuelSubTypeId', event)}
                options={[
                  { value: '', label: 'Select a sub type', disabled: true },
                  ...subTypes.map(st => ({ value: st.id, label: st.name }))
                ]}
                error={errors.fuelSubTypeId}
                required
                disabled={!formData.categoryId || subTypes.length === 0}
                icon={Package}
              />
              {!formData.categoryId && (
                <p className="text-sm text-gray-500 mt-1">Please select a category first</p>
              )}
            </div>

            <Input
              label="Product Name"
              value={formData.name || ''}
              onChange={(e) => onInputChange('name', e.target.value)}
              error={errors.name}
              placeholder="e.g., Premium Gasoline, Diesel Fuel"
              required
              autoFocus
            />

            <Input
              label="Fuel Code"
              value={formData.fuelCode || ''}
              onChange={(e) => onInputChange('fuelCode', e.target.value.toUpperCase())}
              error={errors.fuelCode}
              placeholder="e.g., PMS, AGO, DPK"
              required
              maxLength={10}
            />

            <Input
              label="Octane Rating (RON)"
              type="number"
              min="0"
              max="100"
              value={formData.octaneRating || ''}
              onChange={(e) => onInputChange('octaneRating', e.target.value)}
              error={errors.octaneRating}
              placeholder="91"
            />

            <Input
              label="Density (kg/L)"
              type="number"
              step="0.001"
              min="0.1"
              max="1.5"
              value={formData.density || ''}
              onChange={(e) => onInputChange('density', e.target.value)}
              error={errors.density}
              placeholder="0.74"
            />

            <Input
              label="Sulfur Content (ppm)"
              type="number"
              step="0.1"
              min="0"
              value={formData.sulfurContent || ''}
              onChange={(e) => onInputChange('sulfurContent', e.target.value)}
              placeholder="10"
            />

            <Input
              label="Color Code"
              type="color"
              value={formData.colorCode || '#666666'}
              onChange={(e) => onInputChange('colorCode', e.target.value)}
            />

            <Input
              label="Base Cost Price"
              type="number"
              step="0.01"
              min="0"
              value={formData.baseCostPrice || ''}
              onChange={(e) => onInputChange('baseCostPrice', e.target.value)}
              placeholder="120.50"
            />

            <Input
              label="Min Selling Price"
              type="number"
              step="0.01"
              min="0"
              value={formData.minSellingPrice || ''}
              onChange={(e) => onInputChange('minSellingPrice', e.target.value)}
              error={errors.minSellingPrice}
              placeholder="135.00"
            />

            <Input
              label="Max Selling Price"
              type="number"
              step="0.01"
              min="0"
              value={formData.maxSellingPrice || ''}
              onChange={(e) => onInputChange('maxSellingPrice', e.target.value)}
              error={errors.maxSellingPrice}
              placeholder="150.00"
            />

            <div className="md:col-span-2">
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(e) => onInputChange('description', e.target.value)}
                placeholder="Product description and specifications"
                multiline
                rows={3}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Step 3: Review
const ReviewStep = ({ selectedType, formData, categories, subTypes }) => {
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getSubTypeName = (subTypeId) => {
    const subType = subTypes.find(st => st.id === subTypeId);
    return subType?.name || 'Unknown Sub Type';
  };

  const renderReviewContent = () => {
    switch (selectedType) {
      case 'category':
        return (
          <div className="space-y-4">
            <ReviewField label="Name" value={formData.name} />
            <ReviewField label="Code" value={formData.code} />
            <ReviewField label="Default Color" value={formData.defaultColor} type="color" />
            <ReviewField label="Description" value={formData.description} />
          </div>
        );
      
      case 'subtype':
        return (
          <div className="space-y-4">
            <ReviewField label="Category" value={getCategoryName(formData.categoryId)} />
            <ReviewField label="Name" value={formData.name} />
            <ReviewField label="Code" value={formData.code} />
            <ReviewField label="Specification" value={formData.specification} />
            <ReviewField label="Description" value={formData.description} />
          </div>
        );
      
      case 'product':
        return (
          <div className="space-y-4">
            <ReviewField label="Category" value={getCategoryName(formData.categoryId)} />
            <ReviewField label="Sub Type" value={getSubTypeName(formData.fuelSubTypeId)} />
            <ReviewField label="Product Name" value={formData.name} />
            <ReviewField label="Fuel Code" value={formData.fuelCode} />
            <div className="grid grid-cols-2 gap-4">
              <ReviewField label="Octane Rating" value={formData.octaneRating ? `RON ${formData.octaneRating}` : 'Not set'} />
              <ReviewField label="Density" value={formData.density ? `${formData.density} kg/L` : 'Not set'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ReviewField label="Sulfur Content" value={formData.sulfurContent ? `${formData.sulfurContent} ppm` : 'Not set'} />
              <ReviewField label="Color" value={formData.colorCode} type="color" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ReviewField label="Base Cost" value={formData.baseCostPrice ? `$${formData.baseCostPrice}` : 'Not set'} />
              <ReviewField label="Price Range" value={
                formData.minSellingPrice && formData.maxSellingPrice 
                  ? `$${formData.minSellingPrice} - $${formData.maxSellingPrice}`
                  : 'Not set'
              } />
            </div>
            <ReviewField label="Description" value={formData.description} />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Check className="w-5 h-5 text-blue-600 mr-2" />
          <span className="text-blue-800 font-medium">Review your {selectedType} details before creating</span>
        </div>
      </div>

      <div className="border rounded-lg divide-y divide-gray-200">
        {renderReviewContent()}
      </div>
    </div>
  );
};

// Helper component for review fields
const ReviewField = ({ label, value, type = 'text' }) => {
  if (!value && value !== 0) return null;

  return (
    <div className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
      <span className="font-medium text-gray-700">{label}:</span>
      {type === 'color' ? (
        <div className="flex items-center space-x-2">
          <div 
            className="w-6 h-6 rounded border border-gray-300 shadow-sm"
            style={{ backgroundColor: value }}
          />
          <span className="text-gray-900 font-mono text-sm">{value}</span>
        </div>
      ) : (
        <span className="text-gray-900 text-right">{value}</span>
      )}
    </div>
  );
};

export default CreateFuelModal;