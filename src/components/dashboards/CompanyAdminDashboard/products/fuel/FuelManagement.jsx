import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  Form,
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
  Divider,
  Tooltip,
  Empty,
  Spin,
  Popconfirm,
  Drawer,
  Descriptions,
  Dropdown
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
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  FireOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  DownOutlined
} from '@ant-design/icons';
import { LocateFixed, PlusCircle } from 'lucide-react';
import { useApp } from '../../../../../context/AppContext';
import CreateFuelModal from './create/CreateFuelModal';
import { fuelService } from '../../../../../services/fuelService/fuelService';
import CreateCategoryModal from './create/CreateCategoryModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { useBreakpoint } = Grid;
const { confirm } = Modal;

const ProductManagement = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('fuel');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryDrawerVisible, setCategoryDrawerVisible] = useState(false);
  const [productDrawerVisible, setProductDrawerVisible] = useState(false);

  // Data states
  const [fuelProducts, setFuelProducts] = useState([]);
  const [fuelCategories, setFuelCategories] = useState([]);
  const [pricingData, setPricingData] = useState([]);
  
  // Stats states
  const [productStats, setProductStats] = useState({});
  const [categoryStats, setCategoryStats] = useState({});
  const [pricingStats, setPricingStats] = useState({});

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    fuelCategoryId: '',
    hasPricing: null,
    sortBy: 'name-asc'
  });

  const [categoryFilter, setCategoryFilter] = useState({
    search: '',
    sortBy: 'name-asc'
  });

  const screens = useBreakpoint();

  const tabs = [
    { 
      key: 'fuel', 
      label: 'Fuel Products', 
      icon: <FireOutlined />,
      count: fuelProducts.length,
      color: '#fa8c16'
    },
    { 
      key: 'pricing', 
      label: 'Pricing Management', 
      icon: <DollarOutlined />,
      count: pricingData.length,
      color: '#52c41a'
    },
    { 
      key: 'categories', 
      label: 'Fuel Categories', 
      icon: <LocateFixed />,
      count: fuelCategories.length,
      color: '#1890ff'
    }
  ];

  // Sort options
  const sortOptions = {
    fuel: [
      { value: 'name-asc', label: 'Name A-Z' },
      { value: 'name-desc', label: 'Name Z-A' },
      { value: 'fuelCode-asc', label: 'Code A-Z' },
      { value: 'fuelCode-desc', label: 'Code Z-A' },
      { value: 'baseCostPrice-asc', label: 'Cost Low-High' },
      { value: 'baseCostPrice-desc', label: 'Cost High-Low' },
      { value: 'createdAt-desc', label: 'Newest First' },
      { value: 'createdAt-asc', label: 'Oldest First' }
    ],
    pricing: [
      { value: 'name-asc', label: 'Name A-Z' },
      { value: 'margin-desc', label: 'Margin High-Low' },
      { value: 'margin-asc', label: 'Margin Low-High' },
      { value: 'baseCostPrice-asc', label: 'Cost Low-High' },
      { value: 'baseCostPrice-desc', label: 'Cost High-Low' },
      { value: 'priceStatus', label: 'Price Status' }
    ],
    categories: [
      { value: 'name-asc', label: 'Name A-Z' },
      { value: 'name-desc', label: 'Name Z-A' },
      { value: 'code-asc', label: 'Code A-Z' },
      { value: 'code-desc', label: 'Code Z-A' },
      { value: 'productCount-desc', label: 'Most Products' },
      { value: 'productCount-asc', label: 'Least Products' }
    ]
  };

  // Calculate pricing stats from product data
  const calculatePricingStats = useCallback((products) => {
    const pricedProducts = products.filter(p => 
      p.baseCostPrice && p.minSellingPrice && p.maxSellingPrice
    );
    const unpricedProducts = products.filter(p => 
      !p.baseCostPrice || !p.minSellingPrice || !p.maxSellingPrice
    );
    
    let totalMargin = 0;
    let excellentCount = 0, goodCount = 0, fairCount = 0, lowCount = 0, unprofitableCount = 0;
    
    pricedProducts.forEach(product => {
      const margin = ((product.maxSellingPrice - product.baseCostPrice) / product.baseCostPrice * 100);
      if (margin > 25) excellentCount++;
      else if (margin > 15) goodCount++;
      else if (margin > 5) fairCount++;
      else if (margin > 0) lowCount++;
      else unprofitableCount++;
      totalMargin += margin;
    });
    
    const avgMargin = pricedProducts.length > 0 ? totalMargin / pricedProducts.length : 0;
    const profitableCount = excellentCount + goodCount + fairCount + lowCount;
    
    return {
      total: products.length,
      priced: pricedProducts.length,
      unpriced: unpricedProducts.length,
      avgMargin: avgMargin.toFixed(1),
      excellent: excellentCount,
      good: goodCount,
      fair: fairCount,
      low: lowCount,
      unprofitable: unprofitableCount,
      profitablePercentage: pricedProducts.length > 0 ? (profitableCount / pricedProducts.length * 100).toFixed(0) : 0
    };
  }, []);

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Starting data load...');

      // Load products and categories in parallel
      const [fuelProductsResult, fuelCategoriesResult] = await Promise.all([
        fuelService.getFuelProducts({ page: '1', limit: '100' }),
        fuelService.getFuelCategories({ page: '1', limit: '100' })
      ]);

      console.log('Fuel Products Data:', fuelProductsResult);
      console.log('Fuel Categories Data:', fuelCategoriesResult);

      // Extract data correctly from service responses
      const fuelProductsData = fuelProductsResult?.data || 
                              (Array.isArray(fuelProductsResult) ? fuelProductsResult : []);
      
      const fuelCategoriesData = fuelCategoriesResult?.data || 
                                (Array.isArray(fuelCategoriesResult) ? fuelCategoriesResult : []);

      console.log('Parsed Fuel Products:', fuelProductsData);
      console.log('Parsed Fuel Categories:', fuelCategoriesData);

      setFuelProducts(fuelProductsData);
      setFuelCategories(fuelCategoriesData);
      
      // Use products data for pricing tab (contains all pricing info)
      setPricingData(fuelProductsData);

      // Set stats from responses
      setProductStats(fuelProductsResult?.stats || {});
      setCategoryStats(fuelCategoriesResult?.pagination || {});
      
      // Calculate pricing stats from product data
      const pricingStats = calculatePricingStats(fuelProductsData);
      setPricingStats(pricingStats);

      message.success('Data loaded successfully');
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error.message || 'Failed to load data');
      message.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'fuel': return fuelProducts;
      case 'pricing': return pricingData;
      case 'categories': return fuelCategories;
      default: return [];
    }
  };

  // Filter and sort fuel products
  const getFilteredFuelProducts = () => {
    let data = [...fuelProducts];

    // Apply search filter
    if (filters.search) {
      data = data.filter(item => 
        item.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.fuelCode?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.description?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply category filter
    if (filters.fuelCategoryId) {
      data = data.filter(item => item.fuelCategoryId === filters.fuelCategoryId);
    }

    // Apply sorting
    const [sortField, sortOrder] = filters.sortBy.split('-');
    data.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle special fields
      if (sortField === 'createdAt') {
        aValue = new Date(a.createdAt || a.updatedAt);
        bValue = new Date(b.createdAt || b.updatedAt);
      }

      if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  };

  // Filter and sort categories
  const getFilteredCategories = () => {
    let data = [...fuelCategories];

    // Apply search filter
    if (categoryFilter.search) {
      data = data.filter(item => 
        item.name?.toLowerCase().includes(categoryFilter.search.toLowerCase()) ||
        item.code?.toLowerCase().includes(categoryFilter.search.toLowerCase())
      );
    }

    // Apply sorting
    const [sortField, sortOrder] = categoryFilter.sortBy.split('-');
    data.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle special field: product count
      if (sortField === 'productCount') {
        aValue = a._count?.products || a.productCount || 0;
        bValue = b._count?.products || b.productCount || 0;
      }

      if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  };

  // Filter and sort pricing data
  const getFilteredPricingData = () => {
    let data = [...pricingData];

    // Apply search filter
    if (filters.search) {
      data = data.filter(item => 
        item.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.fuelCode?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply pricing filter
    if (filters.hasPricing !== null) {
      if (filters.hasPricing) {
        data = data.filter(item => item.hasPricing || (item.baseCostPrice && item.minSellingPrice && item.maxSellingPrice));
      } else {
        data = data.filter(item => !item.hasPricing && (!item.baseCostPrice || !item.minSellingPrice || !item.maxSellingPrice));
      }
    }

    // Apply sorting
    const [sortField, sortOrder] = filters.sortBy.split('-');
    data.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle special fields
      if (sortField === 'margin') {
        aValue = a.margin || ((a.maxSellingPrice - a.baseCostPrice) / a.baseCostPrice * 100) || 0;
        bValue = b.margin || ((b.maxSellingPrice - b.baseCostPrice) / b.baseCostPrice * 100) || 0;
      } else if (sortField === 'priceStatus') {
        const getStatusValue = (item) => {
          if (!item.baseCostPrice || !item.maxSellingPrice) return 0;
          const margin = ((item.maxSellingPrice - item.baseCostPrice) / item.baseCostPrice * 100);
          if (margin > 20) return 4;
          if (margin > 10) return 3;
          if (margin > 0) return 2;
          return 1;
        };
        aValue = getStatusValue(a);
        bValue = getStatusValue(b);
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  };

  // Get filtered data based on active tab
  const getFilteredData = useCallback(() => {
    switch (activeTab) {
      case 'fuel': return getFilteredFuelProducts();
      case 'pricing': return getFilteredPricingData();
      case 'categories': return getFilteredCategories();
      default: return [];
    }
  }, [activeTab, fuelProducts, pricingData, fuelCategories, filters, categoryFilter]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCategoryFilterChange = (key, value) => {
    setCategoryFilter(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      fuelCategoryId: '',
      hasPricing: null,
      sortBy: 'name-asc'
    });
  };

  const clearCategoryFilters = () => {
    setCategoryFilter({
      search: '',
      sortBy: 'name-asc'
    });
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const openCategoryModal = (category = null) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  const openPriceModal = (product = null) => {
    setSelectedProduct(product);
    setPriceModalVisible(true);
  };

  const openCategoryDrawer = (category) => {
    setSelectedCategory(category);
    setCategoryDrawerVisible(true);
  };

  const openProductDrawer = (product) => {
    setSelectedProduct(product);
    setProductDrawerVisible(true);
  };

  const handleEditProduct = async (product) => {
    try {
      // Fetch full product details
      const fullProduct = await fuelService.getFuelProductById(product.id);
      setSelectedProduct(fullProduct);
      setIsCreateModalOpen(true);
    } catch (error) {
      message.error(error.message || 'Failed to fetch product details');
    }
  };

  const handleDeleteProduct = async (product) => {
    confirm({
      title: 'Delete Fuel Product',
      content: (
        <div>
          <p>Are you sure you want to delete "{product.name}"?</p>
          <Alert
            type="warning"
            message="This action cannot be undone"
            showIcon
            style={{ marginTop: 8 }}
          />
          {product.fuelCode && (
            <p style={{ marginTop: 8, color: '#666' }}>
              Fuel Code: <strong>{product.fuelCode}</strong>
            </p>
          )}
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await fuelService.deleteFuelProduct(product.id);
          message.success(`Product "${product.name}" deleted successfully`);
          loadData();
        } catch (error) {
          message.error(error.message || 'Failed to delete product');
        }
      }
    });
  };

  const handleEditCategory = (category) => {
    openCategoryModal(category);
  };

  const handleDeleteCategory = async (category) => {
    const productCount = category._count?.products || category.productCount || 0;
    
    confirm({
      title: 'Delete Fuel Category',
      content: (
        <div>
          <p>Are you sure you want to delete "{category.name}"?</p>
          {productCount > 0 && (
            <Alert
              type="error"
              message={`Cannot delete: This category has ${productCount} product(s). Please delete or reassign them first.`}
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
          {productCount === 0 && (
            <Alert
              type="warning"
              message="This action cannot be undone"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
          <p style={{ marginTop: 8, color: '#666' }}>
            Category Code: <strong>{category.code}</strong>
          </p>
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          if (productCount > 0) {
            message.error(`Cannot delete category with ${productCount} products`);
            return;
          }
          await fuelService.deleteFuelCategory(category.id);
          message.success(`Category "${category.name}" deleted successfully`);
          loadData();
        } catch (error) {
          message.error(error.message || 'Failed to delete category');
        }
      }
    });
  };

  const handleProductCreated = () => {
    loadData();
    setIsCreateModalOpen(false);
    setSelectedProduct(null);
    message.success('Product created successfully');
  };

  const handleCategoryCreated = () => {
    loadData();
    setIsCategoryModalOpen(false);
    setSelectedCategory(null);
    message.success('Category saved successfully');
  };

  const handlePriceUpdate = async (priceData) => {
    try {
      await fuelService.updateProductPrices(priceData);
      message.success('Prices updated successfully');
      setPriceModalVisible(false);
      loadData();
    } catch (error) {
      message.error(error.message || 'Failed to update prices');
    }
  };

  // Format product data for display
  const formatProductData = (product) => {
    const formatted = { ...product };
    
    // Calculate margin if pricing exists
    if (product.baseCostPrice && product.maxSellingPrice) {
      const margin = ((product.maxSellingPrice - product.baseCostPrice) / product.baseCostPrice * 100);
      formatted.margin = margin.toFixed(1);
      formatted.marginStatus = margin < 0 ? 'unprofitable' : 
                               margin < 5 ? 'low' : 
                               margin < 15 ? 'fair' : 
                               margin < 25 ? 'good' : 'excellent';
      formatted.marginColor = formatted.marginStatus === 'excellent' ? 'green' :
                             formatted.marginStatus === 'good' ? 'blue' :
                             formatted.marginStatus === 'fair' ? 'cyan' :
                             formatted.marginStatus === 'low' ? 'orange' : 'red';
    }
    
    // Get category name
    if (product.fuelCategoryId || product.fuelCategory) {
      const category = product.fuelCategory || fuelCategories.find(cat => cat.id === product.fuelCategoryId);
      formatted.categoryName = category?.name || 'Unknown Category';
      formatted.categoryColor = category?.defaultColor || '#666666';
      formatted.fuelCategoryId = category?.id || product.fuelCategoryId;
    }
    
    // Format dates
    if (product.createdAt) {
      formatted.createdDate = new Date(product.createdAt).toLocaleDateString();
    }
    if (product.updatedAt) {
      formatted.updatedDate = new Date(product.updatedAt).toLocaleDateString();
    }
    
    return formatted;
  };

  // Format category data for display
  const formatCategoryData = (category) => {
    const formatted = { ...category };
    
    // Calculate product count
    formatted.productCount = category._count?.products || category.productCount || 0;
    
    // Format density
    if (category.typicalDensity) {
      formatted.densityFormatted = `${category.typicalDensity} g/cm³`;
    }
    
    return formatted;
  };

  // Table columns for fuel products
  const productColumns = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (name, record) => {
        const formatted = formatProductData(record);
        return (
          <Space>
            <Avatar 
              size="small" 
              style={{ 
                backgroundColor: formatted.categoryColor || '#fa8c16',
                color: 'white'
              }}
              icon={<FireOutlined />}
            />
            <div>
              <div style={{ fontWeight: 500 }}>
                {formatted.name}
                {formatted.fuelCode && (
                  <Tag color="blue" style={{ marginLeft: 8, fontSize: '11px', fontFamily: 'monospace' }}>
                    {formatted.fuelCode}
                  </Tag>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {formatted.categoryName || 'No category'}
              </Text>
            </div>
          </Space>
        );
      },
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Category',
      key: 'category',
      width: 150,
      render: (_, record) => {
        const formatted = formatProductData(record);
        return (
          <Tag 
            color="blue" 
            style={{ 
              backgroundColor: formatted.categoryColor ? `${formatted.categoryColor}20` : undefined,
              borderColor: formatted.categoryColor,
              color: formatted.categoryColor
            }}
          >
            {formatted.categoryName}
          </Tag>
        );
      },
      responsive: ['md'],
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (unit) => (
        <Tag style={{ fontFamily: 'monospace' }}>{unit || 'N/A'}</Tag>
      ),
      responsive: ['sm'],
    },
    {
      title: 'Pricing',
      key: 'pricing',
      width: 200,
      render: (_, record) => {
        const formatted = formatProductData(record);
        const hasPrices = record.baseCostPrice && record.minSellingPrice && record.maxSellingPrice;
        
        if (!hasPrices) {
          return (
            <Tooltip title="No pricing configured">
              <Tag color="orange" icon={<WarningOutlined />}>
                No Pricing
              </Tag>
            </Tooltip>
          );
        }
        
        return (
          <Space direction="vertical" size={2}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: '13px' }}>
                ${parseFloat(record.baseCostPrice).toFixed(2)}
              </Text>
              {formatted.margin && (
                <Tag 
                  color={formatted.marginColor} 
                  size="small"
                  style={{ marginLeft: 8, fontWeight: 'bold' }}
                >
                  {formatted.margin}%
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              ${parseFloat(record.minSellingPrice).toFixed(2)} - ${parseFloat(record.maxSellingPrice).toFixed(2)}
            </Text>
          </Space>
        );
      },
      responsive: ['lg'],
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const formatted = formatProductData(record);
        const hasPrices = record.baseCostPrice && record.minSellingPrice && record.maxSellingPrice;
        
        if (!hasPrices) {
          return <Tag color="orange">Missing Prices</Tag>;
        }
        
        return (
          <Tag color={formatted.marginColor} style={{ fontWeight: '500' }}>
            {formatted.marginStatus?.toUpperCase()}
          </Tag>
        );
      },
      responsive: ['sm'],
    },
    {
      title: 'Created',
      key: 'created',
      width: 120,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'N/A'}
        </Text>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => openProductDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEditProduct(record)}
            />
          </Tooltip>
          <Tooltip title="Update Pricing">
            <Button 
              size="small" 
              icon={<DollarOutlined />}
              onClick={() => openPriceModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Product"
            description="Are you sure you want to delete this product?"
            onConfirm={() => handleDeleteProduct(record)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Tooltip title="Delete">
              <Button 
                size="small" 
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Table columns for pricing management
  const pricingColumns = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (name, record) => {
        const formatted = formatProductData(record);
        return (
          <Space>
            <Avatar 
              size="small" 
              style={{ 
                backgroundColor: formatted.categoryColor || '#fa8c16',
                color: 'white'
              }}
              icon={<FireOutlined />}
            />
            <div>
              <div style={{ fontWeight: 500 }}>
                {formatted.name}
                {formatted.fuelCode && (
                  <Tag color="blue" style={{ marginLeft: 8, fontSize: '11px', fontFamily: 'monospace' }}>
                    {formatted.fuelCode}
                  </Tag>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {formatted.categoryName || 'No category'}
              </Text>
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Category',
      key: 'category',
      width: 150,
      render: (_, record) => {
        const formatted = formatProductData(record);
        return (
          <Tag color="blue">
            {formatted.categoryName}
          </Tag>
        );
      },
      responsive: ['md'],
    },
    {
      title: 'Base Cost',
      dataIndex: 'baseCostPrice',
      key: 'baseCostPrice',
      width: 120,
      render: (price) => (
        <Text strong style={{ color: price ? '#1890ff' : '#999' }}>
          {price ? `$${parseFloat(price).toFixed(2)}` : '-'}
        </Text>
      ),
      sorter: (a, b) => (a.baseCostPrice || 0) - (b.baseCostPrice || 0),
      responsive: ['md'],
    },
    {
      title: 'Min Price',
      dataIndex: 'minSellingPrice',
      key: 'minSellingPrice',
      width: 120,
      render: (price) => (
        <Text style={{ color: price ? '#52c41a' : '#999' }}>
          {price ? `$${parseFloat(price).toFixed(2)}` : '-'}
        </Text>
      ),
      responsive: ['md'],
    },
    {
      title: 'Max Price',
      dataIndex: 'maxSellingPrice',
      key: 'maxSellingPrice',
      width: 120,
      render: (price) => (
        <Text strong style={{ color: price ? '#fa8c16' : '#999' }}>
          {price ? `$${parseFloat(price).toFixed(2)}` : '-'}
        </Text>
      ),
      responsive: ['md'],
    },
    {
      title: 'Spread',
      key: 'spread',
      width: 100,
      render: (_, record) => {
        const { minSellingPrice, maxSellingPrice } = record;
        if (!minSellingPrice || !maxSellingPrice) return '-';
        const spread = parseFloat(maxSellingPrice) - parseFloat(minSellingPrice);
        return (
          <Text type="secondary">
            ${spread.toFixed(2)}
          </Text>
        );
      },
      responsive: ['lg'],
    },
    {
      title: 'Margin',
      key: 'margin',
      width: 120,
      render: (_, record) => {
        const formatted = formatProductData(record);
        if (!formatted.margin) return <Tag color="default">No Data</Tag>;
        
        return (
          <Tag 
            color={formatted.marginColor} 
            style={{ fontWeight: 'bold', minWidth: 60, textAlign: 'center' }}
          >
            {formatted.margin}%
          </Tag>
        );
      },
      sorter: (a, b) => {
        const marginA = formatProductData(a).margin || 0;
        const marginB = formatProductData(b).margin || 0;
        return marginA - marginB;
      },
      responsive: ['sm'],
    },
    {
      title: 'Status',
      key: 'priceStatus',
      width: 120,
      render: (_, record) => {
        const formatted = formatProductData(record);
        const hasAllPrices = record.baseCostPrice && record.minSellingPrice && record.maxSellingPrice;
        
        if (!hasAllPrices) {
          return <Tag color="orange" icon={<WarningOutlined />}>Incomplete</Tag>;
        }
        
        const statusText = formatted.marginStatus === 'excellent' ? 'Excellent' :
                          formatted.marginStatus === 'good' ? 'Good' :
                          formatted.marginStatus === 'fair' ? 'Fair' :
                          formatted.marginStatus === 'low' ? 'Low' : 'Unprofitable';
        
        return (
          <Tag color={formatted.marginColor} style={{ fontWeight: '500' }}>
            {statusText}
          </Tag>
        );
      },
      responsive: ['sm'],
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Update Prices">
            <Button 
              size="small" 
              type="primary"
              onClick={() => openPriceModal(record)}
              icon={<DollarOutlined />}
            >
              {screens.xs ? '' : 'Update'}
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  // Table columns for categories
  const categoryColumns = [
    {
      title: 'Category',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => {
        const formatted = formatCategoryData(record);
        return (
          <Space>
            <div 
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                backgroundColor: record.defaultColor || '#1890ff'
              }}
            />
            <div>
              <div style={{ fontWeight: 500 }}>
                {record.name}
                <Tag color="blue" style={{ marginLeft: 8, fontSize: '11px', fontFamily: 'monospace' }}>
                  {record.code}
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {formatted.productCount} product(s)
              </Text>
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>{code}</Tag>
      ),
      responsive: ['sm'],
    },
    {
      title: 'Products',
      key: 'products',
      width: 120,
      render: (_, record) => {
        const formatted = formatCategoryData(record);
        return (
          <Statistic
            value={formatted.productCount}
            valueStyle={{ 
              color: formatted.productCount > 0 ? '#52c41a' : '#999',
              fontSize: '18px'
            }}
            prefix={<DatabaseOutlined />}
          />
        );
      },
      sorter: (a, b) => {
        const countA = (a._count?.products || a.productCount || 0);
        const countB = (b._count?.products || b.productCount || 0);
        return countA - countB;
      },
    },
    {
      title: 'Density',
      dataIndex: 'typicalDensity',
      key: 'density',
      width: 120,
      render: (density) => (
        <Text type="secondary">
          {density ? `${density} g/cm³` : 'N/A'}
        </Text>
      ),
      responsive: ['md'],
    },
    {
      title: 'Color',
      dataIndex: 'defaultColor',
      key: 'color',
      width: 100,
      render: (color) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: color || '#666',
              marginRight: 8,
              border: '1px solid #d9d9d9'
            }}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {color || 'Default'}
          </Text>
        </div>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Created',
      key: 'created',
      width: 120,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'N/A'}
        </Text>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => openCategoryDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEditCategory(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Category"
            description={`Are you sure you want to delete "${record.name}"?`}
            onConfirm={() => handleDeleteCategory(record)}
            okText="Yes"
            cancelText="No"
            okType="danger"
            disabled={(record._count?.products || record.productCount || 0) > 0}
          >
            <Tooltip 
              title={(record._count?.products || record.productCount || 0) > 0 ? 
                "Cannot delete: Category has products" : 
                "Delete"
              }
            >
              <Button 
                size="small" 
                danger
                icon={<DeleteOutlined />}
                disabled={(record._count?.products || record.productCount || 0) > 0}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Mobile card view for products
  const renderProductMobileCard = (product) => {
    const formatted = formatProductData(product);
    const hasPrices = product.baseCostPrice && product.minSellingPrice && product.maxSellingPrice;
    
    return (
      <Card 
        key={product.id} 
        size="small" 
        style={{ marginBottom: 12 }}
        actions={[
          <Tooltip title="View Details">
            <EyeOutlined onClick={() => openProductDrawer(product)} />
          </Tooltip>,
          <Tooltip title="Edit">
            <EditOutlined onClick={() => handleEditProduct(product)} />
          </Tooltip>,
          <Tooltip title="Update Prices">
            <DollarOutlined onClick={() => openPriceModal(product)} />
          </Tooltip>,
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete Product"
              description="Are you sure?"
              onConfirm={() => handleDeleteProduct(product)}
              okText="Yes"
              cancelText="No"
            >
              <DeleteOutlined style={{ color: '#ff4d4f' }} />
            </Popconfirm>
          </Tooltip>,
        ]}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Space direction="vertical" size="small" style={{ flex: 1 }}>
            <Space>
              <Avatar 
                size="small" 
                style={{ 
                  backgroundColor: formatted.categoryColor || '#fa8c16',
                  color: 'white'
                }}
                icon={<FireOutlined />}
              />
              <div>
                <Text strong>{formatted.name}</Text>
                <div style={{ marginTop: 4 }}>
                  {formatted.fuelCode && (
                    <Tag color="blue" size="small" style={{ fontFamily: 'monospace' }}>
                      {formatted.fuelCode}
                    </Tag>
                  )}
                  <Tag color="green" size="small">Active</Tag>
                  <Tag color={hasPrices ? 'blue' : 'orange'} size="small">
                    {hasPrices ? 'Priced' : 'No Price'}
                  </Tag>
                </div>
              </div>
            </Space>
            
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Category: {formatted.categoryName}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Unit: {product.unit || 'N/A'}
              </Text>
              {hasPrices && (
                <>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Cost: ${parseFloat(product.baseCostPrice).toFixed(2)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Price: ${parseFloat(product.minSellingPrice).toFixed(2)} - ${parseFloat(product.maxSellingPrice).toFixed(2)}
                  </Text>
                  {formatted.margin && (
                    <Text 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 'bold',
                        color: formatted.marginColor === 'green' ? '#52c41a' :
                               formatted.marginColor === 'blue' ? '#1890ff' :
                               formatted.marginColor === 'orange' ? '#fa8c16' : '#ff4d4f'
                      }}
                    >
                      Margin: {formatted.margin}%
                    </Text>
                  )}
                </>
              )}
              {product.description && (
                <Text type="secondary" style={{ fontSize: '11px', marginTop: 4 }}>
                  {product.description.substring(0, 80)}
                  {product.description.length > 80 ? '...' : ''}
                </Text>
              )}
            </Space>
          </Space>
        </div>
      </Card>
    );
  };

  // Mobile card view for categories
  const renderCategoryMobileCard = (category) => {
    const formatted = formatCategoryData(category);
    
    return (
      <Card 
        key={category.id} 
        size="small" 
        style={{ marginBottom: 12 }}
        actions={[
          <Tooltip title="View Details">
            <EyeOutlined onClick={() => openCategoryDrawer(category)} />
          </Tooltip>,
          <Tooltip title="Edit">
            <EditOutlined onClick={() => handleEditCategory(category)} />
          </Tooltip>,
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete Category"
              description="Are you sure?"
              onConfirm={() => handleDeleteCategory(category)}
              okText="Yes"
              cancelText="No"
              disabled={formatted.productCount > 0}
            >
              <DeleteOutlined 
                style={{ 
                  color: formatted.productCount > 0 ? '#999' : '#ff4d4f'
                }} 
              />
            </Popconfirm>
          </Tooltip>,
        ]}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Space direction="vertical" size="small" style={{ flex: 1 }}>
            <Space>
              <div 
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: category.defaultColor || '#1890ff'
                }}
              />
              <div>
                <Text strong>{category.name}</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue" size="small" style={{ fontFamily: 'monospace' }}>
                    {category.code}
                  </Tag>
                  <Tag 
                    color={formatted.productCount > 0 ? 'green' : 'default'} 
                    size="small"
                  >
                    {formatted.productCount} product(s)
                  </Tag>
                </div>
              </div>
            </Space>
            
            <Space direction="vertical" size={0}>
              {category.typicalDensity && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Density: {category.typicalDensity} g/cm³
                </Text>
              )}
              {category.hazardClass && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Hazard: {category.hazardClass}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: '11px', marginTop: 4 }}>
                Color: <span style={{ color: category.defaultColor || '#666' }}>
                  {category.defaultColor || 'Default'}
                </span>
              </Text>
            </Space>
          </Space>
        </div>
      </Card>
    );
  };

  const filteredData = getFilteredData();
  const hasActiveFilters = filters.search || filters.fuelCategoryId || filters.hasPricing !== null;
  const hasActiveCategoryFilters = categoryFilter.search;

  // Calculate pricing stats from product data
  const calculatedPricingStats = useMemo(() => {
    if (pricingStats.total !== undefined) {
      // Use stats from service response
      return {
        total: pricingStats.total || 0,
        priced: pricingStats.priced || 0,
        unpriced: pricingStats.unpriced || 0,
        avgMargin: pricingStats.avgMargin || 0,
        excellent: pricingStats.excellent || 0,
        good: pricingStats.good || 0,
        fair: pricingStats.fair || 0,
        low: pricingStats.low || 0,
        unprofitable: pricingStats.unprofitable || 0,
        profitablePercentage: pricingStats.profitablePercentage || 0
      };
    }

    // Fallback to calculated stats
    return pricingStats;
  }, [pricingStats]);

  // Calculate category stats from service data
  const calculatedCategoryStats = useMemo(() => {
    const categoriesWithProducts = fuelCategories.filter(cat => 
      (cat._count?.products || cat.productCount || 0) > 0
    ).length;
    
    return {
      total: fuelCategories.length,
      withProducts: categoriesWithProducts,
      totalProducts: fuelProducts.length,
      avgProductsPerCategory: fuelCategories.length > 0 ? (fuelProducts.length / fuelCategories.length).toFixed(1) : 0
    };
  }, [fuelCategories, fuelProducts]);

  // Create button items for dropdown on mobile
  const createItems = [
    {
      key: 'add-product',
      label: 'Add Fuel Product',
      icon: <FireOutlined />,
      onClick: () => openCreateModal()
    },
    {
      key: 'add-category',
      label: 'Add Fuel Category',
      icon: <LocateFixed />,
      onClick: () => openCategoryModal()
    }
  ];

  return (
    <div style={{ padding: screens.xs ? 16 : 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Fuel Management</Title>
          <Text type="secondary">
            Manage fuel products and categories for {state.currentUser?.company?.name}
          </Text>
        </Col>
        <Col>
          <Space>
            {activeTab === 'pricing' && (
              <Button 
                icon={<BarChartOutlined />}
                onClick={async () => {
                  try {
                    const analytics = await fuelService.getPricingAnalytics();
                    message.info('Analytics loaded: ' + analytics.data?.overview?.total + ' products analyzed');
                  } catch (error) {
                    message.error('Failed to load analytics');
                  }
                }}
              >
                Analytics
              </Button>
            )}
            
            {screens.xs ? (
              // Mobile: Show dropdown button
              <Dropdown
                menu={{ items: createItems }}
                placement="bottomRight"
              >
                <Button type="primary" icon={<PlusOutlined />}>
                  Add <DownOutlined />
                </Button>
              </Dropdown>
            ) : (
              // Desktop: Show both buttons side by side
              <Space>
                <Button 
                  type="primary" 
                  icon={<FireOutlined />}
                  onClick={openCreateModal}
                >
                  Add Product
                </Button>
                <Button 
                  icon={<LocateFixed />}
                  onClick={() => openCategoryModal()}
                >
                  Add Category
                </Button>
              </Space>
            )}
          </Space>
        </Col>
      </Row>

      {/* Stats Section */}
      {activeTab === 'pricing' && !screens.xs && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Products"
                value={calculatedPricingStats.total}
                valueStyle={{ color: '#1890ff' }}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Priced Products"
                value={calculatedPricingStats.priced}
                valueStyle={{ color: '#52c41a' }}
                prefix={<DollarOutlined />}
                suffix={`/ ${calculatedPricingStats.total}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Avg Margin"
                value={calculatedPricingStats.avgMargin}
                suffix="%"
                valueStyle={{ 
                  color: calculatedPricingStats.avgMargin > 15 ? '#52c41a' : 
                         calculatedPricingStats.avgMargin > 5 ? '#fa8c16' : '#ff4d4f' 
                }}
                prefix={calculatedPricingStats.avgMargin > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Needs Attention"
                value={calculatedPricingStats.unprofitable || 0}
                valueStyle={{ color: (calculatedPricingStats.unprofitable || 0) > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {activeTab === 'categories' && !screens.xs && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Categories"
                value={calculatedCategoryStats.total}
                valueStyle={{ color: '#1890ff' }}
                prefix={<LocateFixed />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="With Products"
                value={calculatedCategoryStats.withProducts}
                valueStyle={{ color: '#52c41a' }}
                prefix={<DatabaseOutlined />}
                suffix={`/ ${calculatedCategoryStats.total}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Products"
                value={calculatedCategoryStats.totalProducts}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<FireOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Avg Products/Category"
                value={calculatedCategoryStats.avgProductsPerCategory}
                valueStyle={{ color: '#722ed1' }}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Alerts */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError('')}
          action={
            <Button size="small" onClick={loadData}>
              <ReloadOutlined /> Retry
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          {activeTab !== 'categories' ? (
            <>
              <Col xs={24} sm={12} md={6}>
                <Search
                  placeholder={`Search ${activeTab === 'pricing' ? 'products' : 'fuel products'}...`}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  allowClear
                  enterButton={<SearchOutlined />}
                />
              </Col>

              {activeTab === 'fuel' && fuelCategories.length > 0 && (
                <Col xs={12} sm={6} md={4}>
                  <Select
                    placeholder="Filter by category"
                    value={filters.fuelCategoryId}
                    onChange={(value) => handleFilterChange('fuelCategoryId', value)}
                    style={{ width: '100%' }}
                    allowClear
                  >
                    {fuelCategories.map(cat => (
                      <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                    ))}
                  </Select>
                </Col>
              )}

              {activeTab === 'pricing' && (
                <Col xs={12} sm={6} md={4}>
                  <Select
                    placeholder="Pricing Status"
                    value={filters.hasPricing}
                    onChange={(value) => handleFilterChange('hasPricing', value)}
                    style={{ width: '100%' }}
                    allowClear
                  >
                    <Option value={true}>Priced</Option>
                    <Option value={false}>Missing Prices</Option>
                  </Select>
                </Col>
              )}

              <Col xs={12} sm={6} md={4}>
                <Select
                  placeholder="Sort By"
                  value={filters.sortBy}
                  onChange={(value) => handleFilterChange('sortBy', value)}
                  style={{ width: '100%' }}
                >
                  {(sortOptions[activeTab] || []).map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={loadData}
                  style={{ width: '100%' }}
                >
                  {screens.xs ? '' : 'Refresh'}
                </Button>
              </Col>

              {hasActiveFilters && (
                <Col xs={24} sm={6} md={3}>
                  <Button 
                    icon={<FilterOutlined />}
                    onClick={clearFilters}
                    style={{ width: '100%' }}
                  >
                    Clear Filters
                  </Button>
                </Col>
              )}
            </>
          ) : (
            <>
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="Search categories..."
                  value={categoryFilter.search}
                  onChange={(e) => handleCategoryFilterChange('search', e.target.value)}
                  allowClear
                  enterButton={<SearchOutlined />}
                />
              </Col>

              <Col xs={12} sm={6} md={4}>
                <Select
                  placeholder="Sort By"
                  value={categoryFilter.sortBy}
                  onChange={(value) => handleCategoryFilterChange('sortBy', value)}
                  style={{ width: '100%' }}
                >
                  {(sortOptions.categories || []).map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Col>

              <Col xs={12} sm={6} md={4}>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={loadData}
                  style={{ width: '100%' }}
                >
                  Refresh
                </Button>
              </Col>

              {hasActiveCategoryFilters && (
                <Col xs={24} sm={6} md={4}>
                  <Button 
                    icon={<FilterOutlined />}
                    onClick={clearCategoryFilters}
                    style={{ width: '100%' }}
                  >
                    Clear Filters
                  </Button>
                </Col>
              )}
            </>
          )}
        </Row>
      </Card>

      {/* Main Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type={screens.xs ? "card" : "line"}
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
        ) : filteredData.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              (activeTab !== 'categories' && hasActiveFilters) || 
              (activeTab === 'categories' && hasActiveCategoryFilters)
                ? 'No items match your search criteria' 
                : `No ${activeTab} found`
            }
          >
            <Space>
              {activeTab === 'categories' ? (
                <Button type="primary" icon={<LocateFixed />} onClick={() => openCategoryModal()}>
                  Add Category
                </Button>
              ) : (
                <Button type="primary" icon={<FireOutlined />} onClick={openCreateModal}>
                  Add Product
                </Button>
              )}
              {((activeTab !== 'categories' && hasActiveFilters) || 
                (activeTab === 'categories' && hasActiveCategoryFilters)) && (
                <Button onClick={activeTab === 'categories' ? clearCategoryFilters : clearFilters}>
                  Clear Filters
                </Button>
              )}
            </Space>
          </Empty>
        ) : screens.xs ? (
          // Mobile Card View
          <div style={{ marginTop: 16 }}>
            {activeTab === 'categories' 
              ? filteredData.map(renderCategoryMobileCard)
              : filteredData.map(renderProductMobileCard)
            }
          </div>
        ) : (
          // Desktop Table View
          <Table
            columns={activeTab === 'pricing' ? pricingColumns : 
                    activeTab === 'categories' ? categoryColumns : 
                    productColumns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} ${activeTab === 'categories' ? 'categories' : 'products'}`
            }}
            scroll={{ 
              x: activeTab === 'pricing' ? 1200 : 
                  activeTab === 'categories' ? 1000 : 
                  900 
            }}
          />
        )}
      </Card>

      {/* Create Product Modal */}
      <CreateFuelModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedProduct(null);
        }}
        onProductCreated={handleProductCreated}
        companyId={state.currentUser?.companyId}
        editProduct={selectedProduct}
      />

      {/* Create/Edit Category Modal */}
      <CreateCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setSelectedCategory(null);
        }}
        onCategoryCreated={handleCategoryCreated}
        category={selectedCategory}
        companyId={state.currentUser?.companyId}
      />

      {/* Price Update Modal */}
      <Modal
        title="Update Product Prices"
        open={priceModalVisible}
        onCancel={() => setPriceModalVisible(false)}
        footer={null}
        width={500}
      >
        {selectedProduct && (
          <Form
            layout="vertical"
            onFinish={handlePriceUpdate}
            initialValues={{
              productId: selectedProduct.id,
              baseCostPrice: selectedProduct.baseCostPrice,
              minSellingPrice: selectedProduct.minSellingPrice,
              maxSellingPrice: selectedProduct.maxSellingPrice
            }}
          >
            <Form.Item label="Product">
              <Input 
                value={selectedProduct.name}
                disabled 
                addonBefore={selectedProduct.fuelCode ? <FireOutlined /> : <ShoppingOutlined />}
                addonAfter={selectedProduct.fuelCode && `[${selectedProduct.fuelCode}]`}
              />
            </Form.Item>
            
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="baseCostPrice"
                  label="Base Cost"
                >
                  <Input 
                    type="number"
                    min={0}
                    step="0.01"
                    prefix="$"
                    placeholder="0.00"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="minSellingPrice"
                  label="Min Price"
                >
                  <Input 
                    type="number"
                    min={0}
                    step="0.01"
                    prefix="$"
                    placeholder="0.00"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="maxSellingPrice"
                  label="Max Price"
                >
                  <Input 
                    type="number"
                    min={0}
                    step="0.01"
                    prefix="$"
                    placeholder="0.00"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Space style={{ float: 'right' }}>
                <Button onClick={() => setPriceModalVisible(false)}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  Update Prices
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Category Detail Drawer */}
      <Drawer
        title="Category Details"
        placement="right"
        onClose={() => setCategoryDrawerVisible(false)}
        open={categoryDrawerVisible}
        width={screens.xs ? '100%' : 600}
      >
        {selectedCategory && (
          <>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Name">
                <Space>
                  <div 
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      backgroundColor: selectedCategory.defaultColor || '#1890ff'
                    }}
                  />
                  <Text strong>{selectedCategory.name}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Code">
                <Tag color="blue" style={{ fontFamily: 'monospace' }}>
                  {selectedCategory.code}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Products">
                <Statistic
                  value={selectedCategory._count?.products || selectedCategory.productCount || 0}
                  valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                  prefix={<DatabaseOutlined />}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Density">
                <Text>
                  {selectedCategory.typicalDensity ? `${selectedCategory.typicalDensity} g/cm³` : 'N/A'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Hazard Class">
                <Text>
                  {selectedCategory.hazardClass || 'N/A'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Color">
                <Space>
                  <div 
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: selectedCategory.defaultColor || '#666',
                      border: '1px solid #d9d9d9'
                    }}
                  />
                  <Text code>{selectedCategory.defaultColor || 'Default'}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                <Text type="secondary">
                  {selectedCategory.createdAt ? new Date(selectedCategory.createdAt).toLocaleString() : 'N/A'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                <Text type="secondary">
                  {selectedCategory.updatedAt ? new Date(selectedCategory.updatedAt).toLocaleString() : 'N/A'}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {selectedCategory.description && (
              <div style={{ marginTop: 24 }}>
                <Title level={5}>Description</Title>
                <Text>{selectedCategory.description}</Text>
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => {
                  setCategoryDrawerVisible(false);
                  handleEditCategory(selectedCategory);
                }}
              >
                Edit Category
              </Button>
              <Popconfirm
                title="Delete Category"
                description={`Are you sure you want to delete "${selectedCategory.name}"?`}
                onConfirm={() => {
                  handleDeleteCategory(selectedCategory);
                  setCategoryDrawerVisible(false);
                }}
                okText="Yes"
                cancelText="No"
                okType="danger"
                disabled={(selectedCategory._count?.products || selectedCategory.productCount || 0) > 0}
              >
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  disabled={(selectedCategory._count?.products || selectedCategory.productCount || 0) > 0}
                >
                  Delete
                </Button>
              </Popconfirm>
            </div>
          </>
        )}
      </Drawer>

      {/* Product Detail Drawer */}
      <Drawer
        title="Product Details"
        placement="right"
        onClose={() => setProductDrawerVisible(false)}
        open={productDrawerVisible}
        width={screens.xs ? '100%' : 600}
      >
        {selectedProduct && (
          <>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Name">
                <Text strong>{selectedProduct.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Fuel Code">
                <Tag color="blue" style={{ fontFamily: 'monospace' }}>
                  {selectedProduct.fuelCode || 'Auto-generated'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                <Space>
                  {(() => {
                    const category = selectedProduct.fuelCategory || fuelCategories.find(c => c.id === selectedProduct.fuelCategoryId);
                    return (
                      <>
                        {category?.defaultColor && (
                          <div 
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              backgroundColor: category.defaultColor
                            }}
                          />
                        )}
                        <Text>{category?.name || 'Unknown Category'}</Text>
                      </>
                    );
                  })()}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Unit">
                <Tag style={{ fontFamily: 'monospace' }}>{selectedProduct.unit || 'N/A'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color="green">Active</Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* Pricing Section */}
            <Divider orientation="left">Pricing</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Base Cost"
                  value={selectedProduct.baseCostPrice ? parseFloat(selectedProduct.baseCostPrice).toFixed(2) : 'N/A'}
                  prefix="$"
                  valueStyle={{ 
                    color: selectedProduct.baseCostPrice ? '#1890ff' : '#999',
                    fontSize: '20px'
                  }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Min Price"
                  value={selectedProduct.minSellingPrice ? parseFloat(selectedProduct.minSellingPrice).toFixed(2) : 'N/A'}
                  prefix="$"
                  valueStyle={{ 
                    color: selectedProduct.minSellingPrice ? '#52c41a' : '#999',
                    fontSize: '20px'
                  }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Max Price"
                  value={selectedProduct.maxSellingPrice ? parseFloat(selectedProduct.maxSellingPrice).toFixed(2) : 'N/A'}
                  prefix="$"
                  valueStyle={{ 
                    color: selectedProduct.maxSellingPrice ? '#fa8c16' : '#999',
                    fontSize: '20px'
                  }}
                />
              </Col>
            </Row>

            {selectedProduct.baseCostPrice && selectedProduct.maxSellingPrice && (
              <Row style={{ marginTop: 16 }}>
                <Col span={24}>
                  {(() => {
                    const formatted = formatProductData(selectedProduct);
                    return (
                      <Alert
                        message={`Margin: ${formatted.margin || '0'}%`}
                        description={`Price Status: ${formatted.marginStatus?.toUpperCase() || 'UNKNOWN'}`}
                        type={
                          formatted.marginStatus === 'excellent' ? 'success' :
                          formatted.marginStatus === 'good' ? 'info' :
                          formatted.marginStatus === 'fair' ? 'warning' :
                          formatted.marginStatus === 'low' ? 'warning' : 'error'
                        }
                        showIcon
                      />
                    );
                  })()}
                </Col>
              </Row>
            )}

            {/* Technical Specs */}
            {(selectedProduct.density || selectedProduct.octaneRating || selectedProduct.sulfurContent || selectedProduct.flashPoint) && (
              <>
                <Divider orientation="left">Technical Specifications</Divider>
                <Row gutter={16}>
                  {selectedProduct.density && (
                    <Col span={6}>
                      <Statistic
                        title="Density"
                        value={selectedProduct.density}
                        suffix="g/cm³"
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                  )}
                  {selectedProduct.octaneRating && (
                    <Col span={6}>
                      <Statistic
                        title="Octane"
                        value={selectedProduct.octaneRating}
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                  )}
                  {selectedProduct.sulfurContent && (
                    <Col span={6}>
                      <Statistic
                        title="Sulfur"
                        value={selectedProduct.sulfurContent}
                        suffix="ppm"
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                  )}
                  {selectedProduct.flashPoint && (
                    <Col span={6}>
                      <Statistic
                        title="Flash Point"
                        value={selectedProduct.flashPoint}
                        suffix="°C"
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                  )}
                </Row>
              </>
            )}

            {selectedProduct.description && (
              <>
                <Divider orientation="left">Description</Divider>
                <Text>{selectedProduct.description}</Text>
              </>
            )}

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={() => {
                    setProductDrawerVisible(false);
                    handleEditProduct(selectedProduct);
                  }}
                >
                  Edit
                </Button>
                <Button 
                  icon={<DollarOutlined />}
                  onClick={() => {
                    setProductDrawerVisible(false);
                    openPriceModal(selectedProduct);
                  }}
                >
                  Update Prices
                </Button>
              </Space>
              <Popconfirm
                title="Delete Product"
                description={`Are you sure you want to delete "${selectedProduct.name}"?`}
                onConfirm={() => {
                  handleDeleteProduct(selectedProduct);
                  setProductDrawerVisible(false);
                }}
                okText="Yes"
                cancelText="No"
                okType="danger"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default ProductManagement;