import React, { useState, useEffect } from 'react';
import { Button, Card, Tabs, Tab, Badge, Alert, Modal, Input, Select, Switch } from '../../ui';
import CreatePriceListModal from './CreatePriceListModal';
import CreatePriceRuleModal from './CreatePriceRuleModal';
import CreateDiscountModal from './CreateDiscountModal';
import { 
  DollarSign, Filter, Clock, Users, Zap, Calendar, 
  Edit, Trash2, Eye, Plus, TrendingUp, Shield,
  FileText, Target, ShoppingCart, Percent
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../../utils/helpers';
import { useApp } from '../../../context/AppContext';
import { pricingService } from '../../../services/pricingService';

const PricingManagement = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('price-lists');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateRuleModalOpen, setIsCreateRuleModalOpen] = useState(false);
  const [isCreateDiscountModalOpen, setIsCreateDiscountModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [priceLists, setPriceLists] = useState([]);
  const [priceRules, setPriceRules] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: ''
  });
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Show alert message
  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  // Fetch all pricing data
  const fetchPricingData = async () => {
    setIsLoading(true);
    try {
      // Fetch price lists
      const priceListsResponse = await pricingService.getPriceLists(filters);
      setPriceLists(priceListsResponse.priceLists || []);

      // Fetch price rules (you might need to adjust this based on your API)
      const priceRulesResponse = await pricingService.getPriceRules({});
      setPriceRules(priceRulesResponse || []);

      // Fetch discounts (you might need to adjust this based on your API)
      const discountsResponse = await pricingService.getCurrentPrices();
      setDiscounts(discountsResponse || []);

    } catch (error) {
      console.error('❌ Failed to fetch pricing data:', error);
      showAlert('error', 'Failed to load pricing data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingData();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle delete operations
  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      switch (type) {
        case 'priceList':
          await pricingService.deletePriceList(id);
          showAlert('success', 'Price list deleted successfully');
          break;
        case 'priceRule':
          await pricingService.deletePriceRule(id);
          showAlert('success', 'Price rule deleted successfully');
          break;
        case 'discount':
          // You'll need to implement discount deletion in your service
          showAlert('success', 'Discount deleted successfully');
          break;
      }
      fetchPricingData();
    } catch (error) {
      console.error(`❌ Failed to delete ${type}:`, error);
      showAlert('error', `Failed to delete ${type}`);
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (priceListId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await pricingService.updatePriceList(priceListId, { status: newStatus });
      showAlert('success', `Price list ${newStatus.toLowerCase()} successfully`);
      fetchPricingData();
    } catch (error) {
      console.error('❌ Failed to update status:', error);
      showAlert('error', 'Failed to update status');
    }
  };

  // Handle edit operations
  const handleEdit = (type, item) => {
    setSelectedItem(item);
    switch (type) {
      case 'priceList':
        setIsEditModalOpen(true);
        break;
      case 'priceRule':
        setIsCreateRuleModalOpen(true);
        break;
      case 'discount':
        setIsCreateDiscountModalOpen(true);
        break;
    }
  };

  // Render price list table
  const renderPriceListsTable = () => {
    const columns = [
      { header: 'Name', accessor: 'name' },
      { header: 'Type', accessor: 'type' },
      { header: 'Status', accessor: 'status' },
      { header: 'Products', accessor: 'products' },
      { header: 'Effective From', accessor: 'effectiveFrom' },
      { header: 'Effective To', accessor: 'effectiveTo' },
      { header: 'Actions', accessor: 'actions' }
    ];

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th key={column.accessor} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {priceLists.map(priceList => (
              <tr key={priceList.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-blue-500" />
                    <span className="font-medium">{priceList.name}</span>
                  </div>
                  {priceList.description && (
                    <div className="text-xs text-gray-500 mt-1">{priceList.description}</div>
                  )}
                </td>
                <td className="p-3">
                  <Badge variant={getPriceListTypeVariant(priceList.type)} className="capitalize">
                    {priceList.type.toLowerCase()}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={priceList.status === 'ACTIVE'}
                      onChange={() => handleStatusToggle(priceList.id, priceList.status)}
                    />
                    <Badge variant={getStatusVariant(priceList.status)} className="capitalize">
                      {priceList.status.toLowerCase()}
                    </Badge>
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-sm">
                    <span className="font-medium">{priceList.items?.length || 0} products</span>
                    {priceList.items?.slice(0, 2).map(item => (
                      <div key={item.productId} className="text-xs text-gray-500">
                        {item.product?.name} - {formatCurrency(item.price)}
                      </div>
                    ))}
                    {priceList.items?.length > 2 && (
                      <div className="text-xs text-gray-400">+{priceList.items.length - 2} more</div>
                    )}
                  </div>
                </td>
                <td className="p-3 text-sm text-gray-900">{formatDate(priceList.effectiveFrom)}</td>
                <td className="p-3 text-sm text-gray-900">
                  {priceList.effectiveTo ? formatDate(priceList.effectiveTo) : 'No expiry'}
                </td>
                <td className="p-3">
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleEdit('priceList', priceList)}
                      icon={Edit}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="danger"
                      onClick={() => handleDelete('priceList', priceList.id)}
                      icon={Trash2}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {priceLists.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No price lists found. Create your first price list to get started.</p>
          </div>
        )}
      </div>
    );
  };

  // Render price rules table
  const renderPriceRulesTable = () => {
    const columns = [
      { header: 'Rule Name', accessor: 'name' },
      { header: 'Condition', accessor: 'condition' },
      { header: 'Adjustment', accessor: 'adjustment' },
      { header: 'Priority', accessor: 'priority' },
      { header: 'Status', accessor: 'status' },
      { header: 'Price Lists', accessor: 'priceLists' },
      { header: 'Actions', accessor: 'actions' }
    ];

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th key={column.accessor} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {priceRules.map(rule => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <Filter size={16} className="text-purple-500" />
                    <span className="font-medium">{rule.name}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-sm">
                    <Badge variant="secondary" className="mb-1 capitalize">
                      {rule.conditionType.toLowerCase()}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {renderConditionDescription(rule)}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-sm">
                    <span className={rule.adjustmentType.includes('DISCOUNT') ? 'text-green-600' : 'text-orange-600'}>
                      {rule.adjustmentValue}
                      {rule.adjustmentType.includes('PERCENTAGE') ? '%' : ' KES'}
                    </span>
                    <div className="text-xs text-gray-500 capitalize">
                      {rule.adjustmentType.replace('_', ' ').toLowerCase()}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="primary">{rule.priority}</Badge>
                </td>
                <td className="p-3">
                  <Badge variant={rule.isActive ? 'success' : 'warning'} className="capitalize">
                    {rule.isActive ? 'active' : 'inactive'}
                  </Badge>
                </td>
                <td className="p-3 text-sm text-gray-500">
                  {rule.priceListId ? '1 price list' : 'Not assigned'}
                </td>
                <td className="p-3">
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleEdit('priceRule', rule)}
                      icon={Edit}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="danger"
                      onClick={() => handleDelete('priceRule', rule.id)}
                      icon={Trash2}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {priceRules.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <Filter size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No price rules found. Create rules to enable dynamic pricing.</p>
          </div>
        )}
      </div>
    );
  };

  // Render discounts table
  const renderDiscountsTable = () => {
    const columns = [
      { header: 'Discount Name', accessor: 'name' },
      { header: 'Type', accessor: 'type' },
      { header: 'Value', accessor: 'value' },
      { header: 'Applicable To', accessor: 'applicable' },
      { header: 'Time Range', accessor: 'timeRange' },
      { header: 'Status', accessor: 'status' },
      { header: 'Actions', accessor: 'actions' }
    ];

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th key={column.accessor} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {discounts.map(discount => (
              <tr key={discount.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <Percent size={16} className="text-green-500" />
                    <span className="font-medium">{discount.name}</span>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="success" className="capitalize">
                    {discount.type?.toLowerCase() || 'standard'}
                  </Badge>
                </td>
                <td className="p-3">
                  <span className="font-medium text-green-600">
                    {discount.value}{discount.isPercentage ? '%' : ' KES'}
                  </span>
                </td>
                <td className="p-3 text-sm text-gray-500">
                  {discount.products?.length || 'All'} products
                </td>
                <td className="p-3 text-sm text-gray-500">
                  {discount.startTime && discount.endTime ? (
                    `${discount.startTime} - ${discount.endTime}`
                  ) : (
                    'Always active'
                  )}
                </td>
                <td className="p-3">
                  <Badge variant={discount.isActive ? 'success' : 'warning'} className="capitalize">
                    {discount.isActive ? 'active' : 'inactive'}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleEdit('discount', discount)}
                      icon={Edit}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="danger"
                      onClick={() => handleDelete('discount', discount.id)}
                      icon={Trash2}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {discounts.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <Percent size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No discounts found. Create discounts to attract more customers.</p>
          </div>
        )}
      </div>
    );
  };

  // Render analytics dashboard
  const renderAnalyticsDashboard = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Key Metrics Cards */}
          <Card className="text-center p-6">
            <div className="text-2xl font-bold text-blue-600">{priceLists.length}</div>
            <div className="text-sm text-gray-500">Active Price Lists</div>
          </Card>
          
          <Card className="text-center p-6">
            <div className="text-2xl font-bold text-green-600">{priceRules.length}</div>
            <div className="text-sm text-gray-500">Pricing Rules</div>
          </Card>
          
          <Card className="text-center p-6">
            <div className="text-2xl font-bold text-purple-600">{discounts.length}</div>
            <div className="text-sm text-gray-500">Active Discounts</div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card title="Recent Activity">
          <div className="space-y-3">
            {priceLists.slice(0, 5).map(priceList => (
              <div key={priceList.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{priceList.name}</div>
                  <div className="text-sm text-gray-500">
                    Updated {formatDate(priceList.updatedAt)}
                  </div>
                </div>
                <Badge variant={getStatusVariant(priceList.status)}>
                  {priceList.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  // Helper functions
  const getPriceListTypeVariant = (type) => {
    const variants = {
      RETAIL: 'primary',
      WHOLESALE: 'success', 
      FLEET: 'warning',
      PROMOTIONAL: 'cosmic'
    };
    return variants[type] || 'secondary';
  };

  const getStatusVariant = (status) => {
    const variants = {
      ACTIVE: 'success',
      INACTIVE: 'warning',
      DRAFT: 'secondary',
      EXPIRED: 'danger'
    };
    return variants[status] || 'secondary';
  };

  const renderConditionDescription = (rule) => {
    switch (rule.conditionType) {
      case 'TIME_BASED':
        return `${rule.condition.startTime} - ${rule.condition.endTime}`;
      case 'CUSTOMER_TYPE':
        return rule.condition.customerTypes?.join(', ') || 'All customers';
      case 'VOLUME_BASED':
        return `Min: ${rule.condition.minQuantity}L`;
      case 'PAYMENT_METHOD':
        return rule.condition.paymentMethods?.join(', ') || 'All methods';
      default:
        return 'Always applies';
    }
  };

  // Filter components for each tab
  const renderFilters = () => {
    const commonFilters = (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          icon={Filter}
        />
        
        {activeTab === 'price-lists' && (
          <>
            <Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'DRAFT', label: 'Draft' }
              ]}
            />
            
            <Select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'RETAIL', label: 'Retail' },
                { value: 'WHOLESALE', label: 'Wholesale' },
                { value: 'FLEET', label: 'Fleet' },
                { value: 'PROMOTIONAL', label: 'Promotional' }
              ]}
            />
          </>
        )}
      </div>
    );

    return (
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Filters</h3>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setFilters({ status: '', type: '', search: '' })}
          >
            Clear Filters
          </Button>
        </div>
        {commonFilters}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {alert.show && (
        <Alert type={alert.type} title={alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} message={alert.message} />
      )}

      {/* Main Card with Tabs */}
      <Card
        title="Pricing Management"
        subtitle="Manage price lists, rules, and discounts across your stations"
        actions={
          <div className="flex space-x-2">
            {activeTab === 'price-lists' && (
              <Button 
                variant="cosmic" 
                icon={Plus}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Price List
              </Button>
            )}
            {activeTab === 'price-rules' && (
              <Button 
                variant="success" 
                icon={Plus}
                onClick={() => setIsCreateRuleModalOpen(true)}
              >
                Create Price Rule
              </Button>
            )}
            {activeTab === 'discounts' && (
              <Button 
                variant="warning" 
                icon={Plus}
                onClick={() => setIsCreateDiscountModalOpen(true)}
              >
                Create Discount
              </Button>
            )}
          </div>
        }
      >
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab value="price-lists" icon={ShoppingCart}>
            Price Lists ({priceLists.length})
          </Tab>
          <Tab value="price-rules" icon={Filter}>
            Price Rules ({priceRules.length})
          </Tab>
          <Tab value="discounts" icon={Percent}>
            Discounts ({discounts.length})
          </Tab>
          <Tab value="analytics" icon={TrendingUp}>
            Analytics
          </Tab>
        </Tabs>

        {/* Filters */}
        {activeTab !== 'analytics' && renderFilters()}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading pricing data...</p>
          </div>
        )}

        {/* Tab Content */}
        {!isLoading && (
          <>
            {activeTab === 'price-lists' && renderPriceListsTable()}
            {activeTab === 'price-rules' && renderPriceRulesTable()}
            {activeTab === 'discounts' && renderDiscountsTable()}
            {activeTab === 'analytics' && renderAnalyticsDashboard()}
          </>
        )}
      </Card>

      {/* Modals */}
      <CreatePriceListModal 
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        onPriceListCreated={fetchPricingData}
        editData={isEditModalOpen ? selectedItem : null}
      />

      <CreatePriceRuleModal 
        isOpen={isCreateRuleModalOpen}
        onClose={() => {
          setIsCreateRuleModalOpen(false);
          setSelectedItem(null);
        }}
        onPriceRuleCreated={fetchPricingData}
        editData={selectedItem}
      />

      <CreateDiscountModal 
        isOpen={isCreateDiscountModalOpen}
        onClose={() => {
          setIsCreateDiscountModalOpen(false);
          setSelectedItem(null);
        }}
        onDiscountCreated={fetchPricingData}
        editData={selectedItem}
      />
    </div>
  );
};

export default PricingManagement;