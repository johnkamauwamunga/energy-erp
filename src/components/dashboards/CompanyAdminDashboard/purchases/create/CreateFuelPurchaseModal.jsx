import React, { useState, useEffect } from 'react';
import { Input, Button, Select, LoadingSpinner } from '../../ui';
import Dialog from '../../ui/Dialog';
import { useApp } from '../../../context/AppContext';
import { fuelPurchaseService } from '../../../services/fuelPurchaseService';
import { supplierService } from '../../../services/supplierService';
import { stationService } from '../../../services/stationService';
import { productService } from '../../../services/productService';
import { Plus, Minus, Fuel, Truck, Calendar, DollarSign } from 'lucide-react';

const CreateFuelPurchaseModal = ({ isOpen, onClose, onPurchaseCreated }) => {
  const { state } = useApp();
  const [formData, setFormData] = useState({
    supplierId: '',
    warehouseId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    supplierRef: '',
    internalRef: '',
    termsAndConditions: '',
    deliveryAddress: '',
    notes: '',
    items: [{
      productId: '',
      quantity: '',
      unitCost: '',
      tankId: '',
      batchNumber: '',
      expiryDate: ''
    }]
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadFormData();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      supplierId: '',
      warehouseId: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      supplierRef: '',
      internalRef: '',
      termsAndConditions: '',
      deliveryAddress: '',
      notes: '',
      items: [{
        productId: '',
        quantity: '',
        unitCost: '',
        tankId: '',
        batchNumber: '',
        expiryDate: ''
      }]
    });
    setErrors({});
  };

  const loadFormData = async () => {
    setLoading(true);
    try {
      const [suppliersData, stationsData, productsData] = await Promise.all([
        supplierService.getSuppliers(),
        stationService.getCompanyStations(),
        productService.getProducts({ type: 'FUEL' })
      ]);

      setSuppliers(suppliersData || []);
      setStations(stationsData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Failed to load form data:', error);
    } finally {
      setLoading(false);
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
    
    // Calculate total cost if quantity or unitCost changes
    if (field === 'quantity' || field === 'unitCost') {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const unitCost = parseFloat(updatedItems[index].unitCost) || 0;
      updatedItems[index].totalCost = quantity * unitCost;
    }
    
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: '',
        quantity: '',
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.supplierId) newErrors.supplierId = 'Supplier is required';
    if (!formData.warehouseId) newErrors.warehouseId = 'Station/Warehouse is required';
    if (!formData.purchaseDate) newErrors.purchaseDate = 'Purchase date is required';

    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.productId) newErrors[`items[${index}].productId`] = 'Product is required';
      if (!item.quantity || parseFloat(item.quantity) <= 0) newErrors[`items[${index}].quantity`] = 'Valid quantity is required';
      if (!item.unitCost || parseFloat(item.unitCost) <= 0) newErrors[`items[${index}].unitCost`] = 'Valid unit cost is required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Prepare data for API
      const purchaseData = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity),
          unitCost: parseFloat(item.unitCost)
        }))
      };

      const response = await fuelPurchaseService.createFuelPurchase(purchaseData);
      onPurchaseCreated(response);
      onClose();
    } catch (error) {
      console.error('Failed to create fuel purchase:', error);
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: error.message || 'Failed to create fuel purchase' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load tanks when warehouse is selected
  useEffect(() => {
    const loadTanks = async () => {
      if (formData.warehouseId) {
        try {
          // You'll need to implement this service method
          // const tanksData = await tankService.getStationTanks(formData.warehouseId);
          // setTanks(tanksData || []);
        } catch (error) {
          console.error('Failed to load tanks:', error);
        }
      }
    };

    loadTanks();
  }, [formData.warehouseId]);

  if (loading) {
    return (
      <Dialog isOpen={isOpen} onClose={onClose} title="Create Fuel Purchase" size="lg">
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create Fuel Purchase" size="xl">
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
            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
          />

          <Select
            label="Station/Warehouse *"
            value={formData.warehouseId}
            onChange={(e) => handleInputChange('warehouseId', e.target.value)}
            error={errors.warehouseId}
            options={stations.map(s => ({ value: s.id, label: s.name }))}
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
            label="Expected Delivery Date"
            type="date"
            value={formData.expectedDeliveryDate}
            onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
            icon={Calendar}
          />

          <Input
            label="Supplier Reference"
            value={formData.supplierRef}
            onChange={(e) => handleInputChange('supplierRef', e.target.value)}
            placeholder="PO number from supplier"
          />

          <Input
            label="Internal Reference"
            value={formData.internalRef}
            onChange={(e) => handleInputChange('internalRef', e.target.value)}
            placeholder="Internal reference number"
          />
        </div>

        {/* Purchase Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-gray-900">Purchase Items</h4>
            <Button type="button" onClick={addItem} icon={Plus} size="sm">
              Add Item
            </Button>
          </div>

          {formData.items.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 mb-4 relative">
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  label="Fuel Product *"
                  value={item.productId}
                  onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                  error={errors[`items[${index}].productId`]}
                  options={products.map(p => ({ value: p.id, label: p.name }))}
                />

                <Input
                  label="Quantity (Liters) *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  error={errors[`items[${index}].quantity`]}
                />

                <Input
                  label="Unit Cost *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitCost}
                  onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                  error={errors[`items[${index}].unitCost`]}
                  icon={DollarSign}
                />

                <Input
                  label="Total Cost"
                  type="text"
                  value={item.totalCost ? `$${(item.totalCost).toFixed(2)}` : ''}
                  disabled
                  className="bg-gray-50"
                />

                <Select
                  label="Target Tank"
                  value={item.tankId}
                  onChange={(e) => handleItemChange(index, 'tankId', e.target.value)}
                  options={tanks.map(t => ({ value: t.id, label: t.name }))}
                  placeholder="Select tank"
                />

                <Input
                  label="Batch Number"
                  value={item.batchNumber}
                  onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)}
                  placeholder="Batch number"
                />

                <Input
                  label="Expiry Date"
                  type="date"
                  value={item.expiryDate}
                  onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Delivery Address"
            value={formData.deliveryAddress}
            onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
            placeholder="Delivery address for this purchase"
          />

          <Input
            label="Terms & Conditions"
            value={formData.termsAndConditions}
            onChange={(e) => handleInputChange('termsAndConditions', e.target.value)}
            placeholder="Special terms and conditions"
          />

          <Input
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes"
            multiline
            rows={3}
          />
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total Items:</div>
            <div className="text-right">{formData.items.length}</div>
            
            <div>Total Quantity:</div>
            <div className="text-right">
              {formData.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0).toFixed(2)} L
            </div>
            
            <div>Total Amount:</div>
            <div className="text-right font-medium">
              ${formData.items.reduce((sum, item) => sum + (parseFloat(item.totalCost) || 0), 0).toFixed(2)}
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
            Create Purchase Order
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateFuelPurchaseModal;