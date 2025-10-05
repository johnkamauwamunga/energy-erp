// src/components/pricing/CreatePriceListModal.jsx
import React, { useState, useEffect } from 'react';
import { Input, Button, Select, Textarea, LoadingSpinner } from '../../ui';
import Dialog from '../../ui/Dialog';
import { useApp } from '../../context/AppContext';
import { pricingService, PRICE_LIST_TYPES } from '../../services/pricingService';
import { fuelService } from '../../services/fuelService';
import { Plus, Minus, DollarSign, Calendar, Tag, Users, AlertCircle } from 'lucide-react';

const CreatePriceListModal = ({ isOpen, onClose, priceList, onPriceListCreated, onPriceListUpdated }) => {
  const { state } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'RETAIL',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    items: [{
      productId: '',
      price: '',
      costPrice: '',
      minPrice: '',
      maxPrice: ''
    }]
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState('');

  const isEditMode = Boolean(priceList);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        // Load existing price list data
        setFormData({
          name: priceList.name || '',
          description: priceList.description || '',
          type: priceList.type || 'RETAIL',
          effectiveFrom: priceList.effectiveFrom ? new Date(priceList.effectiveFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          effectiveTo: priceList.effectiveTo ? new Date(priceList.effectiveTo).toISOString().split('T')[0] : '',
          items: priceList.items?.map(item => ({
            productId: item.productId,
            price: item.price || '',
            costPrice: item.costPrice || '',
            minPrice: item.minPrice || '',
            maxPrice: item.maxPrice || ''
          })) || [{
            productId: '',
            price: '',
            costPrice: '',
            minPrice: '',
            maxPrice: ''
          }]
        });
      } else {
        // Reset form for new price list
        setFormData({
          name: '',
          description: '',
          type: 'RETAIL',
          effectiveFrom: new Date().toISOString().split('T')[0],
          effectiveTo: '',
          items: [{
            productId: '',
            price: '',
            costPrice: '',
            minPrice: '',
            maxPrice: ''
          }]
        });
      }
      setErrors({});
      loadProducts();
    }
  }, [isOpen, isEditMode, priceList]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setProductError('');

      const productsData = await fuelService.getFuelProducts();
      setProducts(productsData.products || productsData || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProductError(error.message || 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate cost price if not set (20% margin)
    if (field === 'price' && value && !updatedItems[index].costPrice) {
      const price = parseFloat(value);
      if (!isNaN(price)) {
        updatedItems[index].costPrice = (price / 1.2).toFixed(2);
      }
    }
    
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: '',
        price: '',
        costPrice: '',
        minPrice: '',
        maxPrice: ''
      }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: updatedItems }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Price list name is required';
    }

    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = 'Effective from date is required';
    }

    if (formData.effectiveTo && new Date(formData.effectiveFrom) >= new Date(formData.effectiveTo)) {
      newErrors.effectiveTo = 'Effective to date must be after effective from date';
    }

    // Validate items
    const productIds = new Set();
    formData.items.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`items[${index}].productId`] = 'Product is required';
      } else if (productIds.has(item.productId)) {
        newErrors[`items[${index}].productId`] = 'Duplicate product';
      } else {
        productIds.add(item.productId);
      }
      
      if (!item.price || parseFloat(item.price) <= 0) {
        newErrors[`items[${index}].price`] = 'Valid price is required';
      }
      
      if (item.minPrice && item.maxPrice && parseFloat(item.minPrice) > parseFloat(item.maxPrice)) {
        newErrors[`items[${index}].minPrice`] = 'Min price cannot be greater than max price';
      }
      
      if (item.price && item.minPrice && parseFloat(item.price) < parseFloat(item.minPrice)) {
        newErrors[`items[${index}].price`] = 'Price cannot be less than minimum price';
      }
      
      if (item.price && item.maxPrice && parseFloat(item.price) > parseFloat(item.maxPrice)) {
        newErrors[`items[${index}].price`] = 'Price cannot be greater than maximum price';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          price: parseFloat(item.price),
          costPrice: item.costPrice ? parseFloat(item.costPrice) : undefined,
          minPrice: item.minPrice ? parseFloat(item.minPrice) : undefined,
          maxPrice: item.maxPrice ? parseFloat(item.maxPrice) : undefined
        }))
      };

      if (isEditMode) {
        await pricingService.updatePriceList(priceList.id, submitData);
        onPriceListUpdated();
      } else {
        await pricingService.createPriceList(submitData);
        onPriceListCreated();
      }
      onClose();
    } catch (error) {
      console.error('Failed to save price list:', error);
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: error.message || `Failed to ${isEditMode ? 'update' : 'create'} price list` });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? `${product.name} (${product.fuelCode})` : 'Unknown Product';
  };

  const getProductDetails = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return null;
    
    return {
      name: product.name,
      code: product.fuelCode,
      category: product.fuelSubType?.category?.name || 'N/A',
      subtype: product.fuelSubType?.name || 'N/A'
    };
  };

  const calculateTotals = () => {
    const validItems = formData.items.filter(item => item.productId && item.price);
    const totalProducts = validItems.length;
    const totalValue = validItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const averagePrice = totalProducts > 0 ? totalValue / totalProducts : 0;

    return {
      totalProducts,
      totalValue,
      averagePrice
    };
  };

  const totals = calculateTotals();

  return (
    <Dialog 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditMode ? 'Edit Price List' : 'Create New Price List'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="p-3 text-red-700 bg-red-100 rounded-md flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {errors.general}
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Price List Name *"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={errors.name}
            icon={Tag}
            placeholder="e.g., Summer Promotion 2024"
          />

          <Select
            label="Price List Type *"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            options={Object.entries(PRICE_LIST_TYPES).map(([key, value]) => ({
              value,
              label: value.charAt(0) + value.slice(1).toLowerCase()
            }))}
            icon={Users}
          />

          <Input
            label="Effective From *"
            type="date"
            value={formData.effectiveFrom}
            onChange={(e) => handleInputChange('effectiveFrom', e.target.value)}
            error={errors.effectiveFrom}
            icon={Calendar}
            min={new Date().toISOString().split('T')[0]}
          />

          <Input
            label="Effective To"
            type="date"
            value={formData.effectiveTo}
            onChange={(e) => handleInputChange('effectiveTo', e.target.value)}
            error={errors.effectiveTo}
            icon={Calendar}
            min={formData.effectiveFrom}
          />
        </div>

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe the purpose of this price list..."
          rows={3}
        />

        {/* Price List Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-gray-900">Price List Items</h4>
            <Button type="button" onClick={addItem} icon={Plus} size="sm">
              Add Product
            </Button>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          ) : productError ? (
            <div className="p-3 bg-red-100 text-red-700 rounded-md">
              {productError}
            </div>
          ) : (
            formData.items.map((item, index) => {
              const productDetails = getProductDetails(item.productId);
              
              return (
                <div key={index} className="border rounded-lg p-4 mb-4 relative bg-gray-50">
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeItem(index)}
                      variant="danger"
                      size="sm"
                      className="absolute top-2 right-2"
                      icon={Minus}
                    >
                      Remove
                    </Button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Select
                      label="Fuel Product *"
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      error={errors[`items[${index}].productId`]}
                      options={products.map(p => ({
                        value: p.id,
                        label: `${p.name} (${p.fuelCode})`
                      }))}
                      placeholder="Select a fuel product"
                    />

                    <Input
                      label="Price *"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      error={errors[`items[${index}].price`]}
                      icon={DollarSign}
                      placeholder="0.00"
                    />

                    <Input
                      label="Cost Price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.costPrice}
                      onChange={(e) => handleItemChange(index, 'costPrice', e.target.value)}
                      placeholder="Auto-calculated"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input
                      label="Min Price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.minPrice}
                      onChange={(e) => handleItemChange(index, 'minPrice', e.target.value)}
                      error={errors[`items[${index}].minPrice`]}
                      placeholder="Optional"
                    />

                    <Input
                      label="Max Price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.maxPrice}
                      onChange={(e) => handleItemChange(index, 'maxPrice', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  {productDetails && (
                    <div className="mt-3 p-3 bg-white rounded border text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Product:</span>
                        <span className="font-medium">{productDetails.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span>{productDetails.category} → {productDetails.subtype}</span>
                      </div>
                      {item.price && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Selling Price:</span>
                          <span className="font-medium text-green-600">
                            ${parseFloat(item.price).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {item.costPrice && item.price && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Margin:</span>
                          <span className={parseFloat(item.price) > parseFloat(item.costPrice) ? 'text-green-600' : 'text-red-600'}>
                            {((parseFloat(item.price) - parseFloat(item.costPrice)) / parseFloat(item.costPrice) * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <DollarSign className="w-4 h-4 mr-2" />
            Price List Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totals.totalProducts}</div>
              <div className="text-gray-600">Total Products</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${totals.averagePrice.toFixed(2)}
              </div>
              <div className="text-gray-600">Average Price</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${totals.totalValue.toFixed(2)}
              </div>
              <div className="text-gray-600">Total Value</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700">
                {isEditMode ? 'UPDATE' : 'NEW'}
              </div>
              <div className="text-gray-600">Status</div>
            </div>
          </div>
        </div>

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
            {isEditMode ? 'Update Price List' : 'Create Price List'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreatePriceListModal;