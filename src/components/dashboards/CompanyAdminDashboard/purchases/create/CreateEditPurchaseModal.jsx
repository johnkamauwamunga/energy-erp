// src/components/purchases/CreateEditPurchaseModal.js
import React, { useState, useEffect } from 'react';
import { Input, Button, Select, Textarea, LoadingSpinner,Dialog } from '../../../../ui';
import { useApp } from '../../../../../context/AppContext';
import { purchaseService } from '../../../../../services/purchaseService/purchaseService';
import { supplierService } from '../../../../../services/supplierService/supplierService';
import { fuelService } from '../../../../../services/fuelService/fuelService';
import { Plus, Minus, DollarSign, Calendar, Truck, Package, Search } from 'lucide-react';

const CreateEditPurchaseModal = ({ isOpen, onClose, purchase, onPurchaseCreated, onPurchaseUpdated }) => {
  const { state } = useApp();
  const [formData, setFormData] = useState({
    supplierId: '',
    stationId: '',
    warehouseId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    type: 'FUEL',
    expectedDeliveryDate: '',
    supplierRef: '',
    internalRef: '',
    termsAndConditions: '',
    deliveryAddress: '',
    notes: '',
    reference: '',
    items: [{
      productId: '',
      orderedQty: '',
      unitCost: '',
      tankId: '',
      batchNumber: '',
      expiryDate: ''
    }]
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  const isEditMode = Boolean(purchase);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      loadProducts();
      loadTanks();
      loadWarehouses();

      if (isEditMode) {
        setFormData({
          supplierId: purchase.supplierId || '',
          stationId: purchase.stationId || '',
          warehouseId: purchase.warehouseId || '',
          purchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          expectedDate: purchase.expectedDate ? new Date(purchase.expectedDate).toISOString().split('T')[0] : '',
          type: purchase.type || 'FUEL',
          expectedDeliveryDate: purchase.expectedDeliveryDate ? new Date(purchase.expectedDeliveryDate).toISOString().split('T')[0] : '',
          supplierRef: purchase.supplierRef || '',
          internalRef: purchase.internalRef || '',
          termsAndConditions: purchase.termsAndConditions || '',
          deliveryAddress: purchase.deliveryAddress || '',
          notes: purchase.notes || '',
          reference: purchase.reference || '',
          items: purchase.items?.map(item => ({
            productId: item.productId,
            orderedQty: item.orderedQty || '',
            unitCost: item.unitCost || '',
            tankId: item.tankId || '',
            batchNumber: item.batchNumber || '',
            expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : ''
          })) || [{
            productId: '',
            orderedQty: '',
            unitCost: '',
            tankId: '',
            batchNumber: '',
            expiryDate: ''
          }]
        });
      }
      setErrors({});
    }
  }, [isOpen, isEditMode, purchase]);

  const loadSuppliers = async () => {
    try {
      const suppliersData = await supplierService.getSuppliers({ status: 'ACTIVE' });
      setSuppliers(suppliersData.data || suppliersData || []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const productsData = await fuelService.getFuelProducts();
      setProducts(productsData.products || productsData.data || productsData || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadTanks = async () => {
    // This would typically come from a tank service
    // Mock data for demonstration
    setTanks([
      { id: 'tank-1', name: 'Main Diesel Tank', capacity: 10000 },
      { id: 'tank-2', name: 'Premium Petrol Tank', capacity: 8000 },
      { id: 'tank-3', name: 'Regular Petrol Tank', capacity: 8000 }
    ]);
  };

  const loadWarehouses = async () => {
    // This would typically come from a warehouse service
    // Mock data for demonstration
    setWarehouses([
      { id: 'wh-1', name: 'Main Warehouse' },
      { id: 'wh-2', name: 'Spare Parts Storage' }
    ]);
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
    
    // Auto-calculate total if both quantity and unit cost are provided
    if ((field === 'orderedQty' || field === 'unitCost') && updatedItems[index].orderedQty && updatedItems[index].unitCost) {
      updatedItems[index].totalCost = parseFloat(updatedItems[index].orderedQty) * parseFloat(updatedItems[index].unitCost);
    }
    
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: '',
        orderedQty: '',
        unitCost: '',
        tankId: '',
        batchNumber: '',
        expiryDate: ''
      }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: updatedItems }));
    }
  };

  const getProductById = (productId) => {
    return products.find(p => p.id === productId);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required';
    }

    if (!formData.stationId) {
      newErrors.stationId = 'Station is required';
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    }

    if (!formData.type) {
      newErrors.type = 'Purchase type is required';
    }

    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`items[${index}].productId`] = 'Product is required';
      }
      if (!item.orderedQty || parseFloat(item.orderedQty) <= 0) {
        newErrors[`items[${index}].orderedQty`] = 'Valid quantity is required';
      }
      if (!item.unitCost || parseFloat(item.unitCost) <= 0) {
        newErrors[`items[${index}].unitCost`] = 'Valid unit cost is required';
      }

      // Fuel-specific validations
      if (formData.type === 'FUEL' && !item.tankId) {
        newErrors[`items[${index}].tankId`] = 'Tank selection is required for fuel products';
      }

      // Non-fuel validations
      if (formData.type === 'NON_FUEL') {
        if (!item.batchNumber) {
          newErrors[`items[${index}].batchNumber`] = 'Batch number is required for non-fuel items';
        }
        if (!item.expiryDate) {
          newErrors[`items[${index}].expiryDate`] = 'Expiry date is required for non-fuel items';
        }
      }
    });

    // Warehouse validation for non-fuel
    if (formData.type === 'NON_FUEL' && !formData.warehouseId) {
      newErrors.warehouseId = 'Warehouse is required for non-fuel purchases';
    }

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
        companyId: state.currentUser.companyId
      };

      if (isEditMode) {
        await purchaseService.updatePurchase({
          ...submitData,
          id: purchase.id
        });
        onPurchaseUpdated();
      } else {
        await purchaseService.createPurchase(submitData);
        onPurchaseCreated();
      }
      onClose();
    } catch (error) {
      console.error('Failed to save purchase:', error);
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: error.message || `Failed to ${isEditMode ? 'update' : 'create'} purchase` });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      return total + (parseFloat(item.orderedQty) * parseFloat(item.unitCost) || 0);
    }, 0);
  };

  return (
    <Dialog 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditMode ? 'Edit Purchase Order' : 'Create New Purchase Order'}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="p-3 text-red-700 bg-red-100 rounded-md">
            {errors.general}
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Supplier *"
            value={formData.supplierId}
            onChange={(e) => handleInputChange('supplierId', e.target.value)}
            error={errors.supplierId}
            options={suppliers.map(s => ({
              value: s.id,
              label: `${s.name} (${s.code})`
            }))}
            icon={Truck}
          />

          <Select
            label="Purchase Type *"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            error={errors.type}
            options={[
              { value: 'FUEL', label: 'Fuel' },
              { value: 'NON_FUEL', label: 'Non-Fuel' },
              { value: 'MIXED', label: 'Mixed' }
            ]}
            icon={Package}
          />

          <Input
            label="Purchase Date *"
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
            error={errors.purchaseDate}
            icon={Calendar}
          />

          <Input
            label="Expected Date"
            type="date"
            value={formData.expectedDate}
            onChange={(e) => handleInputChange('expectedDate', e.target.value)}
            icon={Calendar}
          />

          {formData.type === 'NON_FUEL' && (
            <Select
              label="Warehouse *"
              value={formData.warehouseId}
              onChange={(e) => handleInputChange('warehouseId', e.target.value)}
              error={errors.warehouseId}
              options={warehouses.map(w => ({
                value: w.id,
                label: w.name
              }))}
            />
          )}

          <Input
            label="Reference"
            value={formData.reference}
            onChange={(e) => handleInputChange('reference', e.target.value)}
            placeholder="Internal reference number"
          />
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Supplier Reference"
            value={formData.supplierRef}
            onChange={(e) => handleInputChange('supplierRef', e.target.value)}
            placeholder="Supplier's reference number"
          />

          <Input
            label="Delivery Address"
            value={formData.deliveryAddress}
            onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
            placeholder="Delivery location"
          />
        </div>

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Additional notes or instructions..."
          rows={2}
        />

        {/* Purchase Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-gray-900">Purchase Items</h4>
            <Button type="button" onClick={addItem} icon={Plus} size="sm">
              Add Item
            </Button>
          </div>

          {formData.items.map((item, index) => (
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
                  label="Product *"
                  value={item.productId}
                  onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                  error={errors[`items[${index}].productId`]}
                  options={products.map(p => ({
                    value: p.id,
                    label: `${p.name} (${p.fuelCode})`
                  }))}
                  placeholder="Select a product"
                />

                <Input
                  label="Quantity *"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.orderedQty}
                  onChange={(e) => handleItemChange(index, 'orderedQty', e.target.value)}
                  error={errors[`items[${index}].orderedQty`]}
                  placeholder="0.00"
                />

                <Input
                  label="Unit Cost *"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                  error={errors[`items[${index}].unitCost`]}
                  icon={DollarSign}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {formData.type === 'FUEL' && (
                  <Select
                    label="Tank *"
                    value={item.tankId}
                    onChange={(e) => handleItemChange(index, 'tankId', e.target.value)}
                    error={errors[`items[${index}].tankId`]}
                    options={tanks.map(t => ({
                      value: t.id,
                      label: `${t.name} (${t.capacity}L)`
                    }))}
                    placeholder="Select tank"
                  />
                )}

                {formData.type === 'NON_FUEL' && (
                  <>
                    <Input
                      label="Batch Number *"
                      value={item.batchNumber}
                      onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)}
                      error={errors[`items[${index}].batchNumber`]}
                      placeholder="Batch number"
                    />

                    <Input
                      label="Expiry Date *"
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                      error={errors[`items[${index}].expiryDate`]}
                    />
                  </>
                )}
              </div>

              {item.productId && (
                <div className="mt-2 p-2 bg-white rounded border text-sm">
                  <div className="text-gray-600">
                    Product: {getProductById(item.productId)?.name}
                  </div>
                  {item.orderedQty && item.unitCost && (
                    <div className="font-medium text-green-600">
                      Line Total: ${(parseFloat(item.orderedQty) * parseFloat(item.unitCost)).toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Purchase Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total Items:</div>
            <div className="text-right">{formData.items.filter(item => item.productId).length}</div>
            
            <div>Total Quantity:</div>
            <div className="text-right">
              {formData.items.reduce((sum, item) => sum + (parseFloat(item.orderedQty) || 0), 0).toFixed(2)}
            </div>
            
            <div className="font-medium">Total Amount:</div>
            <div className="text-right font-bold text-green-600">
              ${calculateTotal().toFixed(2)}
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
            {isEditMode ? 'Update Purchase Order' : 'Create Purchase Order'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateEditPurchaseModal;