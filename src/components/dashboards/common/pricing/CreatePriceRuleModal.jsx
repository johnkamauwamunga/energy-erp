import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Card, Input, Switch, Badge } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { Filter, Clock, Users, Truck, Percent, Plus, X } from 'lucide-react';
import { pricingService } from '../../../../services/pricingService';

const CreatePriceRuleModal = ({ isOpen, onClose, onPriceRuleCreated, editData }) => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [ruleData, setRuleData] = useState({
    name: '',
    conditionType: 'TIME_BASED',
    condition: {},
    adjustmentType: 'PERCENTAGE_DISCOUNT',
    adjustmentValue: '',
    priority: 1,
    isActive: true,
    priceListId: ''
  });

  const [activeCondition, setActiveCondition] = useState({});

  // Initialize form with edit data
  useEffect(() => {
    if (editData) {
      setRuleData(editData);
      setActiveCondition(editData.condition || {});
    } else {
      // Reset form for new rule
      setRuleData({
        name: '',
        conditionType: 'TIME_BASED',
        condition: {},
        adjustmentType: 'PERCENTAGE_DISCOUNT',
        adjustmentValue: '',
        priority: 1,
        isActive: true,
        priceListId: ''
      });
      setActiveCondition({});
    }
  }, [editData, isOpen]);

  const handleInputChange = (field, value) => {
    setRuleData(prev => ({ ...prev, [field]: value }));
  };

  const handleConditionChange = (field, value) => {
    setActiveCondition(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!ruleData.name || !ruleData.adjustmentValue) {
      setError('Rule name and adjustment value are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submissionData = {
        ...ruleData,
        condition: activeCondition
      };

      if (editData) {
        await pricingService.updatePriceRule(editData.id, submissionData);
      } else {
        await pricingService.addPriceRule(ruleData.priceListId, submissionData);
      }

      onPriceRuleCreated();
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderConditionFields = () => {
    switch (ruleData.conditionType) {
      case 'TIME_BASED':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={activeCondition.startTime || ''}
              onChange={(e) => handleConditionChange('startTime', e.target.value)}
            />
            <Input
              label="End Time"
              type="time"
              value={activeCondition.endTime || ''}
              onChange={(e) => handleConditionChange('endTime', e.target.value)}
            />
          </div>
        );

      case 'CUSTOMER_TYPE':
        return (
          <Select
            label="Customer Type"
            value={activeCondition.customerTypes?.[0] || ''}
            onChange={(e) => handleConditionChange('customerTypes', [e.target.value])}
            options={[
              { value: 'RETAIL', label: 'Retail Customers' },
              { value: 'FLEET', label: 'Fleet Customers' },
              { value: 'CORPORATE', label: 'Corporate Customers' }
            ]}
          />
        );

      case 'VOLUME_BASED':
        return (
          <Input
            label="Minimum Quantity (Liters)"
            type="number"
            value={activeCondition.minQuantity || ''}
            onChange={(e) => handleConditionChange('minQuantity', e.target.value)}
            placeholder="1000"
          />
        );

      case 'PAYMENT_METHOD':
        return (
          <Select
            label="Payment Method"
            value={activeCondition.paymentMethods?.[0] || ''}
            onChange={(e) => handleConditionChange('paymentMethods', [e.target.value])}
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'CARD', label: 'Card' },
              { value: 'MOBILE_MONEY', label: 'Mobile Money' }
            ]}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editData ? "Edit Price Rule" : "Create New Price Rule"}
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <Input
          label="Rule Name *"
          value={ruleData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Early Bird Discount"
        />

        <Select
          label="Condition Type"
          value={ruleData.conditionType}
          onChange={(e) => handleInputChange('conditionType', e.target.value)}
          options={[
            { value: 'TIME_BASED', label: 'Time Based' },
            { value: 'CUSTOMER_TYPE', label: 'Customer Type' },
            { value: 'VOLUME_BASED', label: 'Volume Based' },
            { value: 'PAYMENT_METHOD', label: 'Payment Method' }
          ]}
          icon={Filter}
        />

        {renderConditionFields()}

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Adjustment Type"
            value={ruleData.adjustmentType}
            onChange={(e) => handleInputChange('adjustmentType', e.target.value)}
            options={[
              { value: 'PERCENTAGE_DISCOUNT', label: 'Percentage Discount' },
              { value: 'FIXED_DISCOUNT', label: 'Fixed Discount' },
              { value: 'PERCENTAGE_INCREASE', label: 'Percentage Increase' },
              { value: 'FIXED_INCREASE', label: 'Fixed Increase' }
            ]}
            icon={Percent}
          />

          <Input
            label="Adjustment Value *"
            type="number"
            value={ruleData.adjustmentValue}
            onChange={(e) => handleInputChange('adjustmentValue', e.target.value)}
            placeholder="5"
            step="0.01"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Priority"
            type="number"
            value={ruleData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            min="1"
          />

          <div className="flex items-center space-x-2">
            <Switch
              checked={ruleData.isActive}
              onChange={(checked) => handleInputChange('isActive', checked)}
            />
            <span className="text-sm">Active Rule</span>
          </div>
        </div>

        <Select
          label="Apply to Price List"
          value={ruleData.priceListId}
          onChange={(e) => handleInputChange('priceListId', e.target.value)}
          options={[
            { value: '', label: 'Select Price List' },
            ...(state.priceLists || []).map(pl => ({
              value: pl.id,
              label: pl.name
            }))
          ]}
        />

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            loading={loading}
            disabled={!ruleData.name || !ruleData.adjustmentValue}
          >
            {editData ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreatePriceRuleModal;