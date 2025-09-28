import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Card, Input, Table, Alert, Badge, Switch } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { 
  Plus, X, Zap, Calendar, Clock, Users, Truck, ShoppingCart, 
  Percent, DollarSign, Filter, Target, TrendingUp, Shield,
  Smartphone, Monitor, Tablet
} from 'lucide-react';
import clsx from 'clsx';
import { pricingService } from '../../../../services/pricingService';

const CreatePriceListModal = ({ onClose, refreshPriceLists, editData }) => {
  const { state, dispatch } = useApp();
  const [step, setStep] = useState('basic-info'); // 'basic-info', 'items', 'rules', 'review'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Main price list data structure matching backend
  const [priceListData, setPriceListData] = useState({
    // Basic Information
    name: '',
    type: 'RETAIL',
    status: 'DRAFT',
    effectiveFrom: new Date().toISOString().slice(0, 16),
    effectiveTo: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 16),
    description: '',
    
    // Price List Items
    items: [],
    
    // Price Rules
    rules: [],
    
    // Station assignment
    stationId: ''
  });

  // Local state for UI
  const [newItem, setNewItem] = useState({
    productId: '',
    price: '',
    costPrice: '',
    minPrice: '',
    maxPrice: ''
  });
  
  const [newRule, setNewRule] = useState({
    name: '',
    conditionType: 'TIME_BASED',
    condition: {},
    adjustmentType: 'PERCENTAGE_DISCOUNT',
    adjustmentValue: '',
    priority: 1,
    isActive: true
  });

  const [activeCondition, setActiveCondition] = useState({});
  const [deviceType, setDeviceType] = useState('desktop'); // 'desktop', 'tablet', 'mobile'

  // Get current station and products
  const currentStation = state.currentStation?.id;
  const fuelProducts = state.products?.filter(product => product.type === 'FUEL') || [];

  // Detect device type for responsive layout
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) setDeviceType('mobile');
      else if (width < 1024) setDeviceType('tablet');
      else setDeviceType('desktop');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize edit data
  useEffect(() => {
    if (editData) {
      setPriceListData(editData);
      setStep('basic-info');
    }
  }, [editData]);

  // Handle basic input change
  const handleInputChange = (field, value) => {
    setPriceListData(prev => ({ 
      ...prev, 
      [field]: value 
    }));
  };

  // ==================== PRICE ITEMS MANAGEMENT ====================

  const addPriceItem = () => {
    if (!newItem.productId || !newItem.price) {
      setError('Product and price are required');
      return;
    }

    const product = fuelProducts.find(p => p.id === newItem.productId);
    const existingIndex = priceListData.items.findIndex(item => item.productId === newItem.productId);

    const itemData = {
      productId: newItem.productId,
      productName: product?.name || 'Unknown Product',
      fuelCode: product?.fuelCode || '',
      price: parseFloat(newItem.price),
      costPrice: newItem.costPrice ? parseFloat(newItem.costPrice) : undefined,
      minPrice: newItem.minPrice ? parseFloat(newItem.minPrice) : undefined,
      maxPrice: newItem.maxPrice ? parseFloat(newItem.maxPrice) : undefined
    };

    if (existingIndex >= 0) {
      // Update existing item
      const updatedItems = [...priceListData.items];
      updatedItems[existingIndex] = itemData;
      setPriceListData(prev => ({ ...prev, items: updatedItems }));
    } else {
      // Add new item
      setPriceListData(prev => ({ 
        ...prev, 
        items: [...prev.items, itemData] 
      }));
    }

    setNewItem({
      productId: '',
      price: '',
      costPrice: '',
      minPrice: '',
      maxPrice: ''
    });
    setError('');
  };

  const removePriceItem = (productId) => {
    setPriceListData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.productId !== productId)
    }));
  };

  // ==================== PRICE RULES MANAGEMENT ====================

  const handleConditionChange = (field, value) => {
    setActiveCondition(prev => ({ ...prev, [field]: value }));
  };

  const addPriceRule = () => {
    if (!newRule.name || !newRule.adjustmentValue) {
      setError('Rule name and adjustment value are required');
      return;
    }

    // Build condition based on type
    let condition = {};
    switch (newRule.conditionType) {
      case 'TIME_BASED':
        condition = {
          startTime: activeCondition.startTime || '00:00',
          endTime: activeCondition.endTime || '23:59'
        };
        break;
      case 'CUSTOMER_TYPE':
        condition = {
          customerTypes: activeCondition.customerTypes || ['RETAIL']
        };
        break;
      case 'VOLUME_BASED':
        condition = {
          minQuantity: parseInt(activeCondition.minQuantity) || 1
        };
        break;
      case 'PAYMENT_METHOD':
        condition = {
          paymentMethods: activeCondition.paymentMethods || ['CASH']
        };
        break;
    }

    const ruleData = {
      ...newRule,
      condition,
      adjustmentValue: parseFloat(newRule.adjustmentValue),
      priority: parseInt(newRule.priority)
    };

    setPriceListData(prev => ({
      ...prev,
      rules: [...prev.rules, ruleData]
    }));

    setNewRule({
      name: '',
      conditionType: 'TIME_BASED',
      condition: {},
      adjustmentType: 'PERCENTAGE_DISCOUNT',
      adjustmentValue: '',
      priority: prev.rules.length + 1,
      isActive: true
    });
    setActiveCondition({});
    setError('');
  };

  const removePriceRule = (index) => {
    setPriceListData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  // ==================== VALIDATION & CALCULATIONS ====================

  const validateStep = () => {
    switch (step) {
      case 'basic-info':
        return priceListData.name && priceListData.type && priceListData.effectiveFrom;
      
      case 'items':
        return priceListData.items.length > 0;
      
      case 'rules':
        return true; // Rules are optional
      
      case 'review':
        return priceListData.items.length > 0;
      
      default:
        return false;
    }
  };

  const calculateMargin = (costPrice, sellingPrice) => {
    if (!costPrice || !sellingPrice) return 0;
    return ((sellingPrice - costPrice) / costPrice) * 100;
  };

  const getPriceListTypeColor = (type) => {
    const colors = {
      RETAIL: 'bg-blue-100 text-blue-800',
      WHOLESALE: 'bg-green-100 text-green-800',
      FLEET: 'bg-purple-100 text-purple-800',
      PROMOTIONAL: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // ==================== API OPERATIONS ====================

  const savePriceList = async (status = 'DRAFT') => {
    setLoading(true);
    setError('');

    try {
      const submissionData = {
        ...priceListData,
        status: status,
        stationId: currentStation
      };

      let result;
      if (editData) {
        result = await pricingService.updatePriceList(editData.id, submissionData);
      } else {
        result = await pricingService.createPriceList(submissionData);
      }

      setSuccess(`Price list ${editData ? 'updated' : 'created'} successfully!`);
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { 
          type: 'success', 
          message: `Price list ${editData ? 'updated' : 'created'} successfully` 
        }
      });

      if (refreshPriceLists) refreshPriceLists();
      setTimeout(() => onClose(), 1500);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== RESPONSIVE LAYOUT COMPONENTS ====================

  const ResponsiveGrid = ({ children, className }) => (
    <div className={clsx(
      "grid gap-4",
      deviceType === 'mobile' ? "grid-cols-1" :
      deviceType === 'tablet' ? "grid-cols-2" : "grid-cols-3",
      className
    )}>
      {children}
    </div>
  );

  const DeviceIndicator = () => (
    <div className="flex items-center justify-center mb-4 p-2 bg-gray-100 rounded-lg">
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        {deviceType === 'mobile' && <Smartphone size={16} />}
        {deviceType === 'tablet' && <Tablet size={16} />}
        {deviceType === 'desktop' && <Monitor size={16} />}
        <span>Viewing on {deviceType}</span>
      </div>
    </div>
  );

  // ==================== CONDITION RENDERERS ====================

  const renderConditionFields = () => {
    switch (newRule.conditionType) {
      case 'TIME_BASED':
        return (
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Input
                label="Start Time"
                type="time"
                value={activeCondition.startTime || ''}
                onChange={(e) => handleConditionChange('startTime', e.target.value)}
                className="flex-1"
              />
              <Input
                label="End Time"
                type="time"
                value={activeCondition.endTime || ''}
                onChange={(e) => handleConditionChange('endTime', e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="text-xs text-gray-500">
              Applies between selected times
            </div>
          </div>
        );

      case 'CUSTOMER_TYPE':
        return (
          <div className="space-y-3">
            <Select
              label="Customer Types"
              value={activeCondition.customerTypes?.[0] || ''}
              onChange={(e) => handleConditionChange('customerTypes', [e.target.value])}
              options={[
                { value: 'RETAIL', label: 'Retail Customers' },
                { value: 'FLEET', label: 'Fleet Customers' },
                { value: 'CORPORATE', label: 'Corporate Customers' }
              ]}
              multiple={false}
            />
          </div>
        );

      case 'VOLUME_BASED':
        return (
          <div className="space-y-3">
            <Input
              label="Minimum Quantity (Liters)"
              type="number"
              value={activeCondition.minQuantity || ''}
              onChange={(e) => handleConditionChange('minQuantity', e.target.value)}
              placeholder="1000"
            />
            <div className="text-xs text-gray-500">
              Applies when purchase quantity meets minimum
            </div>
          </div>
        );

      case 'PAYMENT_METHOD':
        return (
          <div className="space-y-3">
            <Select
              label="Payment Methods"
              value={activeCondition.paymentMethods?.[0] || ''}
              onChange={(e) => handleConditionChange('paymentMethods', [e.target.value])}
              options={[
                { value: 'CASH', label: 'Cash' },
                { value: 'CARD', label: 'Card' },
                { value: 'MOBILE_MONEY', label: 'Mobile Money' }
              ]}
              multiple={false}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={editData ? "Edit Price List" : "Create New Price List"} 
      size="4xl"
    >
      <div className="space-y-6">
        {/* Device Indicator */}
        <DeviceIndicator />

        {error && (
          <Alert type="error" title="Error" message={error} onClose={() => setError('')} />
        )}

        {success && (
          <Alert type="success" title="Success" message={success} onClose={() => setSuccess('')} />
        )}

        {/* Progress Steps */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2">
            {['basic-info', 'items', 'rules', 'review'].map((s, index) => (
              <React.Fragment key={s}>
                <button
                  onClick={() => setStep(s)}
                  className={clsx(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 font-medium transition-all",
                    step === s ? "bg-blue-600 text-white border-blue-600" :
                    step > s ? "bg-green-500 text-white border-green-500" :
                    "bg-white text-gray-500 border-gray-300"
                  )}
                >
                  {index + 1}
                </button>
                {index < 3 && (
                  <div className={clsx(
                    "w-8 h-1 transition-all",
                    step > s ? "bg-green-500" : "bg-gray-200"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {step === 'basic-info' && (
          <Card title="1. Basic Information" icon={ShoppingCart}>
            <ResponsiveGrid className="mb-6">
              <Input
                label="Price List Name *"
                value={priceListData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="July 2024 Premium Pricing"
                icon={ShoppingCart}
                required
              />

              <Select
                label="Price List Type *"
                value={priceListData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                options={[
                  { value: 'RETAIL', label: 'Retail Pricing' },
                  { value: 'WHOLESALE', label: 'Wholesale Pricing' },
                  { value: 'FLEET', label: 'Fleet Pricing' },
                  { value: 'PROMOTIONAL', label: 'Promotional Pricing' }
                ]}
                icon={Target}
                required
              />

              <Select
                label="Initial Status"
                value={priceListData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' }
                ]}
                icon={Shield}
              />
            </ResponsiveGrid>

            <ResponsiveGrid className="mb-6">
              <Input
                label="Effective From *"
                type="datetime-local"
                value={priceListData.effectiveFrom}
                onChange={(e) => handleInputChange('effectiveFrom', e.target.value)}
                icon={Calendar}
                required
              />

              <Input
                label="Effective To"
                type="datetime-local"
                value={priceListData.effectiveTo}
                onChange={(e) => handleInputChange('effectiveTo', e.target.value)}
                icon={Calendar}
              />

              <div className="flex items-end">
                <Badge className={getPriceListTypeColor(priceListData.type)}>
                  {priceListData.type}
                </Badge>
              </div>
            </ResponsiveGrid>

            <Input
              label="Description"
              type="textarea"
              value={priceListData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the purpose and scope of this price list..."
              rows={3}
            />
          </Card>
        )}

        {/* Step 2: Price Items */}
        {step === 'items' && (
          <Card title="2. Price List Items" icon={DollarSign}>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Add Fuel Products</h3>
              <p className="text-sm text-blue-600">
                Set prices for each fuel product. You can add multiple products to this price list.
              </p>
            </div>

            {/* Add New Item Form */}
            <div className={clsx(
              "grid gap-4 mb-6 p-4 bg-gray-50 rounded-lg",
              deviceType === 'mobile' ? "grid-cols-1" : "grid-cols-5"
            )}>
              <Select
                label="Product"
                value={newItem.productId}
                onChange={(e) => setNewItem(prev => ({ ...prev, productId: e.target.value }))}
                options={[
                  { value: '', label: 'Select Product' },
                  ...fuelProducts.map(product => ({
                    value: product.id,
                    label: `${product.name} (${product.fuelCode})`
                  }))
                ]}
                className={deviceType === 'mobile' ? "col-span-1" : "col-span-2"}
              />

              <Input
                label="Selling Price *"
                type="number"
                value={newItem.price}
                onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                placeholder="210.00"
                step="0.01"
                icon={DollarSign}
                required
              />

              <Input
                label="Cost Price"
                type="number"
                value={newItem.costPrice}
                onChange={(e) => setNewItem(prev => ({ ...prev, costPrice: e.target.value }))}
                placeholder="179.50"
                step="0.01"
              />

              <div className="flex space-x-2">
                <Input
                  label="Min Price"
                  type="number"
                  value={newItem.minPrice}
                  onChange={(e) => setNewItem(prev => ({ ...prev, minPrice: e.target.value }))}
                  placeholder="200.00"
                  step="0.01"
                />

                <Input
                  label="Max Price"
                  type="number"
                  value={newItem.maxPrice}
                  onChange={(e) => setNewItem(prev => ({ ...prev, maxPrice: e.target.value }))}
                  placeholder="220.00"
                  step="0.01"
                />
              </div>

              <div className="flex items-end">
                <Button onClick={addPriceItem} className="w-full" disabled={!newItem.productId || !newItem.price}>
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Items Table */}
            {priceListData.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Range</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {priceListData.items.map((item, index) => (
                      <tr key={item.productId}>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                            <div className="text-xs text-gray-500">{item.fuelCode}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="text-sm font-bold text-green-600">
                            KES {item.price.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                          {item.costPrice ? `KES ${item.costPrice.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {item.costPrice && (
                            <span className={clsx(
                              "text-xs font-medium px-2 py-1 rounded-full",
                              calculateMargin(item.costPrice, item.price) >= 10 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            )}>
                              {calculateMargin(item.costPrice, item.price).toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                          {item.minPrice && item.maxPrice ? (
                            `${item.minPrice.toFixed(2)} - ${item.maxPrice.toFixed(2)}`
                          ) : 'Not set'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removePriceItem(item.productId)}
                          >
                            <X size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No products added yet. Add your first product above.</p>
              </div>
            )}
          </Card>
        )}

        {/* Step 3: Price Rules */}
        {step === 'rules' && (
          <Card title="3. Pricing Rules (Optional)" icon={Filter}>
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-2">Dynamic Pricing Rules</h3>
              <p className="text-sm text-purple-600">
                Create rules to automatically adjust prices based on conditions like time, customer type, or volume.
              </p>
            </div>

            {/* Add New Rule Form */}
            <div className="grid gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className={clsx(
                "grid gap-4",
                deviceType === 'mobile' ? "grid-cols-1" : "grid-cols-2"
              )}>
                <Input
                  label="Rule Name *"
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Early Bird Discount"
                  required
                />

                <Select
                  label="Condition Type"
                  value={newRule.conditionType}
                  onChange={(e) => setNewRule(prev => ({ ...prev, conditionType: e.target.value }))}
                  options={[
                    { value: 'TIME_BASED', label: 'Time Based' },
                    { value: 'CUSTOMER_TYPE', label: 'Customer Type' },
                    { value: 'VOLUME_BASED', label: 'Volume Based' },
                    { value: 'PAYMENT_METHOD', label: 'Payment Method' }
                  ]}
                />
              </div>

              {/* Condition Specific Fields */}
              {renderConditionFields()}

              <div className={clsx(
                "grid gap-4",
                deviceType === 'mobile' ? "grid-cols-1" : "grid-cols-3"
              )}>
                <Select
                  label="Adjustment Type"
                  value={newRule.adjustmentType}
                  onChange={(e) => setNewRule(prev => ({ ...prev, adjustmentType: e.target.value }))}
                  options={[
                    { value: 'PERCENTAGE_DISCOUNT', label: 'Percentage Discount' },
                    { value: 'FIXED_DISCOUNT', label: 'Fixed Discount' },
                    { value: 'PERCENTAGE_INCREASE', label: 'Percentage Increase' },
                    { value: 'FIXED_INCREASE', label: 'Fixed Increase' }
                  ]}
                />

                <Input
                  label="Adjustment Value *"
                  type="number"
                  value={newRule.adjustmentValue}
                  onChange={(e) => setNewRule(prev => ({ ...prev, adjustmentValue: e.target.value }))}
                  placeholder="5"
                  step="0.01"
                  icon={Percent}
                  required
                />

                <Input
                  label="Priority"
                  type="number"
                  value={newRule.priority}
                  onChange={(e) => setNewRule(prev => ({ ...prev, priority: e.target.value }))}
                  placeholder="1"
                  min="1"
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newRule.isActive}
                    onChange={(checked) => setNewRule(prev => ({ ...prev, isActive: checked }))}
                  />
                  <span className="text-sm">Active Rule</span>
                </div>

                <Button onClick={addPriceRule} disabled={!newRule.name || !newRule.adjustmentValue}>
                  <Plus size={16} className="mr-1" />
                  Add Rule
                </Button>
              </div>
            </div>

            {/* Rules List */}
            {priceListData.rules.length > 0 ? (
              <div className="space-y-3">
                {priceListData.rules.map((rule, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium">{rule.name}</span>
                          <Badge className={rule.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-800">
                            Priority: {rule.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {rule.conditionType} • {rule.adjustmentType.replace('_', ' ')}: {rule.adjustmentValue}
                          {rule.adjustmentType.includes('PERCENTAGE') ? '%' : ' KES'}
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removePriceRule(index)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Filter size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No rules added yet. Rules are optional but can enable dynamic pricing.</p>
              </div>
            )}
          </Card>
        )}

        {/* Step 4: Review & Submit */}
        {step === 'review' && (
          <Card title="4. Review & Submit" icon={Shield}>
            <div className="space-y-6">
              {/* Basic Info Summary */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-3">Price List Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>
                    <div>{priceListData.name}</div>
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>
                    <Badge className={getPriceListTypeColor(priceListData.type)}>
                      {priceListData.type}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <div>{priceListData.status}</div>
                  </div>
                  <div>
                    <span className="font-medium">Products:</span>
                    <div>{priceListData.items.length} products</div>
                  </div>
                </div>
              </div>

              {/* Products Summary */}
              <div>
                <h3 className="font-medium mb-3">Products & Pricing</h3>
                <div className="space-y-2">
                  {priceListData.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-gray-500">{item.fuelCode}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">KES {item.price.toFixed(2)}</div>
                        {item.costPrice && (
                          <div className="text-xs text-gray-500">
                            Margin: {calculateMargin(item.costPrice, item.price).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rules Summary */}
              {priceListData.rules.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Pricing Rules</h3>
                  <div className="space-y-2">
                    {priceListData.rules.map((rule, index) => (
                      <div key={index} className="p-3 border rounded bg-gray-50">
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-gray-600">
                          When: {rule.conditionType} • Apply: {rule.adjustmentValue}
                          {rule.adjustmentType.includes('PERCENTAGE') ? '%' : ' KES'} {rule.adjustmentType.split('_')[1].toLowerCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <Button
                  variant="success"
                  onClick={() => savePriceList('ACTIVE')}
                  loading={loading}
                  disabled={!validateStep()}
                  className="flex-1"
                >
                  <TrendingUp size={16} className="mr-2" />
                  {editData ? 'Update & Activate' : 'Create & Activate'}
                </Button>

                <Button
                  onClick={() => savePriceList('DRAFT')}
                  loading={loading}
                  disabled={!validateStep()}
                  className="flex-1"
                >
                  <Shield size={16} className="mr-2" />
                  {editData ? 'Update Draft' : 'Save as Draft'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="secondary"
            onClick={step === 'basic-info' ? onClose : () => {
              const steps = ['basic-info', 'items', 'rules', 'review'];
              const currentIndex = steps.indexOf(step);
              setStep(steps[currentIndex - 1]);
            }}
            disabled={loading}
          >
            {step === 'basic-info' ? 'Cancel' : 'Back'}
          </Button>

          {step !== 'review' && (
            <Button
              onClick={() => {
                const steps = ['basic-info', 'items', 'rules', 'review'];
                const currentIndex = steps.indexOf(step);
                setStep(steps[currentIndex + 1]);
              }}
              disabled={!validateStep() || loading}
            >
              Continue to {step === 'basic-info' ? 'Products' : step === 'items' ? 'Rules' : 'Review'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CreatePriceListModal;