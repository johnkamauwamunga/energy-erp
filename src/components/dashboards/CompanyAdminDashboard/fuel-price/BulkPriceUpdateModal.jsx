import React, { useState, useEffect } from 'react';
import { Upload, Download, Check, X, AlertCircle, DollarSign, Zap, Percent, Plus } from 'lucide-react';
import { Dialog, Button, Alert, Card, Input, Select1 as Select, Badge, Tooltip } from '../../../ui';
import { fuelPriceService } from '../../../../services/fuelPriceService/fuelPriceService';

const BulkPriceUpdateModal = ({ isOpen, onClose, products, onBulkUpdate }) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [priceUpdates, setPriceUpdates] = useState({});
  const [updateMethod, setUpdateMethod] = useState('percentage'); // 'percentage', 'fixed', 'absolute'
  const [updateValue, setUpdateValue] = useState('');
  const [targetField, setTargetField] = useState('both'); // 'min', 'max', 'both'
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedProducts([]);
      setPriceUpdates({});
      setUpdateMethod('percentage');
      setUpdateValue('');
      setTargetField('both');
      setErrors({});
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.fuelCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle product selection
  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Select all filtered products
  const selectAllFiltered = () => {
    setSelectedProducts(filteredProducts.map(p => p.id));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedProducts([]);
    setPriceUpdates({});
  };

  // Select products by status
  const selectByStatus = (status) => {
    const productsToSelect = filteredProducts
      .filter(product => product.priceStatus === status)
      .map(p => p.id);
    
    setSelectedProducts(prev => [...new Set([...prev, ...productsToSelect])]);
  };

  // Apply bulk update to selected products
  const applyBulkUpdate = () => {
    if (!updateValue) {
      setErrors({ updateValue: 'Update value is required' });
      return;
    }

    const value = parseFloat(updateValue);
    if (isNaN(value)) {
      setErrors({ updateValue: 'Please enter a valid number' });
      return;
    }

    const newUpdates = { ...priceUpdates };

    selectedProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      let newMinPrice = product.minSellingPrice || 0;
      let newMaxPrice = product.maxSellingPrice || 0;

      switch (updateMethod) {
        case 'percentage':
          if (targetField === 'min' || targetField === 'both') {
            newMinPrice = (product.minSellingPrice || 0) * (1 + value / 100);
          }
          if (targetField === 'max' || targetField === 'both') {
            newMaxPrice = (product.maxSellingPrice || 0) * (1 + value / 100);
          }
          break;
        case 'fixed':
          if (targetField === 'min' || targetField === 'both') {
            newMinPrice = (product.minSellingPrice || 0) + value;
          }
          if (targetField === 'max' || targetField === 'both') {
            newMaxPrice = (product.maxSellingPrice || 0) + value;
          }
          break;
        case 'absolute':
          if (targetField === 'min' || targetField === 'both') {
            newMinPrice = value;
          }
          if (targetField === 'max' || targetField === 'both') {
            newMaxPrice = value * 1.1; // Add 10% spread for max
          }
          break;
      }

      newUpdates[productId] = {
        minSellingPrice: Math.round(newMinPrice * 100) / 100,
        maxSellingPrice: Math.round(newMaxPrice * 100) / 100,
        baseCostPrice: product.baseCostPrice // Keep original base cost
      };
    });

    setPriceUpdates(newUpdates);
    setUpdateValue('');
    setErrors({});
  };

  // Handle individual price update
  const handleIndividualUpdate = (productId, field, value) => {
    setPriceUpdates(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value ? parseFloat(value) : 0
      }
    }));
  };

  // Validate updates before submission
  const validateUpdates = () => {
    const newErrors = {};
    
    Object.keys(priceUpdates).forEach(productId => {
      const update = priceUpdates[productId];
      const product = products.find(p => p.id === productId);

      if (!update.minSellingPrice && update.minSellingPrice !== 0) {
        newErrors[productId] = { ...newErrors[productId], minSellingPrice: 'Required' };
      }

      if (!update.maxSellingPrice && update.maxSellingPrice !== 0) {
        newErrors[productId] = { ...newErrors[productId], maxSellingPrice: 'Required' };
      }

      if (update.minSellingPrice > update.maxSellingPrice) {
        newErrors[productId] = { ...newErrors[productId], minSellingPrice: 'Cannot exceed max price' };
      }

      if (product?.baseCostPrice && update.maxSellingPrice < product.baseCostPrice) {
        newErrors[productId] = { ...newErrors[productId], maxSellingPrice: 'Below base cost' };
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit bulk updates
  const handleSubmit = async () => {
    if (Object.keys(priceUpdates).length === 0) {
      setErrors({ general: 'No price updates to apply' });
      return;
    }

    if (!validateUpdates()) return;

    setIsSubmitting(true);

    try {
      const updates = Object.keys(priceUpdates).map(productId => ({
        productId,
        ...priceUpdates[productId]
      }));

      await onBulkUpdate(updates);
    } catch (error) {
      // Error is handled in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick percentage buttons
  const quickPercentages = [5, 10, 15, -5, -10];

  // Apply quick percentage
  const applyQuickPercentage = (percentage) => {
    setUpdateMethod('percentage');
    setUpdateValue(percentage.toString());
    setTimeout(() => applyBulkUpdate(), 100);
  };

  const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
  const hasUpdates = Object.keys(priceUpdates).length > 0;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Price Update"
      size="xl"
    >
      <div className="space-y-6">
        {/* Bulk Update Controls */}
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
            {/* Search */}
            <div className="lg:col-span-2">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="sm"
              />
            </div>

            {/* Update Method */}
            <Select
              label="Update Method"
              value={updateMethod}
              onChange={(event) => setUpdateMethod(event.target.value)}
              options={[
                { value: 'percentage', label: 'Percentage %' },
                { value: 'fixed', label: 'Fixed Amount' },
                { value: 'absolute', label: 'Set Price' }
              ]}
              size="sm"
            />

            {/* Target Field */}
            <Select
              label="Target"
              value={targetField}
              onChange={(event) => setTargetField(event.target.value)}
              options={[
                { value: 'both', label: 'Min & Max' },
                { value: 'min', label: 'Min Only' },
                { value: 'max', label: 'Max Only' }
              ]}
              size="sm"
            />

            {/* Update Value */}
            <Input
              label={
                updateMethod === 'percentage' ? 'Change %' :
                updateMethod === 'fixed' ? 'Amount $' :
                'Price $'
              }
              type="number"
              step={updateMethod === 'percentage' ? '0.1' : '0.01'}
              value={updateValue}
              onChange={(e) => setUpdateValue(e.target.value)}
              error={errors.updateValue}
              placeholder={
                updateMethod === 'percentage' ? 'Enter %...' :
                updateMethod === 'fixed' ? 'Enter $...' :
                'Set price...'
              }
              size="sm"
            />
          </div>

          {/* Quick Percentage Buttons */}
          <div className="mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Quick Adjust:</span>
              {quickPercentages.map(percent => (
                <Button
                  key={percent}
                  onClick={() => applyQuickPercentage(percent)}
                  size="sm"
                  variant={percent > 0 ? "outline" : "secondary"}
                  className={percent > 0 ? "text-green-600 border-green-200" : "text-red-600 border-red-200"}
                >
                  {percent > 0 ? '+' : ''}{percent}%
                </Button>
              ))}
            </div>
          </div>

          {/* Selection Actions */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex space-x-2">
              <Button
                onClick={selectAllFiltered}
                variant="outline"
                size="sm"
              >
                Select All ({filteredProducts.length})
              </Button>
              <Button
                onClick={clearSelection}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={applyBulkUpdate}
                variant="cosmic"
                size="sm"
                disabled={selectedProducts.length === 0 || !updateValue}
                icon={Zap}
              >
                Apply to {selectedProducts.length} Selected
              </Button>
            </div>
          </div>

          {/* Quick Selection by Status */}
          <div className="mt-3 flex space-x-2">
            <span className="text-sm text-gray-600 self-center">Quick select:</span>
            <Button
              onClick={() => selectByStatus('no-pricing')}
              size="sm"
              variant="outline"
            >
              No Pricing
            </Button>
            <Button
              onClick={() => selectByStatus('unprofitable')}
              size="sm"
              variant="outline"
            >
              Unprofitable
            </Button>
            <Button
              onClick={() => selectByStatus('low-margin')}
              size="sm"
              variant="outline"
            >
              Low Margin
            </Button>
          </div>
        </Card>

        {/* Products List */}
        <div className="max-h-96 overflow-y-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium text-gray-700 w-8">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={selectAllFiltered}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left p-3 font-medium text-gray-700">Product</th>
                <th className="text-left p-3 font-medium text-gray-700">Current Prices</th>
                <th className="text-left p-3 font-medium text-gray-700">New Prices</th>
                <th className="text-left p-3 font-medium text-gray-700">Change</th>
                <th className="text-left p-3 font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.includes(product.id);
                const update = priceUpdates[product.id];
                const productErrors = errors[product.id] || {};
                const formattedProduct = fuelPriceService.formatProductForDisplay(product);

                return (
                  <tr key={product.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    {/* Selection Checkbox */}
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProductSelection(product.id)}
                        className="rounded border-gray-300"
                      />
                    </td>

                    {/* Product Info */}
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-gray-500 text-xs">{product.fuelCode} • {product.unit}</div>
                    </td>

                    {/* Current Prices */}
                    <td className="p-3">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Base: <span className="font-medium">${(product.baseCostPrice || 0).toFixed(2)}</span></div>
                        <div>Min: <span className="font-medium">${(product.minSellingPrice || 0).toFixed(2)}</span></div>
                        <div>Max: <span className="font-medium">${(product.maxSellingPrice || 0).toFixed(2)}</span></div>
                      </div>
                    </td>

                    {/* New Prices */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={update?.minSellingPrice || ''}
                          onChange={(e) => handleIndividualUpdate(product.id, 'minSellingPrice', e.target.value)}
                          placeholder="Min price"
                          size="xs"
                          error={productErrors.minSellingPrice}
                          className="w-24"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={update?.maxSellingPrice || ''}
                          onChange={(e) => handleIndividualUpdate(product.id, 'maxSellingPrice', e.target.value)}
                          placeholder="Max price"
                          size="xs"
                          error={productErrors.maxSellingPrice}
                          className="w-24"
                        />
                      </div>
                    </td>

                    {/* Change Indicator */}
                    <td className="p-3">
                      {update && (
                        <div className="text-xs space-y-1">
                          <div className={
                            (update.minSellingPrice || 0) > (product.minSellingPrice || 0) 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }>
                            Min: {((update.minSellingPrice || 0) - (product.minSellingPrice || 0)).toFixed(2)}
                          </div>
                          <div className={
                            (update.maxSellingPrice || 0) > (product.maxSellingPrice || 0) 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }>
                            Max: {((update.maxSellingPrice || 0) - (product.maxSellingPrice || 0)).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <Badge 
                        variant={formattedProduct.priceStatus === 'profitable' ? 'success' :
                                formattedProduct.priceStatus === 'good' ? 'primary' :
                                formattedProduct.priceStatus === 'low-margin' ? 'warning' :
                                formattedProduct.priceStatus === 'unprofitable' ? 'error' : 'secondary'}
                        size="sm"
                      >
                        {formattedProduct.marginDisplay}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {hasUpdates && (
          <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-green-900 text-lg">
                  Ready to update {Object.keys(priceUpdates).length} products
                </div>
                <div className="text-sm text-green-700">
                  Total changes: {Object.keys(priceUpdates).length} products • 
                  Review all changes before applying
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                variant="success"
                loading={isSubmitting}
                icon={Check}
                size="lg"
              >
                Apply {Object.keys(priceUpdates).length} Updates
              </Button>
            </div>
          </Card>
        )}

        {/* Errors */}
        {errors.general && (
          <Alert type="error">
            {errors.general}
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
          {hasUpdates && (
            <Button
              variant="cosmic"
              onClick={handleSubmit}
              loading={isSubmitting}
              icon={Check}
            >
              Update {Object.keys(priceUpdates).length} Products
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default BulkPriceUpdateModal;