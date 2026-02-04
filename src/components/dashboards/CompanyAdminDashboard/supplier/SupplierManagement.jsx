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
  Tooltip,
  Grid,
  Dropdown,
  Avatar,
  Badge,
  Drawer,
  Typography,
  Empty,
  Divider
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
  EyeOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SettingOutlined,
  SortDescendingOutlined,
  UserOutlined,
  IdcardOutlined,
  CalendarOutlined,
  ClearOutlined,
  ExportOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileTextOutlined,
  AppstoreOutlined
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
  const [sortOrder, setSortOrder] = useState({
    field: 'createdAt',
    order: 'descend'
  });
  const screens = useBreakpoint();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Helper functions
  const getStatusConfig = (status) => {
    const statusConfig = {
      ACTIVE: { color: 'green', text: 'Active' },
      INACTIVE: { color: 'red', text: 'Inactive' },
      ON_HOLD: { color: 'orange', text: 'On Hold' },
      BLACKLISTED: { color: 'red', text: 'Blacklisted' }
    };
    return statusConfig[status] || { color: 'default', text: status };
  };

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

  // Fetch suppliers and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await supplierService.getSuppliers({
        ...filters,
        page: pagination.current,
        limit: pagination.pageSize,
        sortBy: sortOrder.field,
        sortOrder: sortOrder.order === 'descend' ? 'desc' : 'asc'
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
  }, [filters, pagination.current, pagination.pageSize, sortOrder]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle pagination change
  const handleTableChange = (paginationConfig, filters, sorter) => {
    setPagination(paginationConfig);
    if (sorter && sorter.field) {
      setSortOrder({
        field: sorter.field,
        order: sorter.order || 'descend'
      });
    }
  };

  // Enhanced suppliers data for reporting
  const enhancedSuppliers = useMemo(() => 
    suppliers.map((supplier, index) => ({
      ...supplier,
      // Add sequential number
      sequentialNumber: index + 1,
      // Enhanced contact info
      formattedContact: `${supplier.contactPerson || 'N/A'} (${supplier.email || 'No email'})`,
      formattedPhone: supplier.phone || 'N/A',
      formattedEmail: supplier.email || 'N/A',
      // Enhanced location
      formattedLocation: `${supplier.address || ''}${supplier.address && supplier.city ? ', ' : ''}${supplier.city || ''}${(supplier.address || supplier.city) && supplier.country ? ', ' : ''}${supplier.country || ''}`.trim() || 'N/A',
      // Status and type display
      statusDisplay: getStatusConfig(supplier.status).text,
      typeDisplay: getTypeConfig(supplier.supplierType).text,
      // Product counts
      productsCount: supplier.supplierProducts ? supplier.supplierProducts.length : 0,
      activeProductsCount: supplier.supplierProducts ? supplier.supplierProducts.filter(p => p.status === 'ACTIVE').length : 0,
      // Timestamp for sorting
      timestamp: new Date(supplier.createdAt).getTime()
    })),
  [suppliers]);

  // Handle supplier actions
  const handleViewSupplier = (supplier) => {
    setSelectedSupplier(supplier);
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

  // Table columns - RESPONSIVE AND CLEAN
  const columns = [
    {
      title: '#',
      key: 'sequence',
      render: (_, __, index) => (
        <Text type="secondary" style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {((pagination.current - 1) * pagination.pageSize) + index + 1}
        </Text>
      ),
      width: 50,
      fixed: screens.xs ? false : 'left'
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_, record) => (
        <Space>
          <Avatar 
            size={screens.xs ? 'small' : 'default'}
            style={{ 
              backgroundColor: getStatusConfig(record.status).color,
              color: '#fff',
              fontWeight: 'bold'
            }}
          >
            {record.name?.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500, fontSize: screens.xs ? '13px' : '14px' }}>{record.name}</div>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: screens.xs ? '10px' : '11px' }}>
                {record.code}
              </Text>
              {record.contactPerson && !screens.xs && (
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  • {record.contactPerson}
                </Text>
              )}
            </Space>
          </div>
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend'],
      fixed: screens.xs ? false : 'left'
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontSize: '12px' }}>
            <MailOutlined style={{ marginRight: 4, fontSize: '11px', color: '#1890ff' }} />
            <a href={`mailto:${record.email}`}>{record.email || 'N/A'}</a>
          </div>
          <div style={{ fontSize: '12px' }}>
            <PhoneOutlined style={{ marginRight: 4, fontSize: '11px', color: '#52c41a' }} />
            <a href={`tel:${record.phone}`}>{record.phone || 'N/A'}</a>
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
            <EnvironmentOutlined style={{ marginRight: 4, fontSize: '11px', color: '#fa8c16' }} />
            <Text>{record.city || 'N/A'}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: '11px', marginLeft: 18 }}>
            {record.country || ''}
          </Text>
        </Space>
      ),
      responsive: ['md'],
      sorter: (a, b) => (a.city || '').localeCompare(b.city || ''),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Type',
      dataIndex: 'supplierType',
      key: 'supplierType',
      render: (type) => {
        const config = getTypeConfig(type);
        return <Tag color={config.color} style={{ fontSize: '11px' }}>{config.text}</Tag>;
      },
      responsive: ['sm'],
      sorter: (a, b) => a.supplierType.localeCompare(b.supplierType),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color} style={{ fontSize: '11px' }}>{config.text}</Tag>;
      },
      sorter: (a, b) => a.status.localeCompare(b.status),
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend'],
      responsive: ['sm']
    },
    {
      title: 'Products',
      key: 'products',
      align: 'center',
      render: (_, record) => (
        <Badge 
          count={record.supplierProducts ? record.supplierProducts.length : 0} 
          showZero 
          style={{ 
            backgroundColor: record.supplierProducts && record.supplierProducts.length > 0 ? '#1890ff' : '#d9d9d9',
            fontSize: '10px'
          }}
        >
          <ShoppingOutlined 
            style={{ 
              fontSize: '16px', 
              cursor: 'pointer',
              color: record.supplierProducts && record.supplierProducts.length > 0 ? '#1890ff' : '#999'
            }} 
          />
        </Badge>
      ),
      responsive: ['sm'],
      sorter: (a, b) => {
        const aCount = a.supplierProducts ? a.supplierProducts.length : 0;
        const bCount = b.supplierProducts ? b.supplierProducts.length : 0;
        return bCount - aCount;
      },
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend']
    },
    {
      title: 'Credit Limit',
      key: 'creditLimit',
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>
          {supplierService.formatCurrency?.(record.creditLimit) || `KES ${(record.creditLimit || 0).toLocaleString()}`}
        </Text>
      ),
      responsive: ['lg'],
      sorter: (a, b) => (b.creditLimit || 0) - (a.creditLimit || 0),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Rating',
      key: 'rating',
      render: (_, record) => (
        <Badge 
          count={record.rating || 0} 
          style={{ 
            backgroundColor: record.rating >= 4 ? '#52c41a' : 
                           record.rating >= 3 ? '#faad14' : 
                           record.rating >= 2 ? '#fa8c16' : '#ff4d4f'
          }}
        />
      ),
      responsive: ['lg'],
      sorter: (a, b) => (b.rating || 0) - (a.rating || 0),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: screens.xs ? false : 'right',
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
          <Button 
            type="text" 
            icon={<MoreOutlined />}
            size={screens.xs ? 'small' : 'default'}
          />
        </Dropdown>
      )
    }
  ];

  // Mobile card view - SIMPLIFIED
  const renderMobileCard = (supplier, index) => (
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
            <Badge 
              count={index + 1}
              style={{ 
                backgroundColor: '#1890ff',
                fontSize: '10px',
                marginRight: 4
              }}
            />
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
          </Space>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tag color={getStatusConfig(supplier.status).color} size="small" style={{ fontSize: '10px' }}>
              {getStatusConfig(supplier.status).text}
            </Tag>
            <Badge 
              count={supplier.supplierProducts ? supplier.supplierProducts.length : 0} 
              showZero 
              color={supplier.supplierProducts && supplier.supplierProducts.length > 0 ? 'blue' : 'default'}
              size="small"
            />
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
    setSortOrder({
      field: 'createdAt',
      order: 'descend'
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    setFilterDrawerVisible(false);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchData();
    message.success('Data refreshed successfully');
  };

  // Export data function
  const handleExport = (format) => {
    const fileName = `suppliers_${new Date().toISOString().split('T')[0]}`;
    
    switch(format) {
      case 'excel':
        message.info('Exporting to Excel...');
        // Add Excel export logic here
        break;
      case 'pdf':
        message.info('Exporting to PDF...');
        // Add PDF export logic here
        break;
      case 'csv':
        message.info('Exporting to CSV...');
        // Add CSV export logic here
        break;
      default:
        message.info('Exporting data...');
    }
    
    console.log(`Exporting ${enhancedSuppliers.length} suppliers as ${format}`);
  };

  // Check if any filter is active
  const hasActiveFilters = () => {
    return filters.search || filters.status || filters.supplierType || filters.sortBy !== 'name' || filters.sortOrder !== 'asc';
  };

  // Export dropdown items
  const exportItems = [
    {
      key: 'excel',
      label: 'Excel (.xlsx)',
      icon: <FileExcelOutlined style={{ color: '#52c41a' }} />
    },
    {
      key: 'pdf',
      label: 'PDF (.pdf)',
      icon: <FilePdfOutlined style={{ color: '#ff4d4f' }} />
    },
    {
      key: 'csv',
      label: 'CSV (.csv)',
      icon: <FileTextOutlined style={{ color: '#1890ff' }} />
    },
    {
      key: 'word',
      label: 'Word (.docx)',
      icon: <FileWordOutlined style={{ color: '#1890ff' }} />
    }
  ];

  return (
    <div className="supplier-management">
      {/* Header with Actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={16}>
          <Title level={2} style={{ margin: 0, fontSize: screens.xs ? '20px' : '24px' }}>
            <TeamOutlined style={{ marginRight: 8 }} /> 
            Supplier Management
          </Title>
          <Text type="secondary" style={{ fontSize: screens.xs ? '12px' : '14px' }}>
            Manage your suppliers and their products
          </Text>
        </Col>
        <Col xs={24} md={8}>
          <Space 
            style={{ 
              width: '100%', 
              justifyContent: screens.xs ? 'flex-start' : 'flex-end',
              flexWrap: 'wrap',
              gap: screens.xs ? '8px' : '12px'
            }}
          >
            <Tooltip title="Refresh">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
                size={screens.xs ? 'middle' : 'default'}
              />
            </Tooltip>
            
            {/* Export Dropdown */}
            <Dropdown
              menu={{
                items: exportItems,
                onClick: ({ key }) => handleExport(key)
              }}
              placement="bottomRight"
            >
              <Button
                icon={<ExportOutlined />}
                size={screens.xs ? 'middle' : 'default'}
              >
                {screens.xs ? '' : 'Export'}
              </Button>
            </Dropdown>
            
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              size={screens.xs ? 'middle' : 'default'}
            >
              {screens.xs ? 'Add' : 'Add Supplier'}
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Statistics Cards - RESPONSIVE */}
      <Row gutter={[8, 8]} className="stats-row" style={{ marginBottom: 24 }}>
        {[
          { 
            key: 'total', 
            title: 'Total', 
            value: stats.totalSuppliers || 0, 
            icon: <TeamOutlined />, 
            color: '#1890ff',
            suffix: 'suppliers'
          },
          { 
            key: 'active', 
            title: 'Active', 
            value: stats.activeSuppliers || 0, 
            icon: <IdcardOutlined />,
            color: '#52c41a',
            suffix: `${Math.round((stats.activeSuppliers || 0) / ((stats.totalSuppliers || 1)) * 100)}%`
          },
          { 
            key: 'withProducts', 
            title: 'With Products', 
            value: stats.suppliersWithProducts || 0, 
            icon: <ShoppingOutlined />,
            color: '#722ed1',
            suffix: 'suppliers'
          },
          { 
            key: 'onHold', 
            title: 'On Hold', 
            value: stats.onHoldSuppliers || 0, 
            icon: <CalendarOutlined />,
            color: '#fa8c16',
            suffix: 'review'
          },
        ].map(stat => (
          <Col xs={12} sm={6} key={stat.key}>
            <Card size="small" hoverable bodyStyle={{ padding: screens.xs ? '12px' : '16px' }}>
              <Statistic
                title={<Text style={{ fontSize: screens.xs ? '12px' : '14px' }}>{stat.title}</Text>}
                value={stat.value}
                prefix={<span style={{ color: stat.color, marginRight: 8 }}>{stat.icon}</span>}
                valueStyle={{ 
                  color: stat.color, 
                  fontSize: screens.xs ? '18px' : '24px',
                  fontWeight: 'bold'
                }}
                suffix={stat.suffix && <div style={{ fontSize: '10px', color: '#999', marginTop: 2 }}>{stat.suffix}</div>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters Section - SIMPLIFIED */}
      <Card 
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: screens.xs ? '12px' : '16px' }}
      >
        <Row gutter={[8, 8]} align="middle">
          {/* Search Input - Always visible */}
          <Col xs={24} sm={16} md={12} lg={8}>
            <Search
              placeholder="Search suppliers..."
              allowClear
              enterButton={<SearchOutlined />}
              size={screens.xs ? 'middle' : 'default'}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>

          {/* Filter Actions */}
          <Col xs={24} sm={8} md={12} lg={16}>
            <Space 
              style={{ 
                width: '100%', 
                justifyContent: screens.sm ? 'flex-end' : 'flex-start',
                flexWrap: 'wrap'
              }}
            >
              {/* Mobile View Toggle */}
              {!screens.lg && (
                <Button
                  icon={<AppstoreOutlined />}
                  onClick={() => setMobileView(mobileView === 'list' ? 'grid' : 'list')}
                  size={screens.xs ? 'middle' : 'default'}
                >
                  {mobileView === 'list' ? 'Grid' : 'List'}
                </Button>
              )}

              {/* Filter Button */}
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFilterDrawerVisible(true)}
                size={screens.xs ? 'middle' : 'default'}
              >
                {screens.xs ? 'Filters' : 'More Filters'}
              </Button>

              {/* Clear Filters */}
              <Button
                icon={<ClearOutlined />}
                onClick={clearFilters}
                disabled={!hasActiveFilters()}
                size={screens.xs ? 'middle' : 'default'}
              >
                {screens.xs ? '' : 'Clear'}
              </Button>
            </Space>
          </Col>

          {/* Active Filters Display */}
          {hasActiveFilters() && (
            <Col xs={24} style={{ marginTop: 8 }}>
              <Space wrap size={[4, 4]}>
                <Text type="secondary" style={{ fontSize: '12px' }}>Filters:</Text>
                {filters.search && (
                  <Tag 
                    closable 
                    onClose={() => handleFilterChange('search', '')} 
                    color="blue"
                    size="small"
                  >
                    Search: "{filters.search}"
                  </Tag>
                )}
                {filters.status && (
                  <Tag 
                    closable 
                    onClose={() => handleFilterChange('status', '')} 
                    color="green"
                    size="small"
                  >
                    Status: {getStatusConfig(filters.status).text}
                  </Tag>
                )}
                {filters.supplierType && (
                  <Tag 
                    closable 
                    onClose={() => handleFilterChange('supplierType', '')} 
                    color="orange"
                    size="small"
                  >
                    Type: {getTypeConfig(filters.supplierType).text}
                  </Tag>
                )}
              </Space>
            </Col>
          )}
        </Row>
      </Card>

      {/* Suppliers List/Table */}
      <Card
        title={
          <Space>
            <Text strong style={{ fontSize: screens.xs ? '16px' : '18px' }}>
              Suppliers ({pagination.total})
            </Text>
            {!screens.xs && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Showing {((pagination.current - 1) * pagination.pageSize) + 1}-
                {Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total}
              </Text>
            )}
          </Space>
        }
        extra={
          !screens.xs && (
            <Space>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Sorted by: {sortOrder.field} ({sortOrder.order === 'descend' ? 'Desc' : 'Asc'})
              </Text>
            </Space>
          )
        }
        bodyStyle={{ padding: screens.xs ? '8px' : '16px' }}
      >
        {screens.lg || mobileView === 'list' ? (
          // Desktop Table View or Mobile List View
          <Table
            columns={columns}
            dataSource={suppliers}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: !screens.xs,
              showQuickJumper: !screens.xs,
              showTotal: !screens.xs ? (total, range) => 
                `${range[0]}-${range[1]} of ${total} suppliers` : false,
              pageSizeOptions: ['10', '20', '50', '100'],
              size: screens.xs ? 'small' : 'default'
            }}
            onChange={handleTableChange}
            scroll={{ x: screens.xs ? 600 : 1200 }}
            size={screens.xs ? 'small' : 'default'}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div style={{ padding: screens.xs ? '16px' : '24px' }}>
                      <p style={{ marginBottom: 16 }}>No suppliers found</p>
                      <Button 
                        type="primary" 
                        onClick={() => setCreateModalVisible(true)}
                        icon={<PlusOutlined />}
                        size={screens.xs ? 'small' : 'default'}
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
          // Mobile Grid View
          <div>
            {suppliers.length > 0 ? (
              suppliers.map((supplier, index) => renderMobileCard(supplier, index))
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div style={{ padding: '24px' }}>
                    <p style={{ marginBottom: 16 }}>No suppliers found</p>
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
        title={
          <Space>
            <FilterOutlined />
            <Text strong>Filter Suppliers</Text>
          </Space>
        }
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        width={screens.xs ? '100%' : 300}
        extra={
          <Button
            type="text"
            icon={<ClearOutlined />}
            onClick={clearFilters}
            size="small"
          >
            Clear
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Status</Text>
            <Select
              placeholder="Select Status"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              size="large"
            >
              <Option value="ACTIVE">Active</Option>
              <Option value="INACTIVE">Inactive</Option>
              <Option value="ON_HOLD">On Hold</Option>
              <Option value="BLACKLISTED">Blacklisted</Option>
            </Select>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Supplier Type</Text>
            <Select
              placeholder="Select Type"
              allowClear
              style={{ width: '100%' }}
              value={filters.supplierType}
              onChange={(value) => handleFilterChange('supplierType', value)}
              size="large"
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

          <Divider />

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Sort By</Text>
            <Select
              style={{ width: '100%' }}
              value={filters.sortBy}
              onChange={(value) => handleFilterChange('sortBy', value)}
              size="large"
            >
              <Option value="name">Name</Option>
              <Option value="code">Code</Option>
              <Option value="createdAt">Date Added</Option>
              <Option value="products">Products Count</Option>
              <Option value="rating">Rating</Option>
            </Select>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Sort Order</Text>
            <Select
              style={{ width: '100%' }}
              value={filters.sortOrder}
              onChange={(value) => handleFilterChange('sortOrder', value)}
              size="large"
            >
              <Option value="desc">Descending (Z-A)</Option>
              <Option value="asc">Ascending (A-Z)</Option>
            </Select>
          </div>

          <Divider />

          <Button 
            type="primary" 
            onClick={() => setFilterDrawerVisible(false)} 
            block
            size="large"
          >
            Apply Filters
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