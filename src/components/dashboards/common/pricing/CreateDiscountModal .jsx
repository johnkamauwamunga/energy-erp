import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Card, Input, Switch, Badge } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { Percent, Clock, Calendar, Users, Target, Plus } from 'lucide-react';

const CreateDiscountModal = ({ isOpen, onClose, onDiscountCreated, editData }) => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [discountData, setDiscountData] = useState({
    name: '',
    type: 'PERCENTAGE',
    value: '',
    isPercentage: true,
    products: [],
    startTime: '',
    endTime: '',
    isActive: true,
    maxUses: '',
    customerType: 'ALL'
  });

  const [selectedProducts, setSelectedProducts] = useState([]);

  // Initialize form with edit data
  useEffect(() => {
    if (editData) {
      setDiscountData(editData);
      setSelectedProducts(editData.products || []);
    }
  }, [editData, isOpen]);

  const handleInputChange = (field, value) => {
    setDiscountData(prev => ({ ...prev, [field]: value }));
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = async () => {
    if (!discountData.name || !discountData.value) {
      setError('Discount name and value are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submissionData = {
        ...discountData,
        products: selectedProducts,
        isPercentage: discountData.type === 'PERCENTAGE'
      };

      // Here you would call your discount service
      // await discountService.createDiscount(submissionData);
      
      onDiscountCreated();
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fuelProducts = state.products?.filter(p => p.type === 'FUEL') || [];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editData ? "Edit Discount" : "Create New Discount"}
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <Input
          label="Discount Name *"
          value={discountData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Weekend Special"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Discount Type"
            value={discountData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            options={[
              { value: 'PERCENTAGE', label: 'Percentage' },
              { value: 'FIXED', label: 'Fixed Amount' }
            ]}
            icon={Percent}
          />

          <Input
            label="Discount Value *"
            type="number"
            value={discountData.value}
            onChange={(e) => handleInputChange('value', e.target.value)}
            placeholder={discountData.type === 'PERCENTAGE' ? '5' : '10'}
            step="0.01"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Time"
            type="time"
            value={discountData.startTime}
            onChange={(e) => handleInputChange('startTime', e.target.value)}
            icon={Clock}
          />

          <Input
            label="End Time"
            type="time"
            value={discountData.endTime}
            onChange={(e) => handleInputChange('endTime', e.target.value)}
            icon={Clock}
          />
        </div>

        <Select
          label="Customer Type"
          value={discountData.customerType}
          onChange={(e) => handleInputChange('customerType', e.target.value)}
          options={[
            { value: 'ALL', label: 'All Customers' },
            { value: 'RETAIL', label: 'Retail Only' },
            { value: 'FLEET', label: 'Fleet Only' },
            { value: 'CORPORATE', label: 'Corporate Only' }
          ]}
          icon={Users}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Applicable Products
          </label>
          <div className="border rounded p-3 max-h-40 overflow-y-auto">
            {fuelProducts.map(product => (
              <div key={product.id} className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => toggleProductSelection(product.id)}
                  className="rounded"
                />
                <span className="text-sm">{product.name} ({product.fuelCode})</span>
              </div>
            ))}
            {fuelProducts.length === 0 && (
              <p className="text-sm text-gray-500">No fuel products available</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Maximum Uses (Optional)"
            type="number"
            value={discountData.maxUses}
            onChange={(e) => handleInputChange('maxUses', e.target.value)}
            placeholder="Unlimited"
            min="1"
          />

          <div className="flex items-center space-x-2">
            <Switch
              checked={discountData.isActive}
              onChange={(checked) => handleInputChange('isActive', checked)}
            />
            <span className="text-sm">Active Discount</span>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            loading={loading}
            disabled={!discountData.name || !discountData.value}
            variant="success"
          >
            {editData ? 'Update Discount' : 'Create Discount'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateDiscountModal;