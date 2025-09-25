// src/components/fuel-pricing/CreateEditPriceListModal.js
import React, { useState, useEffect } from 'react';
import { Input, Button, Select, Textarea, LoadingSpinner } from '../../ui';
import Dialog from '../../ui/Dialog';
import { useApp } from '../../context/AppContext';
import { fuelPriceService, PRICE_LIST_TYPES } from '../../services/fuelPriceService';
import { productService } from '../../services/productService';
import { Plus, Minus, DollarSign, Calendar, Tag, Users } from 'lucide-react';

const CreateEditPriceListModal = ({ isOpen, onClose, priceList, onPriceListCreated, onPriceListUpdated }) => {
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
      maxPrice: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: ''
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
            maxPrice: item.maxPrice || '',
            effectiveFrom: item.effectiveFrom ? new Date(item.effectiveFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            effectiveTo: item.effectiveTo ? new Date(item.effectiveTo).toISOString().split('T')[0] : ''
          })) || [{
            productId: '',
            price: '',
            costPrice: '',
            minPrice: '',
            maxPrice: '',
            effectiveFrom: new Date().toISOString().split('T')[0],
            effectiveTo: ''
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
            maxPrice: '',
            effectiveFrom: new Date().toISOString().split('T')[0],
            effectiveTo: ''
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

      const productsData = await productService.getProducts({ type: 'FUEL' });
      setProducts(productsData.data || []);
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
        maxPrice: '',
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo
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
    formData.items.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`items[${index}].productId`] = 'Product is required';
      }
      if (!item.price || parseFloat(item.price) <= 0) {
        newErrors[`items[${index}].price`] = 'Valid price is required';
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
      if (isEditMode) {
        await fuelPriceService.updatePriceList(priceList.id, formData);
        onPriceListUpdated();
      } else {
        await fuelPriceService.createPriceList({
          ...formData,
          companyId: state.currentUser.companyId,
          createdById: state.currentUser.id
        });
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

  return (
    <Dialog 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditMode ? 'Edit Price List' : 'Create New Price List'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="p-3 text-red-700 bg-red-100 rounded-md">
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
          />

          <Select
            label="Price List Type *"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            options={Object.entries(PRICE_LIST_TYPES).map(([key, value]) => ({
              value,
              label: value
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
          />

          <Input
            label="Effective To"
            type="date"
            value={formData.effectiveTo}
            onChange={(e) => handleInputChange('effectiveTo', e.target.value)}
            error={errors.effectiveTo}
            icon={Calendar}
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
            formData.items.map((item, index) => (
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                  <Input
                    label="Min Price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.minPrice}
                    onChange={(e) => handleItemChange(index, 'minPrice', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Max Price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.maxPrice}
                    onChange={(e) => handleItemChange(index, 'maxPrice', e.target.value)}
                  />

                  <Input
                    label="Item Effective From"
                    type="date"
                    value={item.effectiveFrom}
                    onChange={(e) => handleItemChange(index, 'effectiveFrom', e.target.value)}
                  />
                </div>

                {item.productId && (
                  <div className="mt-2 p-2 bg-white rounded border text-sm">
                    <div className="text-gray-600">
                      Product: {getProductName(item.productId)}
                    </div>
                    {item.price && (
                      <div className="font-medium text-green-600">
                        Selling Price: ${parseFloat(item.price).toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Price List Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total Products:</div>
            <div className="text-right">{formData.items.filter(item => item.productId).length}</div>
            
            <div>Average Price:</div>
            <div className="text-right">
              ${(formData.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0) / formData.items.length || 1).toFixed(2)}
            </div>
            
            <div>Status:</div>
            <div className="text-right font-medium">
              {isEditMode ? 'Updating existing price list' : 'Creating new price list'}
            </div>
          </div>
        </div>

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
            {isEditMode ? 'Update Price List' : 'Create Price List'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateEditPriceListModal;