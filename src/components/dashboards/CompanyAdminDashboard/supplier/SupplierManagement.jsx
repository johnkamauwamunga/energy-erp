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
  Statistic,
  message,
  Modal,
  Form,
  Tooltip,
  Grid,
  Dropdown,
  Avatar,
  Badge,
  Drawer,
  Typography,
  Popconfirm,
  Empty
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingOutlined,
  TeamOutlined,
  MoreOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { supplierService } from '../../../../services/supplierService/supplierService';
import CreateSupplierModal from './create/CreateSupplierModal';
import UpdateSupplierModal from './edit/UpdateSupplierModal';
import CreateSupplierProductModal from './create/CreateSupplierProductModal';
import SupplierProductsModal from './products/SupplierProductsModal';
import './SupplierManagement.css';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [productsModalVisible, setProductsModalVisible] = useState(false);
  const [viewProductsModalVisible, setViewProductsModalVisible] = useState(false);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    supplierType: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const screens = useBreakpoint();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Fetch suppliers and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await supplierService.getSuppliers({
        ...filters,
        page: pagination.current,
        limit: pagination.pageSize
      });

      console.log('Fetched suppliers response:', response);
      
      if (response.data && response.pagination) {
        setSuppliers(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total
        }));
      } else {
        setSuppliers(response || []);
      }
      
      // Fetch stats separately
      const statsData = await supplierService.getSupplierStats();
      setStats(statsData);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, pagination.current, pagination.pageSize]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle pagination change
  const handleTableChange = (paginationConfig) => {
    setPagination(paginationConfig);
  };

  // Handle supplier actions
  const handleViewSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    // Could implement a detailed view modal here
    message.info(`Viewing supplier: ${supplier.name}`);
  };

  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setUpdateModalVisible(true);
  };

  const handleDeleteSupplier = async (supplier) => {
    Modal.confirm({
      title: 'Delete Supplier',
      content: (
        <div>
          <p>Are you sure you want to delete <strong>{supplier.name}</strong>?</p>
          <p style={{ color: '#ff4d4f', marginBottom: 0 }}>
            {supplier.supplierProducts?.length > 0 && 
              `Warning: This supplier has ${supplier.supplierProducts.length} associated product(s). Deleting will remove all supplier products.`
            }
          </p>
        </div>
      ),
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

  const handleViewProducts = (supplier) => {
    setSelectedSupplier(supplier);
    setViewProductsModalVisible(true);
  };

  const handleAddProducts = (supplier) => {
    setSelectedSupplier(supplier);
    setProductsModalVisible(true);
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
      title: 'Supplier',
      key: 'supplier',
      render: (_, record) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
            {record.name?.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.code}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontSize: '12px' }}>
            <MailOutlined style={{ marginRight: 4, fontSize: '11px' }} />
            {record.email || 'N/A'}
          </div>
          <div style={{ fontSize: '12px' }}>
            <PhoneOutlined style={{ marginRight: 4, fontSize: '11px' }} />
            {record.phone || 'N/A'}
          </div>
        </Space>
      ),
      responsive: ['md'],
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontSize: '12px' }}>
            <EnvironmentOutlined style={{ marginRight: 4, fontSize: '11px' }} />
            {record.city || 'N/A'}
          </div>
          <Text type="secondary" style={{ fontSize: '11px', marginLeft: 18 }}>
            {record.country}
          </Text>
        </Space>
      ),
      responsive: ['md'],
    },
    {
      title: 'Type',
      dataIndex: 'supplierType',
      key: 'supplierType',
      render: (type) => {
        const config = getTypeConfig(type);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      responsive: ['sm'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Products',
      key: 'products',
      align: 'center',
      render: (_, record) => (
        <Badge 
          count={record.supplierProducts ? record.supplierProducts.length : 0} 
          showZero 
          color={record.supplierProducts && record.supplierProducts.length > 0 ? 'blue' : 'default'}
        >
          <ShoppingOutlined style={{ fontSize: '16px', cursor: 'pointer' }} />
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
                key: 'view',
                label: 'View Details',
                icon: <EyeOutlined />,
                onClick: () => handleViewSupplier(record)
              },
              {
                key: 'view-products',
                label: 'View Products',
                icon: <ShoppingOutlined />,
                onClick: () => handleViewProducts(record)
              },
              {
                key: 'add-products',
                label: 'Add Products',
                icon: <PlusOutlined />,
                onClick: () => handleAddProducts(record)
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => handleEditSupplier(record)
              },
              {
                type: 'divider',
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
        <Tooltip title="Add Products">
          <PlusOutlined onClick={() => handleAddProducts(supplier)} />
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
              {supplier.name?.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text strong style={{ fontSize: '14px' }}>{supplier.name}</Text>
              <div>
                <Tag color="blue" size="small" style={{ fontSize: '10px' }}>{supplier.code}</Tag>
                <Tag color={getTypeConfig(supplier.supplierType).color} size="small" style={{ fontSize: '10px' }}>
                  {getTypeConfig(supplier.supplierType).text}
                </Tag>
                <Tag color={getStatusConfig(supplier.status).color} size="small" style={{ fontSize: '10px' }}>
                  {getStatusConfig(supplier.status).text}
                </Tag>
              </div>
            </div>
          </Space>
          
          <Space direction="vertical" size={0}>
            {supplier.email && (
              <div style={{ fontSize: '11px' }}>
                <MailOutlined style={{ marginRight: 4, fontSize: '10px', color: '#1890ff' }} />
                <Text type="secondary">{supplier.email}</Text>
              </div>
            )}
            {supplier.phone && (
              <div style={{ fontSize: '11px' }}>
                <PhoneOutlined style={{ marginRight: 4, fontSize: '10px', color: '#52c41a' }} />
                <Text type="secondary">{supplier.phone}</Text>
              </div>
            )}
            {(supplier.city || supplier.country) && (
              <div style={{ fontSize: '11px' }}>
                <EnvironmentOutlined style={{ marginRight: 4, fontSize: '10px', color: '#fa8c16' }} />
                <Text type="secondary">
                  {supplier.city}{supplier.city && supplier.country ? ', ' : ''}{supplier.country}
                </Text>
              </div>
            )}
          </Space>
          
          <div>
            <Badge 
              count={supplier.supplierProducts ? supplier.supplierProducts.length : 0} 
              showZero 
              color={supplier.supplierProducts && supplier.supplierProducts.length > 0 ? 'blue' : 'default'}
              size="small"
            >
              <Text type="secondary" style={{ fontSize: '11px' }}>Products</Text>
            </Badge>
          </div>
        </Space>
      </div>
    </Card>
  );

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      supplierType: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    setFilterDrawerVisible(false);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchData();
    message.success('Data refreshed successfully');
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
            <Tooltip title="Refresh">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              block={screens.xs}
            >
              {screens.xs ? 'Add' : 'Add Supplier'}
            </Button>
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
            <Card size="small" hoverable>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color, fontSize: '24px' }}
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
                  <Option value="EQUIPMENT_VENDOR">Equipment Vendor</Option>
                  <Option value="SERVICE_PROVIDER">Service Provider</Option>
                  <Option value="GENERAL_SUPPLIER">General Supplier</Option>
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
        </Row>
      </Card>

      {/* Suppliers List/Table */}
      <Card
        title={`Suppliers (${pagination.total})`}
        extra={
          <Space>
            <Text type="secondary">
              Showing {((pagination.current - 1) * pagination.pageSize) + 1}-
              {Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total}
            </Text>
            {screens.lg && filters.status && (
              <Tag closable onClose={() => handleFilterChange('status', '')}>
                Status: {getStatusConfig(filters.status).text}
              </Tag>
            )}
            {screens.lg && filters.supplierType && (
              <Tag closable onClose={() => handleFilterChange('supplierType', '')}>
                Type: {getTypeConfig(filters.supplierType).text}
              </Tag>
            )}
          </Space>
        }
      >
        {screens.lg ? (
          // Desktop Table View
          <Table
            columns={columns}
            dataSource={suppliers}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} suppliers`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
            onChange={handleTableChange}
            scroll={{ x: 800 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div>
                      <p>No suppliers found</p>
                      <Button 
                        type="primary" 
                        onClick={() => setCreateModalVisible(true)}
                        icon={<PlusOutlined />}
                      >
                        Create First Supplier
                      </Button>
                    </div>
                  }
                />
              )
            }}
          />
        ) : (
          // Mobile Card/List View
          <div>
            {suppliers.length > 0 ? (
              suppliers.map(renderMobileCard)
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <p>No suppliers found</p>
                    <Button 
                      type="primary" 
                      onClick={() => setCreateModalVisible(true)}
                      icon={<PlusOutlined />}
                      size="small"
                    >
                      Create First Supplier
                    </Button>
                  </div>
                }
              />
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
              <Option value="EQUIPMENT_VENDOR">Equipment Vendor</Option>
              <Option value="SERVICE_PROVIDER">Service Provider</Option>
              <Option value="GENERAL_SUPPLIER">General Supplier</Option>
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

      <UpdateSupplierModal
        visible={updateModalVisible}
        supplier={selectedSupplier}
        onCancel={() => {
          setUpdateModalVisible(false);
          setSelectedSupplier(null);
        }}
        onSuccess={() => {
          setUpdateModalVisible(false);
          setSelectedSupplier(null);
          fetchData();
          message.success('Supplier updated successfully');
        }}
      />

      <CreateSupplierProductModal
        visible={productsModalVisible}
        supplier={selectedSupplier}
        onCancel={() => {
          setProductsModalVisible(false);
          setSelectedSupplier(null);
        }}
        onSuccess={() => {
          setProductsModalVisible(false);
          setSelectedSupplier(null);
          fetchData();
          message.success('Products added successfully');
        }}
      />

      <SupplierProductsModal
        visible={viewProductsModalVisible}
        supplier={selectedSupplier}
        onCancel={() => {
          setViewProductsModalVisible(false);
          setSelectedSupplier(null);
        }}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default SupplierManagement;