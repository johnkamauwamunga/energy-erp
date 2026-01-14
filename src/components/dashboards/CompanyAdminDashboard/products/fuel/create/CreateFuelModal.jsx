import React, { useState, useEffect } from 'react';
import { Input, Button, Select, Alert, Stepper, Dialog } from '../../../../../ui';
import { fuelService } from '../../../../../../services/fuelService/fuelService';
import { Fuel, Package, Layers, Plus, Check, ArrowRight, ArrowLeft, Droplet, DollarSign, Info, Hash, Edit2 } from 'lucide-react';

const CreateFuelModal = ({ isOpen, onClose, onProductCreated, companyId, editProduct = null }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fuelCategories, setFuelCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isEditMode = !!editProduct;

  const steps = [
    { key: 'category', label: 'Select Category', icon: Layers },
    { key: 'details', label: 'Product Details', icon: Droplet },
    { key: 'pricing', label: 'Set Pricing', icon: DollarSign },
    { key: 'review', label: isEditMode ? 'Review & Update' : 'Review & Create', icon: Check }
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editProduct) {
        // Edit mode - populate form with product data
        setFormData(fuelService.transformProductForForm(editProduct));
      } else {
        resetForm();
      }
      loadFuelCategories();
    }
  }, [isOpen, editProduct]);

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({
      unit: 'LITER',
      companyId,
      isBatchTracked: false,
      isSerialTracked: false
    });
    setErrors({});
    setShowAdvanced(false);
  };

  const loadFuelCategories = async () => {
    try {
      setLoading(true);
      const response = await fuelService.getFuelCategories();
      setFuelCategories(response?.data || []);
    } catch (error) {
      console.error('Failed to load fuel categories:', error);
      setErrors({ general: 'Failed to load fuel categories' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    const actualValue = value && value.target ? value.target.value : value;
    
    setFormData(prev => ({ ...prev, [field]: actualValue }));
    
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
    setCurrentStep(currentStep - 1);
  };

  const validateCurrentStep = () => {
    const newErrors = {};

    if (currentStep === 0) {
      if (!formData.fuelCategoryId) {
        newErrors.fuelCategoryId = 'Please select a fuel category';
      }
    } else if (currentStep === 1) {
      if (!formData.name?.trim()) newErrors.name = 'Product name is required';
      
      if (formData.fuelCode && formData.fuelCode.trim().length > 10) {
        newErrors.fuelCode = 'Fuel code cannot exceed 10 characters';
      }
      
      if (formData.octaneRating && (formData.octaneRating < 0 || formData.octaneRating > 120)) {
        newErrors.octaneRating = 'Octane rating must be between 0 and 120';
      }
      
      if (formData.density && (formData.density < 0.7 || formData.density > 1.5)) {
        newErrors.density = 'Density must be between 0.7 and 1.5';
      }
      
      if (formData.flashPoint && (formData.flashPoint < -100 || formData.flashPoint > 400)) {
        newErrors.flashPoint = 'Flash point must be between -100 and 400°C';
      }
      
    } else if (currentStep === 2) {
      if (formData.baseCostPrice !== undefined) {
        if (formData.baseCostPrice < 0) newErrors.baseCostPrice = 'Base cost must be positive';
      }
      
      if (formData.minSellingPrice !== undefined) {
        if (formData.minSellingPrice < 0) newErrors.minSellingPrice = 'Min price must be positive';
      }
      
      if (formData.maxSellingPrice !== undefined) {
        if (formData.maxSellingPrice < 0) newErrors.maxSellingPrice = 'Max price must be positive';
      }
      
      if (formData.minSellingPrice && formData.maxSellingPrice) {
        if (parseFloat(formData.minSellingPrice) > parseFloat(formData.maxSellingPrice)) {
          newErrors.minSellingPrice = 'Min price cannot exceed max price';
        }
      }
      
      if (formData.baseCostPrice && formData.maxSellingPrice) {
        if (parseFloat(formData.baseCostPrice) > parseFloat(formData.maxSellingPrice)) {
          newErrors.baseCostPrice = 'Base cost cannot exceed max price';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateOptimalPricing = () => {
    if (!formData.baseCostPrice) return;
    
    const baseCost = parseFloat(formData.baseCostPrice);
    const margin = 0.15; // 15% margin
    
    const minPrice = baseCost * (1 + margin);
    const maxPrice = baseCost * (1 + margin * 2);
    
    setFormData(prev => ({
      ...prev,
      minSellingPrice: minPrice.toFixed(2),
      maxSellingPrice: maxPrice.toFixed(2)
    }));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);

    try {
      // Prepare data for submission using service utility
      const submissionData = fuelService.prepareProductForSubmit(formData);
      
      console.log('Submitting fuel product:', submissionData);
      
      let response;
      if (isEditMode) {
        // Update existing product
        response = await fuelService.updateFuelProduct({
          ...submissionData,
          id: editProduct.id
        });
      } else {
        // Create new product
        response = await fuelService.createFuelProduct(submissionData);
      }
      
      if (onProductCreated) {
        onProductCreated(response);
      }
      
      const successMessage = isEditMode ? 'Product updated successfully' : 'Product created successfully';
      
      onClose();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} fuel product:`, error);
      setErrors({ general: error.message || `Failed to ${isEditMode ? 'update' : 'create'} fuel product` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <CategoryStep
            formData={formData}
            errors={errors}
            fuelCategories={fuelCategories}
            loading={loading}
            onInputChange={handleInputChange}
          />
        );
      case 1:
        return (
          <DetailsStep
            formData={formData}
            errors={errors}
            showAdvanced={showAdvanced}
            onInputChange={handleInputChange}
            onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          />
        );
      case 2:
        return (
          <PricingStep
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
            onCalculateOptimal={calculateOptimalPricing}
          />
        );
      case 3:
        return (
          <ReviewStep
            formData={formData}
            fuelCategories={fuelCategories}
            isEditMode={isEditMode}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const baseTitles = [
      'Select Fuel Category',
      'Product Details',
      'Set Pricing',
      isEditMode ? 'Review Product Updates' : 'Review Fuel Product'
    ];
    return baseTitles[currentStep] || (isEditMode ? 'Edit Fuel Product' : 'Create Fuel Product');
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
        <Stepper 
          steps={steps} 
          currentStep={currentStep}
          className="mb-6"
        />

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
                icon={isEditMode ? Edit2 : Check}
                disabled={isSubmitting}
              >
                {isEditMode ? 'Update' : 'Create'} Fuel Product
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

// Step 1: Category Selection
const CategoryStep = ({ formData, errors, fuelCategories, loading, onInputChange }) => {
  const getCategoryDescription = (category) => {
    if (!category) return '';
    
    const defaults = {
      'DIESEL': 'Automotive diesel oil, typical density 0.85 g/cm³',
      'PETROL': 'Motor spirit/gasoline, typical density 0.75 g/cm³',
      'GASOLINE': 'Motor fuel, typical density 0.75 g/cm³',
      'KEROSENE': 'Aviation and heating fuel, typical density 0.82 g/cm³',
      'LUBRICANTS': 'Engine oils and lubricants'
    };
    
    return defaults[category.name] || `Fuel category for ${category.name}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">Select Fuel Category</h4>
        <p className="text-gray-600">Choose the type of fuel for this product.</p>
      </div>

      <Select
        label="Fuel Category"
        value={formData.fuelCategoryId || ''}
        onChange={(value) => onInputChange('fuelCategoryId', value)}
        options={[
          { value: '', label: 'Select a fuel category', disabled: true },
          ...fuelCategories.map(cat => ({ 
            value: cat.id, 
            label: cat.name,
            description: getCategoryDescription(cat)
          }))
        ]}
        error={errors.fuelCategoryId}
        required
        loading={loading}
        icon={Layers}
      />

      {formData.fuelCategoryId && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800">
                Selected category: <span className="font-semibold">
                  {fuelCategories.find(c => c.id === formData.fuelCategoryId)?.name}
                </span>
              </p>
              <p className="text-sm text-blue-600 mt-1">
                You can now proceed to add product details.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Step 2: Product Details
const DetailsStep = ({ formData, errors, showAdvanced, onInputChange, onToggleAdvanced }) => {
  const units = fuelService.getFuelUnitOptions();

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">Product Details</h4>
        <p className="text-gray-600">Enter basic information about your fuel product.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            value={formData.name || ''}
            onChange={(e) => onInputChange('name', e.target.value.toUpperCase())}
            error={errors.name}
            placeholder="e.g., PREMIUM DIESEL 95"
            required
            autoFocus
          />

          <Input
            label="Fuel Code"
            value={formData.fuelCode || ''}
            onChange={(e) => onInputChange('fuelCode', e.target.value.toUpperCase())}
            error={errors.fuelCode}
            placeholder="e.g., PDL-95 (optional)"
            helpText="Leave blank to auto-generate"
            maxLength={10}
            icon={Hash}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Unit"
            value={formData.unit || 'LITER'}
            onChange={(value) => onInputChange('unit', value)}
            options={units}
            error={errors.unit}
          />

          <Input
            label="Description"
            value={formData.description || ''}
            onChange={(e) => onInputChange('description', e.target.value)}
            placeholder="Product description and specifications (optional)"
          />
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={onToggleAdvanced}
            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            <ArrowRight className={`w-4 h-4 ml-1 transform ${showAdvanced ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h5 className="font-medium text-gray-700 mb-3">Technical Specifications</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Octane Rating"
                type="number"
                min="0"
                max="120"
                value={formData.octaneRating || ''}
                onChange={(e) => onInputChange('octaneRating', e.target.value)}
                error={errors.octaneRating}
                placeholder="95"
                helpText="For petrol products (0-120)"
              />

              <Input
                label="Sulfur Content (ppm)"
                type="number"
                step="0.1"
                min="0"
                value={formData.sulfurContent || ''}
                onChange={(e) => onInputChange('sulfurContent', e.target.value)}
                placeholder="10"
                helpText="Parts per million"
              />

              <Input
                label="Density (g/cm³)"
                type="number"
                step="0.001"
                min="0.7"
                max="1.5"
                value={formData.density || ''}
                onChange={(e) => onInputChange('density', e.target.value)}
                error={errors.density}
                placeholder="0.85"
                helpText="Must be between 0.7 and 1.5"
              />

              <Input
                label="Flash Point (°C)"
                type="number"
                step="0.1"
                min="-100"
                max="400"
                value={formData.flashPoint || ''}
                onChange={(e) => onInputChange('flashPoint', e.target.value)}
                error={errors.flashPoint}
                placeholder="65"
                helpText="Must be between -100 and 400°C"
              />
            </div>

            <div className="mt-4">
              <h6 className="font-medium text-gray-700 mb-2">Additional Information</h6>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Color Code"
                  value={formData.colorCode || ''}
                  onChange={(e) => onInputChange('colorCode', e.target.value)}
                  placeholder="#0047AB"
                  helpText="Hex color code (optional)"
                />

                <Input
                  label="Brand"
                  value={formData.brand || ''}
                  onChange={(e) => onInputChange('brand', e.target.value)}
                  placeholder="Brand name (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Input
                  label="SKU"
                  value={formData.sku || ''}
                  onChange={(e) => onInputChange('sku', e.target.value)}
                  placeholder="Stock keeping unit"
                />

                <Input
                  label="Barcode"
                  value={formData.barcode || ''}
                  onChange={(e) => onInputChange('barcode', e.target.value)}
                  placeholder="Barcode number"
                />

                <Input
                  label="Pack Size"
                  value={formData.packSize || ''}
                  onChange={(e) => onInputChange('packSize', e.target.value)}
                  placeholder="e.g., 1000L"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isBatchTracked"
                    checked={formData.isBatchTracked || false}
                    onChange={(e) => onInputChange('isBatchTracked', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isBatchTracked" className="text-sm text-gray-700">
                    Track by batch number
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isSerialTracked"
                    checked={formData.isSerialTracked || false}
                    onChange={(e) => onInputChange('isSerialTracked', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isSerialTracked" className="text-sm text-gray-700">
                    Track by serial number
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Step 3: Pricing
const PricingStep = ({ formData, errors, onInputChange, onCalculateOptimal }) => {
  const calculateMargin = () => {
    if (!formData.baseCostPrice || !formData.maxSellingPrice) return null;
    
    const base = parseFloat(formData.baseCostPrice);
    const max = parseFloat(formData.maxSellingPrice);
    
    if (base <= 0) return null;
    
    return ((max - base) / base) * 100;
  };

  const margin = calculateMargin();
  const marginColor = margin !== null 
    ? margin >= 25 ? 'text-green-600' 
      : margin >= 15 ? 'text-blue-600' 
      : margin >= 5 ? 'text-yellow-600' 
      : margin >= 0 ? 'text-orange-600' 
      : 'text-red-600'
    : 'text-gray-500';

  const getMarginText = () => {
    if (margin === null) return 'N/A';
    if (margin >= 25) return 'Excellent (> 25%)';
    if (margin >= 15) return 'Good (15-25%)';
    if (margin >= 5) return 'Fair (5-15%)';
    if (margin >= 0) return 'Low (0-5%)';
    return 'Unprofitable';
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">Set Product Pricing</h4>
        <p className="text-gray-600">Configure pricing for your fuel product. All fields are optional but recommended.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Base Cost Price"
            type="number"
            step="0.01"
            min="0"
            value={formData.baseCostPrice || ''}
            onChange={(e) => onInputChange('baseCostPrice', e.target.value)}
            error={errors.baseCostPrice}
            placeholder="120.50"
            icon={DollarSign}
            helpText="Your cost per unit"
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
            icon={DollarSign}
            helpText="Minimum sale price"
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
            icon={DollarSign}
            helpText="Maximum sale price"
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCalculateOptimal}
            disabled={!formData.baseCostPrice}
          >
            Calculate Optimal Pricing
          </Button>
        </div>

        {/* Pricing Summary */}
        {(formData.baseCostPrice || formData.minSellingPrice || formData.maxSellingPrice) && (
          <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h5 className="font-medium text-gray-700 mb-3">Pricing Summary</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Base Cost</p>
                <p className="text-lg font-semibold">
                  {formData.baseCostPrice ? `$${parseFloat(formData.baseCostPrice).toFixed(2)}` : 'Not set'}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500">Price Range</p>
                <p className="text-lg font-semibold">
                  {formData.minSellingPrice && formData.maxSellingPrice 
                    ? `$${parseFloat(formData.minSellingPrice).toFixed(2)} - $${parseFloat(formData.maxSellingPrice).toFixed(2)}`
                    : 'Not set'}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500">Spread</p>
                <p className="text-lg font-semibold">
                  {formData.minSellingPrice && formData.maxSellingPrice 
                    ? `$${(parseFloat(formData.maxSellingPrice) - parseFloat(formData.minSellingPrice)).toFixed(2)}`
                    : 'N/A'}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500">Margin</p>
                <p className={`text-lg font-semibold ${marginColor}`}>
                  {margin !== null ? `${margin.toFixed(1)}%` : 'N/A'}
                  {margin !== null && <span className="block text-xs mt-1">{getMarginText()}</span>}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Pricing Tips:</p>
              <ul className="text-sm text-blue-600 mt-1 space-y-1">
                <li>• Base cost is what you pay per unit</li>
                <li>• Minimum price is your floor price for sales</li>
                <li>• Maximum price is your target selling price</li>
                <li>• Aim for 15-20% margin for profitability</li>
                <li>• Prices can be updated later in bulk</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step 4: Review
const ReviewStep = ({ formData, fuelCategories, isEditMode }) => {
  const getFuelCategoryName = (categoryId) => {
    const category = fuelCategories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getCategoryColor = (categoryName) => {
    const colors = {
      'DIESEL': '#0047AB',
      'PETROL': '#FF0000',
      'GASOLINE': '#FF0000',
      'KEROSENE': '#FFFF00',
      'LPG': '#FF9900',
      'default': '#666666'
    };
    return colors[categoryName] || colors.default;
  };

  const selectedCategory = fuelCategories.find(c => c.id === formData.fuelCategoryId);
  const categoryColor = getCategoryColor(selectedCategory?.name);

  const renderPricingSection = () => {
    if (!formData.baseCostPrice && !formData.minSellingPrice && !formData.maxSellingPrice) {
      return <ReviewField label="Pricing" value="Not configured" />;
    }

    return (
      <>
        <ReviewField 
          label="Base Cost" 
          value={formData.baseCostPrice ? `$${parseFloat(formData.baseCostPrice).toFixed(2)}/${formData.unit || 'LITER'}` : 'Not set'} 
        />
        <div className="grid grid-cols-2 gap-4">
          <ReviewField 
            label="Min Price" 
            value={formData.minSellingPrice ? `$${parseFloat(formData.minSellingPrice).toFixed(2)}` : 'Not set'} 
          />
          <ReviewField 
            label="Max Price" 
            value={formData.maxSellingPrice ? `$${parseFloat(formData.maxSellingPrice).toFixed(2)}` : 'Not set'} 
          />
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className={`${isEditMode ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
        <div className="flex items-center">
          {isEditMode ? (
            <Info className="w-5 h-5 text-yellow-600 mr-2" />
          ) : (
            <Check className="w-5 h-5 text-green-600 mr-2" />
          )}
          <span className={`${isEditMode ? 'text-yellow-800' : 'text-green-800'} font-medium`}>
            {isEditMode ? 'Review your changes before updating' : 'Review your fuel product details before creating'}
          </span>
        </div>
      </div>

      <div className="border rounded-lg divide-y divide-gray-200">
        {/* Category Badge */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div 
              className="w-4 h-4 rounded-full mr-3"
              style={{ backgroundColor: categoryColor }}
            />
            <div>
              <p className="font-medium text-gray-900">{getFuelCategoryName(formData.fuelCategoryId)}</p>
              <p className="text-sm text-gray-500">Fuel Category</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            Fuel Product
          </span>
        </div>

        {/* Basic Info */}
        <ReviewField label="Product Name" value={formData.name} />
        
        {formData.fuelCode && <ReviewField label="Fuel Code" value={formData.fuelCode} />}
        {!formData.fuelCode && <ReviewField label="Fuel Code" value="Will be auto-generated" />}
        
        <div className="grid grid-cols-2 gap-4 p-4">
          <ReviewField label="Unit" value={formData.unit || 'LITER'} />
          <ReviewField 
            label="Tracking" 
            value={
              formData.isBatchTracked && formData.isSerialTracked ? 'Batch & Serial' :
              formData.isBatchTracked ? 'Batch Only' :
              formData.isSerialTracked ? 'Serial Only' : 'No Tracking'
            } 
          />
        </div>

        {/* Technical Specs (if any) */}
        {(formData.octaneRating || formData.density || formData.sulfurContent || formData.flashPoint) && (
          <div className="p-4">
            <h6 className="font-medium text-gray-700 mb-3">Technical Specifications</h6>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.octaneRating && <ReviewField label="Octane" value={formData.octaneRating} compact />}
              {formData.sulfurContent && <ReviewField label="Sulfur" value={`${formData.sulfurContent} ppm`} compact />}
              {formData.density && <ReviewField label="Density" value={`${formData.density} g/cm³`} compact />}
              {formData.flashPoint && <ReviewField label="Flash Point" value={`${formData.flashPoint}°C`} compact />}
            </div>
          </div>
        )}

        {/* Additional Info (if any) */}
        {(formData.colorCode || formData.brand || formData.sku || formData.barcode || formData.packSize) && (
          <div className="p-4">
            <h6 className="font-medium text-gray-700 mb-3">Additional Information</h6>
            <div className="grid grid-cols-2 gap-4">
              {formData.colorCode && <ReviewField label="Color" value={formData.colorCode} compact />}
              {formData.brand && <ReviewField label="Brand" value={formData.brand} compact />}
              {formData.sku && <ReviewField label="SKU" value={formData.sku} compact />}
              {formData.barcode && <ReviewField label="Barcode" value={formData.barcode} compact />}
              {formData.packSize && <ReviewField label="Pack Size" value={formData.packSize} compact />}
            </div>
          </div>
        )}

        {/* Description */}
        {formData.description && <ReviewField label="Description" value={formData.description} multiline />}

        {/* Pricing */}
        <div className="p-4">
          <h6 className="font-medium text-gray-700 mb-3">Pricing</h6>
          {renderPricingSection()}
        </div>
      </div>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm text-yellow-800">
              <span className="font-medium">Note:</span> You can update pricing, technical specifications, and other details after creation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for review fields
const ReviewField = ({ label, value, multiline = false, compact = false }) => {
  if (!value && value !== 0) return null;

  const content = multiline ? (
    <div className="mt-1">
      <p className="text-sm text-gray-500">{label}:</p>
      <p className="text-gray-900 whitespace-pre-line mt-1">{value}</p>
    </div>
  ) : compact ? (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  ) : (
    <div className="flex justify-between items-center">
      <span className="font-medium text-gray-700">{label}:</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );

  return <div className={compact ? '' : 'p-4 hover:bg-gray-50 transition-colors'}>{content}</div>;
};

export default CreateFuelModal;