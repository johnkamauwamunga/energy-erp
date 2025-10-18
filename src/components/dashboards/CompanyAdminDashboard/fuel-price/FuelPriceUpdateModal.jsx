import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calculator, Check, Zap } from 'lucide-react';
import { Dialog, Input, Button, Alert, Card, Badge } from '../../../ui';
import { fuelPriceService } from '../../../../services/fuelPriceService/fuelPriceService';

const FuelPriceUpdateModal = ({ isOpen, onClose, product, onPriceUpdate }) => {
  const [formData, setFormData] = useState({
    baseCostPrice: 0,
    minSellingPrice: 0,
    maxSellingPrice: 0
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedPrices, setCalculatedPrices] = useState(null);
  const [quickPresets, setQuickPresets] = useState([]);

  // Reset form when modal opens or product changes
  useEffect(() => {
    if (isOpen && product) {
      const baseCost = product.baseCostPrice || 0;
      const minPrice = product.minSellingPrice || 0;
      const maxPrice = product.maxSellingPrice || 0;
      
      setFormData({
        baseCostPrice: baseCost,
        minSellingPrice: minPrice,
        maxSellingPrice: maxPrice
      });
      setErrors({});
      setCalculatedPrices(null);
      
      // Generate quick presets based on current prices
      generateQuickPresets(baseCost, minPrice, maxPrice);
    }
  }, [isOpen, product]);

  // Generate quick pricing presets
  const generateQuickPresets = (baseCost, minPrice, maxPrice) => {
    if (!baseCost) return [];

    const presets = [
      { label: 'Competitive (10%)', margin: 0.10 },
      { label: 'Standard (15%)', margin: 0.15 },
      { label: 'Premium (20%)', margin: 0.20 },
      { label: 'High Margin (25%)', margin: 0.25 }
    ].map(preset => {
      const calculated = fuelPriceService.calculateOptimalPricing(baseCost, preset.margin);
      return {
        ...preset,
        minSellingPrice: calculated.minSellingPrice,
        maxSellingPrice: calculated.maxSellingPrice
      };
    });

    setQuickPresets(presets);
  };

  // Calculate optimal pricing
  const calculateOptimalPricing = () => {
    const baseCost = parseFloat(formData.baseCostPrice);
    if (!baseCost || baseCost <= 0) {
      setErrors({ baseCostPrice: 'Base cost is required for calculation' });
      return;
    }

    const optimal = fuelPriceService.calculateOptimalPricing(baseCost, 0.15);
    setCalculatedPrices(optimal);
  };

  // Apply calculated prices
  const applyCalculatedPrices = () => {
    if (calculatedPrices) {
      setFormData({
        baseCostPrice: calculatedPrices.baseCostPrice,
        minSellingPrice: calculatedPrices.minSellingPrice,
        maxSellingPrice: calculatedPrices.maxSellingPrice
      });
      setCalculatedPrices(null);
    }
  };

  // Apply quick preset
  const applyQuickPreset = (preset) => {
    setFormData({
      baseCostPrice: formData.baseCostPrice,
      minSellingPrice: preset.minSellingPrice,
      maxSellingPrice: preset.maxSellingPrice
    });
  };

  const handleInputChange = (field, value) => {
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Recalculate presets if base cost changes
    if (field === 'baseCostPrice') {
      generateQuickPresets(numValue, formData.minSellingPrice, formData.maxSellingPrice);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.baseCostPrice && formData.baseCostPrice !== 0) {
      newErrors.baseCostPrice = 'Base cost price is required';
    }

    if (!formData.minSellingPrice && formData.minSellingPrice !== 0) {
      newErrors.minSellingPrice = 'Minimum selling price is required';
    }

    if (!formData.maxSellingPrice && formData.maxSellingPrice !== 0) {
      newErrors.maxSellingPrice = 'Maximum selling price is required';
    }

    if (formData.minSellingPrice > formData.maxSellingPrice) {
      newErrors.minSellingPrice = 'Minimum price cannot exceed maximum price';
    }

    if (formData.baseCostPrice > formData.maxSellingPrice) {
      newErrors.baseCostPrice = 'Base cost cannot exceed maximum price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await onPriceUpdate(product.id, {
        baseCostPrice: formData.baseCostPrice,
        minSellingPrice: formData.minSellingPrice,
        maxSellingPrice: formData.maxSellingPrice
      });
    } catch (error) {
      // Error is handled in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  const currentMargin = product.baseCostPrice && product.maxSellingPrice 
    ? ((product.maxSellingPrice - product.baseCostPrice) / product.baseCostPrice * 100).toFixed(1)
    : 0;

  const newMargin = formData.baseCostPrice && formData.maxSellingPrice 
    ? ((formData.maxSellingPrice - formData.baseCostPrice) / formData.baseCostPrice * 100).toFixed(1)
    : 0;

  const marginChange = parseFloat(newMargin) - parseFloat(currentMargin);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Pricing - ${product.name}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Product Info */}
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Fuel Code:</span>
              <div className="text-gray-900 font-semibold">{product.fuelCode}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Unit:</span>
              <div className="text-gray-900">{product.unit}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Current Margin:</span>
              <div className={`font-semibold ${
                currentMargin > 20 ? 'text-green-600' :
                currentMargin > 10 ? 'text-blue-600' :
                currentMargin > 0 ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {currentMargin}%
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <div>
                <Badge 
                  variant={
                    currentMargin > 20 ? 'success' :
                    currentMargin > 10 ? 'primary' :
                    currentMargin > 0 ? 'warning' : 'error'
                  }
                  size="sm"
                >
                  {currentMargin > 20 ? 'Profitable' :
                   currentMargin > 10 ? 'Good' :
                   currentMargin > 0 ? 'Low Margin' : 'Unprofitable'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Presets */}
        {quickPresets.length > 0 && (
          <Card className="p-4 border-purple-200 bg-purple-50">
            <h4 className="font-medium text-purple-900 flex items-center mb-3">
              <Zap className="w-4 h-4 mr-2" />
              Quick Pricing Presets
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {quickPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => applyQuickPreset(preset)}
                  className="p-3 text-left bg-white rounded border border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                >
                  <div className="font-medium text-purple-900 text-sm">{preset.label}</div>
                  <div className="text-xs text-purple-700">
                    ${preset.minSellingPrice.toFixed(2)} - ${preset.maxSellingPrice.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Pricing Calculator */}
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-blue-900 flex items-center">
              <Calculator className="w-4 h-4 mr-2" />
              Smart Pricing Calculator
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={calculateOptimalPricing}
              disabled={!formData.baseCostPrice}
            >
              Calculate Optimal
            </Button>
          </div>
          
          <div className="space-y-2 text-sm">
            <Input
              label="Base Cost Price"
              type="number"
              step="0.01"
              min="0"
              value={formData.baseCostPrice}
              onChange={(e) => handleInputChange('baseCostPrice', e.target.value)}
              placeholder="Enter base cost..."
              error={errors.baseCostPrice}
              size="sm"
              icon={DollarSign}
            />
          </div>

          {calculatedPrices && (
            <div className="mt-3 p-3 bg-white rounded border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Recommended Prices (15% margin):</span>
                <Button
                  size="sm"
                  variant="success"
                  onClick={applyCalculatedPrices}
                  icon={Check}
                >
                  Apply
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Min Price:</span>
                  <div className="font-medium text-green-600">${calculatedPrices.minSellingPrice.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Max Price:</span>
                  <div className="font-medium text-green-600">${calculatedPrices.maxSellingPrice.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Price Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Base Cost Price"
            type="number"
            step="0.01"
            min="0"
            value={formData.baseCostPrice}
            onChange={(e) => handleInputChange('baseCostPrice', e.target.value)}
            error={errors.baseCostPrice}
            required
            icon={DollarSign}
          />

          <Input
            label="Minimum Selling Price"
            type="number"
            step="0.01"
            min="0"
            value={formData.minSellingPrice}
            onChange={(e) => handleInputChange('minSellingPrice', e.target.value)}
            error={errors.minSellingPrice}
            required
            icon={TrendingDown}
          />

          <Input
            label="Maximum Selling Price"
            type="number"
            step="0.01"
            min="0"
            value={formData.maxSellingPrice}
            onChange={(e) => handleInputChange('maxSellingPrice', e.target.value)}
            error={errors.maxSellingPrice}
            required
            icon={TrendingUp}
          />
        </div>

        {/* Margin Summary */}
        <Card className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600">Current Margin</div>
              <div className={`text-lg font-bold ${
                currentMargin > 20 ? 'text-green-600' :
                currentMargin > 10 ? 'text-blue-600' :
                currentMargin > 0 ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {currentMargin}%
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-600">New Margin</div>
              <div className={`text-lg font-bold ${
                newMargin > 20 ? 'text-green-600' :
                newMargin > 10 ? 'text-blue-600' :
                newMargin > 0 ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {newMargin}%
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Change</div>
              <div className={`text-lg font-bold ${
                marginChange > 0 ? 'text-green-600' : 
                marginChange < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {marginChange > 0 ? '+' : ''}{marginChange.toFixed(1)}%
              </div>
            </div>
          </div>
        </Card>

        {/* Validation Errors */}
        {Object.keys(errors).length > 0 && (
          <Alert type="error">
            Please fix the validation errors above before submitting.
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="cosmic"
            onClick={handleSubmit}
            loading={isSubmitting}
            icon={Check}
          >
            Update Prices
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default FuelPriceUpdateModal;