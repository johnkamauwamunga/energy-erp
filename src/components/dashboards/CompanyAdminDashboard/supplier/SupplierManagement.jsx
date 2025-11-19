import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Tag,
  Space,
  Input,
  Select,
  DatePicker,
  Statistic,
  message,
  Modal,
  Form,
  Divider,
  Tooltip,
  Grid,
  Dropdown,
  Menu,
  Avatar,
  List,
  Badge,
  Drawer,
  Typography
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingOutlined,
  TeamOutlined,
  MoreOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { supplierService } from '../../../../services/supplierService/supplierService';
import { fuelService } from '../../../../services/fuelService/fuelService';
import CreateSupplierModal from './create/CreateSupplierModal';
import CreateSupplierProductModal from './create/CreateSupplierProductModal';
import './SupplierManagement.css';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [productsModalVisible, setProductsModalVisible] = useState(false);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    supplierType: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'grid'
  const screens = useBreakpoint();

  // Fetch suppliers and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const [suppliersData, statsData] = await Promise.all([
        supplierService.getSuppliers(filters),
        supplierService.getSupplierStats()
      ]);
      
      setSuppliers(suppliersData);
      setStats(statsData);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle supplier actions
  const handleViewProducts = (supplier) => {
    setSelectedSupplier(supplier);
    setProductsModalVisible(true);
  };

  const handleEditSupplier = (supplier) => {
    message.info('Edit supplier functionality to be implemented');
  };

  const handleDeleteSupplier = async (supplier) => {
    Modal.confirm({
      title: 'Delete Supplier',
      content: `Are you sure you want to delete ${supplier.name}? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await supplierService.deleteSupplier(supplier.id);
          message.success('Supplier deleted successfully');
          fetchData();
        } catch (error) {
          message.error(error.message);
        }
      }
    });
  };

  // Get status config
  const getStatusConfig = (status) => {
    const statusConfig = {
      ACTIVE: { color: 'green', text: 'Active' },
      INACTIVE: { color: 'red', text: 'Inactive' },
      ON_HOLD: { color: 'orange', text: 'On Hold' },
      BLACKLISTED: { color: 'red', text: 'Blacklisted' }
    };
    return statusConfig[status] || { color: 'default', text: status };
  };

  // Get type config
  const getTypeConfig = (type) => {
    const typeConfig = {
      FUEL_WHOLESALER: { color: 'blue', text: 'Fuel Wholesaler' },
      FUEL_REFINERY: { color: 'volcano', text: 'Refinery' },
      OIL_COMPANY: { color: 'orange', text: 'Oil Company' },
      DISTRIBUTOR: { color: 'green', text: 'Distributor' },
      RETAIL_SUPPLIER: { color: 'purple', text: 'Retail Supplier' },
      EQUIPMENT_VENDOR: { color: 'cyan', text: 'Equipment Vendor' },
      SERVICE_PROVIDER: { color: 'geekblue', text: 'Service Provider' },
      GENERAL_SUPPLIER: { color: 'gray', text: 'General Supplier' }
    };
    return typeConfig[type] || { color: 'default', text: type };
  };

  // Table columns for desktop
  const columns = [
    {
      title: 'Supplier Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a, b) => a.code.localeCompare(b.code),
      responsive: ['md'],
    },
    {
      title: 'Supplier Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.contactPerson}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Contact Info',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <div>
            <MailOutlined style={{ marginRight: 4, color: '#1890ff' }} />
            {record.email}
          </div>
          <div>
            <PhoneOutlined style={{ marginRight: 4, color: '#52c41a' }} />
            {record.phone}
          </div>
        </Space>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Location',
      dataIndex: 'city',
      key: 'city',
      render: (city, record) => (
        <Space direction="vertical" size={0}>
          <div>
            <EnvironmentOutlined style={{ marginRight: 4, color: '#fa8c16' }} />
            {city}
          </div>
          <Text type="secondary" style={{ fontSize: '12px', marginLeft: 18 }}>
            {record.country}
          </Text>
        </Space>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Type',
      dataIndex: 'supplierType',
      key: 'supplierType',
      filters: [
        { text: 'Fuel Wholesaler', value: 'FUEL_WHOLESALER' },
        { text: 'Refinery', value: 'FUEL_REFINERY' },
        { text: 'Oil Company', value: 'OIL_COMPANY' },
        { text: 'Distributor', value: 'DISTRIBUTOR' },
        { text: 'Retail Supplier', value: 'RETAIL_SUPPLIER' },
      ],
      onFilter: (value, record) => record.supplierType === value,
      render: (type) => {
        const config = getTypeConfig(type);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      responsive: ['md'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Active', value: 'ACTIVE' },
        { text: 'Inactive', value: 'INACTIVE' },
        { text: 'On Hold', value: 'ON_HOLD' },
        { text: 'Blacklisted', value: 'BLACKLISTED' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Products',
      dataIndex: 'CreateSupplierProductModal',
      key: 'products',
      align: 'center',
      render: (products) => (
        <Badge 
          count={products ? products.length : 0} 
          showZero 
          color={products && products.length > 0 ? 'blue' : 'default'}
        >
          <ShoppingOutlined style={{ fontSize: '16px' }} />
        </Badge>
      ),
      responsive: ['sm'],
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view-products',
                label: 'View Products',
                icon: <ShoppingOutlined />,
                onClick: () => handleViewProducts(record)
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => handleEditSupplier(record)
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => handleDeleteSupplier(record)
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
  const renderMobileCard = (supplier) => (
    <Card 
      key={supplier.id} 
      size="small" 
      style={{ marginBottom: 12 }}
      actions={[
        <Tooltip title="View Products">
          <ShoppingOutlined onClick={() => handleViewProducts(supplier)} />
        </Tooltip>,
        <Tooltip title="Edit">
          <EditOutlined onClick={() => handleEditSupplier(supplier)} />
        </Tooltip>,
        <Tooltip title="Delete">
          <DeleteOutlined onClick={() => handleDeleteSupplier(supplier)} />
        </Tooltip>,
      ]}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Space direction="vertical" size="small" style={{ flex: 1 }}>
          <Space>
            <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
              {supplier.name.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text strong>{supplier.name}</Text>
              <div>
                <Tag color="blue" size="small">{supplier.code}</Tag>
                <Tag color={getTypeConfig(supplier.supplierType).color} size="small">
                  {getTypeConfig(supplier.supplierType).text}
                </Tag>
                <Tag color={getStatusConfig(supplier.status).color} size="small">
                  {getStatusConfig(supplier.status).text}
                </Tag>
              </div>
            </div>
          </Space>
          
          <Space direction="vertical" size={0}>
            <div>
              <MailOutlined style={{ marginRight: 4, color: '#1890ff' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>{supplier.email}</Text>
            </div>
            <div>
              <PhoneOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>{supplier.phone}</Text>
            </div>
            <div>
              <EnvironmentOutlined style={{ marginRight: 4, color: '#fa8c16' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {supplier.city}, {supplier.country}
              </Text>
            </div>
          </Space>
          
          <div>
            <Badge 
              count={supplier.CreateSupplierProductModal ? supplier.CreateSupplierProductModal.length : 0} 
              showZero 
              color={supplier.CreateSupplierProductModal && supplier.CreateSupplierProductModal.length > 0 ? 'blue' : 'default'}
            >
              <Text type="secondary" style={{ fontSize: '12px' }}>Products</Text>
            </Badge>
          </div>
        </Space>
      </div>
    </Card>
  );

  // Filtered and sorted data
  const filteredSuppliers = useMemo(() => {
    let data = [...suppliers];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter(supplier => 
        supplier.name.toLowerCase().includes(searchLower) ||
        supplier.code.toLowerCase().includes(searchLower) ||
        supplier.contactPerson?.toLowerCase().includes(searchLower) ||
        supplier.email?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status) {
      data = data.filter(supplier => supplier.status === filters.status);
    }

    // Type filter
    if (filters.supplierType) {
      data = data.filter(supplier => supplier.supplierType === filters.supplierType);
    }

    // Sorting
    data.sort((a, b) => {
      const aValue = a[filters.sortBy];
      const bValue = b[filters.sortBy];
      
      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return data;
  }, [suppliers, filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      supplierType: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setFilterDrawerVisible(false);
  };

  return (
    <div className="supplier-management">
      {/* Header with Stats and Actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={18}>
          <Title level={2} style={{ margin: 0 }}>Supplier Management</Title>
          <Text type="secondary">Manage your suppliers and their products</Text>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Space style={{ width: '100%', justifyContent: screens.xs ? 'flex-start' : 'flex-end' }}>
            {screens.md && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                Add Supplier
              </Button>
            )}
            {!screens.md && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
                block={screens.xs}
              >
                {screens.xs ? 'Add' : 'Add Supplier'}
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className="stats-row" style={{ marginBottom: 24 }}>
        {[
          { key: 'total', title: 'Total Suppliers', value: stats.totalSuppliers || 0, icon: <TeamOutlined />, color: '#1890ff' },
          { key: 'active', title: 'Active', value: stats.activeSuppliers || 0, color: '#52c41a' },
          { key: 'withProducts', title: 'With Products', value: stats.suppliersWithProducts || 0, color: '#722ed1' },
          { key: 'onHold', title: 'On Hold', value: stats.onHoldSuppliers || 0, color: '#fa8c16' },
        ].map(stat => (
          <Col xs={12} sm={6} key={stat.key}>
            <Card size="small">
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters Section */}
      <Card 
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: screens.xs ? '16px' : '24px' }}
      >
        <Row gutter={[16, 16]} align="middle">
          {/* Search Input */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="Search suppliers..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </Col>

          {/* Filter Button for Mobile */}
          {!screens.lg && (
            <Col xs={12} sm={6}>
              <Button
                icon={<FilterOutlined />}
                size="large"
                onClick={() => setFilterDrawerVisible(true)}
                block
              >
                Filters
              </Button>
            </Col>
          )}

          {/* View Toggle for Mobile */}
          {!screens.lg && (
            <Col xs={12} sm={6}>
              <Button
                icon={<AppstoreOutlined />}
                size="large"
                onClick={() => setMobileView(mobileView === 'list' ? 'grid' : 'list')}
                block
              >
                {mobileView === 'list' ? 'Grid' : 'List'}
              </Button>
            </Col>
          )}

          {/* Desktop Filters */}
          {screens.lg && (
            <>
              <Col span={4}>
                <Select
                  placeholder="Status"
                  allowClear
                  style={{ width: '100%' }}
                  size="large"
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                >
                  <Option value="ACTIVE">Active</Option>
                  <Option value="INACTIVE">Inactive</Option>
                  <Option value="ON_HOLD">On Hold</Option>
                  <Option value="BLACKLISTED">Blacklisted</Option>
                </Select>
              </Col>
              <Col span={4}>
                <Select
                  placeholder="Supplier Type"
                  allowClear
                  style={{ width: '100%' }}
                  size="large"
                  value={filters.supplierType}
                  onChange={(value) => handleFilterChange('supplierType', value)}
                >
                  <Option value="FUEL_WHOLESALER">Fuel Wholesaler</Option>
                  <Option value="FUEL_REFINERY">Refinery</Option>
                  <Option value="OIL_COMPANY">Oil Company</Option>
                  <Option value="DISTRIBUTOR">Distributor</Option>
                  <Option value="RETAIL_SUPPLIER">Retail Supplier</Option>
                </Select>
              </Col>
              <Col span={3}>
                <Button
                  icon={<FilterOutlined />}
                  onClick={clearFilters}
                  size="large"
                  block
                >
                  Clear
                </Button>
              </Col>
            </>
          )}

          {/* Add Supplier for Mobile */}
          {!screens.md && screens.lg && (
            <Col span={4}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                block
                onClick={() => setCreateModalVisible(true)}
              >
                Add Supplier
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      {/* Suppliers List/Table */}
      <Card
        title={`Suppliers (${filteredSuppliers.length})`}
        extra={
          <Space>
            {screens.lg && (
              <Button
                icon={<FilterOutlined />}
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </Space>
        }
      >
        {screens.lg ? (
          // Desktop Table View
          <Table
            columns={columns}
            dataSource={filteredSuppliers}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} suppliers`
            }}
            scroll={{ x: 800 }}
          />
        ) : (
          // Mobile Card/List View
          <div>
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map(renderMobileCard)
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <TeamOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <Text type="secondary">No suppliers found</Text>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Filter Drawer for Mobile */}
      <Drawer
        title="Filter Suppliers"
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        width={300}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Status</Text>
            <Select
              placeholder="Select Status"
              allowClear
              style={{ width: '100%', marginTop: 8 }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value="ACTIVE">Active</Option>
              <Option value="INACTIVE">Inactive</Option>
              <Option value="ON_HOLD">On Hold</Option>
              <Option value="BLACKLISTED">Blacklisted</Option>
            </Select>
          </div>

          <div>
            <Text strong>Supplier Type</Text>
            <Select
              placeholder="Select Type"
              allowClear
              style={{ width: '100%', marginTop: 8 }}
              value={filters.supplierType}
              onChange={(value) => handleFilterChange('supplierType', value)}
            >
              <Option value="FUEL_WHOLESALER">Fuel Wholesaler</Option>
              <Option value="FUEL_REFINERY">Refinery</Option>
              <Option value="OIL_COMPANY">Oil Company</Option>
              <Option value="DISTRIBUTOR">Distributor</Option>
              <Option value="RETAIL_SUPPLIER">Retail Supplier</Option>
            </Select>
          </div>

          <div>
            <Text strong>Sort By</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={filters.sortBy}
              onChange={(value) => handleFilterChange('sortBy', value)}
            >
              <Option value="name">Name</Option>
              <Option value="code">Code</Option>
              <Option value="createdAt">Date Added</Option>
            </Select>
          </div>

          <div>
            <Text strong>Sort Order</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={filters.sortOrder}
              onChange={(value) => handleFilterChange('sortOrder', value)}
            >
              <Option value="asc">Ascending</Option>
              <Option value="desc">Descending</Option>
            </Select>
          </div>

          <Button type="primary" onClick={clearFilters} block>
            Clear All Filters
          </Button>
        </Space>
      </Drawer>

      {/* Modals */}
      <CreateSupplierModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          fetchData();
          message.success('Supplier created successfully');
        }}
      />

      <CreateSupplierProductModal
        visible={productsModalVisible}
        supplier={selectedSupplier}
        onCancel={() => {
          setProductsModalVisible(false);
          setSelectedSupplier(null);
        }}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default SupplierManagement;