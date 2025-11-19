import React, { useState, useEffect, useMemo } from 'react';
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
  Dropdown,
  Menu,
  Typography,
  Divider,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  ContainerOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { useApp } from '../../../../context/AppContext';
import CreateFuelModal from './create/CreateFuelModal';
import { fuelService } from '../../../../services/fuelService/fuelService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Search } = Input;
const { useBreakpoint } = Grid;
const { confirm } = Modal;

const FuelManagement = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('products');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subTypes, setSubTypes] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subType: '',
    sortBy: 'name-asc'
  });

  const screens = useBreakpoint();

  const tabs = [
    { 
      key: 'products', 
      label: 'Products', 
      icon: <DatabaseOutlined />,
      count: products.length 
    },
    { 
      key: 'subtypes', 
      label: 'Sub Types', 
      icon: <ContainerOutlined />,
      count: subTypes.length 
    },
    { 
      key: 'categories', 
      label: 'Categories', 
      icon: <AppstoreOutlined />,
      count: categories.length 
    }
  ];

  // Sort options
  const sortOptions = {
    products: [
      { value: 'name-asc', label: 'Name A-Z' },
      { value: 'name-desc', label: 'Name Z-A' },
      { value: 'code-asc', label: 'Code A-Z' },
      { value: 'code-desc', label: 'Code Z-A' },
      { value: 'density-asc', label: 'Density Low-High' },
      { value: 'density-desc', label: 'Density High-Low' }
    ],
    subtypes: [
      { value: 'name-asc', label: 'Name A-Z' },
      { value: 'name-desc', label: 'Name Z-A' },
      { value: 'code-asc', label: 'Code A-Z' },
      { value: 'code-desc', label: 'Code Z-A' }
    ],
    categories: [
      { value: 'name-asc', label: 'Name A-Z' },
      { value: 'name-desc', label: 'Name Z-A' },
      { value: 'code-asc', label: 'Code A-Z' },
      { value: 'code-desc', label: 'Code Z-A' }
    ]
  };

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [productsData, categoriesData, subTypesData] = await Promise.all([
        fuelService.getFuelProducts(),
        fuelService.getFuelCategories(),
        fuelService.getFuelSubTypes()
      ]);

      setProducts(productsData?.products || productsData || []);
      setCategories(categoriesData || []);
      setSubTypes(subTypesData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error.message || 'Failed to load data');
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and sort data
  const getFilteredData = () => {
    let data = [];
    
    switch (activeTab) {
      case 'products': data = [...products]; break;
      case 'subtypes': data = [...subTypes]; break;
      case 'categories': data = [...categories]; break;
      default: data = [];
    }

    // Apply search filter
    if (filters.search) {
      data = data.filter(item => 
        item.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.code?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.fuelCode?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply category filter (for products and subtypes)
    if (filters.category && activeTab !== 'categories') {
      data = data.filter(item => 
        item.categoryId === filters.category || 
        item.category?.id === filters.category
      );
    }

    // Apply subtype filter (for products only)
    if (filters.subType && activeTab === 'products') {
      data = data.filter(item => item.fuelSubTypeId === filters.subType);
    }

    // Apply sorting
    const [sortField, sortOrder] = filters.sortBy.split('-');
    data.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      // Handle nested fields
      if (sortField === 'category' && a.category) aValue = a.category.name;
      if (sortField === 'category' && b.category) bValue = b.category.name;
      if (sortField === 'fuelSubType' && a.fuelSubType) aValue = a.fuelSubType.name;
      if (sortField === 'fuelSubType' && b.fuelSubType) bValue = b.fuelSubType.name;

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      subType: '',
      sortBy: 'name-asc'
    });
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleEdit = (item) => {
    message.info('Edit functionality to be implemented');
  };

  const handleDelete = (item) => {
    confirm({
      title: `Delete ${getItemTypeLabel()}`,
      content: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await fuelService.deleteFuelProduct(item.id);
          message.success(`${getItemTypeLabel()} deleted successfully`);
          loadData();
        } catch (error) {
          message.error(error.message || `Failed to delete ${getItemTypeLabel()}`);
        }
      }
    });
  };

  const handleFuelCreated = () => {
    loadData();
    setIsCreateModalOpen(false);
    message.success('Fuel item created successfully');
  };

  const getItemTypeLabel = () => {
    switch (activeTab) {
      case 'products': return 'Product';
      case 'subtypes': return 'Sub Type';
      case 'categories': return 'Category';
      default: return 'Item';
    }
  };

  const getItemIcon = () => {
    switch (activeTab) {
      case 'products': return <DatabaseOutlined />;
      case 'subtypes': return <ContainerOutlined />;
      case 'categories': return <AppstoreOutlined />;
      default: return <DatabaseOutlined />;
    }
  };

  const getItemColor = () => {
    switch (activeTab) {
      case 'products': return 'orange';
      case 'subtypes': return 'green';
      case 'categories': return 'blue';
      default: return 'default';
    }
  };

  // Format data for display
  const formatItemData = (item) => {
    switch (activeTab) {
      case 'products':
        return {
          ...item,
          parentName: item.fuelSubType?.name || 'No Sub Type',
          code: item.fuelCode,
          specifications: [
            item.density && `${item.density} kg/L`,
            item.octaneRating && `RON ${item.octaneRating}`,
            item.sulfurContent && `${item.sulfurContent}ppm S`
          ].filter(Boolean).join(' • ') || 'No specs',
          categoryName: item.fuelSubType?.category?.name || 'N/A'
        };
      case 'subtypes':
        return {
          ...item,
          parentName: item.category?.name || 'No Category',
          code: item.code,
          specifications: item.specification || 'No specification'
        };
      case 'categories':
        return {
          ...item,
          parentName: '-',
          code: item.code,
          specifications: item.defaultColor ? `Color: ${item.defaultColor}` : 'No specs'
        };
      default:
        return item;
    }
  };

  // Table columns for desktop
  const columns = [
    {
      title: 'Details',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => {
        const formattedItem = formatItemData(record);
        return (
          <Space>
            <Avatar 
              size="small" 
              style={{ backgroundColor: getItemColor() === 'orange' ? '#fa8c16' : getItemColor() === 'green' ? '#52c41a' : '#1890ff' }}
              icon={getItemIcon()}
            />
            <div>
              <div style={{ fontWeight: 500 }}>{formattedItem.name}</div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ID: {record.id?.substring(0, 8)}...
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
      render: (code, record) => {
        const formattedItem = formatItemData(record);
        return (
          <Tag color="blue" style={{ fontFamily: 'monospace' }}>
            {formattedItem.code}
          </Tag>
        );
      },
      responsive: ['md'],
    },
    {
      title: 'Parent',
      key: 'parent',
      render: (_, record) => {
        const formattedItem = formatItemData(record);
        return (
          <Text>{formattedItem.parentName}</Text>
        );
      },
      responsive: ['lg'],
    },
    {
      title: 'Specifications',
      key: 'specifications',
      render: (_, record) => {
        const formattedItem = formatItemData(record);
        return (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {formattedItem.specifications}
          </Text>
        );
      },
      responsive: ['lg'],
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="green">Active</Tag>,
      responsive: ['sm'],
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <EyeOutlined />,
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => handleEdit(record)
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => handleDelete(record)
              }
            ]
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  // Mobile card view
  const renderMobileCard = (item) => {
    const formattedItem = formatItemData(item);
    
    return (
      <Card 
        key={item.id} 
        size="small" 
        style={{ marginBottom: 12 }}
        actions={[
          <Tooltip title="View Details">
            <EyeOutlined />
          </Tooltip>,
          <Tooltip title="Edit">
            <EditOutlined onClick={() => handleEdit(item)} />
          </Tooltip>,
          <Tooltip title="Delete">
            <DeleteOutlined onClick={() => handleDelete(item)} />
          </Tooltip>,
        ]}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Space direction="vertical" size="small" style={{ flex: 1 }}>
            <Space>
              <Avatar 
                size="small" 
                style={{ backgroundColor: getItemColor() === 'orange' ? '#fa8c16' : getItemColor() === 'green' ? '#52c41a' : '#1890ff' }}
                icon={getItemIcon()}
              />
              <div>
                <Text strong>{formattedItem.name}</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue" size="small" style={{ fontFamily: 'monospace' }}>
                    {formattedItem.code}
                  </Tag>
                  <Tag color="green" size="small">Active</Tag>
                </div>
              </div>
            </Space>
            
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Parent: {formattedItem.parentName}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {formattedItem.specifications}
              </Text>
            </Space>
          </Space>
        </div>
      </Card>
    );
  };

  const filteredData = getFilteredData();
  const hasActiveFilters = filters.search || filters.category || filters.subType;

  return (
    <div style={{ padding: screens.xs ? 16 : 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Fuel Management</Title>
          <Text type="secondary">
            Manage fuel products, subtypes, and categories for {state.currentUser?.company?.name}
          </Text>
        </Col>
        <Col>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            size={screens.xs ? 'middle' : 'large'}
          >
            {screens.xs ? 'Add' : 'Add Product'}
          </Button>
        </Col>
      </Row>

      {/* Alerts */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
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
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder={`Search ${activeTab}...`}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              allowClear
              enterButton={<SearchOutlined />}
            />
          </Col>

          {activeTab !== 'categories' && (
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Category"
                value={filters.category}
                onChange={(value) => handleFilterChange('category', value)}
                style={{ width: '100%' }}
                allowClear
              >
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
            </Col>
          )}

          {activeTab === 'products' && (
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Sub Type"
                value={filters.subType}
                onChange={(value) => handleFilterChange('subType', value)}
                style={{ width: '100%' }}
                allowClear
              >
                {subTypes.map(st => (
                  <Option key={st.id} value={st.id}>{st.name}</Option>
                ))}
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
                  style={{ marginLeft: 8 }} 
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
              hasActiveFilters 
                ? 'No items match your search criteria' 
                : `No ${activeTab} found`
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Create {getItemTypeLabel()}
            </Button>
          </Empty>
        ) : screens.xs ? (
          // Mobile Card View
          <div style={{ marginTop: 16 }}>
            {filteredData.map(renderMobileCard)}
          </div>
        ) : (
          // Desktop Table View
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} items`
            }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>

      {/* Create Modal */}
      <CreateFuelModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onFuelCreated={handleFuelCreated}
        companyId={state.currentUser?.companyId}
      />
    </div>
  );
};

export default FuelManagement;