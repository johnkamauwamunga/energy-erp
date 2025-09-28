import React, { useState, useEffect } from 'react';
import { Button, Card, Tabs, Tab, Badge, Alert, Modal, Input, Select, Switch } from '../../ui';
import CreatePriceListModal from './CreatePriceListModal';
import { 
  DollarSign, Filter, Clock, Users, Zap, Plus, Edit, Trash2, 
  ShoppingCart, TrendingUp, Shield, Calendar, Target 
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../../utils/helpers';
import { useApp } from '../../../context/AppContext';
import { pricingService } from '../../../services/pricingService';

const PricingManagement = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('price-lists');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [priceLists, setPriceLists] = useState([]);
  const [priceRules, setPriceRules] = useState([]);
  const [currentDiscounts, setCurrentDiscounts] = useState([]);
  const [priceAnalytics, setPriceAnalytics] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Fetch all pricing data
  const fetchPricingData = async () => {
    setIsLoading(true);
    try {
      // Fetch price lists
      const listsResponse = await pricingService.getPriceLists({ 
        page: 1, 
        limit: 100 
      });
      setPriceLists(listsResponse.priceLists || []);

      // Extract all rules from price lists
      const allRules = listsResponse.priceLists.flatMap(list => 
        (list.rules || []).map(rule => ({ ...rule, priceListName: list.name }))
      );
      setPriceRules(allRules);

      // Fetch current prices for analytics
      const currentPrices = await pricingService.getCurrentPrices();
      setCurrentDiscounts(currentPrices.filter(price => price.finalPrice < price.basePrice));

      // Calculate basic analytics
      calculateAnalytics(listsResponse.priceLists, currentPrices);

      console.log("✅ Pricing data loaded successfully");
    } catch (error) {
      console.error('❌ Failed to fetch pricing data:', error);
      showAlert('error', 'Failed to load pricing data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate pricing analytics
  const calculateAnalytics = (lists, prices) => {
    const activeLists = lists.filter(list => list.status === 'ACTIVE');
    const totalProducts = prices.length;
    const averageMargin = prices.reduce((acc, price) => {
      if (price.costPrice && price.price) {
        const margin = ((price.price - price.costPrice) / price.costPrice) * 100;
        return acc + margin;
      }
      return acc;
    }, 0) / totalProducts;

    setPriceAnalytics({
      activePriceLists: activeLists.length,
      totalProducts,
      averageMargin: averageMargin.toFixed(1),
      totalDiscounts: currentDiscounts.length
    });
  };

  // Show alert message
  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  // Handle price list actions
  const handleEditPriceList = (priceList) => {
    setSelectedItem(priceList);
    setIsEditModalOpen(true);
  };

  const handleDeletePriceList = (priceList) => {
    setSelectedItem(priceList);
    setIsDeleteModalOpen(true);
  };

  const confirmDeletePriceList = async () => {
    if (!selectedItem) return;

    try {
      await pricingService.deletePriceList(selectedItem.id);
      showAlert('success', 'Price list deleted successfully');
      fetchPricingData();
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      showAlert('error', 'Failed to delete price list');
    }
  };

  const handleTogglePriceListStatus = async (priceList, newStatus) => {
    try {
      await pricingService.updatePriceList(priceList.id, { status: newStatus });
      showAlert('success', `Price list ${newStatus.toLowerCase()} successfully`);
      fetchPricingData();
    } catch (error) {
      showAlert('error', 'Failed to update price list status');
    }
  };

  // Handle discount creation
  const handleCreateDiscount = async (discountData) => {
    try {
      // Find or create a promotional price list
      let promotionalList = priceLists.find(list => list.type === 'PROMOTIONAL' && list.status === 'ACTIVE');
      
      if (!promotionalList) {
        promotionalList = await pricingService.createPriceList({
          name: `Promotional Discounts ${new Date().getFullYear()}`,
          type: 'PROMOTIONAL',
          status: 'ACTIVE',
          effectiveFrom: new Date().toISOString(),
          description: 'Automatically created for discount management'
        });
      }

      // Add discount as a price rule
      await pricingService.addPriceRule(promotionalList.id, discountData);
      showAlert('success', 'Discount created successfully');
      setIsDiscountModalOpen(false);
      fetchPricingData();
    } catch (error) {
      showAlert('error', 'Failed to create discount');
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchPricingData();
  }, []);

  // ==================== TAB CONTENT COMPONENTS ====================

  // Tab 1: Price Lists
  const PriceListsTab = () => (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-blue-600">{priceAnalytics.activePriceLists || 0}</div>
          <div className="text-sm text-gray-600">Active Price Lists</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-green-600">{priceAnalytics.totalProducts || 0}</div>
          <div className="text-sm text-gray-600">Products Priced</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-purple-600">{priceAnalytics.averageMargin || '0'}%</div>
          <div className="text-sm text-gray-600">Avg Margin</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-orange-600">{priceAnalytics.totalDiscounts || 0}</div>
          <div className="text-sm text-gray-600">Active Discounts</div>
        </Card>
      </div>

      {/* Filters */}
      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Status"
            options={[
              { value: '', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'INACTIVE', label: 'Inactive' }
            ]}
          />
          <Select
            label="Type"
            options={[
              { value: '', label: 'All Types' },
              { value: 'RETAIL', label: 'Retail' },
              { value: 'WHOLESALE', label: 'Wholesale' },
              { value: 'FLEET', label: 'Fleet' },
              { value: 'PROMOTIONAL', label: 'Promotional' }
            ]}
          />
          <Input
            label="Search"
            placeholder="Search price lists..."
            icon={Filter}
          />
          <div className="flex items-end">
            <Button variant="secondary" className="w-full">
              <Filter size={16} className="mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Price Lists Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rules</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {priceLists.map(priceList => (
                <tr key={priceList.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{priceList.name}</div>
                    <div className="text-sm text-gray-500">{priceList.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getPriceListTypeColor(priceList.type)}>
                      {priceList.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusVariant(priceList.status)}>
                        {priceList.status}
                      </Badge>
                      <Switch
                        checked={priceList.status === 'ACTIVE'}
                        onChange={(checked) => handleTogglePriceListStatus(
                          priceList, 
                          checked ? 'ACTIVE' : 'INACTIVE'
                        )}
                        size="sm"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {priceList.items?.length || 0} products
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div>{formatDate(priceList.effectiveFrom)}</div>
                    <div>to {formatDate(priceList.effectiveTo) || 'No end'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">
                      {priceList.rules?.length || 0} rules
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleEditPriceList(priceList)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger"
                        onClick={() => handleDeletePriceList(priceList)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {priceLists.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No price lists found. Create your first price list to get started.</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8 text-gray-500">
            Loading price lists...
          </div>
        )}
      </Card>
    </div>
  );

  // Tab 2: Price Rules
  const PriceRulesTab = () => (
    <div className="space-y-6">
      <Card title="Active Price Rules" icon={Zap}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adjustment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price List</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {priceRules.map((rule, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{rule.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatCondition(rule.conditionType, rule.condition)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={
                      rule.adjustmentType.includes('DISCOUNT') 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }>
                      {rule.adjustmentValue}
                      {rule.adjustmentType.includes('PERCENTAGE') ? '%' : ' KES'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {rule.priceListName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">P{rule.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={rule.isActive ? 'success' : 'warning'}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="secondary">
                        <Edit size={14} />
                      </Button>
                      <Button size="sm" variant="danger">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {priceRules.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <Zap size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No price rules found. Rules are created within price lists.</p>
          </div>
        )}
      </Card>
    </div>
  );

  // Tab 3: Current Discounts
  const CurrentDiscountsTab = () => (
    <div className="space-y-6">
      <Card title="Active Discounts" icon={TrendingUp}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentDiscounts.map((discount, index) => (
            <Card key={index} className="p-4 border-l-4 border-green-500">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">{discount.product}</h4>
                <Badge variant="success">
                  -{(((discount.basePrice - discount.finalPrice) / discount.basePrice) * 100).toFixed(1)}%
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span className="line-through">{formatCurrency(discount.basePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discounted Price:</span>
                  <span className="font-bold text-green-600">{formatCurrency(discount.finalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Savings:</span>
                  <span className="text-green-600">
                    {formatCurrency(discount.basePrice - discount.finalPrice)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {currentDiscounts.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No active discounts found. Create discounts to attract more customers.</p>
          </div>
        )}
      </Card>
    </div>
  );

  // Tab 4: Price Analytics
  const PriceAnalyticsTab = () => (
    <div className="space-y-6">
      <Card title="Pricing Performance" icon={Target}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Margin Analysis */}
          <Card title="Margin Analysis" className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Average Margin:</span>
                <Badge variant="success">{priceAnalytics.averageMargin || '0'}%</Badge>
              </div>
              <div className="flex justify-between">
                <span>Products Priced:</span>
                <span>{priceAnalytics.totalProducts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Discounts:</span>
                <span>{priceAnalytics.totalDiscounts || 0}</span>
              </div>
            </div>
          </Card>

          {/* Competitive Positioning */}
          <Card title="Competitive Position" className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Market Average:</span>
                <span>KES 208.50</span>
              </div>
              <div className="flex justify-between">
                <span>Our Average:</span>
                <span>KES 210.00</span>
              </div>
              <div className="flex justify-between">
                <span>Position:</span>
                <Badge variant="warning">Slightly Above</Badge>
              </div>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );

  // ==================== HELPER FUNCTIONS ====================

  const getPriceListTypeColor = (type) => {
    const colors = {
      RETAIL: 'bg-blue-100 text-blue-800',
      WHOLESALE: 'bg-green-100 text-green-800',
      FLEET: 'bg-purple-100 text-purple-800',
      PROMOTIONAL: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusVariant = (status) => {
    const variants = {
      ACTIVE: 'success',
      DRAFT: 'warning',
      INACTIVE: 'error'
    };
    return variants[status] || 'secondary';
  };

  const formatCondition = (conditionType, condition) => {
    switch (conditionType) {
      case 'TIME_BASED':
        return `${condition.startTime} - ${condition.endTime}`;
      case 'CUSTOMER_TYPE':
        return condition.customerTypes?.join(', ') || 'All Customers';
      case 'VOLUME_BASED':
        return `Min ${condition.minQuantity}L`;
      case 'PAYMENT_METHOD':
        return condition.paymentMethods?.join(', ') || 'All Methods';
      default:
        return 'Always';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {alert.show && (
        <Alert type={alert.type} title={alert.type.toUpperCase()} message={alert.message} />
      )}

      {/* Main Card with Tabs */}
      <Card
        title="Pricing Management"
        subtitle="Manage price lists, rules, discounts, and analyze pricing performance"
        actions={
          <div className="flex space-x-3">
            <Button 
              variant="cosmic" 
              icon={Plus}
              onClick={() => setIsDiscountModalOpen(true)}
            >
              Create Discount
            </Button>
            <Button 
              variant="primary" 
              icon={ShoppingCart}
              onClick={() => setIsCreateModalOpen(true)}
            >
              New Price List
            </Button>
          </div>
        }
      >
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab value="price-lists" icon={ShoppingCart}>
            Price Lists ({priceLists.length})
          </Tab>
          <Tab value="price-rules" icon={Zap}>
            Price Rules ({priceRules.length})
          </Tab>
          <Tab value="discounts" icon={TrendingUp}>
            Current Discounts ({currentDiscounts.length})
          </Tab>
          <Tab value="analytics" icon={Target}>
            Analytics
          </Tab>
        </Tabs>
        
        <div className="mt-6">
          {activeTab === 'price-lists' && <PriceListsTab />}
          {activeTab === 'price-rules' && <PriceRulesTab />}
          {activeTab === 'discounts' && <CurrentDiscountsTab />}
          {activeTab === 'analytics' && <PriceAnalyticsTab />}
        </div>
      </Card>

      {/* Modals */}
      <CreatePriceListModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onPriceListCreated={fetchPricingData}
      />

      <CreatePriceListModal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }} 
        onPriceListCreated={fetchPricingData}
        editData={selectedItem}
      />

      <DiscountModal 
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        onCreateDiscount={handleCreateDiscount}
      />

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedItem(null);
        }}
        title="Confirm Delete"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the price list <strong>"{selectedItem?.name}"</strong>? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button 
              variant="secondary" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedItem(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={confirmDeletePriceList}
            >
              Delete Price List
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ==================== DISCOUNT MODAL COMPONENT ====================

const DiscountModal = ({ isOpen, onClose, onCreateDiscount }) => {
  const [discountData, setDiscountData] = useState({
    name: '',
    conditionType: 'TIME_BASED',
    adjustmentType: 'PERCENTAGE_DISCOUNT',
    adjustmentValue: '',
    priority: 1,
    isActive: true,
    condition: {}
  });

  const [timeRange, setTimeRange] = useState({
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
  });

  const handleInputChange = (field, value) => {
    setDiscountData(prev => ({ ...prev, [field]: value }));
  };

  const handleTimeRangeChange = (field, value) => {
    setTimeRange(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const condition = discountData.conditionType === 'TIME_BASED' ? timeRange : {};
    
    onCreateDiscount({
      ...discountData,
      condition,
      adjustmentValue: parseFloat(discountData.adjustmentValue),
      priority: parseInt(discountData.priority)
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Discount" size="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Discount Name *"
            value={discountData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Early Bird Special"
            required
          />

          <Select
            label="Discount Type *"
            value={discountData.adjustmentType}
            onChange={(e) => handleInputChange('adjustmentType', e.target.value)}
            options={[
              { value: 'PERCENTAGE_DISCOUNT', label: 'Percentage Discount' },
              { value: 'FIXED_DISCOUNT', label: 'Fixed Amount Discount' }
            ]}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Discount Value *"
            type="number"
            value={discountData.adjustmentValue}
            onChange={(e) => handleInputChange('adjustmentValue', e.target.value)}
            placeholder={discountData.adjustmentType === 'PERCENTAGE_DISCOUNT' ? '5' : '10.00'}
            step="0.01"
            required
          />

          <Input
            label="Priority"
            type="number"
            value={discountData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            placeholder="1"
            min="1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Apply Condition *"
            value={discountData.conditionType}
            onChange={(e) => handleInputChange('conditionType', e.target.value)}
            options={[
              { value: 'TIME_BASED', label: 'Time Based' },
              { value: 'CUSTOMER_TYPE', label: 'Customer Type' },
              { value: 'VOLUME_BASED', label: 'Volume Based' }
            ]}
            required
          />

          <div className="flex items-center space-x-2">
            <Switch
              checked={discountData.isActive}
              onChange={(checked) => handleInputChange('isActive', checked)}
            />
            <span className="text-sm">Active Discount</span>
          </div>
        </div>

        {discountData.conditionType === 'TIME_BASED' && (
          <Card title="Time Settings" icon={Clock}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Time"
                type="time"
                value={timeRange.startTime}
                onChange={(e) => handleTimeRangeChange('startTime', e.target.value)}
              />
              <Input
                label="End Time"
                type="time"
                value={timeRange.endTime}
                onChange={(e) => handleTimeRangeChange('endTime', e.target.value)}
              />
            </div>
          </Card>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!discountData.name || !discountData.adjustmentValue}
          >
            Create Discount
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PricingManagement;