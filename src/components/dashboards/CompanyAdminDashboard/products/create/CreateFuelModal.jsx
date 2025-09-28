import React, { useState, useEffect } from 'react';
import { Input, Button, Select, Stepper, Alert } from '../../../components/ui';
import Dialog from '../../../components/ui/Dialog';
import { fuelService } from '../../../services/fuelService';
import { Fuel, Package, Layers, Plus, Check, ArrowRight, ArrowLeft, Zap, Info } from 'lucide-react';

const CreateFuelModal = ({ isOpen, onClose, createType, onFuelCreated, companyId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState(createType || 'category');
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subTypes, setSubTypes] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubTypes, setLoadingSubTypes] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [sequentialMode, setSequentialMode] = useState(false);
  const [createdItems, setCreatedItems] = useState({});

  const steps = [
    { key: 'type', label: 'Select Type', icon: Zap },
    { key: 'form', label: 'Enter Details', icon: Edit },
    { key: 'review', label: 'Review', icon: Check }
  ];

  // Initialize modal
  useEffect(() => {
    if (isOpen) {
      setSelectedType(createType || 'category');
      setCurrentStep(createType ? 1 : 0);
      resetForm();
      loadCategories();
    }
  }, [isOpen, createType]);

  // Load subtypes when category is selected for products
  useEffect(() => {
    if (selectedType === 'product' && formData.categoryId) {
      loadSubTypes(formData.categoryId);
    }
  }, [selectedType, formData.categoryId]);

  // Generate suggestions when category name changes
  useEffect(() => {
    if (selectedType === 'category' && formData.name) {
      const newSuggestions = fuelService.getDefaultCategoryProperties(formData.name);
      setSuggestions(newSuggestions);
    }
  }, [formData.name, selectedType]);

  const resetForm = () => {
    setFormData({});
    setErrors({});
    setSuggestions({});
    setCreatedItems({});
    setSequentialMode(false);
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fuelService.getFuelCategories();
      setCategories(response?.data || response || []);
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
      setSubTypes(response?.data || response || []);
    } catch (error) {
      console.error('Failed to load sub types:', error);
      setErrors({ general: 'Failed to load sub types' });
    } finally {
      setLoadingSubTypes(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Auto-apply suggestions for category creation
    if (selectedType === 'category' && field === 'name' && value) {
      const newSuggestions = fuelService.getDefaultCategoryProperties(value);
      setSuggestions(newSuggestions);
      
      setFormData(prev => ({
        ...prev,
        defaultColor: prev.defaultColor || newSuggestions.color,
        typicalDensity: prev.typicalDensity || newSuggestions.density,
        hazardClass: prev.hazardClass || newSuggestions.hazardClass
      }));
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setCurrentStep(1);
    
    // Pre-fill form with sequential data if available
    if (sequentialMode && createdItems.category && type === 'subtype') {
      setFormData(prev => ({ ...prev, categoryId: createdItems.category.id }));
    }
    if (sequentialMode && createdItems.subtype && type === 'product') {
      setFormData(prev => ({ ...prev, fuelSubTypeId: createdItems.subtype.id }));
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const validateCurrentStep = () => {
    const newErrors = {};

    if (currentStep === 1) {
      switch (selectedType) {
        case 'category':
          if (!formData.name?.trim()) newErrors.name = 'Category name is required';
          if (!formData.code?.trim()) newErrors.code = 'Category code is required';
          if (formData.code && categories.some(cat => cat.code === formData.code)) {
            newErrors.code = 'Category code must be unique';
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
      const data = { ...formData, companyId };
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

      setCreatedItems(prev => ({ ...prev, [selectedType]: response }));

      // Sequential creation flow
      if (sequentialMode) {
        if (selectedType === 'category') {
          // Move to create subtype for the same category
          setSelectedType('subtype');
          setFormData({ categoryId: response.id });
          setCurrentStep(1);
        } else if (selectedType === 'subtype') {
          // Move to create product for the same subtype
          setSelectedType('product');
          setFormData({ fuelSubTypeId: response.id });
          setCurrentStep(1);
        } else {
          // Complete the sequential flow
          onFuelCreated(response);
          onClose();
        }
      } else {
        // Single creation flow
        onFuelCreated(response);
        onClose();
      }
    } catch (error) {
      console.error('Failed to create:', error);
      setErrors({ general: error.message || `Failed to create ${selectedType}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'category': return <Layers className="w-5 h-5" />;
      case 'subtype': return <Package className="w-5 h-5" />;
      case 'product': return <Fuel className="w-5 h-5" />;
      default: return <Plus className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'category': return 'blue';
      case 'subtype': return 'green';
      case 'product': return 'orange';
      default: return 'gray';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <TypeSelectionStep 
            onTypeSelect={handleTypeSelect} 
            selectedType={selectedType}
            sequentialMode={sequentialMode}
            onSequentialModeChange={setSequentialMode}
          />
        );
      case 1:
        return (
          <FormStep 
            selectedType={selectedType}
            formData={formData}
            errors={errors}
            categories={categories}
            subTypes={subTypes}
            suggestions={suggestions}
            loadingCategories={loadingCategories}
            loadingSubTypes={loadingSubTypes}
            onInputChange={handleInputChange}
            sequentialMode={sequentialMode}
            createdItems={createdItems}
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
      className="max-w-2xl"
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

        {/* Sequential Mode Alert */}
        {sequentialMode && currentStep === 1 && (
          <Alert type="info" icon={Info}>
            <div className="flex items-center justify-between">
              <span>
                Sequential mode enabled: After creating this {selectedType}, 
                you'll continue to create the next level.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSequentialMode(false)}
              >
                Exit Sequential
              </Button>
            </div>
          </Alert>
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
            {!isLastStep && (
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Save as Draft
              </Button>
            )}
            
            {isLastStep ? (
              <Button
                variant="cosmic"
                onClick={handleSubmit}
                loading={isSubmitting}
                icon={Check}
                disabled={isSubmitting}
              >
                Create {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
              </Button>
            ) : (
              <Button
                variant="cosmic"
                onClick={handleNext}
                icon={ArrowRight}
                disabled={isSubmitting}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

// Step 1: Type Selection
const TypeSelectionStep = ({ onTypeSelect, selectedType, sequentialMode, onSequentialModeChange }) => (
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
          className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
            selectedType === key
              ? `border-${color}-500 bg-${color}-50 text-${color}-700`
              : 'border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
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

    {/* Sequential Creation Option */}
    <div className="border-t pt-4 mt-4">
      <label className="flex items-center space-x-3 cursor-pointer">
        <input
          type="checkbox"
          checked={sequentialMode}
          onChange={(e) => onSequentialModeChange(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <span className="font-medium text-gray-900">Enable sequential creation</span>
          <p className="text-sm text-gray-600">
            Create a complete fuel hierarchy (Category → Sub Type → Product) in one flow
          </p>
        </div>
      </label>
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
  suggestions,
  loadingCategories,
  loadingSubTypes,
  onInputChange,
  sequentialMode,
  createdItems 
}) => {
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Loading...';
  };

  const getSubTypeName = (subTypeId) => {
    const subType = subTypes.find(st => st.id === subTypeId);
    return subType?.name || 'Loading...';
  };

  return (
    <div className="space-y-6">
      {/* Sequential Progress */}
      {sequentialMode && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${createdItems.category ? 'text-green-600' : 'text-gray-500'}`}>
              Category {createdItems.category ? '✓' : '○'}
            </span>
            <span className={`font-medium ${createdItems.subtype ? 'text-green-600' : 'text-gray-500'}`}>
              Sub Type {createdItems.subtype ? '✓' : '○'}
            </span>
            <span className={`font-medium ${selectedType === 'product' ? 'text-blue-600' : 'text-gray-500'}`}>
              Product {selectedType === 'product' ? '●' : '○'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {suggestions.color && (
                <p className="text-sm text-gray-500 mt-1">
                  Suggested: {suggestions.color} • {suggestions.density} kg/L • {suggestions.hazardClass}
                </p>
              )}
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
              value={formData.defaultColor || suggestions.color || '#666666'}
              onChange={(e) => onInputChange('defaultColor', e.target.value)}
              error={errors.defaultColor}
            />

            <Input
              label="Typical Density (kg/L)"
              type="number"
              step="0.001"
              min="0.1"
              max="1.5"
              value={formData.typicalDensity || suggestions.density || ''}
              onChange={(e) => onInputChange('typicalDensity', parseFloat(e.target.value))}
              error={errors.typicalDensity}
              placeholder="0.85"
            />

            <Input
              label="Hazard Class"
              value={formData.hazardClass || suggestions.hazardClass || ''}
              onChange={(e) => onInputChange('hazardClass', e.target.value)}
              error={errors.hazardClass}
              placeholder="e.g., Class 3"
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

        {selectedType === 'subtype' && (
          <>
            <div className="md:col-span-2">
              <Select
                label="Parent Category"
                value={formData.categoryId || ''}
                onChange={(value) => onInputChange('categoryId', value)}
                options={[
                  { value: '', label: 'Select a category' },
                  ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                ]}
                error={errors.categoryId}
                required
                loading={loadingCategories}
                disabled={sequentialMode && createdItems.category}
              />
              {sequentialMode && createdItems.category && (
                <p className="text-sm text-green-600 mt-1">
                  Using newly created category: {getCategoryName(createdItems.category.id)}
                </p>
              )}
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

            <Input
              label="Specification"
              value={formData.specification || ''}
              onChange={(e) => onInputChange('specification', e.target.value)}
              error={errors.specification}
              placeholder="e.g., Euro 4 Standard, ULSD Specification"
            />

            <div className="md:col-span-2">
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(e) => onInputChange('description', e.target.value)}
                error={errors.description}
                placeholder="Description of this sub type"
                multiline
                rows={3}
              />
            </div>
          </>
        )}

        {selectedType === 'product' && (
          <>
            <div className="md:col-span-2">
              <Select
                label="Parent Category"
                value={formData.categoryId || ''}
                onChange={(value) => onInputChange('categoryId', value)}
                options={[
                  { value: '', label: 'Select a category' },
                  ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                ]}
                error={errors.categoryId}
                required
                loading={loadingCategories}
                disabled={sequentialMode && createdItems.subtype}
              />
            </div>

            <div className="md:col-span-2">
              <Select
                label="Fuel Sub Type"
                value={formData.fuelSubTypeId || ''}
                onChange={(value) => onInputChange('fuelSubTypeId', value)}
                options={[
                  { value: '', label: 'Select a sub type' },
                  ...subTypes.map(st => ({ value: st.id, label: st.name }))
                ]}
                error={errors.fuelSubTypeId}
                required
                loading={loadingSubTypes}
                disabled={!formData.categoryId || (sequentialMode && createdItems.subtype)}
              />
              {sequentialMode && createdItems.subtype && (
                <p className="text-sm text-green-600 mt-1">
                  Using newly created sub type: {getSubTypeName(createdItems.subtype.id)}
                </p>
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
              onChange={(e) => onInputChange('octaneRating', parseInt(e.target.value))}
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
              onChange={(e) => onInputChange('density', parseFloat(e.target.value))}
              error={errors.density}
              placeholder="0.74"
            />

            <Input
              label="Color Code"
              type="color"
              value={formData.colorCode || '#666666'}
              onChange={(e) => onInputChange('colorCode', e.target.value)}
              error={errors.colorCode}
            />

            <Input
              label="Flash Point (°C)"
              type="number"
              step="0.1"
              min="0"
              value={formData.flashPoint || ''}
              onChange={(e) => onInputChange('flashPoint', parseFloat(e.target.value))}
              error={errors.flashPoint}
              placeholder="60"
            />

            <div className="md:col-span-2">
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(e) => onInputChange('description', e.target.value)}
                error={errors.description}
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
            <ReviewField label="Description" value={formData.description} />
            <ReviewField label="Default Color" value={formData.defaultColor} type="color" />
            <ReviewField label="Typical Density" value={formData.typicalDensity ? `${formData.typicalDensity} kg/L` : ''} />
            <ReviewField label="Hazard Class" value={formData.hazardClass} />
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
              <ReviewField label="Octane Rating" value={formData.octaneRating ? `RON ${formData.octaneRating}` : ''} />
              <ReviewField label="Density" value={formData.density ? `${formData.density} kg/L` : ''} />
            </div>
            <ReviewField label="Color" value={formData.colorCode} type="color" />
            <ReviewField label="Flash Point" value={formData.flashPoint ? `${formData.flashPoint}°C` : ''} />
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
          <Info className="w-5 h-5 text-blue-600 mr-2" />
          <span className="text-blue-800 font-medium">Review your {selectedType} details before creating</span>
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        {renderReviewContent()}
      </div>
    </div>
  );
};

// Helper component for review fields
const ReviewField = ({ label, value, type = 'text' }) => {
  if (!value) return null;

  return (
    <div className="flex justify-between items-center p-4 hover:bg-gray-50">
      <span className="font-medium text-gray-700">{label}:</span>
      {type === 'color' ? (
        <div className="flex items-center space-x-2">
          <div 
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: value }}
          />
          <span className="text-gray-900">{value}</span>
        </div>
      ) : (
        <span className="text-gray-900">{value}</span>
      )}
    </div>
  );
};

export default CreateFuelModal;