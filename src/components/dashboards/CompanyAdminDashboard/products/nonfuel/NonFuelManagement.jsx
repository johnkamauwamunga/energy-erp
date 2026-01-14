// pages/nonfuel/NonFuelManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  Row,
  Col,
  Statistic,
  message,
  Alert,
  Tabs,
  Badge,
  Avatar,
  Grid,
  Typography,
  Tooltip,
  Empty,
  Spin,
  Popconfirm,
  Drawer,
  Descriptions,
  Dropdown,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  DollarOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  WarningOutlined,
  DownOutlined,
  TagsOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { useApp } from '../../../../../context/AppContext';
import { nonFuelService } from '../../../../../services/nonFuelService/nonFuelService';
import CreateCategoryModal from './modals/CreateCategoryModal';
import CreateSubCategoryModal from './modals/CreateSubCategoryModal';
import CreateProductModal from './modals/CreateProductModal';
import PriceUpdateModal from './modals/PriceUpdateModal';
import StockUpdateModal from './modals/StockUpdateModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { useBreakpoint } = Grid;

const NonFuelManagement = () => {
  const { state } = useApp();
  const screens = useBreakpoint();
  
  // State management
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  
  // Selection states
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Drawer states
  const [categoryDrawerVisible, setCategoryDrawerVisible] = useState(false);
  const [subCategoryDrawerVisible, setSubCategoryDrawerVisible] = useState(false);
  const [productDrawerVisible, setProductDrawerVisible] = useState(false);
  
  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    subCategoryId: '',
    hasPricing: null,
    sortBy: 'name-asc'
  });
  
  const [categoryFilter, setCategoryFilter] = useState({
    search: '',
    sortBy: 'name-asc'
  });

  // Stats states
  const [stats, setStats] = useState({
    products: { total: 0, withPricing: 0, withoutPricing: 0, withVariants: 0 },
    categories: { total: 0, withSubCategories: 0 },
    subCategories: { total: 0 }
  });

  // Define tabs
  const tabs = [
    { 
      key: 'products', 
      label: 'Products', 
      icon: <ShoppingOutlined />,
      count: stats.products.total,
      color: '#1890ff'
    },
    { 
      key: 'categories', 
      label: 'Categories', 
      icon: <AppstoreOutlined />,
      count: stats.categories.total,
      color: '#52c41a'
    },
    { 
      key: 'subcategories', 
      label: 'Sub-Categories', 
      icon: <TagsOutlined />,
      count: stats.subCategories.total,
      color: '#fa8c16'
    }
  ];

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [productsRes, categoriesRes, subCategoriesRes] = await Promise.all([
        nonFuelService.getProducts(),
        nonFuelService.getCategories(),
        nonFuelService.getSubCategories()
      ]);

      setProducts(Array.isArray(productsRes) ? productsRes : (productsRes?.data || []));
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.data || []));
      setSubCategories(Array.isArray(subCategoriesRes) ? subCategoriesRes : (subCategoriesRes?.data || []));

      // Calculate stats
      const pricedProducts = (Array.isArray(productsRes) ? productsRes : (productsRes?.data || []))
        .filter(p => p.baseCostPrice && p.minSellingPrice && p.maxSellingPrice).length;
      
      const variantProducts = (Array.isArray(productsRes) ? productsRes : (productsRes?.data || []))
        .filter(p => p.variantName).length;

      const categoriesWithSub = (Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.data || []))
        .filter(c => c._count?.subCategories > 0).length;

      setStats({
        products: {
          total: (Array.isArray(productsRes) ? productsRes : (productsRes?.data || [])).length,
          withPricing: pricedProducts,
          withoutPricing: (Array.isArray(productsRes) ? productsRes : (productsRes?.data || [])).length - pricedProducts,
          withVariants: variantProducts
        },
        categories: {
          total: (Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.data || [])).length,
          withSubCategories: categoriesWithSub
        },
        subCategories: {
          total: (Array.isArray(subCategoriesRes) ? subCategoriesRes : (subCategoriesRes?.data || [])).length
        }
      });

      message.success('Data loaded successfully');
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error.message || 'Failed to load data');
      message.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open modal functions
  const openCategoryModal = (category = null) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  const openSubCategoryModal = (subCategory = null) => {
    setSelectedSubCategory(subCategory);
    setIsSubCategoryModalOpen(true);
  };

  const openProductModal = (product = null) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const openPriceModal = (product) => {
    setSelectedProduct(product);
    setIsPriceModalOpen(true);
  };

  const openStockModal = (product) => {
    setSelectedProduct(product);
    setIsStockModalOpen(true);
  };

  // Delete functions
  const handleDeleteCategory = async (category) => {
    const productCount = category._count?.products || 0;
    
    if (productCount > 0) {
      message.error(`Cannot delete category with ${productCount} products`);
      return;
    }

    try {
      await nonFuelService.deleteCategory(category.id);
      message.success('Category deleted successfully');
      loadData();
    } catch (error) {
      message.error(error.message || 'Failed to delete category');
    }
  };

  const handleDeleteSubCategory = async (subCategory) => {
    const productCount = subCategory._count?.products || 0;
    
    if (productCount > 0) {
      message.error(`Cannot delete sub-category with ${productCount} products`);
      return;
    }

    try {
      await nonFuelService.deleteSubCategory(subCategory.id);
      message.success('Sub-category deleted successfully');
      loadData();
    } catch (error) {
      message.error(error.message || 'Failed to delete sub-category');
    }
  };

  const handleDeleteProduct = async (product) => {
    Modal.confirm({
      title: 'Delete Product',
      content: `Are you sure you want to delete "${product.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await nonFuelService.deleteProduct(product.id);
          message.success('Product deleted successfully');
          loadData();
        } catch (error) {
          message.error(error.message || 'Failed to delete product');
        }
      }
    });
  };

  // Filter and sort data
  const getFilteredProducts = useMemo(() => {
    let data = [...products];

    // Apply search filter
    if (filters.search) {
      data = data.filter(item => 
        item.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.sku?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.brand?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply category filter
    if (filters.categoryId) {
      data = data.filter(item => item.categoryId === filters.categoryId);
    }

    // Apply sub-category filter
    if (filters.subCategoryId) {
      data = data.filter(item => item.subCategoryId === filters.subCategoryId);
    }

    // Apply pricing filter
    if (filters.hasPricing !== null) {
      if (filters.hasPricing) {
        data = data.filter(item => item.baseCostPrice && item.minSellingPrice && item.maxSellingPrice);
      } else {
        data = data.filter(item => !item.baseCostPrice || !item.minSellingPrice || !item.maxSellingPrice);
      }
    }

    // Apply sorting
    const [sortField, sortOrder] = filters.sortBy.split('-');
    data.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [products, filters]);

  const getFilteredCategories = useMemo(() => {
    let data = [...categories];

    // Apply search filter
    if (categoryFilter.search) {
      data = data.filter(item => 
        item.name?.toLowerCase().includes(categoryFilter.search.toLowerCase())
      );
    }

    // Apply sorting
    const [sortField, sortOrder] = categoryFilter.sortBy.split('-');
    data.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [categories, categoryFilter]);

  const getFilteredSubCategories = useMemo(() => {
    let data = [...subCategories];

    // Apply search filter
    if (filters.search) {
      data = data.filter(item => 
        item.name?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply sorting
    const [sortField, sortOrder] = filters.sortBy.split('-');
    data.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [subCategories, filters]);

  // Get current filtered data
  const getCurrentData = () => {
    switch (activeTab) {
      case 'products': return getFilteredProducts;
      case 'categories': return getFilteredCategories;
      case 'subcategories': return getFilteredSubCategories;
      default: return [];
    }
  };

  // Table columns
  const productColumns = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (name, record) => (
        <Space>
          <Avatar 
            size="small" 
            style={{ backgroundColor: '#1890ff' }}
            icon={<ShoppingOutlined />}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.name}
              {record.variantName && (
                <Tag color="blue" style={{ marginLeft: 8, fontSize: '11px' }}>
                  {record.variantName}
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.sku || 'No SKU'}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Category',
      key: 'category',
      width: 150,
      render: (_, record) => {
        const category = categories.find(c => c.id === record.categoryId);
        return category ? (
          <Tag color="blue">{category.name}</Tag>
        ) : 'No Category';
      }
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (unit) => <Tag>{unit || 'PIECE'}</Tag>
    },
    {
      title: 'Pricing',
      key: 'pricing',
      width: 150,
      render: (_, record) => {
        const hasPricing = record.baseCostPrice && record.minSellingPrice && record.maxSellingPrice;
        if (!hasPricing) {
          return <Tag color="orange">No Pricing</Tag>;
        }
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: '13px' }}>
              ${parseFloat(record.baseCostPrice).toFixed(2)}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              ${parseFloat(record.minSellingPrice).toFixed(2)} - ${parseFloat(record.maxSellingPrice).toFixed(2)}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedProduct(record);
                setProductDrawerVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => openProductModal(record)}
            />
          </Tooltip>
          <Tooltip title="Update Pricing">
            <Button 
              size="small" 
              icon={<DollarOutlined />}
              onClick={() => openPriceModal(record)}
            />
          </Tooltip>
          <Tooltip title="Update Stock">
            <Button 
              size="small" 
              icon={<InboxOutlined />}
              onClick={() => openStockModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Product"
            description="Are you sure you want to delete this product?"
            onConfirm={() => handleDeleteProduct(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const categoryColumns = [
    {
      title: 'Category',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <Space>
          <Avatar 
            size="small" 
            style={{ backgroundColor: '#52c41a' }}
            icon={<AppstoreOutlined />}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record._count?.products || 0} products
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Sub-Categories',
      key: 'subCategories',
      width: 120,
      render: (_, record) => (
        <Statistic
          value={record._count?.subCategories || 0}
          valueStyle={{ fontSize: '18px' }}
          prefix={<TagsOutlined />}
        />
      )
    },
    {
      title: 'Products',
      key: 'products',
      width: 100,
      render: (_, record) => (
        <Tag color="blue">{record._count?.products || 0}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedCategory(record);
                setCategoryDrawerVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => openCategoryModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Category"
            description="Are you sure? This action cannot be undone."
            onConfirm={() => handleDeleteCategory(record)}
            okText="Yes"
            cancelText="No"
            disabled={record._count?.products > 0}
          >
            <Tooltip title={record._count?.products > 0 ? "Cannot delete: Has products" : "Delete"}>
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />}
                disabled={record._count?.products > 0}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const subCategoryColumns = [
    {
      title: 'Sub-Category',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <Space>
          <Avatar 
            size="small" 
            style={{ backgroundColor: '#fa8c16' }}
            icon={<TagsOutlined />}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Category: {categories.find(c => c.id === record.categoryId)?.name || 'Unknown'}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Products',
      key: 'products',
      width: 100,
      render: (_, record) => (
        <Tag color="blue">{record._count?.products || 0}</Tag>
      )
    },
    {
      title: 'Category',
      key: 'category',
      width: 150,
      render: (_, record) => {
        const category = categories.find(c => c.id === record.categoryId);
        return category ? category.name : 'Unknown';
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedSubCategory(record);
                setSubCategoryDrawerVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => openSubCategoryModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Sub-Category"
            description="Are you sure? This action cannot be undone."
            onConfirm={() => handleDeleteSubCategory(record)}
            okText="Yes"
            cancelText="No"
            disabled={record._count?.products > 0}
          >
            <Tooltip title={record._count?.products > 0 ? "Cannot delete: Has products" : "Delete"}>
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />}
                disabled={record._count?.products > 0}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Filter UI
  const renderFilterUI = () => {
    if (activeTab === 'products') {
      return (
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              allowClear
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Category"
              value={filters.categoryId}
              onChange={(value) => setFilters(prev => ({ ...prev, categoryId: value }))}
              style={{ width: '100%' }}
              allowClear
            >
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Sub-Category"
              value={filters.subCategoryId}
              onChange={(value) => setFilters(prev => ({ ...prev, subCategoryId: value }))}
              style={{ width: '100%' }}
              allowClear
              disabled={!filters.categoryId}
            >
              {subCategories
                .filter(sub => sub.categoryId === filters.categoryId)
                .map(sub => (
                  <Option key={sub.id} value={sub.id}>{sub.name}</Option>
                ))}
            </Select>
          </Col>
        </Row>
      );
    } else if (activeTab === 'categories') {
      return (
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search categories..."
              value={categoryFilter.search}
              onChange={(e) => setCategoryFilter(prev => ({ ...prev, search: e.target.value }))}
              allowClear
              enterButton={<SearchOutlined />}
            />
          </Col>
        </Row>
      );
    }
    return null;
  };

  const currentData = getCurrentData();
  const hasData = currentData.length > 0;

  return (
    <div style={{ padding: screens.xs ? 16 : 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Non-Fuel Management</Title>
          <Text type="secondary">
            Manage non-fuel products, categories, and sub-categories
          </Text>
        </Col>
        <Col>
          {screens.xs ? (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'add-product',
                    label: 'Add Product',
                    icon: <ShoppingOutlined />,
                    onClick: () => openProductModal()
                  },
                  {
                    key: 'add-category',
                    label: 'Add Category',
                    icon: <AppstoreOutlined />,
                    onClick: () => openCategoryModal()
                  },
                  {
                    key: 'add-subcategory',
                    label: 'Add Sub-Category',
                    icon: <TagsOutlined />,
                    onClick: () => openSubCategoryModal()
                  }
                ]
              }}
              placement="bottomRight"
            >
              <Button type="primary" icon={<PlusOutlined />}>
                Add <DownOutlined />
              </Button>
            </Dropdown>
          ) : (
            <Space>
              <Button 
                type="primary" 
                icon={<ShoppingOutlined />}
                onClick={() => openProductModal()}
              >
                Add Product
              </Button>
              <Button 
                icon={<AppstoreOutlined />}
                onClick={() => openCategoryModal()}
              >
                Add Category
              </Button>
              <Button 
                icon={<TagsOutlined />}
                onClick={() => openSubCategoryModal()}
              >
                Add Sub-Category
              </Button>
            </Space>
          )}
        </Col>
      </Row>

      {/* Stats Section */}
      {!screens.xs && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Products"
                value={stats.products.total}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ShoppingOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Categories"
                value={stats.categories.total}
                valueStyle={{ color: '#52c41a' }}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Sub-Categories"
                value={stats.subCategories.total}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<TagsOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Priced Products"
                value={stats.products.withPricing}
                valueStyle={{ color: '#722ed1' }}
                prefix={<DollarOutlined />}
                suffix={`/ ${stats.products.total}`}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        {renderFilterUI()}
      </Card>

      {/* Main Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="line"
          items={tabs.map(tab => ({
            key: tab.key,
            label: (
              <span>
                {tab.icon}
                {!screens.xs && ` ${tab.label}`}
                <Badge 
                  count={tab.count} 
                  style={{ 
                    marginLeft: 8,
                    backgroundColor: tab.color,
                    boxShadow: 'none'
                  }} 
                  size="small"
                />
              </span>
            )
          }))}
        />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Spin size="large" />
          </div>
        ) : !hasData ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`No ${activeTab} found`}
          >
            <Button 
              type="primary" 
              onClick={
                activeTab === 'products' ? () => openProductModal() :
                activeTab === 'categories' ? () => openCategoryModal() :
                () => openSubCategoryModal()
              }
            >
              Add {activeTab === 'products' ? 'Product' : activeTab === 'categories' ? 'Category' : 'Sub-Category'}
            </Button>
          </Empty>
        ) : (
          <Table
            columns={
              activeTab === 'products' ? productColumns :
              activeTab === 'categories' ? categoryColumns :
              subCategoryColumns
            }
            dataSource={currentData}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true
            }}
            scroll={{ x: 'max-content' }}
          />
        )}
      </Card>

      {/* Modals */}
      <CreateCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setSelectedCategory(null);
        }}
        onCategoryCreated={loadData}
        category={selectedCategory}
        companyId={state.currentUser?.companyId}
      />

      <CreateSubCategoryModal
        isOpen={isSubCategoryModalOpen}
        onClose={() => {
          setIsSubCategoryModalOpen(false);
          setSelectedSubCategory(null);
        }}
        onSubCategoryCreated={loadData}
        subCategory={selectedSubCategory}
        companyId={state.currentUser?.companyId}
        categories={categories}
      />

      <CreateProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
        onProductCreated={loadData}
        product={selectedProduct}
        companyId={state.currentUser?.companyId}
      />

      <PriceUpdateModal
        isOpen={isPriceModalOpen}
        onClose={() => {
          setIsPriceModalOpen(false);
          setSelectedProduct(null);
        }}
        onPriceUpdated={loadData}
        product={selectedProduct}
        companyId={state.currentUser?.companyId}
      />

      <StockUpdateModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setSelectedProduct(null);
        }}
        onStockUpdated={loadData}
        product={selectedProduct}
        companyId={state.currentUser?.companyId}
      />

      {/* Drawers */}
      <Drawer
        title="Category Details"
        placement="right"
        onClose={() => setCategoryDrawerVisible(false)}
        open={categoryDrawerVisible}
        width={screens.xs ? '100%' : 600}
      >
        {selectedCategory && (
          <div>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Name">
                <Text strong>{selectedCategory.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                <Text>{selectedCategory.description || 'No description'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Products">
                <Statistic
                  value={selectedCategory._count?.products || 0}
                  prefix={<ShoppingOutlined />}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Sub-Categories">
                <Statistic
                  value={selectedCategory._count?.subCategories || 0}
                  prefix={<TagsOutlined />}
                />
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <Space>
              <Button 
                type="primary" 
                onClick={() => {
                  setCategoryDrawerVisible(false);
                  openCategoryModal(selectedCategory);
                }}
              >
                Edit
              </Button>
              <Button 
                danger
                onClick={() => handleDeleteCategory(selectedCategory)}
                disabled={selectedCategory._count?.products > 0}
              >
                Delete
              </Button>
            </Space>
          </div>
        )}
      </Drawer>

      <Drawer
        title="Product Details"
        placement="right"
        onClose={() => setProductDrawerVisible(false)}
        open={productDrawerVisible}
        width={screens.xs ? '100%' : 600}
      >
        {selectedProduct && (
          <div>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Name">
                <Text strong>{selectedProduct.name}</Text>
                {selectedProduct.variantName && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {selectedProduct.variantName}
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="SKU">
                <Text code>{selectedProduct.sku || 'No SKU'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {(() => {
                  const category = categories.find(c => c.id === selectedProduct.categoryId);
                  return category ? category.name : 'Unknown';
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Unit">
                <Tag>{selectedProduct.unit || 'PIECE'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Pricing">
                {selectedProduct.baseCostPrice && selectedProduct.minSellingPrice && selectedProduct.maxSellingPrice ? (
                  <div>
                    <div>Cost: ${parseFloat(selectedProduct.baseCostPrice).toFixed(2)}</div>
                    <div>Range: ${parseFloat(selectedProduct.minSellingPrice).toFixed(2)} - ${parseFloat(selectedProduct.maxSellingPrice).toFixed(2)}</div>
                  </div>
                ) : 'No pricing configured'}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <Space>
              <Button 
                type="primary" 
                onClick={() => {
                  setProductDrawerVisible(false);
                  openProductModal(selectedProduct);
                }}
              >
                Edit
              </Button>
              <Button 
                onClick={() => {
                  setProductDrawerVisible(false);
                  openPriceModal(selectedProduct);
                }}
              >
                Update Prices
              </Button>
              <Button 
                danger
                onClick={() => handleDeleteProduct(selectedProduct)}
              >
                Delete
              </Button>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default NonFuelManagement;